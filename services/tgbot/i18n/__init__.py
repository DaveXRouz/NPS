"""Bot internationalization.

Loads translation files and provides a t() function for rendering
locale-aware messages. Supports variable interpolation and Persian
numeral conversion.
"""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_translations: dict[str, dict[str, str]] = {}
_LOCALE_DIR = Path(__file__).parent
_DEFAULT_LOCALE = "en"

# Persian numeral mapping
_PERSIAN_DIGITS = str.maketrans(
    "0123456789", "\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9"
)


def load_translations() -> None:
    """Load all translation JSON files from the i18n directory."""
    for json_file in _LOCALE_DIR.glob("*.json"):
        locale = json_file.stem  # "en" from "en.json"
        with open(json_file, encoding="utf-8") as f:
            _translations[locale] = json.load(f)
        logger.info(
            "Loaded %d keys for locale '%s'", len(_translations[locale]), locale
        )


def t(key: str, locale: str = "en", **kwargs: str | int) -> str:
    """Translate a key to the given locale with variable interpolation.

    Usage: t("welcome", "fa", name="Ali")
    Looks up key in locale file, falls back to EN, falls back to key itself.
    For Persian locale, converts Western numerals to Persian numerals.
    """
    messages = _translations.get(locale, _translations.get(_DEFAULT_LOCALE, {}))
    text = messages.get(key, _translations.get(_DEFAULT_LOCALE, {}).get(key, key))

    # Interpolate variables: {name} -> value
    for var_name, value in kwargs.items():
        text = text.replace(f"{{{var_name}}}", str(value))

    # Convert numerals for Persian locale
    if locale == "fa":
        text = to_persian_numerals(text)

    return text


def to_persian_numerals(text: str) -> str:
    """Convert Western digits 0-9 to Persian digits."""
    return text.translate(_PERSIAN_DIGITS)


def get_user_locale(chat_id: int, linked_accounts: dict) -> str:
    """Determine user's locale from their linked account settings.

    Priority:
    1. Stored locale preference in linked account
    2. Default to 'en'
    """
    account = linked_accounts.get(chat_id)
    if account and account.get("locale"):
        return account["locale"]
    return _DEFAULT_LOCALE
