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

-- 설문조사 테이블 (001, 002 폼 모든 실제 필드 포함)
CREATE TABLE IF NOT EXISTS surveys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    form_type VARCHAR(50) NOT NULL,
    
    -- 기본 정보 (공통)
    name VARCHAR(50),
    department VARCHAR(50),
    position VARCHAR(50),
    employee_id VARCHAR(20),
    gender VARCHAR(10),
    age INT,
    years_of_service INT,
    employment_type VARCHAR(20),
    
    -- 002 폼 전용 필드들
    employee_number VARCHAR(50), -- 사번 (002)
    hire_date DATE, -- 입사예정일 (002)
    height_cm DECIMAL(5,1), -- 신장 (002)
    weight_kg DECIMAL(5,1), -- 체중 (002)
    blood_type VARCHAR(10), -- 혈액형 (002)
    vision_left DECIMAL(3,1), -- 좌측 시력 (002)
    vision_right DECIMAL(3,1), -- 우측 시력 (002)
    hearing_left VARCHAR(20), -- 좌측 청력 (002)
    hearing_right VARCHAR(20), -- 우측 청력 (002)
    blood_pressure VARCHAR(20), -- 혈압 (002)
    existing_conditions TEXT, -- 기존 질환 (002)
    medication_history TEXT, -- 복용약물 이력 (002)
    allergy_history TEXT, -- 알레르기 이력 (002)
    surgery_history TEXT, -- 수술 이력 (002)
    family_history TEXT, -- 가족력 (002)
    smoking_status VARCHAR(20), -- 흡연 상태 (002)
    smoking_amount VARCHAR(50), -- 흡연량 (002)
    drinking_status VARCHAR(20), -- 음주 상태 (002)
    drinking_amount VARCHAR(50), -- 음주량 (002)
    exercise_habits TEXT, -- 운동 습관 (002)
    sleep_hours VARCHAR(20), -- 수면시간 (002)
    physical_limitations TEXT, -- 신체적 제약사항 (002)
    emergency_contact VARCHAR(100), -- 비상연락처 (002)
    special_considerations TEXT, -- 특별 고려사항 (002)
    
    -- 001 폼 및 기타 필드들
    work_area VARCHAR(100),
    work_hours_per_day INT,
    weekly_work_days INT,
    shift_type VARCHAR(20),
    physical_demand_level VARCHAR(20),
    job_satisfaction_score INT,
    stress_level VARCHAR(20),
    workplace_safety_rating INT,
    
    -- 설문 응답 (JSON 형태로 추가 데이터 저장)
    responses JSON,
    
    -- 추가 증상 데이터 (통증 빈도, 시기, 특성 등)
    symptoms_data JSON COMMENT '추가 증상 데이터 (통증 빈도, 시기, 특성 등)',
    
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
    KEY idx_surveys_form_type (form_type),
    KEY idx_surveys_employee_number (employee_number),
    KEY idx_surveys_hire_date (hire_date)
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

-- ========================================
-- Phase 1: 산업안전보건 핵심 테이블
-- ========================================

