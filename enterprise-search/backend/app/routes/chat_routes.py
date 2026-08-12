"""
POST /api/ask    — requires login (any role); RBAC filter applied per role.
                   Persists the exchange to the user's conversation history.
                   Emits an audit event for every query outcome.
GET  /api/health — basic readiness probe.
"""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import chat_service, document_service, conversation_service
from app.services import audit_service
from app.models.schemas import AskRequest, AskResponse, HealthResponse
from app.rag import vectorstore
from app.utils.auth import get_user_role, get_user_id
from app.utils.exceptions import AppException, AccessRestrictedError
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    db: Session = Depends(get_db),
    role: str = Depends(get_user_role),
    user_id: str = Depends(get_user_id),
    x_user_name: str | None = Header(default=None),
):
    """
    Answer a question via the RAG pipeline and persist the exchange.

    Audit events emitted:
      QUERY_SUCCESS — question answered successfully
      RBAC_DENIED   — role has no access to the relevant documents
      QUERY_FAILED  — LLM error, no-docs, empty question, or any other AppException

    All existing RBAC, RAG, Groq, guardrails, and conversation-history
    logic is completely unchanged.
    """
    question  = payload.question
    user_name = (x_user_name or "").strip()

    # Step 1 — RBAC: resolve permitted document IDs for this role
    allowed_doc_ids = document_service.get_allowed_doc_ids(db, role)
    # Fetch all Document rows so the version filter can build policy families.
    # This is a cheap metadata-only query (no file I/O).
    all_docs = document_service.list_all_documents(db)

    # Step 2 — Conversation: get existing or create new (ownership verified)
    conv = conversation_service.get_or_create_conversation(
        db=db,
        user_id=user_id,
        conversation_id=payload.conversation_id,
        first_question=question,
    )

    # Step 3 — Persist user message
    conversation_service.append_user_message(db, conv, question)

    # Step 4 — RAG + Groq (all existing logic untouched)
    try:
        result: AskResponse = chat_service.ask_question(
            question,
            allowed_doc_ids=allowed_doc_ids,
            all_docs=all_docs,
        )
        # Step 5a — Persist assistant answer with citations
        conversation_service.append_assistant_message(db, conv, result)

    except AccessRestrictedError as exc:
        # RBAC denial — the role's documents don't contain relevant content
        conversation_service.append_error_message(
            db, conv, exc.detail, error_code=exc.code
        )
        conversation_service.touch_conversation(db, conv)
        db.commit()
        audit_service.log_rbac_denied(
            db, user_id=user_id, user_name=user_name,
            user_role=role, question=question,
        )
        raise

    except AppException as exc:
        # LLM error, no-docs-indexed, empty question, etc.
        conversation_service.append_error_message(
            db, conv, exc.detail, error_code=exc.code
        )
        conversation_service.touch_conversation(db, conv)
        db.commit()
        audit_service.log_query_failed(
            db, user_id=user_id, user_name=user_name,
            user_role=role, question=question, error_code=exc.code,
        )
        raise

    # Step 6 — Commit and return
    conversation_service.touch_conversation(db, conv)
    db.commit()

    # Audit: successful query
    audit_service.log_query_success(
        db,
        user_id=user_id,
        user_name=user_name,
        user_role=role,
        question=question,
        source=result.source or "",
    )

    return AskResponse(
        answer=result.answer,
        source=result.source,
        chunks=result.chunks,
        conversation_id=conv.id,
    )


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        documents_indexed=vectorstore.count(),
        vectorstore_ready=vectorstore.is_ready(),
    )
