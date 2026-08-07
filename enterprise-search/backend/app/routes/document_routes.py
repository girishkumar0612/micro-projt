"""
GET /api/documents        — open to all (employees see what's indexed)
DELETE /api/documents/{id} — admin-only
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import document_service
from app.models.schemas import DocumentOut, DeleteResponse
from app.utils.auth import require_admin

router = APIRouter(prefix="/api", tags=["documents"])


@router.get("/documents", response_model=list[DocumentOut])
def get_documents(db: Session = Depends(get_db)):
    return document_service.list_documents(db)


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
):
    document_service.delete_document(db, document_id)
    return DeleteResponse(message="Document deleted and vector store updated.", id=document_id)
