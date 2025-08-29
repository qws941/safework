# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is a Korean workplace musculoskeletal symptom survey system built with Flask. It's a containerized web application that provides two main survey forms (001 musculoskeletal symptoms, 002 new employee health checkup), document management, and administrative dashboards for workplace health assessments.

### Core Technology Stack
- **Backend**: Python Flask 3.0+ with SQLAlchemy ORM
- **Database**: MySQL 8.0 with custom migration system (port 3307 external)
- **Cache**: Redis 7.0 (port 6380 external) 
- **Container**: Docker with multi-service architecture
- **Registry**: Private registry at registry.jclee.me
- **CI/CD**: GitHub Actions with automated deployment pipelines

## Development Commands

### Docker Environment (Primary Development Method)
```bash
# Start full development stack
docker-compose up -d          # Start all services (MySQL + Redis + App)
docker-compose down           # Stop all services
docker-compose logs app       # View app logs
docker-compose logs mysql     # View database logs

# Service status and health
docker-compose ps             # Check container status
curl http://localhost:4545/health  # Health check endpoint
```

### Make Commands (Available via Makefile)
```bash
# Development 
make up                      # Start Docker Compose stack
make down                    # Stop Docker Compose stack
make logs                    # View application logs
make status                  # Check service status

# Deployment
make deploy                  # Trigger GitHub Actions deployment
make local                   # Local build and deploy
make release v=1.2.0        # Create release tag

# Database Operations
make migrate-status         # Check migration status  
make migrate-run           # Run pending migrations
make migrate-rollback      # Rollback last migration
```

### Direct Database Migration Commands
```bash
# Using the migration manager directly
python app/migrate.py status                    # Check migration status
python app/migrate.py migrate                   # Run all pending migrations
python app/migrate.py create "Description"      # Create new migration
python app/migrate.py rollback --version 002    # Rollback to specific version

# Web interface for migrations
http://localhost:4545/admin/migrations          # Visual migration management
```

### Testing and Quality
```bash
# Local testing (if pytest is available)
cd app && python -m pytest                     # Run tests
cd app && python -m pytest --cov=.            # Run with coverage

# Code formatting and linting (if tools available)
cd app && python -m black .                   # Format code
cd app && python -m flake8                    # Lint code
```

## High-Level Architecture

### Flask Application Structure
The application uses an **Application Factory Pattern** with blueprint-based routing:

```
app/
├── app.py                    # Application factory (create_app function)
├── config.py                 # Environment-based configuration classes
├── models.py                 # Main SQLAlchemy models (User, Survey, etc.)
├── models_document.py        # Document management models
├── migration_manager.py      # Custom database migration system
├── routes/                   # Blueprint modules by feature area
│   ├── main.py              # Homepage and general routes  
│   ├── auth.py              # Login/logout/register
│   ├── survey.py            # Both survey forms + admin dashboard
│   ├── admin.py             # Administrative functions (NOT USED - see survey.py)
│   ├── document.py          # Document viewing and download
│   ├── document_admin.py    # Document management (admin)
│   ├── migration.py         # Migration web interface
│   └── health.py            # Health check endpoint
├── templates/               # Jinja2 templates organized by feature
│   ├── survey/              # Survey forms and admin pages
│   ├── auth/                # Authentication pages
│   ├── document/            # Document pages
│   └── base.html            # Base template with Bootstrap
├── migrations/              # Database migration files (Python)
└── static/                  # CSS, JS, images (if any)
```

### Key Architectural Patterns

1. **Application Factory**: `create_app()` in `app.py` creates configured Flask instances
2. **Blueprint Organization**: Routes organized by feature area, **NOT by user type**
3. **Custom Migration System**: Python-based migrations with web interface and CLI support
4. **Anonymous Survey Submission**: Both forms can be submitted without login (uses user_id=1)
5. **Multi-Form Architecture**: Single models.py handles both 001 and 002 form types via `form_type` field
6. **Admin Routes in Survey Blueprint**: Admin functionality is in `routes/survey.py`, not `routes/admin.py`

### Database Schema (MySQL 8.0)

**Core Tables:**
- `users`: User accounts (admin, regular users, anonymous user_id=1)
- `surveys`: Both 001 and 002 form submissions (distinguished by `form_type` field)
- `migrations`: Migration tracking for schema versions
- `audit_logs`: System activity logging

