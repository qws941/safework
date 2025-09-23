# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork (안전보건 관리시스템) is a comprehensive industrial health and safety management system for Korean construction/industrial environments, built with Flask 3.0+ and deployed via Portainer GitOps.

**Core Services:**
- Survey System: 001 근골격계증상조사표, 002 신규입사자건강진단 forms with anonymous submissions
- SafeWork Admin: 13 specialized management panels (workers, health checks, medications, MSDS, etc.)
- RESTful API v2: External system integration via `/api/safework/v2/*` endpoints
- Document Management: Version control and access logging system
- Monitoring System: Real-time container monitoring and log analysis

$1

## Core Work Principles - Accuracy First (핵심 작업 원칙 - 정확성 우선)

### Fundamental Philosophy
**시간 걸려도 좋으니까 제발 정확하고 표준화되게, 의도를 파악해서 작업하라**

- **Accuracy Over Speed**: 속도보다 정확성을 우선시
- **Standardization Mandatory**: 모든 작업은 표준화된 방식으로 진행  
- **Intent Understanding**: 작업 전 의도와 요구사항을 완전히 파악
- **Quality Assurance**: 완료 후 반드시 검증 과정 수행

### Work Execution Standards
- **No Assumptions**: 추측이나 가정 없이 명확한 정보 기반으로 작업
- **Complete Understanding**: 요구사항을 완전히 이해한 후 작업 시작
- **Verification Required**: 모든 작업 완료 후 검증 과정 필수
- **Documentation First**: 변경사항은 반드시 문서화

## Essential Commands

### Development & Testing
```bash
# Start development environment
make up                                    # Docker Compose up
make logs                                  # View application logs
make health                               # Comprehensive health check

# Code quality
make format                               # Black formatter
make lint                                 # Flake8 linter
make test                                 # Run test suite
make test-api                             # Test API endpoints

# Database operations
make db-migrate                           # Run migrations
make db-status                            # Check migration status
make db-shell                             # PostgreSQL CLI access
make db-backup                            # Create database backup
```

### Deployment & Monitoring
```bash
# Deployment (GitHub Actions triggered)
make deploy                               # Trigger GitHub Actions build/push
./scripts/portainer_stack_deploy.sh status    # Check stack status
./scripts/portainer_stack_deploy.sh deploy    # Deploy to production

# Unified operations script
./scripts/safework_ops_unified.sh deploy status     # Deployment status
./scripts/safework_ops_unified.sh logs live        # Real-time logs
./scripts/safework_ops_unified.sh monitor health   # Health monitoring
./scripts/safework_ops_unified.sh logs errors all  # Error log analysis

# Production verification
curl https://safework.jclee.me/health    # Production health check
```

### Container Management
```bash
# Independent containers (no docker-compose dependency in production)
docker exec -it safework-app bash        # Enter app container
docker exec -it safework-postgres psql -U safework -d safework_db  # Database CLI
docker logs -f safework-app              # Follow application logs

# Portainer API operations (requires API key)
curl -H "X-API-Key: $PORTAINER_API_KEY" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/json"
```

## High-Level Architecture

### Container Architecture
Three independent Docker containers orchestrated via Portainer:
- `safework-app`: Flask application (port 4545)
- `safework-postgres`: PostgreSQL 15+ with automated schema migration (port 5432)
- `safework-redis`: Redis 7.0 cache layer (port 6379)

All containers include:
- Loki-compatible log tagging: `[safework-*-log]` format
- KST timezone enforcement: `TZ=Asia/Seoul`
- Health checks and restart policies
- Volume persistence for data

### Application Architecture

**Flask Application Factory Pattern (`src/app/app.py`):**
- Environment-based configuration (development/production/testing)
- Blueprint auto-registration from routes directory
- Extension initialization: SQLAlchemy, Flask-Login, Redis
- Connection retry logic: 60 retries for DB, 10 for Redis
- Pool management: `pool_size=10, pool_recycle=3600, pool_pre_ping=True`

**Database Design:**
- **Core Models** (`models.py`):
  - `User`: Authentication with Flask-Login
  - `Survey`: Unified table with `form_type` discriminator and JSONB `responses`
  - `AuditLog`: System activity tracking
  - Anonymous submissions use `user_id=1`

- **SafeWork Models** (`models_safework.py`, `models_safework_v2.py`):
  - 13+ domain-specific tables for industrial safety management

- **Critical**: Database name is `safework_db` (NOT `safework`)

**Route Architecture** (`src/app/routes/`):
- `survey.py`: Form handling with conditional JavaScript logic
- `admin.py`: 13 SafeWork admin panels
- `api_safework_v2.py`: RESTful API endpoints
- `monitoring.py`: Real-time system monitoring
- `health.py`: Health check endpoints

## Standardized Development Workflow (표준화된 개발 워크플로우)

### Complete Development Cycle
사용자 요청사항에 따른 표준화된 5단계 개발 워크플로우:

1. **Local Development (jclee-dev)**:
   - 로컬 개발환경에서 코드 작성 및 초기 테스트
   - Docker 컨테이너를 통한 로컬 검증
   - `make up`, `make test`, `make lint` 등 로컬 품질 검증

