#!/bin/sh
set -e

DB_PATH="/app/data/app.db"
UPLOADS_DIR="/app/uploads"
BACKUP_DIR="/app/backups"
INCLUDE_UPLOADS="${BACKUP_INCLUDE_UPLOADS:-true}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Database: WAL-consistent snapshot to a temp file, verified, then swapped in
# atomically so a failed run can never truncate/corrupt the last good backup.
if [ -f "$DB_PATH" ]; then
    DB_TMP="$BACKUP_DIR/app.db.tmp"
    echo "[$(date)] Backing up database..."
    rm -f "$DB_TMP"
    sqlite3 "$DB_PATH" ".backup '$DB_TMP'"

    echo "[$(date)] Verifying database backup integrity..."
    if ! CHECK=$(sqlite3 "$DB_TMP" "PRAGMA integrity_check;" 2>&1); then
        echo "[$(date)] ERROR: backup integrity check failed to run: $CHECK"
        rm -f "$DB_TMP"
        exit 1
    fi
    if [ "$CHECK" != "ok" ]; then
        echo "[$(date)] ERROR: backup integrity check failed: $CHECK"
        rm -f "$DB_TMP"
        exit 1
    fi

    mv "$DB_TMP" "$BACKUP_DIR/app.db"
    echo "[$(date)] Database backup completed: $BACKUP_DIR/app.db"
else
    echo "[$(date)] Warning: Database not found at $DB_PATH"
fi

# Uploads: same temp-file-verify-then-swap pattern. Disable with
# BACKUP_INCLUDE_UPLOADS=false if uploads are already covered by an external
# backup system (e.g. restic on the host bind mount) - bundling them here
# would just be duplicated, compressed (so poorly-deduplicated) storage.
if [ "$INCLUDE_UPLOADS" = "true" ]; then
    if [ -d "$UPLOADS_DIR" ]; then
        UPLOADS_TMP="$BACKUP_DIR/uploads.tar.gz.tmp"
        echo "[$(date)] Backing up uploads directory..."
        rm -f "$UPLOADS_TMP"
        tar -czf "$UPLOADS_TMP" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"

        echo "[$(date)] Verifying uploads archive integrity..."
        if ! tar -tzf "$UPLOADS_TMP" > /dev/null; then
            echo "[$(date)] ERROR: uploads archive verification failed"
            rm -f "$UPLOADS_TMP"
            exit 1
        fi

        mv "$UPLOADS_TMP" "$BACKUP_DIR/uploads.tar.gz"
        echo "[$(date)] Uploads backup completed: $BACKUP_DIR/uploads.tar.gz"
    else
        echo "[$(date)] Warning: Uploads directory not found at $UPLOADS_DIR"
    fi
else
    echo "[$(date)] Uploads backup disabled (BACKUP_INCLUDE_UPLOADS=$INCLUDE_UPLOADS)"
fi

echo "[$(date)] Backup run complete."
