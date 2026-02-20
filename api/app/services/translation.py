"""Translation service wrapper — API-level cache over T3-S3 translation engine."""

import hashlib
import logging
import sys
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ─── Engine imports via sys.path shim ────────────────────────────────────────

_ORACLE_PARENT_DIR = str(Path(__file__).resolve().parents[3] / "services" / "oracle")
_ORACLE_SERVICE_DIR = str(
    Path(__file__).resolve().parents[3] / "services" / "oracle" / "oracle_service"
)
if _ORACLE_PARENT_DIR not in sys.path:
    sys.path.insert(0, _ORACLE_PARENT_DIR)
if _ORACLE_SERVICE_DIR not in sys.path:
    sys.path.insert(0, _ORACLE_SERVICE_DIR)

_TRANSLATION_AVAILABLE = False
try:
    from engines.translation_service import (  # noqa: E402
        batch_translate as _batch_translate,
        detect_language as _detect,
        translate as _translate,
        translate_reading as _translate_reading,
    )

    _TRANSLATION_AVAILABLE = True
except ImportError as _err:
    logger.warning("Translation engines not available (%s) — passthrough mode", _err)

    class _FallbackResult:
        """Result using Anthropic API fallback when oracle translation engines unavailable."""

        def __init__(self, text: str, source_lang: str, target_lang: str):
            self._source_text = text
            self._source = source_lang
            self._target = target_lang
            self._translated = text
            self._ai_generated = False

            # Attempt Anthropic API translation
            try:
                self._translated, self._ai_generated = _anthropic_translate(
                    text, source_lang, target_lang
                )
            except Exception:
                logger.debug("Anthropic translation fallback unavailable, using passthrough")

        def to_dict(self) -> dict:
            return {
                "source_text": self._source_text,
                "translated_text": self._translated,
                "source_lang": self._source,
                "target_lang": self._target,
                "preserved_terms": [],
                "ai_generated": self._ai_generated,
            }

    def _anthropic_translate(text: str, source_lang: str, target_lang: str) -> tuple[str, bool]:
        """Use Anthropic API for EN↔FA translation as fallback."""
        import os

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key or not text.strip():
            return text, False

        import httpx

        lang_names = {"en": "English", "fa": "Persian (Farsi)"}
        src_name = lang_names.get(source_lang, source_lang)
        tgt_name = lang_names.get(target_lang, target_lang)

        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1024,
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            f"Translate the following text from {src_name} to {tgt_name}. "
                            f"Return ONLY the translation, nothing else.\n\n{text}"
                        ),
                    }
                ],
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        translated = data["content"][0]["text"].strip()
        return translated, True

    def _translate(text: str, source_lang: str = "en", target_lang: str = "fa"):  # type: ignore[misc]
        return _FallbackResult(text, source_lang, target_lang)

    def _translate_reading(
        text: str, reading_type: str, source_lang: str = "en", target_lang: str = "fa"
    ):  # type: ignore[misc]
        return _FallbackResult(text, source_lang, target_lang)

    def _batch_translate(texts: list, source_lang: str = "en", target_lang: str = "fa"):  # type: ignore[misc]
        return [_FallbackResult(t, source_lang, target_lang) for t in texts]

    def _detect(text: str) -> str:  # type: ignore[misc]
        # Simple heuristic: check for Persian/Arabic Unicode range
        persian_count = sum(
            1 for c in text if "\u0600" <= c <= "\u06ff" or "\ufb50" <= c <= "\ufdff"
        )
        return "fa" if persian_count > len(text) * 0.3 else "en"


# ─── Module-level cache ─────────────────────────────────────────────────────

_MAX_CACHE_ENTRIES = 1000
_CACHE_TTL_SECONDS = 86400  # 24 hours

_cache: dict[str, dict[str, Any]] = {}
_cache_hits = 0
_cache_misses = 0


def _cache_key(text: str, source_lang: str, target_lang: str) -> str:
    raw = f"{source_lang}:{target_lang}:{text}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _evict_expired() -> None:
    """Remove expired entries."""
    now = time.monotonic()
    expired = [k for k, v in _cache.items() if now - v["ts"] > _CACHE_TTL_SECONDS]
    for k in expired:
        del _cache[k]


