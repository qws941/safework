import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { logger } from 'hono/logger';
import { surveyRoutes } from './routes/survey';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { workerRoutes } from './routes/worker';
import { excelProcessorRoutes } from './routes/excel-processor';
import { form002Template } from './templates/002';
import { form001Template } from './templates/001';

export interface Env {
  // KV Namespaces - CF Native Naming
  SAFEWORK_KV: KVNamespace;
  SESSION_STORE: KVNamespace;
  CACHE_LAYER: KVNamespace;
  AUTH_STORE: KVNamespace;

  // D1 Database
  SAFEWORK_DB?: D1Database;

  // Analytics Engine
  SAFEWORK_ANALYTICS: AnalyticsEngineDataset;

  // Durable Objects
  SURVEY_SESSION: DurableObjectNamespace;

  // AI Gateway
  AI: Ai;

  // Environment Variables
  JWT_SECRET: string;
  ADMIN_USERNAME: string;
  BACKEND_URL: string;
  DEBUG: string;
  ENVIRONMENT: string;

  [key: string]: any;
}

const app = new Hono<{ Bindings: Env }>();

// Cloudflare Native Analytics Middleware
app.use('*', async (c, next) => {
  const start = Date.now();

  await next();

  // Track request metrics with Analytics Engine
  if (c.env.SAFEWORK_ANALYTICS) {
    try {
      await c.env.SAFEWORK_ANALYTICS.writeDataPoint({
        blobs: [
          c.req.path,
          c.req.method,
          c.res.status.toString(),
          c.env.ENVIRONMENT || 'unknown'
        ],
        doubles: [
          Date.now() - start // Response time in ms
        ],
        indexes: [
          c.req.path // Enable querying by path
        ]
      });
    } catch (error) {
      console.warn('Analytics logging failed:', error);
    }
  }
});

// Standard middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: ['https://safework.jclee.me', 'http://localhost:3000'],
  credentials: true,
}));

// Public routes
app.route('/api/auth', authRoutes);
app.route('/api/health', healthRoutes);
app.route('/api/survey', surveyRoutes);
app.route('/api/excel', excelProcessorRoutes);

// Protected routes (require JWT)
app.use('/api/admin/*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env?.JWT_SECRET || 'fallback-secret',
  });
  return jwtMiddleware(c, next);
});

app.route('/api/admin', adminRoutes);
app.route('/api/workers', workerRoutes);

