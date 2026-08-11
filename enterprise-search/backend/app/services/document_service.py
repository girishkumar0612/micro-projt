"""
Document service — business logic for document lifecycle:
upload -> extract -> chunk -> embed -> index, plus list, filter-by-role & delete.
Routes call only this; this is the only layer allowed to touch both
SQLite (metadata) and the rag/ package (vectors).

Duplicate detection
-------------------
A SHA-256 hex digest is computed from the raw PDF bytes *before* any
processing begins.  Two checks prevent duplicate records:

1. Application-layer pre-check: queries the DB for an existing document with
   the same hash and raises DuplicateDocumentError immediately.  This avoids
   wasting time on summarization, embedding, and FAISS indexing.

2. DB-layer uniqueness constraint: the `uq_documents_sha256_hash` constraint
   on the `sha256_hash` column means that even two identical uploads arriving
   simultaneously can only produce one committed row.  The second INSERT will
   raise IntegrityError, which we catch and convert to DuplicateDocumentError.

Filename is NOT used for duplicate detection — two files with different names
but identical content are still treated as duplicates.
"""
import hashlib
import threading
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.db_models import Document
from app.rag.pdf_loader import extract_pages
from app.rag.text_splitter import chunk_pages
from app.rag import vectorstore
from app.utils.config import settings
from app.utils.exceptions import (
    InvalidFileTypeError,
    DocumentNotFoundError,
    FileTooLargeError,
    DuplicateDocumentError,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

MAX_FILE_SIZE_MB = 20

# Fine-grained lock so that two simultaneous uploads of the same file cannot
# both pass the application-layer pre-check before either has committed.
_upload_lock = threading.Lock()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sha256(data: bytes) -> str:
    """Return the lowercase hex SHA-256 digest of *data*."""
    return hashlib.sha256(data).hexdigest()


def _find_by_hash(db: Session, hex_hash: str) -> Document | None:
    return db.query(Document).filter(Document.sha256_hash == hex_hash).first()


# ── Public API ────────────────────────────────────────────────────────────────

def list_documents(db: Session, role: str | None = None) -> list[Document]:
    """
    Return documents visible to the given role.

    role = None or "admin"  -> all documents (admin sees everything)
    role = any other string -> only documents whose allowed_roles contains
                               that role string.
    """
    query = db.query(Document).order_by(Document.uploaded_at.desc())

    if role and role != "admin":
        query = query.filter(Document.allowed_roles.contains(role))

    return query.all()


def get_allowed_doc_ids(db: Session, role: str) -> list[str]:
    """
    Return the IDs of all documents the given role is permitted to access.
    Used by the chat service to scope FAISS searches.
    """
    if role == "admin":
        return None  # Signal to chat_service: no filter needed
    docs = list_documents(db, role=role)
    return [doc.id for doc in docs if doc.status == "ready"]


def get_document(db: Session, document_id: str) -> Document:
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise DocumentNotFoundError(f"Document '{document_id}' not found.")
    return doc


def upload_document(
    db: Session,
    filename: str,
    file_bytes: bytes,
    department: str = "General",
    access_level: str = "public",
    allowed_roles: str = "admin",
    summary: str = "",
) -> Document:
    # ── Basic validation ──────────────────────────────────────────────────────
    if not filename.lower().endswith(".pdf"):
        raise InvalidFileTypeError("Only PDF files are supported.")

    size_kb = len(file_bytes) // 1024
    if size_kb > MAX_FILE_SIZE_MB * 1024:
        raise FileTooLargeError(f"File exceeds the {MAX_FILE_SIZE_MB}MB limit.")

    # ── Compute SHA-256 hash ──────────────────────────────────────────────────
    # Done first — before touching the DB or the filesystem — so a duplicate
    # is caught as cheaply as possible.
    file_hash = _sha256(file_bytes)
    logger.info(f"Upload requested: '{filename}' | SHA-256: {file_hash[:16]}…")

    # ── Duplicate check (application layer) ──────────────────────────────────
    # The lock prevents two concurrent uploads of the same file from both
    # passing this check before either INSERT commits.
    with _upload_lock:
        existing = _find_by_hash(db, file_hash)
        if existing:
            logger.warning(
                f"Duplicate upload rejected: '{filename}' matches existing "
                f"document '{existing.filename}' (id={existing.id}, "
                f"hash={file_hash[:16]}…)."
            )
            raise DuplicateDocumentError(
                f"This exact policy version has already been uploaded "
                f"(originally as \"{existing.filename}\")."
            )

        # ── Create DB row (status=indexing) inside the lock ──────────────────
        # Staying inside the lock until after flush means a race-condition
        # sibling upload will block here and then hit _find_by_hash above.
        doc = Document(
            filename=filename,
            stored_path="",
            size_kb=size_kb,
            status="indexing",
            sha256_hash=file_hash,
            department=department,
            access_level=access_level,
            allowed_roles=allowed_roles,
            summary=summary,
        )
        db.add(doc)
        try:
            db.flush()   # assigns id; raises IntegrityError if DB constraint fires
        except IntegrityError:
            db.rollback()
            # Another request committed the same hash between our read and flush
            existing = _find_by_hash(db, file_hash)
            orig_name = existing.filename if existing else "unknown"
            raise DuplicateDocumentError(
                f"This exact policy version has already been uploaded "
                f"(originally as \"{orig_name}\")."
            )

    # ── Persist file & build FAISS index (outside lock — expensive I/O) ──────
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
        logger.info(
            f"Document '{filename}' indexed ({indexed_count} chunks) — "
            f"dept: {department}, roles: {allowed_roles}, hash: {file_hash[:16]}…"
        )
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
