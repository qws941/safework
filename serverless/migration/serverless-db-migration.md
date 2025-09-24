# SafeWork 서버리스 데이터베이스 마이그레이션 가이드

## 1. Aurora Serverless v2 설정

### Aurora Cluster 생성
```yaml
# CloudFormation/CDK로 Aurora Serverless v2 생성
Resources:
  SafeWorkAuroraCluster:
    Type: AWS::RDS::DBCluster
    Properties:
      DBClusterIdentifier: safework2-aurora-cluster
      Engine: aurora-postgresql
      EngineVersion: '15.4'
      ServerlessV2ScalingConfiguration:
        MinCapacity: 0.5
        MaxCapacity: 16
      DatabaseName: safework_db
      MasterUsername: safework
      MasterUserPassword: !Ref DBPassword
      VpcSecurityGroupIds:
        - !Ref AuroraSecurityGroup
      DBSubnetGroupName: !Ref DBSubnetGroup
      BackupRetentionPeriod: 7
      PreferredBackupWindow: "03:00-04:00"
      PreferredMaintenanceWindow: "sun:04:00-sun:05:00"
      StorageEncrypted: true
      DeletionProtection: true

  SafeWorkAuroraInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: db.serverless
      DBClusterIdentifier: !Ref SafeWorkAuroraCluster
      Engine: aurora-postgresql
      PubliclyAccessible: false
```

### 연결 풀링 설정 (RDS Proxy)
```yaml
  RDSProxy:
    Type: AWS::RDS::DBProxy
    Properties:
      DBProxyName: safework2-rds-proxy
      EngineFamily: POSTGRESQL
      Auth:
        - AuthScheme: SECRETS
          SecretArn: !Ref DBSecret
      RoleArn: !Ref RDSProxyRole
      VpcSubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      VpcSecurityGroupIds:
        - !Ref ProxySecurityGroup
      TargetGroupName: default
      DBClusterIdentifiers:
        - !Ref SafeWorkAuroraCluster
      IdleClientTimeout: 1800
      MaxConnectionsPercent: 100
      MaxIdleConnectionsPercent: 50
      RequireTLS: true
```

## 2. 기존 데이터 마이그레이션

