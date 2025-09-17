FROM postgres:15-alpine

# Set timezone to Seoul
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install additional utilities
RUN apk add --no-cache \
    curl \
    postgresql-contrib

# Set up PostgreSQL configuration with environment variable defaults
# CRITICAL: These defaults should be overridden in production with secure values
ENV POSTGRES_DB=${POSTGRES_DB:-safework_db}
ENV POSTGRES_USER=${POSTGRES_USER:-safework}
ENV POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-safework2024}

# Security and performance settings
ENV POSTGRES_INITDB_ARGS="--encoding=UTF8 --locale=ko_KR.UTF8"
ENV POSTGRES_HOST_AUTH_METHOD=md5
ENV POSTGRES_SHARED_PRELOAD_LIBRARIES=pg_stat_statements
ENV POSTGRES_MAX_CONNECTIONS=100
ENV POSTGRES_SHARED_BUFFERS=256MB
ENV POSTGRES_EFFECTIVE_CACHE_SIZE=1GB

# Connection and logging settings
ENV POSTGRES_LOG_STATEMENT=all
ENV POSTGRES_LOG_DURATION=on
ENV POSTGRES_LOG_MIN_DURATION_STATEMENT=1000
ENV POSTGRES_LOG_TIMEZONE=Asia/Seoul

# Create initialization scripts directory
# CRITICAL: Copy complete-schema.sql for full database initialization at image level
COPY complete-schema.sql /docker-entrypoint-initdb.d/01-complete-schema.sql
COPY init.sql /docker-entrypoint-initdb.d/02-init.sql

# Copy migrations directory if it exists
COPY migrations/ /docker-entrypoint-initdb.d/migrations/ 2>/dev/null || true

# Create volume for data persistence
VOLUME ["/var/lib/postgresql/data"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} || exit 1

# Expose PostgreSQL port
EXPOSE 5432

# Labels for container management and Watchtower
LABEL maintainer="SafeWork Team" \
      description="PostgreSQL 15 for SafeWork Industrial Health & Safety Management" \
      version="1.0" \
      service="database" \
      com.centurylinklabs.watchtower.enable="true"