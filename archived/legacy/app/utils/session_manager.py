"""
SafeWork Session Manager
세션 중복을 방지하고 관리하는 유틸리티
"""
import hashlib
import json
import time
from typing import Optional
from flask import current_app, session, request
from flask_login import current_user
import redis


class SessionManager:
    """세션 중복 방지 및 관리를 위한 클래스"""

    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.session_prefix = "safework:session:"
        self.user_sessions_prefix = "safework:user_sessions:"

    def _get_redis_client(self):
        """Redis 클라이언트 가져오기"""
        if self.redis_client:
            return self.redis_client

        try:
            # Flask 앱 컨텍스트에서 Redis 연결 정보 가져오기
            redis_host = current_app.config.get('REDIS_HOST', 'safework-redis')
            redis_port = current_app.config.get('REDIS_PORT', 6379)
            redis_db = current_app.config.get('REDIS_DB', 0)

            return redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
        except Exception as e:
            current_app.logger.warning(f"Redis 연결 실패: {e}")
            return None

    def _generate_session_id(self, user_id: int, user_agent: str = None, ip_address: str = None) -> str:
        """고유한 세션 ID 생성"""
        timestamp = str(int(time.time()))
        user_agent = user_agent or request.headers.get('User-Agent', '')
        ip_address = ip_address or request.remote_addr or 'unknown'

        # 해시 기반 세션 ID 생성
        session_data = f"{user_id}:{user_agent}:{ip_address}:{timestamp}"
        session_id = hashlib.sha256(session_data.encode()).hexdigest()[:32]

        return session_id

    def create_user_session(self, user_id: int, force_single: bool = True) -> Optional[str]:
        """
        사용자 세션 생성

        Args:
            user_id: 사용자 ID
            force_single: True인 경우 기존 세션을 모두 제거하고 새로운 세션만 유지

        Returns:
            생성된 세션 ID 또는 None (실패시)
        """
        redis_client = self._get_redis_client()
        if not redis_client:
            current_app.logger.warning("Redis 클라이언트를 사용할 수 없어 세션 관리가 비활성화됩니다")
            return None

        try:
            # 기존 세션 제거 (단일 세션 강제시)
            if force_single:
                self.revoke_user_sessions(user_id)

            # 새 세션 ID 생성
            session_id = self._generate_session_id(user_id)

            # 세션 정보 저장
            session_data = {
                'user_id': user_id,
                'created_at': int(time.time()),
                'last_activity': int(time.time()),
                'user_agent': request.headers.get('User-Agent', ''),
                'ip_address': request.remote_addr or 'unknown',
                'active': True
            }

            # Redis에 세션 저장 (24시간 TTL)
            session_key = f"{self.session_prefix}{session_id}"
            redis_client.setex(session_key, 86400, json.dumps(session_data))

            # 사용자별 활성 세션 목록에 추가
            user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
            redis_client.sadd(user_sessions_key, session_id)
            redis_client.expire(user_sessions_key, 86400)

            current_app.logger.info(f"사용자 {user_id}의 새 세션 생성: {session_id}")
            return session_id

        except Exception as e:
            current_app.logger.error(f"세션 생성 실패 (사용자 {user_id}): {e}")
            return None

    def validate_session(self, user_id: int, session_id: str) -> bool:
        """
        세션 유효성 검증

        Args:
            user_id: 사용자 ID
            session_id: 검증할 세션 ID

        Returns:
            세션이 유효한지 여부
        """
        redis_client = self._get_redis_client()
        if not redis_client:
            return True  # Redis를 사용할 수 없으면 기본적으로 허용

        try:
            session_key = f"{self.session_prefix}{session_id}"
            session_data_str = redis_client.get(session_key)

            if not session_data_str:
                return False

            session_data = json.loads(session_data_str)

            # 사용자 ID 일치 확인
            if session_data.get('user_id') != user_id:
                return False

            # 세션 활성 상태 확인
            if not session_data.get('active', False):
                return False

            # 마지막 활동 시간 업데이트
            session_data['last_activity'] = int(time.time())
            redis_client.setex(session_key, 86400, json.dumps(session_data))

            return True

        except Exception as e:
            current_app.logger.error(f"세션 검증 실패 (사용자 {user_id}, 세션 {session_id}): {e}")
            return False

    def revoke_user_sessions(self, user_id: int, exclude_session: str = None) -> int:
        """
        사용자의 모든 세션 무효화

        Args:
            user_id: 사용자 ID
            exclude_session: 제외할 세션 ID (현재 세션 유지용)

        Returns:
            무효화된 세션 수
        """
        redis_client = self._get_redis_client()
        if not redis_client:
            return 0

        try:
            user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
            session_ids = redis_client.smembers(user_sessions_key)

            revoked_count = 0
            for session_id in session_ids:
                if exclude_session and session_id == exclude_session:
                    continue

                session_key = f"{self.session_prefix}{session_id}"
                if redis_client.delete(session_key):
                    revoked_count += 1

                # 사용자 세션 목록에서 제거
                redis_client.srem(user_sessions_key, session_id)

            current_app.logger.info(f"사용자 {user_id}의 {revoked_count}개 세션 무효화")
            return revoked_count

        except Exception as e:
            current_app.logger.error(f"세션 무효화 실패 (사용자 {user_id}): {e}")
            return 0

    def get_user_active_sessions(self, user_id: int) -> list:
        """
        사용자의 활성 세션 목록 조회

        Args:
            user_id: 사용자 ID

        Returns:
            활성 세션 정보 리스트
        """
        redis_client = self._get_redis_client()
        if not redis_client:
            return []

        try:
            user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
            session_ids = redis_client.smembers(user_sessions_key)

            active_sessions = []
            for session_id in session_ids:
                session_key = f"{self.session_prefix}{session_id}"
                session_data_str = redis_client.get(session_key)

                if session_data_str:
                    session_data = json.loads(session_data_str)
                    if session_data.get('active', False):
                        active_sessions.append({
                            'session_id': session_id,
                            'created_at': session_data.get('created_at'),
                            'last_activity': session_data.get('last_activity'),
                            'user_agent': session_data.get('user_agent', ''),
                            'ip_address': session_data.get('ip_address', 'unknown')
                        })
                else:
                    # 만료된 세션 ID는 사용자 목록에서 제거
                    redis_client.srem(user_sessions_key, session_id)

            return active_sessions

        except Exception as e:
            current_app.logger.error(f"활성 세션 조회 실패 (사용자 {user_id}): {e}")
            return []

    def cleanup_expired_sessions(self) -> int:
        """
        만료된 세션 정리

        Returns:
            정리된 세션 수
        """
        redis_client = self._get_redis_client()
        if not redis_client:
            return 0

        try:
            # 패턴 매칭으로 모든 세션 키 찾기
            session_keys = redis_client.keys(f"{self.session_prefix}*")
            expired_count = 0

            for session_key in session_keys:
                session_data_str = redis_client.get(session_key)
                if not session_data_str:
                    continue

                try:
                    session_data = json.loads(session_data_str)
                    last_activity = session_data.get('last_activity', 0)
                    current_time = int(time.time())

                    # 24시간 이상 비활성 세션 제거
                    if current_time - last_activity > 86400:
                        session_id = session_key.replace(self.session_prefix, '')
                        user_id = session_data.get('user_id')

                        # 세션 삭제
                        redis_client.delete(session_key)

                        # 사용자 세션 목록에서도 제거
                        if user_id:
                            user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
                            redis_client.srem(user_sessions_key, session_id)

                        expired_count += 1

                except json.JSONDecodeError:
                    # 잘못된 데이터는 삭제
                    redis_client.delete(session_key)
                    expired_count += 1

            if expired_count > 0:
                current_app.logger.info(f"만료된 세션 {expired_count}개 정리 완료")

            return expired_count

        except Exception as e:
            current_app.logger.error(f"세션 정리 실패: {e}")
            return 0


# 글로벌 세션 매니저 인스턴스
session_manager = SessionManager()