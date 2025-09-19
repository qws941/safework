# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is an industrial health and safety management system built with Flask 3.0+ for Korean construction/industrial environments. It manages workplace health surveys, medical records, and comprehensive safety administration with integrated MSDS management and automated monitoring systems.

**Core Features:**
- **Survey System**: 001 Musculoskeletal & 002 New Employee health forms with conditional JavaScript logic
- **SafeWork Admin**: 13 specialized management panels for workers, health checks, medications, MSDS, safety education, etc.
- **Document Management**: Version-controlled document system with access logging
- **Anonymous Access**: Public survey submission with user_id=1 fallback
- **RESTful API v2**: External system integrations via `/api/safework/v2/*`

**Tech Stack:**
- Backend: Flask 3.0+, SQLAlchemy 2.0, PostgreSQL 15+, Redis 7.0
- Frontend: Bootstrap 4.6, jQuery, responsive design with Korean localization
- Infrastructure: Independent Docker containers, Private Registry (registry.jclee.me), Portainer API
- Development: Makefile automation, comprehensive tooling, volume persistence
- Database: PostgreSQL 15+ with automated schema migration and data persistence
- Security: Flask-Login authentication, environment-based configuration
- Testing: Automated test runner with health checks and API validation
- Code Quality: Black formatter, Flake8 linter with pre-commit hooks

## Development Commands

### Quick Reference (Most Common Commands)
```bash
# 🚀 Deployment & Status (Makefile shortcuts)
make deploy                                         # Trigger GitHub Actions deployment
make status                                         # Check deployment status
make health                                         # System health check
make monitor                                        # Complete system overview

# 📋 Monitoring & Logs
make logs                                           # Live application logs
make logs-errors                                    # Filter error logs only
make portainer                                      # Advanced Portainer management (interactive)
make portainer-monitor                              # Resource monitoring

# 🧪 Testing & Validation
make test                                           # Run comprehensive tests
make test-api                                       # Test API endpoints
make validate                                       # Validate CI/CD pipeline
curl https://safework.jclee.me/health              # Production health check

# 🗄️ Database Management
make db-status                                      # Check migration status
make db-migrate                                     # Run migrations
make db-shell                                       # PostgreSQL CLI access
make db-backup                                      # Create database backup

# 🔧 Code Quality
make format                                         # Format code with Black
make lint                                          # Lint code with Flake8
make check                                         # Run both format and lint

# 🐳 Container Management
make build                                         # Build Docker images
make up                                            # Start development environment
make down                                          # Stop development environment
make restart                                       # Restart all services

# 📊 Volume Management
./scripts/volume_manager.sh status          # Check volume status
./scripts/volume_manager.sh backup          # Backup all data
./scripts/volume_manager.sh verify          # Verify data integrity

# 🛠️ Development Helpers
make help                                          # Show all available Makefile commands
make info                                          # Display project information and URLs
make clean                                         # Clean build artifacts and caches
make dev-setup                                     # Complete development environment setup
```

### Container Deployment via GitHub Actions CI/CD

**✅ PRODUCTION CONTAINER NAMING**: Verified production uses `safework-*` naming scheme (app, postgres, redis)

**Production Deployment Process:**
1. **Push to master branch** → Triggers GitHub Actions workflow
2. **Build & Push Images** → Builds all containers, pushes to registry.jclee.me
3. **Direct Container Update** → Portainer API pulls latest images and restarts containers
4. **Health Verification** → Checks all services are running properly

```bash
# Trigger deployment (GitHub Actions handles building)
git add .
git commit -m "Fix: Update SafeWork with submission_date column"
git push origin master

# GitHub Actions will:
# 1. Build safework/app, safework/postgres, safework/redis images
# 2. Push to registry.jclee.me with latest tags
# 3. Pull latest images and restart containers via Portainer API
# 4. Monitor deployment success via health checks

# Production health verification
curl -s https://safework.jclee.me/health
# Response: {"service":"safework","status":"healthy","timestamp":"2025-09-17T10:09:15.655985"}
```

