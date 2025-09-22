# CLAUDE.md

SafeWork 프로젝트 개발 가이드 - Claude Code 전용 설정 문서

## 프로젝트 개요

SafeWork은 한국 건설/산업 환경을 위한 Flask 3.0+ 기반 산업보건 관리 시스템입니다. 작업장 건강 설문, 의료 기록, 종합 안전 관리와 MSDS 관리 및 자동화된 모니터링 시스템을 제공합니다.

**핵심 기능:**
- **설문 시스템**: 001 근골격계증상조사표, 002 신규입사자건강진단 양식
- **SafeWork 관리자**: 13개 전문 관리 패널 (근로자, 건강검진, 의약품, MSDS 등)
- **문서 관리**: 버전 제어 및 접근 로그 시스템
- **익명 접근**: user_id=1을 통한 공개 설문 제출
- **RESTful API v2**: `/api/safework/v2/*` 외부 시스템 연동

**기술 스택:**
- 백엔드: Flask 3.0+, SQLAlchemy 2.0, PostgreSQL 15+, Redis 7.0
- 프론트엔드: Bootstrap 4.6, jQuery, 한국어 반응형 디자인
- 인프라: 독립 Docker 컨테이너, Private Registry (registry.jclee.me), Portainer API
- 개발: Makefile 자동화, 종합 도구, 볼륨 지속성
- 데이터베이스: PostgreSQL 15+ 자동 스키마 마이그레이션 및 데이터 지속성
- 보안: Flask-Login 인증, 환경 기반 구성
- 테스트: 헬스 체크 및 API 검증을 포함한 자동화된 테스트 러너
- 코드 품질: Black 포매터, Flake8 린터 및 pre-commit 훅
- 배포: Git 변경 추적 및 안전 검사를 포함한 검증된 Portainer 스택 배포

## Architecture Overview (Big Picture)

**Container Architecture**: 3 independent Docker containers (no docker-compose dependency)
- `safework-app` (Flask application, port 4545)
- `safework-postgres` (PostgreSQL 15+, port 4546)
- `safework-redis` (Redis 7.0, port 4547)

**Deployment Strategy**: Portainer API-based stack deployment (Stack ID: 43, Endpoint 3)
- Production: https://safework.jclee.me
- Registry: registry.jclee.me (private)
- GitHub Actions: 활성화됨 - git push로 자동 도커 이미지 빌드/푸시

**Key Configuration**:
- Database: `safework_db` (NOT `safework`)
- Timezone: KST (Asia/Seoul) for all operations
- Admin: admin/safework2024
- Scripts: Common libraries in `scripts/lib/`, centralized config in `scripts/config/master.env`

## 📚 Common Libraries & Configuration System

### **Recent Enhancement (2025-09-21)**: Eliminated code duplication across 16 scripts by creating reusable common libraries and centralized configuration.

#### Core Libraries
- **scripts/lib/logging.sh**: Standardized logging with color support and multiple log levels
- **scripts/lib/portainer.sh**: Portainer API operations library with comprehensive error handling
- **scripts/config/master.env**: Centralized configuration management for all environment variables

#### Usage Pattern in Scripts
```bash
# Source common libraries (standard pattern)
SCRIPT_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_LIB_DIR/lib/logging.sh"
source "$SCRIPT_LIB_DIR/lib/portainer.sh"

# Load centralized configuration
source "$SCRIPT_LIB_DIR/config/master.env"

# Example usage
log_info "Starting deployment process"
test_portainer_connection
check_container_status "safework-app"
```

#### Master Configuration (scripts/config/master.env)
**All environment variables consolidated into single master file:**
```bash
# Portainer API 설정 (Production Verified ✅)
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="

# Endpoint 설정
ENDPOINT_PRODUCTION="3"    # ✅ Active production endpoint
ENDPOINT_DEV="2"          # ✅ Development endpoint
ENDPOINT_SYNOLOGY="1"     # ✅ Recently validated

# Database 설정 (PostgreSQL 15+)
DB_HOST="safework-postgres"
DB_NAME="safework_db"     # ✅ Verified production database name
DB_USER="safework"
DB_PASSWORD="safework2024"

# Container 설정
APP_PORT="4545"           # ✅ Production port confirmed
POSTGRES_PORT="5432"
REDIS_PORT="6379"
```

#### Benefits of Common Libraries System
- **Code Reuse**: Eliminated 500+ lines of duplicate code across scripts
- **Consistency**: Standardized logging and API calls across all operations
- **Maintainability**: Single point of updates for common functionality
- **Error Handling**: Centralized error handling patterns with proper logging
- **Configuration Management**: Single source of truth for all environment variables

## Development Commands

### ⚡ Most Essential Commands (Start Here)
```bash
# System Health Check
make health                                          # Complete system status
curl https://safework.jclee.me/health              # Production verification

# Deployment Management
./scripts/portainer_stack_deploy.sh status         # Current deployment status
./scripts/portainer_stack_deploy.sh deploy         # Deploy to production
make deploy                                         # Alternative deployment

# Database Operations
make db-status                                      # Migration status
make db-migrate                                     # Apply migrations
make db-shell                                       # PostgreSQL CLI

# Development
make build                                          # Build containers
make up                                             # Start development
make logs                                           # View logs
```

### 🎯 Quick Start for New Claude Instances
```bash
# 1. FIRST: Verify system health and connectivity
make health                                    # Overall system status
curl https://safework.jclee.me/health        # Production health check

# 2. VALIDATE: Deployment system integrity
./scripts/portainer_stack_deploy.sh --validate  # Comprehensive validation

# 3. STATUS: Check current deployment
./scripts/portainer_stack_deploy.sh status    # Current stack status
./scripts/portainer_stack_deploy.sh health    # Container health check

# 4. LOGS: View application logs when needed
./scripts/portainer_stack_deploy.sh logs safework-app  # Application logs
make logs                                      # Alternative log viewing

# 5. DATABASE: Essential database operations
make db-status                                 # Check migration status
docker exec -it safework-app python migrate.py migrate  # Apply migrations

# 6. TESTING: Verify core functionality
curl -X POST https://safework.jclee.me/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type":"001","name":"테스트","age":30}'   # Test survey submission
```