### 데이터 백업 및 복원 스크립트
```python
#!/usr/bin/env python3
"""
SafeWork 데이터베이스 서버리스 마이그레이션 스크립트
기존 PostgreSQL → Aurora Serverless v2
"""
import os
import sys
import json
import subprocess
import boto3
import psycopg2
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SafeWorkDBMigration:
    def __init__(self):
        # 기존 컨테이너 DB 연결 정보
        self.source_config = {
            'host': 'safework.jclee.me',
            'port': 5432,
            'database': 'safework_db',
            'user': 'safework',
            'password': os.environ.get('SOURCE_DB_PASSWORD')
        }

        # Aurora Serverless v2 연결 정보
        self.target_config = {
            'host': os.environ.get('AURORA_ENDPOINT'),
            'port': 5432,
            'database': 'safework_db',
            'user': 'safework',
            'password': os.environ.get('AURORA_PASSWORD')
        }

        self.backup_path = f"/tmp/safework_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def create_backup(self):
        """기존 데이터베이스 백업"""
        logger.info("Creating database backup...")

        dump_command = [
            'pg_dump',
            f"postgresql://{self.source_config['user']}:{self.source_config['password']}@{self.source_config['host']}:{self.source_config['port']}/{self.source_config['database']}",
            '--format=custom',
            '--no-owner',
            '--no-privileges',
            '--verbose',
            f"--file={self.backup_path}.dump"
        ]

        try:
            subprocess.run(dump_command, check=True)
            logger.info(f"Backup created successfully: {self.backup_path}.dump")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Backup failed: {e}")
            return False

    def verify_aurora_connection(self):
        """Aurora Serverless v2 연결 확인"""
        logger.info("Verifying Aurora connection...")

        try:
            conn = psycopg2.connect(**self.target_config)
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            logger.info(f"Aurora connection successful: {version}")
            cursor.close()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Aurora connection failed: {e}")
            return False

    def restore_to_aurora(self):
        """Aurora Serverless v2로 복원"""
        logger.info("Restoring to Aurora Serverless v2...")

        restore_command = [
            'pg_restore',
            '--verbose',
            '--clean',
            '--no-owner',
            '--no-privileges',
            f"--host={self.target_config['host']}",
            f"--port={self.target_config['port']}",
            f"--username={self.target_config['user']}",
            f"--dbname={self.target_config['database']}",
            f"{self.backup_path}.dump"
        ]

        env = os.environ.copy()
        env['PGPASSWORD'] = self.target_config['password']

        try:
            subprocess.run(restore_command, env=env, check=True)
            logger.info("Restore completed successfully")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Restore failed: {e}")
            return False

    def verify_data_migration(self):
        """데이터 마이그레이션 검증"""
        logger.info("Verifying data migration...")

        # 주요 테이블 row count 비교
        tables_to_check = [
            'users', 'surveys', 'audit_logs',
            'safework_workers', 'safework_companies',
            'safework_survey_responses'
        ]

        source_counts = {}
        target_counts = {}

        # Source DB counts
        try:
            conn_source = psycopg2.connect(**self.source_config)
            cursor_source = conn_source.cursor()

            for table in tables_to_check:
                cursor_source.execute(f"SELECT COUNT(*) FROM {table}")
                source_counts[table] = cursor_source.fetchone()[0]

            cursor_source.close()
            conn_source.close()
        except Exception as e:
            logger.error(f"Source DB verification failed: {e}")
            return False

        # Target DB counts
        try:
            conn_target = psycopg2.connect(**self.target_config)
            cursor_target = conn_target.cursor()

            for table in tables_to_check:
                cursor_target.execute(f"SELECT COUNT(*) FROM {table}")
                target_counts[table] = cursor_target.fetchone()[0]

            cursor_target.close()
            conn_target.close()
        except Exception as e:
            logger.error(f"Target DB verification failed: {e}")
            return False

        # 비교 결과
        verification_success = True
        for table in tables_to_check:
            source_count = source_counts.get(table, 0)
            target_count = target_counts.get(table, 0)

            if source_count != target_count:
                logger.error(f"Mismatch in {table}: source={source_count}, target={target_count}")
                verification_success = False
            else:
                logger.info(f"✓ {table}: {source_count} rows migrated successfully")

        return verification_success

    def create_lambda_database_config(self):
        """Lambda 함수용 DB 설정 파일 생성"""
        logger.info("Creating Lambda database configuration...")

        db_config = {
            'aurora_config': {
                'host': self.target_config['host'],
                'port': self.target_config['port'],
                'database': self.target_config['database'],
                'user': self.target_config['user'],
                'password_secret_name': 'safework2/database/password',
                'connection_pool': {
                    'min_size': 1,
                    'max_size': 10,
                    'max_idle_time': 300,
                    'retry_attempts': 3
                }
            },
            'serverless_optimizations': {
                'enable_connection_pooling': True,
                'use_rds_proxy': True,
                'rds_proxy_endpoint': os.environ.get('RDS_PROXY_ENDPOINT'),
                'connection_timeout': 30,
                'statement_timeout': 60000
            }
        }

        config_path = '/home/jclee/app/safework/serverless/config/database.json'
        os.makedirs(os.path.dirname(config_path), exist_ok=True)

        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(db_config, f, indent=2, ensure_ascii=False)

        logger.info(f"Database configuration saved to {config_path}")

    def run_migration(self):
        """전체 마이그레이션 실행"""
        logger.info("Starting SafeWork serverless migration...")

        steps = [
            ("Creating backup", self.create_backup),
            ("Verifying Aurora connection", self.verify_aurora_connection),
            ("Restoring to Aurora", self.restore_to_aurora),
            ("Verifying migration", self.verify_data_migration),
            ("Creating Lambda config", self.create_lambda_database_config)
        ]

        for step_name, step_func in steps:
            logger.info(f"Step: {step_name}")
            if not step_func():
                logger.error(f"Migration failed at step: {step_name}")
                return False
            logger.info(f"✓ {step_name} completed")

        logger.info("🎉 SafeWork serverless migration completed successfully!")
        return True

if __name__ == "__main__":
    migration = SafeWorkDBMigration()

    # 환경 변수 확인
    required_env_vars = [
        'SOURCE_DB_PASSWORD', 'AURORA_ENDPOINT', 'AURORA_PASSWORD', 'RDS_PROXY_ENDPOINT'
    ]

    missing_vars = [var for var in required_env_vars if not os.environ.get(var)]
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        sys.exit(1)

    # 마이그레이션 실행
    success = migration.run_migration()
    sys.exit(0 if success else 1)
```

