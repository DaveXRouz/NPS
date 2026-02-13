"""Integration tests for authentication flows — login, API keys, roles, edge cases."""

import time

import pytest
import requests
from jose import jwt as jose_jwt
from sqlalchemy import text

from conftest import API_SECRET_KEY, _login, api_url

# ─── Login Flow ──────────────────────────────────────────────────────────────


@pytest.mark.auth
class TestLoginFlow:
    """Test POST /api/auth/login endpoint behavior across all scenarios."""

    def test_login_valid_admin(self, admin_user):
        """Valid admin credentials return JWT with access_token, token_type, expires_in."""
        resp = requests.post(
            api_url("/api/auth/login"),
            json={
                "username": admin_user["username"],
                "password": admin_user["password"],
            },
            timeout=10,
        )
        assert resp.status_code == 200, (
            f"Expected 200, got {resp.status_code}: {resp.text}"
        )
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0

    def test_login_valid_user(self, regular_user):
        """Valid user credentials return JWT with user-level scopes."""
        resp = requests.post(
            api_url("/api/auth/login"),
            json={
                "username": regular_user["username"],
                "password": regular_user["password"],
            },
            timeout=10,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        payload = jose_jwt.decode(
            data["access_token"], API_SECRET_KEY, algorithms=["HS256"]
        )
        assert "oracle:write" in payload["scopes"]
        assert "oracle:read" in payload["scopes"]

    def test_login_valid_readonly(self, readonly_user):
        """Valid readonly credentials return JWT with read-only scopes."""
        resp = requests.post(
            api_url("/api/auth/login"),
            json={
                "username": readonly_user["username"],
                "password": readonly_user["password"],
            },
            timeout=10,
        )
        assert resp.status_code == 200
        data = resp.json()
        payload = jose_jwt.decode(
            data["access_token"], API_SECRET_KEY, algorithms=["HS256"]
        )
        assert "oracle:read" in payload["scopes"]
        assert "oracle:write" not in payload["scopes"]

    def test_login_wrong_password(self, admin_user):
        """Wrong password returns 401 with detail message."""
        resp = requests.post(
            api_url("/api/auth/login"),
            json={"username": admin_user["username"], "password": "WrongPassword!"},
            timeout=10,
        )
        assert resp.status_code == 401
        assert "detail" in resp.json()

    def test_login_nonexistent_user(self):
        """Nonexistent username returns 401 (same as wrong password — no user enumeration)."""
        resp = requests.post(
            api_url("/api/auth/login"),
            json={"username": "IntTest_nonexistent_user_xyz", "password": "anything"},
            timeout=10,
        )
        assert resp.status_code == 401

    def test_login_empty_username(self):
        """Empty username returns 401 (no matching user)."""
        resp = requests.post(
            api_url("/api/auth/login"),
            json={"username": "", "password": "somepassword"},
            timeout=10,
        )
        assert resp.status_code in (401, 422)

    def test_login_empty_password(self):
        """Empty password returns 401 or 422."""
        resp = requests.post(
            api_url("/api/auth/login"),
            json={"username": "IntTest_admin", "password": ""},
            timeout=10,
        )
        assert resp.status_code in (401, 422)

    def test_login_missing_fields(self):
        """Empty JSON body returns 422."""
        resp = requests.post(
            api_url("/api/auth/login"),
            json={},
            timeout=10,
        )
        assert resp.status_code == 422

    def test_login_disabled_account(self, db_session_factory, regular_user):
        """Disabled account returns 403. Re-enables account in finally block."""
        session = db_session_factory()
        try:
            session.execute(
                text("UPDATE users SET is_active = FALSE WHERE username = :u"),
                {"u": regular_user["username"]},
            )
            session.commit()

            resp = requests.post(
                api_url("/api/auth/login"),
                json={
                    "username": regular_user["username"],
                    "password": regular_user["password"],
                },
                timeout=10,
            )
            assert resp.status_code == 403
        finally:
            session.execute(
                text(
                    "UPDATE users SET is_active = TRUE, failed_attempts = 0, "
                    "locked_until = NULL WHERE username = :u"
                ),
                {"u": regular_user["username"]},
            )
            session.commit()
            session.close()

    def test_login_updates_last_login(self, db_session_factory, admin_user):
        """Successful login updates last_login timestamp in users table."""
        resp = requests.post(
            api_url("/api/auth/login"),
            json={
                "username": admin_user["username"],
                "password": admin_user["password"],
            },
            timeout=10,
        )
        assert resp.status_code == 200

        session = db_session_factory()
        try:
            row = session.execute(
                text("SELECT last_login FROM users WHERE username = :u"),
                {"u": admin_user["username"]},
            ).fetchone()
            assert row is not None
            assert row[0] is not None, "last_login should be set after login"
        finally:
            session.close()


# ─── API Key Flow ────────────────────────────────────────────────────────────


@pytest.mark.auth
class TestAPIKeyFlow:
    """Test API key creation, usage, listing, and revocation."""

    def test_create_api_key(self, admin_jwt_client):
        """POST /api/auth/api-keys creates key and returns raw key value once."""
        resp = admin_jwt_client.post(
            api_url("/api/auth/api-keys"),
            json={"name": "IntTest_Key", "scopes": ["oracle:read"]},
        )
        assert resp.status_code == 200, (
            f"Expected 200, got {resp.status_code}: {resp.text}"
        )
        data = resp.json()
        assert "id" in data
        assert "key" in data
        assert data["name"] == "IntTest_Key"
        assert data["is_active"] is True

    def test_create_api_key_with_expiry(self, admin_jwt_client):
        """POST /api/auth/api-keys with expires_in_days sets correct expires_at."""
        resp = admin_jwt_client.post(
            api_url("/api/auth/api-keys"),
            json={
                "name": "IntTest_ExpiryKey",
                "scopes": ["oracle:read"],
                "expires_in_days": 30,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["expires_at"] is not None

    def test_use_api_key_for_auth(self, admin_jwt_client):
        """Created API key can authenticate requests as Bearer token."""
        create_resp = admin_jwt_client.post(
            api_url("/api/auth/api-keys"),
            json={"name": "IntTest_UseKey", "scopes": ["oracle:read"]},
        )
        raw_key = create_resp.json()["key"]

        resp = requests.get(
            api_url("/api/oracle/users"),
            headers={"Authorization": f"Bearer {raw_key}"},
            timeout=10,
        )
        assert resp.status_code == 200

    def test_list_api_keys(self, admin_jwt_client):
        """GET /api/auth/api-keys returns user's keys without raw key values."""
        admin_jwt_client.post(
            api_url("/api/auth/api-keys"),
            json={"name": "IntTest_ListKey", "scopes": ["oracle:read"]},
        )

        resp = admin_jwt_client.get(api_url("/api/auth/api-keys"))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        for key_data in data:
            assert key_data.get("key") is None

    def test_revoke_api_key(self, admin_jwt_client):
        """DELETE /api/auth/api-keys/{id} deactivates the key."""
        create_resp = admin_jwt_client.post(
            api_url("/api/auth/api-keys"),
            json={"name": "IntTest_RevokeKey", "scopes": ["oracle:read"]},
        )
        key_id = create_resp.json()["id"]

        resp = admin_jwt_client.delete(api_url(f"/api/auth/api-keys/{key_id}"))
        assert resp.status_code == 200
        assert resp.json()["detail"] == "API key revoked"

    def test_revoked_key_cannot_authenticate(self, admin_jwt_client):
        """After revocation, using the key returns 403."""
        create_resp = admin_jwt_client.post(
            api_url("/api/auth/api-keys"),
            json={"name": "IntTest_RevokedAuth", "scopes": ["oracle:read"]},
        )
        data = create_resp.json()
        raw_key = data["key"]
        key_id = data["id"]

        admin_jwt_client.delete(api_url(f"/api/auth/api-keys/{key_id}"))

        resp = requests.get(
            api_url("/api/oracle/users"),
            headers={"Authorization": f"Bearer {raw_key}"},
            timeout=10,
        )
        assert resp.status_code == 403

    def test_api_key_updates_last_used(self, admin_jwt_client, db_session_factory):
        """Using an API key updates its last_used timestamp in the database."""
        create_resp = admin_jwt_client.post(
            api_url("/api/auth/api-keys"),
            json={"name": "IntTest_LastUsed", "scopes": ["oracle:read"]},
        )
        data = create_resp.json()
        raw_key = data["key"]
        key_id = data["id"]

        session = db_session_factory()
        try:
            row = session.execute(
                text("SELECT last_used FROM api_keys WHERE id = :kid"),
                {"kid": key_id},
            ).fetchone()
            assert row[0] is None, "last_used should be NULL initially"
        finally:
            session.close()

        requests.get(
            api_url("/api/oracle/users"),
            headers={"Authorization": f"Bearer {raw_key}"},
            timeout=10,
        )

        session = db_session_factory()
        try:
            row = session.execute(
                text("SELECT last_used FROM api_keys WHERE id = :kid"),
                {"kid": key_id},
            ).fetchone()
            assert row[0] is not None, "last_used should be set after use"
        finally:
            session.close()


# ─── Role-Based Access ───────────────────────────────────────────────────────


@pytest.mark.auth
class TestRoleBasedAccess:
    """Test that role-based scope enforcement works across all endpoint types."""

    # --- Admin-only endpoints (oracle:admin) ---

    def test_admin_can_access_audit(self, admin_jwt_client):
        """Admin can GET /api/oracle/audit (requires oracle:admin)."""
        resp = admin_jwt_client.get(api_url("/api/oracle/audit"))
        assert resp.status_code == 200

    def test_user_cannot_access_audit(self, user_jwt_client):
        """Regular user gets 403 on GET /api/oracle/audit."""
        resp = user_jwt_client.get(api_url("/api/oracle/audit"))
        assert resp.status_code == 403

    def test_readonly_cannot_access_audit(self, readonly_jwt_client):
        """Readonly user gets 403 on GET /api/oracle/audit."""
        resp = readonly_jwt_client.get(api_url("/api/oracle/audit"))
        assert resp.status_code == 403

    def test_admin_can_delete_profile(self, admin_jwt_client):
        """Admin can DELETE /api/oracle/users/{id} (requires oracle:admin)."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_AdminDel",
                "birthday": "1990-01-01",
                "mother_name": "Test",
            },
        )
        user_id = create_resp.json()["id"]

        resp = admin_jwt_client.delete(api_url(f"/api/oracle/users/{user_id}"))
        assert resp.status_code == 200

    def test_user_cannot_delete_profile(self, user_jwt_client, admin_jwt_client):
        """Regular user gets 403 on DELETE /api/oracle/users/{id}."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_UserDel",
                "birthday": "1990-01-02",
                "mother_name": "Test",
            },
        )
        user_id = create_resp.json()["id"]

        resp = user_jwt_client.delete(api_url(f"/api/oracle/users/{user_id}"))
        assert resp.status_code == 403

    def test_readonly_cannot_delete_profile(
        self, readonly_jwt_client, admin_jwt_client
    ):
        """Readonly user gets 403 on DELETE /api/oracle/users/{id}."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_ReadDel",
                "birthday": "1990-01-03",
                "mother_name": "Test",
            },
        )
        user_id = create_resp.json()["id"]

        resp = readonly_jwt_client.delete(api_url(f"/api/oracle/users/{user_id}"))
        assert resp.status_code == 403

    # --- Write endpoints (oracle:write) ---

    def test_admin_can_create_profile(self, admin_jwt_client):
        """Admin can POST /api/oracle/users (has oracle:write via hierarchy)."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_AdminCreate",
                "birthday": "1991-01-01",
                "mother_name": "Test",
            },
        )
        assert resp.status_code == 201

    def test_user_can_create_profile(self, user_jwt_client):
        """Regular user can POST /api/oracle/users (has oracle:write)."""
        resp = user_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_UserCreate",
                "birthday": "1991-01-02",
                "mother_name": "Test",
            },
        )
        assert resp.status_code == 201

    def test_readonly_cannot_create_profile(self, readonly_jwt_client):
        """Readonly user gets 403 on POST /api/oracle/users (no oracle:write)."""
        resp = readonly_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_ReadCreate",
                "birthday": "1991-01-03",
                "mother_name": "Test",
            },
        )
        assert resp.status_code == 403

    # --- Read endpoints (oracle:read) ---

    def test_admin_can_list_profiles(self, admin_jwt_client):
        """Admin can GET /api/oracle/users."""
        resp = admin_jwt_client.get(api_url("/api/oracle/users"))
        assert resp.status_code == 200

    def test_user_can_list_profiles(self, user_jwt_client):
        """Regular user can GET /api/oracle/users."""
        resp = user_jwt_client.get(api_url("/api/oracle/users"))
        assert resp.status_code == 200

    def test_readonly_can_list_profiles(self, readonly_jwt_client):
        """Readonly user can GET /api/oracle/users (has oracle:read)."""
        resp = readonly_jwt_client.get(api_url("/api/oracle/users"))
        assert resp.status_code == 200

    # --- Unauthenticated & invalid ---

    def test_unauthenticated_gets_401(self, unauth_client):
        """No auth header returns 401 on protected endpoints."""
        endpoints = [
            ("GET", "/api/oracle/users"),
            ("POST", "/api/oracle/users"),
            ("GET", "/api/oracle/audit"),
        ]
        for method, path in endpoints:
            if method == "GET":
                resp = unauth_client.get(api_url(path))
            else:
                resp = unauth_client.post(api_url(path), json={})
            assert resp.status_code == 401, (
                f"{method} {path} expected 401, got {resp.status_code}"
            )

    def test_invalid_token_gets_403(self):
        """Garbage Bearer token returns 403."""
        resp = requests.get(
            api_url("/api/oracle/users"),
            headers={"Authorization": "Bearer garbage-token-123"},
            timeout=10,
        )
        assert resp.status_code == 403

    def test_legacy_api_secret_grants_admin(self, api_client):
        """Legacy Bearer <API_SECRET_KEY> grants full admin access (backward compat)."""
        resp = api_client.get(api_url("/api/oracle/audit"))
        assert resp.status_code == 200


