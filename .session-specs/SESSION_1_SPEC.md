# SESSION 1 SPEC — Foundation Verification & Baseline

**Block:** Foundation (Sessions 1-5)
**Focus:** Verify database schema, auth, profiles, encryption all work end-to-end
**Estimated Duration:** 2-3 hours
**Dependencies:** None (first session)

---

## TL;DR

Session 1 validates that the scaffolded foundation (database, auth, encryption, Oracle user CRUD, audit logging) actually works. Run the existing tests, fix anything broken, fill gaps, and establish a verified baseline that Sessions 2-45 can build on with confidence.

---

## CONTEXT

The 16-session scaffolding produced ~45,903 lines of code including:

- Complete PostgreSQL schema (init.sql with all Oracle tables + indexes)
- FastAPI with 29 Oracle endpoints, auth, rate limiting
- AES-256-GCM encryption service
- Audit logging service
- Oracle user CRUD with soft-delete
- 90+ test files across all layers

**Problem:** None of this has been verified end-to-end as a unit. Individual files exist but we don't know if they all work together. Session 1 establishes truth.

---

## OBJECTIVES

1. **Verify database schema** — init.sql runs cleanly, all tables/indexes created
2. **Verify API starts** — FastAPI boots without import errors
3. **Verify auth flow** — JWT login + API key creation works
4. **Verify Oracle user CRUD** — Create, read, update, soft-delete users
5. **Verify encryption** — AES-256-GCM encrypt/decrypt roundtrip
6. **Verify audit logging** — Events written to oracle_audit_log
7. **Run test suite** — Establish baseline pass/fail counts
8. **Fix broken items** — Up to 3 fixes per the 3-strike rule
9. **Document baseline** — Record verified state in SESSION_LOG.md

---

## PHASES

### Phase 1: Environment & Database Verification (30 min)

**Tasks:**

1. Verify Docker Compose config can start PostgreSQL
2. Run `database/init.sql` — confirm all tables created
3. Verify Oracle tables exist: oracle_users, oracle_readings, oracle_reading_users, oracle_audit_log
4. Verify indexes exist (15+ indexes on Oracle tables)
5. Run seed data (oracle_seed_data.sql) — confirm 3 users, 5 readings load
6. Test basic queries (user lookup, reading by user_id, JSONB query)

**Files to check:**

- `database/init.sql`
- `database/seeds/oracle_seed_data.sql`
- `database/seeds/seed_admin.sql`
- `docker-compose.yml` (PostgreSQL service config)

**Acceptance:**

- [ ] All Oracle tables exist with correct columns
- [ ] All 15+ indexes created
- [ ] Seed data loads without errors
- [ ] Basic queries return expected results
- [ ] Triggers fire (updated_at auto-update)

### Phase 2: API Boot & Import Verification (20 min)

**Tasks:**

1. Verify Python dependencies installed (pyproject.toml)
2. Check all imports resolve (no circular imports, missing modules)
3. Boot FastAPI — confirm app starts on port 8000
4. Verify /docs (Swagger UI) loads with all endpoints listed
5. Verify /api/health returns 200

**Files to check:**

- `api/app/main.py`
- `api/app/config.py`
- `api/app/database.py`
- `api/pyproject.toml` or `requirements.txt`
- All routers in `api/app/routers/`
- All ORM models in `api/app/orm/`
- All services in `api/app/services/`

**Acceptance:**

- [ ] `pip install -e ".[dev]"` succeeds (or requirements install)
- [ ] FastAPI starts without import errors
- [ ] /docs shows all Oracle endpoints
- [ ] /api/health returns 200

### Phase 3: Auth Flow Verification (20 min)

**Tasks:**

1. Test JWT login (POST /api/auth/login)
2. Test API key creation (POST /api/auth/api-keys)
3. Test API key validation on Oracle endpoints
4. Test scope hierarchy (admin > write > read)
5. Test unauthorized access rejected (401)
6. Test insufficient scope rejected (403)

**Files to check:**

- `api/app/middleware/auth.py`
- `api/app/routers/auth.py`
- `api/app/orm/user.py`
- `api/app/orm/api_key.py`

