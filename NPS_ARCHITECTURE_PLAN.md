# NPS Architecture Plan

> Comprehensive architecture reference for the Numerology Puzzle Solver system.
> This document describes the actual project state using real data from the codebase.
> Use this as authoritative context when writing session specs, designing features, or onboarding.

---

## 1. Vision

NPS is a numerology-powered puzzle-solving system built around two collaborating services: **Scanner** and **Oracle**.

**Scanner** is a high-performance Rust service that generates cryptographic keys at scale, checks wallet balances across blockchains, and stores findings. It is fast but undirected — it scans randomly unless given guidance.

**Oracle** is a Python-based analytical engine that combines FC60 (FrankenChron-60) base-60 chronological encoding, three numerology systems (Pythagorean, Chaldean, Abjad), zodiac/Chinese calendar analysis, and AI interpretation via the Anthropic API. It studies patterns in past findings and generates "lucky range" suggestions with confidence scores.

**The self-improving loop:**

```
Scanner generates keys → checks balances → stores findings in PostgreSQL
    ↓
Oracle analyzes patterns → FC60 tokens, numerology, time correlations, moon phases
    ↓
Oracle suggests optimal ranges → confidence scores → oracle_suggestions table
    ↓
Scanner reads suggestions → allocates ~30% of scan budget to Oracle-guided ranges
    ↓
AI learns from outcomes → adjusts weights → learning_patterns
    ↓
REPEAT — each cycle makes both services smarter
```

The system also serves a user-facing Oracle consultation interface through a React frontend, supporting both English and Persian (Farsi) with full RTL layout. Users can request readings based on time, name, questions, daily insights, and multi-user compatibility analysis.

**Design philosophy:** Swiss watch — simple surface, sophisticated internals. Graceful degradation at every layer (missing API key = fallback text, not crash; missing Redis = in-memory cache).

---

## 2. Architecture Overview

### 7-Layer System

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: FRONTEND                                      │
│  React 18.3 + TypeScript 5.3 + Tailwind 3.4 + Vite 5.1 │
│  Port: 5173 (dev) / 80 (prod via nginx)                 │
│  i18n: English + Persian (RTL) via react-i18next         │
│  66 source files (TS + TSX)                              │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP / WebSocket
┌────────────────────▼────────────────────────────────────┐
│  LAYER 2: API GATEWAY                                   │
│  FastAPI 0.109+ / Python 3.11+ / Pydantic 2.5+         │
│  Port: 8000 │ Docs: /docs (Swagger auto-generated)     │
│  Auth: JWT + API Key + Legacy │ 8 routers, 46 endpoints │
│  55 Python source files                                  │
└────────┬────────────────────────────┬───────────────────┘
         │ SQLAlchemy 2.0+            │ gRPC (tonic/grpcio)
┌────────▼──────────┐    ┌───────────▼───────────────────┐
│  LAYER 4:         │    │  LAYER 3: BACKEND SERVICES     │
│  DATABASE         │    │                                │
│  PostgreSQL 15    │    │  Oracle (Python :50052)        │
│  Port: 5432       │◄───┤    32 engine files              │
│  18 tables        │    │    FC60 + numerology + AI       │
│  37+ indexes      │    │                                │
│  3 triggers       │    │  Scanner (Rust :50051)         │
│  2 extensions     │    │    7 source files (stub)        │
│                   │    │    secp256k1 + tonic gRPC       │
└───────────────────┘    └───────────────────────────────┘

LAYER 5: INFRASTRUCTURE
  Docker Compose (8 containers) + nginx 1.25 reverse proxy
  Redis 7 (cache + pub/sub) + 3 named volumes

LAYER 6: SECURITY
  AES-256-GCM encryption (ENC4: prefix)
  3-tier API keys (admin / moderator / user)
  SHA-256 hashed keys in DB, bcrypt passwords
  Audit logging to oracle_audit_log table

LAYER 7: OBSERVABILITY
  JSON structured logging + Prometheus metrics
  Telegram alerter + Flask monitoring dashboard
  Health checks on all containers
```

### Gateway Rule (Non-Negotiable)

All external communication flows through the API gateway. The frontend and Telegram bot talk **only** to FastAPI. They never connect directly to Oracle or Scanner gRPC services.

```
Frontend ──HTTP──► API Gateway ──gRPC──► Oracle Service
                                   └──gRPC──► Scanner Service
