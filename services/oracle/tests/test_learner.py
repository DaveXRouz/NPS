"""Tests for oracle feedback learner engine (Session 18)."""

import pytest

# Import learner functions
from oracle_service.engines.learner import (
    CONFIDENCE_SCALE,
    MINIMUM_SAMPLES,
    weighted_score,
)


class TestWeightedScore:
    """Tests for the weighted_score function."""

    def test_insufficient_samples_returns_zero(self):
        assert weighted_score(4.5, 3) == 0.0
        assert weighted_score(5.0, 0) == 0.0
        assert weighted_score(4.0, MINIMUM_SAMPLES - 1) == 0.0

    def test_minimum_samples_returns_scaled(self):
        # At 5 samples → 30% confidence
        result = weighted_score(4.0, 5)
        assert result == pytest.approx(4.0 * 0.3)

    def test_ten_samples(self):
        result = weighted_score(3.5, 10)
        assert result == pytest.approx(3.5 * 0.5)

    def test_twenty_five_samples(self):
        result = weighted_score(4.0, 25)
        assert result == pytest.approx(4.0 * 0.7)

    def test_fifty_samples(self):
        result = weighted_score(4.0, 50)
        assert result == pytest.approx(4.0 * 0.85)

    def test_hundred_samples(self):
        result = weighted_score(4.0, 100)
        assert result == pytest.approx(4.0 * 0.95)

    def test_very_large_sample(self):
        # Should use highest threshold available (100 → 0.95)
        result = weighted_score(5.0, 10000)
        assert result == pytest.approx(5.0 * 0.95)

    def test_confidence_scale_is_sorted(self):
        thresholds = [t for t, _ in CONFIDENCE_SCALE]
        confidences = [c for _, c in CONFIDENCE_SCALE]
        assert thresholds == sorted(thresholds)
        assert confidences == sorted(confidences)


class TestScannerLegacy:
    """Tests for legacy scanner learning functions."""

    def test_default_state(self):
        from oracle_service.engines.learner import _default_state

        state = _default_state()
        assert state["xp"] == 0
        assert state["level"] == 1
        assert state["model"] == "sonnet"

    def test_levels_structure(self):
        from oracle_service.engines.learner import LEVELS

        assert 1 in LEVELS
        assert 5 in LEVELS
        assert LEVELS[1]["name"] == "Novice"
        assert LEVELS[5]["name"] == "Master"
        # Each level has required keys
        for level_info in LEVELS.values():
            assert "name" in level_info
            assert "xp" in level_info
            assert "capabilities" in level_info
