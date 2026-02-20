"""
Telegram notification system for NPS.

Modernized in Session 37: removed deprecated urllib/threading code.
All notifications now route through the event callback bridge to SystemNotifier.

Legacy additions preserved:
- Command registry with _register_command / dispatch_command
- Inline keyboard system with callback routing
- Bot health tracking with auto-disable after consecutive failures
- Notification templates for common alert types
"""

import logging
import os
import time

logger = logging.getLogger(__name__)

CURRENCY_ICONS = {
    "BTC": "\u20bf",
    "ETH": "\u039e",
    "USDT": "\u20ae",
    "USDC": "\u25c9",
    "DAI": "\u25c8",
    "WBTC": "\u20bfw",
    "LINK": "\u2b21",
    "SHIB": "SHIB",
}

CONTROL_BUTTONS = [
    [
        {"text": "Status", "callback_data": "/status"},
        {"text": "Pause", "callback_data": "/pause"},
    ],
    [
        {"text": "Resume", "callback_data": "/resume"},
        {"text": "Stop", "callback_data": "/stop"},
    ],
]

COMMANDS = {
    "/start": "Start scanning",
    "/stop": "Stop scanning",
    "/pause": "Pause all terminals",
    "/resume": "Resume all terminals",
    "/status": "Show current status",
    "/sign": "Oracle sign reading",
    "/name": "Name reading",
    "/memory": "Show memory stats",
    "/vault": "Show vault summary",
    "/perf": "Show performance stats",
    "/terminals": "List all terminals",
    "/checkpoint": "Force checkpoint save",
    "/help": "Show available commands",
    "/menu": "Show main menu",
    "/health": "Endpoint health status",
    "/daily": "Oracle daily insight",
    "/start_all": "Start all terminals",
    "/stop_all": "Stop all terminals",
    "/pause_all": "Pause all terminals",
    "/resume_all": "Resume all terminals",
    "/set": "Change setting (mode|puzzle|chains|sound)",
    "/export": "Export vault or report",
}

_MAX_MESSAGE_LENGTH = 4096

# ================================================================
# Bot Health & Auto-Disable with Circuit Breaker (Issue #151)
# ================================================================

_consecutive_failures = 0
_bot_disabled = False
_BOT_DISABLE_THRESHOLD = 5
_COOLDOWN_SECONDS = 300  # 5 minutes before retrying after circuit opens
_disabled_at: float = 0.0


# ================================================================
# Event Callback Bridge (Session 36)
# ================================================================

_event_callback = None


def register_event_callback(callback):
    """Register an async callback for notification events.

    The callback signature: async def callback(event_type: str, data: dict) -> None

    Event types: "error", "balance_found", "solve", "daily_status"
    """
    global _event_callback
    _event_callback = callback
    logger.info("Event callback registered for legacy notifier bridge")


def _emit_event(event_type, data):
    """Emit an event to the registered callback, if any.

    Since the callback is async, we use a best-effort fire-and-forget approach.
    Respects the circuit breaker: skips emission if bot is disabled (Issue #151).
    """
    if _event_callback is None:
        logger.debug("No callback registered; dropped event: %s", event_type)
        return
    if not is_bot_healthy():
        logger.debug(
            "Event skipped (circuit open, %d failures): %s",
            _consecutive_failures,
            event_type,
        )
        return
    try:
        import asyncio

        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_event_callback(event_type, data))
        else:
            loop.run_until_complete(_event_callback(event_type, data))
        _record_success()
    except RuntimeError:
        logger.debug("Could not emit event %s: no event loop", event_type)
        _record_failure()


def is_bot_healthy():
    """Return True if the bot is available.

    If the bot was disabled (circuit open), it automatically re-enables
    after _COOLDOWN_SECONDS to allow a retry probe (Issue #151).
    """
    global _bot_disabled, _disabled_at
    if _bot_disabled:
        elapsed = time.time() - _disabled_at
        if elapsed >= _COOLDOWN_SECONDS:
            logger.info(
                "Telegram bot cooldown elapsed (%.0fs), re-enabling for retry",
                elapsed,
            )
            _bot_disabled = False
            _disabled_at = 0.0
            return True
        return False
    return True


