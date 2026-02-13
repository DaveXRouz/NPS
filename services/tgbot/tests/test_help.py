"""Tests for the enhanced /help command with grouped categories."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from services.tgbot.i18n import load_translations
from services.tgbot.handlers.core import help_handler


@pytest.fixture(autouse=True)
def _load_translations():
    """Ensure translations are loaded."""
    load_translations()


def _make_update(chat_id: int = 12345):
    update = MagicMock()
    update.effective_chat.id = chat_id
    update.effective_user.username = "testuser"
    update.message.reply_text = AsyncMock()
    update.message.message_id = 999
    return update


def _make_context(args: list[str] | None = None):
    context = MagicMock()
    context.args = args or []
    context.bot.send_message = AsyncMock()
    return context


@pytest.mark.asyncio
@patch(
    "services.tgbot.handlers.core._is_admin", new_callable=AsyncMock, return_value=False
)
@patch("services.tgbot.handlers.core.client")
@patch("services.tgbot.handlers.core.rate_limiter")
async def test_help_has_all_categories(mock_limiter, mock_client, mock_is_admin):
    """Full /help shows Getting Started, Readings, Daily sections."""
    mock_limiter.is_allowed.return_value = True
    mock_client.get_status = AsyncMock(return_value=None)

    update = _make_update()
    context = _make_context()

    await help_handler(update, context)

    call_text = update.message.reply_text.call_args[0][0]
    assert "/start" in call_text
    assert "/time" in call_text
    assert "/daily_on" in call_text
    assert "/compare" in call_text


@pytest.mark.asyncio
@patch("services.tgbot.handlers.core.client")
@patch("services.tgbot.handlers.core.rate_limiter")
async def test_help_specific_command(mock_limiter, mock_client):
    """'/help time' returns detailed help for /time."""
    mock_limiter.is_allowed.return_value = True
    mock_client.get_status = AsyncMock(return_value=None)

    update = _make_update()
    context = _make_context(args=["time"])

    await help_handler(update, context)

    call_text = update.message.reply_text.call_args[0][0]
    assert "HH:MM" in call_text
    assert "Time Reading" in call_text


@pytest.mark.asyncio
@patch("services.tgbot.handlers.core.client")
@patch("services.tgbot.handlers.core.rate_limiter")
async def test_help_unknown_command(mock_limiter, mock_client):
    """'/help xyz' returns 'no detail' message."""
    mock_limiter.is_allowed.return_value = True
    mock_client.get_status = AsyncMock(return_value=None)

    update = _make_update()
    context = _make_context(args=["xyz"])

    await help_handler(update, context)

    call_text = update.message.reply_text.call_args[0][0]
    assert "xyz" in call_text
    assert "No detailed help" in call_text or "/help" in call_text


@pytest.mark.asyncio
@patch(
    "services.tgbot.handlers.core._is_admin", new_callable=AsyncMock, return_value=True
)
@patch("services.tgbot.handlers.core.client")
@patch("services.tgbot.handlers.core.rate_limiter")
async def test_admin_section_shown_for_admins(mock_limiter, mock_client, mock_is_admin):
    """Admin users see admin commands in /help."""
    mock_limiter.is_allowed.return_value = True
    mock_client.get_status = AsyncMock(return_value=None)

    update = _make_update()
    context = _make_context()

    await help_handler(update, context)

    call_text = update.message.reply_text.call_args[0][0]
    assert "/admin_stats" in call_text
    assert "/admin_users" in call_text
    assert "/admin_broadcast" in call_text
