import os
from flask import Flask, render_template, redirect, url_for, flash, request
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_migrate import Migrate
from models import db, User, Survey, SurveyStatistics, AuditLog
from config import config
import redis
from datetime import datetime

def create_app(config_name=None):
    """Application factory"""
    app = Flask(__name__)
    
    # Load configuration
    config_name = config_name or os.environ.get('FLASK_CONFIG', 'production')
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    migrate = Migrate(app, db)
    
    # Initialize Login Manager
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = '이 페이지에 접근하려면 로그인이 필요합니다.'
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Initialize Redis
    redis_client = redis.Redis(
        host=app.config['REDIS_HOST'],
        port=app.config['REDIS_PORT'],
        password=app.config['REDIS_PASSWORD'],
        db=app.config['REDIS_DB'],
        decode_responses=True
    )
    app.redis = redis_client
    
    # Register blueprints
    from routes.main import main_bp
    from routes.auth import auth_bp
    from routes.survey import survey_bp
    from routes.admin import admin_bp
    from routes.health import health_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(survey_bp, url_prefix='/survey')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(health_bp)
    
    # Create database tables with retry logic
    with app.app_context():
        import time
        for i in range(30):  # Try for 30 seconds
            try:
                db.create_all()
                break
            except Exception as e:
                if i == 29:  # Last attempt
                    raise
                time.sleep(1)
        
        # Create default anonymous user if not exists
        anon = User.query.filter_by(id=1).first()
        if not anon:
            anon = User(
                id=1,
                username='anonymous',
                email='anonymous@safework.com',
                is_admin=False
            )
            anon.set_password('anonymous_password_2024')
            db.session.add(anon)
            db.session.commit()
            
        # Create default admin user if not exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username=app.config['ADMIN_USERNAME'],
                email='admin@safework.com',
                is_admin=True
            )
            admin.set_password(app.config['ADMIN_PASSWORD'])
            db.session.add(admin)
            db.session.commit()
    
    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('errors/404.html'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return render_template('errors/500.html'), 500
    
    # Context processors
    @app.context_processor
    def inject_config():
        return {
            'app_name': app.config['APP_NAME'],
            'app_version': app.config['APP_VERSION']
        }
    
    # Audit logging
    @app.before_request
    def log_request():
        if current_user.is_authenticated:
            # Log important actions
            if request.endpoint and 'admin' in request.endpoint:
                log = AuditLog(
                    user_id=current_user.id,
                    action='page_access',
                    target_type='endpoint',
                    details={'endpoint': request.endpoint, 'method': request.method},
                    ip_address=request.remote_addr,
                    user_agent=request.user_agent.string
                )
                db.session.add(log)
                db.session.commit()
    
    return app

# Create application instance
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)