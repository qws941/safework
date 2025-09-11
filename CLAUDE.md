# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is an industrial health and safety management system built with Flask 3.0+. It manages workplace health surveys (001 Musculoskeletal, 002 New Employee Health), medical checkups, and comprehensive safety administration for construction environments.

**Core Features:**
- 001/002 Survey forms with conditional logic and JSON data storage  
- 13 specialized SafeWork admin panels (Workers, Health Checks, Medical Visits, Medications, etc.)
- Document management system with version control
- Anonymous survey submission (user_id=1)
- RESTful API (v2) for external integrations
- Advanced Claude Code automation system

**Tech Stack:** 
- Backend: Python Flask 3.0+, SQLAlchemy 2.0, MySQL 8.0, Redis 5.0
- Frontend: Bootstrap 4.6, jQuery, Font Awesome
- Infrastructure: Docker, GitHub Actions, Private Registry (registry.jclee.me), Watchtower
- Korean Localization: KST timezone, Korean UI text

## Development Commands

### Essential Commands
```bash
# Start Development Environment
docker-compose up -d                    # Start all services (app, mysql, redis)
docker-compose exec app bash            # Enter app container

# Access Points
# - Main app: http://localhost:4545
# - Admin panel: http://localhost:4545/admin (check env vars for credentials)
# - Health check: http://localhost:4545/health

# Database Management
python migrate.py status              # Check migration status
python migrate.py migrate            # Apply migrations
python migrate.py create "Description" # Create new migration

# Testing & Quality (Note: test files may not be present yet)
pytest                               # Run tests when available
pytest --cov=. --cov-report=html    # Coverage report (target: 80%+)

# Container Management
docker-compose logs -f app           # View logs
docker-compose down                  # Stop services
```

## Architecture Overview

### Core Flask Application (app/app.py)
- **Factory Pattern**: `create_app()` with config-based initialization
- **Extensions**: SQLAlchemy, Flask-Login, Flask-Migrate, Redis
- **CSRF**: Currently disabled for survey testing (`WTF_CSRF_ENABLED = False`)
- **Blueprints**: 8 modular route handlers registered automatically

### Model Architecture  
```python
# Core Models (models.py)
- User: Authentication with Flask-Login integration
- Survey: Unified table for 001/002 forms with JSON data storage  
- AuditLog: System activity tracking
- kst_now(): Consistent KST timezone function

# SafeWork Models (models_safework.py + models_safework_v2.py) 
- 13+ specialized tables for industrial safety management
- safework_workers, safework_health_checks, safework_medications, etc.

# Document Models (models_document.py)
- Document management with version control and access logging
```

### Database Design Patterns
**Survey System**: Single table with discriminator
```sql
surveys.form_type = '001' | '002'  # Form type identifier
surveys.data (JSON)               # Flexible form data storage
```

**Korean Localization**: 
- `kst_now()` function for consistent KST timezone
- Korean UI text and error messages
- Anonymous submissions use `user_id=1`

### Route Organization
```
app/routes/
├── main.py               # Homepage and general routes
├── auth.py              # Authentication (login/register/logout)
├── survey.py            # 001/002 form handling and submissions  
├── admin.py             # Admin dashboard + 13 SafeWork panels
├── document.py/document_admin.py  # Document management
├── api_safework_v2.py   # RESTful API endpoints
├── health.py            # System health monitoring
└── migration.py         # Database migration web interface
```

## Development Patterns

### SafeWork Development Flow
```python
# 1. Model Definition (models_safework.py)
class SafeworkWorker(db.Model):
    __tablename__ = "safework_workers"
    # Add fields, relationships

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

### Critical JavaScript Patterns
```javascript  
// ID matching is critical for conditional logic
// HTML: <div id="accident_parts_section">
// JS: document.getElementById('accident_parts_section')  // Must match exactly

// Survey data stored as JSON structures
// Example: { past_accident: true, past_accident_details: [{ part: "손/손가락/손목", status: "완치" }] }

