# Deprecated Scripts Migration Guide

이 문서는 `safework_ops_unified.sh` 통합 스크립트 도입으로 인해 더 이상 사용하지 않는 스크립트들의 마이그레이션 가이드입니다.

## 🚀 통합 스크립트 사용법

새로운 통합 스크립트를 사용하세요:
```bash
./scripts/safework_ops_unified.sh [카테고리] [작업] [옵션]
```

## 📋 기존 스크립트 → 통합 스크립트 마이그레이션

### Portainer 관련 스크립트

#### `portainer_simple.sh` (더 이상 사용 안 함)
```bash
# 기존 사용법
./scripts/portainer_simple.sh status
./scripts/portainer_simple.sh logs safework-app

# 새로운 사용법
./scripts/safework_ops_unified.sh deploy status
./scripts/safework_ops_unified.sh logs recent safework-app 20
```

#### `portainer_queries.sh` (더 이상 사용 안 함)
```bash
# 기존 사용법
./scripts/portainer_queries.sh

# 새로운 사용법
./scripts/safework_ops_unified.sh monitor overview
```

#### `portainer_production_logs.sh` (더 이상 사용 안 함)
```bash
# 기존 사용법
./scripts/portainer_production_logs.sh

# 새로운 사용법
./scripts/safework_ops_unified.sh logs recent all 50
```

### 프로덕션 쿼리 스크립트

#### `simple_production_query.sh` (더 이상 사용 안 함)
```bash
# 기존 사용법
./scripts/simple_production_query.sh

# 새로운 사용법
./scripts/safework_ops_unified.sh deploy status
```

#### `production_query_advanced.sh` (더 이상 사용 안 함)
```bash
# 기존 사용법
./scripts/production_query_advanced.sh

# 새로운 사용법
./scripts/safework_ops_unified.sh monitor health
```

### 통합 빌드/배포 스크립트

#### `integrated_build_deploy.sh` (부분적으로 통합됨)
```bash
# 기존 사용법
./scripts/integrated_build_deploy.sh status
./scripts/integrated_build_deploy.sh full

# 새로운 사용법 (상태 확인)
./scripts/safework_ops_unified.sh deploy status

# 로컬 배포는 기존 스크립트 계속 사용
./scripts/integrated_build_deploy.sh full  # 여전히 유효
```

## ✨ 새로운 통합 기능들

### 배포 관리
```bash
./scripts/safework_ops_unified.sh deploy status    # 배포 상태 확인
./scripts/safework_ops_unified.sh deploy github    # GitHub Actions 트리거
./scripts/safework_ops_unified.sh deploy local     # 로컬 배포
```

### 로그 관리
```bash
./scripts/safework_ops_unified.sh logs recent all 50       # 최근 로그
./scripts/safework_ops_unified.sh logs live safework-app   # 실시간 로그
./scripts/safework_ops_unified.sh logs errors all          # 에러 로그만
```

### 모니터링
```bash
./scripts/safework_ops_unified.sh monitor overview  # 시스템 개요
./scripts/safework_ops_unified.sh monitor health    # 건강 상태 점검
```

## 🗑️ 제거 예정 파일 목록

다음 파일들은 통합 스크립트로 기능이 대체되었으므로 제거 예정입니다:

### 즉시 제거 가능
- `scripts/portainer_simple.sh` → `safework_ops_unified.sh deploy status`
- `scripts/portainer_queries.sh` → `safework_ops_unified.sh monitor overview`
- `scripts/simple_production_query.sh` → `safework_ops_unified.sh deploy status`
- `scripts/production_query_advanced.sh` → `safework_ops_unified.sh monitor health`

### 부분적으로 통합됨 (일부 기능 유지)
- `scripts/integrated_build_deploy.sh` → 로컬 배포 기능은 유지
- `scripts/portainer_production_logs.sh` → 기본 기능은 통합됨

### Python 기반 모니터링 도구 (별도 유지)
- `scripts/enhanced_log_analyzer.py` → 고급 로그 분석용 (유지)
- `scripts/portainer-log-monitor.py` → 실시간 모니터링용 (유지)

## 🔄 마이그레이션 타임라인

### Phase 1: 통합 스크립트 배포 (완료)
- ✅ `safework_ops_unified.sh` 생성
- ✅ GitHub Actions 워크플로우 통합
- ✅ 운영 모니터링 워크플로우 생성

### Phase 2: 문서화 및 테스트 (현재)
- ✅ 마이그레이션 가이드 작성
- 🔄 통합 스크립트 테스트
- 🔄 기존 워크플로우와 호환성 확인

### Phase 3: 기존 스크립트 제거 (예정)
- 📅 2주 후: 중복 스크립트 백업 후 제거
- 📅 1개월 후: 완전 마이그레이션 완료

## 🛠️ 문제 해결

### 통합 스크립트 사용 중 문제가 발생하는 경우

1. **디버그 모드 활성화**
   ```bash
   DEBUG=1 ./scripts/safework_ops_unified.sh monitor health
   ```

2. **기존 스크립트로 임시 대체**
   ```bash
   # 응급 상황시에만 사용
   ./scripts/portainer_simple.sh status
   ```

3. **수동 확인**
   ```bash
   curl -s https://safework.jclee.me/health
   ```

## 📞 지원

문제가 발생하면 다음 방법으로 지원을 요청하세요:

1. **GitHub Issues**: 버그 리포트 및 기능 요청
2. **로그 확인**: `./scripts/safework_ops_unified.sh logs errors all`
3. **상태 확인**: `./scripts/safework_ops_unified.sh monitor health`

---

**⚠️ 중요**: 이 마이그레이션은 운영 안정성을 위해 단계적으로 진행됩니다. 급하게 기존 스크립트를 제거하지 마세요.