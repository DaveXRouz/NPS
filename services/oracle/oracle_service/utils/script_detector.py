"""Detect script type in text — Persian/Arabic vs Latin.

Used for auto-selecting the appropriate numerology system.

Supported Unicode ranges (Issue #154: improved robustness):
  - Arabic block: U+0600 to U+06FF
  - Arabic Supplement: U+0750 to U+077F
  - Arabic Extended-A: U+08A0 to U+08FF
  - Arabic Presentation Forms-A: U+FB50 to U+FDFF
  - Arabic Presentation Forms-B: U+FE70 to U+FEFF
  - Persian-specific: U+067E (pe), U+0686 (che), U+0698 (zhe), U+06AF (gaf)
  - Latin basic: A-Z, a-z
  - Latin Extended-A: U+0100 to U+017F (accented characters)
  - Latin Extended-B: U+0180 to U+024F
"""

import re
from typing import Literal

# Regex for Arabic/Persian characters — comprehensive range
_PERSIAN_ARABIC_RE = re.compile(
    r"[\u0600-\u06FF"  # Arabic block (includes Persian-specific chars)
    r"\u0750-\u077F"  # Arabic Supplement
    r"\u08A0-\u08FF"  # Arabic Extended-A
    r"\uFB50-\uFDFF"  # Arabic Presentation Forms-A
    r"\uFE70-\uFEFF"  # Arabic Presentation Forms-B
    r"]"
)

# Persian-specific characters not shared with Arabic
_PERSIAN_SPECIFIC_RE = re.compile(
    r"[\u067E"  # pe (پ)
    r"\u0686"  # che (چ)
    r"\u0698"  # zhe (ژ)
    r"\u06AF"  # gaf (گ)
    r"\u06A9"  # keheh (ک) — Persian form
    r"\u06CC"  # yeh (ی) — Persian form
    r"]"
)

# Latin characters — basic + extended (handles accented names)
_LATIN_RE = re.compile(
    r"[A-Za-z"
    r"\u00C0-\u00FF"  # Latin-1 Supplement (accented)
    r"\u0100-\u017F"  # Latin Extended-A
    r"\u0180-\u024F"  # Latin Extended-B
    r"]"
)

# Hebrew block (for potential future Gematria support)
_HEBREW_RE = re.compile(r"[\u0590-\u05FF]")

ScriptType = Literal["persian", "arabic", "latin", "hebrew", "mixed", "unknown"]


def contains_persian(text: str) -> bool:
    """Return True if text contains any Persian/Arabic characters."""
    if not text:
        return False
    return bool(_PERSIAN_ARABIC_RE.search(text))


def contains_persian_specific(text: str) -> bool:
    """Return True if text contains Persian-specific characters (not Arabic).

    Detects characters unique to Persian script: pe, che, zhe, gaf, keheh, yeh.
    """
    if not text:
        return False
    return bool(_PERSIAN_SPECIFIC_RE.search(text))


def contains_latin(text: str) -> bool:
    """Return True if text contains any Latin alphabetic characters."""
    if not text:
        return False
    return bool(_LATIN_RE.search(text))


def contains_hebrew(text: str) -> bool:
    """Return True if text contains any Hebrew characters."""
    if not text:
        return False
    return bool(_HEBREW_RE.search(text))


def count_script_chars(text: str) -> dict[str, int]:
    """Count characters by script type.

    Returns a dict with keys: persian_arabic, latin, hebrew, other.
    Useful for determining the dominant script in mixed text.
    """
    counts: dict[str, int] = {
        "persian_arabic": 0,
        "latin": 0,
        "hebrew": 0,
        "other": 0,
    }
    if not text:
        return counts

    for ch in text:
        if _PERSIAN_ARABIC_RE.match(ch):
            counts["persian_arabic"] += 1
        elif _LATIN_RE.match(ch):
            counts["latin"] += 1
        elif _HEBREW_RE.match(ch):
            counts["hebrew"] += 1
        elif ch.isalpha():
            counts["other"] += 1
    return counts


def detect_script(text: str) -> ScriptType:
    """Detect the dominant script in a text string.

    For mixed text, determines dominance by character count.

    Returns:
        'persian' — text is primarily Persian/Arabic chars
        'arabic'  — text has Arabic chars but no Persian-specific chars
        'latin'   — text is primarily Latin chars
        'hebrew'  — text contains Hebrew characters
        'mixed'   — text contains significant amounts of multiple scripts
        'unknown' — text contains no recognized script chars (digits, symbols only)
    """
    if not text or not text.strip():
        return "unknown"

    counts = count_script_chars(text)
    total_alpha = sum(counts.values())

    if total_alpha == 0:
        return "unknown"

    has_persian_arabic = counts["persian_arabic"] > 0
    has_latin = counts["latin"] > 0
    has_hebrew = counts["hebrew"] > 0

    # Check for mixed scripts: both must have significant presence
    script_count = sum(1 for v in [has_persian_arabic, has_latin, has_hebrew] if v)
    if script_count >= 2:
        # Determine if it's truly mixed or one script dominates
        dominant_count = max(counts["persian_arabic"], counts["latin"], counts["hebrew"])
        if dominant_count / total_alpha < 0.8:
            return "mixed"

    if has_persian_arabic and counts["persian_arabic"] >= counts["latin"]:
        # Distinguish Persian from Arabic using Persian-specific characters
        if contains_persian_specific(text):
            return "persian"
        # Default to persian since our primary RTL user base is Persian
        return "persian"

    if has_hebrew and counts["hebrew"] >= counts["latin"]:
        return "hebrew"

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
    3. Locale is 'fa' or 'ar' -> 'abjad'
    4. Default -> 'pythagorean'

    Args:
        name: The name to analyze
        locale: User's locale ('en', 'fa', 'ar')
        user_preference: 'auto', 'pythagorean', 'chaldean', or 'abjad'

    Returns:
        One of: 'pythagorean', 'chaldean', 'abjad'
    """
    valid_systems = {"pythagorean", "chaldean", "abjad"}
    if user_preference != "auto":
        if user_preference in valid_systems:
            return user_preference
        # Invalid preference, fall through to auto-detect
        pass

    if contains_persian(name):
        return "abjad"

    locale_lower = locale.lower() if locale else ""
    if locale_lower.startswith("fa") or locale_lower.startswith("ar"):
        return "abjad"

    return "pythagorean"
