"""
Chunking layer — turns extracted per-page text into overlapping chunks
suitable for embedding, using LangChain's RecursiveCharacterTextSplitter.
Each chunk keeps a reference to the page it came from.
"""
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.utils.config import settings


def chunk_pages(pages: list[dict], filename: str) -> list[dict]:
    """
    pages: [{ "page": int, "text": str }, ...]
    Returns: [{ "text": str, "page": int, "source": filename }, ...]
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = []
    for page in pages:
        page_chunks = splitter.split_text(page["text"])
        for chunk_text in page_chunks:
            chunks.append({
                "text": chunk_text,
                "page": page["page"],
                "source": filename,
            })
    return chunks
