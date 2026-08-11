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


SUMMARY_SYSTEM_PROMPT = (
    "You are a document analyst for an enterprise knowledge base. "
    "Your task is to write a concise, factual summary of the document provided below.\n"
    "Rules:\n"
    "- Write exactly 3 to 5 sentences.\n"
    "- Use ONLY information present in the document text — do not invent or infer anything.\n"
    "- Write in third person, plain professional English.\n"
    "- Do not mention 'the document', 'the text', or 'the excerpt' — describe the content directly.\n"
    "- Do not include bullet points, headers, or lists.\n"
)


def generate_summary(full_text: str) -> str:
    """
    Generate a 3-5 sentence factual summary of a document using Groq.
    full_text should be the concatenated plain text of the PDF (not chunked).
    Raises LLMProviderError on any failure.
    """
    # Groq context window is large but we cap the text sent to avoid hitting
    # token limits on very large PDFs. 12 000 chars ≈ ~3 000 tokens.
    truncated = full_text[:12_000]
    if len(full_text) > 12_000:
        truncated += "\n\n[Document continues — summary based on first portion only.]"

    user_prompt = f"Document text:\n\n{truncated}\n\nSummary:"

    try:
        llm = _get_llm()
        response = llm.invoke([
            SystemMessage(content=SUMMARY_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ])
        return response.content.strip()
    except Exception as exc:
        logger.error(f"Groq summary generation failed: {exc}")
        raise LLMProviderError(
            "Could not generate summary — the language model is unavailable. Please try again."
        )


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
