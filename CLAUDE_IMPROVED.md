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
- **Automation**: 6 specialized GitHub Actions workflows with Claude AI integration

## Essential Development Commands

### Environment Setup
```bash
# Docker (Recommended)
docker-compose up -d                    # Start all services
docker-compose exec app bash            # Enter container
python migrate.py migrate              # Run migrations
python app.py                          # Start development server (port 4545)

# Local Development
cd app/ && pip install -r requirements.txt && python app.py

# Access Points
# - Main app: http://localhost:4545
# - Admin panel: http://localhost:4545/admin  
# - Health check: http://localhost:4545/health
```

### Testing & Code Quality
```bash
# Run all tests
cd app/ && pytest

# Run single test file
pytest tests/test_specific.py

# Run tests with coverage
pytest --cov=. --cov-report=html --cov-report=term

# Code quality (run in sequence)
black . && flake8 . && pytest
```

### Database Operations
```bash
# Migration management
python migrate.py status              # Check migration status
python migrate.py create "Description" # Create new migration
python migrate.py rollback --version 003  # Rollback to version

# Web interface: http://localhost:4545/admin/migrations
```

### Docker Operations
```bash
# Build and deploy (production)
./build.sh                           # Build all images
./docker-run.sh                      # Run with auto-updates

# Registry operations  
docker login registry.jclee.me -u admin -p bingogo1
docker push registry.jclee.me/safework/app:latest

# Container management
docker-compose ps                     # Check status
docker-compose logs -f app            # View logs
docker-compose down                   # Stop services
```

## Architecture Overview

### Flask Application Factory
```python
# app/app.py - Core factory pattern
def create_app(config_name=None):
    app = Flask(__name__)
    # Auto-initialization: DB, Redis, Login, CSRF, Migrations
    # Blueprint registration: 8 modular route handlers
```

**Key Files:**
- `app.py`: Application factory with health monitoring and version detection
- `models.py`: Core models (User, Survey, AuditLog) 
- `models_safework.py`: 13 SafeWork domain models for safety management
- `models_document.py`: Document management with version control
- `migration_manager.py`: Custom MySQL 8.0 compatible migration system

### Blueprint Architecture (8 Modular Routes)
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

### Database Design Philosophy

**Unified Survey System:** Single table with form_type discriminator
```sql
-- Flexible form storage
surveys.form_type = '001' | '002'  # Musculoskeletal vs New Employee
surveys.data (JSON)               # Form field storage with validation
```

**SafeWork Domain Models:** 13 specialized safety management tables
```sql  
safework_workers           # Employee master data with health tracking
safework_health_checks     # Medical examination records and scheduling
safework_medications       # Medicine inventory with expiry monitoring
# + 10 additional specialized safety domain tables
```

**Document Management:** Full lifecycle management
```sql
documents + document_versions + document_access_logs  # Version control + audit
```

### Critical Technical Decisions

**MySQL 8.0 Native Compatibility:**
- Custom migration system using INFORMATION_SCHEMA queries
- MySQL-specific syntax (AUTO_INCREMENT, INSERT IGNORE)
- Transaction-based operations with rollback support

**Korean Industrial Standards:**
```python
from models import kst_now  # Consistent KST timezone handling
# UTF8MB4 charset for proper Korean text support
```

**Anonymous Survey Support:** Special user (user_id=1) enables public submissions

**Conditional Form Logic:** JavaScript ID-based conditional field display for medical sections

## Development Workflows

### SafeWork Development Pattern (Model-First Approach)
```python
# 1. Domain Model (models_safework.py)
class SafeworkWorker(db.Model):
    __tablename__ = 'safework_workers'
    # SafeWork-specific health and safety fields

# 2. RESTful API (api_safework_v2.py) 
@api_safework_bp.route('/workers', methods=['GET', 'POST'])
def handle_workers():
    # CRUD operations with proper error handling

# 3. Admin Interface (admin.py + templates/admin/safework/)
@admin_bp.route('/safework/workers')
@login_required
def safework_workers():
    # Bootstrap 4.6 + jQuery AJAX + CSRF protection
```

