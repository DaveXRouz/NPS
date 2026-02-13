"""Shared fixtures for NPS integration tests."""

import os
import time
import uuid
from pathlib import Path

import bcrypt as _bcrypt
import pytest
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# ─── Environment Setup ─────────────────────────────────────────────────────

# Load .env values into os.environ for tests
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
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

# API config
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000")
API_SECRET_KEY = os.environ.get("API_SECRET_KEY", "")

# Database config
DB_URL = (
    f"postgresql://{os.environ.get('POSTGRES_USER', 'nps')}:"
    f"{os.environ.get('POSTGRES_PASSWORD', 'changeme')}@"
    f"{os.environ.get('POSTGRES_HOST', 'localhost')}:"
    f"{os.environ.get('POSTGRES_PORT', '5432')}/"
    f"{os.environ.get('POSTGRES_DB', 'nps')}"
)


# ─── Sample Profile Data ────────────────────────────────────────────────────

SAMPLE_PROFILE_EN = {
    "name": "IntTest_Alice",
    "birthday": "1990-05-15",
    "mother_name": "Sarah",
    "country": "US",
    "city": "New York",
}

SAMPLE_PROFILE_FA = {
    "name": "IntTest_Hamzeh",
    "name_persian": "\u062d\u0645\u0632\u0647",
    "birthday": "1988-03-21",
    "mother_name": "Fatemeh",
    "mother_name_persian": "\u0641\u0627\u0637\u0645\u0647",
    "country": "Iran",
    "city": "Tehran",
}

SAMPLE_PROFILE_MIXED = {
    "name": "IntTest_Sara",
    "name_persian": "\u0633\u0627\u0631\u0627",
    "birthday": "1995-11-30",
    "mother_name": "Maryam",
    "mother_name_persian": "\u0645\u0631\u06cc\u0645",
    "country": "Iran",
    "city": "Isfahan",
}


# ─── Database Fixtures ─────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def db_engine():
    """Create a SQLAlchemy engine for the test database."""
    engine = create_engine(DB_URL, pool_pre_ping=True)
    yield engine
    engine.dispose()


@pytest.fixture(scope="session")
def db_session_factory(db_engine):
    """Create a session factory."""
    return sessionmaker(bind=db_engine)


@pytest.fixture
def db_session(db_session_factory):
    """Yield a database session that rolls back after each test."""
    session = db_session_factory()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def db_connection(db_engine):
    """Yield a raw database connection."""
    conn = db_engine.connect()
    yield conn
    conn.close()


# ─── API Client Fixtures ──────────────────────────────────────────────────


@pytest.fixture(scope="session")
def api_client():
    """HTTP client with legacy Bearer auth header for API tests."""
    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Bearer {API_SECRET_KEY}",
            "Content-Type": "application/json",
        }
    )
    session.base_url = API_BASE_URL
    yield session
    session.close()


@pytest.fixture(scope="session")
def api_base_url():
    """The base URL for API requests."""
    return API_BASE_URL


# ─── Auth Helpers ────────────────────────────────────────────────────────────


def _create_test_system_user(
    db_session_factory, username: str, password: str, role: str
) -> dict:
    """Insert a user into the users table and return {id, username, password, role}.

    Uses ON CONFLICT to handle re-runs gracefully (upsert pattern).
    Password is bcrypt-hashed before storage.
    """
    pw_hash = _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode(
        "utf-8"
    )
    user_id = str(uuid.uuid4())
    session = db_session_factory()
    try:
        session.execute(
            text(
                "INSERT INTO users (id, username, password_hash, role, is_active) "
                "VALUES (:id, :username, :pw, :role, TRUE) "
                "ON CONFLICT (username) DO UPDATE "
                "SET password_hash = :pw, role = :role, is_active = TRUE"
            ),
            {"id": user_id, "username": username, "pw": pw_hash, "role": role},
        )
        session.commit()
        row = session.execute(
            text("SELECT id FROM users WHERE username = :u"), {"u": username}
        ).fetchone()
        return {
            "id": row[0],
            "username": username,
            "password": password,
            "role": role,
        }
    finally:
        session.close()