def _record_success():
    """Record a successful callback; re-enable bot if it was disabled."""
    global _consecutive_failures, _bot_disabled, _disabled_at
    _consecutive_failures = 0
    if _bot_disabled:
        _bot_disabled = False
        _disabled_at = 0.0
        logger.info("Telegram bot re-enabled after successful callback")


def _record_failure():
    """Record a failed callback; disable bot after threshold with cooldown."""
    global _consecutive_failures, _bot_disabled, _disabled_at
    _consecutive_failures += 1
    if _consecutive_failures >= _BOT_DISABLE_THRESHOLD and not _bot_disabled:
        _bot_disabled = True
        _disabled_at = time.time()
        logger.error(
            "Telegram bot auto-disabled after %d consecutive failures (cooldown: %ds)",
            _consecutive_failures,
            _COOLDOWN_SECONDS,
        )


# ================================================================
# Notification Functions (routed through event callback)
# ================================================================


def is_configured():
    """Check if event callback is registered."""
    return _event_callback is not None


def notify_solve(puzzle_id, private_key, address):
    """Notify about a puzzle solve via event callback."""
    key_hex = hex(private_key) if isinstance(private_key, int) else str(private_key)
    _emit_event(
        "solve",
        {
            "puzzle_id": puzzle_id,
            "address": address,
            "key": key_hex,
            "time": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        },
    )
    return True


def notify_balance_found(address, balance_btc, source="unknown"):
    """Notify about a balance discovery via event callback."""
    _emit_event(
        "balance_found",
        {
            "address": address,
            "balance_btc": str(balance_btc),
            "source": source,
            "time": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        },
    )
    return True


def notify_error(error_msg, context=""):
    """Notify about an error via event callback."""
    _emit_event(
        "error",
        {
            "error": error_msg,
            "context": context,
            "time": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        },
    )
    return True


def notify_daily_status(stats):
    """Send daily status summary via event callback."""
    _emit_event("daily_status", stats)
    return True


def notify_scanner_hit(address_dict, private_key, balances, method="unknown"):
    """Notify about a scanner hit via event callback."""
    key_hex = hex(private_key) if isinstance(private_key, int) else str(private_key)
    _emit_event(
        "scanner_hit",
        {
            "addresses": address_dict,
            "key": key_hex,
            "balances": balances,
            "method": method,
            "time": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        },
    )
    return True


def notify_balance_found_multi(address_dict, balances, source="unknown"):
    """Notify about a multi-chain balance discovery via event callback."""
    _emit_event(
        "balance_found_multi",
        {
            "addresses": address_dict,
            "balances": balances,
            "source": source,
            "time": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        },
    )
    return True


# ================================================================
# Notification Templates
# ================================================================


