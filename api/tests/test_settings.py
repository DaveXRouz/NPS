"""Tests for user settings endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import get_db
from app.main import app
from app.middleware.auth import get_current_user
from app.services.security import get_encryption_service
from tests.conftest import (
    override_get_current_user,
    override_get_db,
    override_get_encryption_service,
)


@pytest.fixture
async def settings_client():
    """Authenticated admin client for settings tests."""
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_encryption_service] = override_get_encryption_service
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_get_settings_empty(settings_client):
    """GET /settings returns a dict (possibly empty) for auth user."""
    resp = await settings_client.get("/api/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert "settings" in data
    assert isinstance(data["settings"], dict)


@pytest.mark.anyio
async def test_update_settings(settings_client):
    """PUT /settings with valid keys saves and returns updated dict."""
    resp = await settings_client.put(
        "/api/settings",
        json={"settings": {"locale": "fa", "theme": "dark"}},
    )
    assert resp.status_code == 200
    data = resp.json()["settings"]
    assert data["locale"] == "fa"
    assert data["theme"] == "dark"


@pytest.mark.anyio
async def test_get_settings_after_update(settings_client):
    """GET /settings returns previously saved values if user_id exists."""
    # Update first
    await settings_client.put(
        "/api/settings",
        json={"settings": {"locale": "en"}},
    )
    # Then get
    resp = await settings_client.get("/api/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["settings"], dict)
    assert data["settings"]["locale"] == "en"


@pytest.mark.anyio
async def test_invalid_setting_key(settings_client):
    """PUT /settings with unknown key returns 400."""
    resp = await settings_client.put(
        "/api/settings",
        json={"settings": {"bad_key": "value"}},
    )
    assert resp.status_code == 400


@pytest.mark.anyio
async def test_upsert_settings(settings_client):
    """PUT /settings updates existing key without creating duplicate."""
    # First update
    resp1 = await settings_client.put(
        "/api/settings",
        json={"settings": {"locale": "en"}},
    )
    assert resp1.status_code == 200

    # Second update same key
    resp2 = await settings_client.put(
        "/api/settings",
        json={"settings": {"locale": "fa"}},
    )
    assert resp2.status_code == 200
    assert resp2.json()["settings"]["locale"] == "fa"
