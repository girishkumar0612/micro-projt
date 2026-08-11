"""
POST /api/upload   — admin-only; full ingest pipeline + audit event.
POST /api/summarize — admin-only; Groq summary + audit event.
"""
from fastapi import APIRouter, UploadFile, File, Form, Depends, Header
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import document_service
from app.services import audit_service
from app.models.schemas import UploadResponse
from app.utils.auth import require_admin
from app.utils.exceptions import DuplicateDocumentError, AppException

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_pdf(
    file: UploadFile = File(...),
    department: str = Form(default="General"),
    access_level: str = Form(default="public"),
    allowed_roles: str = Form(default="admin"),
    summary: str = Form(default=""),
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
    # Optional identity headers for audit trail
    x_user_id: str | None = Header(default=None),
    x_user_name: str | None = Header(default=None),
):
    filename = file.filename
    uid = (x_user_id or "").strip()
    uname = (x_user_name or "admin").strip()

    file_bytes = await file.read()

    try:
        doc = document_service.upload_document(
            db,
            filename,
            file_bytes,
            department=department,
            access_level=access_level,
            allowed_roles=allowed_roles,
            summary=summary,
        )
    except DuplicateDocumentError as exc:
        # Extract the original filename from the error detail for the audit log
        matched = exc.detail.split('"')[1] if '"' in exc.detail else filename
        audit_service.log_doc_duplicate(
            db, user_id=uid, user_name=uname,
            filename=filename, matched_name=matched,
        )
        raise
    except AppException as exc:
        audit_service.log_doc_upload_failed(
            db, user_id=uid, user_name=uname,
            filename=filename, reason=exc.detail,
        )
        raise

    # Success
    audit_service.log_doc_uploaded(
        db,
        user_id=uid,
        user_name=uname,
        document_id=doc.id,
        document_name=doc.filename,
        department=department,
        roles=allowed_roles,
    )

    return UploadResponse(
        id=doc.id,
        filename=doc.filename,
        chunks_indexed=doc.chunks_indexed,
        uploaded_at=doc.uploaded_at,
        status=doc.status,
        department=doc.department,
        access_level=doc.access_level,
        allowed_roles=doc.allowed_roles,
        summary=doc.summary,
        sha256_hash=doc.sha256_hash,
    )
