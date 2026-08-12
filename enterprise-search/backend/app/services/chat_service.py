"""
Chat service — orchestrates the query-time RAG flow:
embed question -> FAISS similarity search (top-k) -> build prompt -> Groq -> answer.

Role scoping: only chunks belonging to documents the calling user is allowed
to see are considered. A question whose answer lives in a restricted document
simply returns "not found" for users without access — nothing is leaked.
"""
from sqlalchemy.orm import Session

from app.rag import vectorstore
from app.rag.llm_chain import generate_answer
from app.models.db_models import User
from app.services import document_service
from app.models.schemas import AskResponse, RetrievedChunk
from app.utils.exceptions import EmptyQuestionError, NoDocumentsIndexedError
from app.utils.logger import get_logger

logger = get_logger(__name__)


def ask_question(question: str, db: Session, user: User) -> AskResponse:
    question = question.strip()
    if not question:
        raise EmptyQuestionError("Question cannot be empty.")

    if not vectorstore.is_ready() or vectorstore.count() == 0:
        raise NoDocumentsIndexedError(
            "No documents have been indexed yet. Ask an admin to upload documents first."
        )

    allowed_ids = document_service.accessible_document_ids(db, user)
    if not allowed_ids:
        raise NoDocumentsIndexedError(
            "No documents are available to your account yet. Contact an admin for access."
        )

    retrieved = vectorstore.similarity_search(question, allowed_document_ids=allowed_ids)
    if not retrieved:
        raise NoDocumentsIndexedError(
            "No relevant information was found in the documents you can access."
        )

    answer_text = generate_answer(question, retrieved)

    # Primary source = highest-scoring chunk's document
    primary_source = retrieved[0]["source"] if retrieved else None

    chunks = [
        RetrievedChunk(
            text=c["text"],
            score=c["score"],
            source=c["source"],
            page=c["page"],
            document_id=c.get("document_id"),
        )
        for c in retrieved
    ]

    logger.info(f"Answered question for role={user.role} (top source: {primary_source})")
    return AskResponse(answer=answer_text, source=primary_source, chunks=chunks)
