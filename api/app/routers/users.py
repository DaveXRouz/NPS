"""System user management endpoints — admin CRUD for user accounts."""

import logging

import bcrypt as _bcrypt
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user, require_scope
from app.models.user import (
    PasswordResetRequest,
    RoleChangeRequest,
    SystemUserListResponse,
    SystemUserResponse,
    SystemUserUpdate,
)
from app.orm.user import User
from app.services.audit import AuditService, get_audit_service

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


# ─── Endpoint 1: List system users ────────────────────────────────────────────


@router.get("", response_model=SystemUserListResponse)
def list_users(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    audit: AuditService = Depends(get_audit_service),
):
    """List all system users. Admin and moderator only."""
    if current_user["role"] not in ("admin", "moderator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and moderator can list system users",
        )

    query = db.query(User)
    if role is not None:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    audit.log_system_user_listed(
        ip=_get_client_ip(request),
        key_hash=current_user.get("api_key_hash"),
    )
    db.commit()

    return SystemUserListResponse(
        users=[SystemUserResponse.model_validate(u) for u in users],
        total=total,
        limit=limit,
        offset=offset,
    )


# ─── Endpoint 2: Get system user ──────────────────────────────────────────────


@router.get("/{user_id}", response_model=SystemUserResponse)
def get_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    audit: AuditService = Depends(get_audit_service),
):
    """Get a single system user. Admin, moderator, or self."""
    is_self = current_user["user_id"] == user_id
    is_privileged = current_user["role"] in ("admin", "moderator")

    if not is_self and not is_privileged:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other user accounts",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    audit.log_system_user_read(
        user_id,
        ip=_get_client_ip(request),
        key_hash=current_user.get("api_key_hash"),
    )
    db.commit()

    return SystemUserResponse.model_validate(user)


# ─── Endpoint 3: Update system user ───────────────────────────────────────────


@router.put("/{user_id}", response_model=SystemUserResponse)
def update_user(
    user_id: str,
    body: SystemUserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    audit: AuditService = Depends(get_audit_service),
):
    """Update a system user. Admin for any user, self for own username only."""
    is_self = current_user["user_id"] == user_id
    is_admin = current_user["role"] == "admin"

    if not is_self and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can update other user accounts",
        )

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Self can only change username, not is_active
    if is_self and not is_admin:
        if "is_active" in updates:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change your own active status",
            )

    # Admin cannot deactivate themselves
    if is_self and "is_active" in updates and updates["is_active"] is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check username uniqueness if changing
    if "username" in updates and updates["username"] != user.username:
        existing = db.query(User).filter(User.username == updates["username"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists",
            )

    for field, value in updates.items():
        setattr(user, field, value)

    audit.log_system_user_updated(
        user_id,
        list(updates.keys()),
        ip=_get_client_ip(request),
        key_hash=current_user.get("api_key_hash"),
    )
    db.commit()
    db.refresh(user)
    logger.info("Updated system user id=%s fields=%s", user_id, list(updates.keys()))

    return SystemUserResponse.model_validate(user)


# ─── Endpoint 4: Deactivate system user (soft delete) ─────────────────────────


@router.delete("/{user_id}", response_model=SystemUserResponse)
def deactivate_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_scope("admin")),
    audit: AuditService = Depends(get_audit_service),
):
    """Deactivate a system user (soft delete). Admin only."""
    if current_user["user_id"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.is_active = False

    audit.log_system_user_deactivated(
        user_id,
        ip=_get_client_ip(request),
        key_hash=current_user.get("api_key_hash"),
    )
    db.commit()
    db.refresh(user)
    logger.info("Deactivated system user id=%s", user_id)

    return SystemUserResponse.model_validate(user)


# ─── Endpoint 5: Reset password ───────────────────────────────────────────────


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: str,
    body: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_scope("admin")),
    audit: AuditService = Depends(get_audit_service),
):
    """Force password reset. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    pw_hash = _bcrypt.hashpw(body.new_password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")
    user.password_hash = pw_hash

    # Clear any lockout state
    user.failed_attempts = 0
    user.locked_until = None

    audit.log_system_user_password_reset(
        user_id,
        ip=_get_client_ip(request),
        key_hash=current_user.get("api_key_hash"),
    )
    db.commit()
    logger.info("Password reset for system user id=%s", user_id)

    return {"detail": "Password reset successfully"}


# ─── Endpoint 6: Change role ──────────────────────────────────────────────────


@router.put("/{user_id}/role", response_model=SystemUserResponse)
def change_role(
    user_id: str,
    body: RoleChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_scope("admin")),
    audit: AuditService = Depends(get_audit_service),
):
    """Change a user's role. Admin only. Cannot change own role."""
    if current_user["user_id"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    old_role = user.role
    user.role = body.role

    audit.log_system_user_role_changed(
        user_id,
        old_role,
        body.role,
        ip=_get_client_ip(request),
        key_hash=current_user.get("api_key_hash"),
    )
    db.commit()
    db.refresh(user)
    logger.info(
        "Changed role for system user id=%s from=%s to=%s",
        user_id,
        old_role,
        body.role,
    )

    return SystemUserResponse.model_validate(user)
