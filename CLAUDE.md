# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is a Korean workplace health and safety management system built with Flask 3.0+, providing musculoskeletal symptom surveys (001) and new employee health checkups (002) along with comprehensive administrative dashboards and RESTful APIs.

### Key Features
- **Survey System**: 001 (musculoskeletal symptoms) and 002 (new employee health checkup) forms
- **Comprehensive SafeWork Dashboard**: Complete workplace health management system with 13 specialized admin panels
- **RESTful API**: JWT-authenticated API endpoints for programmatic access
- **Anonymous Submissions**: Public survey access without login (user_id=1)
- **Document Management**: Safety document upload/versioning system
- **Advanced Health Management**: Worker records, health checkups, medical visits, medication tracking
- **Safety Compliance**: Risk assessments, MSDS management, protective equipment tracking
- **Education & Certification**: Training completion tracking and professional certification management

### Multi-Service Architecture
SafeWork includes multiple independent subsystems:
- **Core Survey System**: Original 001/002 forms with unified Survey model
- **SafeWork v2 System**: Comprehensive workplace health management (`models_safework_v2.py`)
- **Document Management**: File upload/versioning system (`models_document.py`)
- **SafeWork API**: Advanced API endpoints (`api_safework.py`, `api_safework_v2.py`)
- **Notification System**: Real-time notifications (`notification_system.py`)
- **Reports System**: Advanced reporting capabilities (`safework_reports.py`)

## Development Commands

### Essential Commands
```bash
# Local Development (Docker Compose based)
docker-compose up -d        # Start all containers (MySQL, Redis, App)
docker-compose down         # Stop all containers
docker-compose ps           # Check service health
docker-compose logs -f app  # View application logs

# Direct container access for debugging
docker exec -it safework-app bash        # Shell access to app container
docker exec -it safework-mysql mysql -u safework -psafework2024 safework_db  # Database access
docker exec -it safework-redis redis-cli # Redis CLI access

# Testing (multiple approaches)
docker exec safework-app python3 -m pytest tests/ -v  # Run all tests in Docker (recommended)
docker exec safework-app python3 -m pytest tests/test_survey.py -v  # Run specific test file
docker exec safework-app python3 -m pytest tests/ -k "test_submit" -v  # Run tests matching pattern
cd app && python3 -m pytest tests/ -v --tb=short      # Run tests locally (SQLite)
cd app && python3 -m pytest tests/ -v --cov=. --cov-report=term-missing  # With coverage

# Code Quality
python3 -m black --line-length 100 app/  # Format code
python3 -m flake8 --max-line-length=100 --ignore=E501,W503 app/  # Lint code

# Database Migrations
docker exec safework-app python migrate.py status     # Check migration status
docker exec safework-app python migrate.py upgrade    # Apply pending migrations
docker exec safework-app python migrate.py rollback   # Rollback last migration
# Web interface available at: http://localhost:4545/admin/migrations

# Development server (local Python)
cd app && python app.py    # Run Flask development server directly

# Deployment
./deploy.sh                # Production deployment script (if exists)
git push origin main      # Production deployment (GitHub Actions)
```

## Project Structure

```
safework2/
├── app/                    # Flask application
│   ├── routes/            # Blueprint route handlers
│   │   ├── admin.py       # Admin dashboard routes
│   │   ├── api_safework.py # SafeWork API v1
│   │   ├── api_safework_v2.py # SafeWork API v2
│   │   ├── auth.py        # Authentication routes
│   │   ├── document.py    # Public document routes
│   │   ├── document_admin.py # Document admin routes
│   │   ├── health.py      # Health check routes
│   │   ├── main.py        # Main application routes
│   │   ├── migration.py   # Migration management routes
│   │   ├── notification_system.py # Notification routes
│   │   ├── safework_reports.py # Reporting routes
│   │   └── survey.py      # Survey form routes
│   ├── templates/         # Jinja2 templates
│   ├── migrations/        # Database migrations
│   ├── tests/            # Test suite
│   ├── uploads/          # File upload directory
│   ├── app.py            # Application factory
│   ├── config.py         # Configuration management
│   ├── models*.py        # SQLAlchemy models (multiple files)
│   ├── forms*.py         # WTForms definitions
│   ├── migrate.py        # Migration CLI tool
│   ├── migration_manager.py # Migration orchestration
│   └── requirements.txt  # Python dependencies
├── mysql/                 # MySQL configuration and init scripts
├── redis/                # Redis configuration
├── .github/workflows/    # CI/CD pipelines
│   ├── main-deploy.yml   # Main deployment workflow
│   ├── claude-*.yml      # Claude Code automation workflows
│   └── parallel-issue-processor.yml # Issue processing
└── docker-compose.yml    # Container orchestration
```