**Document Management:**
- `document_categories`: Hierarchical document organization
- `documents`: Document metadata and storage
- `document_versions`: Version control for documents
- `document_access_logs`: Access tracking and analytics

**Statistics:**
- `survey_statistics`: Cached analytics data
- `departments`: Department master data

### Survey Form Architecture

**Critical Understanding:** There are TWO main survey forms:
1. **001 Musculoskeletal Symptom Survey** (`/survey/001_musculoskeletal_symptom_survey`)
   - Original Korean workplace musculoskeletal assessment
   - Complex conditional logic (questions 2-6 disabled if Q1="아니오" for each body part)
   - Template: `templates/survey/001_musculoskeletal_symptom_survey.html`

2. **002 New Employee Health Checkup** (`/survey/002_new_employee_health_checkup_form`)  
   - New employee health assessment form
   - Comprehensive health data collection (height, weight, medical history, etc.)
   - Template: `templates/survey/002_new_employee_health_checkup_form.html`

Both forms:
- Share the same `Survey` model (differentiated by `form_type` field)
- Can be submitted anonymously (no login required)
- Have unified design system and responsive layout
- Include text overflow handling and mobile optimization

### Container Architecture
Three services via Docker Compose:
- **safework-app**: Flask application (port 4545)
- **safework-mysql**: MySQL 8.0 database (external port 3307)
- **safework-redis**: Redis cache (external port 6380)

All containers use custom images from `registry.jclee.me` with health checks and auto-restart policies.

## Development Workflow

### Branch Strategy (GitOps)
- `main`: Production releases → auto-deploys to production
- `staging`: Pre-production testing → auto-deploys to staging  
- `develop`: Development integration → auto-deploys to dev environment
- `feature/*`: Feature development branches
- `hotfix/*`: Emergency production fixes

### Local Development Process
1. **Start Environment**: `docker-compose up -d` 
2. **Verify Health**: `curl http://localhost:4545/health`
3. **Check Migrations**: `python app/migrate.py status`
4. **Run Migrations if needed**: `python app/migrate.py migrate`
5. **Access Applications**:
   - Main app: http://localhost:4545
   - Admin dashboard: http://localhost:4545/survey/admin
   - Migration UI: http://localhost:4545/admin/migrations

### Database Migration Workflow
SafeWork uses a **custom migration system** (not Flask-Migrate):

1. **Create Migration**: `python app/migrate.py create "Add new feature"`
2. **Edit Migration File**: Modify generated file in `app/migrations/`  
3. **Test Locally**: `python app/migrate.py migrate`
4. **Use Web Interface**: http://localhost:4545/admin/migrations for visual confirmation
5. **Deploy**: Migrations run automatically during container startup

**Migration Files Structure:**
- `001_initial_schema.py`: Database schema creation  
- `002_create_admin_user.py`: Admin user setup
- `003_optimize_performance.py`: Performance improvements
- `004_add_document_management.py`: Document system tables

## Configuration and Environment

### Key Environment Variables
```bash
# Flask Application
FLASK_CONFIG=production              # development/staging/production  
SECRET_KEY=safework-production-secret-key-2024
APP_PORT=4545

# Database (MySQL)
MYSQL_HOST=safework-mysql
MYSQL_PORT=3306  
MYSQL_DATABASE=safework_db
MYSQL_USER=safework
MYSQL_PASSWORD=safework2024

# Cache (Redis)
REDIS_HOST=safework-redis
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=safework2024

# Container Registry
REGISTRY_URL=registry.jclee.me
REGISTRY_USER=admin  
REGISTRY_PASSWORD=bingogo1
```

### Default Access
- **Admin Login**: admin / safework2024
- **Anonymous Survey**: No login required for form submission
- **Database**: Accessible on localhost:3307 (external)
- **Redis**: Accessible on localhost:6380 (external)

## Key Features and Routes

### Survey Forms (Public Access)
- `/`: Main landing page
- `/survey/001_musculoskeletal_symptom_survey`: Musculoskeletal symptom survey (Korean workplace assessment)
- `/survey/002_new_employee_health_checkup_form`: New employee health checkup form
- `/survey/new`: Redirects to 001 form (backward compatibility)

### Admin Routes (Login Required)
**Note: Admin routes are in survey.py, not admin.py**
- `/survey/admin`: Admin dashboard with statistics and data management
- `/survey/admin/detail/<id>`: View individual survey submission details
- `/survey/admin/export/<form_type>`: Excel export (001/002/all)

