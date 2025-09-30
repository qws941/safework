-- SafeWork D1 Database Schema
-- Cloudflare D1 Native Implementation
-- Migration from PostgreSQL to D1 SQLite

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- Core Tables
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_companies_active ON companies(is_active);

-- Processes table
CREATE TABLE IF NOT EXISTS processes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_processes_active ON processes(is_active);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_roles_active ON roles(is_active);

-- ============================================
-- Survey Tables
-- ============================================

-- Surveys table (main survey data)
CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    form_type TEXT NOT NULL,

    -- Basic information
    name TEXT,
    department TEXT,
    position TEXT,
    employee_id TEXT,
    gender TEXT,
    age INTEGER,
    years_of_service INTEGER,
    employee_number TEXT,

    -- Work information
    work_years INTEGER,
    work_months INTEGER,
    has_symptoms INTEGER DEFAULT 0,

    -- Metadata
    status TEXT DEFAULT 'submitted',

    -- JSON data fields
    responses TEXT,  -- JSON string
    data TEXT,  -- JSON string
    symptoms_data TEXT,  -- JSON string

    -- Relationships
    company_id INTEGER,
    process_id INTEGER,
    role_id INTEGER,

    -- Timestamps
    submission_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (process_id) REFERENCES processes(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX idx_surveys_user_id ON surveys(user_id);
CREATE INDEX idx_surveys_form_type ON surveys(form_type);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_surveys_submission_date ON surveys(submission_date);
CREATE INDEX idx_surveys_company_id ON surveys(company_id);
CREATE INDEX idx_surveys_process_id ON surveys(process_id);
CREATE INDEX idx_surveys_has_symptoms ON surveys(has_symptoms);

-- Survey statistics table
CREATE TABLE IF NOT EXISTS survey_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stat_date TEXT NOT NULL UNIQUE,
    total_submissions INTEGER DEFAULT 0,

    -- Body part symptom counts
    neck_count INTEGER DEFAULT 0,
    shoulder_count INTEGER DEFAULT 0,
    arm_count INTEGER DEFAULT 0,
    hand_count INTEGER DEFAULT 0,
    waist_count INTEGER DEFAULT 0,
    leg_count INTEGER DEFAULT 0,

    -- Severity statistics
    severe_count INTEGER DEFAULT 0,
    very_severe_count INTEGER DEFAULT 0,

    -- JSON data
    department_stats TEXT,  -- JSON string
    age_group_stats TEXT,  -- JSON string

    -- Medical treatment count
    medical_treatment_count INTEGER DEFAULT 0,

    -- Form 002 specific fields
    height_cm REAL,
    weight_kg REAL,
    blood_type TEXT,
    existing_conditions TEXT,  -- JSON string
    medication_history TEXT,
    allergy_history TEXT,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_survey_statistics_date ON survey_statistics(stat_date);

-- ============================================
-- Audit and Logging Tables
-- ============================================

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,  -- JSON string
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- Initial Data
-- ============================================

-- Insert anonymous user (user_id = 1)
INSERT OR IGNORE INTO users (id, username, email, password_hash, is_admin, is_active)
VALUES (1, 'anonymous', 'anonymous@safework.local', 'disabled', 0, 1);

-- Insert default admin user
INSERT OR IGNORE INTO users (username, email, password_hash, is_admin, is_active)
VALUES ('admin', 'admin@safework.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5oDWCKxG.gNqy', 1, 1);
-- Default password: safework2024

-- Insert default companies
INSERT OR IGNORE INTO companies (name, display_order) VALUES
    ('본사', 1),
    ('제1공장', 2),
    ('제2공장', 3),
    ('물류센터', 4);

-- Insert default processes
INSERT OR IGNORE INTO processes (name, description, display_order) VALUES
    ('조립', '부품 조립 작업', 1),
    ('용접', '용접 작업', 2),
    ('도장', '도장 작업', 3),
    ('검사', '품질 검사', 4),
    ('포장', '제품 포장', 5),
    ('운반', '자재 운반', 6);

-- Insert default roles
INSERT OR IGNORE INTO roles (title, description, display_order) VALUES
    ('작업자', '일반 작업자', 1),
    ('반장', '작업 반장', 2),
    ('조장', '조 책임자', 3),
    ('관리자', '현장 관리자', 4),
    ('안전관리자', '안전 관리 책임자', 5);