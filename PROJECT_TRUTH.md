# PROJECT TRUTH

> Single source of truth. Last updated: 2026-02-19. Replaces all previous tracking files.
> Do NOT modify this file directly — update it intentionally when project state changes.

---

## 1. Project Identity

| Field    | Value                                               |
| -------- | --------------------------------------------------- |
| Name     | NPS — Numerology Puzzle Solver                      |
| Owner    | Dave (DaveXRouz)                                    |
| Repo     | https://github.com/DaveXRouz/NPS.git                |
| Live URL | https://web-production-a5179.up.railway.app         |
| Purpose  | Numerology readings and Oracle AI (Scanner removed) |
| Frontend | React 18 + TypeScript + Tailwind + Vite             |
| API      | FastAPI + Python 3.11+                              |
| Database | PostgreSQL 15                                       |
| Backend  | Python Oracle (Anthropic AI)                        |
| i18n     | English + Persian (RTL)                             |

---

## 2. Current State

| Layer                 | What's Built                                            | Status      |
| --------------------- | ------------------------------------------------------- | ----------- |
| Frontend (React)      | 6 pages, 15 Oracle components, RTL/Persian, dark mode   | ✅ Complete |
| API (FastAPI)         | 14 routers, 46+ endpoints, JWT + API key auth           | ✅ Complete |
| Oracle (Python)       | FC60 engine, 5 reading types, AI via Anthropic SDK      | ✅ Complete |
| Database (PostgreSQL) | 15 tables, 37+ indexes, idempotent init.sql             | ✅ Complete |
| Scanner (Rust)        | Fully removed — all artifacts deleted                   | ✅ Removed  |
| Infrastructure        | Docker Compose 6 containers, Nginx, Prometheus          | ✅ Complete |
| Deployment            | Railway: web service + managed PostgreSQL               | ✅ Live     |
| Tests                 | 1,556 passing (581 API + 300 Oracle + 675 Frontend)     | ✅ Passing  |
| Security              | AES-256-GCM, JWT, API keys, security headers middleware | ✅ Hardened |
| Redis                 | Not deployed — graceful in-memory fallback active       | ⚠️ Bypassed |
| Oracle gRPC           | Not deployed on Railway — direct mode (legacy imports)  | ⚠️ Bypassed |
| Telegram Bot          | Disabled — no bot token configured                      | ⚠️ Disabled |

---

## 3. Known Issues

| Priority | Issue                                | Details                                                                                                                                                                                                |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0       | —                                    | No P0 issues. All critical bugs fixed as of 2026-02-17.                                                                                                                                                |
| P1       | Oracle alerter container healthcheck | `docker-compose.yml:246` uses `pgrep -f oracle_alerts` — confirm `procps` package is in the Alpine Docker image at runtime. If missing, add `RUN apk add --no-cache procps` to the alerter Dockerfile. |
| P2       | IP location detection                | Endpoint exists at `api/app/routers/location.py:106-131` but the external IP lookup service behavior is unverified in production. Test `/api/location/detect` with a real public IP.                   |
| P3       | Translation engine is a passthrough  | `api/app/routers/translation.py` exists but no real translation backend is wired. Wire LibreTranslate, DeepL, or an Anthropic-based translation call if full Persian↔English is required.              |

---

## 4. What Still Needs Work

### Not Built (features)

- **Real translation engine** — passthrough only.

### Not Deployed (infrastructure)

- **Redis** — not on Railway; app falls back to in-memory cache automatically.
- **Oracle gRPC service** — not on Railway; API uses direct Python imports (direct mode).
- **Telegram bot** — `TELEGRAM_ENABLED=false`; needs `NPS_BOT_TOKEN` and `NPS_CHAT_ID` env vars.

### Needs Runtime Verification

- IP location detection with real public IP in production.
- Oracle alerter healthcheck (`pgrep` availability in container).

---

## 5. Verification Commands

```bash
# Production health checks
curl https://web-production-a5179.up.railway.app/api/health
curl https://web-production-a5179.up.railway.app/api/health/ready

# Local test suite
cd api && python3 -m pytest tests/ -v              # 581 API tests
cd services/oracle && python3 -m pytest tests/ -v  # 300 Oracle tests
cd frontend && npm test                             # 666 Frontend tests
python3 -m pytest integration/tests/ -v -s         # Integration tests
cd frontend && npx playwright test                  # E2E tests

# Local dev startup
make up            # Start all 7 Docker containers
make dev-api       # FastAPI on :8000
make dev-frontend  # Vite on :5173

# Quality checks
make lint && make format
pip-audit          # Python vulnerability scan
npm audit          # Node vulnerability scan

# Database
docker-compose exec postgres psql -U nps -d nps
make backup
```

---

## 6. Architecture Quick Reference

