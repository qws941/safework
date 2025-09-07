# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is an industrial health and safety management system built with Flask 3.0+. It manages workplace health surveys, medical checkups, and comprehensive safety administration for construction and industrial environments.

**Core Features (v3.1.0):**
- 001 Musculoskeletal symptom surveys with conditional logic (16 body parts, pain scale rating)
- 002 New employee health checkup forms with medical history integration
- **13 specialized SafeWork admin panels:** Workers, Health Checks, Work History, Medications, Safety Equipment, Accident Records, Training Records, Chemical Management, Environmental Monitoring, Emergency Contacts, Insurance Claims, Compliance Reports, Safety Statistics
- Document management system with version control and access logging
- Anonymous survey submission support with rate limiting
- RESTful API (v2) for external integrations
- Real-time notifications and audit logging

**Tech Stack:** 
- Backend: Python Flask 3.0+, SQLAlchemy 2.0, Redis 5.0
- Database: MySQL 8.0 with UTF8MB4 charset
- Frontend: Bootstrap 4.6, jQuery, Font Awesome icons
- Infrastructure: Docker, GitHub Actions, Private Registry (registry.jclee.me)

## Development Commands

### Environment Setup
```bash
# Docker development environment (recommended)
docker-compose up -d                    # Start all services
docker-compose down                     # Stop all services
docker-compose logs -f app              # View app logs
docker-compose exec app bash            # Shell into app container

# Local development
cd app/
pip install -r requirements.txt        # Install dependencies
python app.py                          # Run development server (port 4545)
```

### Database Management
```bash
# Migration commands (inside app container or with proper DB config)
cd app/
python migrate.py status               # Check migration status
python migrate.py migrate              # Run pending migrations
python migrate.py rollback --version 003  # Rollback to specific version
python migrate.py create "Description" # Create new migration

# Web interface available at: /admin/migrations
```

### Testing
```bash
cd app/
pytest                                 # Run all tests (39/39 passing)
pytest -v                             # Verbose test output
pytest tests/test_models.py           # Run specific test file
pytest --cov=. --cov-report=html      # Generate coverage report (target: 80%+)

# Test categories
pytest tests/test_routes/             # Route testing
pytest tests/test_models.py          # Model unit tests
pytest tests/test_api.py              # API endpoint tests
```

### Code Quality
```bash
cd app/
black .                               # Format code
flake8 .                             # Lint code
python -m py_compile *.py            # Syntax check
```

### Quick Development Setup
```bash
# Complete setup for new developers
docker-compose up -d                  # Start all services
docker-compose exec app bash          # Enter container
cd app/
python migrate.py migrate             # Run migrations
python app.py                         # Start development server

# Access points:
# - Main app: http://localhost:4545
# - Admin panel: http://localhost:4545/admin
# - API docs: http://localhost:4545/api/docs
```

## Application Architecture

### Flask Application Factory Pattern
The app uses a factory pattern with modular blueprint registration:

```python
# app/app.py - Main application factory
def create_app(config_name=None):
    app = Flask(__name__)
    # Configuration, database, and extension initialization
    # Blueprint registration for modular routing
```

**Key Components:**
- `config.py`: Environment-specific configurations (development/staging/production)
- `models.py`: Core SQLAlchemy models (User, Survey, AuditLog)
- `models_safework.py`: SafeWork-specific models (Workers, HealthChecks, etc.)
- `models_document.py`: Document management models
- `migration_manager.py`: Custom migration system for MySQL compatibility

### Blueprint Structure
```
app/routes/
├── main.py              # Homepage and general routes
├── auth.py              # Authentication (login/register/logout)
├── survey.py            # Survey forms (001/002) and submissions
├── admin.py             # Main admin dashboard and SafeWork panels
├── document.py          # Public document access
├── document_admin.py    # Document management
├── health.py            # Health check endpoints
├── migration.py         # Migration web interface
├── api_safework_v2.py   # RESTful API for SafeWork data
└── notification_system.py  # Internal notifications
```

### Database Schema Patterns

**Survey System:** Single `surveys` table with `form_type` discriminator:
- `form_type = '001'`: Musculoskeletal symptom surveys
- `form_type = '002'`: New employee health checkups
- JSON fields for flexible form data storage

**SafeWork Models:** Dedicated tables for each safety domain:
- `safework_workers`: Employee master data
- `safework_health_checks`: Medical examination records
- `safework_medications`: Medicine inventory with expiry tracking
- Plus 10+ additional specialized tables

**Document Management:** Full version control and access logging:
- `documents`: Main document metadata
- `document_versions`: Version history
- `document_access_logs`: Access tracking for compliance

### Key Architectural Decisions

**MySQL 8.0 Compatibility:** Custom migration system handles MySQL-specific syntax:
- Uses `INFORMATION_SCHEMA` queries instead of `CREATE INDEX IF NOT EXISTS`
- Proper `AUTO_INCREMENT` and `INSERT IGNORE` syntax
- Transaction management with rollback support

