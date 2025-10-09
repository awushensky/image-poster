#!/bin/sh
set -e

DB_PATH="/app/data/app.db"
UPLOADS_DIR="/app/uploads"
BACKUP_DIR="/app/backups"
SAFETY_BACKUP_DIR="/app/data/backups/safety"

if [ -z "$1" ]; then
    echo "Usage: docker exec image-poster /app/scripts/restore.sh <backup_filename>"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=========================================="
echo "WARNING: This will restore both:"
echo "  - Database at $DB_PATH"
echo "  - Uploads directory at $UPLOADS_DIR"
echo "=========================================="
echo "Press Ctrl+C within 5 seconds to cancel..."
sleep 5

TEMP_RESTORE_DIR="$BACKUP_DIR/temp_restore"
mkdir -p "$TEMP_RESTORE_DIR"

echo "[$(date)] Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_RESTORE_DIR"

# Find the extracted directory (should be named backup_TIMESTAMP)
EXTRACTED_DIR=$(find "$TEMP_RESTORE_DIR" -maxdepth 1 -type d -name "backup_*" | head -n 1)

if [ -z "$EXTRACTED_DIR" ]; then
    echo "Error: Could not find extracted backup directory"
    rm -rf "$TEMP_RESTORE_DIR"
    exit 1
fi

# Backup current state before restoring
echo "[$(date)] Creating safety backup of current state..."
SAFETY_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$SAFETY_BACKUP_DIR"

if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$SAFETY_BACKUP_DIR/app.db.before-restore-$SAFETY_TIMESTAMP"
    # Also backup WAL files if they exist
    [ -f "$DB_PATH-shm" ] && cp "$DB_PATH-shm" "$SAFETY_BACKUP_DIR/app.db-shm.before-restore-$SAFETY_TIMESTAMP"
    [ -f "$DB_PATH-wal" ] && cp "$DB_PATH-wal" "$SAFETY_BACKUP_DIR/app.db-wal.before-restore-$SAFETY_TIMESTAMP"
fi
if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
    cp -r "$UPLOADS_DIR" "$SAFETY_BACKUP_DIR/uploads.before-restore-$SAFETY_TIMESTAMP"
fi

# Restore database
if [ -f "$EXTRACTED_DIR/app.db" ]; then
    echo "[$(date)] Restoring database..."
    # Remove WAL files before restoring
    rm -f "$DB_PATH-shm" "$DB_PATH-wal"
    cp "$EXTRACTED_DIR/app.db" "$DB_PATH"
    echo "[$(date)] Database restored successfully"
else
    echo "Warning: No database found in backup"
fi

# Restore uploads
if [ -d "$EXTRACTED_DIR/uploads" ]; then
    echo "[$(date)] Restoring uploads directory..."
    # Remove all contents but keep the directory
    find "$UPLOADS_DIR" -mindepth 1 -delete
    # Copy contents from backup
    if [ "$(ls -A "$EXTRACTED_DIR/uploads" 2>/dev/null)" ]; then
        cp -r "$EXTRACTED_DIR/uploads"/* "$UPLOADS_DIR"/
        echo "[$(date)] Uploads restored successfully"
    else
        echo "Backup uploads directory is empty"
    fi
else
    echo "Warning: No uploads directory found in backup"
fi

# Cleanup
rm -rf "$TEMP_RESTORE_DIR"

echo "[$(date)] Restore completed!"
echo "Previous state saved in: $SAFETY_BACKUP_DIR/"
echo "  - app.db.before-restore-$SAFETY_TIMESTAMP"
if [ -d "$SAFETY_BACKUP_DIR/uploads.before-restore-$SAFETY_TIMESTAMP" ]; then
    echo "  - uploads.before-restore-$SAFETY_TIMESTAMP/"
fi