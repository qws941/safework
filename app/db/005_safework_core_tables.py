"""
SafeWork Core Tables Migration - Phase 1
근로자 관리, 부서 관리, 건강검진 관리 핵심 테이블 생성
"""

def upgrade(db):
    """Create SafeWork core tables"""
    
    # ========================================
    # 1. 부서 정보 테이블
    # ========================================
    db.execute("""
        CREATE TABLE IF NOT EXISTS departments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            code VARCHAR(20) UNIQUE,
            name VARCHAR(100) NOT NULL,
            parent_id INT,
            manager_id INT,
            risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH') DEFAULT 'LOW',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_parent (parent_id),
            INDEX idx_risk (risk_level)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    
    # ========================================
    # 2. 근로자 기본정보 테이블
    # ========================================
    db.execute("""
        CREATE TABLE IF NOT EXISTS workers (
            id INT PRIMARY KEY AUTO_INCREMENT,
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_department (department_id),
            INDEX idx_special (is_special_management),
            INDEX idx_status (status),
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    
    # ========================================
    # 3. 건강검진 계획 테이블
    # ========================================
    db.execute("""
        CREATE TABLE IF NOT EXISTS health_check_plans (
            id INT PRIMARY KEY AUTO_INCREMENT,
            year INT NOT NULL,
            type ENUM('GENERAL', 'SPECIAL', 'PLACEMENT', 'RETURN') NOT NULL,
            planned_date DATE,
            target_count INT DEFAULT 0,
            completed_count INT DEFAULT 0,
            status ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'PLANNED',
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_year_type (year, type),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    
    # ========================================
    # 4. 건강검진 대상자 테이블
    # ========================================
    db.execute("""
        CREATE TABLE IF NOT EXISTS health_check_targets (
            id INT PRIMARY KEY AUTO_INCREMENT,
            plan_id INT NOT NULL,
            worker_id INT NOT NULL,
            scheduled_date DATE,
            actual_date DATE,
            hospital_name VARCHAR(200),
            status ENUM('SCHEDULED', 'NOTIFIED', 'COMPLETED', 'MISSED', 'EXEMPTED') DEFAULT 'SCHEDULED',
            notification_sent_at TIMESTAMP NULL,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (plan_id) REFERENCES health_check_plans(id) ON DELETE CASCADE,
            FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
            UNIQUE KEY unique_plan_worker (plan_id, worker_id),
            INDEX idx_status (status),
            INDEX idx_scheduled_date (scheduled_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    
    # ========================================
    # 5. 건강검진 결과 테이블
    # ========================================
    db.execute("""
        CREATE TABLE IF NOT EXISTS health_check_results (
            id INT PRIMARY KEY AUTO_INCREMENT,
            target_id INT NOT NULL,
            worker_id INT NOT NULL,
            check_date DATE NOT NULL,
            
            -- 신체 계측
            height DECIMAL(5,2),
            weight DECIMAL(5,2),
            bmi DECIMAL(4,2),
            waist DECIMAL(5,2),
            
            -- 혈압 및 맥박
            blood_pressure_sys INT,
            blood_pressure_dia INT,
            pulse_rate INT,
            
            -- 시력 및 청력
            vision_left DECIMAL(3,2),
            vision_right DECIMAL(3,2),
            hearing_left ENUM('NORMAL', 'ABNORMAL'),
            hearing_right ENUM('NORMAL', 'ABNORMAL'),
            
            -- 검사 결과
            chest_xray VARCHAR(100),
            ecg VARCHAR(100),
            blood_test JSON,
            urine_test JSON,
            special_tests JSON,
            
            -- 판정
            overall_opinion TEXT,
            grade ENUM('A', 'B', 'C', 'D1', 'D2', 'R') NOT NULL,
            follow_up_required BOOLEAN DEFAULT FALSE,
            follow_up_items TEXT,
            work_restriction VARCHAR(200),
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (target_id) REFERENCES health_check_targets(id) ON DELETE CASCADE,
            FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
            INDEX idx_grade (grade),
            INDEX idx_follow_up (follow_up_required),
            INDEX idx_check_date (check_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    
    # ========================================
    # 6. 의무실 방문 기록 테이블
    # ========================================
    db.execute("""
        CREATE TABLE IF NOT EXISTS medical_visits (
            id INT PRIMARY KEY AUTO_INCREMENT,
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
            FOREIGN KEY (nurse_id) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_visit_date (visit_date),
            INDEX idx_worker (worker_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    
    # ========================================
    # 7. 의약품 관리 테이블
    # ========================================
    db.execute("""
        CREATE TABLE IF NOT EXISTS medications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(200) NOT NULL,
            category VARCHAR(100),
            unit VARCHAR(50),
            current_stock INT DEFAULT 0,
            minimum_stock INT DEFAULT 0,
            expiry_date DATE,
            supplier VARCHAR(200),
            last_purchase_date DATE,
            price_per_unit DECIMAL(10,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_expiry (expiry_date),
            INDEX idx_stock (current_stock),
            INDEX idx_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    
    # ========================================
    # 초기 데이터 삽입
    # ========================================
    
    # 기본 부서 생성
    db.execute("""
        INSERT INTO departments (code, name, risk_level) VALUES 
        ('HQ', '본사', 'LOW'),
        ('PROD', '생산부', 'HIGH'),
        ('QC', '품질관리부', 'MEDIUM'),
        ('RND', '연구개발부', 'MEDIUM'),
        ('ADMIN', '경영지원부', 'LOW')
        ON DUPLICATE KEY UPDATE name=VALUES(name)
    """)
    
    # 테스트용 근로자 데이터
    db.execute("""
        INSERT INTO workers (employee_number, name, department_id, position, hire_date, gender, blood_type) VALUES 
        ('2024001', '김철수', 1, '과장', '2020-03-01', 'M', 'A+'),
        ('2024002', '이영희', 2, '사원', '2022-07-15', 'F', 'B+'),
        ('2024003', '박민수', 2, '대리', '2019-11-20', 'M', 'O+')
        ON DUPLICATE KEY UPDATE name=VALUES(name)
    """)
    
    print("✅ SafeWork core tables created successfully")

def downgrade(db):
    """Drop SafeWork core tables"""
    tables = [
        'medical_visits',
        'medications',
        'health_check_results',
        'health_check_targets', 
        'health_check_plans',
        'workers',
        'departments'
    ]
    
    for table in tables:
        db.execute(f"DROP TABLE IF EXISTS {table}")
    
    print("✅ SafeWork core tables dropped successfully")

# 마이그레이션 메타데이터
metadata = {
    'version': '005',
    'description': 'SafeWork Core Tables - Phase 1',
    'author': 'SafeWork Team',
    'created_at': '2024-01-28'
}