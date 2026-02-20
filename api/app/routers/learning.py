"""Learning system endpoints — oracle feedback and adaptive learning."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user, require_scope
from app.models.learning import (
    AnalyzeRequest,
    AnalyzeResponse,
    FeedbackRequest,
    FeedbackResponse,
    InsightResponse,
    LearningStatsResponse,
    OracleLearningStatsResponse,
    PatternResponse,
    WeightsResponse,
)
from app.orm.oracle_feedback import OracleLearningData, OracleReadingFeedback
from app.orm.oracle_reading import OracleReading

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Level thresholds based on feedback count ────────────────────────────────

_LEVELS = [
    (0, 1, "Novice", ["Basic scanning"]),
    (10, 2, "Apprentice", ["Basic scanning", "Pattern detection"]),
    (50, 3, "Practitioner", ["Basic scanning", "Pattern detection", "AI suggestions"]),
    (
        150,
        4,
        "Adept",
        ["Basic scanning", "Pattern detection", "AI suggestions", "Adaptive weights"],
    ),
    (
        500,
        5,
        "Master",
        [
            "Basic scanning",
            "Pattern detection",
            "AI suggestions",
            "Adaptive weights",
            "Deep analysis",
        ],
    ),
]


def _compute_level(feedback_count: int) -> tuple[int, str, int, int | None, list[str]]:
    """Return (level, name, xp, xp_next, capabilities) from feedback count."""
    level, name, caps = 1, "Novice", ["Basic scanning"]
    xp = feedback_count
    xp_next: int | None = 10

    for threshold, lvl, lvl_name, lvl_caps in _LEVELS:
        if feedback_count >= threshold:
            level, name, caps = lvl, lvl_name, lvl_caps

    # Find next level threshold
    xp_next = None
    for threshold, lvl, _, _ in _LEVELS:
        if threshold > feedback_count:
            xp_next = threshold
            break

    return level, name, xp, xp_next, caps


@router.get(
    "/stats",
    response_model=LearningStatsResponse,
    dependencies=[Depends(require_scope("oracle:read"))],
)
async def get_learning_stats(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Get current level, XP, and capabilities based on feedback data."""
    total_feedback = db.query(sa_func.count(OracleReadingFeedback.id)).scalar() or 0
    avg_rating = db.query(sa_func.avg(OracleReadingFeedback.rating)).scalar()

    # Bonus XP for high-quality feedback (avg rating > 3 adds a multiplier)
    effective_count = total_feedback
    if avg_rating and avg_rating > 3:
        effective_count = int(total_feedback * 1.2)

    level, name, xp, xp_next, capabilities = _compute_level(effective_count)

    return LearningStatsResponse(
        level=level,
        name=name,
        xp=xp,
        xp_next=xp_next,
        capabilities=capabilities,
    )