### Form System Requirements
```javascript
// Critical: HTML ID and JavaScript selector matching
// HTML: <div id="accident_parts_section">
// JS: document.getElementById('accident_parts_section')  // Must match exactly

// Required CSRF protection pattern
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        xhr.setRequestHeader("X-CSRFToken", $('meta[name=csrf-token]').attr('content'));
    }
});
```

## Claude Code Automation System

### Workflow Architecture (6 Specialized Pipelines)

**Core AI Engine Configuration:**
```yaml
# claude-code-action.yml - Claude Code Action v1
uses: anthropics/claude-code-action@v1
with:
  claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
  track_progress: ${{ github.event_name != 'workflow_dispatch' }}  # Event-conditional
  use_sticky_comment: true
  use_commit_signing: false
```

**Supporting Workflows:**
- `main_deploy.yml` - Production deployment with Watchtower API integration
- `security-monitoring.yml` - PHI protection and vulnerability scans
- `performance-monitoring.yml` - MySQL/Redis performance testing
- `documentation-sync.yml` - Automatic API documentation generation  
- `issue-labeling.yml` - Intelligent issue categorization

### Context-Aware Processing Patterns

**Domain-Specific Trigger Analysis:**
```yaml
# Smart context detection based on content keywords
Survey System: ['설문', 'survey', '001', '002', 'musculoskeletal']
Admin System: ['관리자', 'admin', 'safework', 'dashboard']  
Medical System: ['의료', 'health', '검진', 'medical', 'medication']
API System: ['api', '연동', 'integration', 'endpoint']
Korean Content: Auto-Korean responses for Korean language detection
```

### Automated Usage Scenarios

**Issue Auto-Processing:**
```bash
# Trigger: Title contains "[BUG] 설문조사 001 오류"
# Action: Auto-detects survey system + Korean language
# Result: Korean response with SafeWork domain expertise + immediate processing
```

**PR Review Automation:**  
```bash
# Trigger: Files modified in app/routes/admin.py, templates/admin/safework/
# Action: SafeWork admin panel expertise analysis
# Result: Domain-specific review + deployment considerations
```

**Emergency Issue Handling:**
```bash
# Trigger: Keywords ['긴급', 'urgent', 'critical', '중단', '작동 안']
# Action: Parallel urgent-issue-handler job execution
# Result: P0-CRITICAL escalation + auto-labeling + immediate processing
```

## Watchtower Deployment Pipeline

**Automated CI/CD Flow:**
1. **Security Scanning** - Trivy, Bandit, Safety vulnerability detection
2. **Code Quality** - Black, Flake8, Pylint automated checks
3. **Testing Suite** - Full pytest execution with coverage reporting
4. **Docker Build** - Multi-platform images for registry.jclee.me
5. **Watchtower Deployment** - Automatic container updates via HTTP API
6. **Health Monitoring** - Post-deployment verification and rollback capability

**Branch Strategy:**
- `master`: Production deployments (automatic after Claude Code workflow approval)
- `staging`: Automatic staging deployments for testing
- `develop`: Development environment deployments

**Infrastructure Endpoints:**
- Registry: `registry.jclee.me` (admin/bingogo1)
- Watchtower: `watchtower.jclee.me` 
- Production: `https://safework.jclee.me`

### Required GitHub Secrets
```bash
# Critical for Claude Code Action v1
CLAUDE_CODE_OAUTH_TOKEN  # Run `/install-github-app` in Claude Code terminal

# Deployment Infrastructure
REGISTRY_PASSWORD=bingogo1
WATCHTOWER_HTTP_API_TOKEN=wt_k8Jm4nX9pL2vQ7rB5sT6yH3fG1dA0
```

## Code Standards and Patterns

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

