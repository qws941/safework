#!/bin/bash
set -e

echo "🏗️ Database schema initialized by MySQL image"
echo "🚀 Starting SafeWork application..."
exec gunicorn --bind 0.0.0.0:$APP_PORT --workers 2 --worker-class sync --timeout 120 --keep-alive 2 --max-requests 1000 --max-requests-jitter 50 --log-level warning --access-logfile - --error-logfile - app:app