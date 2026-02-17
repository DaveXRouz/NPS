"""Tests for FC60 stamp validation and display formatting (Session 10)."""

import sys
from pathlib import Path

# Ensure framework and oracle service are importable
project_root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "services" / "oracle"))

from oracle_service.framework_bridge import (  # noqa: E402
    _describe_token,
    format_stamp_for_display,
    validate_fc60_stamp,
)
from numerology_ai_framework.core.fc60_stamp_engine import FC60StampEngine  # noqa: E402


class TestDescribeToken:
    """Tests for _describe_token helper."""

    def test_known_values_rawu(self):
        """RAWU → Rat + Wood (value 0)."""
        result = _describe_token("RAWU")
        assert result["token"] == "RAWU"
        assert result["value"] == 0
        assert result["animal_name"] == "Rat"
        assert result["element_name"] == "Wood"

    def test_known_values_snfi(self):
        """SNFI → Snake + Fire (value 26)."""
        result = _describe_token("SNFI")
        assert result["token"] == "SNFI"
        assert result["value"] == 26
        assert result["animal_name"] == "Snake"
        assert result["element_name"] == "Fire"

    def test_known_values_piwa(self):
        """PIWA → Pig + Water (value 59)."""
        result = _describe_token("PIWA")
        assert result["token"] == "PIWA"
        assert result["value"] == 59
        assert result["animal_name"] == "Pig"
        assert result["element_name"] == "Water"


class TestValidateFC60Stamp:
    """Tests for validate_fc60_stamp function."""

    def test_validate_valid_stamp_tv1(self):
        """TV1: VE-OX-OXFI ☀OX-RUWU-RAWU returns valid=True."""
        result = validate_fc60_stamp("VE-OX-OXFI ☀OX-RUWU-RAWU")
        assert result["valid"] is True
        assert result["stamp"] == "VE-OX-OXFI ☀OX-RUWU-RAWU"
        assert result["decoded"] is not None
        assert result["error"] is None
        assert result["decoded"]["weekday_token"] == "VE"
        assert result["decoded"]["month"] == 2
        assert result["decoded"]["day"] == 6

    def test_validate_valid_stamp_tv2(self):
        """TV2: SA-RA-RAFI ☀RA-RAWU-RAWU returns valid=True."""
        result = validate_fc60_stamp("SA-RA-RAFI ☀RA-RAWU-RAWU")
        assert result["valid"] is True
        assert result["decoded"]["weekday_token"] == "SA"
        assert result["decoded"]["month"] == 1  # January = RA = index 0 + 1

    def test_validate_stamp_empty_string(self):
        """Empty string returns valid=False."""
        result = validate_fc60_stamp("")
        assert result["valid"] is False
        assert result["error"] == "Empty stamp"

    def test_validate_stamp_none(self):
        """None returns valid=False."""
        result = validate_fc60_stamp(None)
        assert result["valid"] is False

    def test_validate_stamp_random_text(self):
        """Non-FC60 text returns valid=False with descriptive error."""
        result = validate_fc60_stamp("hello world this is not a stamp")
        assert result["valid"] is False
        assert result["error"] is not None

    def test_validate_stamp_date_only(self):
        """Date-only stamp (no time part) validates correctly."""
        # Generate a date-only stamp
        encoded = FC60StampEngine.encode(1999, 4, 22, has_time=False)
        stamp_str = encoded["fc60"]  # "JO-RU-DRER"
        result = validate_fc60_stamp(stamp_str)
        assert result["valid"] is True
        assert result["decoded"]["weekday_token"] == "JO"
        assert result["decoded"]["month"] == 4  # April = RU
        # Time parts should be absent
        assert "hour" not in result["decoded"] or result["decoded"].get("hour") is None

    def test_validate_stamp_with_test_vectors(self):
        """Framework test vectors validate correctly through bridge."""
        test_stamps = [
            "VE-OX-OXFI ☀OX-RUWU-RAWU",  # TV1
            "SA-RA-RAFI ☀RA-RAWU-RAWU",  # TV2
            "JO-RA-RAFI ☀RA-RAWU-RAWU",  # TV7
        ]
        for stamp_str in test_stamps:
            result = validate_fc60_stamp(stamp_str)
            assert result["valid"] is True, f"Expected valid for: {stamp_str}"

    def test_validate_stamp_with_moon(self):
        """Stamp with 🌙 PM marker validates correctly."""
        result = validate_fc60_stamp("JO-OX-SNWA 🌙RA-RAWU-RAWU")
        assert result["valid"] is True
        assert result["decoded"]["half"] == "PM"

    def test_month_encoding_january_is_ra(self):
        """Month 1 (January) encodes to animal RA (index 0), not OX."""
        encoded = FC60StampEngine.encode(2026, 1, 1, 0, 0, 0, 0, 0)
        decoded = validate_fc60_stamp(encoded["fc60"])
        assert decoded["valid"] is True
        assert decoded["decoded"]["month_token"] == "RA"
        assert decoded["decoded"]["month"] == 1


class TestFormatStampForDisplay:
    """Tests for format_stamp_for_display function."""

    def test_format_full_reading(self):
        """Full reading produces display-ready stamp data with all segments."""
        reading = FC60StampEngine.encode(2026, 2, 6, 1, 15, 0, 8, 0)
        display = format_stamp_for_display(reading)

        assert display["fc60"] == "VE-OX-OXFI ☀OX-RUWU-RAWU"
        assert display["j60"] != ""
        assert display["y60"] != ""
        assert display["chk"] != ""
        assert display["weekday"]["token"] == "VE"
        assert display["weekday"]["name"] == "Friday"
        assert display["month"]["token"] == "OX"
        assert display["month"]["index"] == 2
        assert display["time"] is not None
        assert display["time"]["half"] == "☀"
        assert display["time"]["half_type"] == "day"

    def test_format_annotates_tokens(self):
        """Each token in display data includes animal_name and element_name."""
        reading = FC60StampEngine.encode(2026, 2, 6, 1, 15, 0, 8, 0)
        display = format_stamp_for_display(reading)

        # DOM token should have animal and element names
        assert "animal_name" in display["dom"]
        assert "element_name" in display["dom"]
        assert display["dom"]["animal_name"] == "Ox"
        assert display["dom"]["element_name"] == "Fire"

        # Time tokens should have names
        assert display["time"]["minute"]["animal_name"] == "Rabbit"
        assert display["time"]["minute"]["element_name"] == "Wood"

    def test_format_date_only(self):
        """Date-only stamp has null time."""
        reading = FC60StampEngine.encode(1999, 4, 22, has_time=False)
        display = format_stamp_for_display(reading)

        assert display["fc60"] == "JO-RU-DRER"
        assert display["time"] is None
        assert display["weekday"]["token"] == "JO"
