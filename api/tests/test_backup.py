"""Tests for admin backup endpoints (Session 40)."""

from __future__ import annotations

import gzip
import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ─── Helpers ───────────────────────────────────────────────────────────────


def _create_backup_file(backup_dir: Path, filename: str, content: str = "test") -> Path:
    """Create a gzipped backup file and its metadata sidecar."""
    backup_dir.mkdir(parents=True, exist_ok=True)
    filepath = backup_dir / filename
    with gzip.open(filepath, "wt") as f:
        f.write(content)
    # Write metadata sidecar
    meta = {
        "type": "oracle_full" if "oracle" in filename else "full_database",
        "database": "nps",
        "tables": ["oracle_users", "oracle_readings"],
        "timestamp": "2026-02-14T12:00:00Z",
    }
    # Sidecar path matches _scan_backups: gz_file.with_suffix("").with_suffix(".meta.json")
    # e.g. oracle_full_20260214_120000.sql.gz → oracle_full_20260214_120000.meta.json
    meta_path = filepath.with_suffix("").with_suffix(".meta.json")
    meta_path.write_text(json.dumps(meta))
    return filepath


# ─── GET /admin/backups ────────────────────────────────────────────────────


@pytest.mark.anyio
async def test_list_backups_empty(client, tmp_path):
    """List backups when backup directory is empty."""
    with patch("app.routers.admin._PROJECT_ROOT", tmp_path):
        resp = await client.get("/api/admin/backups")
    assert resp.status_code == 200
    data = resp.json()
    assert data["backups"] == []
    assert data["total"] == 0
    assert "retention_policy" in data


@pytest.mark.anyio
async def test_list_backups_with_files(client, tmp_path):
    """List backups returns backup files with metadata."""
    oracle_dir = tmp_path / "backups" / "oracle"
    _create_backup_file(oracle_dir, "oracle_full_20260214_120000.sql.gz")
    _create_backup_file(oracle_dir, "oracle_data_20260214_130000.sql.gz")

    db_dir = tmp_path / "backups"
    _create_backup_file(db_dir, "nps_backup_20260214_140000.sql.gz")

    with patch("app.routers.admin._PROJECT_ROOT", tmp_path):
        resp = await client.get("/api/admin/backups")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    filenames = [b["filename"] for b in data["backups"]]
    assert "oracle_full_20260214_120000.sql.gz" in filenames
    assert "nps_backup_20260214_140000.sql.gz" in filenames


@pytest.mark.anyio
async def test_list_backups_forbidden_readonly(readonly_client, tmp_path):
    """Read-only users cannot list backups."""
    with patch("app.routers.admin._PROJECT_ROOT", tmp_path):
        resp = await readonly_client.get("/api/admin/backups")
    assert resp.status_code == 403


# ─── POST /admin/backups ──────────────────────────────────────────────────


