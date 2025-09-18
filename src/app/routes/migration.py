"""Migration management routes for admin panel"""

import json
from datetime import datetime

from flask import Blueprint, flash, jsonify, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from migration_manager import MigrationManager
from models import db

migration_bp = Blueprint("migration", __name__)


@migration_bp.route("/migrations")
@login_required
def migration_status():
    """마이그레이션 상태 페이지"""
    if not current_user.is_admin:
        flash("관리자 권한이 필요합니다.", "error")
        return redirect(url_for("main.index"))

    try:
        from flask import current_app

        migration_manager = current_app.migration_manager
        status = migration_manager.get_migration_status()

        return render_template(
            "admin/migrations.html",
            status=status,
            page_title="데이터베이스 마이그레이션",
        )
    except Exception as e:
        flash(f"마이그레이션 상태 조회 중 오류 발생: {str(e)}", "error")
        return redirect(url_for("admin.dashboard"))


@migration_bp.route("/api/migrations/status")
@login_required
def api_migration_status():
    """마이그레이션 상태 API"""
    if not current_user.is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        from flask import current_app

        migration_manager = current_app.migration_manager
        status = migration_manager.get_migration_status()

        return jsonify({"success": True, "data": status})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@migration_bp.route("/api/migrations/run", methods=["POST"])
@login_required
def api_run_migrations():
    """마이그레이션 실행 API"""
    if not current_user.is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        from flask import current_app

        migration_manager = current_app.migration_manager

        # 대상 버전 가져오기 (선택사항)
        target_version = request.json.get("target_version") if request.json else None

        # 마이그레이션 실행
        success = migration_manager.migrate(target_version)

        if success:
            return jsonify(
                {
                    "success": True,
                    "message": "마이그레이션이 성공적으로 완료되었습니다.",
                }
            )
        else:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "마이그레이션 실행 중 오류가 발생했습니다.",
                    }
                ),
                500,
            )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@migration_bp.route("/api/migrations/rollback", methods=["POST"])
@login_required
def api_rollback_migration():
    """마이그레이션 롤백 API"""
    if not current_user.is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        from flask import current_app

        migration_manager = current_app.migration_manager

        # 롤백할 버전 가져오기
        if not request.json or "version" not in request.json:
            return (
                jsonify({"success": False, "error": "롤백할 버전을 지정해주세요."}),
                400,
            )

        version = request.json["version"]

        # 해당 버전의 마이그레이션 파일 찾기
        filename = None
        for file in migration_manager.get_migration_files():
            file_version, _ = migration_manager._parse_migration_filename(file)
            if file_version == version:
                filename = file
                break

        if not filename:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"버전 {version}에 해당하는 마이그레이션 파일을 찾을 수 없습니다.",
                    }
                ),
                404,
            )

        # 롤백 실행
        success = migration_manager.rollback_migration(filename)

        if success:
            return jsonify(
                {
                    "success": True,
                    "message": f"마이그레이션 {version}이 성공적으로 롤백되었습니다.",
                }
            )
        else:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"마이그레이션 {version} 롤백 중 오류가 발생했습니다.",
                    }
                ),
                500,
            )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@migration_bp.route("/api/migrations/create", methods=["POST"])
@login_required
def api_create_migration():
    """새 마이그레이션 생성 API"""
    if not current_user.is_admin:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        from flask import current_app

        migration_manager = current_app.migration_manager

        # 마이그레이션 설명 가져오기
        if not request.json or "description" not in request.json:
            return (
                jsonify({"success": False, "error": "마이그레이션 설명을 입력해주세요."}),
                400,
            )

        description = request.json["description"].strip()

        if not description:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "마이그레이션 설명은 비어있을 수 없습니다.",
                    }
                ),
                400,
            )

        # 마이그레이션 파일 생성
        filename = migration_manager.create_migration(description)

        return jsonify(
            {
                "success": True,
                "message": f"마이그레이션 파일이 생성되었습니다: {filename}",
                "filename": filename,
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
