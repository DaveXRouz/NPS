# CLAUDE.md — NPS Project Brain

> **Read this file FIRST. Every session. No exceptions.**
> **Last updated:** 2026-02-20

---

## HOW THIS WORKS

CLAUDE.md loads automatically when you open the project. Then:

- **User gives a specific task** → execute it (plan first if complex)
- **User says "continue" or "next"** → read BUILD_HISTORY.md, pick up the "Next:" task
- **User says nothing** → wait for instructions

**Simple tasks** (bug fix, single-file edit, direct instruction): execute directly.
**Complex tasks** (multi-file, new features, architecture): show plan first, wait for approval.

For startup checks → `.claude/startup.md`
For workflow details → `.claude/workflows.md`

---

## PROJECT IDENTITY

**Name:** NPS (Numerology Puzzle Solver)
**Purpose:** Bitcoin wallet discovery through numerological pattern analysis with AI learning
**Repo:** https://github.com/DaveXRouz/NPS.git
**Owner:** Dave (DaveXRouz)

**Simple version:** Oracle analyzes Bitcoin wallet patterns using numerology (FC60, Pythagorean, Chaldean, Abjad) + AI interpretations. Web-accessible platform with bilingual support (EN + Persian RTL).

**Design philosophy:** Swiss watch — simple surface, sophisticated internals.

---

## CURRENT STATE

**Strategy:** Keep infrastructure, rewrite Oracle logic
**Progress:** Check BUILD_HISTORY.md for current status

| Layer                   | Status          |
| ----------------------- | --------------- |
| Frontend (React)        | ~80% scaffolded |
| API (FastAPI)           | ~70% scaffolded |
| Backend/Oracle          | ~60% scaffolded |
| Database (PostgreSQL)   | Done            |
| Infrastructure (Docker) | Partial         |
| DevOps (Monitoring)     | Partial         |
| Integration Tests       | 56+ tests       |

---

## ARCHITECTURE

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

LAYER 5: Docker Compose (7 containers)
LAYER 6: AES-256-GCM + API keys (3-tier)
LAYER 7: JSON logging + Prometheus + Telegram alerts
```

For detailed architecture → `logic/ARCHITECTURE_DECISIONS.md`

---

## REPOSITORY LAYOUT

```
NPS/
├── CLAUDE.md              ← YOU ARE HERE
├── README.md              ← Human overview
├── BUILD_HISTORY.md       ← Development log + changelog
├── CURRENT_STATE.md       ← Full project audit + architecture
├── ISSUES.md              ← All tracked issues (157+)
├── WISHLIST.md            ← Design vision + future features
├── .claude/               ← Claude Code configs
│   ├── startup.md             Boot checks + formatting + security
│   ├── workflows.md           Plan template + quality checklist
│   └── templates.md           File templates (Python, TS)
├── logic/                 ← Algorithm docs + recipes
│   ├── FC60_ALGORITHM.md      FC60 math + formulas + test vectors
│   ├── NUMEROLOGY_SYSTEMS.md  Pythagorean + Chaldean + Abjad
│   ├── ARCHITECTURE_DECISIONS.md  9 key decisions with reasoning
│   └── RECIPES.md             Step-by-step common task recipes
├── api/                   ← FastAPI gateway
├── frontend/              ← React + TypeScript + Tailwind
├── services/oracle/       ← Python Oracle service
├── database/              ← PostgreSQL schemas + migrations
├── integration/           ← 56+ integration tests
├── devops/                ← Monitoring + alerts
├── infrastructure/        ← Nginx + Prometheus
├── proto/                 ← gRPC definitions
├── scripts/               ← Deploy, backup, restore
├── docs/                  ← API reference, deployment guide
├── .archive/              ← Legacy code (READ-ONLY)
└── docker-compose.yml
```

---

## OPERATING RULES

### Autonomy Level: MAXIMUM

Make all decisions yourself. Only ask Dave for:

- **Money** — paid services, API costs, infrastructure upgrades
- **Security** — encryption changes, auth system changes, key management
- **Architecture** — changes that affect multiple layers or the overall design

Everything else: decide, do it, show results.

### Communication: SILENT WORKER

**During planning (before work starts):**

- Complex tasks (new features, multi-file changes): show plan → wait for approval
- Simple tasks (bug fix, typo, single-file edit, direct instruction): execute directly, no plan needed

**During execution (after plan is approved or task is simple):**

- Work silently. No progress narration.
- Show results at the end only.

**Rule of thumb:** If a task takes more than 5 minutes or touches more than 2 files, show a plan first.

### Error Handling: 3-STRIKE RULE

```
Error encountered →
  Attempt fix #1 (silently) →
    Still broken → Attempt fix #2 (silently) →
      Still broken → Attempt fix #3 (silently) →
        Still broken → STOP. Tell Dave what's wrong. Ask for guidance.
