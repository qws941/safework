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
- **Automation**: 5 specialized GitHub Actions workflows with Claude AI integration

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

**Advanced Survey UI Patterns:**
- **Dynamic Selection Cards:** Disease and accident part selection with status tracking
- **Multi-part Selection:** Construction industry-specific options with custom input support
- **Structured JSON Storage:** Complex form data stored as JSON with validation
- **Conditional Logic:** JavaScript ID-based form sections with real-time updates

**Form Enhancement Features:**
```javascript
// Recent improvements (2024):
// - Advanced body part selection UI with status (완치/치료·관찰 중)
// - Construction industry customization (company/process/role dropdowns + custom input)
// - Disease selection with guided examples and status tracking
// - Multi-selection prevention and dynamic card management
```

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

### Workflow Architecture (12+ Specialized Pipelines)

**Core AI Engine with Container Log Analysis:**
```yaml
# safework-claude-main.yml - Enhanced Claude Code Action v1 with Real-time Container Analysis
uses: anthropics/claude-code-action@v1
with:
  claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
  track_progress: ${{ github.event_name != 'workflow_dispatch' }}  # Conditional
  use_sticky_comment: true
  use_commit_signing: false
```

**Advanced Error Detection Pipeline:**
- **Container Log Analysis**: Real-time Docker container log collection and error pattern detection
- **Automated Error Resolution**: Claude automatically fixes detected issues and commits solutions
- **Gunicorn Error Detection**: Specific patterns for `gunicorn.errors.HaltServer`, `Worker failed to boot`
- **Import Error Detection**: Python module import failures and dependency issues
- **Database Connection Monitoring**: MySQL connection and initialization problems

**Supporting Workflows:**
- `deploy.yml` - Production deployment with container log analysis
- `safework-claude-main.yml` - AI automation with real-time error detection  
- `safework-claude-issues.yml` - GitHub issues processing
- `safework-pr-review.yml` - Pull request automated reviews
- `safework-issue-triage.yml` - Issue classification and prioritization
- `safework-ci-autofix.yml` - Continuous integration auto-fixes
- `claude-code-review.yml` - Code quality reviews
- `issue-labeling.yml` - Automatic issue categorization
- `auto-issue-detection.yml` - Automated issue creation from errors
- `slack-notifications.yml` - Real-time Slack notifications
- `notifications.yml` - Multi-channel notification system
- `documentation-sync.yml` - API docs auto-generation

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

### Container Error Detection & Auto-Resolution System

**Real-time Error Detection Pipeline:**
The system automatically analyzes container logs during deployment and in response to issues/comments, detecting critical patterns and triggering immediate automated fixes.

**Detected Error Patterns:**
```bash
# Gunicorn Worker Failures
Pattern: "gunicorn.errors.HaltServer"
Action: → Flask app import path verification and correction

# Worker Boot Failures  
Pattern: "Worker failed to boot"
Action: → Dependencies and environment variable validation

# Python Import Errors
Pattern: "ImportError|ModuleNotFoundError" 
Action: → requirements.txt audit and missing package installation

# Database Connection Issues
Pattern: "OperationalError|Connection refused"
Action: → MySQL connection settings and initialization verification
```

**Automated Resolution Workflow:**
```mermaid
graph TD
    A[Container Error Detected] --> B[Log Pattern Analysis]
    B --> C{Error Type Classification}
    C -->|Gunicorn| D[Flask App Import Fix]
    C -->|Dependencies| E[Requirements.txt Update]
    C -->|Database| F[MySQL Config Fix]
    C -->|Environment| G[ENV Variables Fix]
    D --> H[Auto-commit & Deploy]
    E --> H
    F --> H 
    G --> H
    H --> I[Verification & Monitoring]
```

**Container Log Collection:**
- **Real-time Collection**: `docker logs --tail=50` during CI/CD
- **Error Pattern Matching**: Automated detection of known failure signatures
- **Artifact Storage**: Container logs saved as GitHub Actions artifacts (7-day retention)
- **Context Injection**: Error details automatically passed to Claude for resolution

