"""Integration tests for Oracle profile CRUD — create, read, update, delete, Persian, encryption."""

import os

import pytest
from sqlalchemy import text

from conftest import (
    SAMPLE_PROFILE_EN,
    SAMPLE_PROFILE_FA,
    SAMPLE_PROFILE_MIXED,
    api_url,
)

# ─── Profile Create ─────────────────────────────────────────────────────────


@pytest.mark.profile
class TestProfileCreate:
    """Test Oracle profile creation via POST /api/oracle/users."""

    def test_create_profile_minimal(self, admin_jwt_client):
        """Create with required fields only: name, birthday, mother_name. Returns 201."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_Minimal",
                "birthday": "1990-01-01",
                "mother_name": "Mom",
            },
        )
        assert resp.status_code == 201, (
            f"Expected 201, got {resp.status_code}: {resp.text}"
        )
        data = resp.json()
        assert data["name"] == "IntTest_Minimal"
        assert data["id"] > 0
        assert "created_at" in data

    def test_create_profile_full_english(self, admin_jwt_client):
        """Create with all English fields including country and city. Returns 201."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json=SAMPLE_PROFILE_EN.copy(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "IntTest_Alice"
        assert data["mother_name"] == "Sarah"
        assert data["country"] == "US"
        assert data["city"] == "New York"

    def test_create_profile_full_persian(self, admin_jwt_client):
        """Create with Persian name_persian and mother_name_persian. Returns 201."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json=SAMPLE_PROFILE_FA.copy(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name_persian"] == "\u062d\u0645\u0632\u0647"
        assert data["mother_name_persian"] == "\u0641\u0627\u0637\u0645\u0647"

    def test_create_profile_mixed_en_fa(self, admin_jwt_client):
        """Create with both English and Persian fields. Returns 201."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json=SAMPLE_PROFILE_MIXED.copy(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "IntTest_Sara"
        assert data["name_persian"] == "\u0633\u0627\u0631\u0627"
        assert data["mother_name_persian"] == "\u0645\u0631\u06cc\u0645"

    def test_create_duplicate_rejected(self, admin_jwt_client):
        """Same name+birthday for active profile returns 409."""
        payload = {
            "name": "IntTest_Dup",
            "birthday": "1990-06-15",
            "mother_name": "Mom",
        }
        resp1 = admin_jwt_client.post(api_url("/api/oracle/users"), json=payload)
        assert resp1.status_code == 201

        resp2 = admin_jwt_client.post(api_url("/api/oracle/users"), json=payload)
        assert resp2.status_code == 409

    def test_create_with_future_birthday_rejected(self, admin_jwt_client):
        """Birthday in the future returns 422."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_Future",
                "birthday": "2099-01-01",
                "mother_name": "Mom",
            },
        )
        assert resp.status_code == 422

    def test_create_with_short_name_rejected(self, admin_jwt_client):
        """Name shorter than 2 characters returns 422."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={"name": "X", "birthday": "1990-01-01", "mother_name": "Mom"},
        )
        assert resp.status_code == 422

    def test_create_with_invalid_date_rejected(self, admin_jwt_client):
        """Non-date birthday string returns 422."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_BadDate",
                "birthday": "not-a-date",
                "mother_name": "Mom",
            },
        )
        assert resp.status_code == 422


# ─── Profile Read ────────────────────────────────────────────────────────────


@pytest.mark.profile
class TestProfileRead:
    """Test Oracle profile retrieval endpoints."""

    def test_get_profile_by_id(self, admin_jwt_client):
        """GET /api/oracle/users/{id} returns correct profile with all fields."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_GetById",
                "birthday": "1985-03-20",
                "mother_name": "Jane",
            },
        )
        user_id = create_resp.json()["id"]

        resp = admin_jwt_client.get(api_url(f"/api/oracle/users/{user_id}"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == user_id
        assert data["name"] == "IntTest_GetById"
        assert data["mother_name"] == "Jane"

    def test_get_nonexistent_profile_returns_404(self, admin_jwt_client):
        """GET /api/oracle/users/999999 returns 404."""
        resp = admin_jwt_client.get(api_url("/api/oracle/users/999999"))
        assert resp.status_code == 404

    def test_list_profiles(self, admin_jwt_client):
        """GET /api/oracle/users returns paginated list with total, limit, offset."""
        admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_ListCheck",
                "birthday": "1986-07-10",
                "mother_name": "Mom",
            },
        )
        resp = admin_jwt_client.get(api_url("/api/oracle/users"))
        assert resp.status_code == 200
        data = resp.json()
        assert "users" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert data["total"] >= 1

    def test_list_profiles_with_search(self, admin_jwt_client):
        """GET /api/oracle/users?search=<name> filters results by name match."""
        admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_SearchMe",
                "birthday": "1987-02-14",
                "mother_name": "Mom",
            },
        )
        resp = admin_jwt_client.get(
            api_url("/api/oracle/users"), params={"search": "IntTest_SearchMe"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        names = [u["name"] for u in data["users"]]
        assert "IntTest_SearchMe" in names

    def test_list_profiles_pagination(self, admin_jwt_client):
        """GET /api/oracle/users?limit=1&offset=0 returns exactly 1 result."""
        admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_Page",
                "birthday": "1988-08-08",
                "mother_name": "Mom",
            },
        )
        resp = admin_jwt_client.get(
            api_url("/api/oracle/users"), params={"limit": 1, "offset": 0}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["users"]) <= 1

    def test_search_by_persian_name(self, admin_jwt_client):
        """GET /api/oracle/users?search=<persian_text> finds Persian-named profiles."""
        admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_PersianSearch",
                "name_persian": "\u062c\u0633\u062a\u062c\u0648",
                "birthday": "1989-04-01",
                "mother_name": "Mom",
            },
        )
        resp = admin_jwt_client.get(
            api_url("/api/oracle/users"),
            params={"search": "\u062c\u0633\u062a\u062c\u0648"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1


# ─── Profile Update ──────────────────────────────────────────────────────────


@pytest.mark.profile
class TestProfileUpdate:
    """Test Oracle profile updates via PUT /api/oracle/users/{id}."""

    def test_update_single_field(self, admin_jwt_client):
        """PUT with one field updates only that field, others unchanged."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_UpdSingle",
                "birthday": "1990-01-01",
                "mother_name": "Mom",
            },
        )
        user_id = create_resp.json()["id"]

        resp = admin_jwt_client.put(
            api_url(f"/api/oracle/users/{user_id}"),
            json={"city": "Berlin"},
        )
        assert resp.status_code == 200
        assert resp.json()["city"] == "Berlin"
        assert resp.json()["name"] == "IntTest_UpdSingle"

    def test_update_multiple_fields(self, admin_jwt_client):
        """PUT with multiple fields updates all of them."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_UpdMulti",
                "birthday": "1990-02-02",
                "mother_name": "Mom",
            },
        )
        user_id = create_resp.json()["id"]

        resp = admin_jwt_client.put(
            api_url(f"/api/oracle/users/{user_id}"),
            json={"country": "Germany", "city": "Munich"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["country"] == "Germany"
        assert data["city"] == "Munich"

    def test_update_persian_fields(self, admin_jwt_client):
        """PUT with Persian name_persian/mother_name_persian works."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_UpdPersian",
                "birthday": "1990-03-03",
                "mother_name": "Mom",
            },
        )
        user_id = create_resp.json()["id"]

        resp = admin_jwt_client.put(
            api_url(f"/api/oracle/users/{user_id}"),
            json={
                "name_persian": "\u0622\u0632\u0645\u0648\u0646",
                "mother_name_persian": "\u0645\u0627\u062f\u0631",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name_persian"] == "\u0622\u0632\u0645\u0648\u0646"
        assert data["mother_name_persian"] == "\u0645\u0627\u062f\u0631"

    def test_update_nonexistent_profile_returns_404(self, admin_jwt_client):
        """PUT /api/oracle/users/999999 returns 404."""
        resp = admin_jwt_client.put(
            api_url("/api/oracle/users/999999"),
            json={"city": "Nowhere"},
        )
        assert resp.status_code == 404

    def test_update_empty_body_returns_400(self, admin_jwt_client):
        """PUT with no fields returns 400."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_UpdEmpty",
                "birthday": "1990-04-04",
                "mother_name": "Mom",
            },
        )
        user_id = create_resp.json()["id"]

        resp = admin_jwt_client.put(
            api_url(f"/api/oracle/users/{user_id}"),
            json={},
        )
        assert resp.status_code == 400

    def test_update_name_to_duplicate_returns_409(self, admin_jwt_client):
        """Changing name+birthday to match existing active profile returns 409."""
        admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_DupUpA",
                "birthday": "1991-06-01",
                "mother_name": "Mom",
            },
        )
        resp_b = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_DupUpB",
                "birthday": "1991-06-01",
                "mother_name": "Mom",
            },
        )
        user_id_b = resp_b.json()["id"]

        resp = admin_jwt_client.put(
            api_url(f"/api/oracle/users/{user_id_b}"),
            json={"name": "IntTest_DupUpA"},
        )
        assert resp.status_code == 409


