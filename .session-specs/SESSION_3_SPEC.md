# SESSION 3 SPEC — Auth Router Tests & Profile Completeness

**Block:** Foundation (Sessions 1-5)
**Focus:** Add missing auth endpoint tests, complete user profile model
**Estimated Duration:** 2-3 hours
**Dependencies:** Session 2 (gaps fixed, reading flow validated)

---

## TL;DR

Session 3 closes two Foundation gaps: (1) auth router endpoints (login, API key CRUD) lack HTTP-level tests — only middleware functions are tested, and (2) the `coordinates` field exists in the DB/ORM but is missing from Pydantic models. Fix both, then run full suite to confirm Foundation block completion.

---

## OBJECTIVES

1. **Add auth router HTTP tests** — Test login, API key create/list/revoke through actual HTTP endpoints
2. **Add coordinates to user profile** — Expose coordinates in Create/Update/Response models
3. **Verify Persian UTF-8 roundtrip** — Confirm encrypted Persian fields survive full CRUD cycle
4. **Foundation block assessment** — Determine if Sessions 4-5 are needed or if Foundation is complete
5. **Re-run full test suite** — Confirm 330+ tests pass

---

## PHASES

### Phase 1: Auth Router HTTP Tests (45 min)

**Gap:** `test_auth.py` tests middleware functions directly (`_try_jwt_auth`, `_try_api_key_auth`, `_expand_scopes`). The auth ROUTER endpoints (`/api/auth/login`, `/api/auth/api-keys`) have zero HTTP-level tests.

**New tests needed:**

1. `POST /api/auth/login` — valid credentials → 200 + JWT token
2. `POST /api/auth/login` — invalid password → 401
3. `POST /api/auth/login` — nonexistent user → 401
4. `POST /api/auth/login` — disabled user → 403
5. `POST /api/auth/api-keys` — create key → 200 + plaintext key returned
6. `POST /api/auth/api-keys` — key has correct scopes
7. `POST /api/auth/api-keys` — key with expiry
8. `GET /api/auth/api-keys` — list returns user's keys
9. `DELETE /api/auth/api-keys/{id}` — revoke key → key deactivated
10. `DELETE /api/auth/api-keys/{id}` — revoke nonexistent → 404
11. `DELETE /api/auth/api-keys/{id}` — revoke other user's key → 403

**Note:** These tests need a real User row with bcrypt password hash in the test DB, NOT the mocked `get_current_user` override.

**Files:**

- `api/tests/test_auth_router.py` (new)
- `api/tests/conftest.py` (add fixture for user with bcrypt password)

**Acceptance:**

- [ ] 11+ new auth router tests pass
- [ ] Login returns valid JWT that decodes correctly
- [ ] API key creation returns plaintext key (stored as SHA-256 hash)
- [ ] Key revocation sets is_active=False

### Phase 2: Coordinates Field Completion (20 min)

**Gap:** `oracle_users` table has a `coordinates POINT` column. `OracleUser` ORM maps it. But `OracleUserCreate`, `OracleUserUpdate`, and `OracleUserResponse` Pydantic models don't include it.

**Fix:**

- Add `coordinates` to OracleUserCreate (optional tuple[float, float])
- Add `coordinates` to OracleUserUpdate (optional)
- Add `coordinates` to OracleUserResponse
- Update router to pass coordinates through
- Note: PostgreSQL POINT type won't work with SQLite — need to handle gracefully

**Files:**

- `api/app/models/oracle_user.py`
- `api/app/routers/oracle.py` (user section)

**Acceptance:**

- [ ] Coordinates can be set on create/update
- [ ] Coordinates returned in response
- [ ] Works with SQLite fallback (stored as text or skipped)

### Phase 3: Persian UTF-8 Verification (10 min)

**Already tested but verify explicitly:**

- Create user with Persian name + mother_name_persian
- Retrieve user — Persian text matches exactly
- Update with Persian text — preserved
- Encrypted fields (mother_name_persian) roundtrip correctly

**Files:**

- `api/tests/test_oracle_users.py` (verify existing tests cover this)

**Acceptance:**

- [ ] Persian text preserved through create → encrypt → store → decrypt → read
- [ ] RTL characters intact (no mojibake)

### Phase 4: Foundation Block Assessment (15 min)

Review all Foundation requirements against verified state:

- Database schema ✓ (Session 1)
- API boot ✓ (Session 1)
- Auth flow ✓ (Session 1 + 3)
- Oracle user CRUD ✓ (Session 1)
- Encryption ✓ (Session 1)
- Audit logging ✓ (Session 1)
- Reading flow ✓ (Session 2)
- Schema fixes ✓ (Session 2)

Determine if Sessions 4-5 are needed or if Foundation is complete.

### Phase 5: Test Suite & Commit (15 min)

1. Run full API + Oracle service test suites
2. Update SESSION_LOG.md
3. Git commit

**Acceptance:**

- [ ] 330+ tests pass / 0 fail
- [ ] SESSION_LOG.md updated
- [ ] Clean commit

---

## SUCCESS CRITERIA

1. Auth router endpoints tested through HTTP (11+ new tests)
2. Coordinates field exposed in user profile API
3. 330+ total tests pass
4. Foundation block assessment documented
5. SESSION_LOG.md updated with Session 3 entry