Telegram Bot ──HTTP──► API Gateway
```

---

## 3. Layer Details

### Layer 1: Frontend

| Property     | Value                                               |
| ------------ | --------------------------------------------------- |
| Framework    | React 18.3 + TypeScript 5.3                         |
| Build tool   | Vite 5.1                                            |
| Styling      | Tailwind CSS 3.4                                    |
| Routing      | react-router-dom 6.22                               |
| State        | TanStack React Query 5.90                           |
| i18n         | i18next 23.8 + react-i18next 14.0                   |
| Calendar     | jalaali-js 1.2.8 (Jalali/Solar Hijri)               |
| Testing      | Vitest 1.3 + Playwright 1.41 + Testing Library 14.2 |
| Source files | 49 TSX + 17 TS (66 total)                           |
| Dev port     | 5173                                                |
| Prod port    | 80 (nginx)                                          |

**Pages (6):**

- `Dashboard.tsx` — system overview
- `Oracle.tsx` — consultation interface
- `Scanner.tsx` — scan control panel
- `Vault.tsx` — findings browser
- `Learning.tsx` — AI learning progress
- `Settings.tsx` — user preferences

**Oracle Components (15):**
`CalendarPicker`, `DetailsTab`, `ExportButton`, `LocationSelector`, `MultiUserSelector`, `OracleConsultationForm`, `PersianKeyboard`, `ReadingHistory`, `ReadingResults`, `SignTypeSelector`, `SummaryTab`, `TranslatedReading`, `UserChip`, `UserForm`, `UserSelector`

### Layer 2: API Gateway

| Property    | Value                                |
| ----------- | ------------------------------------ |
| Framework   | FastAPI 0.109+                       |
| Runtime     | Python 3.11+ / uvicorn 0.27+         |
| Validation  | Pydantic 2.5+                        |
| ORM         | SQLAlchemy 2.0.25+ / Alembic 1.13+   |
| Auth        | python-jose (JWT) + passlib (bcrypt) |
| gRPC client | grpcio 1.60+                         |
| HTTP client | httpx 0.26+                          |
| Encryption  | cryptography 41.0+ (AES-256-GCM)     |
| Caching     | Redis 5.0+ (via redis-py)            |
| Port        | 8000                                 |

**8 Routers:**
| Router | Purpose |
|--------|---------|
| `auth.py` | JWT login, API key management, legacy auth |
| `oracle.py` | Oracle readings, FC60, numerology endpoints |
| `scanner.py` | Scan control, session management |
| `vault.py` | Findings browser, encrypted storage |
| `learning.py` | AI learning progress, XP, insights |
| `health.py` | Health checks, system status |
| `location.py` | Geolocation, timezone resolution |
| `translation.py` | English ↔ Persian translation |

**46 endpoints** across all routers. Swagger docs auto-generated at `/docs`.

### Layer 3a: Scanner Service (Rust)

| Property     | Value                                                            |
| ------------ | ---------------------------------------------------------------- |
| Language     | Rust 2021 edition                                                |
| gRPC         | tonic 0.11 + prost 0.12                                          |
| Crypto       | secp256k1 0.28, bitcoin 0.31, bip39 2.0, sha2 0.10, ripemd 0.1   |
| Async        | tokio 1.x (full features)                                        |
| HTTP         | reqwest 0.11 (balance checking)                                  |
| Tracing      | tracing 0.1 + tracing-subscriber 0.3 (JSON)                      |
| Status       | **Stub only** — structure exists, core logic not yet implemented |
| Port         | 50051                                                            |
| Source files | 7                                                                |

**Proto contract** (`scanner.proto`): 9 RPCs — `StartScan`, `StopScan`, `PauseScan`, `ResumeScan`, `GetStats`, `SaveCheckpoint`, `ResumeFromCheckpoint`, `ListSessions`, `StreamEvents`

### Layer 3b: Oracle Service (Python)

| Property     | Value                                           |
| ------------ | ----------------------------------------------- |
| Language     | Python 3.11+                                    |
| gRPC server  | grpcio 1.60+                                    |
| AI           | Anthropic Python SDK (HTTP API only, never CLI) |
| Status       | **Being rewritten** — 45-session rebuild plan   |
| Port         | 50052 (gRPC) + 9090 (HTTP metrics)              |
| Engine files | 32                                              |

**Proto contract** (`oracle.proto`): 8 RPCs — `GetReading`, `GetNameReading`, `GetQuestionSign`, `GetDailyInsight`, `SuggestRange`, `AnalyzeSession`, `GetTimingAlignment`, `HealthCheck`

**Engine modules (32 files):**
| Category | Files |
|----------|-------|
| Core algorithms | `fc60.py`, `numerology.py`, `math_analysis.py`, `scoring.py` |
| AI system | `ai_client.py`, `ai_engine.py`, `ai_interpreter.py`, `prompt_templates.py` |
| Multi-user | `multi_user_fc60.py`, `multi_user_service.py`, `compatibility_analyzer.py`, `compatibility_matrices.py`, `group_dynamics.py`, `group_energy.py` |
| Learning | `learner.py`, `learning.py`, `memory.py` |
| Scanner integration | `scanner_brain.py`, `balance.py` |
| Infrastructure | `config.py`, `errors.py`, `events.py`, `health.py`, `logger.py`, `perf.py`, `security.py`, `vault.py` |
| Services | `oracle.py`, `session_manager.py`, `terminal_manager.py`, `notifier.py`, `translation_service.py` |

### Layer 4: Database

| Property   | Value                                                  |
| ---------- | ------------------------------------------------------ |
| Engine     | PostgreSQL 15 (Alpine)                                 |
| Extensions | `uuid-ossp`, `pgcrypto`                                |
| Tables     | 18                                                     |
| Indexes    | 37+ (B-tree, GIN, GiST)                                |
| Triggers   | 3 (`updated_at` on users, learning_data, oracle_users) |
| Port       | 5432                                                   |

**Table inventory:**

| Domain          | Tables                                                |
| --------------- | ----------------------------------------------------- |
| Auth & users    | `users`, `api_keys`                                   |
| Scanner         | `sessions`, `findings`                                |
| Oracle readings | `readings`, `oracle_readings`, `oracle_reading_users` |
| Oracle users    | `oracle_users`                                        |
| Oracle domain   | `oracle_suggestions`, `oracle_audit_log`              |
| Learning        | `learning_data`, `insights`                           |
| System          | `schema_migrations`, `health_checks`, `audit_log`     |

**Notable index types:**

- GIN indexes on JSONB columns (`reading_result`, `individual_results`, `compatibility_matrix`) for containment queries
- GiST index on `oracle_users.coordinates` (PostgreSQL POINT type) for spatial distance queries
- Partial index on `findings.balance` (WHERE balance > 0) for efficient wallet scanning
- DESC indexes on timestamp columns for recent-first queries

### Layer 5: Infrastructure

**Docker Compose — 8 containers:**

| Container            | Image/Build                 | Resources       | Port        |
| -------------------- | --------------------------- | --------------- | ----------- |
| `nps-frontend`       | Build: `./frontend`         | 0.5 CPU, 256MB  | 5173→80     |
| `nps-api`            | Build: `./api`              | 1 CPU, 1GB      | 8000        |
| `nps-scanner`        | Build: `./services/scanner` | 2 CPU, 2GB      | 50051       |
| `nps-oracle`         | Build: `./services/oracle`  | 1 CPU, 1GB      | 50052, 9090 |
| `nps-postgres`       | `postgres:15-alpine`        | 1 CPU, 1GB      | 5432        |
| `nps-redis`          | `redis:7-alpine`            | 0.5 CPU, 512MB  | 6379        |
| `nps-oracle-alerter` | Build: `./devops`           | 0.1 CPU, 64MB   | —           |
| `nps-nginx`          | `nginx:1.25-alpine`         | 0.25 CPU, 128MB | 80, 443     |

**3 named volumes:** `postgres_data`, `redis_data`, `oracle_logs`

All containers have health checks with configurable intervals, timeouts, start periods, and retry counts. Services declare explicit dependency ordering with `condition: service_healthy`.

### Layer 6: Security

See [Section 9: Security Model](#9-security-model) for full details.

### Layer 7: Observability

| Component     | Technology                                          | Purpose                         |
| ------------- | --------------------------------------------------- | ------------------------------- |
| Logging       | JSON structured (Python `logging` / Rust `tracing`) | Machine-parseable logs          |
| Metrics       | Prometheus endpoint (`:9090` on Oracle)             | Performance tracking            |
| Alerts        | Telegram bot (`devops/alerts/`)                     | Real-time incident notification |
| Dashboard     | Flask-based monitoring (`devops/`)                  | System health overview          |
| Health checks | Per-container Docker health checks                  | Automated restart on failure    |

---

## 4. Scanner ↔ Oracle Collaboration

### The Feedback Loop

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED PostgreSQL                          │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │vault_findings  │  │oracle_suggestions│  │learning_data │ │
│  │(Scanner writes)│  │(Oracle writes)   │  │(Oracle AI)   │ │
│  └───────┬───────┘  └────────┬─────────┘  └──────┬───────┘ │
│          │                   │                    │          │
│     Oracle reads        Scanner reads        Oracle reads   │
└──────────┼───────────────────┼────────────────────┼─────────┘
           │                   │                    │
    ┌──────▼──────┐     ┌──────▼──────┐      ┌─────▼──────┐
    │   ORACLE    │     │   SCANNER   │      │  AI LAYER  │
    │  Analyzes   │────►│  Prioritizes│      │  Adjusts   │
    │  patterns   │     │  ranges     │      │  weights   │
    └─────────────┘     └─────────────┘      └────────────┘
```

