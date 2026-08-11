"""
Conversation history endpoints — all strictly user-scoped.

GET    /api/conversations              — list the caller's conversations (newest first)
GET    /api/conversations/{id}         — load a full conversation with messages
DELETE /api/conversations/{id}         — delete a conversation

Every endpoint verifies that the conversation.user_id matches the caller's
X-User-Id before returning or mutating anything.  A mismatched id returns 404
so that the existence of other users' conversations is not disclosed.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.schemas import (
    ConversationSummary,
    ConversationDetail,
    DeleteConversationResponse,
)
from app.models.db_models import Conversation
from app.utils.auth import get_user_id
from app.utils.exceptions import DocumentNotFoundError
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


def _get_owned_conversation(
    conversation_id: str,
    user_id: str,
    db: Session,
) -> Conversation:
    """
    Fetch a conversation and verify it belongs to user_id.
    Raises DocumentNotFoundError (404) on any mismatch so callers cannot
    infer whether the conversation exists for another user.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.user_id != user_id:
        raise DocumentNotFoundError(f"Conversation '{conversation_id}' not found.")
    return conv


# ── List ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ConversationSummary])
def list_conversations(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """Return all conversations belonging to the authenticated user, newest first."""
    convs = (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return convs


# ── Detail ────────────────────────────────────────────────────────────────────

@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """
    Return a conversation with all its messages.
    Ownership is verified: a caller cannot read another user's conversation
    by guessing or modifying the conversation ID.
    """
    conv = _get_owned_conversation(conversation_id, user_id, db)
    return conv


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{conversation_id}", response_model=DeleteConversationResponse)
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """
    Permanently delete a conversation and all its messages.
    Only the owning user may delete their own conversations.
    """
    conv = _get_owned_conversation(conversation_id, user_id, db)
    db.delete(conv)
    db.commit()
    logger.info(f"Conversation '{conversation_id}' deleted by user '{user_id}'.")
    return DeleteConversationResponse(
        message="Conversation deleted.", id=conversation_id
    )
