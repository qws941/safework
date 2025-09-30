-- SafeWork 001 근골격계 증상조사표 스키마
CREATE TABLE IF NOT EXISTS surveys_001 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    form_version TEXT NOT NULL,
    
    -- 기본 정보
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    company TEXT,
    company_custom TEXT,
    process TEXT,
    process_custom TEXT,
    role TEXT,
    role_custom TEXT,
    position TEXT,
    work_years INTEGER,
    work_months INTEGER,
    marriage_status TEXT,
    
    -- 작업 정보
    current_work_details TEXT,
    current_work_years INTEGER,
    current_work_months INTEGER,
    work_hours_per_day INTEGER,
    break_time_minutes INTEGER,
    break_frequency INTEGER,
    
    -- 이전 작업
    previous_work_details TEXT,
    previous_work_years INTEGER,
    previous_work_months INTEGER,
    
    -- 여가 활동 (JSON)
    hobbies TEXT,
    
    -- 가사노동
    housework_hours TEXT,
    
    -- 진단 받은 질병
    diagnosed TEXT,
    diagnosed_details TEXT,
    
    -- 전체 응답 데이터 (JSON)
    responses JSON,
    
    -- 메타데이터
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    cf_ray TEXT,
    country TEXT,
    colo TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_submission_id ON surveys_001(submission_id);
CREATE INDEX IF NOT EXISTS idx_submitted_at ON surveys_001(submitted_at);
CREATE INDEX IF NOT EXISTS idx_name ON surveys_001(name);
