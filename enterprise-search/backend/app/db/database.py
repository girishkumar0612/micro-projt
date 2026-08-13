"""
SQLite engine/session — stores only document metadata (see models/db_models.py).
Chat history is intentionally NOT persisted (kept in-memory on the frontend
for the current session, per project decision).
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

engine = create_engine(
    settings.sqlite_url,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _add_column_if_missing(table: str, column_def: str) -> None:
    """SQLite has no ADD COLUMN IF NOT EXISTS — check pragma first."""
    column_name = column_def.split()[0].strip('"')
    with engine.connect() as conn:
        cols = [row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))]
        if column_name not in cols:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column_def}"))
            conn.commit()
            logger.info(f"Added '{column_name}' column to {table}")


def init_db():
    from app.models import db_models  # noqa: F401  (ensures model is registered)
    Base.metadata.create_all(bind=engine)
    # Lightweight migrations for existing installs (columns added after launch).
    _add_column_if_missing("documents", "roles TEXT NOT NULL DEFAULT '[]'")
    _add_column_if_missing("documents", "summary TEXT NOT NULL DEFAULT ''")
    _add_column_if_missing("documents", "department TEXT NOT NULL DEFAULT 'Other'")
    _add_column_if_missing("documents", "access TEXT NOT NULL DEFAULT 'Internal'")
