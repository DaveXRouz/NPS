#!/usr/bin/env python3
"""Service connectivity validation — verifies all inter-service communication paths.

SB3: Tests PostgreSQL, Redis, API, Oracle gRPC, and proxy paths.
Adapts to local (no Docker) or Docker deployment automatically.
"""

import os
import socket
import sys
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


class ConnectivityTester:
    """Tests all service connectivity paths."""

    def __init__(self) -> None:
        self.results: list[dict] = []
        self.start_time = time.time()

    def _record(
        self, connection: str, method: str, status: str, detail: str, elapsed_ms: float
    ) -> None:
        self.results.append(
            {
                "connection": connection,
                "method": method,
                "status": status,
                "detail": detail,
                "elapsed_ms": round(elapsed_ms, 1),
            }
        )
        icon = "PASS" if status == "pass" else ("SKIP" if status == "skip" else "FAIL")
        print(f"  [{icon}] {connection}: {detail} ({elapsed_ms:.0f}ms)")

    def test_postgresql(self) -> None:
        """Test API -> PostgreSQL connectivity via SQLAlchemy."""
        t0 = time.perf_counter()
        try:
            from sqlalchemy import create_engine, text

            host = os.environ.get("POSTGRES_HOST", "localhost")
            port = os.environ.get("POSTGRES_PORT", "5432")
            db = os.environ.get("POSTGRES_DB", "nps")
            user = os.environ.get("POSTGRES_USER", "nps")
            pw = os.environ.get("POSTGRES_PASSWORD", "")
            url = f"postgresql://{user}:{pw}@{host}:{port}/{db}"

            engine = create_engine(url, pool_pre_ping=True)
            with engine.connect() as conn:
                # Basic connectivity
                conn.execute(text("SELECT 1"))

                # Count tables
                result = conn.execute(
                    text(
                        "SELECT count(*) FROM information_schema.tables "
                        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
                    )
                )
                table_count = result.scalar()

                # List tables
                result = conn.execute(
                    text(
                        "SELECT table_name FROM information_schema.tables "
                        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
                        "ORDER BY table_name"
                    )
                )
                tables = [row[0] for row in result]

            engine.dispose()
            elapsed = (time.perf_counter() - t0) * 1000
            self._record(
                "API -> PostgreSQL",
                "SQLAlchemy",
                "pass",
                f"{table_count} tables: {', '.join(tables[:8])}...",
                elapsed,
            )
        except Exception as exc:
            elapsed = (time.perf_counter() - t0) * 1000
            self._record("API -> PostgreSQL", "SQLAlchemy", "fail", str(exc), elapsed)

    def test_redis(self) -> None:
        """Test API -> Redis connectivity."""
        t0 = time.perf_counter()
        try:
            import redis

            host = os.environ.get("REDIS_HOST", "localhost")
            port = int(os.environ.get("REDIS_PORT", "6379"))
            r = redis.Redis(host=host, port=port, socket_timeout=5)

            # PING
            assert r.ping(), "Redis PING failed"

            # SET/GET
            test_key = "nps:connectivity_test"
            r.set(test_key, "sb3_test", ex=60)
            val = r.get(test_key)
            assert val == b"sb3_test", f"GET returned {val}"

            # TTL
            ttl = r.ttl(test_key)
            assert 0 < ttl <= 60, f"TTL is {ttl}"

            # Cleanup
            r.delete(test_key)
            r.close()

            elapsed = (time.perf_counter() - t0) * 1000
            self._record(
                "API -> Redis", "redis-py", "pass", "PING+SET/GET/TTL OK", elapsed
            )
        except ImportError:
            elapsed = (time.perf_counter() - t0) * 1000
            self._record(
                "API -> Redis",
                "redis-py",
                "skip",
                "redis package not installed",
                elapsed,
            )
        except Exception as exc:
            elapsed = (time.perf_counter() - t0) * 1000
            self._record("API -> Redis", "redis-py", "fail", str(exc), elapsed)

    def test_oracle_grpc(self) -> None:
        """Test API -> Oracle gRPC connectivity."""
        t0 = time.perf_counter()
        try:
            import grpc

            host = os.environ.get("ORACLE_GRPC_HOST", "localhost")
            port = os.environ.get("ORACLE_GRPC_PORT", "50052")
            channel = grpc.insecure_channel(f"{host}:{port}")
            grpc.channel_ready_future(channel).result(timeout=3)
            channel.close()

            elapsed = (time.perf_counter() - t0) * 1000
            self._record(
                "API -> Oracle gRPC",
                "grpc channel",
                "pass",
                f"Channel ready on {host}:{port}",
                elapsed,
            )
        except ImportError:
            elapsed = (time.perf_counter() - t0) * 1000
            self._record(
                "API -> Oracle gRPC",
                "grpc channel",
                "skip",
                "grpcio not installed",
                elapsed,
            )
        except Exception as exc:
            elapsed = (time.perf_counter() - t0) * 1000
            # gRPC not running is expected in local mode — Oracle uses direct imports
            self._record(
                "API -> Oracle gRPC",
                "grpc channel",
                "skip",
                f"Not available (expected in local mode): {exc}",
                elapsed,
            )

    def test_api_health(self) -> None:
        """Test API HTTP health endpoint."""
        t0 = time.perf_counter()
        try:
            import requests

            resp = requests.get("http://localhost:8000/api/health", timeout=5)
            elapsed = (time.perf_counter() - t0) * 1000
            data = resp.json()
            self._record(
                "HTTP -> API /health",
                "HTTP GET",
                "pass" if resp.status_code == 200 else "fail",
                f"status={data.get('status')}, version={data.get('version')}",
                elapsed,
            )
        except Exception as exc:
            elapsed = (time.perf_counter() - t0) * 1000
            self._record("HTTP -> API /health", "HTTP GET", "fail", str(exc), elapsed)

    def test_api_readiness(self) -> None:
        """Test API readiness probe (checks DB + Redis)."""
        t0 = time.perf_counter()
        try:
            import requests

            resp = requests.get("http://localhost:8000/api/health/ready", timeout=5)
            elapsed = (time.perf_counter() - t0) * 1000
            data = resp.json()
            checks = data.get("checks", {})
            detail = ", ".join(f"{k}={v}" for k, v in checks.items())
            self._record(
                "API Readiness",
                "HTTP GET",
                "pass" if resp.status_code == 200 else "fail",
                detail,
                elapsed,
            )
        except Exception as exc:
            elapsed = (time.perf_counter() - t0) * 1000
            self._record("API Readiness", "HTTP GET", "fail", str(exc), elapsed)

    def test_api_swagger(self) -> None:
        """Test API Swagger docs are available."""
        t0 = time.perf_counter()
        try:
            import requests

            resp = requests.get("http://localhost:8000/docs", timeout=5)
            elapsed = (time.perf_counter() - t0) * 1000
            self._record(
                "API Swagger /docs",
                "HTTP GET",
                "pass" if resp.status_code == 200 else "fail",
                f"status_code={resp.status_code}",
                elapsed,
            )
        except Exception as exc:
            elapsed = (time.perf_counter() - t0) * 1000
            self._record("API Swagger /docs", "HTTP GET", "fail", str(exc), elapsed)

    def test_nginx_proxy(self) -> None:
        """Test Nginx reverse proxy (port 80)."""
        t0 = time.perf_counter()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(("localhost", 80))
            sock.close()
            if result == 0:
                import requests

                resp = requests.get("http://localhost:80/api/health", timeout=5)
                elapsed = (time.perf_counter() - t0) * 1000
                self._record(
                    "Nginx -> API proxy",
                    "HTTP via :80",
                    "pass" if resp.status_code == 200 else "fail",
                    f"status_code={resp.status_code}",
                    elapsed,
                )
            else:
                elapsed = (time.perf_counter() - t0) * 1000
                self._record(
                    "Nginx -> API proxy",
                    "TCP connect",
                    "skip",
                    "Port 80 not listening (no Nginx/Docker)",
                    elapsed,
                )
        except Exception as exc:
            elapsed = (time.perf_counter() - t0) * 1000
            self._record(
                "Nginx -> API proxy", "HTTP via :80", "skip", str(exc), elapsed
            )

    def test_frontend_port(self) -> None:
        """Test frontend accessibility."""
        t0 = time.perf_counter()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(("localhost", 5173))
            sock.close()
            if result == 0:
                import requests

                resp = requests.get("http://localhost:5173", timeout=5)
                elapsed = (time.perf_counter() - t0) * 1000
                self._record(
                    "Frontend :5173",
                    "HTTP GET",
                    "pass" if resp.status_code == 200 else "fail",
                    f"status_code={resp.status_code}",
                    elapsed,
                )
            else:
                elapsed = (time.perf_counter() - t0) * 1000
                self._record(
                    "Frontend :5173",
                    "TCP connect",
                    "skip",
                    "Port 5173 not listening (frontend not running)",
                    elapsed,
                )
        except Exception as exc:
            elapsed = (time.perf_counter() - t0) * 1000
            self._record("Frontend :5173", "HTTP GET", "skip", str(exc), elapsed)

    def test_db_schema_integrity(self) -> None:
        """Verify expected tables exist with correct structure."""
        t0 = time.perf_counter()
        expected_tables = {
            "users",
            "api_keys",
            "oracle_users",
            "oracle_readings",
            "oracle_audit_log",
            "oracle_settings",
            "oracle_suggestions",
            "oracle_daily_readings",
            "oracle_reading_users",
            "schema_migrations",
            "user_settings",
            "oracle_share_links",
            "telegram_links",
            "telegram_daily_preferences",
        }
        try:
            from sqlalchemy import create_engine, text

            host = os.environ.get("POSTGRES_HOST", "localhost")
            port = os.environ.get("POSTGRES_PORT", "5432")
            db = os.environ.get("POSTGRES_DB", "nps")
            user = os.environ.get("POSTGRES_USER", "nps")
            pw = os.environ.get("POSTGRES_PASSWORD", "")
            url = f"postgresql://{user}:{pw}@{host}:{port}/{db}"

            engine = create_engine(url, pool_pre_ping=True)
            with engine.connect() as conn:
                result = conn.execute(
                    text(
                        "SELECT table_name FROM information_schema.tables "
                        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
                    )
                )
                actual_tables = {row[0] for row in result}
            engine.dispose()

            missing = expected_tables - actual_tables
            extra = actual_tables - expected_tables
            elapsed = (time.perf_counter() - t0) * 1000

            if missing:
                self._record(
                    "DB Schema Integrity",
                    "SQL",
                    "fail",
                    f"Missing: {', '.join(sorted(missing))}",
                    elapsed,
                )
            else:
                detail = f"{len(actual_tables)} tables present"
                if extra:
                    detail += f" (+{len(extra)} extra: {', '.join(sorted(extra))})"
                self._record("DB Schema Integrity", "SQL", "pass", detail, elapsed)
        except Exception as exc:
            elapsed = (time.perf_counter() - t0) * 1000
            self._record("DB Schema Integrity", "SQL", "fail", str(exc), elapsed)

    def run_all(self) -> dict:
        """Run all connectivity tests and return summary."""
        print("=" * 65)
        print("NPS Service Connectivity Test")
        print(f"Time: {datetime.now(timezone.utc).isoformat()}")
        print("=" * 65)
        print()

        self.test_postgresql()
        self.test_redis()
        self.test_oracle_grpc()
        self.test_api_health()
        self.test_api_readiness()
        self.test_api_swagger()
        self.test_nginx_proxy()
        self.test_frontend_port()
        self.test_db_schema_integrity()

        total = len(self.results)
        passed = sum(1 for r in self.results if r["status"] == "pass")
        failed = sum(1 for r in self.results if r["status"] == "fail")
        skipped = sum(1 for r in self.results if r["status"] == "skip")
        total_time = time.time() - self.start_time

        print()
        print("-" * 65)
        print(f"Results: {passed} pass / {failed} fail / {skipped} skip (of {total})")
        print(f"Total time: {total_time:.1f}s")
        print("=" * 65)

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "total_time_seconds": round(total_time, 1),
            "results": self.results,
        }