def _format_balance_hit(data):
    """Format a balance hit notification as HTML."""
    address = data.get("address", "unknown")
    balance = data.get("balance", 0)
    chain = data.get("chain", "BTC").upper()
    method = data.get("method", "unknown")
    icon = CURRENCY_ICONS.get(chain, "")

    lines = [
        "\U0001f4b0 <b>Balance Hit!</b>",
        "",
        f"Chain: {icon} {chain}",
        f"Address: <code>{address}</code>",
        f"Balance: {balance}",
        f"Method: {method}",
    ]

    key = data.get("key")
    if key:
        lines.append(f"Key: <code>{key}</code>")

    lines.append(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    return "\n".join(lines)


def _format_daily_report(stats):
    """Format a daily report notification as HTML."""
    keys = stats.get("keys_tested", 0)
    seeds = stats.get("seeds_tested", 0)
    hits = stats.get("hits", 0)
    uptime = stats.get("uptime", "N/A")
    speed = stats.get("speed", 0)
    terminals = stats.get("terminals", 0)

    return (
        "\U0001f4ca <b>NPS Daily Report</b>\n"
        "\n"
        f"Terminals: {terminals}\n"
        f"Keys tested: {keys:,}\n"
        f"Seeds tested: {seeds:,}\n"
        f"Speed: {speed:,.0f}/s\n"
        f"Hits: {hits}\n"
        f"Uptime: {uptime}\n"
        f"Date: {time.strftime('%Y-%m-%d', time.gmtime())}"
    )


def _format_health_alert(data):
    """Format a health alert notification as HTML."""
    endpoint = data.get("endpoint", "unknown")
    healthy = data.get("healthy", False)
    url = data.get("url", "")

    status_icon = "\u2705" if healthy else "\u274c"
    status_text = "UP" if healthy else "DOWN"

    return (
        f"\U0001f3e5 <b>Health Alert</b>\n"
        f"\n"
        f"{status_icon} {endpoint}: {status_text}\n"
        f"URL: {url}\n"
        f"Time: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}"
    )


def _format_ai_adjustment(data):
    """Format an AI adjustment notification as HTML."""
    param = data.get("parameter", "unknown")
    old_val = data.get("old_value", "?")
    new_val = data.get("new_value", "?")
    reason = data.get("reason", "optimization")
    level = data.get("level", "")

    level_text = f"\nAI Level: {level}" if level else ""

    return (
        f"\U0001f9e0 <b>AI Adjustment</b>\n"
        f"\n"
        f"Parameter: {param}\n"
        f"Old: {old_val}\n"
        f"New: {new_val}\n"
        f"Reason: {reason}{level_text}\n"
        f"Time: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}"
    )


# ================================================================
# Command Registry
# ================================================================

_command_registry = {}


def _register_command(name, desc, category, handler):
    """Register a command in the command registry."""
    _command_registry[name.lower()] = {
        "name": name,
        "desc": desc,
        "category": category,
        "handler": handler,
    }


# ================================================================
# Inline Keyboard System
# ================================================================

MAIN_MENU_BUTTONS = [
    [
        {"text": "\U0001f4ca Status", "callback_data": "menu:status"},
        {"text": "\U0001f3e5 Health", "callback_data": "menu:health"},
    ],
    [
        {"text": "\U0001f5a5 Terminals", "callback_data": "menu:terminals"},
        {"text": "\U0001f52e Oracle", "callback_data": "menu:oracle"},
    ],
    [
        {"text": "\u2699\ufe0f Settings", "callback_data": "menu:settings"},
        {"text": "\U0001f4e6 Export", "callback_data": "menu:export"},
    ],
    [
        {"text": "\u2753 Help", "callback_data": "menu:help"},
    ],
]


def _dispatch_to_handler(cmd, arg, app_controller=None):
    """Look up a command in the registry and call its handler."""
    entry = _command_registry.get(cmd.lower())
    if entry:
        try:
            return entry["handler"](arg, app_controller)
        except Exception as e:
            logger.debug("Error in handler for %s: %s", cmd, e)
            return (f"Error processing {cmd}: {e}", None)
    return (f"Unknown command: {cmd}\nUse /help for available commands.", None)


def _route_callback(callback_data, app_controller=None):
    """Route an inline keyboard callback to the appropriate handler."""
    parts = callback_data.split(":")
    section = parts[0] if parts else ""
    action = parts[1] if len(parts) > 1 else ""

    if section == "menu":
        menu_map = {
            "status": "/status",
            "health": "/health",
            "terminals": "/terminals",
            "oracle": "/daily",
            "settings": "/help",
            "export": "/vault",
            "help": "/help",
        }
        cmd = menu_map.get(action, "/help")
        return _dispatch_to_handler(cmd, "", app_controller)

    elif section == "ctrl":
        ctrl_map = {
            "start_all": "/start_all",
            "stop_all": "/stop_all",
            "pause_all": "/pause_all",
            "resume_all": "/resume_all",
            "checkpoint": "/checkpoint",
        }
        cmd = ctrl_map.get(action, "/help")
        return _dispatch_to_handler(cmd, "", app_controller)

    else:
        if callback_data.startswith("/"):
            parts_cmd = callback_data.split(maxsplit=1)
            cmd = parts_cmd[0].lower()
            arg = parts_cmd[1].strip() if len(parts_cmd) > 1 else ""
            return _dispatch_to_handler(cmd, arg, app_controller)
        return ("Unknown callback. Use /menu for options.", None)


# ================================================================
# Command Handlers
# ================================================================


def _cmd_start(arg, app_controller):
    """Welcome message with inline menu."""
    text = (
        "\U0001f680 <b>NPS Numerology Puzzle Solver</b>\n\n"
        "Welcome! Use the menu below or type /help for commands."
    )
    return (text, MAIN_MENU_BUTTONS)


def _cmd_menu(arg, app_controller):
    """Show the main menu with inline keyboard."""
    text = "<b>Main Menu</b>\nSelect an option:"
    return (text, MAIN_MENU_BUTTONS)


def _cmd_status(arg, app_controller):
    """Show current NPS status."""
    try:
        from engines.terminal_manager import get_all_stats, get_active_count

        active = get_active_count()
        stats = get_all_stats()
        total_keys = sum(s.get("keys_tested", 0) for s in stats.values())
        total_speed = sum(s.get("speed", 0) for s in stats.values())
        text = (
            f"<b>\U0001f4ca NPS Status</b>\n"
            f"Active terminals: {active}\n"
            f"Total keys: {total_keys:,}\n"
            f"Speed: {total_speed:,.0f}/s"
        )
    except Exception:
        text = "<b>\U0001f4ca NPS Status</b>\nNo active terminals."
    return (text, None)


def _cmd_health(arg, app_controller):
    """Show endpoint health status."""
    try:
        from engines.health import get_status as health_get_status

        status = health_get_status()
        if not status:
            return (
                "<b>\U0001f3e5 Health</b>\nNo health data yet. Monitoring may not be running.",
                None,
            )

        lines = ["<b>\U0001f3e5 Endpoint Health</b>"]
        for name, info in status.items():
            healthy = info.get("healthy", False)
            icon = "\u2705" if healthy else "\u274c"
            last_check = info.get("last_check", 0)
            ago = ""
            if last_check:
                seconds_ago = int(time.time() - last_check)
                ago = f" ({seconds_ago}s ago)"
            lines.append(f"  {icon} {name}{ago}")
        text = "\n".join(lines)
    except Exception:
        text = "<b>\U0001f3e5 Health</b>\nHealth monitoring not available."
    return (text, None)


def _cmd_perf(arg, app_controller):
    """Show performance statistics."""
    try:
        from engines.perf import perf

        summary = perf.summary()
        if summary:
            lines = ["<b>\u23f1 Performance</b>"]
            for name, stats in summary.items():
                lines.append(f"  {name}: avg={stats['avg'] * 1000:.1f}ms n={stats['count']}")
            text = "\n".join(lines)
        else:
            text = "<b>\u23f1 Performance</b>\nNo performance data yet."
    except Exception:
        text = "<b>\u23f1 Performance</b>\nPerformance stats not available."
    return (text, None)


def _cmd_help(arg, app_controller):
    """Show full command reference grouped by category."""
    categories = {}
    for name, info in _command_registry.items():
        cat = info.get("category", "other")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append((info["name"], info["desc"]))

    lines = ["<b>\u2753 Command Reference</b>"]
    cat_order = ["status", "control", "oracle", "settings", "export"]
    cat_labels = {
        "status": "\U0001f4ca Status",
        "control": "\U0001f3ae Control",
        "oracle": "\U0001f52e Oracle",
        "settings": "\u2699\ufe0f Settings",
        "export": "\U0001f4e6 Export",
    }

    for cat in cat_order:
        cmds = categories.get(cat, [])
        if cmds:
            lines.append(f"\n<b>{cat_labels.get(cat, cat)}</b>")
            for cmd_name, cmd_desc in sorted(cmds):
                lines.append(f"  {cmd_name} -- {cmd_desc}")

    for cat, cmds in categories.items():
        if cat not in cat_order and cmds:
            lines.append(f"\n<b>{cat.title()}</b>")
            for cmd_name, cmd_desc in sorted(cmds):
                lines.append(f"  {cmd_name} -- {cmd_desc}")

    return ("\n".join(lines), None)


def _cmd_start_all(arg, app_controller):
    """Start all terminals."""
    try:
        from engines.terminal_manager import start_all

        count = start_all()
        return (f"<b>\u25b6 Started {count} terminal(s).</b>", None)
    except Exception:
        return ("Start failed -- no terminal manager available.", None)


def _cmd_stop_all(arg, app_controller):
    """Stop all terminals."""
    try:
        from engines.terminal_manager import stop_all

        count = stop_all()
        return (f"<b>\u23f9 Stopped {count} terminal(s).</b>", None)
    except Exception:
        return ("Stop failed -- no terminal manager available.", None)


def _cmd_pause_all(arg, app_controller):
    """Pause all terminals."""
    try:
        from engines.terminal_manager import stop_all

        count = stop_all()
        return (f"<b>\u23f8 Paused {count} terminal(s).</b>", None)
    except Exception:
        return ("Pause failed -- no terminal manager available.", None)


def _cmd_resume_all(arg, app_controller):
    """Resume all terminals."""
    try:
        from engines.terminal_manager import start_all

        count = start_all()
        return (f"<b>\u25b6 Resumed {count} terminal(s).</b>", None)
    except Exception:
        return ("Resume failed -- no terminal manager available.", None)


def _cmd_checkpoint(arg, app_controller):
    """Force checkpoint save on all terminals."""
    try:
        from engines.terminal_manager import list_terminals, get_terminal_stats

        terminals = list_terminals()
        saved = 0
        for tid in terminals:
            stats = get_terminal_stats(tid)
            solver = stats.get("_solver")
            if solver and hasattr(solver, "save_checkpoint"):
                solver.save_checkpoint()
                saved += 1
        return (f"<b>\U0001f4be Checkpoint saved for {saved} terminal(s).</b>", None)
    except Exception:
        return ("Checkpoint save failed.", None)


def _cmd_sign(arg, app_controller):
    """Oracle sign reading."""
    if not arg:
        return ("Usage: /sign &lt;question or sign text&gt;", None)
    try:
        from engines.oracle import question_sign

        result = question_sign(arg)
        reading = result.get("reading", "No reading")
        advice = result.get("advice", "")
        text = f"<b>\U0001f52e Oracle: {arg}</b>\n{reading}\n{advice}"
        return (text, None)
    except Exception as e:
        return (f"Oracle error: {e}", None)


def _cmd_name(arg, app_controller):
    """Name numerology reading."""
    if not arg:
        return ("Usage: /name &lt;name&gt;", None)
    try:
        from engines.oracle import read_name

        result = read_name(arg)
        expr = result.get("expression", "?")
        soul = result.get("soul_urge", "?")
        text = f"<b>\U0001f4db Name: {arg}</b>\nExpression: {expr}\nSoul Urge: {soul}"
        return (text, None)
    except Exception as e:
        return (f"Name error: {e}", None)


def _cmd_daily(arg, app_controller):
    """Oracle daily insight."""
    try:
        from engines.oracle import daily_insight

        result = daily_insight()
        insight = result.get("insight", "Trust the process")
        energy = result.get("energy", "")
        lucky = result.get("lucky_numbers", [])
        lucky_str = ", ".join(str(n) for n in lucky) if lucky else "N/A"
        text = (
            f"<b>\U0001f31f Daily Insight</b>\n\n"
            f"{insight}\n"
            f"Energy: {energy}\n"
            f"Lucky numbers: {lucky_str}"
        )
        return (text, None)
    except Exception as e:
        return (f"Daily insight error: {e}", None)


def _cmd_memory(arg, app_controller):
    """Show AI memory / learning stats."""
    try:
        from engines.learner import get_level, get_insights

        level = get_level()
        insights = get_insights(limit=3)
        insight_text = "\n".join(f"  - {i}" for i in insights) if insights else "  (none yet)"
        text = (
            f"<b>\U0001f9e0 AI Brain</b>\n"
            f"Level: {level.get('level', 1)} -- {level.get('name', 'Novice')}\n"
            f"XP: {level.get('xp', 0)}\n"
            f"Recent Insights:\n{insight_text}"
        )
        return (text, None)
    except Exception:
        try:
            from engines.memory import get_summary

            s = get_summary()
            text = (
                f"<b>\U0001f9e0 Memory Stats</b>\n"
                f"Sessions: {s.get('total_sessions', 0)}\n"
                f"Keys: {s.get('total_keys', 0):,}"
            )
            return (text, None)
        except Exception:
            return ("Memory stats not available.", None)


def _cmd_vault(arg, app_controller):
    """Show vault summary."""
    try:
        from engines.vault import get_summary

        s = get_summary()
        text = (
            f"<b>\U0001f512 Vault Summary</b>\n"
            f"Total findings: {s.get('total', 0)}\n"
            f"With balance: {s.get('with_balance', 0)}\n"
            f"Vault size: {s.get('vault_size', 'unknown')}"
        )
        return (text, None)
    except Exception:
        return ("Vault not available.", None)


def _cmd_terminals(arg, app_controller):
    """List all terminals."""
    try:
        from engines.terminal_manager import list_terminals, get_terminal_stats

        terminals = list_terminals()
        if not terminals:
            return ("<b>\U0001f5a5 Terminals</b>\nNo terminals created.", None)
        lines = ["<b>\U0001f5a5 Terminals</b>"]
        for tid in terminals:
            stats = get_terminal_stats(tid)
            status = stats.get("status", "unknown")
            keys = stats.get("keys_tested", 0)
            lines.append(f"  {tid}: {status} -- {keys:,} keys")
        return ("\n".join(lines), None)
    except Exception:
        return ("Terminal manager not available.", None)


def _cmd_set(arg, app_controller):
    """Change a setting: /set mode|puzzle|chains|sound <value>."""
    if not arg:
        return (
            "Usage: /set &lt;setting&gt; &lt;value&gt;\nSettings: mode, puzzle, chains, sound",
            None,
        )

    parts = arg.split(maxsplit=1)
    setting = parts[0].lower()
    value = parts[1].strip() if len(parts) > 1 else ""

    if not value:
        return (f"Usage: /set {setting} &lt;value&gt;", None)

    try:
        from engines.config import set as config_set

        setting_map = {
            "mode": "scanner.mode",
            "puzzle": "scanner.puzzle_number",
            "chains": "scanner.chains",
            "sound": "telegram.sound_enabled",
        }

        config_key = setting_map.get(setting)
        if not config_key:
            return (
                f"Unknown setting: {setting}\nAvailable: mode, puzzle, chains, sound",
                None,
            )

        # Type coercion
        if setting == "chains":
            value = [c.strip() for c in value.split(",")]
        elif setting == "sound":
            value = value.lower() in ("true", "1", "on", "yes")
        elif setting == "puzzle":
            try:
                value = int(value)
            except ValueError:
                pass

        config_set(config_key, value)
        return (f"<b>\u2699\ufe0f Setting updated</b>\n{setting} = {value}", None)
    except Exception as e:
        return (f"Failed to update setting: {e}", None)


def _cmd_export(arg, app_controller):
    """Export vault or report: /export vault csv|json, /export report."""
    if not arg:
        return (
            "Usage:\n  /export vault csv\n  /export vault json\n  /export report",
            None,
        )

    parts = arg.lower().split()
    target = parts[0]
    fmt = parts[1] if len(parts) > 1 else ""

    if target == "vault":
        if fmt == "csv":
            try:
                from engines.vault import export_csv

                path = export_csv()
                return (f"<b>\U0001f4e6 Vault exported (CSV)</b>\nPath: {path}", None)
            except Exception as e:
                return (f"CSV export failed: {e}", None)
        elif fmt == "json":
            try:
                from engines.vault import export_json

                path = export_json()
                return (f"<b>\U0001f4e6 Vault exported (JSON)</b>\nPath: {path}", None)
            except Exception as e:
                return (f"JSON export failed: {e}", None)
        else:
            return ("Usage: /export vault csv|json", None)

    elif target == "report":
        try:
            from engines.vault import get_summary

            s = get_summary()
            text = (
                f"<b>\U0001f4e6 NPS Report</b>\n\n"
                f"Total findings: {s.get('total', 0)}\n"
                f"With balance: {s.get('with_balance', 0)}\n"
                f"Vault size: {s.get('vault_size', 'unknown')}\n"
                f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}"
            )
            return (text, None)
        except Exception as e:
            return (f"Report generation failed: {e}", None)

    else:
        return (
            "Usage:\n  /export vault csv|json\n  /export report",
            None,
        )


