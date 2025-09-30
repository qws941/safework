/**
 * SafeWork Survey 002 D1 Routes
 * 근골격계질환 증상조사표 (프로그램용)
 */

import { Hono } from 'hono';
import { createD1Client } from '../db/d1-client';
import { fromBoolean } from '../db/models';

interface SurveyEnv {
  PRIMARY_DB: D1Database;
  SAFEWORK_KV: KVNamespace;
  BACKEND_URL?: string;
  [key: string]: unknown;
}

interface Survey002SubmissionRequest {
  // Basic info
  number?: string;
  name: string;
  age: number;
  gender: string;
  work_experience: number;
  married?: string;
  department: string;
  line?: string;
  work_type?: string;
  work_period?: string;
  current_work_period?: number;
  daily_work_hours?: number;
  rest_time?: number;
  previous_work_period?: number;
  physical_burden?: string;

  // Body part symptoms (목, 어깨, 팔꿈치, 손/손목, 허리, 다리/발)
  // 각 부위당 6개 문항
  responses: Record<string, string>;

  // Optional
  user_id?: number;
  company_id?: number;
  process_id?: number;
  role_id?: number;
}

export const survey002D1Routes = new Hono<{ Bindings: SurveyEnv }>();

/**
 * Submit 002 survey
 */
