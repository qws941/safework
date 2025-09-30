/**
 * SafeWork 002 관리자 API 라우트
 * D1 Database 기반 데이터 조회 및 관리
 */

import { Hono } from 'hono';
import { admin002DashboardTemplate } from '../templates/admin-002-dashboard';

type Bindings = {
  PRIMARY_DB: D1Database;
  SAFEWORK_KV: KVNamespace;
};

export const admin002Routes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /admin/002
 * 002 관리자 대시보드 페이지
 */
admin002Routes.get('/', async (c) => {
  return c.html(admin002DashboardTemplate);
});

/**
 * POST /api/admin/002/init-schema
 * surveys_002 테이블 초기화 (관리자 전용)
 */
admin002Routes.post('/init-schema', async (c) => {
  try {
    const db = c.env.PRIMARY_DB;

    if (!db) {
      return c.json({
        success: false,
        error: 'Database not available'
      }, 500);
    }

    // Create surveys_002 table
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS surveys_002 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id TEXT UNIQUE NOT NULL,
        form_version TEXT NOT NULL,
        number INTEGER,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        work_experience INTEGER,
        married TEXT,
        department TEXT,
        line TEXT,
        work_type TEXT,
        work_content TEXT,
        work_period TEXT,
        current_work_period INTEGER,
        daily_work_hours INTEGER,
        rest_time INTEGER,
        previous_work_content TEXT,
        previous_work_period INTEGER,
        leisure_activity TEXT,
        household_work TEXT,
        medical_diagnosis TEXT,
        physical_burden TEXT,
        neck_pain_exists TEXT,
        neck_pain_duration TEXT,
        neck_pain_intensity TEXT,
        neck_pain_frequency TEXT,
        neck_pain_worsening TEXT,
        neck_pain_other TEXT,
        shoulder_pain_exists TEXT,
        shoulder_pain_duration TEXT,
        shoulder_pain_intensity TEXT,
        shoulder_pain_frequency TEXT,
        shoulder_pain_worsening TEXT,
        shoulder_pain_other TEXT,
        elbow_pain_exists TEXT,
        elbow_pain_duration TEXT,
        elbow_pain_intensity TEXT,
        elbow_pain_frequency TEXT,
        elbow_pain_worsening TEXT,
        elbow_pain_other TEXT,
        wrist_pain_exists TEXT,
        wrist_pain_duration TEXT,
        wrist_pain_intensity TEXT,
        wrist_pain_frequency TEXT,
        wrist_pain_worsening TEXT,
        wrist_pain_other TEXT,
        back_pain_exists TEXT,
        back_pain_duration TEXT,
        back_pain_intensity TEXT,
        back_pain_frequency TEXT,
        back_pain_worsening TEXT,
        back_pain_other TEXT,
        leg_pain_exists TEXT,
        leg_pain_duration TEXT,
        leg_pain_intensity TEXT,
        leg_pain_frequency TEXT,
        leg_pain_worsening TEXT,
        leg_pain_other TEXT,
        responses JSON,
        user_agent TEXT,
        cf_ray TEXT,
        country TEXT,
        colo TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Create indexes
    await db.batch([
      db.prepare('CREATE INDEX IF NOT EXISTS idx_002_submission_id ON surveys_002(submission_id)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_002_submitted_at ON surveys_002(submitted_at)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_002_name ON surveys_002(name)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_002_department ON surveys_002(department)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_002_form_version ON surveys_002(form_version)')
    ]);

    return c.json({
      success: true,
      message: 'surveys_002 table and indexes created successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Failed to initialize schema',
      details: error.message
    }, 500);
  }
});

/**
 * GET /api/admin/002/submissions
 * 모든 002 제출 데이터 조회 (통계 포함)
 */
