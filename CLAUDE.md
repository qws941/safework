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
SafeWork includes three independent subsystems:
- **Core Survey System**: Original 001/002 forms with unified Survey model
- **SafeWork v2 System**: Comprehensive workplace health management (`models_safework_v2.py`)
- **Document Management**: File upload/versioning system (`models_document.py`)

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
./deploy.sh                # Production deployment script
git push origin main      # Production deployment (requires approval)
git push origin develop   # Development auto-deployment
```

## Project Structure

```
safework2/
├── app/                    # Flask application
│   ├── routes/            # Blueprint route handlers
│   ├── templates/         # Jinja2 templates
│   ├── migrations/        # Database migrations
│   ├── tests/            # Test suite
│   ├── app.py            # Application factory
│   ├── models*.py        # SQLAlchemy models
│   ├── forms*.py         # WTForms definitions
│   └── requirements.txt  # Python dependencies
├── mysql/                 # MySQL configuration
│   └── init.sql          # Database initialization
├── redis/                # Redis configuration
├── .github/workflows/    # CI/CD pipelines
├── docker-compose.yml    # Container orchestration
└── deploy.sh            # Production deployment script
```

## High-Level Architecture

### Three-Tier Container Architecture
- **safework-app**: Flask application (port 4545) with auto-restart and health checks
- **safework-mysql**: MySQL 8.0 (port 3307) with custom schema in `mysql/init.sql`
- **safework-redis**: Redis 7.0 (port 6380) for session caching

### Application Factory Pattern
The app uses Flask's application factory pattern in `app.py:create_app()` which:
1. Initializes database connection with MySQL-specific settings
2. Registers blueprints for modular routing
3. Sets up custom migration system
4. Creates anonymous user (id=1) for public submissions
5. Handles environment-specific configuration

### Blueprint-Based Routing Structure
```python
# Core blueprints registered in app.py:create_app()
main_bp → routes/main.py       # Landing pages
auth_bp → routes/auth.py       # Login/register  
survey_bp → routes/survey.py   # 001/002 forms
admin_bp → routes/admin.py     # SafeWork dashboards
migration_bp → routes/migration.py  # Database migration web UI
health_bp → routes/health.py   # Health checks (/health endpoint)

# Document management subsystem
document_bp → routes/document.py        # Public document access
document_admin_bp → routes/document_admin.py  # Admin document management

# SafeWork v2 API (conditionally loaded)
api_safework_v2_bp → routes/api_safework_v2.py  # RESTful API with JWT auth
```

### Database Models Architecture

**Three separate model files handle different subsystems:**

```python
# Core models in models.py - Original survey system
User         # Authentication with is_admin flag, created in app factory
Survey       # Unified table for 001/002 forms (form_type discriminator)  
SurveyStatistics  # Aggregated survey stats
AuditLog     # System activity tracking for admin actions

# SafeWork v2 models in models_safework_v2.py - Workplace health management
SafeworkWorker      # Employee master data
SafeworkHealthCheck # Periodic health examinations  
SafeworkMedicalVisit # Medical office visits
SafeworkMedication  # Medicine inventory management

