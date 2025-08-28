#!/bin/bash
set -e

echo "🗂️ Running database migrations..."
echo "🚀 Running database migrations..."
python migrate.py migrate || {
    echo "❌ Migration failed!"
    echo "⚠️ Migration warning (may be first run)"
    echo "🚀 Starting SafeWork application..."
}

echo "🚀 Starting SafeWork application..."
exec gunicorn --bind 0.0.0.0:$APP_PORT --workers 2 --worker-class sync --timeout 120 --keep-alive 2 --max-requests 1000 --max-requests-jitter 50 --log-level info app:app