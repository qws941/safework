# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is a comprehensive industrial health and safety management system built with Flask 3.0+. It implements two core survey forms: **001 Musculoskeletal Symptom Survey** and **002 New Employee Health Checkup**, along with a complete administrative management system for occupational safety and health data.

### Core Architecture

**Application Factory Pattern**: The app uses Flask's application factory (`create_app()`) with environment-based configuration (development/production/testing).

**Multi-Blueprint Structure**: 8 main blueprints handle different functional areas:
- `main_bp`: Homepage and core navigation
- `auth_bp`: User authentication and registration
- `survey_bp`: Survey submission and user survey management
- `admin_bp`: Administrative dashboard and SafeWork management panels
- `document_bp`: Document viewing and search for users
- `document_admin_bp`: Document management for administrators
- `migration_bp`: Database migration web interface
- `health_bp`: System health checks and monitoring
- `api_safework_bp`: RESTful API for SafeWork data (v2.0)

**Database Layer**: SQLAlchemy ORM with MySQL 8.0, featuring separate model files for different domains:
- `models.py`: Core user and survey models
- `models_document.py`: Document management models
- `models_safework.py`: SafeWork-specific health and safety models

## Essential Development Commands

### Local Development Setup
```bash
# Start development environment (recommended)
docker-compose up -d

# Manual Flask development (requires MySQL/Redis running)
cd app
export FLASK_CONFIG=development
python app.py
```

### Testing and Quality
```bash
cd app

# Run all tests
python -m pytest tests/ -v

# Run specific test file  
python -m pytest tests/test_models.py -v

# Run tests with coverage
python -m pytest tests/ --cov=. --cov-report=html --cov-report=term

# Code quality checks
black .                    # Format code
flake8 .                   # Lint code

# Check specific component
python -m pytest tests/test_app.py::TestAppCreation -v
```

### Database Operations
```bash
# Web-based migration management (recommended)
# Visit: http://localhost:4545/admin/migrations

# CLI migration management
cd app
python migrate.py status   # Check migration status
python migrate.py migrate  # Run pending migrations
python migrate.py create "Description of new migration"  # Create new migration
python migrate.py rollback --version 002  # Rollback to specific version

# Check data integrity
python check_safework_data.py  # Verify SafeWork data consistency
```

### Docker Operations
```bash
# Registry login (for custom images)
docker login registry.jclee.me -u admin -p bingogo1

# Pull latest images
docker-compose pull

# View logs
docker-compose logs -f app
docker-compose logs mysql
```

## High-Level Architecture

### Flask Application Structure

**Application Factory (`app/app.py`)**:
- Environment-based configuration loading
- Extension initialization (SQLAlchemy, Flask-Migrate, Redis, CSRF, Login Manager)
- Blueprint registration with URL prefixes
- Database connection management with retry logic
- Automatic user creation (anonymous user ID=1, admin user)
- Error handlers for 404/500
- Context processors for version info and system uptime
- Audit logging for admin actions

**Configuration System (`app/config.py`)**:
- Base `Config` class with common settings
- Environment-specific configs: `DevelopmentConfig`, `ProductionConfig`, `TestingConfig`
- Database URLs, Redis settings, security keys managed via environment variables

**Blueprint Organization**:
```
/                           → main_bp (homepage)
/auth/                      → auth_bp (login, register, logout)
/survey/                    → survey_bp (survey forms, user submissions)
/admin/                     → admin_bp (dashboard, SafeWork management)
/admin/migrations/          → migration_bp (database migrations)
/documents/                 → document_bp (user document access)
/admin/documents/           → document_admin_bp (document management)
/health                     → health_bp (system health check)
/api/safework/             → api_safework_bp (RESTful API)
```

### Database Architecture

**Core Tables**: 
- `users`: User authentication and profiles
- `surveys`: Unified storage for both 001 and 002 survey forms (differentiated by `form_type`)
- `audit_logs`: System activity tracking

**Document Management**:
- `documents`: File metadata and access control
- `document_categories`: Document classification
- `document_tags`: Flexible tagging system

**SafeWork Management** (13 specialized areas):
- `safework_workers`: Employee master data
- `safework_health_checks`: Health examination records
- `safework_medical_visits`: Medical office visit tracking
- `safework_medications`: Drug inventory management
- Plus 9 additional SafeWork-specific tables for comprehensive safety management

