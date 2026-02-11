"""Tests for numerology system selection — script detection and auto-selection."""

import sys
import os
import unittest

# Ensure project root is on path for framework imports
sys.path.insert(
    0,
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
)
sys.path.insert(
    0,
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
)

from oracle_service.utils.script_detector import (
    contains_persian,
    contains_latin,
    detect_script,
    auto_select_system,
)
from oracle_service.framework_bridge import resolve_numerology_system
from oracle_service.models.reading_types import UserProfile


class TestDetectScript(unittest.TestCase):
    """Test script detection utility."""

    def test_detect_script_persian(self):
        self.assertEqual(detect_script("\u0639\u0644\u06cc"), "persian")

    def test_detect_script_latin(self):
        self.assertEqual(detect_script("Alice"), "latin")

    def test_detect_script_mixed(self):
        self.assertEqual(detect_script("\u0639\u0644\u06cc Alice"), "mixed")

    def test_detect_script_unknown(self):
        self.assertEqual(detect_script("123"), "unknown")


class TestContainsPersian(unittest.TestCase):
    """Test Persian character detection."""

    def test_contains_persian_true(self):
        self.assertTrue(contains_persian("\u0633\u0644\u0627\u0645"))

    def test_contains_persian_false(self):
        self.assertFalse(contains_persian("Hello"))

    def test_contains_latin_true(self):
        self.assertTrue(contains_latin("Hello"))

    def test_contains_latin_false(self):
        self.assertFalse(contains_latin("\u0633\u0644\u0627\u0645"))


class TestAutoSelectSystem(unittest.TestCase):
    """Test auto_select_system logic."""

    def test_auto_select_persian_name(self):
        self.assertEqual(auto_select_system("\u0639\u0644\u06cc"), "abjad")

    def test_auto_select_english_name(self):
        self.assertEqual(auto_select_system("Alice"), "pythagorean")

    def test_auto_select_fa_locale(self):
        self.assertEqual(auto_select_system("Alice", locale="fa"), "abjad")

    def test_auto_select_manual_override(self):
        self.assertEqual(
            auto_select_system("\u0639\u0644\u06cc", user_preference="chaldean"),
            "chaldean",
        )

    def test_auto_select_digits_only(self):
        self.assertEqual(auto_select_system("12345"), "pythagorean")


class TestResolveNumerologySystem(unittest.TestCase):
    """Test framework bridge resolve_numerology_system."""

    def test_resolve_auto_persian_name(self):
        user = UserProfile(
            user_id=1,
            full_name="\u062d\u0645\u0632\u0647",
            birth_day=1,
            birth_month=1,
            birth_year=2000,
            numerology_system="auto",
        )
        self.assertEqual(resolve_numerology_system(user), "abjad")

    def test_resolve_auto_english_name(self):
        user = UserProfile(
            user_id=1,
            full_name="Alice",
            birth_day=1,
            birth_month=1,
            birth_year=2000,
            numerology_system="auto",
        )
        self.assertEqual(resolve_numerology_system(user), "pythagorean")

    def test_resolve_explicit_chaldean(self):
        user = UserProfile(
            user_id=1,
            full_name="\u062d\u0645\u0632\u0647",
            birth_day=1,
            birth_month=1,
            birth_year=2000,
            numerology_system="chaldean",
        )
        self.assertEqual(resolve_numerology_system(user), "chaldean")

    def test_resolve_with_fa_locale(self):
        user = UserProfile(
            user_id=1,
            full_name="Alice",
            birth_day=1,
            birth_month=1,
            birth_year=2000,
            numerology_system="auto",
        )
        self.assertEqual(resolve_numerology_system(user, locale="fa"), "abjad")


if __name__ == "__main__":
    unittest.main()
