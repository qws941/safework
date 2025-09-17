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
- Backend: Flask 3.0+, SQLAlchemy 2.0, PostgreSQL 15+ (**⚠️ MySQL 사용 금지**), Redis 7.0
- Frontend: Bootstrap 4.6, jQuery, responsive design
- Infrastructure: Docker, Private Registry (registry.jclee.me), Watchtower auto-deployment, Portainer API
- Localization: KST timezone (`kst_now()` function), Korean UI/error messages
- Security: CSRF protection disabled (WTF_CSRF_ENABLED = False), Flask-Login authentication
- Testing: **Manual testing only** - no formal test suite exists (app/tests/ directory not found)

## Development Commands

### Container Deployment via GitHub Actions CI/CD

**Production Deployment Process:**
1. **Push to master branch** → Triggers GitHub Actions workflow
2. **Build & Push Images** → Builds all containers, pushes to registry.jclee.me
3. **Watchtower Auto-Deploy** → Automatically detects new images and deploys
4. **Health Verification** → Checks all services are running properly

```bash
# Trigger deployment (GitHub Actions handles building)
git add .
git commit -m "Fix: Update SafeWork with submission_date column"
git push origin master

# GitHub Actions will:
# 1. Build safework/app, safework/postgres, safework/redis images
# 2. Push to registry.jclee.me with latest tags
# 3. Trigger Watchtower update via HTTP API
# 4. Monitor deployment success via Portainer API
```

### Manual Container Setup (Development Only)
```bash
# CRITICAL: Use correct image names (consistent with production)
docker pull registry.jclee.me/safework/app:latest
docker pull registry.jclee.me/safework/postgres:latest
docker pull registry.jclee.me/safework/redis:latest

# Start PostgreSQL with KST timezone and automated schema migration
docker run -d --name safework-postgres --network watchtower_default -p 4546:5432 \
  -e TZ=Asia/Seoul -e POSTGRES_PASSWORD=safework2024 -e POSTGRES_DB=safework_db -e POSTGRES_USER=safework \
  --label "com.centurylinklabs.watchtower.enable=true" \
  registry.jclee.me/safework/postgres:latest

# Start Redis with clean state
docker run -d --name safework-redis --network watchtower_default -p 4547:6379 \
  -e TZ=Asia/Seoul \
  --label "com.centurylinklabs.watchtower.enable=true" \
  registry.jclee.me/safework/redis:latest

# Start application with correct database name (safework_db) and KST timezone
docker run -d --name safework-app --network watchtower_default -p 4545:4545 \
  -e TZ=Asia/Seoul -e DB_HOST=safework-postgres -e DB_NAME=safework_db -e DB_USER=safework \
  -e DB_PASSWORD=safework2024 -e REDIS_HOST=safework-redis \
  --label "com.centurylinklabs.watchtower.enable=true" \
  registry.jclee.me/safework/app:latest

# Container management
docker logs -f safework-app            # View application logs
docker ps                              # Check running containers
docker stop safework-app safework-postgres safework-redis  # Stop all services

# Development with code changes (mount local code)
docker run -d --name safework-app-dev --network watchtower_default -p 4545:4545 \
  -v $(pwd)/app:/app -e FLASK_ENV=development \
  registry.jclee.me/safework/app:latest
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

### Production Monitoring & Log Analysis Scripts
```bash
# Production-optimized scripts for live system monitoring
./scripts/simple_production_query.sh           # Quick production status check
./scripts/production_query_advanced.sh         # Detailed production analysis
./scripts/portainer_production_logs.sh         # Production log analysis

# Container management shortcuts
./scripts/portainer_simple.sh status           # Container health overview
./scripts/portainer_simple.sh logs safework-app # View app container logs
./scripts/portainer_simple.sh network          # Network configuration check
./scripts/portainer_simple.sh                  # Show all SafeWork container info
./scripts/portainer_simple.sh running          # List only running containers

# Detailed monitoring script
./scripts/portainer_queries.sh         # Comprehensive container analysis