**Korean Time Zone (KST):** Consistent timezone handling throughout:
```python
from models import kst_now
created_at = db.Column(db.DateTime, default=kst_now)
```

**Anonymous Survey Support:** Special user (ID=1) allows public survey submissions without authentication.

**Conditional Form Logic:** JavaScript-based conditional field display in survey forms, especially for medical history sections.

## Development Workflows

### SafeWork Admin Panel Development
When working on SafeWork admin panels (`/admin/safework/*`), follow these patterns:

1. **Model First:** Add/modify models in `models_safework.py`
2. **API Endpoints:** Create REST endpoints in `api_safework_v2.py` 
3. **Admin Routes:** Add admin views in `admin.py` following existing patterns
4. **Templates:** Use Bootstrap 4.6 components, follow naming convention `admin/safework/*.html`
5. **JavaScript:** jQuery-based AJAX for dynamic updates, include CSRF tokens

### Survey Form Modifications
Survey forms use conditional logic with JavaScript ID matching:
- HTML elements use consistent IDs (e.g., `accident_parts_section`)
- JavaScript references must match HTML IDs exactly
- Form validation in both frontend (jQuery) and backend (WTForms)

### Document Management Features
Follow the established document workflow:
- Categories for organization
- Version tracking for document changes
- Access logs for compliance
- Public/private/admin-only permissions

### Development with Claude Integration
When developing in this repository, leverage the Claude automation system:

**For Bug Fixes:**
1. Create issue with `[BUG]` prefix
2. Claude auto-analyzes and creates PR
3. Review PR and approve deployment

**For New Features:**
1. Create issue with detailed requirements
2. Add `@claude` mention for immediate processing
3. Claude follows SafeWork patterns automatically

**For Bulk Operations:**
1. Use "대량 이슈 자동 해결기" workflow
2. Filter by issue type (feature/bug/test)
3. Claude processes multiple issues sequentially

## GitOps Deployment System

**Automated Deployment:** Push to `master` branch triggers full CI/CD pipeline:

1. **Security Scanning:** Trivy, Bandit, Safety for vulnerability detection
2. **Code Quality:** Black, Flake8, Pylint automated checks
3. **Testing:** Full pytest suite with coverage reporting
4. **Docker Build:** Multi-platform images pushed to registry.jclee.me
5. **Deployment:** Automatic staging deployment, manual production approval

**Branch Strategy:**
- `master`: Production deployments (automatic after Claude workflow)
- `staging`: Automatic staging deployments
- `develop`: Development environment deployments

### Registry Information
- **Registry:** registry.jclee.me
- **Images:** 
  - `safework/app:latest` (Flask application)
  - `safework/mysql:latest` (MySQL with init scripts)
  - `safework/redis:latest` (Redis cache)

## Claude Code Integration & Automation

**Advanced Claude Automation System:** This repository features a sophisticated AI-powered development workflow using Claude Code integration.

### Claude Workflow Triggers
```bash
# Automatic triggers:
- New issue creation → Claude auto-assigns and analyzes
- @claude mentions in issue comments → Claude responds and acts
- Pull request events → Claude reviews and processes

# Manual triggers:
- GitHub Actions → "Claude Code" workflow → "Run workflow"
- Bulk issue processing via "대량 이슈 자동 해결기" workflow
```

### Real-time Progress Tracking
When Claude is triggered, users see real-time progress updates in the issue:

1. **🤖 Claude 작업 시작!** - Initial analysis begins
2. **✅ Claude 분석 완료!** - Code modifications completed
3. **🎉 Claude 작업 완료!** - PR created and merged
4. **🚀 배포 완료!** - Production deployment finished

### Claude Capabilities in This Repository
- **Issue Analysis:** Automatically understands Korean issue descriptions
- **Code Generation:** Follows SafeWork architecture patterns and Korean timezone handling
- **Database Operations:** Uses proper MySQL 8.0 syntax with transaction management
- **Testing Integration:** Runs pytest suite and maintains 80%+ coverage
- **Deployment Integration:** Triggers automatic Docker builds and deployment
- **Progress Reporting:** Updates issues with detailed status and links

### Claude Configuration
- **Max Turns:** 30 (configurable in `.github/workflows/claude.yml`)
- **Sticky Comments:** Progress updates in same comment thread
- **Progress Tracking:** Real-time status updates with timestamps
- **Auto-merge:** Automatic PR creation and merging after successful testing
- **Deployment Trigger:** Successful merges trigger production deployment

### Working with Claude
```bash
# Create issue with automatic Claude assignment:
title: "[BUG] 로그인 실패 문제 수정 필요"
body: "설명..." + 자동으로 Claude 할당됨

# Manual Claude trigger in existing issue:
댓글: "@claude 이 문제를 분석하고 수정해주세요"

# Bulk processing:
GitHub Actions → "대량 이슈 자동 해결기" → Run workflow
```

