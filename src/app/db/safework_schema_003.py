"""SafeWork 안전보건관리 시스템 테이블 생성"""

from datetime import datetime


def get_migration():
    return {
        "version": "003",
        "description": "SafeWork 안전보건관리 시스템 테이블 추가",
        "up": """
            -- 근로자 정보 테이블
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_employee_number (employee_number),
                INDEX idx_department (department)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- 건강검진 기록 테이블
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (worker_id) REFERENCES safework_workers(id) ON DELETE CASCADE,
                INDEX idx_worker_check (worker_id, check_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- 의무실 방문 기록 테이블
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (worker_id) REFERENCES safework_workers(id) ON DELETE CASCADE,
                INDEX idx_visit_date (visit_date),
                INDEX idx_worker_visit (worker_id, visit_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- 의약품 재고 관리 테이블
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_category (category),
                INDEX idx_expiry (expiry_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- 의약품 사용 기록 테이블
            CREATE TABLE IF NOT EXISTS safework_medication_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                medication_id INT NOT NULL,
                worker_id INT,
                action_type VARCHAR(50),
                quantity INT NOT NULL,
                reason TEXT,
                performed_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (medication_id) REFERENCES safework_medications(id) ON DELETE CASCADE,
                FOREIGN KEY (worker_id) REFERENCES safework_workers(id) ON DELETE SET NULL,
                INDEX idx_medication_log (medication_id, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- 건강검진 계획 테이블
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_year_type (year, plan_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- 샘플 데이터 삽입
            INSERT INTO safework_workers (employee_number, name, department, position, gender, phone, email, hire_date, blood_type, is_active)
            VALUES 
            ('2024001', '김영수', '생산부', '팀장', '남', '010-1234-5678', 'kim.ys@safework.com', '2020-03-15', 'A+', TRUE),
            ('2024002', '이미영', '품질관리부', '대리', '여', '010-2345-6789', 'lee.my@safework.com', '2021-06-20', 'B+', TRUE),
            ('2024003', '박철수', '생산부', '사원', '남', '010-3456-7890', 'park.cs@safework.com', '2023-01-10', 'O+', TRUE);

            INSERT INTO safework_medications (name, category, unit, current_stock, minimum_stock, expiry_date, supplier)
            VALUES 
            ('타이레놀 500mg', '진통제', '정', 100, 50, '2025-12-31', '한국약품'),
            ('후시딘 연고', '연고', '개', 20, 10, '2025-06-30', '대한의약'),
            ('밴드 (대)', '밴드', '개', 200, 100, '2026-12-31', '메디컬서플라이');
        """,
        "down": """
            DROP TABLE IF EXISTS safework_medication_logs;
            DROP TABLE IF EXISTS safework_medications;
            DROP TABLE IF EXISTS safework_medical_visits;
            DROP TABLE IF EXISTS safework_health_checks;
            DROP TABLE IF EXISTS safework_health_plans;
            DROP TABLE IF EXISTS safework_workers;
        """,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
