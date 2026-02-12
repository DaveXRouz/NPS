"""Tests for Session 24 translation API endpoints."""

import pytest


class TestTranslationModels:
    """Tests for new Pydantic models."""

    def test_reading_translation_request_valid(self):
        from app.models.translation import ReadingTranslationRequest

        req = ReadingTranslationRequest(
            text="Your Life Path is 7.",
            reading_type="personal",
            source_lang="en",
            target_lang="fa",
        )
        assert req.text == "Your Life Path is 7."
        assert req.reading_type == "personal"

    def test_reading_translation_request_empty_text(self):
        from app.models.translation import ReadingTranslationRequest

        with pytest.raises(ValueError):
            ReadingTranslationRequest(
                text="",
                reading_type="personal",
            )

    def test_reading_translation_request_invalid_lang(self):
        from app.models.translation import ReadingTranslationRequest

        with pytest.raises(ValueError):
            ReadingTranslationRequest(
                text="Hello",
                reading_type="personal",
                source_lang="de",
            )

    def test_batch_translation_request_valid(self):
        from app.models.translation import BatchTranslationRequest

        req = BatchTranslationRequest(
            texts=["Hello", "World"],
            source_lang="en",
            target_lang="fa",
        )
        assert len(req.texts) == 2

    def test_batch_translation_request_empty_texts(self):
        from app.models.translation import BatchTranslationRequest

        with pytest.raises(ValueError):
            BatchTranslationRequest(texts=[])

    def test_batch_translation_response_structure(self):
        from app.models.translation import (
            BatchTranslationResponse,
            TranslateResponse,
        )

        resp = BatchTranslationResponse(
            translations=[
                TranslateResponse(
                    source_text="Hello",
                    translated_text="سلام",
                    source_lang="en",
                    target_lang="fa",
                ),
            ]
        )
        assert len(resp.translations) == 1
        assert resp.translations[0].translated_text == "سلام"


class TestTranslationServiceWrapper:
    """Tests for the translation service wrapper methods."""

    def test_translate_reading_method_exists(self):
        from app.services.translation import TranslationService

        svc = TranslationService()
        assert hasattr(svc, "translate_reading")
        assert callable(svc.translate_reading)

    def test_batch_translate_method_exists(self):
        from app.services.translation import TranslationService

        svc = TranslationService()
        assert hasattr(svc, "batch_translate")
        assert callable(svc.batch_translate)

    def test_batch_translate_empty(self):
        from app.services.translation import TranslationService

        svc = TranslationService()
        result = svc.batch_translate([], "en", "fa")
        assert result == []
