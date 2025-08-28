# SafeWork MySQL Container - Optimized v1.3.1
FROM mysql:8.0

# 빌드 인자
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=v1.3.1

# 메타데이터 라벨
LABEL maintainer="SafeWork Team" \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.version=$VERSION \
      org.label-schema.name="safework-mysql" \
      org.label-schema.description="SafeWork MySQL Database with Korean timezone and performance optimizations" \
      com.centurylinklabs.watchtower.enable="true"

# 환경 변수 설정
ENV MYSQL_ROOT_PASSWORD=safework2024root \
    MYSQL_DATABASE=safework_db \
    MYSQL_USER=safework \
    MYSQL_PASSWORD=safework2024 \
    MYSQL_CHARACTER_SET_SERVER=utf8mb4 \
    MYSQL_COLLATION_SERVER=utf8mb4_unicode_ci \
    TZ=Asia/Seoul

# MySQL 설정 파일 생성
RUN echo "[mysqld]" > /etc/mysql/conf.d/safework.cnf && \
    echo "character-set-server=utf8mb4" >> /etc/mysql/conf.d/safework.cnf && \
    echo "collation-server=utf8mb4_unicode_ci" >> /etc/mysql/conf.d/safework.cnf && \
    echo "max_connections=200" >> /etc/mysql/conf.d/safework.cnf && \
    echo "innodb_buffer_pool_size=512M" >> /etc/mysql/conf.d/safework.cnf && \
    echo "innodb_log_file_size=128M" >> /etc/mysql/conf.d/safework.cnf && \
    echo "innodb_flush_log_at_trx_commit=2" >> /etc/mysql/conf.d/safework.cnf && \
    echo "innodb_flush_method=O_DIRECT" >> /etc/mysql/conf.d/safework.cnf && \
    echo "slow_query_log=1" >> /etc/mysql/conf.d/safework.cnf && \
    echo "slow_query_log_file=/var/log/mysql/slow.log" >> /etc/mysql/conf.d/safework.cnf && \
    echo "long_query_time=2" >> /etc/mysql/conf.d/safework.cnf && \
    echo "" >> /etc/mysql/conf.d/safework.cnf && \
    echo "[client]" >> /etc/mysql/conf.d/safework.cnf && \
    echo "default-character-set=utf8mb4" >> /etc/mysql/conf.d/safework.cnf && \
    echo "" >> /etc/mysql/conf.d/safework.cnf && \
    echo "[mysql]" >> /etc/mysql/conf.d/safework.cnf && \
    echo "default-character-set=utf8mb4" >> /etc/mysql/conf.d/safework.cnf

# 초기화 SQL 스크립트
COPY init.sql /docker-entrypoint-initdb.d/

# 로그 디렉토리 생성
RUN mkdir -p /var/log/mysql && \
    chown -R mysql:mysql /var/log/mysql

# 포트 노출
EXPOSE 3306

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD || exit 1

# MySQL 실행
CMD ["mysqld"]