"""Oracle endpoints — proxies to Python Oracle gRPC service + user management."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user, require_scope
from app.models.audit import AuditLogEntry, AuditLogResponse
from app.models.oracle import (
    DailyInsightResponse,
    NameReadingRequest,
    NameReadingResponse,
    QuestionRequest,
    QuestionResponse,
    RangeRequest,
    RangeResponse,
    ReadingRequest,
    ReadingResponse,
)
from app.models.oracle_user import (
    OracleUserCreate,
    OracleUserListResponse,
    OracleUserResponse,
    OracleUserUpdate,
)
from app.orm.oracle_user import OracleUser
from app.services.audit import AuditService, get_audit_service
from app.services.security import EncryptionService, get_encryption_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _encrypt_user_fields(user: OracleUser, enc: EncryptionService | None) -> None:
    """Encrypt sensitive fields on an ORM user object before DB write."""
    if not enc:
        return
    if user.mother_name:
        user.mother_name = enc.encrypt(user.mother_name)
    if user.mother_name_persian:
        user.mother_name_persian = enc.encrypt(user.mother_name_persian)


def _decrypt_user(
    user: OracleUser, enc: EncryptionService | None
) -> OracleUserResponse:
    """Decrypt user fields and convert to response model."""
    mother_name = user.mother_name
    mother_name_persian = user.mother_name_persian
    if enc:
        mother_name = enc.decrypt_field(mother_name)
        mother_name_persian = (
            enc.decrypt_field(mother_name_persian) if mother_name_persian else None
        )

    return OracleUserResponse(
        id=user.id,
        name=user.name,
        name_persian=user.name_persian,
        birthday=user.birthday,
        mother_name=mother_name,
        mother_name_persian=mother_name_persian,
        country=user.country,
        city=user.city,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _get_client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


# ─── Oracle Reading Endpoints (gRPC proxies) ────────────────────────────────


@router.post(
    "/reading",
    response_model=ReadingResponse,
    dependencies=[Depends(require_scope("oracle:write"))],
)
async def get_reading(request: ReadingRequest):
    """Get a full oracle reading for a date/time."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Oracle service not connected",
    )


@router.post(
    "/question",
    response_model=QuestionResponse,
    dependencies=[Depends(require_scope("oracle:write"))],
)
async def get_question_sign(request: QuestionRequest):
    """Ask a yes/no question with numerological context."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Oracle service not connected",
    )


@router.post(
    "/name",
    response_model=NameReadingResponse,
    dependencies=[Depends(require_scope("oracle:write"))],
)
async def get_name_reading(request: NameReadingRequest):
    """Get a name cipher reading."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Oracle service not connected",
    )


@router.get(
    "/daily",
    response_model=DailyInsightResponse,
    dependencies=[Depends(require_scope("oracle:read"))],
)
async def get_daily_insight(date: str = None):
    """Get daily insight for today or a specific date."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Oracle service not connected",
    )


@router.post(
    "/suggest-range",
    response_model=RangeResponse,
    dependencies=[Depends(require_scope("oracle:write"))],
)
async def suggest_range(request: RangeRequest):
    """Get AI-suggested scan range based on timing + coverage."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Oracle service not connected",
    )


# ─── Oracle User Management ─────────────────────────────────────────────────


@router.post(
    "/users",
    response_model=OracleUserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_scope("oracle:write"))],
)
def create_user(
    body: OracleUserCreate,
    request: Request,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
    enc: EncryptionService | None = Depends(get_encryption_service),
    audit: AuditService = Depends(get_audit_service),
):
    """Create a new Oracle user profile."""
    existing = (
        db.query(OracleUser)
        .filter(
            OracleUser.name == body.name,
            OracleUser.birthday == body.birthday,
            OracleUser.deleted_at.is_(None),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this name and birthday already exists",
        )

    user = OracleUser(**body.model_dump())
    _encrypt_user_fields(user, enc)
    db.add(user)
    db.flush()  # Get the ID before commit

    audit.log_user_created(
        user.id,
        ip=_get_client_ip(request),
        key_hash=_user.get("api_key_hash"),
    )
    db.commit()
    db.refresh(user)
    logger.info("Created oracle user id=%d name=%s", user.id, body.name)
    return _decrypt_user(user, enc)


@router.get(
    "/users",
    response_model=OracleUserListResponse,
    dependencies=[Depends(require_scope("oracle:read"))],
)
def list_users(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
    enc: EncryptionService | None = Depends(get_encryption_service),
    audit: AuditService = Depends(get_audit_service),
):
    """List Oracle user profiles with optional search."""
    query = db.query(OracleUser).filter(OracleUser.deleted_at.is_(None))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            func.lower(OracleUser.name).like(func.lower(pattern))
            | func.lower(OracleUser.name_persian).like(func.lower(pattern))
        )

    total = query.count()
    users = (
        query.order_by(OracleUser.created_at.desc()).offset(offset).limit(limit).all()
    )

    audit.log_user_listed(
        ip=_get_client_ip(request),
        key_hash=_user.get("api_key_hash"),
    )
    db.commit()

    decrypted = [_decrypt_user(u, enc) for u in users]
    return OracleUserListResponse(
        users=decrypted, total=total, limit=limit, offset=offset
    )