## High-Level Architecture

### Three-Tier Container Architecture
- **safework-app**: Flask application (port 4545) with auto-restart and health checks
- **safework-mysql**: MySQL 8.0 (port 3307) with custom schema initialization
- **safework-redis**: Redis 7.0 (port 6380) for session caching and real-time features

### Application Factory Pattern
The app uses Flask's application factory pattern in `app.py:create_app()` which:
1. Loads configuration based on `FLASK_CONFIG` environment variable
2. Initializes database connection with 30-second retry logic and connection pooling
3. Registers core and optional blueprints with conditional loading
4. Creates system users (anonymous user id=1, admin user) if they don't exist
5. Initializes migration manager for schema version tracking
6. Sets up error handlers and logging

### Blueprint-Based Routing Structure
```python
# Core blueprints registered in app.py:create_app()
main_bp → routes/main.py       # Landing pages and public content
auth_bp → routes/auth.py       # User authentication and registration
survey_bp → routes/survey.py   # 001/002 survey forms
admin_bp → routes/admin.py     # SafeWork admin dashboards
health_bp → routes/health.py   # System health checks (/health)
migration_bp → routes/migration.py  # Database migration web UI

# Document management subsystem
document_bp → routes/document.py        # Public document access
document_admin_bp → routes/document_admin.py  # Admin document management

# SafeWork API subsystems (conditionally loaded)
api_safework_bp → routes/api_safework.py      # SafeWork API v1
api_safework_v2_bp → routes/api_safework_v2.py # SafeWork API v2 (JWT auth)

# Advanced features (conditionally loaded)
notification_bp → routes/notification_system.py # Real-time notifications
reports_bp → routes/safework_reports.py        # Advanced reporting
```

### Database Models Architecture

**Multiple model files handle different subsystems:**

```python
# Core models in models.py - Original survey system
User         # Authentication with is_admin flag
Survey       # Unified table for 001/002 forms (form_type discriminator)  
SurveyStatistics  # Aggregated survey stats
AuditLog     # System activity tracking

# SafeWork v1 models in models_safework.py - Basic workplace health
SafeworkWorker      # Basic employee data
SafeworkHealthCheck # Basic health examinations

# SafeWork v2 models in models_safework_v2.py - Advanced workplace health management
SafeworkWorker      # Extended employee master data
SafeworkHealthCheck # Comprehensive health examinations  
SafeworkMedicalVisit # Medical office visits and treatments
SafeworkMedication  # Medicine inventory and prescriptions

# Document models in models_document.py - File management system
Document            # File metadata and permissions
DocumentCategory    # Document classification system
DocumentVersion     # Version control for documents
```

**Key architectural patterns:**
- **Unified Survey Model**: Single table with `form_type` field distinguishes 001/002 forms
- **Anonymous User Pattern**: user_id=1 reserved for non-authenticated survey submissions
- **Conditional Blueprint Loading**: Advanced features gracefully handle import failures
- **Connection Pool Management**: SQLAlchemy engine with pool_size=10, pool_recycle=3600
- **Migration Manager Integration**: Custom migration system with web UI
- **Graceful Degradation**: System continues to function even if optional components fail

## Configuration Management

### Environment-Based Configuration (`config.py`)
- **DevelopmentConfig**: DEBUG=True, local development settings
- **ProductionConfig**: DEBUG=False, production security settings  
- **TestingConfig**: SQLite in-memory database for testing

