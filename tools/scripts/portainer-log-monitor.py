#!/usr/bin/env python3
"""
Portainer API 컨테이너 로그 조회 스크립트
운영 환경 트러블슈팅 및 모니터링용
"""

import os
import sys
import json
import requests
import argparse
from datetime import datetime, timezone
from typing import Dict, List, Optional


class PortainerLogMonitor:
    """Portainer API를 통한 컨테이너 로그 모니터링"""
    
    def __init__(self, portainer_url: str = None, username: str = None, password: str = None):
        # 환경변수 또는 매개변수에서 설정 로드
        self.portainer_url = portainer_url or os.environ.get('PORTAINER_URL', 'https://portainer.jclee.me')
        self.username = username or os.environ.get('PORTAINER_USERNAME', 'admin')
        self.password = password or os.environ.get('PORTAINER_PASSWORD')
        
        if not self.password:
            print("❌ Error: PORTAINER_PASSWORD environment variable or password argument required")
            sys.exit(1)
            
        self.session = requests.Session()
        self.auth_token = None
        self.endpoint_id = None
        
    def authenticate(self) -> bool:
        """Portainer API 인증"""
        try:
            auth_url = f"{self.portainer_url}/api/auth"
            auth_data = {
                "Username": self.username,
                "Password": self.password
            }
            
            response = self.session.post(auth_url, json=auth_data, verify=False)
            response.raise_for_status()
            
            auth_result = response.json()
            self.auth_token = auth_result.get('jwt')
            
            if not self.auth_token:
                print("❌ Authentication failed: No JWT token received")
                return False
                
            # 헤더에 JWT 토큰 설정
            self.session.headers.update({
                'Authorization': f'Bearer {self.auth_token}',
                'Content-Type': 'application/json'
            })
            
            print("✅ Successfully authenticated with Portainer")
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Authentication error: {e}")
            return False
            
    def get_endpoints(self) -> List[Dict]:
        """사용 가능한 엔드포인트 목록 조회"""
        try:
            endpoints_url = f"{self.portainer_url}/api/endpoints"
            response = self.session.get(endpoints_url)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to get endpoints: {e}")
            return []
            
    def set_endpoint(self, endpoint_name: str = None) -> bool:
        """Docker 엔드포인트 설정"""
        endpoints = self.get_endpoints()
        
        if not endpoints:
            print("❌ No endpoints available")
            return False
            
        # 엔드포인트 자동 선택 (첫 번째 Docker 엔드포인트)
        for endpoint in endpoints:
            if endpoint.get('Type') == 1:  # Docker endpoint type
                if not endpoint_name or endpoint.get('Name') == endpoint_name:
                    self.endpoint_id = endpoint.get('Id')
                    print(f"✅ Using endpoint: {endpoint.get('Name')} (ID: {self.endpoint_id})")
                    return True
                    
        print(f"❌ Endpoint '{endpoint_name}' not found" if endpoint_name else "❌ No Docker endpoints found")
        return False
        
    def get_containers(self, name_filter: str = None) -> List[Dict]:
        """컨테이너 목록 조회"""
        if not self.endpoint_id:
            print("❌ No endpoint selected")
            return []
            
        try:
            containers_url = f"{self.portainer_url}/api/endpoints/{self.endpoint_id}/docker/containers/json"
            params = {'all': 'true'}
            
            response = self.session.get(containers_url, params=params)
            response.raise_for_status()
            
            containers = response.json()
            
            # 이름 필터 적용
            if name_filter:
                containers = [c for c in containers if any(name_filter in name for name in c.get('Names', []))]
                
            return containers
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to get containers: {e}")
            return []
            
    def get_container_logs(self, container_id: str, lines: int = 100, follow: bool = False) -> str:
        """컨테이너 로그 조회"""
        if not self.endpoint_id:
            print("❌ No endpoint selected")
            return ""
            
        try:
            logs_url = f"{self.portainer_url}/api/endpoints/{self.endpoint_id}/docker/containers/{container_id}/logs"
            params = {
                'stdout': 'true',
                'stderr': 'true',
                'timestamps': 'true',
                'tail': str(lines)
            }
            
            if follow:
                params['follow'] = 'true'
                
            response = self.session.get(logs_url, params=params, stream=follow)
            response.raise_for_status()
            
            if follow:
                # 스트리밍 모드
                for line in response.iter_lines(decode_unicode=True):
                    if line:
                        print(self._format_log_line(line))
                return ""
            else:
                return response.text
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to get container logs: {e}")
            return ""
            
    def _format_log_line(self, line: str) -> str:
        """로그 라인 포맷팅"""
        try:
            # Docker 로그 포맷에서 타임스탬프 추출
            if line.startswith('20'):  # 2024-xx-xx 형태 타임스탬프
                parts = line.split(' ', 1)
                if len(parts) >= 2:
                    timestamp = parts[0]
                    message = parts[1]
                    # 시간 포맷 변환
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    formatted_time = dt.strftime('%H:%M:%S')
                    return f"[{formatted_time}] {message}"
            return line
        except:
            return line
            
    def monitor_safework_logs(self, service_name: str = 'safework-app', lines: int = 50):
        """SafeWork 애플리케이션 로그 모니터링"""
        print(f"🔍 Monitoring {service_name} logs...")
        
        containers = self.get_containers(service_name)
        if not containers:
            print(f"❌ No containers found matching '{service_name}'")
            return
            
        container = containers[0]
        container_id = container['Id']
        container_name = container['Names'][0].lstrip('/')
        
        print(f"📊 Container: {container_name} ({container_id[:12]})")
        print(f"📅 Status: {container['State']} | Image: {container['Image']}")
        print("=" * 80)
        
        logs = self.get_container_logs(container_id, lines)
        
        # 에러 패턴 감지
        error_patterns = [
            'ERROR',
            'CRITICAL',
            'Exception',
            'Traceback',
            'Failed',
            '500',
            'OperationalError'
        ]
        
        lines_with_errors = []
        for line in logs.split('\n'):
            if line.strip():
                # 에러 패턴 검사
                is_error = any(pattern in line for pattern in error_patterns)
                if is_error:
                    lines_with_errors.append(line)
                    print(f"🔴 {line}")
                else:
                    print(f"   {line}")
                    
        # 에러 요약
        if lines_with_errors:
            print("\n" + "=" * 80)
            print(f"🚨 Found {len(lines_with_errors)} error line(s):")
            for error_line in lines_with_errors[-10:]:  # 최근 10개만 표시
                print(f"   • {error_line}")
                
    def search_error_patterns(self, service_name: str = 'safework-app', pattern: str = None):
        """특정 에러 패턴 검색"""
        containers = self.get_containers(service_name)
        if not containers:
            return
            
        container = containers[0]
        logs = self.get_container_logs(container['Id'], 200)
        
        if pattern:
            matching_lines = [line for line in logs.split('\n') if pattern.lower() in line.lower()]
            print(f"🔍 Found {len(matching_lines)} lines matching '{pattern}':")
            for line in matching_lines[-20:]:  # 최근 20개
                print(f"   {line}")