### Document Management
- `/documents/`: Document browsing and search
- `/documents/view/<id>`: Document details and download
- `/admin/documents/`: Document upload and management (admin)
- `/admin/documents/categories`: Category management (admin)

### System Routes  
- `/health`: Health check endpoint (returns JSON status)
- `/admin/migrations`: Web-based migration management
- `/auth/login`, `/auth/logout`, `/auth/register`: Authentication

## Common Development Tasks

### Adding New Survey Features
1. **Models**: Modify `models.py` Survey class to add new fields
2. **Migration**: Create migration with `python app/migrate.py create "Add survey fields"`
3. **Templates**: Update form templates in `templates/survey/`
4. **Routes**: Modify form processing in `routes/survey.py`
5. **Admin View**: Update admin dashboard to display new fields

### Adding New Document Features  
1. **Models**: Modify `models_document.py` classes
2. **Migration**: Create migration for schema changes
3. **Routes**: Update `routes/document.py` or `routes/document_admin.py`
4. **Templates**: Update document templates

### Database Schema Changes
1. **Create Migration**: `python app/migrate.py create "Description of change"`
2. **Edit Migration**: Implement upgrade() and downgrade() functions
3. **Test Locally**: `python app/migrate.py migrate`
4. **Web Review**: Use http://localhost:4545/admin/migrations to verify
5. **Deploy**: Commit and push (auto-runs in containers)

### Deployment Process
1. **Development**: Push to `develop` branch → auto-deploys to dev environment
2. **Staging**: Push to `staging` branch → auto-deploys to staging environment
3. **Production**: Push to `main` branch OR `make release v=1.2.0` → auto-deploys to production (with approval)

## Architecture-Specific Notes

### Anonymous User Handling
- Both survey forms allow anonymous submission
- Anonymous submissions use `user_id = 1` (special anonymous user)
- No authentication required for core survey functionality
- Admin functions require login and admin privileges

### Form Type Differentiation  
- Single `Survey` model handles both forms via `form_type` field
- Form-specific fields use conditional rendering in templates
- Admin dashboard can filter and display both form types
- Excel export supports per-form-type or combined exports

### Custom Migration System Details
- **NOT using Flask-Migrate** - uses custom `MigrationManager` class
- Migration files are Python scripts with upgrade() and downgrade() functions
- Web interface provides visual migration management at `/admin/migrations`
- Migrations tracked in `migrations` table with execution time and success status
- Each migration has a checksum for integrity verification

### Security Model
- JWT-based authentication for admin users
- Role-based access (admin vs regular user vs anonymous)
- Survey submissions don't require authentication (anonymous allowed)
- Document access controlled by permissions (public/private/admin-only)
- Audit logging for administrative actions

## Troubleshooting

### Container Issues
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs app
docker-compose logs mysql  
docker-compose logs redis

# Restart services
docker-compose restart
docker-compose down && docker-compose up -d
```

### Database Issues
```bash
# Check migration status
python app/migrate.py status

# Access MySQL directly
docker exec -it safework-mysql mysql -u safework -psafework2024 safework_db

# Reset migrations (if needed)
python app/migrate.py rollback --version 001
python app/migrate.py migrate
```

### Application Issues
```bash
# Health check
curl http://localhost:4545/health

# Check Redis connection
docker exec -it safework-redis redis-cli ping

# View Flask logs
docker-compose logs -f app
```

### Common Issues
1. **Port Conflicts**: Check if ports 4545, 3307, 6380 are available
2. **Database Connection**: Ensure MySQL container is healthy before app starts
3. **Migration Failures**: Use web interface or rollback and retry
4. **Admin Access**: Default admin/safework2024, check user creation in migrations
5. **Anonymous Submissions**: Ensure user_id=1 exists in users table (created by migration 002)

## Testing Strategy

### Manual Testing Approach
- **Survey Forms**: Test both 001 and 002 forms with various inputs
- **Admin Functions**: Test dashboard, data viewing, Excel export
- **Document Management**: Test upload, download, categorization
- **Anonymous vs Logged In**: Test different user states

### Health Monitoring
- Health endpoint: `http://localhost:4545/health` 
- Container health checks built into docker-compose.yml
- Database connection verification in health endpoint
- Redis connectivity verification

### Quality Gates (CI/CD)
- Security scanning: Trivy, Bandit, Safety
- Code formatting: Black
- Linting: Flake8, Pylint  
- Type checking: MyPy (if configured)
- Container vulnerability scanning