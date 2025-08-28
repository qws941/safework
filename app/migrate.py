#!/usr/bin/env python3
"""SafeWork Database Migration Command Line Interface"""

import argparse
import os
import sys

from flask import Flask

# 앱 경로 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from migration_manager import MigrationManager
from models import db


def create_migration_app():
    """마이그레이션용 Flask 앱 생성"""
    app = create_app()

    with app.app_context():
        # 마이그레이션 매니저 초기화
        manager = MigrationManager(app)
        return app, manager


def cmd_status(manager: MigrationManager):
    """마이그레이션 상태 표시"""
    status = manager.get_migration_status()

    print("🗂️  SafeWork Database Migration Status")
    print("=" * 50)
    print(f"Total migrations: {status['total_migrations']}")
    print(f"Applied: {status['applied_count']}")
    print(f"Pending: {status['pending_count']}")
    print()

    if status["migrations"]:
        print("Migration History:")
        print("-" * 50)
        for migration in status["migrations"]:
            status_icon = "✅" if migration["applied"] else "⏳"
            print(f"{status_icon} {migration['version']}: {migration['description']}")

            if migration["applied"]:
                if migration.get("executed_at"):
                    print(f"    Executed: {migration['executed_at']}")
                if migration.get("execution_time"):
                    print(f"    Duration: {migration['execution_time']:.3f}s")
                if not migration.get("success", True):
                    print(
                        f"    ❌ Error: {migration.get('error_message', 'Unknown error')}"
                    )
        print()

    if status["pending_files"]:
        print("Pending Migrations:")
        print("-" * 50)
        for filename in status["pending_files"]:
            print(f"⏳ {filename}")


def cmd_migrate(manager: MigrationManager, target_version: str = None):
    """마이그레이션 실행"""
    print("🚀 Running database migrations...")

    success = manager.migrate(target_version)

    if success:
        print("✅ All migrations completed successfully!")
    else:
        print("❌ Migration failed!")
        sys.exit(1)


def cmd_create(manager: MigrationManager, description: str):
    """새 마이그레이션 생성"""
    print(f"📝 Creating new migration: {description}")

    filename = manager.create_migration(description)
    filepath = os.path.join(manager.migrations_dir, filename)

    print(f"✅ Created migration: {filename}")
    print(f"📁 Location: {filepath}")
    print(f"🖊️  Edit the file to implement upgrade() and downgrade() functions")


def cmd_rollback(manager: MigrationManager, version: str = None):
    """마이그레이션 롤백"""
    applied = manager.get_applied_migrations()

    if not applied:
        print("❌ No migrations to rollback")
        return

    if version:
        # 특정 버전 롤백
        target_version = version
    else:
        # 최신 마이그레이션 롤백
        target_version = applied[-1]

    # 해당 버전의 파일명 찾기
    filename = None
    for file in manager.get_migration_files():
        file_version, _ = manager._parse_migration_filename(file)
        if file_version == target_version:
            filename = file
            break

    if not filename:
        print(f"❌ Migration file not found for version: {target_version}")
        return

    print(f"⏪ Rolling back migration: {target_version}")

    success = manager.rollback_migration(filename)

    if success:
        print(f"✅ Migration {target_version} rolled back successfully!")
    else:
        print(f"❌ Failed to rollback migration {target_version}!")
        sys.exit(1)


def cmd_init_db(manager: MigrationManager):
    """데이터베이스 초기화 (개발용)"""
    print("🏗️  Initializing database...")

    try:
        # 모든 테이블 생성
        db.create_all()
        print("✅ Database tables created successfully!")

        # 마이그레이션 테이블도 확인
        manager._ensure_migration_table()
        print("✅ Migration tracking initialized!")

    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        sys.exit(1)


def cmd_reset_db(manager: MigrationManager):
    """데이터베이스 리셋 (개발용 - 주의!)"""
    confirm = input("⚠️  WARNING: This will delete all data! Type 'RESET' to confirm: ")

    if confirm != "RESET":
        print("❌ Database reset cancelled")
        return

    print("🗑️  Dropping all tables...")

    try:
        db.drop_all()
        print("✅ All tables dropped!")

        # 테이블 재생성
        db.create_all()
        manager._ensure_migration_table()
        print("✅ Database reset complete!")

    except Exception as e:
        print(f"❌ Database reset failed: {e}")
        sys.exit(1)


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description="SafeWork Database Migration Tool")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # status 명령어
    subparsers.add_parser("status", help="Show migration status")

    # migrate 명령어
    migrate_parser = subparsers.add_parser("migrate", help="Run pending migrations")
    migrate_parser.add_argument("--target", help="Target migration version")

    # create 명령어
    create_parser = subparsers.add_parser("create", help="Create new migration")
    create_parser.add_argument("description", help="Migration description")

    # rollback 명령어
    rollback_parser = subparsers.add_parser("rollback", help="Rollback migration")
    rollback_parser.add_argument(
        "--version", help="Version to rollback (default: latest)"
    )

    # init-db 명령어
    subparsers.add_parser("init-db", help="Initialize database (development)")

    # reset-db 명령어
    subparsers.add_parser("reset-db", help="Reset database (DANGER: deletes all data)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Flask 앱과 마이그레이션 매니저 생성
    try:
        app, manager = create_migration_app()
    except Exception as e:
        print(f"❌ Failed to initialize application: {e}")
        sys.exit(1)

    # 명령어 실행
    with app.app_context():
        if args.command == "status":
            cmd_status(manager)

        elif args.command == "migrate":
            cmd_migrate(manager, args.target)

        elif args.command == "create":
            cmd_create(manager, args.description)

        elif args.command == "rollback":
            cmd_rollback(manager, args.version)

        elif args.command == "init-db":
            cmd_init_db(manager)

        elif args.command == "reset-db":
            cmd_reset_db(manager)

        else:
            print(f"❌ Unknown command: {args.command}")
            parser.print_help()
            sys.exit(1)


if __name__ == "__main__":
    main()
