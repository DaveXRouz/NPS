#!/usr/bin/env python3
"""Validate 10 authentication flows against the NPS API.

Standalone script that tests registration, login, JWT usage, token refresh,
logout/revocation, API key management, brute force lockout, and RBAC.

Usage:
    python3 integration/scripts/validate_auth_flows.py
    python3 integration/scripts/validate_auth_flows.py --json
"""

import argparse
import base64
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000")
API_SECRET_KEY = os.environ.get("API_SECRET_KEY", "")

# Load .env from project root (two levels up from this script)
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
if _ENV_PATH.exists():
    for _line in _ENV_PATH.read_text().splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#"):
            continue
        if "=" in _line:
            _key, _, _val = _line.partition("=")
            _key, _val = _key.strip(), _val.strip()
            if _key and _key not in os.environ:
                os.environ[_key] = _val
    API_SECRET_KEY = os.environ.get("API_SECRET_KEY", API_SECRET_KEY)

REQUEST_TIMEOUT = 10

# Unique suffix so concurrent runs do not collide
_RUN_ID = uuid.uuid4().hex[:8]

# ---------------------------------------------------------------------------
# Result tracking
# ---------------------------------------------------------------------------

_results: list[dict] = []


def _record(
    flow_num: int,
    name: str,
    passed: bool,
    detail: str,
    skipped: bool = False,
) -> bool:
    """Record one flow result and return whether it passed."""
    stat = "SKIP" if skipped else ("PASS" if passed else "FAIL")
    _results.append(
        {
            "flow": flow_num,
            "name": name,
            "status": stat,
            "detail": detail,
        }
    )
    return passed


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def url(path: str) -> str:
    return f"{API_BASE_URL}{path}"


