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

    async def _send_progress(
        self, step: int, total: int, message: str, reading_type: str = "time"
    ) -> None:
        """Send progress update via callback if registered."""
        if self.progress_callback:
            await self.progress_callback(step, total, message, reading_type)

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
        Blocking calls are offloaded to a thread pool to avoid stalling the
        async event loop (the AI interpreter may use ``time.sleep`` in its
        rate limiter).
        """
        import asyncio

        loop = asyncio.get_running_loop()
        total_steps = 4
        start = time.perf_counter()

        # Step 1: Generate framework reading (blocking — offload)
        await self._send_progress(1, total_steps, "Generating reading...")
        reading_result = await loop.run_in_executor(
            None,
            lambda: self._call_framework_time(
                user_profile, hour, minute, second, target_date, locale
            ),
        )

        # Step 2: AI interpretation (blocking — offload)
        await self._send_progress(2, total_steps, "Interpreting patterns...")
        ai_sections = await loop.run_in_executor(
            None,
            lambda: self._call_ai_interpreter(reading_result.framework_output, locale),
        )

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

    def _call_ai_interpreter(
        self,
        framework_output: Dict[str, Any],
        locale: str,
        reading_type: str = "time",
        question: str = "",
        category: str | None = None,
    ) -> Dict[str, Any]:
        """Invoke AI interpreter from Session 13."""
        try:
            from oracle_service.engines.ai_interpreter import interpret_reading

            result = interpret_reading(
                framework_output,
                reading_type=reading_type,
                question=question,
                locale=locale,
                category=category,
            )
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

    def generate_name_reading(
        self,
        name: str,
        user_id: int | None = None,
        birth_day: int | None = None,
        birth_month: int | None = None,
        birth_year: int | None = None,
        mother_name: str | None = None,
        gender: str | None = None,
        numerology_system: str = "pythagorean",
        include_ai: bool = True,
        locale: str = "en",
    ) -> Dict[str, Any]:
        """Generate a name-based reading using the framework."""
        from oracle_service.framework_bridge import generate_name_reading as fw_name

        start = time.perf_counter()

        # Build minimal UserProfile for framework bridge
        user = UserProfile(
            user_id=user_id or 0,
            full_name=name,
            birth_day=birth_day or 1,
            birth_month=birth_month or 1,
            birth_year=birth_year or 2000,
            mother_name=mother_name,
            gender=gender,
            numerology_system=numerology_system,
        )

        # Build framework reading
        reading_result = fw_name(user, name, locale=locale)

        fw = reading_result.framework_output

        # AI interpretation
        ai_text = None
        if include_ai:
            ai_sections = self._call_ai_interpreter(fw, locale, reading_type="name")
            ai_text = ai_sections.get("full_text", "")

        # Extract numerology from framework output
        numerology = fw.get("numerology", {})

        # Build letter breakdown
        from oracle_service.question_analyzer import (
            PYTHAGOREAN_VALUES,
            CHALDEAN_VALUES,
            ABJAD_VALUES,
        )
        from oracle_service.utils.script_detector import detect_script as ds

        script = ds(name)
        if numerology_system == "abjad" or (numerology_system == "auto" and script == "persian"):
            table = ABJAD_VALUES
            resolved_system = "abjad"
        elif numerology_system == "chaldean":
            table = CHALDEAN_VALUES
            resolved_system = "chaldean"
        else:
            table = PYTHAGOREAN_VALUES
            resolved_system = "pythagorean"

        element_cycle = ["Fire", "Earth", "Metal", "Water", "Wood"]
        letter_breakdown = []
        if resolved_system == "abjad":
            for ch in name:
                val = table.get(ch, 0)
                if val > 0:
                    elem = element_cycle[(val - 1) % 5]
                    letter_breakdown.append({"letter": ch, "value": val, "element": elem})
        else:
            for ch in name.upper():
                if ch.isalpha():
                    val = table.get(ch, 0)
                    elem = element_cycle[(val - 1) % 5] if val > 0 else ""
                    letter_breakdown.append({"letter": ch, "value": val, "element": elem})

        elapsed = (time.perf_counter() - start) * 1000
        logger.info("Name reading generated in %.1fms", elapsed)

        # Extract confidence
        confidence = fw.get("confidence", {})
        if not isinstance(confidence, dict):
            confidence = {"score": 50, "level": "low"}

        return {
            "name": name,
            "detected_script": script if script != "unknown" else "latin",
            "numerology_system": resolved_system,
            "expression": numerology.get("expression", 0),
            "soul_urge": numerology.get("soul_urge", 0),
            "personality": numerology.get("personality", 0),
            "life_path": (
                numerology.get("life_path", {}).get("number")
                if isinstance(numerology.get("life_path"), dict)
                else numerology.get("life_path")
            ),
            "personal_year": numerology.get("personal_year"),
            "fc60_stamp": fw.get("fc60_stamp"),
            "moon": fw.get("moon"),
            "ganzhi": fw.get("ganzhi"),
            "patterns": fw.get("patterns"),
            "confidence": confidence,
            "ai_interpretation": ai_text,
            "letter_breakdown": letter_breakdown,
        }

    def generate_question_reading(
        self,
        question: str,
        user_id: int | None = None,
        birth_day: int | None = None,
        birth_month: int | None = None,
        birth_year: int | None = None,
        full_name: str | None = None,
        mother_name: str | None = None,
        gender: str | None = None,
        numerology_system: str = "auto",
        include_ai: bool = True,
        locale: str = "en",
        category: str | None = None,
        question_time: str | None = None,
    ) -> Dict[str, Any]:
        """Generate a question-based reading with question hashing."""
        from oracle_service.question_analyzer import question_number
        from oracle_service.framework_bridge import (
            generate_question_reading as fw_question,
        )

        start = time.perf_counter()

        # Hash the question text
        q_analysis = question_number(question, numerology_system)

        # Build minimal UserProfile for framework bridge
        user = UserProfile(
            user_id=user_id or 0,
            full_name=full_name or "Anonymous",
            birth_day=birth_day or 1,
            birth_month=birth_month or 1,
            birth_year=birth_year or 2000,
            mother_name=mother_name,
            gender=gender,
            numerology_system=q_analysis["system_used"],
        )

        # Generate framework reading
        reading_result = fw_question(user, question, locale=locale)

        fw = reading_result.framework_output

        # AI interpretation with question context
        ai_text = None
        if include_ai:
            ai_sections = self._call_ai_interpreter(
                fw,
                locale,
                reading_type="question",
                question=question,
                category=category,
            )
            ai_text = ai_sections.get("full_text", "")

        # Extract confidence
        confidence = fw.get("confidence", {})
        if not isinstance(confidence, dict):
            confidence = {"score": 50, "level": "low"}

        elapsed = (time.perf_counter() - start) * 1000
        logger.info("Question reading generated in %.1fms", elapsed)

        return {
            "question": question,
            "question_number": q_analysis["question_number"],
            "detected_script": q_analysis["detected_script"],
            "numerology_system": q_analysis["system_used"],
            "raw_letter_sum": q_analysis["raw_sum"],
            "is_master_number": q_analysis["is_master_number"],
            "category": category,
            "fc60_stamp": fw.get("fc60_stamp"),
            "numerology": fw.get("numerology"),
            "moon": fw.get("moon"),
            "ganzhi": fw.get("ganzhi"),
            "patterns": fw.get("patterns"),
            "confidence": confidence,
            "ai_interpretation": ai_text,
        }

    def _build_response(
        self,
        reading_result: ReadingResult,
        ai_sections: Dict[str, Any] | None,
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

    # ── Daily Reading (Session 16) ──

    async def generate_daily_reading(
        self,
        user_profile: UserProfile,
        target_date: Optional[datetime] = None,
        locale: str = "en",
    ) -> Dict[str, Any]:
        """Full pipeline for daily reading.

        Uses noon (12:00:00) as the reading time — neutral midday energy.
        Returns dict matching FrameworkReadingResponse fields + daily_insights.
        """
        import asyncio

        loop = asyncio.get_running_loop()
        total_steps = 4
        start = time.perf_counter()

        # Step 1: Generate framework reading via bridge (blocking — offload)
        await self._send_progress(1, total_steps, "Generating daily reading...", "daily")
        reading_result = await loop.run_in_executor(
            None, lambda: self._call_framework_daily(user_profile, target_date)
        )

        # Step 2: AI interpretation (blocking — offload)
        await self._send_progress(2, total_steps, "Interpreting today's energy...", "daily")
        ai_sections = await loop.run_in_executor(
            None,
            lambda: self._call_ai_interpreter(
                reading_result.framework_output, locale, reading_type="daily"
            ),
        )

        # Step 3: Format response
        await self._send_progress(3, total_steps, "Formatting response...", "daily")
        response = self._build_daily_response(reading_result, ai_sections, locale)

        # Step 4: Done
        elapsed = (time.perf_counter() - start) * 1000
        await self._send_progress(4, total_steps, "Done", "daily")
        logger.info("Daily reading generated in %.1fms", elapsed)

        return response

    def _call_framework_daily(
        self,
        user: UserProfile,
        target_date: Optional[datetime],
    ) -> ReadingResult:
        """Invoke framework_bridge.generate_daily_reading()."""
        from oracle_service.framework_bridge import generate_daily_reading

        return generate_daily_reading(user, target_date)

    def _build_daily_response(
        self,
        reading_result: ReadingResult,
        ai_sections: Dict[str, Any],
        locale: str,
    ) -> Dict[str, Any]:
        """Build response dict for daily reading with daily_insights."""
        fw = reading_result.framework_output
        base = self._build_response(reading_result, ai_sections, locale)
        base["reading_type"] = "daily"
        base["sign_value"] = reading_result.sign_value or ""
        base["daily_insights"] = getattr(reading_result, "daily_insights", None) or fw.get(
            "daily_insights", {}
        )
        return base

    # ── Multi-User Reading (Session 16) ──

    async def generate_multi_user_reading(
        self,
        user_profiles: list[UserProfile],
        primary_index: int = 0,
        target_date: Optional[datetime] = None,
        locale: str = "en",
        include_interpretation: bool = True,
    ) -> Dict[str, Any]:
        """Full pipeline for multi-user compatibility reading.

        Generates individual readings for each user, runs MultiUserAnalyzer
        for pairwise compatibility + group analysis. Optionally invokes AI
        for group interpretation.
        """
        import asyncio

        loop = asyncio.get_running_loop()
        total_steps = 5
        start = time.perf_counter()
        n_users = len(user_profiles)

        # Step 1: Generate individual readings (blocking — offload)
        await self._send_progress(
            1, total_steps, f"Generating readings for {n_users} users...", "multi"
        )
        individual_results = await loop.run_in_executor(
            None, lambda: self._call_framework_multi(user_profiles, target_date)
        )

        # Step 2: Run compatibility analysis (blocking — offload)
        await self._send_progress(2, total_steps, "Analyzing compatibility...", "multi")
        multi_result = await loop.run_in_executor(
            None, lambda: self._call_multi_analyzer(individual_results)
        )

        # Step 3: AI group interpretation (optional, blocking — offload)
        ai_sections = None
        if include_interpretation:
            await self._send_progress(3, total_steps, "Generating group interpretation...", "multi")
            ai_sections = await loop.run_in_executor(
                None,
                lambda: self._call_ai_group_interpreter(individual_results, multi_result, locale),
            )
        else:
            await self._send_progress(3, total_steps, "Skipping AI interpretation...", "multi")

        # Step 4: Format response
        await self._send_progress(4, total_steps, "Formatting response...", "multi")
        response = self._build_multi_response(
            user_profiles,
            individual_results,
            multi_result,
            ai_sections,
            primary_index,
            locale,
        )

        # Step 5: Done
        elapsed = (time.perf_counter() - start) * 1000
        await self._send_progress(5, total_steps, "Done", "multi")
        logger.info(
            "Multi-user reading generated in %.1fms (users=%d, pairs=%d)",
            elapsed,
            n_users,
            n_users * (n_users - 1) // 2,
        )

        response["computation_ms"] = elapsed
        return response

    def _call_framework_multi(
        self,
        users: list[UserProfile],
        target_date: Optional[datetime],
    ) -> list[ReadingResult]:
        """Invoke framework_bridge.generate_multi_user_reading()."""
        from oracle_service.framework_bridge import generate_multi_user_reading

        return generate_multi_user_reading(users, target_date=target_date)

    def _call_multi_analyzer(self, individual_results: list[ReadingResult]):
        """Invoke MultiUserAnalyzer.analyze_group() for compatibility scoring."""
        from oracle_service.multi_user_analyzer import MultiUserAnalyzer

        return MultiUserAnalyzer.analyze_group(individual_results)

    def _call_ai_group_interpreter(
        self,
        individual_results: list[ReadingResult],
        multi_result,
        locale: str,
    ) -> Dict[str, Any]:
        """Invoke AI interpreter with group context."""
        try:
            from oracle_service.engines.ai_interpreter import interpret_multi_user

            context = {
                "individual_readings": [r.framework_output for r in individual_results],
                "compatibility": getattr(multi_result, "pairwise_scores", []),
                "group_summary": getattr(multi_result, "group_summary", ""),
            }
            result = interpret_multi_user(context)
            return result.to_dict() if hasattr(result, "to_dict") else result
        except Exception:
            logger.warning("AI group interpretation unavailable", exc_info=True)
            summary = getattr(multi_result, "group_summary", "") or ""
            return {"full_text": summary, "header": "", "ai_generated": False}

    def _build_multi_response(
        self,
        profiles: list[UserProfile],
        individual: list[ReadingResult],
        multi_result,
        ai_sections: Dict[str, Any] | None,
        primary_idx: int,
        locale: str,
    ) -> Dict[str, Any]:
        """Build response dict matching MultiUserFrameworkResponse fields."""
        n = len(profiles)
        individual_responses = []
        for _user, reading in zip(profiles, individual):
            resp = self._build_response(reading, None, locale)
            resp["reading_type"] = "multi"
            individual_responses.append(resp)

        pairwise = []
        pairwise_scores = getattr(multi_result, "pairwise_scores", [])
        if not pairwise_scores:
            pairwise_scores = getattr(multi_result, "pairwise_compatibility", [])
        for pair_result in pairwise_scores:
            overall = getattr(pair_result, "overall_score", 0.0)
            pairwise.append(
                {
                    "user_a_name": getattr(pair_result, "user_a_name", ""),
                    "user_b_name": getattr(pair_result, "user_b_name", ""),
                    "user_a_id": getattr(pair_result, "user_a_id", 0),
                    "user_b_id": getattr(pair_result, "user_b_id", 0),
                    "overall_score": overall,
                    "overall_percentage": int(overall * 100),
                    "classification": getattr(pair_result, "classification", ""),
                    "dimensions": getattr(pair_result, "dimension_scores", {}),
                    "strengths": getattr(pair_result, "strengths", []),
                    "challenges": getattr(pair_result, "challenges", []),
                    "description": getattr(pair_result, "description", ""),
                }
            )

        group_analysis = None
        if n >= 3:
            harmony = getattr(multi_result, "group_harmony_score", 0.0)
            group_analysis = {
                "group_harmony_score": harmony,
                "group_harmony_percentage": int(harmony * 100),
                "element_balance": getattr(multi_result, "group_element_balance", {}),
                "animal_distribution": getattr(multi_result, "animal_distribution", {}),
                "dominant_element": getattr(multi_result, "dominant_element", ""),
                "dominant_animal": getattr(multi_result, "dominant_animal", ""),
                "group_summary": getattr(multi_result, "group_summary", ""),
            }

        return {
            "user_count": n,
            "pair_count": n * (n - 1) // 2,
            "computation_ms": 0,
            "individual_readings": individual_responses,
            "pairwise_compatibility": pairwise,
            "group_analysis": group_analysis,
            "ai_interpretation": ai_sections,
            "locale": locale,
        }