2. **Development Environment Verification (*-dev.jclee.me)**:
   - 개발 서버에 배포하여 실제 환경에서 검증
   - 기능 테스트 및 통합 테스트 수행
   - 서비스 간 상호작용 및 데이터베이스 연동 확인

3. **Git Operations + Auto Commit**:
   - git push를 통한 코드 푸시
   - 자동 커밋 설정으로 일관된 커밋 메시지
   - 표준화된 브랜치 전략 및 커밋 컨벤션 적용

4. **GitHub Actions Automation**:
   - registry.jclee.me로 이미지 푸시
   - Portainer API를 통한 Stack 업데이트
   - 자동화된 빌드, 테스트, 배포 파이프라인

5. **Production Verification (*.jclee.me)**:
   - 프로덕션 환경에서 최종 검증
   - Health check 및 모니터링 확인
   - 서비스 안정성 및 성능 검증

### Workflow Enforcement
- **No Skipping Steps**: 모든 단계를 순차적으로 진행
- **Verification Required**: 각 단계별 검증 완료 후 다음 단계 진행
- **Rollback Strategy**: 문제 발생 시 이전 단계로 롤백 가능

$1

**Configuration Management:**
- Master config: `scripts/config/master.env`
- Portainer Stack ID: 77 (production endpoint 3)
- API authentication via environment variables only
- NEVER hardcode credentials in code

### Log Analysis & Monitoring

**Log Tagging System (Loki-compatible):**
```yaml
logging:
  driver: "json-file"
  options:
    tag: "[safework-{service}-log] {{.Name}}"
    labels: "service=safework-{service},env=production,component={type},stack=safework"
```

**Monitoring Routes (`/admin/monitoring/*`):**
- Real-time container status via Portainer API
- Log streaming with timestamp and filtering
- System health aggregation
- Performance metrics with Redis caching
- Container restart capabilities

## Critical Configuration

### Environment Variables (Required)
```bash
# Flask Configuration
FLASK_CONFIG=production           # Environment mode
SECRET_KEY=<strong-random-key>    # Session encryption
TZ=Asia/Seoul                     # Korean timezone

# Database (PostgreSQL)
DB_HOST=safework-postgres         # Container name
DB_NAME=safework_db               # CRITICAL: Use safework_db
DB_USER=safework
DB_PASSWORD=<secure-password>

# Redis Cache
REDIS_HOST=safework-redis
REDIS_PORT=6379

# Admin Access
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<secure-password>

# Portainer API (for monitoring)
PORTAINER_URL=https://portainer.jclee.me
PORTAINER_API_KEY=<api-key>
PORTAINER_ENDPOINT_ID=3
```

### Common Issues & Solutions

**Database Connection:**
- Error: `database "safework" does not exist` → Use `DB_NAME=safework_db`
- Connection refused → Wait for PostgreSQL initialization
- Schema issues → Run `make db-migrate`

**Container Issues:**
- Timezone problems → Ensure `TZ=Asia/Seoul` in all containers
- Import errors → Check model imports and aliases
- Gunicorn failures → Verify Flask app import path

**Deployment Issues:**
- Stack update failures → Check Portainer API key
- Image pull errors → Verify registry credentials
- Health check failures → Check `/health` endpoint response

## Key Development Patterns

### Adding New Features

**New Survey Form:**
1. Add route in `routes/survey.py`
2. Create template in `templates/survey/`
3. Store data as JSON in `surveys.responses` field
4. Ensure HTML IDs match JavaScript selectors exactly

**New Admin Panel:**
1. Define model in `models_safework.py`
2. Add API endpoints in `routes/api_safework_v2.py`
3. Create admin route in `routes/admin.py`
4. Add template in `templates/admin/safework/`

### Code Quality Standards
**정확성 우선 원칙 기반 품질 표준** (Core Work Principles 준수)

- **Black formatter**: 88 character line length (표준화 의무)
- **Flake8**: `--extend-ignore=E203,W503` (코드 품질 검증 필수)
- **Test coverage**: Target 80% (품질 보증 요구사항)
- **All timestamps**: `kst_now()` function 사용 (표준화된 시간 처리)
- **Transaction-based DB operations**: rollback 포함 (안정성 우선)
- **File Naming Compliance**: File Management Standards 준수 필수
- **Documentation Policy**: 새 문서 파일 생성 금지, 기존 파일 업데이트만 허용
- **Workflow Adherence**: Standardized Development Workflow 5단계 순차 진행

### Security Practices
**보안 실무 표준** (Core Work Principles 및 File Management Standards 준수)

- `@login_required` for all admin routes (표준화된 인증 방식)
- Environment variables for all secrets (환경 변수 표준화)
- CSRF currently disabled (testing phase) - 프로덕션 시 활성화 예정
- Audit logging for administrative actions (모든 관리 작업 추적)
- No hardcoded credentials allowed (절대 금지 사항)
- **Configuration File Naming**: `database_config.py`, `security_config.py` 등 명확한 이름 사용
- **No Security Documentation**: 보안 관련 별도 문서 파일 생성 금지, CLAUDE.md에 통합
- **Verification Required**: 모든 보안 변경사항 완료 후 검증 과정 필수 (정확성 우선)

