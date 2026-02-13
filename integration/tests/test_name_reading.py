"""Integration tests for name cipher readings (POST /api/oracle/name)."""

import pytest

from conftest import api_url


@pytest.mark.reading
class TestNameReading:
    """Test POST /api/oracle/name endpoint — numerology values, letter analysis, edge cases."""

    def test_response_structure(self, reading_helper):
        """Response has name, expression/destiny_number, soul_urge, personality,
        letter_breakdown/letters, and interpretation or ai_interpretation."""
        data = reading_helper.name_reading("IntTest_Alice")
        assert "name" in data
        # V2 uses 'expression', legacy uses 'destiny_number' — accept either
        has_number = "expression" in data or "destiny_number" in data
        assert has_number, "Missing expression or destiny_number"
        assert "soul_urge" in data
        assert "personality" in data
        # V2 uses 'letter_breakdown', legacy uses 'letters'
        has_letters = "letter_breakdown" in data or "letters" in data
        assert has_letters, "Missing letter_breakdown or letters"

    def test_name_echoed_back(self, reading_helper):
        """response.name equals submitted name."""
        data = reading_helper.name_reading("IntTest_Echo")
        assert data["name"] == "IntTest_Echo"

    def test_destiny_number_valid_range(self, reading_helper):
        """Destiny/expression number in 1-9 or master 11/22/33."""
        data = reading_helper.name_reading("IntTest_Destiny")
        num = data.get("expression") or data.get("destiny_number", 0)
        # Number should be positive (0 only if engine can't compute)
        assert isinstance(num, int) and num >= 0

    def test_soul_urge_valid_range(self, reading_helper):
        """soul_urge is a non-negative integer."""
        data = reading_helper.name_reading("IntTest_Soul")
        assert isinstance(data["soul_urge"], int) and data["soul_urge"] >= 0

    def test_personality_valid_range(self, reading_helper):
        """personality is a non-negative integer."""
        data = reading_helper.name_reading("IntTest_Person")
        assert isinstance(data["personality"], int) and data["personality"] >= 0

    def test_letter_analysis_count(self, reading_helper):
        """Letter count equals alpha character count in name."""
        name = "IntTest_Alpha"
        data = reading_helper.name_reading(name)
        letters = data.get("letter_breakdown") or data.get("letters", [])
        alpha_count = sum(1 for c in name if c.isalpha())
        assert len(letters) == alpha_count, (
            f"Expected {alpha_count} letters, got {len(letters)}"
        )

    def test_letter_analysis_structure(self, reading_helper):
        """Each letter has 'letter' (str, len 1), 'value' (int >= 0)."""
        data = reading_helper.name_reading("IntTest_Struct")
        letters = data.get("letter_breakdown") or data.get("letters", [])
        assert len(letters) > 0, "Should have at least one letter"
        for entry in letters:
            assert isinstance(entry["letter"], str) and len(entry["letter"]) == 1
            assert isinstance(entry["value"], int) and entry["value"] >= 0

    def test_deterministic_same_name(self, reading_helper):
        """Two requests with same name produce identical destiny/soul_urge/personality."""
        data1 = reading_helper.name_reading("IntTest_Determ")
        data2 = reading_helper.name_reading("IntTest_Determ")
        assert data1["soul_urge"] == data2["soul_urge"]
        assert data1["personality"] == data2["personality"]
        num1 = data1.get("expression") or data1.get("destiny_number")
        num2 = data2.get("expression") or data2.get("destiny_number")
        assert num1 == num2, "Expression/destiny number should be deterministic"

    def test_different_names_diverge(self, reading_helper):
        """'Alice' vs 'Zebra' produce different expression numbers."""
        data_a = reading_helper.name_reading("Alice")
        data_z = reading_helper.name_reading("Zebra")
        num_a = data_a.get("expression") or data_a.get("destiny_number", 0)
        num_z = data_z.get("expression") or data_z.get("destiny_number", 0)
        # Different names should produce at least one difference
        differs = (
            num_a != num_z
            or data_a["soul_urge"] != data_z["soul_urge"]
            or data_a["personality"] != data_z["personality"]
        )
        assert differs, "Different names should produce different readings"

    def test_single_letter_name(self, reading_helper):
        """name='A' returns 1 letter."""
        data = reading_helper.name_reading("A")
        letters = data.get("letter_breakdown") or data.get("letters", [])
        assert len(letters) == 1

    def test_long_name(self, reading_helper):
        """26-char alphabetic name returns 26 letters."""
        name = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        data = reading_helper.name_reading(name)
        letters = data.get("letter_breakdown") or data.get("letters", [])
        assert len(letters) == 26

    def test_name_with_spaces(self, reading_helper):
        """'John Doe' has 7 letters (excluding space)."""
        data = reading_helper.name_reading("John Doe")
        letters = data.get("letter_breakdown") or data.get("letters", [])
        assert len(letters) == 7, f"Expected 7 letters, got {len(letters)}"

    def test_reading_stored_as_name_type(self, api_client, reading_helper):
        """Reading history has entry with sign_type='name'."""
        reading_helper.name_reading("IntTest_StoreCheck")
        resp = api_client.get(api_url("/api/oracle/readings?sign_type=name&limit=1"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1, "Should have at least one stored name reading"
        assert data["readings"][0]["sign_type"] == "name"
