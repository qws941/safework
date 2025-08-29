# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is a Korean workplace health and safety management system built with Flask 3.0+, providing musculoskeletal symptom surveys (001) and new employee health checkups (002) along with comprehensive administrative dashboards and RESTful APIs.

### Key Features
- **Survey System**: 001 (musculoskeletal symptoms) and 002 (new employee health checkup) forms
- **SafeWork Dashboard**: Complete employee health management system at `/admin/safework`
- **RESTful API**: JWT-authenticated API endpoints for programmatic access
- **Anonymous Submissions**: Public survey access without login (user_id=1)
- **Document Management**: Safety document upload/versioning system

### Multi-Service Architecture
SafeWork includes three independent subsystems:
- **Core Survey System**: Original 001/002 forms with unified Survey model
- **SafeWork v2 System**: Comprehensive workplace health management (`models_safework_v2.py`)
- **Document Management**: File upload/versioning system (`models_document.py`)

## Development Commands

### Essential Commands
```bash
# Local Development (Docker Compose based)
docker-compose up -d        # Start all containers (MySQL, Redis, App)
docker-compose down         # Stop all containers
docker-compose ps           # Check service health
docker-compose logs -f app  # View application logs

# Direct container access for debugging
docker exec -it safework-app bash        # Shell access to app container
docker exec -it safework-mysql mysql -u safework -psafework2024 safework_db  # Database access
docker exec -it safework-redis redis-cli # Redis CLI access

# Testing (multiple approaches)
docker exec safework-app python3 -m pytest tests/ -v  # Run all tests in Docker (recommended)
docker exec safework-app python3 -m pytest tests/test_survey.py -v  # Run specific test file
docker exec safework-app python3 -m pytest tests/ -k "test_submit" -v  # Run tests matching pattern
cd app && python3 -m pytest tests/ -v --tb=short      # Run tests locally (SQLite)
cd app && python3 -m pytest tests/ -v --cov=. --cov-report=term-missing  # With coverage

# Code Quality
python3 -m black --line-length 100 app/  # Format code
python3 -m flake8 --max-line-length=100 --ignore=E501,W503 app/  # Lint code

# Database Migrations
docker exec safework-app python migrate.py status     # Check migration status
docker exec safework-app python migrate.py upgrade    # Apply pending migrations
docker exec safework-app python migrate.py rollback   # Rollback last migration
# Web interface available at: http://localhost:4545/admin/migrations

# Development server (local Python)
cd app && python app.py    # Run Flask development server directly

# Deployment
./deploy.sh                # Production deployment script
git push origin main      # Production deployment (requires approval)
git push origin develop   # Development auto-deployment
```

## Project Structure

```
safework2/
├── app/                    # Flask application
│   ├── routes/            # Blueprint route handlers
│   ├── templates/         # Jinja2 templates
│   ├── migrations/        # Database migrations
│   ├── tests/            # Test suite
│   ├── app.py            # Application factory
│   ├── models*.py        # SQLAlchemy models
│   ├── forms*.py         # WTForms definitions
│   └── requirements.txt  # Python dependencies
├── mysql/                 # MySQL configuration
│   └── init.sql          # Database initialization
├── redis/                # Redis configuration
├── .github/workflows/    # CI/CD pipelines
├── docker-compose.yml    # Container orchestration
└── deploy.sh            # Production deployment script
```

## High-Level Architecture

### Three-Tier Container Architecture
- **safework-app**: Flask application (port 4545) with auto-restart and health checks
- **safework-mysql**: MySQL 8.0 (port 3307) with custom schema in `mysql/init.sql`
- **safework-redis**: Redis 7.0 (port 6380) for session caching

### Application Factory Pattern
The app uses Flask's application factory pattern in `app.py:create_app()` which:
1. Initializes database connection with MySQL-specific settings
2. Registers blueprints for modular routing
3. Sets up custom migration system
4. Creates anonymous user (id=1) for public submissions
5. Handles environment-specific configuration

