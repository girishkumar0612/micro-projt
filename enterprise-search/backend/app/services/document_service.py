"""
Document service — business logic for document lifecycle:
upload -> extract -> chunk -> embed -> index, plus list, filter-by-role & delete.
Routes call only this; this is the only layer allowed to touch both
SQLite (metadata) and the rag/ package (vectors).
"""
from pathlib import Path
from sqlalchemy.orm import Session

from app.models.db_models import Document
from app.rag.pdf_loader import extract_pages
from app.rag.text_splitter import chunk_pages
from app.rag import vectorstore
from app.utils.config import settings
from app.utils.exceptions import InvalidFileTypeError, DocumentNotFoundError, FileTooLargeError
from app.utils.logger import get_logger

logger = get_logger(__name__)

MAX_FILE_SIZE_MB = 20


def list_documents(db: Session, role: str | None = None) -> list[Document]:
    """
    Return documents visible to the given role.

    role = None or "admin"  -> all documents (admin sees everything)
    role = "employee" or any other string -> only documents whose allowed_roles
                                             field contains that role string.
    """
    query = db.query(Document).order_by(Document.uploaded_at.desc())

    if role and role != "admin":
        # Filter to documents where allowed_roles contains the caller's role.
        # allowed_roles is stored as a comma-separated string e.g. "admin,hr,finance"
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
    allowed_roles: str = "admin,employee",
) -> Document:
    if not filename.lower().endswith(".pdf"):
        raise InvalidFileTypeError("Only PDF files are supported.")

    size_kb = len(file_bytes) // 1024
    if size_kb > MAX_FILE_SIZE_MB * 1024:
        raise FileTooLargeError(f"File exceeds the {MAX_FILE_SIZE_MB}MB limit.")

    # Create DB row first (status=indexing) so it shows up immediately in the UI.
    doc = Document(
        filename=filename,
        stored_path="",
        size_kb=size_kb,
        status="indexing",
        department=department,
        access_level=access_level,
        allowed_roles=allowed_roles,
    )
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
        logger.info(f"Document '{filename}' indexed ({indexed_count} chunks) — dept: {department}, roles: {allowed_roles}.")
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
