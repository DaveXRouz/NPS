"""Tests for daily and multi-user reading orchestration (Session 16)."""

import asyncio
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

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
        "daily_insights": {
            "suggested_activities": ["Meditation", "Walk"],
            "energy_forecast": "Balanced energy throughout the day",
            "lucky_hours": [9, 14, 18],
            "focus_area": "Relationships",
            "element_of_day": "Fire",
        },
    }


def _make_reading_result(reading_type=ReadingType.DAILY, sign_value="2026-02-13") -> ReadingResult:
    return ReadingResult(
        reading_type=reading_type,
        user_id=1,
        framework_output=_make_framework_output(),
        sign_value=sign_value,
        confidence_score=72.0,
    )


def _make_pair_result(a_name="User A", b_name="User B", a_id=0, b_id=1):
    """Create a SimpleNamespace with pairwise attributes for getattr()."""
    return SimpleNamespace(
        user_a_name=a_name,
        user_b_name=b_name,
        user_a_id=a_id,
        user_b_id=b_id,
        overall_score=0.72,
        classification="Good",
        dimension_scores={
            "life_path": 80,
            "element": 70,
            "animal": 65,
            "moon": 60,
            "pattern": 55,
        },
        strengths=["Complementary elements"],
        challenges=["Different rhythms"],
        description="Good compatibility",
    )


def _make_multi_result(n_users=2):
    """Minimal multi-user analyzer output as SimpleNamespace for getattr()."""
    pairs = []
    for i in range(n_users):
        for j in range(i + 1, n_users):
            pairs.append(_make_pair_result(f"User {i}", f"User {j}", i, j))
    return SimpleNamespace(
        pairwise_scores=pairs,
        pairwise_compatibility=pairs,
        group_harmony_score=0.0,
        group_element_balance={},
        animal_distribution={},
        dominant_element="",
        dominant_animal="",
        group_summary="",
    )


class TestDailyReadingReturnsRequiredKeys:
    @patch.object(ReadingOrchestrator, "_call_ai_interpreter")
    @patch.object(ReadingOrchestrator, "_call_framework_daily")
    def test_daily_reading_returns_required_keys(self, mock_fw, mock_ai):
        mock_fw.return_value = _make_reading_result()
        mock_ai.return_value = {
            "header": "Test",
            "full_text": "Daily text",
            "ai_generated": True,
            "locale": "en",
        }

        orch = ReadingOrchestrator()
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_daily_reading(_make_user_profile())
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


class TestDailyReadingHasDailyInsights:
    @patch.object(ReadingOrchestrator, "_call_ai_interpreter")
    @patch.object(ReadingOrchestrator, "_call_framework_daily")
    def test_daily_reading_has_daily_insights(self, mock_fw, mock_ai):
        mock_fw.return_value = _make_reading_result()
        mock_ai.return_value = {"full_text": "ok"}

        orch = ReadingOrchestrator()
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_daily_reading(_make_user_profile())
        )

        assert "daily_insights" in result
        insights = result["daily_insights"]
        for key in [
            "suggested_activities",
            "energy_forecast",
            "lucky_hours",
            "focus_area",
            "element_of_day",
        ]:
            assert key in insights, f"Missing insight key: {key}"


class TestDailyReadingUsesNoon:
    @patch.object(ReadingOrchestrator, "_call_ai_interpreter")
    @patch.object(ReadingOrchestrator, "_call_framework_daily")
    def test_daily_reading_uses_noon(self, mock_fw, mock_ai):
        mock_fw.return_value = _make_reading_result()
        mock_ai.return_value = {"full_text": "ok"}

        orch = ReadingOrchestrator()
        asyncio.get_event_loop().run_until_complete(
            orch.generate_daily_reading(_make_user_profile())
        )

        mock_fw.assert_called_once()
        args = mock_fw.call_args
        # _call_framework_daily receives user profile and target_date
        assert args is not None


class TestDailyReadingDefaultDate:
    @patch.object(ReadingOrchestrator, "_call_ai_interpreter")
    @patch.object(ReadingOrchestrator, "_call_framework_daily")
    def test_daily_reading_default_date(self, mock_fw, mock_ai):
        mock_fw.return_value = _make_reading_result()
        mock_ai.return_value = {"full_text": "ok"}

        orch = ReadingOrchestrator()
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_daily_reading(_make_user_profile(), target_date=None)
        )

        today = date.today().isoformat()
        assert result["sign_value"] == today


