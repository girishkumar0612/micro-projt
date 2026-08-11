"""
GET    /api/documents              — filtered by the caller's role (X-User-Role header)
PATCH  /api/documents/{id}/access  — admin-only; updates department + allowed_roles only
DELETE /api/documents/{id}         — admin-only (X-Admin-Token header)

All admin mutations emit an AuditEvent.
"""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import document_service, audit_service
from app.models.schemas import DocumentOut, DeleteResponse, UpdateAccessRequest, UpdateAccessResponse
from app.utils.auth import require_admin, get_user_role

router = APIRouter(prefix="/api", tags=["documents"])


@router.get("/documents", response_model=list[DocumentOut])
def get_documents(
    db: Session = Depends(get_db),
    role: str = Depends(get_user_role),
):
    # Admin sees all; employees see only documents their role is listed in.
    return document_service.list_documents(db, role=role)


@router.patch("/documents/{document_id}/access", response_model=UpdateAccessResponse)
def update_document_access(
    document_id: str,
    payload: UpdateAccessRequest,
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
    x_user_id: str | None = Header(default=None),
    x_user_name: str | None = Header(default=None),
):
    """
    Metadata-only update. Emits DOC_ACCESS_CHANGED audit event recording
    the before/after state of department and allowed_roles.
    """
    uid   = (x_user_id or "").strip()
    uname = (x_user_name or "admin").strip()

    # Snapshot the current values before mutation for the audit diff
    existing = document_service.get_document(db, document_id)
    old_roles = existing.allowed_roles
    old_dept  = existing.department

    doc = document_service.update_document_access(
        db,
        document_id=document_id,
        department=payload.department,
        allowed_roles=payload.allowed_roles,
    )

    audit_service.log_doc_access_changed(
        db,
        user_id=uid,
        user_name=uname,
        document_id=doc.id,
        document_name=doc.filename,
        old_roles=old_roles,
        new_roles=doc.allowed_roles,
        old_dept=old_dept,
        new_dept=doc.department,
    )

    return doc


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
    x_user_id: str | None = Header(default=None),
    x_user_name: str | None = Header(default=None),
):
    uid   = (x_user_id or "").strip()
    uname = (x_user_name or "admin").strip()

    # Capture filename before deletion
    doc = document_service.get_document(db, document_id)
    filename = doc.filename

    document_service.delete_document(db, document_id)

    audit_service.log_doc_deleted(
        db,
        user_id=uid,
        user_name=uname,
        document_id=document_id,
        document_name=filename,
    )

    return DeleteResponse(message="Document deleted and vector store updated.", id=document_id)