// CSRF currently disabled for survey testing
// When re-enabled: xhr.setRequestHeader("X-CSRFToken", csrf_token);
```

## Deployment System

### Automated CI/CD Pipeline
Push to `master` branch triggers automated deployment:
1. Security scanning (Trivy, Bandit, Safety)
2. Code quality checks (Black, Flake8, Pylint) 
3. Test suite execution (pytest)
4. Docker image build and push to registry.jclee.me
5. Watchtower auto-deployment

### Infrastructure
- **Registry:** registry.jclee.me (credentials in GitHub secrets)
- **Production:** https://safework.jclee.me
- **Watchtower:** watchtower.jclee.me
- **Portainer:** portainer.jclee.me (webhook URL in deployment config)
- **Images:** safework/app:latest, safework/mysql:latest, safework/redis:latest

### Required GitHub Secrets
```bash
CLAUDE_CODE_OAUTH_TOKEN=<token>          # Claude Code automation
REGISTRY_PASSWORD=<registry_password>    # Docker registry auth
WATCHTOWER_HTTP_API_TOKEN=<token>        # Watchtower API
PORTAINER_WEBHOOK_URL=<webhook_url>      # Portainer deployment webhook
```

## Claude Code Automation

### Core Automation Features
- **Issue Processing**: Automatic analysis and resolution of GitHub issues
- **PR Reviews**: Automated code review and quality checks
- **Container Error Detection**: Real-time log analysis with automatic fixes
- **Korean Language Support**: Automatic Korean responses for Korean content
- **Domain Expertise**: SafeWork industrial safety system specialization

### Key Workflows (.github/workflows/)
```bash
# Primary automation
safework-claude-main.yml     # Main Claude AI processing
safework-claude-issues.yml   # Issue handling
safework-pr-review.yml       # Pull request reviews
deploy.yml                   # Automated deployment

# Supporting workflows
auto-issue-detection.yml     # Error-triggered issue creation
safework-ci-autofix.yml     # CI auto-fixes
notifications.yml           # Slack/Discord notifications
```

### Error Detection Patterns
Claude automatically detects and fixes:
- `gunicorn.errors.HaltServer` → Flask app import verification
- `Worker failed to boot` → Dependencies and environment validation
- `ImportError|ModuleNotFoundError` → requirements.txt audit
- `OperationalError` → MySQL connection verification

## Code Standards & Patterns

### Error Handling
```python
try:
    db.session.commit()
    flash('성공적으로 저장되었습니다.', 'success')
except Exception as e:
    db.session.rollback()
    flash(f'오류가 발생했습니다: {str(e)}', 'error')
    app.logger.error(f"Database error: {e}")
```

### Template Structure
```html
{% extends "admin/base_admin.html" %}
{% block content %}
<div class="container-fluid">
    {% include "admin/safework/_stats_cards.html" %}
    <!-- Panel content -->
</div>
{% endblock %}
```

## Testing & Configuration

### Test Setup
- **Location**: `app/tests/` (may need to be created)
- **Coverage**: Target 80%+  
- **Command**: `pytest --cov=. --cov-report=html`
- **Development**: Black, Flake8 for code quality (handled by CI/CD)

### Key Environment Variables
```bash
DATABASE_URL=mysql+pymysql://safework:safework2024@mysql:3306/safework_db
REDIS_HOST=safework-redis
SECRET_KEY=safework-production-secret-key-2024
FLASK_CONFIG=production
TZ=Asia/Seoul
ADMIN_USERNAME=admin
ADMIN_PASSWORD=safework2024
```

### Important API Endpoints  
```bash
# Admin access
/admin/dashboard                   # Main admin dashboard
/admin/safework                   # SafeWork management hub

# Survey forms  
/survey/001_musculoskeletal_symptom_survey   # Anonymous form
/survey/002_new_employee_health_checkup_form # Anonymous form

# API endpoints
/api/safework/v2/workers          # Worker CRUD
/api/safework/v2/health-checks    # Health records
/health                           # System health check
```

## Production Guidelines

### Database
- MySQL 8.0 with UTF8MB4 charset
- Use `kst_now()` for consistent KST timezone  
- Transaction-based operations with rollback
- Anonymous submissions use `user_id=1`

### Security
- `@login_required` for admin routes
- CSRF currently disabled for survey testing
- Audit logging for all operations
- Rate limiting on survey submissions

### Performance  
- Redis caching for frequently accessed data
- Database indexing on key lookups
- Pagination (20 items per page)
- Lazy loading for relationships

## Troubleshooting

### Common Issues
```bash
# Container reboot loops (registry auth issue)
# If services keep rebooting, check registry authentication:
curl -X POST https://portainer.jclee.me/api/webhooks/e44fb174-65cf-4567-a110-1913c77b725d
# Error "no basic auth credentials" means Portainer needs registry login

# Container issues
docker-compose ps                                    # Check container status
docker-compose logs -f app                          # View application logs
docker pull registry.jclee.me/safework/app:latest  # Update to latest image

# Database issues  
python migrate.py status                            # Check migration status
docker-compose exec app python migrate.py migrate  # Run migrations

# Survey form issues
# - Check HTML/JavaScript ID matching (critical for conditional logic)
# - Verify user_id=1 exists for anonymous submissions
# - Use kst_now() consistently for Korean timezone

# Authentication issues
# - Admin login: ${ADMIN_USERNAME}/${ADMIN_PASSWORD}
# - CSRF currently disabled for survey testing
# - Check GitHub secrets for Claude Code automation
```

### Claude Code Automation
```bash
# Missing token error
/install-github-app  # Run in Claude Code terminal to setup

# Correct workflow configuration  
track_progress: ${{ github.event_name != 'workflow_dispatch' }}
claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```