"""
POST /api/summarize — admin-only.

Accepts a raw PDF file, extracts its full text, and returns a Groq-generated
3-5 sentence summary. Called by the frontend before the final upload so the
admin can review and edit the summary before the document is indexed.
"""
from fastapi import APIRouter, UploadFile, File, Depends
from pathlib import Path
import tempfile

from app.rag.pdf_loader import extract_pages
from app.rag.llm_chain import generate_summary
from app.models.schemas import SummarizeResponse
from app.utils.auth import require_admin

router = APIRouter(prefix="/api", tags=["summarize"])


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_pdf(
    file: UploadFile = File(...),
    _admin: None = Depends(require_admin),
):
    file_bytes = await file.read()

    # Write to a temp file so pdf_loader (which uses a Path) can open it
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = Path(tmp.name)

    try:
        pages = extract_pages(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    full_text = "\n\n".join(p["text"] for p in pages)
    summary = generate_summary(full_text)

    return SummarizeResponse(summary=summary)
