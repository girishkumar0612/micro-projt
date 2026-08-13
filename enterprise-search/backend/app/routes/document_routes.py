"""
GET    /api/documents              — requires login; returns only documents the
                                    caller's role is allowed to see (admin sees all).
GET    /api/documents/{id}/summary — requires login; returns (and generates if
                                    needed) the document's executive summary.
DELETE /api/documents/{id}         — admin-only.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import document_service
from app.models.db_models import User
from app.models.schemas import DocumentOut, DocumentSummaryResponse, DeleteResponse
from app.utils.auth import require_admin, get_current_user
from app.utils.exceptions import DocumentNotFoundError

router = APIRouter(prefix="/api", tags=["documents"])


@router.get("/documents", response_model=list[DocumentOut])
def get_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return document_service.list_documents(db, user)


@router.get("/documents/{document_id}/summary", response_model=DocumentSummaryResponse)
def get_document_summary(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = document_service.get_document(db, document_id)
    if not document_service.can_access(doc, user):
        # Same error as "missing" so restricted docs are never leaked.
        raise DocumentNotFoundError(f"Document '{document_id}' not found.")
    summary = document_service.get_or_create_summary(db, doc)
    return DocumentSummaryResponse(document_id=doc.id, filename=doc.filename, summary=summary)


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
):
    document_service.delete_document(db, document_id)
    return DeleteResponse(message="Document deleted and vector store updated.", id=document_id)
