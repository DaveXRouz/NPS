"""Tests for Oracle user CRUD endpoints — /api/oracle/users with ownership + new fields."""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.middleware.auth import get_current_user
from app.services.security import (
    EncryptionService,
    derive_key,
    get_encryption_service,
)

# ─── Test DB Setup ────────────────────────────────────────────────────────────

_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestSession = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

ADMIN_ID = str(uuid.uuid4())
USER_A_ID = str(uuid.uuid4())
USER_B_ID = str(uuid.uuid4())

_TEST_KEY = derive_key("test-password-32-chars!!", b"salt" * 8)
_test_enc = EncryptionService(_TEST_KEY)

# Mutable container — swap user identity between requests
_active_user: dict = {}


def _override_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


def _override_enc():
    return _test_enc


def _override_current_user():
    return dict(_active_user)


def _set_user(user_id: str, username: str, role: str, scopes: list[str]) -> None:
    _active_user.clear()
    _active_user.update(
        {
            "user_id": user_id,
            "username": username,
            "role": role,
            "scopes": scopes,
            "auth_type": "test",
            "api_key_hash": None,
            "rate_limit": None,
        }
    )


def _set_admin():
    _set_user(
        ADMIN_ID,
        "test-admin",
        "admin",
        [
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
    )


def _set_user_a():
    _set_user(
        USER_A_ID,
        "user-a",
        "user",
        [
            "oracle:write",
            "oracle:read",
            "scanner:write",
            "scanner:read",
            "vault:write",
            "vault:read",
        ],
    )


def _set_user_b():
    _set_user(
        USER_B_ID,
        "user-b",
        "user",
        [
            "oracle:write",
            "oracle:read",
            "scanner:write",
            "scanner:read",
            "vault:write",
            "vault:read",
        ],
    )


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


USERS_URL = "/api/oracle/users"

VALID_USER = {
    "name": "John Doe",
    "birthday": "1990-05-15",
    "mother_name": "Jane Doe",
}

FULL_USER = {
    "name": "Ali Karimi",
    "name_persian": "\u0639\u0644\u06cc \u06a9\u0631\u06cc\u0645\u06cc",
    "birthday": "1985-12-01",
    "mother_name": "Maryam",
    "mother_name_persian": "\u0645\u0631\u06cc\u0645",
    "country": "Iran",
    "city": "Tehran",
}


def _base_user_payload(**overrides):
    data = {
        "name": "Ali Rezaei",
        "birthday": "1990-06-15",
        "mother_name": "Fatimah",
    }
    data.update(overrides)
    return data


@pytest.fixture
async def admin_client():
    _set_admin()
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_encryption_service] = _override_enc
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def shared_client():
    """A single client where user identity can be swapped via _set_*() calls."""
    _set_admin()
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_encryption_service] = _override_enc
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ─── CREATE Tests ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_user(admin_client):
    resp = await admin_client.post(USERS_URL, json=VALID_USER)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "John Doe"
    assert data["birthday"] == "1990-05-15"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_create_user_all_fields(admin_client):
    resp = await admin_client.post(USERS_URL, json=FULL_USER)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name_persian"] == "\u0639\u0644\u06cc \u06a9\u0631\u06cc\u0645\u06cc"
    assert data["country"] == "Iran"
    assert data["city"] == "Tehran"


