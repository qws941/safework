/**
 * 001 근골격계 자각증상 조사표 - Cloudflare Workers API
 * HWP 원본 데이터 완벽 구현
 */

import { Hono } from 'hono';
import { Env } from '../index';
import { FORM_001_COMPLETE_STRUCTURE, BODY_PARTS_MAPPING, FORM_001_VALIDATION_RULES } from '../config/form-001-structure';

const form001Routes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/form/001/structure
 * 폼 구조 정보 반환
 */
form001Routes.get('/structure', async (c) => {
  try {
    // KV에서 캐시된 구조 확인
    const cached = await c.env.CACHE_LAYER?.get('form:001:structure', 'json');

    if (cached) {
      return c.json({
        success: true,
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    // 캐시되지 않은 경우 구조 반환 및 캐시 저장
    const structure = FORM_001_COMPLETE_STRUCTURE;

    // 5분간 캐시
    await c.env.CACHE_LAYER?.put(
      'form:001:structure',
      JSON.stringify(structure),
      { expirationTtl: 300 }
    );

    return c.json({
      success: true,
      data: structure,
      source: 'live',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Form structure error:', error);
    return c.json({
      success: false,
      error: 'Failed to load form structure',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/form/001/body-parts
 * 신체 부위 매핑 정보 반환
 */
form001Routes.get('/body-parts', async (c) => {
  return c.json({
    success: true,
    data: BODY_PARTS_MAPPING,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/form/001/validation-rules
 * 폼 검증 규칙 반환
 */
form001Routes.get('/validation-rules', async (c) => {
  return c.json({
    success: true,
    data: FORM_001_VALIDATION_RULES,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/form/001/validate
 * 폼 데이터 검증 (제출 전 검증)
 */
form001Routes.post('/validate', async (c) => {
  try {
    const formData = await c.req.json();
    const errors: string[] = [];

    // 필수 필드 검증
    for (const field of FORM_001_VALIDATION_RULES.requiredFields) {
      if (!formData[field] || formData[field] === '') {
        errors.push(`필수 항목 '${field}'이(가) 누락되었습니다.`);
      }
    }

    // 조건부 필수 필드 검증
    const conditionalRule = FORM_001_VALIDATION_RULES.conditionalRequired;
    if (formData[conditionalRule.when.field] === conditionalRule.when.value) {
      for (const field of conditionalRule.fields) {
        if (!formData[field] || formData[field].length === 0) {
          errors.push(`증상이 있는 경우 '${field}'은(는) 필수입니다.`);
        }
      }
    }

    // 숫자 범위 검증
    const numericRanges2 = FORM_001_VALIDATION_RULES.numericRanges as Record<string, { min: number; max: number }>;
    for (const [field, range] of Object.entries(numericRanges2)) {
      const value = parseInt(formData[field]);
      if (!isNaN(value)) {
        if (value < range.min || value > range.max) {
          errors.push(`'${field}'은(는) ${range.min}에서 ${range.max} 사이여야 합니다.`);
        }
      }
    }

    if (errors.length > 0) {
      return c.json({
        success: false,
        valid: false,
        errors,
        timestamp: new Date().toISOString()
      }, 400);
    }

    return c.json({
      success: true,
      valid: true,
      message: '검증 완료',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Validation error:', error);
    return c.json({
      success: false,
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/form/001/submit
 * 폼 제출 처리
 */
form001Routes.post('/submit', async (c) => {
  try {
    const formData = await c.req.json();
    const submissionId = `001_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 1. 기본 필수 필드만 검증 (dv06 원본 필드)
    const requiredFields = ['name', 'age', 'gender'];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      return c.json({
        success: false,
        errors: missingFields.map(f => `필수 항목 '${f}'이(가) 누락되었습니다.`)
      }, 400);
    }

    // 2. 제출 데이터 구성 (dv06 전체 필드 지원)
    const submission = {
      submissionId,
      formId: '001',
      formVersion: 'dv06_2025-09-26_10-36_Flask_089eeaf',
      submittedAt: new Date().toISOString(),
      data: formData,
      metadata: {
        userAgent: c.req.header('user-agent'),
        cfRay: c.req.header('cf-ray'),
        country: (c.req as any).cf?.country || 'unknown',
        colo: (c.req as any).cf?.colo || 'unknown'
      }
    };

    // 3. KV 저장 (임시 저장, 30일)
    await c.env.SAFEWORK_KV?.put(
      `submission:001:${submissionId}`,
      JSON.stringify(submission),
      {
        expirationTtl: 2592000, // 30일 보관
        metadata: {
          formId: '001',
          submittedAt: submission.submittedAt,
          userName: formData.name || 'anonymous'
        }
      }
    );

    // 4. D1 Database에 저장
    let dbSaved = false;
    let dbError = null;

    try {
      const db = c.env.PRIMARY_DB;
      if (db) {
        await db.prepare(`
          INSERT INTO surveys_001 (
            submission_id, form_version, name, age, gender,
            company, company_custom, process, process_custom,
            role, role_custom, position, work_years, work_months, marriage_status,
            current_work_details, current_work_years, current_work_months,
            work_hours_per_day, break_time_minutes, break_frequency,
            previous_work_details, previous_work_years, previous_work_months,
            hobbies, housework_hours, diagnosed, diagnosed_details,
            responses, user_agent, cf_ray, country, colo, submitted_at
          ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
          )
        `).bind(
          submissionId,
          'dv06_2025-09-26_10-36_Flask_089eeaf',
          formData.name,
          parseInt(formData.age) || 0,
          formData.gender,
          formData.company || null,
          formData.company_custom || null,
          formData.process || null,
          formData.process_custom || null,
          formData.role || null,
          formData.role_custom || null,
          formData.position || null,
          parseInt(formData.work_years) || null,
          parseInt(formData.work_months) || null,
          formData.marriage_status || null,
          formData.current_work_details || null,
          parseInt(formData.current_work_years) || null,
          parseInt(formData.current_work_months) || null,
          parseInt(formData.work_hours_per_day) || null,
          parseInt(formData.break_time_minutes) || null,
          parseInt(formData.break_frequency) || null,
          formData.previous_work_details || null,
          parseInt(formData.previous_work_years) || null,
          parseInt(formData.previous_work_months) || null,
          JSON.stringify(formData.hobbies || {}),
          formData.housework_hours || null,
          formData.diagnosed || null,
          formData.diagnosed_details || null,
          JSON.stringify(formData),
          submission.metadata.userAgent,
          submission.metadata.cfRay,
          submission.metadata.country,
          submission.metadata.colo,
          submission.submittedAt
        ).run();

        dbSaved = true;
        console.log('✅ D1 DB 저장 성공:', submissionId);
      } else {
        dbError = 'D1 database not available';
        console.warn('⚠️ D1 DB not configured');
      }
    } catch (dbErrorCatch) {
      dbError = dbErrorCatch instanceof Error ? dbErrorCatch.message : 'Unknown error';
      console.error('❌ D1 DB 저장 오류:', dbErrorCatch);
    }

    // 5. 응답 반환 (DB 저장 여부 포함)
    return c.json({
      success: true,
      submissionId,
      message: '제출이 완료되었습니다.',
      reportUrl: `/survey/report/${submissionId}`,
      timestamp: new Date().toISOString(),
      storage: {
        kv: true,
        database: dbSaved,
        dbError: dbError || undefined
      }
    }, 201);

  } catch (error) {
    console.error('Submission error:', error);
    return c.json({
      success: false,
      error: 'Submission failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/form/001/submission/:id
 * 제출 데이터 조회
 */
form001Routes.get('/submission/:id', async (c) => {
  try {
    const submissionId = c.req.param('id');

    const submission = await c.env.SAFEWORK_KV?.get(
      `submission:001:${submissionId}`,
      'json'
    );

    if (!submission) {
      return c.json({
        success: false,
        error: 'Submission not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: submission,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Submission retrieval error:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve submission',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/form/001/submissions
 * 제출 목록 조회 (관리자용)
 */
form001Routes.get('/submissions', async (c) => {
  try {
    // KV list로 모든 제출 조회
    const list = await c.env.SAFEWORK_KV?.list({
      prefix: 'submission:001:'
    });

    if (!list || !list.keys || list.keys.length === 0) {
      return c.json({
        success: true,
        data: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }

    // 메타데이터만 반환 (전체 데이터는 너무 큼)
    const submissions = list.keys.map(key => {
      const metadata = key.metadata as Record<string, any> || {};
      return {
        submissionId: key.name.replace('submission:001:', ''),
        ...metadata
      };
    });

    return c.json({
      success: true,
      data: submissions,
      count: submissions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Submissions list error:', error);
    return c.json({
      success: false,
      error: 'Failed to list submissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 폼 데이터 검증 헬퍼 함수
 */
async function validateFormData(formData: any): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 필수 필드 검증
  for (const field of FORM_001_VALIDATION_RULES.requiredFields) {
    if (!formData[field] || formData[field] === '') {
      errors.push(`필수 항목 '${field}'이(가) 누락되었습니다.`);
    }
  }

  // 조건부 필수 필드 검증
  const conditionalRule = FORM_001_VALIDATION_RULES.conditionalRequired;
  if (formData[conditionalRule.when.field] === conditionalRule.when.value) {
    for (const field of conditionalRule.fields) {
      if (!formData[field] || formData[field].length === 0) {
        errors.push(`증상이 있는 경우 '${field}'은(는) 필수입니다.`);
      }
    }
  }

  // 숫자 범위 검증
  const numericRanges = FORM_001_VALIDATION_RULES.numericRanges as Record<string, { min: number; max: number }>;
  for (const [field, range] of Object.entries(numericRanges)) {
    const value = parseInt(formData[field]);
    if (!isNaN(value)) {
      if (value < range.min || value > range.max) {
        errors.push(`'${field}'은(는) ${range.min}에서 ${range.max} 사이여야 합니다.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export { form001Routes };