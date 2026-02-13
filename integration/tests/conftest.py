"""Shared fixtures for NPS integration tests."""

import os
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