### Blueprint-Based Routing Structure
```python
# Core blueprints registered in app.py:create_app()
main_bp → routes/main.py       # Landing pages
auth_bp → routes/auth.py       # Login/register  
survey_bp → routes/survey.py   # 001/002 forms
admin_bp → routes/admin.py     # SafeWork dashboards
migration_bp → routes/migration.py  # Database migration web UI
health_bp → routes/health.py   # Health checks (/health endpoint)

# Document management subsystem
document_bp → routes/document.py        # Public document access
document_admin_bp → routes/document_admin.py  # Admin document management

# SafeWork v2 API (conditionally loaded)
api_safework_v2_bp → routes/api_safework_v2.py  # RESTful API with JWT auth
```

### Database Models Architecture

**Three separate model files handle different subsystems:**

```python
# Core models in models.py - Original survey system
User         # Authentication with is_admin flag, created in app factory
Survey       # Unified table for 001/002 forms (form_type discriminator)  
SurveyStatistics  # Aggregated survey stats
AuditLog     # System activity tracking for admin actions

# SafeWork v2 models in models_safework_v2.py - Workplace health management
SafeworkWorker      # Employee master data
SafeworkHealthCheck # Periodic health examinations  
SafeworkMedicalVisit # Medical office visits
SafeworkMedication  # Medicine inventory management

# Document models in models_document.py - File management system
Document            # File metadata and permissions
DocumentCategory    # Document classification system
DocumentVersion     # Version control for documents
```

**Key architectural patterns:**
- **Unified Survey Model**: Single table with `form_type` field distinguishes 001/002 forms
- **Anonymous User Pattern**: user_id=1 reserved for non-authenticated survey submissions
- **Conditional API Loading**: SafeWork v2 API gracefully handles import failures
- **Database Connection Retry**: 30-second retry loop for MySQL startup timing
- **Migration Manager Integration**: Custom migration system with web UI at startup
- **Graceful Degradation**: System continues to function even if optional components fail

### Survey System Implementation
- **001 Form**: 6 body parts with conditional logic, JSON data storage
- **002 Form**: 29 comprehensive health fields
- **Anonymous Support**: Uses user_id=1 for public submissions
- **Admin Dashboard**: `/admin/safework` with Excel export capabilities

### SafeWork v2 System (Advanced Workplace Health Management)
SafeWork v2 provides comprehensive workplace health management beyond basic surveys:

**Key Components:**
- **Worker Management**: Employee master data with health tracking
- **Health Check System**: Periodic examinations and medical records
- **Medical Visit Tracking**: Office visit logs with vital signs
- **Medication Inventory**: Medicine stock management with expiry tracking

**RESTful API Endpoints:**
- `/api/safework/workers` - CRUD operations for employee data
- `/api/safework/health-checks` - Health examination management
- `/api/safework/medical-visits` - Medical visit records
- `/api/safework/medications` - Medicine inventory management

**Authentication**: JWT-based authentication system for API access

## CI/CD Pipeline

### GitHub Actions Workflows
```yaml
# .github/workflows/main-deploy.yml
- Quality checks: Black formatting, Flake8 linting
- Docker builds: App, MySQL, Redis images
- Registry push: registry.jclee.me/safework/*
- Environment deployment: develop→auto, main→manual approval
```

### Deployment Strategy
- **Development**: Push to `develop` branch → Auto-deploy
- **Production**: Push to `main` branch → Manual approval required
- **Images**: Built with timestamps (YYYYMMDD.HHMM format)

## Dependencies

### Core Python Packages
- **Flask 3.0.0**: Web framework
- **Flask-SQLAlchemy 3.1.1**: Database ORM
- **PyMySQL 1.1.0**: MySQL connector
- **Redis 5.0.1**: Cache client
- **openpyxl 3.1.2**: Excel export
- **pytest 7.4.3**: Testing framework
- **black 23.12.1**: Code formatter
- **flake8 7.0.0**: Linter