### 🚨 Critical Information for New Instances
- **Primary Deployment**: **GitHub Actions** - git push 자동으로 도커 이미지 빌드/푸시
- **GitHub Actions**: 활성화됨 (`.github/workflows/deploy.yml`) - 단순화된 파이프라인
- **Registry**: registry.jclee.me에 자동 이미지 푸시
- **Production URL**: https://safework.jclee.me
- **Container Names**: safework-app, safework-postgres, safework-redis
- **Database Name**: Use `safework_db` (NOT `safework`) for all operations
- **Admin Credentials**: admin / safework2024 (for /admin access)
- **Timezone**: All operations use KST (Asia/Seoul) timezone

### Essential Daily Workflow (Top Priority)
```bash
# 🚀 MOST IMPORTANT: Quick system health check
make health                                         # System health + container status
curl https://safework.jclee.me/health              # Production health check

# 🔥 CRITICAL: Deploy to production (자동화된 파이프라인)
make deploy                                         # git push로 자동 이미지 빌드/푸시
make deploy-status                                  # GitHub Actions 상태 확인

# 📋 DEBUGGING: View real-time logs
make logs                                           # Live application logs
./scripts/safework_ops_unified.sh logs live safework-app 100  # Real-time with 100 lines

# 🗄️ DATABASE: Most common database operations
make db-status                                      # Check migration status
docker exec -it safework-app python migrate.py migrate  # Apply pending migrations
docker exec -it safework-postgres psql -U safework -d safework_db  # Direct database access

# 🧪 TESTING: Critical endpoint verification
curl -X POST https://safework.jclee.me/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type":"001","name":"테스트","age":30}'   # Test survey submission
```

### Validated Deployment System (Recently Tested ✅)
```bash
# 🎯 MAIN DEPLOYMENT SCRIPT (Fully Validated)
./scripts/portainer_stack_deploy.sh --help          # Show all available commands
./scripts/portainer_stack_deploy.sh --validate      # Comprehensive validation
./scripts/portainer_stack_deploy.sh status          # Current stack status
./scripts/portainer_stack_deploy.sh health          # Health check all containers
./scripts/portainer_stack_deploy.sh logs safework-app  # View container logs

# 🔧 CONFIGURATION REQUIREMENTS (Critical)
# All required environment variables configured in scripts/config/portainer_config.env:
# - ENDPOINT_PRODUCTION="3" ✅
# - ENDPOINT_DEV="2" ✅  
# - ENDPOINT_SYNOLOGY="1" ✅ (Recently fixed)
# - PORTAINER_URL and PORTAINER_TOKEN ✅

# ⚠️ DEPLOYMENT SAFETY FEATURES
# - Git change tracking prevents unsafe deployments
# - Automatic validation before any operations
# - Health checks verify container status
# - Comprehensive error handling and rollback support
```

### Quick Reference (Most Common Commands)
```bash
# 🚀 Enhanced Deployment & Status (Post-Refactoring)
make deploy                                         # Trigger GitHub Actions deployment
make health                                         # System health check
./scripts/portainer_stack_deploy.sh deploy         # Direct Portainer stack deployment (Recommended)
./scripts/portainer_stack_deploy.sh status         # Current deployment status
./scripts/portainer_stack_deploy.sh --validate     # Pre-deployment validation

# 📚 Configuration & Libraries (New System)
cat scripts/config/master.env | grep -E "(PORTAINER|DB_|ENDPOINT)"  # Check master config
source scripts/lib/logging.sh && log_info "Library test"           # Test logging library
source scripts/lib/portainer.sh && test_portainer_connection       # Test Portainer library

# 📋 Monitoring & Logs
make logs                                           # Live application logs
make logs-errors                                    # Filter error logs only
make portainer                                      # Advanced Portainer management (interactive)
make portainer-monitor                              # Resource monitoring

# 🧪 Testing & Validation
make test                                           # Run comprehensive tests
make test-api                                       # Test API endpoints
make validate                                       # Validate CI/CD pipeline
curl https://safework.jclee.me/health              # Production health check

# 🗄️ Database Management
make db-status                                      # Check migration status
make db-migrate                                     # Run migrations
make db-shell                                       # PostgreSQL CLI access
make db-backup                                      # Create database backup

# 🔧 Code Quality
make format                                         # Format code with Black
make lint                                          # Lint code with Flake8
make check                                         # Run both format and lint

# 🐳 Container Management
make build                                         # Build Docker images
make pull                                          # Pull latest images from registry
make up                                            # Start development environment
make down                                          # Stop development environment
make update                                        # Pull latest images and restart
make restart                                       # Restart all services

# 📦 Docker Compose (New - Simplified Deployment)
docker-compose up -d                               # Start all services
docker-compose down                                # Stop all services
docker-compose pull && docker-compose up -d       # Manual update workflow

# 📊 Volume Management
./scripts/volume_manager.sh status          # Check volume status
./scripts/volume_manager.sh backup          # Backup all data
./scripts/volume_manager.sh verify          # Verify data integrity

# 🛠️ Development Helpers
make help                                          # Show all available Makefile commands
make info                                          # Display project information and URLs
make clean                                         # Clean build artifacts and caches
make dev-setup                                     # Complete development environment setup
```

### Container Deployment via GitHub Actions CI/CD

**✅ PRODUCTION CONTAINER NAMING**: Verified production uses `safework-*` naming scheme (app, postgres, redis)

**단순화된 배포 프로세스:**
1. **Push to master branch** → GitHub Actions 워크플로우 자동 트리거
2. **Build & Push Images** → 모든 컨테이너 빌드 후 registry.jclee.me에 푸시
3. **완료** → 이미지 업데이트 완료 (수동 배포는 별도 진행)