survey002D1Routes.post('/submit', async (c) => {
  try {
    const body: Survey002SubmissionRequest = await c.req.json();
    const db = createD1Client(c.env.PRIMARY_DB);

    // Get client info
    const ip_address = c.req.header('CF-Connecting-IP') || 'unknown';
    const user_agent = c.req.header('User-Agent') || 'unknown';

    // Calculate has_symptoms based on responses
    let hasSymptoms = false;
    if (body.responses) {
      const symptomValues = Object.values(body.responses);
      hasSymptoms = symptomValues.some(val =>
        val === '있음' || val === '예' || val === '1' || val === 'true'
      );
    }

    // Prepare survey data
    const surveyData: Record<string, unknown> = {
      user_id: body.user_id || 1,
      form_type: '002_musculoskeletal_symptom_program',
      name: body.name,
      department: body.department,
      age: body.age,
      gender: body.gender,
      has_symptoms: fromBoolean(hasSymptoms),
      company_id: body.company_id || null,
      process_id: body.process_id || null,
      role_id: body.role_id || null,

      // Store all form data in JSON fields
      responses: JSON.stringify(body.responses),
      data: JSON.stringify({
        number: body.number,
        work_experience: body.work_experience,
        married: body.married,
        line: body.line,
        work_type: body.work_type,
        work_period: body.work_period,
        current_work_period: body.current_work_period,
        daily_work_hours: body.daily_work_hours,
        rest_time: body.rest_time,
        previous_work_period: body.previous_work_period,
        physical_burden: body.physical_burden,
      }),

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
      action: 'survey_002_submission',
      details: JSON.stringify({
        form_type: '002_musculoskeletal_symptom_program',
        survey_id: surveyId,
        ip_address,
        user_agent,
        has_symptoms: hasSymptoms,
      }),
      created_at: new Date().toISOString(),
    });

    return c.json({
      success: true,
      message: '002 설문이 성공적으로 제출되었습니다',
      survey_id: surveyId,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Failed to submit 002 survey:', err);
    return c.json({
      success: false,
      error: 'Failed to submit survey',
      details: err.message,
    }, 500);
  }
});

/**
 * Get 002 responses with pagination
 */
survey002D1Routes.get('/responses', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const db = createD1Client(c.env.PRIMARY_DB);

    const result = await db.query(`
      SELECT
        s.id,
        s.form_type,
        s.name,
        s.department,
        s.age,
        s.gender,
        s.has_symptoms,
        s.submission_date,
        s.status,
        c.name as company_name,
        p.name as process_name,
        r.title as role_title
      FROM surveys s
      LEFT JOIN companies c ON s.company_id = c.id
      LEFT JOIN processes p ON s.process_id = p.id
      LEFT JOIN roles r ON s.role_id = r.id
      WHERE s.form_type = ?
      ORDER BY s.submission_date DESC
      LIMIT ? OFFSET ?
    `, '002_musculoskeletal_symptom_program', limit, offset);

    const total = await db.count('surveys', 'form_type = ?', '002_musculoskeletal_symptom_program');

    return c.json({
      success: true,
      responses: result.results,
      total,
      has_more: offset + limit < total,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return c.json({
      success: false,
      error: 'Failed to fetch responses',
      details: err.message,
    }, 500);
  }
});

/**
 * Get individual 002 response
 */
survey002D1Routes.get('/response/:surveyId', async (c) => {
  try {
    const surveyId = parseInt(c.req.param('surveyId'));
    const db = createD1Client(c.env.PRIMARY_DB);

    const survey = await db.queryFirst(`
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
      WHERE s.id = ? AND s.form_type = ?
    `, surveyId, '002_musculoskeletal_symptom_program');

    if (!survey) {
      return c.json({
        success: false,
        error: 'Survey not found',
      }, 404);
    }

    // Parse JSON fields
    const surveyRecord = survey as Record<string, unknown>;
    const parsedSurvey = {
      ...surveyRecord,
      responses: surveyRecord.responses ? JSON.parse(surveyRecord.responses as string) : null,
      data: surveyRecord.data ? JSON.parse(surveyRecord.data as string) : null,
      submitted_by: surveyRecord.submitted_by || 'anonymous',
    };

    return c.json({
      success: true,
      survey: parsedSurvey,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return c.json({
      success: false,
      error: 'Failed to fetch survey',
      details: err.message,
    }, 500);
  }
});

/**
 * Get 002 statistics
 */
survey002D1Routes.get('/stats', async (c) => {
  try {
    const db = createD1Client(c.env.PRIMARY_DB);

    // Overall statistics
    const stats = await db.queryFirst(`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(CASE WHEN has_symptoms = 1 THEN 1 ELSE 0 END) as symptoms_count,
        AVG(age) as avg_age,
        MAX(submission_date) as last_submission
      FROM surveys
      WHERE form_type = ?
    `, '002_musculoskeletal_symptom_program');

    // Daily submissions (last 30 days)
    const dailyStats = await db.query(`
      SELECT
        DATE(submission_date) as date,
        COUNT(*) as count
      FROM surveys
      WHERE form_type = ?
        AND submission_date >= datetime('now', '-30 days')
      GROUP BY DATE(submission_date)
      ORDER BY date DESC
    `, '002_musculoskeletal_symptom_program');

    const statsRecord = stats as Record<string, unknown> | null;
    return c.json({
      success: true,
      statistics: {
        total: Number(statsRecord?.total || 0),
        unique_users: Number(statsRecord?.unique_users || 0),
        symptoms_count: Number(statsRecord?.symptoms_count || 0),
        avg_age: Number(statsRecord?.avg_age || 0).toFixed(1),
        last_submission: statsRecord?.last_submission || null,
      },
      recent_submissions: dailyStats.results,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return c.json({
      success: false,
      error: 'Failed to fetch statistics',
      details: err.message,
    }, 500);
  }
});

/**
 * Delete 002 response (soft delete)
 */
survey002D1Routes.delete('/response/:surveyId', async (c) => {
  try {
    const surveyId = parseInt(c.req.param('surveyId'));
    const db = createD1Client(c.env.PRIMARY_DB);

    // Update status to 'deleted'
    const success = await db.update(
      'surveys',
      { status: 'deleted', updated_at: new Date().toISOString() },
      'id = ? AND form_type = ?',
      surveyId,
      '002_musculoskeletal_symptom_program'
    );

    if (!success) {
      return c.json({
        success: false,
        error: 'Survey not found or already deleted',
      }, 404);
    }

    // Log deletion
    await db.insert('audit_logs', {
      user_id: 1,
      action: 'survey_002_deletion',
      details: JSON.stringify({
        survey_id: surveyId,
        ip_address: c.req.header('CF-Connecting-IP') || 'unknown',
      }),
      created_at: new Date().toISOString(),
    });

    return c.json({
      success: true,
      message: 'Survey deleted successfully',
    });
  } catch (error: unknown) {
    const err = error as Error;
    return c.json({
      success: false,
      error: 'Failed to delete survey',
      details: err.message,
    }, 500);
  }
});