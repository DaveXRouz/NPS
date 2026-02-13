#!/bin/bash
# NPS Backup Cron Wrapper
# Usage: backup_cron.sh daily|weekly
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V4_DIR="$(dirname "$SCRIPT_DIR")"
MODE="${1:-daily}"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "[$TIMESTAMP] Starting $MODE backup..."

case "$MODE" in
    daily)
        # Oracle tables backup
        "$V4_DIR/database/scripts/oracle_backup.sh" --non-interactive --notify
        EXIT_CODE=$?
        ;;
    weekly)
        # Full database backup
        "$V4_DIR/scripts/backup.sh" --non-interactive --notify
        EXIT_CODE=$?
        ;;
    *)
        echo "Unknown mode: $MODE (expected: daily|weekly)"
        exit 1
        ;;
esac

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$TIMESTAMP] $MODE backup completed successfully"
else
    echo "[$TIMESTAMP] $MODE backup FAILED with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
