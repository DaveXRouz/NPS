"""Tests for the DailyScheduler — config parsing, start/stop, stats shape."""

import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from oracle_service.daily_scheduler import DailyScheduler

# ──── Configuration ───────────────────────────────────────────────


def test_default_config():
    scheduler = DailyScheduler(db_session_factory=MagicMock())
    assert scheduler._enabled is True
    assert scheduler._hour == 0
    assert scheduler._minute == 5


def test_disabled_via_env():
    with patch.dict(os.environ, {"NPS_DAILY_SCHEDULER_ENABLED": "false"}):
        scheduler = DailyScheduler(db_session_factory=MagicMock())
        assert scheduler._enabled is False


def test_custom_hour_minute():
    with patch.dict(
        os.environ,
        {
            "NPS_DAILY_SCHEDULER_HOUR": "3",
            "NPS_DAILY_SCHEDULER_MINUTE": "30",
        },
    ):
        scheduler = DailyScheduler(db_session_factory=MagicMock())
        assert scheduler._hour == 3
        assert scheduler._minute == 30


# ──── Start / Stop ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_start_when_disabled():
    with patch.dict(os.environ, {"NPS_DAILY_SCHEDULER_ENABLED": "false"}):
        scheduler = DailyScheduler(db_session_factory=MagicMock())
        await scheduler.start()
        assert scheduler._task is None


@pytest.mark.asyncio
async def test_start_creates_task():
    scheduler = DailyScheduler(db_session_factory=MagicMock())
    # Patch the loop to avoid actually running it
    scheduler._scheduler_loop = AsyncMock()
    await scheduler.start()
    assert scheduler._task is not None
    assert scheduler._running is True
    await scheduler.stop()
    assert scheduler._running is False


@pytest.mark.asyncio
async def test_stop_cancels_task():
    scheduler = DailyScheduler(db_session_factory=MagicMock())
    scheduler._running = True

    async def fake_loop():
        while scheduler._running:
            await asyncio.sleep(100)

    scheduler._task = asyncio.create_task(fake_loop())
    await scheduler.stop()
    assert scheduler._running is False
    assert scheduler._task.cancelled() or scheduler._task.done()


# ──── generate_all_daily_readings ─────────────────────────────────


@pytest.mark.asyncio
async def test_generate_returns_stats_shape():
    """Stats dict has the expected keys even with no users."""
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = []

    def factory():
        return mock_db

    # Mock the lazy imports that reference the api package
    mock_oracle_user = MagicMock()
    mock_oracle_user.OracleUser = MagicMock()
    mock_reading_svc = MagicMock()

    import sys

    with patch.dict(
        sys.modules,
        {
            "app": MagicMock(),
            "app.orm": MagicMock(),
            "app.orm.oracle_user": mock_oracle_user,
            "app.services": MagicMock(),
            "app.services.oracle_reading": mock_reading_svc,
        },
    ):
        scheduler = DailyScheduler(db_session_factory=factory)
        stats = await scheduler.generate_all_daily_readings()

    assert "total_users" in stats
    assert "generated" in stats
    assert "cached" in stats
    assert "errors" in stats
    assert stats["total_users"] == 0
    assert stats["generated"] == 0


@pytest.mark.asyncio
async def test_trigger_manual_calls_generate():
    scheduler = DailyScheduler(db_session_factory=MagicMock())
    expected = {"total_users": 0, "generated": 0, "cached": 0, "errors": 0}
    scheduler.generate_all_daily_readings = AsyncMock(return_value=expected)

    result = await scheduler.trigger_manual()
    scheduler.generate_all_daily_readings.assert_awaited_once()
    assert result == expected


@pytest.mark.asyncio
async def test_generate_handles_db_error_gracefully():
    """Critical DB error doesn't crash; returns stats with zeros."""
    mock_db = MagicMock()
    mock_db.query.side_effect = Exception("DB connection lost")

    def factory():
        return mock_db

    import sys

    with patch.dict(
        sys.modules,
        {
            "app": MagicMock(),
            "app.orm": MagicMock(),
            "app.orm.oracle_user": MagicMock(),
            "app.services": MagicMock(),
            "app.services.oracle_reading": MagicMock(),
        },
    ):
        scheduler = DailyScheduler(db_session_factory=factory)
        stats = await scheduler.generate_all_daily_readings()

    # Should not raise, and rollback should be called
    mock_db.rollback.assert_called_once()
    mock_db.close.assert_called_once()
    assert stats["total_users"] == 0
