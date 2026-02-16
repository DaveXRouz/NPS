"""Pydantic models for system user management endpoints."""

from datetime import datetime

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SystemUserResponse(BaseModel):
    """System user profile (never exposes password_hash)."""

    model_config = ConfigDict(from_attributes=True)

    id: str

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id_to_str(cls, v: str | UUID) -> str:
        return str(v)

    username: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login: datetime | None = None


class SystemUserListResponse(BaseModel):
    users: list[SystemUserResponse]
    total: int
    limit: int
    offset: int


class SystemUserUpdate(BaseModel):
    """Admin can update username and is_active."""

    username: str | None = Field(None, min_length=3, max_length=100)
    is_active: bool | None = None


class PasswordResetRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128)


class RoleChangeRequest(BaseModel):
    role: str = Field(...)

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("admin", "moderator", "user", "readonly"):
            raise ValueError("Role must be one of: admin, moderator, user, readonly")
        return v