# ─── Profile Delete ──────────────────────────────────────────────────────────


@pytest.mark.profile
class TestProfileDelete:
    """Test Oracle profile soft-delete via DELETE /api/oracle/users/{id}."""

    def test_delete_profile(self, admin_jwt_client):
        """DELETE soft-deletes the profile (sets deleted_at). Returns 200."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_Del",
                "birthday": "1992-01-01",
                "mother_name": "Mom",
            },
        )
        user_id = create_resp.json()["id"]

        resp = admin_jwt_client.delete(api_url(f"/api/oracle/users/{user_id}"))
        assert resp.status_code == 200

    def test_deleted_profile_not_in_list(self, admin_jwt_client):
        """After DELETE, profile does not appear in GET /api/oracle/users."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_DelList",
                "birthday": "1992-02-02",
                "mother_name": "Mom",
            },
        )
        user_id = create_resp.json()["id"]
        admin_jwt_client.delete(api_url(f"/api/oracle/users/{user_id}"))

        resp = admin_jwt_client.get(
            api_url("/api/oracle/users"), params={"search": "IntTest_DelList"}
        )
        data = resp.json()
        ids = [u["id"] for u in data["users"]]
        assert user_id not in ids

    def test_deleted_profile_returns_404_on_get(self, admin_jwt_client):
        """After DELETE, GET /api/oracle/users/{id} returns 404."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_DelGet",
                "birthday": "1992-03-03",
                "mother_name": "Mom",
            },
        )
        user_id = create_resp.json()["id"]
        admin_jwt_client.delete(api_url(f"/api/oracle/users/{user_id}"))

        resp = admin_jwt_client.get(api_url(f"/api/oracle/users/{user_id}"))
        assert resp.status_code == 404

    def test_deleted_profile_returns_404_on_update(self, admin_jwt_client):
        """After DELETE, PUT /api/oracle/users/{id} returns 404."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_DelUpd",
                "birthday": "1992-04-04",
                "mother_name": "Mom",
            },
        )
        user_id = create_resp.json()["id"]
        admin_jwt_client.delete(api_url(f"/api/oracle/users/{user_id}"))

        resp = admin_jwt_client.put(
            api_url(f"/api/oracle/users/{user_id}"),
            json={"city": "Nowhere"},
        )
        assert resp.status_code == 404

    def test_recreate_after_soft_delete(self, admin_jwt_client):
        """Same name+birthday can be re-created after soft-delete (new ID)."""
        payload = {
            "name": "IntTest_Recreate",
            "birthday": "1992-05-05",
            "mother_name": "Mom",
        }
        resp1 = admin_jwt_client.post(api_url("/api/oracle/users"), json=payload)
        assert resp1.status_code == 201
        id1 = resp1.json()["id"]

        admin_jwt_client.delete(api_url(f"/api/oracle/users/{id1}"))

        resp2 = admin_jwt_client.post(api_url("/api/oracle/users"), json=payload)
        assert resp2.status_code == 201
        id2 = resp2.json()["id"]
        assert id2 != id1

    def test_delete_nonexistent_returns_404(self, admin_jwt_client):
        """DELETE /api/oracle/users/999999 returns 404."""
        resp = admin_jwt_client.delete(api_url("/api/oracle/users/999999"))
        assert resp.status_code == 404


