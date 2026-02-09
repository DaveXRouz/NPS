"""HTTP-level tests for auth router endpoints (login, API key CRUD)."""

import hashlib
import uuid

import bcrypt as _bcrypt
import pytest
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.orm.api_key import APIKey
from app.orm.user import User

LOGIN_URL = "/api/auth/login"
API_KEYS_URL = "/api/auth/api-keys"

# ─── Fixtures ────────────────────────────────────────────────────────────────

_engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
_Session = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def _override_get_db():
    db = _Session()
    try:
        yield db
    finally:
        db.close()


def _make_user(username: str, password: str, role: str = "user", is_active: bool = True) -> User:
    pw_hash = _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")
    return User(
        id=str(uuid.uuid4()),
        username=username,
        password_hash=pw_hash,
        role=role,
        is_active=is_active,
    )


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture
def db():
    session = _Session()
    yield session
    session.close()


@pytest.fixture
def admin_user(db):
    user = _make_user("admin", "admin-pass-123", role="admin")
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def regular_user(db):
    user = _make_user("alice", "alice-pass-456", role="user")
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def disabled_user(db):
    user = _make_user("disabled", "disabled-pass", role="user", is_active=False)
    db.add(user)
    db.commit()
    return user


@pytest.fixture
async def raw_client():
    """Client with real DB but NO auth override — tests actual auth flow."""
    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


async def _login(client: AsyncClient, username: str, password: str) -> dict:
    """Helper: login and return response JSON."""
    resp = await client.post(LOGIN_URL, json={"username": username, "password": password})
    return resp


# ─── Login Tests ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_valid_credentials(raw_client, admin_user):
    resp = await _login(raw_client, "admin", "admin-pass-123")
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0
    # Verify the JWT decodes with correct claims
    payload = jwt.decode(data["access_token"], settings.api_secret_key, algorithms=["HS256"])
    assert payload["sub"] == admin_user.id
    assert payload["username"] == "admin"
    assert payload["role"] == "admin"
    assert "oracle:admin" in payload["scopes"]


@pytest.mark.asyncio
async def test_login_invalid_password(raw_client, admin_user):
    resp = await _login(raw_client, "admin", "wrong-password")
    assert resp.status_code == 401
    assert "Invalid" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_nonexistent_user(raw_client):
    resp = await _login(raw_client, "ghost", "any-password")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_disabled_user(raw_client, disabled_user):
    resp = await _login(raw_client, "disabled", "disabled-pass")
    assert resp.status_code == 403
    assert "disabled" in resp.json()["detail"].lower()


# ─── API Key Create Tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_api_key(raw_client, admin_user):
    login_resp = await _login(raw_client, "admin", "admin-pass-123")
    token = login_resp.json()["access_token"]

    resp = await raw_client.post(
        API_KEYS_URL,
        json={"name": "My Key", "scopes": ["oracle:read", "oracle:write"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "My Key"
    assert "key" in data  # plaintext key returned on creation
    assert data["key"] is not None
    assert len(data["key"]) > 20
    assert data["is_active"] is True
    assert set(data["scopes"]) == {"oracle:read", "oracle:write"}


@pytest.mark.asyncio
async def test_create_api_key_with_expiry(raw_client, admin_user):
    login_resp = await _login(raw_client, "admin", "admin-pass-123")
    token = login_resp.json()["access_token"]

    resp = await raw_client.post(
        API_KEYS_URL,
        json={"name": "Temp Key", "scopes": ["oracle:read"], "expires_in_days": 30},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["expires_at"] is not None


@pytest.mark.asyncio
async def test_api_key_stored_as_hash(raw_client, admin_user, db):
    login_resp = await _login(raw_client, "admin", "admin-pass-123")
    token = login_resp.json()["access_token"]

    resp = await raw_client.post(
        API_KEYS_URL,
        json={"name": "Hash Check", "scopes": ["oracle:read"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    plaintext_key = resp.json()["key"]

    # Verify the DB stores the SHA-256 hash, not the plaintext
    expected_hash = hashlib.sha256(plaintext_key.encode()).hexdigest()
    stored = db.query(APIKey).filter(APIKey.name == "Hash Check").first()
    assert stored is not None
    assert stored.key_hash == expected_hash
    assert stored.key_hash != plaintext_key


# ─── API Key List Tests ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_api_keys(raw_client, admin_user):
    login_resp = await _login(raw_client, "admin", "admin-pass-123")
    token = login_resp.json()["access_token"]

    # Create two keys
    await raw_client.post(
        API_KEYS_URL,
        json={"name": "Key A", "scopes": ["oracle:read"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    await raw_client.post(
        API_KEYS_URL,
        json={"name": "Key B", "scopes": ["oracle:write"]},
        headers={"Authorization": f"Bearer {token}"},
    )

    resp = await raw_client.get(API_KEYS_URL, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    keys = resp.json()
    assert len(keys) == 2
    names = {k["name"] for k in keys}
    assert names == {"Key A", "Key B"}
    # List should NOT return the plaintext key
    for k in keys:
        assert k.get("key") is None


# ─── API Key Revoke Tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_revoke_api_key(raw_client, admin_user, db):
    login_resp = await _login(raw_client, "admin", "admin-pass-123")
    token = login_resp.json()["access_token"]

    # Create a key
    create_resp = await raw_client.post(
        API_KEYS_URL,
        json={"name": "Revoke Me", "scopes": ["oracle:read"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    key_id = create_resp.json()["id"]

    # Revoke it
    resp = await raw_client.delete(
        f"{API_KEYS_URL}/{key_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200

    # Verify it's deactivated in DB
    db.expire_all()
    stored = db.query(APIKey).filter(APIKey.id == key_id).first()
    assert stored.is_active is False


@pytest.mark.asyncio
async def test_revoke_nonexistent_key(raw_client, admin_user):
    login_resp = await _login(raw_client, "admin", "admin-pass-123")
    token = login_resp.json()["access_token"]

    resp = await raw_client.delete(
        f"{API_KEYS_URL}/nonexistent-id", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_revoke_other_users_key(raw_client, admin_user, regular_user, db):
    # Login as regular user and create a key
    login_resp = await _login(raw_client, "alice", "alice-pass-456")
    alice_token = login_resp.json()["access_token"]

    create_resp = await raw_client.post(
        API_KEYS_URL,
        json={"name": "Alice Key", "scopes": ["oracle:read"]},
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    key_id = create_resp.json()["id"]

    # Login as admin — admin CAN revoke others' keys
    admin_login = await _login(raw_client, "admin", "admin-pass-123")
    admin_token = admin_login.json()["access_token"]

    resp = await raw_client.delete(
        f"{API_KEYS_URL}/{key_id}", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_non_admin_cannot_revoke_others_key(raw_client, admin_user, regular_user, db):
    # Admin creates a key
    admin_login = await _login(raw_client, "admin", "admin-pass-123")
    admin_token = admin_login.json()["access_token"]

    create_resp = await raw_client.post(
        API_KEYS_URL,
        json={"name": "Admin Key", "scopes": ["oracle:admin"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    key_id = create_resp.json()["id"]

    # Regular user tries to revoke admin's key
    alice_login = await _login(raw_client, "alice", "alice-pass-456")
    alice_token = alice_login.json()["access_token"]

    resp = await raw_client.delete(
        f"{API_KEYS_URL}/{key_id}", headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert resp.status_code == 403
