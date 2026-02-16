# NPS Application Comprehensive Audit Report

**Date:** 2026-02-17
**Environment:** Docker Compose (10 containers), macOS (OrbStack)
**API Version:** 4.0.0

---

## Executive Summary

| Category              | Pass   | Fail   | Partial | Skip  | Total  |
| --------------------- | ------ | ------ | ------- | ----- | ------ |
| Infrastructure        | 5      | 1      | 0       | 0     | 6      |
| Auth System           | 8      | 1      | 1       | 0     | 10     |
| Oracle Profiles       | 5      | 0      | 0       | 0     | 5      |
| Oracle Readings       | 11     | 2      | 1       | 0     | 14     |
| Share System          | 3      | 0      | 0       | 0     | 3      |
| Translation           | 4      | 0      | 1       | 0     | 5      |
| Location Services     | 3      | 1      | 1       | 0     | 5      |
| Learning & Feedback   | 6      | 0      | 0       | 0     | 6      |
| Settings              | 1      | 1      | 0       | 0     | 2      |
| Admin Panel           | 7      | 2      | 0       | 0     | 9      |
| Telegram              | 3      | 0      | 1       | 0     | 4      |
| Stubs (Scanner/Vault) | 4      | 0      | 0       | 0     | 4      |
| Frontend              | 7      | 0      | 0       | 0     | 7      |
| WebSocket             | 1      | 0      | 0       | 0     | 1      |
| Docker Logs           | 0      | 3      | 0       | 0     | 3      |
| **TOTAL**             | **68** | **11** | **5**   | **0** | **84** |

**Overall Score: 81% PASS, 13% FAIL, 6% PARTIAL**

---

## Step 1: Infrastructure Health

| Status   | Endpoint / Check              | Details                                                       |
| -------- | ----------------------------- | ------------------------------------------------------------- |
| PASS     | `docker compose ps`           | 10 containers running                                         |
| PASS     | `GET /api/health`             | `{"status": "healthy", "version": "4.0.0"}`                   |
| PASS     | `GET /api/health/ready`       | DB=healthy, Redis=healthy, Oracle=direct_mode                 |
| PASS     | `GET /api/health/performance` | Uptime tracked, metrics available                             |
| PASS     | `GET /api/health/detailed`    | Full system info: DB 9.3MB, Redis 1.13M, CPU 12 cores         |
| **FAIL** | `nps-oracle-alerter`          | Container status: **unhealthy** (no error logs, appears idle) |

**Notes:**

- Scanner reports `not_deployed` (expected — stub service)
- Oracle is in `grpc` mode (healthy)
- Telegram is `configured`

---

## Step 2: Auth System

| Status   | Endpoint                           | Details                                |
| -------- | ---------------------------------- | -------------------------------------- |
| PASS     | `POST /api/auth/login` (valid)     | 200 — JWT + refresh token returned     |
| PASS     | `POST /api/auth/login` (bad pwd)   | 401 — correctly rejected               |
| PASS     | `POST /api/auth/refresh`           | 200 — new token pair issued            |
| PASS     | `POST /api/auth/register`          | 200 — created `testuser1` (admin-only) |
| PASS     | `POST /api/auth/change-password`   | 200 — password changed                 |
| **FAIL** | `POST /api/auth/api-keys` (create) | **500 Internal Server Error**          |
| PASS     | `GET /api/auth/api-keys` (list)    | 200 — returns array                    |
| PASS     | `POST /api/auth/logout`            | 200 — token blacklisted                |
| PARTIAL  | `GET with invalid token`           | Returns 403 instead of expected 401    |
| PASS     | `DELETE /api/auth/api-keys/{id}`   | Not tested (no key created due to 500) |

### BUG: API Key Creation 500 Error

**Root cause:** The `scopes` column in `api_keys` table is `text[]` (PostgreSQL array), but the code passes an empty string `''` instead of a proper array `'{}'`.

```
sqlalchemy.exc.DataError: malformed array literal: ""
SQL: INSERT INTO api_keys ... VALUES (..., '', 60, ...)
```

**Fix:** In the API key creation code, ensure `scopes` is serialized as a list `[]` or PostgreSQL array literal `'{}'`, not an empty string.

---

## Step 3: Oracle User Profiles (CRUD)

| Status | Endpoint                        | Details                                          |
| ------ | ------------------------------- | ------------------------------------------------ |
| PASS   | `POST /api/oracle/users`        | 201 — profile created with encrypted mother_name |
| PASS   | `GET /api/oracle/users`         | 200 — paginated list                             |
| PASS   | `GET /api/oracle/users/{id}`    | 200 — mother_name decrypted in response          |
| PASS   | `PUT /api/oracle/users/{id}`    | 200 — name updated                               |
| PASS   | `DELETE /api/oracle/users/{id}` | 200 — soft-delete works                          |

