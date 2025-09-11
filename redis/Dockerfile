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

# 헬스체크
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
    CMD redis-cli ping || exit 1

# Redis 실행 (기본 설정 사용)
CMD ["redis-server", "--bind", "0.0.0.0", "--appendonly", "yes"]