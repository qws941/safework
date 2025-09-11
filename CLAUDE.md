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
- Frontend: Bootstrap 4.6, jQuery, responsive design
- Infrastructure: Docker, Private Registry (registry.jclee.me), Watchtower auto-deployment
- Localization: KST timezone (`kst_now()` function), Korean UI/error messages

## Development Commands

### Independent Container Setup (No Docker Compose)
```bash
# Build all independent containers
docker build -t registry.jclee.me/safework2-app:latest ./app
docker build -t registry.jclee.me/safework2-postgres:latest ./postgres  
docker build -t registry.jclee.me/safework2-redis:latest ./redis

# Start services independently with proper network
docker network create safework2-network
docker run -d --name safework2-postgres --network safework2-network -p 4546:5432 \
  -e POSTGRES_PASSWORD=safework2024 -e POSTGRES_DB=safework_db -e POSTGRES_USER=safework \
  registry.jclee.me/safework2-postgres:latest
docker run -d --name safework2-redis --network safework2-network -p 4547:6379 \
  registry.jclee.me/safework2-redis:latest
docker run -d --name safework2-app --network safework2-network -p 4545:4545 \
  -e DB_HOST=safework2-postgres -e REDIS_HOST=safework2-redis \
  registry.jclee.me/safework2-app:latest

# Container management
docker logs -f safework2-app            # View application logs
docker ps                              # Check running containers
docker stop safework2-app safework2-postgres safework2-redis  # Stop all services

# Development with code changes (mount local code)
docker run -d --name safework2-app-dev --network safework2-network -p 4545:4545 \
  -v $(pwd)/app:/app -e FLASK_ENV=development \
  registry.jclee.me/safework2-app:latest
```

### Code Quality & Linting
```bash
# Python code formatting and linting (defined in requirements.txt)
cd app
black .                                 # Format code
flake8 .                               # Check code style
python -m py_compile *.py              # Syntax check

# Check for common issues
grep -r "print(" . --include="*.py"    # Find debug prints
grep -r "TODO\|FIXME" . --include="*.py"  # Find TODOs
```

### GitHub Actions & Claude AI Integration
```bash
# Trigger Claude AI assistance in issues or PRs
# Simply mention @claude in any issue comment or PR discussion

# Check workflow status
gh run list --limit 10                 # View recent workflow runs
gh workflow list                       # List all workflows
gh run watch <run-id>                  # Watch specific workflow execution

# Manual workflow triggers
gh workflow run "🔄 Dependency Auto-Update" --ref master
gh workflow run "📊 Operational Log Analysis" --ref master
gh workflow run "🤖 CI Auto-Fix" --ref master

# Issue management with Claude
gh issue create --title "Bug: Description" --body "@claude Please analyze this issue"
gh issue comment <issue-number> --body "@claude Please help with this problem"

# View Claude analysis results
gh issue view <issue-number>           # See Claude's issue analysis
gh pr view <pr-number>                 # See Claude's PR review
```

### Workflow Development & Debugging
```bash
# Test workflow syntax locally
cd .github/workflows
yamllint *.yml                         # Validate YAML syntax

# Check workflow file changes
git diff HEAD~1 .github/workflows/     # See recent workflow changes
git log --oneline .github/workflows/   # Workflow change history

# Debug failed workflows
gh run view <run-id> --log             # View detailed logs
gh run download <run-id>               # Download artifacts
```

### Testing Commands
```bash
# Run tests (inside app container or with proper environment)
cd app
python -m pytest                       # Run all tests
python -m pytest -v                    # Verbose output
python -m pytest --cov=. --cov-report=html  # Coverage report
python -m pytest tests/test_survey.py  # Specific test file

# Note: Test files may not be present yet - testing is configured via requirements.txt
# Testing environment uses PostgreSQL with separate test database
# Configure test database via environment variables:
# DB_HOST=127.0.0.1, DB_NAME=safework_test, DB_USER=safework_test
```

