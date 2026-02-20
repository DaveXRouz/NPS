# CURRENT STATE — Full NPS Project Audit

> Single source of truth + complete reference map. Last updated: 2026-02-20.
> Do NOT modify this file casually — update it intentionally when project state changes.

---

## 1. Project Identity

| Field    | Value                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| Name     | NPS — Numerology Puzzle Solver v4.0.0                                                                           |
| Owner    | Dave (DaveXRouz)                                                                                                |
| Repo     | https://github.com/DaveXRouz/NPS.git                                                                            |
| Live URL | https://web-production-a5179.up.railway.app                                                                     |
| Purpose  | Bitcoin wallet hunting via Oracle numerology/AI analysis                                                        |
| Stack    | React + TypeScript + Tailwind \| FastAPI + Python \| PostgreSQL + Redis \| gRPC Oracle \| Docker (9 containers) |
| Status   | All 45 development sessions complete. Deployed on Railway.                                                      |

---

## 2. Layer Map

| Layer          | Tech                          | Port                   | Location                |
| -------------- | ----------------------------- | ---------------------- | ----------------------- |
| Frontend       | React 18 + Vite + Tailwind    | 5173 (dev) / 80 (prod) | `frontend/`             |
| API Gateway    | FastAPI + SQLAlchemy          | 8000                   | `api/`                  |
| Oracle Service | Python gRPC + Anthropic AI    | 50052 + 9090           | `services/oracle/`      |
| Database       | PostgreSQL 15                 | 5432                   | `database/`             |
| Cache          | Redis 7                       | 6379                   | (docker)                |
| Reverse Proxy  | Nginx 1.25                    | 80, 443                | `infrastructure/nginx/` |
| Telegram Bot   | Python                        | internal               | `services/tgbot/`       |
| Monitoring     | Prometheus + custom dashboard | 9000, 9090             | `devops/`               |
| Backup         | PostgreSQL pg_dump + cron     | internal               | `scripts/`              |

---

## 3. Current State

| Layer                 | What's Built                                               | Status   |
| --------------------- | ---------------------------------------------------------- | -------- |
| Frontend (React)      | 85+ components, 10 pages, 18 hooks, RTL/Persian, dark mode | Complete |
| API (FastAPI)         | 11 routers, ~95 endpoints, JWT + API key auth              | Complete |
| Oracle (Python)       | FC60 engine, 5 reading types, AI via Anthropic SDK         | Complete |
| Database (PostgreSQL) | 13 tables, 21 migrations, idempotent init.sql              | Complete |
| Infrastructure        | Docker Compose 9 containers, Nginx, Prometheus             | Complete |
| Deployment            | Railway: web service + managed PostgreSQL                  | Live     |
| Tests                 | 200+ across all layers (Vitest, Playwright, Pytest)        | Passing  |
| Security              | AES-256-GCM, JWT, API keys, security headers middleware    | Hardened |
| Redis                 | Not deployed — graceful in-memory fallback active          | Bypassed |
| Oracle gRPC           | Not deployed on Railway — direct mode (legacy imports)     | Bypassed |
| Telegram Bot          | Disabled — no bot token configured                         | Disabled |

---

## 4. Known Issues

| Priority | Issue                                | Details                                                                                                                                                                            |
| -------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | —                                    | No P0 issues. All critical bugs fixed as of 2026-02-20.                                                                                                                            |
| P1       | Oracle alerter container healthcheck | `docker-compose.yml:246` uses `pgrep -f oracle_alerts` — confirm `procps` package is in the Alpine Docker image. If missing, add `RUN apk add --no-cache procps`.                  |
| P2       | IP location detection                | Endpoint at `api/app/routers/location.py:106-131` but external IP lookup unverified in production. Test `/api/location/detect` with a real public IP.                              |
| P3       | Translation engine is a passthrough  | `api/app/routers/translation.py` exists but no real translation backend is wired. Wire LibreTranslate, DeepL, or Anthropic-based translation if full Persian<>English is required. |
| Info     | 3 AdminMonitoring test failures      | Tests check for `bg-blue-600` but component uses CSS variables now. Pre-existing, not caused by recent changes.                                                                    |
| Info     | Keys in git history                  | .env files are excluded via .gitignore. But ANTHROPIC_API_KEY, NPS_BOT_TOKEN, API_SECRET_KEY still in git HISTORY — need rotation.                                                 |

