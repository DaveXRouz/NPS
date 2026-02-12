"""SQLAlchemy ORM models for oracle_reading_feedback and oracle_learning_data tables."""

from datetime import datetime

from sqlalchemy import (
    Double,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class OracleReadingFeedback(Base):
    __tablename__ = "oracle_reading_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reading_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("oracle_readings.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("oracle_users.id", ondelete="SET NULL")
    )
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    section_feedback: Mapped[str | None] = mapped_column(Text, default="{}")
    text_feedback: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("reading_id", "user_id", name="oracle_feedback_unique"),)


class OracleLearningData(Base):
    __tablename__ = "oracle_learning_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    metric_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    metric_value: Mapped[float] = mapped_column(Double, nullable=False, default=0)
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    details: Mapped[str | None] = mapped_column(Text, default="{}")
    prompt_emphasis: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