### Database Management
```bash
# Enter app container
docker exec -it safework2-app bash

# Migration commands (inside container)
python migrate.py status               # Check migration status
python migrate.py migrate              # Apply migrations  
python migrate.py create "Description" # Create new migration

# Database inspection
docker exec -it safework2-postgres psql -U safework -d safework_db -c "\dt;"
docker exec -it safework2-postgres psql -U safework -d safework_db -c "\d surveys;"
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

# Verify database connectivity from container
docker exec -it safework2-app python -c "
from models import Survey, db
print(f'Survey count: {Survey.query.count()}')
print('Database connection: OK')
"
```

### Access Points & Credentials
**Local Development:**
- **Main app**: http://localhost:4545
- **PostgreSQL**: localhost:4546 (safework2-postgres container)
- **Redis**: localhost:4547 (safework2-redis container)
- **Admin panel**: http://localhost:4545/admin (admin/safework2024)
- **Health check**: http://localhost:4545/health  
- **Migration UI**: http://localhost:4545/migration/status

**Remote Environments:**
- **Development**: https://safework-dev.jclee.me
- **Production**: https://safework.jclee.me

## Architecture Overview

### Flask Application Factory (app/app.py)
```python
def create_app(config_name=None):
    # Factory pattern with config-based initialization
    # Extensions: SQLAlchemy, Flask-Login, Flask-Migrate, Redis
    # CSRF: Currently disabled (WTF_CSRF_ENABLED = False)
    # Blueprints: 8+ modular route handlers auto-registered
    # System uptime tracking and version management via Git
    # Context processors for template globals and URL routing
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

**Container Independence:**
- No docker-compose dependency - each service runs independently
- Health checks and restart policies in Dockerfiles
- Volume declarations for data persistence
- Container network communication via internal DNS

### Model Architecture & Database Design
**Core Models (models.py):**
- `User`: Flask-Login authentication integration
- `Survey`: Unified table for 001/002 forms using `form_type` discriminator + JSON `data` field
- `AuditLog`: System activity tracking
- `kst_now()`: Consistent KST timezone function for all timestamps

**SafeWork Models (models_safework.py + models_safework_v2.py):**
- 13+ specialized tables: `safework_workers`, `safework_health_checks`, `safework_medications`, etc.
- Industrial safety management domain models

**Document Models (models_document.py):**
- `Document`, `DocumentVersion`, `DocumentAccessLog`: Version control with access tracking

**Key Database Patterns:**
```sql
-- Survey system with discriminator
surveys.form_type = '001' | '002'  -- Form type identifier
surveys.data (JSONB)               -- Flexible form field storage with PostgreSQL indexing

-- Anonymous submissions
user_id = 1  -- Special user for anonymous form submissions

-- Korean localization
created_at = kst_now()  -- Always use KST timezone
```

**Critical Survey Model Fields (for API endpoints):**
The Survey model uses these exact field names - **field mismatches cause 500 errors**:
```python
# Core identification fields
user_id, form_type, name, age, gender

# Employment fields  
years_of_service, employee_number, department, position, employee_id
work_years, work_months  # Legacy fields still in use

# Health fields
has_symptoms, status  # Boolean and varchar fields

# Additional fields in database schema
company_id, process_id, role_id, responses (JSON), symptoms_data (JSON)
```

### Route Organization & Blueprint Structure
```
app/routes/
├── main.py               # Homepage, general routes
├── auth.py              # Authentication (login/register/logout)
├── survey.py            # 001/002 form handling, conditional logic
├── admin.py             # Admin dashboard + 13 SafeWork panels
├── document.py          # Public document access
├── document_admin.py    # Document management admin
├── api_safework_v2.py   # RESTful API endpoints
├── health.py            # System health monitoring (/health)
└── migration.py         # Database migration web interface
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

