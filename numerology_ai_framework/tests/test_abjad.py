"""Tests for Abjad numerology system integration.

Covers: abjad_table.py values, NumerologyEngine Abjad methods,
complete_profile with Abjad, and regression checks for existing systems.
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from personal.abjad_table import get_abjad_value, name_to_abjad_sum
from personal.numerology_engine import NumerologyEngine


class TestAbjadTable(unittest.TestCase):
    """Test Abjad letter-to-number mapping."""

    def test_abjad_alef_value(self):
        """alef = 1."""
        self.assertEqual(get_abjad_value("\u0627"), 1)

    def test_abjad_persian_pe(self):
        """Persian pe = 2."""
        self.assertEqual(get_abjad_value("\u067e"), 2)

    def test_abjad_ali_sum(self):
        """علی = ain(70) + lam(30) + ya(10) = 110."""
        self.assertEqual(name_to_abjad_sum("\u0639\u0644\u06cc"), 110)

    def test_abjad_hamzeh_sum(self):
        """حمزه = ha(8) + mim(40) + za(7) + ha(5) = 60."""
        self.assertEqual(name_to_abjad_sum("\u062d\u0645\u0632\u0647"), 60)

    def test_abjad_alef_madda(self):
        """آ (alef madda) = 1."""
        self.assertEqual(get_abjad_value("\u0622"), 1)

    def test_abjad_ignored_diacritics(self):
        """Diacritics return 0."""
        self.assertEqual(get_abjad_value("\u064e"), 0)  # fatha
        self.assertEqual(get_abjad_value("\u0651"), 0)  # shadda

    def test_abjad_latin_char_returns_zero(self):
        """Latin characters return 0."""
        self.assertEqual(get_abjad_value("A"), 0)
        self.assertEqual(get_abjad_value("z"), 0)


class TestAbjadExpression(unittest.TestCase):
    """Test NumerologyEngine.expression_number with Abjad system."""

    def test_abjad_expression_ali(self):
        """expression_number("علی", "abjad") = digital_root(110) = 2."""
        result = NumerologyEngine.expression_number("\u0639\u0644\u06cc", "abjad")
        self.assertEqual(result, 2)

    def test_abjad_expression_hamzeh(self):
        """expression_number("حمزه", "abjad") = digital_root(60) = 6."""
        result = NumerologyEngine.expression_number("\u062d\u0645\u0632\u0647", "abjad")
        self.assertEqual(result, 6)

    def test_abjad_does_not_break_latin(self):
        """English name with 'abjad' system returns 0 (no Abjad chars)."""
        result = NumerologyEngine.expression_number("Alice", "abjad")
        self.assertEqual(result, 0)


class TestAbjadSoulUrge(unittest.TestCase):
    """Test soul_urge with Abjad system."""

    def test_abjad_soul_urge(self):
        """علی: vowel letters are alef(1) + ya(10) = 11 (master number)."""
        result = NumerologyEngine.soul_urge("\u0639\u0644\u06cc", "abjad")
        # alef(ا=1) is a vowel, ya(ی=10) is a vowel → sum=11 (master)
        # But علی has: ع(ain, not vowel), ل(lam, not vowel), ی(ya, vowel=10)
        # Only ya is a vowel letter → sum=10 → digital_root=1
        self.assertEqual(result, 1)


class TestAbjadPersonality(unittest.TestCase):
    """Test personality_number with Abjad system."""

    def test_abjad_personality(self):
        """علی: non-vowel letters are ain(70) + lam(30) = 100 → 1."""
        result = NumerologyEngine.personality_number("\u0639\u0644\u06cc", "abjad")
        self.assertEqual(result, 1)


class TestAbjadCompleteProfile(unittest.TestCase):
    """Test complete_profile with Abjad system."""

    def test_abjad_complete_profile(self):
        """complete_profile with system='abjad' returns full dict."""
        profile = NumerologyEngine.complete_profile(
            "\u0639\u0644\u06cc", 1, 1, 2000, 2026, 2, 10, system="abjad"
        )
        self.assertIn("life_path", profile)
        self.assertIn("expression", profile)
        self.assertIn("soul_urge", profile)
        self.assertIn("personality", profile)
        self.assertIn("personal_year", profile)
        # Life Path is system-independent
        self.assertGreater(profile["life_path"]["number"], 0)
        # Expression should be non-zero for Persian name with Abjad
        self.assertGreater(profile["expression"], 0)


class TestRegressionPythagorean(unittest.TestCase):
    """Ensure existing Pythagorean calculations are unchanged."""

    def test_pythagorean_unchanged(self):
        """DAVE expression still works with pythagorean."""
        result = NumerologyEngine.expression_number("DAVE", "pythagorean")
        # D=4, A=1, V=4, E=5 → 14 → 5
        self.assertEqual(result, 5)


class TestRegressionChaldean(unittest.TestCase):
    """Ensure existing Chaldean calculations are unchanged."""

    def test_chaldean_unchanged(self):
        """Chaldean letter values are intact."""
        result = NumerologyEngine.expression_number("DAVE", "chaldean")
        # D=4, A=1, V=6, E=5 → 16 → 7
        self.assertEqual(result, 7)


if __name__ == "__main__":
    unittest.main()