---

## 5. Frontend (`frontend/`)

### Key Stats

- **85+ React components**, 10 pages, 18 custom hooks, 9 utilities
- **i18n:** English + Persian (RTL), 2 locale files (~20KB each)
- **Routing:** React Router v6, lazy-loaded, error-bounded
- **State:** React Query (TanStack), no Redux
- **Tests:** 70+ unit (Vitest) + 14 E2E suites (Playwright)

### Pages & Routes

```
/ → /dashboard (redirect)
/dashboard        → Dashboard (stats, recent readings, moon phase, quick actions)
/oracle           → Oracle consultation (time/name/question/daily/multi-user readings)
/history          → Reading history with search/filters
/settings         → User preferences (profile, language, theme, API keys)
/share/:token     → Public shared reading (no auth)
/admin/*          → Admin panel (guarded)
  /admin/users        → User management
  /admin/profiles     → Profile management
  /admin/monitoring   → System health
  /admin/backups      → Backup manager
```

### Component Groups

- **Layout:** Layout, Navigation, MobileNav, LanguageToggle, ThemeToggle, SkipNavLink
- **Common (14):** ErrorBoundary, Toast, Modal, LoadingSkeleton, animations (FadeIn, SlideIn, etc.)
- **Dashboard (6):** DailyReadingCard, MoonPhaseWidget, QuickActions, RecentReadings, StatsCards, WelcomeBanner
- **Oracle (45+):** Input forms (Time, Name, Question, MultiUser), results display (Summary, Details, FC60Stamp, Numerology, Ganzhi, MoonPhase), utilities (StarRating, ConfidenceMeter, ExportButton, ShareButton)
- **Admin (10):** AdminGuard, HealthDashboard, BackupManager, LogViewer, AnalyticsCharts, user/profile tables
- **Settings (6):** Profile, Preferences, OracleSettings, ApiKey, About sections

### Tailwind Color System

Nested under `nps.*` in `tailwind.config.ts`:

