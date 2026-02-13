"""Daily auto-insight command handlers for the NPS Telegram bot.

Commands: /daily_on, /daily_off, /daily_time, /daily_status
"""

import logging
import re

from telegram import Update
from telegram.ext import ContextTypes

from .. import client, config
from ..i18n import t
from ..rate_limiter import rate_limiter

logger = logging.getLogger(__name__)

_TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")

# Bot-level client for daily preference API calls
_API_BASE = config.API_BASE_URL


async def _get_locale(chat_id: int) -> str:
    """Get user locale from linked account, default 'en'."""
    status = await client.get_status(chat_id)
    if status and status.get("locale"):
        return status["locale"]
    return "en"


async def _api_get_preferences(chat_id: int) -> dict | None:
    """GET /telegram/daily/preferences/{chat_id} via bot service client."""
    http = await client.get_client()
    try:
        resp = await http.get(f"/telegram/daily/preferences/{chat_id}")
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception:
        logger.exception("Failed to get daily preferences for %s", chat_id)
        return None


async def _api_update_preferences(chat_id: int, data: dict) -> dict | None:
    """PUT /telegram/daily/preferences/{chat_id} via bot service client."""
    http = await client.get_client()
    try:
        resp = await http.put(f"/telegram/daily/preferences/{chat_id}", json=data)
        if resp.status_code == 200:
            return resp.json()
        logger.warning("Update preferences failed: %d %s", resp.status_code, resp.text)
        return None
    except Exception:
        logger.exception("Failed to update daily preferences for %s", chat_id)
        return None


def _format_tz(offset_minutes: int) -> str:
    """Format timezone offset minutes as UTC+H:MM or UTC-H:MM."""
    sign = "+" if offset_minutes >= 0 else "-"
    total = abs(offset_minutes)
    hours = total // 60
    mins = total % 60
    if mins:
        return f"UTC{sign}{hours}:{mins:02d}"
    return f"UTC{sign}{hours}"


async def daily_on_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /daily_on -- enable daily insight delivery."""
    chat_id = update.effective_chat.id

    if not rate_limiter.is_allowed(chat_id):
        locale = await _get_locale(chat_id)
        await update.message.reply_text(t("rate_limited", locale))
        return

    locale = await _get_locale(chat_id)

    try:
        result = await _api_update_preferences(chat_id, {"daily_enabled": True})
        if result:
            delivery_time = result.get("delivery_time", "08:00")
            tz = _format_tz(result.get("timezone_offset_minutes", 0))
            await update.message.reply_text(
                t("daily_on_success", locale, time=delivery_time, tz=tz)
            )
        else:
            await update.message.reply_text(t("error_generic", locale))
    except Exception:
        logger.exception("Error in daily_on_handler")
        await update.message.reply_text(t("error_generic", locale))


async def daily_off_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /daily_off -- disable daily insight delivery."""
    chat_id = update.effective_chat.id

    if not rate_limiter.is_allowed(chat_id):
        locale = await _get_locale(chat_id)
        await update.message.reply_text(t("rate_limited", locale))
        return

    locale = await _get_locale(chat_id)

    try:
        result = await _api_update_preferences(chat_id, {"daily_enabled": False})
        if result:
            await update.message.reply_text(t("daily_off_success", locale))
        else:
            await update.message.reply_text(t("error_generic", locale))
    except Exception:
        logger.exception("Error in daily_off_handler")
        await update.message.reply_text(t("error_generic", locale))


async def daily_time_handler(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Handle /daily_time HH:MM -- set preferred delivery time."""
    chat_id = update.effective_chat.id

    if not rate_limiter.is_allowed(chat_id):
        locale = await _get_locale(chat_id)
        await update.message.reply_text(t("rate_limited", locale))
        return

    locale = await _get_locale(chat_id)
    args = context.args or []

    if not args:
        await update.message.reply_text(t("daily_time_usage", locale))
        return

    time_str = args[0]
    if not _TIME_PATTERN.match(time_str):
        await update.message.reply_text(t("daily_time_invalid", locale))
        return

    try:
        result = await _api_update_preferences(chat_id, {"delivery_time": time_str})
        if result:
            await update.message.reply_text(
                t("daily_time_success", locale, time=time_str)
            )
        else:
            await update.message.reply_text(t("error_generic", locale))
    except Exception:
        logger.exception("Error in daily_time_handler")
        await update.message.reply_text(t("error_generic", locale))


async def daily_status_handler(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Handle /daily_status -- show current daily settings."""
    chat_id = update.effective_chat.id

    if not rate_limiter.is_allowed(chat_id):
        locale = await _get_locale(chat_id)
        await update.message.reply_text(t("rate_limited", locale))
        return

    locale = await _get_locale(chat_id)

    try:
        prefs = await _api_get_preferences(chat_id)
        if not prefs:
            await update.message.reply_text(t("daily_status_not_setup", locale))
            return

        enabled = prefs.get("daily_enabled", False)
        status_text = "Enabled" if enabled else "Disabled"
        delivery_time = prefs.get("delivery_time", "08:00")
        tz = _format_tz(prefs.get("timezone_offset_minutes", 0))
        last = prefs.get("last_delivered_date") or "Never"

        await update.message.reply_text(
            t(
                "daily_status_header",
                locale,
                status=status_text,
                time=delivery_time,
                tz=tz,
                last=last,
            )
        )
    except Exception:
        logger.exception("Error in daily_status_handler")
        await update.message.reply_text(t("error_generic", locale))
