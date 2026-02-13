#!/usr/bin/env python3
"""
NPS Environment Validator

Checks all required environment variables, tests service connectivity,
and validates configuration format. Run before deployment or when
troubleshooting service issues.

Usage:
    python3 scripts/validate_env.py
    python3 scripts/validate_env.py --json     # JSON output for API consumption
    python3 scripts/validate_env.py --fix      # Suggest fixes for issues
"""

from __future__ import annotations

import json
import os
import re
import socket
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

# Project root: scripts/ is one level below project root
PROJECT_ROOT = Path(__file__).resolve().parents[1]


class CheckResult(NamedTuple):
    name: str
    status: str  # "pass" | "fail" | "warn" | "skip"
    message: str
    fix: str = ""


def _load_env() -> dict[str, str]:
    """Load .env file into a dict (does not modify os.environ)."""
    env_path = PROJECT_ROOT / ".env"
    env_vars: dict[str, str] = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                env_vars[key.strip()] = value.strip()
    return env_vars


def check_env_file() -> CheckResult:
    """Check that .env file exists."""
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        return CheckResult(".env file", "pass", "Found at project root")
    return CheckResult(
        ".env file",
        "fail",
        "Missing .env file",
        "Copy .env.example to .env: cp .env.example .env",
    )


def check_env_var(
    env: dict[str, str], name: str, *, required: bool = True
) -> CheckResult:
    """Check that an environment variable is set and non-empty."""
    value = env.get(name, "") or os.environ.get(name, "")
    if value:
        return CheckResult(name, "pass", f"Set ({len(value)} chars)")
    if required:
        return CheckResult(
            name,
            "fail",
            "Missing or empty",
            f"Add {name}=<value> to .env file",
        )
    return CheckResult(name, "warn", "Not set (optional)")


def check_default_values(env: dict[str, str]) -> list[CheckResult]:
    """Warn about default/placeholder values."""
    results: list[CheckResult] = []
    defaults = {
        "POSTGRES_PASSWORD": "changeme",
        "API_SECRET_KEY": "changeme-generate-a-real-secret",
    }
    for var, default_val in defaults.items():
        value = env.get(var, "")
        if value == default_val:
            results.append(
                CheckResult(
                    f"{var} (default)",
                    "warn",
                    f"Still set to default '{default_val}'",
                    f"Change {var} to a secure value in .env",
                )
            )
        elif value:
            results.append(CheckResult(f"{var} (default)", "pass", "Custom value set"))
    return results


def check_encryption_key(env: dict[str, str]) -> CheckResult:
    """Validate NPS_ENCRYPTION_KEY format (64-char hex)."""
    value = env.get("NPS_ENCRYPTION_KEY", "")
    if not value:
        return CheckResult(
            "NPS_ENCRYPTION_KEY",
            "warn",
            "Not set (encryption disabled)",
            'Generate with: python3 -c "import secrets; print(secrets.token_hex(32))"',
        )
    if len(value) != 64 or not re.match(r"^[0-9a-fA-F]+$", value):
        return CheckResult(
            "NPS_ENCRYPTION_KEY",
            "fail",
            f"Invalid format ({len(value)} chars, must be 64 hex chars)",
            'Generate with: python3 -c "import secrets; print(secrets.token_hex(32))"',
        )
    return CheckResult("NPS_ENCRYPTION_KEY", "pass", "Valid 64-char hex key")


def check_encryption_salt(env: dict[str, str]) -> CheckResult:
    """Validate NPS_ENCRYPTION_SALT format (32-char hex)."""
    value = env.get("NPS_ENCRYPTION_SALT", "")
    if not value:
        return CheckResult(
            "NPS_ENCRYPTION_SALT",
            "warn",
            "Not set (encryption disabled)",
            'Generate with: python3 -c "import secrets; print(secrets.token_hex(16))"',
        )
    if len(value) != 32 or not re.match(r"^[0-9a-fA-F]+$", value):
        return CheckResult(
            "NPS_ENCRYPTION_SALT",
            "fail",
            f"Invalid format ({len(value)} chars, must be 32 hex chars)",
            'Generate with: python3 -c "import secrets; print(secrets.token_hex(16))"',
        )
    return CheckResult("NPS_ENCRYPTION_SALT", "pass", "Valid 32-char hex salt")


