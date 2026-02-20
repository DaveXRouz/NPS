"""Vault endpoint tests — CRUD + filtering + auth scopes."""

import uuid
from datetime import datetime, timezone

import pytest

from app.orm.finding import Finding

from .conftest import TestSession


def _create_finding(db, *, chain="btc", balance=0.0, score=0.0, address=None, source=None):
    """Insert a minimal Finding row and return it."""
    row = Finding(
        id=str(uuid.uuid4()),
        address=address or f"addr-{uuid.uuid4().hex[:8]}",
        chain=chain,
        balance=balance,
        score=score,
        source=source or "test",
        found_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ──── GET /findings ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_findings_empty(client):
    resp = await client.get("/api/vault/findings")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_findings_returns_data(client):
    db = TestSession()
    try:
        _create_finding(db, chain="btc", balance=1.5, score=85)
        _create_finding(db, chain="eth", balance=0.5, score=42)
    finally:
        db.close()

    resp = await client.get("/api/vault/findings")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert all("id" in f and "address" in f and "chain" in f for f in data)


@pytest.mark.asyncio
async def test_get_findings_filter_chain(client):
    db = TestSession()
    try:
        _create_finding(db, chain="btc")
        _create_finding(db, chain="eth")
        _create_finding(db, chain="btc")
    finally:
        db.close()

    resp = await client.get("/api/vault/findings", params={"chain": "btc"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert all(f["chain"] == "btc" for f in data)


@pytest.mark.asyncio
async def test_get_findings_filter_min_balance(client):
    db = TestSession()
    try:
        _create_finding(db, balance=0.0)
        _create_finding(db, balance=1.0)
        _create_finding(db, balance=5.0)
    finally:
        db.close()

    resp = await client.get("/api/vault/findings", params={"min_balance": 1.0})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert all(f["balance"] >= 1.0 for f in data)


@pytest.mark.asyncio
async def test_get_findings_filter_min_score(client):
    db = TestSession()
    try:
        _create_finding(db, score=10)
        _create_finding(db, score=50)
        _create_finding(db, score=90)
    finally:
        db.close()

    resp = await client.get("/api/vault/findings", params={"min_score": 50})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert all(f["score"] >= 50 for f in data)


@pytest.mark.asyncio
async def test_get_findings_pagination(client):
    db = TestSession()
    try:
        for _ in range(5):
            _create_finding(db)
    finally:
        db.close()

    resp = await client.get("/api/vault/findings", params={"limit": 2, "offset": 0})
    assert resp.status_code == 200
    assert len(resp.json()) == 2

    resp = await client.get("/api/vault/findings", params={"limit": 2, "offset": 4})
    assert resp.status_code == 200
    assert len(resp.json()) == 1


# ──── GET /summary ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_summary_empty(client):
    resp = await client.get("/api/vault/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["with_balance"] == 0
    assert data["by_chain"] == {}
    assert data["sessions"] == 0


@pytest.mark.asyncio
async def test_get_summary_with_data(client):
    db = TestSession()
    try:
        _create_finding(db, chain="btc", balance=1.5)
        _create_finding(db, chain="btc", balance=0.0)
        _create_finding(db, chain="eth", balance=0.5)
    finally:
        db.close()

    resp = await client.get("/api/vault/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert data["with_balance"] == 2
    assert data["by_chain"]["btc"] == 2
    assert data["by_chain"]["eth"] == 1


# ──── GET /search ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_findings_by_address(client):
    db = TestSession()
    try:
        _create_finding(db, address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
        _create_finding(db, address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")
        _create_finding(db, address="other-address-xyz")
    finally:
        db.close()

    resp = await client.get("/api/vault/search", params={"q": "1A1zP1"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert "1A1zP1" in data[0]["address"]


@pytest.mark.asyncio
async def test_search_findings_by_chain(client):
    db = TestSession()
    try:
        _create_finding(db, chain="btc")
        _create_finding(db, chain="ethereum")
    finally:
        db.close()

    resp = await client.get("/api/vault/search", params={"q": "ether"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1


@pytest.mark.asyncio
async def test_search_requires_query(client):
    resp = await client.get("/api/vault/search")
    assert resp.status_code == 422  # missing required 'q' param


# ──── POST /export ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_export_vault_json(client):
    db = TestSession()
    try:
        _create_finding(db)
        _create_finding(db)
    finally:
        db.close()

    resp = await client.post("/api/vault/export", json={"format": "json"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["format"] == "json"
    assert data["record_count"] == 2


@pytest.mark.asyncio
async def test_export_vault_csv(client):
    resp = await client.post("/api/vault/export", json={"format": "csv"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["format"] == "csv"
    assert data["record_count"] == 0  # empty vault


@pytest.mark.asyncio
async def test_export_vault_chain_filter(client):
    db = TestSession()
    try:
        _create_finding(db, chain="btc")
        _create_finding(db, chain="eth")
    finally:
        db.close()

    resp = await client.post("/api/vault/export", json={"format": "json", "chain": "btc"})
    assert resp.status_code == 200
    assert resp.json()["record_count"] == 1


# ──── Auth scope tests ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_vault_unauth_401(unauth_client):
    resp = await unauth_client.get("/api/vault/findings")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_vault_readonly_can_read(readonly_client):
    resp = await readonly_client.get("/api/vault/findings")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_vault_readonly_can_get_summary(readonly_client):
    resp = await readonly_client.get("/api/vault/summary")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_vault_readonly_can_search(readonly_client):
    resp = await readonly_client.get("/api/vault/search", params={"q": "test"})
    assert resp.status_code == 200
