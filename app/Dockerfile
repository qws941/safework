# SafeWork Flask Application Dockerfile
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
ENV DB_HOST=safework-postgres
ENV DB_PORT=5432
ENV DB_USER=safework
ENV DB_NAME=safework

# Redis connection settings (container-aware defaults)
ENV REDIS_HOST=safework-redis
ENV REDIS_PORT=6379
ENV REDIS_DB=0

# Admin settings (secure defaults - must be overridden)
ENV ADMIN_USERNAME=admin

# Connection retry settings for independent container execution
ENV DB_CONNECTION_RETRIES=60
ENV DB_CONNECTION_DELAY=3
ENV REDIS_CONNECTION_RETRIES=10
ENV REDIS_CONNECTION_DELAY=1

# Environment URLs
ENV DEV_URL=https://safework-dev.jclee.me
ENV PRD_URL=https://safework.jclee.me
ENV LOCAL_URL=http://localhost:4545

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

# Watchtower labels for container management
LABEL com.centurylinklabs.watchtower.enable="true" \
      com.centurylinklabs.watchtower.scope="safework" \
      com.centurylinklabs.watchtower.lifecycle.pre-update="python -c 'print(\"Preparing app container update\")'" \
      com.centurylinklabs.watchtower.lifecycle.post-update="echo 'SafeWork app container updated successfully'" \
      com.centurylinklabs.watchtower.stop-timeout="45s" \
      maintainer="SafeWork Team" \
      org.label-schema.name="safework-app" \
      org.label-schema.description="SafeWork Flask Application - independent deployment"

# Expose port
EXPOSE 4545

# Run the application with connection retry logic
CMD python app.py