# SafeWork MySQL Container
FROM mysql:8.0

# 환경 변수 설정
ENV MYSQL_ROOT_PASSWORD=safework2024root \
    MYSQL_DATABASE=safework_db \
    MYSQL_USER=safework \
    MYSQL_PASSWORD=safework2024 \
    MYSQL_CHARACTER_SET_SERVER=utf8mb4 \
    MYSQL_COLLATION_SERVER=utf8mb4_unicode_ci \
    TZ=Asia/Seoul

# Watchtower 라벨
LABEL com.centurylinklabs.watchtower.enable="true"

# MySQL 설정 파일
COPY <<EOF /etc/mysql/conf.d/safework.cnf
[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
max_connections=200
innodb_buffer_pool_size=512M
innodb_log_file_size=128M
innodb_flush_log_at_trx_commit=2
innodb_flush_method=O_DIRECT
# Query cache removed in MySQL 8.0
slow_query_log=1
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=2

[client]
default-character-set=utf8mb4

[mysql]
default-character-set=utf8mb4
EOF

# 초기화 SQL 스크립트
COPY <<EOF /docker-entrypoint-initdb.d/init.sql
-- SafeWork 데이터베이스 초기 설정
USE safework_db;

-- 초기 부서 데이터 (선택사항)
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO departments (name) VALUES 
    ('생산1팀'),
    ('생산2팀'),
    ('품질관리팀'),
    ('물류팀'),
    ('사무직'),
    ('연구개발팀')
ON DUPLICATE KEY UPDATE name=name;
EOF

# 포트 노출
EXPOSE 3306

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD || exit 1