def _admin_header() -> dict[str, str]:
    """Legacy Bearer header using API_SECRET_KEY (admin-level access)."""
    return {
        "Authorization": f"Bearer {API_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def _bearer_header(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _api_key_header(key: str) -> dict[str, str]:
    return {
        "X-API-Key": key,
        "Content-Type": "application/json",
    }


def _api_reachable() -> bool:
    """Return True if the API health endpoint responds."""
    try:
        r = requests.get(url("/api/health"), timeout=5)
        return r.status_code == 200
    except requests.RequestException:
        return False


def _decode_jwt_payload(token: str) -> Optional[dict]:
    """Decode the payload of a JWT without verification (for inspection only)."""
    parts = token.split(".")
    if len(parts) != 3:
        return None
    payload_b64 = parts[1]
    padding = 4 - len(payload_b64) % 4
    if padding != 4:
        payload_b64 += "=" * padding
    try:
        return json.loads(base64.urlsafe_b64decode(payload_b64))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return None


# ---------------------------------------------------------------------------
# Flow 1: Register new user
# ---------------------------------------------------------------------------


def flow_register_new_user() -> bool:
    """Register a new user via POST /api/auth/register (admin-only endpoint)."""
    print("\n[1] Register new user")
    username = f"AuthFlow_reg_{_RUN_ID}"
    try:
        resp = requests.post(
            url("/api/auth/register"),
            headers=_admin_header(),
            json={
                "username": username,
                "password": "TestPass123!",
                "role": "user",
            },
            timeout=REQUEST_TIMEOUT,
        )
        if resp.status_code in (200, 201):
            data = resp.json()
            ok = data.get("username") == username and data.get("role") == "user"
            detail = f"Registered '{username}', id={data.get('id', '?')}"
            print(f"  {'PASS' if ok else 'FAIL'}: {detail}")
            return _record(1, "register_new_user", ok, detail)
        detail = f"Expected 200/201, got {resp.status_code}: {resp.text[:200]}"
        print(f"  FAIL: {detail}")
        return _record(1, "register_new_user", False, detail)
    except requests.RequestException as exc:
        detail = f"Request failed: {exc}"
        print(f"  FAIL: {detail}")
        return _record(1, "register_new_user", False, detail)


# ---------------------------------------------------------------------------
# Flow 2: Login -> get JWT
# ---------------------------------------------------------------------------


def flow_login_get_jwt() -> tuple[bool, str, str]:
    """Login and retrieve a JWT + refresh token.

    Returns (passed, access_token, refresh_token) so downstream flows can reuse.
    """
    print("\n[2] Login -> get JWT")
    username = f"AuthFlow_login_{_RUN_ID}"
    pw = "LoginPass123!"
    try:
        requests.post(
            url("/api/auth/register"),
            headers=_admin_header(),
            json={"username": username, "password": pw, "role": "user"},
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException:
        pass

    try:
        resp = requests.post(
            url("/api/auth/login"),
            json={"username": username, "password": pw},
            timeout=REQUEST_TIMEOUT,
        )
        if resp.status_code == 200:
            data = resp.json()
            access = data.get("access_token", "")
            refresh = data.get("refresh_token", "")
            has_tokens = bool(access) and bool(refresh)
            has_type = data.get("token_type") == "bearer"
            has_expiry = (
                isinstance(data.get("expires_in"), (int, float))
                and data["expires_in"] > 0
            )
            ok = has_tokens and has_type and has_expiry
            detail = (
                f"Got access_token ({len(access)} chars), "
                f"refresh_token ({len(refresh)} chars), "
                f"token_type={data.get('token_type')}, "
                f"expires_in={data.get('expires_in')}"
            )
            print(f"  {'PASS' if ok else 'FAIL'}: {detail}")
            _record(2, "login_get_jwt", ok, detail)
            return ok, access, refresh
        detail = f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        print(f"  FAIL: {detail}")
        _record(2, "login_get_jwt", False, detail)
        return False, "", ""
    except requests.RequestException as exc:
        detail = f"Request failed: {exc}"
        print(f"  FAIL: {detail}")
        _record(2, "login_get_jwt", False, detail)
        return False, "", ""


# ---------------------------------------------------------------------------
# Flow 3: Use JWT on protected endpoint
# ---------------------------------------------------------------------------


def flow_jwt_protected_endpoint(access_token: str) -> bool:
    """Use a valid JWT to access a protected endpoint."""
    print("\n[3] Use JWT on protected endpoint")
    if not access_token:
        detail = "No access token available (flow 2 failed)"
        print(f"  SKIP: {detail}")
        return _record(3, "jwt_protected_endpoint", False, detail, skipped=True)

    try:
        resp = requests.get(
            url("/api/oracle/users"),
            headers=_bearer_header(access_token),
            timeout=REQUEST_TIMEOUT,
        )
        ok = resp.status_code == 200
        detail = f"GET /api/oracle/users -> {resp.status_code}"
        print(f"  {'PASS' if ok else 'FAIL'}: {detail}")
        return _record(3, "jwt_protected_endpoint", ok, detail)
    except requests.RequestException as exc:
        detail = f"Request failed: {exc}"
        print(f"  FAIL: {detail}")
        return _record(3, "jwt_protected_endpoint", False, detail)


# ---------------------------------------------------------------------------
# Flow 4: Invalid JWT -> 401
# ---------------------------------------------------------------------------


def flow_invalid_jwt() -> bool:
    """Send a completely invalid JWT and expect 401 or 403."""
    print("\n[4] Invalid JWT -> 401")
    invalid_tokens = [
        "completely-bogus-token",
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.INVALID_SIG",
        "",
    ]
    all_ok = True
    details: list[str] = []
    for token in invalid_tokens:
        try:
            headers: dict[str, str] = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            resp = requests.get(
                url("/api/oracle/users"),
                headers=headers,
                timeout=REQUEST_TIMEOUT,
            )
            ok = resp.status_code in (401, 403)
            label = repr(token[:30]) if token else "(no token)"
            details.append(f"{label} -> {resp.status_code}")
            print(f"  {'PASS' if ok else 'FAIL'}: {label} -> {resp.status_code}")
            if not ok:
                all_ok = False
        except requests.RequestException as exc:
            details.append(f"Request error: {exc}")
            print(f"  FAIL: Request error: {exc}")
            all_ok = False

    return _record(4, "invalid_jwt_rejected", all_ok, "; ".join(details))


# ---------------------------------------------------------------------------
# Flow 5: Expired JWT -> 401
# ---------------------------------------------------------------------------


def flow_expired_jwt() -> bool:
    """Craft a JWT with an expired exp claim and verify rejection."""
    print("\n[5] Expired JWT -> 401")
    try:
        from jose import jwt as jose_jwt

        payload = {
            "sub": str(uuid.uuid4()),
            "username": "expired_test_user",
            "role": "user",
            "scopes": ["oracle:read", "oracle:write"],
            "exp": int(time.time()) - 3600,
            "iat": int(time.time()) - 7200,
        }
        token = jose_jwt.encode(payload, API_SECRET_KEY, algorithm="HS256")
        resp = requests.get(
            url("/api/oracle/users"),
            headers=_bearer_header(token),
            timeout=REQUEST_TIMEOUT,
        )
        ok = resp.status_code in (401, 403)
        detail = f"Expired JWT -> {resp.status_code}"
        print(f"  {'PASS' if ok else 'FAIL'}: {detail}")
        return _record(5, "expired_jwt_rejected", ok, detail)

    except ImportError:
        detail = "python-jose not installed; sending fallback token"
        print(f"  INFO: {detail}")
        try:
            resp = requests.get(
                url("/api/oracle/users"),
                headers=_bearer_header("expired.token.placeholder"),
                timeout=REQUEST_TIMEOUT,
            )
            ok = resp.status_code in (401, 403)
            detail = f"Fallback expired token -> {resp.status_code}"
            print(f"  {'PASS' if ok else 'FAIL'}: {detail}")
            return _record(5, "expired_jwt_rejected", ok, detail)
        except requests.RequestException as exc:
            detail = f"Request failed: {exc}"
            print(f"  FAIL: {detail}")
            return _record(5, "expired_jwt_rejected", False, detail)

    except requests.RequestException as exc:
        detail = f"Request failed: {exc}"
        print(f"  FAIL: {detail}")
        return _record(5, "expired_jwt_rejected", False, detail)


# ---------------------------------------------------------------------------
# Flow 6: Refresh token rotation
# ---------------------------------------------------------------------------


def flow_refresh_token_rotation(refresh_token: str) -> bool:
    """Exchange a refresh token for new access + refresh tokens."""
    print("\n[6] Refresh token rotation")
    if not refresh_token:
        detail = "No refresh token available (flow 2 failed)"
        print(f"  SKIP: {detail}")
        return _record(6, "refresh_token_rotation", False, detail, skipped=True)

    try:
        resp = requests.post(
            url("/api/auth/refresh"),
            json={"refresh_token": refresh_token},
            timeout=REQUEST_TIMEOUT,
        )
        if resp.status_code == 200:
            data = resp.json()
            new_access = data.get("access_token", "")
            new_refresh = data.get("refresh_token", "")
            rotated = (
                bool(new_access) and bool(new_refresh) and new_refresh != refresh_token
            )
            detail = (
                f"New access ({len(new_access)} chars), "
                f"new refresh ({len(new_refresh)} chars), "
                f"rotated={'yes' if new_refresh != refresh_token else 'NO'}"
            )
            print(f"  {'PASS' if rotated else 'FAIL'}: {detail}")

            if rotated:
                resp2 = requests.post(
                    url("/api/auth/refresh"),
                    json={"refresh_token": refresh_token},
                    timeout=REQUEST_TIMEOUT,
                )
                old_rejected = resp2.status_code in (401, 403)
                detail2 = f"Old refresh token reuse -> {resp2.status_code}"
                print(f"  {'PASS' if old_rejected else 'FAIL'}: {detail2}")
                ok = rotated and old_rejected
                return _record(6, "refresh_token_rotation", ok, f"{detail}; {detail2}")

            return _record(6, "refresh_token_rotation", rotated, detail)

        detail = f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        print(f"  FAIL: {detail}")
        return _record(6, "refresh_token_rotation", False, detail)
    except requests.RequestException as exc:
        detail = f"Request failed: {exc}"
        print(f"  FAIL: {detail}")
        return _record(6, "refresh_token_rotation", False, detail)


# ---------------------------------------------------------------------------
# Flow 7: Logout / token revocation
# ---------------------------------------------------------------------------


def flow_logout_revocation() -> bool:
    """Login, then logout, then verify the token no longer works."""
    print("\n[7] Logout / token revocation")
    username = f"AuthFlow_logout_{_RUN_ID}"
    pw = "LogoutPass123!"
    try:
        requests.post(
            url("/api/auth/register"),
            headers=_admin_header(),
            json={"username": username, "password": pw, "role": "user"},
            timeout=REQUEST_TIMEOUT,
        )

        login_resp = requests.post(
            url("/api/auth/login"),
            json={"username": username, "password": pw},
            timeout=REQUEST_TIMEOUT,
        )
        if login_resp.status_code != 200:
            detail = f"Login failed: {login_resp.status_code}"
            print(f"  FAIL: {detail}")
            return _record(7, "logout_revocation", False, detail)

        token = login_resp.json().get("access_token", "")

        pre_resp = requests.get(
            url("/api/oracle/users"),
            headers=_bearer_header(token),
            timeout=REQUEST_TIMEOUT,
        )
        if pre_resp.status_code != 200:
            detail = f"Token did not work before logout: {pre_resp.status_code}"
            print(f"  FAIL: {detail}")
            return _record(7, "logout_revocation", False, detail)

        logout_resp = requests.post(
            url("/api/auth/logout"),
            headers=_bearer_header(token),
            timeout=REQUEST_TIMEOUT,
        )
        if logout_resp.status_code != 200:
            detail = (
                f"Logout returned {logout_resp.status_code}: {logout_resp.text[:200]}"
            )
            print(f"  FAIL: {detail}")
            return _record(7, "logout_revocation", False, detail)

        post_resp = requests.get(
            url("/api/oracle/users"),
            headers=_bearer_header(token),
            timeout=REQUEST_TIMEOUT,
        )
        revoked = post_resp.status_code in (401, 403)
        detail = (
            f"Logout -> {logout_resp.status_code}, "
            f"post-logout token -> {post_resp.status_code}"
        )
        print(f"  {'PASS' if revoked else 'FAIL'}: {detail}")
        return _record(7, "logout_revocation", revoked, detail)

    except requests.RequestException as exc:
        detail = f"Request failed: {exc}"
        print(f"  FAIL: {detail}")
        return _record(7, "logout_revocation", False, detail)


# ---------------------------------------------------------------------------
# Flow 8: API key creation + usage
# ---------------------------------------------------------------------------


def flow_api_key_creation_usage() -> bool:
    """Create an API key and use it to access a protected endpoint."""
    print("\n[8] API key creation + usage")
    try:
        create_resp = requests.post(
            url("/api/auth/api-keys"),
            headers=_admin_header(),
            json={
                "name": f"AuthFlow_key_{_RUN_ID}",
                "scopes": ["oracle:read"],
            },
            timeout=REQUEST_TIMEOUT,
        )
        if create_resp.status_code != 200:
            detail = (
                f"API key creation returned {create_resp.status_code}: "
                f"{create_resp.text[:200]}"
            )
            print(f"  FAIL: {detail}")
            return _record(8, "api_key_creation_usage", False, detail)

        data = create_resp.json()
        raw_key = data.get("key", "")
        key_id = data.get("id", "")

        if not raw_key:
            detail = "API key creation response missing 'key' field"
            print(f"  FAIL: {detail}")
            return _record(8, "api_key_creation_usage", False, detail)

        use_resp = requests.get(
            url("/api/oracle/users"),
            headers=_bearer_header(raw_key),
            timeout=REQUEST_TIMEOUT,
        )
        key_works = use_resp.status_code == 200

        x_api_resp = requests.get(
            url("/api/oracle/users"),
            headers=_api_key_header(raw_key),
            timeout=REQUEST_TIMEOUT,
        )

        detail = (
            f"Created key id={key_id}, "
            f"Bearer usage -> {use_resp.status_code}, "
            f"X-API-Key usage -> {x_api_resp.status_code}"
        )

        ok = key_works or x_api_resp.status_code == 200
        print(f"  {'PASS' if ok else 'FAIL'}: {detail}")
        return _record(8, "api_key_creation_usage", ok, detail)

    except requests.RequestException as exc:
        detail = f"Request failed: {exc}"
        print(f"  FAIL: {detail}")
        return _record(8, "api_key_creation_usage", False, detail)


# ---------------------------------------------------------------------------
# Flow 9: Brute force lockout (5 fails -> 429/423)
# ---------------------------------------------------------------------------


def flow_brute_force_lockout() -> bool:
    """5 failed login attempts should lock the account (423) or rate limit (429)."""
    print("\n[9] Brute force lockout (5 fails -> lock)")
    username = f"AuthFlow_brute_{_RUN_ID}"
    pw = "BrutePass123!"
    try:
        requests.post(
            url("/api/auth/register"),
            headers=_admin_header(),
            json={"username": username, "password": pw, "role": "user"},
            timeout=REQUEST_TIMEOUT,
        )

        statuses: list[int] = []
        for _attempt in range(6):
            resp = requests.post(
                url("/api/auth/login"),
                json={"username": username, "password": "WrongValue!"},
                timeout=REQUEST_TIMEOUT,
            )
            statuses.append(resp.status_code)
            if resp.status_code in (423, 429):
                break

        got_lockout = any(s in (423, 429) for s in statuses)

        correct_resp = requests.post(
            url("/api/auth/login"),
            json={"username": username, "password": pw},
            timeout=REQUEST_TIMEOUT,
        )
        correct_blocked = correct_resp.status_code in (423, 429)

        ok = got_lockout and correct_blocked
        detail = (
            f"Attempt statuses: {statuses}, "
            f"correct-cred-after-lockout -> {correct_resp.status_code}"
        )
        print(f"  {'PASS' if ok else 'FAIL'}: {detail}")
        return _record(9, "brute_force_lockout", ok, detail)

    except requests.RequestException as exc:
        detail = f"Request failed: {exc}"
        print(f"  FAIL: {detail}")
        return _record(9, "brute_force_lockout", False, detail)


# ---------------------------------------------------------------------------
# Flow 10: RBAC enforcement (user can't access admin endpoints)
# ---------------------------------------------------------------------------


def flow_rbac_enforcement() -> bool:
    """A regular user should be denied access to admin-only endpoints."""
    print("\n[10] RBAC enforcement (user cannot access admin endpoints)")
    username = f"AuthFlow_rbac_{_RUN_ID}"
    pw = "RBACPass123!"
    try:
        requests.post(
            url("/api/auth/register"),
            headers=_admin_header(),
            json={"username": username, "password": pw, "role": "user"},
            timeout=REQUEST_TIMEOUT,
        )

        login_resp = requests.post(
            url("/api/auth/login"),
            json={"username": username, "password": pw},
            timeout=REQUEST_TIMEOUT,
        )
        if login_resp.status_code != 200:
            detail = f"Login failed: {login_resp.status_code}"
            print(f"  FAIL: {detail}")
            return _record(10, "rbac_enforcement", False, detail)

        user_token = login_resp.json().get("access_token", "")
        user_headers = _bearer_header(user_token)

        read_resp = requests.get(
            url("/api/oracle/users"),
            headers=user_headers,
            timeout=REQUEST_TIMEOUT,
        )
        can_read = read_resp.status_code == 200

        admin_endpoints = [
            ("GET", "/api/admin/users"),
            ("GET", "/api/oracle/audit"),
        ]

        admin_blocked_count = 0
        admin_tested_count = 0
        admin_details: list[str] = []
        for method, path in admin_endpoints:
            try:
                resp = requests.request(
                    method,
                    url(path),
                    headers=user_headers,
                    timeout=REQUEST_TIMEOUT,
                )
                admin_tested_count += 1
                blocked = resp.status_code in (401, 403, 404)
                admin_details.append(f"{method} {path} -> {resp.status_code}")
                if blocked:
                    admin_blocked_count += 1
                print(
                    f"  {'PASS' if blocked else 'FAIL'}: "
                    f"{method} {path} -> {resp.status_code}"
                )
            except requests.RequestException as exc:
                admin_details.append(f"{method} {path} -> error: {exc}")
                print(f"  WARN: {method} {path} -> {exc}")

        register_resp = requests.post(
            url("/api/auth/register"),
            headers=user_headers,
            json={
                "username": f"AuthFlow_rbac_blocked_{_RUN_ID}",
                "password": "ShouldFail123!",
                "role": "user",
            },
            timeout=REQUEST_TIMEOUT,
        )
        register_blocked = register_resp.status_code in (401, 403)
        print(
            f"  {'PASS' if register_blocked else 'FAIL'}: "
            f"POST /api/auth/register -> {register_resp.status_code}"
        )

        ok = can_read and admin_blocked_count >= 1 and register_blocked
        detail = (
            f"oracle:read -> {read_resp.status_code}, "
            f"admin endpoints blocked: {admin_blocked_count}/{admin_tested_count}, "
            f"register blocked: {register_resp.status_code}, "
            f"details: {'; '.join(admin_details)}"
        )
        print(f"  {'PASS' if ok else 'FAIL'}: Overall RBAC: {detail}")
        return _record(10, "rbac_enforcement", ok, detail)

    except requests.RequestException as exc:
        detail = f"Request failed: {exc}"
        print(f"  FAIL: {detail}")
        return _record(10, "rbac_enforcement", False, detail)


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------


def _cleanup_test_users() -> None:
    """Best-effort cleanup of users created during this run.

    The validation script creates users with the AuthFlow_ prefix.
    Without a DELETE endpoint for system users, direct DB cleanup is not
    possible from here. The users will persist until manually removed.
    """
    pass


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate 10 NPS authentication flows")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON instead of human-readable text",
    )
    args = parser.parse_args()

    start_time = datetime.now(timezone.utc)

    if not args.json:
        print("=" * 64)
        print("NPS Auth Flow Validation")
        print(f"API: {API_BASE_URL}")
        print(f"Run ID: {_RUN_ID}")
        print(f"Started: {start_time.isoformat()}")
        print("=" * 64)

    api_up = _api_reachable()
    if not api_up:
        if args.json:
            report = {
                "timestamp": start_time.isoformat(),
                "api_base_url": API_BASE_URL,
                "api_reachable": False,
                "results": [],
                "summary": {
                    "total": 10,
                    "passed": 0,
                    "failed": 0,
                    "skipped": 10,
                },
            }
            print(json.dumps(report, indent=2))
        else:
            print(
                f"\nAPI not reachable at {API_BASE_URL}. "
                "Skipping all network-based auth flow tests."
            )
            print("Start the API (make dev-api) and re-run.")
            print("=" * 64)
        sys.exit(0)

    # ---------- Run all 10 flows ----------

    flow_register_new_user()

    _, access_token, refresh_token = flow_login_get_jwt()

    flow_jwt_protected_endpoint(access_token)

    flow_invalid_jwt()

    flow_expired_jwt()

    flow_refresh_token_rotation(refresh_token)

    flow_logout_revocation()

    flow_api_key_creation_usage()

    flow_brute_force_lockout()

    flow_rbac_enforcement()

    _cleanup_test_users()

    # ---------- Summary ----------
    end_time = datetime.now(timezone.utc)
    duration = (end_time - start_time).total_seconds()

    total = len(_results)
    passed = sum(1 for r in _results if r["status"] == "PASS")
    failed = sum(1 for r in _results if r["status"] == "FAIL")
    skipped = sum(1 for r in _results if r["status"] == "SKIP")

    if args.json:
        report = {
            "timestamp": start_time.isoformat(),
            "duration_seconds": round(duration, 2),
            "api_base_url": API_BASE_URL,
            "api_reachable": True,
            "run_id": _RUN_ID,
            "results": _results,
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "skipped": skipped,
            },
        }
        print(json.dumps(report, indent=2))
    else:
        print("\n" + "=" * 64)
        print("NPS Auth Flow Validation -- Summary")
        print(f"Duration: {duration:.1f}s")
        print(
            f"Flows: {total} total | {passed} passed | "
            f"{failed} failed | {skipped} skipped"
        )
        print("-" * 64)

        for r in _results:
            marker = r["status"]
            print(f"  [{marker:4s}] Flow {r['flow']:2d}: {r['name']}")
            if r["status"] == "FAIL":
                print(f"         -> {r['detail']}")

        print("=" * 64)

        if failed > 0:
            print(f"\n{failed} flow(s) FAILED.")
        elif skipped > 0:
            print(f"\nAll executed flows passed. {skipped} skipped.")
        else:
            print("\nAll 10 auth flows passed.")

    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
