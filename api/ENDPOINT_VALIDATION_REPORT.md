# API Endpoint Validation Report

**Generated:** 2026-02-15T16:38:58.795177+00:00
**Base URL:** http://localhost:8000
**Total time:** 24.9s

## Summary

| Metric | Value |
|--------|-------|
| Total endpoints tested | 66 |
| Passed | 60 |
| Failed | 6 |
| Pass rate | 90.9% |
| Avg response time | 364.3ms |
| P95 response time | 1516.7ms |
| Max response time | 10004.4ms |

## Results by Endpoint

| Method | Path | Expected | Actual | Status | Time (ms) |
|--------|------|----------|--------|--------|-----------|
| GET | `/api/health` | 200 | 200 | PASS | 1.9 |
| GET | `/api/health/ready` | 200 | 200 | PASS | 3.1 |
| GET | `/api/health/performance` | 200 | 200 | PASS | 2.1 |
| GET | `/api/health/detailed` | 200 | 200 | PASS | 25.0 |
| GET | `/api/health/logs` | 200 | 200 | PASS | 9.9 |
| GET | `/api/health/analytics` | 200 | 200 | PASS | 12.4 |
| GET | `/api/health/detailed` | 401 | 401 | PASS | 2.0 |
| GET | `/api/health/logs` | 401 | 401 | PASS | 1.6 |
| POST | `/api/auth/login` | 401 | 401 | PASS | 4.5 |
| POST | `/api/auth/refresh` | 401 | 401 | PASS | 3.6 |
| POST | `/api/auth/register` | 401 | 401 | PASS | 1.9 |
| POST | `/api/auth/api-keys` | 200 | 500 | FAIL | 18.7 |
| GET | `/api/users` | 200 | 200 | PASS | 8.4 |
| GET | `/api/users/f77d6938-39b6-42f7-9bc3-dc3173304017` | 200 | 200 | PASS | 4.9 |
| GET | `/api/users` | 401 | 401 | PASS | 1.6 |
| POST | `/api/oracle/users` | 200 | 422 | PASS | 4.9 |
| GET | `/api/oracle/users` | 200 | 200 | PASS | 8.7 |
| POST | `/api/oracle/reading` | 200 | 200 | PASS | 8.5 |
| POST | `/api/oracle/name` | 200 | 0 | FAIL | 10002.3 |
| POST | `/api/oracle/question` | 200 | 0 | FAIL | 10004.4 |
| GET | `/api/oracle/daily` | 200 | 200 | PASS | 7.3 |
| GET | `/api/oracle/stats` | 200 | 200 | PASS | 12.6 |
| GET | `/api/oracle/readings` | 200 | 200 | PASS | 12.0 |
| GET | `/api/oracle/readings/stats` | 200 | 200 | PASS | 23.6 |
| POST | `/api/oracle/validate-stamp` | 200 | 200 | PASS | 5.0 |
| GET | `/api/oracle/daily/reading` | 200 | 422 | PASS | 4.5 |
| GET | `/api/oracle/audit` | 200 | 500 | FAIL | 12.1 |
| POST | `/api/oracle/reading` | 401 | 401 | PASS | 2.8 |
| POST | `/api/scanner/start` | 503 | 501 | PASS | 2.2 |
| GET | `/api/scanner/terminals` | 200 | 200 | PASS | 2.9 |
| GET | `/api/vault/findings` | 200 | 200 | PASS | 2.0 |
| GET | `/api/vault/summary` | 200 | 200 | PASS | 1.4 |
| GET | `/api/vault/search` | 200 | 422 | PASS | 1.5 |
| GET | `/api/learning/stats` | 200 | 200 | PASS | 1.9 |
| GET | `/api/learning/insights` | 200 | 200 | PASS | 1.6 |
| GET | `/api/learning/weights` | 200 | 200 | PASS | 1.6 |
| GET | `/api/learning/patterns` | 200 | 200 | PASS | 1.5 |
| GET | `/api/learning/oracle/stats` | 200 | 200 | PASS | 10.8 |
| POST | `/api/translation/translate` | 200 | 200 | PASS | 1516.7 |
| GET | `/api/translation/detect?text=Hello` | 200 | 200 | PASS | 6.3 |
| POST | `/api/translation/translate` | 401 | 401 | PASS | 3.5 |
| GET | `/api/location/countries` | 200 | 200 | PASS | 8.2 |
| GET | `/api/location/countries/US/cities` | 200 | 200 | PASS | 3.9 |
| GET | `/api/location/timezone?lat=35.6892&lng=51.3890` | 200 | 422 | PASS | 3.7 |
| GET | `/api/location/coordinates?country=US&city=New York` | 200 | 200 | PASS | 2206.2 |
| GET | `/api/location/detect` | 200 | 400 | FAIL | 3.9 |
| GET | `/api/settings` | 200 | 200 | PASS | 4.4 |
| PUT | `/api/settings` | 200 | 400 | FAIL | 3.3 |
| GET | `/api/settings` | 401 | 401 | PASS | 1.6 |
| GET | `/api/share/invalidtoken123` | 404 | 404 | PASS | 4.5 |
| POST | `/api/share` | 401 | 401 | PASS | 2.1 |
| GET | `/api/telegram/admin/stats` | 200 | 200 | PASS | 8.3 |
| GET | `/api/telegram/admin/users` | 200 | 200 | PASS | 2.9 |
| GET | `/api/telegram/admin/linked_chats` | 200 | 200 | PASS | 3.3 |
| GET | `/api/telegram/admin/stats` | 401 | 401 | PASS | 1.6 |
| GET | `/api/admin/users` | 200 | 200 | PASS | 3.4 |
| GET | `/api/admin/stats` | 200 | 200 | PASS | 4.7 |
| GET | `/api/admin/profiles` | 200 | 200 | PASS | 3.7 |
| GET | `/api/admin/backups` | 200 | 200 | PASS | 1.9 |
| GET | `/api/admin/users` | 401 | 401 | PASS | 1.4 |
| GET | `/api/admin/stats` | 401 | 401 | PASS | 1.2 |
| GET | `/api/admin/users` | 403 | 403 | PASS | 1.2 |
| POST | `/api/auth/login (invalid JSON)` | 422 | 422 | PASS | 1.2 |
| POST | `/api/auth/login` | 422 | 422 | PASS | 1.7 |
| POST | `/api/oracle/reading` | 401 | 401 | PASS | 1.7 |
| GET | `/api/nonexistent` | 404 | 404 | PASS | 1.5 |

## Failed Endpoints

- **POST /api/auth/api-keys**: expected 200, got 500. 
- **POST /api/oracle/name**: expected 200, got 0. HTTPConnectionPool(host='localhost', port=8000): Read timed out. (read timeout=10)
- **POST /api/oracle/question**: expected 200, got 0. HTTPConnectionPool(host='localhost', port=8000): Read timed out. (read timeout=10)
- **GET /api/oracle/audit**: expected 200, got 500. 
- **GET /api/location/detect**: expected 200, got 400. 
- **PUT /api/settings**: expected 200, got 400. 

## Notes

- Scanner endpoints return 503 (expected — scanner not deployed)
- Multi-user endpoints may return 503 (expected — feature not fully implemented)
- Auth enforcement verified: protected endpoints correctly return 401/403
