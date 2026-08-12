"""
Pydantic schemas — the typed contract between routes and the frontend.
"""
import json
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


# ---------- Documents ----------

class DocumentOut(BaseModel):
    id: str
    filename: str
    size_kb: int
    chunks_indexed: int
    status: str
    roles: list[str] = []
    uploaded_at: datetime

    class Config:
        from_attributes = True

    # `roles` is stored on the ORM as a JSON string ("[]" or '["hr","it"]').
    @field_validator("roles", mode="before")
    @classmethod
    def _parse_roles(cls, v):
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except (TypeError, json.JSONDecodeError):
                return []
        return v


class UploadResponse(BaseModel):
    id: str
    filename: str
    chunks_indexed: int
    uploaded_at: datetime
    status: str
    roles: list[str] = []


class DeleteResponse(BaseModel):
    message: str
    id: str


# ---------- Auth ----------

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class UserOut(BaseModel):
    username: str
    role: str
    display_name: str

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    token: str
    user: UserOut


# ---------- Chat ----------

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Natural language question")


class RetrievedChunk(BaseModel):
    text: str
    score: float
    source: str
    page: int | None = None
    document_id: str | None = None


class AskResponse(BaseModel):
    answer: str
    source: str | None = None
    chunks: list[RetrievedChunk] = []


# ---------- Health ----------

class HealthResponse(BaseModel):
    status: str
    documents_indexed: int
    vectorstore_ready: bool