**Pre-start Validation System (app/start.sh):**
```bash
# Enhanced startup validation
🔍 Pre-start validation...
📋 Environment check: FLASK_CONFIG, APP_PORT, MYSQL_HOST, REDIS_HOST
🐍 Python import test: Flask app creation verification
🗄️ Database connection test: MySQL connectivity and table validation
✅ All systems validated → Gunicorn startup
❌ Validation failed → Detailed error reporting & exit
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

## Enhanced Automation & Self-Healing System

### Automated Error Detection & Resolution
SafeWork now includes an advanced self-healing system that automatically detects and resolves common deployment and runtime issues without human intervention.

**Key Features:**
- **Real-time Container Log Analysis**: Monitors Docker containers for error patterns during deployment
- **Automated Code Fixes**: Claude automatically identifies root causes and commits fixes
- **Pre-start Validation**: Comprehensive system checks before application startup
- **Progressive Health Checks**: Multi-retry health verification with intelligent wait times
- **Container Log Artifacts**: Automatic preservation of error logs for analysis

**Self-Healing Capabilities:**
```bash
# Automatic detection and resolution of:
✅ Gunicorn worker boot failures
✅ Python import and dependency errors  
✅ MySQL connection and initialization issues
✅ Environment variable misconfigurations
✅ Flask application factory problems
```

**Claude Code Action Integration:**
- **Context-Aware Processing**: Automatically analyzes container errors and provides targeted solutions
- **Domain Expertise**: Specialized knowledge of SafeWork industrial safety system
- **Korean Language Support**: Automatic Korean responses for Korean content
- **Emergency Prioritization**: P0-critical issues get immediate attention

## Production Guidelines

### Core Requirements
**Database:** MySQL 8.0, UTF8MB4, transactions + rollback, `kst_now()` timezone  
**Security:** CSRF global, `@login_required`, audit logging, rate limiting  
**Performance:** Redis caching, DB indexing, lazy loading, pagination (20/page)

### Automation Requirements
**Container Monitoring:** Real-time log analysis enabled, error pattern detection active
**Claude Integration:** OAuth token configured, automated issue processing enabled
**Self-Healing:** Pre-start validation active, progressive health checks configured
**Error Recovery:** Automated rollback capability, container restart policies optimized

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

**Automated Error Detection & Resolution:**
The system now automatically detects and resolves most common deployment issues. Manual intervention is typically only needed for complex or unknown errors.

**Container Log Analysis (Automated):**
```bash
# Real-time error detection during deployment
🔍 SafeWork 컨테이너 로그 분석 시작...
📦 실행 중인 SafeWork 컨테이너 발견
📋 최근 컨테이너 로그 수집 중...

# Automatic error pattern detection
⚠️ 발견된 오류들:
❌ gunicorn.errors.HaltServer 감지
❌ Worker failed to boot 감지
→ Claude가 자동으로 근본 원인 분석 및 수정
```

**Manual Diagnostics (When Needed):**
```bash
# Check container status
docker-compose ps

# Check recent container logs (automated in CI/CD)
docker logs --tail=50 safework-app

# Test registry connectivity  
docker pull registry.jclee.me/safework/app:latest

# Database connection test (automated in start.sh)
docker-compose exec app python -c "
from app import create_app
app = create_app()
with app.app_context():
    from models import db
    result = db.engine.execute(db.text('SELECT 1'))
    print('Database connection: OK')
"
```

**Common Issues & Automated Solutions:**
```bash
# Gunicorn Worker Failures → Automatically Fixed
# Issue: gunicorn.errors.HaltServer: Worker failed to boot
# Auto-fix: Flask app import path verification, dependencies check, environment validation

# Registry authentication failed
# Solution: Verify REGISTRY_PASSWORD secret

# Health check timeout → Automated Retry
# Auto-behavior: 5 retries with progressive wait times (10s → 30s)

# Container restart loops → Pre-start Validation
# Auto-prevention: Enhanced start.sh validation catches errors before Gunicorn starts
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