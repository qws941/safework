"""Migration: Database Performance Optimization

Created: 2025-01-15 12:10:00 UTC
Version: 003

This migration adds additional indexes and constraints for better performance.
"""

from app.models import db


def upgrade():
    """Apply the migration - Add performance optimizations"""
    
    # JSON 필드 인덱싱 (PostgreSQL 전용, SQLite에서는 무시됨)
    try:
        # PostgreSQL GIN 인덱스 (JSON 필드 최적화)
        db.engine.execute("""
            CREATE INDEX IF NOT EXISTS idx_surveys_neck_data_gin 
            ON surveys USING gin (neck_data);
        """)
        
        db.engine.execute("""
            CREATE INDEX IF NOT EXISTS idx_surveys_shoulder_data_gin 
            ON surveys USING gin (shoulder_data);
        """)
        
        db.engine.execute("""
            CREATE INDEX IF NOT EXISTS idx_surveys_hand_data_gin 
            ON surveys USING gin (hand_data);
        """)
        
        print("✅ Created GIN indexes for JSON fields (PostgreSQL)")
        
    except Exception as e:
        print(f"ℹ️  GIN indexes not supported (likely SQLite): {e}")
    
    # 복합 인덱스 생성
    try:
        db.engine.execute("""
            CREATE INDEX IF NOT EXISTS idx_surveys_dept_date 
            ON surveys(department, submission_date);
        """)
        
        db.engine.execute("""
            CREATE INDEX IF NOT EXISTS idx_surveys_status_date 
            ON surveys(status, submission_date);
        """)
        
        db.engine.execute("""
            CREATE INDEX IF NOT EXISTS idx_surveys_user_date 
            ON surveys(user_id, submission_date);
        """)
        
        print("✅ Created composite indexes for common queries")
        
    except Exception as e:
        print(f"⚠️  Could not create some composite indexes: {e}")
    
    # 제약조건 추가
    try:
        # 나이 제약조건
        db.engine.execute("""
            ALTER TABLE surveys ADD CONSTRAINT check_age 
            CHECK (age >= 18 AND age <= 100);
        """)
        
        # 근무시간 제약조건  
        db.engine.execute("""
            ALTER TABLE surveys ADD CONSTRAINT check_work_hours 
            CHECK (work_hours_per_day >= 1 AND work_hours_per_day <= 24);
        """)
        
        print("✅ Added data validation constraints")
        
    except Exception as e:
        print(f"ℹ️  Constraints not added (may already exist or not supported): {e}")


def downgrade():
    """Rollback the migration - Remove performance optimizations"""
    
    # Drop GIN indexes
    try:
        db.engine.execute("DROP INDEX IF EXISTS idx_surveys_neck_data_gin;")
        db.engine.execute("DROP INDEX IF EXISTS idx_surveys_shoulder_data_gin;")
        db.engine.execute("DROP INDEX IF EXISTS idx_surveys_hand_data_gin;")
        print("✅ Dropped GIN indexes")
    except Exception as e:
        print(f"ℹ️  Could not drop GIN indexes: {e}")
    
    # Drop composite indexes
    try:
        db.engine.execute("DROP INDEX IF EXISTS idx_surveys_dept_date;")
        db.engine.execute("DROP INDEX IF EXISTS idx_surveys_status_date;")
        db.engine.execute("DROP INDEX IF EXISTS idx_surveys_user_date;")
        print("✅ Dropped composite indexes")
    except Exception as e:
        print(f"ℹ️  Could not drop composite indexes: {e}")
    
    # Drop constraints
    try:
        db.engine.execute("ALTER TABLE surveys DROP CONSTRAINT IF EXISTS check_age;")
        db.engine.execute("ALTER TABLE surveys DROP CONSTRAINT IF EXISTS check_work_hours;")
        print("✅ Dropped data validation constraints")
    except Exception as e:
        print(f"ℹ️  Could not drop constraints: {e}")