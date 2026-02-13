#!/bin/bash
# NPS — Oracle Tables Restore Script
# Restores only Oracle domain tables from a backup file.
# Does NOT drop the entire database — only truncates Oracle tables.
#
# Usage:
#   ./oracle_restore.sh <backup_file.sql.gz>
#   ./oracle_restore.sh --non-interactive <backup_file.sql.gz>
#   ./oracle_restore.sh --non-interactive --notify <backup_file.sql.gz>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$(dirname "$SCRIPT_DIR")"
V4_DIR="$(dirname "$DB_DIR")"
BACKUP_DIR="$V4_DIR/backups/oracle"

# Parse flags
NON_INTERACTIVE=false
NOTIFY=false
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --non-interactive) NON_INTERACTIVE=true; shift ;;
        --notify) NOTIFY=true; shift ;;
        *) POSITIONAL_ARGS+=("$1"); shift ;;
    esac
done

BACKUP_FILE="${POSITIONAL_ARGS[0]:-}"

# Load environment
if [ -f "$V4_DIR/.env" ]; then
    # shellcheck source=/dev/null
    source "$V4_DIR/.env"
fi

POSTGRES_DB="${POSTGRES_DB:-nps}"
POSTGRES_USER="${POSTGRES_USER:-nps}"

# Oracle tables (in dependency order for truncation)
ORACLE_TABLES=(
    "oracle_reading_users"
    "oracle_audit_log"
    "oracle_readings"
    "oracle_users"
)

# Telegram notification helper
notify_telegram() {
    local message="$1"
    if [ -n "${NPS_BOT_TOKEN:-}" ] && [ -n "${NPS_CHAT_ID:-}" ]; then
        curl -s -X POST "https://api.telegram.org/bot${NPS_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${NPS_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=Markdown" > /dev/null 2>&1 || true
    fi
}

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 [--non-interactive] [--notify] <backup_file.sql.gz>"
    echo ""
    echo "Available Oracle backups:"
    ls -lt "$BACKUP_DIR"/oracle_*.sql.gz 2>/dev/null | head -10 || echo "  (none found)"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=== NPS Oracle Restore ==="
echo "Database: $POSTGRES_DB"
echo "Backup: $BACKUP_FILE"
echo "Tables: ${ORACLE_TABLES[*]}"
echo ""
echo "WARNING: This will TRUNCATE all Oracle tables and restore from backup!"

if ! $NON_INTERACTIVE; then
    read -p "Continue? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Truncate Oracle tables (cascade handles FK dependencies)
echo "Truncating Oracle tables..."
docker compose -f "$V4_DIR/docker-compose.yml" exec -T postgres \
    psql -U "$POSTGRES_USER" "$POSTGRES_DB" -c \
    "TRUNCATE oracle_reading_users, oracle_audit_log, oracle_readings, oracle_users RESTART IDENTITY CASCADE;"

# Restore from backup
echo "Restoring from backup..."
gunzip -c "$BACKUP_FILE" | docker compose -f "$V4_DIR/docker-compose.yml" exec -T postgres \
    psql -U "$POSTGRES_USER" "$POSTGRES_DB"

# Verify row counts
echo ""
echo "=== Verification ==="
declare -A ROW_COUNTS
for table in oracle_users oracle_readings oracle_reading_users oracle_audit_log; do
    COUNT=$(docker compose -f "$V4_DIR/docker-compose.yml" exec -T postgres \
        psql -U "$POSTGRES_USER" "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
    ROW_COUNTS[$table]="${COUNT:-0}"
    echo "  $table: ${COUNT:-0} rows"
done

echo ""
echo "Restore complete."

# JSON output for API consumption
echo ""
echo "JSON_OUTPUT:{\"status\": \"success\", \"backup\": \"$(basename "$BACKUP_FILE")\", \"rows\": {\"oracle_users\": ${ROW_COUNTS[oracle_users]:-0}, \"oracle_readings\": ${ROW_COUNTS[oracle_readings]:-0}, \"oracle_reading_users\": ${ROW_COUNTS[oracle_reading_users]:-0}, \"oracle_audit_log\": ${ROW_COUNTS[oracle_audit_log]:-0}}}"

if $NOTIFY; then
    notify_telegram "✅ *NPS Oracle Restore Complete*%0ABackup: $(basename "$BACKUP_FILE")%0ATables restored: ${#ORACLE_TABLES[@]}"
fi

exit 0
