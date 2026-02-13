# NPS API Reference

> Comprehensive REST API documentation for the Numerology Puzzle Solver.
> Generated from source code analysis. Last updated: 2026-02-14.

**Base URL:** `http://localhost:8000/api`
**WebSocket:** `ws://localhost:8000/ws/oracle`
**Interactive docs:** `http://localhost:8000/docs` (Swagger UI)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Health](#health-apihealth)
5. [Auth](#auth-apiauth)
6. [Oracle Users](#oracle-users-apioracleusers)
7. [Oracle Readings](#oracle-readings-apioracle)
8. [Reading History](#reading-history-apioraclereadings)
9. [Audit Log](#audit-log-apioracleaudit)
10. [Admin](#admin-apiadmin)
11. [System Users](#system-users-apiusers)
12. [Telegram](#telegram-apitelegram)
13. [Translation](#translation-apitranslation)
14. [Location](#location-apilocation)
15. [Share](#share-apishare)
16. [Settings](#settings-apisettings)
17. [Learning](#learning-apilearning)
18. [Scanner](#scanner-apiscanner)
19. [Vault](#vault-apivault)
20. [WebSocket](#websocket)
21. [Status Codes](#status-codes)

---

## Authentication

All endpoints except health probes and shared reading links require authentication via one of three methods.

### Method 1: JWT Token (Recommended)

Obtained via `POST /api/auth/login`. Passed in the `Authorization` header.

```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

- **Access token:** 24-hour expiry (configurable)
- **Refresh token:** 7-day expiry
- Supports token rotation via `POST /api/auth/refresh`
- Tokens can be blacklisted via `POST /api/auth/logout`

### Method 2: API Key

Created via `POST /api/auth/api-keys` (admin only). Keys are SHA-256 hashed in the database; the plaintext is shown only at creation time.

```
Authorization: Bearer <API_KEY>
```

- Scoped to specific permissions
- No expiry (must be manually revoked)
- Prefix: `nps_k_`

### Method 3: Legacy Token

Uses the server's `API_SECRET_KEY` directly. Grants full admin access.

```
Authorization: Bearer <API_SECRET_KEY>
```

- Intended for development and migration only
- Grants all scopes including `admin`

### Roles and Scopes

| Role        | Scopes Granted                                                              |
| ----------- | --------------------------------------------------------------------------- |
| `admin`     | `admin`, `moderator`, `oracle:admin`, `oracle:write`, `oracle:read`, `user` |
| `moderator` | `moderator`, `oracle:write`, `oracle:read`, `user`                          |
| `user`      | `oracle:write`, `oracle:read`, `user`                                       |
| `readonly`  | `oracle:read`, `user`                                                       |

**Scope Hierarchy:**

- `admin` implies all scopes
- `oracle:admin` implies `oracle:write` implies `oracle:read`
- `moderator` implies `oracle:write` and `oracle:read`

---

## Error Handling

All errors return a JSON body with a `detail` field:

```json
{
  "detail": "Human-readable error message"
}
```

Validation errors (422) include field-level details:

```json
{
  "detail": [
    {
      "loc": ["body", "username"],
      "msg": "String should have at least 3 characters",
      "type": "string_too_short"
    }
  ]
}
```

---

## Rate Limiting

Rate limits are enforced by the `RateLimitMiddleware` and optionally by nginx in production.

| Endpoint Group | Rate   | Burst |
| -------------- | ------ | ----- |
| `/api/auth/*`  | 5/sec  | 10    |
| `/api/*`       | 30/sec | 50    |

Exceeding limits returns `429 Too Many Requests` with a `Retry-After` header.

**Account Lockout:** After 5 consecutive failed login attempts, the account is locked for 15 minutes.

---

## Health (`/api/health`)

Health check endpoints. Basic probes are unauthenticated for Docker and load balancer use. Detailed monitoring requires admin access.

### `GET /api/health`

Basic health check. **No auth required.**

**Response 200:**

```json
{
  "status": "healthy",
  "version": "4.0.0"
}
```

---

### `GET /api/health/ready`

Readiness probe checking database and service connectivity. **No auth required.**

**Response 200:**

```json
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "scanner_service": "not_deployed",
    "oracle_service": "direct_mode"
  }
}
```

Possible check values: `"healthy"`, `"unhealthy"`, `"not_connected"`, `"not_deployed"`, `"direct_mode"`.

---

### `GET /api/health/performance`

Performance metrics stub. **No auth required.**

**Response 200:**

```json
{
  "uptime_seconds": 0,
  "requests_total": 0,
  "requests_per_minute": 0,
  "p95_response_ms": 0
}
```

---

### `GET /api/health/detailed`

Full system health with component details. **Scope: `admin`**

**Response 200:**

```json
{
  "status": "healthy",
  "timestamp": "2026-02-14T12:00:00+00:00",
  "uptime_seconds": 3600,
  "system": {
    "platform": "Linux-5.15.0-x86_64",
    "python_version": "3.11.8",
    "cpu_count": 4,
    "process_memory_mb": 128.5
  },
  "services": {
    "database": {
      "status": "healthy",
      "type": "postgresql",
      "size_bytes": 52428800
    },
    "redis": {
      "status": "healthy",
      "used_memory_bytes": 1048576,
      "used_memory_human": "1.00M"
    },
    "oracle_service": {
      "status": "direct_mode",
      "mode": "legacy"
    },
    "scanner_service": {
      "status": "not_deployed"
    },
    "api": {
      "status": "healthy",
      "version": "4.0.0",
      "python_version": "3.11.8"
    },
    "telegram": {
      "status": "configured"
    },
    "nginx": {
      "status": "external",
      "note": "Check via Docker health"
    }
  }
}
```

---

### `GET /api/health/logs`

Query audit logs with filtering. **Scope: `admin`**

**Query Parameters:**

| Parameter       | Type   | Default | Description                            |
| --------------- | ------ | ------- | -------------------------------------- |
| `limit`         | int    | 50      | Results per page (1-500)               |
| `offset`        | int    | 0       | Pagination offset                      |
| `severity`      | string | null    | `info`, `warning`, `error`, `critical` |
| `action`        | string | null    | Filter by action type                  |
| `resource_type` | string | null    | Filter by resource type                |
| `success`       | bool   | null    | Filter by success status               |
| `search`        | string | null    | Search in action and details           |
| `hours`         | int    | 24      | Time window in hours (1-720)           |

**Response 200:**

```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2026-02-14T12:00:00",
      "action": "user.login",
      "resource_type": "auth",
      "resource_id": "<USER_ID>",
      "success": true,
      "ip_address": "<CLIENT_IP>",
      "details": { "method": "jwt" },
      "severity": "info"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "time_window_hours": 24
}
```

---

### `GET /api/health/analytics`

Reading analytics for the admin dashboard. **Scope: `admin`**

**Query Parameters:**

| Parameter | Type | Default | Description                |
| --------- | ---- | ------- | -------------------------- |
| `days`    | int  | 30      | Time range in days (1-365) |

**Response 200:**

```json
{
  "period_days": 30,
  "readings_per_day": [
    { "date": "2026-02-01", "count": 15 },
    { "date": "2026-02-02", "count": 22 }
  ],
  "readings_by_type": [
    { "type": "time_reading", "count": 120 },
    { "type": "name_reading", "count": 45 }
  ],
  "confidence_trend": [{ "date": "2026-02-01", "avg_confidence": 7.5 }],
  "popular_hours": [
    { "hour": 14, "count": 35 },
    { "hour": 20, "count": 28 }
  ],
  "totals": {
    "total_readings": 523,
    "avg_confidence": 7.2,
    "most_popular_type": "time_reading",
    "most_active_hour": 14,
    "error_count": 3
  }
}
```

---

## Auth (`/api/auth`)

Authentication and API key management endpoints.

### `POST /api/auth/login`

Authenticate with username and password. Returns JWT access and refresh tokens.

**Request Body:**

```json
{
  "username": "admin",
  "password": "<USER_PASSWORD>"
}
```

| Field      | Type   | Required | Constraints      |
| ---------- | ------ | -------- | ---------------- |
| `username` | string | yes      | 3-100 characters |
| `password` | string | yes      | 8-128 characters |

**Response 200:**

```json
{
  "access_token": "<JWT_ACCESS_TOKEN>",
  "refresh_token": "<JWT_REFRESH_TOKEN>",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "<USER_ID>",
    "username": "admin",
    "role": "admin"
  }
}
```

**Error 401:** Invalid credentials
**Error 423:** Account locked (5 failed attempts, 15-minute lockout)

---

### `POST /api/auth/register`

Register a new user account.

**Request Body:**

```json
{
  "username": "newuser",
  "password": "<USER_PASSWORD>"
}
```

| Field      | Type   | Required | Constraints      |
| ---------- | ------ | -------- | ---------------- |
| `username` | string | yes      | 3-100 characters |
| `password` | string | yes      | 8-128 characters |

**Response 201:**

```json
{
  "access_token": "<JWT_ACCESS_TOKEN>",
  "refresh_token": "<JWT_REFRESH_TOKEN>",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "<USER_ID>",
    "username": "newuser",
    "role": "user"
  }
}
```

**Error 409:** Username already exists

---

### `POST /api/auth/refresh`

Refresh an expired access token using a valid refresh token.

**Request Body:**

```json
{
  "refresh_token": "<JWT_REFRESH_TOKEN>"
}
```

**Response 200:**

```json
{
  "access_token": "<JWT_ACCESS_TOKEN>",
  "refresh_token": "<JWT_REFRESH_TOKEN>",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "<USER_ID>",
    "username": "admin",
    "role": "admin"
  }
}
```

**Error 401:** Invalid or expired refresh token

---

### `POST /api/auth/logout`

Invalidate the current JWT token by adding it to the blacklist.

**Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`

**Response 200:**

```json
{
  "message": "Logged out successfully"
}
```

---

### `POST /api/auth/change-password`

Change the authenticated user's password.

**Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`

**Request Body:**

```json
{
  "current_password": "<CURRENT_PASSWORD>",
  "new_password": "<NEW_PASSWORD>"
}
```

| Field              | Type   | Required | Constraints      |
| ------------------ | ------ | -------- | ---------------- |
| `current_password` | string | yes      | Must match       |
| `new_password`     | string | yes      | 8-128 characters |

**Response 200:**

```json
{
  "message": "Password changed successfully"
}
```

**Error 401:** Current password incorrect

---

### `POST /api/auth/api-keys`

Create a new API key. **Scope: `admin`**

The plaintext key is returned only in this response and cannot be retrieved later.

**Request Body:**

```json
{
  "name": "my-integration-key",
  "scopes": ["oracle:read", "oracle:write"]
}
```

| Field    | Type     | Required | Constraints      |
| -------- | -------- | -------- | ---------------- |
| `name`   | string   | yes      | 1-100 characters |
| `scopes` | string[] | yes      | Valid scope list |

**Response 201:**

```json
{
  "id": 1,
  "name": "my-integration-key",
  "key": "<API_KEY_PLAINTEXT>",
  "scopes": ["oracle:read", "oracle:write"],
  "created_at": "2026-02-14T12:00:00+00:00"
}
```

---

### `GET /api/auth/api-keys`

List all API keys (without plaintext values). **Scope: `admin`**

**Response 200:**

```json
[
  {
    "id": 1,
    "name": "my-integration-key",
    "scopes": ["oracle:read", "oracle:write"],
    "created_at": "2026-02-14T12:00:00+00:00",
    "last_used": "2026-02-14T14:30:00+00:00"
  }
]
```

---

### `DELETE /api/auth/api-keys/{key_id}`

Revoke an API key permanently. **Scope: `admin`**

**Path Parameters:**

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `key_id`  | int  | API key ID  |

**Response 200:**

```json
{
  "message": "API key revoked"
}
```

**Error 404:** API key not found

---

## Oracle Users (`/api/oracle/users`)

Manage Oracle user profiles used for numerological readings.

### `POST /api/oracle/users`

Create a new Oracle user profile. **Scope: `oracle:write`**

**Request Body:**

```json
{
  "name": "John Doe",
  "name_persian": "جان دو",
  "birthday": "1990-06-15",
  "mother_name": "Jane Doe",
  "mother_name_persian": "جین دو",
  "country": "US",
  "city": "New York"
}
```

| Field                 | Type   | Required | Constraints                      |
| --------------------- | ------ | -------- | -------------------------------- |
| `name`                | string | yes      | 2-200 chars, no digits allowed   |
| `name_persian`        | string | no       | Persian transliteration          |
| `birthday`            | date   | yes      | Format: YYYY-MM-DD, year >= 1900 |
| `mother_name`         | string | no       | Stored AES-256-GCM encrypted     |
| `mother_name_persian` | string | no       | Persian transliteration          |
| `country`             | string | no       | Country code (e.g., "US", "IR")  |
| `city`                | string | no       | City name                        |

**Response 201:**

```json
{
  "id": 1,
  "name": "John Doe",
  "name_persian": "جان دو",
  "birthday": "1990-06-15",
  "mother_name": "Jane Doe",
  "mother_name_persian": "جین دو",
  "country": "US",
  "city": "New York",
  "created_at": "2026-02-14T12:00:00+00:00",
  "updated_at": "2026-02-14T12:00:00+00:00"
}
```

**Error 409:** Profile with this name already exists for the user

---

### `GET /api/oracle/users`

List Oracle user profiles with pagination and search. **Scope: `oracle:read`**

**Query Parameters:**

| Parameter | Type   | Default | Description              |
| --------- | ------ | ------- | ------------------------ |
| `limit`   | int    | 20      | Results per page (1-100) |
| `offset`  | int    | 0       | Pagination offset        |
| `search`  | string | null    | Search by name           |

**Response 200:**

```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "name_persian": "جان دو",
      "birthday": "1990-06-15",
      "country": "US",
      "city": "New York",
      "created_at": "2026-02-14T12:00:00+00:00",
      "updated_at": "2026-02-14T12:00:00+00:00"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### `GET /api/oracle/users/{user_id}`

Get a specific Oracle user profile. **Scope: `oracle:read`**

**Path Parameters:**

| Parameter | Type | Description            |
| --------- | ---- | ---------------------- |
| `user_id` | int  | Oracle user/profile ID |

**Response 200:** Full user object (same as creation response)

**Error 404:** User not found

---

### `PUT /api/oracle/users/{user_id}`

Update an Oracle user profile (partial update). **Scope: `oracle:write`**

**Request Body:** Any subset of the creation fields.

```json
{
  "city": "Los Angeles",
  "country": "US"
}
```

**Response 200:** Updated user object

**Error 404:** User not found

---

### `DELETE /api/oracle/users/{user_id}`

Soft-delete an Oracle user profile. **Scope: `oracle:admin`**

Sets `deleted_at` timestamp. Profile can be excluded from queries but is not permanently removed.

**Response 200:**

```json
{
  "message": "Profile deleted"
}
```

**Error 404:** User not found

---

## Oracle Readings (`/api/oracle`)

Endpoints for generating numerological readings, FC60 framework analysis, and AI interpretations.

### `POST /api/oracle/reading`

Generate a time-based oracle reading with FC60 framework, numerology, zodiac, and Chinese zodiac analysis. **Scope: `oracle:write`**

**Request Body:**

```json
{
  "oracle_user_id": 1,
  "datetime": "2026-02-14T14:30:00+03:30",
  "numerology_system": "pythagorean",
  "include_ai": true,
  "extended": false,
  "locale": "en"
}
```

| Field               | Type   | Required | Description                                          |
| ------------------- | ------ | -------- | ---------------------------------------------------- |
| `oracle_user_id`    | int    | yes      | Profile to read for                                  |
| `datetime`          | string | no       | ISO 8601 datetime (default: now)                     |
| `numerology_system` | string | no       | `pythagorean`, `chaldean`, `abjad`, `auto` (default) |
| `include_ai`        | bool   | no       | Include AI interpretation (default: true)            |
| `extended`          | bool   | no       | Extended analysis (default: false)                   |
| `locale`            | string | no       | `en` or `fa` (default: `en`)                         |

**Response 200:**

```json
{
  "reading_id": 42,
  "sign_type": "time_reading",
  "oracle_user_id": 1,
  "fc60": {
    "cycle": 43,
    "element": "Fire",
    "polarity": "Yang",
    "stem": "Bing",
    "branch": "Wu",
    "year_number": 7,
    "month_number": 3,
    "day_number": 9,
    "energy_level": 0.85,
    "element_balance": {
      "Wood": 0.2,
      "Fire": 0.4,
      "Earth": 0.2,
      "Metal": 0.1,
      "Water": 0.1
    }
  },
  "numerology": {
    "life_path": 7,
    "day_vibration": 8,
    "personal_year": 3,
    "personal_month": 5,
    "personal_day": 2,
    "system": "pythagorean",
    "interpretation": "The Seeker: You are on a path of knowledge and understanding"
  },
  "zodiac": {
    "sign": "Aquarius",
    "element": "Air",
    "ruling_planet": "Uranus"
  },
  "chinese_zodiac": {
    "animal": "Horse",
    "element": "Fire",
    "yin_yang": "Yang"
  },
  "confidence": {
    "score": 8.5,
    "factors": ["strong_element_alignment", "favorable_cycle"]
  },
  "ai_interpretation": "A day of heightened intuition and creative energy...",
  "summary": "Strong Fire energy with Yang polarity...",
  "generated_at": "2026-02-14T14:30:00+03:30"
}
```

---

### `POST /api/oracle/question`

Ask a yes/no question with numerological context. **Scope: `oracle:write`**

**Request Body:**

```json
{
  "oracle_user_id": 1,
  "question": "Is today a good day for important decisions?",
  "numerology_system": "pythagorean",
  "locale": "en"
}
```

| Field               | Type   | Required | Description                     |
| ------------------- | ------ | -------- | ------------------------------- |
| `oracle_user_id`    | int    | yes      | Profile to read for             |
| `question`          | string | yes      | The question to analyze         |
| `numerology_system` | string | no       | System to use (default: `auto`) |
| `locale`            | string | no       | `en` or `fa`                    |

**Response 200:**

```json
{
  "reading_id": 43,
  "question": "Is today a good day for important decisions?",
  "answer": "yes",
  "sign_number": 7,
  "confidence": {
    "score": 7.0,
    "factors": ["question_clarity", "numerological_alignment"]
  },
  "interpretation": "The numbers suggest a favorable alignment for decisive action...",
  "numerology": {
    "question_value": 7,
    "day_vibration": 8,
    "system": "pythagorean"
  }
}
```

---

### `POST /api/oracle/name`

Analyze a name using numerological cipher systems. **Scope: `oracle:write`**

**Request Body:**

```json
{
  "oracle_user_id": 1,
  "name": "Satoshi Nakamoto",
  "numerology_system": "pythagorean",
  "locale": "en"
}
```

| Field               | Type   | Required | Description                     |
| ------------------- | ------ | -------- | ------------------------------- |
| `oracle_user_id`    | int    | yes      | Profile to read for             |
| `name`              | string | yes      | Name to analyze                 |
| `numerology_system` | string | no       | System to use (default: `auto`) |
| `locale`            | string | no       | `en` or `fa`                    |

**Response 200:**

```json
{
  "reading_id": 44,
  "name": "Satoshi Nakamoto",
  "destiny_number": 1,
  "soul_urge": 6,
  "personality": 4,
  "letters": [
    { "letter": "S", "value": 1, "type": "consonant" },
    { "letter": "A", "value": 1, "type": "vowel" },
    { "letter": "T", "value": 2, "type": "consonant" }
  ],
  "system": "pythagorean",
  "interpretation": "A natural leader with visionary qualities..."
}
```

---

### `GET /api/oracle/daily`

Get daily oracle insight for the current or specified date. **Scope: `oracle:read`**

**Query Parameters:**

| Parameter        | Type   | Default | Description                      |
| ---------------- | ------ | ------- | -------------------------------- |
| `oracle_user_id` | int    | null    | Profile for personalized reading |
| `date`           | string | today   | Date in YYYY-MM-DD format        |

**Response 200:**

```json
{
  "date": "2026-02-14",
  "insight": "A day governed by the number 5, bringing change and adaptability...",
  "lucky_numbers": [3, 7, 11],
  "optimal_activity": "Communication and networking",
  "element_of_day": "Fire",
  "energy_level": 0.75
}
```

---

### `POST /api/oracle/suggest-range`

Get AI-suggested Bitcoin puzzle scan range based on numerological analysis. **Scope: `oracle:write`**

**Request Body:**

```json
{
  "oracle_user_id": 1,
  "scanned_ranges": ["20000000000000000-20000000000100000"],
  "puzzle_number": 66,
  "ai_level": 3
}
```

| Field            | Type     | Required | Description               |
| ---------------- | -------- | -------- | ------------------------- |
| `oracle_user_id` | int      | yes      | Profile for analysis      |
| `scanned_ranges` | string[] | no       | Previously scanned ranges |
| `puzzle_number`  | int      | yes      | Bitcoin puzzle number     |
| `ai_level`       | int      | no       | AI analysis depth (1-5)   |

**Response 200:**

```json
{
  "reading_id": 45,
  "range_start": "0x20000000000000000",
  "range_end": "0x3ffffffffffffffff",
  "strategy": "cosmic",
  "confidence": {
    "score": 8.0,
    "factors": ["pattern_alignment", "cycle_harmony"]
  },
  "reasoning": "Based on FC60 cycle analysis and numerological patterns..."
}
```

---

### `POST /api/oracle/validate-stamp`

Validate a cosmic stamp value. **Scope: `oracle:write`**

**Request Body:**

```json
{
  "stamp": "FC60-2026-043-FIRE-YANG",
  "oracle_user_id": 1
}
```

**Response 200:**

```json
{
  "valid": true,
  "stamp": "FC60-2026-043-FIRE-YANG",
  "details": {
    "cycle": 43,
    "element": "Fire",
    "polarity": "Yang",
    "year": 2026
  }
}
```

---

### `POST /api/oracle/reading/multi-user`

Multi-user FC60 analysis with pairwise compatibility scores. **Scope: `oracle:write`**

**Request Body:**

```json
{
  "users": [
    { "name": "Alice", "birth_year": 1990, "birth_month": 3, "birth_day": 15 },
    { "name": "Bob", "birth_year": 1985, "birth_month": 7, "birth_day": 22 }
  ],
  "primary_user_index": 0,
  "include_interpretation": true,
  "locale": "en"
}
```

| Field                    | Type   | Required | Description               |
| ------------------------ | ------ | -------- | ------------------------- |
| `users`                  | array  | yes      | 2-10 user profiles        |
| `primary_user_index`     | int    | no       | Index of the primary user |
| `include_interpretation` | bool   | no       | Include AI interpretation |
| `locale`                 | string | no       | `en` or `fa`              |

**Response 200:**

```json
{
  "reading_id": 46,
  "user_count": 2,
  "profiles": [
    {
      "name": "Alice",
      "life_path": 1,
      "element": "Wood",
      "chinese_zodiac": "Horse"
    },
    {
      "name": "Bob",
      "life_path": 8,
      "element": "Metal",
      "chinese_zodiac": "Ox"
    }
  ],
  "pairwise_compatibility": [
    {
      "user_a": "Alice",
      "user_b": "Bob",
      "score": 7.5,
      "element_harmony": "complementary",
      "numerology_match": "strong"
    }
  ],
  "group_energy": {
    "dominant_element": "Metal",
    "overall_harmony": 7.2,
    "energy_distribution": {
      "Wood": 0.3,
      "Metal": 0.4,
      "Fire": 0.1,
      "Water": 0.1,
      "Earth": 0.1
    }
  },
  "ai_interpretation": "The group shows a strong Metal-Wood dynamic..."
}
```

---

### `POST /api/oracle/readings`

Store a framework reading result. Supports multiple reading types via the `sign_type` field. **Scope: `oracle:write`**

**Request Body:**

```json
{
  "oracle_user_id": 1,
  "sign_type": "time_reading",
  "reading_result": {},
  "locale": "en"
}
```

**Response 201:**

```json
{
  "id": 47,
  "oracle_user_id": 1,
  "sign_type": "time_reading",
  "reading_result": {},
  "created_at": "2026-02-14T12:00:00+00:00",
  "is_favorite": false
}
```

---

### `GET /api/oracle/daily/reading`

Get a full daily reading with FC60 framework analysis. **Scope: `oracle:read`**

**Query Parameters:**

| Parameter        | Type   | Default | Description                      |
| ---------------- | ------ | ------- | -------------------------------- |
| `oracle_user_id` | int    | null    | Profile for personalized reading |
| `date`           | string | today   | Date in YYYY-MM-DD format        |

**Response 200:** Same structure as `POST /api/oracle/reading`

---

### `GET /api/oracle/stats`

Oracle usage statistics. **Scope: `oracle:read`**

**Response 200:**

```json
{
  "total_readings": 523,
  "readings_by_type": {
    "time_reading": 200,
    "name_reading": 150,
    "question_reading": 100,
    "daily_reading": 73
  },
  "total_profiles": 15,
  "avg_confidence": 7.5
}
```

---

## Reading History (`/api/oracle/readings`)

Manage stored oracle readings.

### `GET /api/oracle/readings`

List stored oracle readings with filtering and pagination. **Scope: `oracle:read`**

**Query Parameters:**

| Parameter   | Type   | Default | Description              |
| ----------- | ------ | ------- | ------------------------ |
| `limit`     | int    | 20      | Results per page (1-100) |
| `offset`    | int    | 0       | Pagination offset        |
| `sign_type` | string | null    | Filter by reading type   |

**Response 200:**

```json
{
  "readings": [
    {
      "id": 42,
      "oracle_user_id": 1,
      "sign_type": "time_reading",
      "reading_result": {},
      "created_at": "2026-02-14T12:00:00+00:00",
      "is_favorite": false
    }
  ],
  "total": 523,
  "limit": 20,
  "offset": 0
}
```

---

### `GET /api/oracle/readings/stats`

Reading statistics summary. **Scope: `oracle:read`**

**Response 200:**

```json
{
  "total": 523,
  "by_type": {
    "time_reading": 200,
    "name_reading": 150,
    "question_reading": 100
  },
  "favorites": 15,
  "this_week": 32,
  "this_month": 120
}
```

---

### `GET /api/oracle/readings/{reading_id}`

Get a specific stored reading with full details. **Scope: `oracle:read`**

**Path Parameters:**

| Parameter    | Type | Description |
| ------------ | ---- | ----------- |
| `reading_id` | int  | Reading ID  |

**Response 200:** Full reading object

**Error 404:** Reading not found

---

### `DELETE /api/oracle/readings/{reading_id}`

Delete a reading. **Scope: `oracle:admin`**

**Response 200:**

```json
{
  "message": "Reading deleted"
}
```

**Error 404:** Reading not found

---

### `PATCH /api/oracle/readings/{reading_id}/favorite`

Toggle the favorite status of a reading. **Scope: `oracle:write`**

**Request Body:**

```json
{
  "is_favorite": true
}
```

**Response 200:**

```json
{
  "id": 42,
  "is_favorite": true
}
```

---

## Audit Log (`/api/oracle/audit`)

Oracle-specific audit trail.

### `GET /api/oracle/audit`

Query Oracle audit log entries. **Scope: `oracle:admin`**

**Query Parameters:**

| Parameter     | Type   | Default | Description              |
| ------------- | ------ | ------- | ------------------------ |
| `action`      | string | null    | Filter by action type    |
| `resource_id` | string | null    | Filter by resource ID    |
| `limit`       | int    | 50      | Results per page (1-500) |
| `offset`      | int    | 0       | Pagination offset        |

**Response 200:**

```json
{
  "entries": [
    {
      "id": 1,
      "timestamp": "2026-02-14T12:00:00+00:00",
      "action": "reading.create",
      "resource_type": "oracle_reading",
      "resource_id": "42",
      "user_id": "<USER_ID>",
      "success": true,
      "ip_address": "<CLIENT_IP>",
      "details": { "sign_type": "time_reading" }
    }
  ],
  "total": 1500,
  "limit": 50,
  "offset": 0
}
```

---

## Admin (`/api/admin`)

Administrative endpoints for system-wide management. All require `admin` scope.

### `GET /api/admin/users`

List all system users with role and activity information. **Scope: `admin`**

**Query Parameters:**

| Parameter | Type   | Default | Description              |
| --------- | ------ | ------- | ------------------------ |
| `limit`   | int    | 20      | Results per page (1-100) |
| `offset`  | int    | 0       | Pagination offset        |
| `role`    | string | null    | Filter by role           |
| `search`  | string | null    | Search by username       |

**Response 200:**

```json
{
  "users": [
    {
      "id": "<USER_ID>",
      "username": "admin",
      "role": "admin",
      "created_at": "2026-01-01T00:00:00+00:00",
      "updated_at": "2026-02-14T12:00:00+00:00",
      "last_login": "2026-02-14T10:00:00+00:00",
      "is_active": true,
      "reading_count": 150
    }
  ],
  "total": 25,
  "limit": 20,
  "offset": 0
}
```

---

### `GET /api/admin/users/{user_id}`

Get detailed system user information. **Scope: `admin`**

**Response 200:** Single user object (same fields as list item)

**Error 404:** User not found

---

### `PATCH /api/admin/users/{user_id}/role`

Change a user's role. **Scope: `admin`**

**Request Body:**

```json
{
  "role": "moderator"
}
```

| Field  | Type   | Required | Valid Values                |
| ------ | ------ | -------- | --------------------------- |
| `role` | string | yes      | `admin`, `user`, `readonly` |

**Response 200:** Updated user object

---

### `POST /api/admin/users/{user_id}/reset-password`

Admin-initiated password reset. Generates a temporary password. **Scope: `admin`**

**Response 200:**

```json
{
  "temporary_password": "<GENERATED_TEMP_PASSWORD>",
  "message": "Password reset. User must change on next login."
}
```

---

### `PATCH /api/admin/users/{user_id}/status`

Activate or deactivate a user account. **Scope: `admin`**

**Request Body:**

```json
{
  "is_active": false
}
```

**Response 200:** Updated user object

---

### `GET /api/admin/stats`

System-wide statistics overview. **Scope: `admin`**

**Response 200:**

```json
{
  "total_users": 25,
  "active_users": 22,
  "inactive_users": 3,
  "total_oracle_profiles": 45,
  "total_readings": 523,
  "readings_today": 12,
  "users_by_role": {
    "admin": 2,
    "user": 20,
    "readonly": 3
  }
}
```

---

### `GET /api/admin/profiles`

List all Oracle profiles across all users. **Scope: `admin`**

**Query Parameters:**

| Parameter | Type   | Default | Description              |
| --------- | ------ | ------- | ------------------------ |
| `limit`   | int    | 20      | Results per page (1-100) |
| `offset`  | int    | 0       | Pagination offset        |
| `search`  | string | null    | Search by profile name   |

**Response 200:**

```json
{
  "profiles": [
    {
      "id": 1,
      "name": "John Doe",
      "name_persian": "جان دو",
      "birthday": "1990-06-15",
      "country": "US",
      "city": "New York",
      "created_at": "2026-01-15T00:00:00+00:00",
      "updated_at": "2026-02-14T00:00:00+00:00",
      "deleted_at": null,
      "reading_count": 42
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

### `DELETE /api/admin/profiles/{profile_id}`

Delete an Oracle profile. **Scope: `admin`**

**Response 200:**

```json
{
  "message": "Profile deleted"
}
```

**Error 404:** Profile not found

---

### `GET /api/admin/backups`

List available database backups. **Scope: `admin`**

**Response 200:**

```json
{
  "backups": [
    {
      "filename": "nps_oracle_full_20260214_120000.sql.gz",
      "type": "oracle_full",
      "timestamp": "2026-02-14T12:00:00+00:00",
      "size_bytes": 13107200,
      "size_human": "12.5 MB",
      "tables": ["oracle_users", "oracle_readings", "oracle_audit_log"],
      "database": "nps"
    }
  ],
  "total": 5,
  "retention_policy": "Oracle: 30 days, Full: 60 days",
  "backup_directory": "/backups"
}
```

---

### `POST /api/admin/backups`

Trigger a manual database backup. **Scope: `admin`**

**Request Body:**

```json
{
  "backup_type": "oracle_full"
}
```

| Field         | Type   | Required | Valid Values                                  |
| ------------- | ------ | -------- | --------------------------------------------- |
| `backup_type` | string | yes      | `oracle_full`, `oracle_data`, `full_database` |

**Response 200:**

```json
{
  "status": "success",
  "message": "Backup created successfully",
  "backup": {
    "filename": "nps_oracle_full_20260214_120000.sql.gz",
    "type": "oracle_full",
    "timestamp": "2026-02-14T12:00:00+00:00",
    "size_bytes": 13107200,
    "size_human": "12.5 MB",
    "tables": ["oracle_users", "oracle_readings"],
    "database": "nps"
  }
}
```

---

### `POST /api/admin/backups/restore`

Restore the database from a backup file. **Scope: `admin`**

**Request Body:**

```json
{
  "filename": "nps_oracle_full_20260214_120000.sql.gz",
  "confirm": true
}
```

| Field      | Type   | Required | Description                       |
| ---------- | ------ | -------- | --------------------------------- |
| `filename` | string | yes      | Backup filename to restore from   |
| `confirm`  | bool   | yes      | Must be `true` to confirm restore |

**Response 200:**

```json
{
  "status": "success",
  "message": "Restore completed",
  "rows_restored": {
    "oracle_users": 45,
    "oracle_readings": 523,
    "oracle_audit_log": 1500
  }
}
```

---

### `DELETE /api/admin/backups/{filename}`

Delete a backup file. **Scope: `admin`**

**Path Parameters:**

| Parameter  | Type   | Description     |
| ---------- | ------ | --------------- |
| `filename` | string | Backup filename |

**Response 200:**

```json
{
  "status": "success",
  "message": "Backup deleted",
  "filename": "nps_oracle_full_20260214_120000.sql.gz"
}
```

**Error 404:** Backup file not found

---

## System Users (`/api/users`)

System user management endpoints (distinct from Oracle profiles).

### `GET /api/users`

List system users. **Scope: `admin` or `moderator`**

**Query Parameters:**

| Parameter | Type   | Default | Description              |
| --------- | ------ | ------- | ------------------------ |
| `limit`   | int    | 20      | Results per page (1-100) |
| `offset`  | int    | 0       | Pagination offset        |
| `role`    | string | null    | Filter by role           |
| `search`  | string | null    | Search by username       |

**Response 200:** Paginated user list (same format as admin users)

---

### `GET /api/users/{user_id}`

Get system user details. **Scope: `admin`, `moderator`, or own account**

**Response 200:** User object

**Error 404:** User not found

---

### `PUT /api/users/{user_id}`

Update system user information. **Scope: `admin` or own account**

**Request Body:**

```json
{
  "username": "updated_name"
}
```

**Response 200:** Updated user object

---

### `DELETE /api/users/{user_id}`

Deactivate a system user (soft delete). **Scope: `admin`**

**Response 200:**

```json
{
  "message": "User deactivated"
}
```

---

### `POST /api/users/{user_id}/reset-password`

Reset a user's password. **Scope: `admin`**

**Response 200:**

```json
{
  "temporary_password": "<GENERATED_TEMP_PASSWORD>",
  "message": "Password reset. User must change on next login."
}
```

---

### `PUT /api/users/{user_id}/role`

Change a user's role. **Scope: `admin`**

**Request Body:**

```json
{
  "role": "moderator"
}
```

**Response 200:** Updated user object

---

## Telegram (`/api/telegram`)

Telegram bot integration for linking accounts and managing daily digest deliveries.

### `POST /api/telegram/link`

Link a Telegram chat to a user account.

**Request Body:**

```json
{
  "chat_id": "123456789",
  "oracle_user_id": 1
}
```

**Response 200:**

```json
{
  "status": "linked",
  "chat_id": "123456789",
  "oracle_user_id": 1,
  "linked_at": "2026-02-14T12:00:00+00:00"
}
```

**Error 409:** Chat already linked

---

### `GET /api/telegram/status/{chat_id}`

Get link status for a Telegram chat.

**Response 200:**

```json
{
  "linked": true,
  "chat_id": "123456789",
  "oracle_user_id": 1,
  "linked_at": "2026-02-14T12:00:00+00:00",
  "daily_enabled": true
}
```

---

### `DELETE /api/telegram/link/{chat_id}`

Unlink a Telegram chat from the user account.

**Response 200:**

```json
{
  "status": "unlinked",
  "message": "Telegram chat unlinked"
}
```

---

### `GET /api/telegram/profile/{chat_id}`

Get the Oracle profile linked to a Telegram chat.

**Response 200:** Oracle user profile object

**Error 404:** Chat not linked or profile not found

---

### `GET /api/telegram/daily/preferences/{chat_id}`

Get daily digest preferences for a Telegram chat.

**Response 200:**

```json
{
  "chat_id": "123456789",
  "enabled": true,
  "delivery_hour": 8,
  "timezone": "Asia/Tehran",
  "locale": "fa",
  "include_lucky_numbers": true,
  "include_daily_reading": true
}
```

---

### `PUT /api/telegram/daily/preferences/{chat_id}`

Update daily digest preferences.

**Request Body:**

```json
{
  "enabled": true,
  "delivery_hour": 9,
  "timezone": "Asia/Tehran",
  "locale": "fa",
  "include_lucky_numbers": true,
  "include_daily_reading": true
}
```

**Response 200:** Updated preferences object

---

### `GET /api/telegram/daily/pending`

List pending daily digest deliveries. **Service key required.**

**Response 200:**

```json
{
  "pending": [
    {
      "chat_id": "123456789",
      "oracle_user_id": 1,
      "delivery_hour": 8,
      "timezone": "Asia/Tehran",
      "locale": "fa"
    }
  ],
  "count": 5
}
```

---

### `POST /api/telegram/daily/delivered`

Mark a daily digest as delivered. **Service key required.**

**Request Body:**

```json
{
  "chat_id": "123456789",
  "delivered_at": "2026-02-14T08:00:00+03:30"
}
```

**Response 200:**

```json
{
  "status": "confirmed",
  "chat_id": "123456789"
}
```

---

### `GET /api/telegram/admin/stats`

Telegram integration statistics. **Scope: `admin`**

**Response 200:**

```json
{
  "total_linked": 15,
  "daily_active": 12,
  "deliveries_today": 10,
  "delivery_success_rate": 0.95
}
```

---

### `GET /api/telegram/admin/users`

List Telegram-linked users. **Scope: `admin`**

**Response 200:** Paginated list of linked Telegram users

---

### `GET /api/telegram/admin/linked_chats`

List all linked Telegram chat IDs. **Scope: `admin`**

**Response 200:**

```json
{
  "chat_ids": ["123456789", "987654321"],
  "total": 15
}
```

---

### `POST /api/telegram/admin/audit`

Query Telegram-specific audit log. **Scope: `admin`**

**Request Body:**

```json
{
  "action": "daily_delivery",
  "limit": 50
}
```

**Response 200:** Paginated audit entries

---

### `POST /api/telegram/internal/notify`

Send an internal notification via Telegram. **Service key required.**

**Request Body:**

```json
{
  "chat_id": "123456789",
  "message": "Your daily reading is ready!",
  "parse_mode": "Markdown"
}
```

**Response 200:**

```json
{
  "status": "sent",
  "message_id": 12345
}
```

---

## Translation (`/api/translation`)

AI-powered translation between English and Persian, with reading-specific context awareness.

### `POST /api/translation/translate`

Translate text between languages.

**Request Body:**

```json
{
  "text": "A day of heightened intuition and creative energy",
  "target_language": "fa",
  "source_language": "en"
}
```

| Field             | Type   | Required | Constraints                           |
| ----------------- | ------ | -------- | ------------------------------------- |
| `text`            | string | yes      | 1-10,000 characters                   |
| `target_language` | string | yes      | `en` or `fa`                          |
| `source_language` | string | no       | `en` or `fa` (auto-detect if omitted) |

**Response 200:**

```json
{
  "translated_text": "روزی با شهود بالا و انرژی خلاقانه",
  "source_language": "en",
  "target_language": "fa",
  "confidence": 0.95
}
```

---

### `POST /api/translation/reading`

Translate reading content with context-specific numerological vocabulary.

**Request Body:**

```json
{
  "text": "Your life path number is 7, the Seeker...",
  "target_language": "fa",
  "reading_type": "time_reading"
}
```

| Field             | Type   | Required | Constraints          |
| ----------------- | ------ | -------- | -------------------- |
| `text`            | string | yes      | 1-50,000 characters  |
| `target_language` | string | yes      | `en` or `fa`         |
| `reading_type`    | string | no       | Reading type context |

**Response 200:**

```json
{
  "translated_text": "عدد مسیر زندگی شما ۷ است، جوینده...",
  "source_language": "en",
  "target_language": "fa"
}
```

---

### `POST /api/translation/batch`

Translate multiple texts in a single request.

**Request Body:**

```json
{
  "items": [
    { "text": "Fire element", "target_language": "fa" },
    { "text": "Water element", "target_language": "fa" }
  ]
}
```

| Field   | Type  | Required | Constraints |
| ------- | ----- | -------- | ----------- |
| `items` | array | yes      | 1-100 items |

**Response 200:**

```json
{
  "translations": [
    {
      "translated_text": "عنصر آتش",
      "source_language": "en",
      "target_language": "fa"
    },
    {
      "translated_text": "عنصر آب",
      "source_language": "en",
      "target_language": "fa"
    }
  ],
  "count": 2
}
```

---

### `GET /api/translation/detect`

Detect the language of a text.

**Query Parameters:**

| Parameter | Type   | Required | Description     |
| --------- | ------ | -------- | --------------- |
| `text`    | string | yes      | Text to analyze |

**Response 200:**

```json
{
  "language": "en",
  "confidence": 0.98,
  "script": "Latin"
}
```

---

### `GET /api/translation/cache/stats`

Translation cache statistics. **Scope: `admin`**

**Response 200:**

```json
{
  "total_cached": 1500,
  "hit_rate": 0.75,
  "memory_usage_bytes": 2097152,
  "oldest_entry": "2026-01-15T00:00:00+00:00"
}
```

---

## Location (`/api/location`)

Geographic data for timezone and coordinate lookups, used for accurate birth time calculations.

### `GET /api/location/countries`

List available countries.

**Response 200:**

```json
{
  "countries": [
    { "code": "US", "name": "United States", "name_persian": "ایالات متحده" },
    { "code": "IR", "name": "Iran", "name_persian": "ایران" }
  ]
}
```

---

### `GET /api/location/countries/{country_code}/cities`

List cities for a specific country.

**Path Parameters:**

| Parameter      | Type   | Description             |
| -------------- | ------ | ----------------------- |
| `country_code` | string | ISO 3166-1 alpha-2 code |

**Query Parameters:**

| Parameter | Type   | Default | Description         |
| --------- | ------ | ------- | ------------------- |
| `search`  | string | null    | Filter by city name |
| `limit`   | int    | 50      | Results per page    |

**Response 200:**

```json
{
  "cities": [
    {
      "name": "Tehran",
      "name_persian": "تهران",
      "latitude": 35.6892,
      "longitude": 51.389
    },
    {
      "name": "Isfahan",
      "name_persian": "اصفهان",
      "latitude": 32.6546,
      "longitude": 51.668
    }
  ],
  "country_code": "IR"
}
```

---

### `GET /api/location/timezone`

Get timezone for geographic coordinates.

**Query Parameters:**

| Parameter   | Type  | Required | Description |
| ----------- | ----- | -------- | ----------- |
| `latitude`  | float | yes      | Latitude    |
| `longitude` | float | yes      | Longitude   |

**Response 200:**

```json
{
  "timezone": "Asia/Tehran",
  "utc_offset": "+03:30",
  "dst": false
}
```

---

### `GET /api/location/coordinates`

Get coordinates for a named location.

**Query Parameters:**

| Parameter | Type   | Required | Description         |
| --------- | ------ | -------- | ------------------- |
| `city`    | string | yes      | City name           |
| `country` | string | no       | Country code filter |

**Response 200:**

```json
{
  "city": "Tehran",
  "country": "IR",
  "latitude": 35.6892,
  "longitude": 51.389,
  "timezone": "Asia/Tehran"
}
```

---

### `GET /api/location/detect`

Detect location from the client's IP address.

**Response 200:**

```json
{
  "country": "IR",
  "city": "Tehran",
  "latitude": 35.6892,
  "longitude": 51.389,
  "timezone": "Asia/Tehran",
  "ip": "<CLIENT_IP>"
}
```

---

## Share (`/api/share`)

Create and manage shareable links for oracle readings.

### `POST /api/share`

Create a shareable link for a reading. Maximum 10 active links per reading. **Scope: `oracle:read`**

**Request Body:**

```json
{
  "reading_id": 42,
  "expires_in_days": 7
}
```

| Field             | Type | Required | Description                     |
| ----------------- | ---- | -------- | ------------------------------- |
| `reading_id`      | int  | yes      | Reading to share                |
| `expires_in_days` | int  | no       | Link expiry in days (default 7) |

**Response 201:**

```json
{
  "token": "<SHARE_TOKEN>",
  "reading_id": 42,
  "expires_at": "2026-02-21T12:00:00+00:00",
  "url": "/share/<SHARE_TOKEN>",
  "created_at": "2026-02-14T12:00:00+00:00"
}
```

**Error 400:** Maximum share links reached (10)
**Error 404:** Reading not found

---

### `GET /api/share/{token}`

Get shared reading data. **No auth required** (public endpoint).

**Path Parameters:**

| Parameter | Type   | Description      |
| --------- | ------ | ---------------- |
| `token`   | string | Share link token |

**Response 200:**

```json
{
  "reading": {
    "sign_type": "time_reading",
    "reading_result": {},
    "created_at": "2026-02-14T12:00:00+00:00"
  },
  "shared_at": "2026-02-14T12:00:00+00:00",
  "expires_at": "2026-02-21T12:00:00+00:00"
}
```

**Error 404:** Link not found or expired

---

### `DELETE /api/share/{token}`

Revoke a shared link. **Scope: `oracle:read`**

**Response 200:**

```json
{
  "message": "Share link revoked"
}
```

**Error 404:** Link not found

---

## Settings (`/api/settings`)

User-specific application settings.

### `GET /api/settings`

Get current user settings. **Scope: `user`**

**Response 200:**

```json
{
  "locale": "en",
  "theme": "dark",
  "default_reading_type": "time_reading",
  "timezone": "Asia/Tehran",
  "numerology_system": "auto",
  "auto_daily": true
}
```

---

### `PUT /api/settings`

Update user settings. **Scope: `user`**

**Request Body:** Partial update of any setting keys.

```json
{
  "locale": "fa",
  "theme": "dark",
  "numerology_system": "pythagorean"
}
```

| Key                    | Type   | Valid Values                                       |
| ---------------------- | ------ | -------------------------------------------------- |
| `locale`               | string | `en`, `fa`                                         |
| `theme`                | string | `light`, `dark`, `system`                          |
| `default_reading_type` | string | `time_reading`, `name_reading`, `question_reading` |
| `timezone`             | string | IANA timezone string                               |
| `numerology_system`    | string | `pythagorean`, `chaldean`, `abjad`, `auto`         |
| `auto_daily`           | bool   | Enable/disable automatic daily readings            |

**Response 200:** Updated settings object

---

## Learning (`/api/learning`)

Machine learning and feedback endpoints. Scanner-related endpoints are stubs returning 501.

### `GET /api/learning/stats`

Learning system statistics. **Stub -- returns 501.**

---

### `GET /api/learning/insights`

AI-generated insights. **Stub -- returns 501.**

---

### `POST /api/learning/analyze`

Analyze a scanning session. **Stub -- returns 501.**

---

### `GET /api/learning/weights`

Model weights. **Stub -- returns 501.**

---

### `GET /api/learning/patterns`

Discovered patterns. **Stub -- returns 501.**

---

### `POST /api/learning/oracle/readings/{reading_id}/feedback`

Submit feedback for an oracle reading. **Scope: `oracle:write`**

**Request Body:**

```json
{
  "rating": 4,
  "comment": "Very accurate reading",
  "accuracy_score": 8.5
}
```

| Field            | Type   | Required | Description               |
| ---------------- | ------ | -------- | ------------------------- |
| `rating`         | int    | yes      | 1-5 star rating           |
| `comment`        | string | no       | Free-text feedback        |
| `accuracy_score` | float  | no       | Perceived accuracy (0-10) |

**Response 201:**

```json
{
  "id": 1,
  "reading_id": 42,
  "rating": 4,
  "comment": "Very accurate reading",
  "accuracy_score": 8.5,
  "created_at": "2026-02-14T12:00:00+00:00"
}
```

---

### `GET /api/learning/oracle/readings/{reading_id}/feedback`

Get feedback for a specific reading. **Scope: `oracle:read`**

**Response 200:**

```json
{
  "feedback": [
    {
      "id": 1,
      "rating": 4,
      "comment": "Very accurate reading",
      "accuracy_score": 8.5,
      "created_at": "2026-02-14T12:00:00+00:00"
    }
  ],
  "average_rating": 4.0,
  "count": 1
}
```

---

### `GET /api/learning/oracle/stats`

Oracle learning and feedback statistics. **Scope: `oracle:read`**

**Response 200:**

```json
{
  "total_feedback": 150,
  "average_rating": 3.8,
  "average_accuracy": 7.2,
  "feedback_by_type": {
    "time_reading": 80,
    "name_reading": 40,
    "question_reading": 30
  }
}
```

---

### `POST /api/learning/oracle/recalculate`

Trigger model recalculation based on feedback data. **Scope: `oracle:admin`**

**Response 200:**

```json
{
  "status": "recalculation_started",
  "message": "Model recalculation queued"
}
```

---

## Scanner (`/api/scanner`)

Bitcoin scanner endpoints. All are stubs returning `501 Not Implemented` except where noted.

### `POST /api/scanner/start`

Start a new scanning session. **Stub -- returns 501.**

### `POST /api/scanner/stop/{session_id}`

Stop a scanning session. **Stub -- returns 501.**

### `POST /api/scanner/pause/{session_id}`

Pause a scanning session. **Stub -- returns 501.**

### `POST /api/scanner/resume/{session_id}`

Resume a paused session. **Stub -- returns 501.**

### `GET /api/scanner/stats/{session_id}`

Get scanning session statistics. **Stub -- returns 501.**

### `GET /api/scanner/terminals`

List scanner terminals. Returns empty list (not 501).

**Response 200:**

```json
{
  "terminals": []
}
```

### `POST /api/scanner/checkpoint/{session_id}`

Create a checkpoint. **Stub -- returns 501.**

---

## Vault (`/api/vault`)

Secure storage for scanner findings. All endpoints are stubs returning empty/zero data.

### `GET /api/vault/findings`

List vault findings. Returns empty list.

### `GET /api/vault/summary`

Vault summary. Returns zero counts.

### `GET /api/vault/search`

Search vault. Returns empty results.

### `POST /api/vault/export`

Export vault data. Returns empty export.

---

## WebSocket

### `WS /ws/oracle`

Real-time oracle reading progress and event updates.

**Connection:** `ws://localhost:8000/ws/oracle`

**Authentication:** Pass JWT token as a query parameter:

```
ws://localhost:8000/ws/oracle?token=<JWT_ACCESS_TOKEN>
```

**Heartbeat:** The server sends periodic `ping` messages. The client must respond with `pong` text messages to maintain the connection.

**Server Events (JSON messages):**

Reading progress:

```json
{
  "type": "reading_progress",
  "reading_id": 42,
  "stage": "numerology",
  "progress": 0.5,
  "message": "Calculating numerology..."
}
```

Reading complete:

```json
{
  "type": "reading_complete",
  "reading_id": 42,
  "result": {}
}
```

Reading error:

```json
{
  "type": "reading_error",
  "reading_id": 42,
  "error": "AI service unavailable",
  "fallback": true
}
```

Daily reading notification:

```json
{
  "type": "daily_ready",
  "date": "2026-02-14",
  "oracle_user_id": 1
}
```

**Connection Management:**

- Connections without valid authentication are immediately closed
- Stale connections (no pong response within timeout) are automatically disconnected
- Reconnection is handled by the client with exponential backoff

---

## Status Codes

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| 200  | Success                                        |
| 201  | Resource created                               |
| 400  | Invalid request parameters                     |
| 401  | Missing or invalid authentication              |
| 403  | Insufficient scope/permissions                 |
| 404  | Resource not found                             |
| 409  | Conflict (duplicate resource)                  |
| 422  | Validation error (see detail array)            |
| 423  | Account locked (too many failed attempts)      |
| 429  | Rate limit exceeded (check Retry-After header) |
| 500  | Internal server error                          |
| 501  | Not implemented (stub endpoint)                |
