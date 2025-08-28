# SafeWork App Container - Optimized v1.3.1
FROM python:3.11-slim

# 빌드 인자
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=v1.3.1

# 메타데이터 라벨
LABEL maintainer="SafeWork Team" \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.version=$VERSION \
      org.label-schema.name="safework-app" \
      org.label-schema.description="SafeWork Flask Application with MySQL migrations and document management" \
      com.centurylinklabs.watchtower.enable="true"

# 환경 변수 설정 (운영에 필요한 모든 설정)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FLASK_APP=app.py \
    FLASK_CONFIG=production \
    SECRET_KEY=safework-production-secret-key-2024 \
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
    APP_PORT=4545 \
    TZ=Asia/Seoul

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 설치 (최적화된 단일 레이어)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        default-libmysqlclient-dev \
        pkg-config \
        tzdata \
    && cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime \
    && echo "Asia/Seoul" > /etc/timezone \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Python 패키지 설치 (캐시 최적화)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt \
    && pip cache purge

# 애플리케이션 코드 복사 (최적화된 레이어링)
COPY . /app/

# 디렉토리 생성 및 권한 설정
RUN mkdir -p /app/uploads /app/forms /app/logs \
    && chmod -R 755 /app \
    && chmod +x /app/migrate.py \
    && chmod +x /app/start.sh

# 비루트 사용자 생성 및 전환 (보안)
RUN groupadd -r safework && \
    useradd -r -g safework -d /app -s /sbin/nologin -c "SafeWork User" safework \
    && chown -R safework:safework /app

USER safework

# 포트 노출
EXPOSE 4545

# 헬스체크 (개선된 버전)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:4545/health')" || exit 1

# 마이그레이션을 포함한 애플리케이션 실행
CMD ["/app/start.sh"]