## Critical Configuration

### Environment Variables
```bash
# Application Configuration
FLASK_CONFIG=production              # Environment (development/testing/production)
SECRET_KEY=<secure-key>             # Flask session encryption key

# Database Configuration (MySQL 8.0)
MYSQL_HOST=safework-mysql           # Database host (Docker service name)
MYSQL_PORT=3306                     # Database port (mapped to 3307 externally)
MYSQL_USER=safework                 # Database username
MYSQL_PASSWORD=safework2024         # Database password
MYSQL_DATABASE=safework_db          # Database name

# Redis Configuration
REDIS_HOST=safework-redis           # Redis host (Docker service name)
REDIS_PORT=6379                     # Redis port (mapped to 6380 externally)
REDIS_PASSWORD=                     # Redis password (optional)
REDIS_DB=0                          # Redis database number

# File Upload Configuration
UPLOAD_FOLDER=/app/uploads          # Upload directory path
MAX_CONTENT_LENGTH=52428800         # 50MB file size limit
ALLOWED_EXTENSIONS=pdf,xlsx,xls,csv # Allowed file extensions

# Docker Registry (for CI/CD)
REGISTRY_PASSWORD=<for-github-secrets>
```

### Docker Registry
All images pushed to `registry.jclee.me`:
- safework/app:latest (589MB)
- safework/mysql:latest (781MB)
- safework/redis:latest (41.4MB)

## Database Migration System

**Custom MySQL-compatible migration system:**

### Architecture
- **`migration_manager.py`**: Core migration orchestration engine
- **`migration_model.py`**: Migration tracking model (separate from main models)
- **`migrate.py`**: CLI interface for migration operations
- **Web UI**: Available at `/admin/migrations` for visual management

### Migration Pattern
```python
# Standard migration structure in migrations/
def upgrade():
    with db.engine.begin() as conn:
        # MySQL-compatible operations
        conn.execute(text("CREATE TABLE IF NOT EXISTS..."))
        
def downgrade():
    with db.engine.begin() as conn:
        # Rollback operations
        conn.execute(text("DROP TABLE IF EXISTS..."))
```

### MySQL Compatibility Features
- **Index Management**: INFORMATION_SCHEMA queries replace `CREATE INDEX IF NOT EXISTS`
- **Syntax Compliance**: `AUTO_INCREMENT` (not `AUTOINCREMENT`), `INSERT IGNORE`
- **Transaction Safety**: Proper rollback handling for failed migrations
- **Schema Detection**: Table/column existence checks before alterations

## Testing Considerations

**Important database compatibility differences:**

```python
# tests/conftest.py creates SQLite in-memory DB for speed
# Production uses MySQL 8.0 - syntax differences exist:

# SQLite (testing)    vs    MySQL (production)
# AUTOINCREMENT      →      AUTO_INCREMENT  
# OR IGNORE         →      INSERT IGNORE
# No INFORMATION_SCHEMA  →  Full schema introspection
```

**Testing strategies:**
- **Unit tests**: Run locally with SQLite for speed (`cd app && python3 -m pytest`)
- **Integration tests**: Use Docker containers for MySQL compatibility
- **Database tests**: Always test migrations in Docker environment
- **API tests**: JWT authentication requires valid tokens

## Key API Endpoints

### Public Endpoints
- `/health` - Health check returning JSON status
- `/survey/001_musculoskeletal_symptom_survey` - 001 form
- `/survey/002_new_employee_health_checkup_form` - 002 form

### Admin Endpoints (login required)
- `/admin/dashboard` - Main admin dashboard
- `/admin/surveys` - Survey data management
- `/admin/safework` - SafeWork v2 dashboard (if enabled)
- `/admin/safework/workers` - Employee management
- `/admin/safework/health-checks` - Health examinations  
- `/admin/safework/medications` - Medicine inventory
- `/admin/documents` - Document management system
- `/admin/migrations` - Database migration web interface
- `/api/safework/*` - RESTful API with JWT authentication

