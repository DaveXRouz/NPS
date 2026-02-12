"""Translation request/response models."""

from pydantic import BaseModel, field_validator


class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "en"
    target_lang: str = "fa"

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("text must not be empty")
        if len(v) > 10000:
            raise ValueError("text must not exceed 10000 characters")
        return v

    @field_validator("source_lang", "target_lang")
    @classmethod
    def valid_lang(cls, v):
        if v not in ("en", "fa"):
            raise ValueError("language must be 'en' or 'fa'")
        return v


class TranslateResponse(BaseModel):
    source_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    preserved_terms: list[str] = []
    ai_generated: bool = False
    elapsed_ms: float = 0.0
    cached: bool = False


class DetectResponse(BaseModel):
    text: str
    detected_lang: str
    confidence: float = 1.0


class CacheStatsResponse(BaseModel):
    total_entries: int
    max_entries: int
    hit_count: int
    miss_count: int
    ttl_seconds: int


class ReadingTranslationRequest(BaseModel):
    text: str
    reading_type: str
    source_lang: str = "en"
    target_lang: str = "fa"

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("text must not be empty")
        if len(v) > 50000:
            raise ValueError("text must not exceed 50000 characters")
        return v

    @field_validator("source_lang", "target_lang")
    @classmethod
    def valid_lang_reading(cls, v):
        if v not in ("en", "fa"):
            raise ValueError("language must be 'en' or 'fa'")
        return v


class BatchTranslationRequest(BaseModel):
    texts: list[str]
    source_lang: str = "en"
    target_lang: str = "fa"

    @field_validator("texts")
    @classmethod
    def texts_not_empty(cls, v):
        if not v:
            raise ValueError("texts list must not be empty")
        if len(v) > 100:
            raise ValueError("texts list must not exceed 100 items")
        return v

    @field_validator("source_lang", "target_lang")
    @classmethod
    def valid_lang_batch(cls, v):
        if v not in ("en", "fa"):
            raise ValueError("language must be 'en' or 'fa'")
        return v


class BatchTranslationResponse(BaseModel):
    translations: list[TranslateResponse]
