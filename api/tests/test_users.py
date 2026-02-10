"""Tests for system user management endpoints — /api/users."""

import uuid

import bcrypt as _bcrypt
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.middleware.auth import get_current_user
from app.orm.user import User

# ─── Test DB Setup ────────────────────────────────────────────────────────────

_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestSession = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

ADMIN_ID = str(uuid.uuid4())
MOD_ID = str(uuid.uuid4())
USER_ID = str(uuid.uuid4())
OTHER_USER_ID = str(uuid.uuid4())


def _override_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


def _make_admin_user():
    return {
        "user_id": ADMIN_ID,
        "username": "test-admin",
        "role": "admin",
        "scopes": [
            "oracle:admin",
            "oracle:write",
            "oracle:read",
            "scanner:admin",
            "scanner:write",
            "scanner:read",
            "vault:admin",
            "vault:write",
            "vault:read",
            "admin",
        ],
        "auth_type": "test",
        "api_key_hash": None,
        "rate_limit": None,
    }


def _make_moderator_user():
    return {
        "user_id": MOD_ID,
        "username": "test-moderator",
        "role": "moderator",
        "scopes": [
            "oracle:admin",
            "oracle:write",
            "oracle:read",
            "scanner:read",
            "vault:read",
        ],
        "auth_type": "test",
        "api_key_hash": None,
        "rate_limit": None,
    }


def _make_regular_user():
    return {
        "user_id": USER_ID,
        "username": "test-user",
        "role": "user",
        "scopes": [
            "oracle:write",
            "oracle:read",
            "scanner:write",
            "scanner:read",
            "vault:write",
            "vault:read",
        ],
        "auth_type": "test",
        "api_key_hash": None,
        "rate_limit": None,
    }


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture
def seed_users():
    """Seed test users into the DB."""
    db = _TestSession()
    pw_hash = _bcrypt.hashpw(b"testpass123", _bcrypt.gensalt()).decode("utf-8")
    for uid, uname, role in [
        (ADMIN_ID, "admin-user", "admin"),
        (MOD_ID, "moderator-user", "moderator"),
        (USER_ID, "regular-user", "user"),
        (OTHER_USER_ID, "other-user", "user"),
    ]:
        db.add(User(id=uid, username=uname, password_hash=pw_hash, role=role))
    db.commit()
    db.close()


@pytest.fixture
async def admin_client(seed_users):
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _make_admin_user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def mod_client(seed_users):
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _make_moderator_user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def user_client(seed_users):
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _make_regular_user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ─── List Users Tests ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_users_admin(admin_client):
    """Admin can list all system users."""
    resp = await admin_client.get("/api/users")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 4
    assert len(data["users"]) == 4
    # Never expose password_hash
    for u in data["users"]:
        assert "password_hash" not in u


@pytest.mark.asyncio
async def test_list_users_moderator(mod_client):
    """Moderator can list all system users."""
    resp = await mod_client.get("/api/users")
    assert resp.status_code == 200
    assert resp.json()["total"] == 4


@pytest.mark.asyncio
async def test_list_users_forbidden(user_client):
    """Regular user gets 403 on system user list."""
    resp = await user_client.get("/api/users")
    assert resp.status_code == 403


# ─── Get User Tests ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_user_self(user_client):
    """User can get own profile."""
    resp = await user_client.get(f"/api/users/{USER_ID}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == USER_ID
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_get_user_other_forbidden(user_client):
    """Non-admin cannot get other user."""
    resp = await user_client.get(f"/api/users/{OTHER_USER_ID}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_user_not_found(admin_client):
    """Non-existent user returns 404."""
    resp = await admin_client.get(f"/api/users/{uuid.uuid4()}")
    assert resp.status_code == 404


# ─── Update User Tests ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_user_admin(admin_client):
    """Admin can update any user."""
    resp = await admin_client.put(
        f"/api/users/{OTHER_USER_ID}",
        json={"username": "new-other-name"},
    )
    assert resp.status_code == 200
    assert resp.json()["username"] == "new-other-name"


@pytest.mark.asyncio
async def test_update_self_username(user_client):
    """User can change own username."""
    resp = await user_client.put(
        f"/api/users/{USER_ID}",
        json={"username": "my-new-name"},
    )
    assert resp.status_code == 200
    assert resp.json()["username"] == "my-new-name"


@pytest.mark.asyncio
async def test_update_self_is_active_forbidden(user_client):
    """Non-admin user cannot change own is_active."""
    resp = await user_client.put(
        f"/api/users/{USER_ID}",
        json={"is_active": False},
    )
    assert resp.status_code == 403


# ─── Deactivate User Tests ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_deactivate_user(admin_client):
    """Admin can deactivate a user."""
    resp = await admin_client.delete(f"/api/users/{OTHER_USER_ID}")
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


@pytest.mark.asyncio
async def test_deactivate_self_forbidden(admin_client):
    """Admin cannot deactivate self."""
    resp = await admin_client.delete(f"/api/users/{ADMIN_ID}")
    assert resp.status_code == 400


# ─── Password Reset Tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_reset_password(admin_client):
    """Admin can reset password."""
    resp = await admin_client.post(
        f"/api/users/{OTHER_USER_ID}/reset-password",
        json={"new_password": "new-strong-password-123"},
    )
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Password reset successfully"


@pytest.mark.asyncio
async def test_reset_password_too_short(admin_client):
    """Password under 8 chars rejected."""
    resp = await admin_client.post(
        f"/api/users/{OTHER_USER_ID}/reset-password",
        json={"new_password": "short"},
    )
    assert resp.status_code == 422


# ─── Change Role Tests ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_change_role(admin_client):
    """Admin can change another user's role."""
    resp = await admin_client.put(
        f"/api/users/{OTHER_USER_ID}/role",
        json={"role": "moderator"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "moderator"


@pytest.mark.asyncio
async def test_change_own_role_forbidden(admin_client):
    """Admin cannot change own role."""
    resp = await admin_client.put(
        f"/api/users/{ADMIN_ID}/role",
        json={"role": "user"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_change_role_invalid(admin_client):
    """Invalid role rejected by Pydantic validator."""
    resp = await admin_client.put(
        f"/api/users/{OTHER_USER_ID}/role",
        json={"role": "superadmin"},
    )
    assert resp.status_code == 422
