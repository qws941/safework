"""
Migration 006: Add Construction Master Tables
- Company (업체명 마스터)
- Process (공정명 마스터)  
- Role (직위/역할 마스터)
- Survey 테이블 필드 수정 (건설업 맞춤)
"""

from sqlalchemy import text


def upgrade():
    """마이그레이션 업그레이드"""
    with db.engine.begin() as conn:
        # 1. 업체명 마스터 테이블 생성
        conn.execute(
            text(
                """
            CREATE TABLE IF NOT EXISTS companies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT TRUE,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """
            )
        )

        # 2. 공정명 마스터 테이블 생성
        conn.execute(
            text(
                """
            CREATE TABLE IF NOT EXISTS processes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description VARCHAR(200),
                is_active BOOLEAN DEFAULT TRUE,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """
            )
        )

        # 3. 직위/역할 마스터 테이블 생성
        conn.execute(
            text(
                """
            CREATE TABLE IF NOT EXISTS roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(100) NOT NULL UNIQUE,
                description VARCHAR(200),
                is_active BOOLEAN DEFAULT TRUE,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """
            )
        )

        # 4. 기본 데이터 삽입 - 업체명
        conn.execute(
            text(
                """
            INSERT IGNORE INTO companies (name, display_order) VALUES
            ('미래도시건설', 1),
            ('직영팀', 2),
            ('포커스이엔씨', 3),
            ('골조팀', 4),
            ('티이엔', 5)
        """
            )
        )

        # 5. 기본 데이터 삽입 - 공정명
        conn.execute(
            text(
                """
            INSERT IGNORE INTO processes (name, description, display_order) VALUES
            ('철근', '철근 배근 및 결속 작업', 1),
            ('형틀목공', '콘크리트 거푸집 설치 작업', 2),
            ('콘크리트타설', '콘크리트 타설 및 다짐 작업', 3),
            ('비계', '비계 설치 및 해체 작업', 4),
            ('전기', '전기 배선 및 설비 작업', 5),
            ('배관', '급배수 및 설비 배관 작업', 6),
            ('방수', '방수 및 누수 방지 작업', 7),
            ('도장', '페인트 및 도장 작업', 8),
            ('미장', '미장 및 마감 작업', 9),
            ('석공', '석재 가공 및 설치 작업', 10),
            ('타일', '타일 시공 및 마감 작업', 11),
            ('토공', '토목 및 굴착 작업', 12),
            ('굴삭', '굴삭기 운용 및 굴착 작업', 13),
            ('크레인', '크레인 운용 및 양중 작업', 14),
            ('신호수', '크레인 및 장비 신호 작업', 15),
            ('용접', '용접 및 절단 작업', 16)
        """
            )
        )

        # 6. 기본 데이터 삽입 - 직위/역할
        conn.execute(
            text(
                """
            INSERT IGNORE INTO roles (title, description, display_order) VALUES
            ('관리자', '현장 관리 및 감독', 1),
            ('보통인부', '일반 건설 작업', 2),
            ('장비기사', '건설장비 운용', 3),
            ('신호수', '크레인 및 장비 신호', 4),
            ('용접공', '용접 및 절단 작업', 5),
            ('전기공', '전기 설비 작업', 6),
            ('배관공', '배관 설비 작업', 7),
            ('타워크레인운전원', '타워크레인 운용', 8),
            ('굴삭기기사', '굴삭기 운용', 9),
            ('안전관리자', '현장 안전 관리', 10),
            ('보건관리자', '근로자 보건 관리', 11)
        """
            )
        )

        # 7. Survey 테이블에 새 필드 추가
        # MySQL에서 컬럼 존재 여부 확인
        result = conn.execute(
            text(
                """
            SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'surveys' 
            AND COLUMN_NAME = 'company_id'
        """
            )
        ).fetchone()

        if result[0] == 0:  # 컬럼이 존재하지 않으면 추가
            conn.execute(
                text(
                    """
                ALTER TABLE surveys 
                ADD COLUMN company_id INT,
                ADD COLUMN process_id INT,
                ADD COLUMN role_id INT
            """
                )
            )

            # 외래키 제약조건 추가
            conn.execute(
                text(
                    """
                ALTER TABLE surveys 
                ADD CONSTRAINT fk_surveys_company 
                FOREIGN KEY (company_id) REFERENCES companies(id),
                ADD CONSTRAINT fk_surveys_process 
                FOREIGN KEY (process_id) REFERENCES processes(id),
                ADD CONSTRAINT fk_surveys_role 
                FOREIGN KEY (role_id) REFERENCES roles(id)
            """
                )
            )


def downgrade():
    """마이그레이션 롤백"""
    with db.engine.begin() as conn:
        # 외래키 제약조건 제거
        conn.execute(
            text("ALTER TABLE surveys DROP FOREIGN KEY IF EXISTS fk_surveys_company")
        )
        conn.execute(
            text("ALTER TABLE surveys DROP FOREIGN KEY IF EXISTS fk_surveys_process")
        )
        conn.execute(
            text("ALTER TABLE surveys DROP FOREIGN KEY IF EXISTS fk_surveys_role")
        )

        # Survey 테이블에서 새 필드 제거
        conn.execute(text("ALTER TABLE surveys DROP COLUMN IF EXISTS company_id"))
        conn.execute(text("ALTER TABLE surveys DROP COLUMN IF EXISTS process_id"))
        conn.execute(text("ALTER TABLE surveys DROP COLUMN IF EXISTS role_id"))

        # 마스터 테이블 제거
        conn.execute(text("DROP TABLE IF EXISTS roles"))
        conn.execute(text("DROP TABLE IF EXISTS processes"))
        conn.execute(text("DROP TABLE IF EXISTS companies"))