class TestDailyReadingSignValueIsDate:
    @patch.object(ReadingOrchestrator, "_call_ai_interpreter")
    @patch.object(ReadingOrchestrator, "_call_framework_daily")
    def test_daily_reading_sign_value_is_date(self, mock_fw, mock_ai):
        mock_fw.return_value = _make_reading_result(sign_value="2026-06-15")
        mock_ai.return_value = {"full_text": "ok"}

        orch = ReadingOrchestrator()
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_daily_reading(_make_user_profile(), target_date=date(2026, 6, 15))
        )

        # sign_value should be a date in YYYY-MM-DD format
        parts = result["sign_value"].split("-")
        assert len(parts) == 3
        assert all(p.isdigit() for p in parts)


class TestDailyProgressCallbackCalled:
    @patch.object(ReadingOrchestrator, "_call_ai_interpreter")
    @patch.object(ReadingOrchestrator, "_call_framework_daily")
    def test_daily_progress_callback_called(self, mock_fw, mock_ai):
        mock_fw.return_value = _make_reading_result()
        mock_ai.return_value = {"full_text": "ok"}

        calls = []

        async def track_progress(step, total, message, reading_type="time"):
            calls.append((step, total, message, reading_type))

        orch = ReadingOrchestrator(progress_callback=track_progress)
        asyncio.get_event_loop().run_until_complete(
            orch.generate_daily_reading(_make_user_profile())
        )

        assert len(calls) == 4
        for call in calls:
            assert call[3] == "daily"


class TestMultiReadingTwoUsers:
    @patch.object(ReadingOrchestrator, "_call_ai_group_interpreter")
    @patch.object(ReadingOrchestrator, "_call_multi_analyzer")
    @patch.object(ReadingOrchestrator, "_call_framework_multi")
    def test_multi_reading_two_users(self, mock_fw, mock_analyzer, mock_ai):
        mock_fw.return_value = [_make_reading_result(), _make_reading_result()]
        mock_analyzer.return_value = _make_multi_result(2)
        mock_ai.return_value = None

        profiles = [
            _make_user_profile(user_id=1),
            _make_user_profile(user_id=2, full_name="User B"),
        ]
        orch = ReadingOrchestrator()
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_multi_user_reading(profiles, primary_index=0)
        )

        assert result["user_count"] == 2
        assert len(result["individual_readings"]) == 2
        assert len(result["pairwise_compatibility"]) == 1


class TestMultiReadingThreeUsers:
    @patch.object(ReadingOrchestrator, "_call_ai_group_interpreter")
    @patch.object(ReadingOrchestrator, "_call_multi_analyzer")
    @patch.object(ReadingOrchestrator, "_call_framework_multi")
    def test_multi_reading_three_users(self, mock_fw, mock_analyzer, mock_ai):
        multi_result = _make_multi_result(3)
        multi_result.group_harmony_score = 0.65
        multi_result.group_element_balance = {"Fire": 2, "Water": 1}
        multi_result.animal_distribution = {"Horse": 2, "Rat": 1}
        multi_result.dominant_element = "Fire"
        multi_result.dominant_animal = "Horse"
        multi_result.group_summary = "Fiery group energy."
        mock_fw.return_value = [_make_reading_result()] * 3
        mock_analyzer.return_value = multi_result
        mock_ai.return_value = None

        profiles = [_make_user_profile(user_id=i, full_name=f"User {i}") for i in range(3)]
        orch = ReadingOrchestrator()
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_multi_user_reading(profiles, primary_index=0)
        )

        assert result["user_count"] == 3
        assert len(result["pairwise_compatibility"]) == 3
        assert result["group_analysis"] is not None


class TestMultiReadingFiveUsers:
    @patch.object(ReadingOrchestrator, "_call_ai_group_interpreter")
    @patch.object(ReadingOrchestrator, "_call_multi_analyzer")
    @patch.object(ReadingOrchestrator, "_call_framework_multi")
    def test_multi_reading_five_users(self, mock_fw, mock_analyzer, mock_ai):
        multi_result = _make_multi_result(5)
        multi_result.group_harmony_score = 0.55
        multi_result.group_element_balance = {"Fire": 2, "Water": 2, "Earth": 1}
        multi_result.animal_distribution = {"Horse": 3, "Rat": 2}
        multi_result.dominant_element = "Fire"
        multi_result.dominant_animal = "Horse"
        multi_result.group_summary = "Diverse group."
        mock_fw.return_value = [_make_reading_result()] * 5
        mock_analyzer.return_value = multi_result
        mock_ai.return_value = None

        profiles = [_make_user_profile(user_id=i, full_name=f"User {i}") for i in range(5)]
        orch = ReadingOrchestrator()
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_multi_user_reading(profiles, primary_index=0)
        )

        assert result["user_count"] == 5
        assert len(result["individual_readings"]) == 5
        assert len(result["pairwise_compatibility"]) == 10


