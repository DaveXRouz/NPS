"""Backup and restore Pydantic models."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class BackupInfo(BaseModel):
    """Information about a single backup file."""

    filename: str
    type: str  # "oracle_full" | "oracle_data" | "full_database"
    timestamp: datetime
    size_bytes: int
    size_human: str  # "12.5 MB"
    tables: list[str] = []
    database: str = "nps"


class BackupListResponse(BaseModel):
    """Response for listing available backups."""

    backups: list[BackupInfo]
    total: int
    retention_policy: str  # "Oracle: 30 days, Full: 60 days"
    backup_directory: str


class BackupTriggerRequest(BaseModel):
    """Request to trigger a manual backup."""

    backup_type: str = Field(
        ...,
        pattern=r"^(oracle_full|oracle_data|full_database)$",
        description="Type of backup to create",
    )


class BackupTriggerResponse(BaseModel):
    """Response after triggering a backup."""

    status: str  # "success" | "failed"
    message: str
    backup: BackupInfo | None = None


class RestoreRequest(BaseModel):
    """Request to restore from a backup."""

    filename: str = Field(..., min_length=1)
    confirm: bool = Field(..., description="Must be True to confirm restore")


class RestoreResponse(BaseModel):
    """Response after a restore operation."""

    status: str  # "success" | "failed"
    message: str
    rows_restored: dict[str, int] = {}


class BackupDeleteResponse(BaseModel):
    """Response after deleting a backup."""

    status: str
    message: str
    filename: str
