"""
Oracle Feedback Learning Engine.

Analyzes user feedback on oracle readings, computes weighted scores with
confidence scaling, and generates prompt emphasis adjustments.

Also preserves scanner legacy functions below the oracle section.
"""

import json
import logging
import os
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

# ════════════════════════════════════════════════════════════
# Oracle Feedback Learning
# ════════════════════════════════════════════════════════════

MINIMUM_SAMPLES = 5  # Need at least 5 ratings for statistical relevance

CONFIDENCE_SCALE = [
    (5, 0.3),  # 5 samples → 30% confidence
    (10, 0.5),  # 10 samples → 50% confidence
    (25, 0.7),  # 25 samples → 70% confidence
    (50, 0.85),  # 50 samples → 85% confidence
    (100, 0.95),  # 100 samples → 95% confidence
]


def weighted_score(avg_rating: float, sample_count: int) -> float:
    """Compute confidence-weighted score. Returns 0 if insufficient samples."""
    if sample_count < MINIMUM_SAMPLES:
        return 0.0
    confidence = 0.0
    for threshold, conf in CONFIDENCE_SCALE:
        if sample_count >= threshold:
            confidence = conf
    return avg_rating * confidence


def recalculate_learning_metrics(db_session) -> dict:
    """Query all feedback, compute aggregate metrics, update oracle_learning_data."""
    try:
        from sqlalchemy import func as sa_func

        # Late imports to avoid circular dependency at module level
        import sys

        if "app.orm.oracle_feedback" in sys.modules:
            OracleReadingFeedback = sys.modules["app.orm.oracle_feedback"].OracleReadingFeedback
            OracleLearningData = sys.modules["app.orm.oracle_feedback"].OracleLearningData
        else:
            from app.orm.oracle_feedback import (
                OracleLearningData,
                OracleReadingFeedback,
            )

        if "app.orm.oracle_reading" in sys.modules:
            OracleReading = sys.modules["app.orm.oracle_reading"].OracleReading
        else:
            from app.orm.oracle_reading import OracleReading

        # Avg rating by reading type
        type_rows = (
            db_session.query(
                OracleReading.sign_type,
                sa_func.avg(OracleReadingFeedback.rating),
                sa_func.count(OracleReadingFeedback.id),
            )
            .join(OracleReading, OracleReading.id == OracleReadingFeedback.reading_id)
            .group_by(OracleReading.sign_type)
            .all()
        )

        result = {"avg_by_type": {}, "total_feedback": 0}

        for sign_type, avg_val, count in type_rows:
            key = f"avg_rating:{sign_type}"
            result["avg_by_type"][sign_type] = {"avg": float(avg_val), "count": count}
            result["total_feedback"] += count

            existing = (
                db_session.query(OracleLearningData)
                .filter(OracleLearningData.metric_key == key)
                .first()
            )
            if existing:
                existing.metric_value = float(avg_val)
                existing.sample_count = count
            else:
                db_session.add(
                    OracleLearningData(
                        metric_key=key,
                        metric_value=float(avg_val),
                        sample_count=count,
                    )
                )

        # Overall average
        overall_avg = db_session.query(sa_func.avg(OracleReadingFeedback.rating)).scalar() or 0.0
        overall_count = db_session.query(sa_func.count(OracleReadingFeedback.id)).scalar() or 0

        existing_overall = (
            db_session.query(OracleLearningData)
            .filter(OracleLearningData.metric_key == "avg_rating:overall")
            .first()
        )
        if existing_overall:
            existing_overall.metric_value = float(overall_avg)
            existing_overall.sample_count = overall_count
        else:
            db_session.add(
                OracleLearningData(
                    metric_key="avg_rating:overall",
                    metric_value=float(overall_avg),
                    sample_count=overall_count,
                )
            )

        # Section helpful percentages
        all_feedback = db_session.query(OracleReadingFeedback.section_feedback).all()
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

        for section, total_count in section_totals.items():
            pct = section_helpful.get(section, 0) / total_count
            key = f"section_helpful:{section}"
            existing = (
                db_session.query(OracleLearningData)
                .filter(OracleLearningData.metric_key == key)
                .first()
            )
            if existing:
                existing.metric_value = pct
                existing.sample_count = total_count
            else:
                db_session.add(
                    OracleLearningData(
                        metric_key=key,
                        metric_value=pct,
                        sample_count=total_count,
                    )
                )

        db_session.flush()
        return result

    except ImportError as exc:
        logger.warning("Cannot recalculate learning metrics: %s", exc)
        return {}


