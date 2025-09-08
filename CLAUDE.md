# CLAUDE.md v1.5

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is an industrial health and safety management system built with Flask 3.0+. It manages workplace health surveys, medical checkups, and comprehensive safety administration for construction and industrial environments.

**Core Features:**
- 001 Musculoskeletal symptom surveys with conditional logic (16 body parts, pain scale rating)
- 002 New employee health checkup forms with medical history integration
- **13 specialized SafeWork admin panels:** Workers, Health Checks, Medical Visits, Medications, Consultations, Health Programs, Special Management, Environment Measurements, Risk Assessment, MSDS, Protective Equipment, Education, Certifications
- Document management system with version control and access logging
- Anonymous survey submission support with rate limiting
- RESTful API (v2) for external integrations

**Tech Stack:** 
- Backend: Python Flask 3.0+, SQLAlchemy 2.0, Redis 5.0
- Database: MySQL 8.0 with UTF8MB4 charset
- Frontend: Bootstrap 4.6, jQuery, Font Awesome icons
- Infrastructure: Docker, GitHub Actions, Private Registry (registry.jclee.me), Watchtower

## Development Commands

### Docker Environment (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs 
docker-compose logs -f app

# Access container
docker-compose exec app bash

# Stop services
docker-compose down
```

### Local Development
```bash
# Install dependencies
cd app/ && pip install -r requirements.txt

# Run development server
python app.py                          # Starts on port 4545

# Database operations
python migrate.py status              # Check migration status
python migrate.py migrate            # Run migrations
python migrate.py create "Description" # Create new migration
```

### Testing
```bash
# Run all tests
pytest                                # Target: 39/39 passing

# Run with coverage
pytest --cov=. --cov-report=html     # Target: 80%+
```

## Architecture Overview

### Flask Application Factory Pattern
The application uses a factory pattern in `app/app.py`:

```python
def create_app(config_name=None):
    app = Flask(__name__)
    # Auto-initialization: DB, Redis, Login, CSRF, Migrations
    # Blueprint registration: 8 modular route handlers
```

### Core Application Structure
- **Entry Point:** `app/app.py` - Application factory with health monitoring
- **Models:** 
  - `models.py` - Core models (User, Survey, AuditLog)
  - `models_safework.py` - 13 SafeWork domain models  
  - `models_document.py` - Document management system
- **Migration System:** `migration_manager.py` - Custom MySQL 8.0 migration system

### Route Organization (8 Blueprints)
```
app/routes/
├── main.py              # Homepage, general routes
├── auth.py              # Login/register/logout  
├── survey.py            # 001/002 forms, submissions
├── admin.py             # Admin dashboard, 13 SafeWork panels
├── document.py          # Public document access
├── document_admin.py    # Document management
├── health.py            # System health endpoints
├── migration.py         # Migration web interface
└── api_safework_v2.py   # RESTful API endpoints
```

### Database Design Patterns

**Unified Survey System:** Single table with discriminator
```sql
surveys.form_type = '001' | '002'  # Musculoskeletal vs New Employee
surveys.data (JSON)               # Flexible form field storage
```

**SafeWork Domain Models:** 13 specialized tables
```sql  
safework_workers           # Employee master data
safework_health_checks     # Medical examination records
safework_medications       # Medicine inventory with expiry tracking
# + 10 additional safety domain tables
```

**Document Management:** Version control + audit trail
```sql
documents + document_versions + document_access_logs
```

### Technical Decisions

**MySQL 8.0 Native:** Custom migration system
- INFORMATION_SCHEMA-based index management
- AUTO_INCREMENT, INSERT IGNORE syntax
- Transaction-based rollback support

**Korean Localization:** 
```python
from models import kst_now  # Consistent KST timezone
```

**Anonymous Access:** user_id=1 for public survey submissions

**Advanced Survey UI Patterns:**
- **Dynamic Selection Cards:** Disease and accident part selection with status tracking
- **Multi-part Selection:** Construction industry-specific options with custom input support  
- **Structured JSON Storage:** Complex form data stored as JSON with validation
- **Conditional Logic:** JavaScript ID-based form sections with real-time updates

## Development Workflows

### SafeWork Development Pattern
```python
# 1. Model-First Approach (models_safework.py)
class SafeworkWorker(db.Model):
    # Add new SafeWork domain model

# 2. API Integration (api_safework_v2.py) 
@api_safework_bp.route('/workers', methods=['GET', 'POST'])
def handle_workers():
    # RESTful endpoint

# 3. Admin Interface (admin.py + templates/admin/safework/)
@admin_bp.route('/safework/workers')
@login_required
def safework_workers():
    # Bootstrap 4.6 + jQuery AJAX + CSRF tokens
```

### Form System Patterns
```javascript
// Survey conditional logic - ID matching critical
// HTML: <div id="accident_parts_section">
// JS: document.getElementById('accident_parts_section')  // Must match exactly

// Advanced UI patterns for complex selections (diseases, accidents)
// - Dynamic card generation with status selection
// - Multi-selection with duplicate prevention
// - JSON data structures for backend storage
// Example: accidents_data = { past_accident: true, past_accident_details: [{ part: "손/손가락/손목", status: "완치" }] }