// Cloudflare Native Analytics Dashboard
app.get('/api/analytics/dashboard', async (c) => {
  if (!c.env.CACHE_LAYER) {
    return c.json({ error: 'Analytics not available' }, 503);
  }

  try {
    // Get cached analytics data
    const cachedData = await c.env.CACHE_LAYER.get('analytics:dashboard', 'json');

    if (cachedData) {
      return c.json({
        status: 'success',
        data: cachedData,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    // If no cache, return basic metrics
    const basicMetrics = {
      platform: 'Cloudflare Workers',
      region: c.req.cf?.colo || 'unknown',
      timestamp: new Date().toISOString(),
      features: {
        kv_namespaces: 4,
        d1_database: true,
        analytics_engine: true,
        durable_objects: true,
        ai_gateway: true
      }
    };

    // Cache for 5 minutes
    await c.env.CACHE_LAYER.put('analytics:dashboard', JSON.stringify(basicMetrics), {
      expirationTtl: 300
    });

    return c.json({
      status: 'success',
      data: basicMetrics,
      source: 'live',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return c.json({
      error: 'Analytics dashboard error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// SafeWork Main UI - Using Original Flask UI Design
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <title>홈 - SafeWork 안전보건 관리시스템</title>
    
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Custom CSS -->
    <style>
        :root {
            --primary-color: #2563eb;
            --secondary-color: #64748b;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #3b82f6;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding-bottom: 60px;
        }
        
        .main-container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            margin: 20px;
            padding: 30px;
        }
        
        @media (max-width: 768px) {
            .main-container {
                margin: 10px;
                padding: 20px;
                border-radius: 15px;
            }
        }
        
        .navbar-custom {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .navbar-custom .navbar-brand,
        .navbar-custom .nav-link {
            color: white !important;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 10px;
            padding: 12px 30px;
            font-weight: 600;
            transition: transform 0.2s;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        
        .form-control, .form-select {
            border-radius: 10px;
            border: 2px solid #e2e8f0;
            padding: 12px;
            font-size: 16px;
        }
        
        .form-control:focus, .form-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
        }
        
        .section-card {
            background: white;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .section-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            background: white;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
            padding: 10px 0;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-custom">
        <div class="container-fluid">
            <a class="navbar-brand" href="/">
                <i class="bi bi-hospital"></i> SafeWork 안전보건 관리시스템
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                            <i class="bi bi-file-text"></i> 문서자료
                        </a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="/document">문서 목록</a></li>
                            <li><a class="dropdown-item" href="/document/templates">템플릿 양식</a></li>
                            <li><a class="dropdown-item" href="/document/search">문서 검색</a></li>
                        </ul>
                    </li>
                    
                    <li class="nav-item">
                        <a class="nav-link" href="/survey/new">
                            <i class="bi bi-pencil-square"></i> 조사표 작성
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/auth/login">
                            <i class="bi bi-box-arrow-in-right"></i> 로그인
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/auth/register">
                            <i class="bi bi-person-plus"></i> 회원가입
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="container-fluid">
        <div class="main-container">
            <div class="text-center mb-5">
                <h1 class="display-4 fw-bold mb-4">
                    <i class="bi bi-clipboard2-pulse"></i><br>
                    안전보건 관리 시스템
                </h1>
                <p class="lead text-muted">직원 여러분의 건강하고 안전한 근무환경을 위한 통합 관리 시스템</p>
            </div>

            <div class="row g-4 mb-4">
                <div class="col-12">
                    <div class="section-card">
                        <h4 class="section-title mb-4">
                            <i class="bi bi-file-text"></i> 작성 가능한 양식
                        </h4>
                        <div class="row g-3">
                            <!-- 001 근골격계 증상조사표 -->
                            <div class="col-lg-4 col-md-6">
                                <div class="card h-100 border-primary">
                                    <div class="card-header bg-primary text-white">
                                        <span class="badge bg-white text-primary">001</span> 근골격계 증상조사표
                                    </div>
                                    <div class="card-body">
                                        <p class="small">근골격계 질환 예방을 위한 증상 조사</p>
                                        <ul class="small text-muted mb-3">
                                            <li>작업 자세 및 반복 동작 평가</li>
                                            <li>신체 부위별 증상 체크</li>
                                            <li>작업 환경 개선 자료</li>
                                        </ul>
                                        <a href="/survey/001_musculoskeletal_symptom_survey" class="btn btn-primary w-100">
                                            <i class="bi bi-pencil-square"></i> 작성하기
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 002 신규 입사자 건강검진 양식 -->
                            <div class="col-lg-4 col-md-6">
                                <div class="card h-100 border-info">
                                    <div class="card-header bg-info text-white">
                                        <span class="badge bg-white text-info">002</span> 신규 입사자 건강검진
                                    </div>
                                    <div class="card-body">
                                        <p class="small">신규 입사자 건강 상태 확인</p>
                                        <ul class="small text-muted mb-3">
                                            <li>기본 신체 정보</li>
                                            <li>기존 질환 이력</li>
                                            <li>생활 습관 조사</li>
                                        </ul>
                                        <a href="/survey/002_new_employee_health_checkup" class="btn btn-info w-100">
                                            <i class="bi bi-pencil-square"></i> 작성하기
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 추가 양식을 위한 placeholder -->
                            <div class="col-lg-4 col-md-6">
                                <div class="card h-100 border-secondary">
                                    <div class="card-header bg-secondary text-white">
                                        <span class="badge bg-white text-secondary">+</span> 추가 예정
                                    </div>
                                    <div class="card-body">
                                        <p class="small text-muted">더 많은 양식이 추가될 예정입니다</p>
                                        <ul class="small text-muted mb-3">
                                            <li>작업환경측정 결과서</li>
                                            <li>안전교육 이수증</li>
                                            <li>건강검진 결과 보고서</li>
                                        </ul>
                                        <button class="btn btn-secondary w-100" disabled>
                                            <i class="bi bi-clock"></i> 준비중
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <!-- 로그인/회원가입 섹션 -->
                <div class="col-12">
                    <div class="section-card">
                        <div class="row align-items-center">
                            <div class="col-md-6 text-center mb-4 mb-md-0">
                                <i class="bi bi-person-circle" style="font-size: 4rem; color: var(--primary-color);"></i>
                                <h3 class="mt-3">더 많은 기능을 이용하세요</h3>
                                <p class="text-muted">로그인하시면 제출 이력 확인 및 개인 맞춤 서비스를 이용하실 수 있습니다.</p>
                            </div>
                            <div class="col-md-6">
                                <div class="d-grid gap-2">
                                    <a href="/auth/login" class="btn btn-primary btn-lg">
                                        <i class="bi bi-box-arrow-in-right"></i> 로그인
                                    </a>
                                    <a href="/auth/register" class="btn btn-outline-primary btn-lg">
                                        <i class="bi bi-person-plus"></i> 회원가입
                                    </a>
                                </div>
                                <p class="text-center mt-3 text-muted small">
                                    회원가입 후 모든 서비스를 무료로 이용하실 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section-card mt-4">
                <h4 class="section-title">
                    <i class="bi bi-info-circle"></i> 조사 안내
                </h4>
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <div class="d-flex align-items-start">
                            <div class="flex-shrink-0">
                                <span class="badge bg-primary rounded-circle p-2">1</span>
                            </div>
                            <div class="flex-grow-1 ms-3">
                                <h6>정확한 정보 입력</h6>
                                <p class="text-muted small">본인의 증상을 정확하게 체크해주세요</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="d-flex align-items-start">
                            <div class="flex-shrink-0">
                                <span class="badge bg-primary rounded-circle p-2">2</span>
                            </div>
                            <div class="flex-grow-1 ms-3">
                                <h6>개인정보 보호</h6>
                                <p class="text-muted small">제출된 정보는 안전하게 관리됩니다</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="d-flex align-items-start">
                            <div class="flex-shrink-0">
                                <span class="badge bg-primary rounded-circle p-2">3</span>
                            </div>
                            <div class="flex-grow-1 ms-3">
                                <h6>건강관리 지원</h6>
                                <p class="text-muted small">조사 결과를 바탕으로 개선방안을 마련합니다</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div class="container text-center">
            <small class="text-muted">© 2024 SafeWork v1.0 - Powered by Cloudflare Workers</small>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
</body>
</html>`;
  
  return c.html(html);
});

// Admin panel route
app.get('/admin', (c) => {
  const adminHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeWork 관리자 패널</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="min-h-screen flex items-center justify-center">
        <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div class="text-center mb-8">
                <i class="fas fa-shield-alt text-4xl text-blue-600 mb-4"></i>
                <h1 class="text-2xl font-bold text-gray-800">관리자 로그인</h1>
                <p class="text-gray-600 mt-2">SafeWork 관리 시스템에 접속합니다</p>
            </div>
            
            <form id="admin-form" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">사용자명</label>
                    <input type="text" id="username" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="관리자 아이디를 입력하세요">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                    <input type="password" id="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="비밀번호를 입력하세요">
                </div>
                
                <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200">
                    로그인
                </button>
            </form>
            
            <div class="mt-6 text-center">
                <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">← 메인 페이지로 돌아가기</a>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('admin-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Call login API
            fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    alert('관리자 로그인 성공!');
                    // Redirect to admin dashboard
                    window.location.href = data.redirect || '/api/admin/dashboard';
                } else {
                    alert('잘못된 인증 정보입니다.');
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                alert('로그인 중 오류가 발생했습니다.');
            });
        });
    </script>
</body>
</html>`;
  
  return c.html(adminHtml);
});

// Survey form route - using actual form templates
app.get('/survey/:surveyType', async (c) => {
  const surveyType = c.req.param('surveyType');
  
  // FORCE embedded templates first
  if (surveyType === '001_musculoskeletal_symptom_survey') {
    console.log('✅ 001 PREMIUM UI LOADED - 근골격계 증상조사표 - FORCE DEPLOY');
    return c.html(form001Template);
  }

  if (surveyType === '002_musculoskeletal_symptom_program') {
    console.log('✅ 002 PREMIUM ADMIN DASHBOARD LOADED - MANAGEMENT INTERFACE ACTIVE! - CLOUDFLARE WORKERS PIPELINE - PERFECT SUCCESS V5');
    return c.html(form002Template);
  }
  
  // Map survey types to template keys
  const formTemplates = {
    '001_musculoskeletal_symptom_survey': '001',
    '002_musculoskeletal_symptom_program': '002',
    '003_cardiovascular_risk_assessment': '003',
    '004_industrial_accident_survey': '004',
    '005_basic_hazard_factor_survey': '005',
    '006_elderly_worker_approval_form': '006'
  };
  
  const templateKey = formTemplates[surveyType];
  if (!templateKey) {
    return c.text('Form not found', 404);
  }
  
  try {
    
    // Try to get the actual form template from KV store for other forms
    const template = await c.env.SAFEWORK_KV.get(`${templateKey}_form.html`);
    if (template) {
      return c.html(template);
    }
    
    // Fallback: Generate basic form if template not found
    const surveyTitles = {
      '001_musculoskeletal_symptom_survey': '근골격계 증상조사표',
      '002_musculoskeletal_symptom_program': '근골격계부담작업 유해요인조사', 
      '003_cardiovascular_risk_assessment': '심뇌혈관질환 위험도평가',
      '004_industrial_accident_survey': '산업재해 실태조사표',
      '005_basic_hazard_factor_survey': '유해요인 기본조사표',
      '006_elderly_worker_approval_form': '고령근로자 작업투입 승인요청서'
    };
    
    const title = surveyTitles[surveyType] || '설문조사';
    
    const fallbackHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px 0;
        }
        .survey-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="survey-container">
        <div class="text-center mb-5">
            <h1 class="display-5">${title}</h1>
            <p class="text-muted">템플릿을 로드하는 중입니다...</p>
            <div class="spinner-border text-primary" role="status"></div>
        </div>
        <div class="alert alert-info">
            <strong>알림:</strong> 실제 ${title} 양식이 준비되지 않았습니다. 관리자에게 문의해주세요.
        </div>
        <div class="text-center">
            <a href="/" class="btn btn-primary btn-lg">
                <i class="bi bi-house"></i> 메인으로 돌아가기
            </a>
        </div>
    </div>
</body>
</html>`;
    
    return c.html(fallbackHtml);
    
  } catch (error) {
    console.error('Template loading error:', error);
    return c.text('Failed to load form template', 500);
  }
});

// 404 handler
app.notFound((c) => {
  const notFoundHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>페이지를 찾을 수 없습니다 - SafeWork</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center">
    <div class="text-center">
        <div class="mb-8">
            <i class="fas fa-hard-hat text-6xl text-gray-400 mb-4"></i>
            <h1 class="text-6xl font-bold text-gray-800 mb-4">404</h1>
            <h2 class="text-2xl font-semibold text-gray-600 mb-4">페이지를 찾을 수 없습니다</h2>
            <p class="text-gray-500 mb-8">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
        </div>
        
        <div class="space-y-4">
            <a href="/" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-200">
                <i class="fas fa-home mr-2"></i>메인 페이지로 이동
            </a>
            <br>
            <a href="/api/health" class="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition duration-200">
                <i class="fas fa-heartbeat mr-2"></i>시스템 상태 확인
            </a>
        </div>
    </div>
</body>
</html>`;
  
  return c.html(notFoundHtml);
});

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err}`);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;// Cloud Native UI Migration - 001 Form Update 2025. 09. 29. (월) 18:03:28 KST
