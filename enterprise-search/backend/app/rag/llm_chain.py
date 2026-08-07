"""
LLM layer — Groq only (see project decision, Phase 1 §7).
Builds a grounded prompt from retrieved chunks and calls Groq's chat API
via langchain-groq. Kept behind a single function so swapping providers
later only touches this file.
"""
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from functools import lru_cache
from app.utils.config import settings
from app.utils.exceptions import LLMProviderError
from app.utils.logger import get_logger

logger = get_logger(__name__)

SYSTEM_PROMPT = (
    "You are an enterprise search assistant. Answer the employee's question "
    "using ONLY the context excerpts provided below, which come from internal "
    "company documents. Be concise and factual.\n"
    "- If the answer is not contained in the context, say you could not find "
    "that information in the uploaded documents — do not make anything up.\n"
    "- Do not mention 'the context' or 'the excerpts' in your answer; answer "
    "naturally as if you simply know the policy.\n"
)


@lru_cache(maxsize=1)
def _get_llm() -> ChatGroq:
    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY is not set — LLM calls will fail.")
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=0.2,
        max_tokens=512,
    )


def build_context(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, start=1):
        parts.append(f"[Excerpt {i} — {c['source']}, page {c.get('page', '?')}]\n{c['text']}")
    return "\n\n".join(parts)


def generate_answer(question: str, chunks: list[dict]) -> str:
    context = build_context(chunks)
    user_prompt = (
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\n"
        f"Answer:"
    )

    try:
        llm = _get_llm()
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ])
        return response.content.strip()
    except Exception as exc:
        logger.error(f"Groq LLM call failed: {exc}")
        raise LLMProviderError(
            "The assistant could not reach the language model right now. Please try again."
        )
