#!/bin/sh
set -e

DB_PATH="/app/data/database.db"
UPLOADS_DIR="/app/uploads"
BACKUP_DIR="/app/backups"
SAFETY_BACKUP_DIR="/app/backups/safety"

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
mkdir -p "$SAFETY_BACKUP_DIR"  # Create safety backup directory

if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$SAFETY_BACKUP_DIR/database.db.before-restore-$SAFETY_TIMESTAMP"
fi
if [ -d "$UPLOADS_DIR" ]; then
    cp -r "$UPLOADS_DIR" "$SAFETY_BACKUP_DIR/uploads.before-restore-$SAFETY_TIMESTAMP"
fi

# Restore database
if [ -f "$EXTRACTED_DIR/database.db" ]; then
    echo "[$(date)] Restoring database..."
    cp "$EXTRACTED_DIR/database.db" "$DB_PATH"
else
    echo "Warning: No database found in backup"
fi

# Restore uploads
if [ -d "$EXTRACTED_DIR/uploads" ]; then
    echo "[$(date)] Restoring uploads directory..."
    rm -rf "$UPLOADS_DIR"
    cp -r "$EXTRACTED_DIR/uploads" "$UPLOADS_DIR"
else
    echo "Warning: No uploads directory found in backup"
fi

# Cleanup
rm -rf "$TEMP_RESTORE_DIR"

echo "[$(date)] Restore completed!"
echo "Previous state saved in: $SAFETY_BACKUP_DIR/"
echo "  - database.db.before-restore-$SAFETY_TIMESTAMP"
echo "  - uploads.before-restore-$SAFETY_TIMESTAMP/"
