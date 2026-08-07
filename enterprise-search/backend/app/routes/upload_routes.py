"""
POST /api/upload — admin-only. Accepts a PDF, runs it through the full
ingestion pipeline (extract -> chunk -> embed -> index) via document_service.
"""
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import document_service
from app.models.schemas import UploadResponse
from app.utils.auth import require_admin

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
):
    file_bytes = await file.read()
    doc = document_service.upload_document(db, file.filename, file_bytes)
    return UploadResponse(
        id=doc.id,
        filename=doc.filename,
        chunks_indexed=doc.chunks_indexed,
        uploaded_at=doc.uploaded_at,
        status=doc.status,
    )