### Unified Operations Management
```bash
# 🚀 UNIFIED SAFEWORK OPERATIONS SCRIPT - One command for all operations
./scripts/safework_ops_unified.sh [COMMAND] [OPTIONS]

# 📊 DEPLOYMENT COMMANDS
./scripts/safework_ops_unified.sh deploy status           # Show all container status + production health
./scripts/safework_ops_unified.sh deploy github          # Trigger GitHub Actions deployment
./scripts/safework_ops_unified.sh deploy local           # Run local deployment

# 📋 LOG MANAGEMENT COMMANDS
./scripts/safework_ops_unified.sh logs live [container] [lines]    # Real-time log streaming
./scripts/safework_ops_unified.sh logs recent [container] [lines]  # Recent logs
./scripts/safework_ops_unified.sh logs errors [container]          # Filter error logs only

# 🔍 MONITORING COMMANDS
./scripts/safework_ops_unified.sh monitor overview        # Complete system overview with container info
./scripts/safework_ops_unified.sh monitor health          # Comprehensive health check with scoring
./scripts/safework_ops_unified.sh monitor performance     # Performance metrics and resource usage

# 🛠️ UTILITY COMMANDS
./scripts/safework_ops_unified.sh utils containers        # List all SafeWork containers
./scripts/safework_ops_unified.sh utils cleanup           # Clean up stopped containers and unused images
./scripts/safework_ops_unified.sh utils backup            # Backup database and configurations
./scripts/safework_ops_unified.sh utils restore [file]    # Restore from backup file
```

### System Validation & Deployment Verification
```bash
# Automated system validation
./scripts/pipeline_validator.sh        # Complete CI/CD pipeline validation
./scripts/test_runner.sh              # Comprehensive automated testing
./scripts/integrated_build_deploy.sh  # Unified build and deployment

# Deployment verification commands
./scripts/integrated_build_deploy.sh status  # Current system status check
./scripts/portainer_simple.sh status         # Production container health via Portainer API

# Comprehensive deployment verification
curl -s https://safework.jclee.me/health | jq .  # Health endpoint check
curl -s -X POST https://safework.jclee.me/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type":"001","name":"테스트","age":30}' # API functionality test
```

### Manual Container Setup (Development Only)
```bash
# CRITICAL: Use correct image names (consistent with production)
docker pull registry.jclee.me/safework/app:latest
docker pull registry.jclee.me/safework/postgres:latest
docker pull registry.jclee.me/safework/redis:latest

# Start PostgreSQL with KST timezone and automated schema migration
docker run -d --name safework-postgres --network safework_network -p 4546:5432 \
  -e TZ=Asia/Seoul -e POSTGRES_PASSWORD=safework2024 -e POSTGRES_DB=safework_db -e POSTGRES_USER=safework \
  registry.jclee.me/safework/postgres:latest

# Start Redis with clean state
docker run -d --name safework-redis --network safework_network -p 4547:6379 \
  -e TZ=Asia/Seoul \
  registry.jclee.me/safework/redis:latest

# Start application with correct database name (safework_db) and KST timezone
docker run -d --name safework-app --network safework_network -p 4545:4545 \
  -e TZ=Asia/Seoul -e DB_HOST=safework-postgres -e DB_NAME=safework_db -e DB_USER=safework \
  -e DB_PASSWORD=safework2024 -e REDIS_HOST=safework-redis \
  registry.jclee.me/safework/app:latest
```

### Code Quality & Linting
```bash
# Python code formatting and linting (defined in requirements.txt)
cd src/app
black .                                 # Format code
flake8 .                               # Check code style
python -m py_compile *.py              # Syntax check

# Makefile shortcuts for code quality
make format                            # Run Black formatter
make lint                              # Run Flake8 linter
make check                             # Run both format and lint

# Check for common issues
grep -r "print(" . --include="*.py"    # Find debug prints
grep -r "TODO\|FIXME" . --include="*.py"  # Find TODOs
```

### Database Management
```bash
# Enter app container
docker exec -it safework-app bash

# Migration commands (inside container)
python migrate.py status               # Check migration status
python migrate.py migrate              # Apply migrations
python migrate.py create "Description" # Create new migration

# Database inspection (PostgreSQL)
docker exec -it safework-postgres psql -U safework -d safework_db -c "\dt;"
docker exec -it safework-postgres psql -U safework -d safework_db -c "\d surveys;"

# Check specific survey data
docker exec -it safework-postgres psql -U safework -d safework_db -c "SELECT id, name, form_type, responses FROM surveys ORDER BY id DESC LIMIT 5;"
```