// CSRF protection required
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        xhr.setRequestHeader("X-CSRFToken", $('meta[name=csrf-token]').attr('content'));
    }
});
```

## CI/CD and Automation

### Current GitHub Workflows
The project uses a streamlined CI/CD pipeline with 4 optimized workflows:

1. **`claude-action.yml` → "Claude"**
   - Main Claude Code Action integration
   - Responds to issues, PRs, and @claude mentions
   - Uses `anthropics/claude-code-action@v1`

2. **`deploy.yml` → "Deploy"**
   - Production deployment pipeline
   - Triggers on successful Claude workflows or direct pushes
   - Docker build, registry push, Watchtower integration

3. **`claude-code-review.yml`**
   - Automated code review system
   - Claude-powered PR analysis

4. **`documentation-sync.yml`**
   - API documentation auto-generation
   - Keeps docs synchronized with code


### Claude Code Action Integration

**Core Configuration:**
```yaml
uses: anthropics/claude-code-action@v1
with:
  claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
  track_progress: ${{ github.event_name != 'workflow_dispatch' }}
  use_sticky_comment: true
  use_commit_signing: false
```

**Smart Trigger Detection:**
```yaml
on:
  issues: [opened, edited, reopened]
  issue_comment: [created]  # @claude mentions
  pull_request: [opened, edited, synchronize, reopened]
  workflow_dispatch:        # Manual execution
```

### Watchtower Deployment System

**Automated Deployment:** Push to `master` branch triggers:

1. **Docker Build:** Multi-platform images pushed to registry.jclee.me
2. **Watchtower Trigger:** Immediate deployment via HTTP API
3. **Health Verification:** Automatic service health checks

**Registry & Infrastructure:**
- **Registry:** registry.jclee.me
- **Watchtower Host:** watchtower.jclee.me
- **Production Site:** https://safework.jclee.me

### Required GitHub Secrets

**Critical for Claude Code Action:**
- `CLAUDE_CODE_OAUTH_TOKEN`: Claude Code OAuth token
  - **Setup**: Run `/install-github-app` in Claude Code terminal
  - **Required for**: Issue processing, PR reviews, automated responses

**Deployment & Infrastructure:**
- `REGISTRY_PASSWORD`: Docker registry authentication
- `WATCHTOWER_HTTP_API_TOKEN`: Watchtower HTTP API token

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

## Environment Configuration

### Docker Compose Environment Variables
SafeWork uses environment-variable based configuration:

```bash
# Database (MySQL 8.0)
MYSQL_ROOT_PASSWORD=SafeWork[random]Root@
MYSQL_PASSWORD=SafeWork[random]User@

# Cache (Redis)
REDIS_PASSWORD=SafeWork[random]Redis@

# Application Security
SECRET_KEY=SafeWork-Production-Secret-[random]-2024
ADMIN_PASSWORD=SafeWork[random]Admin@

# Infrastructure
REGISTRY_PASSWORD=SafeWork[random]Registry@
WATCHTOWER_HTTP_API_TOKEN=wt_[random32]
```

**Security Setup Script:**
```bash
# Automated security hardening
./scripts/security-setup.sh
```

### Key API Endpoints
```bash
# SafeWork REST API (v2)
/api/safework/v2/workers           # CRUD operations
/api/safework/v2/health-checks     # Medical records
/api/safework/v2/medications       # Medicine inventory
/api/safework/v2/statistics        # Safety metrics

# Survey Forms
/survey/001_submit                 # Musculoskeletal survey
/survey/002_submit                 # Health checkup form

# System Health
/health                            # Health check endpoint
```

## Testing and Quality

**Pytest Configuration:** 
- Test files in `app/tests/`
- Fixtures in `conftest.py` for database setup
- Coverage target: 80%+ (currently 39/39 tests passing)

**Test Patterns:**
```python
def test_survey_submission(client, auth):
    auth.login()  # Use fixture for authentication
    response = client.post('/survey/001_submit', data=form_data)
    assert response.status_code == 302  # Redirect after success
    assert Survey.query.count() == 1
```

## Database Migration System

**CLI Usage:**
```bash
# Check migration status
python app/migrate.py status

# Run migrations
python app/migrate.py migrate

# Create new migration
python app/migrate.py create "Add new feature"

# Rollback
python app/migrate.py rollback --version 002
```

**Web Interface:**
- URL: `http://localhost:4545/admin/migrations`
- Visual migration status and execution
- Real-time progress monitoring

## Monitoring and Scripts

**Scripts Location:** `scripts/`
- `issue-tracker.sh` - System monitoring (Docker, CI/CD, App, DB, Redis)
- `scheduler.sh` - Automated monitoring setup
- `security-setup.sh` - Security hardening automation
- `cicd-auto-fix.sh` - Automated CI/CD failure detection and correction

**Monitoring Coverage:**
- Docker containers and resource usage
- GitHub Actions workflow failures  
- Application logs and database performance
- Redis cache status and system resources

## Production Guidelines

### Core Requirements
**Database:** MySQL 8.0, UTF8MB4, transactions + rollback, `kst_now()` timezone  
**Security:** CSRF protection, `@login_required`, audit logging, rate limiting  
**Performance:** Redis caching, DB indexing, lazy loading, pagination (20/page)

### Account Information
- **Admin Account**: admin / safework2024
- **Test Account**: test / test123
- **Registry**: registry.jclee.me (admin/bingogo1)

### Essential Access Points
- **Main Application**: http://localhost:4545
- **Admin Panel**: http://localhost:4545/admin  
- **Health Check**: http://localhost:4545/health
- **Production Site**: https://safework.jclee.me