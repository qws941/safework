# SafeWork2 서버리스 배포 및 테스트 가이드

## 🚀 전체 배포 순서

### 1단계: 사전 준비 (Prerequisites)
```bash
# AWS CLI 설정
aws configure --profile safework-prod
export AWS_PROFILE=safework-prod
export AWS_REGION=ap-northeast-2

# Serverless Framework 설치
npm install -g serverless
npm install -g serverless-domain-manager
npm install -g serverless-plugin-warmup

# Node.js 의존성 설치
cd /home/jclee/app/safework/serverless
npm install

# Python 개발 환경
pip install serverless-wsgi flask sqlalchemy psycopg2-binary redis boto3
```

### 2단계: Cloudflare DNS 설정
```bash
# DNS 레코드 생성 (safework2.jclee.me 도메인)
cd /home/jclee/app/safework/scripts
export CLOUDFLARE_API_TOKEN="lkst1ycO1wtifp0W_aakuf2ndIyk_S0l-ejF8kUO"
export CLOUDFLARE_ZONE_ID="a8d9c67f586acdd15eebcc65ca3aa5bb"

# 자동 DNS 설정 실행
./cloudflare-safework2-dns.sh
```

### 3단계: AWS 인프라 배포
```bash
cd /home/jclee/app/safework/serverless

# 환경별 배포
sls deploy --stage dev --region ap-northeast-2    # 개발환경
sls deploy --stage prod --region ap-northeast-2   # 운영환경

# Custom Domain 생성 (한 번만 실행)
sls create_domain --stage prod --region ap-northeast-2
```

### 4단계: 데이터베이스 마이그레이션
```bash
# 마이그레이션 스크립트 실행
cd /home/jclee/app/safework/serverless/migration

# 환경 변수 설정
export SOURCE_DB_PASSWORD="safework2024"
export AURORA_ENDPOINT="safework2-aurora-cluster-writer.cluster-xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com"
export AURORA_PASSWORD="safework2024-aurora"
export RDS_PROXY_ENDPOINT="safework2-rds-proxy.proxy-xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com"

# 마이그레이션 실행
python serverless-db-migration.py
```

### 5단계: 서비스 테스트 및 검증
```bash
# 헬스 체크
curl https://safework2.jclee.me/health
curl https://api-safework2.jclee.me/health

# 주요 엔드포인트 테스트
curl https://safework2.jclee.me/survey/001_musculoskeletal_symptom_survey
curl https://safework2.jclee.me/admin/
```

## 📋 상세 배포 체크리스트

### Pre-Deployment Checklist
- [ ] AWS CLI 프로필 설정 완료 (`aws configure --profile safework-prod`)
- [ ] Serverless Framework 설치 및 설정
- [ ] Cloudflare API 토큰 검증 완료
- [ ] 기존 safework.jclee.me 서비스 백업 완료
- [ ] Aurora Serverless v2 클러스터 생성 확인
- [ ] ElastiCache Serverless 클러스터 생성 확인

### Deployment Checklist
- [ ] Cloudflare DNS 레코드 생성 (`safework2.jclee.me`, `api-safework2.jclee.me`)
- [ ] AWS Lambda 함수 배포 (auth, survey, admin, health, documents)
- [ ] API Gateway Custom Domain 설정
- [ ] Lambda Layer 업로드 (Python dependencies, Flask app)
- [ ] 환경 변수 및 Secrets Manager 설정
- [ ] VPC, 보안 그룹, IAM 역할 구성

### Post-Deployment Verification
- [ ] 모든 Lambda 함수 정상 작동 확인
- [ ] 데이터베이스 연결 및 쿼리 테스트
- [ ] Redis 캐시 연결 테스트
- [ ] 주요 API 엔드포인트 응답 확인
- [ ] 관리자 패널 접근 테스트
- [ ] 설문조사 양식 렌더링 테스트

## 🧪 테스트 시나리오

### 1. Health Check 테스트
```bash
#!/bin/bash
# health-check-test.sh

echo "=== SafeWork2 서버리스 헬스 체크 ===="

# Main health endpoint
echo "1. Main Health Check:"
MAIN_HEALTH=$(curl -s https://safework2.jclee.me/health)
echo "$MAIN_HEALTH" | jq '.status, .components'

# API health endpoint
echo "2. API Health Check:"
API_HEALTH=$(curl -s https://api-safework2.jclee.me/health)
echo "$API_HEALTH" | jq '.status, .aws'

# Database health
DB_STATUS=$(echo "$MAIN_HEALTH" | jq -r '.components.database.status')
if [ "$DB_STATUS" = "healthy" ]; then
    echo "✅ Database: OK"
else
    echo "❌ Database: FAIL ($DB_STATUS)"
fi

# Cache health
CACHE_STATUS=$(echo "$MAIN_HEALTH" | jq -r '.components.cache.status')
if [ "$CACHE_STATUS" = "healthy" ]; then
    echo "✅ Redis Cache: OK"
else
    echo "❌ Redis Cache: FAIL ($CACHE_STATUS)"
fi
```