### Data Flow Tables

| Table                | Writer      | Reader            | Purpose                                     |
| -------------------- | ----------- | ----------------- | ------------------------------------------- |
| `findings` (vault)   | Scanner     | Oracle            | Raw scan results with encrypted keys        |
| `oracle_suggestions` | Oracle      | Scanner           | Suggested ranges with confidence scores     |
| `learning_data`      | Oracle (AI) | Oracle            | Accumulated learning, XP, model adjustments |
| `oracle_readings`    | Oracle      | Frontend          | User-facing reading results                 |
| `insights`           | Oracle      | Oracle + Frontend | AI-generated insights from analysis         |

### Suggestion Signals

Oracle generates range suggestions based on four signal types:

1. **FC60 patterns** — Overrepresented animals/elements in successful key addresses (base-60 token analysis)
2. **Time correlations** — Moon phase, weekday, hour-of-day at time of successful finds
3. **Numerological properties** — Digit sum distributions, master number frequency in hit addresses
4. **Range clustering** — Hex ranges with statistically more finds than expected

**Confidence formula:**

```
confidence = 0.3 × sample_size + 0.3 × significance + 0.2 × historical_accuracy + 0.2 × recency
```

### Scanner Budget Split

- **70% random scanning** — ensures full keyspace coverage with no blind spots
- **30% Oracle-guided** — exploits known patterns from Oracle suggestions