def main():
    parser = argparse.ArgumentParser(description='Portainer API 컨테이너 로그 모니터링')
    parser.add_argument('--service', '-s', default='safework-app', help='서비스 이름 (기본: safework-app)')
    parser.add_argument('--lines', '-n', type=int, default=50, help='조회할 로그 라인 수 (기본: 50)')
    parser.add_argument('--follow', '-f', action='store_true', help='실시간 로그 모니터링')
    parser.add_argument('--search', help='검색할 패턴')
    parser.add_argument('--portainer-url', help='Portainer URL')
    parser.add_argument('--username', help='Portainer 사용자명')
    parser.add_argument('--password', help='Portainer 비밀번호')
    
    args = parser.parse_args()
    
    # Portainer 모니터 초기화
    monitor = PortainerLogMonitor(
        portainer_url=args.portainer_url,
        username=args.username, 
        password=args.password
    )
    
    # 인증 및 엔드포인트 설정
    if not monitor.authenticate():
        sys.exit(1)
        
    if not monitor.set_endpoint():
        sys.exit(1)
        
    # 로그 조회 실행
    if args.search:
        monitor.search_error_patterns(args.service, args.search)
    elif args.follow:
        containers = monitor.get_containers(args.service)
        if containers:
            print(f"🔄 Following logs for {args.service}... (Press Ctrl+C to stop)")
            try:
                monitor.get_container_logs(containers[0]['Id'], args.lines, follow=True)
            except KeyboardInterrupt:
                print("\n⏹️ Stopped monitoring")
    else:
        monitor.monitor_safework_logs(args.service, args.lines)


if __name__ == '__main__':
    main()