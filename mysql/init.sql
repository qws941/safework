-- SafeWork 데이터베이스 초기 설정
USE safework_db;

-- 문자셋 설정
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 초기 부서 데이터 (선택사항)
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 부서 데이터 삽입
INSERT INTO departments (name) VALUES 
    ('생산1팀'),
    ('생산2팀'),
    ('품질관리팀'),
    ('물류팀'),
    ('사무직'),
    ('연구개발팀'),
    ('설비관리팀'),
    ('환경안전팀')
ON DUPLICATE KEY UPDATE name=name;

-- 시스템 설정 테이블 (선택사항)
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(500),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 시스템 설정
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('system_version', '1.3.1', '시스템 버전'),
    ('maintenance_mode', 'false', '유지보수 모드'),
    ('max_upload_size', '10485760', '최대 업로드 크기 (바이트)'),
    ('session_timeout', '3600', '세션 타임아웃 (초)'),
    ('enable_notifications', 'true', '알림 활성화 여부'),
    ('default_language', 'ko', '기본 언어')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- 성능 최적화를 위한 추가 인덱스
-- (migrations에서 생성되지 않은 경우를 대비)
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);