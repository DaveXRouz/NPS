"""Share link endpoints — create, view (public), and revoke share links for readings."""

import json
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.share import ShareLinkCreate, ShareLinkResponse, SharedReadingResponse
from app.orm.oracle_reading import OracleReading
from app.orm.share_link import ShareLink

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_LINKS_PER_READING = 10
MAX_TOKEN_RETRIES = 3


@router.post("", response_model=ShareLinkResponse, status_code=status.HTTP_201_CREATED)
def create_share_link(
    body: ShareLinkCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
) -> ShareLinkResponse:
    """Create a share link for a reading. Requires authentication."""
    reading = db.query(OracleReading).filter_by(id=body.reading_id).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")

    existing_count = (
        db.query(ShareLink).filter_by(reading_id=body.reading_id, is_active=True).count()
    )
    if existing_count >= MAX_LINKS_PER_READING:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum {MAX_LINKS_PER_READING} active share links per reading",
        )

    expires_at = None
    if body.expires_in_days is not None and body.expires_in_days > 0:
        expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)

    for attempt in range(MAX_TOKEN_RETRIES):
        token = secrets.token_hex(16)
        link = ShareLink(
            token=token,
            reading_id=body.reading_id,
            created_by_user_id=user.get("user_id"),
            expires_at=expires_at,
        )
        db.add(link)
        try:
            db.commit()
            db.refresh(link)
            return ShareLinkResponse(
                token=link.token,
                url=f"/share/{link.token}",
                expires_at=link.expires_at.isoformat() if link.expires_at else None,
                created_at=link.created_at.isoformat(),
            )
        except IntegrityError as exc:
            db.rollback()
            logger.warning("Share token attempt %d failed: %s", attempt + 1, exc)
            if attempt == MAX_TOKEN_RETRIES - 1:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to generate unique share token",
                )

    raise HTTPException(status_code=500, detail="Failed to create share link")


@router.get("/{token}", response_model=SharedReadingResponse)
def get_shared_reading(token: str, db: Session = Depends(get_db)) -> SharedReadingResponse:
    """Get a shared reading by token. No authentication required."""
    link = db.query(ShareLink).filter_by(token=token, is_active=True).first()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")

    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Share link expired")

    link.view_count += 1
    db.commit()

    reading = db.query(OracleReading).filter_by(id=link.reading_id).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Reading no longer exists")

    reading_data: dict = {
        "id": reading.id,
        "sign_type": reading.sign_type,
        "sign_value": reading.sign_value,
        "question": reading.question,
        "ai_interpretation": reading.ai_interpretation,
        "created_at": reading.created_at.isoformat() if reading.created_at else None,
        "is_favorite": reading.is_favorite,
    }
    if reading.reading_result:
        try:
            reading_data["reading_result"] = json.loads(reading.reading_result)
        except (json.JSONDecodeError, TypeError):
            reading_data["reading_result"] = None

    return SharedReadingResponse(
        reading=reading_data,
        shared_at=link.created_at.isoformat(),
        view_count=link.view_count,
    )


@router.delete("/{token}", status_code=status.HTTP_200_OK)
def revoke_share_link(
    token: str,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
) -> dict:
    """Deactivate a share link. Requires authentication."""
    link = db.query(ShareLink).filter_by(token=token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")

    link.is_active = False
    db.commit()
    return {"detail": "Share link revoked"}
