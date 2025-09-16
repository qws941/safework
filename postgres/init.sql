-- SafeWork PostgreSQL Initialization Script
-- Industrial Health & Safety Management System Database Schema

-- Set timezone to Seoul
SET timezone = 'Asia/Seoul';

-- Create database if not exists (already handled by POSTGRES_DB env var)
-- CREATE DATABASE IF NOT EXISTS safework_db;

-- Use UTF8 encoding for Korean text support
SET client_encoding = 'UTF8';

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create core tables for SafeWork system

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Surveys table for 001/002 form data
CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    form_type VARCHAR(10) NOT NULL, -- '001' or '002'
    name VARCHAR(100) NOT NULL,
    age INTEGER,
    gender VARCHAR(10),
    years_of_service INTEGER,
    employee_number VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    employee_id VARCHAR(50),
    work_years INTEGER,
    work_months INTEGER,
    has_symptoms BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'submitted',
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data JSONB, -- Flexible JSON storage for form data
    responses JSONB, -- Additional responses data
    symptoms_data JSONB, -- Symptoms specific data
    company_id INTEGER,
    process_id INTEGER,
    role_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs for system activity tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document management tables
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    category VARCHAR(100),
    tags TEXT[],
    access_level VARCHAR(20) DEFAULT 'public', -- public, private, admin
    upload_user_id INTEGER REFERENCES users(id),
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    change_description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_access_logs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    access_type VARCHAR(20) NOT NULL, -- view, download
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SafeWork management tables
CREATE TABLE IF NOT EXISTS safework_workers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    employee_number VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    birth_date DATE,
    gender VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    health_status VARCHAR(20) DEFAULT 'normal',
    special_management BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS safework_health_checks (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES safework_workers(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    check_type VARCHAR(50) NOT NULL, -- general, special, pre_employment
    results JSONB,
    recommendations TEXT,
    next_check_date DATE,
    doctor_name VARCHAR(100),
    medical_institution VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS safework_medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    manufacturer VARCHAR(200),
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 10,
    unit VARCHAR(20),
    expiry_date DATE,
    location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_surveys_form_type ON surveys(form_type);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at);
CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_access_level ON documents(access_level);
CREATE INDEX IF NOT EXISTS idx_safework_workers_employee_number ON safework_workers(employee_number);
CREATE INDEX IF NOT EXISTS idx_safework_workers_department ON safework_workers(department);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safework_workers_updated_at BEFORE UPDATE ON safework_workers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safework_medications_updated_at BEFORE UPDATE ON safework_medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user
INSERT INTO users (username, email, password_hash, is_admin) 
VALUES ('admin', 'admin@safework.com', 'pbkdf2:sha256:260000$OxB8gF7IfMDe9Jvx$8f6d7a5b9c2e1f4g3h6i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Insert anonymous user for form submissions
INSERT INTO users (id, username, email, password_hash, is_admin) 
VALUES (1, 'anonymous', 'anonymous@safework.com', 'no-password', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Create sample categories for documents
INSERT INTO documents (title, description, filename, file_path, category, access_level, upload_user_id)
VALUES 
    ('Safety Guidelines', 'General safety guidelines for construction workers', 'safety_guidelines.pdf', '/documents/safety_guidelines.pdf', 'Safety', 'public', 1),
    ('Health Form Templates', 'Templates for health checkup forms', 'health_templates.zip', '/documents/health_templates.zip', 'Templates', 'public', 1)
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO safework;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO safework;

-- Set default search path
ALTER DATABASE safework_db SET search_path TO public;

-- Add comments for documentation
COMMENT ON TABLE surveys IS 'Stores health survey data for both 001 (musculoskeletal) and 002 (new employee) forms';
COMMENT ON TABLE safework_workers IS 'Master data for all workers in the SafeWork system';
COMMENT ON TABLE documents IS 'Document management system for safety and health related files';
COMMENT ON COLUMN surveys.data IS 'Flexible JSON storage for form-specific data';
COMMENT ON COLUMN surveys.form_type IS 'Form type identifier: 001 for musculoskeletal, 002 for new employee';

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'SafeWork PostgreSQL database initialized successfully at %', CURRENT_TIMESTAMP;
END $$;