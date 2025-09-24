import { Hono } from 'hono';
import { Env } from '../index';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// Dashboard statistics
adminRoutes.get('/dashboard', async (c) => {
  try {
    // Get counts
    const workers = await c.env.SAFEWORK_DB.prepare(
      'SELECT COUNT(*) as count FROM workers WHERE is_active = 1'
    ).first();
    
    const departments = await c.env.SAFEWORK_DB.prepare(
      'SELECT COUNT(*) as count FROM departments WHERE is_active = 1'
    ).first();
    
    const surveys = await c.env.SAFEWORK_DB.prepare(
      'SELECT COUNT(*) as count FROM surveys WHERE DATE(submitted_at) = DATE("now")'
    ).first();
    
    const healthChecks = await c.env.SAFEWORK_DB.prepare(
      'SELECT COUNT(*) as count FROM health_check_results WHERE DATE(created_at) = DATE("now")'
    ).first();
    
    // Recent activities
    const recentSurveys = await c.env.SAFEWORK_DB.prepare(`
      SELECT 
        id, form_type, submitted_at, is_anonymous
      FROM surveys 
      ORDER BY submitted_at DESC 
      LIMIT 5
    `).all();
    
    return c.json({
      statistics: {
        total_workers: workers?.count || 0,
        total_departments: departments?.count || 0,
        today_surveys: surveys?.count || 0,
        today_health_checks: healthChecks?.count || 0,
      },
      recent_activities: {
        surveys: recentSurveys.results,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return c.json({ error: 'Failed to fetch dashboard data' }, 500);
  }
});

// Department management
adminRoutes.get('/departments', async (c) => {
  try {
    const departments = await c.env.SAFEWORK_DB.prepare(`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM workers WHERE department_id = d.id AND is_active = 1) as worker_count
      FROM departments d
      WHERE d.is_active = 1
      ORDER BY d.name ASC
    `).all();
    
    return c.json({
      departments: departments.results,
      total: departments.results.length,
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch departments' }, 500);
  }
});

// Create department
adminRoutes.post('/departments', async (c) => {
  const { name, code, parent_id, description } = await c.req.json();
  
  try {
    const result = await c.env.SAFEWORK_DB.prepare(`
      INSERT INTO departments (name, code, parent_id, description, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).bind(name, code, parent_id, description).run();
    
    return c.json({
      success: true,
      department_id: result.meta.last_row_id,
      message: '부서가 생성되었습니다',
    });
  } catch (error) {
    return c.json({ error: 'Failed to create department' }, 500);
  }
});

// Survey management
adminRoutes.get('/surveys', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  const form_type = c.req.query('form_type');
  const start_date = c.req.query('start_date');
  const end_date = c.req.query('end_date');
  
  try {
    let query = `
      SELECT 
        s.*,
        w.name as worker_name,
        d.name as department_name
      FROM surveys s
      LEFT JOIN workers w ON s.worker_id = w.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    
    const bindings = [];
    
    if (form_type) {
      query += ' AND s.form_type = ?';
      bindings.push(form_type);
    }
    
    if (start_date) {
      query += ' AND DATE(s.submitted_at) >= DATE(?)';
      bindings.push(start_date);
    }
    
    if (end_date) {
      query += ' AND DATE(s.submitted_at) <= DATE(?)';
      bindings.push(end_date);
    }
    
    query += ' ORDER BY s.submitted_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);
    
    const result = await c.env.SAFEWORK_DB.prepare(query).bind(...bindings).all();
    
    return c.json({
      surveys: result.results,
      total: result.results.length,
      limit,
      offset,
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch surveys' }, 500);
  }
});

// Export survey data
adminRoutes.get('/surveys/export', async (c) => {
  const form_type = c.req.query('form_type');
  const format = c.req.query('format') || 'json';
  
  try {
    const surveys = await c.env.SAFEWORK_DB.prepare(`
      SELECT * FROM surveys
      WHERE form_type = ?
      ORDER BY submitted_at DESC
    `).bind(form_type).all();
    
    if (format === 'csv') {
      // Convert to CSV
      const headers = ['ID', 'Form Type', 'Worker ID', 'Department ID', 'Submitted At'];
      const rows = surveys.results.map(s => [
        s.id,
        s.form_type,
        s.worker_id,
        s.department_id,
        s.submitted_at,
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="surveys_${form_type}_${Date.now()}.csv"`,
        },
      });
    }
    
    return c.json({
      form_type,
      surveys: surveys.results,
      total: surveys.results.length,
      exported_at: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: 'Failed to export surveys' }, 500);
  }
});

// Audit logs
adminRoutes.get('/audit-logs', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  
  try {
    const logs = await c.env.SAFEWORK_DB.prepare(`
      SELECT 
        al.*,
        u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ?
    `).bind(limit).all();
    
    return c.json({
      logs: logs.results,
      total: logs.results.length,
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch audit logs' }, 500);
  }
});

// System health
adminRoutes.get('/system-health', async (c) => {
  try {
    // Database stats
    const dbStats = await c.env.SAFEWORK_DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM workers) as workers,
        (SELECT COUNT(*) FROM departments) as departments,
        (SELECT COUNT(*) FROM surveys) as surveys,
        (SELECT COUNT(*) FROM health_check_results) as health_checks
    `).first();
    
    // Storage usage (approximate)
    const storageInfo = {
      database_records: Object.values(dbStats || {}).reduce((sum, val) => sum + (val as number), 0),
      kv_estimated: 'Unknown', // KV doesn't provide size info
    };
    
    return c.json({
      database: 'healthy',
      cache: 'healthy',
      storage: storageInfo,
      stats: dbStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch system health' }, 500);
  }
});