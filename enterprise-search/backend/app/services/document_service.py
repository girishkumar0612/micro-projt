"""
Document service — business logic for document lifecycle:
upload -> extract -> chunk -> embed -> index, plus list & delete.
Also handles role-based visibility: every document carries a `roles` list
(JSON string). An empty list means "visible to every logged-in role";
otherwise only listed roles (plus admins) can see it.

Routes call only this; this is the only layer allowed to touch both
SQLite (metadata) and the rag/ package (vectors).
"""
import json
from pathlib import Path
from sqlalchemy.orm import Session

from app.models.db_models import Document, User
from app.rag.pdf_loader import extract_pages
from app.rag.text_splitter import chunk_pages
from app.rag import vectorstore
from app.utils.config import settings
from app.utils.exceptions import InvalidFileTypeError, DocumentNotFoundError, FileTooLargeError
from app.utils.logger import get_logger

logger = get_logger(__name__)

MAX_FILE_SIZE_MB = 20


# ---------- Role-based visibility ----------

def doc_roles(doc: Document) -> list[str]:
    try:
        return json.loads(doc.roles or "[]")
    except (TypeError, json.JSONDecodeError):
        return []


def can_access(doc: Document, user: User) -> bool:
    """Admins see everything. Otherwise the user's role must be in the doc's roles."""
    if user.role == "admin":
        return True
    roles = doc_roles(doc)
    return not roles or user.role in roles


def accessible_document_ids(db: Session, user: User) -> set[str]:
    return {d.id for d in db.query(Document).all() if can_access(d, user)}


# ---------- CRUD ----------

def list_documents(db: Session, user: User) -> list[Document]:
    return [d for d in db.query(Document).order_by(Document.uploaded_at.desc()).all() if can_access(d, user)]


def get_document(db: Session, document_id: str) -> Document:
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise DocumentNotFoundError(f"Document '{document_id}' not found.")
    return doc


def upload_document(db: Session, filename: str, file_bytes: bytes, roles: list[str] | None = None) -> Document:
    if not filename.lower().endswith(".pdf"):
        raise InvalidFileTypeError("Only PDF files are supported.")

    size_kb = len(file_bytes) // 1024
    if size_kb > MAX_FILE_SIZE_MB * 1024:
        raise FileTooLargeError(f"File exceeds the {MAX_FILE_SIZE_MB}MB limit.")

    # Empty roles list = visible to everyone. Only valid role names are kept.
    safe_roles = [r for r in (roles or []) if isinstance(r, str) and r.strip()]

    # Create DB row first (status=indexing) so it shows up immediately in the UI.
    doc = Document(filename=filename, stored_path="", size_kb=size_kb, status="indexing", roles=json.dumps(safe_roles))
    db.add(doc)
    db.commit()
    db.refresh(doc)

    stored_path: Path = settings.upload_path / f"{doc.id}_{filename}"

    try:
        stored_path.write_bytes(file_bytes)
        doc.stored_path = str(stored_path)

        pages = extract_pages(stored_path)
        chunks = chunk_pages(pages, filename)
        indexed_count = vectorstore.add_chunks(doc.id, chunks)

        doc.chunks_indexed = indexed_count
        doc.status = "ready"
        db.commit()
        db.refresh(doc)
        logger.info(f"Document '{filename}' indexed successfully ({indexed_count} chunks, roles={safe_roles}).")
        return doc

    except Exception:
        doc.status = "failed"
        db.commit()
        raise


def delete_document(db: Session, document_id: str) -> None:
    doc = get_document(db, document_id)

    # Remove vectors first, then the file, then the DB row.
    vectorstore.delete_document(document_id)

    if doc.stored_path:
        path = Path(doc.stored_path)
        if path.exists():
            path.unlink()

    db.delete(doc)
    db.commit()
    logger.info(f"Document '{doc.filename}' ({document_id}) deleted.")
