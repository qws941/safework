/**
 * Safety Education Management API Routes
 * Forms 011-012: 안전보건교육 관리 시스템
 *
 * Legal Basis: 산업안전보건법 (Occupational Safety and Health Act) Article 29-31
 * Implementation Date: 2025-11-14
 *
 * Features:
 * - Education courses master data (11 pre-defined courses)
 * - Education plan management (Form 011)
 * - Education session tracking (Form 012)
 * - Attendance management (Form 012 detail)
 * - Statistics and compliance reporting
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// ==================== Type Definitions ====================

interface SafetyEducationCourse {
  id: number;
  code: string;
  category: string; // regular/new_hire/task_change/special/manager
  name_ko: string;
  name_en: string;
  description: string | null;
  required_hours: number;
  target_audience: string | null;
  legal_basis: string | null;
  curriculum_summary: string | null;
  required_frequency: string | null; // quarterly/annually/monthly/once/as_needed
  is_mandatory: number;
  is_active: number;
  display_order: number;
  created_at: string;
}

interface _SafetyEducationPlan {
  id: number;
  plan_year: number;
  plan_quarter: number | null;
  plan_title: string;
  course_id: number;
  target_department: string | null;
  target_audience_count: number;
  planned_start_date: string;
  planned_end_date: string | null;
  planned_hours: number;
  planned_sessions: number;
  instructor_name: string | null;
  instructor_qualification: string | null;
  education_location: string | null;
  education_method: string | null; // classroom/online/field/blended
  curriculum_details: string | null;
  materials_prepared: number;
  plan_status: string; // planned/confirmed/in_progress/completed/cancelled
  plan_document_url: string | null;
  completed_sessions: number;
  total_attendees: number;
  average_attendance_rate: number;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

interface SafetyEducationSession {
  id: number;
  plan_id: number;
  session_number: number;
  session_date: string;
  session_start_time: string | null;
  session_end_time: string | null;
  actual_duration_hours: number;
  instructor_name: string;
  instructor_qualification: string | null;
  education_location: string | null;
  education_method: string | null;
  topics_covered: string | null; // JSON
  materials_used: string | null; // JSON
  equipment_used: string | null;
  attendance_count: number;
  completion_rate: number;
  session_evaluation_score: number | null;
  feedback_summary: string | null;
  session_document_url: string | null;
  certificate_issued: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface _SafetyEducationAttendance {
  id: number;
  session_id: number;
  employee_id: number;
  attendance_status: string; // present/absent/late/excused
  arrival_time: string | null;
  departure_time: string | null;
  actual_hours: number | null;
  participation_score: number | null;
  quiz_score: number | null;
  completion_status: string; // complete/incomplete
  certificate_issued: number;
  certificate_number: string | null;
  certificate_issue_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== Helper Functions ====================

/**
 * Update plan statistics after session or attendance changes
 */
async function updatePlanStatistics(db: D1Database, planId: number): Promise<void> {
  // Get session statistics
  const sessionStats = await db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      SUM(attendance_count) as total_attendees,
      AVG(completion_rate) as avg_completion_rate
    FROM safety_education_sessions
    WHERE plan_id = ?
  `).bind(planId).first();

  // Update plan with statistics
  await db.prepare(`
    UPDATE safety_education_plans
    SET
      completed_sessions = ?,
      total_attendees = ?,
      average_attendance_rate = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    sessionStats?.total_sessions || 0,
    sessionStats?.total_attendees || 0,
    sessionStats?.avg_completion_rate || 0,
    planId
  ).run();
}

/**
 * Update session statistics after attendance changes
 */
