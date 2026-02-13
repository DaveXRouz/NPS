"""Tests for multi-user oracle reading endpoint."""

import pytest

MULTI_USER_URL = "/api/oracle/reading/multi-user"
READINGS_URL = "/api/oracle/readings"


def _two_users():
    return {
        "users": [
            {"name": "Alice", "birth_year": 1990, "birth_month": 3, "birth_day": 15},
            {"name": "Bob", "birth_year": 1988, "birth_month": 7, "birth_day": 22},
        ],
        "primary_user_index": 0,
        "include_interpretation": True,
    }


def _three_users():
    return {
        "users": [
            {"name": "Alice", "birth_year": 1990, "birth_month": 3, "birth_day": 15},
            {"name": "Bob", "birth_year": 1988, "birth_month": 7, "birth_day": 22},
            {"name": "Carol", "birth_year": 1995, "birth_month": 11, "birth_day": 5},
        ],
        "primary_user_index": 0,
    }


# ─── Engine Availability ─────────────────────────────────────────────────────
# Multi-user engines (compatibility_analyzer, group_energy, group_dynamics) were
# removed in Session 6 and will be rewritten in Session 7.  The endpoint returns
# 503 Service Unavailable until those engines are reimplemented.


@pytest.mark.asyncio
async def test_two_user_analysis_503_without_engines(client):
    """Multi-user analysis returns 503 when engines are not available."""
    resp = await client.post(MULTI_USER_URL, json=_two_users())
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_three_user_analysis_503_without_engines(client):
    resp = await client.post(MULTI_USER_URL, json=_three_users())
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_max_ten_users_503_without_engines(client):
    users = [
        {
            "name": f"User{i}",
            "birth_year": 1980 + i,
            "birth_month": (i % 12) + 1,
            "birth_day": (i % 28) + 1,
        }
        for i in range(10)
    ]
    resp = await client.post(MULTI_USER_URL, json={"users": users, "primary_user_index": 0})
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_without_interpretation_503_without_engines(client):
    body = _two_users()
    body["include_interpretation"] = False
    resp = await client.post(MULTI_USER_URL, json=body)
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_with_interpretation_503_without_engines(client):
    resp = await client.post(MULTI_USER_URL, json=_two_users())
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_profile_fields_503_without_engines(client):
    resp = await client.post(MULTI_USER_URL, json=_two_users())
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_compatibility_fields_503_without_engines(client):
    resp = await client.post(MULTI_USER_URL, json=_two_users())
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_group_energy_fields_503_without_engines(client):
    resp = await client.post(MULTI_USER_URL, json=_two_users())
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_group_dynamics_fields_503_without_engines(client):
    resp = await client.post(MULTI_USER_URL, json=_two_users())
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_reading_not_stored_when_unavailable(client):
    """No reading stored when engines are unavailable."""
    await client.post(MULTI_USER_URL, json=_two_users())
    resp = await client.get(READINGS_URL, params={"sign_type": "multi_user"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0


# ─── Validation ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_too_few_users_422(client):
    body = {"users": [{"name": "Solo", "birth_year": 1990, "birth_month": 1, "birth_day": 1}]}
    resp = await client.post(MULTI_USER_URL, json=body)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_too_many_users_422(client):
    users = [
        {"name": f"U{i}", "birth_year": 1990, "birth_month": 1, "birth_day": 1} for i in range(11)
    ]
    resp = await client.post(MULTI_USER_URL, json={"users": users})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_invalid_primary_index_422(client):
    body = _two_users()
    body["primary_user_index"] = 5
    resp = await client.post(MULTI_USER_URL, json=body)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_invalid_birth_data_422(client):
    body = {
        "users": [
            {"name": "A", "birth_year": 1990, "birth_month": 13, "birth_day": 1},
            {"name": "B", "birth_year": 1990, "birth_month": 1, "birth_day": 1},
        ]
    }
    resp = await client.post(MULTI_USER_URL, json=body)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_empty_name_422(client):
    body = {
        "users": [
            {"name": "", "birth_year": 1990, "birth_month": 1, "birth_day": 1},
            {"name": "B", "birth_year": 1990, "birth_month": 1, "birth_day": 1},
        ]
    }
    resp = await client.post(MULTI_USER_URL, json=body)
    assert resp.status_code == 422


# ─── Auth ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_readonly_403(readonly_client):
    resp = await readonly_client.post(MULTI_USER_URL, json=_two_users())
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_401(unauth_client):
    resp = await unauth_client.post(MULTI_USER_URL, json=_two_users())
    assert resp.status_code == 401
