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


class DeleteResponse(BaseModel):
    message: str
    id: str


# ---------- Chat ----------

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Natural language question")
    # Role sent by the frontend so the backend can filter documents accordingly
    role: str = Field(default="employee", description="Caller's role: admin | employee | <dept>")


class RetrievedChunk(BaseModel):
    text: str
    score: float
    source: str
    page: int | None = None


class AskResponse(BaseModel):
    answer: str
    source: str | None = None
    chunks: list[RetrievedChunk] = []


# ---------- Health ----------

class HealthResponse(BaseModel):
    status: str
    documents_indexed: int
    vectorstore_ready: bool