@pytest.mark.anyio
async def test_trigger_backup_oracle_full(client, tmp_path):
    """Trigger oracle_full backup runs the shell script."""
    backup_dir = tmp_path / "backups" / "oracle"
    backup_dir.mkdir(parents=True, exist_ok=True)

    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = "Backup complete"
    mock_result.stderr = ""

    with (
        patch("app.routers.admin._PROJECT_ROOT", tmp_path),
        patch("subprocess.run", return_value=mock_result) as mock_run,
    ):
        resp = await client.post("/api/admin/backups", json={"backup_type": "oracle_full"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    # Verify subprocess.run was called
    mock_run.assert_called_once()
    call_args = mock_run.call_args
    assert "--non-interactive" in call_args[0][0]


@pytest.mark.anyio
async def test_trigger_backup_invalid_type(client, tmp_path):
    """Invalid backup type should be rejected (422)."""
    with patch("app.routers.admin._PROJECT_ROOT", tmp_path):
        resp = await client.post("/api/admin/backups", json={"backup_type": "invalid_type"})
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_trigger_backup_full_database(client, tmp_path):
    """Trigger full_database backup runs backup.sh."""
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = "Full backup complete"
    mock_result.stderr = ""

    with (
        patch("app.routers.admin._PROJECT_ROOT", tmp_path),
        patch("subprocess.run", return_value=mock_result),
    ):
        resp = await client.post("/api/admin/backups", json={"backup_type": "full_database"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"


@pytest.mark.anyio
async def test_trigger_backup_script_failure(client, tmp_path):
    """Backup script failure returns error status."""
    mock_result = MagicMock()
    mock_result.returncode = 1
    mock_result.stdout = ""
    mock_result.stderr = "pg_dump: error: connection refused"

    with (
        patch("app.routers.admin._PROJECT_ROOT", tmp_path),
        patch("subprocess.run", return_value=mock_result),
    ):
        resp = await client.post("/api/admin/backups", json={"backup_type": "oracle_full"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"


# ─── POST /admin/backups/restore ──────────────────────────────────────────


@pytest.mark.anyio
async def test_restore_backup(client, tmp_path):
    """Restore a backup file successfully."""
    oracle_dir = tmp_path / "backups" / "oracle"
    _create_backup_file(oracle_dir, "oracle_full_20260214_120000.sql.gz")

    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = 'JSON_OUTPUT:{"status": "success", "backup": "oracle_full_20260214_120000.sql.gz", "rows": {"oracle_users": 10}}'
    mock_result.stderr = ""

    with (
        patch("app.routers.admin._PROJECT_ROOT", tmp_path),
        patch("subprocess.run", return_value=mock_result),
    ):
        resp = await client.post(
            "/api/admin/backups/restore",
            json={"filename": "oracle_full_20260214_120000.sql.gz", "confirm": True},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"


@pytest.mark.anyio
async def test_restore_without_confirm(client, tmp_path):
    """Restore without confirm=True should fail."""
    oracle_dir = tmp_path / "backups" / "oracle"
    _create_backup_file(oracle_dir, "oracle_full_20260214_120000.sql.gz")

    with patch("app.routers.admin._PROJECT_ROOT", tmp_path):
        resp = await client.post(
            "/api/admin/backups/restore",
            json={"filename": "oracle_full_20260214_120000.sql.gz", "confirm": False},
        )
    assert resp.status_code == 400


@pytest.mark.anyio
async def test_restore_path_traversal(client, tmp_path):
    """Path traversal in restore filename should be rejected."""
    with patch("app.routers.admin._PROJECT_ROOT", tmp_path):
        resp = await client.post(
            "/api/admin/backups/restore",
            json={"filename": "../../../etc/passwd", "confirm": True},
        )
    assert resp.status_code == 400


@pytest.mark.anyio
async def test_restore_file_not_found(client, tmp_path):
    """Restoring a nonexistent backup returns 404."""
    with patch("app.routers.admin._PROJECT_ROOT", tmp_path):
        resp = await client.post(
            "/api/admin/backups/restore",
            json={"filename": "nonexistent.sql.gz", "confirm": True},
        )
    assert resp.status_code == 404


# ─── DELETE /admin/backups/{filename} ─────────────────────────────────────


@pytest.mark.anyio
async def test_delete_backup(client, tmp_path):
    """Delete a backup file and its metadata."""
    oracle_dir = tmp_path / "backups" / "oracle"
    filepath = _create_backup_file(oracle_dir, "oracle_full_20260214_120000.sql.gz")

    with patch("app.routers.admin._PROJECT_ROOT", tmp_path):
        resp = await client.delete("/api/admin/backups/oracle_full_20260214_120000.sql.gz")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert not filepath.exists()


@pytest.mark.anyio
async def test_delete_path_traversal(client, tmp_path):
    """Path traversal in delete filename should be rejected via POST restore."""
    # DELETE with slashes in path won't route correctly, so we test the
    # path-traversal guard via the restore endpoint which takes filename in body.
    with patch("app.routers.admin._PROJECT_ROOT", tmp_path):
        resp = await client.post(
            "/api/admin/backups/restore",
            json={"filename": "..%2F..%2Fetc%2Fpasswd", "confirm": True},
        )
    assert resp.status_code == 400


@pytest.mark.anyio
async def test_delete_nonexistent(client, tmp_path):
    """Deleting a nonexistent backup returns 404."""
    with patch("app.routers.admin._PROJECT_ROOT", tmp_path):
        resp = await client.delete("/api/admin/backups/nonexistent.sql.gz")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_forbidden_readonly(readonly_client, tmp_path):
    """Read-only users cannot delete backups."""
    with patch("app.routers.admin._PROJECT_ROOT", tmp_path):
        resp = await readonly_client.delete("/api/admin/backups/oracle_full_20260214_120000.sql.gz")
    assert resp.status_code == 403
