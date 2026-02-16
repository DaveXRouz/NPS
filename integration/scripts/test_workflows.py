#!/usr/bin/env python3
"""End-to-end workflow tests — complete user journeys through the NPS system.

SB3: Tests three workflows: single-user, Persian mode, admin flow.
"""

import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import bcrypt
import requests
from sqlalchemy import create_engine, text

# Load .env
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_ENV_PATH = _PROJECT_ROOT / ".env"
if _ENV_PATH.exists():
    for line in _ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip()
            if key and key not in os.environ:
                os.environ[key] = value

API = os.environ.get("API_BASE_URL", "http://localhost:8000")
API_KEY = os.environ.get("API_SECRET_KEY", "")
DB_URL = (
    f"postgresql://{os.environ.get('POSTGRES_USER', 'nps')}:"
    f"{os.environ.get('POSTGRES_PASSWORD', 'changeme')}@"
    f"{os.environ.get('POSTGRES_HOST', 'localhost')}:"
    f"{os.environ.get('POSTGRES_PORT', '5432')}/"
    f"{os.environ.get('POSTGRES_DB', 'nps')}"
)

LEGACY_HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}


def _create_system_user(engine, username: str, password: str, role: str) -> str:
    """Create a system user directly in DB. Returns user_id."""
    user_id = str(uuid.uuid4())
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    with engine.connect() as conn:
        conn.execute(
            text(
                "INSERT INTO users (id, username, password_hash, role, is_active) "
                "VALUES (:id, :u, :pw, :role, TRUE) "
                "ON CONFLICT (username) DO UPDATE SET password_hash = :pw, role = :role"
            ),
            {"id": user_id, "u": username, "pw": pw_hash, "role": role},
        )
        conn.commit()
        row = conn.execute(
            text("SELECT id FROM users WHERE username = :u"), {"u": username}
        ).fetchone()
    return str(row[0])


