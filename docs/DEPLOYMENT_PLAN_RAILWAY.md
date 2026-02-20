# NPS Deployment Plan -- Railway

**Generated:** 2026-02-16
**Status:** PLAN ONLY -- NOT EXECUTED
**Requires:** User approval (cost + secrets decisions)

---

## Important Notice

This document describes a deployment plan for Railway.app. It has NOT been executed. Deployment involves:

- Financial commitment (Railway billing)
- Secret management (environment variables with real credentials)
- External service access (Anthropic API, Telegram Bot API)

Per CLAUDE.md operating rules, these decisions require explicit user approval before proceeding.

---

## 1. Architecture on Railway

```
Railway Project: nps-production
  |
  +-- PostgreSQL (Railway addon)
  |     Port: internal
  |     Storage: 1GB initial
  |
  +-- API Service (Dockerfile)
  |     Port: 8000
  |     Public URL: nps-api-production.up.railway.app
  |     Healthcheck: /api/health
  |
  +-- Frontend (static files served by API)
  |     Built during API Docker image build
  |     Served via FastAPI static file mount
  |
  +-- Redis (Railway addon)
        Port: internal
        Storage: 25MB initial
```

### Why This Architecture

- **PostgreSQL as addon:** Railway manages backups, scaling, and connection pooling. No container management needed.
- **Single API service:** Simplifies deployment. Frontend is built as static files and served by the FastAPI application via its existing static file middleware. This avoids the cost and complexity of a separate frontend container.
- **Redis as addon:** Managed Redis with automatic persistence. Cheaper and more reliable than self-managed.
- **No separate Oracle gRPC service:** In the initial deployment, Oracle engines run in-process within the API. The gRPC separation can be added later when scale requires it.
- **No Nginx:** Railway handles HTTPS termination and load balancing at the platform level.

---

## 2. Services Configuration

### 2.1 PostgreSQL (Railway Addon)

```
Plugin: PostgreSQL
Plan: Starter (free tier) or Developer ($5/month)
Storage: 1GB initial (sufficient for development/staging)
Backups: Automatic daily (Railway managed)
```

**Post-provision steps:**

1. Note the `DATABASE_URL` provided by Railway
2. Run `init.sql` against the provisioned database to create schema
3. Verify all 17+ tables are created

### 2.2 Redis (Railway Addon)

```
Plugin: Redis
Plan: Starter (free tier) or Developer ($5/month)
Storage: 25MB (sufficient for caching)
```

**Post-provision steps:**

1. Note the `REDIS_URL` provided by Railway
2. Verify PING connectivity from API service

### 2.3 API Service

```
Source: GitHub repository (DaveXRouz/NPS)
Root directory: / (project root)
Dockerfile: api/Dockerfile (or root Dockerfile if unified)
Build command: docker build
Start command: uvicorn api.app.main:app --host 0.0.0.0 --port 8000
Port: 8000
Healthcheck path: /api/health
Healthcheck interval: 30s
```

**Build process:**

1. Railway detects Dockerfile and builds the image
2. Frontend is built during Docker image build (multi-stage)
3. Static files are copied to the API container's static directory
4. API serves both the REST API and frontend static files

---

## 3. Environment Variables

All variables must be set in Railway's service environment configuration.

### Required Variables

| Variable              | Source                    | Example Value                             |
| --------------------- | ------------------------- | ----------------------------------------- |
| `DATABASE_URL`        | Railway PostgreSQL addon  | `postgresql://user:pass@host:5432/nps`    |
| `REDIS_URL`           | Railway Redis addon       | `redis://default:pass@host:6379`          |
| `POSTGRES_PASSWORD`   | Derived from DATABASE_URL | (extracted from URL)                      |
| `POSTGRES_HOST`       | Derived from DATABASE_URL | (extracted from URL)                      |
| `POSTGRES_PORT`       | Derived from DATABASE_URL | `5432`                                    |
| `POSTGRES_DB`         | Derived from DATABASE_URL | `nps`                                     |
| `POSTGRES_USER`       | Derived from DATABASE_URL | (extracted from URL)                      |
| `API_SECRET_KEY`      | Generate new              | `secrets.token_hex(32)` output            |
| `NPS_ENCRYPTION_KEY`  | Generate new              | `secrets.token_hex(32)` output (64 chars) |
| `NPS_ENCRYPTION_SALT` | Generate new              | `secrets.token_hex(16)` output (32 chars) |

### Optional Variables

| Variable               | Purpose                | Default Behavior if Missing        |
| ---------------------- | ---------------------- | ---------------------------------- |
| `ANTHROPIC_API_KEY`    | AI interpretations     | Falls back to template text        |
| `NPS_BOT_TOKEN`        | Telegram bot           | Telegram features disabled         |
| `NPS_CHAT_ID`          | Telegram chat ID       | Telegram features disabled         |
| `NPS_ALLOW_SUBPROCESS` | Desktop notifications  | Subprocess disabled (safe default) |
| `ENVIRONMENT`          | Environment identifier | Defaults to "development"          |
| `LOG_LEVEL`            | Logging verbosity      | Defaults to "INFO"                 |
| `CORS_ORIGINS`         | Allowed CORS origins   | Defaults to localhost              |

### Variable Generation Commands

```bash
# Generate API_SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# Generate NPS_ENCRYPTION_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# Generate NPS_ENCRYPTION_SALT
python3 -c "import secrets; print(secrets.token_hex(16))"
```

**Security note:** Generate fresh keys for each environment. Never reuse development keys in staging or production. Never share keys between environments.

---

## 4. Deployment Steps

### Step 1: Create Railway Project

