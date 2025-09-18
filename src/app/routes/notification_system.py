"""
SafeWork 실시간 알림 시스템
- 재고 부족 알림
- 유효기간 임박 알림  
- 의무실 방문 알림
- 건강검진 일정 알림
"""

from flask import Blueprint, render_template, request, jsonify, session
from flask_login import login_required, current_user
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime, timedelta, date
from sqlalchemy import text
from app import db
from app.models_safework_v2 import *
import json

notification_bp = Blueprint('notification', __name__, url_prefix='/notifications')

# SocketIO 이벤트 핸들러들 (app.py에서 socketio 인스턴스와 연결됨)

def init_socketio_events(socketio):
    """SocketIO 이벤트 핸들러 초기화"""
    
    @socketio.on('connect')
    def handle_connect():
        """클라이언트 연결 처리"""
        if current_user.is_authenticated:
            join_room(f'user_{current_user.id}')
            join_room('admin_notifications')
            emit('status', {'msg': f'{current_user.username} 알림 시스템에 연결되었습니다.'})
            
            # 연결 시 미확인 알림 전송
            unread_notifications = get_unread_notifications()
            if unread_notifications:
                emit('unread_notifications', unread_notifications)
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """클라이언트 연결 해제 처리"""
        if current_user.is_authenticated:
            leave_room(f'user_{current_user.id}')
            leave_room('admin_notifications')
    
    @socketio.on('mark_notification_read')
    def handle_mark_read(data):
        """알림 읽음 처리"""
        notification_id = data.get('notification_id')
        if notification_id:
            mark_notification_read(notification_id)
            emit('notification_marked_read', {'notification_id': notification_id})


# 알림 관련 API 엔드포인트들

