"""WebSocket event models — maps legacy event types to typed messages."""

from pydantic import BaseModel


class WSEvent(BaseModel):
    """Base WebSocket event sent to frontend clients."""

    event: str
    data: dict = {}
    timestamp: float = 0


# Legacy event types -> current WebSocket message types
EVENT_TYPES = {
    "FINDING_FOUND": "finding",
    "HEALTH_CHANGED": "health",
    "AI_ADJUSTED": "ai_adjusted",
    "LEVEL_UP": "level_up",
    "CHECKPOINT_SAVED": "checkpoint",
    "TERMINAL_STATUS_CHANGED": "terminal_status",
    "SCAN_STARTED": "scan_started",
    "SCAN_STOPPED": "scan_stopped",
    "HIGH_SCORE": "high_score",
    "CONFIG_CHANGED": "config_changed",
    "SHUTDOWN": "shutdown",
    # Current-only events
    "STATS_UPDATE": "stats_update",
    "ERROR": "error",
    # Oracle reading progress events
    "READING_STARTED": "reading_started",
    "READING_PROGRESS": "reading_progress",
    "READING_COMPLETE": "reading_complete",
    "READING_ERROR": "reading_error",
    "DAILY_READING": "daily_reading",
}


class ReadingProgressEvent(BaseModel):
    """Progress update during reading generation."""

    reading_id: int | None = None
    step: str  # "calculating", "ai_generating", "combining", "complete"
    progress: int  # 0-100 percentage
    message: str  # Human-readable status
    user_id: int | None = None


class ReadingCompleteEvent(BaseModel):
    """Sent when a reading finishes successfully."""

    reading_id: int
    sign_type: str
    summary: str  # Brief preview
    user_id: int | None = None


class ReadingErrorEvent(BaseModel):
    """Sent when a reading fails."""

    error: str
    sign_type: str | None = None
    user_id: int | None = None


class DailyReadingEvent(BaseModel):
    """Pushed when daily reading is generated."""

    date: str
    insight: str
    lucky_numbers: list[str]
