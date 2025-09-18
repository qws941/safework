"""
SafeWork 시스템 모니터링 및 헬스체크 유틸리티

시스템 안정성을 위한 종합적인 모니터링 기능:
- 데이터베이스 연결 상태
- Raw data 파일 시스템 상태
- 메모리 사용량 모니터링
- 디스크 사용량 체크
- 서비스 성능 지표
"""

import os
import psutil
import logging
from datetime import datetime, timedelta
from pathlib import Path
from flask import current_app
from models import Survey, db
import json


class SystemMonitor:
    """시스템 종합 모니터링 클래스"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def get_system_health(self):
        """시스템 전체 헬스체크"""
        health_status = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "healthy",
            "checks": {},
        }

        # 데이터베이스 헬스체크
        db_status = self._check_database_health()
        health_status["checks"]["database"] = db_status

        # Raw data 파일 시스템 체크
        rawdata_status = self._check_rawdata_system()
        health_status["checks"]["raw_data_system"] = rawdata_status

        # 시스템 리소스 체크
        resource_status = self._check_system_resources()
        health_status["checks"]["system_resources"] = resource_status

        # 서비스 성능 체크
        performance_status = self._check_service_performance()
        health_status["checks"]["service_performance"] = performance_status

        # 전체 상태 판단
        failed_checks = [
            name
            for name, check in health_status["checks"].items()
            if check["status"] != "healthy"
        ]

        if failed_checks:
            health_status["overall_status"] = (
                "degraded" if len(failed_checks) <= 2 else "unhealthy"
            )
            health_status["failed_checks"] = failed_checks

        return health_status

    def _check_database_health(self):
        """데이터베이스 연결 및 성능 체크"""
        try:
            start_time = datetime.now()

            # 연결 테스트
            total_surveys = Survey.query.count()

            # 응답 시간 측정
            response_time = (datetime.now() - start_time).total_seconds() * 1000

            # 최근 24시간 설문 수
            yesterday = datetime.now() - timedelta(days=1)
            recent_surveys = Survey.query.filter(Survey.created_at >= yesterday).count()

            return {
                "status": "healthy" if response_time < 1000 else "slow",
                "response_time_ms": response_time,
                "total_surveys": total_surveys,
                "recent_24h_submissions": recent_surveys,
                "last_checked": datetime.now().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_checked": datetime.now().isoformat(),
            }

    def _check_rawdata_system(self):
        """Raw data 파일 시스템 상태 체크"""
        try:
            raw_data_path = Path(current_app.root_path) / "raw_data"

            # 디렉토리 존재 확인
            if not raw_data_path.exists():
                return {
                    "status": "unhealthy",
                    "error": "Raw data directory does not exist",
                    "path": str(raw_data_path),
                }

            # 파일 수 및 크기 계산
            file_count = 0
            total_size = 0
            format_counts = {"json": 0, "csv": 0}

            for file_path in raw_data_path.rglob("*"):
                if file_path.is_file():
                    file_count += 1
                    total_size += file_path.stat().st_size

                    if file_path.suffix == ".json":
                        format_counts["json"] += 1
                    elif file_path.suffix == ".csv":
                        format_counts["csv"] += 1

            # 디스크 사용량 체크 (raw_data 디렉토리)
            disk_usage = psutil.disk_usage(str(raw_data_path))
            free_space_gb = disk_usage.free / (1024**3)

            # 상태 판단
            status = "healthy"
            if free_space_gb < 1.0:  # 1GB 미만
                status = "warning"
            elif free_space_gb < 0.1:  # 100MB 미만
                status = "critical"

            return {
                "status": status,
                "file_count": file_count,
                "total_size_mb": round(total_size / (1024**2), 2),
                "format_distribution": format_counts,
                "free_space_gb": round(free_space_gb, 2),
                "path": str(raw_data_path),
                "last_checked": datetime.now().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"Raw data system check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_checked": datetime.now().isoformat(),
            }

    def _check_system_resources(self):
        """시스템 리소스 사용량 체크"""
        try:
            # CPU 사용률
            cpu_percent = psutil.cpu_percent(interval=1)

            # 메모리 사용률
            memory = psutil.virtual_memory()
            memory_percent = memory.percent

            # 디스크 사용률
            disk = psutil.disk_usage("/")
            disk_percent = (disk.used / disk.total) * 100

            # 상태 판단
            status = "healthy"
            warnings = []

            if cpu_percent > 80:
                status = "warning"
                warnings.append("High CPU usage")

            if memory_percent > 85:
                status = "warning"
                warnings.append("High memory usage")

            if disk_percent > 90:
                status = "critical"
                warnings.append("High disk usage")

            return {
                "status": status,
                "cpu_percent": cpu_percent,
                "memory_percent": memory_percent,
                "disk_percent": round(disk_percent, 2),
                "warnings": warnings,
                "last_checked": datetime.now().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"System resources check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_checked": datetime.now().isoformat(),
            }

    def _check_service_performance(self):
        """서비스 성능 지표 체크"""
        try:
            # 프로세스 정보
            process = psutil.Process()
            process_info = {
                "memory_usage_mb": round(process.memory_info().rss / (1024**2), 2),
                "cpu_percent": process.cpu_percent(),
                "threads": process.num_threads(),
                "open_files": len(process.open_files()),
                "connections": len(process.connections()),
                "uptime_seconds": (
                    datetime.now() - datetime.fromtimestamp(process.create_time())
                ).total_seconds(),
            }

            # 상태 판단
            status = "healthy"
            if process_info["memory_usage_mb"] > 512:  # 512MB 초과
                status = "warning"
            elif process_info["memory_usage_mb"] > 1024:  # 1GB 초과
                status = "critical"

            return {
                "status": status,
                "process_info": process_info,
                "last_checked": datetime.now().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"Service performance check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_checked": datetime.now().isoformat(),
            }


class SystemCleaner:
    """시스템 정리 및 최적화 클래스"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def cleanup_old_files(self, days_to_keep=30):
        """오래된 raw data 파일 정리"""
        try:
            raw_data_path = Path(current_app.root_path) / "raw_data"
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)

            cleaned_files = []
            total_size_freed = 0

            for file_path in raw_data_path.rglob("*.json"):
                if file_path.stat().st_mtime < cutoff_date.timestamp():
                    file_size = file_path.stat().st_size
                    file_path.unlink()
                    cleaned_files.append(str(file_path))
                    total_size_freed += file_size

                    # 해당 CSV 파일도 함께 삭제
                    csv_path = file_path.with_suffix(".csv")
                    if csv_path.exists():
                        total_size_freed += csv_path.stat().st_size
                        csv_path.unlink()
                        cleaned_files.append(str(csv_path))

            self.logger.info(
                f"Cleaned {len(cleaned_files)} old files, freed {total_size_freed} bytes"
            )

            return {
                "success": True,
                "files_cleaned": len(cleaned_files),
                "size_freed_mb": round(total_size_freed / (1024**2), 2),
                "cutoff_date": cutoff_date.isoformat(),
            }

        except Exception as e:
            self.logger.error(f"File cleanup failed: {e}")
            return {"success": False, "error": str(e)}

    def optimize_database(self):
        """데이터베이스 최적화"""
        try:
            # 기본 통계 수집
            result = db.session.execute("ANALYZE;")
            db.session.commit()

            self.logger.info("Database optimization completed")

            return {
                "success": True,
                "operation": "ANALYZE completed",
                "timestamp": datetime.now().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"Database optimization failed: {e}")
            return {"success": False, "error": str(e)}
