"""Shared test configuration for tgbot tests."""

import pytest

from services.tgbot.i18n import load_translations


@pytest.fixture(autouse=True, scope="session")
def _load_i18n():
    """Load translations once for all tests."""
    load_translations()
