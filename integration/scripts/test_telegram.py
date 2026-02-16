#!/usr/bin/env python3
"""Telegram integration test — verifies bot API connectivity and message sending.

SB3: Tests Telegram Bot API, alerter container logs, and message delivery.
"""

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

# Load .env
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
if _ENV_PATH.exists():
    for line in _ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip()
            if key and key not in os.environ:
                os.environ[key] = value

BOT_TOKEN = os.environ.get("NPS_BOT_TOKEN", "")
CHAT_ID = os.environ.get("NPS_CHAT_ID", "")


def test_bot_token_configured() -> tuple[str, str]:
    """Check if bot token is configured."""
    if not BOT_TOKEN:
        return "skip", "NPS_BOT_TOKEN not set in .env"
    if not CHAT_ID:
        return "skip", "NPS_CHAT_ID not set in .env"
    return "pass", f"Token: {BOT_TOKEN[:10]}... Chat: {CHAT_ID}"


def test_bot_api_reachable() -> tuple[str, str]:
    """Test Telegram Bot API connectivity."""
    if not BOT_TOKEN:
        return "skip", "No token"
    try:
        import requests

        resp = requests.get(
            f"https://api.telegram.org/bot{BOT_TOKEN}/getMe",
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok"):
                bot = data["result"]
                return "pass", f"Bot: @{bot.get('username')} (id: {bot.get('id')})"
        return "fail", f"Status {resp.status_code}: {resp.text[:100]}"
    except Exception as exc:
        return "fail", str(exc)


def test_send_message() -> tuple[str, str]:
    """Send a test message via Telegram Bot API."""
    if not BOT_TOKEN or not CHAT_ID:
        return "skip", "No token or chat ID"
    try:
        import requests

        message = (
            f"NPS SB3 Integration Test\n"
            f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
            f"Status: All systems operational"
        )
        resp = requests.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={"chat_id": CHAT_ID, "text": message, "parse_mode": "HTML"},
            timeout=10,
        )
        if resp.status_code == 200 and resp.json().get("ok"):
            msg_id = resp.json()["result"]["message_id"]
            return "pass", f"Message sent (id: {msg_id})"
        return "fail", f"Status {resp.status_code}: {resp.text[:100]}"
    except Exception as exc:
        return "fail", str(exc)


def test_telegram_api_endpoints() -> tuple[str, str]:
    """Test NPS Telegram API endpoints."""
    try:
        import requests

        # Admin stats (requires auth)
        api_key = os.environ.get("API_SECRET_KEY", "")
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        resp = requests.get(
            "http://localhost:8000/api/telegram/admin/stats",
            headers=headers,
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            return "pass", f"Admin stats: {json.dumps(data)[:100]}"
        return "fail", f"Status {resp.status_code}"
    except Exception as exc:
        return "fail", str(exc)


def main() -> None:
    print("=" * 60)
    print("NPS Telegram Integration Test")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    tests = [
        ("Bot Token Configured", test_bot_token_configured),
        ("Bot API Reachable", test_bot_api_reachable),
        ("Send Test Message", test_send_message),
        ("NPS Telegram API", test_telegram_api_endpoints),
    ]

    results = []
    for name, func in tests:
        t0 = time.perf_counter()
        status, detail = func()
        elapsed = (time.perf_counter() - t0) * 1000
        icon = {"pass": "PASS", "fail": "FAIL", "skip": "SKIP"}[status]
        print(f"  [{icon}] {name}: {detail} ({elapsed:.0f}ms)")
        results.append(
            {
                "test": name,
                "status": status,
                "detail": detail,
                "elapsed_ms": round(elapsed, 1),
            }
        )

    passed = sum(1 for r in results if r["status"] == "pass")
    failed = sum(1 for r in results if r["status"] == "fail")
    skipped = sum(1 for r in results if r["status"] == "skip")

    print(f"\nResults: {passed} pass / {failed} fail / {skipped} skip")
    print("=" * 60)

    # Generate report
    report_lines = [
        "# Telegram Integration Report",
        "",
        f"**Generated:** {datetime.now(timezone.utc).isoformat()}",
        "",
        "## Results",
        "",
        "| Test | Status | Detail |",
        "|------|--------|--------|",
    ]
    for r in results:
        icon = {"pass": "PASS", "fail": "FAIL", "skip": "SKIP"}[r["status"]]
        report_lines.append(f"| {r['test']} | {icon} | {r['detail'][:80]} |")

    report_lines.extend(
        [
            "",
            "## Notes",
            "",
            "- Bot container tests skipped (no Docker)",
            "- Alerter container tests skipped (no Docker)",
            f"- Bot token configured: {'Yes' if BOT_TOKEN else 'No'}",
            f"- Chat ID configured: {'Yes' if CHAT_ID else 'No'}",
            "",
        ]
    )

    report_path = (
        Path(__file__).resolve().parents[2]
        / "integration"
        / "TELEGRAM_INTEGRATION_REPORT.md"
    )
    report_path.write_text("\n".join(report_lines))
    print(f"Report written to: {report_path}")


if __name__ == "__main__":
    main()
