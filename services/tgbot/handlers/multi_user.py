"""Multi-user compare handler for the NPS Telegram bot.

Command: /compare <name1> <name2> [name3...] (2-5 profiles)
Supports: simple space-separated, quoted names, comma-separated.
"""

import logging
import re

import httpx
from telegram import Update
from telegram.error import BadRequest
from telegram.ext import ContextTypes

from .. import client
from ..api_client import NPSAPIClient
from ..formatters import format_multi_user_reading
from ..i18n import t
from ..keyboards import compare_actions_keyboard
from ..rate_limiter import rate_limiter
from ..reading_rate_limiter import ReadingRateLimiter

logger = logging.getLogger(__name__)

_MIN_PROFILES = 2
_MAX_PROFILES = 5


def _parse_profile_names(args: list[str]) -> list[str]:
    """Parse profile names from command arguments.

    Supports three styles:
    1. Quoted: /compare "Ali Rezaei" "Sara Ahmadi"
    2. Comma-separated: /compare Ali Rezaei, Sara Ahmadi
    3. Simple: /compare Ali Sara Bob
    """
    raw = " ".join(args)

    # Style 1: quoted names
    quoted = re.findall(r'"([^"]+)"', raw)
    if quoted:
        return [n.strip() for n in quoted if n.strip()]

    # Style 2: comma-separated
    if "," in raw:
        return [n.strip() for n in raw.split(",") if n.strip()]

    # Style 3: each arg is a name
    return [a.strip() for a in args if a.strip()]


async def _get_locale(chat_id: int) -> str:
    """Get user locale from linked account, default 'en'."""
    status = await client.get_status(chat_id)
    if status and status.get("locale"):
        return status["locale"]
    return "en"


async def compare_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /compare — multi-user compatibility reading."""
    chat_id = update.effective_chat.id

    if not rate_limiter.is_allowed(chat_id):
        await update.message.reply_text(t("rate_limited", "en"))
        return

    locale = await _get_locale(chat_id)

    # Check account linking
    status = await client.get_status(chat_id)
    if not status or not status.get("linked"):
        await update.message.reply_text(t("link_required", locale))
        return

    api_key = status.get("api_key")
    if not api_key:
        await update.message.reply_text(t("link_required", locale))
        return

    args = context.args or []
    if not args:
        await update.message.reply_text(t("compare_need_profiles", locale))
        return

    names = _parse_profile_names(args)

    if len(names) < _MIN_PROFILES:
        await update.message.reply_text(t("compare_need_profiles", locale))
        return

    if len(names) > _MAX_PROFILES:
        await update.message.reply_text(t("compare_too_many", locale, count=len(names)))
        return

    # Check duplicates (case-insensitive)
    seen: set[str] = set()
    for name in names:
        lower = name.lower()
        if lower in seen:
            await update.message.reply_text(t("compare_duplicate", locale, name=name))
            return
        seen.add(lower)

    # Reading rate limit
    reading_rl: ReadingRateLimiter | None = context.bot_data.get("reading_rate_limiter")
    if reading_rl:
        allowed, wait_seconds = reading_rl.check(chat_id)
        if not allowed:
            minutes = max(1, wait_seconds // 60)
            await update.message.reply_text(
                t("rate_limit_reading", locale, minutes=minutes)
            )
            return

    msg = await update.message.reply_text(t("compare_resolving", locale))

    api = NPSAPIClient(api_key)
    try:
        # Resolve profile names to user IDs
        user_ids: list[int] = []
        profile_names: list[str] = []

        for name in names:
            result = await api.search_profiles(name)
            if not result.success or not result.data:
                await msg.edit_text(t("compare_profile_not_found", locale, name=name))
                return

            profiles = (
                result.data
                if isinstance(result.data, list)
                else result.data.get("profiles", [])
            )
            if not profiles:
                await msg.edit_text(t("compare_profile_not_found", locale, name=name))
                return

            user_ids.append(profiles[0].get("user_id", profiles[0].get("id", 0)))
            profile_names.append(profiles[0].get("name", name))

        await msg.edit_text(t("compare_generating", locale))

        # Generate multi-user reading
        result = await api.create_multi_user_reading(user_ids)
        if not result.success:
            error_key = api.classify_error(result)
            detail = result.error or ""
            await msg.edit_text(t(error_key, locale, detail=detail))
            return

        # Record reading
        if reading_rl:
            reading_rl.record(chat_id)

        text = format_multi_user_reading(result.data, profile_names)
        keyboard = compare_actions_keyboard()
        try:
            await msg.edit_text(text, parse_mode="MarkdownV2", reply_markup=keyboard)
        except BadRequest:
            # Fallback: send without Markdown
            await msg.edit_text(t("reading_complete", locale))

    except (httpx.ConnectError, httpx.TimeoutException):
        await msg.edit_text(t("error_network", locale))
    except Exception:
        logger.exception("Error in compare_command")
        await msg.edit_text(t("error_generic", locale))
    finally:
        await api.close()
