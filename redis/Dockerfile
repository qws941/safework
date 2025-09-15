# SafeWork Redis Container
FROM redis:7-alpine

# Define volume for Redis data persistence
VOLUME ["/data"]

# Watchtower label for auto-updates
LABEL com.centurylinklabs.watchtower.enable="true" \
      maintainer="SafeWork Team" \
      org.label-schema.name="safework-redis" \
      org.label-schema.description="SafeWork Redis Cache with optimized configuration"

# Environment variables
ENV REDIS_REPLICATION_MODE=master \
    REDIS_PASSWORD= \
    TZ=Asia/Seoul

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