### API Testing & Debugging
```bash
# Test survey submission API (critical endpoint)
curl -X POST http://localhost:4545/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{
    "form_type": "001",
    "name": "테스트 사용자",
    "age": 30,
    "gender": "남성",
    "years_of_service": 5,
    "employee_number": "EMP001",
    "department": "개발부",
    "position": "개발자",
    "employee_id": "DEV001",
    "work_years": 3,
    "work_months": 6,
    "data": {
      "has_symptoms": true
    }
  }'

# Test health endpoints
curl http://localhost:4545/health              # Application health
curl https://safework.jclee.me/health         # Production health

# Verify database connectivity from container (SQLAlchemy 2.0 compatible)
docker exec -it safework-app python -c "
from app import create_app
from models import Survey, db
app = create_app()
with app.app_context():
    print(f'Survey count: {Survey.query.count()}')
    print('Database connection: OK')
"
```

### Access Points & Credentials
**Local Development:**
- **Main app**: http://localhost:4545
- **PostgreSQL**: localhost:4546 (safework-postgres container)
- **Redis**: localhost:4547 (safework-redis container)
- **Admin panel**: http://localhost:4545/admin (admin/safework2024)
- **Health check**: http://localhost:4545/health
- **Migration UI**: http://localhost:4545/migration/status

**Remote Environments:**
- **Development**: https://safework-dev.jclee.me
- **Production**: https://safework.jclee.me

## Architecture Overview

### Flask Application Factory (src/app/app.py)
```python
def create_app(config_name=None):
    # Factory pattern with config-based initialization
    # Extensions: SQLAlchemy, Flask-Login, Flask-Migrate, Redis
    # CSRF: Currently disabled (WTF_CSRF_ENABLED = False)
    # Blueprints: 15+ modular route handlers auto-registered
    # System uptime tracking and version management via Git
    # Context processors for template globals and URL routing

    # Critical: Uses PostgreSQL connection with pool management
    # Pool settings: pool_size=10, pool_recycle=3600, pool_pre_ping=True
    # Database URI pattern: postgresql+psycopg2://safework:password@safework-postgres:5432/safework_db
```

### Key Architectural Patterns
**Application Factory Pattern:**
- Environment-based configuration (development/production/testing)
- Modular blueprint registration in `app.py`
- Extension initialization with proper app context
- Runtime database connection handling with retry logic

**Migration System:**
- Custom migration manager in `migration_manager.py`
- Web interface for migration status at `/admin/migration/status`
- Version-controlled database schema changes
- Automatic admin user creation via migrations

**Container Independence & Schema Migration:**
- No docker-compose dependency - each service runs independently
- Automated PostgreSQL schema migration via init.sql and migration scripts
- Health checks and restart policies in Dockerfiles
- Volume declarations for data persistence
- Container network communication via internal DNS
- KST timezone enforcement across all containers

### Model Architecture & Database Design
**Core Models (src/app/models.py):**
- `User`: Flask-Login authentication integration
- `Survey`: Unified table for 001/002 forms using `form_type` discriminator + JSON `responses` field
- `AuditLog`: System activity tracking
- `kst_now()`: Consistent KST timezone function for all timestamps

**SafeWork Models (src/app/models_safework.py + models_safework_v2.py):**
- 13+ specialized tables: `safework_workers`, `safework_health_checks`, `safework_medications`, etc.
- Industrial safety management domain models

**Document Models (src/app/models_document.py):**
- `Document`, `DocumentVersion`, `DocumentAccessLog`: Version control with access tracking

**Key Database Patterns:**
```sql
-- Survey system with discriminator
surveys.form_type = '001' | '002'  -- Form type identifier
surveys.responses (JSONB)          -- Flexible form field storage (PostgreSQL JSONB)

-- Anonymous submissions
user_id = 1  -- Special user for anonymous form submissions

-- Korean localization
created_at = kst_now()  -- Always use KST timezone
```

