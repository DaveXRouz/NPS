"""Translation endpoints — translate, detect, batch, reading-specific, cache stats."""

import logging

from fastapi import APIRouter, Depends, Query

from app.middleware.auth import require_scope
from app.models.translation import (
    BatchTranslationRequest,
    BatchTranslationResponse,
    CacheStatsResponse,
    DetectResponse,
    ReadingTranslationRequest,
    TranslateRequest,
    TranslateResponse,
)
from app.services.translation import TranslationService

logger = logging.getLogger(__name__)

router = APIRouter()

_svc = TranslationService()


@router.post(
    "/translate",
    response_model=TranslateResponse,
    dependencies=[Depends(require_scope("oracle:write"))],
)
def translate_text(body: TranslateRequest):
    """Translate text between English and Persian."""
    result = _svc.translate(body.text, body.source_lang, body.target_lang)
    return TranslateResponse(**result)


@router.post(
    "/reading",
    response_model=TranslateResponse,
    dependencies=[Depends(require_scope("oracle:write"))],
)
def translate_reading(body: ReadingTranslationRequest):
    """Translate a reading with type-specific context."""
    result = _svc.translate_reading(
        body.text, body.reading_type, body.source_lang, body.target_lang
    )
    return TranslateResponse(**result)


@router.post(
    "/batch",
    response_model=BatchTranslationResponse,
    dependencies=[Depends(require_scope("oracle:write"))],
)
def batch_translate(body: BatchTranslationRequest):
    """Translate multiple strings in one request."""
    results = _svc.batch_translate(body.texts, body.source_lang, body.target_lang)
    return BatchTranslationResponse(translations=[TranslateResponse(**r) for r in results])


@router.get(
    "/detect",
    response_model=DetectResponse,
    dependencies=[Depends(require_scope("oracle:read"))],
)
def detect_language(text: str = Query(..., min_length=1)):
    """Detect whether text is primarily English or Persian."""
    result = _svc.detect_language(text)
    return DetectResponse(**result)


@router.get(
    "/cache/stats",
    response_model=CacheStatsResponse,
    dependencies=[Depends(require_scope("oracle:admin"))],
)
def get_cache_stats():
    """Get translation cache statistics (admin only)."""
    stats = _svc.get_cache_stats()
    return CacheStatsResponse(**stats)
