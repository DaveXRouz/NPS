"""Oracle endpoints — proxies to Python Oracle gRPC service + user management."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
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

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/reading", response_model=ReadingResponse)
async def get_reading(request: ReadingRequest):
    """Get a full oracle reading for a date/time."""
    # TODO: Call oracle gRPC GetReading
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Oracle service not connected",
    )


@router.post("/question", response_model=QuestionResponse)
async def get_question_sign(request: QuestionRequest):
    """Ask a yes/no question with numerological context."""
    # TODO: Call oracle gRPC GetQuestionSign
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Oracle service not connected",
    )


@router.post("/name", response_model=NameReadingResponse)
async def get_name_reading(request: NameReadingRequest):
    """Get a name cipher reading."""
    # TODO: Call oracle gRPC GetNameReading
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Oracle service not connected",
    )


@router.get("/daily", response_model=DailyInsightResponse)
async def get_daily_insight(date: str = None):
    """Get daily insight for today or a specific date."""
    # TODO: Call oracle gRPC GetDailyInsight
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Oracle service not connected",
    )


@router.post("/suggest-range", response_model=RangeResponse)
async def suggest_range(request: RangeRequest):
    """Get AI-suggested scan range based on timing + coverage."""
    # TODO: Call oracle gRPC SuggestRange
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Oracle service not connected",
    )


# ─── Oracle User Management ─────────────────────────────────────────────────


@router.post(
    "/users", response_model=OracleUserResponse, status_code=status.HTTP_201_CREATED
)
def create_user(
    body: OracleUserCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
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
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Created oracle user id=%d name=%s", user.id, user.name)
    return user


@router.get("/users", response_model=OracleUserListResponse)
def list_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
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
    return OracleUserListResponse(users=users, total=total, limit=limit, offset=offset)


@router.get("/users/{user_id}", response_model=OracleUserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
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
    return user


@router.put("/users/{user_id}", response_model=OracleUserResponse)
def update_user(
    user_id: int,
    body: OracleUserUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
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
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    logger.info("Updated oracle user id=%d fields=%s", user.id, list(updates.keys()))
    return user


@router.delete("/users/{user_id}", response_model=OracleUserResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
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
    db.commit()
    db.refresh(user)
    logger.info("Soft-deleted oracle user id=%d", user.id)
    return user