### Flask Route Architecture
```
src/app/routes/
├── __init__.py              # Route package initialization
├── admin.py                 # 13 SafeWork admin panels + main admin dashboard
├── admin_legacy.py          # Legacy admin routes (deprecated)
├── api_safework_v2.py       # RESTful API v2 endpoints for external systems
├── api_safework.py          # Legacy API endpoints
├── survey.py                # 001/002 form handling with conditional JavaScript
├── auth.py                  # Flask-Login authentication (admin/safework2024)
├── health.py                # System health monitoring (/health endpoint)
├── document.py              # Public document access (version control)
├── document_admin.py        # Admin document management
├── main.py                  # Homepage and general routes
├── migration.py             # Database migration web interface
├── monitoring.py            # System monitoring endpoints
├── notification_system.py   # Notification system routes
├── raw_data_admin.py        # Raw data management
└── safework_reports.py      # SafeWork reporting functionality
```

### Critical Frontend Patterns
**JavaScript ID Matching (Critical for Survey Forms):**
```javascript
// HTML/JS ID matching is critical for conditional logic
// HTML: <div id="accident_parts_section">
// JS: document.getElementById('accident_parts_section')  // Must match exactly

// Survey data structure stored as JSON
// Example: { past_accident: true, past_accident_details: [{ part: "손/손가락/손목", status: "완치" }] }

// CSRF currently disabled for survey testing
// When re-enabled: xhr.setRequestHeader("X-CSRFToken", csrf_token);
```

### Configuration Management
**Multi-Environment Setup (src/app/config.py):**
```python
# Environment-specific database configuration
config = {
    "development": DevelopmentConfig,  # PostgreSQL, CSRF disabled
    "production": ProductionConfig,    # PostgreSQL, CSRF disabled
    "testing": TestingConfig,          # PostgreSQL, CSRF disabled
    "default": DevelopmentConfig,
}

# Key configuration patterns:
# - Consistent PostgreSQL across all environments
# - CSRF protection completely disabled across all environments
# - File upload limits: 50MB with specific allowed extensions
# - Session configuration with security headers
# - Redis integration for caching and session storage
# - Environment variable support for all database settings
```

**SafeWork Admin Panel Pattern:**
```python
# 1. Model Definition (src/app/models_safework.py)
class SafeworkWorker(db.Model):
    __tablename__ = "safework_workers"

# 2. API Endpoint (src/app/routes/api_safework_v2.py)
@api_safework_bp.route('/workers', methods=['GET', 'POST'])
@login_required
def handle_workers():
    # CRUD operations with JSON responses

# 3. Admin Interface (src/app/routes/admin.py + templates/admin/safework/)
@admin_bp.route('/safework/workers')
@login_required
def safework_workers():
    # Bootstrap 4.6 + jQuery AJAX integration
```

## Deployment & Infrastructure

### GitHub Actions CI/CD Pipeline
The project uses an **optimized workflow system** with advanced Claude AI integration:

**Current Active Workflows:**
- **🚀 deploy.yml**: SafeWork Production Deployment with auto-rollback and emergency recovery
- **🤖 claude-mcp-assistant.yml**: Claude AI Assistant with Advanced MCP Integration
- **🔧 maintenance-automation.yml**: Automated system maintenance and health monitoring
- **📊 operational-log-analysis.yml**: Real-time container log monitoring via Portainer API
- **📊 operational-monitoring.yml**: Extended monitoring capabilities and system health checks
- **🛡️ security-auto-triage.yml**: Automated vulnerability detection and resolution
- **🎯 issue-handler.yml**: Intelligent issue management with auto-labeling
- **🔄 dependency-auto-update.yml**: Weekly automated dependency management

**Deployment Triggers:**
1. Push to `master` branch triggers all workflows
2. **Claude integration**: `@claude` mentions trigger AI assistance
3. **Auto-fix**: Failed workflows trigger automatic repair attempts
4. **Security scanning**: Automated dependency vulnerability checks
5. **Container deployment**: Multi-service Docker builds via Portainer API