# Scripts automatically filter SafeWork containers and provide clean output
# No need to remember complex API calls or JSON parsing
```

### GitHub Actions Workflows
```bash
# Current active workflows (verified):
- deploy.yml                    # Main production deployment
- claude-mcp-assistant.yml      # AI-powered issue analysis with MCP
- maintenance-automation.yml    # System maintenance tasks
- operational-log-analysis.yml  # Real-time log monitoring
- security-auto-triage.yml      # Security scanning
- issue-handler.yml             # Intelligent issue management
- dependency-auto-update.yml    # Dependency management
- fix-postgres-watchtower-labels.yml  # PostgreSQL Watchtower labels fix
- claude-assistant.yml          # Additional Claude assistant workflow

# All workflows use PostgreSQL 15+ and Portainer API deployment
# Workflows automatically handle container recreation and health monitoring
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
# NOTE: No formal test suite currently exists - tests directory not found
# Code quality checks available:
cd app
black .                                 # Format code with Black
flake8 .                               # Lint code with Flake8
python -m py_compile *.py              # Syntax validation

# Manual testing via health endpoints and API calls:
curl http://localhost:4545/health       # Test application health
curl -X POST http://localhost:4545/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type": "001", "name": "테스트"}'  # Test survey API

# Container-based verification
docker exec -it safework-app python -c "
from app import create_app
from models import Survey, db
app = create_app()
with app.app_context():
    print(f'Survey count: {Survey.query.count()}')
"
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

**Container Independence & Schema Migration:**
- No docker-compose dependency - each service runs independently
- Automated PostgreSQL schema migration via init.sql and migration scripts
- Health checks and restart policies in Dockerfiles
- Volume declarations for data persistence
- Container network communication via internal DNS
- KST timezone enforcement across all containers

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
surveys.responses (JSON)           -- Flexible form field storage (MySQL JSON, PostgreSQL JSONB)

-- Anonymous submissions
user_id = 1  -- Special user for anonymous form submissions

-- Korean localization
created_at = kst_now()  -- Always use KST timezone
```

**Critical Survey Model Fields (for API endpoints):**
The Survey model uses **minimal essential columns only** - optimized for database compatibility:
```python
# Essential fields (September 2024 Schema Optimization)
user_id, form_type, name, age, gender
department, position, employee_id
years_of_service, employee_number
work_years, work_months, has_symptoms
status, created_at, updated_at
responses  # JSON field for all additional data

# Schema Optimization Notes:
# - Removed problematic columns: hire_date, submission_date, employment_type
# - All extended data stored in JSON responses field
# - Minimal model prevents database column mismatch errors
# - Flexible JSON storage for 001/002 form variations
```

### Flask Route Architecture
```
app/routes/
├── __init__.py              # Route package initialization
├── admin.py                 # 13 SafeWork admin panels + main admin dashboard
├── api_safework_v2.py       # RESTful API v2 endpoints for external systems
├── api_safework.py          # Legacy API endpoints
├── survey.py                # 001/002 form handling with conditional JavaScript
├── auth.py                  # Flask-Login authentication (admin/safework2024)
├── health.py                # System health monitoring (/health endpoint)
├── document.py              # Public document access (version control)
├── document_admin.py        # Admin document management
├── main.py                  # Homepage and general routes
├── migration.py             # Database migration web interface
├── monitoring.py            # System monitoring endpoints (DISABLED: circular import issue)
├── notification_system.py   # Notification system routes
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
**Multi-Environment Setup (config.py):**
```python
# Environment-specific database configuration
config = {
    "development": DevelopmentConfig,  # PostgreSQL, CSRF disabled
    "production": ProductionConfig,    # PostgreSQL, CSRF disabled
    "testing": TestingConfig,          # MySQL, CSRF disabled
    "default": DevelopmentConfig,
}

# Key configuration patterns:
# - Database switching: PostgreSQL (prod/dev) vs MySQL (testing)
# - CSRF protection completely disabled across all environments
# - File upload limits: 50MB with specific allowed extensions
# - Session configuration with security headers
# - Redis integration for caching and session storage
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
The project uses an **optimized English-only workflow system** with advanced Claude AI integration:

**Current Active Workflows:**
- **🚀 deploy.yml**: SafeWork Production Deployment with auto-rollback and emergency recovery
- **🤖 claude-mcp-assistant.yml**: Claude AI Assistant with Advanced MCP Integration
- **🔧 maintenance-automation.yml**: Automated system maintenance and health monitoring
- **📊 operational-log-analysis.yml**: Real-time container log monitoring via Portainer API
- **🛡️ security-auto-triage.yml**: Automated vulnerability detection and resolution
- **🎯 issue-handler.yml**: Intelligent issue management with auto-labeling
- **🔄 dependency-auto-update.yml**: Weekly automated dependency management
- **🔧 fix-postgres-watchtower-labels.yml**: PostgreSQL Watchtower labels fix workflow

**Recent Optimizations (September 2024):**
- ✅ **Workflow Consolidation**: Reduced from 9 to 6 optimized workflows
- ✅ **English Conversion**: All workflow files converted to English
- ✅ **MCP Integration**: Advanced Multiple MCP Protocol tools (Sequential Thinking, Serena Code Analysis, Shrimp Task Management)
- ✅ **Auto-Recovery**: Emergency rollback and self-healing deployment system
- ✅ **Container Testing**: Independent container connectivity validation

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

## Watchtower & Portainer Operations

### Watchtower Container Verification
```bash
# Check if Watchtower is detecting all SafeWork containers
curl -H "Authorization: Bearer wt_k8Jm4nX9pL2vQ7rB5sT6yH3fG1dA0" \
  "https://watchtower.jclee.me/v1/status"

