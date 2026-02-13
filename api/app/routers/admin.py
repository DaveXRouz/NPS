"""Admin endpoints — system user management, Oracle profile management, stats, backups."""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user, require_scope
from app.models.admin import (
    AdminOracleProfileListResponse,
    AdminOracleProfileResponse,
    AdminStatsResponse,
    PasswordResetResponse,
    RoleUpdateRequest,
    StatusUpdateRequest,
    SystemUserListResponse,
    SystemUserResponse,
)
from app.models.backup import (
    BackupDeleteResponse,
    BackupInfo,
    BackupListResponse,
    BackupTriggerRequest,
    BackupTriggerResponse,
    RestoreRequest,
    RestoreResponse,
)
from app.services.admin_service import AdminService
from app.services.audit import AuditService, get_audit_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Project root for locating backup scripts and directories
_PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    return AdminService(db)


def _get_client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


# ─── System User Management ────────────────────────────────────────


@router.get(
    "/users",
    response_model=SystemUserListResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def list_system_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None, max_length=100),
    sort_by: str = Query(
        "created_at",
        pattern=r"^(username|role|created_at|last_login|is_active)$",
    ),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    svc: AdminService = Depends(_get_admin_service),
) -> SystemUserListResponse:
    """List all system users (admin only). Supports search, sort, pagination."""
    users, total = svc.list_users(
        limit=limit,
        offset=offset,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return SystemUserListResponse(
        users=[SystemUserResponse(**u) for u in users],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/users/{user_id}",
    response_model=SystemUserResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def get_system_user(
    user_id: str,
    svc: AdminService = Depends(_get_admin_service),
) -> SystemUserResponse:
    """Get a single system user by ID (admin only)."""
    user = svc.get_user_detail(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return SystemUserResponse(**user)


@router.patch(
    "/users/{user_id}/role",
    response_model=SystemUserResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def update_user_role(
    user_id: str,
    body: RoleUpdateRequest,
    request: Request,
    _user: dict = Depends(get_current_user),
    svc: AdminService = Depends(_get_admin_service),
    audit: AuditService = Depends(get_audit_service),
) -> SystemUserResponse:
    """Change a user's role (admin only). Cannot change own role."""
    # Get old role for audit
    old_detail = svc.get_user_detail(user_id)
    if not old_detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    old_role = old_detail["role"]

    try:
        svc.update_role(user_id, body.role, _user.get("user_id", ""))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    audit.log_admin_role_changed(
        target_user_id=user_id,
        old_role=old_role,
        new_role=body.role,
        ip=_get_client_ip(request),
        key_hash=_user.get("api_key_hash"),
    )
    svc.db.commit()

    detail = svc.get_user_detail(user_id)
    return SystemUserResponse(**detail)  # type: ignore[arg-type]


@router.post(
    "/users/{user_id}/reset-password",
    response_model=PasswordResetResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def reset_user_password(
    user_id: str,
    request: Request,
    _user: dict = Depends(get_current_user),
    svc: AdminService = Depends(_get_admin_service),
    audit: AuditService = Depends(get_audit_service),
) -> PasswordResetResponse:
    """Reset a user's password to a temporary value (admin only)."""
    result = svc.reset_password(user_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    _user_obj, temp_password = result

    audit.log_admin_password_reset(
        target_user_id=user_id,
        ip=_get_client_ip(request),
        key_hash=_user.get("api_key_hash"),
    )
    svc.db.commit()

    return PasswordResetResponse(
        temporary_password=temp_password,
        message="Password has been reset. Share this temporary password securely.",
    )


@router.patch(
    "/users/{user_id}/status",
    response_model=SystemUserResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def update_user_status(
    user_id: str,
    body: StatusUpdateRequest,
    request: Request,
    _user: dict = Depends(get_current_user),
    svc: AdminService = Depends(_get_admin_service),
    audit: AuditService = Depends(get_audit_service),
) -> SystemUserResponse:
    """Activate or deactivate a user (admin only). Cannot deactivate self."""
    try:
        svc.update_status(user_id, body.is_active, _user.get("user_id", ""))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    audit.log_admin_status_changed(
        target_user_id=user_id,
        new_status=body.is_active,
        ip=_get_client_ip(request),
        key_hash=_user.get("api_key_hash"),
    )
    svc.db.commit()

    detail = svc.get_user_detail(user_id)
    return SystemUserResponse(**detail)  # type: ignore[arg-type]


@router.get(
    "/stats",
    response_model=AdminStatsResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def get_admin_stats(
    svc: AdminService = Depends(_get_admin_service),
) -> AdminStatsResponse:
    """Get aggregated system statistics (admin only)."""
    stats = svc.get_stats()
    return AdminStatsResponse(**stats)


# ─── Oracle Profile Management ────────────────────────────────────


@router.get(
    "/profiles",
    response_model=AdminOracleProfileListResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def list_oracle_profiles(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None, max_length=100),
    sort_by: str = Query("created_at", pattern=r"^(name|birthday|created_at)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    include_deleted: bool = Query(False),
    svc: AdminService = Depends(_get_admin_service),
) -> AdminOracleProfileListResponse:
    """List all Oracle profiles (admin only). Optionally include soft-deleted."""
    profiles, total = svc.list_oracle_profiles(
        limit=limit,
        offset=offset,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        include_deleted=include_deleted,
    )
    return AdminOracleProfileListResponse(
        profiles=[AdminOracleProfileResponse(**p) for p in profiles],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.delete(
    "/profiles/{profile_id}",
    response_model=AdminOracleProfileResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def delete_oracle_profile(
    profile_id: int,
    request: Request,
    _user: dict = Depends(get_current_user),
    svc: AdminService = Depends(_get_admin_service),
    audit: AuditService = Depends(get_audit_service),
) -> AdminOracleProfileResponse:
    """Hard-delete an Oracle profile and its readings (admin only)."""
    profile = svc.delete_oracle_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    audit.log_admin_profile_deleted(
        profile_id=profile_id,
        ip=_get_client_ip(request),
        key_hash=_user.get("api_key_hash"),
    )
    svc.db.commit()

    return AdminOracleProfileResponse(**profile)


# ─── Backup & Restore ────────────────────────────────────────────


def _human_size(size_bytes: int) -> str:
    """Convert bytes to human-readable size string."""
    for unit in ("B", "KB", "MB", "GB"):
        if abs(size_bytes) < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024  # type: ignore[assignment]
    return f"{size_bytes:.1f} TB"


def _classify_backup(filename: str) -> str:
    """Classify backup type from filename."""
    if filename.startswith("oracle_full_"):
        return "oracle_full"
    if filename.startswith("oracle_data_"):
        return "oracle_data"
    if filename.startswith("nps_backup_"):
        return "full_database"
    return "unknown"


def _parse_timestamp_from_filename(filename: str) -> datetime:
    """Extract timestamp from backup filename pattern *_YYYYMMDD_HHMMSS.sql.gz."""
    match = re.search(r"(\d{8}_\d{6})\.sql\.gz$", filename)
    if match:
        return datetime.strptime(match.group(1), "%Y%m%d_%H%M%S").replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def _scan_backups() -> list[BackupInfo]:
    """Scan backup directories and return BackupInfo list."""
    backups: list[BackupInfo] = []
    oracle_dir = _PROJECT_ROOT / "backups" / "oracle"
    full_dir = _PROJECT_ROOT / "backups"

    for directory in [oracle_dir, full_dir]:
        if not directory.exists():
            continue
        for gz_file in directory.glob("*.sql.gz"):
            filename = gz_file.name
            backup_type = _classify_backup(filename)
            if backup_type == "unknown":
                continue
            # Only scan oracle_* in oracle dir, nps_backup_* in root backups dir
            if directory == full_dir and not filename.startswith("nps_backup_"):
                continue

            # Try to read .meta.json sidecar
            meta_path = gz_file.with_suffix("").with_suffix(".meta.json")
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text())
                    backups.append(
                        BackupInfo(
                            filename=meta.get("filename", filename),
                            type=backup_type,
                            timestamp=datetime.fromisoformat(
                                meta["timestamp"].replace("Z", "+00:00")
                            ),
                            size_bytes=meta.get("size_bytes", 0),
                            size_human=_human_size(meta.get("size_bytes", 0)),
                            tables=meta.get("tables", []),
                            database=meta.get("database", "nps"),
                        )
                    )
                    continue
                except (json.JSONDecodeError, KeyError, ValueError):
                    pass

            # Fallback: derive from file stat
            stat = gz_file.stat()
            backups.append(
                BackupInfo(
                    filename=filename,
                    type=backup_type,
                    timestamp=_parse_timestamp_from_filename(filename),
                    size_bytes=stat.st_size,
                    size_human=_human_size(stat.st_size),
                    tables=[],
                    database="nps",
                )
            )

    # Sort newest first
    backups.sort(key=lambda b: b.timestamp, reverse=True)
    return backups


def _find_backup_path(filename: str) -> Path | None:
    """Find the full path for a backup filename. Returns None if not found."""
    oracle_path = _PROJECT_ROOT / "backups" / "oracle" / filename
    full_path = _PROJECT_ROOT / "backups" / filename
    if oracle_path.exists():
        return oracle_path
    if full_path.exists():
        return full_path
    return None


@router.get(
    "/backups",
    response_model=BackupListResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def list_backups() -> BackupListResponse:
    """List available backup files with metadata."""
    backups = _scan_backups()
    return BackupListResponse(
        backups=backups,
        total=len(backups),
        retention_policy="Oracle: 30 days, Full database: 60 days",
        backup_directory=str(_PROJECT_ROOT / "backups"),
    )


@router.post(
    "/backups",
    response_model=BackupTriggerResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def trigger_backup(
    body: BackupTriggerRequest,
    request: Request,
    _user: dict = Depends(get_current_user),
    audit: AuditService = Depends(get_audit_service),
) -> BackupTriggerResponse:
    """Trigger an immediate backup."""
    script_map = {
        "oracle_full": [
            str(_PROJECT_ROOT / "database" / "scripts" / "oracle_backup.sh"),
            "--non-interactive",
        ],
        "oracle_data": [
            str(_PROJECT_ROOT / "database" / "scripts" / "oracle_backup.sh"),
            "--data-only",
            "--non-interactive",
        ],
        "full_database": [
            str(_PROJECT_ROOT / "scripts" / "backup.sh"),
            "--non-interactive",
        ],
    }

    cmd = script_map.get(body.backup_type)
    if not cmd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid backup type: {body.backup_type}",
        )

    timeout = 300 if body.backup_type == "full_database" else 120
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        audit.log(
            "admin.backup_trigger",
            success=False,
            ip_address=_get_client_ip(request),
            details={"backup_type": body.backup_type, "error": "timeout"},
        )
        audit.db.commit()
        return BackupTriggerResponse(
            status="failed",
            message=f"Backup timed out after {timeout} seconds",
        )

    if result.returncode != 0:
        audit.log(
            "admin.backup_trigger",
            success=False,
            ip_address=_get_client_ip(request),
            details={"backup_type": body.backup_type, "stderr": result.stderr[:500]},
        )
        audit.db.commit()
        return BackupTriggerResponse(
            status="failed",
            message=result.stderr.strip() or "Backup failed",
        )

    # Find the newest backup file to return its info
    backups = _scan_backups()
    backup_info = backups[0] if backups else None

    audit.log(
        "admin.backup_trigger",
        success=True,
        ip_address=_get_client_ip(request),
        details={
            "backup_type": body.backup_type,
            "filename": backup_info.filename if backup_info else "unknown",
        },
    )
    audit.db.commit()

    return BackupTriggerResponse(
        status="success",
        message="Backup created successfully",
        backup=backup_info,
    )


@router.post(
    "/backups/restore",
    response_model=RestoreResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def restore_backup(
    body: RestoreRequest,
    request: Request,
    _user: dict = Depends(get_current_user),
    audit: AuditService = Depends(get_audit_service),
) -> RestoreResponse:
    """Restore database from a backup file."""
    if not body.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirm must be true to proceed with restore",
        )

    filename = body.filename
    # Security: prevent path traversal
    if os.path.basename(filename) != filename or "/" in filename or "\\" in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename",
        )
    if not filename.endswith(".sql.gz"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename: must end with .sql.gz",
        )

    backup_path = _find_backup_path(filename)
    if not backup_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Backup file not found: {filename}",
        )

    # Determine which restore script to use
    if filename.startswith("oracle_"):
        cmd = [
            str(_PROJECT_ROOT / "database" / "scripts" / "oracle_restore.sh"),
            "--non-interactive",
            str(backup_path),
        ]
        timeout = 300
    elif filename.startswith("nps_backup_"):
        cmd = [
            str(_PROJECT_ROOT / "scripts" / "restore.sh"),
            "--non-interactive",
            str(backup_path),
        ]
        timeout = 300
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot determine restore script for this backup type",
        )

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        audit.log(
            "admin.backup_restore",
            success=False,
            ip_address=_get_client_ip(request),
            details={"filename": filename, "error": "timeout"},
        )
        audit.db.commit()
        return RestoreResponse(
            status="failed",
            message=f"Restore timed out after {timeout} seconds",
        )

    if result.returncode != 0:
        audit.log(
            "admin.backup_restore",
            success=False,
            ip_address=_get_client_ip(request),
            details={"filename": filename, "stderr": result.stderr[:500]},
        )
        audit.db.commit()
        return RestoreResponse(
            status="failed",
            message=result.stderr.strip() or "Restore failed",
        )

    # Try to parse row counts from JSON_OUTPUT line
    rows_restored: dict[str, int] = {}
    for line in result.stdout.splitlines():
        if line.startswith("JSON_OUTPUT:"):
            try:
                data = json.loads(line[len("JSON_OUTPUT:") :])
                rows_restored = data.get("rows", {})
            except json.JSONDecodeError:
                pass

    audit.log(
        "admin.backup_restore",
        success=True,
        ip_address=_get_client_ip(request),
        details={"filename": filename, "rows_restored": rows_restored},
    )
    audit.db.commit()

    return RestoreResponse(
        status="success",
        message="Restore completed successfully",
        rows_restored=rows_restored,
    )


@router.delete(
    "/backups/{filename}",
    response_model=BackupDeleteResponse,
    dependencies=[Depends(require_scope("admin"))],
)
def delete_backup(
    filename: str,
    request: Request,
    _user: dict = Depends(get_current_user),
    audit: AuditService = Depends(get_audit_service),
) -> BackupDeleteResponse:
    """Delete a specific backup file."""
    # Security: prevent path traversal
    if os.path.basename(filename) != filename or "/" in filename or "\\" in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename",
        )
    if not filename.endswith(".sql.gz"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename: must end with .sql.gz",
        )

    backup_path = _find_backup_path(filename)
    if not backup_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Backup file not found: {filename}",
        )

    # Delete .sql.gz and .meta.json sidecar
    backup_path.unlink()
    meta_path = backup_path.with_suffix("").with_suffix(".meta.json")
    if meta_path.exists():
        meta_path.unlink()

    audit.log(
        "admin.backup_delete",
        success=True,
        ip_address=_get_client_ip(request),
        details={"filename": filename},
    )
    audit.db.commit()

    return BackupDeleteResponse(
        status="success",
        message=f"Backup {filename} deleted",
        filename=filename,
    )
