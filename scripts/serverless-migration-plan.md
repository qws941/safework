# SafeWork 서버리스 마이그레이션 계획

## 🎯 마이그레이션 목표

- **기존**: Docker 컨테이너 기반 Flask 애플리케이션
- **신규**: AWS Lambda + API Gateway 서버리스 아키텍처
- **DNS**: safework2.jclee.me (Cloudflare 통합)
- **목적**: 비용 최적화, 자동 스케일링, 운영 부담 감소

## 🏗️ 서버리스 아키텍처 설계

### Core Components
```
safework2.jclee.me (Cloudflare)
    ↓
API Gateway (AWS)
    ↓
Lambda Functions (Flask 앱 분할)
    ↓
RDS Aurora Serverless (PostgreSQL)
    ↓
ElastiCache Serverless (Redis)
```

### Lambda Function 분할 전략
```python
LAMBDA_FUNCTIONS = {
    "safework-auth": {
        "routes": ["/auth/*", "/login", "/logout"],
        "memory": "512MB",
        "timeout": "30s",
        "environment": "Python 3.11"
    },
    "safework-survey": {
        "routes": ["/survey/*", "/api/safework/*"],
        "memory": "1024MB",
        "timeout": "60s",
        "environment": "Python 3.11"
    },
    "safework-admin": {
        "routes": ["/admin/*"],
        "memory": "512MB",
        "timeout": "30s",
        "environment": "Python 3.11"
    },
    "safework-static": {
        "routes": ["/static/*", "/documents/*"],
        "memory": "256MB",
        "timeout": "10s",
        "environment": "Python 3.11"
    },
    "safework-health": {
        "routes": ["/health", "/"],
        "memory": "128MB",
        "timeout": "5s",
        "environment": "Python 3.11"
    }
}
```

## 📦 마이그레이션 단계별 실행 계획

### Phase 1: Infrastructure Setup (1-2일)
1. **AWS Lambda Functions 생성**
   - 각 Flask Blueprint별로 별도 Lambda 함수 구성
   - Serverless Framework 또는 AWS SAM 사용

2. **API Gateway 구성**
   - REST API 생성 및 경로 매핑
   - CORS 설정 및 인증 구성

3. **Database Migration**
   - RDS Aurora Serverless v2 (PostgreSQL 호환)
   - 기존 PostgreSQL 데이터 마이그레이션
   - Connection pooling 최적화

### Phase 2: Application Conversion (2-3일)
1. **Flask App 분할**
   - Blueprint별 Lambda handler 작성
   - 공통 모듈 Lambda Layer로 분리
   - 환경 변수 및 비밀 관리

2. **Static Assets**
   - S3 + CloudFront로 정적 파일 이관
   - 템플릿 렌더링 최적화

### Phase 3: DNS & Cloudflare Integration (1일)
1. **Cloudflare 설정**
   - safework2.jclee.me DNS 레코드 생성
   - API Gateway Custom Domain 연결
   - SSL/TLS 및 WAF 규칙 적용

### Phase 4: Testing & Cutover (1일)
1. **기능 테스트**
   - 모든 엔드포인트 검증
   - 성능 테스트 및 최적화

2. **Blue-Green Deployment**
   - 점진적 트래픽 전환
   - 모니터링 및 롤백 준비

## 💰 비용 최적화 예상

### 기존 Container 비용 (월)
- **EC2/Container Runtime**: $50-100
- **데이터베이스**: $30-50
- **네트워킹**: $10-20
- **총 예상**: $90-170/월

### 서버리스 비용 (월)
- **Lambda**: $5-15 (요청 기반)
- **Aurora Serverless**: $20-40 (사용량 기반)
- **API Gateway**: $3-10
- **총 예상**: $28-65/월 (60-70% 절감)

## 🔧 기술 스택 전환

### Before (Current)
```yaml
Architecture: Container-based
Runtime: Flask + Gunicorn
Database: PostgreSQL (Always-on)
Cache: Redis (Always-on)
Load Balancer: Traefik
SSL: Let's Encrypt
Scaling: Manual
```

### After (Serverless)
```yaml
Architecture: Event-driven Serverless
Runtime: AWS Lambda (Python 3.11)
Database: Aurora Serverless v2
Cache: ElastiCache Serverless
Load Balancer: API Gateway
SSL: AWS Certificate Manager
Scaling: Auto (0-1000+ concurrent)
```

## 🚀 실행 스크립트 및 자동화

### 1. Serverless Framework Configuration
```yaml
# serverless.yml
service: safework2

provider:
  name: aws
  runtime: python3.11
  region: ap-northeast-2
  stage: prod

functions:
  auth:
    handler: handlers/auth.handler
    events:
      - http:
          path: /auth/{proxy+}
          method: ANY

  survey:
    handler: handlers/survey.handler
    events:
      - http:
          path: /survey/{proxy+}
          method: ANY

  admin:
    handler: handlers/admin.handler
    events:
      - http:
          path: /admin/{proxy+}
          method: ANY

custom:
  customDomain:
    domainName: api-safework2.jclee.me
    certificateName: '*.jclee.me'
    createRoute53Record: false
```