### Infrastructure Components
- **Registry**: registry.jclee.me (credentials in GitHub secrets)
- **Production**: https://safework.jclee.me
- **Development**: https://safework-dev.jclee.me
- **Portainer**: portainer.jclee.me (Container management and log viewing via API)
- **Watchtower**: watchtower.jclee.me (Automatic container deployment via HTTP API)
- **Images**:
  - registry.jclee.me/safework/app:latest
  - registry.jclee.me/safework/postgres:latest
  - registry.jclee.me/safework/redis:latest

### Independent Container Architecture
SafeWork uses **completely independent Docker containers** with no docker-compose dependency:
- Each service (app, postgres, redis) has its own Dockerfile and .dockerignore
- Portainer API orchestration for zero-downtime deployment
- Health checks implemented for all services
- Connection retry logic for independent startup
- Matrix build system in GitHub Actions for parallel deployment

### Required GitHub Secrets
```bash
# Core deployment secrets
APP_NAME=safework                        # Application name for container naming
REGISTRY_HOST=registry.jclee.me         # Docker registry host
REGISTRY_USER=admin                     # Registry username
REGISTRY_PASSWORD=<password>             # Docker registry auth
WATCHTOWER_HTTP_API_TOKEN=<token>        # Watchtower HTTP API token
WATCHTOWER_URL=https://watchtower.jclee.me # Watchtower API URL

# Database credentials
POSTGRES_PASSWORD=<password>             # PostgreSQL password
POSTGRES_DB=safework_db                  # Database name
POSTGRES_USER=safework                   # Database username
SECRET_KEY=<secret>                      # Flask secret key

# Environment URLs
PRD_URL=https://safework.jclee.me       # Production URL
DEV_URL=https://safework-dev.jclee.me   # Development URL
PORTAINER_URL=https://portainer.jclee.me # Portainer URL (log viewing only)

# Claude AI Integration (CRITICAL for workflows)
CLAUDE_CODE_OAUTH_TOKEN=<token>          # Claude Code automation
GITHUB_TOKEN=<token>                     # GitHub API access for Claude workflows
PORTAINER_API_KEY=<token>                # Portainer API key

# Optional automation
SLACK_WEBHOOK_URL=<url>                  # Slack notifications
```

### Claude AI Workflow Integration
**Trigger Methods:**
- **Issue Comments**: `@claude` in any issue comment
- **PR Comments**: `@claude` in pull request discussions
- **Issue Labels**: Issues with `claude-actionable` or `needs-analysis` labels
- **Workflow Failures**: Automatic CI failure analysis and repair
- **Dependency Updates**: Weekly automated dependency scans

**AI Capabilities:**
- Intelligent issue triage with automatic labeling (14 categories)
- Comprehensive PR reviews with 5-dimensional analysis
- Automatic CI/CD failure detection and repair
- Korean language support for industrial safety context
- SafeWork-specific domain knowledge integration

## Portainer Container Operations

### Direct Container Management
```bash
# Check SafeWork container status via Portainer API
curl -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/json" | \
  jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0] + " - " + .State'

# Restart SafeWork containers directly
curl -X POST -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/safework-app/restart"

# Pull latest images and update containers
curl -X POST -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  -H "Content-Type: application/json" \
  "https://portainer.jclee.me/api/endpoints/3/docker/images/create" \
  -d '{"fromImage": "registry.jclee.me/safework/app:latest"}'
```

### Portainer API Container Management & Simplified Scripts
```bash
# Use simplified Portainer query scripts (recommended)
./scripts/portainer_simple.sh status        # Check SafeWork container status
./scripts/portainer_simple.sh running       # List running containers only
./scripts/portainer_simple.sh logs safework-app  # View specific container logs
./scripts/portainer_simple.sh network       # Check network configuration
./scripts/portainer_simple.sh               # Show all information

# Advanced Portainer management (interactive)
./scripts/portainer_advanced.sh summary      # Container status summary
./scripts/portainer_advanced.sh logs         # Interactive log viewing
./scripts/portainer_advanced.sh monitor      # Resource monitoring
./scripts/portainer_advanced.sh health       # Health status check
./scripts/portainer_advanced.sh network      # Network information
./scripts/portainer_advanced.sh backup       # System backup
./scripts/portainer_advanced.sh interactive  # Interactive menu
```

## Error Detection & Resolution

