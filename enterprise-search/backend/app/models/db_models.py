"""
SQLAlchemy ORM models. Only 'documents' metadata is persisted in SQLite —
the actual vectors live in FAISS (see rag/vectorstore.py).
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


def _uuid() -> str:
    return uuid.uuid4().hex[:12]


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    stored_path: Mapped[str] = mapped_column(String, nullable=False)
    size_kb: Mapped[int] = mapped_column(Integer, default=0)
    chunks_indexed: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="indexing")  # indexing | ready | failed
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # RBAC metadata — used to filter documents per user role
    department: Mapped[str] = mapped_column(String, default="General")
    access_level: Mapped[str] = mapped_column(String, default="public")  # public | internal | confidential
    # Comma-separated roles that may access this document, e.g. "admin,hr,finance"
    allowed_roles: Mapped[str] = mapped_column(String, default="admin,employee")
