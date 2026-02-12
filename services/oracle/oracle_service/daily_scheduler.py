"""Daily Reading Scheduler — pre-generates readings for active users.

Runs as a background asyncio task registered on FastAPI startup.
At a configurable time (default 00:05 UTC), generates daily readings
for all active oracle users who don't have one for today yet.

Configuration via environment variables:
    NPS_DAILY_SCHEDULER_ENABLED=true/false (default: true)
    NPS_DAILY_SCHEDULER_HOUR=0 (0-23, UTC)
    NPS_DAILY_SCHEDULER_MINUTE=5 (0-59)
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


class DailyScheduler:
    """Background task that pre-generates daily readings."""

    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
        self._enabled = os.environ.get("NPS_DAILY_SCHEDULER_ENABLED", "true").lower() == "true"
        self._hour = int(os.environ.get("NPS_DAILY_SCHEDULER_HOUR", "0"))
        self._minute = int(os.environ.get("NPS_DAILY_SCHEDULER_MINUTE", "5"))
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self):
        """Start the scheduler background task."""
        if not self._enabled:
            logger.info("Daily scheduler disabled via NPS_DAILY_SCHEDULER_ENABLED")
            return
        self._running = True
        self._task = asyncio.create_task(self._scheduler_loop())
        logger.info(
            "Daily scheduler started (generation at %02d:%02d UTC)",
            self._hour,
            self._minute,
        )

    async def stop(self):
        """Stop the scheduler."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Daily scheduler stopped")

    async def _scheduler_loop(self):
        """Main loop — waits until generation time, runs, sleeps until next day."""
        while self._running:
            try:
                now = datetime.now(timezone.utc)
                target = now.replace(hour=self._hour, minute=self._minute, second=0, microsecond=0)
                if now >= target:
                    target += timedelta(days=1)

                wait_seconds = (target - now).total_seconds()
                logger.info(
                    "Next daily generation in %.0f seconds (at %s)",
                    wait_seconds,
                    target,
                )
                await asyncio.sleep(wait_seconds)

                await self.generate_all_daily_readings()

            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Daily scheduler error — retrying in 60s")
                await asyncio.sleep(60)

    async def generate_all_daily_readings(self) -> dict:
        """Generate daily readings for all active oracle users.

        Returns stats dict: {"total_users", "generated", "cached", "errors"}.
        """
        from app.orm.oracle_user import OracleUser
        from app.services.oracle_reading import OracleReadingService

        stats = {"total_users": 0, "generated": 0, "cached": 0, "errors": 0}
        db = self.db_session_factory()

        try:
            active_users = db.query(OracleUser).filter(OracleUser.deleted_at.is_(None)).all()
            stats["total_users"] = len(active_users)
            logger.info("Generating daily readings for %d active users", len(active_users))

            svc = OracleReadingService(db)
            for user in active_users:
                try:
                    result = await svc.create_daily_reading(
                        user_id=user.id,
                        date_str=None,  # today
                        locale="en",
                        numerology_system="auto",
                        force_regenerate=False,
                    )
                    if result.get("_cached"):
                        stats["cached"] += 1
                    else:
                        stats["generated"] += 1
                except Exception:
                    logger.warning(
                        "Failed to generate daily for user %d",
                        user.id,
                        exc_info=True,
                    )
                    stats["errors"] += 1

            db.commit()
            logger.info("Daily generation complete: %s", stats)
        except Exception:
            logger.exception("Critical error in daily generation")
            db.rollback()
        finally:
            db.close()

        return stats

    async def trigger_manual(self) -> dict:
        """Manually trigger daily generation (admin action)."""
        logger.info("Manual daily generation triggered")
        return await self.generate_all_daily_readings()
