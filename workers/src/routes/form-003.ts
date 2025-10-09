/**
 * Form 003: 근골격계질환 예방관리 프로그램 조사표
 * Musculoskeletal Disease Prevention Management Program Survey - Cloudflare Workers API
 */

import { Hono } from 'hono';
import { Env } from '../index';
import { FORM_003_STRUCTURE, FORM_003_VALIDATION_RULES, BODY_PARTS_LIST } from '../config/form-003-structure';

const form003Routes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/form/003/structure
 * 폼 구조 정보 반환
 */
form003Routes.get('/structure', async (c) => {
  try {
    // KV에서 캐시된 구조 확인
    const cached = await c.env.CACHE_LAYER?.get('form:003:structure', 'json');

    if (cached) {
      return c.json({
        success: true,
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    // 캐시되지 않은 경우 구조 반환 및 캐시 저장
    const structure = FORM_003_STRUCTURE;

    // 5분간 캐시
    await c.env.CACHE_LAYER?.put(
      'form:003:structure',
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
    console.error('Form 003 structure error:', error);
    return c.json({
      success: false,
      error: 'Failed to load form structure',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/form/003/body-parts
 * 신체 부위 목록 반환
 */
form003Routes.get('/body-parts', async (c) => {
  return c.json({
    success: true,
    data: BODY_PARTS_LIST,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/form/003/validation-rules
 * 폼 검증 규칙 반환
 */
form003Routes.get('/validation-rules', async (c) => {
  return c.json({
    success: true,
    data: FORM_003_VALIDATION_RULES,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/form/003/validate
 * 폼 데이터 검증 (제출 전 검증)
 */
form003Routes.post('/validate', async (c) => {
  try {
    const formData = await c.req.json();
    const errors: string[] = [];

    // 필수 필드 검증
    for (const field of FORM_003_VALIDATION_RULES.requiredFields) {
      if (!formData[field] || formData[field] === '') {
        errors.push(`필수 항목 '${field}'이(가) 누락되었습니다.`);
      }
    }

    // 숫자 범위 검증
    const numericRanges = FORM_003_VALIDATION_RULES.numericRanges as Record<string, { min: number; max: number }>;
    for (const [field, range] of Object.entries(numericRanges)) {
      if (formData[field]) {
        const value = parseInt(formData[field]);
        if (!isNaN(value)) {
          if (value < range.min || value > range.max) {
            errors.push(`'${field}'은(는) ${range.min}에서 ${range.max} 사이여야 합니다.`);
          }
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
    console.error('Form 003 validation error:', error);
    return c.json({
      success: false,
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/form/003/submit
 * 폼 제출 처리
 */
form003Routes.post('/submit', async (c) => {
  try {
    const formData = await c.req.json();
    const submissionId = `003_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 필수 필드 검증
    const requiredFields = ['name', 'age', 'gender'];
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
      formId: '003',
      formVersion: '1.0.0',
      submittedAt: new Date().toISOString(),
      data: formData,
      metadata: {
        userAgent: c.req.header('user-agent'),
        cfRay: c.req.header('cf-ray'),
        country: (c.req as any).cf?.country || 'unknown',
        colo: (c.req as any).cf?.colo || 'unknown'
      }
    };

    // KV 저장 (임시 저장, 30일)
    await c.env.SAFEWORK_KV?.put(
      `submission:003:${submissionId}`,
      JSON.stringify(submission),
      {
        expirationTtl: 2592000, // 30일 보관
        metadata: {
          formId: '003',
          submittedAt: submission.submittedAt,
          userName: formData.name || 'anonymous'
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
          '003',
          formData.name,
          parseInt(formData.age) || 0,
          formData.gender,
          formData.department || null,
          formData.position || null,
          JSON.stringify(formData),
          JSON.stringify(submission),
          submission.submittedAt,
          submission.submittedAt
        ).run();

        dbSaved = true;
        console.log('✅ D1 DB 저장 성공 (Form 003):', submissionId);
      } else {
        dbError = 'D1 database not available';
        console.warn('⚠️ D1 DB not configured');
      }
    } catch (dbErrorCatch) {
      dbError = dbErrorCatch instanceof Error ? dbErrorCatch.message : 'Unknown error';
      console.error('❌ D1 DB 저장 오류 (Form 003):', dbErrorCatch);
    }

    // 응답 반환
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
    console.error('Form 003 submission error:', error);
    return c.json({
      success: false,
      error: 'Submission failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/form/003/submission/:id
 * 제출 데이터 조회
 */
form003Routes.get('/submission/:id', async (c) => {
  try {
    const submissionId = c.req.param('id');

    const submission = await c.env.SAFEWORK_KV?.get(
      `submission:003:${submissionId}`,
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
    console.error('Form 003 submission retrieval error:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve submission',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/form/003/submissions
 * 제출 목록 조회 (관리자용)
 */
form003Routes.get('/submissions', async (c) => {
  try {
    // KV list로 모든 제출 조회
    const list = await c.env.SAFEWORK_KV?.list({
      prefix: 'submission:003:'
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
        submissionId: key.name.replace('submission:003:', ''),
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
    console.error('Form 003 submissions list error:', error);
    return c.json({
      success: false,
      error: 'Failed to list submissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
    }
});

export { form003Routes };