### 2. 설문조사 기능 테스트
```bash
#!/bin/bash
# survey-functionality-test.sh

echo "=== 설문조사 기능 테스트 ===="

# 1. 설문 목록 조회
echo "1. Survey List Test:"
curl -s https://safework2.jclee.me/survey/ | grep -o "001_musculoskeletal\|002_work_environment\|003_musculoskeletal_program"

# 2. 개별 설문 페이지 테스트
surveys=("001_musculoskeletal_symptom_survey" "002_work_environment_assessment" "003_musculoskeletal_program_enhanced")

for survey in "${surveys[@]}"; do
    echo "Testing $survey:"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://safework2.jclee.me/survey/$survey")

    if [ "$STATUS" = "200" ]; then
        echo "✅ $survey: OK ($STATUS)"
    else
        echo "❌ $survey: FAIL ($STATUS)"
    fi
done

# 3. 설문 제출 테스트 (POST)
echo "3. Survey Submission Test:"
curl -X POST "https://safework2.jclee.me/survey/001_musculoskeletal_symptom_survey" \
  -H "Content-Type: application/json" \
  -d '{
    "age": "30-39",
    "gender": "male",
    "work_years": "5-10",
    "symptoms": ["neck_pain", "shoulder_pain"]
  }' \
  | jq '.success, .message'
```

### 3. 관리자 패널 테스트
```bash
#!/bin/bash
# admin-panel-test.sh

echo "=== 관리자 패널 테스트 ===="

# 1. Admin 메인 페이지
echo "1. Admin Main Page:"
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://safework2.jclee.me/admin/")
echo "Admin Status: $ADMIN_STATUS"

# 2. 로그인 페이지
echo "2. Login Page:"
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://safework2.jclee.me/login")
echo "Login Status: $LOGIN_STATUS"

# 3. API 문서 페이지
echo "3. API Documentation:"
API_DOC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://safework2.jclee.me/api/safework/v2")
echo "API Doc Status: $API_DOC_STATUS"

# 4. SafeWork 워커 관리
echo "4. SafeWork Workers Management:"
WORKERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://safework2.jclee.me/admin/safework/workers")
echo "Workers Status: $WORKERS_STATUS"
```

### 4. 성능 및 보안 테스트
```bash
#!/bin/bash
# performance-security-test.sh

echo "=== 성능 및 보안 테스트 ===="

# 1. HTTPS 리다이렉트 테스트
echo "1. HTTPS Redirect Test:"
HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://safework2.jclee.me/health")
echo "HTTP Redirect Status: $HTTP_REDIRECT (should be 301 or 302)"

# 2. SSL/TLS 등급 확인
echo "2. SSL/TLS Grade Test:"
curl -s "https://api.ssllabs.com/api/v3/analyze?host=safework2.jclee.me&publish=off&all=done" | jq '.endpoints[0].grade'

# 3. 응답 시간 테스트 (Cold Start vs Warm)
echo "3. Response Time Test:"
for i in {1..3}; do
    echo "Request $i:"
    curl -w "Time: %{time_total}s\n" -s -o /dev/null "https://safework2.jclee.me/health"
    sleep 2
done

# 4. Lambda 동시성 테스트
echo "4. Concurrent Request Test:"
for i in {1..10}; do
    curl -s "https://safework2.jclee.me/health" &
done
wait
echo "Concurrent requests completed"

# 5. 보안 헤더 확인
echo "5. Security Headers Test:"
curl -s -I "https://safework2.jclee.me/health" | grep -i "strict-transport-security\|x-frame-options\|x-content-type-options"
```

## 🚨 트러블슈팅 가이드

### 일반적인 문제 및 해결방법

#### 1. Lambda Cold Start 지연
**문제**: 첫 번째 요청이 5-10초 걸림
```bash
# 해결책: Warmup Plugin 설정 확인
sls warmup --stage prod

# CloudWatch에서 웜업 로그 확인
aws logs filter-log-events --log-group-name /aws/lambda/safework2-prod-health \
  --filter-pattern "WarmUp"
```

#### 2. 데이터베이스 연결 오류
**문제**: "database connection failed" 오류
```bash
# Aurora 클러스터 상태 확인
aws rds describe-db-clusters --db-cluster-identifier safework2-aurora-cluster

# RDS Proxy 상태 확인
aws rds describe-db-proxies --db-proxy-name safework2-rds-proxy

# 보안 그룹 확인
aws ec2 describe-security-groups --filters "Name=group-name,Values=safework2-aurora-sg"
```

