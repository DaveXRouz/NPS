"""Tests for share link endpoints (Session 32)."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import get_db
from app.main import app
from app.middleware.auth import get_current_user
from app.services.security import get_encryption_service

from tests.conftest import (
    TestSession,
    override_get_current_user,
    override_get_db,
    override_get_encryption_service,
)


def _seed_reading(db) -> int:
    """Insert a minimal oracle_readings row and return its id."""
    db.execute(
        __import__("sqlalchemy").text(
            "INSERT INTO oracle_readings (question, sign_type, sign_value, is_favorite, is_multi_user) "
            "VALUES ('test question', 'time', '12:00:00', FALSE, FALSE)"
        )
    )
    db.commit()
    result = db.execute(__import__("sqlalchemy").text("SELECT MAX(id) FROM oracle_readings"))
    return result.scalar()


@pytest.fixture
async def client():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_encryption_service] = override_get_encryption_service
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def unauth_client():
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def reading_id():
    db = TestSession()
    try:
        rid = _seed_reading(db)
        return rid
    finally:
        db.close()


@pytest.mark.anyio
async def test_create_share_link_success(client, reading_id):
    resp = await client.post("/api/share", json={"reading_id": reading_id})
    assert resp.status_code == 201
    data = resp.json()
    assert "token" in data
    assert len(data["token"]) == 32
    assert data["url"] == f"/share/{data['token']}"
    assert data["expires_at"] is None
    assert "created_at" in data


@pytest.mark.anyio
async def test_create_share_link_reading_not_found(client):
    resp = await client.post("/api/share", json={"reading_id": 99999})
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_get_shared_reading_success(client, reading_id):
    create_resp = await client.post("/api/share", json={"reading_id": reading_id})
    token = create_resp.json()["token"]

    resp = await client.get(f"/api/share/{token}")
    assert resp.status_code == 200
    data = resp.json()
    assert "reading" in data
    assert "shared_at" in data
    assert data["view_count"] >= 1


@pytest.mark.anyio
async def test_get_shared_reading_expired(client, reading_id):
    create_resp = await client.post(
        "/api/share", json={"reading_id": reading_id, "expires_in_days": 0}
    )
    # expires_in_days=0 should not set expiry (per logic). Let's force expiry via DB.
    token = create_resp.json()["token"]

    # Manually set expires_at to the past
    from datetime import datetime, timedelta, timezone

    db = TestSession()
    from sqlalchemy import text

    db.execute(
        text("UPDATE oracle_share_links SET expires_at = :past WHERE token = :token"),
        {"past": datetime.now(timezone.utc) - timedelta(days=1), "token": token},
    )
    db.commit()
    db.close()

    resp = await client.get(f"/api/share/{token}")
    assert resp.status_code == 410


@pytest.mark.anyio
async def test_get_shared_reading_invalid_token(client):
    resp = await client.get("/api/share/nonexistent_token_123456")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_get_shared_reading_deactivated(client, reading_id):
    create_resp = await client.post("/api/share", json={"reading_id": reading_id})
    token = create_resp.json()["token"]

    # Revoke
    await client.delete(f"/api/share/{token}")

    resp = await client.get(f"/api/share/{token}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_revoke_share_link(client, reading_id):
    create_resp = await client.post("/api/share", json={"reading_id": reading_id})
    token = create_resp.json()["token"]

    resp = await client.delete(f"/api/share/{token}")
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Share link revoked"


@pytest.mark.anyio
async def test_create_share_link_no_auth(unauth_client, reading_id):
    resp = await unauth_client.post("/api/share", json={"reading_id": reading_id})
    assert resp.status_code in (401, 403)


@pytest.mark.anyio
async def test_get_shared_reading_no_auth_required(client, unauth_client, reading_id):
    # Create with auth
    create_resp = await client.post("/api/share", json={"reading_id": reading_id})
    token = create_resp.json()["token"]

    # Get without auth
    resp = await unauth_client.get(f"/api/share/{token}")
    assert resp.status_code == 200
    assert "reading" in resp.json()


@pytest.mark.anyio
async def test_share_link_view_count_increments(client, reading_id):
    create_resp = await client.post("/api/share", json={"reading_id": reading_id})
    token = create_resp.json()["token"]

    resp1 = await client.get(f"/api/share/{token}")
    count1 = resp1.json()["view_count"]

    resp2 = await client.get(f"/api/share/{token}")
    count2 = resp2.json()["view_count"]

    assert count2 == count1 + 1
