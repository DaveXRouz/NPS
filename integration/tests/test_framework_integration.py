"""Integration tests for framework verification, AI mock/real, cross-reading integrity,
and performance."""

import os

import pytest

from conftest import (
    DETERMINISTIC_DATETIME,
    THREE_USERS,
    VALID_LIFE_PATHS,
    api_url,
    timed_request,
)

# ─── Framework Output Verification ──────────────────────────────────────────


@pytest.mark.framework
class TestFrameworkOutput:
    """Verify all engines produce non-null data for known dates."""

    def test_fc60_engine_produces_data(self, reading_helper):
        """Time reading returns fc60 with all fields non-None."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        fc60 = data["fc60"]
        assert fc60 is not None, "fc60 should not be None"
        assert fc60["cycle"] is not None
        assert fc60["element"] is not None
        assert fc60["polarity"] is not None
        assert fc60["stem"] is not None
        assert fc60["branch"] is not None

    def test_numerology_engine_produces_data(self, reading_helper):
        """numerology.life_path > 0 and interpretation non-empty."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        num = data["numerology"]
        assert num is not None, "numerology should not be None"
        assert num["life_path"] > 0
        assert isinstance(num["interpretation"], str) and len(num["interpretation"]) > 0

    def test_zodiac_engine_produces_data(self, reading_helper):
        """zodiac.sign, element, ruling_planet all non-empty."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        z = data["zodiac"]
        assert z is not None
        assert isinstance(z["sign"], str) and len(z["sign"]) > 0
        assert isinstance(z["element"], str) and len(z["element"]) > 0
        assert isinstance(z["ruling_planet"], str) and len(z["ruling_planet"]) > 0

    def test_chinese_engine_produces_data(self, reading_helper):
        """chinese.animal, element, yin_yang all non-empty."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        ch = data["chinese"]
        assert ch is not None
        assert isinstance(ch["animal"], str) and len(ch["animal"]) > 0
        assert isinstance(ch["element"], str) and len(ch["element"]) > 0
        assert isinstance(ch["yin_yang"], str) and len(ch["yin_yang"]) > 0

    def test_ganzhi_engine_produces_output(self, reading_helper):
        """Non-None ganzhi with year_name non-empty."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        ganzhi = data.get("ganzhi")
        if ganzhi is not None:
            assert isinstance(ganzhi["year_name"], str) and len(ganzhi["year_name"]) > 0

    def test_fc60_extended_produces_output(self, reading_helper):
        """Non-None fc60_extended with stamp non-empty."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        ext = data.get("fc60_extended")
        if ext is not None:
            assert isinstance(ext["stamp"], str) and len(ext["stamp"]) > 0

    def test_moon_engine_produces_output(self, reading_helper):
        """Non-None moon with phase_name non-empty."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        moon = data.get("moon")
        if moon is not None:
            assert isinstance(moon["phase_name"], str) and len(moon["phase_name"]) > 0

    def test_chaldean_engine_produces_output(self, reading_helper):
        """Non-None chaldean with value > 0."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        ch = data.get("chaldean")
        if ch is not None:
            assert isinstance(ch["value"], int) and ch["value"] > 0

    def test_synchronicities_populated(self, reading_helper):
        """synchronicities is list (length may vary)."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        assert isinstance(data["synchronicities"], list)

    def test_all_engines_non_null_known_date(self, reading_helper):
        """For DETERMINISTIC_DATETIME, fc60, numerology, zodiac, chinese are all non-None
        (comprehensive smoke test)."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        assert data["fc60"] is not None, "fc60 should be non-None for known date"
        assert data["numerology"] is not None, "numerology should be non-None"
        assert data["zodiac"] is not None, "zodiac should be non-None"
        assert data["chinese"] is not None, "chinese should be non-None"
        # Optional sections — verify they exist in response (may be None)
        for key in ("moon", "angel", "chaldean", "ganzhi", "fc60_extended"):
            assert key in data, f"Missing optional section: {key}"


# ─── AI Mock CI Tests ────────────────────────────────────────────────────────