### Critical Environment Variables
```bash
# Application Configuration
FLASK_CONFIG=production              # Environment (development/testing/production)
SECRET_KEY=<secure-key>             # Flask session encryption key

# Database Configuration (MySQL 8.0)
MYSQL_HOST=safework-mysql           # Database host (Docker service name)
MYSQL_PORT=3306                     # Database port (mapped to 3307 externally)
MYSQL_USER=safework                 # Database username
MYSQL_PASSWORD=safework2024         # Database password
MYSQL_DATABASE=safework_db          # Database name

# Redis Configuration
REDIS_HOST=safework-redis           # Redis host (Docker service name)
REDIS_PORT=6379                     # Redis port (mapped to 6380 externally)
REDIS_PASSWORD=                     # Redis password (optional)
REDIS_DB=0                          # Redis database number

# File Upload Configuration
UPLOAD_FOLDER=/app/uploads          # Upload directory path
MAX_CONTENT_LENGTH=52428800         # 50MB file size limit (50 * 1024 * 1024)
ALLOWED_EXTENSIONS=pdf,xlsx,xls,csv # Allowed file extensions

# Admin Account
ADMIN_USERNAME=admin                # Default admin username
ADMIN_PASSWORD=safework2024         # Default admin password
```

## Survey System Implementation

### 001 Musculoskeletal Symptom Survey (PDF-Compliant)
Complete redesign matching the official PDF version exactly:

**Form Structure:**
- **Basic Information**: Employee details, work experience, department info
- **Current Work Details**: Job description, work duration, daily hours, breaks
- **Previous Work History**: Details of work before current position  
- **Pre-screening Questions**: 5 comprehensive sections with conditional logic
- **Symptom Assessment**: 6×6 matrix evaluation for different body parts

**Technical Implementation:**
- **Conditional Display Logic**: JavaScript-based show/hide for disease status and accident details
- **Exclusive Selections**: "None" options automatically clear other selections
- **JSON Data Collection**: Complex symptom matrix data serialized to JSON
- **Client-side Validation**: Required field checking with Korean error messages
- **Responsive Design**: Mobile-optimized with horizontal scroll guides

**Server Processing Pattern:**
```python
# JSON symptom data handling in routes/survey.py
symptoms_json_data = request.form.get("symptoms_json_data")
symptom_data_dict = json.loads(symptoms_json_data) if symptoms_json_data else {}

# Store in database JSON fields using Korean keys
neck_data=symptom_data_dict.get('목', {}),
shoulder_data=symptom_data_dict.get('어깨', {}),
arm_data=symptom_data_dict.get('팔/팔꿈치', {}),
hand_data=symptom_data_dict.get('손/손목/손가락', {}),
waist_data=symptom_data_dict.get('허리', {}),
leg_data=symptom_data_dict.get('다리/발', {}),
```

### 002 New Employee Health Checkup
- **29 comprehensive health fields** for new employee medical assessments
- **Anonymous submission support** using user_id=1 pattern
- **Admin dashboard integration** with Excel export capabilities

## SafeWork Admin Panel System

### 13 Specialized Administrative Panels
Complete workplace health and safety management system:

**Core Health Management:**
- `/admin/safework/workers` - Employee master data and health status tracking
- `/admin/safework/health-checks` - Periodic health examinations and medical records  
- `/admin/safework/medical-visits` - Medical office consultations and vital signs
- `/admin/safework/medications` - Pharmacy inventory with expiry monitoring

**Safety & Compliance:**
- `/admin/safework/risk-assessment` - Workplace risk evaluations and hazard analysis
- `/admin/safework/msds` - Material Safety Data Sheets and chemical safety
- `/admin/safework/protective-equipment` - Personal protective equipment tracking
- `/admin/safework/environment-measurements` - Work environment monitoring

**Employee Development:**
- `/admin/safework/education` - Safety training completion tracking
- `/admin/safework/certifications` - Professional licenses and qualifications
- `/admin/safework/consultations` - Health consultation records
- `/admin/safework/health-programs` - Wellness initiatives and health promotion
- `/admin/safework/special-management` - High-risk employees and special care