```bash
# 단순화된 배포 트리거 (이미지 업데이트만)
git add .
git commit -m "Update: SafeWork 코드 변경사항"
git push origin master

# GitHub Actions에서 자동 실행:
# 1. safework/app, safework/postgres, safework/redis 이미지 빌드
# 2. registry.jclee.me에 latest 태그로 푸시
# 3. 완료 - 이미지 업데이트 완료

# Production health verification
curl -s https://safework.jclee.me/health
# Response: {"service":"safework","status":"healthy","timestamp":"2025-09-17T10:09:15.655985"}
```

### Unified Operations Management
```bash
# 🚀 UNIFIED SAFEWORK OPERATIONS SCRIPT - One command for all operations
./scripts/safework_ops_unified.sh [COMMAND] [OPTIONS]

# 📊 DEPLOYMENT COMMANDS
./scripts/safework_ops_unified.sh deploy status           # Show all container status + production health
./scripts/safework_ops_unified.sh deploy github          # Trigger GitHub Actions deployment
./scripts/safework_ops_unified.sh deploy local           # Run local deployment

# 📋 LOG MANAGEMENT COMMANDS
./scripts/safework_ops_unified.sh logs live [container] [lines]    # Real-time log streaming
./scripts/safework_ops_unified.sh logs recent [container] [lines]  # Recent logs
./scripts/safework_ops_unified.sh logs errors [container]          # Filter error logs only

# 🔍 MONITORING COMMANDS
./scripts/safework_ops_unified.sh monitor overview        # Complete system overview with container info
./scripts/safework_ops_unified.sh monitor health          # Comprehensive health check with scoring
./scripts/safework_ops_unified.sh monitor performance     # Performance metrics and resource usage

# 🛠️ UTILITY COMMANDS
./scripts/safework_ops_unified.sh utils containers        # List all SafeWork containers
./scripts/safework_ops_unified.sh utils cleanup           # Clean up stopped containers and unused images
./scripts/safework_ops_unified.sh utils backup            # Backup database and configurations
./scripts/safework_ops_unified.sh utils restore [file]    # Restore from backup file
```

### System Validation & Deployment Verification
```bash
# Automated system validation
./scripts/pipeline_validator.sh        # Complete CI/CD pipeline validation
./scripts/test_runner.sh              # Comprehensive automated testing
./scripts/integrated_build_deploy.sh  # Unified build and deployment

# Deployment verification commands
./scripts/integrated_build_deploy.sh status  # Current system status check
./scripts/portainer_simple.sh status         # Production container health via Portainer API

# Comprehensive deployment verification
curl -s https://safework.jclee.me/health | jq .  # Health endpoint check
curl -s -X POST https://safework.jclee.me/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type":"001","name":"테스트","age":30}' # API functionality test
```

### Manual Container Setup (Development Only)
```bash
# CRITICAL: Use correct image names (consistent with production)
docker pull registry.jclee.me/safework/app:latest
docker pull registry.jclee.me/safework/postgres:latest
docker pull registry.jclee.me/safework/redis:latest

# Start PostgreSQL with KST timezone and automated schema migration
docker run -d --name safework-postgres --network safework_network -p 4546:5432 \
  -e TZ=Asia/Seoul -e POSTGRES_PASSWORD=${DB_PASSWORD} -e POSTGRES_DB=${DB_NAME:-safework_db} -e POSTGRES_USER=${DB_USER:-safework} \
  registry.jclee.me/safework/postgres:latest

# Start Redis with clean state
docker run -d --name safework-redis --network safework_network -p 4547:6379 \
  -e TZ=Asia/Seoul \
  registry.jclee.me/safework/redis:latest

# Start application with correct database name (safework_db) and KST timezone
docker run -d --name safework-app --network safework_network -p 4545:4545 \
  -e TZ=Asia/Seoul -e DB_HOST=safework-postgres -e DB_NAME=${DB_NAME:-safework_db} -e DB_USER=${DB_USER:-safework} \
  -e DB_PASSWORD=${DB_PASSWORD} -e REDIS_HOST=safework-redis \
  registry.jclee.me/safework/app:latest
```

### Code Quality & Linting
```bash
# Python code formatting and linting (defined in requirements.txt)
cd src/app
black . --line-length 88              # Format code (matching Makefile config)
flake8 . --max-line-length=88 --extend-ignore=E203,W503  # Lint with proper config
python -m py_compile *.py              # Syntax check

# Makefile shortcuts for code quality
make format                            # Run Black formatter
make lint                              # Run Flake8 linter
make check                             # Run both format and lint

# Check for common issues
grep -r "print(" . --include="*.py"    # Find debug prints
grep -r "TODO\|FIXME" . --include="*.py"  # Find TODOs

# Security checks
grep -r "password.*=" . --include="*.py" | grep -v "environ.get\|config" # Check hardcoded passwords
grep -r "api.*key.*=" . --include="*.py" | grep -v "environ.get\|config" # Check hardcoded API keys
```

### Database Management
```bash
# Enter app container
docker exec -it safework-app bash

# Migration commands (inside container)
python migrate.py status               # Check migration status
python migrate.py migrate              # Apply migrations
python migrate.py create "Description" # Create new migration

# Database inspection (PostgreSQL)
docker exec -it safework-postgres psql -U safework -d safework_db -c "\dt;"
docker exec -it safework-postgres psql -U safework -d safework_db -c "\d surveys;"

# Check specific survey data
docker exec -it safework-postgres psql -U safework -d safework_db -c "SELECT id, name, form_type, responses FROM surveys ORDER BY id DESC LIMIT 5;"
```

### API Testing & Debugging
```bash
# Test survey submission API (critical endpoint)
curl -X POST ${LOCAL_URL:-http://localhost:4545}/survey/api/submit \
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
curl ${LOCAL_URL:-http://localhost:4545}/health              # Application health
curl https://safework.jclee.me/health         # Production health

# Verify database connectivity from container (SQLAlchemy 2.0 compatible)
docker exec -it safework-app python -c "
from app import create_app
from models import Survey, db
app = create_app()
with app.app_context():
    print(f'Survey count: {Survey.query.count()}')
    print('Database connection: OK')
"
```