def _evict_lru() -> None:
    """Evict oldest entries if over capacity."""
    while len(_cache) >= _MAX_CACHE_ENTRIES:
        oldest_key = min(_cache, key=lambda k: _cache[k]["ts"])
        del _cache[oldest_key]


def reset_cache() -> None:
    """Clear all cached translations and reset counters."""
    global _cache_hits, _cache_misses
    _cache.clear()
    _cache_hits = 0
    _cache_misses = 0


# ─── Translation Service ────────────────────────────────────────────────────


class TranslationService:
    """Wraps T3-S3 translation with API-level LRU caching."""

    def translate(self, text: str, source_lang: str = "en", target_lang: str = "fa") -> dict:
        """Translate text between English and Persian.

        Returns dict with keys: source_text, translated_text, source_lang,
        target_lang, preserved_terms, ai_generated, elapsed_ms, cached.
        """
        global _cache_hits, _cache_misses

        # Same-language short-circuit
        if source_lang == target_lang:
            return {
                "source_text": text,
                "translated_text": text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "preserved_terms": [],
                "ai_generated": False,
                "elapsed_ms": 0.0,
                "cached": False,
            }

        key = _cache_key(text, source_lang, target_lang)

        # Check cache
        _evict_expired()
        if key in _cache:
            _cache_hits += 1
            entry = _cache[key]
            entry["ts"] = time.monotonic()  # refresh access time
            return {**entry["result"], "cached": True}

        _cache_misses += 1

        # Call T3-S3 engine
        start = time.monotonic()
        result = _translate(text, source_lang=source_lang, target_lang=target_lang)
        elapsed_ms = (time.monotonic() - start) * 1000

        result_dict = result.to_dict()
        result_dict["elapsed_ms"] = round(elapsed_ms, 1)
        result_dict["cached"] = False

        # Cache result
        _evict_lru()
        _cache[key] = {"result": result_dict, "ts": time.monotonic()}

        return result_dict

    def detect_language(self, text: str) -> dict:
        """Detect whether text is primarily English or Persian.

        Returns dict with keys: text, detected_lang, confidence.
        """
        lang = _detect(text)
        # Simple confidence: if text has clear character markers, high confidence
        if not text or not text.strip():
            return {"text": text, "detected_lang": "en", "confidence": 0.5}
        return {"text": text, "detected_lang": lang, "confidence": 0.9}

    def translate_reading(
        self,
        text: str,
        reading_type: str,
        source_lang: str = "en",
        target_lang: str = "fa",
    ) -> dict:
        """Translate a reading with reading-type-specific context.

        Returns dict with keys: source_text, translated_text, source_lang,
        target_lang, preserved_terms, ai_generated, elapsed_ms, cached.
        """
        global _cache_hits, _cache_misses

        key = _cache_key(f"{reading_type}:{text}", source_lang, target_lang)

        _evict_expired()
        if key in _cache:
            _cache_hits += 1
            entry = _cache[key]
            entry["ts"] = time.monotonic()
            return {**entry["result"], "cached": True}

        _cache_misses += 1

        start = time.monotonic()
        result = _translate_reading(text, reading_type, source_lang, target_lang)
        elapsed_ms = (time.monotonic() - start) * 1000

        result_dict = result.to_dict()
        result_dict["elapsed_ms"] = round(elapsed_ms, 1)
        result_dict["cached"] = False

        _evict_lru()
        _cache[key] = {"result": result_dict, "ts": time.monotonic()}

        return result_dict

    def batch_translate(
        self,
        texts: list[str],
        source_lang: str = "en",
        target_lang: str = "fa",
    ) -> list[dict]:
        """Translate multiple texts at once.

        Returns list of dicts with translation results.
        """
        if not texts:
            return []

        results = _batch_translate(texts, source_lang, target_lang)
        return [{**r.to_dict(), "cached": False} for r in results]

    def get_cache_stats(self) -> dict:
        """Return cache statistics."""
        _evict_expired()
        return {
            "total_entries": len(_cache),
            "max_entries": _MAX_CACHE_ENTRIES,
            "hit_count": _cache_hits,
            "miss_count": _cache_misses,
            "ttl_seconds": _CACHE_TTL_SECONDS,
        }