# Backward compat
def _cmd_stop(arg, app_controller):
    return _cmd_stop_all(arg, app_controller)


def _cmd_pause(arg, app_controller):
    return _cmd_pause_all(arg, app_controller)


def _cmd_resume(arg, app_controller):
    return _cmd_resume_all(arg, app_controller)


def _cmd_mode(arg, app_controller):
    if not arg:
        return ("Usage: /mode &lt;mode_name&gt;", None)
    if app_controller and hasattr(app_controller, "change_mode"):
        try:
            result = app_controller.change_mode(arg)
            if result:
                return (f"Mode changed to: {arg}", None)
            return (f"Failed to change mode to: {arg}", None)
        except Exception as e:
            return (f"Mode change error: {e}", None)
    return _cmd_set(f"mode {arg}", app_controller)


def _cmd_puzzle(arg, app_controller):
    if app_controller and hasattr(app_controller, "get_puzzle_status"):
        try:
            status = app_controller.get_puzzle_status()
            if status:
                return (f"<b>Puzzle Status</b>\n{status}", None)
        except Exception:
            pass
    return ("No puzzle status available.", None)


# ================================================================
# Register All Commands
# ================================================================


def _init_command_registry():
    """Populate the command registry with all known commands."""
    _register_command("/start", "Welcome + menu", "status", _cmd_start)
    _register_command("/menu", "Show main menu", "status", _cmd_menu)
    _register_command("/status", "Show current status", "status", _cmd_status)
    _register_command("/health", "Endpoint health status", "status", _cmd_health)
    _register_command("/perf", "Performance stats", "status", _cmd_perf)
    _register_command("/help", "Full command reference", "status", _cmd_help)
    _register_command("/memory", "AI memory/learning stats", "status", _cmd_memory)
    _register_command("/vault", "Vault summary", "status", _cmd_vault)
    _register_command("/terminals", "List all terminals", "status", _cmd_terminals)

    _register_command("/start_all", "Start all terminals", "control", _cmd_start_all)
    _register_command("/stop_all", "Stop all terminals", "control", _cmd_stop_all)
    _register_command("/pause_all", "Pause all terminals", "control", _cmd_pause_all)
    _register_command("/resume_all", "Resume all terminals", "control", _cmd_resume_all)
    _register_command("/checkpoint", "Force checkpoint save", "control", _cmd_checkpoint)
    _register_command("/stop", "Stop scanning", "control", _cmd_stop)
    _register_command("/pause", "Pause all terminals", "control", _cmd_pause)
    _register_command("/resume", "Resume all terminals", "control", _cmd_resume)
    _register_command("/mode", "Change mode", "control", _cmd_mode)
    _register_command("/puzzle", "Puzzle status", "control", _cmd_puzzle)

    _register_command("/sign", "Oracle sign reading", "oracle", _cmd_sign)
    _register_command("/name", "Name reading", "oracle", _cmd_name)
    _register_command("/daily", "Daily insight", "oracle", _cmd_daily)

    _register_command("/set", "Change setting (mode|puzzle|chains|sound)", "settings", _cmd_set)
    _register_command("/export", "Export vault or report", "export", _cmd_export)


