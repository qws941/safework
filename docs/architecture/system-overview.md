# SafeWork System Architecture Overview

## System Context

SafeWork는 한국 건설/산업 환경을 위한 산업 안전보건 관리 시스템입니다.

### Core Purpose
- 작업장 건강 설문 관리 (001 근골격계, 002 신규직원 건강검진)
- SafeWork 관리자 패널 (13개 전문 관리 패널)
- 문서 관리 시스템 (버전 제어 및 접근 로깅)
- 익명 접근 지원 (user_id=1 fallback)
- RESTful API v2 (외부 시스템 통합용)

## Technology Stack

### Backend Architecture
- **Framework**: Flask 3.0+
- **ORM**: SQLAlchemy 2.0
- **Database**: PostgreSQL 15+ (⚠️ MySQL 사용 금지)
- **Cache**: Redis 7.0
- **Migration**: Custom migration system with web interface

### Frontend Architecture
- **UI Framework**: Bootstrap 4.6
- **JavaScript**: jQuery
- **Design**: Responsive design with Korean localization
- **Forms**: Conditional JavaScript logic with exact HTML ID matching

### Infrastructure Architecture
- **Containerization**: Docker (independent containers)
- **Registry**: Private registry (registry.jclee.me)
- **Orchestration**: Portainer API
- **Auto-deployment**: Watchtower
- **CI/CD**: GitHub Actions

### Security & Compliance
- **Authentication**: Flask-Login
- **CSRF**: Currently disabled (WTF_CSRF_ENABLED = False)
- **Timezone**: KST timezone enforcement (`kst_now()` function)
- **Localization**: Korean UI/error messages

## System Components

### 1. Survey System
```
/survey/001_musculoskeletal_symptom_survey     # 근골격계 증상조사표
/survey/002_new_employee_health_checkup_form   # 신규직원 건강검진표
/survey/api/submit                             # Form submission API
```

### 2. SafeWork Admin System
- **13 Specialized Panels**: Workers, health checks, medications, MSDS, safety education
- **Management Hub**: `/admin/safework`
- **CRUD Operations**: RESTful API v2 endpoints

### 3. Document Management
- **Version Control**: Document versioning system
- **Access Logging**: Complete audit trail
- **Public Access**: Controlled document distribution

### 4. API Layer
```
/api/safework/v2/*                 # RESTful API v2
/health                           # System health monitoring
```

## Data Architecture

### Database Design
```sql
-- Core Models (models.py)
User          -- Flask-Login authentication
Survey        -- Unified 001/002 forms (form_type discriminator + JSON data)
AuditLog      -- System activity tracking

-- SafeWork Models (models_safework.py + models_safework_v2.py)
safework_workers        -- Worker management
safework_health_checks  -- Health record management
safework_medications    -- Medicine inventory
-- ... 13+ specialized tables

-- Document Models (models_document.py)
Document              -- Document metadata
DocumentVersion       -- Version control
DocumentAccessLog     -- Access tracking
```

### Key Patterns
- **Anonymous Submissions**: `user_id = 1` for public form access
- **JSON Storage**: Flexible survey data in JSONB/JSON fields
- **KST Timezone**: Consistent `kst_now()` for all timestamps
- **Form Discrimination**: `form_type = '001' | '002'` for survey types

## Deployment Architecture

### Container Strategy
```
src/app/                    # Flask application container
infrastructure/docker/postgres/  # PostgreSQL container
infrastructure/docker/redis/     # Redis container
```

### Environment Management
```
deployment/environments/development/  # Local development
deployment/environments/staging/     # Staging environment
deployment/environments/production/  # Production environment
```

### CI/CD Pipeline
1. **GitHub Actions**: Automated build and test
2. **Registry Push**: Private registry.jclee.me
3. **Portainer Deployment**: API-driven container updates
4. **Health Verification**: Automated health checks

## Network Architecture

### Production URLs
- **Production**: https://safework.jclee.me
- **Development**: https://safework-dev.jclee.me
- **Local**: http://localhost:4545

### Internal Communication
- **Database**: safework-postgres:5432
- **Cache**: safework-redis:6379
- **Network**: Independent container networking

## Security Architecture

### Authentication Flow
1. **Admin Access**: Flask-Login with session management
2. **Anonymous Access**: Public survey submission (user_id=1)
3. **API Access**: RESTful endpoints with authentication

### Data Protection
- **Session Security**: HTTP-only cookies, secure headers
- **Input Validation**: SQL injection prevention
- **Audit Logging**: Complete administrative activity tracking

## Monitoring & Operations

### Health Monitoring
- **Health Endpoint**: `/health` with JSON status
- **Container Health**: Docker health checks
- **Performance Metrics**: Database and cache monitoring

### Log Management
- **Application Logs**: Structured logging with KST timestamps
- **Portainer Integration**: Centralized log collection
- **Error Tracking**: Automated error detection and alerting

## Scalability Considerations

### Database Optimization
- **Connection Pooling**: pool_size=10, pool_recycle=3600
- **Query Optimization**: Proper indexing on lookup fields
- **JSON Storage**: Efficient JSONB for flexible survey data

### Caching Strategy
- **Redis Integration**: Session and data caching
- **Cache Patterns**: Frequently accessed data optimization

### Performance Monitoring
- **Response Times**: < 200ms for API endpoints
- **Resource Usage**: CPU, memory, and disk monitoring
- **Capacity Planning**: Usage pattern analysis