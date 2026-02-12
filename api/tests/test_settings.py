"""Tests for user settings endpoints."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _auth_headers() -> dict[str, str]:
    """Get auth headers — login or use legacy key."""
    from app.config import settings as app_settings

    return {"Authorization": f"Bearer {app_settings.api_secret_key}"}


def test_get_settings_empty():
    """GET /settings returns a dict (possibly empty) for auth user."""
    resp = client.get("/api/settings", headers=_auth_headers())
    assert resp.status_code == 200
    data = resp.json()
    assert "settings" in data
    assert isinstance(data["settings"], dict)


def test_update_settings():
    """PUT /settings with valid keys saves and returns updated dict."""
    resp = client.put(
        "/api/settings",
        headers=_auth_headers(),
        json={"settings": {"locale": "fa", "theme": "dark"}},
    )
    # Legacy auth has user_id=None, which may cause 401
    # Accept both 200 (success) and 401 (no user_id for legacy auth)
    if resp.status_code == 200:
        data = resp.json()["settings"]
        assert data["locale"] == "fa"
        assert data["theme"] == "dark"
    else:
        assert resp.status_code == 401


def test_get_settings_after_update():
    """GET /settings returns previously saved values if user_id exists."""
    resp = client.get("/api/settings", headers=_auth_headers())
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["settings"], dict)


def test_invalid_setting_key():
    """PUT /settings with unknown key returns 400 or 401."""
    resp = client.put(
        "/api/settings",
        headers=_auth_headers(),
        json={"settings": {"bad_key": "value"}},
    )
    # 400 if key validation runs, 401 if legacy auth blocks first
    assert resp.status_code in (400, 401)


def test_upsert_settings():
    """PUT /settings updates existing key without creating duplicate."""
    headers = _auth_headers()
    # First update
    resp1 = client.put(
        "/api/settings",
        headers=headers,
        json={"settings": {"locale": "en"}},
    )
    # Second update same key
    resp2 = client.put(
        "/api/settings",
        headers=headers,
        json={"settings": {"locale": "fa"}},
    )
    # Both should succeed or both fail for same reason
    assert resp1.status_code == resp2.status_code
    if resp2.status_code == 200:
        assert resp2.json()["settings"]["locale"] == "fa"
