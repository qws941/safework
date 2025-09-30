/**
 * SafeWork Form 002: 근골격계질환 증상조사표 (완전판)
 * Cloudflare Workers Route Handler
 */

import { Hono } from 'hono';
import { survey002FormTemplate } from '../templates/survey-002-form';

type Bindings = {
  PRIMARY_DB: D1Database;
  SAFEWORK_KV: KVNamespace;
};

export const form002Routes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /survey/002_musculoskeletal_symptom_program
 * 002 설문지 폼 렌더링
 */
form002Routes.get('/', async (c) => {
  return c.html(survey002FormTemplate);
});

/**
 * POST /api/form/002/submit
 * 002 설문 제출
 */
form002Routes.post('/submit', async (c) => {
  try {
    const formData = await c.req.json();

    // 1. Submission ID 생성
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 11);
    const submissionId = `002_${timestamp}_${randomId}`;

    // 2. 메타 정보
    const userAgent = c.req.header('user-agent') || 'unknown';
    const cfRay = c.req.header('cf-ray') || 'unknown';
    const country = c.req.header('cf-ipcountry') || 'unknown';
    const colo = c.req.header('cf-ray')?.split('-')[1] || 'unknown';

    // 3. Responses JSON 생성
    const responsesJson = JSON.stringify(formData);

    // 4. D1 Database에 저장
    let dbSaved = false;
    let dbError = null;

    try {
      const db = c.env.PRIMARY_DB;
      if (db) {
        await db.prepare(`
          INSERT INTO surveys_002 (
            submission_id, form_version,
            number, name, age, gender, work_experience, married,
            department, line, work_type, work_content, work_period,
            current_work_period, daily_work_hours, rest_time,
            previous_work_content, previous_work_period,
            leisure_activity, household_work, medical_diagnosis, physical_burden,
            neck_pain_exists, neck_pain_duration, neck_pain_intensity,
            neck_pain_frequency, neck_pain_worsening, neck_pain_other,
            shoulder_pain_exists, shoulder_pain_duration, shoulder_pain_intensity,
            shoulder_pain_frequency, shoulder_pain_worsening, shoulder_pain_other,
            elbow_pain_exists, elbow_pain_duration, elbow_pain_intensity,
            elbow_pain_frequency, elbow_pain_worsening, elbow_pain_other,
            wrist_pain_exists, wrist_pain_duration, wrist_pain_intensity,
            wrist_pain_frequency, wrist_pain_worsening, wrist_pain_other,
            back_pain_exists, back_pain_duration, back_pain_intensity,
            back_pain_frequency, back_pain_worsening, back_pain_other,
            leg_pain_exists, leg_pain_duration, leg_pain_intensity,
            leg_pain_frequency, leg_pain_worsening, leg_pain_other,
            responses, user_agent, cf_ray, country, colo, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
          submissionId,
          'v1.0_2025-09-30',
          // 기본 정보
          parseInt(formData.number) || null,
          formData.name,
          parseInt(formData.age) || 0,
          formData.gender,
          parseInt(formData.work_experience) || null,
          formData.married || null,
          // 작업 정보
          formData.department || null,
          formData.line || null,
          formData.work_type || null,
          formData.work_content || null,
          formData.work_period || null,
          parseInt(formData.current_work_period) || null,
          parseInt(formData.daily_work_hours) || null,
          parseInt(formData.rest_time) || null,
          formData.previous_work_content || null,
          parseInt(formData.previous_work_period) || null,
          formData.leisure_activity || null,
          formData.household_work || null,
          formData.medical_diagnosis || null,
          formData.physical_burden || null,
          // 목 부위
          formData['목_1'] || null,
          formData['목_2'] || null,
          formData['목_3'] || null,
          formData['목_4'] || null,
          formData['목_5'] || null,
          formData['목_6'] || null,
          // 어깨 부위
          formData['어깨_1'] || null,
          formData['어깨_2'] || null,
          formData['어깨_3'] || null,
          formData['어깨_4'] || null,
          formData['어깨_5'] || null,
          formData['어깨_6'] || null,
          // 팔꿈치 부위
          formData['팔꿈치_1'] || null,
          formData['팔꿈치_2'] || null,
          formData['팔꿈치_3'] || null,
          formData['팔꿈치_4'] || null,
          formData['팔꿈치_5'] || null,
          formData['팔꿈치_6'] || null,
          // 손목 부위
          formData['손목_1'] || null,
          formData['손목_2'] || null,
          formData['손목_3'] || null,
          formData['손목_4'] || null,
          formData['손목_5'] || null,
          formData['손목_6'] || null,
          // 허리 부위
          formData['허리_1'] || null,
          formData['허리_2'] || null,
          formData['허리_3'] || null,
          formData['허리_4'] || null,
          formData['허리_5'] || null,
          formData['허리_6'] || null,
          // 다리 부위
          formData['다리_1'] || null,
          formData['다리_2'] || null,
          formData['다리_3'] || null,
          formData['다리_4'] || null,
          formData['다리_5'] || null,
          formData['다리_6'] || null,
          // 메타 정보
          responsesJson,
          userAgent,
          cfRay,
          country,
          colo
        ).run();

        dbSaved = true;
      }
    } catch (dbErrorCatch) {
      dbError = dbErrorCatch instanceof Error ? dbErrorCatch.message : 'Unknown error';
      console.error('D1 save error:', dbError);
    }

    // 5. KV에 백업 저장 (30일 TTL)
    let kvSaved = false;
    let kvError = null;

    try {
      const kvKey = `submission:002:${submissionId}`;
      const kvData = {
        submissionId,
        formVersion: 'v1.0_2025-09-30',
        data: formData,
        meta: {
          userAgent,
          cfRay,
          country,
          colo,
          submittedAt: new Date().toISOString()
        }
      };

      await c.env.SAFEWORK_KV.put(kvKey, JSON.stringify(kvData), {
        expirationTtl: 2592000 // 30 days
      });

      kvSaved = true;
    } catch (kvErrorCatch) {
      kvError = kvErrorCatch instanceof Error ? kvErrorCatch.message : 'Unknown error';
      console.error('KV save error:', kvError);
    }

    // 6. 응답 반환
    return c.json({
      success: dbSaved || kvSaved,
      submissionId,
      storage: {
        d1: dbSaved ? 'saved' : `failed: ${dbError}`,
        kv: kvSaved ? 'saved' : `failed: ${kvError}`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Form 002 submission error:', error);
    return c.json({
      success: false,
      error: 'Submission failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/form/002/structure
 * 폼 구조 조회
 */
form002Routes.get('/structure', async (c) => {
  try {
    // KV에서 폼 구조 조회
    const formStructure = await c.env.SAFEWORK_KV.get('form:002:structure', 'json');

    if (formStructure) {
      return c.json({
        success: true,
        structure: formStructure,
        source: 'kv_cache'
      });
    }

    // KV에 없으면 기본 구조 반환
    const defaultStructure = {
      formId: '002_musculoskeletal_symptom_program',
      title: '근골격계질환 증상조사표 (완전판)',
      description: '근골격계부담작업 유해요인조사를 위한 증상조사표',
      sections: [
        {
          id: 'basic_info',
          title: '기본 정보',
          fields: ['number', 'name', 'age', 'gender', 'work_experience', 'married']
        },
        {
          id: 'work_info',
          title: '작업 정보',
          fields: ['department', 'line', 'work_type', 'work_content', 'work_period',
                   'current_work_period', 'daily_work_hours', 'rest_time',
                   'previous_work_content', 'previous_work_period',
                   'leisure_activity', 'household_work', 'medical_diagnosis', 'physical_burden']
        },
        {
          id: 'pain_neck',
          title: '목 부위 통증 평가',
          fields: ['목_1', '목_2', '목_3', '목_4', '목_5', '목_6']
        },
        {
          id: 'pain_shoulder',
          title: '어깨 부위 통증 평가',
          fields: ['어깨_1', '어깨_2', '어깨_3', '어깨_4', '어깨_5', '어깨_6']
        },
        {
          id: 'pain_elbow',
          title: '팔꿈치 부위 통증 평가',
          fields: ['팔꿈치_1', '팔꿈치_2', '팔꿈치_3', '팔꿈치_4', '팔꿈치_5', '팔꿈치_6']
        },
        {
          id: 'pain_wrist',
          title: '손목 부위 통증 평가',
          fields: ['손목_1', '손목_2', '손목_3', '손목_4', '손목_5', '손목_6']
        },
        {
          id: 'pain_back',
          title: '허리 부위 통증 평가',
          fields: ['허리_1', '허리_2', '허리_3', '허리_4', '허리_5', '허리_6']
        },
        {
          id: 'pain_leg',
          title: '다리 부위 통증 평가',
          fields: ['다리_1', '다리_2', '다리_3', '다리_4', '다리_5', '다리_6']
        }
      ],
      totalFields: 56
    };

    return c.json({
      success: true,
      structure: defaultStructure,
      source: 'default'
    });

  } catch (error) {
    console.error('Form structure error:', error);
    return c.json({
      success: false,
      error: 'Failed to load form structure'
    }, 500);
  }
});