### Common Container Issues & Critical Fixes
**Database Connection Issues (Most Common):**
- `FATAL: database "safework" does not exist` → **SOLUTION**: Use `DB_NAME=safework_db` (not `safework`)
- `connection to server at "safework-postgres" port 5432 failed: Connection refused` → **SOLUTION**: Ensure PostgreSQL container fully initialized before app starts
- `column "submission_date" of relation "surveys" does not exist` → **SOLUTION**: Automated migration system handles this

**Import and Model Issues:**
- `ImportError: cannot import name 'AuditLog' from 'models'` → **CRITICAL**: Missing model aliases in models.py
- `'data' is an invalid keyword argument for SurveyModel` → **SOLUTION**: Uncommented data field in models.py
- `Working outside of application context` → **SOLUTION**: Use Flask app context for database operations

**Container Issues:**
- `gunicorn.errors.HaltServer` → Flask app import path verification
- `Worker failed to boot` → Dependencies and environment validation
- Redis AOF permission errors → **SOLUTION**: Remove and recreate Redis container with clean state
- Container timezone issues → **SOLUTION**: Add `-e TZ=Asia/Seoul` to all container runs

### Troubleshooting Commands
```bash
# Container status (correct container names)
docker ps                                           # Check container status
docker logs -f safework-app                         # View application logs
docker logs -f safework-postgres                    # View database logs

# Force GitHub Actions re-deployment
git commit --allow-empty -m "Trigger: Force redeploy"
git push origin master                              # Triggers GitHub Actions build

# Independent container restart (use GitHub Actions images)
docker stop safework-app safework-postgres safework-redis
docker rm safework-app safework-postgres safework-redis

# Database management
docker exec -it safework-app python migrate.py status              # Check migration status
docker exec -it safework-app python migrate.py migrate             # Run migrations

# Portainer API debugging (endpoint 3)
curl -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
     "https://portainer.jclee.me/api/endpoints/3/docker/containers/json" # List containers

# Direct PostgreSQL access (current production database)
docker exec -it safework-postgres psql -U safework -d safework_db   # PostgreSQL CLI

# Database connectivity verification (critical for troubleshooting)
docker exec safework-app python -c "
from app import create_app
from models import Survey, db
app = create_app()
with app.app_context():
    try:
        count = Survey.query.count()
        print(f'✅ Database connection successful! Survey count: {count}')
    except Exception as e:
        print(f'❌ Database connection failed: {e}')
"

# UNIFIED TROUBLESHOOTING
# Use unified operations script for streamlined troubleshooting workflow

# Quick system health check
./scripts/safework_ops_unified.sh monitor health         # Comprehensive health assessment
./scripts/safework_ops_unified.sh deploy status          # Current deployment status

# Analyze production issues
./scripts/safework_ops_unified.sh logs errors all        # Find all error logs
./scripts/safework_ops_unified.sh logs recent all 50     # Recent activity across containers
./scripts/safework_ops_unified.sh monitor performance    # Performance metrics

# Real-time monitoring
./scripts/safework_ops_unified.sh logs live safework-app # Live application logs
./scripts/safework_ops_unified.sh monitor overview       # Complete system overview

# Survey form debugging
# - Verify HTML/JavaScript ID matching (critical for conditional logic)
# - Ensure user_id=1 exists for anonymous submissions
# - Use kst_now() consistently for Korean timezone
# - Check submission_date column exists (handled by automated migration)
```

## Development Patterns & Standards

### Error Handling Pattern
```python
try:
    db.session.commit()
    flash('성공적으로 저장되었습니다.', 'success')
except Exception as e:
    db.session.rollback()
    flash(f'오류가 발생했습니다: {str(e)}', 'error')
    app.logger.error(f"Database error: {e}")
```

### Template Inheritance
```html
{% extends "admin/base_admin.html" %}
{% block content %}
<div class="container-fluid">
    {% include "admin/safework/_stats_cards.html" %}
    <!-- Panel content -->
</div>
{% endblock %}
```

