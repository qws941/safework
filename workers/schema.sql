-- SafeWork D1 Database Schema (SQLite)
-- Converted from PostgreSQL for Cloudflare D1

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    parent_id INTEGER,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES departments(id)
);

-- Workers table
CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department_id INTEGER,
    position TEXT,
    hire_date DATE,
    birth_date DATE,
    gender TEXT CHECK(gender IN ('M', 'F')),
    phone TEXT,
    email TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Surveys table (unified for all survey types)
CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_type TEXT NOT NULL,
    user_id INTEGER,
    worker_id INTEGER,
    department_id INTEGER,
    response_data TEXT, -- JSON stored as text
    is_anonymous INTEGER DEFAULT 0,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'submitted',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (worker_id) REFERENCES workers(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Health Check Plans
CREATE TABLE IF NOT EXISTS health_check_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    plan_type TEXT,
    description TEXT,
    target_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'planned',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Health Check Targets
CREATE TABLE IF NOT EXISTS health_check_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER,
    worker_id INTEGER,
    check_date DATE,
    check_type TEXT,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES health_check_plans(id),
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);

-- Health Check Results
CREATE TABLE IF NOT EXISTS health_check_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER,
    worker_id INTEGER,
    check_date DATE,
    height REAL,
    weight REAL,
    blood_pressure_sys INTEGER,
    blood_pressure_dia INTEGER,
    vision_left REAL,
    vision_right REAL,
    hearing_left TEXT,
    hearing_right TEXT,
    blood_sugar INTEGER,
    cholesterol_total INTEGER,
    result_summary TEXT,
    recommendations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_id) REFERENCES health_check_targets(id),
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);

-- Medical Visits
CREATE TABLE IF NOT EXISTS medical_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER,
    visit_date DATE,
    visit_type TEXT,
    hospital_name TEXT,
    doctor_name TEXT,
    diagnosis TEXT,
    treatment TEXT,
    prescription TEXT,
    follow_up_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);

-- Medications
CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER,
    worker_id INTEGER,
    medication_name TEXT,
    dosage TEXT,
    frequency TEXT,
    duration_days INTEGER,
    start_date DATE,
    end_date DATE,
    side_effects TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES medical_visits(id),
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);

-- Environment Measurement Plans
CREATE TABLE IF NOT EXISTS environment_measurement_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    measurement_type TEXT,
    frequency TEXT,
    department_id INTEGER,
    description TEXT,
    status TEXT DEFAULT 'planned',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Environment Measurements
CREATE TABLE IF NOT EXISTS environment_measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER,
    department_id INTEGER,
    measurement_date DATE,
    measurement_type TEXT,
    location TEXT,
    value REAL,
    unit TEXT,
    standard_value REAL,
    is_exceeded INTEGER DEFAULT 0,
    inspector_name TEXT,
    equipment_used TEXT,
    weather_conditions TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES environment_measurement_plans(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- MSDS (Material Safety Data Sheets)
CREATE TABLE IF NOT EXISTS safework_msds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    manufacturer TEXT,
    cas_number TEXT,
    hazard_class TEXT,
    signal_word TEXT,
    hazard_statements TEXT,
    precautionary_statements TEXT,
    first_aid_measures TEXT,
    handling_storage TEXT,
    ppe_required TEXT,
    department_id INTEGER,
    location TEXT,
    quantity TEXT,
    last_updated DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_workers_department ON workers(department_id);
CREATE INDEX idx_workers_employee_number ON workers(employee_number);
CREATE INDEX idx_surveys_form_type ON surveys(form_type);
CREATE INDEX idx_surveys_submitted_at ON surveys(submitted_at);
CREATE INDEX idx_health_check_targets_worker ON health_check_targets(worker_id);
CREATE INDEX idx_health_check_results_worker ON health_check_results(worker_id);
CREATE INDEX idx_medical_visits_worker ON medical_visits(worker_id);
CREATE INDEX idx_environment_measurements_date ON environment_measurements(measurement_date);

-- Default admin user (password: safework2024)
INSERT INTO users (username, email, password_hash, is_admin) 
VALUES ('admin', 'admin@safework.jclee.me', 'pbkdf2:sha256:600000$Hg5xGwV8mFvQHTpZ$a29f2e9c0c9b5d6e8f3a4b5c6d7e8f9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5', 1);

-- Default anonymous user for surveys
INSERT INTO users (id, username, email, password_hash, is_active) 
VALUES (1, 'anonymous', 'anonymous@safework.jclee.me', 'no-login', 1);