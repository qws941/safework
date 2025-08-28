-- SafeWork 데이터베이스 초기 설정 및 전체 스키마
USE safework_db;

-- 문자셋 설정
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ====== 핵심 테이블 생성 ======

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_users_username (username),
    KEY idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 설문조사 테이블
CREATE TABLE IF NOT EXISTS surveys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    form_type VARCHAR(50) NOT NULL,
    
    -- 기본 정보
    name VARCHAR(50),
    department VARCHAR(50),
    position VARCHAR(50),
    employee_id VARCHAR(20),
    gender VARCHAR(10),
    age INT,
    years_of_service INT,
    employment_type VARCHAR(20),
    
    -- 설문 응답 (JSON 형태로 저장)
    responses JSON,
    
    -- 추가 필드들
    work_area VARCHAR(100),
    work_hours_per_day INT,
    weekly_work_days INT,
    shift_type VARCHAR(20),
    physical_demand_level VARCHAR(20),
    job_satisfaction_score INT,
    stress_level VARCHAR(20),
    workplace_safety_rating INT,
    
    -- 메타데이터
    submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'submitted',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    KEY idx_surveys_user_id (user_id),
    KEY idx_surveys_submission_date (submission_date),
    KEY idx_surveys_department (department),
    KEY idx_surveys_status (status),
    KEY idx_surveys_form_type (form_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 설문조사 통계 테이블
CREATE TABLE IF NOT EXISTS survey_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    form_type VARCHAR(50) NOT NULL,
    department VARCHAR(50),
    
    -- 통계 데이터
    total_responses INT DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    average_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- JSON 형태로 세부 통계
    detailed_stats JSON,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_stat_date_type_dept (stat_date, form_type, department),
    KEY idx_survey_statistics_date (stat_date),
    KEY idx_survey_statistics_form_type (form_type),
    KEY idx_survey_statistics_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 감사 로그 테이블
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(50),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_audit_logs_user_id (user_id),
    KEY idx_audit_logs_created_at (created_at),
    KEY idx_audit_logs_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 마이그레이션 추적 테이블
CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(200) NOT NULL,
    filename VARCHAR(100) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    execution_time FLOAT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    KEY idx_migrations_version (version),
    KEY idx_migrations_executed_at (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====== 문서 관리 시스템 테이블 ======

-- 문서 카테고리 테이블
CREATE TABLE IF NOT EXISTS document_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES document_categories(id) ON DELETE SET NULL,
    KEY idx_doc_categories_parent_id (parent_id),
    KEY idx_doc_categories_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 문서 템플릿 테이블
CREATE TABLE IF NOT EXISTS document_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id INT,
    template_type VARCHAR(50) NOT NULL,
    template_content JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_doc_templates_category_id (category_id),
    KEY idx_doc_templates_type (template_type),
    KEY idx_doc_templates_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 문서 테이블
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INT,
    template_id INT,
    content JSON,
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    version_number INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft',
    tags JSON,
    metadata JSON,
    created_by INT,
    updated_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_documents_category_id (category_id),
    KEY idx_documents_template_id (template_id),
    KEY idx_documents_status (status),
    KEY idx_documents_created_by (created_by),
    KEY idx_documents_created_at (created_at),
    FULLTEXT KEY idx_documents_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 문서 버전 테이블
CREATE TABLE IF NOT EXISTS document_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    version_number INT NOT NULL,
    content JSON,
    file_path VARCHAR(500),
    file_size BIGINT,
    change_description TEXT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_doc_version (document_id, version_number),
    KEY idx_doc_versions_document_id (document_id),
    KEY idx_doc_versions_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 문서 접근 로그 테이블
CREATE TABLE IF NOT EXISTS document_access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_doc_access_logs_document_id (document_id),
    KEY idx_doc_access_logs_user_id (user_id),
    KEY idx_doc_access_logs_accessed_at (accessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====== 초기 데이터 삽입 ======

-- 부서 데이터
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- 시스템 설정 테이블
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
    ('system_version', '1.4.0', '시스템 버전'),
    ('maintenance_mode', 'false', '유지보수 모드'),
    ('max_upload_size', '10485760', '최대 업로드 크기 (바이트)'),
    ('session_timeout', '3600', '세션 타임아웃 (초)'),
    ('enable_notifications', 'true', '알림 활성화 여부'),
    ('default_language', 'ko', '기본 언어'),
    ('database_schema_version', '1.0', '데이터베이스 스키마 버전')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- 기본 문서 카테고리
INSERT INTO document_categories (name, description) VALUES
    ('안전관리', '산업안전 관련 문서'),
    ('근골격계질환', '근골격계 질환 예방 관련 문서'),
    ('건강검진', '건강검진 및 의료 관련 문서'),
    ('교육자료', '안전교육 및 연수 자료'),
    ('법규/규정', '관련 법규 및 사내 규정'),
    ('양식/서식', '각종 신청서 및 양식')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 마이그레이션 기록 (이미지 기반 스키마 생성으로 표시)
INSERT INTO migrations (version, description, filename, checksum, executed_at, execution_time, success, error_message) VALUES
    ('001', 'initial schema (image-based)', 'init.sql', 'image_based_schema', NOW(), 0, TRUE, NULL)
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- 성능 최적화를 위한 추가 인덱스
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- 분석을 위한 VIEW 생성
CREATE OR REPLACE VIEW survey_summary AS
SELECT 
    s.form_type,
    s.department,
    COUNT(*) as total_surveys,
    AVG(s.age) as avg_age,
    AVG(s.years_of_service) as avg_years_service,
    DATE(s.submission_date) as survey_date
FROM surveys s 
GROUP BY s.form_type, s.department, DATE(s.submission_date);

-- 외래키 제약조건 체크
SET foreign_key_checks = 1;

-- 초기화 완료 로그
SELECT 'SafeWork Database Schema Initialized Successfully' as status;