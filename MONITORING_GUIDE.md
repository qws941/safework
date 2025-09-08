# 📊 SafeWork 모니터링 및 안정성 가이드

## 🚨 자동 에러 모니터링 시스템

### 개요
SafeWork v3.2.0부터 실시간 에러 모니터링 및 GitHub 이슈 자동 생성 시스템이 적용되었습니다.

### 주요 기능

#### 1. 실시간 에러 감지
- **컨테이너별 로그 모니터링**: 30초마다 모든 컨테이너 로그 분석
- **에러 패턴 분류**: 데이터베이스, Redis, 애플리케이션, 설문 시스템별 분류
- **심각도 분류**: low, medium, high, critical 4단계 분류

#### 2. 자동 GitHub 이슈 생성
심각도가 `high` 또는 `critical`인 에러 발생 시 자동으로 GitHub 이슈를 생성합니다.

**이슈에 포함되는 정보:**
- 에러 타입 및 심각도
- 발생 시간 및 컨테이너 정보
- 상세 에러 메시지 및 트레이스백
- 요청 정보 (URL, 메소드, IP 등)
- 사용자 정보
- 추천 조치사항

#### 3. 분류별 에러 패턴

**데이터베이스 연결 에러 (database_connection)**
```
- "Connection refused"
- "mysql.*Connection.*failed"
- "Database connection error"
```

**Redis 연결 에러 (redis_connection)**
```
- "Redis.*ConnectionError"
- "Connection refused.*redis"
- "redis.*timeout"
```

**애플리케이션 에러 (application_error)**
```
- "Internal Server Error"
- "500 Internal Server Error"
- "Exception in"
```

**설문 시스템 에러 (survey_system)**
```
- "Survey.*error"
- "설문.*오류"
- "Form submission.*failed"
```

### 설정 방법

#### 1. 환경 변수 설정
`.env` 파일에 다음 설정을 추가하세요:

```bash
# 에러 모니터링 활성화
ERROR_MONITORING_ENABLED=true

# GitHub 토큰 및 저장소 정보
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO=qws941/safework

# 모니터링 설정
MONITORING_INTERVAL=30
ERROR_SEVERITY_THRESHOLD=medium
```

#### 2. GitHub Personal Access Token 생성
1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token" 클릭
3. 다음 권한 선택:
   - `repo` (Full control of private repositories)
   - `issues` (Read and write issues)
4. 생성된 토큰을 `GITHUB_TOKEN` 환경변수에 설정

#### 3. 로그 디렉토리 확인
컨테이너가 로그 파일을 기록할 수 있도록 디렉토리를 생성하세요:

```bash
mkdir -p logs/
chmod 755 logs/
```

## 🛡️ 컨테이너 안정성 개선사항

### 1. 스마트 재시작 정책
기존의 `unless-stopped` 대신 `on-failure` 정책 사용:

- **MySQL/Redis**: `restart: on-failure:3` (최대 3번 재시작)
- **App**: `restart: on-failure:5` (최대 5번 재시작)
- **재시작 지연**: 5~10초 후 재시작

### 2. 리소스 제한
각 컨테이너별 메모리 및 CPU 제한 설정:

**MySQL**
```yaml
resources:
  limits:
    memory: 512M
    cpus: '0.5'
  reservations:
    memory: 256M
    cpus: '0.25'
```

**Redis**
```yaml
resources:
  limits:
    memory: 128M
    cpus: '0.25'
  reservations:
    memory: 64M
    cpus: '0.1'
```

**App**
```yaml
resources:
  limits:
    memory: 1G
    cpus: '1.0'
  reservations:
    memory: 512M
    cpus: '0.5'
```

### 3. 강화된 헬스체크
더 자주, 더 정확한 상태 확인:

- **체크 간격**: 15~20초 (기존 30초)
- **타임아웃**: 5~10초 (기존 3초)
- **재시도**: 5회 (기존 3회)
- **시작 유예기간**: 10~60초 설정

