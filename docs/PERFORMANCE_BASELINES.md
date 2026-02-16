# NPS Performance Baselines

**Generated:** 2026-02-16
**Data Source:** SB3 performance audit (single-user, sequential requests)
**Status:** Informal baselines -- formal load testing not yet performed

---

## 1. Endpoint Latency Targets

### Tier 1: Health and Infrastructure

These endpoints perform no database queries or external calls. They should be the fastest endpoints in the system.

| Endpoint         | Method | p50 Target | p95 Target | p99 Target | Measured p50 | Measured p95 | Status |
| ---------------- | ------ | ---------- | ---------- | ---------- | ------------ | ------------ | ------ |
| `/api/health`    | GET    | 2ms        | 5ms        | 10ms       | 1ms          | 1ms          | PASS   |
| `/api/readiness` | GET    | 5ms        | 10ms       | 20ms       | 2ms          | 3ms          | PASS   |

### Tier 2: Simple CRUD Operations

These endpoints perform 1-2 database queries with indexed lookups. No external API calls.

| Endpoint                 | Method | p50 Target | p95 Target | p99 Target | Measured p50 | Measured p95 | Status     |
| ------------------------ | ------ | ---------- | ---------- | ---------- | ------------ | ------------ | ---------- |
| `/api/oracle/users`      | GET    | 10ms       | 30ms       | 50ms       | 1ms          | 1ms          | PASS       |
| `/api/oracle/users`      | POST   | 15ms       | 40ms       | 60ms       | --           | --           | UNTESTED\* |
| `/api/oracle/users/{id}` | GET    | 10ms       | 30ms       | 50ms       | 1ms          | 2ms          | PASS       |
| `/api/oracle/users/{id}` | PUT    | 15ms       | 40ms       | 60ms       | --           | --           | UNTESTED\* |
| `/api/oracle/users/{id}` | DELETE | 10ms       | 30ms       | 50ms       | --           | --           | UNTESTED\* |
| `/api/oracle/readings`   | GET    | 15ms       | 40ms       | 60ms       | --           | --           | UNTESTED\* |
| `/api/users`             | GET    | 10ms       | 30ms       | 50ms       | 1ms          | 1ms          | PASS       |
| `/api/settings`          | GET    | 10ms       | 30ms       | 50ms       | 2ms          | 3ms          | PASS       |

\*Rate limiting during SB3 test bombardment prevented measurement. Expected to meet targets based on similar endpoint performance.

### Tier 3: Authentication Endpoints

These endpoints perform database queries plus cryptographic operations (password hashing, JWT signing).

| Endpoint                    | Method | p50 Target | p95 Target | p99 Target | Measured p50 | Measured p95 | Status   |
| --------------------------- | ------ | ---------- | ---------- | ---------- | ------------ | ------------ | -------- |
| `/api/auth/login`           | POST   | 50ms       | 80ms       | 100ms      | --           | --           | UNTESTED |
| `/api/auth/register`        | POST   | 50ms       | 80ms       | 100ms      | --           | --           | UNTESTED |
| `/api/auth/refresh`         | POST   | 20ms       | 40ms       | 60ms       | --           | --           | UNTESTED |
| `/api/auth/api-keys`        | POST   | 30ms       | 50ms       | 80ms       | --           | --           | UNTESTED |
| `/api/auth/change-password` | POST   | 50ms       | 80ms       | 100ms      | --           | --           | UNTESTED |

**Note:** Password hashing (bcrypt) is intentionally slow (~50ms) for security. This is not a performance issue -- it is a design choice.

### Tier 4: Oracle Reading Endpoints (No AI)

These endpoints perform calculation-heavy operations (FC60 algorithm, numerology, zodiac) but do not call external AI APIs.

| Endpoint               | Method | p50 Target | p95 Target | p99 Target | Measured p50 | Measured p95 | Status     |
| ---------------------- | ------ | ---------- | ---------- | ---------- | ------------ | ------------ | ---------- |
| `/api/oracle/time`     | POST   | 20ms       | 50ms       | 100ms      | 5ms          | 6ms          | PASS       |
| `/api/oracle/daily`    | POST   | 20ms       | 50ms       | 100ms      | --           | --           | UNTESTED\* |
| `/api/oracle/question` | POST   | 30ms       | 80ms       | 200ms      | 12ms         | 15ms         | PASS       |

\*Rate limited during testing.

### Tier 5: Oracle Reading Endpoints (With AI)

These endpoints call the Anthropic API for AI-powered interpretations. Latency is dominated by the external API call and is highly variable.