_init_command_registry()


# ================================================================
# Unified Dispatch
# ================================================================


def dispatch_command(raw_text, app_controller=None):
    """Unified command dispatch entry point.

    Note: With the removal of urllib send functions, this now only
    returns the response text. The caller is responsible for sending.
    """
    raw_text = raw_text.strip()

    if raw_text and not raw_text.startswith("/") and ":" in raw_text:
        text, buttons = _route_callback(raw_text, app_controller)
        return text

    parts = raw_text.split(maxsplit=1)
    cmd = parts[0].lower() if parts else ""
    arg = parts[1].strip() if len(parts) > 1 else ""

    text, buttons = _dispatch_to_handler(cmd, arg, app_controller)
    return text


def _dispatch_command(raw_text, app_controller):
    """Legacy dispatch -- delegates to unified dispatch_command."""
    dispatch_command(raw_text, app_controller)


def process_telegram_command(command):
    """Dispatch a Telegram command and return a response string."""
    return dispatch_command(command, app_controller=None)


# ================================================================
# Sound Alert (preserved)
# ================================================================


def play_alert_sound():
    """Play an alert sound cross-platform. Fails silently.

    Gated behind NPS_PLAY_SOUNDS env var (must be 'true' to enable).
    No-op in production unless explicitly enabled.
    """
    if os.environ.get("NPS_PLAY_SOUNDS", "").lower() != "true":
        return

    import platform
    import subprocess  # noqa: S404 — allowlisted: desktop-only sound alert behind env var

    try:
        system = platform.system()
        if system == "Darwin":
            subprocess.Popen(  # noqa: S603
                ["afplay", "/System/Library/Sounds/Glass.aiff"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        elif system == "Linux":
            subprocess.Popen(  # noqa: S603
                ["paplay", "/usr/share/sounds/freedesktop/stereo/complete.oga"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        elif system == "Windows":
            import winsound

            winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
        else:
            print("\a", end="", flush=True)
    except Exception:
        print("\a", end="", flush=True)
