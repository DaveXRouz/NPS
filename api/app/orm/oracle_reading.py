"""SQLAlchemy ORM models for oracle_readings, oracle_reading_users, and oracle_daily_readings tables."""

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.orm import PlatformJSONB


class OracleReading(Base):
    __tablename__ = "oracle_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("oracle_users.id"))
    is_multi_user: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    primary_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("oracle_users.id"))
    question: Mapped[str] = mapped_column(Text, nullable=False)
    question_persian: Mapped[str | None] = mapped_column(Text)
    sign_type: Mapped[str] = mapped_column(String(20), nullable=False)
    sign_value: Mapped[str] = mapped_column(String(100), nullable=False)
    reading_result: Mapped[dict | None] = mapped_column(PlatformJSONB)
    ai_interpretation: Mapped[dict | None] = mapped_column(PlatformJSONB)
    ai_interpretation_persian: Mapped[dict | None] = mapped_column(PlatformJSONB)
    individual_results: Mapped[dict | None] = mapped_column(PlatformJSONB)
    compatibility_matrix: Mapped[dict | None] = mapped_column(PlatformJSONB)
    combined_energy: Mapped[dict | None] = mapped_column(PlatformJSONB)

    # Framework alignment columns (Issue #101)
    framework_version: Mapped[str | None] = mapped_column(String(20))
    reading_mode: Mapped[str | None] = mapped_column(String(20), server_default="full")
    numerology_system: Mapped[str | None] = mapped_column(String(20), server_default="pythagorean")

    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class OracleReadingUser(Base):
    __tablename__ = "oracle_reading_users"

    reading_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("oracle_readings.id"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("oracle_users.id"), primary_key=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)


class OracleDailyReading(Base):
    """Auto-generated daily readings, one per user per day.

    Matches init.sql ``oracle_daily_readings`` table with full reading data storage.
    """

    __tablename__ = "oracle_daily_readings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("oracle_users.id", ondelete="CASCADE"), nullable=False
    )
    reading_date: Mapped[date] = mapped_column(Date, nullable=False)
    reading_result: Mapped[dict] = mapped_column(PlatformJSONB, nullable=False)
    daily_insights: Mapped[dict | None] = mapped_column(PlatformJSONB)
    numerology_system: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="pythagorean"
    )
    confidence_score: Mapped[float | None] = mapped_column(Float, default=0)
    framework_version: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (UniqueConstraint("user_id", "reading_date", name="uq_daily_user_date"),)
