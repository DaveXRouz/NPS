"""User settings endpoints — read and write user preferences."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.settings import VALID_SETTING_KEYS, SettingsBulkUpdate, SettingsResponse
from app.orm.user_settings import UserSettings

router = APIRouter()


@router.get("/settings", response_model=SettingsResponse)
async def get_settings(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SettingsResponse:
    """Return all settings for the authenticated user as a key-value dict."""
    user_id = user.get("user_id")
    if not user_id:
        return SettingsResponse(settings={})
    rows = db.query(UserSettings).filter(UserSettings.user_id == user_id).all()
    return SettingsResponse(settings={r.setting_key: r.setting_value for r in rows})


@router.put("/settings", response_model=SettingsResponse)
async def update_settings(
    body: SettingsBulkUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SettingsResponse:
    """Upsert multiple settings at once."""
    user_id = user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    for key, value in body.settings.items():
        if key not in VALID_SETTING_KEYS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid setting key: {key}",
            )

        # Coerce all values to string for storage
        str_value = str(value) if not isinstance(value, str) else value

        existing = (
            db.query(UserSettings)
            .filter(
                UserSettings.user_id == user_id,
                UserSettings.setting_key == key,
            )
            .first()
        )

        if existing:
            existing.setting_value = str_value
        else:
            db.add(UserSettings(user_id=user_id, setting_key=key, setting_value=str_value))

    db.commit()
    rows = db.query(UserSettings).filter(UserSettings.user_id == user_id).all()
    return SettingsResponse(settings={r.setting_key: r.setting_value for r in rows})
