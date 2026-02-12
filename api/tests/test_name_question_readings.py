"""Tests for POST /api/oracle/name and POST /api/oracle/question endpoints."""

from unittest.mock import MagicMock, patch

import pytest


def _mock_name_result() -> dict:
    """Minimal NameReadingResponse-compatible dict."""
    return {
        "name": "Alice",
        "detected_script": "latin",
        "numerology_system": "pythagorean",
        "expression": 8,
        "soul_urge": 9,
        "personality": 8,
        "life_path": 3,
        "personal_year": 4,
        "fc60_stamp": {"fc60": "LU-OX-OXWA"},
        "moon": {"phase_name": "Full Moon"},
        "ganzhi": {"year_animal": "Horse"},
        "patterns": {"detected": [], "count": 0},
        "confidence": {"score": 72, "level": "high"},
        "ai_interpretation": "Alice is a creative soul.",
        "letter_breakdown": [
            {"letter": "A", "value": 1, "element": "Fire"},
            {"letter": "L", "value": 3, "element": "Metal"},
            {"letter": "I", "value": 9, "element": "Water"},
            {"letter": "C", "value": 3, "element": "Metal"},
            {"letter": "E", "value": 5, "element": "Wood"},
        ],
    }


def _mock_question_result() -> dict:
    """Minimal QuestionReadingResponse-compatible dict."""
    return {
        "question": "Should I change careers?",
        "question_number": 7,
        "detected_script": "latin",
        "numerology_system": "pythagorean",
        "raw_letter_sum": 214,
        "is_master_number": False,
        "fc60_stamp": {"fc60": "LU-OX-OXWA"},
        "numerology": {
            "life_path": {"number": 3, "title": "Creator", "message": "Creative"},
        },
        "moon": {"phase_name": "Waxing Crescent"},
        "ganzhi": {"year_animal": "Horse"},
        "patterns": {"detected": [], "count": 0},
        "confidence": {"score": 65, "level": "medium"},
        "ai_interpretation": "A time for change.",
    }


# ─── Name Reading Tests ─────────────────────────────────────────────────────


class TestNameReadingValidation:
    @pytest.mark.anyio
    async def test_name_reading_empty_name(self, client):
        resp = await client.post(
            "/api/oracle/name",
            json={"name": ""},
        )
        assert resp.status_code == 422

    @pytest.mark.anyio
    async def test_name_reading_whitespace_only(self, client):
        resp = await client.post(
            "/api/oracle/name",
            json={"name": "   "},
        )
        assert resp.status_code == 422