# Expected response: Should show safework-app, safework-postgres, safework-redis
# Target: 6 containers total (3 SafeWork + 3 BlackList)

# Trigger manual Watchtower update
curl -X POST -H "Authorization: Bearer wt_k8Jm4nX9pL2vQ7rB5sT6yH3fG1dA0" \
  "https://watchtower.jclee.me/v1/update"
```

### Portainer API Container Management & Simplified Scripts
```bash
# Use simplified Portainer query scripts (recommended)
./scripts/portainer_simple.sh status        # Check SafeWork container status
./scripts/portainer_simple.sh running       # List running containers only
./scripts/portainer_simple.sh logs safework-app  # View specific container logs
./scripts/portainer_simple.sh network       # Check network configuration
./scripts/portainer_simple.sh               # Show all information

# Raw API calls (if needed)
curl -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/json"

# Create new container with Watchtower labels via Portainer
curl -X POST -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  -H "Content-Type: application/json" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/create?name=safework-postgres" \
  -d '{
    "Image": "registry.jclee.me/safework/postgres:latest",
    "Env": ["POSTGRES_PASSWORD=safework2024", "POSTGRES_DB=safework_db", "POSTGRES_USER=safework"],
    "Labels": {"com.centurylinklabs.watchtower.enable": "true"},
    "HostConfig": {
      "PortBindings": {"5432/tcp": [{"HostPort": "4546"}]},
      "NetworkMode": "watchtower_default"
    }
  }'

# Remove duplicate containers
curl -X DELETE -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/<container_id>?force=true"

# Execute SQL commands in PostgreSQL container
curl -X POST -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  -H "Content-Type: application/json" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/safework-postgres/exec" \
  -d '{
    "Cmd": ["psql", "-U", "safework", "-d", "safework_db", "-c", "ALTER TABLE surveys ADD COLUMN submission_date TIMESTAMP DEFAULT NOW();"],
    "AttachStdout": true,
    "AttachStderr": true
  }'
```

### Recent Database Schema Fixes & Current Issues
**CRITICAL FIXES APPLIED:**

1. **Admin Login 500 Error (ONGOING ISSUE - September 2024):**
```python
# Problem: Admin login fails with 500 error due to PostgreSQL connection issues
# Error: sqlalchemy.exc.OperationalError: connection to server at "safework-postgres" failed: Connection refused
# Status: UNRESOLVED - DB connection intermittently fails during authentication

# Temporary workarounds attempted:
# - Container restarts (both app and postgres)
# - Network connectivity verification
# - Session configuration review

# Next steps: Investigate PostgreSQL connection pooling and authentication
```

2. **Survey Detail Data Display Issue (RESOLVED - December 2024):**
```python
# Problem: Survey detail pages not displaying submitted form data properly
# Root cause: Form data not being saved to responses JSON field during submission

# Solution: Updated survey.py to save ALL form data to responses field
# Before: Only saved basic fields to database columns
# After: All form data (including complex musculo_details) saved to responses JSON

# Changes made:
# 1. survey.py: Collect all form data into responses field
all_form_data = {}
for key, value in request.form.items():
    if key.endswith('[]'):
        all_form_data[key] = request.form.getlist(key)
    else:
        all_form_data[key] = value
