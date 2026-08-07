"""
GET  /api/documents        — filtered by the caller's role (X-User-Role header)
DELETE /api/documents/{id} — admin-only (X-Admin-Token header)
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import document_service
from app.models.schemas import DocumentOut, DeleteResponse
from app.utils.auth import require_admin, get_user_role

router = APIRouter(prefix="/api", tags=["documents"])


@router.get("/documents", response_model=list[DocumentOut])
def get_documents(
    db: Session = Depends(get_db),
    role: str = Depends(get_user_role),
):
    # Admin sees all; employees see only documents their role is listed in.
    return document_service.list_documents(db, role=role)


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
):
    document_service.delete_document(db, document_id)
    return DeleteResponse(message="Document deleted and vector store updated.", id=document_id)
