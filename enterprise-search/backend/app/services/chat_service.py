"""
Chat service — orchestrates the query-time RAG flow:
embed question -> FAISS similarity search (top-k) -> build prompt -> Groq -> answer.
No chat history is persisted (project decision) — this is a pure
request -> response operation.
"""
from app.rag import vectorstore
from app.rag.llm_chain import generate_answer
from app.models.schemas import AskResponse, RetrievedChunk
from app.utils.exceptions import EmptyQuestionError, NoDocumentsIndexedError
from app.utils.logger import get_logger

logger = get_logger(__name__)


def ask_question(question: str) -> AskResponse:
    question = question.strip()
    if not question:
        raise EmptyQuestionError("Question cannot be empty.")

    if not vectorstore.is_ready() or vectorstore.count() == 0:
        raise NoDocumentsIndexedError(
            "No documents have been indexed yet. Ask an admin to upload documents first."
        )

    retrieved = vectorstore.similarity_search(question)
    if not retrieved:
        raise NoDocumentsIndexedError("No relevant information was found in the indexed documents.")

    answer_text = generate_answer(question, retrieved)

    # Primary source = highest-scoring chunk's document
    primary_source = retrieved[0]["source"] if retrieved else None

    chunks = [
        RetrievedChunk(text=c["text"], score=c["score"], source=c["source"], page=c["page"])
        for c in retrieved
    ]

    logger.info(f"Answered question (top source: {primary_source})")
    return AskResponse(answer=answer_text, source=primary_source, chunks=chunks)
