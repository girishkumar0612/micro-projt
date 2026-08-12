"""
POST /api/upload — admin-only. Accepts a PDF, runs it through the full
ingestion pipeline (extract -> chunk -> embed -> index) via document_service.

Optional form field `roles` (JSON array of role names) restricts which roles
can see the document. Omit it (or send []) for "visible to everyone".
"""
import json
from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import document_service
from app.models.schemas import UploadResponse
from app.utils.auth import require_admin

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_pdf(
    file: UploadFile = File(...),
    roles: str | None = Form(default=None),
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
):
    role_list: list[str] = []
    if roles:
        try:
            parsed = json.loads(roles)
            if isinstance(parsed, list):
                role_list = [r for r in parsed if isinstance(r, str)]
        except json.JSONDecodeError:
            role_list = []

    file_bytes = await file.read()
    doc = document_service.upload_document(db, file.filename, file_bytes, roles=role_list)
    return UploadResponse(
        id=doc.id,
        filename=doc.filename,
        chunks_indexed=doc.chunks_indexed,
        uploaded_at=doc.uploaded_at,
        status=doc.status,
        roles=document_service.doc_roles(doc),
    )