async function updateSessionStatistics(db: D1Database, sessionId: number): Promise<void> {
  // Get attendance statistics
  const attendanceStats = await db.prepare(`
    SELECT
      COUNT(*) as total_count,
      SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) as present_count,
      AVG(CASE WHEN participation_score IS NOT NULL THEN participation_score ELSE 0 END) as avg_participation
    FROM safety_education_attendance
    WHERE session_id = ?
  `).bind(sessionId).first<{ total_count: number; present_count: number; avg_participation: number }>();

  const completionRate = attendanceStats && Number(attendanceStats.total_count) > 0
    ? (Number(attendanceStats.present_count) / Number(attendanceStats.total_count)) * 100
    : 0;

  // Update session with statistics
  await db.prepare(`
    UPDATE safety_education_sessions
    SET
      attendance_count = ?,
      completion_rate = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    attendanceStats?.present_count || 0,
    completionRate,
    sessionId
  ).run();

  // Also update parent plan statistics
  const session = await db.prepare('SELECT plan_id FROM safety_education_sessions WHERE id = ?')
    .bind(sessionId).first<{ plan_id: number }>();

  if (session) {
    await updatePlanStatistics(db, session.plan_id);
  }
}

// ==================== Education Courses Endpoints ====================

/**
 * GET /api/safety-education/courses
 * List all safety education courses (11 pre-defined)
 * Query params: category, active_only
 */
app.get('/courses', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;

  try {
    const category = c.req.query('category');
    const activeOnly = c.req.query('active_only') !== '0'; // Default true

    let query = 'SELECT * FROM safety_education_courses WHERE 1=1';
    const params: string[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (activeOnly) {
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY display_order ASC, code ASC';

    const result = await db.prepare(query).bind(...params).all<SafetyEducationCourse>();

    return c.json({
      success: true,
      data: result.results,
      count: result.results?.length || 0,
      message: `안전보건교육 과정 목록 조회 성공 (총 ${result.results?.length || 0}개)`
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * GET /api/safety-education/courses/:id
 * Get single education course details
 */
app.get('/courses/:id', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const courseId = c.req.param('id');

  try {
    const course = await db.prepare('SELECT * FROM safety_education_courses WHERE id = ?')
      .bind(courseId)
      .first<SafetyEducationCourse>();

    if (!course) {
      return c.json({
        success: false,
        error: '교육 과정을 찾을 수 없습니다'
      }, 404);
    }

    return c.json({
      success: true,
      data: course
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

// ==================== Education Plans Endpoints (Form 011) ====================

/**
 * POST /api/safety-education/plans
 * Create new education plan (Form 011)
 */
app.post('/plans', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;

  try {
    const body = await c.req.json();

    // Validation
    if (!body.plan_year || !body.plan_title || !body.course_id || !body.planned_start_date || !body.planned_hours) {
      return c.json({
        success: false,
        error: '필수 항목이 누락되었습니다 (plan_year, plan_title, course_id, planned_start_date, planned_hours)'
      }, 400);
    }

    // Verify course exists
    const course = await db.prepare('SELECT id FROM safety_education_courses WHERE id = ?')
      .bind(body.course_id).first();

    if (!course) {
      return c.json({
        success: false,
        error: '유효하지 않은 교육 과정 ID입니다'
      }, 400);
    }

    // Insert plan
    const _result = await db.prepare(`
      INSERT INTO safety_education_plans (
        plan_year, plan_quarter, plan_title, course_id, target_department,
        target_audience_count, planned_start_date, planned_end_date, planned_hours,
        planned_sessions, instructor_name, instructor_qualification, education_location,
        education_method, curriculum_details, materials_prepared, plan_status,
        plan_document_url, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.plan_year,
      body.plan_quarter || null,
      body.plan_title,
      body.course_id,
      body.target_department || null,
      body.target_audience_count || 0,
      body.planned_start_date,
      body.planned_end_date || null,
      body.planned_hours,
      body.planned_sessions || 1,
      body.instructor_name || null,
      body.instructor_qualification || null,
      body.education_location || null,
      body.education_method || null,
      body.curriculum_details || null,
      body.materials_prepared || 0,
      body.plan_status || 'planned',
      body.plan_document_url || null,
      body.notes || null,
      body.created_by || null
    ).run();

    // Get created plan with course info
    const createdPlan = await db.prepare(`
      SELECT
        p.*,
        c.name_ko as course_name_ko,
        c.name_en as course_name_en,
        c.category as course_category
      FROM safety_education_plans p
      LEFT JOIN safety_education_courses c ON p.course_id = c.id
      WHERE p.id = last_insert_rowid()
    `).first();

    return c.json({
      success: true,
      data: createdPlan,
      message: '안전보건교육 계획이 성공적으로 등록되었습니다'
    }, 201);
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * GET /api/safety-education/plans
 * List education plans with filters and pagination
 * Query params: plan_year, plan_quarter, course_id, plan_status, page, limit
 */
app.get('/plans', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;

  try {
    const planYear = c.req.query('plan_year');
    const planQuarter = c.req.query('plan_quarter');
    const courseId = c.req.query('course_id');
    const planStatus = c.req.query('plan_status');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        p.*,
        c.name_ko as course_name_ko,
        c.name_en as course_name_en,
        c.category as course_category,
        c.required_hours as course_required_hours
      FROM safety_education_plans p
      LEFT JOIN safety_education_courses c ON p.course_id = c.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (planYear) {
      query += ' AND p.plan_year = ?';
      params.push(parseInt(planYear));
    }

    if (planQuarter) {
      query += ' AND p.plan_quarter = ?';
      params.push(parseInt(planQuarter));
    }

    if (courseId) {
      query += ' AND p.course_id = ?';
      params.push(parseInt(courseId));
    }

    if (planStatus) {
      query += ' AND p.plan_status = ?';
      params.push(planStatus);
    }

    // Count total
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM');
    const countResult = await db.prepare(countQuery).bind(...params).first<{ count: number }>();
    const total = countResult?.count || 0;

    // Get paginated results
    query += ' ORDER BY p.plan_year DESC, p.plan_quarter DESC, p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await db.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      data: result.results,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      },
      message: `안전보건교육 계획 목록 조회 성공 (${result.results?.length}/${total}개)`
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * GET /api/safety-education/plans/:id
 * Get single education plan details with course info
 */
app.get('/plans/:id', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const planId = c.req.param('id');

  try {
    const plan = await db.prepare(`
      SELECT
        p.*,
        c.name_ko as course_name_ko,
        c.name_en as course_name_en,
        c.category as course_category,
        c.required_hours as course_required_hours,
        c.curriculum_summary as course_curriculum
      FROM safety_education_plans p
      LEFT JOIN safety_education_courses c ON p.course_id = c.id
      WHERE p.id = ?
    `).bind(planId).first();

    if (!plan) {
      return c.json({
        success: false,
        error: '교육 계획을 찾을 수 없습니다'
      }, 404);
    }

    // Get sessions for this plan
    const sessions = await db.prepare(`
      SELECT * FROM safety_education_sessions
      WHERE plan_id = ?
      ORDER BY session_number ASC
    `).bind(planId).all();

    return c.json({
      success: true,
      data: {
        ...plan,
        sessions: sessions.results || []
      }
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * PUT /api/safety-education/plans/:id
 * Update education plan
 */
app.put('/plans/:id', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const planId = c.req.param('id');

  try {
    const body = await c.req.json();

    // Check if plan exists
    const existingPlan = await db.prepare('SELECT id FROM safety_education_plans WHERE id = ?')
      .bind(planId).first();

    if (!existingPlan) {
      return c.json({
        success: false,
        error: '교육 계획을 찾을 수 없습니다'
      }, 404);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    const allowedFields = [
      'plan_quarter', 'plan_title', 'target_department', 'target_audience_count',
      'planned_start_date', 'planned_end_date', 'planned_hours', 'planned_sessions',
      'instructor_name', 'instructor_qualification', 'education_location',
      'education_method', 'curriculum_details', 'materials_prepared', 'plan_status',
      'plan_document_url', 'notes'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return c.json({
        success: false,
        error: '수정할 항목이 없습니다'
      }, 400);
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(planId);

    await db.prepare(`
      UPDATE safety_education_plans
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    // Get updated plan
    const updatedPlan = await db.prepare(`
      SELECT
        p.*,
        c.name_ko as course_name_ko,
        c.name_en as course_name_en
      FROM safety_education_plans p
      LEFT JOIN safety_education_courses c ON p.course_id = c.id
      WHERE p.id = ?
    `).bind(planId).first();

    return c.json({
      success: true,
      data: updatedPlan,
      message: '교육 계획이 성공적으로 수정되었습니다'
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * DELETE /api/safety-education/plans/:id
 * Soft delete education plan (set status to 'cancelled')
 */
app.delete('/plans/:id', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const planId = c.req.param('id');

  try {
    const existingPlan = await db.prepare('SELECT id, plan_status FROM safety_education_plans WHERE id = ?')
      .bind(planId).first<{ id: number; plan_status: string }>();

    if (!existingPlan) {
      return c.json({
        success: false,
        error: '교육 계획을 찾을 수 없습니다'
      }, 404);
    }

    if (existingPlan.plan_status === 'completed') {
      return c.json({
        success: false,
        error: '완료된 교육 계획은 삭제할 수 없습니다'
      }, 400);
    }

    // Soft delete by setting status to cancelled
    await db.prepare(`
      UPDATE safety_education_plans
      SET plan_status = 'cancelled', updated_at = datetime('now')
      WHERE id = ?
    `).bind(planId).run();

    return c.json({
      success: true,
      message: '교육 계획이 취소되었습니다'
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

// ==================== Education Sessions Endpoints (Form 012) ====================

/**
 * POST /api/safety-education/sessions
 * Create education session (Form 012)
 */
app.post('/sessions', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;

  try {
    const body = await c.req.json();

    // Validation
    if (!body.plan_id || !body.session_number || !body.session_date || !body.actual_duration_hours || !body.instructor_name) {
      return c.json({
        success: false,
        error: '필수 항목이 누락되었습니다 (plan_id, session_number, session_date, actual_duration_hours, instructor_name)'
      }, 400);
    }

    // Verify plan exists
    const plan = await db.prepare('SELECT id FROM safety_education_plans WHERE id = ?')
      .bind(body.plan_id).first();

    if (!plan) {
      return c.json({
        success: false,
        error: '유효하지 않은 교육 계획 ID입니다'
      }, 400);
    }

    // Convert JSON arrays to strings if present
    const topicsCovered = body.topics_covered
      ? (typeof body.topics_covered === 'string' ? body.topics_covered : JSON.stringify(body.topics_covered))
      : null;

    const materialsUsed = body.materials_used
      ? (typeof body.materials_used === 'string' ? body.materials_used : JSON.stringify(body.materials_used))
      : null;

    // Insert session
    const _result = await db.prepare(`
      INSERT INTO safety_education_sessions (
        plan_id, session_number, session_date, session_start_time, session_end_time,
        actual_duration_hours, instructor_name, instructor_qualification, education_location,
        education_method, topics_covered, materials_used, equipment_used,
        session_evaluation_score, feedback_summary, session_document_url,
        certificate_issued, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.plan_id,
      body.session_number,
      body.session_date,
      body.session_start_time || null,
      body.session_end_time || null,
      body.actual_duration_hours,
      body.instructor_name,
      body.instructor_qualification || null,
      body.education_location || null,
      body.education_method || null,
      topicsCovered,
      materialsUsed,
      body.equipment_used || null,
      body.session_evaluation_score || null,
      body.feedback_summary || null,
      body.session_document_url || null,
      body.certificate_issued || 0,
      body.notes || null
    ).run();

    // Get created session
    const createdSession = await db.prepare(
      'SELECT * FROM safety_education_sessions WHERE id = last_insert_rowid()'
    ).first();

    // Update plan statistics
    await updatePlanStatistics(db, body.plan_id);

    return c.json({
      success: true,
      data: createdSession,
      message: '교육 실시 기록이 성공적으로 등록되었습니다'
    }, 201);
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * GET /api/safety-education/sessions/:planId
 * List all sessions for a specific plan
 */
app.get('/sessions/:planId', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const planId = c.req.param('planId');

  try {
    const sessions = await db.prepare(`
      SELECT * FROM safety_education_sessions
      WHERE plan_id = ?
      ORDER BY session_number ASC
    `).bind(planId).all<SafetyEducationSession>();

    return c.json({
      success: true,
      data: sessions.results,
      count: sessions.results?.length || 0,
      message: `교육 실시 목록 조회 성공 (총 ${sessions.results?.length || 0}건)`
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * GET /api/safety-education/sessions/detail/:id
 * Get single session details with attendance records
 */
app.get('/sessions/detail/:id', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const sessionId = c.req.param('id');

  try {
    const session = await db.prepare(
      'SELECT * FROM safety_education_sessions WHERE id = ?'
    ).bind(sessionId).first<SafetyEducationSession>();

    if (!session) {
      return c.json({
        success: false,
        error: '교육 실시 기록을 찾을 수 없습니다'
      }, 404);
    }

    // Get attendance records
    const attendance = await db.prepare(`
      SELECT
        a.*,
        u.name as employee_name,
        u.department as employee_department
      FROM safety_education_attendance a
      LEFT JOIN users u ON a.employee_id = u.id
      WHERE a.session_id = ?
      ORDER BY u.name ASC
    `).bind(sessionId).all();

    return c.json({
      success: true,
      data: {
        ...session,
        attendance: attendance.results || []
      }
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * PUT /api/safety-education/sessions/:id
 * Update education session
 */
app.put('/sessions/:id', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const sessionId = c.req.param('id');

  try {
    const body = await c.req.json();

    // Check if session exists
    const existingSession = await db.prepare('SELECT id, plan_id FROM safety_education_sessions WHERE id = ?')
      .bind(sessionId).first<{ id: number; plan_id: number }>();

    if (!existingSession) {
      return c.json({
        success: false,
        error: '교육 실시 기록을 찾을 수 없습니다'
      }, 404);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    const allowedFields = [
      'session_date', 'session_start_time', 'session_end_time', 'actual_duration_hours',
      'instructor_name', 'instructor_qualification', 'education_location', 'education_method',
      'topics_covered', 'materials_used', 'equipment_used', 'session_evaluation_score',
      'feedback_summary', 'session_document_url', 'certificate_issued', 'notes'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if ((field === 'topics_covered' || field === 'materials_used') && typeof body[field] !== 'string') {
          updates.push(`${field} = ?`);
          params.push(JSON.stringify(body[field]));
        } else {
          updates.push(`${field} = ?`);
          params.push(body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return c.json({
        success: false,
        error: '수정할 항목이 없습니다'
      }, 400);
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(sessionId);

    await db.prepare(`
      UPDATE safety_education_sessions
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    // Update plan statistics
    await updatePlanStatistics(db, existingSession.plan_id);

    // Get updated session
    const updatedSession = await db.prepare(
      'SELECT * FROM safety_education_sessions WHERE id = ?'
    ).bind(sessionId).first();

    return c.json({
      success: true,
      data: updatedSession,
      message: '교육 실시 기록이 성공적으로 수정되었습니다'
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * DELETE /api/safety-education/sessions/:id
 * Delete education session
 */
app.delete('/sessions/:id', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const sessionId = c.req.param('id');

  try {
    const existingSession = await db.prepare('SELECT id, plan_id FROM safety_education_sessions WHERE id = ?')
      .bind(sessionId).first<{ id: number; plan_id: number }>();

    if (!existingSession) {
      return c.json({
        success: false,
        error: '교육 실시 기록을 찾을 수 없습니다'
      }, 404);
    }

    // Delete session (cascade will delete attendance records)
    await db.prepare('DELETE FROM safety_education_sessions WHERE id = ?')
      .bind(sessionId).run();

    // Update plan statistics
    await updatePlanStatistics(db, existingSession.plan_id);

    return c.json({
      success: true,
      message: '교육 실시 기록이 삭제되었습니다'
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

// ==================== Attendance Endpoints (Form 012 Detail) ====================

/**
 * POST /api/safety-education/attendance
 * Record attendance for session (Form 012 detail)
 */
app.post('/attendance', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;

  try {
    const body = await c.req.json();

    // Validation
    if (!body.session_id || !body.employee_id || !body.attendance_status) {
      return c.json({
        success: false,
        error: '필수 항목이 누락되었습니다 (session_id, employee_id, attendance_status)'
      }, 400);
    }

    // Verify session exists
    const session = await db.prepare('SELECT id FROM safety_education_sessions WHERE id = ?')
      .bind(body.session_id).first();

    if (!session) {
      return c.json({
        success: false,
        error: '유효하지 않은 교육 세션 ID입니다'
      }, 400);
    }

    // Verify employee exists
    const employee = await db.prepare('SELECT id FROM users WHERE id = ?')
      .bind(body.employee_id).first();

    if (!employee) {
      return c.json({
        success: false,
        error: '유효하지 않은 직원 ID입니다'
      }, 400);
    }

    // Check for duplicate attendance
    const existingAttendance = await db.prepare(
      'SELECT id FROM safety_education_attendance WHERE session_id = ? AND employee_id = ?'
    ).bind(body.session_id, body.employee_id).first();

    if (existingAttendance) {
      return c.json({
        success: false,
        error: '이미 출석 기록이 존재합니다'
      }, 400);
    }

    // Insert attendance
    const _result = await db.prepare(`
      INSERT INTO safety_education_attendance (
        session_id, employee_id, attendance_status, arrival_time, departure_time,
        actual_hours, participation_score, quiz_score, completion_status,
        certificate_issued, certificate_number, certificate_issue_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.session_id,
      body.employee_id,
      body.attendance_status,
      body.arrival_time || null,
      body.departure_time || null,
      body.actual_hours || null,
      body.participation_score || null,
      body.quiz_score || null,
      body.completion_status || 'incomplete',
      body.certificate_issued || 0,
      body.certificate_number || null,
      body.certificate_issue_date || null,
      body.notes || null
    ).run();

    // Get created attendance with employee info
    const createdAttendance = await db.prepare(`
      SELECT
        a.*,
        u.name as employee_name,
        u.department as employee_department
      FROM safety_education_attendance a
      LEFT JOIN users u ON a.employee_id = u.id
      WHERE a.id = last_insert_rowid()
    `).first();

    // Update session and plan statistics
    await updateSessionStatistics(db, body.session_id);

    return c.json({
      success: true,
      data: createdAttendance,
      message: '출석 기록이 성공적으로 등록되었습니다'
    }, 201);
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * GET /api/safety-education/attendance/:sessionId
 * List all attendance records for a session
 */
app.get('/attendance/:sessionId', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const sessionId = c.req.param('sessionId');

  try {
    const attendance = await db.prepare(`
      SELECT
        a.*,
        u.name as employee_name,
        u.department as employee_department,
        u.position as employee_position
      FROM safety_education_attendance a
      LEFT JOIN users u ON a.employee_id = u.id
      WHERE a.session_id = ?
      ORDER BY u.name ASC
    `).bind(sessionId).all();

    return c.json({
      success: true,
      data: attendance.results,
      count: attendance.results?.length || 0,
      message: `출석 기록 조회 성공 (총 ${attendance.results?.length || 0}명)`
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * PUT /api/safety-education/attendance/:id
 * Update attendance record
 */
app.put('/attendance/:id', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const attendanceId = c.req.param('id');

  try {
    const body = await c.req.json();

    // Check if attendance exists
    const existingAttendance = await db.prepare('SELECT id, session_id FROM safety_education_attendance WHERE id = ?')
      .bind(attendanceId).first<{ id: number; session_id: number }>();

    if (!existingAttendance) {
      return c.json({
        success: false,
        error: '출석 기록을 찾을 수 없습니다'
      }, 404);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    const allowedFields = [
      'attendance_status', 'arrival_time', 'departure_time', 'actual_hours',
      'participation_score', 'quiz_score', 'completion_status', 'certificate_issued',
      'certificate_number', 'certificate_issue_date', 'notes'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return c.json({
        success: false,
        error: '수정할 항목이 없습니다'
      }, 400);
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(attendanceId);

    await db.prepare(`
      UPDATE safety_education_attendance
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    // Update session and plan statistics
    await updateSessionStatistics(db, existingAttendance.session_id);

    // Get updated attendance with employee info
    const updatedAttendance = await db.prepare(`
      SELECT
        a.*,
        u.name as employee_name,
        u.department as employee_department
      FROM safety_education_attendance a
      LEFT JOIN users u ON a.employee_id = u.id
      WHERE a.id = ?
    `).bind(attendanceId).first();

    return c.json({
      success: true,
      data: updatedAttendance,
      message: '출석 기록이 성공적으로 수정되었습니다'
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * DELETE /api/safety-education/attendance/:id
 * Delete attendance record
 */
app.delete('/attendance/:id', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const attendanceId = c.req.param('id');

  try {
    const existingAttendance = await db.prepare('SELECT id, session_id FROM safety_education_attendance WHERE id = ?')
      .bind(attendanceId).first<{ id: number; session_id: number }>();

    if (!existingAttendance) {
      return c.json({
        success: false,
        error: '출석 기록을 찾을 수 없습니다'
      }, 404);
    }

    // Delete attendance
    await db.prepare('DELETE FROM safety_education_attendance WHERE id = ?')
      .bind(attendanceId).run();

    // Update session and plan statistics
    await updateSessionStatistics(db, existingAttendance.session_id);

    return c.json({
      success: true,
      message: '출석 기록이 삭제되었습니다'
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

// ==================== Statistics Endpoints ====================

/**
 * GET /api/safety-education/stats
 * Get overall safety education statistics
 * Query params: year, quarter
 */
app.get('/stats', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;

  try {
    const year = c.req.query('year');
    const quarter = c.req.query('quarter');

    let whereClause = '';
    const params: (string | number)[] = [];

    if (year) {
      whereClause += ' WHERE plan_year = ?';
      params.push(parseInt(year));
    }

    if (quarter && whereClause) {
      whereClause += ' AND plan_quarter = ?';
      params.push(parseInt(quarter));
    } else if (quarter) {
      whereClause += ' WHERE plan_quarter = ?';
      params.push(parseInt(quarter));
    }

    // Overall plan statistics
    const planStats = await db.prepare(`
      SELECT
        COUNT(*) as total_plans,
        SUM(CASE WHEN plan_status = 'planned' THEN 1 ELSE 0 END) as planned_count,
        SUM(CASE WHEN plan_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN plan_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN plan_status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN plan_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(completed_sessions) as total_sessions,
        SUM(total_attendees) as total_attendees,
        AVG(average_attendance_rate) as avg_attendance_rate
      FROM safety_education_plans
      ${whereClause}
    `).bind(...params).first();

    // Statistics by course category
    const categoryStats = await db.prepare(`
      SELECT
        c.category,
        COUNT(p.id) as plan_count,
        SUM(p.completed_sessions) as total_sessions,
        SUM(p.total_attendees) as total_attendees,
        AVG(p.average_attendance_rate) as avg_attendance_rate
      FROM safety_education_plans p
      LEFT JOIN safety_education_courses c ON p.course_id = c.id
      ${whereClause}
      GROUP BY c.category
      ORDER BY c.category
    `).bind(...params).all();

    // Recent completed plans
    const recentCompleted = await db.prepare(`
      SELECT
        p.id,
        p.plan_title,
        p.plan_year,
        p.plan_quarter,
        c.name_ko as course_name,
        p.completed_sessions,
        p.total_attendees,
        p.average_attendance_rate,
        p.updated_at
      FROM safety_education_plans p
      LEFT JOIN safety_education_courses c ON p.course_id = c.id
      WHERE p.plan_status = 'completed'
      ${whereClause ? whereClause.replace('WHERE', 'AND') : ''}
      ORDER BY p.updated_at DESC
      LIMIT 10
    `).bind(...params).all();

    return c.json({
      success: true,
      data: {
        overview: planStats,
        by_category: categoryStats.results,
        recent_completed: recentCompleted.results
      },
      message: '안전보건교육 통계 조회 성공'
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

/**
 * GET /api/safety-education/stats/plan/:planId
 * Get detailed statistics for a specific plan
 */
app.get('/stats/plan/:planId', async (c: Context<{ Bindings: Env }>) => {
  const db = c.env.PRIMARY_DB;
  const planId = c.req.param('planId');

  try {
    // Plan overview
    const plan = await db.prepare(`
      SELECT
        p.*,
        c.name_ko as course_name,
        c.category as course_category
      FROM safety_education_plans p
      LEFT JOIN safety_education_courses c ON p.course_id = c.id
      WHERE p.id = ?
    `).bind(planId).first();

    if (!plan) {
      return c.json({
        success: false,
        error: '교육 계획을 찾을 수 없습니다'
      }, 404);
    }

    // Session statistics
    const sessionStats = await db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        AVG(actual_duration_hours) as avg_duration,
        AVG(attendance_count) as avg_attendance,
        AVG(completion_rate) as avg_completion_rate,
        AVG(session_evaluation_score) as avg_evaluation_score
      FROM safety_education_sessions
      WHERE plan_id = ?
    `).bind(planId).first();

    // Attendance statistics
    const attendanceStats = await db.prepare(`
      SELECT
        COUNT(*) as total_records,
        SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN attendance_status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN attendance_status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN completion_status = 'complete' THEN 1 ELSE 0 END) as completion_count,
        AVG(participation_score) as avg_participation_score,
        AVG(quiz_score) as avg_quiz_score,
        SUM(CASE WHEN certificate_issued = 1 THEN 1 ELSE 0 END) as certificates_issued
      FROM safety_education_attendance
      WHERE session_id IN (SELECT id FROM safety_education_sessions WHERE plan_id = ?)
    `).bind(planId).first();

    // Session details
    const sessions = await db.prepare(`
      SELECT
        id,
        session_number,
        session_date,
        actual_duration_hours,
        attendance_count,
        completion_rate,
        session_evaluation_score
      FROM safety_education_sessions
      WHERE plan_id = ?
      ORDER BY session_number ASC
    `).bind(planId).all();

    return c.json({
      success: true,
      data: {
        plan,
        session_stats: sessionStats,
        attendance_stats: attendanceStats,
        sessions: sessions.results
      },
      message: '교육 계획 상세 통계 조회 성공'
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      success: false,
      error: err.message
    }, 500);
  }
});

export { app as safetyEducationRoutes };
