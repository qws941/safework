"""Database Migration Manager"""

import hashlib
import importlib.util
import os
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from flask import Flask, current_app

from migration_model import Migration
from models import db


class MigrationManager:
    """데이터베이스 마이그레이션 관리자"""

    def __init__(self, app: Optional[Flask] = None, migrations_dir: str = None):
        self.app = app
        self.migrations_dir = migrations_dir or os.path.join(
            os.path.dirname(__file__), "migrations"
        )

        if app is not None:
            self.init_app(app)

    def init_app(self, app: Flask):
        """Flask 앱 초기화"""
        self.app = app

        # 마이그레이션 디렉토리 생성
        os.makedirs(self.migrations_dir, exist_ok=True)

        # 마이그레이션 테이블 초기화
        with app.app_context():
            self._ensure_migration_table()

    def _ensure_migration_table(self):
        """마이그레이션 추적 테이블 확인 (init.sql에서 이미 생성됨)"""
        try:
            # MySQL에서 migrations 테이블이 있는지 확인만 함
            with db.engine.connect() as conn:
                result = conn.execute(
                    db.text("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'migrations'")
                ).scalar()

                if result > 0:
                    current_app.logger.info("Migrations table exists (created by init.sql)")
                else:
                    current_app.logger.warning("Migrations table not found - should be created by init.sql")
        except Exception as e:
            current_app.logger.error(f"Error checking migration table: {e}")

    def _get_file_checksum(self, filepath: str) -> str:
        """파일의 SHA-256 체크섬 계산"""
        with open(filepath, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()

    def _parse_migration_filename(self, filename: str) -> Tuple[str, str]:
        """마이그레이션 파일명에서 버전과 설명 추출

        예: 001_initial_schema.py -> ('001', 'initial_schema')
        """
        match = re.match(r"^(\d{3})_(.+)\.py$", filename)
        if not match:
            raise ValueError(f"Invalid migration filename format: {filename}")

        version = match.group(1)
        description = match.group(2).replace("_", " ")
        return version, description

    def get_migration_files(self) -> List[str]:
        """마이그레이션 파일 목록을 버전 순으로 반환"""
        files = []
        for filename in os.listdir(self.migrations_dir):
            if filename.endswith(".py") and filename != "__init__.py":
                try:
                    self._parse_migration_filename(filename)
                    files.append(filename)
                except ValueError:
                    current_app.logger.warning(
                        f"Skipping invalid migration file: {filename}"
                    )

        return sorted(files)

    def get_applied_migrations(self) -> List[str]:
        """적용된 마이그레이션 버전 목록 반환"""
        try:
            migrations = (
                Migration.query.filter_by(success=True)
                .order_by(Migration.version)
                .all()
            )
            return [m.version for m in migrations]
        except Exception as e:
            current_app.logger.error(f"Error getting applied migrations: {e}")
            return []

    def get_pending_migrations(self) -> List[str]:
        """적용되지 않은 마이그레이션 파일 목록 반환"""
        all_files = self.get_migration_files()
        applied_versions = self.get_applied_migrations()

        pending = []
        for filename in all_files:
            version, _ = self._parse_migration_filename(filename)
            if version not in applied_versions:
                pending.append(filename)

        return pending

    def load_migration_module(self, filename: str):
        """마이그레이션 파일을 모듈로 로드"""
        filepath = os.path.join(self.migrations_dir, filename)

        spec = importlib.util.spec_from_file_location(filename[:-3], filepath)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        return module

    def run_migration(self, filename: str) -> bool:
        """단일 마이그레이션 실행"""
        version, description = self._parse_migration_filename(filename)
        filepath = os.path.join(self.migrations_dir, filename)
        checksum = self._get_file_checksum(filepath)

        current_app.logger.info(f"Running migration {version}: {description}")

        start_time = time.time()
        success = False
        error_message = None

        try:
            # 마이그레이션 모듈 로드
            module = self.load_migration_module(filename)

            # upgrade 함수 실행
            if hasattr(module, "upgrade"):
                module.upgrade()
                success = True
                current_app.logger.info(f"Migration {version} completed successfully")
            else:
                raise AttributeError(f"Migration {filename} missing 'upgrade' function")

        except Exception as e:
            success = False
            error_message = str(e)
            current_app.logger.error(f"Migration {version} failed: {e}")

        execution_time = time.time() - start_time

        # 마이그레이션 기록 저장 (중복 방지)
        try:
            # 기존 레코드 확인
            existing_record = Migration.query.filter_by(version=version).first()
            if existing_record:
                # 기존 레코드 업데이트
                existing_record.description = description
                existing_record.filename = filename
                existing_record.checksum = checksum
                existing_record.execution_time = execution_time
                existing_record.success = success
                existing_record.error_message = error_message
                existing_record.executed_at = datetime.utcnow()
                current_app.logger.info(f"Updated existing migration record: {version}")
            else:
                # 새 레코드 생성
                migration_record = Migration(
                    version=version,
                    description=description,
                    filename=filename,
                    checksum=checksum,
                    execution_time=execution_time,
                    success=success,
                    error_message=error_message,
                )
                db.session.add(migration_record)
                current_app.logger.info(f"Created new migration record: {version}")
            
            db.session.commit()
        except Exception as e:
            current_app.logger.error(f"Failed to record migration: {e}")
            db.session.rollback()

        return success

    def migrate(self, target_version: str = None) -> bool:
        """마이그레이션 실행"""
        pending = self.get_pending_migrations()

        if not pending:
            current_app.logger.info("No pending migrations")
            return True

        success_count = 0
        total_count = len(pending)

        current_app.logger.info(f"Running {total_count} pending migrations")

        for filename in pending:
            version, _ = self._parse_migration_filename(filename)

            # 대상 버전이 지정된 경우 해당 버전까지만 실행
            if target_version and version > target_version:
                break

            if self.run_migration(filename):
                success_count += 1
            else:
                current_app.logger.error(f"Migration {version} failed, stopping")
                break

        current_app.logger.info(f"Completed {success_count}/{total_count} migrations")
        return success_count == total_count

    def rollback_migration(self, filename: str) -> bool:
        """단일 마이그레이션 롤백"""
        version, description = self._parse_migration_filename(filename)

        current_app.logger.info(f"Rolling back migration {version}: {description}")

        try:
            # 마이그레이션 모듈 로드
            module = self.load_migration_module(filename)

            # downgrade 함수 실행
            if hasattr(module, "downgrade"):
                module.downgrade()

                # 마이그레이션 기록 삭제
                Migration.query.filter_by(version=version).delete()
                db.session.commit()

                current_app.logger.info(f"Migration {version} rolled back successfully")
                return True
            else:
                current_app.logger.warning(
                    f"Migration {filename} missing 'downgrade' function"
                )
                return False

        except Exception as e:
            current_app.logger.error(f"Rollback of migration {version} failed: {e}")
            db.session.rollback()
            return False

    def get_migration_status(self) -> Dict:
        """마이그레이션 상태 정보 반환"""
        all_files = self.get_migration_files()
        applied = self.get_applied_migrations()
        pending = self.get_pending_migrations()

        status = {
            "total_migrations": len(all_files),
            "applied_count": len(applied),
            "pending_count": len(pending),
            "applied_versions": applied,
            "pending_files": pending,
            "migrations": [],
        }

        # 각 마이그레이션 상세 정보
        for filename in all_files:
            version, description = self._parse_migration_filename(filename)
            is_applied = version in applied

            migration_info = {
                "version": version,
                "description": description,
                "filename": filename,
                "applied": is_applied,
            }

            if is_applied:
                record = Migration.query.filter_by(version=version).first()
                if record:
                    migration_info.update(
                        {
                            "executed_at": (
                                record.executed_at.isoformat()
                                if record.executed_at
                                else None
                            ),
                            "execution_time": record.execution_time,
                            "success": record.success,
                            "error_message": record.error_message,
                        }
                    )

            status["migrations"].append(migration_info)

        return status

    def create_migration(self, description: str) -> str:
        """새 마이그레이션 파일 생성"""
        # 다음 버전 번호 계산
        existing_files = self.get_migration_files()
        if existing_files:
            last_version = max(
                [int(self._parse_migration_filename(f)[0]) for f in existing_files]
            )
            next_version = f"{last_version + 1:03d}"
        else:
            next_version = "001"

        # 파일명 생성
        safe_description = re.sub(r"[^a-zA-Z0-9\s]", "", description)
        safe_description = re.sub(r"\s+", "_", safe_description.strip()).lower()
        filename = f"{next_version}_{safe_description}.py"

        # 마이그레이션 템플릿
        template = f'''"""Migration: {description}

Created: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
Version: {next_version}
"""

from app.models import db


def upgrade():
    """Apply the migration"""
    # TODO: Implement upgrade logic
    pass


def downgrade():
    """Rollback the migration"""
    # TODO: Implement downgrade logic
    pass
'''

        # 파일 생성
        filepath = os.path.join(self.migrations_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(template)

        current_app.logger.info(f"Created migration: {filename}")
        return filename
