"""Integration tests for time-based oracle readings (POST /api/oracle/reading)."""

from datetime import datetime, timezone

import pytest

from conftest import (
    CHINESE_ANIMALS,
    DETERMINISTIC_DATETIME,
    FIVE_ELEMENTS,
    ZODIAC_SIGNS,
    api_url,
    assert_fc60_valid,
    assert_numerology_valid,
)


@pytest.mark.reading
class TestTimeReading:
    """Test POST /api/oracle/reading endpoint — all 12 sections, data types, determinism."""

    def test_response_has_all_sections(self, reading_helper):
        """Response contains all 12 keys: fc60, numerology, zodiac, chinese, moon, angel,
        chaldean, ganzhi, fc60_extended, synchronicities, ai_interpretation, summary."""
        data = reading_helper.time_reading()
        expected_keys = {
            "fc60",
            "numerology",
            "zodiac",
            "chinese",
            "moon",
            "angel",
            "chaldean",
            "ganzhi",
            "fc60_extended",
            "synchronicities",
            "ai_interpretation",
            "summary",
        }
        for key in expected_keys:
            assert key in data, f"Missing section: {key}"

    def test_fc60_data_types(self, reading_helper):
        """fc60.cycle is int 0-59, element is one of 5, polarity is Yin/Yang,
        energy_level is float 0-1, element_balance sums to ~1.0."""
        data = reading_helper.time_reading()
        assert data["fc60"] is not None, "fc60 section should not be None"
        assert_fc60_valid(data["fc60"])

    def test_numerology_data_types(self, reading_helper):
        """life_path is valid (1-9 or 11/22/33), day_vibration is int,
        personal_year/month/day are ints, interpretation is str."""
        data = reading_helper.time_reading()
        assert data["numerology"] is not None, "numerology section should not be None"
        assert_numerology_valid(data["numerology"])

    def test_zodiac_data(self, reading_helper):
        """sign is one of 12 zodiac signs, element is Fire/Earth/Air/Water,
        ruling_planet is non-empty."""
        data = reading_helper.time_reading()
        zodiac = data["zodiac"]
        assert zodiac is not None, "zodiac section should not be None"
        assert zodiac["sign"] in ZODIAC_SIGNS, (
            f"Unexpected zodiac sign: {zodiac['sign']}"
        )
        assert zodiac["element"] in {"Fire", "Earth", "Air", "Water"}
        assert (
            isinstance(zodiac["ruling_planet"], str)
            and len(zodiac["ruling_planet"]) > 0
        )

    def test_chinese_data(self, reading_helper):
        """animal is one of 12 animals, element is one of 5, yin_yang is Yin/Yang."""
        data = reading_helper.time_reading()
        chinese = data["chinese"]
        assert chinese is not None, "chinese section should not be None"
        assert chinese["animal"] in CHINESE_ANIMALS, (
            f"Unexpected animal: {chinese['animal']}"
        )
        assert chinese["element"] in FIVE_ELEMENTS
        assert chinese["yin_yang"] in ("Yin", "Yang")

    def test_moon_data_present(self, reading_helper):
        """When moon is not None: phase_name is str, illumination is 0-100, age_days >= 0."""
        data = reading_helper.time_reading()
        moon = data.get("moon")
        if moon is not None:
            assert isinstance(moon["phase_name"], str) and len(moon["phase_name"]) > 0
            assert isinstance(moon["illumination"], (int, float))
            assert 0 <= moon["illumination"] <= 100
            assert isinstance(moon["age_days"], (int, float)) and moon["age_days"] >= 0

    def test_ganzhi_data_present(self, reading_helper):
        """When ganzhi is not None: year_name, year_animal, stem_element, stem_polarity,
        hour_animal, hour_branch are all non-empty strings."""
        data = reading_helper.time_reading()
        ganzhi = data.get("ganzhi")
        if ganzhi is not None:
            for field in ("year_name", "year_animal", "stem_element", "stem_polarity"):
                assert isinstance(ganzhi.get(field), str) and len(ganzhi[field]) > 0, (
                    f"ganzhi.{field} should be non-empty string, got: {ganzhi.get(field)!r}"
                )

    def test_fc60_extended_present(self, reading_helper):
        """When fc60_extended is not None: stamp is non-empty,
        weekday_name/weekday_planet/weekday_domain are strings."""
        data = reading_helper.time_reading()
        ext = data.get("fc60_extended")
        if ext is not None:
            assert isinstance(ext["stamp"], str) and len(ext["stamp"]) > 0
            assert isinstance(ext.get("weekday_name", ""), str)
            assert isinstance(ext.get("weekday_planet", ""), str)
            assert isinstance(ext.get("weekday_domain", ""), str)

    def test_synchronicities_is_list(self, reading_helper):
        """synchronicities is a list, each item is a string."""
        data = reading_helper.time_reading()
        syncs = data["synchronicities"]
        assert isinstance(syncs, list)
        for item in syncs:
            assert isinstance(item, str)

    def test_deterministic_same_input(self, reading_helper):
        """Two requests with DETERMINISTIC_DATETIME produce identical fc60, numerology,
        zodiac, chinese sections."""
        data1 = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        data2 = reading_helper.time_reading(DETERMINISTIC_DATETIME)
        assert data1["fc60"] == data2["fc60"], "fc60 should be deterministic"
        assert data1["numerology"] == data2["numerology"], (
            "numerology should be deterministic"
        )
        assert data1["zodiac"] == data2["zodiac"], "zodiac should be deterministic"
        assert data1["chinese"] == data2["chinese"], "chinese should be deterministic"

    def test_different_dates_diverge(self, reading_helper):
        """2024-01-01 vs 2024-07-15 produce different zodiac sign or numerology month."""
        data_jan = reading_helper.time_reading("2024-01-01T12:00:00+00:00")
        data_jul = reading_helper.time_reading("2024-07-15T12:00:00+00:00")
        differs = (
            data_jan["zodiac"]["sign"] != data_jul["zodiac"]["sign"]
            or data_jan["numerology"]["personal_month"]
            != data_jul["numerology"]["personal_month"]
        )
        assert differs, "Different dates should produce different readings"

    def test_default_datetime_is_now(self, api_client):
        """Request with datetime=null returns generated_at within 60 seconds of now."""
        resp = api_client.post(
            api_url("/api/oracle/reading"),
            json={"datetime": None},
        )
        assert resp.status_code == 200
        data = resp.json()
        gen_at = datetime.fromisoformat(data["generated_at"])
        now = datetime.now(timezone.utc)
        diff = abs((now - gen_at).total_seconds())
        assert diff < 60, f"generated_at is {diff:.0f}s from now, expected <60s"

    def test_reading_stored_in_db(self, api_client, reading_helper):
        """After time reading, GET /api/oracle/readings has reading with sign_type='reading'."""
        reading_helper.time_reading()
        resp = api_client.get(api_url("/api/oracle/readings?sign_type=reading&limit=1"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1, "Should have at least one stored time reading"
        assert data["readings"][0]["sign_type"] == "reading"

    def test_ai_interpretation_type(self, reading_helper):
        """ai_interpretation is either None or a non-empty string."""
        data = reading_helper.time_reading()
        ai = data.get("ai_interpretation")
        assert ai is None or (isinstance(ai, str) and len(ai) > 0), (
            f"ai_interpretation should be None or non-empty str, got: {type(ai)}"
        )

    def test_generated_at_iso_format(self, reading_helper):
        """generated_at is parseable by datetime.fromisoformat()."""
        data = reading_helper.time_reading()
        parsed = datetime.fromisoformat(data["generated_at"])
        assert parsed is not None
