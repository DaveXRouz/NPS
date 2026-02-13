#!/bin/bash
# NPS — PostgreSQL full database restore script
#
# Usage:
#   ./restore.sh <backup_file>
#   ./restore.sh --non-interactive <backup_file>
#   ./restore.sh --non-interactive --notify <backup_file>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V4_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$V4_DIR/backups"

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
    echo "Usage: $0 [--non-interactive] [--notify] <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lt "$BACKUP_DIR"/nps_backup_*.sql.gz 2>/dev/null | head -10 || echo "  (none found)"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=== NPS Database Restore ==="
echo "Database: $POSTGRES_DB"
echo "Backup: $BACKUP_FILE"
echo ""
echo "WARNING: This will DROP and recreate the database!"

if ! $NON_INTERACTIVE; then
    read -p "Continue? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Drop and recreate database
docker compose -f "$V4_DIR/docker-compose.yml" exec -T postgres \
    psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
docker compose -f "$V4_DIR/docker-compose.yml" exec -T postgres \
    psql -U "$POSTGRES_USER" -c "CREATE DATABASE $POSTGRES_DB;"

# Restore
gunzip -c "$BACKUP_FILE" | docker compose -f "$V4_DIR/docker-compose.yml" exec -T postgres \
    psql -U "$POSTGRES_USER" "$POSTGRES_DB"

echo "Restore complete."
echo "JSON_OUTPUT:{\"status\": \"success\", \"backup\": \"$(basename "$BACKUP_FILE")\"}"

if $NOTIFY; then
    notify_telegram "✅ *NPS Full Database Restore Complete*%0ABackup: $(basename "$BACKUP_FILE")"
fi

exit 0