admin002Routes.get('/submissions', async (c) => {
  try {
    const db = c.env.PRIMARY_DB;

    if (!db) {
      return c.json({
        success: false,
        error: 'Database not available'
      }, 500);
    }

    // 전체 제출 데이터 조회
    const submissionsResult = await db.prepare(`
      SELECT
        submission_id, name, age, gender, department,
        work_experience, married, physical_burden,
        neck_pain_exists, shoulder_pain_exists, elbow_pain_exists,
        wrist_pain_exists, back_pain_exists, leg_pain_exists,
        submitted_at, cf_ray, country
      FROM surveys_002
      ORDER BY submitted_at DESC
      LIMIT 100
    `).all();

    // 통계 계산
    const statsResult = await db.prepare(`
      SELECT
        COUNT(*) as total,
        AVG(age) as avg_age,
        SUM(CASE WHEN neck_pain_exists = '있음' THEN 1 ELSE 0 END) as neck_pain_count,
        SUM(CASE WHEN shoulder_pain_exists = '있음' THEN 1 ELSE 0 END) as shoulder_pain_count,
        SUM(CASE WHEN back_pain_exists = '있음' THEN 1 ELSE 0 END) as back_pain_count,
        SUM(CASE WHEN DATE(submitted_at) = DATE('now') THEN 1 ELSE 0 END) as today_count
      FROM surveys_002
    `).first();

    return c.json({
      success: true,
      submissions: submissionsResult.results || [],
      statistics: {
        total: statsResult?.total || 0,
        avgAge: statsResult?.avg_age || 0,
        neckPain: statsResult?.neck_pain_count || 0,
        shoulderPain: statsResult?.shoulder_pain_count || 0,
        backPain: statsResult?.back_pain_count || 0,
        today: statsResult?.today_count || 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin 002 submissions error:', error);
    return c.json({
      success: false,
      error: 'Failed to load submissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/admin/002/submission/:id
 * 특정 002 제출 데이터 상세 조회
 */
admin002Routes.get('/submission/:id', async (c) => {
  try {
    const submissionId = c.req.param('id');
    const db = c.env.PRIMARY_DB;

    if (!db) {
      return c.json({
        success: false,
        error: 'Database not available'
      }, 500);
    }

    const result = await db.prepare(`
      SELECT * FROM surveys_002
      WHERE submission_id = ?
    `).bind(submissionId).first();

    if (!result) {
      return c.json({
        success: false,
        error: 'Submission not found'
      }, 404);
    }

    return c.json({
      success: true,
      submission: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin 002 submission detail error:', error);
    return c.json({
      success: false,
      error: 'Failed to load submission',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * PUT /api/admin/002/submission/:id
 * 002 제출 데이터 수정
 */
admin002Routes.put('/submission/:id', async (c) => {
  try {
    const submissionId = c.req.param('id');
    const updateData = await c.req.json();
    const db = c.env.PRIMARY_DB;

    if (!db) {
      return c.json({
        success: false,
        error: 'Database not available'
      }, 500);
    }

    // 업데이트 실행
    await db.prepare(`
      UPDATE surveys_002
      SET
        name = ?,
        age = ?,
        gender = ?,
        work_experience = ?,
        married = ?,
        department = ?,
        line = ?,
        work_type = ?,
        work_content = ?,
        physical_burden = ?,
        neck_pain_exists = ?,
        shoulder_pain_exists = ?,
        elbow_pain_exists = ?,
        wrist_pain_exists = ?,
        back_pain_exists = ?,
        leg_pain_exists = ?
      WHERE submission_id = ?
    `).bind(
      updateData.name,
      updateData.age,
      updateData.gender,
      updateData.work_experience || null,
      updateData.married || null,
      updateData.department || null,
      updateData.line || null,
      updateData.work_type || null,
      updateData.work_content || null,
      updateData.physical_burden || null,
      updateData.neck_pain_exists || null,
      updateData.shoulder_pain_exists || null,
      updateData.elbow_pain_exists || null,
      updateData.wrist_pain_exists || null,
      updateData.back_pain_exists || null,
      updateData.leg_pain_exists || null,
      submissionId
    ).run();

    // KV도 업데이트 (있다면)
    const kvKey = `submission:002:${submissionId}`;
    const existingKV = await c.env.SAFEWORK_KV?.get(kvKey, 'json') as any;
    if (existingKV && typeof existingKV === 'object') {
      const updatedKV = {
        ...existingKV,
        data: {
          ...(existingKV.data || {}),
          ...updateData
        }
      };
      await c.env.SAFEWORK_KV?.put(kvKey, JSON.stringify(updatedKV), {
        expirationTtl: 2592000
      });
    }

    return c.json({
      success: true,
      message: 'Submission updated successfully',
      submissionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin 002 update error:', error);
    return c.json({
      success: false,
      error: 'Failed to update submission',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * DELETE /api/admin/002/submission/:id
 * 002 제출 데이터 삭제
 */
admin002Routes.delete('/submission/:id', async (c) => {
  try {
    const submissionId = c.req.param('id');
    const db = c.env.PRIMARY_DB;

    if (!db) {
      return c.json({
        success: false,
        error: 'Database not available'
      }, 500);
    }

    // D1에서 삭제
    await db.prepare(`
      DELETE FROM surveys_002
      WHERE submission_id = ?
    `).bind(submissionId).run();

    // KV에서도 삭제
    const kvKey = `submission:002:${submissionId}`;
    await c.env.SAFEWORK_KV?.delete(kvKey);

    return c.json({
      success: true,
      message: 'Submission deleted successfully',
      submissionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin 002 delete error:', error);
    return c.json({
      success: false,
      error: 'Failed to delete submission',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/admin/002/export/csv
 * 002 데이터 CSV 형식으로 내보내기
 */
admin002Routes.get('/export/csv', async (c) => {
  try {
    const db = c.env.PRIMARY_DB;

    if (!db) {
      return c.json({
        success: false,
        error: 'Database not available'
      }, 500);
    }

    const result = await db.prepare(`
      SELECT
        submission_id, name, age, gender, work_experience, married,
        department, line, work_type, work_content, physical_burden,
        neck_pain_exists, neck_pain_duration, neck_pain_intensity,
        shoulder_pain_exists, shoulder_pain_duration, shoulder_pain_intensity,
        elbow_pain_exists, elbow_pain_duration, elbow_pain_intensity,
        wrist_pain_exists, wrist_pain_duration, wrist_pain_intensity,
        back_pain_exists, back_pain_duration, back_pain_intensity,
        leg_pain_exists, leg_pain_duration, leg_pain_intensity,
        submitted_at
      FROM surveys_002
      ORDER BY submitted_at DESC
    `).all();

    const submissions = result.results || [];

    // CSV 헤더
    const headers = [
      '제출ID', '이름', '나이', '성별', '경력(년)', '결혼여부',
      '작업부서', '라인', '작업', '작업내용', '육체부담',
      '목통증', '목기간', '목강도',
      '어깨통증', '어깨기간', '어깨강도',
      '팔꿈치통증', '팔꿈치기간', '팔꿈치강도',
      '손목통증', '손목기간', '손목강도',
      '허리통증', '허리기간', '허리강도',
      '다리통증', '다리기간', '다리강도',
      '제출일시'
    ];

    // CSV 데이터
    const rows = submissions.map((sub: any) => [
      sub.submission_id,
      sub.name,
      sub.age,
      sub.gender,
      sub.work_experience || '',
      sub.married || '',
      sub.department || '',
      sub.line || '',
      sub.work_type || '',
      sub.work_content || '',
      sub.physical_burden || '',
      sub.neck_pain_exists || '',
      sub.neck_pain_duration || '',
      sub.neck_pain_intensity || '',
      sub.shoulder_pain_exists || '',
      sub.shoulder_pain_duration || '',
      sub.shoulder_pain_intensity || '',
      sub.elbow_pain_exists || '',
      sub.elbow_pain_duration || '',
      sub.elbow_pain_intensity || '',
      sub.wrist_pain_exists || '',
      sub.wrist_pain_duration || '',
      sub.wrist_pain_intensity || '',
      sub.back_pain_exists || '',
      sub.back_pain_duration || '',
      sub.back_pain_intensity || '',
      sub.leg_pain_exists || '',
      sub.leg_pain_duration || '',
      sub.leg_pain_intensity || '',
      sub.submitted_at
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="safework_002_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('CSV export error:', error);
    return c.json({
      success: false,
      error: 'Failed to export CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/admin/002/stats
 * 002 통계 데이터 조회
 */
admin002Routes.get('/stats', async (c) => {
  try {
    const db = c.env.PRIMARY_DB;

    if (!db) {
      return c.json({
        success: false,
        error: 'Database not available'
      }, 500);
    }

    // 다양한 통계 쿼리
    const generalStats = await db.prepare(`
      SELECT
        COUNT(*) as total_submissions,
        AVG(age) as avg_age,
        MIN(age) as min_age,
        MAX(age) as max_age,
        SUM(CASE WHEN gender = '남' THEN 1 ELSE 0 END) as male_count,
        SUM(CASE WHEN gender = '여' THEN 1 ELSE 0 END) as female_count,
        SUM(CASE WHEN neck_pain_exists = '있음' THEN 1 ELSE 0 END) as neck_pain,
        SUM(CASE WHEN shoulder_pain_exists = '있음' THEN 1 ELSE 0 END) as shoulder_pain,
        SUM(CASE WHEN back_pain_exists = '있음' THEN 1 ELSE 0 END) as back_pain
      FROM surveys_002
    `).first();

    const departmentStats = await db.prepare(`
      SELECT department, COUNT(*) as count
      FROM surveys_002
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY count DESC
      LIMIT 10
    `).all();

    const painStats = await db.prepare(`
      SELECT
        physical_burden,
        COUNT(*) as count
      FROM surveys_002
      WHERE physical_burden IS NOT NULL
      GROUP BY physical_burden
      ORDER BY count DESC
    `).all();

    return c.json({
      success: true,
      statistics: {
        general: generalStats,
        byDepartment: departmentStats.results,
        byPhysicalBurden: painStats.results
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stats error:', error);
    return c.json({
      success: false,
      error: 'Failed to load statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});