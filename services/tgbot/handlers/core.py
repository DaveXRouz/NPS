"""Core command handlers for the NPS Telegram bot."""

import logging
import re

from telegram import Update
from telegram.ext import ContextTypes

from .. import client
from ..i18n import t
from ..rate_limiter import rate_limiter

logger = logging.getLogger(__name__)

_API_KEY_PATTERN = re.compile(r"^[A-Za-z0-9\-_]{20,100}$")


async def _get_locale(chat_id: int) -> str:
    """Get user locale from linked account, default 'en'."""
    status = await client.get_status(chat_id)
    if status and status.get("locale"):
        return status["locale"]
    return "en"


async def _check_rate_limit(update: Update) -> bool:
    """Check rate limit. Returns True if allowed, False if rate-limited."""
    chat_id = update.effective_chat.id
    if not rate_limiter.is_allowed(chat_id):
        locale = await _get_locale(chat_id)
        await update.message.reply_text(t("rate_limited", locale))
        return False
    return True


async def _is_admin(chat_id: int) -> bool:
    """Check if the user has admin role."""
    http = await client.get_client()
    try:
        resp = await http.get(f"/telegram/status/{chat_id}")
        if resp.status_code == 200:
            data = resp.json()
            return data.get("linked", False) and data.get("role") == "admin"
        return False
    except Exception:
        return False


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command -- welcome message."""
    if not await _check_rate_limit(update):
        return

    chat_id = update.effective_chat.id
    locale = await _get_locale(chat_id)

    try:
        await update.message.reply_text(t("welcome", locale))
    except Exception:
        logger.exception("Error in start_handler")
        await update.message.reply_text(t("error_generic", locale))


async def link_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /link <api_key> -- account linking."""
    if not await _check_rate_limit(update):
        return

    chat_id = update.effective_chat.id
    username = update.effective_user.username if update.effective_user else None
    locale = await _get_locale(chat_id)

    # Delete the message containing the API key for security
    try:
        await context.bot.delete_message(
            chat_id=chat_id, message_id=update.message.message_id
        )
    except Exception:
        logger.debug("Could not delete /link message (bot may lack permission)")

    if not context.args:
        await context.bot.send_message(
            chat_id=chat_id,
            text=t("link_usage", locale),
        )
        return

    api_key = context.args[0]

    # Validate API key format before sending to API
    if not _API_KEY_PATTERN.match(api_key):
        await context.bot.send_message(
            chat_id=chat_id,
            text=t("link_invalid_format", locale),
        )
        return

    try:
        result = await client.link_account(chat_id, username, api_key)

        if result:
            nps_username = result.get("username", "user")
            await context.bot.send_message(
                chat_id=chat_id,
                text=t("link_success", locale, name=nps_username),
            )
        else:
            await context.bot.send_message(
                chat_id=chat_id,
                text=t("link_failed", locale),
            )
    except Exception:
        logger.exception("Error in link_handler")
        await context.bot.send_message(
            chat_id=chat_id,
            text=t("error_generic", locale),
        )


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /help [command] -- grouped help or per-command detail."""
    if not await _check_rate_limit(update):
        return

    chat_id = update.effective_chat.id
    locale = await _get_locale(chat_id)

    try:
        # Per-command help: /help time
        if context.args:
            cmd = context.args[0].lstrip("/").lower()
            detail_key = f"help_detail_{cmd}"
            detail = t(detail_key, locale)
            # If the key wasn't found, t() returns the key itself
            if detail == detail_key:
                await update.message.reply_text(
                    t("help_no_detail", locale, command=cmd)
                )
            else:
                await update.message.reply_text(detail)
            return

        # Full help -- grouped categories
        lines: list[str] = []
        lines.append(t("help_title", locale))
        lines.append("")

        # Getting Started
        lines.append(f"\U0001f680 {t('help_getting_started', locale)}")
        for cmd in ("start", "link", "status", "help"):
            lines.append(f"  {t(f'help_cmd_{cmd}', locale)}")
        lines.append("")

        # Readings
        lines.append(f"\U0001f52e {t('help_readings', locale)}")
        for cmd in (
            "profile",
            "time",
            "name",
            "question",
            "daily",
            "history",
            "compare",
        ):
            lines.append(f"  {t(f'help_cmd_{cmd}', locale)}")
        lines.append("")

        # Daily Auto-Insight
        lines.append(f"\U0001f305 {t('help_daily', locale)}")
        for cmd in ("daily_on", "daily_off", "daily_time", "daily_status"):
            lines.append(f"  {t(f'help_cmd_{cmd}', locale)}")

        # Admin section (only for admins)
        is_admin = await _is_admin(chat_id)
        if is_admin:
            lines.append("")
            lines.append(f"\u2699\ufe0f {t('help_admin', locale)}")
            for cmd in ("admin_stats", "admin_users", "admin_broadcast"):
                lines.append(f"  {t(f'help_cmd_{cmd}', locale)}")

        await update.message.reply_text("\n".join(lines))
    except Exception:
        logger.exception("Error in help_handler")
        await update.message.reply_text(t("error_generic", locale))


async def status_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /status command -- show account status."""
    if not await _check_rate_limit(update):
        return

    chat_id = update.effective_chat.id
    locale = await _get_locale(chat_id)

    try:
        status_data = await client.get_status(chat_id)

        if status_data and status_data.get("linked"):
            await update.message.reply_text(
                t(
                    "status_linked",
                    locale,
                    username=status_data.get("username", "N/A"),
                    role=status_data.get("role", "N/A"),
                    profiles=status_data.get("oracle_profile_count", 0),
                    readings=status_data.get("reading_count", 0),
                )
            )
        else:
            await update.message.reply_text(t("status_unlinked", locale))
    except Exception:
        logger.exception("Error in status_handler")
        await update.message.reply_text(t("error_generic", locale))


async def profile_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /profile command -- show Oracle profiles."""
    if not await _check_rate_limit(update):
        return

    chat_id = update.effective_chat.id
    locale = await _get_locale(chat_id)

    try:
        # Check if linked first
        status_data = await client.get_status(chat_id)
        if not status_data or not status_data.get("linked"):
            await update.message.reply_text(t("link_required", locale))
            return

        profiles = await client.get_profile(chat_id)

        if not profiles:
            await update.message.reply_text(t("profile_no_profile", locale))
            return

        lines = [t("profile_header", locale), ""]
        for p in profiles:
            name = p.get("name", "Unknown")
            birthday = p.get("birthday", "N/A")
            lines.append(
                f"  - {name} ({t('profile_birthday', locale, birthday=birthday)})"
            )

        await update.message.reply_text("\n".join(lines))
    except Exception:
        logger.exception("Error in profile_handler")
        await update.message.reply_text(t("error_generic", locale))
