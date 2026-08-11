"""
POST /api/ask    — requires login (any role); RBAC filter applied per role.
                   Persists the exchange to the user's conversation history.
GET  /api/health — basic readiness probe.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import chat_service, document_service
from app.services import conversation_service
from app.models.schemas import AskRequest, AskResponse, HealthResponse
from app.rag import vectorstore
from app.utils.auth import get_user_role, get_user_id
from app.utils.exceptions import AppException
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    db: Session = Depends(get_db),
    role: str = Depends(get_user_role),
    user_id: str = Depends(get_user_id),
):
    """
    Answer a question via the RAG pipeline and persist the exchange.

    Flow:
    1. Resolve allowed document IDs for the caller's role (RBAC).
    2. Get or create a conversation owned by user_id.
    3. Persist the user message.
    4. Call chat_service (unchanged Groq/RAG path).
    5. Persist the assistant message with source citations.
    6. Commit and return the answer together with the conversation_id.

    Security:
    - Ownership of the conversation_id is verified inside conversation_service.
    - RBAC document filtering is applied exactly as before — loading an old
      conversation does NOT bypass it; the retrieval happens fresh each time.
    - Error responses (access-restricted, LLM errors, etc.) are also persisted
      so the conversation history is complete.
    """
    # Step 1 — RBAC: resolve permitted document IDs for this role
    allowed_doc_ids = document_service.get_allowed_doc_ids(db, role)

    # Step 2 — Conversation: get existing or create new (ownership verified)
    conv = conversation_service.get_or_create_conversation(
        db=db,
        user_id=user_id,
        conversation_id=payload.conversation_id,
        first_question=payload.question,
    )

    # Step 3 — Persist user message
    conversation_service.append_user_message(db, conv, payload.question)

    # Step 4 — RAG + Groq (all existing logic untouched)
    try:
        result: AskResponse = chat_service.ask_question(
            payload.question, allowed_doc_ids=allowed_doc_ids
        )
        # Step 5a — Persist assistant answer with citations
        conversation_service.append_assistant_message(db, conv, result)

    except AppException as exc:
        # Step 5b — Persist the error so the UI can replay it on reload
        conversation_service.append_error_message(
            db, conv, exc.detail, error_code=exc.code
        )
        conversation_service.touch_conversation(db, conv)
        db.commit()
        # Re-raise so the existing exception handler still sends the correct
        # HTTP status code to the frontend
        raise

    # Step 6 — Commit and return
    conversation_service.touch_conversation(db, conv)
    db.commit()

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
