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

# Redis 설정 파일 복사
COPY redis.conf /usr/local/etc/redis/redis.conf

# 데이터 디렉토리 생성 및 권한 설정
RUN mkdir -p /data && \
    chown redis:redis /data && \
    chown -R redis:redis /usr/local/etc/redis

# 사용자 전환
USER redis

# 포트 노출
EXPOSE 6379

# 헬스체크
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
    CMD redis-cli ping || exit 1

# Redis 실행
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
