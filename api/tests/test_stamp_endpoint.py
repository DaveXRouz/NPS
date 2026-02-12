"""Tests for POST /api/oracle/validate-stamp endpoint (Session 10)."""

import pytest


class TestValidateStampEndpoint:
    """Tests for POST /api/oracle/validate-stamp."""

    @pytest.mark.anyio
    async def test_validate_stamp_endpoint_valid(self, client):
        """POST with valid stamp returns 200 with valid=True."""
        response = await client.post(
            "/api/oracle/validate-stamp",
            json={"stamp": "VE-OX-OXFI ☀OX-RUWU-RAWU"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["stamp"] == "VE-OX-OXFI ☀OX-RUWU-RAWU"
        assert data["decoded"] is not None
        assert data["error"] is None

    @pytest.mark.anyio
    async def test_validate_stamp_endpoint_invalid(self, client):
        """POST with invalid stamp returns 200 with valid=False."""
        response = await client.post(
            "/api/oracle/validate-stamp",
            json={"stamp": "INVALID-STAMP-TEXT"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["error"] is not None

    @pytest.mark.anyio
    async def test_validate_stamp_endpoint_unauthorized(self, unauth_client):
        """POST without auth returns 401."""
        response = await unauth_client.post(
            "/api/oracle/validate-stamp",
            json={"stamp": "VE-OX-OXFI ☀OX-RUWU-RAWU"},
        )
        assert response.status_code == 401
