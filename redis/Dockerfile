# SafeWork Redis Container
FROM redis:7-alpine

# Watchtower 라벨 추가
LABEL com.centurylinklabs.watchtower.enable="true" \
      maintainer="SafeWork Team" \
      org.label-schema.name="safework-redis" \
      org.label-schema.description="SafeWork Redis Cache with optimized configuration"

# 환경 변수 설정
ENV REDIS_REPLICATION_MODE=master \
    REDIS_PASSWORD= \
    TZ=Asia/Seoul

# timezone 설정 (Alpine)
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone && \
    apk del tzdata

# 포트 노출
EXPOSE 6379

# 헬스체크 개선 (독립성 보장)
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD redis-cli ping || exit 1

# Copy Redis configuration if exists
COPY redis.conf /usr/local/etc/redis/redis.conf 2>/dev/null || echo "Using default Redis config"

# Redis 실행 (독립적 구성, 리소스 제한 제거)
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]