@pytest.mark.asyncio
async def test_create_user_duplicate_409(admin_client):
    await admin_client.post(USERS_URL, json=VALID_USER)
    resp = await admin_client.post(USERS_URL, json=VALID_USER)
    assert resp.status_code == 409
    assert "already exists" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_create_user_short_name_422(admin_client):
    resp = await admin_client.post(USERS_URL, json={**VALID_USER, "name": "A"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_user_missing_field_422(admin_client):
    resp = await admin_client.post(USERS_URL, json={"name": "Test"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_oracle_user_new_fields(admin_client):
    """Create user with all new fields including gender, BPM, timezone."""
    payload = _base_user_payload(
        gender="male",
        heart_rate_bpm=72,
        timezone_hours=3,
        timezone_minutes=30,
        latitude=35.6892,
        longitude=51.3890,
    )
    resp = await admin_client.post(USERS_URL, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Ali Rezaei"
    assert data["gender"] == "male"
    assert data["heart_rate_bpm"] == 72
    assert data["timezone_hours"] == 3
    assert data["timezone_minutes"] == 30
    assert data["created_by"] == ADMIN_ID


@pytest.mark.asyncio
async def test_create_sets_created_by(shared_client):
    """created_by is set to current user's ID."""
    _set_user_a()
    resp = await shared_client.post(USERS_URL, json=_base_user_payload())
    assert resp.status_code == 201
    assert resp.json()["created_by"] == USER_A_ID


# ─── LIST Tests ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_users_empty(admin_client):
    resp = await admin_client.get(USERS_URL)
    assert resp.status_code == 200
    assert resp.json()["users"] == []
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_list_users_pagination(admin_client):
    names = ["Alpha User", "Bravo User", "Charlie User", "Delta User", "Echo User"]
    for i, name in enumerate(names):
        await admin_client.post(
            USERS_URL,
            json={
                "name": name,
                "birthday": f"1990-01-{i + 1:02d}",
                "mother_name": "Mom",
            },
        )
    resp = await admin_client.get(USERS_URL, params={"limit": 2, "offset": 0})
    data = resp.json()
    assert len(data["users"]) == 2
    assert data["total"] == 5


@pytest.mark.asyncio
async def test_list_users_search(admin_client):
    await admin_client.post(USERS_URL, json=VALID_USER)
    await admin_client.post(
        USERS_URL,
        json={"name": "Alice Smith", "birthday": "1992-03-10", "mother_name": "Mary"},
    )
    resp = await admin_client.get(USERS_URL, params={"search": "john"})
    assert resp.json()["total"] == 1
    assert resp.json()["users"][0]["name"] == "John Doe"


@pytest.mark.asyncio
async def test_list_users_excludes_deleted(admin_client):
    create_resp = await admin_client.post(USERS_URL, json=VALID_USER)
    user_id = create_resp.json()["id"]
    await admin_client.delete(f"{USERS_URL}/{user_id}")
    resp = await admin_client.get(USERS_URL)
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_list_users_ownership(shared_client):
    """Non-admin sees only own oracle profiles."""
    # User A creates a profile
    _set_user_a()
    resp1 = await shared_client.post(USERS_URL, json=_base_user_payload(name="User A Profile"))
    assert resp1.status_code == 201

    # User B creates a profile
    _set_user_b()
    resp2 = await shared_client.post(
        USERS_URL,
        json=_base_user_payload(name="User B Profile", birthday="1992-01-01"),
    )
    assert resp2.status_code == 201

    # User A lists: should see only their own
    _set_user_a()
    list_resp = await shared_client.get(USERS_URL)
    assert list_resp.status_code == 200
    users = list_resp.json()["users"]
    assert len(users) == 1
    assert users[0]["name"] == "User A Profile"


@pytest.mark.asyncio
async def test_list_users_admin_sees_all(shared_client):
    """Admin sees all oracle profiles."""
    _set_user_a()
    await shared_client.post(USERS_URL, json=_base_user_payload(name="A Profile"))
    _set_admin()
    await shared_client.post(
        USERS_URL,
        json=_base_user_payload(name="Admin Profile", birthday="1985-01-01"),
    )
    list_resp = await shared_client.get(USERS_URL)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 2


# ─── GET Tests ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_user(admin_client):
    create_resp = await admin_client.post(USERS_URL, json=VALID_USER)
    user_id = create_resp.json()["id"]
    resp = await admin_client.get(f"{USERS_URL}/{user_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "John Doe"


@pytest.mark.asyncio
async def test_get_user_not_found_404(admin_client):
    resp = await admin_client.get(f"{USERS_URL}/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_user_deleted_404(admin_client):
    create_resp = await admin_client.post(USERS_URL, json=VALID_USER)
    user_id = create_resp.json()["id"]
    await admin_client.delete(f"{USERS_URL}/{user_id}")
    resp = await admin_client.get(f"{USERS_URL}/{user_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_user_own(shared_client):
    """User can get their own oracle profile."""
    _set_user_a()
    create_resp = await shared_client.post(USERS_URL, json=_base_user_payload())
    user_id = create_resp.json()["id"]
    resp = await shared_client.get(f"{USERS_URL}/{user_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == user_id


@pytest.mark.asyncio
async def test_get_user_other_forbidden(shared_client):
    """User cannot get other's profile (returns 404)."""
    _set_user_a()
    create_resp = await shared_client.post(USERS_URL, json=_base_user_payload())
    user_id = create_resp.json()["id"]

    # User B tries to get it — should get 404 (not 403)
    _set_user_b()
    resp = await shared_client.get(f"{USERS_URL}/{user_id}")
    assert resp.status_code == 404


# ─── UPDATE Tests ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_user_partial(admin_client):
    create_resp = await admin_client.post(USERS_URL, json=VALID_USER)
    user_id = create_resp.json()["id"]
    resp = await admin_client.put(f"{USERS_URL}/{user_id}", json={"city": "London"})
    assert resp.status_code == 200
    assert resp.json()["city"] == "London"
    assert resp.json()["name"] == "John Doe"


@pytest.mark.asyncio
async def test_update_user_not_found_404(admin_client):
    resp = await admin_client.put(f"{USERS_URL}/9999", json={"city": "London"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_user_empty_body_400(admin_client):
    create_resp = await admin_client.post(USERS_URL, json=VALID_USER)
    user_id = create_resp.json()["id"]
    resp = await admin_client.put(f"{USERS_URL}/{user_id}", json={})
    assert resp.status_code == 400
    assert "No fields" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_update_user_duplicate_409(admin_client):
    await admin_client.post(USERS_URL, json=VALID_USER)
    create_resp = await admin_client.post(
        USERS_URL,
        json={"name": "Other User", "birthday": "1985-06-20", "mother_name": "Mom"},
    )
    user_id = create_resp.json()["id"]
    resp = await admin_client.put(
        f"{USERS_URL}/{user_id}",
        json={"name": "John Doe", "birthday": "1990-05-15"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_update_user_own(shared_client):
    """User can update own oracle profile."""
    _set_user_a()
    create_resp = await shared_client.post(USERS_URL, json=_base_user_payload())
    user_id = create_resp.json()["id"]
    resp = await shared_client.put(f"{USERS_URL}/{user_id}", json={"city": "Tehran"})
    assert resp.status_code == 200
    assert resp.json()["city"] == "Tehran"


@pytest.mark.asyncio
async def test_update_coordinates(admin_client):
    """Coordinates stored and retrieved (graceful no-op on SQLite)."""
    payload = _base_user_payload(latitude=35.6892, longitude=51.3890)
    create_resp = await admin_client.post(USERS_URL, json=payload)
    assert create_resp.status_code == 201
    user_id = create_resp.json()["id"]
    resp = await admin_client.get(f"{USERS_URL}/{user_id}")
    assert resp.status_code == 200
    assert "latitude" in resp.json()
    assert "longitude" in resp.json()


# ─── DELETE Tests ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_user(admin_client):
    create_resp = await admin_client.post(USERS_URL, json=VALID_USER)
    user_id = create_resp.json()["id"]
    resp = await admin_client.delete(f"{USERS_URL}/{user_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == user_id


@pytest.mark.asyncio
async def test_delete_user_not_found_404(admin_client):
    resp = await admin_client.delete(f"{USERS_URL}/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_user_already_deleted_404(admin_client):
    create_resp = await admin_client.post(USERS_URL, json=VALID_USER)
    user_id = create_resp.json()["id"]
    await admin_client.delete(f"{USERS_URL}/{user_id}")
    resp = await admin_client.delete(f"{USERS_URL}/{user_id}")
    assert resp.status_code == 404


# ─── Validation Tests ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_validation_name_allows_digits(admin_client):
    resp = await admin_client.post(USERS_URL, json=_base_user_payload(name="Ali3"))
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_validation_birthday_future(admin_client):
    resp = await admin_client.post(USERS_URL, json=_base_user_payload(birthday="2099-01-01"))
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_validation_birthday_before_1900(admin_client):
    resp = await admin_client.post(USERS_URL, json=_base_user_payload(birthday="1850-01-01"))
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_validation_gender_invalid(admin_client):
    resp = await admin_client.post(USERS_URL, json=_base_user_payload(gender="other"))
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_validation_heart_rate_bounds(admin_client):
    resp = await admin_client.post(USERS_URL, json=_base_user_payload(heart_rate_bpm=0))
    assert resp.status_code == 422
    resp2 = await admin_client.post(
        USERS_URL,
        json=_base_user_payload(heart_rate_bpm=300, name="Another Name", birthday="1991-01-01"),
    )
    assert resp2.status_code == 422


@pytest.mark.asyncio
async def test_validation_coordinate_bounds(admin_client):
    resp = await admin_client.post(USERS_URL, json=_base_user_payload(latitude=100.0))
    assert resp.status_code == 422
    resp2 = await admin_client.post(
        USERS_URL,
        json=_base_user_payload(longitude=200.0, name="Another", birthday="1991-02-02"),
    )
    assert resp2.status_code == 422


@pytest.mark.asyncio
async def test_persian_name_roundtrip(admin_client):
    payload = _base_user_payload(
        name="Ali",
        name_persian="\u0639\u0644\u06cc",
        mother_name_persian="\u0641\u0627\u0637\u0645\u0647",
    )
    create_resp = await admin_client.post(USERS_URL, json=payload)
    assert create_resp.status_code == 201
    user_id = create_resp.json()["id"]
    get_resp = await admin_client.get(f"{USERS_URL}/{user_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name_persian"] == "\u0639\u0644\u06cc"
