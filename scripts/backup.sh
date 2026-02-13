#!/bin/bash
# NPS — PostgreSQL full database backup script
#
# Usage:
#   ./backup.sh                              # Interactive backup
#   ./backup.sh --non-interactive            # No prompts (for API/cron)
#   ./backup.sh --notify                     # Send Telegram notification
#   ./backup.sh --non-interactive --notify   # Combine flags
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V4_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$V4_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/nps_backup_${TIMESTAMP}.sql.gz"

# Parse flags
NON_INTERACTIVE=false
NOTIFY=false

while [[ $# -gt 0 ]]; do
    case $1 in
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

echo "=== NPS Database Backup ==="
echo "Database: $POSTGRES_DB"
echo "Output: $BACKUP_FILE"

mkdir -p "$BACKUP_DIR"

# Dump and compress
docker compose -f "$V4_DIR/docker-compose.yml" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

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
    "type": "full_database",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "size_bytes": $SIZE_BYTES,
    "tables": [],
    "database": "$POSTGRES_DB"
}
METAEOF
    echo "Metadata: $META_FILE"

    # Age-based retention: delete full backups older than 60 days
    find "$BACKUP_DIR" -maxdepth 1 -name "nps_backup_*.sql.gz" -mtime +60 -delete 2>/dev/null || true
    find "$BACKUP_DIR" -maxdepth 1 -name "nps_backup_*.meta.json" -mtime +60 -delete 2>/dev/null || true
    echo "Retention: deleted full backups older than 60 days"

    if $NOTIFY; then
        notify_telegram "✅ *NPS Full Database Backup Complete*%0ASize: $SIZE%0AFile: $(basename "$BACKUP_FILE")"
    fi

    exit 0
else
    echo "ERROR: Backup file is empty!"
    rm -f "$BACKUP_FILE"

    if $NOTIFY; then
        notify_telegram "❌ *NPS Full Database Backup FAILED*%0AError: Backup file is empty"
    fi

    exit 1
fi