**SafeWork Admin Panel Pattern:**
```python
# 1. Model Definition (models_safework.py)
class SafeworkWorker(db.Model):
    __tablename__ = "safework_workers"

# 2. API Endpoint (api_safework_v2.py)
@api_safework_bp.route('/workers', methods=['GET', 'POST']) 
@login_required
def handle_workers():
    # CRUD operations with JSON responses

# 3. Admin Interface (admin.py + templates/admin/safework/)
@admin_bp.route('/safework/workers')
@login_required  
def safework_workers():
    # Bootstrap 4.6 + jQuery AJAX integration
```

## Deployment & Infrastructure

### Advanced GitHub Actions CI/CD Pipeline
The project uses a sophisticated 8-workflow GitHub Actions system with Claude AI integration:

**Core Workflows:**
- **🚀 Deploy Pipeline**: Main deployment workflow (from temp_blacklist template)
- **🤖 Claude Code Assistant**: AI-powered code assistance with `@claude` mentions
- **🎯 Issue Handler**: Intelligent issue triage and auto-labeling
- **🔍 PR Review**: Comprehensive PR analysis with progress tracking
- **🤖 CI Auto-Fix**: Automatic CI failure detection and repair
- **🔄 Dependency Auto-Update**: Automated dependency management
- **📊 Operational Log Analysis**: Container log monitoring via Portainer API
- **🔍 PR Auto Review**: Additional PR review automation

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
- **Portainer**: portainer.jclee.me (Container management via API)
- **Images**: 
  - registry.jclee.me/safework2-app:latest
  - registry.jclee.me/safework2-postgres:latest
  - registry.jclee.me/safework2-redis:latest

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
REGISTRY_PASSWORD=<password>             # Docker registry auth (registry.jclee.me)
PORTAINER_API_TOKEN=<token>              # Portainer API access
PORTAINER_ENDPOINT_ID=1                  # Portainer endpoint ID (default: 1)

# Database credentials
POSTGRES_PASSWORD=<password>             # PostgreSQL password
REDIS_PASSWORD=<password>                # Redis password
SECRET_KEY=<secret>                      # Flask secret key

# Environment URLs
PRD_URL=https://safework.jclee.me       # Production URL
DEV_URL=https://safework-dev.jclee.me   # Development URL
PORTAINER_URL=https://portainer.jclee.me # Portainer URL

# Claude AI Integration (CRITICAL for workflows)
CLAUDE_CODE_OAUTH_TOKEN=<token>          # Claude Code automation
GITHUB_TOKEN=<token>                     # GitHub API access for Claude workflows

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

## Error Detection & Resolution

### Common Container Issues
Claude automatically detects and fixes:
- `gunicorn.errors.HaltServer` → Flask app import path verification
- `Worker failed to boot` → Dependencies and environment validation  
- `ImportError|ModuleNotFoundError` → requirements.txt audit
- `OperationalError` → PostgreSQL connection settings verification
- `'field_name' is an invalid keyword argument for Survey` → Model field mapping errors
- PostgreSQL connection timeout → Increase DB_CONNECTION_RETRIES (currently 60) and DB_CONNECTION_DELAY (3s)

### Troubleshooting Commands
```bash
# Container status
docker ps                                           # Check container status
docker logs -f safework2-app                        # View application logs
docker pull registry.jclee.me/safework2-app:latest # Update to latest image

# Independent container restart
docker stop safework2-app safework2-postgres safework2-redis
docker rm safework2-app safework2-postgres safework2-redis
docker run -d --name safework2-postgres --network safework2-network safework/postgres:latest
docker run -d --name safework2-redis --network safework2-network safework/redis:latest
docker run -d --name safework2-app --network safework2-network safework/app:latest

# Database management
python migrate.py status                            # Check migration status
docker exec -it safework2-app python migrate.py migrate  # Run migrations

# Portainer API debugging
curl -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
     "https://portainer.jclee.me/api/endpoints/1/docker/containers/json" # List containers

# Survey form debugging
# - Verify HTML/JavaScript ID matching (critical for conditional logic)
# - Ensure user_id=1 exists for anonymous submissions
# - Use kst_now() consistently for Korean timezone
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
FLASK_CONFIG=production                # Environment mode
SECRET_KEY=safework-production-secret-key-2024
TZ=Asia/Seoul                         # Korean timezone

# Database connection (PostgreSQL)
DB_HOST=safework2-postgres            # Container name
DB_PORT=5432                          # PostgreSQL port
DB_NAME=safework_db
DB_USER=safework
DB_PASSWORD=safework2024

# Redis cache
REDIS_HOST=safework2-redis            # Container name  
REDIS_PORT=6379

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=safework2024
```

