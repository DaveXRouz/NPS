"""Reading command handlers for the NPS Telegram bot.

Commands: /time, /name, /question, /daily, /history
Callback queries: reading:*, history:*
"""

import logging
import re

import httpx
from telegram import Update
from telegram.error import BadRequest
from telegram.ext import ContextTypes

from .. import client
from ..api_client import NPSAPIClient
from ..formatters import (
    format_daily_insight,
    format_history_list,
    format_name_reading,
    format_question_reading,
    format_time_reading,
    _escape,
)
from ..i18n import t
from ..keyboards import (
    history_keyboard,
    reading_actions_keyboard,
    reading_type_keyboard,
)
from ..progress import update_progress
from ..rate_limiter import rate_limiter
from ..reading_rate_limiter import ReadingRateLimiter

logger = logging.getLogger(__name__)


# ---- Helpers ----------------------------------------------------------------


async def _get_locale(chat_id: int) -> str:
    """Get user locale from linked account, default 'en'."""
    status = await client.get_status(chat_id)
    if status and status.get("locale"):
        return status["locale"]
    return "en"


async def _get_user_api_key(chat_id: int) -> str | None:
    """Retrieve the linked API key for a Telegram chat ID."""
    status_data = await client.get_status(chat_id)
    if status_data and status_data.get("linked"):
        return status_data.get("api_key")
    return None


def build_iso_datetime(time_str: str | None, date_str: str | None) -> str | None:
    """Build ISO 8601 datetime string from time and optional date."""
    from datetime import date as date_type

    if time_str is None:
        return None
    if date_str is None:
        date_str = date_type.today().isoformat()
    return f"{date_str}T{time_str}:00"


async def _send_error(update: Update, text: str) -> None:
    """Send a plain text error message."""
    if update.message:
        await update.message.reply_text(text)
    elif update.callback_query:
        await update.callback_query.answer(text, show_alert=True)


async def _require_linked(update: Update, locale: str = "en") -> str | None:
    """Check if user is linked and return API key, or send error."""
    chat_id = update.effective_chat.id
    api_key = await _get_user_api_key(chat_id)
    if not api_key:
        await _send_error(update, t("link_required", locale))
        return None
    return api_key


def _check_reading_rate(
    chat_id: int, context: ContextTypes.DEFAULT_TYPE
) -> tuple[bool, int]:
    """Check reading rate limit from bot_data. Returns (allowed, wait_seconds)."""
    reading_rl: ReadingRateLimiter | None = context.bot_data.get("reading_rate_limiter")
    if reading_rl:
        return reading_rl.check(chat_id)
    return True, 0


