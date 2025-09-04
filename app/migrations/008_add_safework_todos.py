"""
Migration 008: Add SafeWork Todo Management Table
- SafeWork 프로젝트 Todo 관리를 위한 safework_todos 테이블 생성
- GitHub 이슈 연동 및 진행 상태 추적 기능
"""

from datetime import datetime

def upgrade(db):
    """Create safework_todos table for todo management"""
    
    # SafeWork Todo 관리 테이블 생성
    db.execute("""
        CREATE TABLE IF NOT EXISTS safework_todos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL COMMENT '제목',
            description TEXT COMMENT '설명',
            priority VARCHAR(20) DEFAULT 'Normal' COMMENT '우선순위 (High, Normal, Low)',
            status VARCHAR(20) DEFAULT 'Pending' COMMENT '상태 (Pending, In Progress, Completed, Cancelled)',
            category VARCHAR(50) COMMENT '카테고리 (Development, Testing, Deployment, Documentation)',
            assigned_to VARCHAR(100) COMMENT '담당자',
            due_date DATE COMMENT '마감일',
            completed_date DATETIME COMMENT '완료일',
            progress INT DEFAULT 0 COMMENT '진행률 (0-100)',
            labels VARCHAR(500) COMMENT '태그 (콤마 구분)',
            github_issue VARCHAR(20) COMMENT 'GitHub 이슈 번호',
            estimated_hours FLOAT COMMENT '예상 작업 시간',
            actual_hours FLOAT COMMENT '실제 작업 시간',
            notes TEXT COMMENT '추가 노트',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
            
            INDEX idx_status (status),
            INDEX idx_priority (priority),
            INDEX idx_category (category),
            INDEX idx_assigned_to (assigned_to),
            INDEX idx_due_date (due_date),
            INDEX idx_github_issue (github_issue),
            INDEX idx_created_at (created_at)
        ) COMMENT='SafeWork 프로젝트 Todo 관리'
    """)
    
    # 기본 샘플 데이터 추가
    db.execute("""
        INSERT INTO safework_todos (title, description, priority, status, category, github_issue, progress) VALUES
        ('📋 Todo 리스트 관리 대시보드 구현', 'SafeWork 프로젝트의 Todo 관리를 위한 대시보드 시스템 구축', 'High', 'In Progress', 'Development', '16', 80),
        ('🏗️ 건설업 맞춤 기본정보 폼 리디자인', '업체/공정/직위 필드 추가 및 건설업 특화 폼 개발', 'High', 'In Progress', 'Development', '5', 60),
        ('🔧 데이터베이스 마이그레이션 시스템 점검', '기존 마이그레이션의 안정성 검토 및 최적화', 'Normal', 'Pending', 'Development', NULL, 0),
        ('📝 API 문서화 업데이트', 'SafeWork API v2 문서화 및 사용 가이드 작성', 'Normal', 'Pending', 'Documentation', NULL, 0),
        ('🧪 단위 테스트 커버리지 확대', 'SafeWork 모든 모듈의 테스트 커버리지 80% 달성', 'Normal', 'Pending', 'Testing', NULL, 0)
    """)
    
    print("✅ Migration 008 completed: SafeWork Todo management table created")


def downgrade(db):
    """Drop safework_todos table"""
    db.execute("DROP TABLE IF EXISTS safework_todos")
    print("✅ Migration 008 downgrade completed: SafeWork Todo table removed")