### AJAX Pattern for SafeWork Admin Panels
```javascript
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", $('meta[name=csrf-token]').attr('content'));
        }
    }
});
```

### Template Inheritance Structure
```html
{% extends "admin/base_admin.html" %}
{% block content %}
<div class="container-fluid">
    {% include "admin/safework/_stats_cards.html" %}
    <!-- Panel-specific content with consistent styling -->
</div>
{% endblock %}
```

## Testing Strategy

**Pytest Configuration:** 
- Test files: `app/tests/` with fixtures in `conftest.py`
- Database setup: Automated test database creation and teardown
- Test categories: Models, routes, API endpoints with 39/39 tests passing
- Coverage target: 80%+ (currently achieved)

**Test Execution Patterns:**
```python
def test_survey_submission(client, auth):
    auth.login()  # Authentication fixture
    response = client.post('/survey/001_submit', data=form_data)
    assert response.status_code == 302  # Redirect confirms success
    assert Survey.query.count() == 1
```

## Configuration Reference

### Essential Environment Variables
```bash
# Core Services Configuration
DATABASE_URL=mysql+pymysql://safework:safework2024@mysql:3306/safework_db
REDIS_HOST=safework-redis
SECRET_KEY=safework-production-secret-key-2024
FLASK_CONFIG=production
TZ=Asia/Seoul

# Administrative Access
ADMIN_USERNAME=admin
ADMIN_PASSWORD=safework2024
```

### Key API Endpoints
```bash
# SafeWork REST API (v2) - Full CRUD operations
/api/safework/v2/workers           # Employee management
/api/safework/v2/health-checks     # Medical record management
/api/safework/v2/medications       # Medicine inventory
/api/safework/v2/statistics        # Safety metrics and analytics

# Survey Forms - Anonymous submission supported
/survey/001_submit                 # Musculoskeletal symptom survey
/survey/002_submit                 # New employee health checkup
```

## Production Requirements

**Database:** MySQL 8.0, UTF8MB4 charset, transactional operations with rollback, `kst_now()` timezone consistency

**Security:** Global CSRF protection, `@login_required` decorators, comprehensive audit logging, anonymous submission rate limiting

**Performance:** Redis caching for frequent queries, database indexing on foreign keys, lazy loading for relationships, pagination (20 items/page)

## Troubleshooting

### Claude Code Action Issues

**Parameter Compatibility (v1):**
```bash
# ❌ Error: 'max_turns' unexpected input
# ✅ Solution: Remove unsupported v1 parameters

# ❌ Error: track_progress only for pull_request/issue events  
# ✅ Solution: Conditional track_progress
track_progress: ${{ github.event_name != 'workflow_dispatch' }}

# ❌ Error: Missing CLAUDE_CODE_OAUTH_TOKEN
# ✅ Solution: Run `/install-github-app` in Claude Code terminal
```

**Authentication Debugging:**
```yaml
# Verify token presence in workflow
- name: Debug Claude Authentication
  run: |
    echo "Token present: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN != '' }}"
```

### Deployment Pipeline Issues

**Container Management:**
```bash
# System diagnostics
docker-compose ps                    # Container status
docker-compose logs -f app           # Application logs
docker pull registry.jclee.me/safework/app:latest  # Latest image

# Database connectivity test
docker-compose exec app python -c "from models import db; print('DB connected')"

# Watchtower API test
curl -H "Authorization: Bearer $WATCHTOWER_TOKEN" \
     -X POST https://watchtower.jclee.me/v1/update
```

### Application-Specific Quick Fixes

**Common Issues:**
```bash
# Survey form JavaScript errors → Verify HTML ID matching
# Korean timezone inconsistencies → Use kst_now() function consistently  
# Anonymous survey failures → Confirm user_id=1 exists in database
# Redis connection failures → docker-compose exec redis redis-cli ping
# MySQL performance issues → Enable slow_query_log in configuration
```