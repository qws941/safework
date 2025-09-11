# SafeWork MySQL Container
FROM mysql:8.0

# Watchtower 라벨 추가
LABEL com.centurylinklabs.watchtower.enable="true" \
      maintainer="SafeWork Team" \
      org.label-schema.name="safework-mysql" \
      org.label-schema.description="SafeWork MySQL Database with Korean locale and initialization scripts"

# 환경 변수 설정
ENV MYSQL_ROOT_PASSWORD=safework2024root \
    MYSQL_DATABASE=safework_db \
    MYSQL_USER=safework \
    MYSQL_PASSWORD=safework2024 \
    MYSQL_CHARACTER_SET_SERVER=utf8mb4 \
    MYSQL_COLLATION_SERVER=utf8mb4_unicode_ci \
    TZ=Asia/Seoul

# 초기화 스크립트 디렉토리 생성
RUN mkdir -p /docker-entrypoint-initdb.d/

# 포트 노출
EXPOSE 3306

# 헬스체크
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=30s \
    CMD mysqladmin ping -h localhost -u root -p\${MYSQL_ROOT_PASSWORD} || exit 1