def _login(username: str, password: str) -> str:
    """Login via POST /api/auth/login and return the access_token string."""
    resp = requests.post(
        api_url("/api/auth/login"),
        json={"username": username, "password": password},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


# ─── Session-Scoped Auth Fixtures ───────────────────────────────────────────


@pytest.fixture(scope="session")
def admin_user(db_session_factory):
    """Create and return an admin-role test user."""
    return _create_test_system_user(
        db_session_factory, "IntTest_admin", "AdminPass123!", "admin"
    )


@pytest.fixture(scope="session")
def regular_user(db_session_factory):
    """Create and return a user-role test user."""
    return _create_test_system_user(
        db_session_factory, "IntTest_user", "UserPass123!", "user"
    )


@pytest.fixture(scope="session")
def readonly_user(db_session_factory):
    """Create and return a readonly-role test user."""
    return _create_test_system_user(
        db_session_factory, "IntTest_readonly", "ReadPass123!", "readonly"
    )


@pytest.fixture(scope="session")
def admin_jwt_client(admin_user):
    """HTTP client authenticated as admin via JWT."""
    token = _login(admin_user["username"], admin_user["password"])
    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
    )
    yield session
    session.close()


@pytest.fixture(scope="session")
def user_jwt_client(regular_user):
    """HTTP client authenticated as regular user via JWT."""
    token = _login(regular_user["username"], regular_user["password"])
    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
    )
    yield session
    session.close()


@pytest.fixture(scope="session")
def readonly_jwt_client(readonly_user):
    """HTTP client authenticated as readonly user via JWT."""
    token = _login(readonly_user["username"], readonly_user["password"])
    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
    )
    yield session
    session.close()


