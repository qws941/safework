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

## Development Commands

### Essential Commands
```bash
# Local Development (No Makefile - use Docker Compose directly)
docker-compose up -d        # Start all containers (MySQL, Redis, App)
docker-compose down         # Stop all containers
docker-compose ps           # Check service health
docker-compose logs -f app  # View application logs

# Testing
docker exec safework-app python3 -m pytest tests/ -v  # Run all tests in Docker
docker exec safework-app python3 -m pytest tests/test_survey.py -v  # Run specific test file
docker exec safework-app python3 -m pytest tests/ -k "test_submit" -v  # Run tests matching pattern
cd app && python3 -m pytest tests/ -v --tb=short      # Run tests locally

# Code Quality
python3 -m black --line-length 100 app/  # Format code
python3 -m flake8 --max-line-length=100 --ignore=E501,W503 app/  # Lint

# Database Migrations
docker exec safework-app python migrate.py status     # Check migration status
docker exec safework-app python migrate.py upgrade    # Apply pending migrations
docker exec safework-app python migrate.py rollback   # Rollback last migration
# Web interface available at: http://localhost:4545/admin/migrations

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
# Core blueprints registered in app.py
main_bp → routes/main.py       # Landing pages
auth_bp → routes/auth.py       # Login/register  
survey_bp → routes/survey.py   # 001/002 forms
admin_bp → routes/admin.py     # SafeWork dashboards
api_safework_v2_bp → routes/api_safework_v2.py  # RESTful API
document_bp → routes/document.py  # Document management
health_bp → routes/health.py   # Health checks
```

### Database Models Architecture
```python
# Core models in models.py
User         # Authentication with is_admin flag
Survey       # Unified table for 001/002 forms (form_type field)
SurveyStatistics  # Aggregated stats
AuditLog     # Activity tracking

# SafeWork v2 models in models_safework_v2.py  
SafeworkWorker      # Employee records
SafeworkHealthCheck # Health examinations
SafeworkMedicalVisit # Clinic visits
SafeworkMedication  # Medicine inventory

# Document models in models_document.py
Document, DocumentCategory, DocumentVersion
```

### Survey System Implementation
- **001 Form**: 6 body parts with conditional logic, JSON data storage
- **002 Form**: 29 comprehensive health fields
- **Anonymous Support**: Uses user_id=1 for public submissions
- **Admin Dashboard**: `/admin/safework` with Excel export capabilities

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
# Required for production
FLASK_CONFIG=production
SECRET_KEY=<secure-key>
MYSQL_HOST=safework-mysql
MYSQL_PASSWORD=safework2024
REDIS_HOST=safework-redis
REGISTRY_PASSWORD=<for-github-secrets>
```

### Docker Registry
All images pushed to `registry.jclee.me`:
- safework/app:latest (589MB)
- safework/mysql:latest (781MB)
- safework/redis:latest (41.4MB)

## Database Migration System

Custom MySQL-compatible migration system in `migration_manager.py`:
```python
# Migration pattern
def upgrade():
    with db.engine.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS..."))
        
# MySQL-specific syntax used
- AUTO_INCREMENT (not AUTOINCREMENT)
- INSERT IGNORE (not OR IGNORE)
- INFORMATION_SCHEMA queries for index checks
```

## Testing Considerations

Tests require environment setup:
```python
# tests/conftest.py creates SQLite in-memory DB
# Production uses MySQL - schema differences may cause issues
# Run tests in Docker for accurate results:
docker exec safework-app python3 -m pytest tests/
```

## Key API Endpoints

### Public Endpoints
- `/health` - Health check returning JSON status
- `/survey/001_musculoskeletal_symptom_survey` - 001 form
- `/survey/002_new_employee_health_checkup_form` - 002 form

### Admin Endpoints (login required)
- `/admin/safework` - Main dashboard
- `/admin/safework/workers` - Employee management
- `/admin/safework/health-checks` - Health examinations
- `/admin/safework/medications` - Medicine inventory
- `/api/safework/*` - RESTful API with JWT auth

## Debugging Tips

### Container Access
```bash
docker exec -it safework-app bash          # Access app container
docker exec -it safework-mysql mysql -u safework -p  # Access MySQL (password: safework2024)
docker exec -it safework-redis redis-cli   # Access Redis
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
- Container name must be `safework-mysql` 
- Check network: `docker network ls | grep safework-net`
- Verify credentials in docker-compose.yml

### Migration Failures
- Check MySQL syntax (not SQLite)
- Use web interface at `/admin/migrations`
- Verify table exists before ALTER/DROP

### Test Failures
- Tests use SQLite in-memory, production uses MySQL
- Run in container: `docker exec safework-app pytest`
- Check Flask config: `FLASK_CONFIG=testing`