### Environment Variables
```bash
# Core application settings
FLASK_CONFIG=production                # Environment mode (development/production/testing)
SECRET_KEY=safework-production-secret-key-2024
TZ=Asia/Seoul                         # Korean timezone

# Database connection (PostgreSQL)
DB_HOST=safework-postgres             # Container name
DB_PORT=5432                          # PostgreSQL port
DB_NAME=safework_db                   # Database name
DB_USER=safework                      # Database user
DB_PASSWORD=safework2024              # Database password

# Database pool settings
DB_POOL_SIZE=10                       # Connection pool size
DB_POOL_TIMEOUT=30                    # Pool timeout seconds
DB_POOL_RECYCLE=3600                  # Pool recycle time
DB_POOL_PRE_PING=true                 # Enable connection pre-ping
DB_ECHO=false                         # Database query echo

# Redis cache
REDIS_HOST=safework-redis             # Container name
REDIS_PORT=6379                       # Redis port
REDIS_PASSWORD=                       # Redis password (optional)
REDIS_DB=0                           # Redis database number

# Admin credentials
ADMIN_USERNAME=admin                  # Admin username
ADMIN_PASSWORD=safework2024           # Admin password

# CSRF Settings (currently disabled)
WTF_CSRF_ENABLED=false               # CSRF protection (disabled for survey testing)
WTF_CSRF_CHECK_DEFAULT=false         # CSRF check default

# File upload settings
UPLOAD_FOLDER=/app/uploads           # Upload directory
MAX_CONTENT_LENGTH=52428800          # 50MB max file size
```

## Key API Endpoints
```bash
# Core endpoints
/health                                    # System health check (JSON) - ✅ Production verified
/                                         # Main homepage - ✅ Production verified

# Survey forms (anonymous access)
/survey/001_musculoskeletal_symptom_survey     # Anonymous form - ✅ Production verified
/survey/002_new_employee_health_checkup_form   # Anonymous form - ✅ Production verified

# Survey API endpoints
/survey/api/submit                             # Form submission API - ✅ Verified working with JSONB storage

# Admin access (login required)
/admin/dashboard                              # Main admin dashboard
/admin/safework                              # SafeWork management hub
/admin/survey/<id>                           # Survey detail view with complete submitted data

# RESTful API v2
/api/safework/v2/workers                     # Worker CRUD operations
/api/safework/v2/health-checks               # Health record management
/api/safework/v2/medications                 # Medicine inventory CRUD
```

## Production Guidelines

### Database Best Practices
- **PostgreSQL 15+** with UTF8 encoding for Korean text support (production standard)
- **Database Name**: Always use `safework_db` (not `safework`) to match schema initialization
- Use `kst_now()` for all timestamp operations (consistent KST timezone)
- Transaction-based operations with rollback for data integrity
- Anonymous submissions always use `user_id=1`
- JSONB fields for flexible survey data storage with indexing support
- Automated schema migration via init.sql and migration scripts in PostgreSQL container

### Security & Performance
- `@login_required` decorator for all admin routes
- CSRF protection currently disabled for survey testing
- Audit logging enabled for all administrative operations
- Redis caching for frequently accessed data
- Database indexing on key lookup fields
- Pagination (20 items per page) for large datasets

## Key Development Workflows

### Adding New Survey Forms
1. **Route Setup**: Add new form routes in `src/app/routes/survey.py`
2. **Template Creation**: Create HTML template in `src/app/templates/survey/`
3. **Model Updates**: Update `Survey` model if new fields needed (use JSON `responses` field for flexibility)
4. **Admin Interface**: Add admin management to `src/app/routes/admin.py`
5. **JavaScript Logic**: Implement conditional logic matching exact HTML IDs

### SafeWork Admin Panel Extension
1. **Model Definition**: Add new models in `src/app/models_safework.py` or `src/app/models_safework_v2.py`
2. **API Endpoints**: Add RESTful endpoints in `src/app/routes/api_safework_v2.py`
3. **Admin Routes**: Add admin interface routes in `src/app/routes/admin.py`
4. **Templates**: Create admin templates in `src/app/templates/admin/safework/`
5. **Database Migration**: Use `python migrate.py create "Description"` for schema changes

