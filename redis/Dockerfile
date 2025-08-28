# SafeWork Redis Container - Optimized v1.3.1
FROM redis:7-alpine

# 빌드 인자
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=v1.3.1

# 메타데이터 라벨
LABEL maintainer="SafeWork Team" \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.version=$VERSION \
      org.label-schema.name="safework-redis" \
      org.label-schema.description="SafeWork Redis Cache with performance optimizations" \
      com.centurylinklabs.watchtower.enable="true"

# 환경 변수
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
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD redis-cli ping || exit 1

# Redis 실행
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]