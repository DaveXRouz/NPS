"""SQLAlchemy ORM model for the sessions table."""

from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import TypeDecorator

from app.database import Base
from app.orm import PlatformJSONB


class PlatformARRAY(TypeDecorator):
    """Platform-aware ARRAY: uses ARRAY(Text) on PostgreSQL, JSON on SQLite."""

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_ARRAY(Text))
        return dialect.type_descriptor(JSON)


class Session(Base):
    """Scan session — tracks a scanning run with its settings and stats.

    Maps to the ``sessions`` table defined in ``database/init.sql``.
    Primary key is UUID (uuid_generate_v4 on PostgreSQL).
    """

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    terminal_id: Mapped[str | None] = mapped_column(String(100))
    user_id: Mapped[str | None] = mapped_column(PG_UUID(as_uuid=False))
    mode: Mapped[str] = mapped_column(String(20), nullable=False, server_default="both")
    chains: Mapped[list | None] = mapped_column(PlatformARRAY())
    settings: Mapped[dict | None] = mapped_column(PlatformJSONB, server_default="{}")
    stats: Mapped[dict | None] = mapped_column(PlatformJSONB, server_default="{}")
    checkpoint: Mapped[dict | None] = mapped_column(PlatformJSONB)

    # Timestamps
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_secs: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), server_default="running")

    # Legacy migration tracking
    v3_session_id: Mapped[str | None] = mapped_column(String(200))
    migrated_from: Mapped[str | None] = mapped_column(String(20), server_default="v4")

    __table_args__ = (
        Index("idx_sessions_status", "status"),
        Index("idx_sessions_user", "user_id"),
        Index("idx_sessions_started", "started_at"),
    )
