FROM postgres:15-alpine

# Set timezone to Seoul
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install additional utilities
RUN apk add --no-cache \
    curl \
    postgresql-contrib

# Set up PostgreSQL configuration
ENV POSTGRES_DB=safework_db
ENV POSTGRES_USER=safework
ENV POSTGRES_PASSWORD=safework2024

# Create initialization scripts directory
COPY init.sql /docker-entrypoint-initdb.d/

# Create volume for data persistence
VOLUME ["/var/lib/postgresql/data"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} || exit 1

# Expose PostgreSQL port
EXPOSE 5432

# Labels for container management and Watchtower
LABEL maintainer="SafeWork Team" \
      description="PostgreSQL 15 for SafeWork Industrial Health & Safety Management" \
      version="1.0" \
      service="database" \
      com.centurylinklabs.watchtower.enable="true"