def check_tcp_connection(
    host: str, port: int, service_name: str, *, timeout: float = 5.0
) -> CheckResult:
    """Test TCP connectivity to a service."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((host, port))
        sock.close()
        return CheckResult(
            f"{service_name} TCP",
            "pass",
            f"Connected to {host}:{port}",
        )
    except (ConnectionRefusedError, OSError) as exc:
        return CheckResult(
            f"{service_name} TCP",
            "fail",
            f"Cannot connect to {host}:{port} ({exc})",
            f"Ensure {service_name} is running on {host}:{port}",
        )


def check_postgres(env: dict[str, str]) -> CheckResult:
    """Test PostgreSQL connectivity with psycopg2."""
    try:
        import psycopg2  # type: ignore[import-untyped]
    except ImportError:
        return CheckResult(
            "PostgreSQL auth",
            "skip",
            "psycopg2 not installed",
            "pip install psycopg2-binary",
        )
    host = env.get("POSTGRES_HOST", "localhost")
    port = int(env.get("POSTGRES_PORT", "5432"))
    db = env.get("POSTGRES_DB", "nps")
    user = env.get("POSTGRES_USER", "nps")
    password = env.get("POSTGRES_PASSWORD", "")
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            dbname=db,
            user=user,
            password=password,
            connect_timeout=5,
        )
        conn.close()
        return CheckResult(
            "PostgreSQL auth", "pass", f"Authenticated to {db}@{host}:{port}"
        )
    except psycopg2.OperationalError as exc:
        return CheckResult(
            "PostgreSQL auth",
            "fail",
            f"Auth failed: {exc}",
            "Check POSTGRES_PASSWORD and ensure the database exists",
        )


def check_redis(env: dict[str, str]) -> CheckResult:
    """Test Redis connectivity with redis-py."""
    try:
        import redis  # type: ignore[import-untyped]
    except ImportError:
        return CheckResult(
            "Redis PING",
            "skip",
            "redis package not installed",
            "pip install redis",
        )
    host = env.get("REDIS_HOST", "localhost")
    port = int(env.get("REDIS_PORT", "6379"))
    try:
        r = redis.Redis(host=host, port=port, socket_timeout=5)
        r.ping()
        return CheckResult("Redis PING", "pass", f"PONG from {host}:{port}")
    except redis.ConnectionError as exc:
        return CheckResult(
            "Redis PING",
            "fail",
            f"Cannot ping: {exc}",
            f"Ensure Redis is running on {host}:{port}",
        )


def check_file_exists(filepath: str, description: str) -> CheckResult:
    """Check that a required file exists."""
    full_path = PROJECT_ROOT / filepath
    if full_path.exists():
        return CheckResult(description, "pass", f"Found: {filepath}")
    return CheckResult(
        description,
        "fail",
        f"Missing: {filepath}",
        f"Ensure {filepath} exists in the project",
    )


def check_docker() -> CheckResult:
    """Check Docker Compose is available."""
    try:
        result = subprocess.run(
            ["docker", "compose", "version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            version = result.stdout.strip().split("\n")[0]
            return CheckResult("Docker Compose", "pass", version)
        return CheckResult(
            "Docker Compose",
            "fail",
            "docker compose command failed",
            "Install Docker and Docker Compose",
        )
    except FileNotFoundError:
        return CheckResult(
            "Docker Compose",
            "fail",
            "docker not found",
            "Install Docker: https://docs.docker.com/get-docker/",
        )
    except subprocess.TimeoutExpired:
        return CheckResult(
            "Docker Compose",
            "fail",
            "docker compose timed out",
            "Check Docker daemon is running",
        )


def run_all_checks() -> list[CheckResult]:
    """Run all environment validation checks."""
    env = _load_env()
    results: list[CheckResult] = []

    # .env file
    results.append(check_env_file())

    # Required variables
    required_vars = [
        "POSTGRES_HOST",
        "POSTGRES_PORT",
        "POSTGRES_DB",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "API_SECRET_KEY",
        "API_HOST",
        "API_PORT",
        "REDIS_HOST",
        "REDIS_PORT",
    ]
    for var in required_vars:
        results.append(check_env_var(env, var, required=True))

    # Default value warnings
    results.extend(check_default_values(env))

    # Security variables
    results.append(check_encryption_key(env))
    results.append(check_encryption_salt(env))

    # Optional variables
    optional_vars = ["ANTHROPIC_API_KEY", "NPS_BOT_TOKEN", "NPS_CHAT_ID"]
    for var in optional_vars:
        results.append(check_env_var(env, var, required=False))

    # Connectivity
    pg_host = env.get("POSTGRES_HOST", "localhost")
    pg_port = int(env.get("POSTGRES_PORT", "5432"))
    results.append(check_tcp_connection(pg_host, pg_port, "PostgreSQL"))
    results.append(check_postgres(env))

    redis_host = env.get("REDIS_HOST", "localhost")
    redis_port = int(env.get("REDIS_PORT", "6379"))
    results.append(check_tcp_connection(redis_host, redis_port, "Redis"))
    results.append(check_redis(env))

    # Docker
    results.append(check_docker())

    # Required files
    results.append(check_file_exists("docker-compose.yml", "docker-compose.yml"))
    results.append(check_file_exists("database/init.sql", "database/init.sql"))

    return results


def print_results(
    results: list[CheckResult], *, json_mode: bool = False, show_fixes: bool = False
) -> int:
    """Print check results and return exit code."""
    if json_mode:
        checks = []
        for r in results:
            entry: dict[str, str] = {
                "name": r.name,
                "status": r.status,
                "message": r.message,
            }
            if r.fix:
                entry["fix"] = r.fix
            checks.append(entry)

        summary = {
            "pass": sum(1 for r in results if r.status == "pass"),
            "fail": sum(1 for r in results if r.status == "fail"),
            "warn": sum(1 for r in results if r.status == "warn"),
            "skip": sum(1 for r in results if r.status == "skip"),
        }
        output = {"checks": checks, "summary": summary}
        print(json.dumps(output, indent=2))
    else:
        status_icons = {
            "pass": "[PASS]",
            "fail": "[FAIL]",
            "warn": "[WARN]",
            "skip": "[SKIP]",
        }
        print("=" * 60)
        print("  NPS Environment Validation Report")
        print("=" * 60)
        for r in results:
            icon = status_icons.get(r.status, "[????]")
            print(f"  {icon} {r.name}: {r.message}")
            if show_fixes and r.fix:
                print(f"         Fix: {r.fix}")
        print("=" * 60)
        total_pass = sum(1 for r in results if r.status == "pass")
        total_fail = sum(1 for r in results if r.status == "fail")
        total_warn = sum(1 for r in results if r.status == "warn")
        total_skip = sum(1 for r in results if r.status == "skip")
        print(
            f"  Summary: {total_pass} pass, {total_fail} fail, "
            f"{total_warn} warn, {total_skip} skip"
        )
        if total_fail > 0:
            print("  Result: FAIL")
        else:
            print("  Result: PASS")
        print("=" * 60)

    has_failures = any(r.status == "fail" for r in results)
    return 1 if has_failures else 0


def main() -> None:
    json_mode = "--json" in sys.argv
    show_fixes = "--fix" in sys.argv
    results = run_all_checks()
    exit_code = print_results(results, json_mode=json_mode, show_fixes=show_fixes)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