@notification_bp.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    """사용자별 알림 목록 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        unread_only = request.args.get('unread_only', False, type=bool)
        
        query = SafeworkNotification.query.filter_by(user_id=current_user.id)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        notifications = query.order_by(SafeworkNotification.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'notifications': [{
                'id': n.id,
                'type': n.notification_type,
                'title': n.title,
                'message': n.message,
                'priority': n.priority,
                'is_read': n.is_read,
                'created_at': n.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'data': json.loads(n.data) if n.data else None
            } for n in notifications.items],
            'pagination': {
                'page': notifications.page,
                'pages': notifications.pages,
                'per_page': notifications.per_page,
                'total': notifications.total,
                'has_next': notifications.has_next,
                'has_prev': notifications.has_prev
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@notification_bp.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
@login_required
def mark_notification_read_api(notification_id):
    """알림 읽음 처리 API"""
    try:
        notification = SafeworkNotification.query.filter_by(
            id=notification_id, user_id=current_user.id
        ).first_or_404()
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True, 'message': '알림이 읽음 처리되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@notification_bp.route('/api/notifications/mark-all-read', methods=['POST'])
@login_required
def mark_all_notifications_read():
    """모든 알림 읽음 처리"""
    try:
        SafeworkNotification.query.filter_by(
            user_id=current_user.id, is_read=False
        ).update({
            'is_read': True,
            'read_at': datetime.utcnow()
        })
        db.session.commit()
        
        return jsonify({'success': True, 'message': '모든 알림이 읽음 처리되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@notification_bp.route('/api/notifications/settings', methods=['GET', 'POST'])
@login_required
def notification_settings():
    """알림 설정 관리"""
    if request.method == 'GET':
        try:
            settings = SafeworkNotificationSettings.query.filter_by(
                user_id=current_user.id
            ).first()
            
            if not settings:
                settings = SafeworkNotificationSettings(
                    user_id=current_user.id,
                    email_enabled=True,
                    browser_enabled=True,
                    medication_alerts=True,
                    visit_reminders=True,
                    health_check_reminders=True
                )
                db.session.add(settings)
                db.session.commit()
            
            return jsonify({
                'success': True,
                'settings': {
                    'email_enabled': settings.email_enabled,
                    'browser_enabled': settings.browser_enabled,
                    'medication_alerts': settings.medication_alerts,
                    'visit_reminders': settings.visit_reminders,
                    'health_check_reminders': settings.health_check_reminders,
                    'alert_threshold_days': settings.alert_threshold_days
                }
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            settings = SafeworkNotificationSettings.query.filter_by(
                user_id=current_user.id
            ).first()
            
            if not settings:
                settings = SafeworkNotificationSettings(user_id=current_user.id)
                db.session.add(settings)
            
            settings.email_enabled = data.get('email_enabled', settings.email_enabled)
            settings.browser_enabled = data.get('browser_enabled', settings.browser_enabled)
            settings.medication_alerts = data.get('medication_alerts', settings.medication_alerts)
            settings.visit_reminders = data.get('visit_reminders', settings.visit_reminders)
            settings.health_check_reminders = data.get('health_check_reminders', settings.health_check_reminders)
            settings.alert_threshold_days = data.get('alert_threshold_days', settings.alert_threshold_days)
            
            db.session.commit()
            
            return jsonify({'success': True, 'message': '알림 설정이 업데이트되었습니다.'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500


# 알림 생성 및 전송 함수들

def create_notification(user_id, notification_type, title, message, priority='medium', data=None):
    """알림 생성"""
    try:
        notification = SafeworkNotification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            data=json.dumps(data) if data else None
        )
        db.session.add(notification)
        db.session.commit()
        return notification
    except Exception as e:
        db.session.rollback()
        print(f"Error creating notification: {e}")
        return None


def send_realtime_notification(user_id, notification_data, socketio):
    """실시간 알림 전송"""
    try:
        socketio.emit('new_notification', notification_data, room=f'user_{user_id}')
        socketio.emit('new_notification', notification_data, room='admin_notifications')
    except Exception as e:
        print(f"Error sending realtime notification: {e}")


def get_unread_notifications():
    """미확인 알림 조회"""
    try:
        notifications = SafeworkNotification.query.filter_by(
            user_id=current_user.id, is_read=False
        ).order_by(SafeworkNotification.created_at.desc()).limit(10).all()
        
        return [{
            'id': n.id,
            'type': n.notification_type,
            'title': n.title,
            'message': n.message,
            'priority': n.priority,
            'created_at': n.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'data': json.loads(n.data) if n.data else None
        } for n in notifications]
    except Exception as e:
        print(f"Error getting unread notifications: {e}")
        return []


def mark_notification_read(notification_id):
    """알림 읽음 처리"""
    try:
        notification = SafeworkNotification.query.filter_by(
            id=notification_id, user_id=current_user.id
        ).first()
        
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error marking notification as read: {e}")


# 자동 알림 체크 함수들

def check_medication_alerts(socketio):
    """의약품 관련 알림 체크"""
    try:
        # 재고 부족 의약품
        low_stock_medications = db.session.execute(text("""
            SELECT id, name, current_stock, minimum_stock
            FROM safework_medications 
            WHERE current_stock <= minimum_stock AND is_active = 1
        """)).fetchall()
        
        for med in low_stock_medications:
            # 관리자들에게 알림
            admin_users = db.session.execute(text("""
                SELECT id FROM users WHERE role = 'admin'
            """)).fetchall()
            
            for admin in admin_users:
                notification = create_notification(
                    user_id=admin.id,
                    notification_type='medication_low_stock',
                    title='의약품 재고 부족',
                    message=f'{med.name} 재고가 부족합니다. (현재: {med.current_stock}, 최소: {med.minimum_stock})',
                    priority='high',
                    data={'medication_id': med.id, 'current_stock': med.current_stock}
                )
                
                if notification:
                    send_realtime_notification(admin.id, {
                        'id': notification.id,
                        'type': 'medication_low_stock',
                        'title': notification.title,
                        'message': notification.message,
                        'priority': 'high'
                    }, socketio)
        
        # 유효기간 임박 의약품
        expiring_medications = db.session.execute(text("""
            SELECT id, name, expiry_date, current_stock,
                   DATEDIFF(expiry_date, CURDATE()) as days_until_expiry
            FROM safework_medications 
            WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            AND current_stock > 0 AND is_active = 1
        """)).fetchall()
        
        for med in expiring_medications:
            admin_users = db.session.execute(text("""
                SELECT id FROM users WHERE role = 'admin'
            """)).fetchall()
            
            for admin in admin_users:
                notification = create_notification(
                    user_id=admin.id,
                    notification_type='medication_expiring',
                    title='의약품 유효기간 임박',
                    message=f'{med.name}의 유효기간이 {med.days_until_expiry}일 후 만료됩니다.',
                    priority='medium',
                    data={'medication_id': med.id, 'days_until_expiry': med.days_until_expiry}
                )
                
                if notification:
                    send_realtime_notification(admin.id, {
                        'id': notification.id,
                        'type': 'medication_expiring',
                        'title': notification.title,
                        'message': notification.message,
                        'priority': 'medium'
                    }, socketio)
                    
    except Exception as e:
        print(f"Error checking medication alerts: {e}")


def check_health_check_reminders(socketio):
    """건강검진 일정 알림 체크"""
    try:
        # 다음 건강검진이 임박한 근로자들
        upcoming_checks = db.session.execute(text("""
            SELECT w.id as worker_id, w.name, w.user_id, hc.next_check_date,
                   DATEDIFF(hc.next_check_date, CURDATE()) as days_until_check
            FROM safework_workers w
            LEFT JOIN safework_health_checks hc ON w.id = hc.worker_id
            WHERE hc.next_check_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
            AND w.is_active = 1
            ORDER BY hc.next_check_date ASC
        """)).fetchall()
        
        for check in upcoming_checks:
            # 해당 근로자와 관리자에게 알림
            users_to_notify = [check.user_id] if check.user_id else []
            
            # 관리자들도 추가
            admin_users = db.session.execute(text("""
                SELECT id FROM users WHERE role = 'admin'
            """)).fetchall()
            users_to_notify.extend([admin.id for admin in admin_users])
            
            for user_id in set(users_to_notify):
                message = f'{check.name}님의 건강검진이 {check.days_until_check}일 후 예정되어 있습니다.'
                
                notification = create_notification(
                    user_id=user_id,
                    notification_type='health_check_reminder',
                    title='건강검진 일정 알림',
                    message=message,
                    priority='medium',
                    data={'worker_id': check.worker_id, 'check_date': str(check.next_check_date)}
                )
                
                if notification:
                    send_realtime_notification(user_id, {
                        'id': notification.id,
                        'type': 'health_check_reminder',
                        'title': notification.title,
                        'message': notification.message,
                        'priority': 'medium'
                    }, socketio)
                    
    except Exception as e:
        print(f"Error checking health check reminders: {e}")


def run_periodic_notifications(socketio):
    """주기적 알림 체크 실행"""
    check_medication_alerts(socketio)
    check_health_check_reminders(socketio)