@router.get(
    "/insights",
    response_model=list[InsightResponse],
    dependencies=[Depends(require_scope("oracle:read"))],
)
async def get_insights(
    limit: int = 10,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Get stored AI insights from oracle_learning_data."""
    rows = (
        db.query(OracleLearningData)
        .filter(OracleLearningData.metric_key.like("insight:%"))
        .order_by(OracleLearningData.updated_at.desc())
        .limit(limit)
        .all()
    )

    results = []
    for row in rows:
        content = ""
        if row.prompt_emphasis:
            content = row.prompt_emphasis
        elif row.details:
            details = row.details if isinstance(row.details, dict) else {}
            content = details.get("content", str(row.metric_value))
        else:
            content = str(row.metric_value)

        results.append(
            InsightResponse(
                id=str(row.id),
                insight_type=row.metric_key.replace("insight:", ""),
                content=content,
                source="oracle_learning",
                created_at=row.updated_at,
            )
        )

    # If no stored insights, generate summaries from feedback data
    if not results:
        avg_rating = db.query(sa_func.avg(OracleReadingFeedback.rating)).scalar()
        if avg_rating:
            results.append(
                InsightResponse(
                    id="generated-avg-rating",
                    insight_type="insight",
                    content=f"Average reading quality rating: {float(avg_rating):.1f}/5",
                    source="feedback_aggregate",
                    created_at=None,
                )
            )

        # Most popular reading type
        type_row = (
            db.query(OracleReading.sign_type, sa_func.count(OracleReading.id).label("cnt"))
            .filter(OracleReading.deleted_at.is_(None))
            .group_by(OracleReading.sign_type)
            .order_by(sa_func.count(OracleReading.id).desc())
            .first()
        )
        if type_row:
            results.append(
                InsightResponse(
                    id="generated-popular-type",
                    insight_type="insight",
                    content=f"Most popular reading type: {type_row[0]} ({type_row[1]} readings)",
                    source="reading_aggregate",
                    created_at=None,
                )
            )

    return results


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    dependencies=[Depends(require_scope("oracle:write"))],
)
async def analyze_session(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Trigger analysis — compute patterns from reading feedback data."""
    total_feedback = db.query(sa_func.count(OracleReadingFeedback.id)).scalar() or 0
    avg_rating = db.query(sa_func.avg(OracleReadingFeedback.rating)).scalar() or 0.0

    insights: list[str] = []
    recommendations: list[str] = []

    if total_feedback > 0:
        insights.append(f"Analyzed {total_feedback} feedback entries")
        if float(avg_rating) >= 4.0:
            insights.append("Reading quality is consistently high")
        elif float(avg_rating) < 3.0:
            recommendations.append(
                "Consider adjusting AI interpretation prompts for better quality"
            )

    # Section analysis
    all_feedback = db.query(OracleReadingFeedback.section_feedback).all()
    section_totals: dict[str, int] = {}
    section_helpful: dict[str, int] = {}
    for (sf_data,) in all_feedback:
        if not sf_data:
            continue
        sf = json.loads(sf_data) if isinstance(sf_data, str) else sf_data
        for section, value in sf.items():
            section_totals[section] = section_totals.get(section, 0) + 1
            if value == "helpful":
                section_helpful[section] = section_helpful.get(section, 0) + 1

    for section, total in section_totals.items():
        pct = section_helpful.get(section, 0) / total if total > 0 else 0
        if pct < 0.5:
            recommendations.append(
                f"Section '{section}' rated unhelpful by >50% — consider revision"
            )

    # XP based on feedback volume
    xp_earned = min(total_feedback, 50)

    return AnalyzeResponse(
        insights=insights,
        recommendations=recommendations,
        xp_earned=xp_earned,
    )


@router.get(
    "/weights",
    response_model=WeightsResponse,
    dependencies=[Depends(require_scope("oracle:read"))],
)
async def get_weights(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Get current scoring weights from oracle_learning_data."""
    rows = db.query(OracleLearningData).filter(OracleLearningData.metric_key.like("weight:%")).all()

    weights: dict[str, float] = {}
    for row in rows:
        key = row.metric_key.replace("weight:", "")
        weights[key] = row.metric_value

    # If no stored weights, compute from feedback averages
    if not weights:
        type_rows = (
            db.query(OracleReading.sign_type, sa_func.avg(OracleReadingFeedback.rating))
            .join(OracleReading, OracleReading.id == OracleReadingFeedback.reading_id)
            .group_by(OracleReading.sign_type)
            .all()
        )
        for sign_type, avg_r in type_rows:
            if avg_r is not None:
                weights[sign_type] = round(float(avg_r) / 5.0, 3)

    return WeightsResponse(weights=weights)


@router.get(
    "/patterns",
    response_model=list[PatternResponse],
    dependencies=[Depends(require_scope("oracle:read"))],
)
async def get_patterns(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Get detected patterns from reading history."""
    # Query reading types and their frequencies
    type_counts = (
        db.query(OracleReading.sign_type, sa_func.count(OracleReading.id).label("cnt"))
        .filter(OracleReading.deleted_at.is_(None))
        .group_by(OracleReading.sign_type)
        .order_by(sa_func.count(OracleReading.id).desc())
        .all()
    )

    patterns: list[PatternResponse] = []
    for sign_type, count in type_counts:
        # Get last reading date for this type
        last_reading = (
            db.query(sa_func.max(OracleReading.created_at))
            .filter(
                OracleReading.sign_type == sign_type,
                OracleReading.deleted_at.is_(None),
            )
            .scalar()
        )
        patterns.append(
            PatternResponse(
                pattern_type=sign_type,
                description=f"{sign_type.title()} readings account for {count} entries",
                frequency=count,
                last_seen=last_reading,
            )
        )

    # Check for stored patterns in learning data
    stored_patterns = (
        db.query(OracleLearningData).filter(OracleLearningData.metric_key.like("pattern:%")).all()
    )
    for row in stored_patterns:
        key = row.metric_key.replace("pattern:", "")
        details = row.details if isinstance(row.details, dict) else {}
        patterns.append(
            PatternResponse(
                pattern_type=key,
                description=details.get("description", f"Pattern: {key}"),
                frequency=row.sample_count,
                last_seen=row.updated_at,
            )
        )

    return patterns


# ─── Oracle feedback endpoints ────────────────────────────────────────────────


@router.post(
    "/oracle/readings/{reading_id}/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_feedback(
    reading_id: int,
    body: FeedbackRequest,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Submit feedback for a reading. Upserts on (reading_id, user_id)."""
    # Use user_id from auth token, not request body (Issue #118)
    auth_user_id = _user.get("user_id")

    # Verify reading exists
    reading = db.query(OracleReading).filter(OracleReading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")

    # Convert section_feedback list to JSONB dict
    section_dict: dict[str, str] = {}
    for sf in body.section_feedback:
        section_dict[sf.section] = "helpful" if sf.helpful else "not_helpful"

    # Check for existing feedback (upsert)
    existing = (
        db.query(OracleReadingFeedback)
        .filter(
            OracleReadingFeedback.reading_id == reading_id,
            OracleReadingFeedback.user_id == auth_user_id,
        )
        .first()
    )

    if existing:
        existing.rating = body.rating
        existing.section_feedback = section_dict
        existing.text_feedback = body.text_feedback
        db.commit()
        db.refresh(existing)
        return FeedbackResponse(
            id=existing.id,
            reading_id=reading_id,
            rating=existing.rating,
            section_feedback=section_dict,
            text_feedback=existing.text_feedback,
            created_at=existing.created_at,
            updated=True,
        )

    feedback = OracleReadingFeedback(
        reading_id=reading_id,
        user_id=auth_user_id,
        rating=body.rating,
        section_feedback=section_dict,
        text_feedback=body.text_feedback,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return FeedbackResponse(
        id=feedback.id,
        reading_id=reading_id,
        rating=feedback.rating,
        section_feedback=section_dict,
        text_feedback=feedback.text_feedback,
        created_at=feedback.created_at,
        updated=False,
    )


@router.get("/oracle/readings/{reading_id}/feedback", response_model=list[FeedbackResponse])
async def get_feedback_for_reading(
    reading_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Get all feedback for a reading."""
    rows = (
        db.query(OracleReadingFeedback).filter(OracleReadingFeedback.reading_id == reading_id).all()
    )
    results = []
    for row in rows:
        # JSONB returns dict directly; handle legacy string data
        if isinstance(row.section_feedback, str):
            try:
                section_dict = json.loads(row.section_feedback) if row.section_feedback else {}
            except (json.JSONDecodeError, TypeError):
                section_dict = {}
        else:
            section_dict = row.section_feedback or {}
        results.append(
            FeedbackResponse(
                id=row.id,
                reading_id=row.reading_id,
                rating=row.rating,
                section_feedback=section_dict,
                text_feedback=row.text_feedback,
                created_at=row.created_at,
                updated=False,
            )
        )
    return results


@router.get(
    "/oracle/stats",
    response_model=OracleLearningStatsResponse,
    dependencies=[Depends(require_scope("oracle:admin"))],
)
async def get_oracle_learning_stats(db: Session = Depends(get_db)):
    """Admin view of oracle feedback aggregates."""
    total = db.query(sa_func.count(OracleReadingFeedback.id)).scalar() or 0
    avg_rating = db.query(sa_func.avg(OracleReadingFeedback.rating)).scalar() or 0.0

    # Rating distribution
    dist_rows = (
        db.query(OracleReadingFeedback.rating, sa_func.count(OracleReadingFeedback.id))
        .group_by(OracleReadingFeedback.rating)
        .all()
    )
    rating_distribution = {r: c for r, c in dist_rows}

    # Avg by reading type (join oracle_readings for sign_type)
    type_rows = (
        db.query(OracleReading.sign_type, sa_func.avg(OracleReadingFeedback.rating))
        .join(OracleReading, OracleReading.id == OracleReadingFeedback.reading_id)
        .group_by(OracleReading.sign_type)
        .all()
    )
    avg_by_reading_type = {t: round(float(a), 2) for t, a in type_rows}

    # Section helpful percentages (JSONB column, handle legacy string data)
    all_feedback = db.query(OracleReadingFeedback.section_feedback).all()
    section_totals: dict[str, int] = {}
    section_helpful: dict[str, int] = {}
    for (sf_text,) in all_feedback:
        if not sf_text:
            continue
        try:
            sf = json.loads(sf_text) if isinstance(sf_text, str) else sf_text
        except (json.JSONDecodeError, TypeError):
            continue
        for section, value in sf.items():
            section_totals[section] = section_totals.get(section, 0) + 1
            if value == "helpful":
                section_helpful[section] = section_helpful.get(section, 0) + 1

    section_helpful_pct = {}
    for section, total_count in section_totals.items():
        section_helpful_pct[section] = round(section_helpful.get(section, 0) / total_count, 2)

    # Active prompt adjustments from learning data
    adjustments: list[str] = []
    emphasis_row = (
        db.query(OracleLearningData)
        .filter(OracleLearningData.metric_key == "prompt_emphasis:active")
        .first()
    )
    if emphasis_row and emphasis_row.prompt_emphasis:
        adjustments = [
            line.strip() for line in emphasis_row.prompt_emphasis.split("\n") if line.strip()
        ]

    last_recalc = db.query(sa_func.max(OracleLearningData.updated_at)).scalar()

    return OracleLearningStatsResponse(
        total_feedback_count=total,
        average_rating=round(float(avg_rating), 2),
        rating_distribution=rating_distribution,
        avg_by_reading_type=avg_by_reading_type,
        avg_by_format={},
        section_helpful_pct=section_helpful_pct,
        active_prompt_adjustments=adjustments,
        last_recalculated=last_recalc,
    )


@router.post(
    "/oracle/recalculate",
    response_model=OracleLearningStatsResponse,
    dependencies=[Depends(require_scope("oracle:admin"))],
)
async def recalculate_learning(db: Session = Depends(get_db)):
    """Trigger learning recalculation."""
    from services.oracle.oracle_service.engines.learner import (
        generate_prompt_emphasis,
        recalculate_learning_metrics,
    )

    recalculate_learning_metrics(db)
    generate_prompt_emphasis(db)
    db.commit()

    # Return updated stats
    return await get_oracle_learning_stats(db)
