"""
SafeWork Raw Data 관리 API 라우트
설문 제출별 생성된 raw data 파일들을 관리하고 조회하는 관리자 전용 라우트
"""

from flask import Blueprint, jsonify, request, send_file, current_app, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from functools import wraps
import os
from pathlib import Path
from datetime import datetime, timedelta
import json

from utils.raw_data_exporter import RawDataExporter

raw_data_bp = Blueprint('raw_data', __name__)


def admin_required(f):
    """관리자 권한 확인 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not getattr(current_user, 'is_admin', False):
            flash('관리자 권한이 필요합니다.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function


@raw_data_bp.route('/dashboard')
@login_required
@admin_required
def dashboard():
    """Raw Data 관리 대시보드 - 향상된 기능"""
    try:
        from utils.system_monitor import SystemMonitor
        monitor = SystemMonitor()
        
        # 시스템 헬스체크
        health_status = monitor.get_system_health()
        
        # 추가 통계 정보
        from pathlib import Path
        import os
        
        raw_data_path = Path(current_app.root_path) / 'raw_data'
        
        # 폼별 파일 수 계산
        form_stats = {}
        if raw_data_path.exists():
            for form_dir in raw_data_path.iterdir():
                if form_dir.is_dir() and form_dir.name.startswith('form_'):
                    form_type = form_dir.name.replace('form_', '')
                    file_count = len([f for f in form_dir.glob('*.json')])
                    form_stats[form_type] = file_count
        
        # 최근 파일 목록
        recent_files = []
        if raw_data_path.exists():
            all_files = []
            for file_path in raw_data_path.rglob('*.json'):
                if not 'backups' in str(file_path):  # 백업 파일 제외
                    all_files.append(file_path)
            
            # 수정 시간 기준 정렬
            all_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            
            for file_path in all_files[:10]:  # 최근 10개
                stat = file_path.stat()
                recent_files.append({
                    'name': file_path.name,
                    'path': str(file_path.relative_to(raw_data_path)),
                    'size_kb': round(stat.st_size / 1024, 2),
                    'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                })
        
        return render_template('admin/raw_data_dashboard_enhanced.html', 
                             health_status=health_status,
                             form_stats=form_stats,
                             recent_files=recent_files)
                             
    except Exception as e:
        current_app.logger.error(f"Raw data dashboard error: {e}")
        flash(f"대시보드 로드 중 오류가 발생했습니다: {str(e)}", "error")
        return redirect(url_for('admin.dashboard'))


@raw_data_bp.route('/api/raw-data/stats')
@login_required
@admin_required
def api_stats():
    """Raw Data 통계 API (JSON 응답)"""
    try:
        exporter = RawDataExporter()
        stats = exporter.get_file_stats()
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@raw_data_bp.route('/api/raw-data/files')
@login_required
@admin_required
def api_files():
    """Raw Data 파일 목록 API"""
    try:
        form_type = request.args.get('form_type')  # 선택적 필터
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        exporter = RawDataExporter()
        file_info = exporter.list_files(form_type)
        
        # 페이지네이션 구현
        all_files = file_info['json_files'] + file_info['csv_files']
        total_files = len(all_files)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        
        paginated_files = all_files[start_idx:end_idx]
        
        # 파일별 상세 정보 추가
        detailed_files = []
        for file_path in paginated_files:
            try:
                path_obj = Path(file_path)
                if path_obj.exists():
                    stat = path_obj.stat()
                    
                    # 파일명에서 정보 추출
                    parts = path_obj.stem.split('_')
                    if len(parts) >= 4:
                        timestamp = f"{parts[0]}_{parts[1]}"
                        form_type_part = parts[2]
                        survey_id_part = parts[3]
                    else:
                        timestamp = "unknown"
                        form_type_part = "unknown"
                        survey_id_part = "unknown"
                    
                    detailed_files.append({
                        'name': path_obj.name,
                        'path': str(path_obj),
                        'size_mb': round(stat.st_size / (1024 * 1024), 3),
                        'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        'modified_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        'format': path_obj.suffix[1:],  # .json -> json
                        'form_type': form_type_part.replace('FORM', ''),
                        'survey_id': survey_id_part.replace('ID', ''),
                        'timestamp': timestamp
                    })
            except Exception as file_error:
                current_app.logger.warning(f"파일 정보 읽기 실패: {file_path} - {str(file_error)}")
        
        return jsonify({
            'success': True,
            'files': detailed_files,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_files,
                'pages': (total_files + per_page - 1) // per_page
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@raw_data_bp.route('/api/raw-data/download/<path:file_path>')
@login_required
@admin_required
def download_file(file_path):
    """Raw Data 파일 다운로드"""
    try:
        exporter = RawDataExporter()
        full_path = exporter.base_path / file_path
        
        # 보안: base_path 내부 파일만 허용
        if not str(full_path).startswith(str(exporter.base_path)):
            return jsonify({'error': '잘못된 파일 경로입니다.'}), 400
        
        if not full_path.exists():
            return jsonify({'error': '파일을 찾을 수 없습니다.'}), 404
        
        return send_file(
            full_path,
            as_attachment=True,
            download_name=full_path.name
        )
    
    except Exception as e:
        current_app.logger.error(f"파일 다운로드 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500


@raw_data_bp.route('/api/raw-data/view/<path:file_path>')
@login_required
@admin_required
def view_file(file_path):
    """Raw Data 파일 내용 미리보기 (JSON 파일만)"""
    try:
        exporter = RawDataExporter()
        full_path = exporter.base_path / file_path
        
        # 보안: base_path 내부 파일만 허용
        if not str(full_path).startswith(str(exporter.base_path)):
            return jsonify({'error': '잘못된 파일 경로입니다.'}), 400
        
        if not full_path.exists():
            return jsonify({'error': '파일을 찾을 수 없습니다.'}), 404
        
        if full_path.suffix.lower() != '.json':
            return jsonify({'error': 'JSON 파일만 미리보기 가능합니다.'}), 400
        
        with open(full_path, 'r', encoding='utf-8') as f:
            content = json.load(f)
        
        return jsonify({
            'success': True,
            'content': content,
            'file_info': {
                'name': full_path.name,
                'size_mb': round(full_path.stat().st_size / (1024 * 1024), 3),
                'created_at': datetime.fromtimestamp(full_path.stat().st_ctime).isoformat()
            }
        })
    
    except json.JSONDecodeError:
        return jsonify({'error': 'JSON 파일 형식이 올바르지 않습니다.'}), 400
    except Exception as e:
        current_app.logger.error(f"파일 미리보기 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500


@raw_data_bp.route('/api/cleanup', methods=['POST'])
@login_required
@admin_required
def cleanup_old_files():
    """오래된 파일 정리 API - 강화된 기능"""
    try:
        from utils.file_manager import file_manager
        
        # 요청 데이터 파싱
        data = request.get_json() or {}
        days_to_keep = data.get('days_to_keep', 30)
        dry_run = data.get('dry_run', False)
        
        # 파일 정리 실행
        result = file_manager.cleanup_old_files(
            days_to_keep=days_to_keep,
            dry_run=dry_run
        )
        
        return jsonify(result)
        
    except Exception as e:
        current_app.logger.error(f"Cleanup API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@raw_data_bp.route('/api/backup', methods=['POST'])
@login_required
@admin_required
def create_backup():
    """백업 생성 API - 강화된 기능"""
    try:
        from utils.file_manager import file_manager
        
        # 요청 데이터 파싱
        data = request.get_json() or {}
        backup_type = data.get('backup_type', 'manual')
        
        # 백업 생성
        result = file_manager.create_backup(backup_type=backup_type)
        
        return jsonify(result)
        
    except Exception as e:
        current_app.logger.error(f"Backup API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@raw_data_bp.route('/api/integrity-check', methods=['POST'])
@login_required
@admin_required
def integrity_check():
    """파일 무결성 검증 API"""
    try:
        from utils.file_manager import file_manager
        
        result = file_manager.verify_file_integrity()
        return jsonify(result)
        
    except Exception as e:
        current_app.logger.error(f"Integrity check API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@raw_data_bp.route('/api/storage-usage', methods=['GET'])
@login_required
@admin_required
def storage_usage():
    """스토리지 사용량 조회 API"""
    try:
        from utils.file_manager import file_manager
        
        result = file_manager.get_storage_usage()
        return jsonify(result)
        
    except Exception as e:
        current_app.logger.error(f"Storage usage API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@raw_data_bp.route('/api/system-health', methods=['GET'])
@login_required
@admin_required
def system_health():
    """시스템 헬스체크 API"""
    try:
        from utils.system_monitor import SystemMonitor
        
        monitor = SystemMonitor()
        health_status = monitor.get_system_health()
        
        return jsonify(health_status)
        
    except Exception as e:
        current_app.logger.error(f"System health API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@raw_data_bp.route('/api/archive', methods=['POST'])
@login_required
@admin_required
def create_archive():
    """파일 아카이브 생성 API"""
    try:
        from utils.file_manager import file_manager
        
        data = request.get_json() or {}
        days_to_archive = data.get('days_to_archive', 90)
        
        result = file_manager.archive_old_files(days_to_archive=days_to_archive)
        return jsonify(result)
        
    except Exception as e:
        current_app.logger.error(f"Archive API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
