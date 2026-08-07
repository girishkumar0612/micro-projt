"""
SQLite engine/session — stores only document metadata (see models/db_models.py).
Chat history is intentionally NOT persisted (kept in-memory on the frontend
for the current session, per project decision).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.utils.config import settings

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


def init_db():
    from app.models import db_models  # noqa: F401  (ensures model is registered)
    Base.metadata.create_all(bind=engine)
