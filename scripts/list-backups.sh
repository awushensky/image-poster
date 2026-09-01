#!/bin/sh

BACKUP_DIR="/app/backups"

describe() {
    label="$1"
    path="$2"
    size=$(du -h "$path" | cut -f1)
    mtime=$(stat -c %y "$path" 2>/dev/null || stat -f "%Sm" "$path")
    echo "$label - Size: $size - Last updated: $mtime"
}

echo "Current backups in $BACKUP_DIR:"
echo "================================"

FOUND=0

if [ -f "$BACKUP_DIR/app.db" ]; then
    describe "app.db" "$BACKUP_DIR/app.db"
    FOUND=1
fi

if [ -f "$BACKUP_DIR/uploads.tar.gz" ]; then
    describe "uploads.tar.gz" "$BACKUP_DIR/uploads.tar.gz"
    FOUND=1
fi

if [ "$FOUND" = "0" ]; then
    echo "No backups found"
fi

LEGACY=$(ls "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null || true)
if [ -n "$LEGACY" ]; then
    echo ""
    echo "Legacy dated backups (restore with: restore.sh <filename>):"
    for backup in $LEGACY; do
        filename=$(basename "$backup")
        size=$(du -h "$backup" | cut -f1)
        echo "  $filename - Size: $size"
    done
fi
