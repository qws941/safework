"""
SafeWork Flask-SocketIO 설정 및 초기화
실시간 알림 시스템을 위한 웹소켓 구성
"""

from flask_socketio import SocketIO
from routes.notification_system import init_socketio_events, run_periodic_notifications
import threading
import time

# Socket.IO 인스턴스
socketio = None


def init_socketio(app):
    """Socket.IO 초기화"""
    global socketio

    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        logger=True,
        engineio_logger=True,
        async_mode="threading",
    )

    # 알림 시스템 이벤트 핸들러 초기화
    init_socketio_events(socketio)

    # 백그라운드 알림 체크 스레드 시작
    start_notification_scheduler()

    return socketio


def start_notification_scheduler():
    """백그라운드 알림 스케줄러 시작"""

    def notification_scheduler():
        while True:
            try:
                if socketio:
                    run_periodic_notifications(socketio)
                time.sleep(300)  # 5분마다 실행
            except Exception as e:
                print(f"알림 스케줄러 오류: {e}")
                time.sleep(60)  # 오류 발생 시 1분 후 재시도

    # 데몬 스레드로 시작 (메인 프로세스 종료 시 함께 종료)
    scheduler_thread = threading.Thread(target=notification_scheduler, daemon=True)
    scheduler_thread.start()
    print("✅ SafeWork 알림 스케줄러가 시작되었습니다.")


def get_socketio():
    """Socket.IO 인스턴스 반환"""
    return socketio
