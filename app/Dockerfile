# SafeWork App Container
FROM python:3.11-slim

# 버전 정보를 빌드 시점에 전달
ARG APP_VERSION=latest

# 환경 변수 설정 (운영에 필요한 모든 설정)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FLASK_APP=app.py \
    FLASK_CONFIG=production \
    SECRET_KEY=safework-production-secret-key-2024 \
    APP_VERSION=${APP_VERSION} \
    MYSQL_HOST=safework-mysql \
    MYSQL_PORT=3306 \
    MYSQL_USER=safework \
    MYSQL_PASSWORD=safework2024 \
    MYSQL_DATABASE=safework_db \
    REDIS_HOST=safework-redis \
    REDIS_PORT=6379 \
    REDIS_PASSWORD= \
    REDIS_DB=0 \
    ADMIN_USERNAME=admin \
    ADMIN_PASSWORD=safework2024 \
    UPLOAD_FOLDER=/app/uploads \
    APP_PORT=4545

# Watchtower 라벨 (자동 업데이트 활성화)
LABEL com.centurylinklabs.watchtower.enable="true"

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . /app/

# 업로드 디렉토리 생성
RUN mkdir -p /app/uploads /app/forms

# 폼 파일은 빌드 시점에 복사됨

# 포트 노출
EXPOSE 4545

# 권한 설정 (마이그레이션 스크립트 실행 가능하도록)
RUN chmod +x /app/migrate.py

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:4545/health')" || exit 1

# 시작 스크립트 생성 (마이그레이션 후 앱 실행)
RUN echo '#!/bin/bash\n\
echo "🗂️ Running database migrations..."\n\
python migrate.py migrate || echo "⚠️ Migration warning (may be first run)"\n\
echo "🚀 Starting SafeWork application..."\n\
exec gunicorn --bind 0.0.0.0:4545 --workers 1 --timeout 120 app:app' > /app/start.sh \
    && chmod +x /app/start.sh

# 마이그레이션을 포함한 애플리케이션 실행
CMD ["/app/start.sh"]