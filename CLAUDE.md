# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is an industrial health and safety management system built with Flask 3.0+ for Korean construction/industrial environments. It manages workplace health surveys, medical records, and comprehensive safety administration.

**Core Features:**
- **Survey System**: 001 Musculoskeletal & 002 New Employee health forms with conditional JavaScript logic
- **SafeWork Admin**: 13 specialized management panels (Workers, Health Checks, MSDS, Safety Education, etc.)
- **Document Management**: Version-controlled document system with access logging
- **Anonymous Submissions**: Public survey access with user_id=1 fallback
- **RESTful API v2**: External system integrations via `/api/safework/v2/*`
- **Claude Automation**: AI-powered issue processing and deployment

**Tech Stack:** 
- Backend: Flask 3.0+, SQLAlchemy 2.0, MySQL 8.0, Redis 5.0
- Frontend: Bootstrap 4.6, jQuery, responsive design
- Infrastructure: Docker, Private Registry (registry.jclee.me), Watchtower auto-deployment
- Localization: KST timezone (`kst_now()` function), Korean UI/error messages

## Development Commands

### Essential Setup
```bash
# Start all services (app port 4545, mysql 4543, redis 4544)
docker-compose up -d                    
docker-compose exec app bash           # Enter app container

# Database management (from app directory)
python migrate.py status               # Check migration status
python migrate.py migrate              # Apply migrations  
python migrate.py create "Description" # Create new migration

# Testing (target: 80%+ coverage)
pytest                                 # Run test suite
pytest --cov=. --cov-report=html      # Coverage report

# Container management  
docker-compose logs -f app             # View application logs
docker-compose down                    # Stop all services
```

### Access Points & Credentials
- **Main app**: http://localhost:4545
- **Admin panel**: http://localhost:4545/admin (admin/safework2024)
- **Health check**: http://localhost:4545/health  
- **Migration UI**: http://localhost:4545/migration/status
- **Production URLs**: 
  - Dev: safework-dev.jclee.me (192.168.50.100)
  - Production: safework.jclee.me (192.168.50.215)

## Architecture Overview

### Flask Application Factory (app/app.py)
```python
def create_app(config_name=None):
    # Factory pattern with config-based initialization
    # Extensions: SQLAlchemy, Flask-Login, Flask-Migrate, Redis
    # CSRF: Currently disabled (WTF_CSRF_ENABLED = False)
    # Blueprints: 8 modular route handlers auto-registered
```

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
surveys.data (JSON)               -- Flexible form field storage

-- Anonymous submissions
user_id = 1  -- Special user for anonymous form submissions

-- Korean localization
created_at = kst_now()  -- Always use KST timezone
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

### Automated CI/CD Pipeline
Push to `master` branch triggers automated deployment:
1. **Security scanning**: Trivy, Bandit, Safety
2. **Code quality checks**: Black, Flake8, Pylint 
3. **Test suite execution**: pytest
4. **Docker image build**: Multi-platform builds pushed to registry.jclee.me
5. **Watchtower deployment**: Automatic container updates via API

### Infrastructure Components
- **Registry**: registry.jclee.me (credentials in GitHub secrets)
- **Production**: https://safework.jclee.me (192.168.50.215)
- **Development**: https://safework-dev.jclee.me (192.168.50.100)
- **Watchtower**: watchtower.jclee.me (HTTP API for deployment triggers)
- **Images**: safework/app:latest, safework/mysql:latest, safework/redis:latest

### Required GitHub Secrets
```bash
CLAUDE_CODE_OAUTH_TOKEN=<token>          # Claude Code automation
REGISTRY_PASSWORD=<registry_password>    # Docker registry auth
WATCHTOWER_HTTP_API_TOKEN=<token>        # Watchtower API deployment
```

### Key Workflows (.github/workflows/)
```bash
# Primary automation
deploy.yml                   # Watchtower-based automated deployment
safework-claude-main.yml     # Main Claude AI processing
safework-claude-issues.yml   # GitHub issue handling

# Supporting workflows
auto-issue-detection.yml     # Error-triggered issue creation
safework-ci-autofix.yml     # CI auto-fixes
notifications.yml           # Slack/Discord deployment notifications
```

## Error Detection & Resolution

### Common Container Issues
Claude automatically detects and fixes:
- `gunicorn.errors.HaltServer` → Flask app import path verification
- `Worker failed to boot` → Dependencies and environment validation  
- `ImportError|ModuleNotFoundError` → requirements.txt audit
- `OperationalError` → MySQL connection settings verification

### Troubleshooting Commands
```bash
# Container status
docker-compose ps                                    # Check container status
docker-compose logs -f app                          # View application logs
docker pull registry.jclee.me/safework/app:latest  # Update to latest image

# Database management
python migrate.py status                            # Check migration status
docker-compose exec app python migrate.py migrate  # Run migrations

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

# Database connection
MYSQL_HOST=safework-mysql             # Container name
MYSQL_DATABASE=safework_db
MYSQL_USER=safework
MYSQL_PASSWORD=safework2024

# Redis cache
REDIS_HOST=safework-redis             # Container name  
REDIS_PORT=6379

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=safework2024
```

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
- MySQL 8.0 with UTF8MB4 charset for Korean text support
- Use `kst_now()` for all timestamp operations (consistent KST timezone)
- Transaction-based operations with rollback for data integrity
- Anonymous submissions always use `user_id=1`

### Security & Performance
- `@login_required` decorator for all admin routes
- CSRF protection currently disabled for survey testing
- Audit logging enabled for all administrative operations
- Redis caching for frequently accessed data
- Database indexing on key lookup fields
- Pagination (20 items per page) for large datasets