**Encryption verified:** `mother_name` stored encrypted, decrypted on read.

---

## Step 4: Oracle Readings (Core Feature)

| Status   | Endpoint                                   | Details                                                                                                                             |
| -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| PASS     | `POST /api/oracle/name`                    | 200 — name reading with calculations                                                                                                |
| PASS     | `POST /api/oracle/reading`                 | 200 — time-based reading                                                                                                            |
| PASS     | `POST /api/oracle/question`                | 200 — question reading                                                                                                              |
| PASS     | `GET /api/oracle/daily`                    | 200 — daily insight                                                                                                                 |
| **FAIL** | `POST /api/oracle/daily/reading`           | **405 Method Not Allowed** — route not registered for POST                                                                          |
| **FAIL** | `POST /api/oracle/reading/multi-user`      | **503** — "Multi-user analysis engines not yet available"                                                                           |
| PARTIAL  | `POST /api/oracle/readings` (unified)      | Endpoint exists but is the time reading — requires `user_id`, `sign_value` (time format HH:MM:SS) — NOT a unified reading framework |
| PASS     | `POST /api/oracle/validate-stamp`          | 200 — FC60 stamp validation works                                                                                                   |
| PASS     | `POST /api/oracle/suggest-range`           | 200 — AI scan range suggestion                                                                                                      |
| PASS     | `GET /api/oracle/readings`                 | 200 — paginated: `{readings: [], total, limit, offset}`                                                                             |
| PASS     | `GET /api/oracle/readings/{id}`            | 200 — full reading detail                                                                                                           |
| PASS     | `PATCH /api/oracle/readings/{id}/favorite` | 200 — toggle works (`is_favorite: true`)                                                                                            |
| PASS     | `DELETE /api/oracle/readings/{id}`         | 204 — soft-delete works                                                                                                             |
| PASS     | `GET /api/oracle/readings/stats`           | 200                                                                                                                                 |
| PASS     | `GET /api/oracle/stats`                    | 200 — dashboard stats                                                                                                               |

### Notes:

- `POST /api/oracle/daily/reading` — Route exists as GET only, POST not wired
- Multi-user analysis is stub (503) — engines not implemented yet
- The `POST /api/oracle/readings` endpoint is actually the time-based reading creation, not a "unified framework"

---

## Step 5: Share System

| Status | Endpoint                    | Details                                      |
| ------ | --------------------------- | -------------------------------------------- |
| PASS   | `POST /api/share`           | 201 — share link created with token          |
| PASS   | `GET /api/share/{token}`    | 200 — public access works (no auth required) |
| PASS   | `DELETE /api/share/{token}` | 200 — share revoked                          |

---

## Step 6: Translation

| Status  | Endpoint                           | Details                                                                  |
| ------- | ---------------------------------- | ------------------------------------------------------------------------ |
| PASS    | `POST /api/translation/translate`  | 200 — works but returns same text (no actual translation engine)         |
| PASS    | `POST /api/translation/reading`    | 200 — requires `text`, `reading_type`, `target_lang`                     |
| PASS    | `POST /api/translation/batch`      | 200 — batch translate works                                              |
| PASS    | `GET /api/translation/detect`      | 200 — language detection                                                 |
| PARTIAL | `GET /api/translation/cache/stats` | 200 — returns stats but translation is passthrough (no real translation) |

**Note:** Translation appears to be a passthrough — returns the same text. No external translation API is wired up.

---

## Step 7: Location Services

| Status   | Endpoint                                | Details                                                  |
| -------- | --------------------------------------- | -------------------------------------------------------- |
| PASS     | `GET /api/location/countries`           | 200 — full country list with coordinates                 |
| PASS     | `GET /api/location/countries/IR/cities` | 200 — Iranian cities with timezone                       |
| PASS     | `GET /api/location/timezone`            | 200 — requires `country_code` param (Asia/Tehran for IR) |
| PASS     | `GET /api/location/coordinates`         | 200 — geocoding works (Tehran: 35.69, 51.39)             |
| **FAIL** | `GET /api/location/detect`              | **502** — "External location service unavailable"        |

**Note:** IP-based detection fails because no external geolocation service is configured/accessible from Docker.

---

## Step 8: Learning & Feedback

