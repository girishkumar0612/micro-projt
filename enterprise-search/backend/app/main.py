"""
Enterprise Search Assistant — FastAPI entrypoint.

Run with:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import threading

from app.db.database import init_db, SessionLocal
from app.routes import upload_routes, document_routes, chat_routes, auth_routes
from app.services import auth_service
from app.utils.exceptions import AppException, app_exception_handler, unhandled_exception_handler
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title="Enterprise Search Assistant API",
    description="RAG-powered document Q&A over uploaded enterprise PDFs.",
    version="1.1.0",
)

# ---- CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Exception handlers ----
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# ---- Routers ----
app.include_router(auth_routes.router)
app.include_router(upload_routes.router)
app.include_router(document_routes.router)
app.include_router(chat_routes.router)


@app.on_event("startup")
def on_startup():
    logger.info("Starting Enterprise Search Assistant API...")
    init_db()
    with SessionLocal() as db:
        auth_service.seed_default_users(db)
    logger.info("SQLite metadata DB ready.")

    # Pre-warm the embedding model in the background so the FIRST upload / query
    # doesn't stall for minutes while sentence-transformers downloads the model.
    def _warm_embeddings():
        try:
            from app.rag.embeddings import get_embeddings
            get_embeddings()
            logger.info("Embedding model warmed up.")
        except Exception as exc:  # non-fatal: model loads lazily on first use
            logger.error(f"Embedding pre-warm failed: {exc}")

    threading.Thread(target=_warm_embeddings, daemon=True).start()


@app.get("/")
def root():
    return {"message": "Enterprise Search Assistant API is running.", "docs": "/docs"}
