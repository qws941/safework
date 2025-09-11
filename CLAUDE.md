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
- Backend: Flask 3.0+, SQLAlchemy 2.0, MySQL 8.0, Redis 5.0
- Frontend: Bootstrap 4.6, jQuery, responsive design
- Infrastructure: Docker, Private Registry (registry.jclee.me), Watchtower auto-deployment
- Localization: KST timezone (`kst_now()` function), Korean UI/error messages

## Development Commands

### Independent Container Setup (No Docker Compose)
```bash
# Build all independent containers
docker build -t safework/app:latest ./app
docker build -t safework/mysql:latest ./mysql
docker build -t safework/redis:latest ./redis

# Start services independently with proper network
docker network create safework-net
docker run -d --name safework-mysql --network safework-net -p 4543:3306 safework/mysql:latest
docker run -d --name safework-redis --network safework-net -p 4544:6379 safework/redis:latest
docker run -d --name safework-app --network safework-net -p 4545:4545 safework/app:latest

# Container management
docker logs -f safework-app            # View application logs
docker ps                              # Check running containers
docker stop safework-app safework-mysql safework-redis  # Stop all services
```

### Testing Commands
```bash
# Run tests (inside app container or with proper environment)
cd app
python -m pytest                       # Run all tests
python -m pytest -v                    # Verbose output
python -m pytest --cov=. --cov-report=html  # Coverage report
python -m pytest tests/test_survey.py  # Specific test file
```

### Database Management
```bash
# Enter app container
docker exec -it safework-app bash

# Migration commands (inside container)
python migrate.py status               # Check migration status
python migrate.py migrate              # Apply migrations  
python migrate.py create "Description" # Create new migration

# Database inspection
docker exec -it safework-mysql mysql -u safework -psafework2024 safework_db -e "SHOW TABLES;"
docker exec -it safework-mysql mysql -u safework -psafework2024 safework_db -e "DESCRIBE surveys;"
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

# Verify database connectivity from container
docker exec -it safework-app python -c "
from models import Survey, db
print(f'Survey count: {Survey.query.count()}')
print('Database connection: OK')
"
```

### Access Points & Credentials
**Local Development:**
- **Main app**: http://localhost:4545
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

**Critical Survey Model Fields (for API endpoints):**
The Survey model uses these exact field names - **field mismatches cause 500 errors**:
```python
# Core identification fields
user_id, form_type, name, age, gender

# Employment fields  
years_of_service, employee_number, department, position, employee_id
work_years, work_months  # Legacy fields still in use

# Health fields
has_symptoms, status  # Boolean and varchar fields

# Additional fields in database schema
company_id, process_id, role_id, responses (JSON), symptoms_data (JSON)
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
- **Portainer**: portainer.jclee.me (Container management and log retrieval)
- **Images**: safework/app:latest, safework/mysql:latest, safework/redis:latest

### Independent Container Architecture
SafeWork uses **completely independent Docker containers** with no docker-compose dependency:
- Each service (app, mysql, redis) has its own Dockerfile and .dockerignore
- All containers include Watchtower labels for automatic updates
- Health checks implemented for all services
- Connection retry logic for independent startup
- Matrix build system in GitHub Actions for parallel deployment

### Required GitHub Secrets
```bash
CLAUDE_CODE_OAUTH_TOKEN=<token>          # Claude Code automation
REGISTRY_PASSWORD=<password>             # Docker registry auth (registry.jclee.me)
WATCHTOWER_HTTP_API_TOKEN=<token>        # Watchtower API deployment
PORTAINER_API_TOKEN=<token>              # Portainer API access (ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=)
SLACK_WEBHOOK_URL=<url>                  # Slack notifications
```

## Error Detection & Resolution

### Common Container Issues
Claude automatically detects and fixes:
- `gunicorn.errors.HaltServer` → Flask app import path verification
- `Worker failed to boot` → Dependencies and environment validation  
- `ImportError|ModuleNotFoundError` → requirements.txt audit
- `OperationalError` → MySQL connection settings verification
- `'field_name' is an invalid keyword argument for Survey` → Model field mapping errors
- MySQL connection timeout → Increase DB_CONNECTION_RETRIES (currently 60) and DB_CONNECTION_DELAY (3s)

### Troubleshooting Commands
```bash
# Container status
docker ps                                           # Check container status
docker logs -f safework-app                         # View application logs
docker pull registry.jclee.me/safework/app:latest  # Update to latest image

# Independent container restart
docker stop safework-app safework-mysql safework-redis
docker rm safework-app safework-mysql safework-redis
docker run -d --name safework-mysql --network safework-net safework/mysql:latest
docker run -d --name safework-redis --network safework-net safework/redis:latest
docker run -d --name safework-app --network safework-net safework/app:latest

# Database management
python migrate.py status                            # Check migration status
docker exec -it safework-app python migrate.py migrate  # Run migrations

# Portainer API debugging
curl -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
     "https://portainer.jclee.me/api/endpoints/1/docker/containers/json" # List containers

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

## Operational Log Monitoring

### Portainer API Integration
SafeWork includes automated operational log monitoring through Portainer API:

```bash
# Portainer API Configuration
PORTAINER_URL=https://portainer.jclee.me
PORTAINER_TOKEN=ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=

# Monitored Applications
SAFEWORK_PROD_URL=safework.jclee.me      # Production monitoring
SAFEWORK_DEV_URL=safework-dev.jclee.me   # Development monitoring
```

### Automated Log Analysis
- **Schedule**: Every 6 hours via GitHub Actions
- **Container Log Collection**: Real-time log retrieval from running containers
- **Claude Code Analysis**: AI-powered error pattern detection and performance analysis
- **Korean Language Reports**: Operational insights and recommendations in Korean
- **GitHub Issue Creation**: Automatic issue creation for critical problems

### Log Analysis Features
1. **Container Health Monitoring**: Flask app, MySQL, Redis container status
2. **Performance Metrics**: Response times, database query performance, cache hit rates
3. **Error Pattern Detection**: Application errors, database timeouts, security alerts
4. **Security Monitoring**: Authentication failures, suspicious access patterns
5. **Business Logic Health**: Survey form submissions, admin panel usage patterns

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
- `mysql/` - MySQL 8.0 with Dockerfile, .dockerignore, init.sql
- `redis/` - Redis 7 with Dockerfile, .dockerignore, redis.conf

### Quality Validation
Run structure validation: `python scripts/validate-structure.py`
- Current compliance: 92.3% (24/26 checks passed)
- All containers are Watchtower compatible
- Independent deployment ready