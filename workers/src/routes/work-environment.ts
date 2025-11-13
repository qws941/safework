/**
 * Work Environment Measurement Routes (작업환경측정)
 * Forms 009-010 Implementation
 *
 * Legal Basis: 산업안전보건법 Article 125 (Work Environment Measurement)
 *
 * @file work-environment.ts
 * @description API endpoints for work environment measurement management
 * @created 2025-11-14
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from '../index';

// ============================================
// Type Definitions
// ============================================

interface HazardFactor {
  id: number;
  code: string;
  category: string;
  name_ko: string;
  name_en: string;
  cas_no?: string;
  exposure_limit?: number;
  exposure_limit_unit?: string;
  measurement_method?: string;
  legal_basis?: string;
  health_effects?: string;
  is_active: number;
  display_order: number;
  created_at: string;
}

interface WorkEnvironmentMeasurementPlan {
  id: number;
  plan_year: number;
  plan_title: string;
  measurement_type: string;
  scheduled_date: string;
  scheduled_completion_date?: string;
  measurement_institution?: string;
  measurement_agency_license?: string;
  target_workplace?: string;
  target_processes?: string;
  target_hazard_factors?: string;
  plan_status: string;
  actual_measurement_date?: string;
  completion_date?: string;
  total_sampling_points: number;
  compliant_points: number;
  non_compliant_points: number;
  plan_document_url?: string;
  report_document_url?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

interface WorkEnvironmentMeasurement {
  id: number;
  plan_id: number;
  sampling_point_id: string;
  workplace_name: string;
  process_name: string;
  work_description?: string;
  hazard_factor_id: number;
  measurement_date: string;
  measurement_time_start?: string;
  measurement_time_end?: string;
  measurement_duration_minutes?: number;
  temperature_celsius?: number;
  humidity_percent?: number;
  atmospheric_pressure_hpa?: number;
  sampling_method?: string;
  sampling_device?: string;
  flow_rate_lpm?: number;
  sample_volume_liters?: number;
  analysis_method?: string;
  analysis_date?: string;
  analysis_institution?: string;
  measured_value: number;
  measured_unit: string;
  exposure_limit?: number;
  exposure_limit_unit?: string;
  exposure_ratio?: number;
  compliance_status: string;
  exposed_workers_count?: number;
  exposure_duration_hours?: number;
  improvement_measures?: string;
  follow_up_required: number;
  follow_up_notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Initialize Hono App
// ============================================

const app = new Hono<{ Bindings: Env }>();

// ============================================
// Hazard Factors Endpoints
// ============================================

/**
 * GET /api/work-environment/hazard-factors
 * List all hazard factors
 *
 * Query params:
 *   - category: Filter by category (chemical/physical/biological/dust)
 *   - active_only: Show only active factors (default: 1)
 */
app.get('/hazard-factors', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const category = c.req.query('category');
    const activeOnly = c.req.query('active_only') !== '0';

    let query = 'SELECT * FROM hazard_factors WHERE 1=1';
    const params: (string | number)[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (activeOnly) {
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY category, display_order';

    const stmt = params.length > 0
      ? db.prepare(query).bind(...params)
      : db.prepare(query);

    const result = await stmt.all<HazardFactor>();

    return c.json({
      success: true,
      data: result.results,
      count: result.results?.length || 0
    });
  } catch (error) {
    console.error('Error fetching hazard factors:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch hazard factors'
    }, 500);
  }
});

/**
 * GET /api/work-environment/hazard-factors/:id
 * Get single hazard factor details
 */
app.get('/hazard-factors/:id', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const id = c.req.param('id');

    const result = await db
      .prepare('SELECT * FROM hazard_factors WHERE id = ?')
      .bind(id)
      .first<HazardFactor>();

    if (!result) {
      return c.json({
        success: false,
        error: '유해인자를 찾을 수 없습니다.'
      }, 404);
    }

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching hazard factor:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch hazard factor'
    }, 500);
  }
});

// ============================================
// Measurement Plans Endpoints (Form 009)
// ============================================

/**
 * POST /api/work-environment/plans
 * Create new measurement plan (Form 009)
 */
