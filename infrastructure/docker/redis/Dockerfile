# SafeWork Redis Container
FROM redis:7-alpine

# Define volume for Redis data persistence
VOLUME ["/data"]

# SafeWork deployment labels
LABEL safework.deployment.auto="true" \
      safework.service.type="cache" \
      safework.service.priority="medium" \
      maintainer="SafeWork Team" \
      org.label-schema.name="safework-redis" \
      org.label-schema.description="SafeWork Redis Cache with optimized configuration"

# Environment variables with flexible configuration
ENV REDIS_REPLICATION_MODE=${REDIS_REPLICATION_MODE:-master}
ENV REDIS_PASSWORD=${REDIS_PASSWORD}
ENV TZ=${TZ:-Asia/Seoul}

# Redis configuration settings
ENV REDIS_PORT=${REDIS_PORT:-6379}
ENV REDIS_DATABASES=${REDIS_DATABASES:-16}
ENV REDIS_MAXMEMORY=${REDIS_MAXMEMORY:-256mb}
ENV REDIS_MAXMEMORY_POLICY=${REDIS_MAXMEMORY_POLICY:-allkeys-lru}
ENV REDIS_SAVE_INTERVAL=${REDIS_SAVE_INTERVAL:-900 1}
ENV REDIS_LOG_LEVEL=${REDIS_LOG_LEVEL:-notice}

# Security and performance settings
ENV REDIS_TIMEOUT=${REDIS_TIMEOUT:-300}
ENV REDIS_TCP_KEEPALIVE=${REDIS_TCP_KEEPALIVE:-300}
ENV REDIS_PROTECTED_MODE=${REDIS_PROTECTED_MODE:-yes}

# Set timezone (Alpine)
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone && \
    apk del tzdata

# Expose port
EXPOSE 6379

# Health check for independent container monitoring
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD redis-cli ping || exit 1

# Copy Redis configuration
COPY redis.conf /usr/local/etc/redis/redis.conf

# Start Redis with custom config and data persistence
CMD ["redis-server", "/usr/local/etc/redis/redis.conf", "--dir", "/data"]