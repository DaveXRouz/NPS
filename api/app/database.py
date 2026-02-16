"""Database session and engine setup — PostgreSQL only (schema uses ARRAY types)."""

import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)


def _build_engine():
    """Connect to PostgreSQL. Fails hard if unavailable (no SQLite fallback)."""
    url = settings.effective_database_url
    logger.info(
        "Connecting to PostgreSQL at %s",
        url.split("@")[-1] if "@" in url else "(embedded)",
    )

    eng = create_engine(
        url,
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_recycle=settings.db_pool_recycle,
        pool_timeout=30,
        echo=False,
    )
    with eng.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info(
        "Connected to PostgreSQL (pool_size=%d, max_overflow=%d)",
        settings.db_pool_size,
        settings.db_max_overflow,
    )
    return eng


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def create_tables():
    """Create all tables (safe to call repeatedly — no-ops on existing tables)."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