$1

## File Management & Directory Standards (파일 관리 및 디렉토리 표준)

### Root Directory Protection - ABSOLUTE PROHIBITION
**🚫 루트 디렉토리 파일 생성 절대 금지**

- **Forbidden Location**: `/home/jclee/app/safework/` 루트에 새 파일 생성 불가
- **Edit Existing Only**: 기존 파일(CLAUDE.md, README.md, Makefile)만 편집 허용
- **Subdirectory Routing**: 모든 새 파일은 적절한 하위 디렉토리로 라우팅
- **Clean Root Policy**: 루트 디렉토리의 깔끔한 상태 유지 의무

### File Naming Standards - NO AMBIGUOUS NAMES
**명확한 목적 기반 네이밍 강제**

- **Descriptive Names**: 파일의 목적과 내용을 명확히 표현하는 이름 사용
- **Forbidden Generic Names**: 
  - `temp.py`, `test.txt`, `backup.md`, `new-file.js` 등 금지
  - `config.py` → `database_config.py` 또는 `flask_config.py`
  - `utils.py` → `date_utils.py` 또는 `validation_utils.py`
- **Purpose-Based Naming**: 기능과 역할을 파일명에 명확히 반영
- **No Adjectives**: 형용사형 파일명 금지, 명확한 명사형 사용
- **Hyphen Convention**: 다단어 파일명은 하이픈으로 연결 (e.g., `survey-form-handler.py`)

### Directory Organization Standards
**용도별 폴더 정리 의무화**

- **Purpose-Based Structure**: 기능별, 목적별 디렉토리 구조 유지
- **Approved Directories**:
  - `src/app/` → 애플리케이션 소스 코드
  - `scripts/` → 관리 및 자동화 스크립트  
  - `infrastructure/` → 인프라 설정 파일
  - `docs/` → 프로젝트 문서 (제한적 사용)
  - `.github/` → CI/CD 파이프라인
- **Clean Hierarchy**: 명확한 계층 구조 유지, 3depth 이상 지양
- **No Temporary Files**: 임시 파일은 `/tmp/` 또는 `build/` 디렉토리 사용

$1

## Documentation Creation Policy (문서 생성 정책)

### ABSOLUTE PROHIBITION - No New Documentation Files
**README.MD, CLAUDE.MD 외 문서 파일 생성 절대 금지**

SafeWork 프로젝트에서는 문서 파일의 무분별한 증식을 방지하고 중앙화된 문서 관리를 위해 엄격한 문서 생성 제한 정책을 적용합니다.

### Allowed Documentation Files Only
- **README.md**: 프로젝트 개요 및 기본 사용법만 편집 허용
- **CLAUDE.md**: 개발 가이드 및 프로젝트별 지시사항만 편집 허용
- **Makefile**: 빌드 및 명령어 정의 파일 편집 허용

### Forbidden Documentation Creation
- **No New .md Files**: 어떤 디렉토리에서든 새로운 마크다운 파일 생성 금지
- **No Documentation Proliferation**: 
  - `docs/`, `documentation/`, `guides/` 디렉토리 내 새 파일 금지
  - `*.txt`, `*.doc`, `*.pdf` 등 모든 문서 형식 생성 금지
- **No Project Documentation**: API 문서, 설치 가이드 등 별도 문서 파일 금지
- **No Backup Documentation**: 기존 문서의 백업 버전 생성 금지

### Enforcement Scope - NO EXCEPTIONS
- **All Directories**: 모든 하위 디렉토리에 예외 없이 적용
- **All File Types**: .md, .txt, .doc, .pdf, .rst 등 모든 문서 형식
- **All Purposes**: API 문서, 가이드, 매뉴얼, 노트 등 모든 목적의 문서
- **All Environments**: 개발, 테스트, 프로덕션 환경 구분 없이 적용

### Alternative Documentation Methods
문서 파일 생성 대신 다음 방법들을 사용:

- **Code Comments**: 코드 내 상세 주석으로 기능 설명
- **README.md Updates**: 기존 README.md 파일에 정보 추가
- **CLAUDE.md Integration**: 개발 관련 가이드는 CLAUDE.md에 통합
- **Inline Documentation**: 코드와 함께 작성되는 인라인 문서화
- **Configuration Comments**: 설정 파일 내 주석으로 설명 추가

## Testing & Validation

```bash
# API endpoint testing
curl -X POST https://safework.jclee.me/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type":"001","name":"테스트","age":30}'

# Database connectivity test
docker exec safework-app python -c "
from app import create_app
from models import Survey, db
app = create_app()
with app.app_context():
    print(f'Survey count: {Survey.query.count()}')
"

# Container health verification
./scripts/safework_ops_unified.sh monitor health
```

## Production URLs
- Application: https://safework.jclee.me
- Health Check: https://safework.jclee.me/health
- Admin Panel: https://safework.jclee.me/admin (login required)
- Monitoring: https://safework.jclee.me/admin/monitoring (login required)