```
1. Log in to railway.app
2. Create new project: "nps-staging" (or "nps-production")
3. Connect GitHub repository: DaveXRouz/NPS
4. Select branch: main
```

### Step 2: Provision Database

```
1. Add PostgreSQL plugin to the project
2. Wait for provisioning (usually <30 seconds)
3. Copy DATABASE_URL from plugin settings
4. Connect to database and run init.sql:
   psql $DATABASE_URL < database/init.sql
5. Verify tables: \dt should show 17+ tables
```

### Step 3: Provision Redis

```
1. Add Redis plugin to the project
2. Wait for provisioning
3. Copy REDIS_URL from plugin settings
4. Verify: redis-cli -u $REDIS_URL PING -> PONG
```

### Step 4: Configure API Service

```
1. Create new service from GitHub repo
2. Set root directory to project root
3. Configure Dockerfile path (if not auto-detected)
4. Set all environment variables from Section 3
5. Set PORT=8000
6. Configure healthcheck: /api/health
7. Deploy
```

### Step 5: Verify Deployment

```
1. Check deployment logs for startup errors
2. Hit healthcheck: curl https://<service-url>/api/health
3. Verify database connectivity via readiness endpoint
4. Test auth flow: register -> login -> protected endpoint
5. Test Oracle reading: time reading -> verify response
6. Check frontend loads: visit https://<service-url>/ in browser
```

### Step 6: DNS Configuration (Optional)

```
1. Add custom domain in Railway service settings
2. Configure DNS CNAME record pointing to Railway
3. Wait for SSL certificate provisioning (automatic)
4. Verify HTTPS access on custom domain
```

---

## 5. Cost Estimate

### Staging Environment (Low Usage)

| Service    | Plan    | Estimated Cost  |
| ---------- | ------- | --------------- |
| PostgreSQL | Starter | $0-5/month      |
| Redis      | Starter | $0-5/month      |
| API        | Usage   | $0-5/month      |
| **Total**  |         | **$0-15/month** |

### Production Environment (Moderate Usage)

| Service    | Plan      | Estimated Cost   |
| ---------- | --------- | ---------------- |
| PostgreSQL | Developer | $5-10/month      |
| Redis      | Developer | $5/month         |
| API        | Usage     | $5-10/month      |
| **Total**  |           | **$15-25/month** |

**Notes:**

- Railway charges based on usage (CPU time, memory, storage, bandwidth)
- Staging with minimal traffic will be near the lower end
- Anthropic API costs are separate and depend on AI usage volume
- Costs can increase significantly with high traffic or large database storage

---

## 6. Rollback Procedure

### Immediate Rollback (Service Issue)

```
1. In Railway dashboard, go to Deployments tab
2. Click on the previous successful deployment
3. Click "Redeploy" to roll back to that version
4. Verify healthcheck passes on rolled-back version
```

### Database Rollback

```
1. Railway provides automatic daily backups for PostgreSQL
2. To restore: go to PostgreSQL plugin -> Backups -> Restore
3. For point-in-time recovery: contact Railway support
4. Manual backup before risky migrations:
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Environment Variable Rollback

```
1. Railway maintains a history of variable changes
2. If a variable change causes issues, revert in the Variables tab
3. Service automatically redeploys on variable change
```

### Full Rollback (Nuclear Option)

```
1. Delete the Railway service
2. Re-create from a known-good git commit
3. Re-provision database from backup
4. Re-set all environment variables
```

---

## 7. Post-Deployment Checklist

- [ ] Healthcheck returns 200 with version info
- [ ] Database has all 17+ tables
- [ ] Redis PING returns PONG
- [ ] User registration works
- [ ] User login returns valid JWT
- [ ] Time reading returns FC60 data
- [ ] Frontend loads in browser
- [ ] HTTPS certificate is valid
- [ ] CORS allows frontend origin
- [ ] Security headers present in responses
- [ ] Telegram bot sends test message (if configured)
- [ ] Error responses return proper JSON (not stack traces)
- [ ] Logs are visible in Railway dashboard

---

## 8. Monitoring on Railway

Railway provides built-in monitoring:

- **Deployment logs:** Real-time log streaming in dashboard
- **Metrics:** CPU, memory, and network usage graphs
- **Alerts:** Configurable alerts for deployment failures
- **Usage:** Cost tracking per service

For additional monitoring, the existing Prometheus configuration can be adapted, but Railway's built-in tools are sufficient for initial staging deployment.

---

## 9. Risks and Mitigations

| Risk                               | Probability | Impact | Mitigation                                      |
| ---------------------------------- | ----------- | ------ | ----------------------------------------------- |
| Database connection limit exceeded | Medium      | High   | Configure connection pooling in SQLAlchemy      |
| Railway free tier limits reached   | Medium      | Medium | Monitor usage, upgrade plan if needed           |
| Anthropic API rate limiting        | Low         | Medium | Graceful fallback already implemented           |
| SSL certificate provisioning delay | Low         | Low    | Railway auto-provisions; manual fallback exists |
| Cold start latency                 | Medium      | Low    | Railway keeps services warm on paid plans       |
| Database migration failure         | Low         | High   | Always backup before migrations; test locally   |

---

## 10. Decision Required

This deployment plan requires user approval before execution:

1. **Cost approval:** Railway charges based on usage. Estimated $5-25/month depending on environment and traffic.
2. **Secrets generation:** New encryption keys and API secrets must be generated for the deployment environment.
3. **Anthropic API key:** Decision on whether to enable AI features in staging (uses API credits).
4. **Telegram bot:** Decision on whether to connect the Telegram bot to staging.

**To proceed:** Confirm approval for cost, and specify which optional services (Anthropic AI, Telegram) should be enabled in the staging environment.