| Endpoint                    | Method | p50 Target | p95 Target | p99 Target | Measured p50 | Measured p95 | Status   |
| --------------------------- | ------ | ---------- | ---------- | ---------- | ------------ | ------------ | -------- |
| `/api/oracle/name`          | POST   | 500ms      | 2000ms     | 5000ms     | --           | --           | TIMEOUT  |
| `/api/oracle/question` (AI) | POST   | 500ms      | 2000ms     | 5000ms     | --           | --           | TIMEOUT  |
| `/api/oracle/time` (AI)     | POST   | 500ms      | 2000ms     | 5000ms     | --           | --           | UNTESTED |

**Note:** AI-dependent endpoints timed out during SB3 testing. The Anthropic API can take 1-30 seconds depending on prompt complexity, model load, and rate limits. The 5-second target in CLAUDE.md is aspirational and depends on:

- Anthropic API response time (not under our control)
- Prompt optimization (shorter prompts = faster responses)
- Response caching (repeated queries for same input can be cached)

### Tier 6: Multi-User Analysis

These endpoints are currently returning 503 (engines not implemented). Targets are aspirational.

| Endpoint                      | Method | p50 Target | p95 Target | p99 Target | Status |
| ----------------------------- | ------ | ---------- | ---------- | ---------- | ------ |
| `/api/oracle/multi-user`      | POST   | 200ms      | 500ms      | 1000ms     | 503    |
| `/api/oracle/multi-user/deep` | POST   | 500ms      | 2000ms     | 5000ms     | 503    |

---

## 2. Comparison to CLAUDE.md Targets

CLAUDE.md defines the following performance targets:

| Operation                | CLAUDE.md Target | Current Status           | Assessment                |
| ------------------------ | ---------------- | ------------------------ | ------------------------- |
| API response (simple)    | < 50ms p95       | 1-3ms p95                | Exceeds target by 15-50x  |
| API response (reading)   | < 5 seconds      | 5-15ms (no AI), TBD (AI) | Exceeds target without AI |
| Frontend initial load    | < 2 seconds      | ~122KB gzipped JS        | Likely meets target       |
| Frontend transitions     | < 100ms          | Not measured             | Likely meets target (SPA) |
| Database query (indexed) | < 100ms          | <5ms observed            | Exceeds target by 20x     |

**Summary:** All measurable targets are met or exceeded for non-AI operations. AI-dependent operations need dedicated measurement and optimization.

---

## 3. Database Query Performance

### Index Coverage

The PostgreSQL schema includes 26 indexes covering the primary query patterns:

| Table              | Indexes | Key Columns Indexed                                      |
| ------------------ | ------- | -------------------------------------------------------- |
| users              | 4       | id, username, email, api_key_hash                        |
| oracle_users       | 3       | id, created_by, name                                     |
| oracle_readings    | 5       | id, oracle_user_id, reading_type, created_at, deleted_at |
| api_keys           | 2       | id, key_hash                                             |
| oracle_audit_log   | 3       | id, user_id, created_at                                  |
| user_settings      | 2       | id, user_id                                              |
| oracle_share_links | 3       | id, token, reading_id                                    |
| Other tables       | 4       | Various primary and foreign keys                         |

### Query Patterns Not Yet Profiled

The following query patterns should be profiled with `EXPLAIN ANALYZE` when the database has realistic data volume:

1. Reading history pagination (ORDER BY created_at DESC LIMIT/OFFSET)
2. Audit log filtering by date range
3. Multi-user reading aggregation (when engines are built)
4. Share link lookup by token
5. User search by username/email (admin)

---

## 4. Frontend Performance

### Bundle Size Budget

| Category               | Budget | Actual        | Status |
| ---------------------- | ------ | ------------- | ------ |
| Initial load (gzipped) | 500KB  | 122KB         | PASS   |
| Largest lazy chunk     | 150KB  | 128KB (jspdf) | PASS   |

### Initial Load Breakdown

| Chunk             | Size (gzipped) | Load Priority |
| ----------------- | -------------- | ------------- |
| vendor-react      | 53.8KB         | Critical      |
| index (app shell) | 28.2KB         | Critical      |
| vendor-i18n       | 18.8KB         | Critical      |
| vendor-query      | 12.1KB         | Critical      |
| purify.es         | 8.8KB          | Critical      |
| vendor-calendar   | 0.6KB          | Critical      |
| **Total initial** | **~122KB**     | --            |

### Not Yet Measured

- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Cumulative Layout Shift (CLS) -- partially tested in Playwright (pass)
- Largest Contentful Paint (LCP)

These Web Vitals metrics should be measured with Lighthouse or a real-user monitoring tool after deployment.

---

## 5. Optimization Recommendations

### Priority 1: Redis Caching

**Impact:** High (reduces database load, improves response times for repeated queries)

Implement caching for:

- **Oracle readings:** Cache completed readings by user_id + reading_type + input hash. TTL: 1 hour.
- **User profiles:** Cache frequently accessed oracle_user records. TTL: 5 minutes.
- **Daily readings:** Cache daily readings (same for all users on a given date). TTL: 24 hours.
- **Translation strings:** Cache i18n translations. TTL: 1 hour.

Redis is already provisioned and connected. The caching layer needs to be implemented in the service layer.

### Priority 2: Connection Pooling Tuning

**Impact:** Medium (prevents connection exhaustion under load)

Current SQLAlchemy configuration uses default pool settings. For production:

```python
# Recommended settings for Railway deployment
engine = create_async_engine(
    database_url,
    pool_size=10,          # Base connections
    max_overflow=20,       # Burst connections
    pool_timeout=30,       # Wait time for connection
    pool_recycle=1800,     # Recycle connections every 30 min
    pool_pre_ping=True,    # Validate connections before use
)
```

### Priority 3: Lazy AI Loading

**Impact:** Medium (reduces startup time, prevents unnecessary API initialization)

The Anthropic client is initialized at module import time. For endpoints that do not use AI:

- Defer Anthropic client initialization until first AI call
- Use a singleton pattern with lazy instantiation
- Skip initialization entirely if `ANTHROPIC_API_KEY` is not set

### Priority 4: Response Compression

**Impact:** Low-Medium (reduces bandwidth for large responses)

Enable gzip/brotli compression in FastAPI middleware for responses larger than 1KB:

```python
from starlette.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

This is especially beneficial for reading responses that include AI-generated text interpretations.

### Priority 5: Query Optimization

**Impact:** Low (current queries are fast, but may degrade with data volume)

- Add `EXPLAIN ANALYZE` profiling for the top 10 query patterns
- Consider materialized views for admin dashboard aggregate statistics
- Add database-level pagination cursors instead of OFFSET for large result sets
- Monitor slow query log after deployment

---

## 6. Load Testing Plan

When formal load testing is conducted, use the following test scenarios:

### Scenario 1: Baseline (Normal Load)

```
Users: 10 concurrent
Duration: 5 minutes
Mix: 50% health/CRUD, 30% readings (no AI), 20% auth
Target: p95 < 50ms for CRUD, < 100ms for readings
```

### Scenario 2: Moderate Load

```
Users: 50 concurrent
Duration: 10 minutes
Mix: 40% CRUD, 30% readings, 20% auth, 10% AI readings
Target: p95 < 100ms for CRUD, < 500ms for readings
Error rate: < 1%
```

### Scenario 3: Stress Test

```
Users: 100 concurrent, ramping up over 5 minutes
Duration: 15 minutes at peak
Target: Identify breaking point, measure degradation curve
Acceptable: Graceful degradation (slower responses, not errors)
```

### Scenario 4: AI Endpoint Isolation

```
Users: 5 concurrent (AI endpoints only)
Duration: 5 minutes
Target: Measure Anthropic API impact, identify rate limit thresholds
```

### Recommended Tool

k6 (preferred) or locust. k6 integrates well with CI pipelines and produces clear HTML reports with percentile breakdowns.

---

## 7. Monitoring Metrics to Track

Once deployed, the following metrics should be collected and dashboarded:

| Metric                         | Source      | Alert Threshold             |
| ------------------------------ | ----------- | --------------------------- |
| API response time (p95)        | Prometheus  | > 500ms for 5 minutes       |
| API error rate (5xx)           | Prometheus  | > 5% for 1 minute           |
| Database connection pool usage | SQLAlchemy  | > 80% for 5 minutes         |
| Database query time (p95)      | PostgreSQL  | > 100ms                     |
| Redis memory usage             | Redis INFO  | > 80% of max                |
| Redis hit rate                 | Redis INFO  | < 50% (cache not effective) |
| Anthropic API latency          | Application | > 10s (log warning)         |
| Anthropic API error rate       | Application | > 10% (alert)               |
| Frontend initial load time     | Lighthouse  | > 3 seconds                 |
| Active database connections    | PostgreSQL  | > 80% of max_connections    |