app.post('/plans', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const body = await c.req.json();

    // Validation
    const requiredFields = ['plan_year', 'plan_title', 'measurement_type', 'scheduled_date'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return c.json({
          success: false,
          error: `필수 필드가 누락되었습니다: ${field}`
        }, 400);
      }
    }

    // Convert arrays to JSON strings if provided
    const targetProcesses = body.target_processes
      ? (Array.isArray(body.target_processes) ? JSON.stringify(body.target_processes) : body.target_processes)
      : null;

    const targetHazardFactors = body.target_hazard_factors
      ? (Array.isArray(body.target_hazard_factors) ? JSON.stringify(body.target_hazard_factors) : body.target_hazard_factors)
      : null;

    // Insert plan
    const _result = await db.prepare(`
      INSERT INTO work_environment_measurement_plans (
        plan_year, plan_title, measurement_type, scheduled_date,
        scheduled_completion_date, measurement_institution, measurement_agency_license,
        target_workplace, target_processes, target_hazard_factors,
        plan_status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.plan_year,
      body.plan_title,
      body.measurement_type,
      body.scheduled_date,
      body.scheduled_completion_date || null,
      body.measurement_institution || null,
      body.measurement_agency_license || null,
      body.target_workplace || null,
      targetProcesses,
      targetHazardFactors,
      body.plan_status || 'planned',
      body.notes || null,
      body.created_by || null
    ).run();

    // Get created plan
    const createdPlan = await db
      .prepare('SELECT * FROM work_environment_measurement_plans WHERE id = last_insert_rowid()')
      .first<WorkEnvironmentMeasurementPlan>();

    return c.json({
      success: true,
      data: createdPlan,
      message: '작업환경측정 계획이 등록되었습니다.'
    }, 201);
  } catch (error) {
    console.error('Error creating measurement plan:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create measurement plan'
    }, 500);
  }
});

/**
 * GET /api/work-environment/plans
 * List measurement plans with filters
 *
 * Query params:
 *   - plan_year: Filter by year
 *   - measurement_type: Filter by type (regular/special/complaint)
 *   - plan_status: Filter by status (planned/in_progress/completed/cancelled)
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 50)
 */
app.get('/plans', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const planYear = c.req.query('plan_year');
    const measurementType = c.req.query('measurement_type');
    const planStatus = c.req.query('plan_status');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query
    let query = 'SELECT * FROM work_environment_measurement_plans WHERE 1=1';
    const params: (string | number)[] = [];

    if (planYear) {
      query += ' AND plan_year = ?';
      params.push(planYear);
    }

    if (measurementType) {
      query += ' AND measurement_type = ?';
      params.push(measurementType);
    }

    if (planStatus) {
      query += ' AND plan_status = ?';
      params.push(planStatus);
    }

    // Count total
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countStmt = params.length > 0
      ? db.prepare(countQuery).bind(...params)
      : db.prepare(countQuery);
    const countResult = await countStmt.first<{ count: number }>();
    const total = countResult?.count || 0;

    // Get paginated results
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query).bind(...params);
    const result = await stmt.all<WorkEnvironmentMeasurementPlan>();

    return c.json({
      success: true,
      data: result.results,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching measurement plans:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch measurement plans'
    }, 500);
  }
});

/**
 * GET /api/work-environment/plans/:id
 * Get single measurement plan details
 */
app.get('/plans/:id', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const id = c.req.param('id');

    const result = await db
      .prepare('SELECT * FROM work_environment_measurement_plans WHERE id = ?')
      .bind(id)
      .first<WorkEnvironmentMeasurementPlan>();

    if (!result) {
      return c.json({
        success: false,
        error: '측정 계획을 찾을 수 없습니다.'
      }, 404);
    }

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching measurement plan:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch measurement plan'
    }, 500);
  }
});

/**
 * PUT /api/work-environment/plans/:id
 * Update measurement plan
 */
app.put('/plans/:id', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const id = c.req.param('id');
    const body = await c.req.json();

    // Check if plan exists
    const existingPlan = await db
      .prepare('SELECT * FROM work_environment_measurement_plans WHERE id = ?')
      .bind(id)
      .first<WorkEnvironmentMeasurementPlan>();

    if (!existingPlan) {
      return c.json({
        success: false,
        error: '측정 계획을 찾을 수 없습니다.'
      }, 404);
    }

    // Convert arrays to JSON strings if provided
    const targetProcesses = body.target_processes
      ? (Array.isArray(body.target_processes) ? JSON.stringify(body.target_processes) : body.target_processes)
      : undefined;

    const targetHazardFactors = body.target_hazard_factors
      ? (Array.isArray(body.target_hazard_factors) ? JSON.stringify(body.target_hazard_factors) : body.target_hazard_factors)
      : undefined;

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    const allowedFields = [
      'plan_year', 'plan_title', 'measurement_type', 'scheduled_date',
      'scheduled_completion_date', 'measurement_institution', 'measurement_agency_license',
      'target_workplace', 'plan_status', 'actual_measurement_date', 'completion_date',
      'total_sampling_points', 'compliant_points', 'non_compliant_points',
      'plan_document_url', 'report_document_url', 'notes'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(body[field]);
      }
    }

    // Handle JSON fields separately
    if (targetProcesses !== undefined) {
      updates.push('target_processes = ?');
      params.push(targetProcesses);
    }

    if (targetHazardFactors !== undefined) {
      updates.push('target_hazard_factors = ?');
      params.push(targetHazardFactors);
    }

    if (updates.length === 0) {
      return c.json({
        success: false,
        error: '업데이트할 필드가 없습니다.'
      }, 400);
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(id);

    await db.prepare(`
      UPDATE work_environment_measurement_plans
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    // Get updated plan
    const updatedPlan = await db
      .prepare('SELECT * FROM work_environment_measurement_plans WHERE id = ?')
      .bind(id)
      .first<WorkEnvironmentMeasurementPlan>();

    return c.json({
      success: true,
      data: updatedPlan,
      message: '측정 계획이 수정되었습니다.'
    });
  } catch (error) {
    console.error('Error updating measurement plan:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update measurement plan'
    }, 500);
  }
});