### AI Levels

| Level      | Finds Required      | Behavior                 |
| ---------- | ------------------- | ------------------------ |
| Novice     | < 1,000             | Basic pattern matching   |
| Apprentice | 1,000 – 10,000      | Statistical correlations |
| Journeyman | 10,000 – 100,000    | Multi-signal fusion      |
| Expert     | 100,000 – 1,000,000 | Advanced prediction      |
| Master     | > 1,000,000         | Full autonomous strategy |

### Current Status

- Scanner: Rust stub (structure exists, core scan logic not yet implemented)
- Oracle engines: Being rewritten in the 45-session rebuild plan
- Database: Schema fully defined, no production data yet
- Full loop: Not operational until both Scanner and Oracle are complete

---

## 5. Project Structure

```
NPS/
├── CLAUDE.md                     ← Project brain (Claude Code instructions)
├── NPS_ARCHITECTURE_PLAN.md      ← THIS FILE
├── README.md                     ← Human overview
├── SESSION_LOG.md                ← Session tracker (45-session rebuild)
├── docker-compose.yml            ← 8 containers + 3 volumes
├── .env.example                  ← Environment variable template
│
├── .claude/                      ← Claude Code configuration
│   ├── startup.md                    Boot protocol + silent checks
│   ├── workflows.md                  Single-terminal + multi-terminal modes
│   ├── master-workflow.md            All paths through the 45-session build
│   └── templates.md                  File templates (Python, TS, Rust)
│
├── logic/                        ← Algorithm documentation + recipes
│   ├── FC60_ALGORITHM.md             FC60 math + formulas + test vectors
│   ├── NUMEROLOGY_SYSTEMS.md         Pythagorean + Chaldean + Abjad
│   ├── ARCHITECTURE_DECISIONS.md     10 key decisions with reasoning
│   ├── SCANNER_ORACLE_LOOP.md        Collaboration pattern
│   └── RECIPES.md                    Step-by-step common task recipes
│
├── api/                          ← FastAPI gateway (Layer 2)
│   ├── pyproject.toml                Python 3.11+, FastAPI, SQLAlchemy
│   ├── app/
│   │   ├── main.py                   FastAPI app entry point
│   │   ├── routers/                  8 routers (auth, oracle, scanner, ...)
│   │   ├── models/                   SQLAlchemy models
│   │   ├── schemas/                  Pydantic request/response schemas
│   │   ├── middleware/               Auth, CORS, rate limiting
│   │   └── utils/                    Encryption, helpers
│   └── tests/                        API unit + integration tests
│
├── frontend/                     ← React application (Layer 1)
│   ├── package.json                  React 18.3, Vite 5.1, Tailwind 3.4
│   ├── src/
│   │   ├── App.tsx                   Root component + routing
│   │   ├── pages/                    6 pages (Dashboard, Oracle, Scanner, ...)
│   │   ├── components/
│   │   │   └── oracle/               15 Oracle-specific components
│   │   ├── hooks/                    Custom React hooks
│   │   ├── i18n/                     English + Persian translations
│   │   ├── types/                    TypeScript interfaces
│   │   └── test/                     Test setup + utilities
│   └── e2e/                          Playwright E2E tests
│
├── services/
│   ├── oracle/                   ← Python Oracle service (Layer 3b)
│   │   ├── oracle_service/
│   │   │   ├── engines/              32 engine files (FC60, numerology, AI, ...)
│   │   │   ├── grpc_server.py        gRPC server implementation
│   │   │   └── proto/                Generated protobuf code
│   │   └── tests/                    Oracle unit tests
│   │
│   └── scanner/                  ← Rust Scanner service (Layer 3a)
│       ├── Cargo.toml                Rust 2021, secp256k1, tonic gRPC
│       ├── src/                      7 source files (stub)
│       ├── build.rs                  tonic-build for proto compilation
│       └── proto/                    Proto definitions
│
├── database/                     ← PostgreSQL (Layer 4)
│   ├── init.sql                      18 tables, 37+ indexes, 3 triggers
│   └── migrations/                   Alembic migration files
│
├── proto/                        ← gRPC contracts (source of truth)
│   ├── scanner.proto                 9 RPCs for scan control
│   └── oracle.proto                  8 RPCs for readings + analysis
│
├── integration/                  ← Cross-layer integration tests
│   └── tests/                        56+ integration test files
│
├── infrastructure/               ← Nginx + Prometheus configs
│   └── nginx/
│       └── nginx.conf                Reverse proxy + SSL termination
│
├── devops/                       ← Monitoring + alerting
│   ├── alerts/                       Telegram alerter + Dockerfile
│   ├── monitoring/                   Flask dashboard
│   └── logging/                      Structured logging config
│
├── scripts/                      ← Deployment + operations
│   ├── deploy.sh
│   ├── backup.sh
│   └── restore.sh
│
├── docs/                         ← Documentation
│   ├── ERROR_RECOVERY.md
│   └── VERIFICATION_CHECKLISTS.md
│
├── .specs/                       ← 16-session specs (REFERENCE ONLY)
├── .session-specs/               ← 45-session specs (ACTIVE)
└── .archive/                     ← Legacy code (READ-ONLY reference)
    └── engines/                      Original FC60, numerology implementations
```

