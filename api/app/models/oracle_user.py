"""Pydantic models for Oracle user CRUD endpoints."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OracleUserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    name_persian: str | None = Field(None, max_length=200)
    birthday: date
    mother_name: str = Field(..., min_length=1, max_length=200)
    mother_name_persian: str | None = Field(None, max_length=200)
    country: str | None = Field(None, max_length=100)
    city: str | None = Field(None, max_length=100)
    gender: str | None = Field(None, pattern=r"^(male|female)$")
    heart_rate_bpm: int | None = Field(None, ge=30, le=220)
    timezone_hours: int | None = Field(None, ge=-12, le=14)
    timezone_minutes: int | None = Field(None, ge=0, le=59)
    latitude: float | None = Field(None, ge=-90.0, le=90.0)
    longitude: float | None = Field(None, ge=-180.0, le=180.0)

    @field_validator("birthday")
    @classmethod
    def birthday_range(cls, v: date) -> date:
        if v and v.year < 1900:
            raise ValueError("Birthday must be after 1900")
        if v and v > date.today():
            raise ValueError("Birthday cannot be in the future")
        return v


class OracleUserUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    name_persian: str | None = Field(None, max_length=200)
    birthday: date | None = None
    mother_name: str | None = Field(None, min_length=1, max_length=200)
    mother_name_persian: str | None = Field(None, max_length=200)
    country: str | None = Field(None, max_length=100)
    city: str | None = Field(None, max_length=100)
    gender: str | None = Field(None, pattern=r"^(male|female)$")
    heart_rate_bpm: int | None = Field(None, ge=30, le=220)
    timezone_hours: int | None = Field(None, ge=-12, le=14)
    timezone_minutes: int | None = Field(None, ge=0, le=59)
    latitude: float | None = Field(None, ge=-90.0, le=90.0)
    longitude: float | None = Field(None, ge=-180.0, le=180.0)

    @field_validator("birthday")
    @classmethod
    def birthday_range(cls, v: date | None) -> date | None:
        if v is not None and v.year < 1900:
            raise ValueError("Birthday must be after 1900")
        if v is not None and v > date.today():
            raise ValueError("Birthday cannot be in the future")
        return v


class OracleUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    name_persian: str | None = None
    birthday: date
    mother_name: str
    mother_name_persian: str | None = None
    country: str | None = None
    city: str | None = None
    gender: str | None = None
    heart_rate_bpm: int | None = None
    timezone_hours: int | None = None
    timezone_minutes: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime


class OracleUserListResponse(BaseModel):
    users: list[OracleUserResponse]
    total: int
    limit: int
    offset: int
