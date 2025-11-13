/**
 * Health Examination Management API Routes
 * 건강진단 관리 API
 *
 * Implements Form 007 (Health Exam Target Registration) and Form 008 (Health Exam Results)
 * Based on 산업안전보건법 Article 129-132
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from '../index';

// Type definitions
interface HealthExamCategory {
  id: number;
  code: string;
  name_ko: string;
  name_en: string;
  description: string;
  legal_basis: string;
  is_active: number;
  display_order: number;
  created_at: string;
}

interface HealthExamTarget {
  id: number;
  employee_id: number;
  exam_category_id: number;
  exam_year: number;
  exam_due_date: string;
  exam_completed: number;
  exam_date?: string;
  exam_institution?: string;
  exam_doctor?: string;
  exam_result_grade?: string;
  follow_up_required: number;
  follow_up_details?: string;
  follow_up_completed: number;
  follow_up_date?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

interface HealthExamResult {
  id: number;
  target_id: number;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  body_fat_percent?: number;
  waist_circumference_cm?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse_rate?: number;
  vision_left?: number;
  vision_right?: number;
  hearing_left_db?: number;
  hearing_right_db?: number;
  blood_type?: string;
  hemoglobin?: number;
  fasting_glucose?: number;
  total_cholesterol?: number;
  hdl_cholesterol?: number;
  ldl_cholesterol?: number;
  triglycerides?: number;
  ast_got?: number;
  alt_gpt?: number;
  gamma_gtp?: number;
  urine_protein?: string;
  urine_glucose?: string;
  chest_xray_result?: string;
  chest_xray_findings?: string;
  ecg_result?: string;
  ecg_findings?: string;
  additional_tests?: string;
  doctor_opinion?: string;
  health_guidance?: string;
  work_fitness?: string;
  work_restrictions?: string;
  created_at: string;
  updated_at: string;
}

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /api/health-exam/categories
 * Get all health examination categories
 */
