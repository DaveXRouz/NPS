# NPS Architecture Overview

## 7-Layer Distributed Architecture

NPS transforms the legacy Python/Tkinter monolith into a distributed microservices architecture targeting web deployment.

```
┌─────────────────────────────────────────────────────┐
│                   Layer 1: Frontend                  │
│              React + TypeScript + Tailwind           │
│                  (Vite, port 5173)                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│            Layer 2: Reverse Proxy (Nginx)            │
│        SSL termination, rate limiting, routing       │
│                    (port 443/80)                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│            Layer 3: API Gateway (FastAPI)            │
│     REST + WebSocket, JWT/API key auth, models      │
│                    (port 8000)                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│            Layer 4: Oracle Service (Python)          │
│                  gRPC (port 50052)                   │
│                                                     │
│  - FC60 numerology    - Oracle readings              │
│  - AI learning        - Timing/strategy              │
│  - Scoring                                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│            Layer 6: Database (PostgreSQL)            │
│          10 tables, encrypted findings,             │
│          session/checkpoint persistence             │
│                    (port 5432)                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│          Layer 7: Infrastructure & DevOps           │
│      Docker Compose, Prometheus, backup scripts     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Component Relationships

### Data Flow

```
User Browser
    │
    ▼
React Frontend ──HTTP/WS──▶ Nginx ──proxy──▶ FastAPI Gateway
                                                  │
                                                  │
                                             gRPC │
                                                  ▼
                                           Python Oracle
                                                  │
                                                  ▼
                                             PostgreSQL
```

### Communication Rules

1. **Frontend -> API only** — React never calls gRPC services directly
2. **API -> Services via gRPC** — Protobuf contracts in `proto/` are the source of truth
3. **Services -> Database** — Each service manages its own data through the API layer
4. **No direct DB access from frontend** — All data flows through the API layer

### Real-Time Updates

The WebSocket connection (`/ws`) provides:

- Reading progress (step completion, AI interpretation)
- Health status changes
- AI learning events (level up, insights)

## Legacy to Current Migration Path

| Legacy Component                | Current Home                                                 | Status           |
| ------------------------------- | ------------------------------------------------------------ | ---------------- |
| `nps/engines/fc60.py`           | Oracle service engines                                       | Copied as-is     |
| `nps/engines/numerology.py`     | Oracle service engines                                       | Copied as-is     |
| `nps/engines/oracle.py`         | Oracle service engines                                       | Copied as-is     |
| `nps/engines/scoring.py`        | Oracle service engines                                       | Copied as-is     |
| `nps/engines/crypto.py`         | Removed (Scanner deleted)                                    | N/A              |
| `nps/engines/bip39.py`          | Removed (Scanner deleted)                                    | N/A              |
| `nps/engines/balance.py`        | Removed (Scanner deleted)                                    | N/A              |
| `nps/solvers/unified_solver.py` | Removed (Scanner deleted)                                    | N/A              |
| `nps/gui/*.py`                  | React frontend (reference in `frontend/desktop-gui/legacy/`) | Rewrite to React |
| `nps/engines/vault.py`          | PostgreSQL `findings` table                                  | Adapt for SQL    |
| `nps/engines/config.py`         | Environment variables                                        | Adapt for .env   |
| `config.json`                   | `.env` + PostgreSQL `config` table                           | Migrate          |

## Security Architecture

- **Transport:** TLS via nginx (external), plain gRPC (internal Docker network)
- **Authentication:** JWT tokens (web) + API keys (programmatic/Telegram)
- **Encryption at rest:** AES-256-GCM (`ENC4:` prefix) for sensitive fields
- **Legacy support:** Legacy `ENC:` (PBKDF2 + HMAC-SHA256) decrypt for migration
- **Key material:** Never leaves server; frontend displays only masked values

## Phase Roadmap

| Phase | Description                                | Dependencies |
| ----- | ------------------------------------------ | ------------ |
| 0     | Scaffolding (93 files)                     | None         |
| 1     | Foundation: DB + API skeleton + encryption | Phase 0      |
| 2     | Python Oracle service (gRPC)               | Phase 1      |
| 3     | API layer (all endpoints wired)            | Phase 1, 2   |
| 4     | React frontend                             | Phase 3      |
| 5     | Infrastructure + DevOps                    | Phase 4      |
| 6     | Integration testing + polish               | Phase 5      |
