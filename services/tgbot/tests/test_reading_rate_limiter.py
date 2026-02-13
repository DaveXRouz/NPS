"""Tests for the reading rate limiter (10 readings/hour per user)."""

import time

from services.tgbot.reading_rate_limiter import ReadingRateLimiter


def test_under_limit_allows():
    """Requests under the limit are allowed."""
    rl = ReadingRateLimiter(max_readings=5, window_seconds=3600)

    for _ in range(5):
        allowed, wait = rl.check(1001)
        assert allowed is True
        assert wait == 0
        rl.record(1001)


def test_blocks_after_limit():
    """Exceeding the limit blocks further requests."""
    rl = ReadingRateLimiter(max_readings=3, window_seconds=3600)

    for _ in range(3):
        rl.record(2002)

    allowed, wait = rl.check(2002)
    assert allowed is False
    assert wait > 0


def test_window_expiry(monkeypatch):
    """After the window expires, requests are allowed again."""
    rl = ReadingRateLimiter(max_readings=2, window_seconds=10)

    # Record 2 readings at "time 0"
    base = time.monotonic()
    monkeypatch.setattr(time, "monotonic", lambda: base)
    rl.record(3003)
    rl.record(3003)

    allowed, _ = rl.check(3003)
    assert allowed is False

    # Jump forward 11 seconds -- window expired
    monkeypatch.setattr(time, "monotonic", lambda: base + 11)
    allowed, _ = rl.check(3003)
    assert allowed is True


def test_remaining_count():
    """remaining() reports correct count after recording."""
    rl = ReadingRateLimiter(max_readings=10, window_seconds=3600)

    assert rl.remaining(4004) == 10

    rl.record(4004)
    rl.record(4004)
    rl.record(4004)

    assert rl.remaining(4004) == 7


def test_per_user_isolation():
    """Rate limits are tracked separately per user."""
    rl = ReadingRateLimiter(max_readings=2, window_seconds=3600)

    # Fill user A
    rl.record(5005)
    rl.record(5005)
    allowed_a, _ = rl.check(5005)
    assert allowed_a is False

    # User B should still be allowed
    allowed_b, _ = rl.check(6006)
    assert allowed_b is True
