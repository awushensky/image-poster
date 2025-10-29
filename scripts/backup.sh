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

# Calculate hash of the backup contents before compression
echo "[$(date)] Calculating backup hash..."
CURRENT_HASH=$(find "$TEMP_DIR" -type f -exec sha256sum {} \; | sort | sha256sum | cut -d' ' -f1)

# Check if the latest backup has the same hash
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | head -n 1)
HASH_FILE="$BACKUP_DIR/.last_backup_hash"

if [ -f "$HASH_FILE" ]; then
    LAST_HASH=$(cat "$HASH_FILE")
    if [ "$CURRENT_HASH" = "$LAST_HASH" ]; then
        echo "[$(date)] No changes detected (hash matches previous backup). Skipping backup."
        rm -rf "$TEMP_DIR"
        exit 0
    else
        echo "[$(date)] Changes detected. Creating new backup."
    fi
else
    echo "[$(date)] No previous backup hash found. Creating new backup."
fi

# Compress the backup
echo "[$(date)] Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$TEMP_DIR"

# Store the hash for next comparison
echo "$CURRENT_HASH" > "$HASH_FILE"

echo "[$(date)] Backup completed: $BACKUP_NAME.tar.gz"

# Calculate backup size
SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)
echo "[$(date)] Backup size: $SIZE"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +30 -delete
echo "[$(date)] Old backups cleaned up"
