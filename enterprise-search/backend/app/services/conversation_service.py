"""
Conversation service — handles creation, retrieval, and message persistence
for chat history.  All operations are strictly user-scoped.

This layer sits between the route handlers and the DB models.  It is the only
place allowed to create or mutate Conversation and Message rows.
"""
import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.db_models import Conversation, Message
from app.models.schemas import AskResponse
from app.utils.logger import get_logger

logger = get_logger(__name__)


# ── Title generation ──────────────────────────────────────────────────────────

def _make_title(question: str, max_len: int = 60) -> str:
    """
    Derive a short, readable title from the first user question.
    Strips trailing punctuation and truncates with an ellipsis if needed.
    """
    title = question.strip().rstrip("?!.,;:")
    if len(title) > max_len:
        title = title[:max_len].rsplit(" ", 1)[0] + "…"
    return title or "New Conversation"


# ── Create / retrieve ─────────────────────────────────────────────────────────

def get_or_create_conversation(
    db: Session,
    user_id: str,
    conversation_id: str | None,
    first_question: str,
) -> Conversation:
    """
    If conversation_id is provided and belongs to user_id, return it.
    Otherwise create a new conversation with a title derived from first_question.

    Security: ownership is always verified — a mismatched user_id silently
    creates a new conversation rather than raising an error, so callers cannot
    probe other users' conversation IDs through the chat endpoint.
    """
    if conversation_id:
        conv = (
            db.query(Conversation)
            .filter(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,   # ← ownership check
            )
            .first()
        )
        if conv:
            return conv
        # Conversation not found or not owned by this user — start fresh
        logger.warning(
            f"Conversation '{conversation_id}' not found or not owned by "
            f"user '{user_id}'. Creating a new conversation."
        )

    title = _make_title(first_question)
    conv = Conversation(user_id=user_id, title=title)
    db.add(conv)
    db.flush()  # assigns the id without committing the outer transaction
    logger.info(f"Created conversation '{conv.id}' for user '{user_id}'.")
    return conv


# ── Message persistence ───────────────────────────────────────────────────────

def append_user_message(
    db: Session,
    conversation: Conversation,
    content: str,
) -> Message:
    """Persist the user's question."""
    msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=content,
    )
    db.add(msg)
    return msg


def append_assistant_message(
    db: Session,
    conversation: Conversation,
    response: AskResponse,
    is_error: bool = False,
    error_code: str = "",
) -> Message:
    """
    Persist the assistant's answer together with its source citations.
    sources_json stores the full RetrievedChunk list so the frontend can
    re-render citations when an old conversation is reopened.
    """
    chunks_data = [c.model_dump() for c in (response.chunks or [])]
    msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=response.answer,
        source=response.source or "",
        sources_json=json.dumps(chunks_data),
        is_error=is_error,
        error_code=error_code,
    )
    db.add(msg)
    return msg


def append_error_message(
    db: Session,
    conversation: Conversation,
    error_text: str,
    error_code: str = "",
) -> Message:
    """Persist an error response from the assistant."""
    msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=error_text,
        is_error=True,
        error_code=error_code,
    )
    db.add(msg)
    return msg


def touch_conversation(db: Session, conversation: Conversation) -> None:
    """Update updated_at timestamp so the conversation floats to the top of history."""
    conversation.updated_at = datetime.now(timezone.utc)
    db.add(conversation)
