# SESSION 4 SPEC — Engine Verification, Chaldean & Abjad

**Block:** Calculation Engines (Sessions 4-12, started early due to Foundation completing in 3)
**Focus:** Fix doc errors, verify V3 engine parity, add Chaldean standalone + Abjad engine
**Estimated Duration:** 2-3 hours
**Dependencies:** Session 3 (Foundation complete, 334 tests passing)

---

## TL;DR

Session 4 establishes the engine baseline. Two doc test vectors in FC60_ALGORITHM.md are wrong — fix them. Chaldean numerology exists inside `oracle.py` but lacks standalone module + tests. Abjad (Persian numerology) is referenced in docs as "V4 new" but not implemented anywhere. Build both, add comprehensive tests, verify parity.

---

## OBJECTIVES

1. **Fix FC60 doc test vectors** — Two errors in `logic/FC60_ALGORITHM.md`
2. **Add comprehensive engine test vectors** — From docs + manual verification
3. **Extract Chaldean as standalone module** — Currently embedded in `oracle.py`, needs its own testable functions
4. **Build Abjad engine** — Persian/Arabic numerology (V4 new feature)
5. **Verify all 29 FC60 self_test vectors pass** — Already passing but formally document
6. **Run full test suite** — 334+ tests pass

---

## PHASES

### Phase 1: Fix FC60 Doc Test Vectors (10 min)

**Problem discovered in pre-session exploration:**

| Input              | Doc Says                        | Engine Computes    | Correct Value                                          |
| ------------------ | ------------------------------- | ------------------ | ------------------------------------------------------ |
| 2024-01-01 JDN     | 2460310                         | 2460311            | **2460311** (verified by Fliegel-Van Flandern formula) |
| 2000-01-01 token60 | token60(45)="ROWU"              | token60(5)="OXWU"  | **token60(5)="OXWU"** (2451545 % 60 = 5, not 45)       |
| 2024-01-01 token60 | token60(10)="OXWU"              | token60(11)="TIFI" | **token60(11)="TIFI"** (2460311 % 60 = 11)             |
| 1990-06-15         | JDN=2448058, token60(58)="PIMT" | matches            | Correct as-is                                          |

**Fix:** Update `logic/FC60_ALGORITHM.md` test vector table with corrected values.

**Files:**

- `logic/FC60_ALGORITHM.md` (fix test vector table)

**Acceptance:**

- [ ] All doc test vectors match engine output exactly
- [ ] Third-party JDN verification confirms values

### Phase 2: Comprehensive Engine Test Vectors (30 min)

**Current state:** `test_engines.py` has 22 tests but some are weak (e.g., `test_life_path_range` only checks the range, not specific values).

**Add tests for:**

FC60:

- 2024-01-01 → JDN=2460311, token60(11)="TIFI"
- 2000-01-01 → JDN=2451545, token60(5)="OXWU", weekday=Saturday
- 1990-06-15 → JDN=2448058, token60(58)="PIMT"
- token60 boundary cases: token60(0)="RAWU", token60(59)="PIWA"
- encode_base60 / decode_base60 roundtrip
- Ganzhi vectors: 2024 → stem=0(Jiǎ), branch=4(Dragon)
- Moon phase for known dates

Numerology:

- life_path(1990,6,15) = 4 (from doc)
- name_to_number("DAVE") = 5 (from doc)
- numerology_reduce(347) = 5 (from doc: 3+4+7=14, 1+4=5)
- name_soul_urge("DAVE") = specific value
- name_personality("DAVE") = specific value
- personal_year with known output

**Files:**

- `services/oracle/tests/test_engines.py` (add ~15 new test methods)

**Acceptance:**

- [ ] All FC60 doc test vectors verified in tests
- [ ] All numerology doc test vectors verified in tests
- [ ] Token boundary cases covered
- [ ] 29 self_test vectors still pass

### Phase 3: Chaldean Standalone Module (30 min)

