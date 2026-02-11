"""Detect script type in text — Persian/Arabic vs Latin.

Used for auto-selecting the appropriate numerology system.
Persian/Arabic Unicode range: U+0600 to U+06FF (Arabic block)
plus U+FB50 to U+FDFF (Arabic Presentation Forms-A)
and U+FE70 to U+FEFF (Arabic Presentation Forms-B).
"""

import re
from typing import Literal

# Regex for Arabic/Persian characters
_PERSIAN_ARABIC_RE = re.compile(r"[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]")
_LATIN_RE = re.compile(r"[A-Za-z]")

ScriptType = Literal["persian", "latin", "mixed", "unknown"]


def contains_persian(text: str) -> bool:
    """Return True if text contains any Persian/Arabic characters."""
    return bool(_PERSIAN_ARABIC_RE.search(text))


def contains_latin(text: str) -> bool:
    """Return True if text contains any Latin alphabetic characters."""
    return bool(_LATIN_RE.search(text))


def detect_script(text: str) -> ScriptType:
    """Detect the dominant script in a text string.

    Returns:
        'persian' — text contains Persian/Arabic chars, no Latin
        'latin'   — text contains Latin chars, no Persian/Arabic
        'mixed'   — text contains both
        'unknown' — text contains neither (digits, symbols only)
    """
    has_persian = contains_persian(text)
    has_latin = contains_latin(text)

    if has_persian and has_latin:
        return "mixed"
    if has_persian:
        return "persian"
    if has_latin:
        return "latin"
    return "unknown"


def auto_select_system(
    name: str,
    locale: str = "en",
    user_preference: str = "auto",
) -> str:
    """Auto-select the best numerology system.

    Priority:
    1. Manual override (user_preference != 'auto') -> use that
    2. Name contains Persian/Arabic characters -> 'abjad'
    3. Locale is 'fa' -> 'abjad'
    4. Default -> 'pythagorean'

    Args:
        name: The name to analyze
        locale: User's locale ('en', 'fa')
        user_preference: 'auto', 'pythagorean', 'chaldean', or 'abjad'

    Returns:
        One of: 'pythagorean', 'chaldean', 'abjad'
    """
    if user_preference != "auto":
        return user_preference

    if contains_persian(name):
        return "abjad"

    if locale.lower().startswith("fa"):
        return "abjad"

    return "pythagorean"