/**
 * DELETE /api/work-environment/plans/:id
 * Delete measurement plan (soft delete)
 */
app.delete('/plans/:id', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const id = c.req.param('id');

    // Check if plan exists
    const existingPlan = await db
      .prepare('SELECT * FROM work_environment_measurement_plans WHERE id = ?')
      .bind(id)
      .first<WorkEnvironmentMeasurementPlan>();

    if (!existingPlan) {
      return c.json({
        success: false,
        error: '측정 계획을 찾을 수 없습니다.'
      }, 404);
    }

    // Soft delete by setting status to cancelled
    await db.prepare(`
      UPDATE work_environment_measurement_plans
      SET plan_status = 'cancelled', updated_at = datetime('now')
      WHERE id = ?
    `).bind(id).run();

    return c.json({
      success: true,
      message: '측정 계획이 취소되었습니다.'
    });
  } catch (error) {
    console.error('Error deleting measurement plan:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete measurement plan'
    }, 500);
  }
});

// ============================================
// Measurements Endpoints (Form 010)
// ============================================

/**
 * POST /api/work-environment/measurements
 * Create new measurement result (Form 010)
 */
app.post('/measurements', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const body = await c.req.json();

    // Validation
    const requiredFields = [
      'plan_id', 'sampling_point_id', 'workplace_name', 'process_name',
      'hazard_factor_id', 'measurement_date', 'measured_value', 'measured_unit',
      'compliance_status'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return c.json({
          success: false,
          error: `필수 필드가 누락되었습니다: ${field}`
        }, 400);
      }
    }

    // Calculate exposure ratio if limits are provided
    let exposureRatio = body.exposure_ratio;
    if (body.exposure_limit && body.measured_value) {
      exposureRatio = (body.measured_value / body.exposure_limit) * 100;
    }

    // Insert measurement
    const _result = await db.prepare(`
      INSERT INTO work_environment_measurements (
        plan_id, sampling_point_id, workplace_name, process_name, work_description,
        hazard_factor_id, measurement_date, measurement_time_start, measurement_time_end,
        measurement_duration_minutes, temperature_celsius, humidity_percent,
        atmospheric_pressure_hpa, sampling_method, sampling_device, flow_rate_lpm,
        sample_volume_liters, analysis_method, analysis_date, analysis_institution,
        measured_value, measured_unit, exposure_limit, exposure_limit_unit,
        exposure_ratio, compliance_status, exposed_workers_count, exposure_duration_hours,
        improvement_measures, follow_up_required, follow_up_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.plan_id,
      body.sampling_point_id,
      body.workplace_name,
      body.process_name,
      body.work_description || null,
      body.hazard_factor_id,
      body.measurement_date,
      body.measurement_time_start || null,
      body.measurement_time_end || null,
      body.measurement_duration_minutes || null,
      body.temperature_celsius || null,
      body.humidity_percent || null,
      body.atmospheric_pressure_hpa || null,
      body.sampling_method || null,
      body.sampling_device || null,
      body.flow_rate_lpm || null,
      body.sample_volume_liters || null,
      body.analysis_method || null,
      body.analysis_date || null,
      body.analysis_institution || null,
      body.measured_value,
      body.measured_unit,
      body.exposure_limit || null,
      body.exposure_limit_unit || null,
      exposureRatio || null,
      body.compliance_status,
      body.exposed_workers_count || null,
      body.exposure_duration_hours || null,
      body.improvement_measures || null,
      body.follow_up_required || 0,
      body.follow_up_notes || null
    ).run();

    // Get created measurement with hazard factor details
    const createdMeasurement = await db.prepare(`
      SELECT m.*, h.name_ko as hazard_name, h.name_en as hazard_name_en
      FROM work_environment_measurements m
      LEFT JOIN hazard_factors h ON m.hazard_factor_id = h.id
      WHERE m.id = last_insert_rowid()
    `).first<WorkEnvironmentMeasurement>();

    // Update plan statistics
    await updatePlanStatistics(db, body.plan_id);

    return c.json({
      success: true,
      data: createdMeasurement,
      message: '측정 결과가 등록되었습니다.'
    }, 201);
  } catch (error) {
    console.error('Error creating measurement:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create measurement'
    }, 500);
  }
});

/**
 * GET /api/work-environment/measurements/:planId
 * List measurements for a specific plan
 */
app.get('/measurements/:planId', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const planId = c.req.param('planId');

    const result = await db.prepare(`
      SELECT m.*, h.name_ko as hazard_name, h.name_en as hazard_name_en,
             h.category as hazard_category
      FROM work_environment_measurements m
      LEFT JOIN hazard_factors h ON m.hazard_factor_id = h.id
      WHERE m.plan_id = ?
      ORDER BY m.sampling_point_id, m.measurement_date DESC
    `).bind(planId).all<WorkEnvironmentMeasurement>();

    return c.json({
      success: true,
      data: result.results,
      count: result.results?.length || 0
    });
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch measurements'
    }, 500);
  }
});

/**
 * GET /api/work-environment/measurements/detail/:id
 * Get single measurement details
 */
app.get('/measurements/detail/:id', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const id = c.req.param('id');

    const result = await db.prepare(`
      SELECT m.*, h.name_ko as hazard_name, h.name_en as hazard_name_en,
             h.category as hazard_category, h.cas_no
      FROM work_environment_measurements m
      LEFT JOIN hazard_factors h ON m.hazard_factor_id = h.id
      WHERE m.id = ?
    `).bind(id).first<WorkEnvironmentMeasurement>();

    if (!result) {
      return c.json({
        success: false,
        error: '측정 결과를 찾을 수 없습니다.'
      }, 404);
    }

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching measurement:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch measurement'
    }, 500);
  }
});

/**
 * PUT /api/work-environment/measurements/:id
 * Update measurement result
 */
app.put('/measurements/:id', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const id = c.req.param('id');
    const body = await c.req.json();

    // Check if measurement exists
    const existingMeasurement = await db
      .prepare('SELECT * FROM work_environment_measurements WHERE id = ?')
      .bind(id)
      .first<WorkEnvironmentMeasurement>();

    if (!existingMeasurement) {
      return c.json({
        success: false,
        error: '측정 결과를 찾을 수 없습니다.'
      }, 404);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    const allowedFields = [
      'sampling_point_id', 'workplace_name', 'process_name', 'work_description',
      'hazard_factor_id', 'measurement_date', 'measurement_time_start', 'measurement_time_end',
      'measurement_duration_minutes', 'temperature_celsius', 'humidity_percent',
      'atmospheric_pressure_hpa', 'sampling_method', 'sampling_device', 'flow_rate_lpm',
      'sample_volume_liters', 'analysis_method', 'analysis_date', 'analysis_institution',
      'measured_value', 'measured_unit', 'exposure_limit', 'exposure_limit_unit',
      'compliance_status', 'exposed_workers_count', 'exposure_duration_hours',
      'improvement_measures', 'follow_up_required', 'follow_up_notes'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(body[field]);
      }
    }

    // Recalculate exposure ratio if relevant fields changed
    if (body.measured_value !== undefined || body.exposure_limit !== undefined) {
      const measuredValue = body.measured_value ?? existingMeasurement.measured_value;
      const exposureLimit = body.exposure_limit ?? existingMeasurement.exposure_limit;

      if (measuredValue && exposureLimit) {
        const exposureRatio = (measuredValue / exposureLimit) * 100;
        updates.push('exposure_ratio = ?');
        params.push(exposureRatio);
      }
    }

    if (updates.length === 0) {
      return c.json({
        success: false,
        error: '업데이트할 필드가 없습니다.'
      }, 400);
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(id);

    await db.prepare(`
      UPDATE work_environment_measurements
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    // Get updated measurement
    const updatedMeasurement = await db.prepare(`
      SELECT m.*, h.name_ko as hazard_name, h.name_en as hazard_name_en
      FROM work_environment_measurements m
      LEFT JOIN hazard_factors h ON m.hazard_factor_id = h.id
      WHERE m.id = ?
    `).bind(id).first<WorkEnvironmentMeasurement>();

    // Update plan statistics
    await updatePlanStatistics(db, existingMeasurement.plan_id);

    return c.json({
      success: true,
      data: updatedMeasurement,
      message: '측정 결과가 수정되었습니다.'
    });
  } catch (error) {
    console.error('Error updating measurement:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update measurement'
    }, 500);
  }
});

