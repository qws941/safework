"""
SafeWork 버전 관리 관리자 라우트
"""
from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from flask_login import login_required, current_user
import json

version_admin_bp = Blueprint('version_admin', __name__)


def admin_required(f):
    """관리자 권한 데코레이터"""
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            flash('관리자 권한이 필요합니다.')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    
    return decorated_function


@version_admin_bp.route('/')
@login_required
@admin_required
def index():
    """버전 관리 메인 페이지"""
    try:
        from version_manager import VersionManager
        vm = VersionManager()
        version_info = vm.get_full_version_info()
        git_info = vm.get_git_info()
        
        return render_template('admin/version_dashboard.html',
                             version_info=version_info,
                             git_info=git_info)
    except ImportError:
        flash('버전 관리 모듈을 가져올 수 없습니다.', 'error')
        return redirect(url_for('admin.dashboard'))


@version_admin_bp.route('/api/info')
@login_required
@admin_required
def api_info():
    """버전 정보 API"""
    try:
        from version_manager import VersionManager
        vm = VersionManager()
        return jsonify(vm.get_full_version_info())
    except ImportError:
        return jsonify({'error': 'Version manager not available'}), 500


@version_admin_bp.route('/update', methods=['POST'])
@login_required
@admin_required
def update_version():
    """버전 업데이트"""
    try:
        from version_manager import VersionManager
        vm = VersionManager()
        
        update_type = request.form.get('type', 'auto')
        custom_version = request.form.get('custom_version', '').strip()
        
        if update_type == 'custom' and custom_version:
            vm.update_version_file(custom_version)
            flash(f'버전을 {custom_version}로 업데이트했습니다.', 'success')
        elif update_type == 'auto':
            new_version = vm.generate_semantic_version()
            vm.update_version_file(new_version)
            flash(f'버전을 자동으로 {new_version}로 업데이트했습니다.', 'success')
        elif update_type in ['major', 'minor', 'patch']:
            # 간단한 시맨틱 버전 범프
            if update_type == 'major':
                new_version = "v4.0.0-manual"
            elif update_type == 'minor':
                new_version = "v3.1.0-manual"
            else:  # patch
                new_version = "v3.0.1-manual"
            
            vm.update_version_file(new_version)
            flash(f'{update_type} 버전 범프: {new_version}', 'success')
        else:
            flash('유효하지 않은 업데이트 유형입니다.', 'error')
            
    except ImportError:
        flash('버전 관리 모듈을 가져올 수 없습니다.', 'error')
    except Exception as e:
        flash(f'버전 업데이트 중 오류가 발생했습니다: {str(e)}', 'error')
    
    return redirect(url_for('version_admin.index'))


@version_admin_bp.route('/history')
@login_required
@admin_required
def version_history():
    """버전 히스토리 (Git 로그 기반)"""
    try:
        import subprocess
        
        # Git 로그에서 버전 관련 커밋 가져오기
        result = subprocess.run([
            'git', 'log', '--oneline', '--grep=version', '--grep=bump', 
            '--grep=release', '-10'
        ], capture_output=True, text=True, timeout=10)
        
        history = []
        if result.returncode == 0:
            for line in result.stdout.strip().split('\n'):
                if line:
                    parts = line.split(' ', 1)
                    if len(parts) == 2:
                        history.append({
                            'commit': parts[0],
                            'message': parts[1]
                        })
        
        return render_template('admin/version_history.html', history=history)
        
    except Exception as e:
        flash(f'히스토리를 가져오는 중 오류가 발생했습니다: {str(e)}', 'error')
        return redirect(url_for('version_admin.index'))


@version_admin_bp.route('/export')
@login_required
@admin_required
def export_version_info():
    """버전 정보 내보내기"""
    try:
        from version_manager import VersionManager
        vm = VersionManager()
        
        version_json = vm.export_version_json()
        
        from flask import Response
        return Response(
            version_json,
            mimetype='application/json',
            headers={
                'Content-Disposition': f'attachment; filename=safework-version-info.json'
            }
        )
        
    except ImportError:
        flash('버전 관리 모듈을 가져올 수 없습니다.', 'error')
        return redirect(url_for('version_admin.index'))
    except Exception as e:
        flash(f'내보내기 중 오류가 발생했습니다: {str(e)}', 'error')
        return redirect(url_for('version_admin.index'))