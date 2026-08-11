"""
Pydantic schemas — the typed contract between routes and the frontend.
"""
from datetime import datetime
from pydantic import BaseModel, Field


# ---------- Documents ----------

class DocumentOut(BaseModel):
    id: str
    filename: str
    size_kb: int
    chunks_indexed: int
    status: str
    uploaded_at: datetime
    department: str
    access_level: str
    allowed_roles: str  # comma-separated, e.g. "admin,hr"
    summary: str = ""

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    id: str
    filename: str
    chunks_indexed: int
    uploaded_at: datetime
    status: str
    department: str
    access_level: str
    allowed_roles: str
    summary: str = ""
    sha256_hash: str = ""


class DeleteResponse(BaseModel):
    message: str
    id: str


# ---------- Summarize ----------

class SummarizeResponse(BaseModel):
    summary: str


# ---------- Chat ----------

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Natural language question")
    # Role sent by the frontend so the backend can filter documents accordingly
    role: str = Field(default="hr", description="Caller's role: admin | hr | finance | it")
    # Optional: attach this question to an existing conversation
    conversation_id: str | None = Field(default=None, description="Existing conversation to continue")


class RetrievedChunk(BaseModel):
    text: str
    score: float
    source: str
    page: int | None = None


class AskResponse(BaseModel):
    answer: str
    source: str | None = None
    chunks: list[RetrievedChunk] = []
    # The conversation this exchange was saved to
    conversation_id: str | None = None


# ---------- Health ----------

class HealthResponse(BaseModel):
    status: str
    documents_indexed: int
    vectorstore_ready: bool


# ---------- Conversations ----------

class MessageOut(BaseModel):
    id: str
    role: str           # 'user' | 'assistant'
    content: str
    source: str = ""
    sources_json: str = "[]"   # raw JSON string; frontend parses it
    is_error: bool = False
    error_code: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationSummary(BaseModel):
    """Lightweight representation for the sidebar list (no messages)."""
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetail(BaseModel):
    """Full conversation including all messages."""
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageOut] = []

    class Config:
        from_attributes = True


class DeleteConversationResponse(BaseModel):
    message: str
    id: str
