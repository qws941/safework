# SafeWork 환경 관리 가이드

**최적화 완료일**: 2025-09-22
**버전**: v2.0.0

## 📋 개요

SafeWork 프로젝트의 환경별 구성 관리를 표준화하고 보안을 강화했습니다. 이 문서는 환경 변수 관리, Docker 설정, 보안 모범 사례를 다룹니다.

## 🎯 주요 개선사항

### ✅ 완료된 최적화
- **환경 파일 통합**: 분산된 12개 환경 파일을 표준화된 3개 파일로 통합
- **보안 강화**: 민감한 정보 분리 및 환경 변수 주입 패턴 도입
- **Docker 통합**: docker-compose 파일에 env_file 지시문 적용
- **자동 로더**: 환경 감지 및 검증이 포함된 스크립트 생성
- **템플릿 시스템**: 재사용 가능한 환경 변수 템플릿 제공

## 📁 환경 파일 구조

### 표준화된 환경 파일
```
/home/jclee/app/safework/
├── .env.template           # 🔧 환경 변수 템플릿 (모든 설정 포함)
├── .env.development        # 💻 개발 환경 설정
├── .env.production.secure  # 🔒 프로덕션 환경 설정 (보안 강화)
├── .env.local             # 🏠 로컬 개발자별 설정 (gitignore)
└── .env                   # ⚙️ 기본 설정 (선택사항)
```

### Docker Compose 통합
```
├── docker-compose-production.yml  # 🐳 프로덕션 배포 (.env.production.secure 사용)
├── docker-compose.override.yml    # 🔧 개발 오버라이드 (.env.development 사용)
└── docker-compose.yml             # 📦 기본 서비스 정의
```

### 환경 로더 스크립트
```
├── scripts/load_env.sh     # 🚀 자동 환경 변수 로더 및 검증
└── scripts/config/         # 📂 레거시 설정 파일 (점진적 마이그레이션)
```

## 🔧 환경 파일 사용법

### 1. 개발 환경 설정
```bash
# 개발용 환경 변수 로드
source scripts/load_env.sh development

# 또는 Docker Compose로 자동 로드
docker-compose up -d  # .env.development 자동 사용
```

### 2. 프로덕션 환경 설정
```bash
# 프로덕션용 환경 변수 로드 (보안 검증 포함)
source scripts/load_env.sh production

# Docker Compose 프로덕션 배포
docker-compose -f docker-compose-production.yml up -d
```

### 3. 로컬 개발자 설정
```bash
# .env.local 파일 생성 (개인별 설정)
cp .env.template .env.local
# 개인 설정 수정 후 사용
```

## 🔐 보안 모범 사례

### 민감한 정보 관리
```bash
# ✅ 올바른 방법: 환경 변수 주입
DB_PASSWORD=${DB_PASSWORD:-your-password-here}
SECRET_KEY=${SECRET_KEY:-use-secure-random-key}

# ❌ 잘못된 방법: 평문 하드코딩
DB_PASSWORD=safework2024
SECRET_KEY=hardcoded-secret
```

### 프로덕션 보안 검증
자동 보안 검증 항목:
- 기본 비밀번호 사용 금지
- DEBUG 모드 비활성화 확인
- SECRET_KEY 길이 검증 (최소 32자)
- SSL 설정 확인

### 환경 변수 우선순위
```
1. 시스템 환경 변수 (최우선)
2. .env.production.secure (프로덕션)
3. .env.development (개발)
4. .env.local (로컬 개발자별)
5. .env (기본값)
6. scripts/config/master.env (레거시)
```

## 🐳 Docker 환경별 설정

### 프로덕션 배포
```yaml
# docker-compose-production.yml
services:
  app:
    env_file:
      - .env.production.secure
    environment:
      - TZ=Asia/Seoul
      - FLASK_CONFIG=production
```

### 개발 환경
```yaml
# docker-compose.override.yml
services:
  app:
    env_file:
      - .env.development
    environment:
      - TZ=Asia/Seoul
      - FLASK_CONFIG=development
      - DEBUG=true
```

## 📊 환경별 차이점