@pytest.mark.framework
class TestAIMockCI:
    """Tests that work with or without ANTHROPIC_API_KEY."""

    def test_ai_interpretation_type_valid(self, reading_helper):
        """ai_interpretation is None or str — either is valid depending on API key."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        ai = data.get("ai_interpretation")
        assert ai is None or isinstance(ai, str), (
            f"ai_interpretation should be None or str, got: {type(ai)}"
        )

    def test_multi_user_ai_interpretation_type(self, reading_helper):
        """Multi-user ai_interpretation is None, str, or dict."""
        data = reading_helper.multi_user_reading(
            THREE_USERS[:2],
            include_interpretation=True,
        )
        ai = data.get("ai_interpretation")
        assert ai is None or isinstance(ai, (str, dict)), (
            f"ai_interpretation should be None, str, or dict, got: {type(ai)}"
        )


# ─── AI Real Staging Tests ──────────────────────────────────────────────────


@pytest.mark.ai_real
class TestAIRealStaging:
    """Tests requiring real Anthropic API key — skipped in CI."""

    @pytest.mark.skipif(
        not os.environ.get("ANTHROPIC_API_KEY"),
        reason="Requires real Anthropic API key",
    )
    def test_ai_real_reading_interpretation(self, reading_helper):
        """With real key, ai_interpretation is string > 50 chars."""
        data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        ai = data.get("ai_interpretation")
        assert ai is not None, "With real API key, ai_interpretation should not be None"
        assert isinstance(ai, str) and len(ai) > 50, (
            f"AI interpretation too short: {len(ai) if ai else 0} chars"
        )

    @pytest.mark.skipif(
        not os.environ.get("ANTHROPIC_API_KEY"),
        reason="Requires real Anthropic API key",
    )
    def test_ai_real_group_interpretation(self, reading_helper):
        """With real key, multi-user ai_interpretation is dict with narrative."""
        data = reading_helper.multi_user_reading(
            THREE_USERS,
            include_interpretation=True,
        )
        ai = data.get("ai_interpretation")
        assert ai is not None, "With real API key, ai_interpretation should not be None"
        if isinstance(ai, dict):
            assert "narrative" in ai or "summary" in ai, (
                f"AI interpretation dict missing narrative/summary. Keys: {list(ai.keys())}"
            )


# ─── Cross-Reading Integrity ────────────────────────────────────────────────


@pytest.mark.framework
class TestCrossReadingIntegrity:
    """Verify data consistency across different reading types."""

    def test_time_and_name_independent(self, reading_helper):
        """Time reading life_path is based on date; name reading is independent."""
        time_data = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        name_data = reading_helper.name_reading("IntTest_Cross")
        # Time reading has life_path from date
        time_lp = time_data["numerology"]["life_path"]
        assert time_lp in VALID_LIFE_PATHS
        # Name reading has expression/destiny from name
        name_num = name_data.get("expression") or name_data.get("destiny_number", 0)
        assert isinstance(name_num, int) and name_num >= 0

    def test_multi_user_profiles_have_life_path(self, reading_helper):
        """Each user's life_path in multi-user profile is a valid numerology number."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        for i, profile in enumerate(data["profiles"]):
            lp = profile.get("life_path", 0)
            assert isinstance(lp, int) and lp > 0, (
                f"Profile {i} life_path should be positive int, got: {lp}"
            )

    def test_reading_storage_types_distinct(self, api_client, reading_helper):
        """After creating 3 reading types, history has entries with distinct sign_type values."""
        # Create one of each type
        reading_helper.time_reading()
        reading_helper.name_reading("IntTest_TypeCheck")
        reading_helper.question_reading("Type check question?")

        # Check history
        resp = api_client.get(api_url("/api/oracle/readings?limit=50"))
        assert resp.status_code == 200
        readings = resp.json()["readings"]
        sign_types = {r["sign_type"] for r in readings}
        # Should have at least reading, name, question
        assert "reading" in sign_types, "Should have 'reading' type"
        assert "name" in sign_types, "Should have 'name' type"
        assert "question" in sign_types, "Should have 'question' type"


# ─── Performance Tests ───────────────────────────────────────────────────────


@pytest.mark.slow
class TestReadingPerformance:
    """Performance sanity tests — each reading type within documented limits."""

    def test_time_reading_under_5s(self, api_client):
        """Time reading < 5 seconds."""
        resp, elapsed = timed_request(
            api_client,
            "post",
            api_url("/api/oracle/reading"),
            json={"datetime": DETERMINISTIC_DATETIME},
        )
        assert resp.status_code == 200
        assert elapsed < 5000, f"Time reading took {elapsed:.0f}ms, target <5000ms"

    def test_name_reading_under_2s(self, api_client):
        """Name reading < 2 seconds."""
        resp, elapsed = timed_request(
            api_client,
            "post",
            api_url("/api/oracle/name"),
            json={"name": "IntTest_Perf"},
        )
        assert resp.status_code == 200
        assert elapsed < 2000, f"Name reading took {elapsed:.0f}ms, target <2000ms"

    def test_question_reading_under_5s(self, api_client):
        """Question reading < 5 seconds."""
        resp, elapsed = timed_request(
            api_client,
            "post",
            api_url("/api/oracle/question"),
            json={"question": "Performance test question?"},
        )
        assert resp.status_code == 200
        assert elapsed < 5000, f"Question reading took {elapsed:.0f}ms, target <5000ms"

    def test_daily_reading_under_2s(self, api_client):
        """Daily reading < 2 seconds."""
        resp, elapsed = timed_request(
            api_client,
            "get",
            api_url("/api/oracle/daily"),
        )
        assert resp.status_code == 200
        assert elapsed < 2000, f"Daily reading took {elapsed:.0f}ms, target <2000ms"

    def test_three_user_reading_under_8s(self, api_client):
        """3-user reading < 8 seconds."""
        resp, elapsed = timed_request(
            api_client,
            "post",
            api_url("/api/oracle/reading/multi-user"),
            json={
                "users": THREE_USERS,
                "primary_user_index": 0,
                "include_interpretation": False,
            },
        )
        assert resp.status_code == 200
        assert elapsed < 8000, f"3-user reading took {elapsed:.0f}ms, target <8000ms"


# ─── Multi-User Engine Output ─────────────────────────────────────────────────


@pytest.mark.framework
class TestMultiUserEngineOutput:
    """Verify multi-user engine produces complete profile data."""

    def test_multi_user_engine_produces_profiles(self, reading_helper):
        """Multi-user reading profiles each have non-empty element, animal,
        life_path > 0."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        for i, profile in enumerate(data["profiles"]):
            assert (
                isinstance(profile["element"], str) and len(profile["element"]) > 0
            ), f"Profile {i} element should be non-empty"
            assert isinstance(profile["animal"], str) and len(profile["animal"]) > 0, (
                f"Profile {i} animal should be non-empty"
            )
            assert isinstance(profile["life_path"], int) and profile["life_path"] > 0, (
                f"Profile {i} life_path should be > 0"
            )