## 3. ElastiCache Serverless 설정

### Redis 클러스터 생성
```yaml
  ElastiCacheServerlessCache:
    Type: AWS::ElastiCache::ServerlessCache
    Properties:
      ServerlessCacheName: safework2-redis
      Engine: redis
      Description: SafeWork2 Serverless Redis Cache
      CacheUsageLimits:
        DataStorage:
          Maximum: 10
          Unit: GB
        ECPUPerSecond:
          Maximum: 1000
      DailySnapshotTime: "03:00"
      SecurityGroupIds:
        - !Ref RedisSecurityGroup
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      UserGroupId: !Ref RedisUserGroup
```

## 4. Lambda Layer 구성

### 공통 라이브러리 Layer
```bash
#!/bin/bash
# Lambda Layer 생성 스크립트

mkdir -p /tmp/python-layer/python
cd /tmp/python-layer/python

# Python 의존성 설치
pip install -t . \
    flask==3.0.0 \
    sqlalchemy==2.0.23 \
    psycopg2-binary==2.9.9 \
    redis==5.0.1 \
    werkzeug==3.0.1 \
    jinja2==3.1.2 \
    boto3==1.34.0 \
    serverless-wsgi==3.0.0

# Layer ZIP 생성
cd /tmp/python-layer
zip -r safework2-python-layer.zip python/

# AWS Lambda Layer 업로드
aws lambda publish-layer-version \
    --layer-name safework2-python-dependencies \
    --zip-file fileb://safework2-python-layer.zip \
    --compatible-runtimes python3.11 \
    --description "SafeWork2 Serverless Python Dependencies"
```

### Flask 앱 Layer
```bash
#!/bin/bash
# SafeWork Flask 앱 Layer

mkdir -p /tmp/safework-app-layer/python
cd /home/jclee/app/safework

# Flask 앱 코드 복사 (templates, static 포함)
cp -r app/ /tmp/safework-app-layer/python/
cp -r templates/ /tmp/safework-app-layer/python/ 2>/dev/null || true
cp -r static/ /tmp/safework-app-layer/python/ 2>/dev/null || true

# Layer ZIP 생성
cd /tmp/safework-app-layer
zip -r safework2-app-layer.zip python/

# Layer 업로드
aws lambda publish-layer-version \
    --layer-name safework2-application-code \
    --zip-file fileb://safework2-app-layer.zip \
    --compatible-runtimes python3.11 \
    --description "SafeWork2 Flask Application Code"
```

## 5. 환경 변수 및 Secrets 설정

### AWS Secrets Manager
```python
import boto3
import json

secrets_client = boto3.client('secretsmanager')

# 데이터베이스 비밀번호
db_secret = {
    'username': 'safework',
    'password': 'safework2024-aurora',
    'engine': 'postgres',
    'host': 'safework2-aurora-cluster-writer.cluster-xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com',
    'port': 5432,
    'dbname': 'safework_db'
}

secrets_client.create_secret(
    Name='safework2/database',
    SecretString=json.dumps(db_secret),
    Description='SafeWork2 Aurora database credentials'
)

# Flask Secret Key
secrets_client.create_secret(
    Name='safework2/flask/secret-key',
    SecretString='safework2-production-secret-key-2024-serverless',
    Description='SafeWork2 Flask secret key'
)

# Admin 계정
admin_secret = {
    'username': 'admin',
    'password': 'safework2024-admin'
}

secrets_client.create_secret(
    Name='safework2/admin',
    SecretString=json.dumps(admin_secret),
    Description='SafeWork2 admin credentials'
)
```

## 6. 서버리스 최적화 설정

