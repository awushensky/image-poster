#!/bin/sh
set -e

# Start cron daemon
crond -b -l 2

echo "Starting application with backup service..."

# Execute the main command (your Node app)
exec "$@"
