"""
POST /api/summarize — admin-only.

Accepts a raw PDF file, extracts its full text, returns a Groq-generated
3-5 sentence summary, and emits a SUMMARY_GENERATED audit event.
"""
from fastapi import APIRouter, UploadFile, File, Depends, Header
from pathlib import Path
import tempfile
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.rag.pdf_loader import extract_pages
from app.rag.llm_chain import generate_summary
from app.models.schemas import SummarizeResponse
from app.services import audit_service
from app.utils.auth import require_admin

router = APIRouter(prefix="/api", tags=["summarize"])


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
    x_user_id: str | None = Header(default=None),
    x_user_name: str | None = Header(default=None),
):
    uid   = (x_user_id or "").strip()
    uname = (x_user_name or "admin").strip()
    filename = file.filename or "unknown.pdf"

    file_bytes = await file.read()

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = Path(tmp.name)

    try:
        pages = extract_pages(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    full_text = "\n\n".join(p["text"] for p in pages)
    summary = generate_summary(full_text)

    audit_service.log_summary_generated(
        db, user_id=uid, user_name=uname, filename=filename,
    )

    return SummarizeResponse(summary=summary)