```

### Quality Pipeline (Every File, Every Time):

```
Write code
  → Auto-format (black/prettier)
  → Auto-lint + fix (ruff/eslint)
  → Write tests
  → Run tests (must pass before "done")
  → Auto-generate docs (public APIs + complex logic only)
  → Git commit with descriptive message
```

### Git Behavior:

- Auto-commit after each completed task
- Commit message format: `[layer] description`
  - Example: `[api] add oracle reading endpoint`
- Auto `git stash` before risky changes (revert if broken)
- Never commit broken code — tests must pass first

### Dependency Management:

- Auto-install known safe packages (from requirements.txt, package.json, Cargo.toml) silently
- For NEW/unknown packages: ask Dave first
- Run `pip-audit` / `npm audit` after installing — flag vulnerabilities

### Context Limit:

- Auto-compact at 70% context capacity
- Keep working after compaction — don't stop or ask
- If a task is too large for one context: split it, note split point in BUILD_HISTORY.md

### Web Search:

- Use ONLY for: package version verification, API documentation lookups
- Do NOT search for: general coding questions, tutorials, Stack Overflow

---

## 10 FORBIDDEN PATTERNS

1. **NEVER use Claude CLI** (`subprocess`, `os.system`, shell commands for AI). Only Anthropic HTTP API.
2. **NEVER store secrets in code.** Always `.env` variables.
3. **NEVER use bare `except:` in Python.** Catch specific exceptions.
4. **NEVER silently swallow errors.** Always handle or propagate.
5. **NEVER use `any` type in TypeScript.** Define proper interfaces.
6. **NEVER hardcode file paths.** Use `Path(__file__).resolve().parents[N]`.
7. **NEVER skip tests.** Every change gets tested before commit.
8. **NEVER modify `.archive/` folder.** Read-only reference.
9. **NEVER commit `.env` files.** Only `.env.example`.
10. **NEVER say "done" without proof.** Tests pass + verification output.

---

## ARCHITECTURE RULES (Non-Negotiable)

1. **API is the gateway** — Frontend/Telegram only talk to FastAPI. Never directly to gRPC services.
2. **AI uses API only** — Anthropic Python SDK, HTTP calls. Never CLI.
3. **Proto contracts are source of truth** — `oracle.proto` defines the Oracle service interface.
4. **Legacy engines are reference** — `.archive/v3/engines/` is the math baseline. New code must match outputs.
5. **Environment over config files** — `.env` only. Not `config.json`.
6. **AES-256-GCM encryption** — `ENC4:` prefix (current). `ENC:` fallback for legacy migration only.
7. **Layer separation** — No shortcuts. Frontend→API→Service→Database.
8. **Persian UTF-8** — All text supports Persian. RTL when locale is FA.
9. **Graceful degradation** — Missing API key = fallback text, not crash. Missing Redis = in-memory.
10. **No Rust/Scanner assumptions** — Scanner was removed. Oracle is Python-only.

---

## SECURITY RULES

- AES-256-GCM, keys via `secrets.token_hex(32)`
- API keys: SHA-256 hashed in DB, plaintext shown only at creation
- Three-tier scopes: `admin` / `moderator` / `user`
- Audit all security events to `oracle_audit_log` table
- No plaintext private keys in database — ever
- SSL/TLS in production (nginx terminates)
- Security scan on every commit (check for leaked secrets, SQL injection, XSS)

---

## KEY COMMANDS

```bash
# Services
make up                    # Start all (Docker)
make dev-api               # FastAPI :8000
make dev-frontend          # Vite :5173

# Tests
cd api && python3 -m pytest tests/ -v
cd frontend && npm test
cd services/oracle && python3 -m pytest tests/ -v
python3 -m pytest integration/tests/ -v -s
cd frontend && npx playwright test

# Quality
make lint && make format
pip-audit                  # Python vulnerability check
npm audit                  # Node vulnerability check