### Container Deployment Testing
```bash
# Test individual container health before deployment
docker build -t test-app ./src/app && docker run --rm test-app python -c "import app; print('OK')"
docker build -t test-postgres ./infrastructure/docker/postgres && docker run --rm -e POSTGRES_DB=test test-postgres postgres --version
docker build -t test-redis ./infrastructure/docker/redis && docker run --rm test-redis redis-server --version

# Verify container networking and deployment
docker network inspect watchtower_default      # Check network exists
make portainer-status                          # Check container status via Portainer
make health                                    # Comprehensive health check
make test-api                                  # Test API endpoints

# Volume persistence verification
./scripts/volume_manager.sh verify      # Verify data integrity
./scripts/volume_manager.sh status      # Check volume status
```

## Project Structure Guidelines

### Root Directory Restrictions
**ONLY ALLOWED in root directory:**
- `CLAUDE.md` - This file
- `README.md` - Project documentation
- `Makefile` - Main automation interface
- `.gitignore` - Git ignore rules

**PROHIBITED in root directory:**
- Backup files (`*backup*`, `*.bak`, `*-v2*`, `*-copy*`, `*-old*`)
- Additional documentation (use `docs/` directory)
- Configuration files (use `config/` directory)
- Docker compose files (project uses independent containers)

### Independent Container Structure
Each service has its own complete build context:
- `src/app/` - Flask application with Dockerfile, .dockerignore, requirements.txt
- `infrastructure/docker/postgres/` - PostgreSQL 15+ with Dockerfile, complete schema, migrations
- `infrastructure/docker/redis/` - Redis 7 with Dockerfile, .dockerignore, redis.conf
- `scripts/` - Comprehensive management and automation scripts
- `assets/` - Static assets and form templates

### Key Files for Development
```
├── Makefile                                    # Main automation interface
├── src/app/                                   # Flask application source
├── infrastructure/docker/                     # Container definitions
├── scripts/                                  # Management and automation scripts
├── assets/                                   # Static assets and forms
└── CLAUDE.md                                 # This guidance file
```

## Testing Commands

### Comprehensive Testing
```bash
# Main testing entry point
make test                               # Run comprehensive test suite

# Specific test types
make test-api                          # Test API endpoints specifically
make test-integration                  # Integration tests
curl http://localhost:4545/health      # Local health check
curl https://safework.jclee.me/health  # Production health check

# Manual testing via health endpoints and API calls
curl -X POST http://localhost:4545/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type": "001", "name": "테스트"}'  # Test survey API

# Container-based verification (adjust container names based on current deployment)
docker exec -it safework-app python -c "
from app import create_app
from models import Survey, db
app = create_app()
with app.app_context():
    print(f'Survey count: {Survey.query.count()}')
"
```

### Validation Scripts
```bash
# Project structure and pipeline validation
make validate                          # Project structure validation
./scripts/pipeline_validator.sh        # CI/CD pipeline validation
./scripts/test_runner.sh              # Comprehensive system testing
```

### Single Test Execution (Development)
```bash
# Run single test file (requires virtual environment activation)
cd src/app && source venv/bin/activate && python -m pytest tests/test_survey.py -v
cd src/app && source venv/bin/activate && python -m pytest tests/test_auth.py::test_login -v

# Run tests with coverage
cd src/app && source venv/bin/activate && python -m pytest --cov=app tests/ --cov-report=html

# Run specific test categories
cd src/app && source venv/bin/activate && python -m pytest -m "unit" tests/     # Unit tests only
cd src/app && source venv/bin/activate && python -m pytest -m "integration" tests/  # Integration tests only
```

## Critical Development Notes

### Script Path Conventions
The project has scripts in two locations with different purposes:
- `scripts/` - Main automation and management scripts
- `tools/scripts/` - Advanced tooling and specialized scripts

**Important**: The Makefile references `./tools/scripts/` paths, but these should be updated to `./scripts/` paths:
```bash
# Current Makefile references (need updating)
./tools/scripts/safework_ops_unified.sh
./tools/scripts/portainer_advanced.sh

# Actual script locations
./scripts/safework_ops_unified.sh
./scripts/portainer_advanced.sh
```

### Container Network Requirements
- **Network Creation**: SafeWork requires a dedicated Docker network for inter-container communication
- **Network Name**: Project uses `safework_network` (not `safework2-network` as shown in README)
- **Critical**: Ensure network exists before starting containers independently