| 설정 항목 | 개발환경 | 프로덕션 |
|-----------|----------|----------|
| DEBUG | true | false |
| SSL_REQUIRED | false | true |
| GUNICORN_WORKERS | 2 | 4 |
| DB_POOL_SIZE | 5 | 20 |
| LOG_LEVEL | DEBUG | INFO |
| BACKUP_ENABLED | false | true |
| DOCKER_RESTART_POLICY | no | unless-stopped |

## 🛠️ 환경 관리 명령어

### 환경 로드 및 검증
```bash
# 환경 자동 감지 및 로드
./scripts/load_env.sh

# 특정 환경 지정
./scripts/load_env.sh production
./scripts/load_env.sh development

# 환경 변수 검증만 실행
./scripts/load_env.sh production --validate-only
```

### Docker 환경별 명령
```bash
# 개발 환경 (자동으로 .env.development 사용)
docker-compose up -d
docker-compose logs -f app

# 프로덕션 환경
docker-compose -f docker-compose-production.yml up -d
docker-compose -f docker-compose-production.yml logs -f app

# 환경 설정 확인
docker-compose config
```

### 환경 변수 확인
```bash
# 로드된 환경 변수 확인 (민감한 정보 제외)
./scripts/load_env.sh development | grep "로드된 환경 설정"

# 컨테이너 내부 환경 변수 확인
docker exec safework-app env | grep -E "(DB_|REDIS_|FLASK_)"
```

## 🔍 문제 해결

### 일반적인 문제

#### 1. 환경 변수 로드 실패
```bash
# 증상: 필수 환경 변수가 설정되지 않았습니다
# 해결: 올바른 환경 파일 경로 확인
ls -la .env*
source scripts/load_env.sh development
```

#### 2. 프로덕션 보안 검증 실패
```bash
# 증상: 프로덕션 환경에서 기본 비밀번호를 사용할 수 없습니다
# 해결: .env.production.secure에서 기본 비밀번호 변경
vi .env.production.secure
# DB_PASSWORD=${DB_PASSWORD:-secure-password-here}
```

#### 3. Docker 환경 파일 인식 실패
```bash
# 증상: 환경 변수가 컨테이너에 전달되지 않음
# 해결: env_file 경로 확인 및 파일 존재 여부 검증
docker-compose config  # 설정 검증
ls -la .env.development .env.production.secure
```

## 📋 마이그레이션 가이드

### 기존 설정에서 신규 시스템으로 이전

#### 1단계: 기존 환경 변수 백업
```bash
# 현재 환경 변수 백업
env > backup_env_$(date +%Y%m%d).txt

# 기존 .env 파일 백업
cp .env .env.backup.$(date +%Y%m%d)
```

#### 2단계: 새 환경 파일 설정
```bash
# 템플릿에서 개발 환경 생성
cp .env.template .env.development

# 프로덕션 환경 설정 (보안 주의)
cp .env.template .env.production.secure
# 민감한 정보는 환경 변수 주입 패턴으로 수정
```

#### 3단계: Docker Compose 업데이트
```bash
# 기존 docker-compose.yml 백업
cp docker-compose.yml docker-compose.yml.backup

# 새 환경 파일 구조로 수정
# env_file 지시문 추가
```

#### 4단계: 검증 및 테스트
```bash
# 환경 로드 테스트
./scripts/load_env.sh development
./scripts/load_env.sh production

# Docker 설정 검증
docker-compose config
docker-compose -f docker-compose-production.yml config

# 애플리케이션 테스트
curl http://localhost:4545/health
```

## 🚀 향후 개선 계획

### 단기 계획 (1-2주)
- [ ] Kubernetes ConfigMap/Secret 통합
- [ ] 환경 변수 암호화 도구 도입
- [ ] 자동 환경 변수 검증 CI/CD 통합

### 중기 계획 (1개월)
- [ ] HashiCorp Vault 연동
- [ ] 동적 환경 변수 리로드
- [ ] 환경별 성능 모니터링

### 장기 계획 (3개월)
- [ ] Multi-tenant 환경 지원
- [ ] 자동 보안 스캔 및 알림
- [ ] 환경 변수 버전 관리

---

## 📞 지원 및 문의

환경 관리 관련 문제나 개선 제안이 있으시면:
1. GitHub Issues에 등록
2. Slack #safework-alerts 채널 문의
3. 개발팀 직접 연락

**문서 버전**: v2.0.0
**최종 업데이트**: 2025-09-22
**작성자**: Claude Code Automation System