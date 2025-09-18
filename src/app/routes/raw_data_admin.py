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


@raw_data_bp.route('/admin/raw-data/dashboard')
@login_required
@admin_required
def dashboard():
    """Raw Data 관리 대시보드"""
    try:
        exporter = RawDataExporter()
        
        # 파일 통계 정보 가져오기
        stats = exporter.get_file_stats()
        
        # 최근 생성된 파일 목록 (최대 20개)
        recent_files = []
        for form_type in ['001', '002', '003']:
            form_dir = exporter.base_path / f'form_{form_type}'
            if form_dir.exists():
                files = list(form_dir.glob('*.json'))
                files.sort(key=lambda x: x.stat().st_ctime, reverse=True)
                
                for file_path in files[:7]:  # 각 폼당 최대 7개
                    file_stat = file_path.stat()
                    recent_files.append({
                        'name': file_path.name,
                        'form_type': form_type,
                        'size_mb': round(file_stat.st_size / (1024 * 1024), 3),
                        'created_at': datetime.fromtimestamp(file_stat.st_ctime),
                        'path': str(file_path)
                    })
        
        # 생성 시간 순으로 정렬
        recent_files.sort(key=lambda x: x['created_at'], reverse=True)
        recent_files = recent_files[:20]  # 최대 20개
        
        return render_template('admin/raw_data_dashboard.html', 
                             stats=stats, 
                             recent_files=recent_files)
    
    except Exception as e:
        current_app.logger.error(f"Raw data dashboard error: {str(e)}")
        flash(f'대시보드 로드 중 오류가 발생했습니다: {str(e)}', 'error')
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


@raw_data_bp.route('/api/raw-data/cleanup', methods=['POST'])
@login_required
@admin_required
def cleanup_old_files():
    """오래된 Raw Data 파일 정리"""
    try:
        days = request.json.get('days', 30)  # 기본 30일
        dry_run = request.json.get('dry_run', True)  # 기본적으로 시뮬레이션
        
        exporter = RawDataExporter()
        cutoff_date = datetime.now() - timedelta(days=days)
        
        deleted_files = []
        total_size_freed = 0
        
        # 각 폼 디렉토리에서 오래된 파일 찾기
        for form_type in ['001', '002', '003']:
            form_dir = exporter.base_path / f'form_{form_type}'
            if form_dir.exists():
                for file_path in form_dir.iterdir():
                    if file_path.is_file():
                        file_date = datetime.fromtimestamp(file_path.stat().st_ctime)
                        if file_date < cutoff_date:
                            file_size = file_path.stat().st_size
                            deleted_files.append({
                                'name': file_path.name,
                                'path': str(file_path),
                                'created_at': file_date.isoformat(),
                                'size_mb': round(file_size / (1024 * 1024), 3)
                            })
                            total_size_freed += file_size
                            
                            if not dry_run:
                                file_path.unlink()  # 실제 삭제
        
        result = {
            'success': True,
            'deleted_files': deleted_files,
            'total_files_deleted': len(deleted_files),
            'total_size_freed_mb': round(total_size_freed / (1024 * 1024), 2),
            'dry_run': dry_run
        }
        
        if dry_run:
            result['message'] = f'{days}일 이전 파일 {len(deleted_files)}개 (총 {result["total_size_freed_mb"]}MB)가 삭제 대상입니다.'
        else:
            result['message'] = f'{len(deleted_files)}개 파일을 삭제했습니다. (총 {result["total_size_freed_mb"]}MB 절약)'
            current_app.logger.info(f"Raw data cleanup: {len(deleted_files)} files deleted, {result['total_size_freed_mb']}MB freed")
        
        return jsonify(result)
    
    except Exception as e:
        current_app.logger.error(f"파일 정리 오류: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@raw_data_bp.route('/api/raw-data/backup', methods=['POST'])
@login_required
@admin_required
def create_backup():
    """전체 Raw Data 백업 생성"""
    try:
        import shutil
        import tempfile
        from datetime import datetime
        
        exporter = RawDataExporter()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # 임시 백업 디렉토리 생성
        backup_name = f'safework_rawdata_backup_{timestamp}'
        
        with tempfile.TemporaryDirectory() as temp_dir:
            backup_path = Path(temp_dir) / backup_name
            
            # 전체 raw_data 디렉토리 복사
            shutil.copytree(exporter.base_path, backup_path)
            
            # ZIP 파일로 압축
            zip_path = Path(temp_dir) / f'{backup_name}.zip'
            shutil.make_archive(str(zip_path.with_suffix('')), 'zip', temp_dir, backup_name)
            
            # 백업 디렉토리에 저장
            final_backup_dir = exporter.base_path / 'backups'
            final_backup_dir.mkdir(exist_ok=True)
            final_backup_path = final_backup_dir / f'{backup_name}.zip'
            
            shutil.move(str(zip_path), str(final_backup_path))
            
            backup_size = final_backup_path.stat().st_size
            
            current_app.logger.info(f"Raw data backup created: {final_backup_path}")
            
            return jsonify({
                'success': True,
                'backup_file': str(final_backup_path),
                'backup_size_mb': round(backup_size / (1024 * 1024), 2),
                'message': f'백업이 성공적으로 생성되었습니다: {backup_name}.zip'
            })
    
    except Exception as e:
        current_app.logger.error(f"백업 생성 오류: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500