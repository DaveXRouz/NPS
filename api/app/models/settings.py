"""Settings request/response models."""

from pydantic import BaseModel

VALID_SETTING_KEYS = {
    "locale",
    "language",
    "theme",
    "default_reading_type",
    "timezone",
    "numerology_system",
    "auto_daily",
    "notifications_enabled",
    "daily_delivery_time",
    "reading_history_visible",
    "share_enabled",
    "dark_mode",
    "font_size",
    "sound_enabled",
}


class SettingsResponse(BaseModel):
    settings: dict[str, str]


class SettingsBulkUpdate(BaseModel):
    settings: dict[str, str | bool | int | float]