/**
 * DELETE /api/work-environment/measurements/:id
 * Delete measurement result
 */
app.delete('/measurements/:id', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const id = c.req.param('id');

    // Check if measurement exists
    const existingMeasurement = await db
      .prepare('SELECT * FROM work_environment_measurements WHERE id = ?')
      .bind(id)
      .first<WorkEnvironmentMeasurement>();

    if (!existingMeasurement) {
      return c.json({
        success: false,
        error: '측정 결과를 찾을 수 없습니다.'
      }, 404);
    }

    // Hard delete (as measurements are actual data records)
    await db.prepare('DELETE FROM work_environment_measurements WHERE id = ?')
      .bind(id)
      .run();

    // Update plan statistics
    await updatePlanStatistics(db, existingMeasurement.plan_id);

    return c.json({
      success: true,
      message: '측정 결과가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Error deleting measurement:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete measurement'
    }, 500);
  }
});

// ============================================
// Statistics Endpoints
// ============================================

/**
 * GET /api/work-environment/stats
 * Get overall statistics
 *
 * Query params:
 *   - year: Filter by year (optional)
 */
app.get('/stats', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const year = c.req.query('year');

    let yearFilter = '';
    const params: (string | number)[] = [];

    if (year) {
      yearFilter = 'WHERE plan_year = ?';
      params.push(year);
    }

    // Plan statistics
    const planStats = await db.prepare(`
      SELECT
        COUNT(*) as total_plans,
        SUM(CASE WHEN plan_status = 'completed' THEN 1 ELSE 0 END) as completed_plans,
        SUM(CASE WHEN plan_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_plans,
        SUM(CASE WHEN plan_status = 'planned' THEN 1 ELSE 0 END) as planned_plans,
        SUM(total_sampling_points) as total_sampling_points,
        SUM(compliant_points) as total_compliant_points,
        SUM(non_compliant_points) as total_non_compliant_points
      FROM work_environment_measurement_plans
      ${yearFilter}
    `).bind(...params).first();

    // Measurement statistics
    const measurementStats = await db.prepare(`
      SELECT
        COUNT(*) as total_measurements,
        SUM(CASE WHEN compliance_status = 'compliant' THEN 1 ELSE 0 END) as compliant_measurements,
        SUM(CASE WHEN compliance_status = 'non_compliant' THEN 1 ELSE 0 END) as non_compliant_measurements,
        SUM(CASE WHEN compliance_status = 'over_action_level' THEN 1 ELSE 0 END) as over_action_level_measurements
      FROM work_environment_measurements m
      JOIN work_environment_measurement_plans p ON m.plan_id = p.id
      ${yearFilter}
    `).bind(...params).first();

    // Compliance rate by hazard category
    const categoryCompliance = await db.prepare(`
      SELECT
        h.category,
        COUNT(*) as total,
        SUM(CASE WHEN m.compliance_status = 'compliant' THEN 1 ELSE 0 END) as compliant,
        ROUND(CAST(SUM(CASE WHEN m.compliance_status = 'compliant' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2) as compliance_rate
      FROM work_environment_measurements m
      JOIN hazard_factors h ON m.hazard_factor_id = h.id
      JOIN work_environment_measurement_plans p ON m.plan_id = p.id
      ${yearFilter}
      GROUP BY h.category
    `).bind(...params).all();

    return c.json({
      success: true,
      data: {
        plans: planStats,
        measurements: measurementStats,
        category_compliance: categoryCompliance.results
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics'
    }, 500);
  }
});

