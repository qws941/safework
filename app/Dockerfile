# SafeWork Flask Application Dockerfile
# Build: 2025-09-24 03:20 KST - Admin panel fix deployment
FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Define volumes for persistent data
VOLUME ["/app/uploads", "/app/logs", "/app/cache"]

# Set environment variables with secure defaults
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FLASK_APP=app.py
ENV FLASK_CONFIG=production
ENV TZ=Asia/Seoul

# Application settings with secure defaults
ENV APP_PORT=4545
ENV UPLOAD_FOLDER=/app/uploads
ENV WTF_CSRF_ENABLED=false
ENV WTF_CSRF_CHECK_DEFAULT=false

# Database connection settings (PostgreSQL container-aware defaults)
# CRITICAL: DB_PASSWORD must be set via environment or secrets
ENV DB_HOST=${DB_HOST:-safework-postgres}
ENV DB_PORT=${DB_PORT:-5432}
ENV DB_USER=${DB_USER:-safework}
ENV DB_NAME=${DB_NAME:-safework_db}
ENV DB_PASSWORD=${DB_PASSWORD}

# Database pool and connection settings
ENV DB_POOL_SIZE=${DB_POOL_SIZE:-10}
ENV DB_POOL_TIMEOUT=${DB_POOL_TIMEOUT:-30}
ENV DB_POOL_RECYCLE=${DB_POOL_RECYCLE:-3600}
ENV DB_POOL_PRE_PING=${DB_POOL_PRE_PING:-true}
ENV DB_ECHO=${DB_ECHO:-false}

# Redis connection settings (container-aware defaults)
ENV REDIS_HOST=${REDIS_HOST:-safework-redis}
ENV REDIS_PORT=${REDIS_PORT:-6379}
ENV REDIS_DB=${REDIS_DB:-0}
ENV REDIS_PASSWORD=${REDIS_PASSWORD}
ENV REDIS_TIMEOUT=${REDIS_TIMEOUT:-10}
ENV REDIS_SOCKET_CONNECT_TIMEOUT=${REDIS_SOCKET_CONNECT_TIMEOUT:-5}
ENV REDIS_SOCKET_KEEPALIVE=${REDIS_SOCKET_KEEPALIVE:-true}

# Admin settings (secure defaults - MUST be overridden in production)
ENV ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
ENV ADMIN_PASSWORD=${ADMIN_PASSWORD}
ENV SECRET_KEY=${SECRET_KEY}

# Security settings
ENV SESSION_COOKIE_SECURE=${SESSION_COOKIE_SECURE:-true}
ENV SESSION_COOKIE_HTTPONLY=${SESSION_COOKIE_HTTPONLY:-true}
ENV SESSION_COOKIE_SAMESITE=${SESSION_COOKIE_SAMESITE:-Lax}
ENV PERMANENT_SESSION_LIFETIME=${PERMANENT_SESSION_LIFETIME:-3600}

# Connection retry settings for independent container execution
ENV DB_CONNECTION_RETRIES=60
ENV DB_CONNECTION_DELAY=3
ENV REDIS_CONNECTION_RETRIES=10
ENV REDIS_CONNECTION_DELAY=1

# Environment URLs
ENV DEV_URL=https://safework-dev.jclee.me
ENV PRD_URL=https://safework.jclee.me
ENV LOCAL_URL=http://localhost:4545

# Gunicorn production server settings
ENV GUNICORN_WORKERS=${GUNICORN_WORKERS:-3}
ENV GUNICORN_TIMEOUT=${GUNICORN_TIMEOUT:-120}
ENV GUNICORN_KEEPALIVE=${GUNICORN_KEEPALIVE:-2}
ENV GUNICORN_MAX_REQUESTS=${GUNICORN_MAX_REQUESTS:-1000}
ENV GUNICORN_MAX_REQUESTS_JITTER=${GUNICORN_MAX_REQUESTS_JITTER:-100}

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        pkg-config \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create application directories for volumes
RUN mkdir -p /app/uploads /app/logs /app/cache

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=20s --timeout=10s --retries=5 --start-period=90s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:4545/health')"

# SafeWork deployment labels
LABEL safework.deployment.auto="true" \
      safework.service.type="web" \
      safework.service.priority="high" \
      maintainer="SafeWork Team" \
      org.label-schema.name="safework-app" \
      org.label-schema.description="SafeWork Flask Application - direct deployment" \
      com.centurylinklabs.watchtower.enable="true"

# Expose port
EXPOSE 4545

# Production WSGI server (Gunicorn) with fallback to development server
CMD ["sh", "-c", "if [ \"$FLASK_CONFIG\" = 'production' ]; then gunicorn --config gunicorn.conf.py app:app; else python app.py; fi"]