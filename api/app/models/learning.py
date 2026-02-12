"""Learning system request/response models."""

from datetime import datetime

from pydantic import BaseModel, Field


class LearningStatsResponse(BaseModel):
    level: int
    name: str
    xp: int
    xp_next: int | None
    capabilities: list[str]


class InsightResponse(BaseModel):
    id: str | None = None
    insight_type: str  # "insight" or "recommendation"
    content: str
    source: str | None = None
    created_at: datetime | None = None


class AnalyzeRequest(BaseModel):
    session_id: str
    keys_tested: int = 0
    seeds_tested: int = 0
    hits: int = 0
    speed: float = 0
    elapsed: float = 0
    mode: str = "unknown"
    model: str = "sonnet"


class AnalyzeResponse(BaseModel):
    insights: list[str] = []
    recommendations: list[str] = []
    adjustments: dict[str, float] = {}
    xp_earned: int = 0


class WeightsResponse(BaseModel):
    weights: dict[str, float]


class PatternResponse(BaseModel):
    pattern_type: str
    description: str
    frequency: int
    last_seen: datetime | None = None


# ════════════════════════════════════════════════════════════
# Oracle Reading Feedback Models
# ════════════════════════════════════════════════════════════


class SectionFeedbackItem(BaseModel):
    """Feedback for a single reading section."""

    section: str  # "simple", "advice", "action_steps", "universe_message"
    helpful: bool  # True = thumbs up, False = thumbs down


class FeedbackRequest(BaseModel):
    """Submit feedback for a reading."""

    rating: int = Field(ge=1, le=5, description="Star rating 1-5")
    section_feedback: list[SectionFeedbackItem] = Field(
        default_factory=list,
        description="Per-section helpful/not-helpful flags",
    )
    text_feedback: str | None = Field(
        default=None,
        max_length=1000,
        description="Optional free-text feedback",
    )
    user_id: int | None = Field(
        default=None,
        description="Oracle user ID (optional, for linking)",
    )


class FeedbackResponse(BaseModel):
    """Response after submitting feedback."""

    id: int
    reading_id: int
    rating: int
    section_feedback: dict[str, str]  # {"advice": "helpful", "caution": "not_helpful"}
    text_feedback: str | None
    created_at: datetime
    updated: bool  # True if this was an update to existing feedback


class OracleLearningStatsResponse(BaseModel):
    """Admin view of oracle feedback aggregates."""

    total_feedback_count: int
    average_rating: float
    rating_distribution: dict[int, int]  # {1: 5, 2: 10, 3: 25, 4: 40, 5: 20}
    avg_by_reading_type: dict[str, float]  # {"time": 4.2, "name": 3.8, ...}
    avg_by_format: dict[str, float]  # {"simple": 4.0, "advice": 4.5, ...}
    section_helpful_pct: dict[str, float]  # {"advice": 0.85, "caution": 0.45, ...}
    active_prompt_adjustments: list[str]  # Current emphasis hints
    last_recalculated: datetime | None


class PromptAdjustmentPreview(BaseModel):
    """Preview of what prompt adjustments would look like."""

    current_adjustments: list[str]
    suggested_adjustments: list[str]
    data_points: int
    confidence: float  # 0-1 based on sample size