def generate_prompt_emphasis(db_session) -> list[str]:
    """Generate prompt emphasis strings based on feedback patterns."""
    try:
        import sys

        if "app.orm.oracle_feedback" in sys.modules:
            OracleLearningData = sys.modules["app.orm.oracle_feedback"].OracleLearningData
        else:
            from app.orm.oracle_feedback import OracleLearningData

        emphasis: list[str] = []

        # Helper: read a metric
        def _get_metric(key: str):
            row = (
                db_session.query(OracleLearningData)
                .filter(OracleLearningData.metric_key == key)
                .first()
            )
            if row:
                return row.metric_value, row.sample_count
            return None, 0

        # Rule: advice format avg > 4.0, samples >= 5
        # (We use reading type as proxy since format-level tracking isn't separate)
        # Check section helpful rates instead
        action_val, action_count = _get_metric("section_helpful:action_steps")
        if action_val is not None and action_count >= 10 and action_val > 0.8:
            emphasis.append(
                "Users value concrete action steps — make them specific and achievable."
            )

        caution_val, caution_count = _get_metric("section_helpful:caution")
        if caution_val is not None and caution_count >= 10 and caution_val < 0.5:
            emphasis.append("Keep cautionary notes brief, constructive, and forward-looking.")

        advice_val, advice_count = _get_metric("section_helpful:advice")
        if advice_val is not None and advice_count >= 5 and advice_val > 0.8:
            emphasis.append("Emphasize practical, actionable advice in your interpretations.")

        message_val, message_count = _get_metric("section_helpful:universe_message")
        if message_val is not None and message_count >= 5 and message_val > 0.8:
            emphasis.append("Lean into poetic, cosmic language — users respond well to it.")

        # Check if time readings score higher than name readings
        time_avg, time_count = _get_metric("avg_rating:time")
        name_avg, name_count = _get_metric("avg_rating:name")
        if (
            time_avg is not None
            and name_avg is not None
            and time_count >= MINIMUM_SAMPLES
            and name_count >= MINIMUM_SAMPLES
            and time_avg > name_avg
        ):
            emphasis.append("Time-based readings resonate strongly — enrich temporal symbolism.")

        # Overall low rating warning
        overall_avg, overall_count = _get_metric("avg_rating:overall")
        if overall_avg is not None and overall_count >= 20 and overall_avg < 3.0:
            emphasis.append("Focus on warmth, encouragement, and personal connection.")

        # Store active emphasis
        emphasis_text = "\n".join(emphasis) if emphasis else ""
        existing = (
            db_session.query(OracleLearningData)
            .filter(OracleLearningData.metric_key == "prompt_emphasis:active")
            .first()
        )
        if existing:
            existing.prompt_emphasis = emphasis_text
            existing.sample_count = overall_count or 0
        else:
            db_session.add(
                OracleLearningData(
                    metric_key="prompt_emphasis:active",
                    metric_value=0,
                    sample_count=overall_count or 0,
                    prompt_emphasis=emphasis_text,
                )
            )

        db_session.flush()
        return emphasis

    except ImportError as exc:
        logger.warning("Cannot generate prompt emphasis: %s", exc)
        return []


def get_prompt_context(db_session) -> str:
    """Return the current prompt emphasis as a formatted string block."""
    try:
        import sys

        if "app.orm.oracle_feedback" in sys.modules:
            OracleLearningData = sys.modules["app.orm.oracle_feedback"].OracleLearningData
        else:
            from app.orm.oracle_feedback import OracleLearningData

        row = (
            db_session.query(OracleLearningData)
            .filter(OracleLearningData.metric_key == "prompt_emphasis:active")
            .first()
        )
        if row and row.prompt_emphasis and row.prompt_emphasis.strip():
            return (
                "=== LEARNED USER PREFERENCES ===\n"
                + row.prompt_emphasis.strip()
                + "\n=== END PREFERENCES ===\n"
            )
        return ""
    except ImportError:
        return ""


def get_learning_stats(db_session) -> dict:
    """Return aggregated stats for the admin dashboard."""
    try:
        import sys

        if "app.orm.oracle_feedback" in sys.modules:
            OracleLearningData = sys.modules["app.orm.oracle_feedback"].OracleLearningData
        else:
            from app.orm.oracle_feedback import OracleLearningData

        rows = db_session.query(OracleLearningData).all()
        stats: dict[str, dict] = {}
        for row in rows:
            stats[row.metric_key] = {
                "value": row.metric_value,
                "count": row.sample_count,
                "emphasis": row.prompt_emphasis,
            }
        return stats
    except ImportError:
        return {}