```
┌─────────────────────────────────────────────┐
│  LAYER 1: FRONTEND                          │
│  React + TypeScript + Tailwind + Vite       │
│  Port: 5173 (dev) / 80 (prod nginx)        │
│  i18n: English + Persian (RTL)              │
└──────────────┬──────────────────────────────┘
               │ HTTP / WebSocket
┌──────────────▼──────────────────────────────┐
│  LAYER 2: API GATEWAY                       │
│  FastAPI + Python 3.11+                     │
│  Port: 8000 │ Docs: /docs (Swagger)        │
│  Auth: JWT + API Key + Legacy               │
└──────┬───────────────────┬──────────────────┘
       │ SQLAlchemy         │ gRPC
┌──────▼──────┐    ┌───────▼──────────────────┐
│  LAYER 4:   │    │  LAYER 3: BACKEND        │
│  DATABASE   │    │  Oracle (Python :50052)   │
│  PostgreSQL │◄───┤  AI via Anthropic API     │
│  Port: 5432 │    │                          │
└─────────────┘    └──────────────────────────┘
LAYER 5: Docker Compose (6 containers)
LAYER 6: AES-256-GCM + API keys (3-tier)
LAYER 7: JSON logging + Prometheus + Telegram alerts
```

| Layer          | Technology                        | Port             |
| -------------- | --------------------------------- | ---------------- |
| Frontend       | React 18 + TypeScript + Tailwind  | 5173 / 80 (prod) |
| API Gateway    | FastAPI + Python 3.11             | 8000             |
| Oracle Service | Python + gRPC                     | 50052            |
| Database       | PostgreSQL 15                     | 5432             |
| Cache          | Redis (optional, graceful bypass) | 6379             |
| Monitoring     | Prometheus                        | 9090             |

---

## 7. Deployment Reference

### Railway Resource IDs

| Resource          | ID                                     |
| ----------------- | -------------------------------------- |
| Project           | `d94abd6e-6a80-4376-b3f5-2f75ab4fd702` |
| Web service       | `3dd53b88-f957-4da9-821d-724899f43718` |
| Postgres service  | `efc8031a-1f0c-4a97-9f6f-9e8518aa1134` |
| Environment       | `a5a3d037-bf4c-47d2-bc42-c09abc5efc56` |
| Web domain        | `web-production-a5179.up.railway.app`  |
| Postgres internal | `postgres.railway.internal:5432`       |
| Postgres public   | `tramway.proxy.rlwy.net:55836`         |

### Required Environment Variables

| Variable              | Purpose                   | Required |
| --------------------- | ------------------------- | -------- |
| `POSTGRES_PASSWORD`   | Database password         | Yes      |
| `API_SECRET_KEY`      | JWT signing + legacy auth | Yes      |
| `NPS_ENCRYPTION_KEY`  | AES-256-GCM key (hex)     | Yes      |
| `NPS_ENCRYPTION_SALT` | Encryption salt (hex)     | Yes      |
| `ANTHROPIC_API_KEY`   | AI interpretations        | Optional |
| `NPS_BOT_TOKEN`       | Telegram bot token        | Optional |
| `NPS_CHAT_ID`         | Telegram chat ID          | Optional |

### Deploy Notes

- **Railway auto-deploys** on push to `main` — no manual deploy needed for code changes.
- **`railway up` (local upload) fails** on this machine due to OrbStack broken symlinks in `/Users/hamzeh/OrbStack/docker/containers/`. Use `git push` to trigger Railway auto-deploy or `railway redeploy` instead.
- **Railway template deploy does NOT auto-inject** reference variables into existing services. Must manually set `DATABASE_URL`, `PGHOST`, etc. on `web` service after adding a database.
- **Key files:** `Dockerfile.railway`, `scripts/railway-entrypoint.sh`, `railway.toml`, `api/app/config.py` (effective_database_url priority chain), `database/init.sql`

---

## 8. Rules & Forbidden Patterns

### 10 Forbidden Patterns (non-negotiable)

1. **NEVER use Claude CLI** — `subprocess`, `os.system`, shell commands for AI. Only Anthropic HTTP API.
2. **NEVER store secrets in code.** Always `.env` variables.
3. **NEVER use bare `except:` in Python.** Catch specific exceptions.
4. **NEVER use `.unwrap()` in Rust production code.** Use `Result<T,E>`.
5. **NEVER use `any` type in TypeScript.** Define proper interfaces.
6. **NEVER hardcode file paths.** Use `Path(__file__).resolve().parents[N]`.
7. **NEVER skip tests.** Every change gets tested before commit.
8. **NEVER modify `.archive/` folder.** Read-only reference.
9. **NEVER commit `.env` files.** Only `.env.example`.
10. **NEVER say "done" without proof.** Tests pass + verification output.

### 10 Architecture Rules (non-negotiable)

1. **API is the gateway** — Frontend/Telegram only talk to FastAPI. Never directly to gRPC services.
2. **AI uses API only** — Anthropic Python SDK, HTTP calls. Never CLI.
3. **Proto contracts are source of truth** — `oracle.proto` defines the gRPC interface.
4. **Scoring consistency** — Engine outputs must be deterministic for same input.
5. **Legacy engines are reference** — `.archive/v3/engines/` is the math baseline. New code must match outputs.
6. **Environment over config files** — `.env` only. Not `config.json`.
7. **AES-256-GCM encryption** — `ENC4:` prefix (current). `ENC:` fallback for legacy migration only.
8. **Layer separation** — No shortcuts. Frontend→API→Service→Database.
9. **Persian UTF-8** — All text supports Persian. RTL when locale is FA.
10. **Graceful degradation** — Missing API key = fallback text, not crash. Missing Redis = in-memory.
