"""Notification Service — API-layer wrapper for Telegram notifications.

Routes notification requests through the Oracle notifier engine.
Provides a clean API-layer interface without exposing engine internals.

Includes a circuit breaker pattern (Issue #151): after N consecutive
failures, the service stops attempting to send for a cooldown period,
then automatically retries.
"""

import logging
import time
from enum import Enum

logger = logging.getLogger(__name__)

# Circuit breaker defaults
_FAILURE_THRESHOLD = 5  # consecutive failures before opening circuit
_COOLDOWN_SECONDS = 300  # 5 minutes cooldown before retrying


class NotificationType(Enum):
    """Notification categories for routing and filtering."""

    BALANCE_FOUND = "balance_found"
    SCAN_ERROR = "scan_error"
    DAILY_REPORT = "daily_report"
    SYSTEM_ALERT = "system_alert"
    READING_COMPLETE = "reading_complete"


class CircuitBreaker:
    """Circuit breaker for notification delivery.

    States:
        CLOSED   — normal operation, requests pass through
        OPEN     — too many failures, requests are rejected immediately
        HALF_OPEN — cooldown elapsed, next request is a probe

    After failure_threshold consecutive failures, the circuit opens.
    After cooldown_seconds, it transitions to half-open.
    A single success in half-open state closes the circuit.
    A failure in half-open state re-opens it.
    """

    def __init__(
        self,
        failure_threshold: int = _FAILURE_THRESHOLD,
        cooldown_seconds: float = _COOLDOWN_SECONDS,
    ) -> None:
        self._failure_threshold = failure_threshold
        self._cooldown_seconds = cooldown_seconds
        self._consecutive_failures = 0
        self._opened_at: float = 0.0
        self._state = "closed"  # closed, open, half_open

    @property
    def state(self) -> str:
        """Current circuit state, accounting for cooldown expiry."""
        if self._state == "open":
            elapsed = time.monotonic() - self._opened_at
            if elapsed >= self._cooldown_seconds:
                self._state = "half_open"
        return self._state

    @property
    def is_available(self) -> bool:
        """True if the circuit allows a request to pass."""
        return self.state != "open"

    def record_success(self) -> None:
        """Record a successful call — close the circuit."""
        if self._consecutive_failures > 0 or self._state != "closed":
            logger.info(
                "Circuit breaker closed after success (was %s, %d failures)",
                self._state,
                self._consecutive_failures,
            )
        self._consecutive_failures = 0
        self._state = "closed"

    def record_failure(self) -> None:
        """Record a failed call — open the circuit if threshold is reached."""
        self._consecutive_failures += 1
        if self._consecutive_failures >= self._failure_threshold:
            if self._state != "open":
                logger.warning(
                    "Circuit breaker opened after %d consecutive failures (cooldown: %ds)",
                    self._consecutive_failures,
                    self._cooldown_seconds,
                )
            self._state = "open"
            self._opened_at = time.monotonic()

    @property
    def failure_count(self) -> int:
        """Number of consecutive failures."""
        return self._consecutive_failures


class NotificationService:
    """API-layer notification service with circuit breaker.

    Wraps the Oracle notifier engine to provide a clean interface
    for API routes and background tasks. Includes a circuit breaker
    that stops retrying after repeated failures.
    """

    def __init__(
        self,
        failure_threshold: int = _FAILURE_THRESHOLD,
        cooldown_seconds: float = _COOLDOWN_SECONDS,
    ):
        self._notifier = None
        self._enabled = False
        self._circuit = CircuitBreaker(failure_threshold, cooldown_seconds)
        self._init_notifier()

    def _init_notifier(self) -> None:
        """Lazy-load the Oracle notifier engine."""
        try:
            from services.oracle.oracle_service.engines import notifier

            self._notifier = notifier
            self._enabled = True
            logger.info("Notification service initialized")
        except ImportError:
            logger.info("Notification service: notifier engine not available")
            self._enabled = False

    @property
    def is_enabled(self) -> bool:
        """Whether the notification backend is available."""
        return self._enabled

    @property
    def circuit_state(self) -> str:
        """Current circuit breaker state: closed, open, or half_open."""
        return self._circuit.state

    def send_alert(
        self,
        notification_type: NotificationType,
        title: str,
        message: str,
        metadata: dict | None = None,
    ) -> bool:
        """Send a notification alert.

        Parameters
        ----------
        notification_type : NotificationType
            Category of notification.
        title : str
            Short alert title.
        message : str
            Alert body text.
        metadata : dict, optional
            Additional context data.

        Returns
        -------
        bool
            True if notification was sent (or queued), False on failure
            or if circuit breaker is open.
        """
        if not self._enabled or self._notifier is None:
            logger.debug(
                "Notification skipped (disabled): %s — %s",
                notification_type.value,
                title,
            )
            return False

        # Circuit breaker check (Issue #151)
        if not self._circuit.is_available:
            logger.debug(
                "Notification skipped (circuit open, %d failures): %s — %s",
                self._circuit.failure_count,
                notification_type.value,
                title,
            )
            return False

        try:
            formatted = f"*{title}*\n{message}"
            if metadata:
                details = "\n".join(f"  {k}: {v}" for k, v in metadata.items())
                formatted += f"\n\nDetails:\n{details}"

            # Route through notifier's dispatch system if available
            if hasattr(self._notifier, "dispatch_command"):
                self._notifier.dispatch_command(f"/alert {notification_type.value}", formatted)
                self._circuit.record_success()
                return True

            logger.debug("Notifier has no dispatch_command, notification dropped")
            self._circuit.record_failure()
            return False
        except Exception as e:
            logger.warning("Failed to send notification: %s", e)
            self._circuit.record_failure()
            return False


# Module-level singleton
_notification_service: NotificationService | None = None


def get_notification_service() -> NotificationService:
    """FastAPI dependency — returns the notification service singleton."""
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service