### 2. Database Migration Script
```python
# migration/serverless_db_setup.py
import boto3
import psycopg2
from sqlalchemy import create_engine

class ServerlessDatabaseMigration:
    def __init__(self):
        self.rds_client = boto3.client('rds', region_name='ap-northeast-2')
        self.current_db_url = "postgresql://safework:password@safework-postgres:5432/safework_db"
        self.aurora_endpoint = "safework2-aurora.cluster-xxxxx.ap-northeast-2.rds.amazonaws.com"

    def create_aurora_serverless(self):
        """Aurora Serverless v2 클러스터 생성"""
        response = self.rds_client.create_db_cluster(
            DBClusterIdentifier='safework2-aurora',
            Engine='aurora-postgresql',
            EngineVersion='15.4',
            MasterUsername='safework',
            MasterUserPassword='safework2024',
            DatabaseName='safework_db',
            ServerlessV2ScalingConfiguration={
                'MinCapacity': 0.5,
                'MaxCapacity': 4.0
            },
            DeletionProtection=False,
            EnableHttpEndpoint=True
        )
        return response

    def migrate_data(self):
        """기존 PostgreSQL 데이터를 Aurora로 마이그레이션"""
        # 기존 DB 연결
        source_engine = create_engine(self.current_db_url)

        # Aurora Serverless 연결
        target_url = f"postgresql://safework:safework2024@{self.aurora_endpoint}:5432/safework_db"
        target_engine = create_engine(target_url)

        # 테이블별 데이터 복사
        tables = ['users', 'surveys', 'audit_logs', 'survey_statistics']
        for table in tables:
            print(f"Migrating table: {table}")
            # pandas를 사용한 bulk transfer
            df = pd.read_sql(f"SELECT * FROM {table}", source_engine)
            df.to_sql(table, target_engine, if_exists='replace', index=False)
            print(f"✅ {table}: {len(df)} rows migrated")
```

### 3. Lambda Handler Templates
```python
# handlers/survey.py - Survey 관련 Lambda 핸들러
import json
from flask import Flask
from werkzeug.serving import WSGIRequestHandler
from app import create_app

# Flask 앱 초기화 (Lambda Layer에서 공통 모듈 import)
app = create_app('production')

def handler(event, context):
    """Survey 관련 모든 요청 처리"""

    # API Gateway event를 WSGI 환경으로 변환
    from serverless_wsgi import handle_request
    return handle_request(app, event, context)

# handlers/auth.py - 인증 관련 Lambda 핸들러
def handler(event, context):
    """인증 관련 요청 처리 (/auth/*, /login, /logout)"""

    # Blueprint 필터링
    if not event['path'].startswith(('/auth', '/login', '/logout')):
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Not found'})
        }

    from serverless_wsgi import handle_request
    return handle_request(app, event, context)
```

## 🔒 보안 및 성능 최적화

### Security Configuration
```python
SERVERLESS_SECURITY = {
    "api_gateway": {
        "throttling": {
            "burst_limit": 2000,
            "rate_limit": 1000
        },
        "waf_rules": [
            "AWSManagedRulesCommonRuleSet",
            "AWSManagedRulesKnownBadInputsRuleSet"
        ]
    },
    "lambda": {
        "environment_encryption": "AWS KMS",
        "vpc_config": {
            "subnet_ids": ["private-subnet-1", "private-subnet-2"],
            "security_group_ids": ["sg-lambda-safework2"]
        }
    },
    "aurora": {
        "encryption_at_rest": True,
        "backup_retention": 7,
        "deletion_protection": True
    }
}
```

### Performance Optimization
```python
PERFORMANCE_CONFIG = {
    "lambda_optimization": {
        "provisioned_concurrency": {
            "survey": 5,      # 항상 5개 인스턴스 웜업
            "auth": 2,        # 인증은 2개 웜업
            "health": 1       # 헬스체크 1개 웜업
        },
        "memory_allocation": {
            "survey": 1024,   # 복잡한 설문 처리
            "admin": 512,     # 관리자 기능
            "auth": 256,      # 간단한 인증
            "health": 128     # 기본 헬스체크
        }
    },
    "database_optimization": {
        "connection_pooling": "RDS Proxy",
        "read_replicas": 1,
        "query_optimization": "Performance Insights 활용"
    }
}
```

## 📊 모니터링 및 로깅

