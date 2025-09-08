# CLAUDE.md

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
- **Advanced AI-powered automation** with Claude Code integration

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

# Stop services
docker-compose down

# Access container
docker-compose exec app bash
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

### Watchtower Deployment System
**Automated Deployment:** Push to `master` branch triggers full CI/CD pipeline:

1. **Security Scanning:** Trivy, Bandit, Safety for vulnerability detection
2. **Code Quality:** Black, Flake8, Pylint automated checks  
3. **Testing:** Full pytest suite with coverage reporting
4. **Docker Build:** Multi-platform images pushed to registry.jclee.me
5. **Deployment:** Watchtower automatically pulls and deploys new images
6. **API Trigger:** Immediate deployment via Watchtower HTTP API

**Branch Strategy:**
- `master`: Production deployments (automatic after Claude workflow)
- `staging`: Automatic staging deployments  
- `develop`: Development environment deployments

### Registry & Watchtower Information
- **Registry:** registry.jclee.me
- **Watchtower Host:** watchtower.jclee.me
- **Production Site:** https://safework.jclee.me
- **Images:** 
  - `safework/app:latest` (Flask application)
  - `safework/mysql:latest` (MySQL with init scripts)
  - `safework/redis:latest` (Redis cache)

### Required GitHub Secrets

**Critical for Claude Code Action v1:**
- `CLAUDE_CODE_OAUTH_TOKEN`: Claude Code OAuth token for AI automation
  - **Setup**: Run `/install-github-app` in Claude Code terminal
  - **Format**: `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}`
  - **Required for**: Issue processing, PR reviews, automated responses

**Deployment & Infrastructure:**
- `REGISTRY_PASSWORD`: Docker registry authentication (`bingogo1`) 
- `WATCHTOWER_HTTP_API_TOKEN`: Watchtower HTTP API token (`wt_k8Jm4nX9pL2vQ7rB5sT6yH3fG1dA0`)

## Claude Code Automation System

### Workflow Architecture (5 Specialized Pipelines)

**Core AI Engine:**
```yaml
# claude-code-action.yml - Claude Code Action v1
uses: anthropics/claude-code-action@v1
with:
  claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
  track_progress: ${{ github.event_name != 'workflow_dispatch' }}  # Conditional
  use_sticky_comment: true
  use_commit_signing: false
```

**Supporting Workflows:**
- `main_deploy.yml` - Production deployment + Watchtower API
- `security-monitoring.yml` → `Security Scan` - Security + PHI protection scans
- `performance-monitoring.yml` → `Performance Check` - MySQL/Redis performance testing
- `documentation-sync.yml` - API docs auto-generation  
- `issue-labeling-system.yml` - Automatic issue categorization

### Context-Aware Processing

**Smart Trigger Detection:**
```yaml
# Multi-event triggers with context analysis
on:
  issues: [opened, edited, reopened]
  issue_comment: [created]  # @claude mentions
  pull_request: [opened, edited, synchronize, reopened]
  workflow_dispatch:        # Manual execution
```

**Domain-Specific Context Analysis:**
- **Survey System**: Keywords → `설문`, `survey`, `001`, `002`
- **Admin System**: Keywords → `관리자`, `admin`, `safework`  
- **Medical System**: Keywords → `의료`, `health`, `검진`
- **API System**: Keywords → `api`, `연동`, `integration`
- **Korean Detection**: Auto-Korean responses for Korean content

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

## Configuration & Environment

### Environment Variables
```bash
# Core Services
DATABASE_URL=mysql+pymysql://safework:safework@mysql:3306/safework_db
REDIS_HOST=safework-redis
SECRET_KEY=safework-production-secret-key-2024
FLASK_CONFIG=production
TZ=Asia/Seoul

# Authentication  
ADMIN_USERNAME=admin
ADMIN_PASSWORD=safework2024
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

## Monitoring and Issue Tracking

### Automated Issue Tracking System
SafeWork includes a comprehensive monitoring system that automatically creates GitHub issues for system problems:

**Scripts Location**: `scripts/`
- `issue-tracker.sh` - Main monitoring script (runs every 5 minutes)
- `scheduler.sh` - Automated scheduling setup
- `daemon.sh` - SystemD service management
- `install.sh` - Initial installation script

**Monitoring Coverage** (8 areas):
1. **Docker containers** - Status, memory usage, failed containers
2. **CI/CD pipelines** - GitHub Actions workflow failures  
3. **Application logs** - Flask runtime errors and exceptions
4. **Database** - MySQL connection errors and performance issues
5. **Redis cache** - Connection failures and memory usage (500MB+ threshold)
6. **Security** - Suspicious HTTP access patterns (50+ 4xx/5xx errors)
7. **Docker images** - Size monitoring (2GB+ threshold), dangling images
8. **System resources** - CPU, memory, disk usage monitoring

**Issue Priority Classification**:
- **P0-CRITICAL**: Container network failures, critical system failures
- **P1-HIGH**: Memory/CPU/disk warnings, database errors, security alerts  
- **P2-MEDIUM**: Redis issues, application runtime errors
- **P3-LOW**: Maintenance tasks like image cleanup

All issues are tagged with `claude-ready` for automated Claude AI processing.

### Manual Monitoring Commands
```bash
# Run issue tracker manually
./scripts/issue-tracker.sh

# Setup automated scheduling  
./scripts/scheduler.sh

# Check monitoring logs
tail -f /var/log/safework-monitor.log
```

## Production Guidelines

### Core Requirements
**Database:** MySQL 8.0, UTF8MB4, transactions + rollback, `kst_now()` timezone  
**Security:** CSRF global, `@login_required`, audit logging, rate limiting  
**Performance:** Redis caching, DB indexing, lazy loading, pagination (20/page)

### Account Information
- **Admin Account**: admin / safework2024
- **Test Account**: test / test123
- **Registry**: registry.jclee.me (admin/bingogo1)