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

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    id: str
    filename: str
    chunks_indexed: int
    uploaded_at: datetime
    status: str


class DeleteResponse(BaseModel):
    message: str
    id: str


# ---------- Chat ----------

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Natural language question")


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