#### 3. API Gateway 연결 실패
**문제**: "502 Bad Gateway" 오류
```bash
# API Gateway 로그 확인
aws logs filter-log-events --log-group-name API-Gateway-Execution-Logs_*/prod \
  --filter-pattern "ERROR"

# Custom Domain 매핑 확인
aws apigatewayv2 get-domain-names --domain-name api-safework2.jclee.me
```

#### 4. Redis 캐시 연결 문제
**문제**: Redis 연결 타임아웃
```bash
# ElastiCache Serverless 상태 확인
aws elasticache describe-serverless-caches --serverless-cache-name safework2-redis

# VPC 엔드포인트 확인
aws ec2 describe-vpc-endpoints --filters "Name=service-name,Values=com.amazonaws.ap-northeast-2.elasticache"
```

### 성능 최적화

#### Lambda 메모리 및 타임아웃 조정
```yaml
# serverless.yml
functions:
  survey:
    handler: handlers/survey.handler
    memorySize: 1024  # 증가 (기본 512)
    timeout: 30       # 증가 (기본 6초)
    provisionedConcurrency: 5  # 예약된 동시성

  health:
    memorySize: 256   # 감소 (간단한 health check)
    timeout: 10
```

#### 연결 풀 최적화
```python
# handlers에서 연결 풀 설정 조정
DB_CONFIG = {
    'pool_size': 5,
    'max_overflow': 10,
    'pool_pre_ping': True,
    'pool_recycle': 3600,
    'connect_args': {
        'connect_timeout': 10,
        'server_side_cursors': False
    }
}
```

## 📊 모니터링 및 알림 설정

### CloudWatch 대시보드
```bash
# 대시보드 생성 스크립트
aws cloudwatch put-dashboard --dashboard-name SafeWork2-Serverless \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/Lambda", "Duration", "FunctionName", "safework2-prod-health"],
            [".", "Errors", ".", "."],
            [".", "Invocations", ".", "."]
          ],
          "region": "ap-northeast-2",
          "title": "Lambda Metrics"
        }
      }
    ]
  }'
```

### 알람 설정
```bash
# 에러율 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "SafeWork2-Lambda-Errors" \
  --alarm-description "SafeWork2 Lambda function errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=safework2-prod-survey

# 응답 시간 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "SafeWork2-Lambda-Duration" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=safework2-prod-survey
```

## 🔄 롤백 절차

### 긴급 롤백 (DNS 변경)
```bash
#!/bin/bash
# emergency-rollback.sh

echo "🚨 SafeWork2 긴급 롤백 시작..."

# 1. DNS를 기존 서비스로 복원
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/a8d9c67f586acdd15eebcc65ca3aa5bb/dns_records/RECORD_ID" \
  -H "Authorization: Bearer lkst1ycO1wtifp0W_aakuf2ndIyk_S0l-ejF8kUO" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "safework2",
    "content": "safework.jclee.me"
  }'

# 2. 기존 컨테이너 서비스 재시작
curl -X POST "https://portainer.jclee.me/api/stacks/3/start" \
  -H "X-API-Key: ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q="

# 3. 서비스 확인
sleep 30
if curl -f https://safework.jclee.me/health; then
    echo "✅ 롤백 완료 - 기존 서비스 정상"
else
    echo "❌ 롤백 실패 - 수동 개입 필요"
fi
```

### 점진적 롤백 (Canary)
```bash
# 트래픽 50% 기존 서비스로 전환
# Cloudflare Load Balancer 사용
curl -X POST "https://api.cloudflare.com/client/v4/zones/a8d9c67f586acdd15eebcc65ca3aa5bb/load_balancers" \
  -H "Authorization: Bearer lkst1ycO1wtifp0W_aakuf2ndIyk_S0l-ejF8kUO" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "safework2-canary",
    "fallback_pool": "original-pool",
    "default_pools": ["serverless-pool", "original-pool"]
  }'
```

## 📈 성공 지표

### KPI (Key Performance Indicators)
- **응답 시간**: < 2초 (95th percentile)
- **가용성**: > 99.9%
- **에러율**: < 0.1%
- **Cold Start**: < 5초
- **비용 절감**: 60-70% (기존 컨테이너 대비)

### 모니터링 지표
- Lambda 함수별 성능 메트릭
- Aurora Serverless v2 연결 수 및 성능
- ElastiCache 히트율 및 응답시간
- CloudFront 캐시 효율성
- 전체 사용자 경험 지표

이 가이드를 통해 SafeWork를 안전하고 체계적으로 서버리스 아키텍처로 마이그레이션할 수 있습니다. 각 단계별로 충분한 테스트와 검증을 거쳐 안정적인 서비스 운영을 보장합니다.