# Document models in models_document.py - File management system
Document            # File metadata and permissions
DocumentCategory    # Document classification system
DocumentVersion     # Version control for documents
```

**Key architectural patterns:**
- **Unified Survey Model**: Single table with `form_type` field distinguishes 001/002 forms
- **Anonymous User Pattern**: user_id=1 reserved for non-authenticated survey submissions
- **Conditional API Loading**: SafeWork v2 API gracefully handles import failures
- **Database Connection Retry**: 30-second retry loop for MySQL startup timing
- **Migration Manager Integration**: Custom migration system with web UI at startup
- **Graceful Degradation**: System continues to function even if optional components fail

### Survey System Implementation

#### 001 Musculoskeletal Symptom Survey (PDF-Compliant Implementation)
The 001 form has been completely redesigned to match the official PDF version exactly:

**Form Structure:**
- **Basic Information**: Employee details, work experience, department info
- **Current Work Details**: Job description, work duration, daily hours, break schedule
- **Previous Work History**: Details of work before current position  
- **Pre-screening Questions**: 5 comprehensive sections
  - Leisure activities (6 options with exclusive "none" selection)
  - Housework hours (5-level scale)
  - Diagnosed diseases (5 conditions with treatment status)
  - Past accidents (6 body parts with conditional display)
  - Physical burden assessment (4-level scale)
- **Symptom Assessment**: 6×6 matrix evaluation
  - 6 body parts: neck, shoulder, arm/elbow, hand/wrist/finger, waist, leg/foot
  - 6 questions per part: location, duration, severity, frequency, last week, treatment

**Technical Implementation:**
- **Conditional Display Logic**: Disease status and accident details show/hide based on selections
- **Exclusive Selections**: "None" options automatically clear other selections
- **JSON Data Collection**: Symptom matrix data serialized to JSON for server processing
- **Client-side Validation**: Required field checking and symptom completion validation
- **Template Architecture**: 1300+ lines of HTML with embedded JavaScript functionality

**Server Processing:**
```python
# JSON symptom data handling in routes/survey.py
symptoms_json_data = request.form.get("symptoms_json_data")
symptom_data_dict = json.loads(symptoms_json_data) if symptoms_json_data else {}