# ─── Persian Data Handling ───────────────────────────────────────────────────


@pytest.mark.profile
@pytest.mark.persian
class TestPersianDataHandling:
    """Verify Persian/Farsi UTF-8 text handling across the full stack."""

    def test_persian_name_roundtrip(self, admin_jwt_client):
        """Persian name_persian survives create -> get -> compare."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_PersRound",
                "name_persian": "\u062d\u0645\u0632\u0647",
                "birthday": "1993-01-01",
                "mother_name": "Mom",
            },
        )
        assert resp.status_code == 201
        user_id = resp.json()["id"]

        get_resp = admin_jwt_client.get(api_url(f"/api/oracle/users/{user_id}"))
        assert get_resp.status_code == 200
        assert get_resp.json()["name_persian"] == "\u062d\u0645\u0632\u0647"

    def test_persian_mother_name_roundtrip(self, admin_jwt_client):
        """Persian mother_name_persian survives create -> get -> compare."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_PersMom",
                "birthday": "1993-02-02",
                "mother_name": "Fatemeh",
                "mother_name_persian": "\u0641\u0627\u0637\u0645\u0647",
            },
        )
        assert resp.status_code == 201
        user_id = resp.json()["id"]

        get_resp = admin_jwt_client.get(api_url(f"/api/oracle/users/{user_id}"))
        assert get_resp.status_code == 200
        assert (
            get_resp.json()["mother_name_persian"] == "\u0641\u0627\u0637\u0645\u0647"
        )

    def test_persian_in_list_response(self, admin_jwt_client):
        """Persian fields appear correctly in list endpoint response."""
        admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_PersList",
                "name_persian": "\u0644\u06cc\u0633\u062a",
                "birthday": "1993-03-03",
                "mother_name": "Mom",
            },
        )

        resp = admin_jwt_client.get(
            api_url("/api/oracle/users"), params={"search": "IntTest_PersList"}
        )
        data = resp.json()
        assert data["total"] >= 1
        found = [u for u in data["users"] if u["name"] == "IntTest_PersList"]
        assert len(found) >= 1
        assert found[0]["name_persian"] == "\u0644\u06cc\u0633\u062a"

    def test_persian_search_finds_profile(self, admin_jwt_client):
        """Search by partial Persian name finds the profile."""
        admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_PersSearch",
                "name_persian": "\u062c\u0633\u062a\u062c\u0648\u06cc",
                "birthday": "1993-04-04",
                "mother_name": "Mom",
            },
        )

        resp = admin_jwt_client.get(
            api_url("/api/oracle/users"),
            params={"search": "\u062c\u0633\u062a\u062c\u0648"},
        )
        data = resp.json()
        assert data["total"] >= 1

    def test_persian_update_roundtrip(self, admin_jwt_client):
        """Update name_persian from None to Persian value, verify change persists."""
        create_resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_PersUpd",
                "birthday": "1993-05-05",
                "mother_name": "Mom",
            },
        )
        user_id = create_resp.json()["id"]

        admin_jwt_client.put(
            api_url(f"/api/oracle/users/{user_id}"),
            json={"name_persian": "\u0645\u0631\u06cc\u0645"},
        )

        get_resp = admin_jwt_client.get(api_url(f"/api/oracle/users/{user_id}"))
        assert get_resp.json()["name_persian"] == "\u0645\u0631\u06cc\u0645"

    def test_mixed_script_name(self, admin_jwt_client):
        """Profile with Latin name and Persian name_persian both returned correctly."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_MixedScript",
                "name_persian": "\u0645\u062e\u062a\u0644\u0637",
                "birthday": "1993-06-06",
                "mother_name": "Mom",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "IntTest_MixedScript"
        assert data["name_persian"] == "\u0645\u062e\u062a\u0644\u0637"

    def test_long_persian_name(self, admin_jwt_client):
        """Persian name up to 100 characters works (well within VARCHAR 200 limit)."""
        long_persian = "\u0622" * 100
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_LongPersian",
                "name_persian": long_persian,
                "birthday": "1993-07-07",
                "mother_name": "Mom",
            },
        )
        assert resp.status_code == 201
        user_id = resp.json()["id"]

        get_resp = admin_jwt_client.get(api_url(f"/api/oracle/users/{user_id}"))
        assert get_resp.json()["name_persian"] == long_persian


# ─── Profile Encryption ─────────────────────────────────────────────────────


@pytest.mark.profile
class TestProfileEncryption:
    """Verify encryption at rest for sensitive profile fields."""

    def test_mother_name_encrypted_in_db(self, admin_jwt_client, db_connection):
        """mother_name stored with ENC4: prefix in DB when encryption is configured."""
        if not os.environ.get("NPS_ENCRYPTION_KEY"):
            pytest.skip("Encryption not configured")

        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_EncMom",
                "birthday": "1994-01-01",
                "mother_name": "SecretMom",
            },
        )
        assert resp.status_code == 201
        user_id = resp.json()["id"]

        row = db_connection.execute(
            text("SELECT mother_name FROM oracle_users WHERE id = :id"),
            {"id": user_id},
        ).fetchone()
        assert row[0].startswith("ENC4:") or row[0].startswith("ENC:")

    def test_mother_name_persian_encrypted_in_db(self, admin_jwt_client, db_connection):
        """mother_name_persian stored with ENC4: prefix in DB when encryption is configured."""
        if not os.environ.get("NPS_ENCRYPTION_KEY"):
            pytest.skip("Encryption not configured")

        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_EncPersMom",
                "birthday": "1994-02-02",
                "mother_name": "Mom",
                "mother_name_persian": "\u0645\u0627\u062f\u0631",
            },
        )
        assert resp.status_code == 201
        user_id = resp.json()["id"]

        row = db_connection.execute(
            text("SELECT mother_name_persian FROM oracle_users WHERE id = :id"),
            {"id": user_id},
        ).fetchone()
        assert row[0].startswith("ENC4:") or row[0].startswith("ENC:")

    def test_api_returns_decrypted_values(self, admin_jwt_client):
        """API response always returns plaintext (decrypted) mother_name values."""
        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_Decrypt",
                "birthday": "1994-03-03",
                "mother_name": "ClearMom",
            },
        )
        assert resp.status_code == 201
        user_id = resp.json()["id"]

        get_resp = admin_jwt_client.get(api_url(f"/api/oracle/users/{user_id}"))
        assert get_resp.status_code == 200
        assert get_resp.json()["mother_name"] == "ClearMom"

    def test_encrypted_persian_roundtrip(self, admin_jwt_client, db_connection):
        """Persian mother_name_persian encrypts and decrypts correctly through full stack."""
        if not os.environ.get("NPS_ENCRYPTION_KEY"):
            pytest.skip("Encryption not configured")

        resp = admin_jwt_client.post(
            api_url("/api/oracle/users"),
            json={
                "name": "IntTest_EncPersRT",
                "birthday": "1994-04-04",
                "mother_name": "Mom",
                "mother_name_persian": "\u0632\u0647\u0631\u0627",
            },
        )
        assert resp.status_code == 201
        user_id = resp.json()["id"]

        # Verify DB has encrypted value (not plaintext)
        row = db_connection.execute(
            text("SELECT mother_name_persian FROM oracle_users WHERE id = :id"),
            {"id": user_id},
        ).fetchone()
        assert row[0] != "\u0632\u0647\u0631\u0627", "Should be encrypted in DB"

        # Verify API returns decrypted value
        get_resp = admin_jwt_client.get(api_url(f"/api/oracle/users/{user_id}"))
        assert get_resp.json()["mother_name_persian"] == "\u0632\u0647\u0631\u0627"