### CloudWatch Integration
```python
MONITORING_SETUP = {
    "cloudwatch_logs": {
        "log_groups": [
            "/aws/lambda/safework2-auth",
            "/aws/lambda/safework2-survey",
            "/aws/lambda/safework2-admin"
        ],
        "retention_days": 30
    },
    "cloudwatch_metrics": [
        "Lambda Duration",
        "Lambda Errors",
        "Lambda Throttles",
        "API Gateway 4XX/5XX",
        "Aurora Connection Count"
    ],
    "alarms": [
        {
            "name": "High Lambda Error Rate",
            "threshold": "5% error rate in 5 minutes"
        },
        {
            "name": "Database Connection Issues",
            "threshold": "Connection failures > 10"
        }
    ]
}
```

## 🎯 마이그레이션 체크리스트

### Pre-Migration (준비)
- [ ] AWS 계정 및 권한 설정
- [ ] Serverless Framework 설치 및 구성
- [ ] 기존 데이터베이스 백업 생성
- [ ] 성능 기준선 측정 (현재 응답시간, 처리량)

### Migration Phase 1 (인프라)
- [ ] Aurora Serverless v2 클러스터 생성
- [ ] ElastiCache Serverless 설정
- [ ] VPC 및 보안 그룹 구성
- [ ] Lambda Layer (공통 모듈) 생성

### Migration Phase 2 (애플리케이션)
- [ ] Flask 앱을 Blueprint별 Lambda 함수로 분할
- [ ] API Gateway REST API 구성
- [ ] Custom Domain (api-safework2.jclee.me) 설정
- [ ] 환경 변수 및 AWS Secrets Manager 구성

### Migration Phase 3 (데이터)
- [ ] 스키마 마이그레이션 (Aurora로 복사)
- [ ] 데이터 마이그레이션 및 검증
- [ ] Redis 캐시 데이터 이관 (필요시)

### Migration Phase 4 (DNS & CDN)
- [ ] Cloudflare에 safework2.jclee.me A record 생성
- [ ] API Gateway Custom Domain 연결
- [ ] SSL 인증서 검증
- [ ] S3 + CloudFront 정적 파일 설정

### Migration Phase 5 (Testing)
- [ ] 기능 테스트 (모든 엔드포인트)
- [ ] 성능 테스트 (로드 테스트)
- [ ] 보안 테스트 (WAF 규칙 검증)
- [ ] 모니터링 및 알림 테스트

### Migration Phase 6 (Go-Live)
- [ ] Blue-Green 배포 전략 실행
- [ ] DNS 트래픽 점진적 전환 (0% → 25% → 50% → 100%)
- [ ] 실시간 모니터링 및 오류 대응
- [ ] 기존 인프라 정리 (컨테이너 중단)

## 📝 실행 명령어 모음

### AWS CLI 설정
```bash
# AWS 프로파일 구성
aws configure --profile safework2
aws sts get-caller-identity --profile safework2

# Serverless Framework 배포
cd /home/jclee/app/safework/serverless/
npm install -g serverless
npm install serverless-python-requirements
sls deploy --stage prod --region ap-northeast-2

# Database 마이그레이션 실행
python migration/serverless_db_setup.py

# Cloudflare DNS 업데이트
./scripts/cloudflare-serverless-dns.sh
```

### 테스트 및 검증
```bash
# API Gateway 엔드포인트 테스트
curl https://api-safework2.jclee.me/health
curl https://api-safework2.jclee.me/survey/001_musculoskeletal_symptom_survey
curl https://api-safework2.jclee.me/admin/

# 성능 테스트
ab -n 1000 -c 10 https://safework2.jclee.me/health

# Lambda 함수 로그 확인
aws logs tail /aws/lambda/safework2-survey --follow --profile safework2
```

## 🔄 롤백 계획

### Emergency Rollback Procedure
```bash
# 1. DNS 즉시 되돌리기 (기존 safework.jclee.me로)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$DNS_RECORD_ID" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --data '{"content":"221.153.20.249"}'  # 기존 IP로 복원

# 2. 기존 컨테이너 재시작
docker-compose up -d -f /home/jclee/app/safework/docker-compose.yml

# 3. 트래픽 검증
curl https://safework.jclee.me/health
```

## 📈 예상 성과 및 이익

### Technical Benefits
- **Cold Start 최소화**: Provisioned Concurrency로 평균 응답시간 50% 단축
- **무한 확장성**: 동시 사용자 1000+ 자동 처리
- **99.9% 가용성**: AWS Lambda SLA 보장
- **비용 효율성**: 사용량 기반 과금으로 60-70% 비용 절감

### Operational Benefits
- **Zero Server Management**: 인프라 운영 부담 제거
- **자동 백업**: RDS 자동 백업 및 복구
- **보안 강화**: AWS WAF + VPC 보안
- **글로벌 CDN**: CloudFront 통합으로 응답속도 향상

이 마이그레이션 계획을 통해 SafeWork 시스템을 현대적이고 비용 효율적인 서버리스 아키텍처로 전환할 수 있습니다.