"""
Chat service — orchestrates the query-time RAG flow:

  1. Validate question
  2. RBAC filter  (allowed_doc_ids from document_service)  ← unchanged
  3. Version intent detection                               ← NEW
  4. Version filter  (narrow allowed_doc_ids)               ← NEW
  5. FAISS similarity search
  6. Groq LLM answer generation
  7. Return AskResponse

RBAC guarantee
--------------
The version filter at step 4 receives the already-RBAC-filtered set and may
only NARROW it (intersection).  It can never add a document that RBAC excluded.

Version filter semantics
------------------------
NORMAL query  (no version mentioned) →
    Keep ONLY the latest version per policy family.
    Result: "The password minimum is 16 characters." (from v2.0 only)

EXPLICIT query ("in v1.0", "for version 2") →
    Keep ONLY the named version(s).
    Result: retrieves exactly the asked-for version.

COMPARISON query ("what changed between v1.0 and v2.0") →
    Keep all explicitly requested versions → LLM compares them.

LATEST_COMPARE ("what changed in the latest version") →
    Keep current version + immediately previous version per family.
    LLM can then state what changed.

All guardrails, out-of-scope detection, chat history, audit logging,
and error handling are completely unchanged.
"""
from sqlalchemy.orm import Session

from app.rag import vectorstore
from app.rag.llm_chain import generate_answer
from app.rag.version_detector import detect_intent, IntentMode
from app.rag.version_filter import apply_version_filter
from app.models.schemas import AskResponse, RetrievedChunk
from app.utils.exceptions import (
    EmptyQuestionError,
    NoDocumentsIndexedError,
    AccessRestrictedError,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


def ask_question(
    question: str,
    allowed_doc_ids: list[str] | None = None,
    all_docs: list | None = None,
) -> AskResponse:
    """
    Answer a question using the version-aware RAG pipeline.

    Parameters
    ----------
    question       : The user's natural-language question.
    allowed_doc_ids: RBAC-filtered list of doc IDs, or None for admin (no filter).
    all_docs       : All Document rows from the DB — needed by the version filter
                     to build policy families.  Pass [] to skip version filtering
                     (falls back to RBAC-only, preserving backward compat).
    """
    question = question.strip()
    if not question:
        raise EmptyQuestionError("Question cannot be empty.")

    if not vectorstore.is_ready() or vectorstore.count() == 0:
        raise NoDocumentsIndexedError(
            "No documents have been indexed yet. Ask an admin to upload documents first."
        )

    # ── Step 1: detect version intent ────────────────────────────────────────
    intent = detect_intent(question)
    logger.info(f"Version intent: {intent}")

    # ── Step 2: apply version filter on top of RBAC filter ───────────────────
    # all_docs defaults to [] when not provided (caller is a test or legacy path)
    docs_for_filter = all_docs or []

    if docs_for_filter:
        version_filtered_ids = apply_version_filter(
            allowed_doc_ids=allowed_doc_ids,
            all_docs=docs_for_filter,
            intent=intent,
        )
    else:
        # No doc list supplied — fall back to RBAC-only (no version narrowing)
        version_filtered_ids = allowed_doc_ids
        logger.debug("Version filter skipped — no all_docs supplied.")

    # ── Step 3: FAISS search with the final filtered ID set ───────────────────
    if version_filtered_ids is None:
        # Admin + non-NORMAL query → unrestricted search
        retrieved = vectorstore.similarity_search(question)
    else:
        retrieved = vectorstore.similarity_search_filtered(question, version_filtered_ids)

    # ── Step 4: handle empty retrieval ────────────────────────────────────────
    if not retrieved:
        if allowed_doc_ids is not None:
            raise AccessRestrictedError(
                "You do not have permission to access this document. "
                "Please contact your administrator if you believe you should have access."
            )
        raise NoDocumentsIndexedError(
            "No relevant information was found in the indexed documents."
        )

    # ── Step 5: LLM answer generation ─────────────────────────────────────────
    answer_text = generate_answer(question, retrieved)
    primary_source = retrieved[0]["source"] if retrieved else None

    chunks = [
        RetrievedChunk(
            text=c["text"], score=c["score"], source=c["source"], page=c["page"]
        )
        for c in retrieved
    ]

    logger.info(
        f"Answered [{intent.mode.value}] (top source: {primary_source}, "
        f"chunks: {len(chunks)})"
    )
    return AskResponse(answer=answer_text, source=primary_source, chunks=chunks)