# Store in database JSON fields
neck_data=symptom_data_dict.get('목', {}),
shoulder_data=symptom_data_dict.get('어깨', {}),
# ... additional body parts
```

#### 002 Form
- **002 Form**: 29 comprehensive health fields for new employee checkups
- **Anonymous Support**: Uses user_id=1 for public submissions
- **Admin Dashboard**: `/admin/safework` with Excel export capabilities

### Complete SafeWork Admin Panel System
The SafeWork system provides 13 specialized administrative panels for comprehensive workplace health and safety management:

**Core Health Management:**
- **Workers**: Employee master data with health status tracking
- **Health Checks**: Periodic health examinations and medical records  
- **Medical Visits**: Medical office consultations and vital signs tracking
- **Medications**: Pharmacy inventory with expiry monitoring

**Safety & Compliance:**
- **Risk Assessment**: Workplace risk evaluations and hazard analysis
- **MSDS**: Material Safety Data Sheets management and chemical safety
- **Protective Equipment**: Personal protective equipment tracking and maintenance
- **Environment Measurements**: Work environment monitoring and air quality data

**Employee Development:**
- **Education**: Safety training completion tracking and certification records
- **Certifications**: Professional licenses and qualifications management
- **Consultations**: Health consultation records and counseling sessions

**Organizational Management:**
- **Special Management**: High-risk employees and special care requirements
- **Health Programs**: Wellness initiatives and health promotion campaigns
- **Departments**: Department-wise health and safety status overview

Each panel includes comprehensive CRUD operations, data visualization, Excel export capabilities, and responsive Bootstrap UI design.

### SafeWork v2 System (Advanced Workplace Health Management)
SafeWork v2 provides comprehensive workplace health management beyond basic surveys:

**Key Components:**
- **Worker Management**: Employee master data with health tracking
- **Health Check System**: Periodic examinations and medical records
- **Medical Visit Tracking**: Office visit logs with vital signs
- **Medication Inventory**: Medicine stock management with expiry tracking

**RESTful API Endpoints:**
- `/api/safework/workers` - CRUD operations for employee data
- `/api/safework/health-checks` - Health examination management
- `/api/safework/medical-visits` - Medical visit records
- `/api/safework/medications` - Medicine inventory management

**Authentication**: JWT-based authentication system for API access

## CI/CD Pipeline

### GitHub Actions Workflows
```yaml
# .github/workflows/main-deploy.yml
- Quality checks: Black formatting, Flake8 linting
- Docker builds: App, MySQL, Redis images
- Registry push: registry.jclee.me/safework/*
- Environment deployment: develop→auto, main→manual approval
```

### Deployment Strategy
- **Development**: Push to `develop` branch → Auto-deploy
- **Production**: Push to `main` branch → Manual approval required
- **Images**: Built with timestamps (YYYYMMDD.HHMM format)

## Dependencies

### Core Python Packages
- **Flask 3.0.0**: Web framework
- **Flask-SQLAlchemy 3.1.1**: Database ORM
- **PyMySQL 1.1.0**: MySQL connector
- **Redis 5.0.1**: Cache client
- **openpyxl 3.1.2**: Excel export
- **pytest 7.4.3**: Testing framework
- **black 23.12.1**: Code formatter
- **flake8 7.0.0**: Linter

## Critical Configuration

### Environment Variables
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
MAX_CONTENT_LENGTH=52428800         # 50MB file size limit
ALLOWED_EXTENSIONS=pdf,xlsx,xls,csv # Allowed file extensions

# Docker Registry (for CI/CD)
REGISTRY_PASSWORD=<for-github-secrets>
```

### Docker Registry
All images pushed to `registry.jclee.me`:
- safework/app:latest (589MB)
- safework/mysql:latest (781MB)
- safework/redis:latest (41.4MB)

## Database Migration System

**Custom MySQL-compatible migration system:**

### Architecture
- **`migration_manager.py`**: Core migration orchestration engine
- **`migration_model.py`**: Migration tracking model (separate from main models)
- **`migrate.py`**: CLI interface for migration operations
- **Web UI**: Available at `/admin/migrations` for visual management

### Migration Pattern
```python
# Standard migration structure in migrations/
def upgrade():
    with db.engine.begin() as conn:
        # MySQL-compatible operations
        conn.execute(text("CREATE TABLE IF NOT EXISTS..."))
        
def downgrade():
    with db.engine.begin() as conn:
        # Rollback operations
        conn.execute(text("DROP TABLE IF EXISTS..."))
```

### MySQL Compatibility Features
- **Index Management**: INFORMATION_SCHEMA queries replace `CREATE INDEX IF NOT EXISTS`
- **Syntax Compliance**: `AUTO_INCREMENT` (not `AUTOINCREMENT`), `INSERT IGNORE`
- **Transaction Safety**: Proper rollback handling for failed migrations
- **Schema Detection**: Table/column existence checks before alterations

## Testing Considerations

**Important database compatibility differences:**

```python
# tests/conftest.py creates SQLite in-memory DB for speed
# Production uses MySQL 8.0 - syntax differences exist:

# SQLite (testing)    vs    MySQL (production)
# AUTOINCREMENT      →      AUTO_INCREMENT  
# OR IGNORE         →      INSERT IGNORE
# No INFORMATION_SCHEMA  →  Full schema introspection
```

**Testing strategies:**
- **Unit tests**: Run locally with SQLite for speed (`cd app && python3 -m pytest`)
- **Integration tests**: Use Docker containers for MySQL compatibility
- **Database tests**: Always test migrations in Docker environment
- **API tests**: JWT authentication requires valid tokens

## Key API Endpoints

### Public Endpoints
- `/health` - Health check returning JSON status
- `/survey/001_musculoskeletal_symptom_survey` - 001 form
- `/survey/002_new_employee_health_checkup_form` - 002 form

### Admin Endpoints (login required)
- `/admin/dashboard` - Main admin dashboard
- `/admin/surveys` - Survey data management
- `/admin/safework` - SafeWork v2 dashboard (comprehensive workplace health management)
- `/admin/safework/workers` - Employee management and worker records
- `/admin/safework/health-checks` - Health examinations and periodic checkups
- `/admin/safework/medical-visits` - Medical office visits and consultations  
- `/admin/safework/medications` - Medicine inventory and pharmacy management
- `/admin/safework/consultations` - Health consultation records management
- `/admin/safework/health-programs` - Health promotion programs and initiatives
- `/admin/safework/special-management` - Special management workers and high-risk employees
- `/admin/safework/environment-measurements` - Work environment measurements and monitoring
- `/admin/safework/risk-assessment` - Risk assessment management and evaluations
- `/admin/safework/msds` - Material Safety Data Sheets (MSDS) management
- `/admin/safework/protective-equipment` - Personal protective equipment management
- `/admin/safework/education` - Safety education and training completion tracking
- `/admin/safework/certifications` - Professional certifications and licenses management
- `/admin/safework/departments` - Department-wise health and safety status
- `/admin/documents` - Document management system
- `/admin/migrations` - Database migration web interface
- `/api/safework/*` - RESTful API with JWT authentication

## Debugging Tips

### Container Access
```bash
# Application container debugging
docker exec -it safework-app bash          # Shell access
docker exec -it safework-app python3       # Python REPL with app context

# Database access
docker exec -it safework-mysql mysql -u safework -psafework2024 safework_db
docker exec safework-mysql mysqldump -u safework -psafework2024 safework_db > backup.sql

# Redis cache inspection  
docker exec -it safework-redis redis-cli   # Redis CLI
docker exec safework-redis redis-cli FLUSHDB  # Clear cache
```

### Checking Logs
```bash
docker-compose logs app | tail -100        # Last 100 lines of app logs
docker-compose logs mysql --follow         # Follow MySQL logs
docker logs safework-app --since 5m        # Logs from last 5 minutes
```

### Database Queries
```bash
# Check survey submissions
docker exec safework-mysql mysql -u safework -psafework2024 safework_db -e "SELECT * FROM surveys ORDER BY created_at DESC LIMIT 10;"

# Check users
docker exec safework-mysql mysql -u safework -psafework2024 safework_db -e "SELECT id, username, email, is_admin FROM users;"
```

## Common Issues and Solutions

### MySQL Connection Issues
- **Container naming**: Must use `safework-mysql` (hardcoded in config.py)
- **Network isolation**: Check `docker network ls | grep safework-net`
- **Credentials**: Verify MYSQL_PASSWORD=safework2024 in docker-compose.yml
- **Startup timing**: MySQL needs ~30 seconds, app waits with retry logic

### Migration Failures  
- **Syntax differences**: Use MySQL syntax, not SQLite (`AUTO_INCREMENT`, `INSERT IGNORE`)
- **Index creation**: Check INFORMATION_SCHEMA before creating indexes
- **Web interface**: Use `/admin/migrations` for visual debugging
- **Transaction rollback**: Failed migrations auto-rollback, check migration logs

### Test Environment Issues
- **Database mismatch**: Tests use SQLite, production uses MySQL  
- **Container testing**: Run `docker exec safework-app python3 -m pytest` for accuracy
- **Config switching**: Ensure `FLASK_CONFIG=testing` for test runs
- **Model imports**: SafeWork v2 models may not be available in test environment

### Application Factory Issues
- **Blueprint registration**: SafeWork v2 API conditionally loaded, check import errors
- **User creation**: Anonymous user (id=1) and admin user created at startup
- **Redis connection**: Verify Redis container health before app startup

## Recent Development History

### PDF-Compliant 001 Survey Implementation (2024-08-30)
**Latest Update**: Complete redesign of 001 musculoskeletal symptom survey to match official PDF exactly

**Major Changes:**
- **Template Rewrite**: Complete restructure of `001_musculoskeletal_symptom_survey.html` (1300+ lines)
- **JavaScript Enhancement**: Added conditional display logic, data collection, and validation
- **Server Route Update**: Modified `routes/survey.py` to handle JSON symptom data structure
- **Database Integration**: Symptom data now stored as JSON in dedicated fields (neck_data, shoulder_data, etc.)

**New Features:**
- 6×6 symptom assessment matrix with radio buttons and checkboxes
- Conditional sections for disease status and accident details  
- Exclusive selection logic for "none" options
- Client-side form validation with Korean error messages
- JSON serialization of complex symptom data for server processing

### Admin Panel Restoration (2024-08-30)
Comprehensive admin panel restoration for SafeWork system:

**Issue Identified**: User reported missing admin panel menus that were previously available
**Resolution**: Implemented 10 missing admin routes and corresponding HTML templates
**Files Modified**:
- `app/routes/admin.py` - Added 10 new route handlers with sample data
- `app/templates/admin/` - Created 10 new responsive Bootstrap templates

**New Routes Implemented**:
```python
@admin_bp.route("/safework/consultations")      # Health consultation records
@admin_bp.route("/safework/health-programs")    # Health promotion programs  
@admin_bp.route("/safework/special-management") # Special management workers
@admin_bp.route("/safework/environment-measurements") # Environment monitoring
@admin_bp.route("/safework/risk-assessment")    # Risk assessments
@admin_bp.route("/safework/msds")               # Material Safety Data Sheets
@admin_bp.route("/safework/protective-equipment") # PPE management
@admin_bp.route("/safework/education")          # Training tracking
@admin_bp.route("/safework/certifications")    # License management
@admin_bp.route("/safework/departments")       # Department overview
```

**Template Pattern**: Each template follows consistent structure with:
- Admin sidebar navigation
- Statistics overview cards
- Responsive data tables with search/filter
- Modal forms for CRUD operations
- Excel export functionality
- Bootstrap 4.6 responsive design

## Form Development Patterns

### 001 Survey Form Architecture  
When working with the 001 musculoskeletal symptom survey, understand the key patterns:

**Template Structure:**
- **Section-based Layout**: Each form section uses `.section-card` container with consistent styling
- **Conditional Sections**: Use `id` attributes and JavaScript show/hide logic (e.g., `disease_status_section`, `accident_details_section`)
- **Matrix Tables**: Symptom assessment uses responsive tables with nested Jinja2 loops for body parts and questions

**JavaScript Patterns:**
```javascript
// Conditional display pattern
function toggleDiseaseStatus() {
    const hasDisease = Array.from(diseaseCheckboxes).some(cb => cb.checked);
    diseaseStatusDiv.style.display = hasDisease ? 'block' : 'none';
}

// JSON data collection pattern  
const symptomData = {};
bodyParts.forEach(part => {
    const partKey = part.replace(/[\/]/g, '_');
    if (sideInput) {
        symptomData[partKey] = {
            side: sideInput.value,
            duration: durationInput?.value || '',
            // ... other fields
        };
    }
});
```

**Server Processing Pattern:**
```python
# Extract JSON data from form
symptoms_json_data = request.form.get("symptoms_json_data")
symptom_data_dict = json.loads(symptoms_json_data) if symptoms_json_data else {}

# Map to database fields using Korean keys
neck_data=symptom_data_dict.get('목', {}),
shoulder_data=symptom_data_dict.get('어깨', {}),
```

## Important Development Notes

### Database Environment Differences
- **Testing**: Uses SQLite in-memory database (`conftest.py`)
- **Production**: Uses MySQL 8.0 with persistent storage
- **Syntax differences**: Always test migrations in Docker environment for MySQL compatibility

### Conditional Component Loading
```python
# SafeWork v2 API loads conditionally in app.py:78-85
try:
    from routes.api_safework_v2 import api_safework_bp
    app.register_blueprint(api_safework_bp, url_prefix="/api/safework")
except ImportError as e:
    app.logger.warning(f"SafeWork API v2.0 not loaded: {e}")
```

### Application Startup Sequence
1. Load configuration based on `FLASK_CONFIG` environment variable
2. Initialize database connection with 30-second retry logic
3. Register core blueprints (main, auth, survey, admin, health)
4. Conditionally register optional blueprints (api_safework_v2, documents)
5. Create anonymous user (id=1) and admin user if they don't exist
6. Initialize migration manager for schema version tracking

### Port Mapping (Docker)
```yaml
# Internal container ports vs external host ports
safework-app: 4545 (internal) → 4545 (external)
safework-mysql: 3306 (internal) → 3307 (external) 
safework-redis: 6379 (internal) → 6380 (external)
```

### Admin Panel Architecture Notes
- **Route Protection**: All admin routes use `@admin_required` decorator with `is_admin` flag check
- **Sample Data**: Routes include comprehensive sample data for immediate testing and demonstration
- **Bootstrap Components**: Consistent use of cards, tables, modals, and responsive grid system
- **CSRF Protection**: All forms include Flask-WTF CSRF tokens for security
- **Excel Export**: Each data table includes export functionality using openpyxl library
- **Search & Filter**: Client-side search functionality implemented with jQuery DataTables
- **Modal Forms**: Add/edit operations use Bootstrap modals for better UX
- **Status Indicators**: Color-coded status badges and progress indicators throughout interface