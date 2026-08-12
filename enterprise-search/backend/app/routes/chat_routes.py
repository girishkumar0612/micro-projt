"""
POST /api/ask    — requires login; answers are filtered to documents the
                   caller's role is allowed to see.
GET  /api/health — basic readiness probe for ops/demo (open).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import chat_service
from app.models.db_models import User
from app.models.schemas import AskRequest, AskResponse, HealthResponse
from app.rag import vectorstore
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return chat_service.ask_question(payload.question, db, user)


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        documents_indexed=vectorstore.count(),
        vectorstore_ready=vectorstore.is_ready(),
    )
