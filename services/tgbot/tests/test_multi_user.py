"""Tests for the multi-user /compare command handler."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from services.tgbot.api_client import APIResponse
from services.tgbot.handlers.multi_user import _parse_profile_names, compare_command

# ─── Name parsing tests ─────────────────────────────────────────────────────


def test_parse_quoted_names():
    """Quoted names are parsed correctly."""
    result = _parse_profile_names(['"Ali Rezaei"', '"Sara Ahmadi"'])
    assert result == ["Ali Rezaei", "Sara Ahmadi"]


def test_parse_comma_separated():
    """Comma-separated names are parsed correctly."""
    result = _parse_profile_names(["Ali", "Rezaei,", "Sara", "Ahmadi"])
    assert result == ["Ali Rezaei", "Sara Ahmadi"]


def test_parse_simple_names():
    """Simple space-separated names are parsed as individual names."""
    result = _parse_profile_names(["Ali", "Sara", "Bob"])
    assert result == ["Ali", "Sara", "Bob"]


# ─── Validation tests ───────────────────────────────────────────────────────


def _make_update(chat_id: int = 12345):
    update = MagicMock()
    update.effective_chat.id = chat_id
    update.effective_user.username = "testuser"
    update.message.reply_text = AsyncMock(return_value=MagicMock(edit_text=AsyncMock()))
    update.message.message_id = 999
    return update


def _make_context(args: list[str] | None = None):
    context = MagicMock()
    context.args = args
    context.bot.send_message = AsyncMock()
    context.bot_data = {}
    return context


@pytest.mark.asyncio
@patch("services.tgbot.handlers.multi_user.client")
@patch("services.tgbot.handlers.multi_user.rate_limiter")
async def test_reject_single_name(mock_limiter, mock_client):
    """Single name shows need-profiles error."""
    mock_limiter.is_allowed.return_value = True
    mock_client.get_status = AsyncMock(
        return_value={"linked": True, "api_key": "test-key-1234567890123456"}
    )

    update = _make_update()
    context = _make_context(args=["Ali"])

    await compare_command(update, context)

    call_text = update.message.reply_text.call_args[0][0]
    assert "2-5" in call_text or "profiles" in call_text.lower()


@pytest.mark.asyncio
@patch("services.tgbot.handlers.multi_user.client")
@patch("services.tgbot.handlers.multi_user.rate_limiter")
async def test_reject_too_many(mock_limiter, mock_client):
    """More than 5 names shows too-many error."""
    mock_limiter.is_allowed.return_value = True
    mock_client.get_status = AsyncMock(
        return_value={"linked": True, "api_key": "test-key-1234567890123456"}
    )

    update = _make_update()
    context = _make_context(args=["A", "B", "C", "D", "E", "F"])

    await compare_command(update, context)

    call_text = update.message.reply_text.call_args[0][0]
    assert "5" in call_text or "Maximum" in call_text


@pytest.mark.asyncio
@patch("services.tgbot.handlers.multi_user.client")
@patch("services.tgbot.handlers.multi_user.rate_limiter")
async def test_reject_duplicate_names(mock_limiter, mock_client):
    """Duplicate names (case-insensitive) are rejected."""
    mock_limiter.is_allowed.return_value = True
    mock_client.get_status = AsyncMock(
        return_value={"linked": True, "api_key": "test-key-1234567890123456"}
    )

    update = _make_update()
    context = _make_context(args=["Ali", "ali"])

    await compare_command(update, context)

    call_text = update.message.reply_text.call_args[0][0]
    assert "Duplicate" in call_text or "duplicate" in call_text.lower()


@pytest.mark.asyncio
@patch("services.tgbot.handlers.multi_user.NPSAPIClient")
@patch("services.tgbot.handlers.multi_user.client")
@patch("services.tgbot.handlers.multi_user.rate_limiter")
async def test_profile_not_found(mock_limiter, mock_client, mock_api_cls):
    """Non-existent profile shows not-found error."""
    mock_limiter.is_allowed.return_value = True
    mock_client.get_status = AsyncMock(
        return_value={"linked": True, "api_key": "test-key-1234567890123456"}
    )

    mock_api = AsyncMock()
    mock_api.search_profiles = AsyncMock(
        return_value=APIResponse(success=True, data={"profiles": []}, status_code=200)
    )
    mock_api.close = AsyncMock()
    mock_api_cls.return_value = mock_api

    update = _make_update()
    msg_mock = MagicMock(edit_text=AsyncMock())
    update.message.reply_text = AsyncMock(return_value=msg_mock)
    context = _make_context(args=["Ali", "Nobody"])

    await compare_command(update, context)

    # Should report not found for one of the profiles
    edit_calls = msg_mock.edit_text.call_args_list
    assert any(
        "not found" in str(c).lower() or "not found" in str(c) for c in edit_calls
    )


@pytest.mark.asyncio
@patch("services.tgbot.handlers.multi_user.NPSAPIClient")
@patch("services.tgbot.handlers.multi_user.client")
@patch("services.tgbot.handlers.multi_user.rate_limiter")
async def test_compare_success(mock_limiter, mock_client, mock_api_cls):
    """Successful compare calls multi-user reading API."""
    mock_limiter.is_allowed.return_value = True
    mock_client.get_status = AsyncMock(
        return_value={"linked": True, "api_key": "test-key-1234567890123456"}
    )

    mock_api = AsyncMock()
    mock_api.search_profiles = AsyncMock(
        side_effect=[
            APIResponse(
                success=True,
                data={"profiles": [{"id": 1, "name": "Ali"}]},
                status_code=200,
            ),
            APIResponse(
                success=True,
                data={"profiles": [{"id": 2, "name": "Sara"}]},
                status_code=200,
            ),
        ]
    )
    mock_api.create_multi_user_reading = AsyncMock(
        return_value=APIResponse(
            success=True,
            data={
                "individuals": [
                    {"name": "Ali", "life_path": 5, "personal_year": 3},
                    {"name": "Sara", "life_path": 7, "personal_year": 1},
                ],
                "pairwise": [
                    {
                        "name1": "Ali",
                        "name2": "Sara",
                        "score": 72,
                        "summary": "Good match",
                    }
                ],
                "group_dynamics": {"energy_type": "Creative", "harmony_score": 65},
                "ai_interpretation": "Test interpretation",
            },
            status_code=200,
        )
    )
    mock_api.close = AsyncMock()
    mock_api_cls.return_value = mock_api

    update = _make_update()
    msg_mock = MagicMock(edit_text=AsyncMock())
    update.message.reply_text = AsyncMock(return_value=msg_mock)
    context = _make_context(args=["Ali", "Sara"])

    await compare_command(update, context)

    mock_api.create_multi_user_reading.assert_called_once_with([1, 2])


@pytest.mark.asyncio
@patch("services.tgbot.handlers.multi_user.client")
@patch("services.tgbot.handlers.multi_user.rate_limiter")
async def test_unlinked_user_rejected(mock_limiter, mock_client):
    """Unlinked user gets link-required message."""
    mock_limiter.is_allowed.return_value = True
    mock_client.get_status = AsyncMock(return_value={"linked": False})

    update = _make_update()
    context = _make_context(args=["Ali", "Sara"])

    await compare_command(update, context)

    call_text = update.message.reply_text.call_args[0][0]
    assert "link" in call_text.lower()


@pytest.mark.asyncio
@patch("services.tgbot.handlers.multi_user.client")
@patch("services.tgbot.handlers.multi_user.rate_limiter")
async def test_no_args_shows_usage(mock_limiter, mock_client):
    """No arguments shows usage message."""
    mock_limiter.is_allowed.return_value = True
    mock_client.get_status = AsyncMock(
        return_value={"linked": True, "api_key": "test-key-1234567890123456"}
    )

    update = _make_update()
    context = _make_context(args=[])

    await compare_command(update, context)

    call_text = update.message.reply_text.call_args[0][0]
    assert "2-5" in call_text or "/compare" in call_text