# ════════════════════════════════════════════════════════════
# Scanner Legacy (preserved for backward compatibility)
# ════════════════════════════════════════════════════════════

DATA_DIR = Path(__file__).parent.parent / "data" / "learning"
STATE_FILE = DATA_DIR / "learning_state.json"
_lock = threading.Lock()

LEVELS = {
    1: {"name": "Novice", "xp": 0, "capabilities": ["Basic scanning"]},
    2: {
        "name": "Student",
        "xp": 100,
        "capabilities": ["Basic scanning", "Pattern recognition"],
    },
    3: {
        "name": "Apprentice",
        "xp": 500,
        "capabilities": [
            "Basic scanning",
            "Pattern recognition",
            "Strategy suggestions",
        ],
    },
    4: {
        "name": "Expert",
        "xp": 2000,
        "capabilities": [
            "Basic scanning",
            "Pattern recognition",
            "Strategy suggestions",
            "Auto-adjust parameters",
        ],
    },
    5: {
        "name": "Master",
        "xp": 10000,
        "capabilities": [
            "Basic scanning",
            "Pattern recognition",
            "Strategy suggestions",
            "Auto-adjust parameters",
            "Predictive analysis",
        ],
    },
}

_state = None


def _default_state():
    """Return default learning state."""
    return {
        "xp": 0,
        "level": 1,
        "insights": [],
        "recommendations": [],
        "auto_adjustments": None,
        "total_learn_calls": 0,
        "total_keys_scanned": 0,
        "total_hits": 0,
        "model": "sonnet",
        "last_learn": None,
    }


def load_state():
    """Load learning state from disk."""
    global _state
    with _lock:
        if STATE_FILE.exists():
            try:
                with open(STATE_FILE) as f:
                    _state = json.load(f)
            except (json.JSONDecodeError, IOError):
                _state = _default_state()
        else:
            _state = _default_state()
    return _state


def save_state():
    """Save learning state to disk. Atomic write."""
    global _state
    if _state is None:
        return
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        tmp_path = STATE_FILE.with_suffix(".tmp")
        with open(tmp_path, "w") as f:
            json.dump(_state, f, indent=2)
        os.replace(str(tmp_path), str(STATE_FILE))
    except IOError as e:
        logger.error("Failed to save learning state: %s", e)


def _ensure_state():
    """Ensure state is loaded."""
    global _state
    if _state is None:
        load_state()


def get_level():
    """Get current level info."""
    _ensure_state()
    current_level = _state["level"]
    level_info = LEVELS.get(current_level, LEVELS[1])
    next_level = current_level + 1
    xp_next = LEVELS.get(next_level, {}).get("xp", None)
    return {
        "level": current_level,
        "name": level_info["name"],
        "xp": _state["xp"],
        "xp_next": xp_next,
        "capabilities": level_info["capabilities"],
    }


def add_xp(amount, reason=""):
    """Add XP and auto-level up if threshold reached."""
    _ensure_state()
    with _lock:
        _state["xp"] += amount
        for level_num in sorted(LEVELS.keys(), reverse=True):
            if _state["xp"] >= LEVELS[level_num]["xp"]:
                if level_num > _state["level"]:
                    _state["level"] = level_num
                    logger.info(
                        "Level up! %d -> %d (%s)",
                        _state["level"],
                        level_num,
                        LEVELS[level_num]["name"],
                    )
                break
    save_state()


def get_auto_adjustments():
    """Get auto-adjustment recommendations (Level 4+ only)."""
    _ensure_state()
    if _state["level"] < 4:
        return None
    adjustments = {}
    total_keys = _state.get("total_keys_scanned", 0)
    total_hits = _state.get("total_hits", 0)
    if total_keys > 1_000_000 and total_hits == 0:
        adjustments["batch_size"] = 2000
        adjustments["check_every_n"] = 10000
    if _state.get("auto_adjustments"):
        adjustments.update(_state["auto_adjustments"])
    return adjustments if adjustments else None


def get_insights(limit=10):
    """Get stored insights."""
    _ensure_state()
    return _state.get("insights", [])[:limit]


def get_recommendations():
    """Get current recommendations."""
    _ensure_state()
    return _state.get("recommendations", [])