### Survey System Architecture

**Two-Form System**:
- **001 Musculoskeletal Survey**: 6 body areas with conditional logic, pain assessment, past injury tracking
- **002 New Employee Health**: 29 fields covering medical history, lifestyle, physical measurements

**Anonymous Submission**: All surveys can be submitted without login (assigned to user_id=1)

**Admin Management**: 
- Unified dashboard at `/admin/surveys` 
- Form-specific views: `/admin/001_musculoskeletal`, `/admin/002_new_employee`
- Excel export capability for data analysis
- Individual submission detailed views

### SafeWork Management System

**13 Specialized Management Panels**:
1. **Workers Management** (`/admin/safework/workers`): Employee master data and health status
2. **Health Checks** (`/admin/safework/health-checks`): Regular and special health examinations
3. **Medical Visits** (`/admin/safework/medical-visits`): Medical office visits and treatments
4. **Medications** (`/admin/safework/medications`): Drug inventory and prescription tracking
5. **Health Consultations** (`/admin/safework/consultations`): Individual and group counseling
6. **Health Programs** (`/admin/safework/health-programs`): Wellness programs (smoking cessation, etc.)
7. **Special Management** (`/admin/safework/special-management`): High-risk employee monitoring
8. **Environment Measurements** (`/admin/safework/environment-measurements`): Workplace environmental data
9. **Risk Assessment** (`/admin/safework/risk-assessment`): Hazard identification and mitigation
10. **MSDS Management** (`/admin/safework/msds`): Material Safety Data Sheets
11. **Protective Equipment** (`/admin/safework/protective-equipment`): PPE distribution and maintenance
12. **Safety Education** (`/admin/safework/education`): Training programs and compliance
13. **Certifications** (`/admin/safework/certifications`): Safety manager qualifications

### Document Management System

**Multi-Category System**: Documents organized by categories with flexible tagging
**Access Control**: Public, private, and admin-only documents
**Version Management**: Document revision tracking
**Usage Analytics**: View and download statistics
**Template System**: Reusable document templates for common forms

## Technology Stack Integration

**Backend**: Flask 3.0 with Gunicorn for production serving  
**Database**: MySQL 8.0 with connection pooling and retry logic  
**Caching**: Redis for session storage and caching  
**Authentication**: Flask-Login with bcrypt password hashing  
**Forms**: WTForms with CSRF protection  
**Database ORM**: SQLAlchemy 2.0 with custom migration manager  
**Testing**: pytest with Flask-specific testing utilities and coverage reporting  
**Frontend**: Bootstrap 4.6 with jQuery for interactive components  
**Container**: Multi-service Docker Compose setup with health checks  
**File Processing**: openpyxl for Excel exports, PyPDF2 for PDF handling

## Development Workflow

**Environment Management**: 
- Development: Local Flask server with debug mode
- Production: Gunicorn with multiple workers
- Testing: Isolated test database configuration

**Database Migrations**:
- Web interface at `/admin/migrations` for non-technical users
- CLI tools for developer use
- Automatic backup creation before migrations
- Rollback capability with version targeting

**Code Quality**:
- Black formatting (mandatory)
- Flake8 linting with project-specific rules
- pytest with coverage reporting (target: 80%+)

**Deployment**:
- GitOps workflow: GitHub Actions → registry.jclee.me → Production
- Multi-environment Docker images (app, mysql, redis)
- Automatic container updates via Watchtower
- Health monitoring with automatic rollback capability

## Key Configuration Notes

**Environment Variables**:
- `FLASK_CONFIG`: Controls which config class is loaded
- Database: MySQL connection via `MYSQL_*` variables  
- Redis: Session storage and caching configuration
- Security: `SECRET_KEY` for session encryption

**Default Accounts**:
- Admin: username=`admin`, password=`safework2024`
- Anonymous: user_id=1 for survey submissions without login

**URL Structure Logic**:
- User-facing features use simple paths (`/survey/`, `/documents/`)
- Administrative features use `/admin/` prefix
- API endpoints use `/api/` prefix with versioning

**Production Services**:
- Application: Port 4545 (safework-app container)
- MySQL: Port 3307 (safework-mysql container) 
- Redis: Port 6380 (safework-redis container)
- Health Check: `http://localhost:4545/health`

## 🚀 고도화된 Claude Code Integration

### MCP 서버 기반 지능형 자동화 시스템

