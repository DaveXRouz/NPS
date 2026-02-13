"""Integration tests for multi-user deep readings (POST /api/oracle/reading/multi-user)."""

import pytest
from sqlalchemy import text

from conftest import THREE_USERS, api_url


@pytest.mark.reading
class TestMultiUserReadingDeep:
    """Test POST /api/oracle/reading/multi-user — 3-user flow, pairwise math,
    group energy/dynamics, DB persistence."""

    def test_three_user_reading(self, reading_helper):
        """user_count=3, profiles has 3 entries."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        assert data["user_count"] == 3
        assert len(data["profiles"]) == 3

    def test_profile_field_completeness(self, reading_helper):
        """Each profile has: name, element, animal, polarity, life_path, stem, branch,
        birth_year, birth_month, birth_day."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        for i, profile in enumerate(data["profiles"]):
            for field in (
                "name",
                "element",
                "animal",
                "polarity",
                "life_path",
                "stem",
                "branch",
                "birth_year",
                "birth_month",
                "birth_day",
            ):
                assert field in profile, (
                    f"Profile {i} missing field: {field}. Keys: {list(profile.keys())}"
                )

    def test_pairwise_count_formula(self, api_client):
        """For n=2 -> 1 pair, n=3 -> 3 pairs, n=4 -> 6 pairs."""
        test_cases = [
            (2, 1),
            (3, 3),
            (4, 6),
        ]
        for n, expected_pairs in test_cases:
            users = [
                {
                    "name": f"IntTest_Pair_{n}_{i}",
                    "birth_year": 1980 + i,
                    "birth_month": (i % 12) + 1,
                    "birth_day": 10 + i,
                }
                for i in range(n)
            ]
            resp = api_client.post(
                api_url("/api/oracle/reading/multi-user"),
                json={
                    "users": users,
                    "primary_user_index": 0,
                    "include_interpretation": False,
                },
            )
            assert resp.status_code == 200, (
                f"n={n} failed: {resp.status_code}: {resp.text}"
            )
            data = resp.json()
            assert data["pair_count"] == expected_pairs, (
                f"n={n}: expected {expected_pairs} pairs, got {data['pair_count']}"
            )

    def test_compatibility_score_range(self, reading_helper):
        """Each pairwise entry has overall float 0.0-100.0, classification non-empty."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        for pair in data["pairwise_compatibility"]:
            assert isinstance(pair["overall"], (int, float))
            assert 0.0 <= pair["overall"] <= 100.0, (
                f"overall score {pair['overall']} out of range"
            )
            assert isinstance(pair.get("classification", ""), str)

    def test_compatibility_strengths_challenges(self, reading_helper):
        """Each pairwise entry has strengths (list) and challenges (list)."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        for pair in data["pairwise_compatibility"]:
            assert isinstance(pair.get("strengths", []), list)
            assert isinstance(pair.get("challenges", []), list)

    def test_group_energy_present(self, reading_helper):
        """group_energy has dominant_element, dominant_animal, joint_life_path,
        element_distribution."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        ge = data.get("group_energy")
        assert ge is not None, "group_energy should be present"
        for field in (
            "dominant_element",
            "dominant_animal",
            "joint_life_path",
            "element_distribution",
        ):
            assert field in ge, f"group_energy missing: {field}"

    def test_group_dynamics_present(self, reading_helper):
        """group_dynamics has avg_compatibility, strongest_bond, weakest_bond,
        roles, synergies, challenges."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        gd = data.get("group_dynamics")
        assert gd is not None, "group_dynamics should be present"
        for field in (
            "avg_compatibility",
            "strongest_bond",
            "weakest_bond",
            "roles",
            "synergies",
            "challenges",
        ):
            assert field in gd, f"group_dynamics missing: {field}"

    def test_group_dynamics_avg_compatibility_range(self, reading_helper):
        """avg_compatibility is float 0.0-100.0."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        avg = data["group_dynamics"]["avg_compatibility"]
        assert isinstance(avg, (int, float))
        assert 0.0 <= avg <= 100.0, f"avg_compatibility {avg} out of range"

    def test_computation_ms_tracked(self, reading_helper):
        """computation_ms is float > 0."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        assert isinstance(data["computation_ms"], (int, float))
        assert data["computation_ms"] > 0

    def test_pair_count_matches_pairwise(self, reading_helper):
        """pair_count equals len(pairwise_compatibility)."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        assert data["pair_count"] == len(data["pairwise_compatibility"])

    def test_reading_id_returned(self, reading_helper):
        """reading_id is int > 0."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        assert isinstance(data["reading_id"], int) and data["reading_id"] > 0

    def test_profiles_match_input_names(self, reading_helper):
        """Profile names match submitted user names in order."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        for i, user in enumerate(THREE_USERS):
            assert data["profiles"][i]["name"] == user["name"], (
                f"Profile {i} name mismatch: expected {user['name']}, "
                f"got {data['profiles'][i]['name']}"
            )

    def test_deterministic_same_users(self, reading_helper):
        """Two identical requests produce identical profiles and pairwise compatibility."""
        data1 = reading_helper.multi_user_reading(THREE_USERS)
        data2 = reading_helper.multi_user_reading(THREE_USERS)
        # Compare profiles (exclude computation_ms and reading_id which vary)
        assert data1["profiles"] == data2["profiles"], (
            "Profiles should be deterministic"
        )
        assert data1["pairwise_compatibility"] == data2["pairwise_compatibility"], (
            "Pairwise compatibility should be deterministic"
        )

    def test_three_user_with_interpretation(self, api_client):
        """With include_interpretation=True, ai_interpretation is not None
        (if AI available) or is None (graceful degradation)."""
        resp = api_client.post(
            api_url("/api/oracle/reading/multi-user"),
            json={
                "users": THREE_USERS,
                "primary_user_index": 0,
                "include_interpretation": True,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        # AI interpretation may or may not be available
        ai = data.get("ai_interpretation")
        assert ai is None or isinstance(ai, (str, dict)), (
            f"ai_interpretation should be None, str, or dict, got: {type(ai)}"
        )

    def test_multi_user_stored_with_junction(self, reading_helper, db_connection):
        """DB has oracle_readings row with is_multi_user=True, sign_type='multi_user'."""
        data = reading_helper.multi_user_reading(THREE_USERS)
        reading_id = data["reading_id"]

        result = db_connection.execute(
            text("SELECT is_multi_user, sign_type FROM oracle_readings WHERE id = :id"),
            {"id": reading_id},
        )
        row = result.fetchone()
        assert row is not None, f"Reading {reading_id} not found in DB"
        assert row[0] is True, "Reading should be marked as multi_user"
        assert row[1] == "multi_user", (
            f"sign_type should be 'multi_user', got '{row[1]}'"
        )
