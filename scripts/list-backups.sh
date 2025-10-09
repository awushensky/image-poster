#!/bin/sh

BACKUP_DIR="/app/backups"

echo "Available backups:"
echo "=================="

if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.tar.gz 2>/dev/null)" ]; then
    echo "No backups found"
    exit 0
fi

for backup in "$BACKUP_DIR"/backup_*.tar.gz; do
    if [ -f "$backup" ]; then
        filename=$(basename "$backup")
        size=$(du -h "$backup" | cut -f1)
        date=$(stat -c %y "$backup" 2>/dev/null || stat -f "%Sm" "$backup")
        echo "$filename - Size: $size - Date: $date"
    fi
done
