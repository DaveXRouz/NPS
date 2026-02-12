"""Tests for multi-user framework reading endpoint (Session 16)."""

from unittest.mock import AsyncMock, patch

import pytest


def _mock_multi_result(user_count: int = 2) -> dict:
    """Minimal MultiUserFrameworkResponse-compatible dict."""
    pair_count = user_count * (user_count - 1) // 2

    individual = []
    for i in range(user_count):
        individual.append(
            {
                "id": i + 1,
                "reading_type": "time",
                "sign_value": f"User {i}",
                "framework_result": {"fc60_stamp": {"fc60": f"STAMP-{i}"}},
                "ai_interpretation": None,
                "confidence": {"score": 70, "level": "high"},
                "patterns": [],
                "fc60_stamp": f"STAMP-{i}",
                "numerology": None,
                "moon": None,
                "ganzhi": None,
                "locale": "en",
                "created_at": "2026-02-13T12:00:00",
            }
        )

    pairwise = []
    idx = 0
    for i in range(user_count):
        for j in range(i + 1, user_count):
            pairwise.append(
                {
                    "user_a_name": f"User {i}",
                    "user_b_name": f"User {j}",
                    "user_a_id": i,
                    "user_b_id": j,
                    "overall_score": 0.72,
                    "overall_percentage": 72,
                    "classification": "Good",
                    "dimensions": {
                        "life_path": 80,
                        "element": 70,
                        "animal": 65,
                        "moon": 60,
                        "pattern": 55,
                    },
                    "strengths": ["Complementary elements"],
                    "challenges": ["Different rhythms"],
                    "description": "Good compatibility",
                }
            )
            idx += 1

    group_analysis = None
    if user_count >= 3:
        group_analysis = {
            "group_harmony_score": 0.65,
            "group_harmony_percentage": 65,
            "element_balance": {"Fire": 2, "Water": 1},
            "animal_distribution": {"Horse": 2, "Rat": 1},
            "dominant_element": "Fire",
            "dominant_animal": "Horse",
            "group_summary": "Good group.",
        }

    return {
        "id": 100,
        "user_count": user_count,
        "pair_count": pair_count,
        "computation_ms": 1234,
        "individual_readings": individual,
        "pairwise_compatibility": pairwise,
        "group_analysis": group_analysis,
        "ai_interpretation": None,
        "locale": "en",
        "created_at": "2026-02-13T12:00:00",
    }


class TestMultiUserReadingTwoUsers:
    @pytest.mark.anyio
    async def test_multi_user_reading_two_users(self, client):
        """POST with reading_type=multi and 2 users returns valid response."""
        with patch(
            "app.services.oracle_reading.OracleReadingService.create_multi_user_framework_reading",
            new_callable=AsyncMock,
            return_value=_mock_multi_result(2),
        ):
            resp = await client.post(
                "/api/oracle/readings",
                json={
                    "user_ids": [1, 2],
                    "primary_user_index": 0,
                    "reading_type": "multi",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["user_count"] == 2
            assert data["pair_count"] == 1
            assert len(data["pairwise_compatibility"]) == 1


class TestMultiUserReadingFiveUsers:
    @pytest.mark.anyio
    async def test_multi_user_reading_five_users(self, client):
        """5 users produces 10 pairwise results."""
        with patch(
            "app.services.oracle_reading.OracleReadingService.create_multi_user_framework_reading",
            new_callable=AsyncMock,
            return_value=_mock_multi_result(5),
        ):
            resp = await client.post(
                "/api/oracle/readings",
                json={
                    "user_ids": [1, 2, 3, 4, 5],
                    "primary_user_index": 0,
                    "reading_type": "multi",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["user_count"] == 5
            assert len(data["pairwise_compatibility"]) == 10
            assert len(data["individual_readings"]) == 5


class TestMultiUserOneUserFails:
    @pytest.mark.anyio
    async def test_multi_user_one_user_fails(self, client):
        """user_ids=[1] returns 422 — need at least 2."""
        resp = await client.post(
            "/api/oracle/readings",
            json={
                "user_ids": [1],
                "primary_user_index": 0,
                "reading_type": "multi",
            },
        )
        assert resp.status_code == 422


class TestMultiUserSixUsersFails:
    @pytest.mark.anyio
    async def test_multi_user_six_users_fails(self, client):
        """user_ids with 6 entries returns 422 — max 5."""
        resp = await client.post(
            "/api/oracle/readings",
            json={
                "user_ids": [1, 2, 3, 4, 5, 6],
                "primary_user_index": 0,
                "reading_type": "multi",
            },
        )
        assert resp.status_code == 422


class TestMultiUserDuplicateIdsFails:
    @pytest.mark.anyio
    async def test_multi_user_duplicate_ids_fails(self, client):
        """user_ids=[1,1,2] returns 422 — no duplicates."""
        resp = await client.post(
            "/api/oracle/readings",
            json={
                "user_ids": [1, 1, 2],
                "primary_user_index": 0,
                "reading_type": "multi",
            },
        )
        assert resp.status_code == 422


class TestMultiUserReadingStoredInDb:
    @pytest.mark.anyio
    async def test_multi_user_reading_stored_in_db(self, client):
        """Reading + junction rows created."""
        with patch(
            "app.services.oracle_reading.OracleReadingService.create_multi_user_framework_reading",
            new_callable=AsyncMock,
            return_value=_mock_multi_result(2),
        ):
            resp = await client.post(
                "/api/oracle/readings",
                json={
                    "user_ids": [1, 2],
                    "primary_user_index": 0,
                    "reading_type": "multi",
                },
            )
            assert resp.status_code == 200
            assert resp.json()["id"] == 100


class TestMultiUserIndividualReadingsCount:
    @pytest.mark.anyio
    async def test_multi_user_individual_readings_count(self, client):
        """individual_readings length == user_count."""
        with patch(
            "app.services.oracle_reading.OracleReadingService.create_multi_user_framework_reading",
            new_callable=AsyncMock,
            return_value=_mock_multi_result(3),
        ):
            resp = await client.post(
                "/api/oracle/readings",
                json={
                    "user_ids": [1, 2, 3],
                    "primary_user_index": 0,
                    "reading_type": "multi",
                },
            )
            data = resp.json()
            assert len(data["individual_readings"]) == data["user_count"]


class TestMultiUserCompatibilityDimensions:
    @pytest.mark.anyio
    async def test_multi_user_compatibility_dimensions(self, client):
        """Each pairwise has all 5 dimension keys."""
        with patch(
            "app.services.oracle_reading.OracleReadingService.create_multi_user_framework_reading",
            new_callable=AsyncMock,
            return_value=_mock_multi_result(3),
        ):
            resp = await client.post(
                "/api/oracle/readings",
                json={
                    "user_ids": [1, 2, 3],
                    "primary_user_index": 0,
                    "reading_type": "multi",
                },
            )
            data = resp.json()
            expected_dims = {"life_path", "element", "animal", "moon", "pattern"}
            for pair in data["pairwise_compatibility"]:
                assert set(pair["dimensions"].keys()) == expected_dims