if musculo_details:
    all_form_data['musculo_details'] = musculo_details

# 2. admin_detail.html: Display submitted data in table format
# Shows original submitted data exactly as user entered it

# Impact: Survey detail pages now show complete submitted data as originally entered
# Status: Fixed in commit 3c21fa2, deployed and verified
```

2. **APP_VERSION Property Object Display Bug (RESOLVED):**
```python
# Problem: Footer showing "<property object at 0x...>" instead of version number
# Root cause: Flask config copying property decorator instead of value
# Solution: Explicit conversion in app.py after config loading
config_obj = config[config_name]()
app.config['APP_VERSION'] = config_obj.APP_VERSION  # Gets actual string value

# Fallback handling also updated for property object issue:
app_version = "3.0.0"  # Direct hardcoding instead of property reference
```

2. **submission_date Column Issue (RESOLVED):**
```python
# Problem: Missing submission_date column causing 500 errors
# Solution: Added actual database column instead of property
submission_date = db.Column(db.DateTime, default=kst_now)

# Manual fix applied via Portainer API:
ALTER TABLE surveys ADD COLUMN submission_date TIMESTAMP DEFAULT NOW();
```

3. **Database Configuration Standardization (RESOLVED):**
```python
# Standardized to PostgreSQL 15+ for all environments
# Current Status: PostgreSQL 15+ (production, development, testing)
# Container: safework-postgres (port 4546)
# Benefits: Consistent JSONB support, better performance for survey data
```

4. **Model Import Issues (RESOLVED):**
```python
# Problem: ImportError: cannot import name 'AuditLog' from 'models'
# Solution: Added backward compatibility aliases at end of models.py
Survey = SurveyModel
SurveyStatistics = SurveyStatisticsModel
AuditLog = AuditLogModel
```

5. **SQLAlchemy 2.0 Compatibility Update (RESOLVED - September 2024):**
```python
# Problem: SQLAlchemy deprecation warning in admin.py
# Old code: survey = Survey.query.get_or_404(id)
# Warning: "The Query.get() method is considered legacy"

# Solution: Updated to SQLAlchemy 2.0 pattern
from models import Survey, db
survey = db.session.get(Survey, id)
if not survey:
    abort(404)

# Impact: Eliminates deprecation warnings and ensures future compatibility
# Status: Fixed in commit 49edd5b, deployed with survey data display fix
```

**CURRENT SYSTEM STATUS (Updated September 2024):**
- **Database**: PostgreSQL 15+ in production with automated schema migration system
- **Container Names**: safework-app, safework-postgres, safework-redis (all KST timezone)
- **Database Name**: **CRITICAL** - Must use `safework_db` not `safework` to prevent connection errors
- **Authentication**: ❌ **FAILING** - Admin login returns 500 error due to PostgreSQL connection issues
- **Version Display**: Fixed property object bug - now shows "3.0.0"
- **API Endpoints**: All SafeWork admin endpoints require authentication
- **Test Data**: Survey submissions with complete JSON response data storage
- **CSRF Protection**: Disabled for survey testing (WTF_CSRF_ENABLED=false)
- **Schema Migration**: Automated via PostgreSQL init.sql and migration scripts
- **Data Persistence**: Verified across container restarts with volume persistence
- **Known Issues**: monitoring_bp disabled due to circular import, PostgreSQL connection intermittent

### Survey Data Display Troubleshooting (Updated December 2024)
```bash
# Debug survey detail pages not displaying submitted data properly
# RESOLVED: Form data now properly saved to responses JSON field

# Check survey data in database with complete responses
docker exec -it safework-postgres psql -U safework -d safework_db \
  -c "SELECT id, name, form_type, jsonb_pretty(responses) FROM surveys WHERE id = 2;"

# Verify all form fields are saved in responses JSON
docker exec -it safework-postgres psql -U safework -d safework_db \
  -c "SELECT responses ? 'name', responses ? 'age', responses ? 'musculo_details' FROM surveys WHERE id = 2;"

# Test new survey submission (all data saved to responses field)
curl -X POST http://localhost:4545/survey/001_musculoskeletal_symptom_survey \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'name=테스트사용자&age=30&gender=남성&department=개발부&position=개발자&current_symptom=예'

# Access detailed survey view to see all submitted data
# URL pattern: https://safework.jclee.me/admin/survey/<id>
# Now displays: Table format with all form fields + JSON collapsible view

