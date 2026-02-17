"""Pydantic models for admin management endpoints."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SystemUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id_to_str(cls, v: str | UUID) -> str:
        return str(v)

    username: str
    role: str
    created_at: datetime
    updated_at: datetime
    last_login: datetime | None = None
    is_active: bool
    reading_count: int = 0


class SystemUserListResponse(BaseModel):
    users: list[SystemUserResponse]
    total: int
    limit: int
    offset: int


class RoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern=r"^(admin|moderator|user|readonly)$")


class StatusUpdateRequest(BaseModel):
    is_active: bool


class PasswordResetResponse(BaseModel):
    temporary_password: str
    message: str


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    total_oracle_profiles: int
    total_readings: int
    readings_today: int
    users_by_role: dict[str, int]


class AdminOracleProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    name_persian: str | None = None
    birthday: date
    country: str | None = None
    city: str | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    reading_count: int = 0


class AdminOracleProfileListResponse(BaseModel):
    profiles: list[AdminOracleProfileResponse]
    total: int
    limit: int
    offset: int
