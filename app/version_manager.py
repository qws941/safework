"""
SafeWork 동적 버전 관리 시스템
"""
import os
import subprocess
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional


class VersionManager:
    """Git SHA 기반 태그 및 버전 관리 클래스"""
    
    def __init__(self, app_dir: str = None):
        self.app_dir = app_dir or os.path.dirname(__file__)
        self.version_file = os.path.join(self.app_dir, "VERSION")
        self._version_info = None
    
    def get_git_info(self) -> Dict[str, str]:
        """Git 정보 수집"""
        info = {
            'commit_hash': 'unknown',
            'commit_short': 'unknown',
            'branch': 'unknown',
            'tag': 'unknown',
            'commit_date': 'unknown',
            'commit_message': 'unknown'
        }
        
        try:
            # 커밋 해시
            result = subprocess.run(['git', 'rev-parse', 'HEAD'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                info['commit_hash'] = result.stdout.strip()
                info['commit_short'] = info['commit_hash'][:8]
            
            # 브랜치
            result = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                info['branch'] = result.stdout.strip()
            
            # 태그
            result = subprocess.run(['git', 'describe', '--tags', '--exact-match'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                info['tag'] = result.stdout.strip()
            
            # 커밋 날짜
            result = subprocess.run(['git', 'log', '-1', '--format=%ci'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                info['commit_date'] = result.stdout.strip()
            
            # 커밋 메시지
            result = subprocess.run(['git', 'log', '-1', '--format=%s'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                info['commit_message'] = result.stdout.strip()
                
        except Exception:
            pass
        
        return info
    
    def get_version_file_info(self) -> Optional[str]:
        """VERSION 파일에서 버전 정보 읽기"""
        try:
            with open(self.version_file, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except FileNotFoundError:
            return None
    
    def generate_semantic_version(self) -> str:
        """의미 있는 버전 생성"""
        git_info = self.get_git_info()
        
        # 태그가 있으면 태그를 우선 사용
        if git_info['tag'] != 'unknown':
            return git_info['tag']
        
        # 브랜치 기반 버전 생성
        branch = git_info['branch']
        commit_short = git_info['commit_short']
        timestamp = datetime.now().strftime('%Y%m%d-%H%M')
        
        if branch == 'main' or branch == 'master':
            return f"v3.0.{timestamp}-{commit_short}"
        elif branch == 'develop':
            return f"v3.1-dev.{timestamp}-{commit_short}"
        else:
            return f"v3.0-{branch}.{timestamp}-{commit_short}"
    
    def get_full_version_info(self) -> Dict[str, Any]:
        """전체 버전 정보 반환"""
        if self._version_info is None:
            git_info = self.get_git_info()
            file_version = self.get_version_file_info()
            semantic_version = self.generate_semantic_version()
            
            self._version_info = {
                'version': semantic_version,
                'file_version': file_version,
                'git': git_info,
                'build_time': datetime.now(timezone.utc).isoformat(),
                'build_type': self._detect_build_type()
            }
        
        return self._version_info
    
    def create_tag(self, tag_name: str = None, message: str = None) -> bool:
        """Git 태그 생성"""
        try:
            if tag_name is None:
                # 자동 태그 이름 생성 (v3.0.0-YYYYMMDD-HHMM-SHA)
                git_info = self.get_git_info()
                timestamp = datetime.now().strftime('%Y%m%d-%H%M')
                tag_name = f"v3.0.0-{timestamp}-{git_info['commit_short']}"
            
            if message is None:
                message = f"Release {tag_name}"
            
            # 태그 생성
            result = subprocess.run([
                'git', 'tag', '-a', tag_name, '-m', message
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                # VERSION 파일 업데이트
                self.update_version_file(tag_name)
                self._version_info = None  # 캐시 무효화
                return True
            return False
            
        except Exception:
            return False
    
    def push_tag(self, tag_name: str) -> bool:
        """태그를 원격 저장소로 푸시"""
        try:
            result = subprocess.run([
                'git', 'push', 'origin', tag_name
            ], capture_output=True, text=True, timeout=30)
            
            return result.returncode == 0
        except Exception:
            return False
    
    def list_tags(self, limit: int = 10) -> list:
        """최근 태그 목록 반환"""
        try:
            result = subprocess.run([
                'git', 'tag', '--list', '--sort=-version:refname'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                tags = result.stdout.strip().split('\n')
                return [tag for tag in tags if tag][:limit]
            return []
        except Exception:
            return []
    
    def get_tag_info(self, tag_name: str) -> Dict[str, str]:
        """특정 태그의 상세 정보"""
        try:
            # 태그 커밋 SHA
            result = subprocess.run([
                'git', 'rev-list', '-n', '1', tag_name
            ], capture_output=True, text=True, timeout=5)
            
            info = {'tag': tag_name, 'commit': 'unknown', 'date': 'unknown', 'message': 'unknown'}
            
            if result.returncode == 0:
                info['commit'] = result.stdout.strip()[:8]
            
            # 태그 날짜
            result = subprocess.run([
                'git', 'log', '-1', '--format=%ci', tag_name
            ], capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                info['date'] = result.stdout.strip()
            
            # 태그 메시지
            result = subprocess.run([
                'git', 'tag', '-l', '--format=%(contents)', tag_name
            ], capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0 and result.stdout.strip():
                info['message'] = result.stdout.strip()
            
            return info
        except Exception:
            return {'tag': tag_name, 'commit': 'error', 'date': 'error', 'message': 'error'}
    
    def delete_tag(self, tag_name: str, remote: bool = True) -> bool:
        """태그 삭제"""
        try:
            # 로컬 태그 삭제
            result = subprocess.run([
                'git', 'tag', '-d', tag_name
            ], capture_output=True, text=True, timeout=10)
            
            local_success = result.returncode == 0
            
            if remote and local_success:
                # 원격 태그 삭제
                result = subprocess.run([
                    'git', 'push', 'origin', f':refs/tags/{tag_name}'
                ], capture_output=True, text=True, timeout=30)
                
                return result.returncode == 0
            
            return local_success
        except Exception:
            return False
    
    def _detect_build_type(self) -> str:
        """빌드 타입 감지"""
        git_info = self.get_git_info()
        branch = git_info['branch']
        
        if branch in ['main', 'master']:
            return 'production'
        elif branch == 'develop':
            return 'development'
        elif 'feature' in branch:
            return 'feature'
        elif 'hotfix' in branch:
            return 'hotfix'
        else:
            return 'experimental'
    
    def update_version_file(self, version: str = None):
        """VERSION 파일 업데이트"""
        if version is None:
            version = self.generate_semantic_version()
        
        with open(self.version_file, 'w', encoding='utf-8') as f:
            f.write(version)
        
        # 캐시 무효화
        self._version_info = None
    
    def get_version_display(self) -> str:
        """UI 표시용 버전 문자열"""
        info = self.get_full_version_info()
        version = info['version']
        build_type = info['build_type']
        commit_short = info['git']['commit_short']
        
        if build_type == 'production':
            return f"{version}"
        else:
            return f"{version} ({build_type}-{commit_short})"
    
    def export_version_json(self) -> str:
        """버전 정보를 JSON으로 내보내기"""
        return json.dumps(self.get_full_version_info(), indent=2, ensure_ascii=False)


# 전역 인스턴스
version_manager = VersionManager()


def get_version() -> str:
    """간단한 버전 조회 함수"""
    return version_manager.get_version_display()


def get_version_info() -> Dict[str, Any]:
    """전체 버전 정보 조회 함수"""
    return version_manager.get_full_version_info()


if __name__ == "__main__":
    # 버전 정보 출력 (테스트용)
    vm = VersionManager()
    print("=== SafeWork 버전 정보 ===")
    print(vm.export_version_json())