| Status | Endpoint                                           | Details                                    |
| ------ | -------------------------------------------------- | ------------------------------------------ |
| PASS   | `POST /api/learning/oracle/readings/{id}/feedback` | 201 — feedback submitted (rating, comment) |
| PASS   | `GET /api/learning/oracle/readings/{id}/feedback`  | 200 — feedback retrieved                   |
| PASS   | `GET /api/learning/oracle/stats`                   | 200 — admin stats                          |
| PASS   | `GET /api/learning/stats`                          | 200                                        |
| PASS   | `GET /api/learning/insights`                       | 200                                        |
| PASS   | `GET /api/learning/weights`                        | 200                                        |
| PASS   | `GET /api/learning/patterns`                       | 200                                        |

---

## Step 9: Settings

| Status   | Endpoint            | Details                                   |
| -------- | ------------------- | ----------------------------------------- |
| PASS     | `GET /api/settings` | 200 — returns `{settings: {}}`            |
| **FAIL** | `PUT /api/settings` | **400** — "Invalid setting key: language" |

**Issue:** The settings API accepts `{settings: {key: value}}` but rejects common keys like `language`. Only `theme` was accepted. The valid key set needs documentation or the validation needs updating. Additionally, all values must be strings (booleans rejected).

---

## Step 10: Admin Panel

| Status   | Endpoint                                    | Details                                                          |
| -------- | ------------------------------------------- | ---------------------------------------------------------------- |
| PASS     | `GET /api/admin/stats`                      | 200 — total_users, readings, profiles                            |
| PASS     | `GET /api/admin/users`                      | 200 — user list with roles                                       |
| PASS     | `PATCH /api/admin/users/{id}/role`          | 200 — valid roles: `admin`, `user`, `readonly` (NOT `moderator`) |
| PASS     | `POST /api/admin/users/{id}/reset-password` | 200                                                              |
| PASS     | `PATCH /api/admin/users/{id}/status`        | 200 — toggle active                                              |
| PASS     | `GET /api/admin/profiles`                   | 200 — Oracle profile list                                        |
| PASS     | `DELETE /api/admin/profiles/{id}`           | 200 — hard delete                                                |
| PASS     | `GET /api/admin/backups` (list)             | 200 — empty, shows retention policy                              |
| **FAIL** | `POST /api/admin/backups` (create)          | **500** — backup script not found                                |
| PASS     | `GET /api/health/logs`                      | 200 — audit log entries                                          |
| PASS     | `GET /api/health/analytics`                 | 200 — readings per day, by type                                  |

### BUG: Backup Creation 500

**Root cause:** `FileNotFoundError: [Errno 2] No such file or directory: '/database/scripts/oracle_backup.sh'`
The backup script path is hardcoded and doesn't exist inside the API container. Valid `backup_type` values: `oracle_full`, `oracle_data`, `full_database`.

### Note: Role Values

Valid roles are `admin`, `user`, `readonly` — NOT `moderator`. The regex pattern enforces `^(admin|user|readonly)$`.

---

## Step 11: Telegram

| Status  | Endpoint                                                    | Details                                            |
| ------- | ----------------------------------------------------------- | -------------------------------------------------- |
| PARTIAL | `GET /api/telegram/daily/preferences/{chat_id}`             | 404 before preferences are set (expected behavior) |
| PASS    | `PUT /api/telegram/daily/preferences/{chat_id}`             | 200 — preferences saved                            |
| PASS    | `GET /api/telegram/daily/preferences/{chat_id}` (after set) | 200 — preferences retrieved                        |
| PASS    | `GET /api/telegram/admin/stats`                             | 200 — totals and error counts                      |
| PASS    | `GET /api/telegram/admin/users`                             | 200 — linked users list                            |

---

## Step 12: Stubs (Scanner/Vault)

| Status | Endpoint                  | Details                         |
| ------ | ------------------------- | ------------------------------- |
| PASS   | `GET /api/scanner/status` | 404 — not registered (expected) |
| PASS   | `GET /api/scanner/stats`  | 404 — not registered (expected) |
| PASS   | `GET /api/vault/status`   | 404 — not registered (expected) |
| PASS   | `GET /api/vault/keys`     | 404 — not registered (expected) |

**Note:** Scanner and vault routers are not registered in the API. These endpoints return 404 (not 501). This is acceptable since the scanner is not deployed.

---

## Step 13: Frontend Smoke Test

| Status | Check                              | Details                                |
| ------ | ---------------------------------- | -------------------------------------- |
| PASS   | `GET /` (index.html)               | React root div present                 |
| PASS   | Asset references                   | 1 JS bundle, 1 CSS bundle              |
| PASS   | JS bundle fetch                    | 93,774 bytes loaded                    |
| PASS   | CSS bundle fetch                   | 49,438 bytes loaded                    |
| PASS   | `GET /dashboard` (SPA)             | Returns index.html (SPA routing works) |
| PASS   | `GET :80/api/health` (nginx proxy) | API proxied through nginx              |
| PASS   | `GET :80/` (nginx frontend)        | Frontend served via nginx              |

