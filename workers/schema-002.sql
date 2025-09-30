-- SafeWork 002 Form: 근골격계질환 증상조사표 (완전판)
-- D1 Database Schema

CREATE TABLE IF NOT EXISTS surveys_002 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    form_version TEXT NOT NULL,

    -- 기본 정보 (6 fields)
    number INTEGER,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    work_experience INTEGER,
    married TEXT,

    -- 작업 정보 (13 fields)
    department TEXT,
    line TEXT,
    work_type TEXT,
    work_content TEXT,
    work_period TEXT,
    current_work_period INTEGER,
    daily_work_hours INTEGER,
    rest_time INTEGER,
    previous_work_content TEXT,
    previous_work_period INTEGER,
    leisure_activity TEXT,
    household_work TEXT,
    medical_diagnosis TEXT,
    physical_burden TEXT,

    -- 목 부위 통증 평가 (6 fields)
    neck_pain_exists TEXT,           -- 목_1: 통증 여부
    neck_pain_duration TEXT,         -- 목_2: 통증 기간
    neck_pain_intensity TEXT,        -- 목_3: 통증 강도
    neck_pain_frequency TEXT,        -- 목_4: 통증 빈도
    neck_pain_worsening TEXT,        -- 목_5: 증상 심화
    neck_pain_other TEXT,            -- 목_6: 기타

    -- 어깨 부위 통증 평가 (6 fields)
    shoulder_pain_exists TEXT,       -- 어깨_1
    shoulder_pain_duration TEXT,     -- 어깨_2
    shoulder_pain_intensity TEXT,    -- 어깨_3
    shoulder_pain_frequency TEXT,    -- 어깨_4
    shoulder_pain_worsening TEXT,    -- 어깨_5
    shoulder_pain_other TEXT,        -- 어깨_6

    -- 팔꿈치 부위 통증 평가 (6 fields)
    elbow_pain_exists TEXT,          -- 팔꿈치_1
    elbow_pain_duration TEXT,        -- 팔꿈치_2
    elbow_pain_intensity TEXT,       -- 팔꿈치_3
    elbow_pain_frequency TEXT,       -- 팔꿈치_4
    elbow_pain_worsening TEXT,       -- 팔꿈치_5
    elbow_pain_other TEXT,           -- 팔꿈치_6

    -- 손목 부위 통증 평가 (6 fields)
    wrist_pain_exists TEXT,          -- 손목_1
    wrist_pain_duration TEXT,        -- 손목_2
    wrist_pain_intensity TEXT,       -- 손목_3
    wrist_pain_frequency TEXT,       -- 손목_4
    wrist_pain_worsening TEXT,       -- 손목_5
    wrist_pain_other TEXT,           -- 손목_6

    -- 허리 부위 통증 평가 (6 fields)
    back_pain_exists TEXT,           -- 허리_1
    back_pain_duration TEXT,         -- 허리_2
    back_pain_intensity TEXT,        -- 허리_3
    back_pain_frequency TEXT,        -- 허리_4
    back_pain_worsening TEXT,        -- 허리_5
    back_pain_other TEXT,            -- 허리_6

    -- 다리 부위 통증 평가 (6 fields)
    leg_pain_exists TEXT,            -- 다리_1
    leg_pain_duration TEXT,          -- 다리_2
    leg_pain_intensity TEXT,         -- 다리_3
    leg_pain_frequency TEXT,         -- 다리_4
    leg_pain_worsening TEXT,         -- 다리_5
    leg_pain_other TEXT,             -- 다리_6

    -- JSON 전체 응답 (백업용)
    responses JSON,

    -- 메타 정보
    user_agent TEXT,
    cf_ray TEXT,
    country TEXT,
    colo TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_002_submission_id ON surveys_002(submission_id);
CREATE INDEX IF NOT EXISTS idx_002-submitted_at ON surveys_002(submitted_at);
CREATE INDEX IF NOT EXISTS idx_002_name ON surveys_002(name);
CREATE INDEX IF NOT EXISTS idx_002_department ON surveys_002(department);
CREATE INDEX IF NOT EXISTS idx_002_form_version ON surveys_002(form_version);