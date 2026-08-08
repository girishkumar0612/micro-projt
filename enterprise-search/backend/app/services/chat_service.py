"""
Chat service — orchestrates the query-time RAG flow:
embed question -> FAISS similarity search (role-filtered) -> build prompt -> Groq -> answer.

When a list of allowed_doc_ids is provided the search is restricted to those
documents only, enforcing RBAC at the retrieval layer.
No chat history is persisted — this is a pure request/response operation.
"""
from app.rag import vectorstore
from app.rag.llm_chain import generate_answer
from app.models.schemas import AskResponse, RetrievedChunk
from app.utils.exceptions import EmptyQuestionError, NoDocumentsIndexedError, AccessRestrictedError
from app.utils.logger import get_logger

logger = get_logger(__name__)


def ask_question(question: str, allowed_doc_ids: list[str] | None = None) -> AskResponse:
    """
    answer a question using the RAG pipeline.

    allowed_doc_ids:
        None  — admin path, no filter (search all indexed documents).
        list  — employee path, search is restricted to this set of document IDs.
                An empty list means the user has no permitted documents.
    """
    question = question.strip()
    if not question:
        raise EmptyQuestionError("Question cannot be empty.")

    if not vectorstore.is_ready() or vectorstore.count() == 0:
        raise NoDocumentsIndexedError(
            "No documents have been indexed yet. Ask an admin to upload documents first."
        )

    # Choose filtered or unfiltered search based on caller role
    if allowed_doc_ids is None:
        # Admin — unrestricted
        retrieved = vectorstore.similarity_search(question)
    else:
        # Employee (or scoped role) — RBAC filter applied
        retrieved = vectorstore.similarity_search_filtered(question, allowed_doc_ids)

    if not retrieved:
        if allowed_doc_ids is not None:
            # The role-filter produced no results. This means the question
            # is about content the user's role cannot access.
            raise AccessRestrictedError(
                "You do not have permission to access this document. "
                "Please contact your administrator if you believe you should have access."
            )
        raise NoDocumentsIndexedError(
            "No relevant information was found in the indexed documents."
        )

    answer_text = generate_answer(question, retrieved)
    primary_source = retrieved[0]["source"] if retrieved else None

    chunks = [
        RetrievedChunk(text=c["text"], score=c["score"], source=c["source"], page=c["page"])
        for c in retrieved
    ]

    logger.info(f"Answered question (top source: {primary_source})")
    return AskResponse(answer=answer_text, source=primary_source, chunks=chunks)
