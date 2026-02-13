"""Pydantic models for share link endpoints."""

from pydantic import BaseModel


class ShareLinkCreate(BaseModel):
    reading_id: int
    expires_in_days: int | None = None


class ShareLinkResponse(BaseModel):
    token: str
    url: str
    expires_at: str | None
    created_at: str


class SharedReadingResponse(BaseModel):
    reading: dict
    shared_at: str
    view_count: int
