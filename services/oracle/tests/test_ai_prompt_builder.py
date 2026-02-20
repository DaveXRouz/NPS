"""Tests for the AI prompt builder — verifies prompt generation from reading data."""

from oracle_service.ai_prompt_builder import (
    build_multi_user_prompt,
    build_reading_prompt,
)

# ──── build_reading_prompt ────────────────────────────────────────


def test_build_prompt_minimal():
    """Minimal reading with no sections still produces valid output."""
    result = build_reading_prompt({}, reading_type="daily")
    assert "READING TYPE: daily" in result
    assert "LOCALE: en" in result
    assert "not provided" in result


def test_build_prompt_includes_reading_type():
    result = build_reading_prompt({}, reading_type="time")
    assert "READING TYPE: time" in result


def test_build_prompt_includes_locale():
    result = build_reading_prompt({}, reading_type="daily", locale="fa")
    assert "LOCALE: fa" in result


def test_build_prompt_includes_question():
    result = build_reading_prompt({}, reading_type="question", question="Will I find success?")
    assert "QUESTION: Will I find success?" in result


def test_build_prompt_no_question_for_daily():
    result = build_reading_prompt({}, reading_type="daily", question="ignored")
    assert "QUESTION:" not in result


def test_build_prompt_with_person():
    reading = {
        "person": {
            "name": "Alice",
            "birthdate": "1990-01-15",
            "age_years": 36,
            "age_days": 13180,
        }
    }
    result = build_reading_prompt(reading)
    assert "Alice" in result
    assert "1990-01-15" in result
    assert "36 years" in result
    assert "13180 days" in result


def test_build_prompt_with_fc60_stamp():
    reading = {
        "fc60_stamp": {
            "fc60": "42",
            "j60": "7",
            "y60": "12",
            "chk": "A3",
            "iso": "2026-02-21",
        }
    }
    result = build_reading_prompt(reading)
    assert "FC60: 42" in result
    assert "J60: 7" in result
    assert "ISO: 2026-02-21" in result


def test_build_prompt_with_numerology():
    reading = {
        "numerology": {
            "life_path": {"number": 7, "title": "Seeker", "message": "Truth awaits"},
            "expression": 5,
            "soul_urge": 3,
            "personality": 2,
            "personal_year": 9,
            "personal_month": 4,
            "personal_day": 1,
        }
    }
    result = build_reading_prompt(reading)
    assert "Life Path: 7 (Seeker)" in result
    assert "Truth awaits" in result
    assert "Expression: 5" in result
    assert "Soul Urge: 3" in result
    assert "Personal Year: 9" in result


def test_build_prompt_with_numerology_simple_life_path():
    """Life path as plain number instead of dict."""
    reading = {"numerology": {"life_path": 11}}
    result = build_reading_prompt(reading)
    assert "Life Path: 11" in result


def test_build_prompt_with_moon():
    reading = {
        "moon": {
            "phase_name": "Waxing Crescent",
            "emoji": "🌒",
            "age": 3.5,
            "illumination": 15,
            "energy": "building",
            "best_for": "planning",
            "avoid": "major decisions",
        }
    }
    result = build_reading_prompt(reading)
    assert "Waxing Crescent" in result
    assert "15%" in result
    assert "planning" in result


def test_build_prompt_with_ganzhi():
    reading = {
        "ganzhi": {
            "year": {
                "traditional_name": "Bing Wu",
                "element": "Fire",
                "animal_name": "Horse",
            },
            "day": {
                "gz_token": "Jia Zi",
                "element": "Wood",
                "animal_name": "Rat",
            },
            "hour": {"animal_name": "Dragon"},
        }
    }
    result = build_reading_prompt(reading)
    assert "Fire" in result
    assert "Horse" in result
    assert "Dragon" in result


def test_build_prompt_with_heartbeat():
    reading = {
        "heartbeat": {
            "bpm": 72,
            "bpm_source": "user",
            "element": "Water",
            "total_lifetime_beats": 2_500_000_000,
            "rhythm_token": "WA-72",
        }
    }
    result = build_reading_prompt(reading)
    assert "BPM: 72" in result
    assert "Water" in result
    assert "WA-72" in result


