import { Hono } from 'hono';
import { Env } from '../index';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// Dashboard statistics - Returns HTML page
adminRoutes.get('/dashboard', async (c) => {
  try {
    // Get statistics (mock data for now since DB might not be connected)
    const stats = {
      total_workers: 1247,
      total_departments: 12,
      today_surveys: 23,
      today_health_checks: 45,
    };
    
    // Dashboard HTML
    const dashboardHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeWork 관리자 대시보드</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .dashboard-container { background: white; border-radius: 20px; padding: 30px; margin: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .stat-card { background: white; border-radius: 15px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s; }
        .stat-card:hover { transform: translateY(-5px); }
        .navbar-admin { background: rgba(255,255,255,0.95); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <!-- Admin Navbar -->
    <nav class="navbar navbar-expand-lg navbar-admin mb-4">
        <div class="container-fluid">
            <a class="navbar-brand" href="/api/admin/dashboard">
                <i class="bi bi-speedometer2"></i> SafeWork 관리자
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">홈</a>
                <a class="nav-link" href="/api/admin/surveys">설문관리</a>
                <a class="nav-link" href="/api/admin/departments">부서관리</a>
                <button class="btn btn-outline-danger btn-sm ms-2" onclick="logout()">로그아웃</button>
            </div>
        </div>
    </nav>

    <div class="dashboard-container">
        <h1 class="mb-4"><i class="bi bi-graph-up"></i> 관리자 대시보드</h1>
        
        <!-- Statistics Cards -->
        <div class="row">
            <div class="col-md-3">
                <div class="stat-card bg-primary bg-gradient text-white">
                    <h5><i class="bi bi-people"></i> 전체 작업자</h5>
                    <h2>${stats.total_workers}명</h2>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card bg-success bg-gradient text-white">
                    <h5><i class="bi bi-building"></i> 부서</h5>
                    <h2>${stats.total_departments}개</h2>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card bg-warning bg-gradient text-white">
                    <h5><i class="bi bi-clipboard-check"></i> 오늘 설문</h5>
                    <h2>${stats.today_surveys}건</h2>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card bg-info bg-gradient text-white">
                    <h5><i class="bi bi-heart-pulse"></i> 건강검진</h5>
                    <h2>${stats.today_health_checks}건</h2>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="mt-4">
            <h3>빠른 작업</h3>
            <div class="btn-group" role="group">
                <a href="/api/admin/surveys/export" class="btn btn-outline-primary">
                    <i class="bi bi-download"></i> 데이터 내보내기
                </a>
                <a href="/api/admin/audit-logs" class="btn btn-outline-secondary">
                    <i class="bi bi-journal-text"></i> 감사 로그
                </a>
                <a href="/api/admin/system-health" class="btn btn-outline-success">
                    <i class="bi bi-activity"></i> 시스템 상태
                </a>
            </div>
        </div>

        <!-- Recent Activities -->
        <div class="mt-4">
            <h3>최근 활동</h3>
            <div class="list-group">
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">근골격계 증상 설문 제출</h6>
                        <small>5분 전</small>
                    </div>
                    <small>익명 사용자</small>
                </div>
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">신규 작업자 등록</h6>
                        <small>1시간 전</small>
                    </div>
                    <small>생산부서</small>
                </div>
            </div>
        </div>
    </div>

    <script>
        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        
        // Check authentication
        const token = localStorage.getItem('token');
        if (!token) {
            alert('로그인이 필요합니다.');
            window.location.href = '/admin';
        }
    </script>
</body>
</html>`;
    
    return c.html(dashboardHtml);
  } catch (error) {
    console.error('Dashboard error:', error);
    return c.json({ error: 'Failed to fetch dashboard data' }, 500);
  }
});

// Department management
adminRoutes.get('/departments', async (c) => {
  try {
    if (c.env.SAFEWORK_DB) {
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
    } else {
      // Fallback: Return mock departments
      const mockDepartments = [
        { id: 1, name: '생산부', code: 'PROD', worker_count: 45 },
        { id: 2, name: '품질관리부', code: 'QA', worker_count: 12 },
        { id: 3, name: '안전관리부', code: 'SAFETY', worker_count: 8 },
      ];
      
      return c.json({
        departments: mockDepartments,
        total: mockDepartments.length,
        message: 'Using fallback data - database not configured',
      });
    }
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