---

## 6. Build Plan

The system is being rebuilt through a 45-session plan organized into 8 blocks. The strategy is **hybrid**: keep working infrastructure (Docker, database, API skeleton, tests), rewrite Oracle logic (engines, reading flows, AI interpretation, bilingual support).

| Block                      | Sessions | Focus                                | Key Deliverables                                                        |
| -------------------------- | -------- | ------------------------------------ | ----------------------------------------------------------------------- |
| **Foundation**             | 1–5      | Database schema, auth, user profiles | Oracle user CRUD, auth middleware, profile management                   |
| **Calculation Engines**    | 6–12     | FC60, numerology, zodiac             | FC60 engine, 3 numerology systems, zodiac/Chinese calendar, scoring     |
| **AI & Reading Types**     | 13–18    | Wisdom AI, 5 reading flows           | Anthropic API integration, time/name/question/daily/multi-user readings |
| **Frontend Core**          | 19–25    | Layout, Oracle UI, results           | Dashboard, consultation form, reading results, history                  |
| **Frontend Advanced**      | 26–31    | RTL, responsive, accessibility       | Persian RTL layout, mobile responsive, WCAG compliance                  |
| **Features & Integration** | 32–37    | Export, share, Telegram              | PDF export, share links, Telegram bot, notifications                    |
| **Admin & DevOps**         | 38–40    | Admin UI, monitoring, backup         | Admin panel, Prometheus dashboards, backup automation                   |
| **Testing & Deployment**   | 41–45    | Tests, optimization, deploy          | Full test suite, performance tuning, production deployment              |

**Sessions completed:** 0 of 45 (as of project state reset — pre-build scaffolding complete)

**What exists from scaffolding:** Working database schema, API skeleton with 46 endpoints, frontend with 20+ React components, Oracle service structure with engine files, integration tests (56+), Playwright E2E (8 scenarios), Docker Compose (8 containers), auth middleware, encryption.

**What needs rewrite:** Oracle engines, reading logic, AI interpretation, bilingual translation, frontend Oracle internals.

---

## 7. Technology Stack

### Backend — Python

| Package           | Version   | Purpose                     |
| ----------------- | --------- | --------------------------- |
| FastAPI           | ≥ 0.109.0 | API gateway framework       |
| uvicorn           | ≥ 0.27.0  | ASGI server                 |
| Pydantic          | ≥ 2.5.0   | Request/response validation |
| pydantic-settings | ≥ 2.1.0   | Environment-based config    |
| SQLAlchemy        | ≥ 2.0.25  | ORM + database toolkit      |
| Alembic           | ≥ 1.13.0  | Database migrations         |
| psycopg2-binary   | ≥ 2.9.9   | PostgreSQL driver           |
| redis             | ≥ 5.0.0   | Cache + pub/sub client      |
| grpcio            | ≥ 1.60.0  | gRPC framework              |
| grpcio-tools      | ≥ 1.60.0  | Proto code generation       |
| httpx             | ≥ 0.26.0  | Async HTTP client           |
| python-jose       | ≥ 3.3.0   | JWT tokens                  |
| passlib           | ≥ 1.7.4   | Password hashing (bcrypt)   |
| cryptography      | ≥ 41.0.0  | AES-256-GCM encryption      |
| timezonefinder    | ≥ 6.2.0   | Timezone from coordinates   |
| pytest            | ≥ 7.4.0   | Test framework              |
| pytest-asyncio    | ≥ 0.23.0  | Async test support          |
| ruff              | ≥ 0.2.0   | Linter + formatter          |

### Frontend — TypeScript

| Package                          | Version   | Purpose                       |
| -------------------------------- | --------- | ----------------------------- |
| React                            | ≥ 18.3.0  | UI framework                  |
| react-dom                        | ≥ 18.3.0  | DOM rendering                 |
| react-router-dom                 | ≥ 6.22.0  | Client-side routing           |
| @tanstack/react-query            | ≥ 5.90.20 | Server state management       |
| i18next                          | ≥ 23.8.0  | Internationalization          |
| react-i18next                    | ≥ 14.0.0  | React i18n bindings           |
| i18next-browser-languagedetector | ≥ 8.2.0   | Auto language detection       |
| jalaali-js                       | ≥ 1.2.8   | Jalali (Solar Hijri) calendar |
| TypeScript                       | ≥ 5.3.0   | Type system                   |
| Vite                             | ≥ 5.1.0   | Build tool + dev server       |
| Tailwind CSS                     | ≥ 3.4.0   | Utility-first CSS             |
| Vitest                           | ≥ 1.3.0   | Unit test framework           |
| Playwright                       | ≥ 1.41.0  | E2E test framework            |
| Testing Library                  | ≥ 14.2.0  | Component testing             |
| ESLint                           | ≥ 8.56.0  | Linter                        |
| Prettier                         | ≥ 3.2.0   | Formatter                     |

### Scanner — Rust

