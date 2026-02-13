"""Tests for the i18n translation system."""

import pytest

from services.tgbot.i18n import load_translations, t, to_persian_numerals


@pytest.fixture(autouse=True)
def _load_translations():
    """Ensure translations are loaded before each test."""
    load_translations()


def test_load_en_translations():
    """English translations load and contain expected keys."""
    text = t("welcome", "en")
    assert "NPS Oracle Bot" in text


def test_load_fa_translations():
    """Persian translations load and contain expected keys."""
    text = t("welcome", "fa")
    assert "NPS" in text
    # Should contain Persian characters
    assert any("\u0600" <= c <= "\u06ff" for c in text)


def test_variable_interpolation():
    """Variables in {braces} are replaced with kwargs."""
    text = t("link_success", "en", name="Alice")
    assert "Alice" in text
    assert "{name}" not in text


def test_persian_numeral_conversion():
    """to_persian_numerals converts 0-9 to Persian digits."""
    result = to_persian_numerals("Test 12345")
    assert "\u06f1\u06f2\u06f3\u06f4\u06f5" in result
    assert "Test" in result


def test_persian_locale_auto_converts_numerals():
    """Persian locale automatically converts numerals in interpolated text."""
    text = t("compare_too_many", "fa", count=7)
    assert "\u06f7" in text  # ۷
    assert "7" not in text


def test_fallback_to_english():
    """Unknown locale falls back to English."""
    text = t("welcome", "xx")
    assert "NPS Oracle Bot" in text


def test_missing_key_returns_key():
    """Missing key returns the key itself as fallback."""
    text = t("nonexistent_key_xyz", "en")
    assert text == "nonexistent_key_xyz"
