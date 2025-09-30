/**
 * D1 Database Models
 * Type definitions for database entities
 */

// ============================================
// Core Models
// ============================================

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  is_admin: number; // 0 or 1 (SQLite boolean)
  is_active: number; // 0 or 1
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: number;
  name: string;
  is_active: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Process {
  id: number;
  name: string;
  description: string | null;
  is_active: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  title: string;
  description: string | null;
  is_active: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Survey Models
// ============================================

export interface Survey {
  id: number;
  user_id: number;
  form_type: string;

  // Basic information
  name: string | null;
  department: string | null;
  position: string | null;
  employee_id: string | null;
  gender: string | null;
  age: number | null;
  years_of_service: number | null;
  employee_number: string | null;

  // Work information
  work_years: number | null;
  work_months: number | null;
  has_symptoms: number; // 0 or 1

  // Metadata
  status: string;

  // JSON data fields (stored as TEXT)
  responses: string | null; // JSON string
  data: string | null; // JSON string
  symptoms_data: string | null; // JSON string

  // Relationships
  company_id: number | null;
  process_id: number | null;
  role_id: number | null;

  // Timestamps
  submission_date: string;
  created_at: string;
  updated_at: string;
}

export interface SurveyStatistics {
  id: number;
  stat_date: string;
  total_submissions: number;

  // Body part symptom counts
  neck_count: number;
  shoulder_count: number;
  arm_count: number;
  hand_count: number;
  waist_count: number;
  leg_count: number;

  // Severity statistics
  severe_count: number;
  very_severe_count: number;

  // JSON data
  department_stats: string | null; // JSON string
  age_group_stats: string | null; // JSON string

  // Medical treatment count
  medical_treatment_count: number;

  // Form 002 specific fields
  height_cm: number | null;
  weight_kg: number | null;
  blood_type: string | null;
  existing_conditions: string | null; // JSON string
  medication_history: string | null;
  allergy_history: string | null;

  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  details: string | null; // JSON string
  created_at: string;
}

// ============================================
// View Models
// ============================================

export interface SurveySummary {
  id: number;
  form_type: string;
  name: string | null;
  department: string | null;
  has_symptoms: number;
  submission_date: string;
  company_name: string | null;
  process_name: string | null;
  role_title: string | null;
  submitted_by: string | null;
}

export interface DailyStatistics {
  date: string;
  total_submissions: number;
  symptoms_count: number;
  unique_users: number;
}

// ============================================
// Request/Response DTOs
// ============================================

export interface SurveySubmissionRequest {
  form_type: string;
  user_id?: number;
  name?: string;
  department?: string;
  position?: string;
  employee_id?: string;
  gender?: string;
  age?: number;
  years_of_service?: number;
  employee_number?: string;
  work_years?: number;
  work_months?: number;
  has_symptoms?: boolean;
  company_id?: number;
  process_id?: number;
  role_id?: number;
  responses?: Record<string, unknown>;
  data?: Record<string, unknown>;
  symptoms_data?: Record<string, unknown>;
}

export interface SurveyResponse {
  id: number;
  form_type: string;
  name: string | null;
  department: string | null;
  submission_date: string;
  status: string;
  has_symptoms: boolean;
}

export interface UserAuthRequest {
  username: string;
  password: string;
}

export interface UserAuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    is_admin: boolean;
  };
  message?: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Parse JSON string from D1 result
 */
export function parseJSON<T>(jsonString: string | null): T | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

/**
 * Convert SQLite boolean (0/1) to JavaScript boolean
 */
export function toBoolean(value: number): boolean {
  return value === 1;
}

/**
 * Convert JavaScript boolean to SQLite boolean (0/1)
 */
export function fromBoolean(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Convert Survey to SurveyResponse
 */
export function toSurveyResponse(survey: Survey): SurveyResponse {
  return {
    id: survey.id,
    form_type: survey.form_type,
    name: survey.name,
    department: survey.department,
    submission_date: survey.submission_date,
    status: survey.status,
    has_symptoms: toBoolean(survey.has_symptoms),
  };
}