| Crate       | Version | Purpose                      |
| ----------- | ------- | ---------------------------- |
| secp256k1   | 0.28    | Elliptic curve cryptography  |
| bitcoin     | 0.31    | Address derivation           |
| bip39       | 2.0     | Mnemonic seed phrases        |
| sha2        | 0.10    | SHA-256 hashing              |
| ripemd      | 0.1     | RIPEMD-160 hashing           |
| tiny-keccak | 2.0     | Keccak (Ethereum)            |
| tonic       | 0.11    | gRPC framework               |
| prost       | 0.12    | Protocol Buffers             |
| tokio       | 1.x     | Async runtime                |
| reqwest     | 0.11    | HTTP client (balance checks) |
| tracing     | 0.1     | Structured logging           |

### Infrastructure

| Component      | Version       | Purpose                 |
| -------------- | ------------- | ----------------------- |
| PostgreSQL     | 15 (Alpine)   | Primary data store      |
| Redis          | 7 (Alpine)    | Cache + pub/sub         |
| nginx          | 1.25 (Alpine) | Reverse proxy + SSL     |
| Docker Compose | 3.9 schema    | Container orchestration |

---

## 8. Performance Targets

| Operation                | Target          | Notes                                      |
| ------------------------ | --------------- | ------------------------------------------ |
| API response (simple)    | < 50ms p95      | Health, status, simple CRUD                |
| API response (reading)   | < 5 seconds     | Full Oracle reading with AI interpretation |
| Frontend initial load    | < 2 seconds     | First contentful paint                     |
| Frontend transitions     | < 100ms         | Page-to-page navigation                    |
| Database query (indexed) | < 100ms         | All frequent queries must be indexed       |
| Scanner throughput       | 5,000+ keys/sec | Rust target (when implemented)             |

---

## 9. Security Model

### Encryption

| Aspect         | Implementation                                                         |
| -------------- | ---------------------------------------------------------------------- |
| Algorithm      | AES-256-GCM (authenticated encryption)                                 |
| Key generation | `secrets.token_hex(32)` — 256-bit random                               |
| Prefix         | `ENC4:` for current version, `ENC:` for legacy migration               |
| Scope          | Private keys, seed phrases, WIF keys in `findings` table               |
| Key storage    | `NPS_ENCRYPTION_KEY` + `NPS_ENCRYPTION_SALT` in `.env` (never in code) |

### Authentication (3-Tier)

| Method      | Use Case                        | Implementation                                                       |
| ----------- | ------------------------------- | -------------------------------------------------------------------- |
| JWT tokens  | Frontend sessions               | `python-jose`, HS256 signed with `API_SECRET_KEY`                    |
| API keys    | Service-to-service, automation  | SHA-256 hashed in `api_keys` table, plaintext shown only at creation |
| Legacy auth | Migration from previous version | Temporary backward compatibility                                     |

### Authorization Scopes

| Role        | Access                                              |
| ----------- | --------------------------------------------------- |
| `admin`     | Full system access, user management, key generation |
| `moderator` | Read/write Oracle, read Scanner, no user management |
| `user`      | Own readings, own findings, no admin functions      |

### Audit Trail

- All security events logged to `oracle_audit_log` table
- Fields: timestamp, user_id, action, resource_type, resource_id, success, IP address, API key hash, details (JSONB)
- Indexed on timestamp (DESC), user_id, action, and success for fast querying

### Secrets Management

- All secrets in `.env` file (never committed — `.gitignore`)
- `.env.example` provides template with placeholder values
- No plaintext private keys ever stored in database
- SSL/TLS termination at nginx in production

---

## 10. Communication Patterns

### External (Frontend → API)

| Protocol  | Use Case                            | Format      |
| --------- | ----------------------------------- | ----------- |
| HTTP REST | CRUD operations, readings, auth     | JSON        |
| WebSocket | Real-time scan events, live updates | JSON frames |

### Internal (API → Services)

| Protocol | Use Case                    | Format                    |
| -------- | --------------------------- | ------------------------- |
| gRPC     | API ↔ Oracle, API ↔ Scanner | Protocol Buffers (binary) |

### Proto Contracts (Source of Truth)

The `.proto` files in `proto/` define all service interfaces. Generated code is used by both sides. Changes to interfaces must start with proto updates.

**`scanner.proto`** — 9 RPCs:

| RPC                    | Request        | Response         | Streaming        |
| ---------------------- | -------------- | ---------------- | ---------------- |
| `StartScan`            | `ScanConfig`   | `ScanSession`    | No               |
| `StopScan`             | `SessionId`    | `ScanStatus`     | No               |
| `PauseScan`            | `SessionId`    | `ScanStatus`     | No               |
| `ResumeScan`           | `SessionId`    | `ScanStatus`     | No               |
| `GetStats`             | `SessionId`    | `ScanStats`      | No               |
| `SaveCheckpoint`       | `SessionId`    | `CheckpointInfo` | No               |
| `ResumeFromCheckpoint` | `CheckpointId` | `ScanSession`    | No               |
| `ListSessions`         | `Empty`        | `SessionList`    | No               |
| `StreamEvents`         | `SessionId`    | `ScanEvent`      | Server-streaming |

**`oracle.proto`** — 8 RPCs:

