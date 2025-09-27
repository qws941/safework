# SafeWork Integration Test Suite
## 고도화된 통합 테스트 프레임워크

[![Integration Tests](https://github.com/jclee/safework/workflows/SafeWork%20Integration%20Tests/badge.svg)](https://github.com/jclee/safework/actions/workflows/integration-tests.yml)

이 문서는 SafeWork 산업안전보건 관리 시스템의 포괄적인 통합 테스트 프레임워크를 설명합니다.

## 📋 개요

SafeWork 통합 테스트 스위트는 다음과 같은 핵심 영역을 포괄하는 종합적인 테스트 프레임워크입니다:

### 🧪 테스트 카테고리

1. **API 통합 테스트** (`test_api_integration.py`)
   - REST API 엔드포인트 검증
   - 인증 및 권한 관리 테스트
   - 데이터 유효성 검사
   - 오류 처리 및 예외 상황 테스트

2. **데이터베이스 통합 테스트** (`test_database_integration.py`)
   - CRUD 작업 검증
   - 트랜잭션 무결성 테스트
   - 데이터 일관성 및 제약 조건 검증
   - 성능 및 확장성 테스트

3. **컨테이너 오케스트레이션 테스트** (`test_container_integration.py`)
   - 서비스 간 연결성 검증
   - 컨테이너 상태 및 리소스 사용량 모니터링
   - 네트워크 격리 및 보안 테스트
   - 로깅 및 지속성 검증

4. **End-to-End 워크플로우 테스트** (`test_e2e_workflows.py`)
   - 완전한 사용자 여정 시뮬레이션
   - 설문조사 제출 프로세스 테스트
   - 관리자 워크플로우 검증
   - 브라우저 자동화를 통한 UI 테스트

5. **시스템 모니터링 및 성능 테스트** (`test_monitoring_enhanced.py`)
   - 시스템 건강 상태 지속적 모니터링
   - 성능 메트릭 수집 및 분석
   - 임계값 기반 알림 시스템 테스트
   - 부하 테스트 및 복구 능력 검증

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 테스트 의존성 설치
pip install -r tests/requirements.txt

# SafeWork 서비스 시작 (Docker Compose)
docker-compose up -d

# 서비스 상태 확인
curl http://localhost:4545/health
```

### 2. 테스트 실행

#### 전체 테스트 실행
```bash
./scripts/run_integration_tests.sh all
```

#### 특정 카테고리 테스트 실행
```bash
# API 테스트만 실행
./scripts/run_integration_tests.sh api

# 데이터베이스 테스트만 실행
./scripts/run_integration_tests.sh database

# 모니터링 테스트만 실행
./scripts/run_integration_tests.sh monitoring
```

#### pytest를 통한 직접 실행
```bash
# 모든 테스트 실행
pytest tests/ -v

# 특정 마커로 테스트 실행
pytest -m "api" tests/ -v
pytest -m "database" tests/ -v
pytest -m "e2e" tests/ -v

# 병렬 실행 (빠른 실행)
pytest -n auto tests/ -v

# 커버리지 포함
pytest --cov=app --cov-report=html tests/
```

## 🛠️ 설정 및 구성

### 환경 변수

테스트 실행 시 다음 환경 변수를 설정할 수 있습니다:

```bash
# 기본 설정
export TEST_BASE_URL="http://localhost:4545"
export TEST_DB_URL="postgresql://safework:safework2024@localhost:5432/safework_test"
export TEST_REDIS_URL="redis://localhost:6379/1"

# 인증 정보
export TEST_ADMIN_USERNAME="admin"
export TEST_ADMIN_PASSWORD="safework2024"

# 성능 설정
export PARALLEL_WORKERS="auto"
export TEST_TIMEOUT="300"
export SKIP_SLOW_TESTS="false"
export GENERATE_COVERAGE="true"
```

### pytest 설정

`pytest.ini` 파일에서 테스트 설정을 관리합니다:

- 테스트 디렉토리: `tests/`
- 마커 기반 테스트 분류
- 커버리지 보고서 생성 (70% 이상 요구)
- HTML 및 XML 형식 결과 출력
- 타임아웃 설정 (300초)

## 📊 테스트 결과 및 리포트

### 자동 생성되는 아티팩트

1. **JUnit XML 리포트**: CI/CD 파이프라인 통합용
2. **HTML 테스트 리포트**: 시각적 결과 확인용
3. **커버리지 리포트**: 코드 커버리지 분석
4. **성능 메트릭**: 응답 시간 및 가용성 지표

### 리포트 위치

```
test-reports/
├── junit-api.xml                    # JUnit 결과
├── report-api.html                  # HTML 테스트 리포트
├── coverage-api/                    # 커버리지 리포트
├── integration-test-summary.html    # 종합 리포트
└── ...
```

## 🔄 CI/CD 통합

### GitHub Actions 워크플로우

`.github/workflows/integration-tests.yml`에서 자동 테스트 실행:

- **트리거**: 코드 푸시, PR, 스케줄 (매일 오전 2시 KST)
- **병렬 실행**: 여러 테스트 카테고리 동시 실행
- **아티팩트 수집**: 테스트 결과 및 리포트 자동 수집
- **알림**: PR 코멘트로 결과 통지

### 실행 단계

1. **환경 설정**: Python, 의존성 설치
2. **서비스 상태 확인**: SafeWork 서비스 가용성 검증
3. **병렬 테스트 실행**: API, DB, 컨테이너, 모니터링 테스트
4. **E2E 테스트**: 브라우저 자동화 테스트 (옵션)
5. **결과 수집**: 종합 리포트 생성
6. **알림 발송**: 결과 통지

## 🎯 테스트 전략

### 테스트 피라미드

```
      🎭 E2E Tests
     (브라우저 자동화)
        /        \
   🐳 Container   📈 Monitoring
      Tests         Tests
     /              \
🔌 API Tests    🗄️ Database Tests
     (통합 테스트 기반)
```

### 품질 게이트

- **코드 커버리지**: 최소 70% 이상
- **테스트 성공률**: 95% 이상
- **응답 시간**: 평균 2초 이하
- **가용성**: 99% 이상

## 🚨 모니터링 및 알림

### 성능 임계값

- **응답 시간 경고**: 2초 초과
- **응답 시간 크리티컬**: 5초 초과
- **가용성 경고**: 95% 미만
- **가용성 크리티컬**: 90% 미만

### 건강 상태 모니터링

시스템 모니터는 다음 구성 요소를 지속적으로 검사합니다:

1. **애플리케이션**: 메인 Flask 애플리케이션
2. **데이터베이스**: PostgreSQL 연결 상태
3. **캐시**: Redis 연결 상태
4. **API 엔드포인트**: 핵심 REST API 가용성

## 🔧 문제 해결

### 일반적인 문제들

#### 1. 서비스 연결 실패
```bash
# 서비스 상태 확인
docker-compose ps
curl http://localhost:4545/health

# 로그 확인
docker-compose logs safework-app
```

#### 2. 데이터베이스 연결 오류
```bash
# PostgreSQL 연결 테스트
docker exec -it safework-postgres psql -U safework -d safework_db -c "SELECT 1;"

# 권한 확인
docker exec -it safework-postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE safework_db TO safework;"
```

#### 3. 테스트 타임아웃
```bash
# 타임아웃 증가
export TEST_TIMEOUT="600"

# 병렬 워커 수 조정
export PARALLEL_WORKERS="2"
```

#### 4. E2E 테스트 실패
```bash
# Chrome 설치 확인
google-chrome --version

# 헤드리스 모드 확인
export DISPLAY=:99
```

### 로그 위치

- **통합 테스트 로그**: `test-logs/integration_tests.log`
- **카테고리별 로그**: `test-logs/*_tests.log`
- **Docker 컨테이너 로그**: `docker-compose logs`

## 📈 성능 메트릭

### 수집되는 지표

1. **응답 시간 메트릭**
   - 평균, 최소, 최대, 중앙값
   - 95th 퍼센타일
   - 시간대별 추이

2. **가용성 메트릭**
   - 업타임 비율
   - 에러율
   - 연결 실패율

3. **리소스 사용률**
   - CPU 사용률
   - 메모리 사용률
   - 네트워크 지연시간

### 메트릭 보고서

성능 메트릭은 다음 형식으로 제공됩니다:

- **JSON 형식**: API 연동용
- **HTML 대시보드**: 시각적 모니터링용
- **CSV 데이터**: 분석 및 보고서 작성용

## 🤝 기여 가이드

### 새로운 테스트 추가

1. **테스트 파일 생성**: `tests/test_new_feature.py`
2. **마커 추가**: `@pytest.mark.new_category`
3. **설정 업데이트**: `pytest.ini`에 마커 추가
4. **CI 파이프라인 업데이트**: 필요시 워크플로우 수정

### 테스트 작성 가이드라인

- **명확한 테스트 명**: `test_specific_functionality_under_specific_condition`
- **독립적 테스트**: 다른 테스트에 의존하지 않는 독립적 테스트
- **적절한 마커**: 테스트 분류를 위한 마커 사용
- **정리 코드**: `cleanup_test_data` 픽스처 활용

## 📚 참고 자료

- [pytest 공식 문서](https://docs.pytest.org/)
- [Selenium WebDriver 가이드](https://selenium-python.readthedocs.io/)
- [SQLAlchemy 테스팅](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)
- [Docker Compose 테스팅](https://docs.docker.com/compose/reference/)

## 🏷️ 버전 정보

- **프레임워크 버전**: 1.0.0
- **pytest**: 7.4.3
- **Python**: 3.11+
- **지원 OS**: Linux, macOS, Windows

---

**마지막 업데이트**: $(date)
**작성자**: SafeWork 개발팀
**라이센스**: SafeWork 프로젝트 라이센스