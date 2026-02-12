"""Learning system endpoints — scanner stubs + oracle feedback."""

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


# ─── Scanner stubs (existing, unchanged) ─────────────────────────────────────


@router.get("/stats", response_model=LearningStatsResponse)
async def get_learning_stats():
    """Get current level, XP, and capabilities."""
    return LearningStatsResponse(
        level=1,
        name="Novice",
        xp=0,
        xp_next=100,
        capabilities=["Basic scanning"],
    )


@router.get("/insights", response_model=list[InsightResponse])
async def get_insights(limit: int = 10):
    """Get stored AI insights."""
    return []


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_session(request: AnalyzeRequest):
    """Trigger AI analysis of a session."""
    return AnalyzeResponse(insights=[], recommendations=[], xp_earned=0)


@router.get("/weights", response_model=WeightsResponse)
async def get_weights():
    """Get current scoring weights."""
    return WeightsResponse(weights={})


@router.get("/patterns", response_model=list[PatternResponse])
async def get_patterns():
    """Get detected patterns from scanning."""
    return []


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
    # Verify reading exists
    reading = db.query(OracleReading).filter(OracleReading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")

    # Convert section_feedback list to JSONB dict
    section_dict: dict[str, str] = {}
    for sf in body.section_feedback:
        section_dict[sf.section] = "helpful" if sf.helpful else "not_helpful"

    section_json = json.dumps(section_dict)

    # Check for existing feedback (upsert)
    existing = (
        db.query(OracleReadingFeedback)
        .filter(
            OracleReadingFeedback.reading_id == reading_id,
            OracleReadingFeedback.user_id == body.user_id,
        )
        .first()
    )

    if existing:
        existing.rating = body.rating
        existing.section_feedback = section_json
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
        user_id=body.user_id,
        rating=body.rating,
        section_feedback=section_json,
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
        try:
            section_dict = json.loads(row.section_feedback) if row.section_feedback else {}
        except (json.JSONDecodeError, TypeError):
            section_dict = {}
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

    # Section helpful percentages (parse JSONB stored as text)
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
