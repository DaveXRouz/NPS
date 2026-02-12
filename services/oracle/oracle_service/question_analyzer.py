"""Question Analyzer — Script detection + numerological hashing.

Detects whether input text is Latin (Pythagorean/Chaldean) or
Persian/Arabic (Abjad), sums letter values, reduces to single
digit or master number.
"""

from oracle_service.utils.script_detector import contains_persian, detect_script

# ─── Letter Value Tables ─────────────────────────────────────────────────────

# Pythagorean (Western standard): A=1 .. I=9, J=1 .. R=9, S=1 .. Z=8
PYTHAGOREAN_VALUES: dict[str, int] = {
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 4,
    "E": 5,
    "F": 6,
    "G": 7,
    "H": 8,
    "I": 9,
    "J": 1,
    "K": 2,
    "L": 3,
    "M": 4,
    "N": 5,
    "O": 6,
    "P": 7,
    "Q": 8,
    "R": 9,
    "S": 1,
    "T": 2,
    "U": 3,
    "V": 4,
    "W": 5,
    "X": 6,
    "Y": 7,
    "Z": 8,
}

# Chaldean (ancient Babylonian): different mapping, no 9 assigned
CHALDEAN_VALUES: dict[str, int] = {
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 4,
    "E": 5,
    "F": 8,
    "G": 3,
    "H": 5,
    "I": 1,
    "J": 1,
    "K": 2,
    "L": 3,
    "M": 4,
    "N": 5,
    "O": 7,
    "P": 8,
    "Q": 1,
    "R": 2,
    "S": 3,
    "T": 4,
    "U": 6,
    "V": 6,
    "W": 6,
    "X": 5,
    "Y": 1,
    "Z": 7,
}

# Abjad (Arabic/Persian traditional): imported from framework
ABJAD_VALUES: dict[str, int] = {
    # Units (1-9)
    "\u0627": 1,  # ا  alef
    "\u0628": 2,  # ب  ba
    "\u062c": 3,  # ج  jim
    "\u062f": 4,  # د  dal
    "\u0647": 5,  # ه  ha
    "\u0648": 6,  # و  vav
    "\u0632": 7,  # ز  za
    "\u062d": 8,  # ح  ha (guttural)
    "\u0637": 9,  # ط  ta (emphatic)
    # Tens (10-90)
    "\u064a": 10,  # ي  ya (Arabic)
    "\u06cc": 10,  # ی  ya (Persian)
    "\u06a9": 20,  # ک  kaf (Persian)
    "\u0643": 20,  # ك  kaf (Arabic)
    "\u0644": 30,  # ل  lam
    "\u0645": 40,  # م  mim
    "\u0646": 50,  # ن  nun
    "\u0633": 60,  # س  sin
    "\u0639": 70,  # ع  ain
    "\u0641": 80,  # ف  fa
    "\u0635": 90,  # ص  sad
    # Hundreds (100-900)
    "\u0642": 100,  # ق  qaf
    "\u0631": 200,  # ر  ra
    "\u0634": 300,  # ش  shin
    "\u062a": 400,  # ت  ta
    "\u062b": 500,  # ث  sa (tha)
    "\u062e": 600,  # خ  kha
    "\u0630": 700,  # ذ  dhal
    "\u0636": 800,  # ض  dad
    "\u0638": 900,  # ظ  za (emphatic)
    "\u063a": 1000,  # غ  ghain
    # Persian extras
    "\u067e": 2,  # پ  pe → same as ba
    "\u0686": 3,  # چ  che → same as jim
    "\u0698": 7,  # ژ  zhe → same as za
    "\u06af": 20,  # گ  gaf → same as kaf
    # Alef variants
    "\u0622": 1,  # آ  alef madda
    "\u0623": 1,  # أ  alef hamza above
    "\u0625": 1,  # إ  alef hamza below
    "\u0671": 1,  # ٱ  alef wasla
}

# System name → table mapping
_SYSTEM_TABLES: dict[str, dict[str, int]] = {
    "pythagorean": PYTHAGOREAN_VALUES,
    "chaldean": CHALDEAN_VALUES,
    "abjad": ABJAD_VALUES,
}


# ─── Digital Root ─────────────────────────────────────────────────────────────


def digital_root(n: int) -> int:
    """Reduce to single digit, preserving master numbers 11, 22, 33."""
    if n <= 0:
        return 0
    while n > 9 and n not in (11, 22, 33):
        n = sum(int(d) for d in str(n))
    return n


# ─── Letter Sum ───────────────────────────────────────────────────────────────


def sum_letter_values(text: str, system: str = "auto") -> int:
    """Sum letter values using the specified numerology system.

    Args:
        text: Input text (name, question, etc.)
        system: 'auto', 'pythagorean', 'chaldean', or 'abjad'

    Returns:
        Raw sum before reduction.
    """
    if system == "auto":
        script = detect_script(text)
        if script == "persian":
            system = "abjad"
        elif script == "mixed":
            # Use predominant script
            system = "abjad" if contains_persian(text) else "pythagorean"
        else:
            system = "pythagorean"

    table = _SYSTEM_TABLES.get(system, PYTHAGOREAN_VALUES)

    if system == "abjad":
        return sum(table.get(c, 0) for c in text)
    else:
        return sum(table.get(c, 0) for c in text.upper() if c.isalpha())


# ─── Question Number ─────────────────────────────────────────────────────────


def question_number(text: str, system: str = "auto") -> dict:
    """Compute the numerological question number from text.

    Returns:
        Dict with question_text, detected_script, system_used,
        raw_sum, question_number, is_master_number.
    """
    detected = detect_script(text)

    # Resolve system
    if system == "auto":
        if detected == "persian":
            resolved = "abjad"
        elif detected == "mixed":
            resolved = "abjad" if contains_persian(text) else "pythagorean"
        else:
            resolved = "pythagorean"
    else:
        resolved = system

    raw_sum = sum_letter_values(text, resolved)
    qn = digital_root(raw_sum)

    return {
        "question_text": text,
        "detected_script": detected if detected != "unknown" else "latin",
        "system_used": resolved,
        "raw_sum": raw_sum,
        "question_number": qn,
        "is_master_number": qn in (11, 22, 33),
    }