### 4. 로깅 최적화
디스크 공간 보호를 위한 로그 관리:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "5m~20m"  # 파일당 최대 크기
    max-file: "2~5"     # 보관할 파일 수
```

## 🔧 운영 가이드

### 컨테이너 상태 확인
```bash
# 전체 컨테이너 상태 확인
docker-compose ps

# 헬스체크 상태 확인
docker inspect --format='{{.State.Health.Status}}' safework-app
docker inspect --format='{{.State.Health.Status}}' safework-mysql
docker inspect --format='{{.State.Health.Status}}' safework-redis

# 리소스 사용량 확인
docker stats safework-app safework-mysql safework-redis
```

### 로그 확인
```bash
# 애플리케이션 로그
docker-compose logs -f app

# 에러 모니터링 로그
docker-compose logs -f error-monitor

# 특정 시간 이후 로그
docker-compose logs --since="1h" app
```

### 에러 모니터링 상태 확인
```bash
# 에러 모니터 컨테이너 상태
docker-compose ps error-monitor

# 에러 모니터 로그 확인
docker-compose logs error-monitor

# 로그 파일 직접 확인
tail -f logs/safework-errors.log
tail -f logs/error-monitor.log
```

### GitHub 이슈 확인
자동 생성된 이슈들은 다음 라벨로 분류됩니다:

- `🚨 auto-error`: 자동 생성된 에러 이슈
- `bug`: 버그 분류
- `container-app/mysql/redis`: 컨테이너별 분류
- `severity-low/medium/high/critical`: 심각도별 분류
- `type-database_connection/redis_connection/application_error/survey_system`: 에러 타입별 분류

### 문제 해결

#### 1. 에러 모니터링이 작동하지 않는 경우
```bash
# 환경 변수 확인
docker-compose exec error-monitor env | grep -E "(ERROR_MONITORING|GITHUB)"

# GitHub 토큰 테스트
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
     https://api.github.com/repos/qws941/safework

# 컨테이너 재시작
docker-compose restart error-monitor
```

#### 2. 컨테이너가 자주 재시작하는 경우
```bash
# 재시작 이유 확인
docker inspect safework-app | grep -A 5 -B 5 "RestartCount"

# 리소스 사용량 확인
docker stats --no-stream

# 로그에서 에러 원인 찾기
docker-compose logs --tail=50 app | grep -i error
```

#### 3. 헬스체크가 실패하는 경우
```bash
# 헬스체크 명령 직접 실행
docker-compose exec app python -c "import urllib.request; urllib.request.urlopen('http://localhost:4545/health')"

# 헬스체크 히스토리 확인
docker inspect safework-app | grep -A 10 "Health"
```

## 📈 모니터링 대시보드

### 시스템 상태 확인 URL
- **애플리케이션 헬스체크**: http://localhost:4545/health
- **관리자 대시보드**: http://localhost:4545/admin
- **SafeWork 대시보드**: http://localhost:4545/admin/safework

### 주요 메트릭
- **컨테이너 헬스 상태**: healthy/unhealthy/starting
- **메모리 사용률**: 설정된 제한 대비 사용량
- **CPU 사용률**: 설정된 제한 대비 사용량
- **에러 발생 빈도**: 시간당/일당 에러 수
- **재시작 횟수**: 컨테이너별 재시작 통계

## 🔒 보안 고려사항

### 1. GitHub 토큰 관리
- Personal Access Token을 안전하게 보관
- 최소 권한 원칙 (repo, issues 권한만)
- 정기적인 토큰 재발급 권장

### 2. 로그 파일 보안
- 로그 파일에 민감한 정보 포함 방지
- 적절한 로그 보관 정책 설정
- 로그 파일 접근 권한 제한

### 3. 모니터링 데이터
- 에러 정보에서 개인정보 제거
- GitHub 이슈 공개 범위 확인
- 모니터링 시스템 접근 제한

---

이 가이드는 SafeWork v3.2.0의 새로운 모니터링 및 안정성 개선사항을 다룹니다.
추가 질문이나 문제가 있을 경우 GitHub 이슈를 통해 문의해 주세요.