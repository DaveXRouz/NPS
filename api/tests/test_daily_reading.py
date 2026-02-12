"""Tests for daily reading endpoint (Session 16)."""

from unittest.mock import AsyncMock, patch

import pytest


def _mock_daily_result() -> dict:
    """Minimal daily FrameworkReadingResponse-compatible dict."""
    return {
        "id": 10,
        "reading_type": "daily",
        "sign_value": "2026-02-13",
        "framework_result": {
            "fc60_stamp": {"fc60": "LU-OX-OXWA", "j60": "abc"},
            "numerology": {"life_path": {"number": 3, "title": "Creator", "message": "Creative"}},
            "moon": {"phase_name": "Full Moon"},
            "ganzhi": {"year_animal": "Horse"},
            "confidence": {"score": 72, "level": "high"},
            "patterns": {"detected": [], "count": 0},
        },
        "ai_interpretation": {
            "header": "Daily",
            "universal_address": "",
            "core_identity": "",
            "right_now": "",
            "patterns": "",
            "message": "Daily message",
            "advice": "",
            "caution": "",
            "footer": "",
            "full_text": "Full daily text",
            "ai_generated": False,
            "locale": "en",
            "elapsed_ms": 0.0,
            "cached": False,
            "confidence_score": 72,
        },
        "confidence": {"score": 72, "level": "high"},
        "patterns": [],
        "fc60_stamp": "LU-OX-OXWA",
        "numerology": {"life_path": {"number": 3, "title": "Creator", "message": "Creative"}},
        "moon": {"phase_name": "Full Moon"},
        "ganzhi": {"year_animal": "Horse"},
        "locale": "en",
        "created_at": "2026-02-13T12:00:00",
        "daily_insights": {
            "suggested_activities": ["Meditation", "Walk"],
            "energy_forecast": "Stable energy throughout the day",
            "lucky_hours": [9, 14, 18],
            "focus_area": "Relationships",
            "element_of_day": "Fire",
        },
    }


def _mock_cached_result() -> dict:
    result = _mock_daily_result()
    result["_cached"] = True
    return result


class TestCreateDailyReadingSuccess:
    @pytest.mark.anyio
    async def test_create_daily_reading_success(self, client):
        """POST /oracle/readings with reading_type=daily returns 200."""
        with patch(
            "app.services.oracle_reading.OracleReadingService.create_daily_reading",
            new_callable=AsyncMock,
            return_value=_mock_daily_result(),
        ):
            resp = await client.post(
                "/api/oracle/readings",
                json={"user_id": 1, "reading_type": "daily", "locale": "en"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["reading_type"] == "daily"
            assert data["sign_value"] == "2026-02-13"


class TestDailyReadingCachedOnSecondCall:
    @pytest.mark.anyio
    async def test_daily_reading_cached_on_second_call(self, client):
        """Same user+date returns cached version."""
        with patch(
            "app.services.oracle_reading.OracleReadingService.create_daily_reading",
            new_callable=AsyncMock,
            return_value=_mock_cached_result(),
        ) as mock_create:
            resp = await client.post(
                "/api/oracle/readings",
                json={"user_id": 1, "reading_type": "daily"},
            )
            assert resp.status_code == 200
            mock_create.assert_called_once()


class TestDailyReadingForceRegenerate:
    @pytest.mark.anyio
    async def test_daily_reading_force_regenerate(self, client):
        """force_regenerate=True bypasses cache."""
        with patch(
            "app.services.oracle_reading.OracleReadingService.create_daily_reading",
            new_callable=AsyncMock,
            return_value=_mock_daily_result(),
        ) as mock_create:
            resp = await client.post(
                "/api/oracle/readings",
                json={"user_id": 1, "reading_type": "daily", "force_regenerate": True},
            )
            assert resp.status_code == 200
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs["force_regenerate"] is True


class TestDailyReadingUserNotFound:
    @pytest.mark.anyio
    async def test_daily_reading_user_not_found(self, client):
        """Non-existent user_id returns 422."""
        with patch(
            "app.services.oracle_reading.OracleReadingService.create_daily_reading",
            new_callable=AsyncMock,
            side_effect=ValueError("Oracle user 999 not found"),
        ):
            resp = await client.post(
                "/api/oracle/readings",
                json={"user_id": 999, "reading_type": "daily"},
            )
            assert resp.status_code == 422
            assert "not found" in resp.json()["detail"]


class TestDailyReadingStoredInDb:
    @pytest.mark.anyio
    async def test_daily_reading_stored_in_db(self, client):
        """Row created in oracle_readings with sign_type=daily."""
        result = _mock_daily_result()
        with patch(
            "app.services.oracle_reading.OracleReadingService.create_daily_reading",
            new_callable=AsyncMock,
            return_value=result,
        ):
            resp = await client.post(
                "/api/oracle/readings",
                json={"user_id": 1, "reading_type": "daily"},
            )
            assert resp.status_code == 200
            assert resp.json()["id"] == 10


class TestDailyCacheEntryCreated:
    @pytest.mark.anyio
    async def test_daily_cache_entry_created(self, client):
        """Service method is called which creates cache entry."""
        with patch(
            "app.services.oracle_reading.OracleReadingService.create_daily_reading",
            new_callable=AsyncMock,
            return_value=_mock_daily_result(),
        ) as mock_create:
            resp = await client.post(
                "/api/oracle/readings",
                json={"user_id": 1, "reading_type": "daily"},
            )
            assert resp.status_code == 200
            mock_create.assert_called_once()
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs["user_id"] == 1


class TestGetDailyReadingCached:
    @pytest.mark.anyio
    async def test_get_daily_reading_cached(self, client):
        """GET /daily/reading returns cached reading."""
        cached = _mock_daily_result()
        cached["_cached"] = True
        with patch(
            "app.services.oracle_reading.OracleReadingService.get_cached_daily_reading",
            return_value=cached,
        ):
            resp = await client.get("/api/oracle/daily/reading?user_id=1")
            assert resp.status_code == 200
            data = resp.json()
            assert data["cached"] is True
            assert data["reading"] is not None


class TestGetDailyReadingNotFound:
    @pytest.mark.anyio
    async def test_get_daily_reading_not_found(self, client):
        """GET /daily/reading returns null for uncached date."""
        with patch(
            "app.services.oracle_reading.OracleReadingService.get_cached_daily_reading",
            return_value=None,
        ):
            resp = await client.get("/api/oracle/daily/reading?user_id=1&date=2020-01-01")
            assert resp.status_code == 200
            data = resp.json()
            assert data["cached"] is False
            assert data["reading"] is None
