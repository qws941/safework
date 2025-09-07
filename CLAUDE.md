# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is an industrial health and safety management system built with Flask 3.0+. It manages workplace health surveys, medical checkups, and comprehensive safety administration for construction and industrial environments.

**Core Features:**
- 001 Musculoskeletal symptom surveys with conditional logic
- 002 New employee health checkup forms  
- 13 specialized SafeWork admin panels for comprehensive safety management
- Document management system with version control
- Anonymous survey submission support

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
pytest                                 # Run all tests
pytest -v                             # Verbose test output
pytest tests/test_models.py           # Run specific test file
pytest --cov=. --cov-report=html      # Generate coverage report
```

### Code Quality
```bash
cd app/
black .                               # Format code
flake8 .                             # Lint code
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

## GitOps Deployment System

**Automated Deployment:** Push to `main` branch triggers full CI/CD pipeline:

1. **Security Scanning:** Trivy, Bandit, Safety for vulnerability detection
2. **Code Quality:** Black, Flake8, Pylint automated checks
3. **Testing:** Full pytest suite with coverage reporting
4. **Docker Build:** Multi-platform images pushed to registry.jclee.me
5. **Deployment:** Automatic staging deployment, manual production approval

**Branch Strategy:**
- `main`: Production deployments (manual approval required)
- `staging`: Automatic staging deployments
- `develop`: Development environment deployments

### Registry Information
- **Registry:** registry.jclee.me
- **Images:** 
  - `safework/app:latest` (Flask application)
  - `safework/mysql:latest` (MySQL with init scripts)
  - `safework/redis:latest` (Redis cache)

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

## Important Implementation Notes

**Database Considerations:** 
- Always use transactions for multi-table operations
- Include proper error handling and rollback
- MySQL 8.0 specific syntax requirements
- Use `kst_now()` for consistent timezone handling

**Security Requirements:**
- CSRF protection enabled globally
- Login required decorators for admin functions
- Audit logging for sensitive operations
- File upload security (document management)

**Performance Patterns:**
- Redis caching for frequently accessed data
- Database indexing on foreign keys and search fields
- Lazy loading for relationship queries
- Pagination for large data sets in admin panels