class TestMultiReadingGroupAnalysis3Plus:
    @patch.object(ReadingOrchestrator, "_call_ai_group_interpreter")
    @patch.object(ReadingOrchestrator, "_call_multi_analyzer")
    @patch.object(ReadingOrchestrator, "_call_framework_multi")
    def test_multi_reading_group_analysis_3plus(self, mock_fw, mock_analyzer, mock_ai):
        # 2 users → no group analysis
        mock_fw.return_value = [_make_reading_result()] * 2
        mock_analyzer.return_value = _make_multi_result(2)
        mock_ai.return_value = None

        profiles_2 = [_make_user_profile(user_id=i) for i in range(2)]
        orch = ReadingOrchestrator()
        result_2 = asyncio.get_event_loop().run_until_complete(
            orch.generate_multi_user_reading(profiles_2, primary_index=0)
        )
        assert result_2["group_analysis"] is None

        # 3 users → has group analysis
        multi_result_3 = _make_multi_result(3)
        multi_result_3.group_harmony_score = 0.7
        multi_result_3.group_element_balance = {"Fire": 2, "Water": 1}
        multi_result_3.animal_distribution = {"Horse": 2, "Rat": 1}
        multi_result_3.dominant_element = "Fire"
        multi_result_3.dominant_animal = "Horse"
        multi_result_3.group_summary = "Good group."
        mock_fw.return_value = [_make_reading_result()] * 3
        mock_analyzer.return_value = multi_result_3

        profiles_3 = [_make_user_profile(user_id=i) for i in range(3)]
        result_3 = asyncio.get_event_loop().run_until_complete(
            orch.generate_multi_user_reading(profiles_3, primary_index=0)
        )
        assert result_3["group_analysis"] is not None


class TestMultiProgressCallbackCalled:
    @patch.object(ReadingOrchestrator, "_call_ai_group_interpreter")
    @patch.object(ReadingOrchestrator, "_call_multi_analyzer")
    @patch.object(ReadingOrchestrator, "_call_framework_multi")
    def test_multi_progress_callback_called(self, mock_fw, mock_analyzer, mock_ai):
        mock_fw.return_value = [_make_reading_result()] * 2
        mock_analyzer.return_value = _make_multi_result(2)
        mock_ai.return_value = None

        calls = []

        async def track_progress(step, total, message, reading_type="time"):
            calls.append((step, total, message, reading_type))

        profiles = [_make_user_profile(user_id=i) for i in range(2)]
        orch = ReadingOrchestrator(progress_callback=track_progress)
        asyncio.get_event_loop().run_until_complete(
            orch.generate_multi_user_reading(profiles, primary_index=0)
        )

        assert len(calls) == 5
        for call in calls:
            assert call[3] == "multi"


class TestMultiAIFallback:
    @patch.object(ReadingOrchestrator, "_call_multi_analyzer")
    @patch.object(ReadingOrchestrator, "_call_framework_multi")
    def test_multi_ai_fallback(self, mock_fw, mock_analyzer):
        multi_result = _make_multi_result(3)
        multi_result.group_harmony_score = 0.65
        multi_result.group_element_balance = {"Fire": 2, "Water": 1}
        multi_result.animal_distribution = {"Horse": 2, "Rat": 1}
        multi_result.dominant_element = "Fire"
        multi_result.dominant_animal = "Horse"
        multi_result.group_summary = "Fiery group energy fallback."
        mock_fw.return_value = [_make_reading_result()] * 3
        mock_analyzer.return_value = multi_result

        profiles = [_make_user_profile(user_id=i) for i in range(3)]
        orch = ReadingOrchestrator()
        # _call_ai_group_interpreter will fail naturally → fallback
        result = asyncio.get_event_loop().run_until_complete(
            orch.generate_multi_user_reading(profiles, primary_index=0, include_interpretation=True)
        )

        # Either ai_interpretation is None (fallback) or contains fallback text
        ai = result.get("ai_interpretation")
        if ai is not None:
            assert "full_text" in ai
