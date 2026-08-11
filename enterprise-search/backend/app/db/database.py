"""
SQLite engine/session.
Stores document metadata, conversation history, and chat messages.
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
    from app.models import db_models  # noqa: F401  (ensures all models are registered)
    Base.metadata.create_all(bind=engine)
