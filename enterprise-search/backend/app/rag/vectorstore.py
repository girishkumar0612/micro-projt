"""
FAISS vector store management.

Wraps LangChain's FAISS integration to provide:
  - add_chunks(document_id, chunks)              -> index new chunks, persist to disk
  - delete_document(document_id)                 -> remove all vectors for a document, persist
  - similarity_search(query, k)                  -> top-k chunks (no filter)
  - similarity_search_filtered(query, doc_ids, k) -> top-k chunks restricted to allowed doc IDs
  - is_ready() / count()                         -> introspection for /health and /ask

The index is a singleton loaded lazily and cached in-process; every mutation
re-persists it to disk (vectorstore/index.faiss + index.pkl) so it survives
a server restart.
"""
import threading
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document as LCDocument
from app.rag.embeddings import get_embeddings
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

_lock = threading.Lock()
_store: FAISS | None = None


def _index_files_exist() -> bool:
    return (settings.vectorstore_path / "index.faiss").exists()


def _load_or_none() -> FAISS | None:
    if not _index_files_exist():
        return None
    try:
        return FAISS.load_local(
            str(settings.vectorstore_path),
            get_embeddings(),
            allow_dangerous_deserialization=True,
        )
    except Exception as exc:
        logger.error(f"Failed to load FAISS index: {exc}")
        return None


def _get_store() -> FAISS | None:
    global _store
    if _store is None:
        _store = _load_or_none()
    return _store


def is_ready() -> bool:
    return _get_store() is not None


def count() -> int:
    store = _get_store()
    if store is None:
        return 0
    return store.index.ntotal


def add_chunks(document_id: str, chunks: list[dict]) -> int:
    """
    chunks: [{ "text": str, "page": int, "source": str }, ...]
    Returns number of chunks indexed.
    """
    global _store
    if not chunks:
        return 0

    docs = [
        LCDocument(
            page_content=c["text"],
            metadata={"document_id": document_id, "source": c["source"], "page": c["page"]},
        )
        for c in chunks
    ]

    with _lock:
        store = _get_store()
        if store is None:
            store = FAISS.from_documents(docs, get_embeddings())
        else:
            store.add_documents(docs)
        store.save_local(str(settings.vectorstore_path))
        _store = store

    logger.info(f"Indexed {len(docs)} chunks for document {document_id}")
    return len(docs)


def delete_document(document_id: str) -> None:
    """Removes all vectors belonging to a document and re-persists the index."""
    global _store
    with _lock:
        store = _get_store()
        if store is None:
            return

        ids_to_delete = [
            doc_id
            for doc_id, doc in store.docstore._dict.items()
            if doc.metadata.get("document_id") == document_id
        ]
        if ids_to_delete:
            store.delete(ids_to_delete)
            store.save_local(str(settings.vectorstore_path))
            _store = store
        logger.info(f"Deleted {len(ids_to_delete)} chunks for document {document_id}")


def _distance_to_similarity(distance: float) -> float:
    """Convert FAISS L2 distance on normalised embeddings to a [0,1] similarity score."""
    return max(0.0, 1 - (distance / 2))


def similarity_search(query: str, k: int | None = None) -> list[dict]:
    """
    Unrestricted top-k search across all indexed chunks.
    Returns [{ "text", "score", "source", "page" }, ...] sorted by relevance.
    """
    store = _get_store()
    if store is None:
        return []

    k = k or settings.top_k
    results = store.similarity_search_with_score(query, k=k)

    return [
        {
            "text": doc.page_content,
            "score": round(_distance_to_similarity(distance), 4),
            "source": doc.metadata.get("source", "unknown"),
            "page": doc.metadata.get("page"),
        }
        for doc, distance in results
    ]


def similarity_search_filtered(
    query: str,
    allowed_doc_ids: list[str],
    k: int | None = None,
) -> list[dict]:
    """
    RBAC-aware search: only considers chunks whose document_id is in allowed_doc_ids.

    Strategy: fetch a larger candidate pool (k * 10, capped at total index size) and
    filter down to the allowed set, then return the top-k from that filtered set.
    This avoids re-implementing FAISS internals while staying simple for an MVP.
    """
    store = _get_store()
    if store is None:
        return []

    if not allowed_doc_ids:
        logger.info("RBAC filter: no allowed documents for this role — returning empty results.")
        return []

    allowed_set = set(allowed_doc_ids)
    k = k or settings.top_k

    # Fetch a wider candidate pool so filtering doesn't starve us of results
    total = store.index.ntotal
    fetch_k = min(total, max(k * 10, 50))

    results = store.similarity_search_with_score(query, k=fetch_k)

    filtered = []
    for doc, distance in results:
        if doc.metadata.get("document_id") in allowed_set:
            filtered.append({
                "text": doc.page_content,
                "score": round(_distance_to_similarity(distance), 4),
                "source": doc.metadata.get("source", "unknown"),
                "page": doc.metadata.get("page"),
            })
        if len(filtered) >= k:
            break

    logger.info(
        f"RBAC search: {len(filtered)} chunks returned from {len(allowed_set)} allowed documents"
    )
    return filtered