### Access Points & Credentials
**Local Development:**
- **Main app**: ${LOCAL_URL:-http://localhost:4545}
- **PostgreSQL**: localhost:${DB_PORT:-4546} (safework-postgres container)
- **Redis**: localhost:${REDIS_PORT:-4547} (safework-redis container)
- **Admin panel**: ${LOCAL_URL:-http://localhost:4545}/admin (${ADMIN_USERNAME:-admin}/${ADMIN_PASSWORD})
- **Health check**: ${LOCAL_URL:-http://localhost:4545}/health
- **Migration UI**: ${LOCAL_URL:-http://localhost:4545}/migration/status

**Remote Environments:**
- **Development**: https://safework-dev.jclee.me
- **Production**: https://safework.jclee.me

## Architecture Overview

### Flask Application Factory (src/app/app.py)
```python
def create_app(config_name=None):
    # Factory pattern with config-based initialization
    # Extensions: SQLAlchemy, Flask-Login, Flask-Migrate, Redis
    # CSRF: Currently disabled (WTF_CSRF_ENABLED = False)
    # Blueprints: 15+ modular route handlers auto-registered
    # System uptime tracking and version management via Git
    # Context processors for template globals and URL routing

    # Critical: Uses PostgreSQL connection with pool management
    # Pool settings: pool_size=10, pool_recycle=3600, pool_pre_ping=True
    # Database URI pattern: postgresql+psycopg2://safework:password@safework-postgres:5432/safework_db
```

### Key Architectural Patterns
**Application Factory Pattern:**
- Environment-based configuration (development/production/testing)
- Modular blueprint registration in `app.py`
- Extension initialization with proper app context
- Runtime database connection handling with retry logic

**Connection Retry & Health Check System:**
- Database: 60 retries with 3-second delays, pool management with pre-ping
- Redis: 10 retries with 1-second delays, graceful degradation if unavailable
- Health endpoints: `/health` (basic) and `/health/detailed` (comprehensive)
- Container readiness: Built-in connection validation before service startup

**Korean Timezone (KST) Management:**
- All timestamps use `kst_now()` function for consistency
- Container-level timezone: `TZ=Asia/Seoul` environment variable
- Database timezone: Enforced at PostgreSQL container level
- Application timezone: Handled via `datetime.timezone(timedelta(hours=9))`

**Migration System:**
- Custom migration manager in `migration_manager.py`
- Web interface for migration status at `/admin/migration/status`
- Version-controlled database schema changes
- Automatic admin user creation via migrations

**Container Independence & Schema Migration:**
- No docker-compose dependency - each service runs independently
- Automated PostgreSQL schema migration via init.sql and migration scripts
- Health checks and restart policies in Dockerfiles
- Volume declarations for data persistence
- Container network communication via internal DNS
- KST timezone enforcement across all containers

### Model Architecture & Database Design
**Core Models (src/app/models.py):**
- `User`: Flask-Login authentication integration
- `Survey`: Unified table for 001/002 forms using `form_type` discriminator + JSON `responses` field
- `AuditLog`: System activity tracking
- `kst_now()`: Consistent KST timezone function for all timestamps

**SafeWork Models (src/app/models_safework.py + models_safework_v2.py):**
- 13+ specialized tables: `safework_workers`, `safework_health_checks`, `safework_medications`, etc.
- Industrial safety management domain models

**Document Models (src/app/models_document.py):**
- `Document`, `DocumentVersion`, `DocumentAccessLog`: Version control with access tracking

**Key Database Patterns:**
```sql
-- Survey system with discriminator
surveys.form_type = '001' | '002'  -- Form type identifier
surveys.responses (JSONB)          -- Flexible form field storage (PostgreSQL JSONB)

-- Anonymous submissions
user_id = 1  -- Special user for anonymous form submissions

-- Korean localization
created_at = kst_now()  -- Always use KST timezone
```

### Flask Route Architecture
```
src/app/routes/
├── __init__.py              # Route package initialization
├── admin.py                 # 13 SafeWork admin panels + main admin dashboard
├── admin_legacy.py          # Legacy admin routes (deprecated)
├── api_safework_v2.py       # RESTful API v2 endpoints for external systems
├── api_safework.py          # Legacy API endpoints
├── survey.py                # 001/002 form handling with conditional JavaScript
├── auth.py                  # Flask-Login authentication (${ADMIN_USERNAME:-admin}/${ADMIN_PASSWORD})
├── health.py                # System health monitoring (/health endpoint)
├── document.py              # Public document access (version control)
├── document_admin.py        # Admin document management
├── main.py                  # Homepage and general routes
├── migration.py             # Database migration web interface
├── monitoring.py            # System monitoring endpoints
├── notification_system.py   # Notification system routes
├── raw_data_admin.py        # Raw data management
└── safework_reports.py      # SafeWork reporting functionality
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

### Configuration Management
**Multi-Environment Setup (src/app/config.py):**
```python
# Environment-specific database configuration
config = {
    "development": DevelopmentConfig,  # PostgreSQL, CSRF disabled
    "production": ProductionConfig,    # PostgreSQL, CSRF disabled
    "testing": TestingConfig,          # PostgreSQL, CSRF disabled
    "default": DevelopmentConfig,
}

# Key configuration patterns:
# - Consistent PostgreSQL across all environments
# - CSRF protection completely disabled across all environments
# - File upload limits: 50MB with specific allowed extensions
# - Session configuration with security headers
# - Redis integration for caching and session storage
# - Environment variable support for all database settings
```

**SafeWork Admin Panel Pattern:**
```python
# 1. Model Definition (src/app/models_safework.py)
class SafeworkWorker(db.Model):
    __tablename__ = "safework_workers"

# 2. API Endpoint (src/app/routes/api_safework_v2.py)
@api_safework_bp.route('/workers', methods=['GET', 'POST'])
@login_required
def handle_workers():
    # CRUD operations with JSON responses

# 3. Admin Interface (src/app/routes/admin.py + templates/admin/safework/)
@admin_bp.route('/safework/workers')
@login_required
def safework_workers():
    # Bootstrap 4.6 + jQuery AJAX integration
```

## Deployment & Infrastructure

### Validated Portainer Stack Deployment (Production-Ready ✅)
**Primary Deployment Method**: Direct Portainer API v2.x stack management with comprehensive validation

```bash
# 🎯 MAIN DEPLOYMENT SCRIPT (Recently Validated)
./scripts/portainer_stack_deploy.sh

# Available Commands:
--validate          # Comprehensive pre-deployment validation
status             # Check current stack and container status  
health             # Health check all SafeWork containers
logs <container>   # View real-time container logs
list               # List all stacks on all endpoints
deploy             # Deploy stack with safety checks
update             # Update existing stack
rollback           # Rollback to previous version

# 🔧 CRITICAL CONFIGURATION (All Variables Verified)
# scripts/config/portainer_config.env contains:
PORTAINER_URL="https://portainer.jclee.me"     # ✅ Tested
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="  # ✅ Valid
ENDPOINT_PRODUCTION="3"                        # ✅ Active endpoint
ENDPOINT_DEV="2"                              # ✅ Available 
ENDPOINT_SYNOLOGY="1"                         # ✅ Recently fixed

# ⚠️ DEPLOYMENT SAFETY FEATURES
- Git change tracking (prevents deployment with uncommitted changes)
- Automatic validation before any operations
- Health monitoring of all containers
- Comprehensive error handling and logging
- Rollback support for failed deployments
```

**Deployment Validation Results** (Last tested: 2025-09-21):
- ✅ All environment variables loaded correctly
- ✅ Portainer API connectivity confirmed
- ✅ Stack ID 43 on Endpoint 3 identified  
- ✅ All 3 containers (app, postgres, redis) healthy
- ✅ Git change tracking working correctly
- ✅ Log retrieval and health checks functional

### GitHub Actions CI/CD Pipeline (단순화됨)
**Status**: 활성화됨 - 단순화된 도커 이미지 빌드/푸시 파이프라인

**워크플로우 기능**:
- Git push 시 자동 트리거
- 3개 서비스 병렬 빌드 (app, postgres, redis)
- registry.jclee.me에 자동 푸시
- 복잡한 배포 로직 제거됨

**Primary Method**: `make deploy` 또는 직접 git push

### Infrastructure Components
- **Registry**: registry.jclee.me (credentials in GitHub secrets)
- **Production**: https://safework.jclee.me
- **Development**: https://safework-dev.jclee.me
- **Portainer**: portainer.jclee.me (Container management and log viewing via API)
- **Portainer API**: Direct container management and deployment orchestration
- **Images**:
  - registry.jclee.me/safework/app:latest
  - registry.jclee.me/safework/postgres:latest
  - registry.jclee.me/safework/redis:latest

### Independent Container Architecture
SafeWork uses **completely independent Docker containers** with no docker-compose dependency:
- Each service (app, postgres, redis) has its own Dockerfile and .dockerignore
- Portainer API orchestration for zero-downtime deployment
- Health checks implemented for all services
- Connection retry logic for independent startup
- Matrix build system in GitHub Actions for parallel deployment

### Required GitHub Secrets
```bash
# Core deployment secrets
APP_NAME=safework                        # Application name for container naming
REGISTRY_HOST=registry.jclee.me         # Docker registry host
REGISTRY_USER=admin                     # Registry username
REGISTRY_PASSWORD=<password>             # Docker registry auth
# Portainer API for direct container management
PORTAINER_API_KEY=<token>                # Portainer API key for container operations

# Database credentials
POSTGRES_PASSWORD=<password>             # PostgreSQL password
POSTGRES_DB=safework_db                  # Database name
POSTGRES_USER=safework                   # Database username
SECRET_KEY=<secret>                      # Flask secret key

# Environment URLs
PRD_URL=https://safework.jclee.me       # Production URL
DEV_URL=https://safework-dev.jclee.me   # Development URL
PORTAINER_URL=https://portainer.jclee.me # Portainer URL (log viewing only)

# Claude AI Integration (CRITICAL for workflows)
CLAUDE_CODE_OAUTH_TOKEN=<token>          # Claude Code automation
GITHUB_TOKEN=<token>                     # GitHub API access for Claude workflows
PORTAINER_API_KEY=<token>                # Portainer API key

# Optional automation
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/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  # Slack notifications (configured)
```

### Claude AI Workflow Integration
**Trigger Methods:**
- **Issue Comments**: `@claude` in any issue comment
- **PR Comments**: `@claude` in pull request discussions
- **Issue Labels**: Issues with `claude-actionable` or `needs-analysis` labels
- **Workflow Failures**: Automatic CI failure analysis and repair
- **Dependency Updates**: Weekly automated dependency scans

**AI Capabilities:**
- Intelligent issue triage with automatic labeling (14 categories)
- Comprehensive PR reviews with 5-dimensional analysis
- Automatic CI/CD failure detection and repair
- Korean language support for industrial safety context
- SafeWork-specific domain knowledge integration

## Portainer Container Operations

### Direct Container Management
```bash
# Check SafeWork container status via Portainer API
curl -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/json" | \
  jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0] + " - " + .State'

# Restart SafeWork containers directly
curl -X POST -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/safework-app/restart"

# Pull latest images and update containers
curl -X POST -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  -H "Content-Type: application/json" \
  "https://portainer.jclee.me/api/endpoints/3/docker/images/create" \
  -d '{"fromImage": "registry.jclee.me/safework/app:latest"}'
```

### Portainer API Container Management & Simplified Scripts
```bash
# Use simplified Portainer query scripts (recommended)
./scripts/portainer_simple.sh status        # Check SafeWork container status
./scripts/portainer_simple.sh running       # List running containers only
./scripts/portainer_simple.sh logs safework-app  # View specific container logs
./scripts/portainer_simple.sh network       # Check network configuration
./scripts/portainer_simple.sh               # Show all information

# Advanced Portainer management (interactive)
./scripts/portainer_advanced.sh summary      # Container status summary
./scripts/portainer_advanced.sh logs         # Interactive log viewing
./scripts/portainer_advanced.sh monitor      # Resource monitoring
./scripts/portainer_advanced.sh health       # Health status check
./scripts/portainer_advanced.sh network      # Network information
./scripts/portainer_advanced.sh backup       # System backup
./scripts/portainer_advanced.sh interactive  # Interactive menu
```

## Recent Fixes & Validation (2025-09-21)

### ✅ Deployment Script Validation Completed
**Issue Resolved**: Missing `ENDPOINT_SYNOLOGY` environment variable in portainer_stack_deploy.sh
- **Error**: `ENDPOINT_SYNOLOGY: unbound variable` at line 624
- **Fix**: Added `ENDPOINT_SYNOLOGY="1"` to `scripts/config/portainer_config.env`
- **Commit**: "Fix: Add missing ENDPOINT_SYNOLOGY configuration"
- **Validation**: All deployment script functions now working correctly

**Verified Working Functions**:
```bash
./scripts/portainer_stack_deploy.sh --validate  # ✅ Pre-deployment validation
./scripts/portainer_stack_deploy.sh status      # ✅ Stack status checking
./scripts/portainer_stack_deploy.sh health      # ✅ Container health monitoring
./scripts/portainer_stack_deploy.sh logs        # ✅ Log retrieval
./scripts/portainer_stack_deploy.sh list        # ✅ Stack listing
```

**Git Safety Features Confirmed**:
- ✅ Detects uncommitted changes and prevents unsafe deployment
- ✅ Warns about unsynchronized remote branches
- ✅ Comprehensive validation before any operations

### 🔧 Configuration Requirements Verified
All required environment variables now properly configured:
- `PORTAINER_URL`: https://portainer.jclee.me ✅
- `PORTAINER_TOKEN`: Valid API token ✅
- `ENDPOINT_PRODUCTION="3"`: Active production endpoint ✅
- `ENDPOINT_DEV="2"`: Development endpoint ✅
- `ENDPOINT_SYNOLOGY="1"`: Fixed missing variable ✅

### 🚀 Code Quality Improvements & Refactoring (2025-09-21)

#### Major Refactoring Achievements
- **Duplicate Code Elimination**: Removed 500+ lines of duplicate code across 16 scripts
- **Common Libraries Creation**:
  - `scripts/lib/logging.sh`: Standardized logging across all scripts
  - `scripts/lib/portainer.sh`: Centralized Portainer API operations
- **Configuration Consolidation**: All environment variables moved to `scripts/config/master.env`
- **Script Standardization**: Consistent error handling and logging patterns

#### Deployment Validation Results ✅
```bash
# Production deployment successfully completed with new architecture
./scripts/portainer_stack_deploy.sh deploy
# ✅ All containers healthy (safework-app, safework-postgres, safework-redis)
# ✅ Production URL responding: https://safework.jclee.me/health
# ✅ Database connectivity verified
# ✅ Git repository synchronized and committed
```

#### Architecture Benefits
- **Maintainability**: Single point of updates for common functionality
- **Consistency**: Standardized logging and API calls across all operations
- **Reliability**: Centralized error handling with proper logging
- **Safety**: Git change detection prevents unsafe deployments
- **Scalability**: Modular design supports easy addition of new scripts

## Error Detection & Resolution

### Quick Problem Resolution (First Steps)
```bash
# 🚨 EMERGENCY: If production is down
./tools/scripts/emergency_recovery_simple.sh       # Auto-fix production issues
curl https://safework.jclee.me/health             # Verify recovery

# 🔍 DIAGNOSIS: Check what's wrong
make health                                        # Overall system health
./scripts/safework_ops_unified.sh deploy status   # Deployment status
./scripts/safework_ops_unified.sh logs errors all # Find error logs

# 🔄 RESTART: If containers are stuck
make restart                                       # Restart all containers
./scripts/portainer_operations_deploy.sh restart  # Portainer-based restart

# 🗄️ DATABASE: If database issues
docker exec -it safework-postgres psql -U safework -d safework_db -c "SELECT 1;" # Test connection
docker exec -it safework-app python migrate.py status  # Check migrations
make db-migrate                                    # Apply pending migrations
```

### Common Container Issues & Critical Fixes
**Database Connection Issues (Most Common):**
- `FATAL: database "safework" does not exist` → **SOLUTION**: Use `DB_NAME=safework_db` (not `safework`)
- `connection to server at "safework-postgres" port 5432 failed: Connection refused` → **SOLUTION**: Ensure PostgreSQL container fully initialized before app starts
- `column "submission_date" of relation "surveys" does not exist` → **SOLUTION**: Automated migration system handles this

**Import and Model Issues:**
- `ImportError: cannot import name 'AuditLog' from 'models'` → **CRITICAL**: Missing model aliases in models.py
- `'data' is an invalid keyword argument for SurveyModel` → **SOLUTION**: Uncommented data field in models.py
- `Working outside of application context` → **SOLUTION**: Use Flask app context for database operations

**Container Issues:**
- `gunicorn.errors.HaltServer` → Flask app import path verification
- `Worker failed to boot` → Dependencies and environment validation
- Redis AOF permission errors → **SOLUTION**: Remove and recreate Redis container with clean state
- Container timezone issues → **SOLUTION**: Add `-e TZ=Asia/Seoul` to all container runs

**Slack Notification Issues:**
- `invalid_auth` error → **SOLUTION**: Verify SLACK_BOT_TOKEN is valid using auth.test API
- `missing_scope` error → **SOLUTION**: Ensure bot has `chat:write`, `chat:write.public`, `channels:read` permissions
- `channel_not_found` error → **SOLUTION**: Invite bot to target channel or use public channel
- Webhook vs OAuth priority → **PRIORITY**: SLACK_WEBHOOK_URL > SLACK_OAUTH_TOKEN > SLACK_BOT_TOKEN
- Container notification mismatch → **WORKAROUND**: Current container only supports webhook; use direct API calls for OAuth

### Troubleshooting Commands
```bash
# Container status (correct container names)
docker ps                                           # Check container status
docker logs -f safework-app                         # View application logs
docker logs -f safework-postgres                    # View database logs

# Force GitHub Actions re-deployment
git commit --allow-empty -m "Trigger: Force redeploy"
git push origin master                              # Triggers GitHub Actions build

# Independent container restart (use GitHub Actions images)
docker stop safework-app safework-postgres safework-redis
docker rm safework-app safework-postgres safework-redis

# Database management
docker exec -it safework-app python migrate.py status              # Check migration status
docker exec -it safework-app python migrate.py migrate             # Run migrations

# Portainer API debugging (endpoint 3)
curl -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
     "https://portainer.jclee.me/api/endpoints/3/docker/containers/json" # List containers

# Direct PostgreSQL access (current production database)
docker exec -it safework-postgres psql -U safework -d safework_db   # PostgreSQL CLI

# Database connectivity verification (critical for troubleshooting)
docker exec safework-app python -c "
from app import create_app
from models import Survey, db
app = create_app()
with app.app_context():
    try:
        count = Survey.query.count()
        print(f'✅ Database connection successful! Survey count: {count}')
    except Exception as e:
        print(f'❌ Database connection failed: {e}')
"

# Slack OAuth testing
./scripts/test_slack_oauth.sh                       # Test Slack OAuth configuration
docker exec safework-app env | grep SLACK           # Check Slack environment variables

# Slack API testing (direct)
curl -X POST "https://slack.com/api/auth.test" \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN"       # Test bot token validity

curl -X POST "https://slack.com/api/chat.postMessage" \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel": "#safework-alerts", "text": "Test message"}' # Test message sending

# UNIFIED TROUBLESHOOTING
# Use unified operations script for streamlined troubleshooting workflow

# Quick system health check
./scripts/safework_ops_unified.sh monitor health         # Comprehensive health assessment
./scripts/safework_ops_unified.sh deploy status          # Current deployment status

# Analyze production issues
./scripts/safework_ops_unified.sh logs errors all        # Find all error logs
./scripts/safework_ops_unified.sh logs recent all 50     # Recent activity across containers
./scripts/safework_ops_unified.sh monitor performance    # Performance metrics

# Real-time monitoring
./scripts/safework_ops_unified.sh logs live safework-app # Live application logs
./scripts/safework_ops_unified.sh monitor overview       # Complete system overview

# Survey form debugging
# - Verify HTML/JavaScript ID matching (critical for conditional logic)
# - Ensure user_id=1 exists for anonymous submissions
# - Use kst_now() consistently for Korean timezone
# - Check submission_date column exists (handled by automated migration)
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
FLASK_CONFIG=production                # Environment mode (development/production/testing)
SECRET_KEY=safework-production-secret-key-2024
TZ=Asia/Seoul                         # Korean timezone

# Slack Notifications (OAuth Configuration)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here      # Slack Bot token for notifications
SLACK_OAUTH_TOKEN=xoxp-your-oauth-token-here  # Slack OAuth User token (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/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 # Webhook URL (configured)

# Database connection (PostgreSQL)
DB_HOST=safework-postgres             # Container name
DB_PORT=5432                          # PostgreSQL port
DB_NAME=safework_db                   # Database name
DB_USER=safework                      # Database user
DB_PASSWORD=${DB_PASSWORD}              # Database password (must be set)

# Database pool settings
DB_POOL_SIZE=10                       # Connection pool size
DB_POOL_TIMEOUT=30                    # Pool timeout seconds
DB_POOL_RECYCLE=3600                  # Pool recycle time
DB_POOL_PRE_PING=true                 # Enable connection pre-ping
DB_ECHO=false                         # Database query echo

# Redis cache
REDIS_HOST=safework-redis             # Container name
REDIS_PORT=6379                       # Redis port
REDIS_PASSWORD=                       # Redis password (optional)
REDIS_DB=0                           # Redis database number

# Admin credentials
ADMIN_USERNAME=admin                  # Admin username
ADMIN_PASSWORD=${ADMIN_PASSWORD}           # Admin password (must be set)

# CSRF Settings (currently disabled)
WTF_CSRF_ENABLED=false               # CSRF protection (disabled for survey testing)
WTF_CSRF_CHECK_DEFAULT=false         # CSRF check default

# File upload settings
UPLOAD_FOLDER=/app/uploads           # Upload directory
MAX_CONTENT_LENGTH=52428800          # 50MB max file size
```

## Key API Endpoints
```bash
# Core endpoints
/health                                    # System health check (JSON) - ✅ Production verified
/                                         # Main homepage - ✅ Production verified

# Survey forms (anonymous access)
/survey/001_musculoskeletal_symptom_survey     # Anonymous form - ✅ Production verified
/survey/002_new_employee_health_checkup_form   # Anonymous form - ✅ Production verified

# Survey API endpoints
/survey/api/submit                             # Form submission API - ✅ Verified working with JSONB storage

# Admin access (login required)
/admin/dashboard                              # Main admin dashboard
/admin/safework                              # SafeWork management hub
/admin/survey/<id>                           # Survey detail view with complete submitted data

# RESTful API v2
/api/safework/v2/workers                     # Worker CRUD operations
/api/safework/v2/health-checks               # Health record management
/api/safework/v2/medications                 # Medicine inventory CRUD
```

## Production Guidelines

### Database Best Practices
- **PostgreSQL 15+** with UTF8 encoding for Korean text support (production standard)
- **Database Name**: Always use `safework_db` (not `safework`) to match schema initialization
- Use `kst_now()` for all timestamp operations (consistent KST timezone)
- Transaction-based operations with rollback for data integrity
- Anonymous submissions always use `user_id=1`
- JSONB fields for flexible survey data storage with indexing support
- Automated schema migration via init.sql and migration scripts in PostgreSQL container

### Security & Performance
- `@login_required` decorator for all admin routes
- CSRF protection currently disabled for survey testing
- Audit logging enabled for all administrative operations
- Redis caching for frequently accessed data
- Database indexing on key lookup fields
- Pagination (20 items per page) for large datasets

## Key Development Workflows

### Adding New Survey Forms
1. **Route Setup**: Add new form routes in `src/app/routes/survey.py`
2. **Template Creation**: Create HTML template in `src/app/templates/survey/`
3. **Model Updates**: Update `Survey` model if new fields needed (use JSON `responses` field for flexibility)
4. **Admin Interface**: Add admin management to `src/app/routes/admin.py`
5. **JavaScript Logic**: Implement conditional logic matching exact HTML IDs
6. **Testing**: Test form submission via API endpoint with proper JSON structure
7. **Migration**: Run `python migrate.py create "Add new form type"` if schema changes needed

### SafeWork Admin Panel Extension
1. **Model Definition**: Add new models in `src/app/models_safework.py` or `src/app/models_safework_v2.py`
2. **API Endpoints**: Add RESTful endpoints in `src/app/routes/api_safework_v2.py`
3. **Admin Routes**: Add admin interface routes in `src/app/routes/admin.py`
4. **Templates**: Create admin templates in `src/app/templates/admin/safework/`
5. **Database Migration**: Use `python migrate.py create "Description"` for schema changes

### Container Deployment Testing
```bash
# Test individual container health before deployment
docker build -t test-app ./src/app && docker run --rm test-app python -c "import app; print('OK')"
docker build -t test-postgres ./infrastructure/docker/postgres && docker run --rm -e POSTGRES_DB=test test-postgres postgres --version
docker build -t test-redis ./infrastructure/docker/redis && docker run --rm test-redis redis-server --version

# Verify container networking and deployment
docker network inspect safework_network       # Check network exists
make portainer-status                          # Check container status via Portainer
make health                                    # Comprehensive health check
make test-api                                  # Test API endpoints

# Volume persistence verification
./scripts/volume_manager.sh verify      # Verify data integrity
./scripts/volume_manager.sh status      # Check volume status
```

## Project Structure Guidelines

### Root Directory Restrictions
**ONLY ALLOWED in root directory:**
- `CLAUDE.md` - This file
- `README.md` - Project documentation
- `Makefile` - Main automation interface
- `.gitignore` - Git ignore rules

**PROHIBITED in root directory:**
- Backup files (`*backup*`, `*.bak`, `*-v2*`, `*-copy*`, `*-old*`)
- Additional documentation (use `docs/` directory)
- Configuration files (use `config/` directory)
- Docker compose files (project uses independent containers)

### Independent Container Structure
Each service has its own complete build context:
- `src/app/` - Flask application with Dockerfile, .dockerignore, requirements.txt
- `infrastructure/docker/postgres/` - PostgreSQL 15+ with Dockerfile, complete schema, migrations
- `infrastructure/docker/redis/` - Redis 7 with Dockerfile, .dockerignore, redis.conf
- `scripts/` - Comprehensive management and automation scripts
- `assets/` - Static assets and form templates

### Key Files for Development
```
├── Makefile                                    # Main automation interface
├── src/app/                                   # Flask application source
├── infrastructure/docker/                     # Container definitions
├── scripts/                                  # Management and automation scripts
├── assets/                                   # Static assets and forms
└── CLAUDE.md                                 # This guidance file
```

## Testing Commands

### Comprehensive Testing
```bash
# Main testing entry point
make test                               # Run comprehensive test suite

# Specific test types
make test-api                          # Test API endpoints specifically
make test-integration                  # Integration tests
curl ${LOCAL_URL:-http://localhost:4545}/health      # Local health check
curl https://safework.jclee.me/health  # Production health check

# Manual testing via health endpoints and API calls
curl -X POST ${LOCAL_URL:-http://localhost:4545}/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type": "001", "name": "테스트"}'  # Test survey API

# Container-based verification (adjust container names based on current deployment)
docker exec -it safework-app python -c "
from app import create_app
from models import Survey, db
app = create_app()
with app.app_context():
    print(f'Survey count: {Survey.query.count()}')
"
```

### Validation Scripts
```bash
# Project structure and pipeline validation
make validate                          # Project structure validation
./scripts/pipeline_validator.sh        # CI/CD pipeline validation
./scripts/test_runner.sh              # Comprehensive system testing
```

### Single Test Execution (Development)
```bash
# Test database connectivity directly
docker exec -it safework-app python -c "
from app import create_app
from models import Survey, db
app = create_app()
with app.app_context():
    print(f'Survey count: {Survey.query.count()}')
    print('Database connection: OK')
"

# Test specific API endpoints
curl -X POST ${LOCAL_URL:-http://localhost:4545}/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type": "001", "name": "테스트 사용자", "age": 30}'

# Code quality checks
cd src/app
black . --check                   # Check formatting
flake8 . --max-line-length=88      # Lint check
python -m py_compile *.py          # Syntax validation
```

## Critical Development Notes

### Script Path Conventions
The project has scripts in two locations with different purposes:
- `scripts/` - Main automation and management scripts
- `tools/scripts/` - Advanced tooling and specialized scripts

**Script Path Convention**: The project has both `scripts/` and `tools/scripts/` directories:
- `scripts/` - Main operational scripts (deployment, monitoring, unified operations)
- `tools/scripts/` - Advanced tooling and specialized scripts (portainer management, emergency recovery)

**Usage Pattern**:
```bash
# Main operations (use scripts/)
./scripts/safework_ops_unified.sh       # Primary operations script
./scripts/portainer_deployment_stable.sh # Stable deployment
./scripts/test_runner.sh                 # Comprehensive testing

# Advanced tooling (use tools/scripts/)
./tools/scripts/portainer_advanced.sh    # Advanced Portainer management
./tools/scripts/emergency_recovery.sh    # Emergency recovery procedures
./tools/scripts/safework_monitoring_advanced.sh # Advanced monitoring
```

### Container Network Requirements
- **Network Creation**: SafeWork requires a dedicated Docker network for inter-container communication
- **Network Name**: Project uses `safework_network` (not `safework2-network` as shown in README)
- **Critical**: Ensure network exists before starting containers independently