**Acceptance:**

- [ ] Can create admin user and login
- [ ] JWT token returned with correct claims
- [ ] API key creation returns plaintext key (stored as hash)
- [ ] Scoped endpoints enforce scope hierarchy
- [ ] 401 for missing/invalid auth, 403 for insufficient scope

### Phase 4: Oracle User CRUD Verification (30 min)

**Tasks:**

1. Create Oracle user (POST /api/oracle/users)
2. List Oracle users with pagination (GET /api/oracle/users)
3. Get single user (GET /api/oracle/users/{id})
4. Update user (PUT /api/oracle/users/{id})
5. Soft-delete user (DELETE /api/oracle/users/{id})
6. Verify soft-deleted user excluded from list
7. Verify Persian text (name_persian, mother_name_persian) handles UTF-8
8. Verify field encryption (name fields encrypted in DB, decrypted in response)

**Files to check:**

- `api/app/routers/oracle.py` (user management section)
- `api/app/orm/oracle_user.py`
- `api/app/models/oracle_user.py`
- `api/app/services/security.py`

**Acceptance:**

- [ ] Full CRUD cycle works
- [ ] Pagination returns correct page metadata
- [ ] Soft-delete sets deleted_at, excludes from list
- [ ] Persian UTF-8 text preserved through encrypt/decrypt roundtrip
- [ ] Encrypted fields stored in DB (not plaintext sensitive data)

### Phase 5: Encryption & Audit Verification (20 min)

**Tasks:**

1. Test AES-256-GCM encryption roundtrip
2. Test ENC4: prefix format
3. Test V3 legacy decryption fallback (ENC: prefix)
4. Verify audit events logged for user operations
5. Query audit log (GET /api/oracle/audit)
6. Verify audit contains: action, user_id, ip, timestamp

**Files to check:**

- `api/app/services/security.py`
- `api/app/services/audit.py`
- `api/app/orm/audit_log.py`
- `api/app/models/audit.py`

**Acceptance:**

- [ ] encrypt → decrypt returns original plaintext
- [ ] ENC4: prefix on encrypted data
- [ ] Audit events written for create/update/delete operations
- [ ] Audit query returns events with correct fields

### Phase 6: Test Suite Baseline (30 min)

**Tasks:**

1. Run API unit tests: `cd api && python3 -m pytest tests/ -v`
2. Run Oracle service tests: `cd services/oracle && python3 -m pytest tests/ -v`
3. Run integration tests: `python3 -m pytest integration/tests/ -v`
4. Record pass/fail counts for each suite
5. Fix any critical failures (up to 3 fixes)
6. Document baseline in SESSION_LOG.md

**Acceptance:**

- [ ] API tests: record X pass / Y fail
- [ ] Oracle service tests: record X pass / Y fail
- [ ] Integration tests: record X pass / Y fail
- [ ] No critical failures blocking the foundation
- [ ] Baseline documented

### Phase 7: Gap Analysis & Documentation (20 min)

**Tasks:**

1. Identify any missing Foundation pieces
2. Document gaps for Sessions 2-5 to address
3. Update SESSION_LOG.md with Session 1 results
4. Git commit with session tag

**Acceptance:**

- [ ] SESSION_LOG.md updated with full Session 1 entry
- [ ] Gaps documented for next sessions
- [ ] Clean git commit

---

## SUCCESS CRITERIA

1. Database schema verified — all Oracle tables + indexes exist and work
2. API boots cleanly — no import errors, /docs loads
3. Auth flow works — JWT + API key + scopes
4. Oracle user CRUD verified — create, read, update, soft-delete
5. Encryption verified — AES-256-GCM roundtrip
6. Audit logging verified — events written and queryable
7. Test baseline established — pass/fail counts documented
8. SESSION_LOG.md updated — complete Session 1 entry
9. Git commit with `[foundation] verify baseline (#session-1)`

---

## NEXT SESSION

Session 2 will address any gaps found in Session 1, plus begin validating the Oracle reading flow (create reading, store results, retrieve history).
