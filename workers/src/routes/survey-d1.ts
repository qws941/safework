/**
 * Survey Routes - D1 Native Implementation
 * Complete migration from Flask to Cloudflare Workers with D1
 */

import { Hono } from 'hono';
import { D1Client, createD1Client } from '../db/d1-client';
import {
  Survey,
  SurveySubmissionRequest,
  SurveyResponse,
  toSurveyResponse,
  fromBoolean,
  parseJSON,
} from '../db/models';

interface SurveyEnv {
  PRIMARY_DB: D1Database;
  SAFEWORK_KV: KVNamespace;
  BACKEND_URL?: string;
  [key: string]: unknown;
}

export const surveyD1Routes = new Hono<{ Bindings: SurveyEnv }>();

/**
 * Get all survey forms metadata
 */
surveyD1Routes.get('/forms', async (c) => {
  const forms = [
    {
      id: '001_musculoskeletal_symptom_survey',
      name: '근골격계 증상조사표',
      description: '근골격계 질환 예방을 위한 증상 설문조사',
      fields: 40,
    },
    {
      id: '002_musculoskeletal_symptom_program',
      name: '근골격계부담작업 유해요인조사',
      description: '근골격계 부담작업 유해요인 조사 및 평가',
      fields: 25,
    },
  ];

  return c.json({ success: true, forms });
});

/**
 * Get specific survey form structure
 */
surveyD1Routes.get('/form/:formId', async (c) => {
  const formId = c.req.param('formId');

  try {
    // Try to get from KV first
    const formStructure = await c.env.SAFEWORK_KV.get(`form_${formId}`, 'json');

    if (!formStructure) {
      return c.json({ success: false, error: 'Form not found' }, 404);
    }

    return c.json({ success: true, form: formStructure });
  } catch (error) {
    console.error('Failed to fetch form:', error);
    return c.json({ success: false, error: 'Failed to fetch form' }, 500);
  }
});

/**
 * Submit survey response
 */
