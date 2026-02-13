#!/bin/bash
# NPS — Oracle Tables Backup Script
# Backs up only Oracle domain tables (not the full database).
#
# Usage:
#   ./oracle_backup.sh                             # Full backup (schema + data)
#   ./oracle_backup.sh --data-only                 # Data-only backup
#   ./oracle_backup.sh --non-interactive            # No prompts (for API/cron)
#   ./oracle_backup.sh --notify                     # Send Telegram notification
#   ./oracle_backup.sh --non-interactive --notify   # Combine flags
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$(dirname "$SCRIPT_DIR")"
V4_DIR="$(dirname "$DB_DIR")"
BACKUP_DIR="$V4_DIR/backups/oracle"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse flags
DATA_ONLY=false
NON_INTERACTIVE=false
NOTIFY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --data-only) DATA_ONLY=true; shift ;;
        --non-interactive) NON_INTERACTIVE=true; shift ;;
        --notify) NOTIFY=true; shift ;;
        *) echo "Unknown flag: $1"; exit 1 ;;
    esac
done

# Load environment
if [ -f "$V4_DIR/.env" ]; then
    # shellcheck source=/dev/null
    source "$V4_DIR/.env"
fi

POSTGRES_DB="${POSTGRES_DB:-nps}"
POSTGRES_USER="${POSTGRES_USER:-nps}"

# Oracle tables to back up
ORACLE_TABLES=(
    "oracle_users"
    "oracle_readings"
    "oracle_reading_users"
    "oracle_audit_log"
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

# Build pg_dump table flags
TABLE_FLAGS=""
for table in "${ORACLE_TABLES[@]}"; do
    TABLE_FLAGS="$TABLE_FLAGS -t $table"
done

# Determine backup type
if $DATA_ONLY; then
    BACKUP_FILE="$BACKUP_DIR/oracle_data_${TIMESTAMP}.sql.gz"
    DUMP_FLAGS="--data-only"
    BACKUP_TYPE="data-only"
else
    BACKUP_FILE="$BACKUP_DIR/oracle_full_${TIMESTAMP}.sql.gz"
    DUMP_FLAGS=""
    BACKUP_TYPE="full"
fi

echo "=== NPS Oracle Backup ==="
echo "Type: $BACKUP_TYPE"
echo "Database: $POSTGRES_DB"
echo "Tables: ${ORACLE_TABLES[*]}"
echo "Output: $BACKUP_FILE"

mkdir -p "$BACKUP_DIR"

# Dump and compress
# shellcheck disable=SC2086
docker compose -f "$V4_DIR/docker-compose.yml" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" $TABLE_FLAGS $DUMP_FLAGS | gzip > "$BACKUP_FILE"

# Verify
if [ -s "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    SIZE_BYTES=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat --format=%s "$BACKUP_FILE" 2>/dev/null || echo 0)
    echo "Backup complete: $BACKUP_FILE ($SIZE)"

    # Write metadata JSON sidecar
    META_FILE="${BACKUP_FILE%.sql.gz}.meta.json"
    cat > "$META_FILE" <<METAEOF
{
    "filename": "$(basename "$BACKUP_FILE")",
    "type": "$BACKUP_TYPE",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "size_bytes": $SIZE_BYTES,
    "tables": $(printf '"%s",' "${ORACLE_TABLES[@]}" | sed 's/,$//' | sed 's/^/[/' | sed 's/$/]/'),
    "database": "$POSTGRES_DB"
}
METAEOF
    echo "Metadata: $META_FILE"

    # Age-based retention: delete backups older than 30 days
    find "$BACKUP_DIR" -name "oracle_*.sql.gz" -mtime +30 -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "oracle_*.meta.json" -mtime +30 -delete 2>/dev/null || true
    echo "Retention: deleted backups older than 30 days"

    # Telegram notification
    if $NOTIFY; then
        notify_telegram "✅ *NPS Oracle Backup Complete*%0AType: $BACKUP_TYPE%0ASize: $SIZE%0AFile: $(basename "$BACKUP_FILE")"
    fi

    exit 0
else
    echo "ERROR: Backup file is empty!"
    rm -f "$BACKUP_FILE"

    if $NOTIFY; then
        notify_telegram "❌ *NPS Oracle Backup FAILED*%0AType: $BACKUP_TYPE%0AError: Backup file is empty"
    fi

    exit 1
fi