**Current state:** Chaldean values and reduction logic exist in `oracle.py` (lines 104-238) but are embedded as private helpers (`_chaldean_reduce`, `CHALDEAN_VALUES`). No standalone import path, no dedicated tests.

**Plan:** Create `services/oracle/oracle_service/engines/chaldean.py` with:

- `CHALDEAN_VALUES` dict (A=1, B=2, C=3, D=4, E=5, F=8, G=3, H=5, I=1...)
- `chaldean_reduce(name)` — Sum + reduce preserving master numbers
- `chaldean_name_to_number(name)` — Full name Chaldean number
- `chaldean_soul_urge(name)` — Vowels only (Chaldean values)
- `chaldean_personality(name)` — Consonants only (Chaldean values)

**Update oracle.py** to import from the new module instead of using private copies.

**Test vectors (from doc + manual):**

- "DAVE": D=4, A=1, V=6, E=5 = 16 → 1+6 = 7
- "JOHN": J=1, O=7, H=5, N=5 = 18 → 1+8 = 9
- Chaldean has no letter=9 (sacred number), verify table completeness

**Files:**

- `services/oracle/oracle_service/engines/chaldean.py` (NEW)
- `services/oracle/oracle_service/engines/oracle.py` (update imports)
- `services/oracle/tests/test_engines.py` (add Chaldean tests)

**Acceptance:**

- [ ] Chaldean module importable standalone
- [ ] oracle.py uses the standalone module
- [ ] 5+ Chaldean-specific tests pass
- [ ] Values match `logic/NUMEROLOGY_SYSTEMS.md` table

### Phase 4: Abjad Engine — Persian Numerology (45 min)

**Status:** Referenced in `logic/NUMEROLOGY_SYSTEMS.md` as "V4 only (new)" but not implemented anywhere.

**Abjad system:** Arabic/Persian letters have traditional numerical values:

- ا=1, ب=2, ج=3, د=4, ه=5, و=6, ز=7, ح=8, ط=9
- ی=10, ک=20, ل=30, م=40, ن=50, س=60, ع=70, ف=80, ص=90
- ق=100, ر=200, ش=300, ت=400, ث=500, خ=600, ذ=700, ض=800, ظ=900, غ=1000
- Persian extras: پ=2, چ=3, ژ=7, گ=20

**Create:** `services/oracle/oracle_service/engines/abjad.py` with:

- `ABJAD_VALUES` dict (all Arabic + Persian letter values)
- `abjad_reduce(text)` — Sum Persian/Arabic letters + reduce preserving master numbers
- `abjad_name_to_number(name)` — Full name Abjad number
- `abjad_word_value(word)` — Raw sum without reduction (traditional Abjad usage)

**Test vectors:**

- Persian test names with known Abjad values
- Master number preservation
- Mixed Persian/English text (only Persian letters counted)

**Files:**

- `services/oracle/oracle_service/engines/abjad.py` (NEW)
- `services/oracle/tests/test_engines.py` (add Abjad tests)

**Acceptance:**

- [ ] Abjad module handles Persian UTF-8 text
- [ ] Traditional Abjad values match reference tables
- [ ] Master number preservation works
- [ ] 5+ Abjad-specific tests pass

### Phase 5: Integration & Full Suite (15 min)

1. Wire Chaldean and Abjad into `oracle.py` imports (graceful degradation)
2. Run full Oracle service test suite
3. Run full API test suite
4. Update `logic/NUMEROLOGY_SYSTEMS.md` with Abjad implementation note
5. Update SESSION_LOG.md
6. Git commit

**Acceptance:**

- [ ] 334+ tests pass (existing) + ~25 new engine tests
- [ ] No regressions
- [ ] SESSION_LOG.md updated
- [ ] Clean commit

---

## SUCCESS CRITERIA

1. FC60 doc test vectors corrected and verified
2. Chaldean standalone engine with 5+ tests
3. Abjad Persian numerology engine with 5+ tests
4. ~25 new engine tests added
5. 360+ total tests pass / 0 fail
6. SESSION_LOG.md updated with Session 4 entry
