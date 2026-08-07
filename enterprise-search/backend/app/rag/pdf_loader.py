"""
PDF text extraction using PyMuPDF (fitz).
Extracts text per page so we can retain page numbers in chunk metadata
(used for source citation in the UI).
"""
import fitz  # PyMuPDF
from pathlib import Path
from app.utils.exceptions import ExtractionError
from app.utils.logger import get_logger

logger = get_logger(__name__)


def extract_pages(pdf_path: Path) -> list[dict]:
    """
    Returns a list of { "page": int, "text": str } for every non-empty page.
    Raises ExtractionError on any failure (corrupted file, unreadable, etc.)
    """
    try:
        doc = fitz.open(pdf_path)
    except Exception as exc:
        logger.error(f"Failed to open PDF {pdf_path}: {exc}")
        raise ExtractionError(f"Could not open PDF file: {exc}")

    pages = []
    try:
        for page_number, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if text:
                pages.append({"page": page_number, "text": text})
    except Exception as exc:
        logger.error(f"Failed to extract text from {pdf_path}: {exc}")
        raise ExtractionError(f"Could not extract text from PDF: {exc}")
    finally:
        doc.close()

    if not pages:
        raise ExtractionError("No extractable text found in PDF (it may be a scanned image).")

    return pages
