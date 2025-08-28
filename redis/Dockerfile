# SafeWork Redis Container
FROM redis:7-alpine

# 환경 변수
ENV REDIS_REPLICATION_MODE=master \
    REDIS_PASSWORD= \
    TZ=Asia/Seoul

# Watchtower 라벨
LABEL com.centurylinklabs.watchtower.enable="true"

# Redis 설정 파일
COPY <<EOF /usr/local/etc/redis/redis.conf
# Redis Configuration for SafeWork

# 네트워크
bind 0.0.0.0
protected-mode no
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# 일반 설정
daemonize no
supervised no
pidfile /var/run/redis_6379.pid
loglevel notice
logfile ""
databases 16

# 스냅샷 설정
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename safework.rdb
dir /data

# 복제 설정
replica-serve-stale-data yes
replica-read-only yes
repl-diskless-sync no
repl-diskless-sync-delay 5
repl-disable-tcp-nodelay no
replica-priority 100

# 메모리 관리
maxmemory 512mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# AOF 설정
appendonly yes
appendfilename "safework.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes

# 슬로우 로그
slowlog-log-slower-than 10000
slowlog-max-len 128

# 클라이언트 설정
maxclients 10000
EOF

# 데이터 디렉토리 생성
RUN mkdir -p /data && chown redis:redis /data

# 포트 노출
EXPOSE 6379

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD redis-cli ping || exit 1

# Redis 실행
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]