| RPC                  | Request           | Response           | Purpose                                          |
| -------------------- | ----------------- | ------------------ | ------------------------------------------------ |
| `GetReading`         | `ReadingRequest`  | `ReadingResponse`  | Full Oracle reading (FC60 + numerology + zodiac) |
| `GetNameReading`     | `NameRequest`     | `NameResponse`     | Name cipher analysis                             |
| `GetQuestionSign`    | `QuestionRequest` | `QuestionResponse` | Yes/no with numerological context                |
| `GetDailyInsight`    | `DateRequest`     | `DailyResponse`    | Daily insight with lucky numbers                 |
| `SuggestRange`       | `RangeRequest`    | `RangeResponse`    | Optimal scan range suggestion                    |
| `AnalyzeSession`     | `SessionData`     | `AnalysisResponse` | Post-session AI analysis                         |
| `GetTimingAlignment` | `TimingRequest`   | `TimingResponse`   | Cosmic timing score                              |
| `HealthCheck`        | `Empty`           | `HealthResponse`   | Service health status                            |

### Message Flow Example (Oracle Reading)

```
User clicks "Get Reading" in React UI
  → HTTP POST /api/oracle/reading (JSON body)
  → FastAPI validates with Pydantic schema
  → FastAPI calls oracle-service via gRPC GetReading()
  → Oracle engine computes FC60 + numerology + zodiac
  → Oracle calls Anthropic API for AI interpretation (if key available)
  → gRPC response → FastAPI → JSON response → React renders result
  → Reading saved to oracle_readings table
  → Audit entry written to oracle_audit_log
```

---

## 11. Persian / Farsi Support

NPS is designed for bilingual use (English + Persian) with full right-to-left (RTL) support.

### Text and Encoding

| Aspect             | Implementation                                      |
| ------------------ | --------------------------------------------------- |
| Character encoding | UTF-8 throughout (database, API, frontend)          |
| RTL layout         | Conditional `dir="rtl"` when locale is `fa`         |
| Font               | System Persian fonts + web font fallbacks           |
| i18n framework     | i18next + react-i18next + browser language detector |
| Translation files  | `frontend/src/i18n/` (EN + FA JSON files)           |

### Persian-Specific Features

| Feature            | Technology                                        | Purpose                                 |
| ------------------ | ------------------------------------------------- | --------------------------------------- |
| Persian keyboard   | `PersianKeyboard.tsx` component                   | On-screen input for name entry          |
| Jalali calendar    | `jalaali-js` library + `CalendarPicker.tsx`       | Solar Hijri date selection              |
| Abjad numerology   | `numerology.py` engine (Abjad system)             | Persian/Arabic letter-to-number mapping |
| Bilingual names    | `oracle_users.name` + `oracle_users.name_persian` | Dual name storage                       |
| Bilingual readings | `oracle_readings.question` + `question_persian`   | Questions in both languages             |
| AI interpretation  | `ai_interpretation` + `ai_interpretation_persian` | Dual language AI output                 |

### Abjad Numerology System

Traditional Arabic/Persian letter-value mapping: ا=1, ب=2, ج=3, ... غ=1000. Persian-specific letters: پ=2, چ=3, ژ=7, گ=20. Same reduction principle as Pythagorean (reduce to 1–9 or master numbers 11, 22, 33).

### Database Support

- `oracle_users` table has both `name` and `name_persian` columns
- `oracle_readings` has `question` and `question_persian`
- `oracle_readings` has `ai_interpretation` and `ai_interpretation_persian`
- All text columns use PostgreSQL `VARCHAR` or `TEXT` (UTF-8 native)
- GiST index on coordinates POINT type for geolocation queries

---

## 12. Existing Codebase Summary

The codebase was produced through a 16-session scaffolding process before the current 45-session rebuild plan.

### Layer Status

| Layer             | Status          | Source Files                 | What Works                            | What Needs Rewrite                 |
| ----------------- | --------------- | ---------------------------- | ------------------------------------- | ---------------------------------- |
| Frontend (React)  | ~80% scaffolded | 66 (TS + TSX)                | Component shells, routing, i18n setup | Oracle internals, reading flows    |
| API (FastAPI)     | ~70% scaffolded | 55 Python                    | Routing, auth middleware, Swagger     | Oracle handlers, reading endpoints |
| Oracle Service    | ~60% scaffolded | 32 engine files              | Engine structure, legacy code copied  | All engines, AI, translation       |
| Scanner Service   | Stub only       | 7 Rust files                 | Cargo project, gRPC setup             | Everything (future project)        |
| Database          | Complete        | 1 SQL (341 lines)            | Schema, indexes, triggers, extensions | Nothing — schema is done           |
| Proto Contracts   | Complete        | 2 proto files                | Scanner (9 RPCs), Oracle (8 RPCs)     | Nothing — contracts are done       |
| Infrastructure    | Working         | Docker, nginx, configs       | 8 containers, health checks, volumes  | Nothing major                      |
| Integration Tests | Partial         | 56+ test files               | Cross-layer test framework            | Extend per new features            |
| DevOps            | Working         | Alerter, monitoring, logging | Telegram alerts, structured logging   | Nothing major                      |

### Pre-Build Scaffolding Output