/**
 * GET /api/work-environment/stats/plan/:planId
 * Get statistics for a specific plan
 */
app.get('/stats/plan/:planId', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = c.env.PRIMARY_DB;
    const planId = c.req.param('planId');

    // Plan details
    const plan = await db
      .prepare('SELECT * FROM work_environment_measurement_plans WHERE id = ?')
      .bind(planId)
      .first<WorkEnvironmentMeasurementPlan>();

    if (!plan) {
      return c.json({
        success: false,
        error: '측정 계획을 찾을 수 없습니다.'
      }, 404);
    }

    // Measurement statistics for this plan
    const measurementStats = await db.prepare(`
      SELECT
        COUNT(*) as total_measurements,
        SUM(CASE WHEN compliance_status = 'compliant' THEN 1 ELSE 0 END) as compliant,
        SUM(CASE WHEN compliance_status = 'non_compliant' THEN 1 ELSE 0 END) as non_compliant,
        SUM(CASE WHEN compliance_status = 'over_action_level' THEN 1 ELSE 0 END) as over_action_level
      FROM work_environment_measurements
      WHERE plan_id = ?
    `).bind(planId).first();

    // By hazard factor
    const byHazardFactor = await db.prepare(`
      SELECT
        h.name_ko as hazard_name,
        h.category,
        COUNT(*) as measurement_count,
        SUM(CASE WHEN m.compliance_status = 'compliant' THEN 1 ELSE 0 END) as compliant,
        SUM(CASE WHEN m.compliance_status = 'non_compliant' THEN 1 ELSE 0 END) as non_compliant
      FROM work_environment_measurements m
      JOIN hazard_factors h ON m.hazard_factor_id = h.id
      WHERE m.plan_id = ?
      GROUP BY h.id, h.name_ko, h.category
    `).bind(planId).all();

    return c.json({
      success: true,
      data: {
        plan,
        measurements: measurementStats,
        by_hazard_factor: byHazardFactor.results
      }
    });
  } catch (error) {
    console.error('Error fetching plan statistics:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch plan statistics'
    }, 500);
  }
});

// ============================================
// Helper Functions
// ============================================

/**
 * Update plan statistics after measurements change
 */
async function updatePlanStatistics(db: D1Database, planId: number): Promise<void> {
  const stats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN compliance_status = 'compliant' THEN 1 ELSE 0 END) as compliant,
      SUM(CASE WHEN compliance_status = 'non_compliant' THEN 1 ELSE 0 END) as non_compliant
    FROM work_environment_measurements
    WHERE plan_id = ?
  `).bind(planId).first<{ total: number; compliant: number; non_compliant: number }>();

  if (stats) {
    await db.prepare(`
      UPDATE work_environment_measurement_plans
      SET total_sampling_points = ?,
          compliant_points = ?,
          non_compliant_points = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(stats.total, stats.compliant, stats.non_compliant, planId).run();
  }
}

// ============================================
// Export
// ============================================

export { app as workEnvironmentRoutes };