def _record_reading(chat_id: int, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Record a reading in the rate limiter."""
    reading_rl: ReadingRateLimiter | None = context.bot_data.get("reading_rate_limiter")
    if reading_rl:
        reading_rl.record(chat_id)


async def handle_api_error(msg, result, locale: str, api_client: NPSAPIClient) -> None:
    """Handle an API error with locale-aware messaging."""
    error_key = api_client.classify_error(result)
    detail = result.error or ""
    error_emojis = {
        "error_auth": "\u274c",
        "error_not_found": "\U0001f50d",
        "error_validation": "\u26a0\ufe0f",
        "error_rate_limit_api": "\u23f3",
        "error_server": "\U0001f6d1",
        "error_network": "\U0001f4e1",
        "error_generic": "\u2753",
    }
    emoji = error_emojis.get(error_key, "\u2753")
    text = f"{emoji} {t(error_key, locale, detail=detail)}"
    await msg.edit_text(text)


# ---- Command Handlers -------------------------------------------------------


async def time_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Generate a time-based oracle reading.

    Usage: /time [HH:MM] [YYYY-MM-DD]
    """
    chat_id = update.effective_chat.id

    if not rate_limiter.is_allowed(chat_id):
        locale = await _get_locale(chat_id)
        await update.message.reply_text(t("rate_limited", locale))
        return

    locale = await _get_locale(chat_id)
    api_key = await _require_linked(update, locale)
    if not api_key:
        return

    allowed, wait_seconds = _check_reading_rate(chat_id, context)
    if not allowed:
        minutes = max(1, wait_seconds // 60)
        await update.message.reply_text(
            t("rate_limit_reading", locale, minutes=minutes)
        )
        return

    args = context.args or []
    time_str = args[0] if args else None
    date_str = args[1] if len(args) > 1 else None

    if time_str and not re.match(r"^\d{2}:\d{2}$", time_str):
        await update.message.reply_text(
            "Invalid time format. Use HH:MM (e.g., /time 14:30)"
        )
        return

    if date_str and not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        await update.message.reply_text(
            "Invalid date format. Use YYYY-MM-DD (e.g., /time 14:30 2026-02-10)"
        )
        return

    msg = await update.message.reply_text("\u23f3 " + t("progress_calculating", locale))
    api = NPSAPIClient(api_key)
    try:
        await update_progress(msg, 1, 4, t("progress_calculating", locale))
        iso_dt = build_iso_datetime(time_str, date_str)
        result = await api.create_reading(iso_dt)
        if not result.success:
            await handle_api_error(msg, result, locale, api)
            return
        _record_reading(chat_id, context)
        await update_progress(msg, 2, 4, t("progress_ai", locale))
        await update_progress(msg, 3, 4, t("progress_formatting", locale))
        text = format_time_reading(result.data)
        keyboard = reading_actions_keyboard(result.data.get("reading_id"))
        await msg.edit_text(text, parse_mode="MarkdownV2", reply_markup=keyboard)
    except BadRequest as e:
        if "can't parse entities" in str(e).lower():
            plain = (
                result.data.get("summary", t("reading_complete", locale))
                if result.success
                else t("error_generic", locale)
            )
            await msg.edit_text(str(plain))
        else:
            logger.exception("BadRequest in time_command")
            await msg.edit_text(t("error_generic", locale))
    except (httpx.ConnectError, httpx.TimeoutException):
        await msg.edit_text(t("error_network", locale))
    except Exception:
        logger.exception("Error in time_command")
        await msg.edit_text(t("error_generic", locale))
    finally:
        await api.close()


async def name_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Generate a name-based oracle reading.

    Usage: /name [name]
    """
    chat_id = update.effective_chat.id

    if not rate_limiter.is_allowed(chat_id):
        locale = await _get_locale(chat_id)
        await update.message.reply_text(t("rate_limited", locale))
        return

    locale = await _get_locale(chat_id)
    api_key = await _require_linked(update, locale)
    if not api_key:
        return

    allowed, wait_seconds = _check_reading_rate(chat_id, context)
    if not allowed:
        minutes = max(1, wait_seconds // 60)
        await update.message.reply_text(
            t("rate_limit_reading", locale, minutes=minutes)
        )
        return

    args = context.args or []
    name = " ".join(args) if args else None

    if not name:
        profiles = await client.get_profile(chat_id)
        if profiles:
            name = profiles[0].get("name")
        if not name:
            await update.message.reply_text(
                "Usage: /name <name>\n"
                "Or create an Oracle profile in the web app to use /name without arguments."
            )
            return

    msg = await update.message.reply_text("\u23f3 " + t("progress_calculating", locale))
    api = NPSAPIClient(api_key)
    try:
        await update_progress(msg, 1, 3, t("progress_calculating", locale))
        result = await api.create_name_reading(name)
        if not result.success:
            await handle_api_error(msg, result, locale, api)
            return
        _record_reading(chat_id, context)
        await update_progress(msg, 2, 3, t("progress_formatting", locale))
        text = format_name_reading(result.data)
        keyboard = reading_actions_keyboard(result.data.get("reading_id"))
        await msg.edit_text(text, parse_mode="MarkdownV2", reply_markup=keyboard)
    except BadRequest as e:
        if "can't parse entities" in str(e).lower():
            await msg.edit_text(t("reading_complete", locale))
        else:
            logger.exception("BadRequest in name_command")
            await msg.edit_text(t("error_generic", locale))
    except (httpx.ConnectError, httpx.TimeoutException):
        await msg.edit_text(t("error_network", locale))
    except Exception:
        logger.exception("Error in name_command")
        await msg.edit_text(t("error_generic", locale))
    finally:
        await api.close()


async def question_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Generate a question-based oracle reading.

    Usage: /question <your question here>
    """
    chat_id = update.effective_chat.id

    if not rate_limiter.is_allowed(chat_id):
        locale = await _get_locale(chat_id)
        await update.message.reply_text(t("rate_limited", locale))
        return

    locale = await _get_locale(chat_id)
    api_key = await _require_linked(update, locale)
    if not api_key:
        return

    allowed, wait_seconds = _check_reading_rate(chat_id, context)
    if not allowed:
        minutes = max(1, wait_seconds // 60)
        await update.message.reply_text(
            t("rate_limit_reading", locale, minutes=minutes)
        )
        return

    args = context.args or []
    question_text = " ".join(args) if args else ""

    if not question_text.strip():
        await update.message.reply_text(
            "Usage: /question What does today hold?\n"
            "Provide a question after the command."
        )
        return

    msg = await update.message.reply_text("\u23f3 " + t("progress_ai", locale))
    api = NPSAPIClient(api_key)
    try:
        await update_progress(msg, 1, 3, t("progress_ai", locale))
        result = await api.create_question(question_text)
        if not result.success:
            await handle_api_error(msg, result, locale, api)
            return
        _record_reading(chat_id, context)
        await update_progress(msg, 2, 3, t("progress_formatting", locale))
        text = format_question_reading(result.data)
        keyboard = reading_actions_keyboard(result.data.get("reading_id"))
        await msg.edit_text(text, parse_mode="MarkdownV2", reply_markup=keyboard)
    except BadRequest as e:
        if "can't parse entities" in str(e).lower():
            await msg.edit_text(t("reading_complete", locale))
        else:
            logger.exception("BadRequest in question_command")
            await msg.edit_text(t("error_generic", locale))
    except (httpx.ConnectError, httpx.TimeoutException):
        await msg.edit_text(t("error_network", locale))
    except Exception:
        logger.exception("Error in question_command")
        await msg.edit_text(t("error_generic", locale))
    finally:
        await api.close()


async def daily_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Get today's daily insight.

    Usage: /daily
    """
    chat_id = update.effective_chat.id

    if not rate_limiter.is_allowed(chat_id):
        locale = await _get_locale(chat_id)
        await update.message.reply_text(t("rate_limited", locale))
        return

    locale = await _get_locale(chat_id)
    api_key = await _require_linked(update, locale)
    if not api_key:
        return

    msg = await update.message.reply_text(
        "\U0001f31f " + t("progress_calculating", locale)
    )
    api = NPSAPIClient(api_key)
    try:
        result = await api.get_daily()
        if not result.success:
            await handle_api_error(msg, result, locale, api)
            return
        text = format_daily_insight(result.data)
        await msg.edit_text(text, parse_mode="MarkdownV2")
    except BadRequest as e:
        if "can't parse entities" in str(e).lower():
            insight = (
                result.data.get("insight", t("reading_complete", locale))
                if result.success
                else t("error_generic", locale)
            )
            await msg.edit_text(str(insight))
        else:
            logger.exception("BadRequest in daily_command")
            await msg.edit_text(t("error_generic", locale))
    except (httpx.ConnectError, httpx.TimeoutException):
        await msg.edit_text(t("error_network", locale))
    except Exception:
        logger.exception("Error in daily_command")
        await msg.edit_text(t("error_generic", locale))
    finally:
        await api.close()


async def history_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show reading history.

    Usage: /history
    """
    chat_id = update.effective_chat.id

    if not rate_limiter.is_allowed(chat_id):
        locale = await _get_locale(chat_id)
        await update.message.reply_text(t("rate_limited", locale))
        return

    locale = await _get_locale(chat_id)
    api_key = await _require_linked(update, locale)
    if not api_key:
        return

    msg = await update.message.reply_text(
        "\U0001f4dc " + t("progress_calculating", locale)
    )
    api = NPSAPIClient(api_key)
    try:
        result = await api.list_readings(limit=5, offset=0)
        if not result.success:
            await handle_api_error(msg, result, locale, api)
            return
        readings = result.data.get("readings", [])
        total = result.data.get("total", 0)
        text = format_history_list(readings, total)
        has_more = total > 5
        keyboard = history_keyboard(readings, has_more, current_offset=0)
        await msg.edit_text(text, parse_mode="MarkdownV2", reply_markup=keyboard)
    except BadRequest as e:
        if "can't parse entities" in str(e).lower():
            await msg.edit_text(t("reading_complete", locale))
        else:
            logger.exception("BadRequest in history_command")
            await msg.edit_text(t("error_generic", locale))
    except (httpx.ConnectError, httpx.TimeoutException):
        await msg.edit_text(t("error_network", locale))
    except Exception:
        logger.exception("Error in history_command")
        await msg.edit_text(t("error_generic", locale))
    finally:
        await api.close()


# ---- Callback Query Handler -------------------------------------------------


async def reading_callback_handler(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Handle inline keyboard callbacks for reading:* and history:* patterns."""
    query = update.callback_query
    await query.answer()

    data = query.data or ""
    chat_id = update.effective_chat.id

    api_key = await _get_user_api_key(chat_id)
    if not api_key:
        locale = await _get_locale(chat_id)
        await query.edit_message_text(t("link_required", locale))
        return

    parts = data.split(":")
    if len(parts) < 2:
        return

    category = parts[0]
    action = parts[1]
    value = parts[2] if len(parts) > 2 else ""

    api = NPSAPIClient(api_key)
    try:
        if category == "reading":
            await _handle_reading_callback(query, api, action, value)
        elif category == "history":
            await _handle_history_callback(query, api, action, value)
    except Exception:
        logger.exception("Error in callback handler for %s", data)
        try:
            await query.edit_message_text(t("error_generic", "en"))
        except BadRequest:
            pass
    finally:
        await api.close()


async def _handle_reading_callback(query, api, action, value):
    """Handle reading:* callback queries."""
    if action == "details" and value:
        reading_id = int(value)
        result = await api.get_reading(reading_id)
        if result.success:
            reading_result = result.data.get("reading_result", {})
            sign_type = result.data.get("sign_type", "reading")
            if sign_type == "question":
                text = format_question_reading(reading_result)
            elif sign_type == "name":
                text = format_name_reading(reading_result)
            else:
                text = format_time_reading(reading_result)
            try:
                await query.edit_message_text(
                    text,
                    parse_mode="MarkdownV2",
                    reply_markup=reading_actions_keyboard(reading_id),
                )
            except BadRequest:
                await query.edit_message_text(t("reading_complete", "en"))
        else:
            await query.edit_message_text(f"\u274c {result.error}")

    elif action == "rate" and value:
        logger.info("User wants to rate reading %s", value)
        await query.edit_message_text(
            _escape("Rating feature coming soon!"),
            parse_mode="MarkdownV2",
        )

    elif action == "share" and value:
        if value == "compare":
            await query.edit_message_text(
                _escape("Share feature for comparisons coming soon!"),
                parse_mode="MarkdownV2",
            )
            return
        reading_id = int(value)
        result = await api.get_reading(reading_id)
        if result.success:
            sign_type = result.data.get("sign_type", "reading")
            sign_value = result.data.get("sign_value", "")
            ai = result.data.get("ai_interpretation", "No interpretation available.")
            share_text = f"NPS Oracle {sign_type.title()} Reading: {sign_value}\n\n{ai}"
            await query.edit_message_text(
                _escape(share_text[:_SHARE_TEXT_LIMIT]),
                parse_mode="MarkdownV2",
            )
        else:
            await query.edit_message_text(f"\u274c {result.error}")

    elif action == "new":
        await query.edit_message_text(
            _escape("Choose a reading type:"),
            parse_mode="MarkdownV2",
            reply_markup=reading_type_keyboard(),
        )

    elif action == "type" and value:
        type_hints = {
            "time": "Use: /time [HH:MM] [YYYY-MM-DD]",
            "question": "Use: /question <your question>",
            "name": "Use: /name <name>",
            "daily": "Use: /daily",
        }
        hint = type_hints.get(value, "Unknown reading type.")
        await query.edit_message_text(_escape(hint), parse_mode="MarkdownV2")


async def _handle_history_callback(query, api, action, value):
    """Handle history:* callback queries."""
    if action == "view" and value:
        reading_id = int(value)
        result = await api.get_reading(reading_id)
        if result.success:
            reading_result = result.data.get("reading_result", {})
            sign_type = result.data.get("sign_type", "reading")
            if sign_type == "question":
                text = format_question_reading(reading_result)
            elif sign_type == "name":
                text = format_name_reading(reading_result)
            else:
                text = format_time_reading(reading_result)
            try:
                await query.edit_message_text(
                    text,
                    parse_mode="MarkdownV2",
                    reply_markup=reading_actions_keyboard(reading_id),
                )
            except BadRequest:
                await query.edit_message_text(t("reading_complete", "en"))
        else:
            await query.edit_message_text(f"\u274c {result.error}")

    elif action == "more" and value:
        offset = int(value)
        result = await api.list_readings(limit=5, offset=offset)
        if result.success:
            readings = result.data.get("readings", [])
            total = result.data.get("total", 0)
            text = format_history_list(readings, total)
            has_more = offset + 5 < total
            keyboard = history_keyboard(readings, has_more, current_offset=offset)
            try:
                await query.edit_message_text(
                    text, parse_mode="MarkdownV2", reply_markup=keyboard
                )
            except BadRequest:
                await query.edit_message_text(t("reading_complete", "en"))
        else:
            await query.edit_message_text(f"\u274c {result.error}")


# Share text limit (under Telegram's 4096 char limit)
_SHARE_TEXT_LIMIT = 3800
