"""SQLAlchemy ORM model for the api_keys table."""

from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class APIKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    key_hash: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    scopes: Mapped[list[str] | None] = mapped_column(JSON, default=list, nullable=True)
    rate_limit: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column()
    last_used: Mapped[datetime | None] = mapped_column()
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    @property
    def scopes_list(self) -> list[str]:
        """Return scopes as a list."""
        return self.scopes or []

    @scopes_list.setter
    def scopes_list(self, values: list[str]):
        self.scopes = values