def _login(username: str, password: str) -> str:
    """Login and return JWT token."""
    resp = requests.post(
        f"{API}/api/auth/login",
        json={"username": username, "password": password},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _jwt_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _cleanup_test_data(engine, prefix: str = "WF_") -> None:
    """Clean up test oracle users and system users."""
    with engine.connect() as conn:
        conn.execute(text(f"DELETE FROM oracle_users WHERE name LIKE '{prefix}%'"))
        conn.execute(
            text(
                f"DELETE FROM api_keys WHERE user_id IN "
                f"(SELECT id FROM users WHERE username LIKE '{prefix}%')"
            )
        )
        conn.execute(text(f"DELETE FROM users WHERE username LIKE '{prefix}%'"))
        conn.commit()


# ─── Workflow 1: Single-User Flow ────────────────────────────────────────────


def workflow_single_user(engine) -> list[dict]:
    """Register -> Profile -> Reading -> View -> Share -> Delete."""
    results = []
    prefix = f"WF_{uuid.uuid4().hex[:6]}"
    username = f"{prefix}_alice"
    password = "TestPass123!"

    # Step 1: Register user
    t0 = time.perf_counter()
    try:
        _create_system_user(engine, username, password, "user")
        token = _login(username, password)
        _jwt_headers(token)  # Verify JWT generation works
        results.append(_r("Register & Login", "pass", f"User: {username}", t0))
    except Exception as e:
        results.append(_r("Register & Login", "fail", str(e), t0))
        return results

    # Step 2: Create oracle profile
    t0 = time.perf_counter()
    try:
        resp = requests.post(
            f"{API}/api/oracle/users",
            headers=LEGACY_HEADERS,
            json={
                "name": f"{prefix}_Alice",
                "birthday": "1990-05-15",
                "mother_name": "Sarah",
                "country": "US",
                "city": "New York",
            },
            timeout=10,
        )
        if resp.status_code in (200, 201):
            profile = resp.json()
            profile_id = profile.get("id")
            results.append(
                _r("Create Profile", "pass", f"Profile ID: {profile_id}", t0)
            )
        else:
            results.append(
                _r(
                    "Create Profile",
                    "fail",
                    f"Status {resp.status_code}: {resp.text[:100]}",
                    t0,
                )
            )
            profile_id = None
    except Exception as e:
        results.append(_r("Create Profile", "fail", str(e), t0))
        profile_id = None

    # Step 3: Time reading
    t0 = time.perf_counter()
    try:
        resp = requests.post(
            f"{API}/api/oracle/reading",
            headers=LEGACY_HEADERS,
            json={"datetime": "2024-06-15T14:30:00+00:00"},
            timeout=30,
        )
        if resp.status_code == 200:
            reading = resp.json()
            reading_id = reading.get("reading_id")
            has_fc60 = "fc60" in reading or "fc60_stamp" in reading
            results.append(
                _r(
                    "Time Reading",
                    "pass",
                    f"Reading ID: {reading_id}, FC60: {has_fc60}",
                    t0,
                )
            )
        else:
            results.append(_r("Time Reading", "fail", f"Status {resp.status_code}", t0))
            reading_id = None
    except Exception as e:
        results.append(_r("Time Reading", "fail", str(e), t0))
        reading_id = None

    # Step 4: List readings
    t0 = time.perf_counter()
    try:
        resp = requests.get(
            f"{API}/api/oracle/readings",
            headers=LEGACY_HEADERS,
            timeout=10,
        )
        if resp.status_code == 200:
            readings = resp.json()
            count = (
                len(readings)
                if isinstance(readings, list)
                else readings.get("total", "?")
            )
            results.append(_r("List Readings", "pass", f"Found {count} readings", t0))
        else:
            results.append(
                _r("List Readings", "fail", f"Status {resp.status_code}", t0)
            )
    except Exception as e:
        results.append(_r("List Readings", "fail", str(e), t0))

    # Step 5: Share reading
    t0 = time.perf_counter()
    if reading_id:
        try:
            resp = requests.post(
                f"{API}/api/oracle/share",
                headers=LEGACY_HEADERS,
                json={"reading_id": reading_id},
                timeout=10,
            )
            if resp.status_code in (200, 201):
                share_data = resp.json()
                share_token = share_data.get("share_token") or share_data.get("token")
                results.append(
                    _r(
                        "Share Reading",
                        "pass",
                        f"Token: {str(share_token)[:20]}...",
                        t0,
                    )
                )
            else:
                results.append(
                    _r(
                        "Share Reading",
                        "fail",
                        f"Status {resp.status_code}: {resp.text[:80]}",
                        t0,
                    )
                )
        except Exception as e:
            results.append(_r("Share Reading", "fail", str(e), t0))
    else:
        results.append(_r("Share Reading", "skip", "No reading to share", t0))

    # Step 6: Delete profile
    t0 = time.perf_counter()
    if profile_id:
        try:
            resp = requests.delete(
                f"{API}/api/oracle/users/{profile_id}",
                headers=LEGACY_HEADERS,
                timeout=10,
            )
            if resp.status_code in (200, 204):
                results.append(_r("Delete Profile", "pass", "Profile deleted", t0))
            else:
                results.append(
                    _r("Delete Profile", "fail", f"Status {resp.status_code}", t0)
                )
        except Exception as e:
            results.append(_r("Delete Profile", "fail", str(e), t0))
    else:
        results.append(_r("Delete Profile", "skip", "No profile to delete", t0))

    # Cleanup
    _cleanup_test_data(engine, prefix)
    return results


# ─── Workflow 2: Persian Mode Flow ──────────────────────────────────────────


def workflow_persian(engine) -> list[dict]:
    """Create user with Persian name -> Reading -> Verify UTF-8."""
    results = []
    prefix = f"WF_{uuid.uuid4().hex[:6]}"

    # Step 1: Create Persian profile
    t0 = time.perf_counter()
    try:
        resp = requests.post(
            f"{API}/api/oracle/users",
            headers=LEGACY_HEADERS,
            json={
                "name": f"{prefix}_Hamzeh",
                "name_persian": "\u062d\u0645\u0632\u0647",
                "birthday": "1988-03-21",
                "mother_name": "Fatemeh",
                "mother_name_persian": "\u0641\u0627\u0637\u0645\u0647",
                "country": "Iran",
                "city": "Tehran",
            },
            timeout=10,
        )
        if resp.status_code in (200, 201):
            profile = resp.json()
            profile_id = profile.get("id")
            results.append(
                _r("Persian Profile", "pass", f"Profile ID: {profile_id}", t0)
            )
        else:
            results.append(
                _r(
                    "Persian Profile",
                    "fail",
                    f"Status {resp.status_code}: {resp.text[:80]}",
                    t0,
                )
            )
            profile_id = None
    except Exception as e:
        results.append(_r("Persian Profile", "fail", str(e), t0))
        profile_id = None

    # Step 2: Name reading with Persian name
    t0 = time.perf_counter()
    try:
        resp = requests.post(
            f"{API}/api/oracle/name",
            headers=LEGACY_HEADERS,
            json={"name": "\u062d\u0645\u0632\u0647"},
            timeout=60,
        )
        if resp.status_code == 200:
            data = resp.json()
            has_numerology = "numerology" in data
            detected_script = data.get("detected_script", "unknown")
            results.append(
                _r(
                    "Persian Name Reading",
                    "pass",
                    f"Script: {detected_script}, Numerology: {has_numerology}",
                    t0,
                )
            )
        else:
            results.append(
                _r(
                    "Persian Name Reading",
                    "fail",
                    f"Status {resp.status_code}: {resp.text[:80]}",
                    t0,
                )
            )
    except Exception as e:
        results.append(_r("Persian Name Reading", "fail", str(e), t0))

    # Step 3: Verify UTF-8 in DB
    t0 = time.perf_counter()
    if profile_id:
        try:
            eng = create_engine(DB_URL)
            with eng.connect() as conn:
                row = conn.execute(
                    text("SELECT name_persian FROM oracle_users WHERE id = :id"),
                    {"id": profile_id},
                ).fetchone()
            eng.dispose()
            if row and row[0]:
                persian_text = row[0]
                is_persian = any("\u0600" <= c <= "\u06ff" for c in persian_text)
                results.append(
                    _r(
                        "UTF-8 in DB",
                        "pass" if is_persian else "fail",
                        f"DB value: {persian_text}",
                        t0,
                    )
                )
            else:
                results.append(_r("UTF-8 in DB", "fail", "No Persian data in DB", t0))
        except Exception as e:
            results.append(_r("UTF-8 in DB", "fail", str(e), t0))
    else:
        results.append(_r("UTF-8 in DB", "skip", "No profile created", t0))

    # Cleanup
    _cleanup_test_data(engine, prefix)
    return results


# ─── Workflow 3: Admin Flow ──────────────────────────────────────────────────


def workflow_admin(engine) -> list[dict]:
    """Login as admin -> Stats -> List users -> Audit."""
    results = []
    prefix = f"WF_{uuid.uuid4().hex[:6]}"
    username = f"{prefix}_admin"
    password = "AdminPass123!"

    # Step 1: Create admin and login
    t0 = time.perf_counter()
    try:
        _create_system_user(engine, username, password, "admin")
        token = _login(username, password)
        headers = _jwt_headers(token)
        results.append(_r("Admin Login", "pass", f"User: {username}", t0))
    except Exception as e:
        results.append(_r("Admin Login", "fail", str(e), t0))
        return results

    # Step 2: View admin stats
    t0 = time.perf_counter()
    try:
        resp = requests.get(f"{API}/api/admin/stats", headers=headers, timeout=10)
        if resp.status_code == 200:
            stats = resp.json()
            results.append(
                _r("Admin Stats", "pass", f"Keys: {list(stats.keys())[:5]}", t0)
            )
        else:
            results.append(_r("Admin Stats", "fail", f"Status {resp.status_code}", t0))
    except Exception as e:
        results.append(_r("Admin Stats", "fail", str(e), t0))

    # Step 3: List users
    t0 = time.perf_counter()
    try:
        resp = requests.get(f"{API}/api/admin/users", headers=headers, timeout=10)
        if resp.status_code == 200:
            users = resp.json()
            count = len(users) if isinstance(users, list) else users.get("total", "?")
            results.append(_r("List Users", "pass", f"Found {count} users", t0))
        else:
            results.append(_r("List Users", "fail", f"Status {resp.status_code}", t0))
    except Exception as e:
        results.append(_r("List Users", "fail", str(e), t0))

    # Step 4: View audit log
    t0 = time.perf_counter()
    try:
        resp = requests.get(
            f"{API}/api/oracle/audit", headers=LEGACY_HEADERS, timeout=10
        )
        if resp.status_code == 200:
            audit = resp.json()
            count = len(audit) if isinstance(audit, list) else audit.get("total", "?")
            results.append(_r("Audit Log", "pass", f"Entries: {count}", t0))
        else:
            results.append(
                _r(
                    "Audit Log",
                    "fail",
                    f"Status {resp.status_code}: {resp.text[:80]}",
                    t0,
                )
            )
    except Exception as e:
        results.append(_r("Audit Log", "fail", str(e), t0))

    # Step 5: Change password
    t0 = time.perf_counter()
    try:
        resp = requests.post(
            f"{API}/api/auth/change-password",
            headers=headers,
            json={
                "current_password": password,
                "new_password": "NewAdminPass456!",
            },
            timeout=10,
        )
        if resp.status_code == 200:
            results.append(_r("Change Password", "pass", "Password changed", t0))
        else:
            results.append(
                _r(
                    "Change Password",
                    "fail",
                    f"Status {resp.status_code}: {resp.text[:80]}",
                    t0,
                )
            )
    except Exception as e:
        results.append(_r("Change Password", "fail", str(e), t0))

    # Cleanup
    _cleanup_test_data(engine, prefix)
    return results


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _r(name: str, status: str, detail: str, t0: float) -> dict:
    elapsed = (time.perf_counter() - t0) * 1000
    return {
        "test": name,
        "status": status,
        "detail": detail,
        "elapsed_ms": round(elapsed, 1),
    }


def main() -> None:
    print("=" * 60)
    print("NPS End-to-End Workflow Tests")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    engine = create_engine(DB_URL, pool_pre_ping=True)

    workflows = [
        ("Single-User Flow", workflow_single_user),
        ("Persian Mode Flow", workflow_persian),
        ("Admin Flow", workflow_admin),
    ]

    all_results = []
    for wf_name, wf_func in workflows:
        print(f"\n--- {wf_name} ---")
        results = wf_func(engine)
        for r in results:
            icon = {"pass": "PASS", "fail": "FAIL", "skip": "SKIP"}[r["status"]]
            print(f"  [{icon}] {r['test']}: {r['detail']} ({r['elapsed_ms']:.0f}ms)")
        all_results.extend(results)

    engine.dispose()

    passed = sum(1 for r in all_results if r["status"] == "pass")
    failed = sum(1 for r in all_results if r["status"] == "fail")
    skipped = sum(1 for r in all_results if r["status"] == "skip")

    print(f"\n{'=' * 60}")
    print(f"Workflow Results: {passed} pass / {failed} fail / {skipped} skip")
    print("=" * 60)

    # Generate report
    report_lines = [
        "# End-to-End Workflow Report",
        "",
        f"**Generated:** {datetime.now(timezone.utc).isoformat()}",
        "",
        "## Results",
        "",
        "| Workflow | Step | Status | Detail | Time |",
        "|----------|------|--------|--------|------|",
    ]

    current_wf = ""
    wf_names = ["Single-User Flow"] * 6 + ["Persian Mode Flow"] * 3 + ["Admin Flow"] * 5
    for i, r in enumerate(all_results):
        wf = wf_names[i] if i < len(wf_names) else "Unknown"
        icon = {"pass": "PASS", "fail": "FAIL", "skip": "SKIP"}[r["status"]]
        report_lines.append(
            f"| {wf if wf != current_wf else ''} | {r['test']} | {icon} | {r['detail'][:50]} | {r['elapsed_ms']}ms |"
        )
        current_wf = wf

    report_lines.extend(
        [
            "",
            f"**Summary:** {passed} pass / {failed} fail / {skipped} skip",
            "",
            "## Workflows Tested",
            "",
            "1. **Single-User Flow:** Register -> Profile -> Reading -> List -> Share -> Delete",
            "2. **Persian Mode Flow:** Persian profile -> Persian name reading -> UTF-8 DB verification",
            "3. **Admin Flow:** Admin login -> Stats -> List users -> Audit log -> Change password",
            "",
        ]
    )

    report_path = _PROJECT_ROOT / "integration" / "END_TO_END_WORKFLOW_REPORT.md"
    report_path.write_text("\n".join(report_lines))
    print(f"Report written to: {report_path}")


if __name__ == "__main__":
    main()
