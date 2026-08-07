"""
Embedding model wrapper — HuggingFace sentence-transformers/all-MiniLM-L6-v2,
loaded once and reused (loading the model is the expensive part).
"""
from functools import lru_cache
from langchain_huggingface import HuggingFaceEmbeddings
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    logger.info(f"Loading embedding model: {settings.embedding_model}")
    return HuggingFaceEmbeddings(
        model_name=settings.embedding_model,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )
