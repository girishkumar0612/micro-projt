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


class UpdateAccessRequest(BaseModel):
    """
    Payload for PATCH /api/documents/{id}/access.
    Only department and allowed_roles are mutable after upload.
    The PDF, summary, embeddings, SHA-256 hash, and document ID are never
    touched by this operation.
    """
    department: str = Field(..., min_length=1, description="Department label, e.g. 'Human Resources'")
    allowed_roles: str = Field(
        ...,
        min_length=1,
        description="Comma-separated role list, e.g. 'admin,hr,marketing'. At least one role required.",
    )

    @classmethod
    def __get_validators__(cls):
        yield from super().__get_validators__()

    from pydantic import field_validator

    @field_validator("allowed_roles")
    @classmethod
    def roles_not_blank(cls, v: str) -> str:
        roles = [r.strip() for r in v.split(",") if r.strip()]
        if not roles:
            raise ValueError("allowed_roles must contain at least one non-blank role.")
        return v

    @field_validator("department")
    @classmethod
    def department_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("department must not be blank.")
        return v


class UpdateAccessResponse(BaseModel):
    """Echoes the full updated document record back to the caller."""
    id: str
    filename: str
    department: str
    access_level: str
    allowed_roles: str
    status: str
    chunks_indexed: int
    size_kb: int
    uploaded_at: datetime
    summary: str = ""

    class Config:
        from_attributes = True


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


# ---------- Monitoring (admin-only) ----------

class AuditEventOut(BaseModel):
    """Single row in the activity log table."""
    id: str
    timestamp: datetime
    user_id: str = ""
    user_name: str = ""
    user_role: str = ""
    event_type: str
    action: str = ""
    result: str
    document_id: str = ""
    document_name: str = ""
    detail: str = ""

    class Config:
        from_attributes = True


class MonitoringSummary(BaseModel):
    """Aggregate statistics for the dashboard stat cards."""
    # Query activity
    total_queries: int = 0
    queries_today: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    active_users: int = 0
    total_conversations: int = 0

    # Security events
    rbac_denied: int = 0
    unauth_access: int = 0
    prompt_injection: int = 0
    out_of_scope: int = 0
    guardrail_blocked: int = 0

    # Document activity
    policy_uploads: int = 0
    duplicate_attempts: int = 0
    policy_deletions: int = 0
    access_changes: int = 0
    summary_generations: int = 0


class MonitoringEventsResponse(BaseModel):
    """Paginated activity log response."""
    total: int
    page: int
    page_size: int
    events: list[AuditEventOut]
