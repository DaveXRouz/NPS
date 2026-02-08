# NPS V4 Integration Status Report

**Session:** INTEGRATION-S1 (Layer Stitching)
**Date:** 2026-02-08

---

## Working Connections

| Connection                            | Status  | Notes                                                           |
| ------------------------------------- | ------- | --------------------------------------------------------------- |
| PostgreSQL <-> API (SQLAlchemy)       | Working | pool_pre_ping=True, verified via SELECT 1                       |
| API <-> V3 Oracle engines             | Working | Direct import via sys.path shim                                 |
| API auth (JWT + API key + legacy)     | Working | Legacy Bearer <API_SECRET_KEY> grants admin                     |
| Encryption at rest (AES-256-GCM)      | Working | Transparent encrypt/decrypt on oracle_users.mother_name         |
| Redis connection                      | Working | Graceful fallback if unavailable                                |
| Frontend Oracle page <-> real API     | Working | Switched from mockOracleUsers to real oracleUsers               |
| Health check (real connection status) | Working | DB check, Redis check, scanner=not_deployed, oracle=direct_mode |
| CORS (localhost:5173, localhost:3000) | Working | Configured in FastAPI middleware                                |
| API Swagger UI (/docs)                | Working | Auto-generated from FastAPI                                     |

## Known Gaps (for Session 16)

| Feature                      | Status                                                | Priority     |
| ---------------------------- | ----------------------------------------------------- | ------------ |
| Scanner service (Rust)       | Not built (stub)                                      | P1 - Phase 4 |
| Scanner API endpoints        | Return 501                                            | P1           |
| Vault API endpoints          | Stubs                                                 | P2           |
| Learning API endpoints       | Stubs                                                 | P2           |
| Frontend pages beyond Oracle | Stubs (Dashboard, Scanner, Vault, Learning, Settings) | P2           |
| API <-> Oracle via gRPC      | Skipped (using direct imports)                        | P3           |
| WebSocket events             | Not tested                                            | P2           |
| Redis caching                | Connected but unused                                  | P3           |
| V3 data migration            | Script exists but untested                            | P3           |
| Multi-user reading E2E       | Tested at unit level, not integration                 | P2           |

## Performance Baseline

See `performance_baseline.json` for measured timings.

**Targets:**

- User CRUD operations: < 500ms
- Oracle reading computation: < 5000ms
- Data retrieval: < 200ms

## Architecture Diagram (Current State)

```
Browser (localhost:5173)
  |
  | Vite proxy /api -> :8000
  v
FastAPI API (:8000)
  |
  |-- SQLAlchemy --> PostgreSQL (:5432)
  |-- redis.asyncio --> Redis (:6379) [optional]
  |-- sys.path shim --> V3 Oracle engines (direct import)
  |     |-- engines/fc60.py
  |     |-- engines/numerology.py
  |     |-- engines/oracle.py
  |     |-- logic/timing_advisor.py
  |     |-- engines/multi_user_service.py
  |     |-- engines/ai_interpreter.py
  |
  |-- Auth middleware (JWT / API key / legacy fallback)
  |-- Encryption service (AES-256-GCM, ENC4: prefix)
  |-- Audit logging (oracle_audit_log table)
  |
  X-- Scanner gRPC (not deployed)
  X-- Oracle gRPC (using direct imports instead)
```

## How to Run Integration Tests

```bash
# 1. Start infrastructure
cd v4 && docker compose up -d postgres redis

# 2. Validate environment
cd v4 && python3 integration/scripts/validate_env.py

# 3. Start API server
cd v4/api && uvicorn app.main:app --reload --port 8000

# 4. Run tests
cd v4 && python3 -m pytest integration/tests/ -v -s

# 5. (Optional) Start frontend
cd v4/frontend && npm run dev
# Open http://localhost:5173
```

## Session 16 Priorities

1. **Vault + Learning endpoints** — Wire up remaining API stubs
2. **WebSocket integration** — Test real-time events from API
3. **Frontend remaining pages** — Connect Dashboard, Scanner, Vault, Learning, Settings
4. **Multi-user reading E2E** — Full flow through API
5. **Load testing** — Concurrent users, connection pool sizing
