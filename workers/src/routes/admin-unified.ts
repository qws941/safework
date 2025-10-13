/**
 * SafeWork Unified Admin Routes
 * 001 + 002 통합 관리자 대시보드
 */

import { Hono } from 'hono';
import { unifiedAdminDashboardTemplate } from '../templates/admin-unified-dashboard';

type Bindings = {
  PRIMARY_DB: D1Database;
  SAFEWORK_KV: KVNamespace;
};

export const unifiedAdminRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * GET /admin
 * 통합 관리자 대시보드 페이지
 */
unifiedAdminRoutes.get('/', async (c) => {
  const response = c.html(unifiedAdminDashboardTemplate);
  response.headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
  return response;
});

/**
 * GET /api/admin/unified/stats
 * 통합 통계 API
 */
unifiedAdminRoutes.get('/stats', async (c) => {
  try {
    const db = c.env.PRIMARY_DB;

    if (!db) {
      return c.json({
        success: false,
        error: 'Database not available'
      }, 500);
    }

    // Get 001 statistics
    const stats001Result = await db.prepare(`
      SELECT
        COUNT(*) as total,
        AVG(age) as avg_age,
        SUM(has_symptoms) as symptoms_count,
        SUM(CASE WHEN DATE(submission_date) = DATE('now') THEN 1 ELSE 0 END) as today_count
      FROM surveys
      WHERE form_type = ?
    `).bind('001_musculoskeletal_symptom_survey').first();

    // Get 002 statistics
    const stats002Result = await db.prepare(`
      SELECT
        COUNT(*) as total,
        AVG(age) as avg_age,
        SUM(has_symptoms) as symptoms_count,
        SUM(CASE WHEN DATE(submission_date) = DATE('now') THEN 1 ELSE 0 END) as today_count
      FROM surveys
      WHERE form_type = ?
    `).bind('002_musculoskeletal_symptom_program').first();

    // Get department distribution
    const departmentResult = await db.prepare(`
      SELECT department, COUNT(*) as count
      FROM surveys
      WHERE department IS NOT NULL AND department != ''
      GROUP BY department
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Get timeline data (last 7 days)
    const timelineResult = await db.prepare(`
      SELECT DATE(submission_date) as date, COUNT(*) as count
      FROM surveys
      WHERE DATE(submission_date) >= DATE('now', '-7 days')
      GROUP BY DATE(submission_date)
      ORDER BY date ASC
    `).all();

    // Calculate combined statistics
    const total001 = Number(stats001Result?.total || 0);
    const total002 = Number(stats002Result?.total || 0);
    const totalSubmissions = total001 + total002;

    const avgAge001 = Number(stats001Result?.avg_age || 0);
    const avgAge002 = Number(stats002Result?.avg_age || 0);
    const combinedAvgAge = totalSubmissions > 0 ?
      ((avgAge001 * total001) + (avgAge002 * total002)) / totalSubmissions : 0;

    const response = {
      success: true,
      statistics: {
        total: totalSubmissions,
        form001: total001,
        form002: total002,
        todayTotal: Number(stats001Result?.today_count || 0) + Number(stats002Result?.today_count || 0),
        avgAge: Math.round(combinedAvgAge * 10) / 10,
        symptomsTotal: Number(stats001Result?.symptoms_count || 0) + Number(stats002Result?.symptoms_count || 0),
        departmentDistribution: departmentResult?.results || [],
        timeline: timelineResult?.results || []
      },
      timestamp: new Date().toISOString()
    };

    return c.json(response);
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Failed to fetch unified statistics',
      details: error.message
    }, 500);
  }
});

/**
 * GET /api/admin/unified/recent
 * 최근 제출 내역 (001 + 002 통합)
 */
unifiedAdminRoutes.get('/recent', async (c) => {
  try {
    const db = c.env.PRIMARY_DB;
    const limit = parseInt(c.req.query('limit') || '20');

    if (!db) {
      return c.json({
        success: false,
        error: 'Database not available'
      }, 500);
    }

    // Get recent submissions from both forms
    const recentResult = await db.prepare(`
      SELECT
        id as submission_id,
        form_type,
        name,
        age,
        gender,
        department,
        submission_date as submitted_at
      FROM surveys
      ORDER BY submission_date DESC
      LIMIT ?
    `).bind(limit).all();

    return c.json({
      success: true,
      submissions: recentResult?.results || [],
      count: recentResult?.results?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Failed to fetch recent submissions',
      details: error.message
    }, 500);
  }
});

/**
 * GET /api/admin/unified/export
 * 전체 데이터 통합 내보내기 (ZIP 또는 통합 CSV)
 */
unifiedAdminRoutes.get('/export', async (c) => {
  try {
    const db = c.env.PRIMARY_DB;

    if (!db) {
      return c.json({
        success: false,
        error: 'Database not available'
      }, 500);
    }

    // Get all data from both forms
    const data001 = await db.prepare(`
      SELECT * FROM surveys WHERE form_type = ? ORDER BY submission_date DESC
    `).bind('001_musculoskeletal_symptom_survey').all();

    const data002 = await db.prepare(`
      SELECT * FROM surveys WHERE form_type = ? ORDER BY submission_date DESC
    `).bind('002_musculoskeletal_symptom_program').all();

    // Create combined CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `safework_unified_${timestamp}.csv`;

    // Generate CSV header
    const headers = [
      'Form Type', 'Submission ID', 'Name', 'Age', 'Gender', 'Department',
      'Work Experience', 'Neck Pain', 'Shoulder Pain', 'Back Pain', 'Submitted At'
    ];

    const csvRows = [headers.join(',')];

    // Add 001 data
    data001?.results?.forEach((row: any) => {
      csvRows.push([
        'Form 001',
        row.submission_id || row.id,
        row.name,
        row.age,
        row.gender,
        row.department || '',
        row.work_experience || '',
        row.neck_pain || '',
        row.shoulder_pain || '',
        row.back_pain || '',
        row.submission_date || row.submitted_at
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });

    // Add 002 data
    data002?.results?.forEach((row: any) => {
      csvRows.push([
        'Form 002',
        row.submission_id || row.id,
        row.name,
        row.age,
        row.gender,
        row.department || '',
        row.work_experience || '',
        row.neck_pain_exists || '',
        row.shoulder_pain_exists || '',
        row.back_pain_exists || '',
        row.submission_date || row.submitted_at
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });

    const csvContent = csvRows.join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Failed to export unified data',
      details: error.message
    }, 500);
  }
});