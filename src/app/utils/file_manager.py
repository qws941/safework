"""
SafeWork 파일 관리 및 자동화 시스템

기능:
- 자동 파일 정리 (오래된 파일 삭제)
- 압축 백업 생성
- 스토리지 용량 모니터링
- 파일 무결성 검증
- 스케줄링된 유지보수 작업
"""

import os
import shutil
import zipfile
import hashlib
import json
import schedule
import time
from datetime import datetime, timedelta
from pathlib import Path
from flask import current_app
from utils.enhanced_logging import safework_logger, performance_monitor, error_handler
import threading


class FileManager:
    """파일 관리 클래스"""

    def __init__(self, base_path=None):
        if base_path is None:
            base_path = Path(current_app.root_path) / "raw_data"
        self.base_path = Path(base_path)
        self.backup_path = self.base_path / "backups"
        self.archive_path = self.base_path / "archives"

        # 디렉토리 생성
        self._ensure_directories()

    def _ensure_directories(self):
        """필요한 디렉토리 생성"""
        directories = [self.backup_path, self.archive_path]
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

    @performance_monitor("file_cleanup")
    @error_handler("file_management")
    def cleanup_old_files(self, days_to_keep=30, dry_run=False):
        """오래된 파일 정리"""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        cleaned_files = []
        total_size_freed = 0

        safework_logger.log_event(
            "info",
            "file_cleanup_start",
            f"Starting file cleanup (days_to_keep: {days_to_keep}, dry_run: {dry_run})",
        )

        # 백업과 아카이브 디렉토리를 제외한 모든 파일 검사
        for file_path in self.base_path.rglob("*"):
            if (
                file_path.is_file()
                and "backups" not in str(file_path)
                and "archives" not in str(file_path)
            ):
                file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)

                if file_mtime < cutoff_date:
                    file_size = file_path.stat().st_size

                    if not dry_run:
                        file_path.unlink()

                    cleaned_files.append(
                        {
                            "path": str(file_path.relative_to(self.base_path)),
                            "size": file_size,
                            "modified": file_mtime.isoformat(),
                        }
                    )
                    total_size_freed += file_size

        result = {
            "success": True,
            "files_cleaned": len(cleaned_files),
            "size_freed_mb": round(total_size_freed / (1024**2), 2),
            "cutoff_date": cutoff_date.isoformat(),
            "dry_run": dry_run,
            "cleaned_files": cleaned_files,
        }

        safework_logger.log_event(
            "info",
            "file_cleanup_complete",
            f'File cleanup completed: {len(cleaned_files)} files, {result["size_freed_mb"]} MB',
            **result,
        )

        return result

    @performance_monitor("backup_creation")
    @error_handler("backup_management")
    def create_backup(self, backup_type="incremental"):
        """백업 생성"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"safework_backup_{backup_type}_{timestamp}.zip"
        backup_filepath = self.backup_path / backup_filename

        safework_logger.log_event(
            "info", "backup_start", f"Starting {backup_type} backup creation"
        )

        try:
            with zipfile.ZipFile(backup_filepath, "w", zipfile.ZIP_DEFLATED) as zipf:
                # 백업과 아카이브 디렉토리를 제외한 모든 파일 백업
                for file_path in self.base_path.rglob("*"):
                    if (
                        file_path.is_file()
                        and "backups" not in str(file_path)
                        and "archives" not in str(file_path)
                    ):
                        archive_path = file_path.relative_to(self.base_path)
                        zipf.write(file_path, archive_path)

            # 백업 메타데이터 생성
            metadata = {
                "backup_type": backup_type,
                "created_at": datetime.now().isoformat(),
                "file_count": len(zipf.namelist()) if "zipf" in locals() else 0,
                "backup_size_mb": round(
                    backup_filepath.stat().st_size / (1024**2), 2
                ),
                "source_path": str(self.base_path),
            }

            metadata_file = backup_filepath.with_suffix(".json")
            with open(metadata_file, "w", encoding="utf-8") as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)

            result = {
                "success": True,
                "backup_file": str(backup_filepath),
                "metadata": metadata,
            }

            safework_logger.log_event(
                "info",
                "backup_complete",
                f"Backup created successfully: {backup_filename}",
                **result,
            )

            return result

        except Exception as e:
            # 실패한 백업 파일 정리
            if backup_filepath.exists():
                backup_filepath.unlink()

            safework_logger.log_error(
                e,
                {
                    "operation": "backup_creation",
                    "backup_type": backup_type,
                    "backup_filename": backup_filename,
                },
            )

            return {"success": False, "error": str(e)}

    @performance_monitor("file_verification")
    def verify_file_integrity(self):
        """파일 무결성 검증"""
        verification_results = {
            "total_files": 0,
            "verified_files": 0,
            "corrupted_files": [],
            "missing_files": [],
            "errors": [],
        }

        safework_logger.log_event(
            "info", "integrity_check_start", "Starting file integrity verification"
        )

        try:
            for file_path in self.base_path.rglob("*.json"):
                verification_results["total_files"] += 1

                try:
                    # JSON 파일 구문 검증
                    with open(file_path, "r", encoding="utf-8") as f:
                        json.load(f)

                    # 해당 CSV 파일 존재 확인
                    csv_path = file_path.with_suffix(".csv")
                    if not csv_path.exists():
                        verification_results["missing_files"].append(
                            {
                                "json_file": str(file_path.relative_to(self.base_path)),
                                "missing_csv": str(
                                    csv_path.relative_to(self.base_path)
                                ),
                            }
                        )
                    else:
                        verification_results["verified_files"] += 1

                except json.JSONDecodeError as e:
                    verification_results["corrupted_files"].append(
                        {
                            "file": str(file_path.relative_to(self.base_path)),
                            "error": f"JSON parsing error: {str(e)}",
                        }
                    )
                except Exception as e:
                    verification_results["errors"].append(
                        {
                            "file": str(file_path.relative_to(self.base_path)),
                            "error": str(e),
                        }
                    )

            verification_results["success"] = (
                len(verification_results["corrupted_files"]) == 0
            )
            verification_results["integrity_score"] = (
                verification_results["verified_files"]
                / max(verification_results["total_files"], 1)
                * 100
            )

            safework_logger.log_event(
                "info",
                "integrity_check_complete",
                f'File integrity check completed: {verification_results["integrity_score"]:.1f}% integrity',
                **verification_results,
            )

            return verification_results

        except Exception as e:
            safework_logger.log_error(e, {"operation": "file_verification"})
            return {"success": False, "error": str(e)}

    def get_storage_usage(self):
        """스토리지 사용량 조회"""
        usage_info = {"base_path": str(self.base_path), "directories": {}}

        try:
            total_size = 0

            for item in self.base_path.iterdir():
                if item.is_dir():
                    dir_size = sum(
                        f.stat().st_size for f in item.rglob("*") if f.is_file()
                    )
                    file_count = len([f for f in item.rglob("*") if f.is_file()])

                    usage_info["directories"][item.name] = {
                        "size_mb": round(dir_size / (1024**2), 2),
                        "file_count": file_count,
                    }
                    total_size += dir_size

            usage_info["total_size_mb"] = round(total_size / (1024**2), 2)
            usage_info["success"] = True

            return usage_info

        except Exception as e:
            safework_logger.log_error(e, {"operation": "storage_usage"})
            return {"success": False, "error": str(e)}

    def archive_old_files(self, days_to_archive=90):
        """오래된 파일을 아카이브로 이동"""
        cutoff_date = datetime.now() - timedelta(days=days_to_archive)
        archived_files = []

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_filename = f"archive_{timestamp}.zip"
        archive_filepath = self.archive_path / archive_filename

        try:
            with zipfile.ZipFile(archive_filepath, "w", zipfile.ZIP_DEFLATED) as zipf:
                for file_path in self.base_path.rglob("*"):
                    if (
                        file_path.is_file()
                        and "backups" not in str(file_path)
                        and "archives" not in str(file_path)
                    ):
                        file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)

                        if file_mtime < cutoff_date:
                            archive_path = file_path.relative_to(self.base_path)
                            zipf.write(file_path, archive_path)
                            file_path.unlink()  # 원본 파일 삭제
                            archived_files.append(str(archive_path))

            if archived_files:
                result = {
                    "success": True,
                    "archive_file": str(archive_filepath),
                    "files_archived": len(archived_files),
                    "cutoff_date": cutoff_date.isoformat(),
                }

                safework_logger.log_event(
                    "info",
                    "archive_complete",
                    f"Archived {len(archived_files)} files to {archive_filename}",
                    **result,
                )
            else:
                # 빈 아카이브 파일 삭제
                archive_filepath.unlink()
                result = {
                    "success": True,
                    "files_archived": 0,
                    "message": "No files to archive",
                }

            return result

        except Exception as e:
            safework_logger.log_error(e, {"operation": "file_archiving"})
            return {"success": False, "error": str(e)}


class ScheduledMaintenance:
    """스케줄링된 유지보수 작업"""

    def __init__(self):
        self.file_manager = FileManager()
        self.running = False
        self._setup_schedule()

    def _setup_schedule(self):
        """유지보수 스케줄 설정"""
        # 매일 오전 2시에 파일 정리 (7일 이상 된 파일)
        schedule.every().day.at("02:00").do(self._daily_cleanup)

        # 매주 일요일 오전 3시에 백업 생성
        schedule.every().sunday.at("03:00").do(self._weekly_backup)

        # 매월 1일 오전 4시에 아카이브 작업 (90일 이상 된 파일)
        schedule.every().month.do(self._monthly_archive)

        # 매일 오전 1시에 무결성 검증
        schedule.every().day.at("01:00").do(self._integrity_check)

    def _daily_cleanup(self):
        """일일 정리 작업"""
        try:
            result = self.file_manager.cleanup_old_files(days_to_keep=7)
            safework_logger.log_event(
                "info",
                "scheduled_cleanup",
                f'Daily cleanup completed: {result["files_cleaned"]} files cleaned',
                **result,
            )
        except Exception as e:
            safework_logger.log_error(e, {"scheduled_task": "daily_cleanup"})

    def _weekly_backup(self):
        """주간 백업 작업"""
        try:
            result = self.file_manager.create_backup("weekly")
            safework_logger.log_event(
                "info",
                "scheduled_backup",
                f'Weekly backup completed: {result.get("backup_file", "N/A")}',
                **result,
            )
        except Exception as e:
            safework_logger.log_error(e, {"scheduled_task": "weekly_backup"})

    def _monthly_archive(self):
        """월간 아카이브 작업"""
        try:
            result = self.file_manager.archive_old_files(days_to_archive=90)
            safework_logger.log_event(
                "info",
                "scheduled_archive",
                f'Monthly archive completed: {result["files_archived"]} files archived',
                **result,
            )
        except Exception as e:
            safework_logger.log_error(e, {"scheduled_task": "monthly_archive"})

    def _integrity_check(self):
        """무결성 검증 작업"""
        try:
            result = self.file_manager.verify_file_integrity()
            safework_logger.log_event(
                "info",
                "scheduled_integrity_check",
                f'Integrity check completed: {result.get("integrity_score", 0):.1f}% integrity',
                **result,
            )
        except Exception as e:
            safework_logger.log_error(e, {"scheduled_task": "integrity_check"})

    def start_scheduler(self):
        """스케줄러 시작"""
        if self.running:
            return

        self.running = True

        def run_scheduler():
            while self.running:
                schedule.run_pending()
                time.sleep(60)  # 1분마다 체크

        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()

        safework_logger.log_event(
            "info", "scheduler_start", "Scheduled maintenance started"
        )

    def stop_scheduler(self):
        """스케줄러 중지"""
        self.running = False
        safework_logger.log_event(
            "info", "scheduler_stop", "Scheduled maintenance stopped"
        )


# 전역 인스턴스
file_manager = FileManager()
scheduled_maintenance = ScheduledMaintenance()
