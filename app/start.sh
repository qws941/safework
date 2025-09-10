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