app.get('/categories', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;

    const result = await db
      .prepare('SELECT * FROM health_exam_categories WHERE is_active = 1 ORDER BY display_order')
      .all<HealthExamCategory>();

    return c.json({
      success: true,
      data: result.results,
      count: result.results?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching health exam categories:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
});

/**
 * POST /api/health-exam/targets
 * Create a new health examination target
 */
app.post('/targets', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const body = await c.req.json();

    // Validate required fields
    const required = ['employee_id', 'exam_category_id', 'exam_year', 'exam_due_date'];
    for (const field of required) {
      if (!body[field]) {
        return c.json(
          {
            success: false,
            error: `Missing required field: ${field}`,
          },
          400
        );
      }
    }

    // Get user ID from auth header (simplified - in production use JWT)
    const authHeader = c.req.header('Authorization');
    const userId = authHeader ? parseInt(authHeader.replace('Bearer ', '')) : 1;

    const result = await db
      .prepare(
        `INSERT INTO health_exam_targets (
          employee_id, exam_category_id, exam_year, exam_due_date,
          exam_completed, exam_institution, exam_doctor, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        body.employee_id,
        body.exam_category_id,
        body.exam_year,
        body.exam_due_date,
        body.exam_completed || 0,
        body.exam_institution || null,
        body.exam_doctor || null,
        body.notes || null,
        userId
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to create health exam target');
    }

    // Get the created record
    const created = await db
      .prepare('SELECT * FROM health_exam_targets WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<HealthExamTarget>();

    return c.json(
      {
        success: true,
        data: created,
        message: '건강진단 대상자가 등록되었습니다.',
      },
      201
    );
  } catch (error) {
    console.error('Error creating health exam target:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
});

/**
 * GET /api/health-exam/targets
 * List health examination targets with optional filters
 */
app.get('/targets', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const { employee_id, exam_year, exam_category_id, exam_completed, page = '1', limit = '50' } = c.req.query();

    let query = `
      SELECT
        t.*,
        u.username as employee_name,
        u.email as employee_email,
        c.name_ko as exam_category_name
      FROM health_exam_targets t
      LEFT JOIN users u ON t.employee_id = u.id
      LEFT JOIN health_exam_categories c ON t.exam_category_id = c.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (employee_id) {
      query += ' AND t.employee_id = ?';
      params.push(parseInt(employee_id));
    }

    if (exam_year) {
      query += ' AND t.exam_year = ?';
      params.push(parseInt(exam_year));
    }

    if (exam_category_id) {
      query += ' AND t.exam_category_id = ?';
      params.push(parseInt(exam_category_id));
    }

    if (exam_completed !== undefined) {
      query += ' AND t.exam_completed = ?';
      params.push(parseInt(exam_completed));
    }

    query += ' ORDER BY t.exam_due_date DESC, t.created_at DESC';

    // Add pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const result = await db.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM health_exam_targets t WHERE 1=1';
    const countParams: (string | number)[] = [];

    if (employee_id) {
      countQuery += ' AND t.employee_id = ?';
      countParams.push(parseInt(employee_id));
    }

    if (exam_year) {
      countQuery += ' AND t.exam_year = ?';
      countParams.push(parseInt(exam_year));
    }

    if (exam_category_id) {
      countQuery += ' AND t.exam_category_id = ?';
      countParams.push(parseInt(exam_category_id));
    }

    if (exam_completed !== undefined) {
      countQuery += ' AND t.exam_completed = ?';
      countParams.push(parseInt(exam_completed));
    }

    const countResult = await db.prepare(countQuery).bind(...countParams).first<{ total: number }>();

    return c.json({
      success: true,
      data: result.results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult?.total || 0,
        total_pages: Math.ceil((countResult?.total || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching health exam targets:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
});

/**
 * GET /api/health-exam/targets/:id
 * Get a single health examination target by ID
 */
app.get('/targets/:id', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const { id } = c.req.param();

    const result = await db
      .prepare(
        `SELECT
          t.*,
          u.username as employee_name,
          u.email as employee_email,
          u.employee_id as employee_number,
          c.name_ko as exam_category_name,
          c.code as exam_category_code
        FROM health_exam_targets t
        LEFT JOIN users u ON t.employee_id = u.id
        LEFT JOIN health_exam_categories c ON t.exam_category_id = c.id
        WHERE t.id = ?`
      )
      .bind(id)
      .first();

    if (!result) {
      return c.json(
        {
          success: false,
          error: 'Health exam target not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching health exam target:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
});

/**
 * PUT /api/health-exam/targets/:id
 * Update a health examination target
 */
app.put('/targets/:id', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const { id } = c.req.param();
    const body = await c.req.json();

    // Check if target exists
    const existing = await db
      .prepare('SELECT * FROM health_exam_targets WHERE id = ?')
      .bind(id)
      .first<HealthExamTarget>();

    if (!existing) {
      return c.json(
        {
          success: false,
          error: 'Health exam target not found',
        },
        404
      );
    }

    const result = await db
      .prepare(
        `UPDATE health_exam_targets SET
          exam_completed = ?,
          exam_date = ?,
          exam_institution = ?,
          exam_doctor = ?,
          exam_result_grade = ?,
          follow_up_required = ?,
          follow_up_details = ?,
          follow_up_completed = ?,
          follow_up_date = ?,
          notes = ?,
          updated_at = datetime('now')
        WHERE id = ?`
      )
      .bind(
        body.exam_completed ?? existing.exam_completed,
        body.exam_date || existing.exam_date || null,
        body.exam_institution || existing.exam_institution || null,
        body.exam_doctor || existing.exam_doctor || null,
        body.exam_result_grade || existing.exam_result_grade || null,
        body.follow_up_required ?? existing.follow_up_required,
        body.follow_up_details || existing.follow_up_details || null,
        body.follow_up_completed ?? existing.follow_up_completed,
        body.follow_up_date || existing.follow_up_date || null,
        body.notes || existing.notes || null,
        id
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to update health exam target');
    }

    // Get updated record
    const updated = await db
      .prepare('SELECT * FROM health_exam_targets WHERE id = ?')
      .bind(id)
      .first<HealthExamTarget>();

    return c.json({
      success: true,
      data: updated,
      message: '건강진단 대상자 정보가 업데이트되었습니다.',
    });
  } catch (error) {
    console.error('Error updating health exam target:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
});

/**
 * DELETE /api/health-exam/targets/:id
 * Delete a health examination target (soft delete by setting exam_completed = -1)
 */
app.delete('/targets/:id', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const { id } = c.req.param();

    // Check if target exists
    const existing = await db
      .prepare('SELECT * FROM health_exam_targets WHERE id = ?')
      .bind(id)
      .first<HealthExamTarget>();

    if (!existing) {
      return c.json(
        {
          success: false,
          error: 'Health exam target not found',
        },
        404
      );
    }

    // Soft delete: set exam_completed to -1
    const result = await db
      .prepare(
        `UPDATE health_exam_targets SET
          exam_completed = -1,
          updated_at = datetime('now')
        WHERE id = ?`
      )
      .bind(id)
      .run();

    if (!result.success) {
      throw new Error('Failed to delete health exam target');
    }

    return c.json({
      success: true,
      message: '건강진단 대상자가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Error deleting health exam target:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
});

/**
 * POST /api/health-exam/results
 * Create or update health examination results
 */
app.post('/results', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const body = await c.req.json();

    // Validate required field
    if (!body.target_id) {
      return c.json(
        {
          success: false,
          error: 'Missing required field: target_id',
        },
        400
      );
    }

    // Check if target exists
    const target = await db
      .prepare('SELECT * FROM health_exam_targets WHERE id = ?')
      .bind(body.target_id)
      .first<HealthExamTarget>();

    if (!target) {
      return c.json(
        {
          success: false,
          error: 'Health exam target not found',
        },
        404
      );
    }

    // Check if result already exists
    const existingResult = await db
      .prepare('SELECT * FROM health_exam_results WHERE target_id = ?')
      .bind(body.target_id)
      .first<HealthExamResult>();

    let result;

    if (existingResult) {
      // Update existing result
      result = await db
        .prepare(
          `UPDATE health_exam_results SET
            height_cm = ?, weight_kg = ?, bmi = ?, body_fat_percent = ?, waist_circumference_cm = ?,
            blood_pressure_systolic = ?, blood_pressure_diastolic = ?, pulse_rate = ?,
            vision_left = ?, vision_right = ?, hearing_left_db = ?, hearing_right_db = ?,
            blood_type = ?, hemoglobin = ?, fasting_glucose = ?,
            total_cholesterol = ?, hdl_cholesterol = ?, ldl_cholesterol = ?, triglycerides = ?,
            ast_got = ?, alt_gpt = ?, gamma_gtp = ?,
            urine_protein = ?, urine_glucose = ?,
            chest_xray_result = ?, chest_xray_findings = ?,
            ecg_result = ?, ecg_findings = ?,
            additional_tests = ?,
            doctor_opinion = ?, health_guidance = ?, work_fitness = ?, work_restrictions = ?,
            updated_at = datetime('now')
          WHERE target_id = ?`
        )
        .bind(
          body.height_cm || null,
          body.weight_kg || null,
          body.bmi || null,
          body.body_fat_percent || null,
          body.waist_circumference_cm || null,
          body.blood_pressure_systolic || null,
          body.blood_pressure_diastolic || null,
          body.pulse_rate || null,
          body.vision_left || null,
          body.vision_right || null,
          body.hearing_left_db || null,
          body.hearing_right_db || null,
          body.blood_type || null,
          body.hemoglobin || null,
          body.fasting_glucose || null,
          body.total_cholesterol || null,
          body.hdl_cholesterol || null,
          body.ldl_cholesterol || null,
          body.triglycerides || null,
          body.ast_got || null,
          body.alt_gpt || null,
          body.gamma_gtp || null,
          body.urine_protein || null,
          body.urine_glucose || null,
          body.chest_xray_result || null,
          body.chest_xray_findings || null,
          body.ecg_result || null,
          body.ecg_findings || null,
          body.additional_tests || null,
          body.doctor_opinion || null,
          body.health_guidance || null,
          body.work_fitness || null,
          body.work_restrictions || null,
          body.target_id
        )
        .run();

      const updated = await db
        .prepare('SELECT * FROM health_exam_results WHERE target_id = ?')
        .bind(body.target_id)
        .first<HealthExamResult>();

      return c.json({
        success: true,
        data: updated,
        message: '건강진단 결과가 업데이트되었습니다.',
      });
    } else {
      // Create new result
      result = await db
        .prepare(
          `INSERT INTO health_exam_results (
            target_id, height_cm, weight_kg, bmi, body_fat_percent, waist_circumference_cm,
            blood_pressure_systolic, blood_pressure_diastolic, pulse_rate,
            vision_left, vision_right, hearing_left_db, hearing_right_db,
            blood_type, hemoglobin, fasting_glucose,
            total_cholesterol, hdl_cholesterol, ldl_cholesterol, triglycerides,
            ast_got, alt_gpt, gamma_gtp,
            urine_protein, urine_glucose,
            chest_xray_result, chest_xray_findings,
            ecg_result, ecg_findings,
            additional_tests,
            doctor_opinion, health_guidance, work_fitness, work_restrictions
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          body.target_id,
          body.height_cm || null,
          body.weight_kg || null,
          body.bmi || null,
          body.body_fat_percent || null,
          body.waist_circumference_cm || null,
          body.blood_pressure_systolic || null,
          body.blood_pressure_diastolic || null,
          body.pulse_rate || null,
          body.vision_left || null,
          body.vision_right || null,
          body.hearing_left_db || null,
          body.hearing_right_db || null,
          body.blood_type || null,
          body.hemoglobin || null,
          body.fasting_glucose || null,
          body.total_cholesterol || null,
          body.hdl_cholesterol || null,
          body.ldl_cholesterol || null,
          body.triglycerides || null,
          body.ast_got || null,
          body.alt_gpt || null,
          body.gamma_gtp || null,
          body.urine_protein || null,
          body.urine_glucose || null,
          body.chest_xray_result || null,
          body.chest_xray_findings || null,
          body.ecg_result || null,
          body.ecg_findings || null,
          body.additional_tests || null,
          body.doctor_opinion || null,
          body.health_guidance || null,
          body.work_fitness || null,
          body.work_restrictions || null
        )
        .run();

      if (!result.success) {
        throw new Error('Failed to create health exam result');
      }

      const created = await db
        .prepare('SELECT * FROM health_exam_results WHERE id = ?')
        .bind(result.meta.last_row_id)
        .first<HealthExamResult>();

      return c.json(
        {
          success: true,
          data: created,
          message: '건강진단 결과가 등록되었습니다.',
        },
        201
      );
    }
  } catch (error) {
    console.error('Error creating/updating health exam result:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
});

/**
 * GET /api/health-exam/results/:targetId
 * Get health examination result by target ID
 */
app.get('/results/:targetId', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const { targetId } = c.req.param();

    const result = await db
      .prepare(
        `SELECT
          r.*,
          t.employee_id,
          t.exam_year,
          t.exam_date,
          t.exam_institution,
          t.exam_doctor,
          u.username as employee_name,
          u.email as employee_email
        FROM health_exam_results r
        LEFT JOIN health_exam_targets t ON r.target_id = t.id
        LEFT JOIN users u ON t.employee_id = u.id
        WHERE r.target_id = ?`
      )
      .bind(targetId)
      .first();

    if (!result) {
      return c.json(
        {
          success: false,
          error: 'Health exam result not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching health exam result:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
});

/**
 * GET /api/health-exam/stats
 * Get health examination statistics
 */
app.get('/stats', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const { year } = c.req.query();

    let yearFilter = '';
    const params: (string | number)[] = [];

    if (year) {
      yearFilter = 'WHERE exam_year = ?';
      params.push(parseInt(year));
    }

    // Overall statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_targets,
        SUM(CASE WHEN exam_completed = 1 THEN 1 ELSE 0 END) as completed_exams,
        SUM(CASE WHEN exam_completed = 0 AND exam_due_date < date('now') THEN 1 ELSE 0 END) as overdue_exams,
        SUM(CASE WHEN follow_up_required = 1 AND follow_up_completed = 0 THEN 1 ELSE 0 END) as pending_followups
      FROM health_exam_targets
      ${yearFilter}
    `;

    const stats = await db.prepare(statsQuery).bind(...params).first();

    // By category
    const categoryQuery = `
      SELECT
        c.name_ko as category,
        COUNT(*) as total,
        SUM(CASE WHEN t.exam_completed = 1 THEN 1 ELSE 0 END) as completed
      FROM health_exam_targets t
      LEFT JOIN health_exam_categories c ON t.exam_category_id = c.id
      ${yearFilter}
      GROUP BY c.name_ko
    `;

    const categoryStats = await db.prepare(categoryQuery).bind(...params).all();

    return c.json({
      success: true,
      data: {
        overall: stats,
        by_category: categoryStats.results,
      },
    });
  } catch (error) {
    console.error('Error fetching health exam stats:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      500
    );
  }
});

export { app as healthExamRoutes };
