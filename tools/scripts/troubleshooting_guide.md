# 🔧 SafeWork 시스템 트러블슈팅 가이드

## 📋 목차
- [🚨 긴급 상황 대응](#긴급-상황-대응)
- [🔍 일반적인 문제 해결](#일반적인-문제-해결)
- [📊 성능 문제 해결](#성능-문제-해결)
- [🐳 컨테이너 관련 문제](#컨테이너-관련-문제)
- [🗄️ 데이터베이스 문제](#데이터베이스-문제)
- [🔄 자동 복구 시스템](#자동-복구-시스템)

---

## 🚨 긴급 상황 대응

### 🔥 **Level 1: 서비스 완전 중단**

**증상:**
- https://safework.jclee.me 접근 불가
- 모든 컨테이너 다운
- 데이터베이스 연결 실패

**즉시 조치 (5분 이내):**
```bash
# 1. 시스템 상태 확인
./scripts/portainer_production_logs.sh health

# 2. 모든 컨테이너 강제 재시작
docker restart safework-app safework-postgres safework-redis

# 3. 상태 재확인
curl -I https://safework.jclee.me/health
```

**복구 절차:**
1. **컨테이너 상태 점검**
   ```bash
   ./scripts/portainer_simple.sh status
   docker ps -a | grep safework
   ```

2. **로그 확인**
   ```bash
   ./scripts/portainer_production_logs.sh errors safework-app
   ./scripts/portainer_production_logs.sh errors safework-postgres
   ```

3. **데이터베이스 복구**
   ```bash
   # PostgreSQL 연결 테스트
   docker exec safework-postgres pg_isready -U safework

   # 필요시 데이터베이스 재시작
   docker restart safework-postgres

   # 스키마 확인
   docker exec safework-postgres psql -U safework -d safework_db -c "\\dt"
   ```

4. **애플리케이션 재시작**
   ```bash
   docker restart safework-app
   sleep 30
   curl https://safework.jclee.me/health
   ```

---

### ⚠️ **Level 2: 부분 서비스 장애**

**증상:**
- 일부 기능 동작 안함
- 간헐적 연결 실패
- 높은 에러율

**진단 순서:**
1. **애플리케이션 로그 확인**
   ```bash
   ./scripts/portainer_production_logs.sh logs safework-app 100
   ```

2. **에러 패턴 분석**
   ```bash
   python3 scripts/enhanced_log_analyzer.py --analyze --container safework-app
   ```

3. **성능 메트릭 확인**
   ```bash
   ./scripts/portainer_simple.sh network
   curl https://safework.jclee.me/health | jq '.'
   ```

---

### 📈 **Level 3: 성능 저하**

**증상:**
- 응답 시간 5초 이상
- 메모리 사용률 85% 이상
- CPU 사용률 80% 이상

**최적화 조치:**
1. **리소스 사용량 확인**
   ```bash
   docker stats safework-app safework-postgres safework-redis
   ```

2. **슬로우 쿼리 확인**
   ```bash
   docker exec safework-postgres psql -U safework -d safework_db -c "
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   ORDER BY mean_time DESC LIMIT 10;"
   ```

3. **캐시 상태 확인**
   ```bash
   docker exec safework-redis redis-cli info memory
   docker exec safework-redis redis-cli info stats
   ```

---

## 🔍 일반적인 문제 해결

### 🐛 **애플리케이션 에러**

#### ImportError / ModuleNotFoundError
```bash
# 문제: Python 모듈 임포트 실패
# 원인: requirements.txt 불일치 또는 가상환경 문제

# 해결책:
docker exec safework-app pip list | grep -E "(flask|sqlalchemy|redis)"
docker restart safework-app

# 재발 방지:
git diff HEAD~1 app/requirements.txt
```

#### 500 Internal Server Error
```bash
# 문제: 애플리케이션 내부 오류
# 진단:
./scripts/portainer_production_logs.sh errors safework-app 50

# 일반적 원인:
# 1. 데이터베이스 연결 실패
docker exec safework-app python -c "
from app import create_app
from models import db
app = create_app()
with app.app_context():
    print('DB connection test:', db.engine.execute('SELECT 1').scalar())
"

# 2. Redis 연결 실패
docker exec safework-app python -c "
import redis
r = redis.Redis(host='safework-redis', port=6379)
print('Redis connection test:', r.ping())
"
```

#### Survey 제출 오류
```bash
# 문제: 설문 제출 시 에러
# 진단:
curl -X POST https://safework.jclee.me/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type": "001", "name": "테스트"}' -v

# 데이터베이스 확인:
docker exec safework-postgres psql -U safework -d safework_db -c "
SELECT COUNT(*) FROM surveys WHERE created_at > NOW() - INTERVAL '1 hour';"
```

---

### 🗄️ **데이터베이스 문제**

#### 연결 실패
```bash
# 문제: Database connection failed / OperationalError
# 원인: PostgreSQL 서비스 다운 또는 연결 풀 고갈

# 즉시 조치:
docker restart safework-postgres
sleep 15
docker logs safework-postgres --tail 20

# 연결 상태 확인:
docker exec safework-postgres psql -U safework -d safework_db -c "
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';"

# 연결 풀 설정 확인:
docker exec safework-app python -c "
from config import Config
print('Pool size:', Config.SQLALCHEMY_ENGINE_OPTIONS['pool_size'])
"
```

#### 스키마 불일치
```bash
# 문제: column does not exist 오류
# 원인: 마이그레이션 미적용 또는 스키마 버전 불일치

# 마이그레이션 상태 확인:
docker exec safework-app python migrate.py status

# 마이그레이션 적용:
docker exec safework-app python migrate.py migrate

# 스키마 확인:
docker exec safework-postgres psql -U safework -d safework_db -c "\\d surveys"
```

---

### 🔄 **Redis 캐시 문제**

#### Redis 연결 실패
```bash
# 문제: Redis connection failed / ConnectionError
# 원인: Redis 서비스 다운 또는 메모리 부족

# Redis 상태 확인:
docker exec safework-redis redis-cli ping
docker exec safework-redis redis-cli info server

# 메모리 사용량 확인:
docker exec safework-redis redis-cli info memory

# Redis 재시작:
docker restart safework-redis
```

#### 캐시 성능 문제
```bash
# 캐시 히트율 확인:
docker exec safework-redis redis-cli info stats | grep hit

# 키 분석:
docker exec safework-redis redis-cli info keyspace
docker exec safework-redis redis-cli --scan --pattern "*" | head -10

# 캐시 클리어 (필요시):
docker exec safework-redis redis-cli flushall
```

---

## 🐳 컨테이너 관련 문제

### 컨테이너 시작 실패
```bash
# 문제: Container failed to start
# 진단:
docker ps -a | grep safework
docker logs safework-app --tail 50

# 네트워크 문제:
docker network ls | grep watchtower
docker network inspect watchtower_default

# 포트 충돌 확인:
netstat -tulpn | grep -E "(4545|4546|4547)"

# 볼륨 문제:
docker volume ls | grep safework
docker volume inspect safework_postgres_data
```

### 리소스 부족
```bash
# 메모리 사용량 확인:
docker stats --no-stream

# 디스크 사용량:
df -h
docker system df

# 로그 파일 정리:
docker system prune -f
docker volume prune -f
```

---

## 📊 성능 문제 해결

### 응답 시간 최적화
```bash
# 1. 애플리케이션 성능 프로파일링
curl -w "@curl-format.txt" -o /dev/null -s https://safework.jclee.me/health

# curl-format.txt 내용:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#    time_pretransfer:  %{time_pretransfer}\n
#       time_redirect:  %{time_redirect}\n
#  time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#          time_total:  %{time_total}\n

# 2. 데이터베이스 쿼리 최적화
docker exec safework-postgres psql -U safework -d safework_db -c "
SELECT schemaname,tablename,attname,n_distinct,correlation
FROM pg_stats WHERE tablename = 'surveys';"

# 3. 인덱스 확인
docker exec safework-postgres psql -U safework -d safework_db -c "
SELECT schemaname,tablename,indexname,indexdef
FROM pg_indexes WHERE tablename = 'surveys';"
```

### 메모리 최적화
```bash
# Python 메모리 사용량 분석:
docker exec safework-app python -c "
import psutil
import os
process = psutil.Process(os.getpid())
print(f'Memory usage: {process.memory_info().rss / 1024 / 1024:.1f} MB')
"

# PostgreSQL 메모리 설정:
docker exec safework-postgres psql -U safework -d safework_db -c "
SHOW shared_buffers;
SHOW work_mem;
SHOW effective_cache_size;"
```

---

## 🔄 자동 복구 시스템

### 자동 복구 시스템 활성화
```bash
# 1. 고급 로그 분석기 설정
cp scripts/log_analyzer_config.json /etc/safework/
export PORTAINER_API_KEY="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="

# 2. 모니터링 시작
python3 scripts/enhanced_log_analyzer.py --config /etc/safework/log_analyzer_config.json --monitor

# 3. 시스템 서비스로 등록
sudo tee /etc/systemd/system/safework-monitor.service > /dev/null <<EOF
[Unit]
Description=SafeWork Log Monitor
After=network.target

[Service]
Type=simple
User=safework
WorkingDirectory=/opt/safework
ExecStart=/usr/bin/python3 /opt/safework/scripts/enhanced_log_analyzer.py --monitor
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable safework-monitor
sudo systemctl start safework-monitor
```

### 자동 복구 규칙
1. **데이터베이스 연결 실패** → PostgreSQL 컨테이너 재시작 (5분 쿨다운)
2. **Redis 연결 실패** → Redis 컨테이너 재시작 (3분 쿨다운)
3. **애플리케이션 크래시** → 앱 컨테이너 재시작 (2분 쿨다운)
4. **메모리 부족** → 관련 컨테이너 재시작 (10분 쿨다운)
5. **높은 에러율** → Slack 알림 + 로그 수집

### 알림 설정
```bash
# Slack 웹훅 설정
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# 이메일 알림 설정 (선택)
export EMAIL_USERNAME="alerts@safework.com"
export EMAIL_PASSWORD="your_password"
```

---

## 📞 에스컬레이션 절차

### Level 1 → Level 2 조건
- 자동 복구 3회 실패
- 데이터 손실 위험
- 보안 사고 의심

### Level 2 → Level 3 조건
- 서비스 중단 30분 이상
- 데이터베이스 복구 실패
- 여러 컨테이너 동시 장애

### 연락처
- **Level 1**: Slack #safework-alerts 채널
- **Level 2**: 운영팀 대기자 SMS 알림
- **Level 3**: 개발팀 및 경영진 즉시 연락

---

## 📋 체크리스트

### 일일 점검 항목
- [ ] 모든 컨테이너 정상 구동 확인
- [ ] 애플리케이션 헬스 체크 통과
- [ ] 데이터베이스 연결 정상
- [ ] Redis 캐시 동작 확인
- [ ] 디스크 사용량 80% 미만
- [ ] 로그 에러 비율 5% 미만

### 주간 점검 항목
- [ ] 백업 데이터 정합성 확인
- [ ] 성능 메트릭 트렌드 분석
- [ ] 보안 업데이트 적용
- [ ] 로그 파일 정리
- [ ] 모니터링 대시보드 검토

### 월간 점검 항목
- [ ] 전체 시스템 백업 검증
- [ ] 재해 복구 시나리오 테스트
- [ ] 용량 계획 검토
- [ ] 보안 감사
- [ ] 문서 업데이트

---

**⚡ 긴급 상황시 즉시 실행:** `./scripts/emergency_recovery.sh`