### Lambda 환경 변수 템플릿
```yaml
# serverless.yml의 환경 변수 섹션
provider:
  environment:
    FLASK_CONFIG: production
    SERVERLESS: true
    TZ: Asia/Seoul

    # Aurora Serverless v2
    DB_HOST: ${param:aurora-endpoint}
    DB_NAME: safework_db
    DB_USER: safework
    DB_PASSWORD: ${param:db-password}

    # ElastiCache Serverless
    REDIS_HOST: ${param:redis-endpoint}
    REDIS_PORT: 6379
    REDIS_SSL: true

    # Connection Pooling
    DB_POOL_SIZE: 5
    DB_POOL_OVERFLOW: 0
    DB_POOL_PRE_PING: true
    DB_POOL_RECYCLE: 3600

    # Lambda Optimizations
    LAMBDA_COLD_START_OPTIMIZATION: true
    ENABLE_CONNECTION_POOLING: true
    CONNECTION_TIMEOUT: 30
```

## 7. 배포 순서

### 1단계: 인프라 배포
```bash
# Serverless Framework로 인프라 배포
cd /home/jclee/app/safework/serverless

# 환경 변수 설정
export AWS_PROFILE=safework-production
export AWS_REGION=ap-northeast-2

# 배포 실행
sls deploy --stage prod --region ap-northeast-2
```

### 2단계: 데이터 마이그레이션
```bash
# 환경 변수 설정 후 마이그레이션 실행
export SOURCE_DB_PASSWORD=safework2024
export AURORA_ENDPOINT=safework2-aurora-cluster-writer.cluster-xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com
export AURORA_PASSWORD=safework2024-aurora
export RDS_PROXY_ENDPOINT=safework2-rds-proxy.proxy-xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com

python serverless-db-migration.py
```

### 3단계: API Gateway Custom Domain 설정
```bash
# Custom Domain 생성 (Certificate Manager에서 *.jclee.me 인증서 사용)
sls create_domain --stage prod

# DNS 레코드 확인
dig api-safework2.jclee.me
```

### 4단계: 헬스 체크 및 검증
```bash
# Lambda 함수 테스트
curl https://api-safework2.jclee.me/health
curl https://safework2.jclee.me/health

# 주요 엔드포인트 테스트
curl https://safework2.jclee.me/survey/001_musculoskeletal_symptom_survey
curl https://safework2.jclee.me/admin/
```

## 8. 모니터링 및 알람

### CloudWatch 알람 설정
```yaml
# serverless.yml 모니터링 섹션
resources:
  Resources:
    LambdaErrorAlarm:
      Type: AWS::CloudWatch::Alarm
      Properties:
        AlarmName: safework2-lambda-errors
        AlarmDescription: SafeWork2 Lambda function errors
        MetricName: Errors
        Namespace: AWS/Lambda
        Statistic: Sum
        Period: 300
        EvaluationPeriods: 1
        Threshold: 5
        ComparisonOperator: GreaterThanThreshold
        Dimensions:
          - Name: FunctionName
            Value: !Ref SurveyLambdaFunction
        AlarmActions:
          - !Ref SNSTopic

    AuroraConnectionAlarm:
      Type: AWS::CloudWatch::Alarm
      Properties:
        AlarmName: safework2-aurora-connections
        AlarmDescription: Aurora Serverless connection count
        MetricName: DatabaseConnections
        Namespace: AWS/RDS
        Statistic: Average
        Period: 300
        EvaluationPeriods: 2
        Threshold: 80
        ComparisonOperator: GreaterThanThreshold
        Dimensions:
          - Name: DBClusterIdentifier
            Value: !Ref SafeWorkAuroraCluster
```

## 9. 롤백 계획

### 서버리스 롤백 스크립트
```bash
#!/bin/bash
# 서버리스 배포 롤백

echo "SafeWork2 서버리스 롤백 시작..."

# 1. DNS를 기존 서비스로 되돌리기
echo "DNS 롤백 중..."
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$MAIN_RECORD_ID" \
  -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
  -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"content": "safework.jclee.me"}'

# 2. 기존 컨테이너 서비스 재시작
echo "기존 서비스 재시작 중..."
curl -X POST "https://portainer.jclee.me/api/stacks/3/start" \
  -H "X-API-Key: ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q="

# 3. 헬스 체크
sleep 30
if curl -f https://safework.jclee.me/health; then
  echo "✓ 롤백 완료 - 기존 서비스 정상 동작"
else
  echo "❌ 롤백 실패 - 수동 개입 필요"
fi
```

이 마이그레이션 가이드를 통해 SafeWork를 안전하고 체계적으로 서버리스 아키텍처로 전환할 수 있습니다.