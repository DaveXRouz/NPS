"""SQLAlchemy ORM model for oracle_settings table."""

from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class OracleSettings(Base):
    __tablename__ = "oracle_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("oracle_users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    language: Mapped[str] = mapped_column(String(10), server_default="en")
    theme: Mapped[str] = mapped_column(String(20), server_default="light")
    numerology_system: Mapped[str] = mapped_column(String(20), server_default="auto")
    default_timezone_hours: Mapped[int] = mapped_column(Integer, server_default="0")
    default_timezone_minutes: Mapped[int] = mapped_column(Integer, server_default="0")
    daily_reading_enabled: Mapped[bool] = mapped_column(Boolean, server_default="true")
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
