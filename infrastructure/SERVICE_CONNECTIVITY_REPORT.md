# Service Connectivity Report

**Generated:** 2026-02-13T23:49:56.970640+00:00
**Mode:** Local (PostgreSQL + Redis on localhost, API on :8000)
**Total time:** 3.4s

## Summary

| Metric | Value |
|--------|-------|
| Total tests | 9 |
| Passed | 6 |
| Failed | 0 |
| Skipped | 3 |

## Results

| Connection | Method | Status | Detail | Time (ms) |
|-----------|--------|--------|--------|-----------|
| API -> PostgreSQL | SQLAlchemy | PASS | 23 tables: api_keys, audit_log, findings, health_checks, insights, learning_data | 166.0 |
| API -> Redis | redis-py | PASS | PING+SET/GET/TTL OK | 30.1 |
| API -> Oracle gRPC | grpc channel | SKIP | Not available (expected in local mode):  | 3017.3 |
| HTTP -> API /health | HTTP GET | PASS | status=healthy, version=4.0.0 | 127.8 |
| API Readiness | HTTP GET | PASS | database=healthy, redis=healthy, scanner_service=not_deployed, oracle_service=di | 4.4 |
| API Swagger /docs | HTTP GET | PASS | status_code=200 | 1.5 |
| Nginx -> API proxy | TCP connect | SKIP | Port 80 not listening (no Nginx/Docker) | 0.3 |
| Frontend :5173 | TCP connect | SKIP | Port 5173 not listening (frontend not running) | 0.3 |
| DB Schema Integrity | SQL | PASS | 23 tables present (+9 extra: audit_log, findings, health_checks, insights, learn | 13.5 |

## Notes

- **Oracle gRPC**: Skipped in local mode — API uses direct Python imports (legacy mode)
- **Nginx proxy**: Skipped — requires Docker deployment
- **Frontend**: Skipped if not running — tested separately via `npm run dev`
- **Scanner**: Not tested — CLAUDE.md says DO NOT TOUCH (Rust stub only)
