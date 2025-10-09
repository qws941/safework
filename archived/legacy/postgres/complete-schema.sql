-- SafeWork Complete Database Schema
-- Industrial Health & Safety Management System - Full Schema Definition
-- This file contains ALL database schemas for Docker image-level initialization

-- ========================================
-- CORE SYSTEM CONFIGURATION
-- ========================================

-- Set timezone to Seoul
SET timezone = 'Asia/Seoul';
SET client_encoding = 'UTF8';

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ========================================
-- CORE AUTHENTICATION & USER MANAGEMENT
-- ========================================

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

-- ========================================
-- SURVEY SYSTEM (Forms 001, 002, 003)
-- ========================================

-- Surveys table for all form data
CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    form_type VARCHAR(10) NOT NULL, -- '001', '002', '003'
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

-- ========================================
-- AUDIT & LOGGING SYSTEM
-- ========================================

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

-- ========================================
-- DOCUMENT MANAGEMENT SYSTEM
-- ========================================

-- Documents table
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

-- Document versions
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

-- Document access logs
CREATE TABLE IF NOT EXISTS document_access_logs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    access_type VARCHAR(20) NOT NULL, -- view, download
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- SAFEWORK CORE MANAGEMENT TABLES
-- ========================================

-- Departments (Extended)
CREATE TABLE IF NOT EXISTS departments_extended (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES departments_extended(id),
    manager_id INTEGER,
    risk_level VARCHAR(20) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
    location VARCHAR(200),
    employee_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workers (Extended)
CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department_id INTEGER REFERENCES departments_extended(id),
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
    risk_factors TEXT[],
    work_location VARCHAR(200),
    supervisor_id INTEGER REFERENCES workers(id),
    employment_type VARCHAR(20) DEFAULT 'regular',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Health Check Plans
CREATE TABLE IF NOT EXISTS health_check_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    target_departments TEXT[],
    target_positions TEXT[],
    check_items JSONB,
    frequency_months INTEGER DEFAULT 12,
    required_tests TEXT[],
    special_requirements TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Health Check Targets
CREATE TABLE IF NOT EXISTS health_check_targets (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES health_check_plans(id),
    scheduled_date DATE NOT NULL,
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Health Check Results
CREATE TABLE IF NOT EXISTS health_check_results (
    id SERIAL PRIMARY KEY,
    target_id INTEGER REFERENCES health_check_targets(id),
    worker_id INTEGER REFERENCES workers(id),
    check_date DATE NOT NULL,
    check_type VARCHAR(50) NOT NULL,
    medical_institution VARCHAR(200),
    doctor_name VARCHAR(100),
    results JSONB,
    recommendations TEXT,
    restrictions TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    next_check_date DATE,
    overall_grade VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Medical Visits
CREATE TABLE IF NOT EXISTS medical_visits (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    visit_type VARCHAR(50) NOT NULL,
    symptoms TEXT,
    diagnosis TEXT,
    treatment TEXT,
    medication_prescribed TEXT,
    work_restriction BOOLEAN DEFAULT FALSE,
    restriction_details TEXT,
    return_to_work_date DATE,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    medical_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Medications Inventory
CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    manufacturer VARCHAR(200),
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 10,
    maximum_stock INTEGER DEFAULT 100,
    unit VARCHAR(20),
    unit_cost DECIMAL(10,2),
    expiry_date DATE,
    batch_number VARCHAR(100),
    storage_location VARCHAR(100),
    storage_conditions TEXT,
    prescription_required BOOLEAN DEFAULT FALSE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Environment Measurement Plans
CREATE TABLE IF NOT EXISTS environment_measurement_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    measurement_type VARCHAR(100) NOT NULL,
    target_locations TEXT[],
    parameters JSONB,
    frequency_days INTEGER DEFAULT 30,
    regulatory_basis VARCHAR(200),
    action_levels JSONB,
    responsible_person VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Environment Measurements
CREATE TABLE IF NOT EXISTS environment_measurements (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES environment_measurement_plans(id),
    measurement_date DATE NOT NULL,
    location VARCHAR(200),
    weather_conditions VARCHAR(100),
    equipment_used VARCHAR(200),
    measured_by VARCHAR(100),
    results JSONB,
    compliance_status VARCHAR(20),
    action_required BOOLEAN DEFAULT FALSE,
    action_taken TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MSDS (Material Safety Data Sheets)
CREATE TABLE IF NOT EXISTS safework_msds (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    manufacturer VARCHAR(200),
    cas_number VARCHAR(50),
    product_code VARCHAR(100),
    hazard_classification TEXT[],
    safety_measures TEXT,
    first_aid_measures TEXT,
    storage_requirements TEXT,
    disposal_methods TEXT,
    emergency_procedures TEXT,
    file_path VARCHAR(500),
    last_updated DATE,
    review_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- SAFEWORK V2 ENHANCED TABLES
-- ========================================

-- Enhanced Workers (V2)
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

-- Enhanced Health Checks (V2)
CREATE TABLE IF NOT EXISTS safework_health_checks (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES safework_workers(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    check_type VARCHAR(50) NOT NULL,
    results JSONB,
    recommendations TEXT,
    next_check_date DATE,
    doctor_name VARCHAR(100),
    medical_institution VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Medical Visits (V2)
CREATE TABLE IF NOT EXISTS safework_medical_visits (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES safework_workers(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    visit_type VARCHAR(50),
    symptoms TEXT,
    diagnosis TEXT,
    treatment TEXT,
    doctor_name VARCHAR(100),
    hospital_name VARCHAR(200),
    cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Medications (V2)
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

-- Medication Usage Logs
CREATE TABLE IF NOT EXISTS safework_medication_logs (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER REFERENCES safework_medications(id) ON DELETE CASCADE,
    worker_id INTEGER REFERENCES safework_workers(id),
    usage_date DATE NOT NULL,
    quantity_used INTEGER NOT NULL,
    prescribed_by VARCHAR(100),
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification System
CREATE TABLE IF NOT EXISTS safework_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    priority VARCHAR(20) DEFAULT 'normal',
    target_users TEXT[],
    target_departments TEXT[],
    is_read BOOLEAN DEFAULT FALSE,
    read_by TEXT[],
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification Settings
CREATE TABLE IF NOT EXISTS safework_notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT TRUE,
    health_check_reminders BOOLEAN DEFAULT TRUE,
    medication_alerts BOOLEAN DEFAULT TRUE,
    system_updates BOOLEAN DEFAULT TRUE,
    emergency_alerts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Health Plans
CREATE TABLE IF NOT EXISTS safework_health_plans (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES safework_workers(id) ON DELETE CASCADE,
    plan_name VARCHAR(200) NOT NULL,
    description TEXT,
    goals TEXT[],
    target_date DATE,
    assigned_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',
    progress_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Todo System
CREATE TABLE IF NOT EXISTS safework_todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(id),
    assigned_by INTEGER REFERENCES users(id),
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'normal',
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ========================================

-- Core survey indexes
CREATE INDEX IF NOT EXISTS idx_surveys_form_type ON surveys(form_type);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at);
CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_department ON surveys(department);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_access_level ON documents(access_level);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Worker management indexes
CREATE INDEX IF NOT EXISTS idx_workers_employee_number ON workers(employee_number);
CREATE INDEX IF NOT EXISTS idx_workers_department_id ON workers(department_id);
CREATE INDEX IF NOT EXISTS idx_workers_health_status ON workers(health_status);
CREATE INDEX IF NOT EXISTS idx_safework_workers_employee_number ON safework_workers(employee_number);
CREATE INDEX IF NOT EXISTS idx_safework_workers_department ON safework_workers(department);

-- Health check indexes
CREATE INDEX IF NOT EXISTS idx_health_check_targets_worker_id ON health_check_targets(worker_id);
CREATE INDEX IF NOT EXISTS idx_health_check_targets_scheduled_date ON health_check_targets(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_health_check_results_worker_id ON health_check_results(worker_id);
CREATE INDEX IF NOT EXISTS idx_health_check_results_check_date ON health_check_results(check_date);

-- Medical visit indexes
CREATE INDEX IF NOT EXISTS idx_medical_visits_worker_id ON medical_visits(worker_id);
CREATE INDEX IF NOT EXISTS idx_medical_visits_visit_date ON medical_visits(visit_date);

-- Medication indexes
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);
CREATE INDEX IF NOT EXISTS idx_medications_expiry_date ON medications(expiry_date);
CREATE INDEX IF NOT EXISTS idx_safework_medications_expiry_date ON safework_medications(expiry_date);

-- Environment measurement indexes
CREATE INDEX IF NOT EXISTS idx_environment_measurements_plan_id ON environment_measurements(plan_id);
CREATE INDEX IF NOT EXISTS idx_environment_measurements_date ON environment_measurements(measurement_date);

-- MSDS indexes
CREATE INDEX IF NOT EXISTS idx_safework_msds_product_name ON safework_msds(product_name);
CREATE INDEX IF NOT EXISTS idx_safework_msds_manufacturer ON safework_msds(manufacturer);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_safework_notifications_type ON safework_notifications(type);
CREATE INDEX IF NOT EXISTS idx_safework_notifications_created_at ON safework_notifications(created_at);

-- Todo indexes
CREATE INDEX IF NOT EXISTS idx_safework_todos_assigned_to ON safework_todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_safework_todos_status ON safework_todos(status);
CREATE INDEX IF NOT EXISTS idx_safework_todos_due_date ON safework_todos(due_date);

-- ========================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ========================================

-- Create or replace update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_extended_updated_at BEFORE UPDATE ON departments_extended FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_health_check_plans_updated_at BEFORE UPDATE ON health_check_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_health_check_targets_updated_at BEFORE UPDATE ON health_check_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_environment_measurement_plans_updated_at BEFORE UPDATE ON environment_measurement_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safework_msds_updated_at BEFORE UPDATE ON safework_msds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safework_workers_updated_at BEFORE UPDATE ON safework_workers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safework_medications_updated_at BEFORE UPDATE ON safework_medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safework_notification_settings_updated_at BEFORE UPDATE ON safework_notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safework_health_plans_updated_at BEFORE UPDATE ON safework_health_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safework_todos_updated_at BEFORE UPDATE ON safework_todos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FOREIGN KEY CONSTRAINTS (DEFERRED)
-- ========================================

-- Add foreign key for department manager (deferred to avoid circular reference)
ALTER TABLE departments_extended ADD CONSTRAINT fk_departments_manager 
    FOREIGN KEY (manager_id) REFERENCES workers(id) DEFERRABLE INITIALLY DEFERRED;

-- ========================================
-- INITIAL DATA SEEDING
-- ========================================

-- Insert default admin user
INSERT INTO users (username, email, password_hash, is_admin) 
VALUES ('admin', 'admin@safework.com', 'pbkdf2:sha256:260000$OxB8gF7IfMDe9Jvx$8f6d7a5b9c2e1f4g3h6i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Insert anonymous user for form submissions
INSERT INTO users (id, username, email, password_hash, is_admin) 
VALUES (1, 'anonymous', 'anonymous@safework.com', 'no-password', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Insert sample departments
INSERT INTO departments_extended (code, name, risk_level, location, employee_count)
VALUES 
    ('DEV', '개발부', 'LOW', '본사 3층', 15),
    ('SAFETY', '안전관리부', 'MEDIUM', '본사 2층', 8),
    ('PRODUCTION', '생산부', 'HIGH', '공장동', 45),
    ('ADMIN', '관리부', 'LOW', '본사 1층', 12)
ON CONFLICT (code) DO NOTHING;

-- Insert sample document categories
INSERT INTO documents (title, description, filename, file_path, category, access_level, upload_user_id)
VALUES 
    ('Safety Guidelines', 'General safety guidelines for construction workers', 'safety_guidelines.pdf', '/documents/safety_guidelines.pdf', 'Safety', 'public', 1),
    ('Health Form Templates', 'Templates for health checkup forms', 'health_templates.zip', '/documents/health_templates.zip', 'Templates', 'public', 1),
    ('MSDS Database', 'Material Safety Data Sheets collection', 'msds_collection.pdf', '/documents/msds_collection.pdf', 'MSDS', 'public', 1)
ON CONFLICT DO NOTHING;

-- Insert sample medications
INSERT INTO safework_medications (name, category, manufacturer, current_stock, minimum_stock, unit, location)
VALUES 
    ('아세트아미노펜 500mg', '해열진통제', '한국제약', 100, 20, '정', '의무실 약품보관함 A'),
    ('포비돈 요오드', '소독제', '대한약품', 5, 2, '병', '의무실 응급처치대'),
    ('거즈 패드', '의료용품', '메디칼코리아', 50, 10, '개', '의무실 응급처치대'),
    ('일회용 반창고', '의료용품', '메디칼코리아', 200, 50, '개', '의무실 응급처치대')
ON CONFLICT DO NOTHING;

-- ========================================
-- SCHEMA MIGRATION TRACKING
-- ========================================

-- Create schema_migrations table for tracking migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Log initial complete schema installation
INSERT INTO schema_migrations (version, applied_at)
VALUES ('complete_schema_v1.0', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;

-- ========================================
-- PERMISSIONS AND SECURITY
-- ========================================

-- Grant necessary permissions to safework user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO safework;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO safework;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO safework;

-- Set default search path
ALTER DATABASE safework_db SET search_path TO public;

-- ========================================
-- SCHEMA DOCUMENTATION
-- ========================================

-- Add comprehensive comments for documentation
COMMENT ON TABLE surveys IS 'Stores health survey data for forms 001 (musculoskeletal), 002 (new employee), and 003 (prevention program)';
COMMENT ON COLUMN surveys.form_type IS 'Form type identifier: 001=musculoskeletal, 002=new employee, 003=prevention program';
COMMENT ON COLUMN surveys.data IS 'Flexible JSON storage for form-specific data';
COMMENT ON COLUMN surveys.responses IS 'Complete form responses in JSON format';

COMMENT ON TABLE workers IS 'Extended worker information with health and safety management';
COMMENT ON TABLE safework_workers IS 'V2 enhanced worker table with simplified structure';
COMMENT ON TABLE departments_extended IS 'Department hierarchy with risk assessment';

COMMENT ON TABLE health_check_plans IS 'Configurable health check schedules and requirements';
COMMENT ON TABLE health_check_targets IS 'Individual worker health check assignments';
COMMENT ON TABLE health_check_results IS 'Health examination results and recommendations';

COMMENT ON TABLE medications IS 'Comprehensive medication inventory with expiry tracking';
COMMENT ON TABLE safework_medications IS 'V2 simplified medication management';

COMMENT ON TABLE environment_measurements IS 'Workplace environment monitoring data';
COMMENT ON TABLE safework_msds IS 'Material Safety Data Sheets management';

COMMENT ON TABLE safework_notifications IS 'System-wide notification management';
COMMENT ON TABLE safework_todos IS 'Task and todo management for safety activities';

-- Log successful complete schema initialization
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'SafeWork Complete Database Schema Initialized';
    RAISE NOTICE 'Version: 1.0';
    RAISE NOTICE 'Tables created: 25+ core and extended tables';
    RAISE NOTICE 'Indexes created: 30+ performance optimization indexes';
    RAISE NOTICE 'Triggers created: Automatic timestamp updates';
    RAISE NOTICE 'Initial data: Admin user, departments, medications';
    RAISE NOTICE 'Timestamp: %', CURRENT_TIMESTAMP;
    RAISE NOTICE '=================================================';
END $$;