"""
POST /api/ask    — requires login (any role); RBAC filter applied per role.
GET  /api/health — basic readiness probe.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import chat_service, document_service
from app.models.schemas import AskRequest, AskResponse, HealthResponse
from app.rag import vectorstore
from app.utils.auth import get_user_role

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    db: Session = Depends(get_db),
    role: str = Depends(get_user_role),
):
    # Resolve the list of document IDs this role is allowed to search.
    # Returns None for admin (= no filter), list[str] for everyone else.
    allowed_doc_ids = document_service.get_allowed_doc_ids(db, role)
    return chat_service.ask_question(payload.question, allowed_doc_ids=allowed_doc_ids)


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        documents_indexed=vectorstore.count(),
        vectorstore_ready=vectorstore.is_ready(),
    )
