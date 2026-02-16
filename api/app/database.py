"""Database session and engine setup — PostgreSQL only (schema uses ARRAY types).

Engine creation is LAZY: no connection attempt until the first request or health check.
This allows the app to start on Railway even when PostgreSQL takes a few seconds to boot.
Retries with exponential backoff (1s, 2s, 4s, 8s, 16s = ~31s total).
"""

import logging
import time
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

# ── Module-level singletons (populated lazily) ──────────────────────────────

_engine: Optional[Engine] = None
_session_factory: Optional[sessionmaker] = None

_MAX_RETRIES = 5
_BACKOFF_SECONDS = [1, 2, 4, 8, 16]


class Base(DeclarativeBase):
    pass


# ── Public API ──────────────────────────────────────────────────────────────


def get_engine() -> Engine:
    """Return the SQLAlchemy engine, creating it on first call with retry."""
    global _engine
    if _engine is not None:
        return _engine

    url = settings.effective_database_url
    safe_url = url.split("@")[-1] if "@" in url else "(embedded)"

    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            logger.info(
                "Connecting to PostgreSQL at %s (attempt %d/%d)",
                safe_url,
                attempt + 1,
                _MAX_RETRIES,
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
            _engine = eng
            return _engine
        except Exception as exc:
            last_exc = exc
            if attempt < _MAX_RETRIES - 1:
                wait = _BACKOFF_SECONDS[attempt]
                logger.warning("PostgreSQL not ready, retrying in %ds: %s", wait, exc)
                time.sleep(wait)

    raise RuntimeError(f"Could not connect to PostgreSQL after {_MAX_RETRIES} attempts: {last_exc}")


def get_session_factory() -> sessionmaker:
    """Return a cached sessionmaker bound to the lazy engine."""
    global _session_factory
    if _session_factory is not None:
        return _session_factory
    _session_factory = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _session_factory


def is_database_ready() -> bool:
    """Check whether the engine has been successfully created (no side effects)."""
    return _engine is not None


def create_tables() -> None:
    """Create all tables (safe to call repeatedly — no-ops on existing tables)."""
    Base.metadata.create_all(bind=get_engine())


def get_db():
    """FastAPI dependency — yields a database session."""
    db: Session = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
