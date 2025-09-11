#!/bin/bash
set -e

echo "🏗️ SafeWork Application Starting..."
echo "🔍 Pre-start validation and dependency checks..."

# Environment validation
echo "📋 Environment check:"
echo "  - FLASK_CONFIG: $FLASK_CONFIG"
echo "  - APP_PORT: $APP_PORT"
echo "  - MYSQL_HOST: $MYSQL_HOST"
echo "  - REDIS_HOST: $REDIS_HOST"

# Function to wait for service availability
wait_for_service() {
    local service_name=$1
    local host=$2
    local port=$3
    local timeout=${4:-60}
    
    echo "⏳ Waiting for $service_name ($host:$port) to be ready..."
    
    for i in $(seq 1 $timeout); do
        if timeout 5 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        echo "⏳ $service_name not ready yet... ($i/$timeout)"
        sleep 2
    done
    
    echo "❌ $service_name failed to become ready within ${timeout} attempts"
    return 1
}

# Wait for MySQL (with fallback to localhost if MYSQL_HOST is container name)
if ! wait_for_service "MySQL" "${MYSQL_HOST}" "${MYSQL_PORT:-3306}" 30; then
    echo "⚠️ MySQL not accessible via ${MYSQL_HOST}, trying localhost..."
    if ! wait_for_service "MySQL" "localhost" "3306" 10; then
        echo "❌ MySQL completely unavailable, but continuing (may be external DB)"
    fi
fi

# Wait for Redis (with fallback to localhost if REDIS_HOST is container name)
if ! wait_for_service "Redis" "${REDIS_HOST}" "${REDIS_PORT:-6379}" 30; then
    echo "⚠️ Redis not accessible via ${REDIS_HOST}, trying localhost..."
    if ! wait_for_service "Redis" "localhost" "6379" 10; then
        echo "❌ Redis completely unavailable, but continuing (may be external cache)"
    fi
fi

# Python import test
echo "🐍 Python import test..."
python -c "
try:
    from app import create_app
    app = create_app()
    print('✅ Flask app creation: SUCCESS')
    
    # Test database connection and create default users
    with app.app_context():
        from models import db, User
        db.session.execute(db.text('SELECT 1'))
        print('✅ Database connection: SUCCESS')
        
        # Create default anonymous user if not exists
        anon = User.query.filter_by(id=1).first()
        if not anon:
            anon = User(
                id=1,
                username='anonymous',
                email='anonymous@safework.com',
                is_admin=False,
            )
            anon.set_password('anonymous_password_2024')
            db.session.add(anon)
            db.session.commit()
            print('✅ Anonymous user created')
        else:
            print('✅ Anonymous user exists')

        # Create default admin user if not exists
        import os
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username=os.environ.get('ADMIN_USERNAME', 'admin'),
                email='admin@safework.com',
                is_admin=True,
            )
            admin.set_password(os.environ.get('ADMIN_PASSWORD', 'safework2024'))
            db.session.add(admin)
            db.session.commit()
            print('✅ Admin user created')
        else:
            print('✅ Admin user exists')
        
except Exception as e:
    print(f'❌ Pre-start error: {e}')
    import traceback
    traceback.print_exc()
    exit(1)
"

echo "🚀 Starting SafeWork application..."
exec gunicorn --bind 0.0.0.0:$APP_PORT --workers 2 --worker-class sync --timeout 120 --keep-alive 2 --max-requests 1000 --max-requests-jitter 50 --log-level info --access-logfile - --error-logfile - app:app