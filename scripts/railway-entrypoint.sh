#!/bin/sh
# Railway entrypoint — wait for PostgreSQL, init schema, start uvicorn.
set -e

echo "=== NPS Railway Entrypoint ==="

# ── 1. Wait for PostgreSQL ─────────────────────────────────────────────
MAX_WAIT=30
WAITED=0

if [ -n "$PGHOST" ]; then
  echo "Waiting for PostgreSQL at ${PGHOST}:${PGPORT:-5432}..."
  while ! pg_isready -h "${PGHOST}" -p "${PGPORT:-5432}" -q 2>/dev/null; do
    WAITED=$((WAITED + 1))
    if [ $WAITED -ge $MAX_WAIT ]; then
      echo "WARN: PostgreSQL not ready after ${MAX_WAIT}s, proceeding anyway"
      break
    fi
    sleep 1
  done
  if [ $WAITED -lt $MAX_WAIT ]; then
    echo "PostgreSQL is ready (waited ${WAITED}s)"
  fi
else
  echo "WARN: PGHOST not set — skipping PostgreSQL readiness check"
fi

# ── 2. Initialize database schema (idempotent) ────────────────────────
if [ -f /app/init.sql ] && [ -n "$PGHOST" ]; then
  echo "Running database schema initialization..."
  psql \
    "postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE:-railway}" \
    -f /app/init.sql \
    --quiet \
    2>&1 | grep -v "NOTICE\|already exists" || true
  echo "Database schema initialization complete"
fi

# ── 3. Start uvicorn ──────────────────────────────────────────────────
echo "Starting uvicorn on port ${PORT:-8000}..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers 2 \
  --log-level warning