## Code Patterns and Standards

### Error Handling Pattern
```python
try:
    # Database operations
    db.session.commit()
    flash('성공적으로 저장되었습니다.', 'success')
except Exception as e:
    db.session.rollback()
    flash(f'오류가 발생했습니다: {str(e)}', 'error')
    app.logger.error(f"Database error: {e}")
```

### AJAX API Pattern (SafeWork panels)
```javascript
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", $('meta[name=csrf-token]').attr('content'));
        }
    }
});
```

### Template Inheritance Pattern
```html
{% extends "admin/base_admin.html" %}
{% block content %}
<div class="container-fluid">
    {% include "admin/safework/_stats_cards.html" %}
    <!-- Panel-specific content -->
</div>
{% endblock %}
```

## Testing Approach

**Pytest Configuration:** 
- Test files in `app/tests/`
- Fixtures in `conftest.py` for database setup
- Separate test classes for models, routes, and API endpoints
- Coverage target: 80%+ (currently 39/39 tests passing)

**Test Patterns:**
```python
def test_survey_submission(client, auth):
    auth.login()  # Use fixture for authentication
    response = client.post('/survey/001_submit', data=form_data)
    assert response.status_code == 302  # Redirect after success
    assert Survey.query.count() == 1
```

## Environment Variables

**Essential Configuration:**
```bash
# Database
DATABASE_URL=mysql+pymysql://safework:password@mysql:3306/safework
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=safework
MYSQL_USER=safework
MYSQL_PASSWORD=password

# Application
SECRET_KEY=your-secret-key-here
FLASK_ENV=development
TZ=Asia/Seoul

# Redis
REDIS_URL=redis://redis:6379/0

# Email (optional)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

## API Endpoints (v2)

**SafeWork REST API:**
```
GET    /api/v2/safework/workers           # List all workers
POST   /api/v2/safework/workers           # Create new worker
GET    /api/v2/safework/workers/{id}      # Get worker details
PUT    /api/v2/safework/workers/{id}      # Update worker
DELETE /api/v2/safework/workers/{id}      # Delete worker

GET    /api/v2/safework/health-checks     # List health checks
POST   /api/v2/safework/health-checks     # Create health check
GET    /api/v2/safework/medications       # List medications
GET    /api/v2/safework/statistics        # Safety statistics
```

**Survey API:**
```
POST   /survey/001_submit                 # Submit musculoskeletal survey
POST   /survey/002_submit                 # Submit health checkup form
GET    /survey/001                        # Get survey form (001)
GET    /survey/002                        # Get survey form (002)
```

## Important Implementation Notes

**Database Considerations:** 
- Always use transactions for multi-table operations
- Include proper error handling and rollback
- MySQL 8.0 specific syntax requirements
- Use `kst_now()` for consistent timezone handling
- UTF8MB4 charset for proper Korean text support

**Security Requirements:**
- CSRF protection enabled globally (`WTF_CSRF_ENABLED=True`)
- Login required decorators for admin functions
- Audit logging for sensitive operations (`AuditLog` model)
- File upload security (document management)
- Rate limiting on anonymous survey submissions

**Performance Patterns:**
- Redis caching for frequently accessed data
- Database indexing on foreign keys and search fields
- Lazy loading for relationship queries
- Pagination for large data sets in admin panels (default: 20 items/page)

## Troubleshooting

### Common Claude Workflow Issues

**"Bad credentials" Error:**
```bash
# Check if CLAUDE_CODE_OAUTH_TOKEN is properly set:
# GitHub → Settings → Secrets and variables → Actions
# Verify the token has proper permissions in Claude.ai
```

**Workflow Not Triggering:**
```bash
# Verify trigger conditions in .github/workflows/claude.yml:
- Issue must contain @claude mention
- New issues auto-trigger Claude
- Manual workflow dispatch available in GitHub Actions
```

**Deployment Pipeline Issues:**
```bash
# Check docker-compose status:
docker-compose ps

# Verify database connectivity:
docker-compose exec app python -c "from models import db; db.create_all()"

# Check Redis connection:
docker-compose exec app python -c "import redis; r=redis.from_url('redis://redis:6379/0'); print(r.ping())"
```

### MySQL 8.0 Specific Issues
- Use `mysql+pymysql://` connection string (not `mysql://`)
- Ensure UTF8MB4 charset for Korean text support
- Migration files must use proper MySQL 8.0 syntax (avoid PostgreSQL patterns)

### SafeWork Domain-Specific Notes
- All timestamps use Korean timezone (`kst_now()` function)
- Survey forms require JavaScript validation for conditional fields
- Admin panels expect specific permission levels (`@login_required` decorators)
- Anonymous survey submissions use special user account (ID=1)