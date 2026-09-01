#!/bin/sh
set -e

DB_PATH="/app/data/app.db"
UPLOADS_DIR="/app/uploads"
BACKUP_DIR="/app/backups"
SAFETY_BACKUP_DIR="/app/data/backups/safety"

safety_backup() {
    SAFETY_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    mkdir -p "$SAFETY_BACKUP_DIR"

    if [ -f "$DB_PATH" ]; then
        cp "$DB_PATH" "$SAFETY_BACKUP_DIR/app.db.before-restore-$SAFETY_TIMESTAMP"
        [ -f "$DB_PATH-shm" ] && cp "$DB_PATH-shm" "$SAFETY_BACKUP_DIR/app.db-shm.before-restore-$SAFETY_TIMESTAMP"
        [ -f "$DB_PATH-wal" ] && cp "$DB_PATH-wal" "$SAFETY_BACKUP_DIR/app.db-wal.before-restore-$SAFETY_TIMESTAMP"
    fi
    if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
        cp -r "$UPLOADS_DIR" "$SAFETY_BACKUP_DIR/uploads.before-restore-$SAFETY_TIMESTAMP"
    fi

    echo "[$(date)] Previous state saved in: $SAFETY_BACKUP_DIR/"
}

# Restores one of the old dated backup_TIMESTAMP.tar.gz archives (app.db +
# uploads bundled together inside). Kept so existing backups made before the
# switch to a single overwritten-in-place app.db / uploads.tar.gz stay restorable.
restore_legacy_tarball() {
    BACKUP_FILE="$BACKUP_DIR/$1"

    if [ ! -f "$BACKUP_FILE" ]; then
        echo "Error: Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    echo "=========================================="
    echo "WARNING: This will restore both:"
    echo "  - Database at $DB_PATH"
    echo "  - Uploads directory at $UPLOADS_DIR"
    echo "from legacy archive $1"
    echo "=========================================="
    echo "Press Ctrl+C within 5 seconds to cancel..."
    sleep 5

    TEMP_RESTORE_DIR="$BACKUP_DIR/temp_restore"
    mkdir -p "$TEMP_RESTORE_DIR"

    echo "[$(date)] Extracting legacy backup..."
    tar -xzf "$BACKUP_FILE" -C "$TEMP_RESTORE_DIR"

    EXTRACTED_DIR=$(find "$TEMP_RESTORE_DIR" -maxdepth 1 -type d -name "backup_*" | head -n 1)
    if [ -z "$EXTRACTED_DIR" ]; then
        echo "Error: Could not find extracted backup directory"
        rm -rf "$TEMP_RESTORE_DIR"
        exit 1
    fi

    safety_backup

    if [ -f "$EXTRACTED_DIR/app.db" ]; then
        echo "[$(date)] Restoring database..."
        rm -f "$DB_PATH-shm" "$DB_PATH-wal"
        cp "$EXTRACTED_DIR/app.db" "$DB_PATH"
        echo "[$(date)] Database restored successfully"
    else
        echo "Warning: No database found in legacy archive"
    fi

    if [ -d "$EXTRACTED_DIR/uploads" ]; then
        echo "[$(date)] Restoring uploads directory..."
        find "$UPLOADS_DIR" -mindepth 1 -delete
        if [ "$(ls -A "$EXTRACTED_DIR/uploads" 2>/dev/null)" ]; then
            cp -r "$EXTRACTED_DIR/uploads"/* "$UPLOADS_DIR"/
        fi
        echo "[$(date)] Uploads restored successfully"
    else
        echo "Warning: No uploads directory found in legacy archive"
    fi

    rm -rf "$TEMP_RESTORE_DIR"
    echo "[$(date)] Restore completed!"
}

# Restores from the current overwritten-in-place backup.sh output:
# $BACKUP_DIR/app.db and, if present, $BACKUP_DIR/uploads.tar.gz.
restore_current() {
    DB_BACKUP="$BACKUP_DIR/app.db"
    UPLOADS_BACKUP="$BACKUP_DIR/uploads.tar.gz"

    if [ ! -f "$DB_BACKUP" ] && [ ! -f "$UPLOADS_BACKUP" ]; then
        echo "Error: No current backups found in $BACKUP_DIR (expected app.db and/or uploads.tar.gz)"
        exit 1
    fi

    echo "=========================================="
    echo "WARNING: This will restore from the current backup:"
    [ -f "$DB_BACKUP" ] && echo "  - Database at $DB_PATH"
    [ -f "$UPLOADS_BACKUP" ] && echo "  - Uploads directory at $UPLOADS_DIR"
    echo "=========================================="
    echo "Press Ctrl+C within 5 seconds to cancel..."
    sleep 5

    safety_backup

    if [ -f "$DB_BACKUP" ]; then
        echo "[$(date)] Restoring database..."
        rm -f "$DB_PATH-shm" "$DB_PATH-wal"
        cp "$DB_BACKUP" "$DB_PATH"
        echo "[$(date)] Database restored successfully"
    fi

    if [ -f "$UPLOADS_BACKUP" ]; then
        echo "[$(date)] Restoring uploads directory..."
        TEMP_RESTORE_DIR="$BACKUP_DIR/temp_restore"
        mkdir -p "$TEMP_RESTORE_DIR"
        tar -xzf "$UPLOADS_BACKUP" -C "$TEMP_RESTORE_DIR"

        find "$UPLOADS_DIR" -mindepth 1 -delete
        if [ -d "$TEMP_RESTORE_DIR/uploads" ] && [ "$(ls -A "$TEMP_RESTORE_DIR/uploads" 2>/dev/null)" ]; then
            cp -r "$TEMP_RESTORE_DIR/uploads"/* "$UPLOADS_DIR"/
        fi
        rm -rf "$TEMP_RESTORE_DIR"
        echo "[$(date)] Uploads restored successfully"
    fi

    echo "[$(date)] Restore completed!"
}

case "$1" in
    "")
        restore_current
        ;;
    *.tar.gz)
        restore_legacy_tarball "$1"
        ;;
    *)
        echo "Usage:"
        echo "  docker exec image-poster-backup /app/scripts/restore.sh                          # restore current app.db / uploads.tar.gz"
        echo "  docker exec image-poster-backup /app/scripts/restore.sh <legacy_backup_file.tar.gz>"
        echo ""
        echo "Available current backups:"
        ls -lh "$BACKUP_DIR/app.db" "$BACKUP_DIR/uploads.tar.gz" 2>/dev/null || echo "  none"
        echo "Available legacy backups:"
        ls -lh "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null || echo "  none"
        exit 1
        ;;
esac