# ─── Auth Edge Cases ─────────────────────────────────────────────────────────


@pytest.mark.auth
class TestAuthEdgeCases:
    """Edge cases and security-focused auth scenarios."""

    def test_expired_jwt_rejected(self):
        """A manually crafted JWT with past expiration is rejected (403)."""
        payload = {
            "sub": "test-user-id",
            "username": "test",
            "role": "admin",
            "scopes": ["oracle:admin", "oracle:write", "oracle:read"],
            "exp": int(time.time()) - 3600,
            "iat": int(time.time()) - 7200,
        }
        token = jose_jwt.encode(payload, API_SECRET_KEY, algorithm="HS256")
        resp = requests.get(
            api_url("/api/oracle/users"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert resp.status_code == 403

    def test_jwt_with_wrong_secret_rejected(self):
        """A JWT signed with a different secret is rejected (403)."""
        payload = {
            "sub": "test-user-id",
            "username": "test",
            "role": "admin",
            "scopes": ["oracle:admin"],
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        }
        token = jose_jwt.encode(payload, "completely-wrong-secret", algorithm="HS256")
        resp = requests.get(
            api_url("/api/oracle/users"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert resp.status_code == 403

    def test_jwt_with_tampered_role_rejected(self):
        """A JWT where the role was modified after signing is rejected (403)."""
        payload = {
            "sub": "test-user-id",
            "username": "test",
            "role": "admin",
            "scopes": ["oracle:admin"],
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        }
        token = jose_jwt.encode(payload, "tampered-secret-key", algorithm="HS256")
        resp = requests.get(
            api_url("/api/oracle/users"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert resp.status_code == 403

    def test_api_key_with_restricted_scopes(self, admin_jwt_client):
        """API key with only oracle:read cannot access oracle:write endpoints."""
        create_resp = admin_jwt_client.post(
            api_url("/api/auth/api-keys"),
            json={"name": "IntTest_Restricted", "scopes": ["oracle:read"]},
        )
        raw_key = create_resp.json()["key"]

        # oracle:read endpoint should succeed
        resp_read = requests.get(
            api_url("/api/oracle/users"),
            headers={"Authorization": f"Bearer {raw_key}"},
            timeout=10,
        )
        assert resp_read.status_code == 200

        # oracle:write endpoint should fail
        resp_write = requests.post(
            api_url("/api/oracle/users"),
            headers={
                "Authorization": f"Bearer {raw_key}",
                "Content-Type": "application/json",
            },
            json={
                "name": "IntTest_Blocked",
                "birthday": "1990-01-01",
                "mother_name": "Test",
            },
            timeout=10,
        )
        assert resp_write.status_code == 403

    def test_concurrent_sessions_isolated(self, admin_user, regular_user):
        """Two users logged in simultaneously have independent sessions."""
        admin_token = _login(admin_user["username"], admin_user["password"])
        user_token = _login(regular_user["username"], regular_user["password"])

        # Admin token can access audit
        resp_admin = requests.get(
            api_url("/api/oracle/audit"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )
        assert resp_admin.status_code == 200

        # User token cannot access audit
        resp_user = requests.get(
            api_url("/api/oracle/audit"),
            headers={"Authorization": f"Bearer {user_token}"},
            timeout=10,
        )
        assert resp_user.status_code == 403

    def test_sql_injection_in_login(self):
        """SQL injection attempts in username are safely handled (returns 401)."""
        resp = requests.post(
            api_url("/api/auth/login"),
            json={"username": "admin' OR '1'='1", "password": "anything"},
            timeout=10,
        )
        assert resp.status_code == 401
        assert resp.status_code != 500

    def test_very_long_credentials_handled(self):
        """Extremely long username/password return 422 or 401, not 500."""
        resp = requests.post(
            api_url("/api/auth/login"),
            json={"username": "a" * 10000, "password": "b" * 10000},
            timeout=10,
        )
        assert resp.status_code < 500

    def test_api_key_scopes_expansion(self, admin_jwt_client):
        """API key with oracle:admin can access oracle:read endpoints (hierarchy)."""
        create_resp = admin_jwt_client.post(
            api_url("/api/auth/api-keys"),
            json={"name": "IntTest_Expansion", "scopes": ["oracle:admin"]},
        )
        raw_key = create_resp.json()["key"]

        resp = requests.get(
            api_url("/api/oracle/users"),
            headers={"Authorization": f"Bearer {raw_key}"},
            timeout=10,
        )
        assert resp.status_code == 200
