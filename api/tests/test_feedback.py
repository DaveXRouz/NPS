"""Tests for Oracle feedback and learning endpoints (Session 18)."""

import pytest

from app.orm.oracle_reading import OracleReading

# We need helpers to insert test data
from tests.conftest import TestSession


def _create_reading(db) -> int:
    """Insert a minimal oracle reading row and return its id."""
    reading = OracleReading(
        question="Test question",
        sign_type="time",
        sign_value="12:00:00",
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading.id


# ─── POST feedback ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_submit_feedback_basic(client):
    db = TestSession()
    try:
        reading_id = _create_reading(db)
    finally:
        db.close()

    resp = await client.post(
        f"/api/learning/oracle/readings/{reading_id}/feedback",
        json={"rating": 4},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["reading_id"] == reading_id
    assert data["rating"] == 4
    assert data["updated"] is False


@pytest.mark.asyncio
async def test_submit_feedback_with_sections(client):
    db = TestSession()
    try:
        reading_id = _create_reading(db)
    finally:
        db.close()

    resp = await client.post(
        f"/api/learning/oracle/readings/{reading_id}/feedback",
        json={
            "rating": 5,
            "section_feedback": [
                {"section": "advice", "helpful": True},
                {"section": "caution", "helpful": False},
            ],
            "text_feedback": "Great reading!",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["rating"] == 5
    assert data["section_feedback"]["advice"] == "helpful"
    assert data["section_feedback"]["caution"] == "not_helpful"
    assert data["text_feedback"] == "Great reading!"


@pytest.mark.asyncio
async def test_submit_feedback_upsert(client):
    db = TestSession()
    try:
        reading_id = _create_reading(db)
    finally:
        db.close()

    # First submission
    resp1 = await client.post(
        f"/api/learning/oracle/readings/{reading_id}/feedback",
        json={"rating": 3},
    )
    assert resp1.status_code == 201
    assert resp1.json()["updated"] is False

    # Second submission (same user_id=None) → upsert
    resp2 = await client.post(
        f"/api/learning/oracle/readings/{reading_id}/feedback",
        json={"rating": 5, "text_feedback": "Changed my mind"},
    )
    assert resp2.status_code == 201
    data = resp2.json()
    assert data["rating"] == 5
    assert data["updated"] is True
    assert data["text_feedback"] == "Changed my mind"


@pytest.mark.asyncio
async def test_submit_feedback_invalid_rating(client):
    db = TestSession()
    try:
        reading_id = _create_reading(db)
    finally:
        db.close()

    resp = await client.post(
        f"/api/learning/oracle/readings/{reading_id}/feedback",
        json={"rating": 6},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_submit_feedback_rating_zero(client):
    db = TestSession()
    try:
        reading_id = _create_reading(db)
    finally:
        db.close()

    resp = await client.post(
        f"/api/learning/oracle/readings/{reading_id}/feedback",
        json={"rating": 0},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_submit_feedback_reading_not_found(client):
    resp = await client.post(
        "/api/learning/oracle/readings/99999/feedback",
        json={"rating": 4},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_submit_feedback_text_too_long(client):
    db = TestSession()
    try:
        reading_id = _create_reading(db)
    finally:
        db.close()

    resp = await client.post(
        f"/api/learning/oracle/readings/{reading_id}/feedback",
        json={"rating": 4, "text_feedback": "x" * 1001},
    )
    assert resp.status_code == 422


# ─── GET feedback ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_feedback_for_reading(client):
    db = TestSession()
    try:
        reading_id = _create_reading(db)
    finally:
        db.close()

    # Submit feedback first
    await client.post(
        f"/api/learning/oracle/readings/{reading_id}/feedback",
        json={"rating": 4, "text_feedback": "Nice"},
    )

    resp = await client.get(f"/api/learning/oracle/readings/{reading_id}/feedback")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["rating"] == 4


@pytest.mark.asyncio
async def test_get_feedback_empty(client):
    db = TestSession()
    try:
        reading_id = _create_reading(db)
    finally:
        db.close()

    resp = await client.get(f"/api/learning/oracle/readings/{reading_id}/feedback")
    assert resp.status_code == 200
    data = resp.json()
    assert data == []


# ─── GET /oracle/stats ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_oracle_stats_empty(client):
    resp = await client.get("/api/learning/oracle/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_feedback_count"] == 0
    assert data["average_rating"] == 0.0


@pytest.mark.asyncio
async def test_oracle_stats_with_data(client):
    db = TestSession()
    try:
        reading_id = _create_reading(db)
    finally:
        db.close()

    # Submit a few feedbacks
    for rating in [3, 4, 5]:
        await client.post(
            f"/api/learning/oracle/readings/{reading_id}/feedback",
            json={"rating": rating, "user_id": rating},  # Different user_ids
        )

    resp = await client.get("/api/learning/oracle/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_feedback_count"] == 3
    assert data["average_rating"] == 4.0  # (3+4+5)/3


@pytest.mark.asyncio
async def test_oracle_stats_readonly_forbidden(readonly_client):
    resp = await readonly_client.get("/api/learning/oracle/stats")
    assert resp.status_code == 403


# ─── POST /oracle/recalculate ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_recalculate_empty(client):
    resp = await client.post("/api/learning/oracle/recalculate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_feedback_count"] == 0


@pytest.mark.asyncio
async def test_recalculate_readonly_forbidden(readonly_client):
    resp = await readonly_client.post("/api/learning/oracle/recalculate")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_section_feedback_aggregation(client):
    db = TestSession()
    try:
        reading_id = _create_reading(db)
    finally:
        db.close()

    # Three feedbacks with section data
    for i, helpful in enumerate([True, True, False]):
        await client.post(
            f"/api/learning/oracle/readings/{reading_id}/feedback",
            json={
                "rating": 4,
                "user_id": i + 10,
                "section_feedback": [
                    {"section": "advice", "helpful": helpful},
                ],
            },
        )

    resp = await client.get("/api/learning/oracle/stats")
    data = resp.json()
    # 2 out of 3 marked advice as helpful
    assert "advice" in data["section_helpful_pct"]
    assert abs(data["section_helpful_pct"]["advice"] - 0.67) < 0.02
