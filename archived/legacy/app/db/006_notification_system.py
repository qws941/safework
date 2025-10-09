"""
SafeWork 실시간 알림 시스템 테이블 생성
- 알림 테이블 추가
- 알림 설정 테이블 추가
- 기존 의약품 테이블에 자동 재주문 필드 추가
"""

from datetime import datetime


def upgrade(connection):
    """마이그레이션 실행"""
    cursor = connection.cursor()

    try:
        # SafeWork 알림 테이블 생성
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS safework_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                notification_type VARCHAR(50) NOT NULL COMMENT '알림 유형 (medication_low_stock, health_check_reminder, etc.)',
                title VARCHAR(200) NOT NULL COMMENT '알림 제목',
                message TEXT NOT NULL COMMENT '알림 내용',
                priority VARCHAR(20) DEFAULT 'medium' COMMENT '우선순위 (high, medium, low)',
                is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
                read_at DATETIME NULL COMMENT '읽은 시간',
                data TEXT NULL COMMENT 'JSON 형태의 추가 데이터',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_user_notifications (user_id, created_at DESC),
                INDEX idx_unread_notifications (user_id, is_read, created_at DESC),
                INDEX idx_notification_type (notification_type),
                INDEX idx_priority (priority)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            COMMENT='SafeWork 알림 테이블'
        """
        )

        # 알림 설정 테이블 생성
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS safework_notification_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE NOT NULL,
                email_enabled BOOLEAN DEFAULT TRUE COMMENT '이메일 알림 사용',
                browser_enabled BOOLEAN DEFAULT TRUE COMMENT '브라우저 알림 사용',
                medication_alerts BOOLEAN DEFAULT TRUE COMMENT '의약품 알림 사용',
                visit_reminders BOOLEAN DEFAULT TRUE COMMENT '방문 일정 알림 사용',
                health_check_reminders BOOLEAN DEFAULT TRUE COMMENT '건강검진 알림 사용',
                alert_threshold_days INT DEFAULT 7 COMMENT '사전 알림 일수',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                UNIQUE KEY unique_user_settings (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            COMMENT='SafeWork 알림 설정 테이블'
        """
        )

        # 의약품 테이블에 자동 재주문 필드 추가
        cursor.execute(
            """
            ALTER TABLE safework_medications 
            ADD COLUMN IF NOT EXISTS auto_reorder_enabled BOOLEAN DEFAULT FALSE COMMENT '자동 재주문 사용',
            ADD COLUMN IF NOT EXISTS reorder_point INT NULL COMMENT '재주문 시점 재고량',
            ADD COLUMN IF NOT EXISTS reorder_quantity INT NULL COMMENT '재주문 수량',
            ADD COLUMN IF NOT EXISTS preferred_supplier VARCHAR(200) NULL COMMENT '선호 공급업체'
        """
        )

        # 알림 관련 인덱스 추가
        cursor.execute(
            """
            ALTER TABLE safework_medications
            ADD INDEX IF NOT EXISTS idx_stock_alerts (current_stock, minimum_stock, is_active),
            ADD INDEX IF NOT EXISTS idx_expiry_alerts (expiry_date, is_active, current_stock),
            ADD INDEX IF NOT EXISTS idx_auto_reorder (auto_reorder_enabled, reorder_point)
        """
        )

        # 건강검진 테이블에 알림 관련 인덱스 추가
        cursor.execute(
            """
            ALTER TABLE safework_health_checks
            ADD INDEX IF NOT EXISTS idx_next_check_date (next_check_date, worker_id)
        """
        )

        # 기본 알림 설정 데이터 삽입 (관리자용)
        cursor.execute(
            """
            INSERT IGNORE INTO safework_notification_settings 
            (user_id, email_enabled, browser_enabled, medication_alerts, visit_reminders, health_check_reminders)
            SELECT id, TRUE, TRUE, TRUE, TRUE, TRUE 
            FROM users 
            WHERE role = 'admin'
        """
        )

        connection.commit()
        print("✅ SafeWork 실시간 알림 시스템 테이블이 성공적으로 생성되었습니다.")
        return True

    except Exception as e:
        connection.rollback()
        print(f"❌ 마이그레이션 실행 중 오류 발생: {e}")
        return False
    finally:
        cursor.close()


def downgrade(connection):
    """마이그레이션 롤백"""
    cursor = connection.cursor()

    try:
        # 추가된 필드 제거
        cursor.execute(
            """
            ALTER TABLE safework_medications 
            DROP COLUMN IF EXISTS auto_reorder_enabled,
            DROP COLUMN IF EXISTS reorder_point,
            DROP COLUMN IF EXISTS reorder_quantity,
            DROP COLUMN IF EXISTS preferred_supplier
        """
        )

        # 알림 테이블 삭제
        cursor.execute("DROP TABLE IF EXISTS safework_notifications")
        cursor.execute("DROP TABLE IF EXISTS safework_notification_settings")

        connection.commit()
        print("✅ SafeWork 실시간 알림 시스템 테이블이 성공적으로 제거되었습니다.")
        return True

    except Exception as e:
        connection.rollback()
        print(f"❌ 롤백 실행 중 오류 발생: {e}")
        return False
    finally:
        cursor.close()


# 마이그레이션 정보
MIGRATION_INFO = {
    "version": "006",
    "description": "SafeWork 실시간 알림 시스템",
    "author": "SafeWork System",
    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
}
