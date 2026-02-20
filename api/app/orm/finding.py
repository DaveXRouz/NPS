"""SQLAlchemy ORM model for the findings (vault) table."""

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.orm import PlatformJSONB


class Finding(Base):
    """Vault finding — a discovered wallet address with balance and score metadata.

    Maps to the ``findings`` table defined in ``database/init.sql``.
    Primary key is UUID (uuid_generate_v4 on PostgreSQL).
    """

    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    session_id: Mapped[str | None] = mapped_column(PG_UUID(as_uuid=False))
    address: Mapped[str] = mapped_column(Text, nullable=False)
    chain: Mapped[str] = mapped_column(String(20), nullable=False, server_default="btc")
    balance: Mapped[float] = mapped_column(Numeric(30, 18), default=0)
    score: Mapped[float] = mapped_column(Float, default=0)

    # Encrypted sensitive fields
    private_key_enc: Mapped[str | None] = mapped_column(Text)
    seed_phrase_enc: Mapped[str | None] = mapped_column(Text)
    wif_enc: Mapped[str | None] = mapped_column(Text)
    extended_private_key_enc: Mapped[str | None] = mapped_column(Text)

    # Metadata
    source: Mapped[str | None] = mapped_column(String(50))
    puzzle_number: Mapped[int | None] = mapped_column(Integer)
    score_breakdown: Mapped[dict | None] = mapped_column(PlatformJSONB)
    extra_metadata: Mapped[dict | None] = mapped_column(
        "metadata", PlatformJSONB, server_default="{}"
    )

    # Timestamps
    found_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Legacy migration tracking
    v3_session: Mapped[str | None] = mapped_column(String(200))
    migrated_from: Mapped[str | None] = mapped_column(String(20), server_default="v4")

    __table_args__ = (
        Index("idx_findings_chain", "chain"),
        Index("idx_findings_session", "session_id"),
        Index("idx_findings_found_at", "found_at"),
        Index("idx_findings_score", "score"),
    )
