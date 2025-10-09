#!/bin/sh
set -e

DB_PATH="/app/data/app.db"
UPLOADS_DIR="/app/uploads"
BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_$TIMESTAMP"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create temporary directory for this backup
TEMP_DIR="$BACKUP_DIR/$BACKUP_NAME"
mkdir -p "$TEMP_DIR"

echo "[$(date)] Starting backup..."

# Backup database
if [ -f "$DB_PATH" ]; then
    echo "[$(date)] Backing up database..."
    # Using .backup command handles WAL files properly
    sqlite3 "$DB_PATH" ".backup '$TEMP_DIR/app.db'"
else
    echo "[$(date)] Warning: Database not found at $DB_PATH"
fi

# Backup uploads directory
if [ -d "$UPLOADS_DIR" ]; then
    echo "[$(date)] Backing up uploads directory..."
    cp -r "$UPLOADS_DIR" "$TEMP_DIR/uploads"
else
    echo "[$(date)] Warning: Uploads directory not found at $UPLOADS_DIR"
fi

# Compress the backup
echo "[$(date)] Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$TEMP_DIR"

echo "[$(date)] Backup completed: $BACKUP_NAME.tar.gz"

# Calculate backup size
SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)
echo "[$(date)] Backup size: $SIZE"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +30 -delete
echo "[$(date)] Old backups cleaned up"