@pytest.fixture
def unauth_client():
    """HTTP client with NO authentication headers."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    yield session
    session.close()


# ─── Cleanup Fixtures ─────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def cleanup_test_data(db_session_factory):
    """Delete test data created during tests (IntTest% prefix)."""
    yield
    # Post-test cleanup
    session = db_session_factory()
    try:
        # Clean up test oracle users (cascade deletes readings/audit)
        session.execute(text("DELETE FROM oracle_users WHERE name LIKE 'IntTest%'"))
        session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()


@pytest.fixture(autouse=True, scope="session")
def cleanup_test_system_users(db_session_factory):
    """Delete test system users and their API keys after the entire test session."""
    yield
    session = db_session_factory()
    try:
        session.execute(
            text(
                "DELETE FROM api_keys WHERE user_id IN "
                "(SELECT id FROM users WHERE username LIKE 'IntTest_%')"
            )
        )
        session.execute(text("DELETE FROM users WHERE username LIKE 'IntTest_%'"))
        session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()


# ─── Helpers ───────────────────────────────────────────────────────────────


def api_url(path: str) -> str:
    """Build a full API URL from a relative path."""
    return f"{API_BASE_URL}{path}"


# ─── Deterministic Test Constants ─────────────────────────────────────────────

DETERMINISTIC_DATETIME = "2024-06-15T14:30:00+00:00"

ZODIAC_SIGNS = {
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
}

CHINESE_ANIMALS = {
    "Rat",
    "Ox",
    "Tiger",
    "Rabbit",
    "Dragon",
    "Snake",
    "Horse",
    "Goat",
    "Monkey",
    "Rooster",
    "Dog",
    "Pig",
}

FIVE_ELEMENTS = {"Wood", "Fire", "Earth", "Metal", "Water"}

VALID_LIFE_PATHS = set(range(1, 10)) | {11, 22, 33}

THREE_USERS = [
    {"name": "IntTest_Deep_A", "birth_year": 1990, "birth_month": 3, "birth_day": 15},
    {"name": "IntTest_Deep_B", "birth_year": 1985, "birth_month": 7, "birth_day": 22},
    {"name": "IntTest_Deep_C", "birth_year": 1978, "birth_month": 11, "birth_day": 8},
]


# ─── AI Mock Fixture ─────────────────────────────────────────────────────────


@pytest.fixture
def ai_mock():
    """Stub for AI mocking in integration tests.

    In unit tests, this would monkeypatch the AI interpreter. For HTTP-based
    integration tests, the server-side AI is already optional — if
    ANTHROPIC_API_KEY is not set, ai_interpretation returns None gracefully.
    This fixture exists for API parity and future in-process test support.
    """
    yield


# ─── Reading Helper Fixture ──────────────────────────────────────────────────


@pytest.fixture
def reading_helper(api_client):
    """Utility for common reading test patterns."""

    class ReadingHelper:
        def time_reading(self, datetime_str: str = DETERMINISTIC_DATETIME):
            resp = api_client.post(
                api_url("/api/oracle/reading"),
                json={"datetime": datetime_str},
            )
            assert resp.status_code == 200, (
                f"Time reading failed: {resp.status_code}: {resp.text}"
            )
            return resp.json()

        def name_reading(self, name: str):
            resp = api_client.post(
                api_url("/api/oracle/name"),
                json={"name": name},
            )
            assert resp.status_code == 200, (
                f"Name reading failed: {resp.status_code}: {resp.text}"
            )
            return resp.json()

        def question_reading(self, question: str):
            resp = api_client.post(
                api_url("/api/oracle/question"),
                json={"question": question},
            )
            assert resp.status_code == 200, (
                f"Question reading failed: {resp.status_code}: {resp.text}"
            )
            return resp.json()

        def daily_reading(self, date: str | None = None):
            url = api_url("/api/oracle/daily")
            if date:
                url += f"?date={date}"
            resp = api_client.get(url)
            assert resp.status_code == 200, (
                f"Daily reading failed: {resp.status_code}: {resp.text}"
            )
            return resp.json()

        def multi_user_reading(
            self, users: list[dict], include_interpretation: bool = False
        ):
            resp = api_client.post(
                api_url("/api/oracle/reading/multi-user"),
                json={
                    "users": users,
                    "primary_user_index": 0,
                    "include_interpretation": include_interpretation,
                },
            )
            assert resp.status_code == 200, (
                f"Multi-user reading failed: {resp.status_code}: {resp.text}"
            )
            return resp.json()

    return ReadingHelper()


# ─── Assertion Helpers ────────────────────────────────────────────────────────


def assert_reading_has_core_sections(data: dict) -> None:
    """Assert time reading response has all mandatory sections."""
    for key in ("fc60", "numerology", "zodiac", "summary", "generated_at"):
        assert key in data, f"Missing required section: {key}"


def assert_fc60_valid(fc60: dict) -> None:
    """Assert FC60 section has valid data types and ranges."""
    assert isinstance(fc60["cycle"], int) and 0 <= fc60["cycle"] <= 59
    assert fc60["element"] in FIVE_ELEMENTS
    assert fc60["polarity"] in ("Yin", "Yang")
    assert isinstance(fc60["stem"], str) and len(fc60["stem"]) > 0
    assert isinstance(fc60["branch"], str) and len(fc60["branch"]) > 0
    assert (
        isinstance(fc60["energy_level"], (int, float))
        and 0 <= fc60["energy_level"] <= 1.0
    )
    if "element_balance" in fc60:
        assert set(fc60["element_balance"].keys()) == FIVE_ELEMENTS
        assert 0.9 <= sum(fc60["element_balance"].values()) <= 1.1


def assert_numerology_valid(num: dict) -> None:
    """Assert numerology section has valid data types and ranges."""
    assert num["life_path"] in VALID_LIFE_PATHS
    assert isinstance(num["day_vibration"], int)
    assert isinstance(num["personal_year"], int)
    assert isinstance(num["personal_month"], int)
    assert isinstance(num["personal_day"], int)
    assert isinstance(num["interpretation"], str)


def timed_request(client, method: str, url: str, **kwargs):
    """Execute a request and return (response, elapsed_ms)."""
    start = time.perf_counter()
    resp = getattr(client, method)(url, **kwargs)
    elapsed_ms = (time.perf_counter() - start) * 1000
    return resp, elapsed_ms