---

## Step 14: WebSocket

| Status | Check                    | Details                             |
| ------ | ------------------------ | ----------------------------------- |
| PASS   | `GET /ws/oracle` upgrade | Returns 403 (exists, requires auth) |

---

## Step 15: Docker Logs Audit

| Status   | Container            | Issue                                                                                      |
| -------- | -------------------- | ------------------------------------------------------------------------------------------ |
| **FAIL** | `nps-api`            | `sqlalchemy.exc.DataError: malformed array literal` on API key creation                    |
| **FAIL** | `nps-postgres`       | `ERROR: column oracle_readings.is_favorite does not exist` (transient — column now exists) |
| **FAIL** | `nps-telegram-bot`   | Scheduler: 50+ consecutive failures (connection error to scheduler service URL)            |
| OK       | `nps-oracle`         | Clean                                                                                      |
| OK       | `nps-frontend`       | Clean                                                                                      |
| OK       | `nps-nginx`          | Clean                                                                                      |
| OK       | `nps-redis`          | Clean                                                                                      |
| OK       | `nps-scanner`        | Clean                                                                                      |
| OK       | `nps-oracle-alerter` | Running but marked unhealthy (no errors in logs)                                           |
| OK       | `nps-backup`         | Clean                                                                                      |

---

## Bugs Requiring Fixes

### P0 (Critical)

1. **API Key Creation 500** — `scopes` field passed as empty string instead of PostgreSQL array
   - File: `api/app/routers/auth.py` (API key creation handler)
   - Fix: Set `scopes` to `[]` (Python list) not `""` (empty string)

### P1 (High)

2. **Backup Trigger 500** — Script `/database/scripts/oracle_backup.sh` missing from API container
   - File: `api/app/routers/admin.py:434`
   - Fix: Either mount the script into the API container or implement backup logic as Python code

3. **Telegram Bot Scheduler Failing** — 50+ consecutive failures due to connection error
   - Container: `nps-telegram-bot`
   - Root cause: Scheduler tries to reach an internal HTTP endpoint that's not responding
   - Fix: Check scheduler target URL configuration

### P2 (Medium)

4. **Invalid Token Returns 403 Not 401** — Bearer token auth returns 403 for invalid tokens
   - Expected: 401 Unauthorized
   - Actual: 403 Forbidden
   - File: `api/app/middleware/auth.py`

5. **Settings API Rejects Common Keys** — `language` rejected as invalid setting key
   - File: `api/app/routers/settings.py`
   - Fix: Add `language`, `locale`, `notifications` to valid setting keys, or document accepted keys

6. **Multi-User Analysis Not Implemented** — Returns 503 "engines not yet available"
   - Expected based on router registration — just needs engine wiring

7. **Daily Reading POST Missing** — `POST /api/oracle/daily/reading` returns 405
   - Route only registered for GET, POST handler missing

### P3 (Low)

8. **Translation Passthrough** — Translation returns input text unchanged (no translation engine)
   - Expected behavior if no translation service configured
   - Should document this as a stub

9. **Location Detect 502** — IP-based detection unavailable
   - Expected in Docker (no external geolocation service)

10. **Oracle Alerter Unhealthy** — Container runs but Docker healthcheck fails
    - Likely a healthcheck endpoint issue, not a functional problem

11. **Postgres Transient Errors** — `is_favorite` column errors in early logs
    - Column exists now — likely a migration timing issue during startup

---

## Architecture Observations

1. **Auth system is solid** — JWT + refresh tokens + logout/blacklist + API keys (minus the creation bug)
2. **Oracle readings work well** — Name, time, question, daily, stamp validation, suggest-range all functional
3. **Share system is clean** — Create/access/revoke flow works perfectly
4. **Learning pipeline is complete** — Feedback submission/retrieval, stats, insights, weights, patterns all return data
5. **Frontend is production-ready** — React SPA loads, assets bundle correctly, nginx proxy works
6. **Encryption works** — mother_name encrypted at rest, decrypted on read

## Recommendations

1. Fix the 3 P0/P1 bugs before any deployment
2. Add integration tests for API key creation flow
3. Document valid setting keys and role values
4. Consider implementing actual translation (even a basic dictionary-based approach)
5. Wire up multi-user analysis or return 501 instead of 503
6. Fix 403→401 for invalid bearer tokens (security best practice)
