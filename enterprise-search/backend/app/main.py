"""
Enterprise Search Assistant — FastAPI entrypoint.

Run with:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db
from app.routes import upload_routes, document_routes, chat_routes, summarize_routes
from app.routes import conversation_routes
from app.utils.exceptions import AppException, app_exception_handler, unhandled_exception_handler
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title="Enterprise Search Assistant API",
    description="RAG-powered document Q&A over uploaded enterprise PDFs.",
    version="1.0.0",
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
app.include_router(upload_routes.router)
app.include_router(summarize_routes.router)
app.include_router(document_routes.router)
app.include_router(chat_routes.router)
app.include_router(conversation_routes.router)


@app.on_event("startup")
def on_startup():
    logger.info("Starting Enterprise Search Assistant API...")
    init_db()
    logger.info("SQLite metadata DB ready.")


@app.get("/")
def root():
    return {"message": "Enterprise Search Assistant API is running.", "docs": "/docs"}
