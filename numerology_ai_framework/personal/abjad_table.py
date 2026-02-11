"""Abjad numeral system — traditional Arabic/Persian letter-to-number mapping.

The Abjad system assigns numerical values to the 28 Arabic letters
plus 4 additional Persian letters. Used for numerological analysis
of Persian and Arabic names.
"""

# Standard 28 Arabic Abjad letters (Abjad Hawaz ordering)
ABJAD_TABLE: dict[str, int] = {
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
    "\u064a": 10,  # ي  ya (Arabic form)
    "\u06cc": 10,  # ی  ya (Persian form)
    "\u06a9": 20,  # ک  kaf (Persian form)
    "\u0643": 20,  # ك  kaf (Arabic form)
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
    # Persian-specific letters (map to closest Arabic equivalent values)
    "\u067e": 2,  # پ  pe → same as ba (2)
    "\u0686": 3,  # چ  che → same as jim (3)
    "\u0698": 7,  # ژ  zhe → same as za (7)
    "\u06af": 20,  # گ  gaf → same as kaf (20)
}

# Common diacritics and modifiers to ignore during calculation
IGNORED_CHARS: set[str] = {
    "\u0640",  # ـ  tatweel (kashida)
    "\u064b",  # ً  fathatan
    "\u064c",  # ٌ  dammatan
    "\u064d",  # ٍ  kasratan
    "\u064e",  # َ  fatha
    "\u064f",  # ُ  damma
    "\u0650",  # ِ  kasra
    "\u0651",  # ّ  shadda (doubled letter — counted once)
    "\u0652",  # ْ  sukun
    "\u0654",  # ٔ  hamza above
    "\u0670",  # ٰ  superscript alef
    "\u200c",  # ZWNJ (zero-width non-joiner, common in Persian)
    "\u200d",  # ZWJ (zero-width joiner)
}

# Alef variants — all map to alef value (1)
ALEF_VARIANTS: dict[str, int] = {
    "\u0622": 1,  # آ  alef madda
    "\u0623": 1,  # أ  alef hamza above
    "\u0625": 1,  # إ  alef hamza below
    "\u0671": 1,  # ٱ  alef wasla
}


def get_abjad_value(char: str) -> int:
    """Get the Abjad numerical value for a single character.

    Returns 0 for non-Abjad characters (spaces, digits, Latin, etc.).
    """
    if char in ABJAD_TABLE:
        return ABJAD_TABLE[char]
    if char in ALEF_VARIANTS:
        return ALEF_VARIANTS[char]
    if char in IGNORED_CHARS:
        return 0
    return 0


def name_to_abjad_sum(name: str) -> int:
    """Calculate raw Abjad sum for a name string."""
    return sum(get_abjad_value(c) for c in name)


if __name__ == "__main__":
    print("=" * 50)
    print("ABJAD TABLE - SELF TEST")
    print("=" * 50)

    passed = 0
    failed = 0

    # Test 1: alef = 1
    val = get_abjad_value("\u0627")
    if val == 1:
        print(f"\u2713 alef = {val}")
        passed += 1
    else:
        print(f"\u2717 alef expected 1, got {val}")
        failed += 1

    # Test 2: Persian pe = 2
    val = get_abjad_value("\u067e")
    if val == 2:
        print(f"\u2713 pe = {val}")
        passed += 1
    else:
        print(f"\u2717 pe expected 2, got {val}")
        failed += 1

    # Test 3: علی = 70 + 30 + 10 = 110
    val = name_to_abjad_sum("\u0639\u0644\u06cc")
    if val == 110:
        print(f"\u2713 \u0639\u0644\u06cc = {val}")
        passed += 1
    else:
        print(f"\u2717 \u0639\u0644\u06cc expected 110, got {val}")
        failed += 1

    # Test 4: حمزه = 8 + 40 + 7 + 5 = 60
    val = name_to_abjad_sum("\u062d\u0645\u0632\u0647")
    if val == 60:
        print(f"\u2713 \u062d\u0645\u0632\u0647 = {val}")
        passed += 1
    else:
        print(f"\u2717 \u062d\u0645\u0632\u0647 expected 60, got {val}")
        failed += 1

    print(f"\n{passed} passed, {failed} failed")
    exit(0 if failed == 0 else 1)
