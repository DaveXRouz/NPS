"""Settings request/response models."""

from pydantic import BaseModel

VALID_SETTING_KEYS = {
    "locale",
    "theme",
    "default_reading_type",
    "timezone",
    "numerology_system",
    "auto_daily",
}


class SettingsResponse(BaseModel):
    settings: dict[str, str]


class SettingsBulkUpdate(BaseModel):
    settings: dict[str, str]
