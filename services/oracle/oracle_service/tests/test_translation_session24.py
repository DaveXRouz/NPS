"""Tests for Session 24 — reading-type-specific translation."""

import importlib
import sys
from pathlib import Path

# Add oracle_service root AND project root so both engines.* and oracle_service.* resolve
_oracle_svc = str(Path(__file__).resolve().parents[1])
_oracle_root = str(Path(__file__).resolve().parents[2])
for _p in (_oracle_svc, _oracle_root):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Import translation_service directly (bypass engines/__init__.py which has heavy deps)
_mod = importlib.import_module("engines.translation_service")
batch_translate = _mod.batch_translate
detect_language = _mod.detect_language
translate_reading = _mod.translate_reading
READING_TYPE_CONTEXTS = _mod.READING_TYPE_CONTEXTS


class TestTranslateReading:
    """Tests for reading-type-specific translation."""

    def test_reading_type_contexts_defined(self):
        """All expected reading types have context strings."""
        expected = ["personal", "compatibility", "daily", "name_analysis", "question"]
        for rt in expected:
            assert rt in READING_TYPE_CONTEXTS, f"Missing context for {rt}"

    def test_translate_reading_empty_text(self):
        """Empty text returns empty result."""
        result = translate_reading("", "personal", "en", "fa")
        assert result.translated_text == ""
        assert not result.ai_generated

    def test_translate_reading_returns_result(self):
        """translate_reading returns a TranslationResult with correct fields."""
        result = translate_reading("Your Life Path is 7.", "personal", "en", "fa")
        assert result.source_text == "Your Life Path is 7."
        assert result.source_lang == "en"
        assert result.target_lang == "fa"
        assert result.translated_text is not None
        assert len(result.translated_text) > 0

    def test_translate_reading_unknown_type_fallback(self):
        """Unknown reading type should still translate successfully."""
        result = translate_reading("Your number is 5.", "unknown_type", "en", "fa")
        assert result.translated_text is not None
        assert len(result.translated_text) > 0


class TestDetectLanguage:
    """Tests for language detection."""

    def test_detect_persian(self):
        """Persian text detected correctly."""
        assert detect_language("\u0633\u0644\u0627\u0645 \u062e\u0648\u0628\u06cc") == "fa"

    def test_detect_english(self):
        """English text detected correctly."""
        assert detect_language("Hello world") == "en"

    def test_detect_mixed(self):
        """Mixed text returns a valid language."""
        result = detect_language("Hello \u0633\u0644\u0627\u0645")
        assert result in ("en", "fa")

    def test_detect_empty(self):
        """Empty text defaults to English."""
        assert detect_language("") == "en"


class TestBatchTranslate:
    """Tests for batch translation."""

    def test_batch_returns_correct_count(self):
        """Batch translate returns same number of results as inputs."""
        texts = ["Hello", "World", "Test"]
        results = batch_translate(texts, "en", "fa")
        assert len(results) == 3

    def test_batch_empty_list(self):
        """Empty batch returns empty list."""
        results = batch_translate([], "en", "fa")
        assert results == []

    def test_batch_results_have_correct_fields(self):
        """Each batch result has expected fields."""
        texts = ["Hello"]
        results = batch_translate(texts, "en", "fa")
        assert len(results) == 1
        r = results[0]
        assert r.source_text == "Hello"
        assert r.source_lang == "en"
        assert r.target_lang == "fa"