**Administrative Features:**
- Comprehensive CRUD operations for all data types
- Real-time data visualization with Chart.js
- Excel export functionality for all panels
- Responsive Bootstrap 4.6 UI design
- Search and filtering capabilities
- Modal forms for efficient data entry

## CI/CD Pipeline

### GitHub Actions Workflows

**Main Deployment Pipeline (`main-deploy.yml`):**
```yaml
# Triggered by: push to main/master branch
- Automated versioning: Git SHA + timestamp format (v3.0.YYYYMMDD-HHMM-{git-sha})
- Multi-service Docker builds: App, MySQL, Redis custom images
- Registry deployment: registry.jclee.me/safework/* (admin/bingogo1)
- Automatic health verification and deployment completion
```

**Claude Code Integration Workflows:**
- `claude-code-official.yml` - Primary @claude mention handler for GitHub issues
- `master-issue-orchestrator.yml` - Master orchestrator for issue processing
- `parallel-issue-processor.yml` - Parallel issue resolution system
- `issue-resolution-verification.yml` - Automated verification of issue fixes

**Claude Code Automation Features:**
- **@claude Mention System**: Responds to @claude mentions in GitHub issue comments
- **Automated Code Analysis**: Reviews and implements solutions for reported issues
- **MCP Screenshot Evidence**: Visual documentation of implementation process
- **User Approval Required**: Always requests user confirmation before code changes
- **Comprehensive Reporting**: Detailed change reports with file modifications

### Deployment Strategy
- **Production**: Push to `main`/`master` branch → Automatic deployment via GitHub Actions
- **Container Registry**: `registry.jclee.me/safework/` (admin/bingogo1 credentials)
- **Version Tagging**: `v3.0.YYYYMMDD-HHMM-{git-sha}` format with automatic Git tagging
- **Health Checks**: Automated container health verification at port 4545
- **Zero-Downtime Deployment**: Docker Compose service replacement with health checks

## Testing Strategy

### Database Environment Differences
**Critical**: Tests use SQLite in-memory, production uses MySQL 8.0

```python
# tests/conftest.py creates SQLite in-memory DB for speed
# Production uses MySQL 8.0 - syntax differences exist:

# SQLite (testing)    vs    MySQL (production)
# AUTOINCREMENT      →      AUTO_INCREMENT  
# OR IGNORE         →      INSERT IGNORE
# No INFORMATION_SCHEMA  →  Full schema introspection
```

**Testing Approaches:**
- **Unit tests**: Run locally with SQLite for speed (`cd app && python3 -m pytest`)
- **Integration tests**: Use Docker containers for MySQL compatibility  
- **Database tests**: Always test migrations in Docker environment
- **API tests**: JWT authentication requires valid tokens

## Database Migration System

### Custom MySQL-Compatible Migration System
- **`migration_manager.py`**: Core migration orchestration engine
- **`migration_model.py`**: Migration tracking model (separate from main models)
- **`migrate.py`**: CLI interface for migration operations
- **Web UI**: Available at `/admin/migrations` for visual management

### Migration Commands
```bash
# CLI Usage
docker exec safework-app python migrate.py status     # Check migration status
docker exec safework-app python migrate.py upgrade    # Apply pending migrations  
docker exec safework-app python migrate.py rollback   # Rollback last migration

# Web Interface
# Visit: http://localhost:4545/admin/migrations
# - Visual migration status
# - Web-based execution
# - Real-time progress monitoring
```

### MySQL Compatibility Features
- **Index Management**: Uses INFORMATION_SCHEMA queries instead of `CREATE INDEX IF NOT EXISTS`
- **Syntax Compliance**: `AUTO_INCREMENT` (not `AUTOINCREMENT`), `INSERT IGNORE`
- **Transaction Safety**: Proper rollback handling for failed migrations
- **Schema Detection**: Table/column existence checks before alterations

## Key API Endpoints

### Public Endpoints
- `/health` - System health check returning JSON status
- `/survey/001_musculoskeletal_symptom_survey` - 001 survey form
- `/survey/002_new_employee_health_checkup_form` - 002 survey form