## Operational Log Monitoring

### Portainer API Integration
SafeWork includes automated operational log monitoring through Portainer API:

```bash
# Portainer API Configuration
PORTAINER_URL=https://portainer.jclee.me
PORTAINER_TOKEN=ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=

# Monitored Applications
SAFEWORK_PROD_URL=safework.jclee.me      # Production monitoring
SAFEWORK_DEV_URL=safework-dev.jclee.me   # Development monitoring
```

### Automated Log Analysis
- **Schedule**: Every 6 hours via GitHub Actions
- **Container Log Collection**: Real-time log retrieval from running containers
- **Claude Code Analysis**: AI-powered error pattern detection and performance analysis
- **Korean Language Reports**: Operational insights and recommendations in Korean
- **GitHub Issue Creation**: Automatic issue creation for critical problems

### Log Analysis Features
1. **Container Health Monitoring**: Flask app, PostgreSQL, Redis container status
2. **Performance Metrics**: Response times, database query performance, cache hit rates
3. **Error Pattern Detection**: Application errors, database timeouts, security alerts
4. **Security Monitoring**: Authentication failures, suspicious access patterns
5. **Business Logic Health**: Survey form submissions, admin panel usage patterns
6. **Claude AI Analysis**: Automated log analysis with Korean language reports via GitHub Actions

## Key API Endpoints
```bash
# Core endpoints
/health                                    # System health check (JSON)
/                                         # Main homepage

# Survey forms (anonymous access)
/survey/001_musculoskeletal_symptom_survey     # Anonymous form
/survey/002_new_employee_health_checkup_form   # Anonymous form

# Admin access (login required)
/admin/dashboard                              # Main admin dashboard
/admin/safework                              # SafeWork management hub

# RESTful API v2
/api/safework/v2/workers                     # Worker CRUD operations
/api/safework/v2/health-checks               # Health record management
/api/safework/v2/medications                 # Medicine inventory CRUD
```

## Production Guidelines

### Database Best Practices
- PostgreSQL 15+ with UTF8 encoding for Korean text support
- Use `kst_now()` for all timestamp operations (consistent KST timezone)
- Transaction-based operations with rollback for data integrity
- Anonymous submissions always use `user_id=1`
- JSONB fields for flexible survey data storage with indexing support

### Security & Performance
- `@login_required` decorator for all admin routes
- CSRF protection currently disabled for survey testing
- Audit logging enabled for all administrative operations
- Redis caching for frequently accessed data
- Database indexing on key lookup fields
- Pagination (20 items per page) for large datasets

## Project Structure Guidelines

### Root Directory Restrictions
**ONLY ALLOWED in root directory:**
- `CLAUDE.md` - This file
- `README.md` - Project documentation
- `.gitignore` - Git ignore rules

**PROHIBITED in root directory:**
- Backup files (`*backup*`, `*.bak`, `*-v2*`, `*-copy*`, `*-old*`)
- Additional documentation (use `docs/` directory)
- Configuration files (use `config/` directory)
- Docker compose files (project uses independent containers)

### Independent Container Structure
Each service has its own complete build context:
- `app/` - Flask application with Dockerfile, .dockerignore, requirements.txt
- `postgres/` - PostgreSQL 15+ with Dockerfile, .dockerignore, init.sql
- `redis/` - Redis 7 with Dockerfile, .dockerignore, redis.conf

### Quality Validation
Run structure validation: `python scripts/validate-structure.py`
- Current compliance: 92.3% (24/26 checks passed)
- All containers are Watchtower compatible
- Independent deployment ready