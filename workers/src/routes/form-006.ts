/**
 * Form 006: 고령근로자 작업투입 승인요청서
 * Elderly Worker Assignment Approval Request Form - Cloudflare Workers API
 */

import { Hono } from 'hono';
import { Env } from '../index';
import { FORM_006_STRUCTURE, FORM_006_VALIDATION_RULES, EMPLOYMENT_TYPES, HEALTH_STATUS_TYPES, APPROVAL_STATUS_TYPES } from '../config/form-006-structure';

const form006Routes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/form/006/structure
 * 폼 구조 정보 반환
 */
form006Routes.get('/structure', async (c) => {
  try {
    // KV에서 캐시된 구조 확인
    const cached = await c.env.CACHE_LAYER?.get('form:006:structure', 'json');

    if (cached) {
      return c.json({
        success: true,
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    // 캐시되지 않은 경우 구조 반환 및 캐시 저장
    const structure = FORM_006_STRUCTURE;

    // 5분간 캐시
    await c.env.CACHE_LAYER?.put(
      'form:006:structure',
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
    console.error('Form 006 structure error:', error);
    return c.json({
      success: false,
      error: 'Failed to load form structure',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/form/006/employment-types
 * 고용형태 목록 반환
 */
form006Routes.get('/employment-types', async (c) => {
  return c.json({
    success: true,
    data: EMPLOYMENT_TYPES,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/form/006/health-status-types
 * 건강상태 유형 목록 반환
 */
form006Routes.get('/health-status-types', async (c) => {
  return c.json({
    success: true,
    data: HEALTH_STATUS_TYPES,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/form/006/approval-status-types
 * 승인상태 유형 목록 반환
 */
form006Routes.get('/approval-status-types', async (c) => {
  return c.json({
    success: true,
    data: APPROVAL_STATUS_TYPES,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/form/006/validation-rules
 * 폼 검증 규칙 반환
 */
form006Routes.get('/validation-rules', async (c) => {
  return c.json({
    success: true,
    data: FORM_006_VALIDATION_RULES,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/form/006/validate
 * 폼 데이터 검증 (제출 전 검증)
 */
form006Routes.post('/validate', async (c) => {
  try {
    const formData = await c.req.json();
    const errors: string[] = [];

    // 필수 필드 검증
    for (const field of FORM_006_VALIDATION_RULES.requiredFields) {
      if (!formData[field] || formData[field] === '') {
        errors.push(`필수 항목 '${field}'이(가) 누락되었습니다.`);
      }
    }

    // 숫자 범위 검증 (근로자 연령: 50-100세)
    if (formData.worker_age) {
      const age = parseInt(formData.worker_age);
      if (!isNaN(age)) {
        if (age < 50 || age > 100) {
          errors.push(`근로자 연령은 50세에서 100세 사이여야 합니다.`);
        }
      }
    }

    // 날짜 검증
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 건강검진일자 검증 (2년 이내)
    if (formData.health_checkup_date) {
      const checkupDate = new Date(formData.health_checkup_date);
      const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());

      if (checkupDate < twoYearsAgo) {
        errors.push('건강검진일자는 최근 2년 이내여야 합니다.');
      }

      if (checkupDate > today) {
        errors.push('건강검진일자는 미래일 수 없습니다.');
      }
    }

    // 작업시작예정일 검증 (오늘 이후)
    if (formData.start_date) {
      const startDate = new Date(formData.start_date);
      startDate.setHours(0, 0, 0, 0);

      if (startDate < today) {
        errors.push('작업시작예정일은 오늘 이후여야 합니다.');
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
    console.error('Form 006 validation error:', error);
    return c.json({
      success: false,
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/form/006/submit
 * 폼 제출 처리
 */
form006Routes.post('/submit', async (c) => {
  try {
    const formData = await c.req.json();
    const submissionId = `006_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 필수 필드 검증
    const requiredFields = ['company_name', 'department', 'manager_name', 'worker_name', 'worker_age'];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      return c.json({
        success: false,
        errors: missingFields.map(f => `필수 항목 '${f}'이(가) 누락되었습니다.`)
      }, 400);
    }

    // 제출 데이터 구성
    const submission = {
      submissionId,
      formId: '006',
      formVersion: '1.0.0',
      submittedAt: new Date().toISOString(),
      data: formData,
      metadata: {
        userAgent: c.req.header('user-agent'),
        cfRay: c.req.header('cf-ray'),
        country: (c.req as any).cf?.country || 'unknown',
        colo: (c.req as any).cf?.colo || 'unknown',
        approvalStatus: formData.approval_status || 'pending',
        workerAge: formData.worker_age || 'unknown'
      }
    };

    // KV 저장 (임시 저장, 30일)
    await c.env.SAFEWORK_KV?.put(
      `submission:006:${submissionId}`,
      JSON.stringify(submission),
      {
        expirationTtl: 2592000, // 30일 보관
        metadata: {
          formId: '006',
          submittedAt: submission.submittedAt,
          companyName: formData.company_name || 'anonymous',
          workerName: formData.worker_name || 'unknown',
          approvalStatus: formData.approval_status || 'pending'
        }
      }
    );

    // D1 Database에 저장
    let dbSaved = false;
    let dbError = null;

    try {
      const db = c.env.PRIMARY_DB;
      if (db) {
        await db.prepare(`
          INSERT INTO surveys (
            user_id, form_type, name, age, gender,
            department, position, responses, data,
            submission_date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          1, // anonymous user
          '006',
          formData.worker_name || formData.manager_name,
          parseInt(formData.worker_age) || 0,
          formData.worker_gender || null,
          formData.department || null,
          formData.employment_type || null,
          JSON.stringify(formData),
          JSON.stringify(submission),
          submission.submittedAt,
          submission.submittedAt
        ).run();

        dbSaved = true;
        console.log('✅ D1 DB 저장 성공 (Form 006):', submissionId);
      } else {
        dbError = 'D1 database not available';
        console.warn('⚠️ D1 DB not configured');
      }
    } catch (dbErrorCatch) {
      dbError = dbErrorCatch instanceof Error ? dbErrorCatch.message : 'Unknown error';
      console.error('❌ D1 DB 저장 오류 (Form 006):', dbErrorCatch);
    }

    // 응답 반환
    return c.json({
      success: true,
      submissionId,
      message: '고령근로자 작업투입 승인요청서가 제출되었습니다.',
      reportUrl: `/survey/report/${submissionId}`,
      timestamp: new Date().toISOString(),
      storage: {
        kv: true,
        database: dbSaved,
        dbError: dbError || undefined
      }
    }, 201);

  } catch (error) {
    console.error('Form 006 submission error:', error);
    return c.json({
      success: false,
      error: 'Submission failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/form/006/submission/:id
 * 제출 데이터 조회
 */
form006Routes.get('/submission/:id', async (c) => {
  try {
    const submissionId = c.req.param('id');

    const submission = await c.env.SAFEWORK_KV?.get(
      `submission:006:${submissionId}`,
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
    console.error('Form 006 submission retrieval error:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve submission',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/form/006/submissions
 * 제출 목록 조회 (관리자용)
 */
form006Routes.get('/submissions', async (c) => {
  try {
    // KV list로 모든 제출 조회
    const list = await c.env.SAFEWORK_KV?.list({
      prefix: 'submission:006:'
    });

    if (!list || !list.keys || list.keys.length === 0) {
      return c.json({
        success: true,
        data: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }

    // 메타데이터만 반환
    const submissions = list.keys.map(key => {
      const metadata = key.metadata as Record<string, any> || {};
      return {
        submissionId: key.name.replace('submission:006:', ''),
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
    console.error('Form 006 submissions list error:', error);
    return c.json({
      success: false,
      error: 'Failed to list submissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export { form006Routes };
