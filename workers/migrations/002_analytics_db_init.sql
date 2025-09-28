-- Analytics Database Migration 002: Analytics Schema Setup
-- SafeWork Analytics D1 Database for Statistics and Reports

-- Survey response analytics
CREATE TABLE IF NOT EXISTS survey_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    form_type TEXT NOT NULL,
    response_count INTEGER DEFAULT 0,
    completion_rate REAL DEFAULT 0.0,
    avg_completion_time INTEGER DEFAULT 0, -- seconds
    unique_users INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily statistics aggregation
CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE NOT NULL,
    total_responses INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    api_requests INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_response_time REAL DEFAULT 0.0, -- milliseconds
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Form performance metrics
CREATE TABLE IF NOT EXISTS form_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_type TEXT NOT NULL,
    field_name TEXT,
    abandonment_rate REAL DEFAULT 0.0,
    avg_time_spent REAL DEFAULT 0.0,
    error_frequency INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User engagement tracking
CREATE TABLE IF NOT EXISTS user_engagement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    pages_visited INTEGER DEFAULT 1,
    time_spent INTEGER DEFAULT 0, -- seconds
    bounce_rate REAL DEFAULT 0.0,
    conversion_event TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API performance metrics
CREATE TABLE IF NOT EXISTS api_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    response_time REAL NOT NULL, -- milliseconds
    status_code INTEGER NOT NULL,
    error_message TEXT,
    request_size INTEGER DEFAULT 0,
    response_size INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_survey_analytics_date ON survey_analytics(date);
CREATE INDEX IF NOT EXISTS idx_survey_analytics_form_type ON survey_analytics(form_type);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_form_metrics_form_type ON form_metrics(form_type);
CREATE INDEX IF NOT EXISTS idx_user_engagement_session ON user_engagement(session_id);
CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint ON api_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_metrics_timestamp ON api_metrics(timestamp);

-- Insert initial analytics configuration
INSERT OR IGNORE INTO daily_stats (date, total_responses, active_users) VALUES
(date('now'), 0, 0);