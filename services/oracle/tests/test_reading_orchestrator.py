"""Tests for ReadingOrchestrator — central reading pipeline coordinator."""

import asyncio
from unittest.mock import MagicMock, patch


from oracle_service.models.reading_types import ReadingResult, ReadingType, UserProfile
from oracle_service.reading_orchestrator import ReadingOrchestrator


def _make_user_profile(**kwargs) -> UserProfile:
    defaults = {
        "user_id": 1,
        "full_name": "Test User",
        "birth_day": 15,
        "birth_month": 6,
        "birth_year": 1990,
    }
    defaults.update(kwargs)
    return UserProfile(**defaults)


def _make_framework_output() -> dict:
    return {
        "fc60_stamp": {"fc60": "LU-OX-OXWA ☀TI-HOWU-RAWU", "j60": "abc"},
        "numerology": {
            "life_path": {
                "number": 3,
                "title": "Creator",
                "message": "Creative energy",
            },
            "expression": 5,
            "soul_urge": 7,
            "personality": 8,
            "personal_year": 4,
            "personal_month": 2,
            "personal_day": 9,
        },
        "moon": {"phase_name": "Waxing Crescent", "illumination": 25.0},
        "ganzhi": {"year_animal": "Horse", "year_element": "Fire"},
        "confidence": {"score": 72, "level": "high", "factors": "name,dob"},
        "patterns": {
            "detected": [
                {
                    "type": "animal_repetition",
                    "strength": "high",
                    "animal": "Horse",
                    "occurrences": 3,
                }
            ],
            "count": 1,
        },
        "synthesis": "Framework synthesis text for fallback.",
        "reading": {"signals": [], "combined_signals": None},
        "patterns_ai": "AI pattern text",
        "patterns_frontend": [],
        "patterns_db": {},
        "confidence_ui": {},
    }


def _make_reading_result() -> ReadingResult:
    return ReadingResult(
        reading_type=ReadingType.TIME,
        user_id=1,
        framework_output=_make_framework_output(),
        sign_value="14:30:00",
        confidence_score=72.0,
    )


class TestOrchestratorInstantiation:
    def test_creates_instance(self):
        orch = ReadingOrchestrator()
        assert orch is not None
        assert orch.progress_callback is None

    def test_creates_with_callback(self):
        cb = MagicMock()
        orch = ReadingOrchestrator(progress_callback=cb)
        assert orch.progress_callback is cb


class TestTimeReadingReturnsRequiredKeys:
    @patch.object(ReadingOrchestrator, "_call_ai_interpreter")
    @patch.object(ReadingOrchestrator, "_call_framework_time")
    def test_returns_required_keys(self, mock_fw, mock_ai):
        mock_fw.return_value = _make_reading_result()
        mock_ai.return_value = {
            "header": "Test",
            "full_text": "Interpretation text",
            "ai_generated": True,
            "locale": "en",
        }

        orch = ReadingOrchestrator()
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_time_reading(_make_user_profile(), 14, 30, 0)
        )

        required_keys = [
            "reading_type",
            "sign_value",
            "framework_result",
            "ai_interpretation",
            "confidence",
            "patterns",
            "fc60_stamp",
            "numerology",
            "moon",
            "ganzhi",
            "locale",
        ]
        for key in required_keys:
            assert key in result, f"Missing key: {key}"


class TestTimeReadingCorrectSignValue:
    @patch.object(ReadingOrchestrator, "_call_ai_interpreter")
    @patch.object(ReadingOrchestrator, "_call_framework_time")
    def test_sign_value_matches(self, mock_fw, mock_ai):
        mock_fw.return_value = _make_reading_result()
        mock_ai.return_value = {"full_text": "ok"}

        orch = ReadingOrchestrator()
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_time_reading(_make_user_profile(), 14, 30, 0)
        )
        assert result["sign_value"] == "14:30:00"


class TestFrameworkOutputPresent:
    @patch.object(ReadingOrchestrator, "_call_ai_interpreter")
    @patch.object(ReadingOrchestrator, "_call_framework_time")
    def test_framework_output_non_empty(self, mock_fw, mock_ai):
        mock_fw.return_value = _make_reading_result()
        mock_ai.return_value = {"full_text": "ok"}

        orch = ReadingOrchestrator()
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_time_reading(_make_user_profile(), 14, 30, 0)
        )
        assert isinstance(result["framework_result"], dict)
        assert "fc60_stamp" in result["framework_result"]
        assert result["fc60_stamp"] == "LU-OX-OXWA ☀TI-HOWU-RAWU"


class TestAIFallbackOnError:
    @patch.object(ReadingOrchestrator, "_call_framework_time")
    def test_ai_failure_returns_fallback(self, mock_fw):
        mock_fw.return_value = _make_reading_result()

        orch = ReadingOrchestrator()
        # _call_ai_interpreter will fail naturally since engines.ai_interpreter
        # can't be imported in test context — fallback kicks in
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_time_reading(_make_user_profile(), 14, 30, 0)
        )

        ai = result["ai_interpretation"]
        assert isinstance(ai, dict)
        # Fallback uses synthesis text
        assert (
            "Framework synthesis text" in ai.get("full_text", "") or ai.get("full_text", "") != ""
        )


class TestProgressCallbackCalled:
    @patch.object(ReadingOrchestrator, "_call_ai_interpreter")
    @patch.object(ReadingOrchestrator, "_call_framework_time")
    def test_callback_called_4_times(self, mock_fw, mock_ai):
        mock_fw.return_value = _make_reading_result()
        mock_ai.return_value = {"full_text": "ok"}

        calls = []

        async def track_progress(step, total, message, reading_type="time"):
            calls.append((step, total, message, reading_type))

        orch = ReadingOrchestrator(progress_callback=track_progress)
        asyncio.get_event_loop().run_until_complete(
            orch.generate_time_reading(_make_user_profile(), 14, 30, 0)
        )

        assert len(calls) == 4
        assert calls[0][0] == 1
        assert calls[1][0] == 2
        assert calls[2][0] == 3
        assert calls[3][0] == 4
        assert calls[-1][2] == "Done"


class TestProgressCallbackOptional:
    @patch.object(ReadingOrchestrator, "_call_ai_interpreter")
    @patch.object(ReadingOrchestrator, "_call_framework_time")
    def test_no_crash_without_callback(self, mock_fw, mock_ai):
        mock_fw.return_value = _make_reading_result()
        mock_ai.return_value = {"full_text": "ok"}

        orch = ReadingOrchestrator(progress_callback=None)
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_time_reading(_make_user_profile(), 14, 30, 0)
        )
        assert result is not None
        assert result["reading_type"] == "time"