### Admin Endpoints (authentication required)
- `/admin/dashboard` - Main administrative dashboard
- `/admin/surveys` - Survey data management and statistics
- `/admin/safework` - SafeWork main dashboard (comprehensive health management)
- `/admin/documents` - Document management system
- `/admin/migrations` - Database migration web interface

### SafeWork API Endpoints (JWT authentication)
- `/api/safework/workers` - Employee data CRUD operations
- `/api/safework/health-checks` - Health examination management
- `/api/safework/medical-visits` - Medical visit records
- `/api/safework/medications` - Medicine inventory management

## Common Issues and Solutions

### MySQL Connection Issues
- **Container naming**: Must use `safework-mysql` (hardcoded in config.py)
- **Network isolation**: Check `docker network ls | grep safework-net`
- **Credentials**: Verify MYSQL_PASSWORD=safework2024 in docker-compose.yml
- **Startup timing**: MySQL needs ~30 seconds, app waits with retry logic
- **Connection pooling**: SQLAlchemy pool_size=10, pool_recycle=3600, pool_pre_ping=True

### Migration Issues
- **Syntax differences**: Use MySQL syntax, not SQLite (`AUTO_INCREMENT`, `INSERT IGNORE`)
- **Index creation**: Check INFORMATION_SCHEMA before creating indexes
- **Web interface**: Use `/admin/migrations` for visual debugging
- **Transaction rollback**: Failed migrations auto-rollback, check migration logs

### Application Factory Issues
- **Blueprint registration**: SafeWork v2 API conditionally loaded, check import errors
- **User creation**: Anonymous user (id=1) and admin user created at startup
- **Redis connection**: Verify Redis container health before app startup

### Container Debugging
```bash
# Container health checks
docker-compose ps                    # Check all container status
docker exec safework-app python -c "import app; print('App OK')"  # App health
docker exec safework-mysql mysqladmin ping -h localhost -u root -psafework2024root  # MySQL health
docker exec safework-redis redis-cli ping  # Redis health

# Log analysis
docker-compose logs app --tail=100  # Last 100 lines of app logs
docker-compose logs mysql --follow  # Follow MySQL logs in real-time
docker logs safework-app --since 5m # App logs from last 5 minutes

# Database debugging
docker exec safework-mysql mysql -u safework -psafework2024 safework_db -e "SHOW TABLES;"
docker exec safework-mysql mysql -u safework -psafework2024 safework_db -e "SELECT * FROM surveys ORDER BY created_at DESC LIMIT 5;"
```

## Development Best Practices

### Code Organization Patterns
- **Modular Blueprints**: Each major feature has its own blueprint in `routes/`
- **Model Separation**: Different model files for different subsystems
- **Conditional Loading**: Optional features gracefully handle import failures
- **Configuration Management**: Environment-based configuration in `config.py`

### Database Patterns
- **Unified Survey Model**: Single table with `form_type` discriminator
- **JSON Field Usage**: Complex form data stored as JSON in database
- **Connection Pooling**: Proper SQLAlchemy engine configuration
- **Migration Management**: Custom system with web interface

### Security Considerations
- **CSRF Protection**: All forms include Flask-WTF CSRF tokens
- **JWT Authentication**: API endpoints use JWT-based authentication
- **Session Security**: Secure session cookie configuration
- **File Upload Security**: File type restrictions and size limits
- **SQL Injection Prevention**: All database queries use SQLAlchemy ORM

### Performance Optimization
- **Database Connection Pooling**: pool_size=10, pool_recycle=3600
- **Redis Caching**: Session data and temporary data caching
- **Static File Optimization**: Proper static file handling
- **Query Optimization**: Efficient database queries and indexing

## Port Mapping and Service Access
```yaml
# Docker Compose Service Mapping
safework-app: 4545 (internal) → 4545 (external) - Main application
safework-mysql: 3306 (internal) → 3307 (external) - Database access
safework-redis: 6379 (internal) → 6380 (external) - Redis access

# Health Check URLs
http://localhost:4545/health         # Application health check
http://localhost:4545/admin/migrations # Migration web interface
```

This comprehensive guide should help future Claude Code instances understand the SafeWork system architecture and development patterns effectively.