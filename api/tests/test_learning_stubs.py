"""Learning endpoint stub tests — verify all endpoints return 200 with correct shapes."""

import pytest

# ──── GET /stats ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_learning_stats(client):
    resp = await client.get("/api/learning/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "level" in data
    assert "name" in data
    assert "xp" in data
    assert "xp_next" in data
    assert "capabilities" in data
    assert data["level"] == 1
    assert data["name"] == "Novice"


# ──── GET /insights ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_learning_insights(client):
    resp = await client.get("/api/learning/insights")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_learning_insights_with_limit(client):
    resp = await client.get("/api/learning/insights", params={"limit": 5})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ──── POST /analyze ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_learning_analyze(client):
    resp = await client.post(
        "/api/learning/analyze",
        json={
            "session_id": "test-session-123",
            "keys_tested": 1000,
            "hits": 0,
            "speed": 50.0,
            "elapsed": 20.0,
            "mode": "random",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "insights" in data
    assert "recommendations" in data
    assert "xp_earned" in data
    assert isinstance(data["insights"], list)


# ──── GET /weights ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_learning_weights(client):
    resp = await client.get("/api/learning/weights")
    assert resp.status_code == 200
    data = resp.json()
    assert "weights" in data
    assert isinstance(data["weights"], dict)


# ──── GET /patterns ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_learning_patterns(client):
    resp = await client.get("/api/learning/patterns")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


# ──── Auth scope tests ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_learning_unauth_401(unauth_client):
    resp = await unauth_client.get("/api/learning/stats")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_learning_readonly_can_read_stats(readonly_client):
    resp = await readonly_client.get("/api/learning/stats")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_learning_readonly_cannot_analyze(readonly_client):
    resp = await readonly_client.post(
        "/api/learning/analyze",
        json={"session_id": "test", "mode": "random"},
    )
    assert resp.status_code == 403
