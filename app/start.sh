#!/bin/bash
set -e

echo "🏗️ Database schema initialized by MySQL image"
echo "🔍 Pre-start validation..."

# Environment validation
echo "📋 Environment check:"
echo "  - FLASK_CONFIG: $FLASK_CONFIG"
echo "  - APP_PORT: $APP_PORT"
echo "  - MYSQL_HOST: $MYSQL_HOST"
echo "  - REDIS_HOST: $REDIS_HOST"

# Python import test
echo "🐍 Python import test..."
python -c "
try:
    from app import create_app
    app = create_app()
    print('✅ Flask app creation: SUCCESS')
    
    # Test database connection
    with app.app_context():
        from models import db
        db.engine.execute(db.text('SELECT 1'))
        print('✅ Database connection: SUCCESS')
        
except Exception as e:
    print(f'❌ Pre-start error: {e}')
    import traceback
    traceback.print_exc()
    exit(1)
"

echo "🚀 Starting SafeWork application..."
exec gunicorn --bind 0.0.0.0:$APP_PORT --workers 2 --worker-class sync --timeout 120 --keep-alive 2 --max-requests 1000 --max-requests-jitter 50 --log-level info --access-logfile - --error-logfile - app:app