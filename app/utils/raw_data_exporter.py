"""
SafeWork Raw Data Exporter
설문지 제출별 개별 Raw Data 파일 생성 유틸리티

각 설문 제출 시마다 JSON/CSV 형태의 원본 데이터 파일을 생성하여
데이터 추적성과 백업 기능을 제공합니다.
"""

import os
import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from flask import current_app


class RawDataExporter:
    """설문 데이터를 개별 파일로 내보내는 클래스"""

    def __init__(self, base_path: str = None):
        """
        Args:
            base_path: 파일 저장 기본 경로 (기본값: app/raw_data)
        """
        if base_path is None:
            base_path = os.path.join(current_app.root_path, "raw_data")

        self.base_path = Path(base_path)
        self._ensure_directories()

    def _ensure_directories(self):
        """필요한 디렉토리 구조 생성"""
        directories = [
            self.base_path,
            self.base_path / "json",
            self.base_path / "csv",
            self.base_path / "backups",
            self.base_path / "form_001",
            self.base_path / "form_002",
            self.base_path / "form_003",
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

        # .gitkeep 파일 생성 (git 추적용)
        gitkeep_file = self.base_path / ".gitkeep"
        if not gitkeep_file.exists():
            gitkeep_file.touch()

    def _generate_filename(
        self, survey_id: int, form_type: str, format_type: str = "json"
    ) -> str:
        """
        파일명 생성 규칙: YYYYMMDD_HHMMSS_FORM{type}_ID{id}.{format}

        예시:
        - 20241218_143022_FORM001_ID1234.json
        - 20241218_143022_FORM002_ID1234.csv
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{timestamp}_FORM{form_type}_ID{survey_id}.{format_type}"

    def export_json(
        self, survey_data: Dict[str, Any], survey_id: int, form_type: str
    ) -> str:
        """
        JSON 형태로 설문 데이터를 개별 파일로 저장

        Args:
            survey_data: 설문 응답 데이터
            survey_id: 설문 ID
            form_type: 설문 유형 (001, 002, 003)

        Returns:
            str: 저장된 파일 경로
        """
        filename = self._generate_filename(survey_id, form_type, "json")

        # 메타데이터 추가
        export_data = {
            "metadata": {
                "survey_id": survey_id,
                "form_type": form_type,
                "export_timestamp": datetime.now().isoformat(),
                "export_version": "1.0",
                "data_format": "json",
            },
            "survey_data": survey_data,
        }

        # JSON 파일 저장 (form별 하위 디렉토리)
        form_dir = self.base_path / f"form_{form_type}"
        file_path = form_dir / filename

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2, default=str)

        current_app.logger.info(f"✅ Raw JSON data exported: {file_path}")
        return str(file_path)

    def export_csv(
        self, survey_data: Dict[str, Any], survey_id: int, form_type: str
    ) -> str:
        """
        CSV 형태로 설문 데이터를 개별 파일로 저장

        Args:
            survey_data: 설문 응답 데이터
            survey_id: 설문 ID
            form_type: 설문 유형 (001, 002, 003)

        Returns:
            str: 저장된 파일 경로
        """
        filename = self._generate_filename(survey_id, form_type, "csv")

        # CSV 파일 저장 (form별 하위 디렉토리)
        form_dir = self.base_path / f"form_{form_type}"
        file_path = form_dir / filename

        # 플랫 데이터 구조로 변환
        flat_data = self._flatten_data(survey_data, survey_id, form_type)

        if flat_data:
            with open(file_path, "w", newline="", encoding="utf-8") as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=flat_data.keys())
                writer.writeheader()
                writer.writerow(flat_data)

        current_app.logger.info(f"✅ Raw CSV data exported: {file_path}")
        return str(file_path)

    def _flatten_data(
        self, data: Dict[str, Any], survey_id: int, form_type: str
    ) -> Dict[str, Any]:
        """
        중첩된 딕셔너리 구조를 플랫 구조로 변환

        Args:
            data: 중첩된 설문 데이터
            survey_id: 설문 ID
            form_type: 설문 유형

        Returns:
            Dict[str, Any]: 플랫 구조의 데이터
        """
        flat_data = {
            "survey_id": survey_id,
            "form_type": form_type,
            "export_timestamp": datetime.now().isoformat(),
        }

        def _flatten_recursive(obj, prefix=""):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    new_key = f"{prefix}_{key}" if prefix else key
                    if isinstance(value, (dict, list)):
                        if isinstance(value, list):
                            # 리스트는 JSON 문자열로 변환
                            flat_data[new_key] = json.dumps(
                                value, ensure_ascii=False, default=str
                            )
                        else:
                            _flatten_recursive(value, new_key)
                    else:
                        flat_data[new_key] = value
            elif isinstance(obj, list):
                # 리스트는 JSON 문자열로 변환
                flat_data[prefix] = json.dumps(obj, ensure_ascii=False, default=str)
            else:
                flat_data[prefix] = obj

        _flatten_recursive(data)
        return flat_data

    def export_both_formats(
        self, survey_data: Dict[str, Any], survey_id: int, form_type: str
    ) -> Dict[str, str]:
        """
        JSON과 CSV 두 형태로 모두 저장

        Args:
            survey_data: 설문 응답 데이터
            survey_id: 설문 ID
            form_type: 설문 유형

        Returns:
            Dict[str, str]: {'json': json_path, 'csv': csv_path}
        """
        json_path = self.export_json(survey_data, survey_id, form_type)
        csv_path = self.export_csv(survey_data, survey_id, form_type)

        return {"json": json_path, "csv": csv_path}

    def create_backup(self, survey_id: int, form_type: str) -> bool:
        """
        특정 설문의 파일들을 백업 디렉토리에 복사

        Args:
            survey_id: 설문 ID
            form_type: 설문 유형

        Returns:
            bool: 백업 성공 여부
        """
        try:
            import shutil

            form_dir = self.base_path / f"form_{form_type}"
            backup_dir = self.base_path / "backups" / f"form_{form_type}"
            backup_dir.mkdir(parents=True, exist_ok=True)

            # 해당 설문 ID의 파일들 찾기
            pattern = f"*_FORM{form_type}_ID{survey_id}.*"
            files_to_backup = list(form_dir.glob(pattern))

            for file_path in files_to_backup:
                backup_path = backup_dir / file_path.name
                shutil.copy2(file_path, backup_path)
                current_app.logger.info(f"📦 Backup created: {backup_path}")

            return True

        except Exception as e:
            current_app.logger.error(
                f"❌ Backup failed for survey {survey_id}: {str(e)}"
            )
            return False

    def list_files(self, form_type: Optional[str] = None) -> Dict[str, list]:
        """
        저장된 파일 목록 조회

        Args:
            form_type: 특정 설문 유형 (None이면 전체)

        Returns:
            Dict[str, list]: 파일 목록 정보
        """
        file_info = {"json_files": [], "csv_files": [], "total_count": 0}

        if form_type:
            search_dirs = [self.base_path / f"form_{form_type}"]
        else:
            search_dirs = [
                self.base_path / "form_001",
                self.base_path / "form_002",
                self.base_path / "form_003",
            ]

        for search_dir in search_dirs:
            if search_dir.exists():
                json_files = list(search_dir.glob("*.json"))
                csv_files = list(search_dir.glob("*.csv"))

                file_info["json_files"].extend([str(f) for f in json_files])
                file_info["csv_files"].extend([str(f) for f in csv_files])

        file_info["total_count"] = len(file_info["json_files"]) + len(
            file_info["csv_files"]
        )
        return file_info

    def get_file_stats(self) -> Dict[str, Any]:
        """
        파일 통계 정보 조회

        Returns:
            Dict[str, Any]: 통계 정보
        """
        stats = {
            "by_form_type": {},
            "by_format": {"json": 0, "csv": 0},
            "total_files": 0,
            "total_size_mb": 0,
            "created_date_range": {"earliest": None, "latest": None},
        }

        form_types = ["001", "002", "003"]
        created_dates = []

        for form_type in form_types:
            form_dir = self.base_path / f"form_{form_type}"
            if form_dir.exists():
                json_files = list(form_dir.glob("*.json"))
                csv_files = list(form_dir.glob("*.csv"))

                stats["by_form_type"][form_type] = {
                    "json": len(json_files),
                    "csv": len(csv_files),
                    "total": len(json_files) + len(csv_files),
                }

                stats["by_format"]["json"] += len(json_files)
                stats["by_format"]["csv"] += len(csv_files)

                # 파일 생성 시간 수집
                for file_path in json_files + csv_files:
                    created_dates.append(
                        datetime.fromtimestamp(file_path.stat().st_ctime)
                    )
                    stats["total_size_mb"] += file_path.stat().st_size / (1024 * 1024)

        stats["total_files"] = stats["by_format"]["json"] + stats["by_format"]["csv"]

        if created_dates:
            stats["created_date_range"]["earliest"] = min(created_dates).isoformat()
            stats["created_date_range"]["latest"] = max(created_dates).isoformat()

        return stats


def export_survey_raw_data(
    survey_data: Dict[str, Any],
    survey_id: int,
    form_type: str,
    format_types: list = None,
) -> Dict[str, str]:
    """
    설문 데이터를 개별 raw 파일로 저장하는 헬퍼 함수

    Args:
        survey_data: 설문 응답 데이터
        survey_id: 설문 ID
        form_type: 설문 유형 (001, 002, 003)
        format_types: 저장할 형태 ['json', 'csv'] (기본값: 둘 다)

    Returns:
        Dict[str, str]: 저장된 파일 경로들
    """
    if format_types is None:
        format_types = ["json", "csv"]

    exporter = RawDataExporter()
    result = {}

    if "json" in format_types:
        result["json"] = exporter.export_json(survey_data, survey_id, form_type)

    if "csv" in format_types:
        result["csv"] = exporter.export_csv(survey_data, survey_id, form_type)

    # 자동 백업 생성
    exporter.create_backup(survey_id, form_type)

    return result
