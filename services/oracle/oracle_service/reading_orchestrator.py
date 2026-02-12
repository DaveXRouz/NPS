"""Reading Orchestrator — coordinates the full reading pipeline.

Pipeline: load profile → framework bridge → AI interpretation → response.
This is the central coordinator for ALL reading types.
Session 14 implements time reading; Sessions 15-18 add others.
"""

import logging
import time
from datetime import datetime
from typing import Any, Callable, Dict, Optional

from oracle_service.models.reading_types import ReadingResult, UserProfile

logger = logging.getLogger(__name__)


class ReadingOrchestrator:
    """Orchestrates the reading pipeline for all reading types.

    Provides:
    - Framework bridge invocation for each reading type
    - AI interpretation via Session 13 engine
    - Response formatting to API model structure
    - Progress callback for WebSocket updates
    """

    def __init__(
        self,
        progress_callback: Optional[Callable] = None,
    ):
        self.progress_callback = progress_callback

    async def _send_progress(self, step: int, total: int, message: str) -> None:
        """Send progress update via callback if registered."""
        if self.progress_callback:
            await self.progress_callback(step, total, message)

    async def generate_time_reading(
        self,
        user_profile: UserProfile,
        hour: int,
        minute: int,
        second: int,
        target_date: Optional[datetime] = None,
        locale: str = "en",
    ) -> Dict[str, Any]:
        """Full pipeline for time reading.

        Returns dict matching FrameworkReadingResponse fields.
        """
        total_steps = 4
        start = time.perf_counter()

        # Step 1: Generate framework reading
        await self._send_progress(1, total_steps, "Generating reading...")
        reading_result = self._call_framework_time(
            user_profile, hour, minute, second, target_date, locale
        )

        # Step 2: AI interpretation
        await self._send_progress(2, total_steps, "Interpreting patterns...")
        ai_sections = self._call_ai_interpreter(reading_result.framework_output, locale)

        # Step 3: Format response
        await self._send_progress(3, total_steps, "Formatting response...")
        response = self._build_response(reading_result, ai_sections, locale)

        # Step 4: Done
        elapsed = (time.perf_counter() - start) * 1000
        await self._send_progress(4, total_steps, "Done")
        logger.info("Time reading generated in %.1fms", elapsed)

        return response

    def _call_framework_time(
        self,
        user: UserProfile,
        hour: int,
        minute: int,
        second: int,
        target_date: Optional[datetime],
        locale: str,
    ) -> ReadingResult:
        """Invoke framework_bridge.generate_time_reading()."""
        from oracle_service.framework_bridge import generate_time_reading

        return generate_time_reading(user, hour, minute, second, target_date, locale)

    def _call_ai_interpreter(self, framework_output: Dict[str, Any], locale: str) -> Dict[str, Any]:
        """Invoke AI interpreter from Session 13."""
        try:
            from oracle_service.engines.ai_interpreter import interpret_reading

            result = interpret_reading(framework_output, reading_type="time", locale=locale)
            return result.to_dict() if hasattr(result, "to_dict") else result
        except Exception:
            logger.warning("AI interpretation unavailable", exc_info=True)
            # Fallback: use framework synthesis
            synthesis = framework_output.get("synthesis", "")
            translation = framework_output.get("translation", {})
            if translation and isinstance(translation, dict):
                return {
                    "header": translation.get("header", ""),
                    "universal_address": translation.get("universal_address", ""),
                    "core_identity": translation.get("core_identity", ""),
                    "right_now": translation.get("right_now", ""),
                    "patterns": translation.get("patterns", ""),
                    "message": translation.get("message", ""),
                    "advice": translation.get("advice", ""),
                    "caution": translation.get("caution", ""),
                    "footer": translation.get("footer", ""),
                    "full_text": translation.get("full_text", synthesis),
                    "ai_generated": False,
                    "locale": locale,
                    "elapsed_ms": 0.0,
                    "cached": False,
                    "confidence_score": 0,
                }
            return {
                "header": "",
                "universal_address": "",
                "core_identity": "",
                "right_now": "",
                "patterns": "",
                "message": synthesis or "Reading data available but AI interpretation unavailable.",
                "advice": "",
                "caution": "",
                "footer": "",
                "full_text": synthesis
                or "Reading data available but AI interpretation unavailable.",
                "ai_generated": False,
                "locale": locale,
                "elapsed_ms": 0.0,
                "cached": False,
                "confidence_score": 0,
            }

    def _build_response(
        self,
        reading_result: ReadingResult,
        ai_sections: Dict[str, Any],
        locale: str,
    ) -> Dict[str, Any]:
        """Build response dict matching FrameworkReadingResponse."""
        fw = reading_result.framework_output

        # Extract fc60_stamp string
        fc60_stamp_data = fw.get("fc60_stamp", {})
        fc60_stamp_str = ""
        if isinstance(fc60_stamp_data, dict):
            fc60_stamp_str = fc60_stamp_data.get("fc60", "")
        elif isinstance(fc60_stamp_data, str):
            fc60_stamp_str = fc60_stamp_data

        # Extract confidence
        confidence = fw.get("confidence", {})
        if not isinstance(confidence, dict):
            confidence = {"score": 50, "level": "low"}

        # Extract patterns
        patterns_data = fw.get("patterns", {})
        detected_patterns = []
        if isinstance(patterns_data, dict):
            detected_patterns = patterns_data.get("detected", [])

        return {
            "reading_type": "time",
            "sign_value": reading_result.sign_value or "",
            "framework_result": fw,
            "ai_interpretation": ai_sections,
            "confidence": confidence,
            "patterns": detected_patterns,
            "fc60_stamp": fc60_stamp_str,
            "numerology": fw.get("numerology"),
            "moon": fw.get("moon"),
            "ganzhi": fw.get("ganzhi"),
            "locale": locale,
        }