def test_build_prompt_with_location():
    reading = {
        "location": {
            "latitude": 35.6895,
            "lat_hemisphere": "N",
            "longitude": 51.3890,
            "lon_hemisphere": "E",
            "element": "Earth",
        }
    }
    result = build_reading_prompt(reading)
    assert "35.6895" in result
    assert "51.389" in result
    assert "Earth" in result


def test_build_prompt_with_patterns():
    reading = {
        "patterns": {
            "count": 2,
            "detected": [
                {
                    "type": "mirror",
                    "strength": "high",
                    "message": "Mirror pattern found",
                },
                {
                    "type": "angel",
                    "strength": "very_high",
                    "message": "Angel number 111",
                },
            ],
        }
    }
    result = build_reading_prompt(reading)
    assert "Count: 2" in result
    # very_high sorts before high
    lines = result.split("\n")
    angel_idx = next(i for i, line in enumerate(lines) if "Angel" in line)
    mirror_idx = next(i for i, line in enumerate(lines) if "Mirror" in line)
    assert angel_idx < mirror_idx


def test_build_prompt_with_confidence():
    reading = {
        "confidence": {
            "score": 85,
            "level": "high",
            "factors": ["birth data", "heartbeat"],
        }
    }
    result = build_reading_prompt(reading)
    assert "85%" in result
    assert "high" in result


def test_build_prompt_with_synthesis():
    reading = {"synthesis": "All elements align toward transformation."}
    result = build_reading_prompt(reading)
    assert "FRAMEWORK SYNTHESIS" in result
    assert "All elements align toward transformation." in result


def test_build_prompt_full_reading():
    """Full reading with all sections produces non-trivial prompt."""
    reading = {
        "person": {"name": "Test", "birthdate": "2000-01-01"},
        "fc60_stamp": {"fc60": "1", "j60": "2", "y60": "3", "chk": "X"},
        "birth": {"jdn": 2451545, "weekday": "Saturday", "planet": "Saturn"},
        "current": {
            "date": "2026-02-21",
            "weekday": "Saturday",
            "planet": "Saturn",
            "domain": "Structure",
        },
        "numerology": {"life_path": 1, "expression": 2},
        "moon": {"phase_name": "Full Moon", "illumination": 100},
        "ganzhi": {
            "year": {
                "traditional_name": "Test",
                "element": "Fire",
                "animal_name": "Snake",
            }
        },
        "heartbeat": {"bpm": 60, "bpm_source": "default"},
        "location": {"latitude": 0, "longitude": 0, "element": "Water"},
        "patterns": {"count": 0, "detected": []},
        "confidence": {"score": 75, "level": "medium"},
        "synthesis": "Test synthesis.",
    }
    result = build_reading_prompt(reading, reading_type="time", locale="en")
    assert len(result) > 500  # non-trivial output
    assert "READING TYPE: time" in result
    assert "Test" in result
    assert "Saturn" in result


# ──── build_multi_user_prompt ─────────────────────────────────────


def test_build_multi_user_prompt_basic():
    readings = [
        {"person": {"name": "Alice"}},
        {"person": {"name": "Bob"}},
    ]
    result = build_multi_user_prompt(readings, ["Alice", "Bob"])
    assert "READING TYPE: multi" in result
    assert "USER COUNT: 2" in result
    assert "USER 1: Alice" in result
    assert "USER 2: Bob" in result
    assert "GROUP ANALYSIS" in result


def test_build_multi_user_prompt_respects_locale():
    readings = [{"person": {"name": "Test"}}]
    result = build_multi_user_prompt(readings, ["Test"], locale="fa")
    assert "LOCALE: fa" in result


def test_build_multi_user_prompt_single_user():
    readings = [{"person": {"name": "Solo"}}]
    result = build_multi_user_prompt(readings, ["Solo"])
    assert "USER COUNT: 1" in result
    assert "USER 1: Solo" in result
    assert "GROUP ANALYSIS" in result
