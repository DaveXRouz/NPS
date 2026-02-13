"""Tests for error classification and handling utilities."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from services.tgbot.api_client import APIResponse, NPSAPIClient
from services.tgbot.handlers.readings import handle_api_error
from services.tgbot.i18n import load_translations


@pytest.fixture(autouse=True)
def _load_translations():
    """Ensure translations are loaded for error messages."""
    load_translations()


# ─── classify_error tests ────────────────────────────────────────────────────


def test_classify_401():
    """401 maps to error_auth key."""
    client = NPSAPIClient("test-key-12345678901234567890")
    resp = APIResponse(success=False, status_code=401, error="Unauthorized")
    assert client.classify_error(resp) == "error_auth"


def test_classify_403():
    """403 also maps to error_auth key."""
    client = NPSAPIClient("test-key-12345678901234567890")
    resp = APIResponse(success=False, status_code=403, error="Forbidden")
    assert client.classify_error(resp) == "error_auth"


def test_classify_404():
    """404 maps to error_not_found key."""
    client = NPSAPIClient("test-key-12345678901234567890")
    resp = APIResponse(success=False, status_code=404, error="Not found")
    assert client.classify_error(resp) == "error_not_found"


def test_classify_422():
    """422 maps to error_validation key."""
    client = NPSAPIClient("test-key-12345678901234567890")
    resp = APIResponse(success=False, status_code=422, error="Validation error")
    assert client.classify_error(resp) == "error_validation"


def test_classify_429():
    """429 maps to error_rate_limit_api key."""
    client = NPSAPIClient("test-key-12345678901234567890")
    resp = APIResponse(success=False, status_code=429, error="Rate limited")
    assert client.classify_error(resp) == "error_rate_limit_api"


def test_classify_500():
    """500+ maps to error_server key."""
    client = NPSAPIClient("test-key-12345678901234567890")
    resp = APIResponse(success=False, status_code=500, error="Internal error")
    assert client.classify_error(resp) == "error_server"


def test_classify_unknown():
    """Unknown status codes map to error_generic."""
    client = NPSAPIClient("test-key-12345678901234567890")
    resp = APIResponse(success=False, status_code=418, error="I'm a teapot")
    assert client.classify_error(resp) == "error_generic"


# ─── handle_api_error tests ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_handle_api_error_formats_with_emoji():
    """handle_api_error sends error with emoji prefix."""
    msg = MagicMock(edit_text=AsyncMock())
    api = NPSAPIClient("test-key-12345678901234567890")
    result = APIResponse(success=False, status_code=500, error="Server down")

    await handle_api_error(msg, result, "en", api)

    msg.edit_text.assert_called_once()
    text = msg.edit_text.call_args[0][0]
    # Should contain error emoji and error text
    assert "Server error" in text or "error" in text.lower()
    await api.close()


@pytest.mark.asyncio
async def test_handle_api_error_validation_with_detail():
    """Validation error includes detail text."""
    msg = MagicMock(edit_text=AsyncMock())
    api = NPSAPIClient("test-key-12345678901234567890")
    result = APIResponse(success=False, status_code=422, error="Name too long")

    await handle_api_error(msg, result, "en", api)

    text = msg.edit_text.call_args[0][0]
    assert "Name too long" in text
    await api.close()