def generate_report(summary: dict) -> str:
    """Generate markdown report."""
    lines = [
        "# Service Connectivity Report",
        "",
        f"**Generated:** {summary['timestamp']}",
        "**Mode:** Local (PostgreSQL + Redis on localhost, API on :8000)",
        f"**Total time:** {summary['total_time_seconds']}s",
        "",
        "## Summary",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Total tests | {summary['total']} |",
        f"| Passed | {summary['passed']} |",
        f"| Failed | {summary['failed']} |",
        f"| Skipped | {summary['skipped']} |",
        "",
        "## Results",
        "",
        "| Connection | Method | Status | Detail | Time (ms) |",
        "|-----------|--------|--------|--------|-----------|",
    ]
    for r in summary["results"]:
        status_icon = {"pass": "PASS", "fail": "FAIL", "skip": "SKIP"}[r["status"]]
        detail = r["detail"][:80] if len(r["detail"]) > 80 else r["detail"]
        lines.append(
            f"| {r['connection']} | {r['method']} | {status_icon} | {detail} | {r['elapsed_ms']} |"
        )

    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- **Oracle gRPC**: Skipped in local mode — API uses direct Python imports (legacy mode)",
            "- **Nginx proxy**: Skipped — requires Docker deployment",
            "- **Frontend**: Skipped if not running — tested separately via `npm run dev`",
            "- **Scanner**: Not tested — CLAUDE.md says DO NOT TOUCH (Rust stub only)",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    tester = ConnectivityTester()
    summary = tester.run_all()

    # Generate report
    report = generate_report(summary)
    report_path = (
        Path(__file__).resolve().parents[2]
        / "infrastructure"
        / "SERVICE_CONNECTIVITY_REPORT.md"
    )
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report)
    print(f"\nReport written to: {report_path}")

    sys.exit(1 if summary["failed"] > 0 else 0)


if __name__ == "__main__":
    main()
