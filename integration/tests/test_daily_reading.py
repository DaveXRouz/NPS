"""Integration tests for daily insight readings (GET /api/oracle/daily)."""

import re
from datetime import date

import pytest

from conftest import api_url


@pytest.mark.reading
class TestDailyReading:
    """Test GET /api/oracle/daily endpoint — caching, date handling, format validation."""

    def test_response_structure(self, reading_helper):
        """Response has date, insight, lucky_numbers, optimal_activity."""
        data = reading_helper.daily_reading()
        assert "date" in data
        assert "insight" in data
        assert "lucky_numbers" in data
        assert "optimal_activity" in data

    def test_date_is_valid_format(self, reading_helper):
        """date matches YYYY-MM-DD format and is parseable."""
        data = reading_helper.daily_reading()
        assert re.match(r"^\d{4}-\d{2}-\d{2}$", data["date"]), (
            f"Date format invalid: {data['date']}"
        )
        # Verify it's a real date
        parts = data["date"].split("-")
        parsed = date(int(parts[0]), int(parts[1]), int(parts[2]))
        assert parsed is not None

    def test_insight_is_non_empty(self, reading_helper):
        """insight is non-empty string."""
        data = reading_helper.daily_reading()
        assert isinstance(data["insight"], str) and len(data["insight"]) > 0

    def test_lucky_numbers_format(self, reading_helper):
        """lucky_numbers is list of strings, each parseable as int."""
        data = reading_helper.daily_reading()
        lucky = data["lucky_numbers"]
        assert isinstance(lucky, list)
        for item in lucky:
            assert isinstance(item, str)
            int(item)  # Should not raise

    def test_default_date_is_today(self, reading_helper):
        """No ?date= param returns today's date."""
        data = reading_helper.daily_reading()
        today = date.today().isoformat()
        assert data["date"] == today, f"Expected today ({today}), got {data['date']}"

    def test_specific_date(self, reading_helper):
        """?date=2024-06-15 returns date='2024-06-15'."""
        data = reading_helper.daily_reading("2024-06-15")
        assert data["date"] == "2024-06-15"

    def test_same_date_same_result(self, reading_helper):
        """Two requests for same date return identical response fields."""
        data1 = reading_helper.daily_reading("2024-06-15")
        data2 = reading_helper.daily_reading("2024-06-15")
        assert data1["insight"] == data2["insight"], (
            "Same date should give same insight"
        )
        assert data1["lucky_numbers"] == data2["lucky_numbers"], (
            "Same date should give same lucky numbers"
        )

    def test_different_dates_diverge(self, reading_helper):
        """2024-01-01 vs 2024-07-15 produce different insight or lucky numbers."""
        data_jan = reading_helper.daily_reading("2024-01-01")
        data_jul = reading_helper.daily_reading("2024-07-15")
        differs = (
            data_jan["insight"] != data_jul["insight"]
            or data_jan["lucky_numbers"] != data_jul["lucky_numbers"]
        )
        assert differs, "Different dates should produce different daily readings"

    def test_daily_does_not_store_reading(self, api_client, reading_helper):
        """Daily insight GET does NOT create row in oracle_readings
        (count before == count after)."""
        # Get current count
        before = api_client.get(api_url("/api/oracle/readings?limit=1"))
        assert before.status_code == 200
        count_before = before.json()["total"]

        # Make daily reading
        reading_helper.daily_reading("2024-03-01")

        # Check count again
        after = api_client.get(api_url("/api/oracle/readings?limit=1"))
        assert after.status_code == 200
        count_after = after.json()["total"]

        assert count_after == count_before, (
            f"Daily reading should not store: before={count_before}, after={count_after}"
        )

    def test_optimal_activity_is_string(self, reading_helper):
        """optimal_activity is string (may be empty but not None)."""
        data = reading_helper.daily_reading()
        assert isinstance(data["optimal_activity"], str), (
            f"optimal_activity should be str, got {type(data['optimal_activity'])}"
        )