surveyD1Routes.post('/submit', async (c) => {
  try {
    // Accept both JSON and form-urlencoded
    let body: SurveySubmissionRequest;
    const contentType = c.req.header('Content-Type') || '';

    if (contentType.includes('application/json')) {
      body = await c.req.json();
    } else {
      // Handle form-urlencoded from HTML form
      const formData = await c.req.formData();
      const responses: Record<string, string> = {};

      body = {
        form_type: '001_musculoskeletal_symptom_survey',
        name: '',
        age: 0,
        gender: '',
        department: '',
      } as SurveySubmissionRequest;

      // Process each form field
      for (const [key, value] of formData.entries()) {
        const strValue = value as string;

        // Map company/process/role to their _id versions
        if (key === 'company') {
          // Extract ID from option value or use default
          body.company_id = parseInt(strValue) || null;
        } else if (key === 'process') {
          body.process_id = parseInt(strValue) || null;
        } else if (key === 'role') {
          body.role_id = parseInt(strValue) || null;
        }
        // Basic fields
        else if (key === 'name') {
          body.name = strValue;
        } else if (key === 'age') {
          body.age = parseInt(strValue);
        } else if (key === 'gender') {
          body.gender = strValue;
        } else if (key === 'department') {
          body.department = strValue;
        } else if (key === 'position') {
          body.position = strValue;
        } else if (key === 'employee_id') {
          body.employee_id = strValue;
        } else if (key === 'years_of_service') {
          body.years_of_service = parseInt(strValue);
        } else if (key === 'employee_number') {
          body.employee_number = strValue;
        } else if (key === 'work_years') {
          body.work_years = parseInt(strValue);
        } else if (key === 'work_months') {
          body.work_months = parseInt(strValue);
        } else if (key === 'has_symptoms') {
          body.has_symptoms = strValue === '예' || strValue === 'true' || strValue === '1';
        }
        // Symptom fields - collect in responses object
        else if (key.includes('_side') || key.includes('_duration') ||
                 key.includes('_severity') || key.includes('_pain') ||
                 key.includes('neck_') || key.includes('shoulder_') ||
                 key.includes('back_') || key.includes('arm_') ||
                 key.includes('hand_') || key.includes('leg_')) {
          responses[key] = strValue;
        }
      }

      // Attach responses if any
      if (Object.keys(responses).length > 0) {
        body.responses = responses;
      }
    }

    const db = createD1Client(c.env.PRIMARY_DB);

    // Get client info
    const ip_address = c.req.header('CF-Connecting-IP') || 'unknown';
    const user_agent = c.req.header('User-Agent') || 'unknown';

    // Prepare survey data
    const surveyData: Record<string, unknown> = {
      user_id: body.user_id || 1, // Default to anonymous user (id=1)
      form_type: body.form_type,
      name: body.name || null,
      department: body.department || null,
      position: body.position || null,
      employee_id: body.employee_id || null,
      gender: body.gender || null,
      age: body.age || null,
      years_of_service: body.years_of_service || null,
      employee_number: body.employee_number || null,
      work_years: body.work_years || null,
      work_months: body.work_months || null,
      has_symptoms: fromBoolean(body.has_symptoms || false),
      company_id: body.company_id || null,
      process_id: body.process_id || null,
      role_id: body.role_id || null,
      responses: body.responses ? JSON.stringify(body.responses) : null,
      data: body.data ? JSON.stringify(body.data) : null,
      symptoms_data: body.symptoms_data ? JSON.stringify(body.symptoms_data) : null,
      status: 'submitted',
      submission_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert survey
    const surveyId = await db.insert('surveys', surveyData);

    if (!surveyId) {
      throw new Error('Failed to insert survey');
    }

    // Log to audit_logs
    await db.insert('audit_logs', {
      user_id: body.user_id || 1,
      action: 'survey_submission',
      details: JSON.stringify({
        form_type: body.form_type,
        survey_id: surveyId,
        ip_address,
        user_agent,
      }),
      created_at: new Date().toISOString(),
    });

    return c.json({
      success: true,
      message: '설문이 성공적으로 제출되었습니다',
      survey_id: surveyId,
    });
  } catch (error) {
    console.error('Survey submission error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to submit survey',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Get survey responses (paginated)
 */
surveyD1Routes.get('/responses/:formType', async (c) => {
  const formType = c.req.param('formType');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const db = createD1Client(c.env.PRIMARY_DB);

    // Get surveys with related data
    const result = await db.query<Survey>(
      `
      SELECT
        s.*,
        c.name as company_name,
        p.name as process_name,
        r.title as role_title,
        u.username as submitted_by
      FROM surveys s
      LEFT JOIN companies c ON s.company_id = c.id
      LEFT JOIN processes p ON s.process_id = p.id
      LEFT JOIN roles r ON s.role_id = r.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.form_type = ?
      ORDER BY s.submission_date DESC
      LIMIT ? OFFSET ?
    `,
      formType,
      limit,
      offset
    );

    // Get total count
    const total = await db.count('surveys', 'form_type = ?', formType);

    // Convert to response format
    const responses = result.results.map(toSurveyResponse);

    return c.json({
      success: true,
      responses,
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    });
  } catch (error) {
    console.error('Failed to fetch responses:', error);
    return c.json({ success: false, error: 'Failed to fetch responses' }, 500);
  }
});

/**
 * Get survey by ID
 */
surveyD1Routes.get('/response/:surveyId', async (c) => {
  const surveyId = parseInt(c.req.param('surveyId'));

  try {
    const db = createD1Client(c.env.PRIMARY_DB);

    const survey = await db.queryFirst<Survey>(
      `
      SELECT
        s.*,
        c.name as company_name,
        p.name as process_name,
        r.title as role_title,
        u.username as submitted_by
      FROM surveys s
      LEFT JOIN companies c ON s.company_id = c.id
      LEFT JOIN processes p ON s.process_id = p.id
      LEFT JOIN roles r ON s.role_id = r.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `,
      surveyId
    );

    if (!survey) {
      return c.json({ success: false, error: 'Survey not found' }, 404);
    }

    // Parse JSON fields
    const response = {
      ...survey,
      responses: parseJSON(survey.responses),
      data: parseJSON(survey.data),
      symptoms_data: parseJSON(survey.symptoms_data),
    };

    return c.json({ success: true, survey: response });
  } catch (error) {
    console.error('Failed to fetch survey:', error);
    return c.json({ success: false, error: 'Failed to fetch survey' }, 500);
  }
});

/**
 * Get survey statistics
 */
surveyD1Routes.get('/stats', async (c) => {
  try {
    const db = createD1Client(c.env.PRIMARY_DB);

    // Overall statistics
    const overallStats = await db.query(
      `
      SELECT
        form_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(has_symptoms) as symptoms_count,
        MAX(submission_date) as last_submission
      FROM surveys
      GROUP BY form_type
    `
    );

    // Total surveys
    const totalResult = await db.queryFirst<{ total: number }>(
      'SELECT COUNT(*) as total FROM surveys'
    );

    // Recent submissions (last 7 days)
    const recentStats = await db.query(
      `
      SELECT
        DATE(submission_date) as date,
        COUNT(*) as count
      FROM surveys
      WHERE submission_date >= datetime('now', '-7 days')
      GROUP BY DATE(submission_date)
      ORDER BY date DESC
    `
    );

    return c.json({
      success: true,
      statistics: overallStats.results,
      total_surveys: totalResult?.total || 0,
      recent_submissions: recentStats.results,
    });
  } catch (error) {
    console.error('Failed to fetch statistics:', error);
    return c.json({ success: false, error: 'Failed to fetch statistics' }, 500);
  }
});

/**
 * Get daily statistics for a specific date range
 */
surveyD1Routes.get('/stats/daily', async (c) => {
  const startDate = c.req.query('start') || new Date().toISOString().split('T')[0];
  const endDate = c.req.query('end') || new Date().toISOString().split('T')[0];

  try {
    const db = createD1Client(c.env.PRIMARY_DB);

    const stats = await db.query(
      `
      SELECT
        DATE(submission_date) as date,
        form_type,
        COUNT(*) as total_submissions,
        SUM(has_symptoms) as symptoms_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM surveys
      WHERE DATE(submission_date) BETWEEN ? AND ?
      GROUP BY DATE(submission_date), form_type
      ORDER BY date DESC, form_type
    `,
      startDate,
      endDate
    );

    return c.json({
      success: true,
      start_date: startDate,
      end_date: endDate,
      statistics: stats.results,
    });
  } catch (error) {
    console.error('Failed to fetch daily statistics:', error);
    return c.json({ success: false, error: 'Failed to fetch daily statistics' }, 500);
  }
});

/**
 * Delete survey (admin only - would need auth middleware)
 */
surveyD1Routes.delete('/response/:surveyId', async (c) => {
  const surveyId = parseInt(c.req.param('surveyId'));

  try {
    const db = createD1Client(c.env.PRIMARY_DB);

    // Check if survey exists
    const exists = await db.exists('surveys', 'id = ?', surveyId);
    if (!exists) {
      return c.json({ success: false, error: 'Survey not found' }, 404);
    }

    // Delete survey
    const deleted = await db.delete('surveys', 'id = ?', surveyId);

    if (!deleted) {
      throw new Error('Failed to delete survey');
    }

    // Log deletion
    await db.insert('audit_logs', {
      user_id: 1, // TODO: Get from auth context
      action: 'survey_deletion',
      details: JSON.stringify({ survey_id: surveyId }),
      created_at: new Date().toISOString(),
    });

    return c.json({
      success: true,
      message: '설문이 삭제되었습니다',
    });
  } catch (error) {
    console.error('Failed to delete survey:', error);
    return c.json({ success: false, error: 'Failed to delete survey' }, 500);
  }
});

/**
 * Get master data (companies, processes, roles)
 */
surveyD1Routes.get('/master-data', async (c) => {
  try {
    const db = createD1Client(c.env.PRIMARY_DB);

    // Get all master data in parallel
    const [companies, processes, roles] = await Promise.all([
      db.query('SELECT * FROM companies WHERE is_active = 1 ORDER BY display_order'),
      db.query('SELECT * FROM processes WHERE is_active = 1 ORDER BY display_order'),
      db.query('SELECT * FROM roles WHERE is_active = 1 ORDER BY display_order'),
    ]);

    return c.json({
      success: true,
      companies: companies.results,
      processes: processes.results,
      roles: roles.results,
    });
  } catch (error) {
    console.error('Failed to fetch master data:', error);
    return c.json({ success: false, error: 'Failed to fetch master data' }, 500);
  }
});