-- 부서 정보 테이블 (확장)
CREATE TABLE IF NOT EXISTS departments_extended (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id INT,
    manager_id INT,
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH') DEFAULT 'LOW',
    location VARCHAR(200),
    employee_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent (parent_id),
    INDEX idx_risk (risk_level),
    INDEX idx_manager (manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 근로자 상세 정보 테이블
CREATE TABLE IF NOT EXISTS workers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department_id INT,
    position VARCHAR(100),
    hire_date DATE,
    birth_date DATE,
    gender ENUM('M', 'F'),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    blood_type VARCHAR(5),
    is_special_management BOOLEAN DEFAULT FALSE,
    special_management_reason TEXT,
    status ENUM('ACTIVE', 'LEAVE', 'RETIRED') DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_department (department_id),
    INDEX idx_special (is_special_management),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 건강검진 계획
CREATE TABLE IF NOT EXISTS health_check_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT NOT NULL,
    type ENUM('GENERAL', 'SPECIAL', 'PLACEMENT', 'RETURN') NOT NULL,
    planned_date DATE,
    target_count INT DEFAULT 0,
    completed_count INT DEFAULT 0,
    status ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'PLANNED',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_year_type (year, type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 건강검진 대상자
CREATE TABLE IF NOT EXISTS health_check_targets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    worker_id INT NOT NULL,
    scheduled_date DATE,
    actual_date DATE,
    hospital_name VARCHAR(200),
    status ENUM('SCHEDULED', 'NOTIFIED', 'COMPLETED', 'MISSED', 'EXEMPTED') DEFAULT 'SCHEDULED',
    notification_sent_at DATETIME,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES health_check_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_plan_worker (plan_id, worker_id),
    INDEX idx_status (status),
    INDEX idx_scheduled_date (scheduled_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 건강검진 결과
CREATE TABLE IF NOT EXISTS health_check_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    target_id INT NOT NULL,
    worker_id INT NOT NULL,
    check_date DATE NOT NULL,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    bmi DECIMAL(4,2),
    waist DECIMAL(5,2),
    blood_pressure_sys INT,
    blood_pressure_dia INT,
    pulse_rate INT,
    vision_left DECIMAL(3,2),
    vision_right DECIMAL(3,2),
    hearing_left ENUM('NORMAL', 'ABNORMAL'),
    hearing_right ENUM('NORMAL', 'ABNORMAL'),
    chest_xray VARCHAR(100),
    ecg VARCHAR(100),
    blood_test JSON,
    urine_test JSON,
    special_tests JSON,
    overall_opinion TEXT,
    grade ENUM('A', 'B', 'C', 'D1', 'D2', 'R') NOT NULL,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_items TEXT,
    work_restriction VARCHAR(200),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (target_id) REFERENCES health_check_targets(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    INDEX idx_grade (grade),
    INDEX idx_follow_up (follow_up_required),
    INDEX idx_check_date (check_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 의무실 방문 기록
CREATE TABLE IF NOT EXISTS medical_visits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    visit_date DATETIME NOT NULL,
    chief_complaint TEXT,
    vital_signs JSON,
    diagnosis TEXT,
    treatment TEXT,
    medication_given TEXT,
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    nurse_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (nurse_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_visit_date (visit_date),
    INDEX idx_worker (worker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 의약품 관리
CREATE TABLE IF NOT EXISTS medications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50),
    current_stock INT DEFAULT 0,
    minimum_stock INT DEFAULT 0,
    expiry_date DATE,
    supplier VARCHAR(200),
    last_purchase_date DATE,
    price_per_unit DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_expiry (expiry_date),
    INDEX idx_stock (current_stock),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 작업환경측정 계획
CREATE TABLE IF NOT EXISTS environment_measurement_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT NOT NULL,
    semester INT NOT NULL,
    measurement_agency VARCHAR(200),
    planned_date DATE,
    status ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'PLANNED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_year_sem (year, semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 작업환경측정 결과
CREATE TABLE IF NOT EXISTS environment_measurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT,
    department_id INT,
    measurement_date DATE,
    factor_type ENUM('DUST', 'NOISE', 'CHEMICAL', 'ILLUMINATION', 'TEMPERATURE'),
    factor_name VARCHAR(200),
    measurement_value DECIMAL(10,4),
    unit VARCHAR(50),
    exposure_limit DECIMAL(10,4),
    result ENUM('SUITABLE', 'EXCEEDED', 'ACTION_REQUIRED'),
    improvement_measures TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES environment_measurement_plans(id),
    INDEX idx_result (result),
    INDEX idx_factor (factor_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 초기 데이터 삽입
INSERT IGNORE INTO departments_extended (code, name, risk_level) VALUES 
('HQ', '본사', 'LOW'),
('PROD', '생산부', 'HIGH'),
('QC', '품질관리부', 'MEDIUM'),
('RND', '연구개발부', 'MEDIUM'),
('ADMIN', '경영지원부', 'LOW');

-- 외래키 제약조건 체크
SET foreign_key_checks = 1;

-- ========================================
-- Phase 2: SafeWork v2.0 전용 테이블
-- ========================================

-- SafeWork 근로자 정보 (v2.0 모델과 호환)
CREATE TABLE IF NOT EXISTS safework_workers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    birth_date DATE,
    gender VARCHAR(10),
    phone VARCHAR(50),
    email VARCHAR(100),
    emergency_contact VARCHAR(50),
    emergency_relationship VARCHAR(50),
    address TEXT,
    hire_date DATE,
    blood_type VARCHAR(10),
    medical_conditions TEXT,
    allergies TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_number (employee_number),
    INDEX idx_department (department),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SafeWork 건강검진 기록 (v2.0 모델과 호환)
CREATE TABLE IF NOT EXISTS safework_health_checks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    check_type VARCHAR(50),
    check_date DATE NOT NULL,
    hospital VARCHAR(200),
    result VARCHAR(50),
    blood_pressure VARCHAR(20),
    blood_sugar VARCHAR(20),
    cholesterol VARCHAR(20),
    bmi FLOAT,
    vision_left VARCHAR(10),
    vision_right VARCHAR(10),
    hearing_left VARCHAR(10),
    hearing_right VARCHAR(10),
    chest_xray VARCHAR(100),
    findings TEXT,
    recommendations TEXT,
    next_check_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES safework_workers(id) ON DELETE CASCADE,
    INDEX idx_worker_id (worker_id),
    INDEX idx_check_date (check_date),
    INDEX idx_check_type (check_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SafeWork 의무실 방문 기록 (v2.0 모델과 호환)
CREATE TABLE IF NOT EXISTS safework_medical_visits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    visit_date DATETIME NOT NULL,
    chief_complaint TEXT,
    blood_pressure VARCHAR(20),
    heart_rate INT,
    body_temp FLOAT,
    resp_rate INT,
    diagnosis TEXT,
    treatment TEXT,
    medication_given TEXT,
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    nurse_name VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES safework_workers(id) ON DELETE CASCADE,
    INDEX idx_worker_id (worker_id),
    INDEX idx_visit_date (visit_date),
    INDEX idx_follow_up (follow_up_needed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SafeWork 의약품 재고 관리 (v2.0 모델과 호환)
CREATE TABLE IF NOT EXISTS safework_medications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50),
    current_stock INT DEFAULT 0,
    minimum_stock INT DEFAULT 0,
    expiry_date DATE,
    supplier VARCHAR(200),
    price_per_unit FLOAT,
    last_purchase_date DATE,
    location VARCHAR(200),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_current_stock (current_stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SafeWork 의약품 사용 기록 (v2.0 모델과 호환)
CREATE TABLE IF NOT EXISTS safework_medication_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medication_id INT NOT NULL,
    worker_id INT,
    action_type VARCHAR(50),
    quantity INT NOT NULL,
    reason TEXT,
    performed_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medication_id) REFERENCES safework_medications(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES safework_workers(id) ON DELETE SET NULL,
    INDEX idx_medication_id (medication_id),
    INDEX idx_worker_id (worker_id),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SafeWork 건강검진 계획 (v2.0 모델과 호환)
CREATE TABLE IF NOT EXISTS safework_health_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT NOT NULL,
    plan_type VARCHAR(50),
    department VARCHAR(100),
    target_month INT,
    target_count INT,
    completed_count INT DEFAULT 0,
    hospital VARCHAR(200),
    budget FLOAT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_year (year),
    INDEX idx_plan_type (plan_type),
    INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테스트용 SafeWork 데이터 삽입
INSERT IGNORE INTO safework_workers (employee_number, name, department, position, hire_date, gender, blood_type, phone, email) VALUES 
('SW001', '김안전', '생산1팀', '팀장', '2020-01-15', 'M', 'A+', '010-1234-5678', 'safety.kim@company.com'),
('SW002', '이보건', '생산2팀', '대리', '2021-03-20', 'F', 'B+', '010-2345-6789', 'health.lee@company.com'),
('SW003', '박건강', '품질관리팀', '사원', '2022-06-10', 'M', 'O+', '010-3456-7890', 'healthy.park@company.com'),
('SW004', '최예방', '물류팀', '주임', '2023-02-01', 'F', 'AB+', '010-4567-8901', 'prevent.choi@company.com'),
('SW005', '정관리', '사무직', '과장', '2019-11-05', 'M', 'A-', '010-5678-9012', 'manage.jung@company.com');

INSERT IGNORE INTO safework_medications (name, category, unit, current_stock, minimum_stock, supplier, location) VALUES 
('타이레놀정', '해열진통제', '정', 100, 20, '한국제약', '의무실 캐비넷 A'),
('후시딘연고', '항생제', '튜브', 15, 5, '동아제약', '의무실 냉장고'),
('게보린정', '해열진통제', '정', 80, 15, '삼진제약', '의무실 캐비넷 A'),
('포비돈', '소독제', 'ml', 500, 100, '일동제약', '의무실 선반'),
('밴드', '의료용품', '개', 200, 50, '3M', '의무실 서랍');

-- 초기화 완료 로그
SELECT 'SafeWork Database Schema v2.0 Initialized Successfully' as status;