## Debugging Tips

### Container Access
```bash
# Application container debugging
docker exec -it safework-app bash          # Shell access
docker exec -it safework-app python3       # Python REPL with app context

# Database access
docker exec -it safework-mysql mysql -u safework -psafework2024 safework_db
docker exec safework-mysql mysqldump -u safework -psafework2024 safework_db > backup.sql

# Redis cache inspection  
docker exec -it safework-redis redis-cli   # Redis CLI
docker exec safework-redis redis-cli FLUSHDB  # Clear cache
```

### Checking Logs
```bash
docker-compose logs app | tail -100        # Last 100 lines of app logs
docker-compose logs mysql --follow         # Follow MySQL logs
docker logs safework-app --since 5m        # Logs from last 5 minutes
```

### Database Queries
```bash
# Check survey submissions
docker exec safework-mysql mysql -u safework -psafework2024 safework_db -e "SELECT * FROM surveys ORDER BY created_at DESC LIMIT 10;"

# Check users
docker exec safework-mysql mysql -u safework -psafework2024 safework_db -e "SELECT id, username, email, is_admin FROM users;"
```

## Common Issues and Solutions

### MySQL Connection Issues
- **Container naming**: Must use `safework-mysql` (hardcoded in config.py)
- **Network isolation**: Check `docker network ls | grep safework-net`
- **Credentials**: Verify MYSQL_PASSWORD=safework2024 in docker-compose.yml
- **Startup timing**: MySQL needs ~30 seconds, app waits with retry logic

### Migration Failures  
- **Syntax differences**: Use MySQL syntax, not SQLite (`AUTO_INCREMENT`, `INSERT IGNORE`)
- **Index creation**: Check INFORMATION_SCHEMA before creating indexes
- **Web interface**: Use `/admin/migrations` for visual debugging
- **Transaction rollback**: Failed migrations auto-rollback, check migration logs

### Test Environment Issues
- **Database mismatch**: Tests use SQLite, production uses MySQL  
- **Container testing**: Run `docker exec safework-app python3 -m pytest` for accuracy
- **Config switching**: Ensure `FLASK_CONFIG=testing` for test runs
- **Model imports**: SafeWork v2 models may not be available in test environment

### Application Factory Issues
- **Blueprint registration**: SafeWork v2 API conditionally loaded, check import errors
- **User creation**: Anonymous user (id=1) and admin user created at startup
- **Redis connection**: Verify Redis container health before app startup

## Important Development Notes

### Database Environment Differences
- **Testing**: Uses SQLite in-memory database (`conftest.py`)
- **Production**: Uses MySQL 8.0 with persistent storage
- **Syntax differences**: Always test migrations in Docker environment for MySQL compatibility

### Conditional Component Loading
```python
# SafeWork v2 API loads conditionally in app.py:78-85
try:
    from routes.api_safework_v2 import api_safework_bp
    app.register_blueprint(api_safework_bp, url_prefix="/api/safework")
except ImportError as e:
    app.logger.warning(f"SafeWork API v2.0 not loaded: {e}")
```

### Application Startup Sequence
1. Load configuration based on `FLASK_CONFIG` environment variable
2. Initialize database connection with 30-second retry logic
3. Register core blueprints (main, auth, survey, admin, health)
4. Conditionally register optional blueprints (api_safework_v2, documents)
5. Create anonymous user (id=1) and admin user if they don't exist
6. Initialize migration manager for schema version tracking

### Port Mapping (Docker)
```yaml
# Internal container ports vs external host ports
safework-app: 4545 (internal) → 4545 (external)
safework-mysql: 3306 (internal) → 3307 (external) 
safework-redis: 6379 (internal) → 6380 (external)
```