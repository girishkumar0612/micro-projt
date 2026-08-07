"""
POST /api/ask    — open to all employees, no auth required.
GET  /api/health — basic readiness probe for ops/demo.
"""
from fastapi import APIRouter

from app.services import chat_service
from app.models.schemas import AskRequest, AskResponse, HealthResponse
from app.rag import vectorstore

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
def ask(payload: AskRequest):
    return chat_service.ask_question(payload.question)


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        documents_indexed=vectorstore.count(),
        vectorstore_ready=vectorstore.is_ready(),
    )
