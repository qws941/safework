"""
SafeWork Survey Lambda Handler
설문 관련 모든 요청을 처리하는 Lambda 함수
"""
import json
import os
import sys
import logging
from typing import Dict, Any

# Lambda Layer에서 공통 모듈 import
sys.path.append('/opt/python')

# Flask 앱 관련 import
try:
    from serverless_wsgi import handle_request
    import boto3
    from flask import Flask, Blueprint, request, jsonify
except ImportError as e:
    print(f"Import error: {e}")
    raise

# 로거 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Flask 앱 초기화 (한 번만)
app = None

def init_app():
    """Flask 애플리케이션 초기화 (Cold Start 시에만)"""
    global app

    if app is not None:
        return app

    logger.info("Initializing Flask app for Survey Lambda")

    # 환경 변수 설정
    os.environ['FLASK_CONFIG'] = 'production'
    os.environ['SERVERLESS'] = 'true'

    try:
        # Flask 앱 생성 (기존 SafeWork 앱 팩토리 패턴 사용)
        from app import create_app
        app = create_app('production')

        # 설문 관련 블루프린트만 등록 (다른 블루프린트는 제거)
        # app.py에서 기본 등록된 블루프린트 중 survey만 남기고 제거
        blueprints_to_remove = []
        for bp_name, bp in app.blueprints.items():
            if not bp_name.startswith('survey') and bp_name != 'main':
                blueprints_to_remove.append(bp_name)

        for bp_name in blueprints_to_remove:
            app.blueprints.pop(bp_name, None)

        logger.info(f"Survey Lambda initialized with blueprints: {list(app.blueprints.keys())}")

        return app

    except Exception as e:
        logger.error(f"Failed to initialize Flask app: {str(e)}")
        raise

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Survey Lambda 핸들러

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

    # 경로 확인 - 설문 관련 경로만 처리
    path = event.get('path', '')
    allowed_paths = ['/survey/', '/api/safework/']

    if not any(path.startswith(allowed_path) for allowed_path in allowed_paths):
        logger.warning(f"Unauthorized path for Survey Lambda: {path}")
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Not Found',
                'message': f'Path {path} not handled by Survey Lambda',
                'handler': 'survey'
            })
        }

    # Flask 앱 초기화
    try:
        flask_app = init_app()
        if not flask_app:
            raise Exception("Failed to initialize Flask app")

        logger.info(f"Processing {event.get('httpMethod', 'UNKNOWN')} {path}")

        # serverless-wsgi를 통해 Flask 앱 실행
        response = handle_request(flask_app, event, context)

        # 응답 로깅
        status_code = response.get('statusCode', 500)
        if status_code >= 400:
            logger.warning(f"Survey Lambda returned {status_code} for {path}")
        else:
            logger.info(f"Survey Lambda successful {status_code} for {path}")

        return response

    except Exception as e:
        logger.error(f"Survey Lambda error: {str(e)}")

        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal Server Error',
                'message': str(e),
                'handler': 'survey',
                'path': path
            })
        }

# Lambda 함수 웜업을 위한 글로벌 초기화
try:
    init_app()
    logger.info("Survey Lambda pre-warmed successfully")
except Exception as e:
    logger.error(f"Survey Lambda pre-warm failed: {str(e)}")