- `nps.bg.*` (button, card, input, hover, sidebar, danger, success)
- `nps.border`, `nps.text.*` (default, dim, bright)
- `nps.accent.*`, `nps.error` (#f85149), `nps.warning`, `nps.success`
- `nps.score.*` (low/mid/high/peak), `nps.ai.*`, `nps.oracle.*`
- Usage: `bg-nps-bg-button`, `text-nps-error` (NOT `bg-nps-button`)

### Key Dependencies

react 18.3, react-router-dom 6.22, @tanstack/react-query 5.90, i18next 23.8, jalaali-js 1.2.8, jspdf 4.1, recharts 3.7, lucide-react 0.574

---

## 6. API Gateway (`api/`)

### Key Stats

- **11 routers**, ~95 endpoints, 17 Pydantic model files, 13 ORM models
- **4 middleware:** auth (JWT + API key + legacy), rate limit, security headers, cache
- **8 service modules:** oracle reading orchestration, encryption, audit, translation, location, admin, notifications, WebSocket
- **50+ test files**

### Endpoint Summary

| Router      | Prefix             | Key Endpoints                                                                                                         |
| ----------- | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| health      | `/api/health`      | status, ready, performance, detailed, logs, analytics                                                                 |
| auth        | `/api/auth`        | login, register, refresh, logout, change-password, api-keys CRUD                                                      |
| users       | `/api/users`       | CRUD, password reset, role changes                                                                                    |
| oracle      | `/api/oracle`      | user CRUD + 6 reading types (time, name, question, daily, multi-user, framework) + history + stats + stamp validation |
| learning    | `/api/learning`    | stats, insights, analyze, weights, patterns, feedback                                                                 |
| vault       | `/api/vault`       | findings, summary, search, export                                                                                     |
| share       | `/api/share`       | create/get/revoke share links                                                                                         |
| telegram    | `/api/telegram`    | link/unlink, daily preferences, admin stats                                                                           |
| translation | `/api/translation` | translate text/reading, languages, locales                                                                            |
| location    | `/api/location`    | detect, countries, cities, timezone                                                                                   |
| settings    | `/api/settings`    | get/update user settings                                                                                              |
| admin       | `/api/admin`       | users, stats, backup/restore, audit logs, health monitoring, config                                                   |

### Auth System

- **JWT tokens** for session auth (login/register)
- **API keys** (SHA-256 hashed in DB) for programmatic access
- **Legacy auth:** `Bearer <API_SECRET_KEY>` — frontend uses this (VITE_API_KEY = API_SECRET_KEY)
- **Scopes:** admin, moderator, user

### Database Tables (13)

| Table                        | Purpose                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `users`                      | System accounts (admin/mod/user)                                              |
| `oracle_users`               | Oracle profiles (name, birthday, mother name, location, timezone, heart rate) |
| `oracle_readings`            | Reading results (FC60, AI interpretation, framework data)                     |
| `oracle_reading_users`       | Junction for multi-user readings                                              |
| `oracle_daily_readings`      | Daily cache (user_id + date -> reading_id)                                    |
| `oracle_feedback`            | User feedback for learning                                                    |
| `oracle_settings`            | Per-user preferences                                                          |
| `api_keys`                   | API key storage (hashed)                                                      |
| `oracle_audit_log`           | Security event trail                                                          |
| `share_links`                | Shareable reading tokens                                                      |
| `telegram_links`             | Telegram chat mappings                                                        |
| `telegram_daily_preferences` | Daily delivery config                                                         |
| `user_settings`              | User preferences                                                              |

### Database Migrations

21 SQL files in `database/migrations/` covering schema evolution from initial setup through performance indexes.

---

## 7. Oracle Service (`services/oracle/`)

### Key Stats

- **gRPC server** with 8 RPC methods
- **23+ engine files** covering numerology, FC60, zodiac, AI, timing, learning
- **17 test files**

### gRPC RPCs

| RPC                  | Purpose                                                            |
| -------------------- | ------------------------------------------------------------------ |
| `GetReading`         | Time-based reading (FC60 + numerology + zodiac + Chinese calendar) |
| `GetNameReading`     | Name numerology (destiny, soul urge, personality)                  |
| `GetQuestionSign`    | Yes/no question with numerological sign                            |
| `GetDailyInsight`    | Daily numerology + lucky numbers                                   |
| `SuggestRange`       | Bitcoin key range suggestions (AI learning)                        |
| `AnalyzeSession`     | Reading session analysis                                           |
| `GetTimingAlignment` | Cosmic timing quality + optimal hours                              |
| `HealthCheck`        | Service health                                                     |

### Core Modules

| Module                    | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `framework_bridge.py`     | Wraps legacy V3 engines as pure computation                    |
| `reading_orchestrator.py` | Pipeline: request -> framework -> AI -> response               |
| `ai_interpreter.py`       | Formats AI reading output (header, identity, patterns, advice) |
| `ai_client.py`            | Anthropic API integration (streaming + non-streaming)          |
| `oracle.py`               | Multi-system sign reader (23 functions)                        |
| `timing_advisor.py`       | Moon phase + numerological timing optimization                 |
| `multi_user_analyzer.py`  | Compatibility scoring                                          |
| `question_analyzer.py`    | Question classification                                        |
| `learner.py`              | Learning from feedback, weight adjustment                      |
| `daily_scheduler.py`      | Scheduled daily reading generation                             |
| `prompt_templates.py`     | AI prompt templates                                            |

### Data Models (`models/reading_types.py`)

- `UserProfile` — user_id, name, birth data, location, heart rate, numerology system
- `ReadingRequest` — user + reading_type + target_date
- `ReadingResult` — framework output + confidence + daily insights
- `CompatibilityResult` — life path, element, animal, moon scores
- `ReadingType` enum — TIME, NAME, QUESTION, DAILY, MULTI_USER

---

## 8. Infrastructure & DevOps

### Docker Stack (9 containers in `docker-compose.yml`)

frontend, api, oracle-service, postgres, redis, nginx, telegram-bot, oracle-alerter, backup

**Resource limits:** API/Oracle get 1 CPU + 1GB RAM; Postgres 1 CPU + 1GB; Redis 0.5 CPU + 512MB; Frontend/Nginx lighter

### Monitoring (`devops/`)

- **Structured JSON logging** with rotating file handlers
- **RPC metrics collector** — per-RPC timing (p50/p95/p99)
- **HTTP sidecar** on :9090 — /health, /metrics, /ready
- **Flask dashboard** on :9000 — auto-refresh 5s
- **Telegram alerter** — CRITICAL/WARNING/INFO with 5min cooldown

### Scripts (`scripts/`)

| Script                  | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `deploy.sh`             | Build + start + health check + migrations              |
| `backup.sh`             | PostgreSQL backup with metadata JSON, 60-day retention |
| `restore.sh`            | Restore from backup (with confirmation)                |
| `rollback.sh`           | Find latest backup + restore                           |
| `health-check.sh`       | Check all docker services                              |
| `validate_env.py`       | Full .env validation (403 lines)                       |
| `railway-entrypoint.sh` | Railway: wait for PG, init schema, start uvicorn       |
| `launcher.sh`           | macOS: kill old, start API + frontend, open browser    |

---

## 9. Deployment Reference

### Railway Config

- `Dockerfile.railway` + `railway.toml`
- PYTHONPATH="/services/oracle:/services/oracle/oracle_service:/:/app"
- Entrypoint waits for Postgres, runs schema init, starts uvicorn

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

| Variable              | Purpose                       | Required |
| --------------------- | ----------------------------- | -------- |
| `POSTGRES_PASSWORD`   | Database password             | Yes      |
| `API_SECRET_KEY`      | JWT signing + legacy auth     | Yes      |
| `NPS_ENCRYPTION_KEY`  | AES-256-GCM key (64-char hex) | Yes      |
| `NPS_ENCRYPTION_SALT` | Encryption salt (32-char hex) | Yes      |
| `ANTHROPIC_API_KEY`   | AI interpretations            | Optional |
| `NPS_BOT_TOKEN`       | Telegram bot token            | Optional |
| `NPS_CHAT_ID`         | Telegram chat ID              | Optional |

96 total env vars defined in `.env.example`.

### Deploy Notes

- **Railway auto-deploys** on push to `main` — no manual deploy needed for code changes.
- **`railway up` (local upload) fails** on this machine due to OrbStack broken symlinks in `/Users/hamzeh/OrbStack/docker/containers/`. Use `git push` to trigger Railway auto-deploy or `railway redeploy` instead.
- **Railway template deploy does NOT auto-inject** reference variables into existing services. Must manually set `DATABASE_URL`, `PGHOST`, etc. on `web` service after adding a database.
- **Key files:** `Dockerfile.railway`, `scripts/railway-entrypoint.sh`, `railway.toml`, `api/app/config.py` (effective_database_url priority chain), `database/init.sql`

---

## 10. Testing

| Layer         | Framework  | Count     | Location                                   |
| ------------- | ---------- | --------- | ------------------------------------------ |
| Frontend Unit | Vitest     | 70+       | `frontend/src/__tests__/` + component dirs |
| Frontend E2E  | Playwright | 14 suites | `frontend/e2e/`                            |
| API           | Pytest     | 50+       | `api/tests/`                               |
| Oracle        | Pytest     | 17        | `services/oracle/oracle_service/tests/`    |
| Integration   | Pytest     | 56+       | `integration/tests/`                       |
| DevOps        | Pytest     | 28+       | `devops/tests/`                            |

### Known Test Issues

- 3 AdminMonitoring tests check for `bg-blue-600` but component now uses CSS variables (pre-existing, not caused by recent changes)

---

## 11. Security Posture

- **Encryption:** AES-256-GCM, `ENC4:` prefix, keys via env vars
- **Auth:** JWT + API keys (SHA-256 hashed) + legacy Bearer token
- **Audit:** All security events logged to `oracle_audit_log`
- **Headers:** CSP, X-Frame-Options, HSTS via Nginx + middleware
- **Rate limiting:** IP-based (API: 30r/s, Auth: 5r/s)
- **.env not tracked** — .gitignore excludes both root and frontend .env
- **Known issue:** Keys still in git HISTORY need rotation (ANTHROPIC_API_KEY, NPS_BOT_TOKEN, API_SECRET_KEY)

---

## 12. Documentation Files

| File                              | Purpose                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `CLAUDE.md`                       | Project brain (boot sequence, rules, architecture)               |
| `BUILD_HISTORY.md`                | Development log + changelog                                      |
| `CURRENT_STATE.md`                | This file — full project audit                                   |
| `.claude/startup.md`              | Boot protocol                                                    |
| `.claude/workflows.md`            | Plan template + quality checklist                                |
| `.claude/templates.md`            | File creation templates                                          |
| `logic/FC60_ALGORITHM.md`         | FC60 math + test vectors                                         |
| `logic/NUMEROLOGY_SYSTEMS.md`     | Pythagorean + Chaldean + Abjad                                   |
| `logic/ARCHITECTURE_DECISIONS.md` | 9 key decisions                                                  |
| `docs/` (15+ files)               | Error recovery, deployment, encryption spec, API reference, etc. |

---

## 13. Archive (`.archive/` — READ-ONLY)

| Version | Content                                                                         |
| ------- | ------------------------------------------------------------------------------- |
| V1      | 3 Python files (minimal)                                                        |
| V2      | Full GUI app (tkinter), 8 engines, 7 solvers, 16 tests, AI cache — .gitignore-d |
| V3      | Python monolith, 6 engines, 4 solvers, 23 tests — active reference baseline     |

---

## 14. What Still Needs Work

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

## 15. Architecture Diagram

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
       │ SQLAlchemy         │ gRPC / direct import
┌──────▼──────┐    ┌───────▼──────────────────┐
│  LAYER 4:   │    │  LAYER 3: BACKEND        │
│  DATABASE   │    │  Oracle (Python :50052)   │
│  PostgreSQL │◄───┤  AI via Anthropic API     │
│  Port: 5432 │    │                          │
└─────────────┘    └──────────────────────────┘

LAYER 5: Docker Compose (9 containers)
LAYER 6: AES-256-GCM + API keys (3-tier)
LAYER 7: JSON logging + Prometheus + Telegram alerts
```

---

## 16. Quick Reference Commands

```bash
# Production health checks
curl https://web-production-a5179.up.railway.app/api/health
curl https://web-production-a5179.up.railway.app/api/health/ready

# Local services
make up                  # Start all Docker services
make dev-api             # FastAPI on :8000
make dev-frontend        # Vite on :5173

# Tests
cd api && python3 -m pytest tests/ -v
cd services/oracle && python3 -m pytest tests/ -v
cd frontend && npm test
python3 -m pytest integration/tests/ -v -s
cd frontend && npx playwright test

# Quality
make lint && make format
pip-audit                # Python vulnerability scan
npm audit                # Node vulnerability scan

# Database
docker-compose exec postgres psql -U nps -d nps
make backup / restore
make proto               # Regenerate gRPC stubs
```
