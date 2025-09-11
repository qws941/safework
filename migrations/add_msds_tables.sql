-- MSDS Management System Database Migration
-- Created: 2025-09-11
-- Description: Add MSDS (Material Safety Data Sheet) management tables

-- MSDS Master Table
CREATE TABLE IF NOT EXISTS msds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    substance_name VARCHAR(200) NOT NULL COMMENT '화학물질명',
    cas_number VARCHAR(50) COMMENT 'CAS 번호',
    manufacturer VARCHAR(200) COMMENT '제조업체',
    supplier VARCHAR(200) COMMENT '공급업체',
    
    -- MSDS Document Information
    msds_number VARCHAR(100) COMMENT 'MSDS 문서번호',
    revision_date DATE COMMENT '개정일자',
    
    -- Classification Information
    hazard_classification JSON COMMENT '유해성 분류',
    ghs_pictograms JSON COMMENT 'GHS 그림문자',
    signal_word VARCHAR(50) COMMENT '신호어 (위험/경고)',
    
    -- Special Management Material
    is_special_management BOOLEAN DEFAULT FALSE COMMENT '특별관리물질 여부',
    special_management_type VARCHAR(100) COMMENT '특별관리 유형',
    
    -- Document Attachments
    msds_file_path VARCHAR(500) COMMENT 'MSDS 파일 경로',
    msds_image_path VARCHAR(500) COMMENT 'MSDS 이미지 경로',
    ocr_extracted_text TEXT COMMENT 'OCR 추출 텍스트',
    
    -- Metadata
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '등록일자',
    last_review_date DATETIME COMMENT '최종 검토일',
    next_review_date DATETIME COMMENT '차기 검토일',
    status VARCHAR(20) DEFAULT 'active' COMMENT '상태 (active/inactive/expired)',
    notes TEXT COMMENT '비고',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_substance_name (substance_name),
    INDEX idx_cas_number (cas_number),
    INDEX idx_special_management (is_special_management),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MSDS 마스터 테이블';

-- MSDS Chemical Components Table
CREATE TABLE IF NOT EXISTS msds_components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    msds_id INT NOT NULL,
    
    component_name VARCHAR(200) NOT NULL COMMENT '성분명',
    cas_number VARCHAR(50) COMMENT 'CAS 번호',
    concentration_min DECIMAL(5,2) COMMENT '최소 농도 (%)',
    concentration_max DECIMAL(5,2) COMMENT '최대 농도 (%)',
    concentration_exact DECIMAL(5,2) COMMENT '정확한 농도 (%)',
    
    -- Hazard Information
    hazard_statements JSON COMMENT '유해문구',
    precautionary_statements JSON COMMENT '예방조치문구',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (msds_id) REFERENCES msds(id) ON DELETE CASCADE,
    INDEX idx_msds_id (msds_id),
    INDEX idx_component_name (component_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MSDS 화학성분 테이블';

-- MSDS Usage Records Table
CREATE TABLE IF NOT EXISTS msds_usage_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    msds_id INT NOT NULL,
    user_id INT,
    
    usage_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '사용일시',
    workplace_area VARCHAR(100) COMMENT '사용 작업장',
    usage_purpose VARCHAR(200) COMMENT '사용 목적',
    quantity_used DECIMAL(10,2) COMMENT '사용량',
    quantity_unit VARCHAR(20) COMMENT '단위 (kg, L, etc.)',
    
    -- Safety Measures
    ppe_used JSON COMMENT '사용한 보호구',
    safety_measures TEXT COMMENT '안전조치사항',
    
    notes TEXT COMMENT '비고',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (msds_id) REFERENCES msds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_msds_id (msds_id),
    INDEX idx_usage_date (usage_date),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MSDS 사용기록 테이블';

-- Insert sample MSDS data for testing
INSERT INTO msds (substance_name, cas_number, manufacturer, supplier, signal_word, is_special_management, special_management_type, notes) VALUES
('아세톤', '67-64-1', '한국화학', '안전화학공급', '위험', FALSE, NULL, '일반적인 유기용제로 널리 사용'),
('톨루엔', '108-88-3', '대한케미칼', '화학자재유통', '위험', TRUE, '특별관리대상물질', '중추신경계 영향 가능'),
('메탄올', '67-56-1', '메탄올코리아', '산업화학', '위험', TRUE, '특별관리대상물질', '실명 위험이 있는 독성물질'),
('에틸렌글리콜', '107-21-1', '글리콜산업', '화학유통센터', '경고', FALSE, NULL, '부동액 및 냉각제 성분'),
('벤젠', '71-43-2', '석유화학', '위험물질공급', '위험', TRUE, '발암성물질', '백혈병 유발 가능성');

-- Insert sample components
INSERT INTO msds_components (msds_id, component_name, cas_number, concentration_exact) VALUES
(1, '아세톤', '67-64-1', 99.5),
(1, '물', '7732-18-5', 0.5),
(2, '톨루엔', '108-88-3', 98.0),
(2, '기타 방향족 화합물', NULL, 2.0),
(3, '메탄올', '67-56-1', 99.8),
(3, '메틸 이소부틸 케톤', '108-10-1', 0.2);

-- Insert sample usage records
INSERT INTO msds_usage_records (msds_id, user_id, workplace_area, usage_purpose, quantity_used, quantity_unit, safety_measures, notes) VALUES
(1, 1, '실험실 A동', '실험용 용매', 0.5, 'L', '후드 내에서 사용, 보호장갑 착용', '정상적으로 사용 완료'),
(2, 1, '생산부 1라인', '세척 작업', 2.0, 'L', '방독마스크 착용, 통풍 양호한 곳에서 사용', '작업 후 용기 밀폐 보관'),
(3, 1, '품질관리실', '분석용 표준물질', 0.1, 'L', '드래프트챔버 내 사용, 보안경 착용', '소량 사용으로 안전하게 처리');