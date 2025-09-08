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

## Quick Start Commands

### Development Environment
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

### Common Development Tasks
```bash
# Testing
pytest                                 # Run all tests (target: 39/39 passing)
pytest --cov=. --cov-report=html      # Coverage report (target: 80%+)

# Code Quality (handled by CI/CD pipeline)
# Note: Formatting and linting automatically enforced on push

# Database
python migrate.py status              # Check migration status
python migrate.py create "Description" # Create new migration
# Web interface: /admin/migrations

# Containers
docker-compose logs -f app            # View logs
docker-compose down                   # Stop services
```

## Architecture Overview

### Core Application Structure
```python
# Flask Factory Pattern (app/app.py)
def create_app(config_name=None):
    app = Flask(__name__)
    # Auto-initialization: DB, Redis, Login, CSRF, Migrations
    # Blueprint registration: 8 modular route handlers
```

**Key Files:**
- `app.py`: Application factory with health monitoring
- `models.py`: Core models (User, Survey, AuditLog) 
- `models_safework.py`: 13 SafeWork domain models
- `models_document.py`: Document management system
- `migration_manager.py`: Custom MySQL 8.0 migration system

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

**Conditional UI:** JavaScript ID-based form logic for medical history sections

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

// CSRF protection required
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        xhr.setRequestHeader("X-CSRFToken", $('meta[name=csrf-token]').attr('content'));
    }
});
```

## Watchtower Deployment System

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

### Workflow Architecture (6 Specialized Pipelines)

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
- `security-monitoring.yml` - Security + PHI protection scans
- `performance-monitoring.yml` - MySQL/Redis performance testing
- `documentation-sync.yml` - API docs auto-generation  
- `issue-labeling.yml` - Automatic issue categorization

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

### Flexible Usage Patterns

**Scenario 1: Issue Auto-Processing**
```bash
# Keywords trigger automatic Claude processing
Title: "[BUG] 설문조사 001 오류 수정" → Auto-detects survey system
Body: "@claude 이 문제 분석해주세요" → Immediate processing
Result: Korean response + SafeWork domain expertise
```

**Scenario 2: PR Review Automation**  
```bash
# PR with SafeWork-related changes triggers domain-specific review
Files: app/routes/admin.py, templates/admin/safework/
Result: SafeWork admin panel expertise + deployment considerations
```

**Scenario 3: Manual Workflow Execution**
```bash
# GitHub Actions → "SafeWork Claude AI" → Run workflow
Input: issue_number=123 or pr_number=456
Result: Targeted processing with full context
```

**Scenario 4: Emergency Issue Handling**
```bash
# Parallel urgent-issue-handler for P0-CRITICAL issues
Keywords: '긴급', 'urgent', 'critical', '중단', '작동 안'
Result: Immediate P0 escalation + auto-labeling
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

## Configuration & API Reference

### Environment Variables
```bash
# Core Services
DATABASE_URL=mysql+pymysql://safework:safework2024@mysql:3306/safework_db
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

## Production Guidelines

### Core Requirements
**Database:** MySQL 8.0, UTF8MB4, transactions + rollback, `kst_now()` timezone  
**Security:** CSRF global, `@login_required`, audit logging, rate limiting  
**Performance:** Redis caching, DB indexing, lazy loading, pagination (20/page)

## Troubleshooting

### Claude Code Action Issues

**Common Errors & Solutions:**
```bash
# Error: 'max_turns' unexpected input
# Solution: Remove unsupported parameter (v1 doesn't support max_turns)
# Fixed in: claude-code-action.yml

# Error: track_progress only supported for pull_request and issue events
# Solution: Use conditional track_progress
track_progress: ${{ github.event_name != 'workflow_dispatch' }}

# Error: Missing CLAUDE_CODE_OAUTH_TOKEN
# Solution: Set up OAuth token via Claude Code terminal
/install-github-app  # Run this in Claude Code

# Error: Invalid token format
# Solution: Use correct parameter name
claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

**Authentication Issues:**
```bash
# Check Claude Code Action authentication
# 1. Verify secret exists in GitHub Settings → Secrets
# 2. Ensure correct parameter name (claude_code_oauth_token)
# 3. Run /install-github-app in Claude Code if token missing

# Test authentication in workflow
- name: Debug Claude Authentication
  run: |
    echo "Token present: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN != '' }}"
```

**Workflow Configuration:**
```yaml
# Correct Claude Code Action v1 configuration
- name: Claude Code Action
  uses: anthropics/claude-code-action@v1
  with:
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    track_progress: ${{ github.event_name != 'workflow_dispatch' }}
    use_sticky_comment: true
    use_commit_signing: false
    prompt: |
      You are Claude, specialized in SafeWork industrial safety system...
```

### Deployment Pipeline Issues

**Docker & Watchtower:**
```bash
# Check container status
docker-compose ps

# Verify Watchtower API
curl -H "Authorization: Bearer $WATCHTOWER_TOKEN" \
     -X POST https://watchtower.jclee.me/v1/update

# Test registry connectivity  
docker pull registry.jclee.me/safework/app:latest

# Database connection test
docker-compose exec app python -c "from models import db; print(db.engine.execute('SELECT 1'))"
```

**Common Deployment Failures:**
```bash
# Registry authentication failed
# Solution: Verify REGISTRY_PASSWORD secret

# Watchtower update failed  
# Solution: Check WATCHTOWER_HTTP_API_TOKEN format

# Health check timeout
# Solution: Increase timeout in main_deploy.yml
HEALTH_CHECK_TIMEOUT: 30
```

### Quick Fixes

**Application Issues:**
```bash
# Survey form JS errors → Check HTML ID matching
# Korean timezone → Use kst_now() consistently  
# Anonymous surveys → Verify user_id=1 exists
# Redis connection → docker-compose exec redis redis-cli ping
# MySQL slow queries → Enable slow_query_log
```