# Database
docker-compose exec postgres psql -U nps -d nps
make backup
```

---

## MCP SERVERS (Plugins)

Use these when available:

- **GitHub MCP** — auto PR, issue tracking, branch management
- **PostgreSQL MCP** — direct DB queries, schema verification
- **File System MCP** — advanced file operations, bulk search

---

## SMART TOOL USAGE

### Extended Thinking (deep reasoning):

- **AUTO-USE for:** architecture, security, complex algorithms, trade-offs, multi-file refactors
- **SKIP for:** simple edits, standard CRUD, formatting, straightforward fixes

### Subagents (parallel workers):

- **AUTO-USE for:** 3+ file creation, independent modules, test+implementation simultaneously
- **SKIP for:** sequential tasks, single-file changes, tightly coupled tasks

### Thinking Depth: USE YOUR BRAIN

Use deep/extended thinking for:

- **Architecture decisions** — anything touching 2+ layers or choosing between approaches
- **Security** — encryption, auth, key management, vulnerability analysis
- **Complex algorithms** — FC60, numerology engines, AI scoring, pattern matching
- **Trade-off analysis** — when choosing between options with real consequences
- **Multi-file refactors** — understanding ripple effects before making changes
- **Bug diagnosis** — when root cause isn't obvious from surface symptoms

Skip deep thinking for:

- Simple edits, standard CRUD, formatting fixes
- Following established patterns (e.g., "add another endpoint like the existing ones")
- Direct instructions with no ambiguity

**Rule:** When in doubt, think deeper. The cost of over-thinking is low. The cost of under-thinking is rework.

### Model Strategy: Right Model for the Job

| Task Type                                   | Model      | Why                                |
| ------------------------------------------- | ---------- | ---------------------------------- |
| Architecture, security, complex logic       | **Opus**   | Deep reasoning, nuance, trade-offs |
| Standard implementation, features, tests    | **Sonnet** | Fast, capable, cost-effective      |
| Quick lookups, simple searches, boilerplate | **Haiku**  | Fastest, cheapest, good enough     |

**Subagent model selection:**

- `Explore` agents → **Haiku** (file counting, pattern finding, codebase navigation)
- `Plan` agents → **Sonnet** (design work, implementation planning)
- Code review agents → **Sonnet** (quality analysis needs good judgment)
- Complex research → **Opus** (only when reasoning depth matters)

**Default:** Sonnet for most work. Upgrade to Opus for decisions that affect architecture. Downgrade to Haiku for mechanical tasks.

## EXISTING CODE POLICY

When you touch any file that doesn't match project standards:

- **Fix it proactively.** Don't just fix what you came for — upgrade the whole file.
- Apply templates from `.claude/templates.md`
- Add missing type hints, docstrings, error handling
- Run linter + formatter on the file

---

## ENVIRONMENT VARIABLES

All config in `.env` (copy from `.env.example`):

| Variable              | Purpose                   | Required                     |
| --------------------- | ------------------------- | ---------------------------- |
| `POSTGRES_PASSWORD`   | Database password         | Yes                          |
| `API_SECRET_KEY`      | JWT signing + legacy auth | Yes                          |
| `NPS_ENCRYPTION_KEY`  | AES-256-GCM key (hex)     | For encryption               |
| `NPS_ENCRYPTION_SALT` | Encryption salt (hex)     | For encryption               |
| `ANTHROPIC_API_KEY`   | AI interpretations        | Optional (graceful fallback) |
| `NPS_BOT_TOKEN`       | Telegram bot token        | Optional                     |
| `NPS_CHAT_ID`         | Telegram chat ID          | Optional                     |

---

## PERFORMANCE TARGETS

| Operation                | Target      |
| ------------------------ | ----------- |
| API response (simple)    | < 50ms p95  |
| API response (reading)   | < 5 seconds |
| Frontend initial load    | < 2 seconds |
| Frontend transitions     | < 100ms     |
| Database query (indexed) | < 100ms     |

---

## FILE REFERENCES

| Need                          | Read                              |
| ----------------------------- | --------------------------------- |
| Boot checks + security scans  | `.claude/startup.md`              |
| Plan template + quality rules | `.claude/workflows.md`            |
| File creation templates       | `.claude/templates.md`            |
| FC60 math + formulas          | `logic/FC60_ALGORITHM.md`         |
| Numerology systems            | `logic/NUMEROLOGY_SYSTEMS.md`     |
| Architecture decisions        | `logic/ARCHITECTURE_DECISIONS.md` |
| Common task step-by-step      | `logic/RECIPES.md`                |
| Development history           | `BUILD_HISTORY.md`                |
| Legacy source (reference)     | `.archive/v3/`                    |