@router.get(
    "/users/{user_id}",
    response_model=OracleUserResponse,
    dependencies=[Depends(require_scope("oracle:read"))],
)
def get_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
    enc: EncryptionService | None = Depends(get_encryption_service),
    audit: AuditService = Depends(get_audit_service),
):
    """Get a single Oracle user profile."""
    user = (
        db.query(OracleUser)
        .filter(OracleUser.id == user_id, OracleUser.deleted_at.is_(None))
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    audit.log_user_read(
        user.id,
        ip=_get_client_ip(request),
        key_hash=_user.get("api_key_hash"),
    )
    db.commit()

    return _decrypt_user(user, enc)


@router.put(
    "/users/{user_id}",
    response_model=OracleUserResponse,
    dependencies=[Depends(require_scope("oracle:write"))],
)
def update_user(
    user_id: int,
    body: OracleUserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
    enc: EncryptionService | None = Depends(get_encryption_service),
    audit: AuditService = Depends(get_audit_service),
):
    """Update an Oracle user profile (partial update)."""
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update"
        )

    user = (
        db.query(OracleUser)
        .filter(OracleUser.id == user_id, OracleUser.deleted_at.is_(None))
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check uniqueness if name or birthday is changing
    new_name = updates.get("name", user.name)
    new_birthday = updates.get("birthday", user.birthday)
    if new_name != user.name or new_birthday != user.birthday:
        conflict = (
            db.query(OracleUser)
            .filter(
                OracleUser.name == new_name,
                OracleUser.birthday == new_birthday,
                OracleUser.deleted_at.is_(None),
                OracleUser.id != user_id,
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this name and birthday already exists",
            )

    for field, value in updates.items():
        # Encrypt sensitive fields
        if enc and field in ("mother_name", "mother_name_persian") and value:
            value = enc.encrypt(value)
        setattr(user, field, value)

    audit.log_user_updated(
        user.id,
        list(updates.keys()),
        ip=_get_client_ip(request),
        key_hash=_user.get("api_key_hash"),
    )
    db.commit()
    db.refresh(user)
    logger.info("Updated oracle user id=%d fields=%s", user.id, list(updates.keys()))
    return _decrypt_user(user, enc)


@router.delete(
    "/users/{user_id}",
    response_model=OracleUserResponse,
    dependencies=[Depends(require_scope("oracle:admin"))],
)
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
    enc: EncryptionService | None = Depends(get_encryption_service),
    audit: AuditService = Depends(get_audit_service),
):
    """Soft-delete an Oracle user profile."""
    user = (
        db.query(OracleUser)
        .filter(OracleUser.id == user_id, OracleUser.deleted_at.is_(None))
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    user.deleted_at = datetime.now(timezone.utc)
    audit.log_user_deleted(
        user.id,
        ip=_get_client_ip(request),
        key_hash=_user.get("api_key_hash"),
    )
    db.commit()
    db.refresh(user)
    logger.info("Soft-deleted oracle user id=%d", user.id)
    return _decrypt_user(user, enc)


# ─── Audit Log Endpoint ─────────────────────────────────────────────────────


@router.get(
    "/audit",
    response_model=AuditLogResponse,
    dependencies=[Depends(require_scope("oracle:admin"))],
)
def get_audit_log(
    action: str | None = Query(None),
    resource_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _user: dict = Depends(get_current_user),
    audit: AuditService = Depends(get_audit_service),
):
    """Query Oracle audit log (admin-only)."""
    entries, total = audit.query_logs(
        action=action,
        resource_type="oracle_user" if resource_id else None,
        resource_id=resource_id,
        limit=limit,
        offset=offset,
    )
    return AuditLogResponse(
        entries=[AuditLogEntry.model_validate(e) for e in entries],
        total=total,
        limit=limit,
        offset=offset,
    )
