"""Per-user reading rate limiter.

Tracks reading generation requests per chat ID using a sliding 1-hour window.
Maximum 10 readings per hour per user. This is separate from the message
rate limiter (Session 33) which limits general bot interaction at 20/min.
"""

import time
from collections import defaultdict, deque

MAX_READINGS_PER_HOUR = 10
WINDOW_SECONDS = 3600  # 1 hour


class ReadingRateLimiter:
    """Sliding-window rate limiter for reading generation."""

    def __init__(
        self,
        max_readings: int = MAX_READINGS_PER_HOUR,
        window_seconds: int = WINDOW_SECONDS,
    ) -> None:
        self._max = max_readings
        self._window = window_seconds
        self._timestamps: dict[int, deque[float]] = defaultdict(deque)

    def check(self, chat_id: int) -> tuple[bool, int]:
        """Check if a reading is allowed for this chat ID.

        Returns:
            (allowed, remaining_seconds) -- if not allowed, remaining_seconds
            is the time until the oldest reading expires from the window.
        """
        now = time.monotonic()
        timestamps = self._timestamps[chat_id]

        # Evict expired entries
        while timestamps and timestamps[0] <= now - self._window:
            timestamps.popleft()

        if len(timestamps) >= self._max:
            oldest = timestamps[0]
            wait_seconds = int(self._window - (now - oldest)) + 1
            return False, wait_seconds

        return True, 0

    def record(self, chat_id: int) -> None:
        """Record a reading generation for this chat ID."""
        self._timestamps[chat_id].append(time.monotonic())

    def remaining(self, chat_id: int) -> int:
        """Return how many readings the user has left in the current window."""
        now = time.monotonic()
        timestamps = self._timestamps[chat_id]

        while timestamps and timestamps[0] <= now - self._window:
            timestamps.popleft()

        return max(0, self._max - len(timestamps))
