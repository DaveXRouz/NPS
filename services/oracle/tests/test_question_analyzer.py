"""Tests for question_analyzer — script detection, letter value tables, and question hashing."""

from oracle_service.question_analyzer import (
    ABJAD_VALUES,
    digital_root,
    question_number,
    sum_letter_values,
)
from oracle_service.utils.script_detector import detect_script


class TestDetectScript:
    def test_detect_script_latin(self):
        assert detect_script("Hello world") == "latin"

    def test_detect_script_persian(self):
        result = detect_script("\u0633\u0644\u0627\u0645 \u062f\u0646\u06cc\u0627")
        assert result == "persian"

    def test_detect_script_mixed(self):
        result = detect_script("Hello \u0633\u0644\u0627\u0645")
        assert result == "mixed"

    def test_detect_script_empty(self):
        # Empty string defaults to "unknown" in script_detector
        assert detect_script("") in ("latin", "unknown")

    def test_detect_script_numbers_only(self):
        # Numbers-only defaults to "unknown" in script_detector
        assert detect_script("12345") in ("latin", "unknown")


class TestLetterSumValues:
    def test_pythagorean_letter_sum(self):
        # D=4, A=1, V=4, E=5 => 14
        result = sum_letter_values("DAVE", "pythagorean")
        assert result == 14

    def test_abjad_letter_sum(self):
        # \u0633=60, \u0644=30, \u0627=1, \u0645=40 => 131
        result = sum_letter_values("\u0633\u0644\u0627\u0645", "abjad")
        assert result == 131

    def test_auto_system_detection_latin(self):
        result = sum_letter_values("DAVE", "auto")
        # Auto should detect latin and use pythagorean
        assert result == 14

    def test_auto_system_detection_persian(self):
        result = sum_letter_values("\u0633\u0644\u0627\u0645", "auto")
        # Auto should detect persian and use abjad => 131
        assert result == 131

    def test_strip_non_letters(self):
        # Same as "HELLO WORLD" without spaces/punctuation
        result_clean = sum_letter_values("HELLOWORLD", "pythagorean")
        result_dirty = sum_letter_values("Hello! World?", "pythagorean")
        assert result_clean == result_dirty


class TestDigitalRoot:
    def test_basic_reduction(self):
        # 14 => 1+4 = 5
        assert digital_root(14) == 5

    def test_preserves_master_11(self):
        assert digital_root(11) == 11

    def test_preserves_master_22(self):
        assert digital_root(22) == 22

    def test_preserves_master_33(self):
        assert digital_root(33) == 33

    def test_single_digit_unchanged(self):
        assert digital_root(7) == 7


class TestQuestionNumber:
    def test_question_number_latin(self):
        result = question_number("Should I change?")
        assert isinstance(result, dict)
        assert result["detected_script"] == "latin"
        assert result["system_used"] == "pythagorean"
        assert 1 <= result["question_number"] <= 33

    def test_question_number_persian(self):
        result = question_number(
            "\u0622\u06cc\u0627 \u062a\u063a\u06cc\u06cc\u0631 \u06a9\u0646\u0645\u061f"
        )
        assert result["detected_script"] == "persian"
        assert result["system_used"] == "abjad"
        assert 1 <= result["question_number"] <= 33

    def test_question_number_includes_raw_sum(self):
        result = question_number("Hello")
        assert "raw_sum" in result
        assert result["raw_sum"] > 0

    def test_question_number_is_master_flag(self):
        result = question_number("Hello world")
        assert isinstance(result["is_master_number"], bool)


class TestAbjadPersianExtras:
    def test_pe_mapped(self):
        assert ABJAD_VALUES["\u067e"] == 2

    def test_che_mapped(self):
        assert ABJAD_VALUES["\u0686"] == 3

    def test_zhe_mapped(self):
        assert ABJAD_VALUES["\u0698"] == 7

    def test_gaf_mapped(self):
        assert ABJAD_VALUES["\u06af"] == 20
