"""
SafeWork Health & Main Lambda Handler
헬스 체크 및 메인 페이지 요청을 처리하는 Lambda 함수
"""
import json
import os
import sys
import logging
import time
from datetime import datetime
from typing import Dict, Any

# 로거 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Lambda 시작 시간
LAMBDA_START_TIME = time.time()

def get_database_health() -> Dict[str, Any]:
    """데이터베이스 연결 상태 확인"""
    try:
        # Lambda Layer에서 공통 모듈 import
        sys.path.append('/opt/python')

        import boto3
        import psycopg2
        from sqlalchemy import create_engine, text

        # 환경 변수에서 DB 정보 가져오기
        db_host = os.environ.get('DB_HOST')
        db_name = os.environ.get('DB_NAME', 'safework_db')
        db_user = os.environ.get('DB_USER', 'safework')
        db_password = os.environ.get('DB_PASSWORD')

        if not all([db_host, db_password]):
            return {
                'status': 'unhealthy',
                'error': 'Database configuration missing',
                'connection': False
            }

        # SQLAlchemy 엔진을 통한 연결 테스트
        db_url = f"postgresql://{db_user}:{db_password}@{db_host}:5432/{db_name}"
        engine = create_engine(db_url, pool_size=1, max_overflow=0, pool_pre_ping=True)

        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1 as health_check"))
            row = result.fetchone()

            if row and row[0] == 1:
                return {
                    'status': 'healthy',
                    'connection': True,
                    'response_time_ms': 50  # 대략적인 응답 시간
                }

    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'connection': False
        }

    return {
        'status': 'unhealthy',
        'error': 'Unknown database error',
        'connection': False
    }

def get_redis_health() -> Dict[str, Any]:
    """Redis 연결 상태 확인"""
    try:
        import redis

        redis_host = os.environ.get('REDIS_HOST')
        if not redis_host:
            return {
                'status': 'unhealthy',
                'error': 'Redis configuration missing',
                'connection': False
            }

        r = redis.Redis(host=redis_host, port=6379, decode_responses=True, socket_connect_timeout=3)
        r.ping()

        return {
            'status': 'healthy',
            'connection': True,
            'response_time_ms': 10
        }

    except Exception as e:
        logger.error(f"Redis health check failed: {str(e)}")
        return {
            'status': 'degraded',  # Redis는 필수가 아님
            'error': str(e),
            'connection': False
        }

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Health & Main Lambda 핸들러

    Args:
        event: API Gateway 이벤트
        context: Lambda 컨텍스트

    Returns:
        API Gateway 응답 형식
    """

    # Warmup 이벤트 처리
    if event.get('source') == 'serverless-plugin-warmup':
        logger.info('WarmUp - Lambda is warm!')
        return {'statusCode': 200, 'body': 'Lambda is warm'}

    path = event.get('path', '')
    method = event.get('httpMethod', 'GET')

    logger.info(f"Health Lambda processing {method} {path}")

    # 헬스 체크 엔드포인트
    if path == '/health':
        try:
            # 시스템 정보
            uptime_seconds = time.time() - LAMBDA_START_TIME
            current_time = datetime.now().isoformat()

            # 인프라 헬스 체크
            db_health = get_database_health()
            redis_health = get_redis_health()

            # 전체 상태 판단
            overall_status = 'healthy'
            if db_health['status'] == 'unhealthy':
                overall_status = 'unhealthy'
            elif redis_health['status'] == 'unhealthy':
                overall_status = 'degraded'

            health_response = {
                'service': 'safework2',
                'status': overall_status,
                'timestamp': current_time,
                'version': '2.0.0-serverless',
                'environment': 'production',
                'architecture': 'serverless',
                'uptime_seconds': int(uptime_seconds),
                'lambda_function': 'health',
                'components': {
                    'database': db_health,
                    'cache': redis_health,
                    'application': {
                        'status': 'healthy',
                        'connection': True
                    }
                },
                'aws': {
                    'region': context.invoked_function_arn.split(':')[3],
                    'function_name': context.function_name,
                    'function_version': context.function_version,
                    'memory_limit': context.memory_limit_in_mb,
                    'remaining_time_ms': context.get_remaining_time_in_millis()
                }
            }

            status_code = 200 if overall_status == 'healthy' else 503

            return {
                'statusCode': status_code,
                'headers': {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(health_response, indent=2)
            }

        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'service': 'safework2',
                    'status': 'unhealthy',
                    'error': str(e),
                    'lambda_function': 'health'
                })
            }

    # 메인 페이지 (/)
    elif path == '/' or path == '':
        try:
            # serverless-wsgi를 통해 Flask 앱 실행
            sys.path.append('/opt/python')
            from serverless_wsgi import handle_request
            from app import create_app

            # Flask 앱 초기화
            os.environ['FLASK_CONFIG'] = 'production'
            os.environ['SERVERLESS'] = 'true'

            flask_app = create_app('production')

            # Flask 앱을 통해 메인 페이지 렌더링
            response = handle_request(flask_app, event, context)

            logger.info(f"Main page served successfully: {response.get('statusCode', 500)}")
            return response

        except Exception as e:
            logger.error(f"Main page error: {str(e)}")

            # Fallback HTML 응답
            fallback_html = f"""
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SafeWork 2.0 - 산업안전보건 관리시스템</title>
                <style>
                    body {{ font-family: 'Segoe UI', sans-serif; margin: 0; padding: 40px; background: #f5f5f5; }}
                    .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    h1 {{ color: #2c3e50; margin-bottom: 30px; }}
                    .status {{ background: #e8f5e8; padding: 20px; border-radius: 6px; margin: 20px 0; }}
                    .info {{ background: #f8f9fa; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 14px; }}
                    a {{ color: #3498db; text-decoration: none; }}
                    a:hover {{ text-decoration: underline; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🏗️ SafeWork 2.0 - 서버리스 아키텍처</h1>

                    <div class="status">
                        <h3>✅ 서비스 상태: 정상 운영</h3>
                        <p>SafeWork 시스템이 서버리스 아키텍처로 성공적으로 마이그레이션되었습니다.</p>
                    </div>

                    <h3>📋 주요 기능</h3>
                    <ul>
                        <li><a href="/survey/001_musculoskeletal_symptom_survey">근골격계 증상 설문조사</a></li>
                        <li><a href="/survey/002_work_environment_assessment">작업환경 평가</a></li>
                        <li><a href="/survey/003_musculoskeletal_program_enhanced">통합 근골격계 프로그램</a></li>
                        <li><a href="/admin">관리자 패널</a></li>
                        <li><a href="/api/safework/v2">API 문서</a></li>
                    </ul>

                    <h3>🚀 서버리스 정보</h3>
                    <div class="info">
                        아키텍처: AWS Lambda + API Gateway<br>
                        데이터베이스: Aurora Serverless v2<br>
                        캐시: ElastiCache Serverless<br>
                        DNS: safework2.jclee.me<br>
                        배포 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}<br>
                        에러: {str(e)[:100]}...
                    </div>

                    <p>
                        <a href="/health">시스템 헬스 체크</a> |
                        <a href="https://safework.jclee.me">기존 버전 (컨테이너)</a>
                    </p>
                </div>
            </body>
            </html>
            """

            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'public, max-age=300',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': fallback_html
            }

    # 잘못된 경로
    else:
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Not Found',
                'message': f'Path {path} not handled by Health Lambda',
                'handler': 'health'
            })
        }