class TestNameReadingEndpoint:
    @pytest.mark.anyio
    async def test_name_reading_basic(self, client):
        with patch(
            "app.services.oracle_reading.OracleReadingService.get_name_reading_v2",
            new_callable=MagicMock,
            return_value=_mock_name_result(),
        ):
            resp = await client.post(
                "/api/oracle/name",
                json={"name": "Alice"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["name"] == "Alice"
            assert data["expression"] == 8
            assert data["soul_urge"] == 9
            assert data["personality"] == 8

    @pytest.mark.anyio
    async def test_name_reading_with_user_id(self, client):
        with patch(
            "app.services.oracle_reading.OracleReadingService.get_name_reading_v2",
            new_callable=MagicMock,
            return_value={**_mock_name_result(), "life_path": 5, "personal_year": 9},
        ) as mock_svc:
            resp = await client.post(
                "/api/oracle/name",
                json={"name": "Alice", "user_id": 1},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["life_path"] == 5
            call_kwargs = mock_svc.call_args.kwargs
            assert call_kwargs["user_id"] == 1

    @pytest.mark.anyio
    async def test_name_reading_chaldean(self, client):
        with patch(
            "app.services.oracle_reading.OracleReadingService.get_name_reading_v2",
            new_callable=MagicMock,
            return_value={**_mock_name_result(), "numerology_system": "chaldean"},
        ) as mock_svc:
            resp = await client.post(
                "/api/oracle/name",
                json={"name": "Alice", "numerology_system": "chaldean"},
            )
            assert resp.status_code == 200
            call_kwargs = mock_svc.call_args.kwargs
            assert call_kwargs["numerology_system"] == "chaldean"

    @pytest.mark.anyio
    async def test_name_reading_has_letter_breakdown(self, client):
        with patch(
            "app.services.oracle_reading.OracleReadingService.get_name_reading_v2",
            new_callable=MagicMock,
            return_value=_mock_name_result(),
        ):
            resp = await client.post(
                "/api/oracle/name",
                json={"name": "Alice"},
            )
            data = resp.json()
            assert "letter_breakdown" in data
            assert len(data["letter_breakdown"]) == 5
            assert data["letter_breakdown"][0]["letter"] == "A"

    @pytest.mark.anyio
    async def test_name_reading_has_confidence(self, client):
        with patch(
            "app.services.oracle_reading.OracleReadingService.get_name_reading_v2",
            new_callable=MagicMock,
            return_value=_mock_name_result(),
        ):
            resp = await client.post(
                "/api/oracle/name",
                json={"name": "Alice"},
            )
            data = resp.json()
            assert "confidence" in data
            assert data["confidence"]["score"] == 72


# ─── Question Reading Tests ──────────────────────────────────────────────────


class TestQuestionReadingValidation:
    @pytest.mark.anyio
    async def test_question_reading_empty(self, client):
        resp = await client.post(
            "/api/oracle/question",
            json={"question": ""},
        )
        assert resp.status_code == 422

    @pytest.mark.anyio
    async def test_question_reading_too_long(self, client):
        resp = await client.post(
            "/api/oracle/question",
            json={"question": "x" * 501},
        )
        assert resp.status_code == 422


class TestQuestionReadingEndpoint:
    @pytest.mark.anyio
    async def test_question_reading_basic(self, client):
        with patch(
            "app.services.oracle_reading.OracleReadingService.get_question_reading_v2",
            new_callable=MagicMock,
            return_value=_mock_question_result(),
        ):
            resp = await client.post(
                "/api/oracle/question",
                json={"question": "Should I change careers?"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["question"] == "Should I change careers?"
            assert data["question_number"] == 7

    @pytest.mark.anyio
    async def test_question_reading_includes_question_number(self, client):
        with patch(
            "app.services.oracle_reading.OracleReadingService.get_question_reading_v2",
            new_callable=MagicMock,
            return_value=_mock_question_result(),
        ):
            resp = await client.post(
                "/api/oracle/question",
                json={"question": "Should I change careers?"},
            )
            data = resp.json()
            assert "question_number" in data
            assert "raw_letter_sum" in data
            assert "is_master_number" in data

    @pytest.mark.anyio
    async def test_question_reading_persian(self, client):
        persian_result = {
            **_mock_question_result(),
            "question": "\u0622\u06cc\u0627 \u0634\u063a\u0644\u0645 \u0631\u0627 \u0639\u0648\u0636 \u06a9\u0646\u0645\u061f",
            "detected_script": "persian",
            "numerology_system": "abjad",
        }
        with patch(
            "app.services.oracle_reading.OracleReadingService.get_question_reading_v2",
            new_callable=MagicMock,
            return_value=persian_result,
        ):
            resp = await client.post(
                "/api/oracle/question",
                json={
                    "question": "\u0622\u06cc\u0627 \u0634\u063a\u0644\u0645 \u0631\u0627 \u0639\u0648\u0636 \u06a9\u0646\u0645\u061f",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["detected_script"] == "persian"
            assert data["numerology_system"] == "abjad"

    @pytest.mark.anyio
    async def test_question_reading_has_confidence(self, client):
        with patch(
            "app.services.oracle_reading.OracleReadingService.get_question_reading_v2",
            new_callable=MagicMock,
            return_value=_mock_question_result(),
        ):
            resp = await client.post(
                "/api/oracle/question",
                json={"question": "Should I change careers?"},
            )
            data = resp.json()
            assert "confidence" in data
            assert data["confidence"]["score"] == 65