SafeWork 프로젝트는 **12개의 전문 MCP 서버**를 통합한 고도화된 Claude Code 자동화 시스템을 구축했습니다.

#### 🧠 지능적 분석 시스템
- **mcp__sequential-thinking**: 복잡한 문제를 단계별로 분석하고 해결
- **mcp__brave-search**: 최신 기술 정보 및 베스트 프랙티스 실시간 검색  
- **mcp__exa**: 의미론적 검색으로 관련 문서 및 예시 코드 발견
- **mcp__memory**: 프로젝트 패턴 학습 및 이전 해결책 기억

#### 🔍 코드 분석 및 품질 관리
- **mcp__serena**: 깊이 있는 코드 구조 분석, 심볼 탐색, 의존성 매핑
- **mcp__filesystem**: 프로젝트 구조 탐색 및 파일 관리
- **mcp__github**: PR 히스토리, 이슈 패턴, 코드 리뷰 분석
- **mcp__eslint**: JavaScript/TypeScript 코드 품질 자동 검사

#### 🧪 테스트 및 검증 자동화
- **mcp__code-runner**: 실시간 코드 스니펫 테스트 및 검증
- **mcp__playwright**: UI 자동화 테스트 (필요시)
- **mcp__puppeteer**: 웹 스크래핑 및 브라우저 자동화

#### 📊 프로젝트 관리 및 워크플로우
- **mcp__shrimp-task-manager**: 복잡한 작업의 체계적 계획 및 관리

### 📋 고도화된 자동 처리 프로세스

#### Phase 1: 인텔리전트 분석
1. **이슈 컨텍스트 수집**: GitHub API 기반 관련 데이터 분석
2. **코드베이스 구조 파악**: Serena MCP로 의존성 및 영향도 매핑  
3. **기술 리서치**: 최신 솔루션 및 베스트 프랙티스 자동 수집
4. **복잡도 평가**: 작업 범위 및 리스크 체계적 분석

#### Phase 2: 솔루션 설계  
1. **아키텍처 호환성 검증**: Flask 구조와의 완벽한 통합성 보장
2. **데이터베이스 영향 분석**: SQLAlchemy 모델 변경사항 사전 평가
3. **UI/UX 최적화**: Bootstrap 4.6 기반 반응형 디자인 고려
4. **테스트 전략 수립**: pytest 기반 완전한 테스트 계획

#### Phase 3: 구현 및 검증
1. **코드 생성**: 기존 패턴 준수하며 새 기능 완벽 구현
2. **마이그레이션 생성**: 데이터베이스 스키마 변경 자동 처리
3. **테스트 코드**: 90% 이상 커버리지 목표 달성
4. **품질 검사**: Black/Flake8 규칙 자동 적용

#### Phase 4: 배포 준비
1. **Docker 설정**: 컨테이너 환경 최적화
2. **환경 변수**: config.py 설정 자동 검토
3. **문서 업데이트**: CLAUDE.md, README 자동 갱신
4. **CI/CD 검증**: GitHub Actions 파이프라인 확인

### ✅ 엄격한 품질 보증 시스템

#### 자동 품질 검사
- ✅ **코드 품질**: Black 포맷팅, Flake8 린팅, Type hints, Docstring
- ✅ **테스트**: 90% 이상 커버리지, 통합 테스트, 에러 케이스, 성능 테스트  
- ✅ **보안**: SQL 인젝션 방지, CSRF 보호, 입력 검증, 쿼리 최적화
- ✅ **UX**: 반응형 디자인, 접근성(WCAG 2.1), 한국어 최적화

### 🎯 성공 기준
- 이슈 요구사항 100% 충족
- 모든 품질 기준 통과  
- 완전한 문서화
- PR 자동 생성 및 테스트 통과
- 성능 최적화 및 보안 강화 제안

### 🔧 기술 설정
- **워크플로우**: `.github/workflows/claude.yml` (MCP 통합 버전)
- **MCP 설정**: `.github/workflows/mcp-config.json`
- **OAuth 인증**: `CLAUDE_CODE_OAUTH_TOKEN` 시크릿
- **트리거**: @claude 멘션, 이슈/PR 라벨, 자동 감지

이 고도화된 시스템은 SafeWork의 산업안전보건 관리 요구사항을 완벽히 이해하고, 
최고 품질의 자동화된 솔루션을 제공합니다. 🚀