# Template structure (fixed):
# - Displays all key-value pairs from responses JSON
# - Special handling for musculo_details array data
# - JSON raw data available in collapsible details section
```

### Admin Login 500 Error Troubleshooting (September 2024)
```bash
# CRITICAL ISSUE: Admin login fails with PostgreSQL connection error
# Error: sqlalchemy.exc.OperationalError: connection to server at "safework-postgres" failed: Connection refused

# 1. Verify container status
curl -s -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/json" | \
  python3 -c "import json,sys; [print(f'{c[\"Names\"][0][1:]}: {c[\"State\"]} - {c[\"Status\"]}') for c in json.load(sys.stdin) if 'safework' in c[\"Names\"][0]]"

# 2. Test admin login (triggers 500 error)
curl -X POST -d "username=admin&password=safework2024" -s "https://safework.jclee.me/auth/login" | grep -o "<title>.*</title>"
# Expected: <title>서버 오류 - SafeWork 안전보건 관리시스템</title>

# 3. Check app container logs for connection errors
curl -s -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/[CONTAINER_ID]/logs?stdout=true&stderr=true&tail=20" | \
  strings | grep -E "(Connection refused|OperationalError|sqlalchemy.exc)"

# 4. Workaround attempts (not fully effective)
# - Restart PostgreSQL container: curl -X POST [PORTAINER_API]/containers/[PG_ID]/restart
# - Restart app container: curl -X POST [PORTAINER_API]/containers/[APP_ID]/restart
# - Verify network connectivity between containers

# Status: UNRESOLVED - requires deeper PostgreSQL connection pool investigation
```

### Survey API Testing & Verification
```bash
# Test survey submission (should return 201 Created)
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
    "data": {"has_symptoms": true}
  }'

# Verify data saved in PostgreSQL
docker exec -it safework-postgres psql -U safework -d safework_db \
  -c "SELECT id, name, form_type, age, gender, department, position, submission_date, created_at FROM surveys ORDER BY id DESC LIMIT 5;"
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

**Critical Model Alias Fix Applied:**
```python
# Required aliases at end of models.py for backward compatibility
Survey = SurveyModel
SurveyStatistics = SurveyStatisticsModel  
AuditLog = AuditLogModel
```

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
# Restart using latest images from registry (built by GitHub Actions)
# CRITICAL: Use correct image naming and environment variables
docker run -d --name safework-postgres --network watchtower_default -p 4546:5432 \
  -e TZ=Asia/Seoul -e POSTGRES_PASSWORD=safework2024 -e POSTGRES_DB=safework_db -e POSTGRES_USER=safework \
  --label "com.centurylinklabs.watchtower.enable=true" \
  registry.jclee.me/safework/postgres:latest
docker run -d --name safework-redis --network watchtower_default -p 4547:6379 \
  -e TZ=Asia/Seoul \
  --label "com.centurylinklabs.watchtower.enable=true" \
  registry.jclee.me/safework/redis:latest
docker run -d --name safework-app --network watchtower_default -p 4545:4545 \
  -e TZ=Asia/Seoul -e DB_HOST=safework-postgres -e DB_NAME=safework_db \
  -e DB_USER=safework -e DB_PASSWORD=safework2024 -e REDIS_HOST=safework-redis \
  --label "com.centurylinklabs.watchtower.enable=true" \
  registry.jclee.me/safework/app:latest

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

## Claude Code 자동화 모니터링 시스템

### Portainer API 기반 컨테이너 로그 감시
SafeWork는 **실시간 컨테이너 로그 감시**와 **자동 에러 감지** 시스템을 포함합니다:

```bash
# Portainer API 설정
PORTAINER_URL=https://portainer.jclee.me
PORTAINER_API_TOKEN=ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=
PORTAINER_ENDPOINT_ID=3                  # Portainer endpoint ID

# 모니터링 대상 컨테이너
SAFEWORK_CONTAINERS=[
  "safework-app",      # Flask application container
  "safework-postgres", # PostgreSQL database container  
  "safework-redis"     # Redis cache container
]

# 모니터링 URL
SAFEWORK_PROD_URL=https://safework.jclee.me      # Production monitoring
SAFEWORK_DEV_URL=https://safework-dev.jclee.me   # Development monitoring
```

### 실시간 에러 로그 감지 및 자동 이슈 등록
**🚨 Critical Error Detection Patterns:**
```python
# 감지 대상 에러 패턴
ERROR_PATTERNS = [
    "ImportError|ModuleNotFoundError",     # Python import errors
    "OperationalError.*database",          # Database connection errors
    "gunicorn.errors.HaltServer",         # Gunicorn server errors
    "Worker failed to boot",              # Worker process failures
    "500 Internal Server Error",          # HTTP 500 errors
    "CRITICAL|FATAL",                     # Critical log levels
    "Exception in.*survey",               # Survey system errors
    "PostgreSQL.*connection.*failed",      # Database connectivity
    "Redis.*connection.*failed",          # Cache connectivity
    "Memory usage.*90%",                  # High memory usage
    "Disk usage.*90%"                     # High disk usage
]
```

### 자동화된 로그 분석 및 이슈 생성
- **감시 주기**: 5분마다 실시간 로그 수집
- **에러 감지**: 패턴 매칭 기반 즉시 감지
- **자동 이슈 등록**: GitHub Issues API를 통한 자동 생성
- **Claude AI 분석**: 에러 원인 분석 및 해결책 제안
- **한국어 보고서**: 한국어로 된 상세 분석 보고서
- **Slack 알림**: 즉시 Slack 채널 알림 발송

### GitHub Actions 워크플로우 자동화
**📊 Operational Log Analysis 워크플로우:**
```yaml
# .github/workflows/operational-log-analysis.yml
name: 📊 Operational Log Analysis
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  log-monitoring:
    runs-on: ubuntu-latest
    steps:
      - name: 🔍 Fetch Container Logs via Portainer API
        run: |
          # Portainer API를 통한 실시간 로그 수집
          # 에러 패턴 감지 및 분석
          # 임계 에러 감지시 GitHub Issue 자동 생성
          
      - name: 🤖 Claude AI Error Analysis
        uses: anthropics/claude-code-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          anthropic_api_key: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: |
            컨테이너 로그를 분석하여 에러 원인과 해결책을 제시해주세요:
            - 에러 패턴 식별 및 분류
            - 근본 원인 분석 (RCA)
            - 즉시 조치사항 및 장기 해결책
            - 예방책 및 모니터링 개선안
```

### 고급 로그 분석 기능
1. **🔍 실시간 컨테이너 상태 모니터링**: CPU, 메모리, 디스크 사용률
2. **⚡ 성능 메트릭 추적**: 응답시간, 데이터베이스 쿼리 성능, 캐시 적중률
3. **🚨 에러 패턴 감지**: 애플리케이션 오류, 데이터베이스 타임아웃, 보안 경고
4. **🛡️ 보안 모니터링**: 인증 실패, 의심스러운 접근 패턴 감지
5. **📊 비즈니스 로직 건강성**: 설문 제출률, 관리 패널 사용 패턴
6. **🤖 Claude AI 자동 분석**: 한국어 분석 보고서 및 GitHub Actions 연동

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

## Key Development Workflows

### Adding New Survey Forms
1. **Route Setup**: Add new form routes in `app/routes/survey.py`
2. **Template Creation**: Create HTML template in `app/templates/survey/`
3. **Model Updates**: Update `Survey` model if new fields needed (use JSON `responses` field for flexibility)
4. **Admin Interface**: Add admin management to `app/routes/admin.py`
5. **JavaScript Logic**: Implement conditional logic matching exact HTML IDs

### SafeWork Admin Panel Extension
1. **Model Definition**: Add new models in `models_safework.py` or `models_safework_v2.py`
2. **API Endpoints**: Add RESTful endpoints in `api_safework_v2.py`
3. **Admin Routes**: Add admin interface routes in `admin.py`
4. **Templates**: Create admin templates in `templates/admin/safework/`
5. **Database Migration**: Use `python migrate.py create "Description"` for schema changes

### Container Deployment Testing
```bash
# Test individual container health before deployment
docker build -t test-app ./app && docker run --rm test-app python -c "import app; print('OK')"
docker build -t test-postgres ./postgres && docker run --rm -e POSTGRES_DB=test test-postgres postgres --version
docker build -t test-redis ./redis && docker run --rm test-redis redis-server --version

# Verify container networking
docker network inspect watchtower_default  # Check network exists
./scripts/portainer_simple.sh network      # Check production network config
```