- 45,903 lines of code produced across all layers
- Working database schema (18 tables, 37+ indexes)
- API skeleton with 46 endpoints across 8 routers
- Frontend with 6 pages, 15 Oracle components, i18n setup
- Docker Compose with 8 containers and health checks
- Auth middleware (JWT + API key + legacy)
- AES-256-GCM encryption utilities
- 56+ integration tests, 8 Playwright E2E scenarios

---

## 13. Key Architecture Decisions

These 10 decisions shape the system design. Each was made with specific trade-off reasoning.

### 1. Microservices Over Monolith

Split the legacy monolith into separate Scanner (Rust), Oracle (Python), API (FastAPI), Frontend (React). Scanner needs Rust performance for crypto operations. Oracle needs Python for AI/ML. Different runtimes require independent scaling and deployment.

### 2. PostgreSQL Over SQLite

PostgreSQL for all data storage. Millions of rows need partitioning and indexes. Complex joins across findings/patterns/users. Battle-tested reliability. Extensions (`uuid-ossp`, `pgcrypto`) provide server-side UUID generation and cryptographic functions.

### 3. FastAPI Over Flask/Django

FastAPI for the API gateway. Async-native (critical for non-blocking I/O to gRPC services), auto-generated Swagger docs, Pydantic validation catches bad input at the boundary, WebSocket support built-in for real-time scan events.

### 4. React Over Vue/Svelte

React + TypeScript + Tailwind. Largest ecosystem for internationalization, RTL layout, and calendar pickers. TypeScript strict mode catches bugs at compile time. Vite provides fast dev server and optimized builds.

### 5. Rust Over Go for Scanner

Rust for the scanning engine. Crypto operations (secp256k1, SHA-256) are CPU-bound. Rust is 10–50x faster than Python with no garbage collection pauses. Target: 5,000+ keys/sec. Status: stub only, future project.

### 6. gRPC Over REST for Service-to-Service

gRPC + Protocol Buffers between API↔Oracle and API↔Scanner. Type-safe contracts enforce interface compatibility. Binary encoding is faster than JSON. Server-streaming supports real-time scan events. Auto-generated code from `.proto` files eliminates manual serialization.

### 7. API-Only AI (Never CLI)

Anthropic Python SDK (HTTP API) for all AI calls. Never Claude CLI. CLI requires installation on every server, cannot be mocked in tests, is not async-compatible, and breaks in Docker containers. This is a hard rule.

### 8. AES-256-GCM Encryption (Reuse Legacy Pattern)

Same encryption pattern as the legacy version with updated `ENC4:` prefix. Reusing proven cryptographic code is safer than inventing new approaches. Legacy `ENC:` prefix kept for migration-period backward compatibility only.

### 9. Simple Session Log Over Complex State

Plain markdown file (`SESSION_LOG.md`) for development session tracking. Claude Code reads markdown natively. Human-readable. Git-friendly diff and merge. Lower maintenance than database or config-based state tracking.

### 10. Hybrid Rebuild (Keep Infrastructure, Rewrite Oracle)

Keep working infrastructure (Docker, database, API skeleton, tests). Rewrite Oracle logic (engines, reading types, bilingual support, Abjad numerology, AI interpretation). Saves time by not rebuilding what already works. Reduces risk by changing one thing at a time.

---

## 14. Migration from Legacy

### What the Legacy App Was

The previous version was a Python monolith that combined scanning, Oracle analysis, and a terminal-based UI in a single application. It worked but had performance limitations (Python scanning), no web interface, English-only, and tightly coupled components.

### What Is Reused

| Component                                      | Reuse Strategy                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FC60 engine (`fc60.py`, 966 lines)             | Reference implementation in `.archive/`. New code must produce identical outputs for same inputs. |
| Numerology engine (`numerology.py`, 294 lines) | Reference for Pythagorean system. New version adds Chaldean + Abjad.                              |
| Encryption pattern (AES-256-GCM)               | Same algorithm and approach. New `ENC4:` prefix, legacy `ENC:` supported for migration.           |
| Database schema concepts                       | Table structure evolved but core entities (findings, sessions, users) carry forward.              |
| Test vectors                                   | Mathematical test cases from legacy version used to verify new engine accuracy.                   |

### What Is New

| Capability          | Description                                                       |
| ------------------- | ----------------------------------------------------------------- |
| Rust Scanner        | High-performance key generation (replacing Python scanning)       |
| Web frontend        | React + TypeScript + Tailwind (replacing terminal UI)             |
| Persian support     | Full bilingual with RTL layout, Abjad numerology, Jalali calendar |
| gRPC services       | Type-safe service communication (replacing direct function calls) |
| Multi-user readings | Compatibility analysis between multiple Oracle users              |
| AI interpretation   | Anthropic API for intelligent reading summaries                   |
| Docker deployment   | Containerized with health checks and resource limits              |

### `.archive/` Policy

The `.archive/` directory contains legacy source code. It is **read-only reference material**. Rules:

- **NEVER** modify files in `.archive/`
- **DO** read it to understand legacy algorithms and verify output matching
- Engine files in `.archive/engines/` are the mathematical baseline
- New engine implementations must pass the same test vectors as legacy code
