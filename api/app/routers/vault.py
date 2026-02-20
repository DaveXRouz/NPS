"""Vault endpoints — findings storage and retrieval.

All vault endpoints require authentication. Read operations require
'vault:read' scope, write operations require 'vault:write' scope,
and admin operations require 'vault:admin' scope.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func as sa_func
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user, require_scope
from app.models.vault import (
    ExportRequest,
    ExportResponse,
    FindingResponse,
    VaultSummaryResponse,
)
from app.orm.finding import Finding

logger = logging.getLogger(__name__)

router = APIRouter()


def _finding_to_response(row: Finding) -> FindingResponse:
    """Convert a Finding ORM row to the API response model."""
    found_at = row.found_at
    if isinstance(found_at, str):
        found_at = datetime.fromisoformat(found_at)

    return FindingResponse(
        id=str(row.id),
        address=row.address,
        chain=row.chain,
        balance=float(row.balance) if row.balance is not None else 0.0,
        score=float(row.score) if row.score is not None else 0.0,
        source=row.source,
        puzzle_number=row.puzzle_number,
        score_breakdown=row.score_breakdown,
        metadata=row.extra_metadata or {},
        found_at=found_at,
        session_id=str(row.session_id) if row.session_id else None,
    )


@router.get(
    "/findings",
    response_model=list[FindingResponse],
    dependencies=[Depends(require_scope("vault:read"))],
)
async def get_findings(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    chain: str | None = None,
    min_balance: float | None = None,
    min_score: float | None = None,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Get vault findings with pagination and filtering."""
    query = db.query(Finding)

    if chain:
        query = query.filter(Finding.chain == chain)
    if min_balance is not None:
        query = query.filter(Finding.balance >= min_balance)
    if min_score is not None:
        query = query.filter(Finding.score >= min_score)

    query = query.order_by(Finding.found_at.desc())
    rows = query.offset(offset).limit(limit).all()

    return [_finding_to_response(row) for row in rows]


@router.get(
    "/summary",
    response_model=VaultSummaryResponse,
    dependencies=[Depends(require_scope("vault:read"))],
)
async def get_summary(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Get vault summary statistics."""
    total = db.query(sa_func.count(Finding.id)).scalar() or 0

    with_balance = db.query(sa_func.count(Finding.id)).filter(Finding.balance > 0).scalar() or 0

    # Count by chain
    chain_rows = db.query(Finding.chain, sa_func.count(Finding.id)).group_by(Finding.chain).all()
    by_chain = {chain: count for chain, count in chain_rows}

    # Count distinct sessions
    sessions = (
        db.query(sa_func.count(sa_func.distinct(Finding.session_id)))
        .filter(Finding.session_id.isnot(None))
        .scalar()
        or 0
    )

    return VaultSummaryResponse(
        total=total,
        with_balance=with_balance,
        by_chain=by_chain,
        sessions=sessions,
    )


@router.get(
    "/search",
    response_model=list[FindingResponse],
    dependencies=[Depends(require_scope("vault:read"))],
)
async def search_findings(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Search findings by address or metadata."""
    pattern = f"%{q}%"
    rows = (
        db.query(Finding)
        .filter(
            or_(
                Finding.address.ilike(pattern),
                Finding.source.ilike(pattern),
                Finding.chain.ilike(pattern),
            )
        )
        .order_by(Finding.found_at.desc())
        .limit(limit)
        .all()
    )
    return [_finding_to_response(row) for row in rows]


@router.post(
    "/export",
    response_model=ExportResponse,
    dependencies=[Depends(require_scope("vault:read"))],
)
async def export_vault(
    request: ExportRequest,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Export vault data as CSV or JSON.

    NOTE: Full file-based export with download URLs requires object storage
    (S3, GCS, or local file serve). For now, this returns the record count
    and a placeholder URL. A future iteration will generate real files.
    """
    query = db.query(Finding)
    if request.chain:
        query = query.filter(Finding.chain == request.chain)

    record_count = query.count()

    # Placeholder — real export would write to a file/S3 and return a URL
    return ExportResponse(
        format=request.format,
        url="",
        record_count=record_count,
    )
