#!/bin/bash
set -e

# Migration runner script for PostgreSQL
# This script runs all migration files in the /migrations directory

PGUSER=${POSTGRES_USER:-safework}
PGPASSWORD=${POSTGRES_PASSWORD:-safework2024}
PGDATABASE=${POSTGRES_DB:-safework_db}
PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5432}

export PGUSER PGPASSWORD PGDATABASE PGHOST PGPORT

echo "🔄 Starting SafeWork Database Migrations..."
echo "📊 Database: $PGDATABASE on $PGHOST:$PGPORT as $PGUSER"

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER"; do
  echo "⏳ PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Create schema_migrations table if it doesn't exist
echo "📋 Ensuring schema_migrations table exists..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"

# Run all migration files
MIGRATION_DIR="/docker-entrypoint-initdb.d/migrations"
if [ -d "$MIGRATION_DIR" ]; then
    echo "🔍 Scanning for migrations in $MIGRATION_DIR..."

    for migration_file in $(find "$MIGRATION_DIR" -name "*.sql" | sort); do
        migration_name=$(basename "$migration_file" .sql)

        # Check if migration was already applied
        already_applied=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "
            SELECT COUNT(*) FROM schema_migrations WHERE version = '$migration_name';
        " | tr -d ' ')

        if [ "$already_applied" -eq "0" ]; then
            echo "🚀 Running migration: $migration_name"
            psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$migration_file"
            echo "✅ Completed migration: $migration_name"
        else
            echo "⏭️  Skipping migration (already applied): $migration_name"
        fi
    done
else
    echo "⚠️  Migration directory not found: $MIGRATION_DIR"
fi

echo "🎉 All migrations completed successfully!"

# Display applied migrations
echo "📋 Applied migrations:"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "
SELECT version, applied_at FROM schema_migrations ORDER BY applied_at;
"