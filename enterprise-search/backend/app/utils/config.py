"""
Centralized application configuration.
Reads from environment variables / .env so nothing is hardcoded.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # Groq LLM
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Embeddings
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Admin auth
    admin_token: str = "admin123"

    # RAG tuning
    chunk_size: int = 800
    chunk_overlap: int = 120
    top_k: int = 5

    # Storage paths
    upload_dir: str = "uploads"
    vectorstore_dir: str = "vectorstore"
    sqlite_path: str = "app.db"

    # CORS
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def upload_path(self) -> Path:
        p = BACKEND_ROOT / self.upload_dir
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def vectorstore_path(self) -> Path:
        p = BACKEND_ROOT / self.vectorstore_dir
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def sqlite_url(self) -> str:
        db_path = BACKEND_ROOT / self.sqlite_path
        return f"sqlite:///{db_path}"


settings = Settings()
