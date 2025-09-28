-- Primary Database Migration 001: Primary Schema Setup
-- SafeWork Primary D1 Database for Core Application Data

-- Create basic user session tracking for edge cache
CREATE TABLE IF NOT EXISTS edge_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    form_access_count INTEGER DEFAULT 0,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create survey response cache for edge processing
CREATE TABLE IF NOT EXISTS edge_survey_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,
    form_type TEXT NOT NULL,
    response_data TEXT NOT NULL, -- JSON string
    sync_status TEXT DEFAULT 'pending', -- pending, synced, error
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME,
    expires_at DATETIME
);

-- Create form structure cache for fast access
CREATE TABLE IF NOT EXISTS edge_form_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_type TEXT UNIQUE NOT NULL,
    structure_data TEXT NOT NULL, -- JSON string
    version INTEGER DEFAULT 1,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);

-- Create API rate limiting table
CREATE TABLE IF NOT EXISTS edge_rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL, -- IP or session_id
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    blocked_until DATETIME
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_edge_sessions_session_id ON edge_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_edge_survey_cache_form_type ON edge_survey_cache(form_type);
CREATE INDEX IF NOT EXISTS idx_edge_survey_cache_sync_status ON edge_survey_cache(sync_status);
CREATE INDEX IF NOT EXISTS idx_edge_form_cache_form_type ON edge_form_cache(form_type);
CREATE INDEX IF NOT EXISTS idx_edge_rate_limits_identifier ON edge_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_edge_rate_limits_window_start ON edge_rate_limits(window_start);

-- Insert default form structures
INSERT OR IGNORE INTO edge_form_cache (form_type, structure_data) VALUES
('001_musculoskeletal_symptom_survey', '{"title": "근골격계 증상 설문조사", "sections": 4, "fields": 20, "estimated_time": "5-10분"}'),
('002_musculoskeletal_symptom_program', '{"title": "근골격계 부담작업 유해요인조사", "sections": 8, "fields": 50, "estimated_time": "15-20분"}');