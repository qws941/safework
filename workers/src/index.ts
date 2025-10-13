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
import { form001CompleteTemplate } from './templates/001-complete';
import { form001Dv06Template } from './templates/001-dv06-restore';
import { survey002FormTemplate } from './templates/survey-002-form';
import { form002WebProgram } from './templates/002-web-program';
import { form002AnalysisTool } from './templates/002-analysis-tool';
import { form003Template } from './templates/003';
import { form004Template } from './templates/004';
import { form005Template } from './templates/005';
import { form006Template } from './templates/006';
import { form001Routes } from './routes/form-001';
import { form002Routes } from './routes/form-002';
import { form003Routes } from './routes/form-003';
import { form004Routes } from './routes/form-004';
import { form005Routes } from './routes/form-005';
import { form006Routes } from './routes/form-006';
import { admin002Routes } from './routes/admin-002';
import { surveyD1Routes } from './routes/survey-d1';
import { survey002D1Routes } from './routes/survey-002-d1';
import { unifiedAdminRoutes } from './routes/admin-unified';
import warningSignRoutes from './routes/warning-sign';
import { nativeApiRoutes } from './routes/native-api';
import queueHandler from './queue-handler';
import { securityHeaders, ProductionSecurityHeaders } from './middleware/securityHeaders';
import { rateLimiter, RateLimitPresets } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

export interface Env {
  // KV Namespaces - CF Native Naming
  SAFEWORK_KV: KVNamespace;  // Unified storage: sessions, forms, cache
  CACHE_LAYER: KVNamespace;
  AUTH_STORE: KVNamespace;

  // D1 Database
  SAFEWORK_DB?: D1Database;
  PRIMARY_DB: D1Database;

  // R2 Object Storage
  SAFEWORK_STORAGE: R2Bucket;

  // Cloudflare Queues (Optional - Requires Paid Plan)
  SAFEWORK_QUEUE?: Queue<any>;

  // Analytics Engine (disabled - Free plan)
  // SAFEWORK_ANALYTICS: AnalyticsEngineDataset;

  // Durable Objects (disabled - not needed for now)
  // SURVEY_SESSION?: DurableObjectNamespace;

  // AI Gateway
  AI: Ai;

  // Environment Variables
  JWT_SECRET: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string; // PBKDF2 hash stored in Cloudflare Secrets
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

  // Track request metrics with Analytics Engine (disabled - Free plan)
  // if (c.env.SAFEWORK_ANALYTICS) {
  //   try {
  //     await c.env.SAFEWORK_ANALYTICS.writeDataPoint({
  //       blobs: [
  //         c.req.path,
  //         c.req.method,
  //         c.res.status.toString(),
  //         c.env.ENVIRONMENT || 'unknown'
  //       ],
  //       doubles: [
  //         Date.now() - start // Response time in ms
  //       ],
  //       indexes: [
  //         c.req.path // Enable querying by path
  //       ]
  //     });
  //   } catch (error) {
  //     console.warn('Analytics logging failed:', error);
  //   }
  // }
});

// Standard middleware
app.use('*', logger());

// Security headers middleware (apply to all routes)
app.use('*', securityHeaders(ProductionSecurityHeaders));

// CORS middleware (apply to all API routes)
app.use('/api/*', cors({
  origin: ['https://safework.jclee.me', 'http://localhost:3000'],
  credentials: true,
}));

// Rate limiting for authentication endpoints (strict)
app.use('/api/auth/login', rateLimiter(RateLimitPresets.LOGIN));
app.use('/api/auth/register', rateLimiter(RateLimitPresets.LOGIN)); // Same as login: 5 req/15min
app.use('/api/auth/refresh', rateLimiter(RateLimitPresets.ADMIN_OPERATIONS)); // 30 req/15min

// Rate limiting for survey submissions (moderate)
app.use('/api/survey/*/submit', rateLimiter(RateLimitPresets.SURVEY_SUBMISSION));
app.use('/api/form/*/submit', rateLimiter(RateLimitPresets.SURVEY_SUBMISSION));

// Rate limiting for admin operations (moderate)
app.use('/api/admin/*', rateLimiter(RateLimitPresets.ADMIN_OPERATIONS));

// Public routes
app.route('/api/auth', authRoutes);
app.route('/api/health', healthRoutes);
app.route('/api/survey', surveyRoutes);
app.route('/api/survey/d1', surveyD1Routes);  // D1 Native API (001)
app.route('/api/survey/d1/002', survey002D1Routes);  // D1 Native API (002)
app.route('/api/excel', excelProcessorRoutes);
app.route('/api/form/001', form001Routes);
app.route('/api/form/002', form002Routes);
app.route('/api/form/003', form003Routes);
app.route('/api/form/004', form004Routes);
app.route('/api/form/005', form005Routes);
app.route('/api/form/006', form006Routes);
app.route('/api/warning-sign', warningSignRoutes);  // Warning Sign Generator (Edge API)
app.route('/api/native', nativeApiRoutes);  // Cloudflare Native Services (R2, Queue, AI)

// Admin routes (temporarily public for testing - add JWT later)
app.route('/api/admin', adminRoutes);  // 001 Admin API
// app.route('/admin', adminRoutes);  // OLD - 001 Admin dashboard pages (disabled for unified)

app.route('/api/admin/002', admin002Routes);  // 002 Admin API
app.route('/admin/002', admin002Routes);  // 002 Admin dashboard pages

app.route('/api/admin/unified', unifiedAdminRoutes);  // Unified Admin API
app.route('/admin', unifiedAdminRoutes);  // NEW Unified Admin dashboard (Phase 1 improvements)

// Keep specific admin pages
app.route('/admin/001', adminRoutes);  // 001-specific admin pages

// Protected routes (require JWT)
app.use('/api/workers/*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env?.JWT_SECRET || 'fallback-secret',
  });
  return jwtMiddleware(c, next);
});

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
      region: (c.req as any).cf?.colo || 'unknown',
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

                            <!-- 002 근골격계부담작업 유해요인조사 -->
                            <div class="col-lg-4 col-md-6">
                                <div class="card h-100 border-info">
                                    <div class="card-header bg-info text-white">
                                        <span class="badge bg-white text-info">002</span> 근골격계부담작업 유해요인조사
                                    </div>
                                    <div class="card-body">
                                        <p class="small">근골격계부담작업 유해요인 조사</p>
                                        <ul class="small text-muted mb-3">
                                            <li>작업 환경 평가</li>
                                            <li>신체 부담 요인 분석</li>
                                            <li>개선 방안 도출</li>
                                        </ul>
                                        <a href="/survey/002_musculoskeletal_symptom_program" class="btn btn-info w-100">
                                            <i class="bi bi-pencil-square"></i> 작성하기
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <!-- 003 근골격계질환 예방관리 프로그램 조사표 -->
                            <div class="col-lg-4 col-md-6">
                                <div class="card h-100 border-success">
                                    <div class="card-header bg-success text-white">
                                        <span class="badge bg-white text-success">003</span> 근골격계질환 예방관리 프로그램 조사표
                                    </div>
                                    <div class="card-body">
                                        <p class="small">근골격계 질환 예방 관리 프로그램</p>
                                        <ul class="small text-muted mb-3">
                                            <li>신체 부위별 통증 조사</li>
                                            <li>통증 강도 및 빈도 평가</li>
                                            <li>일상생활 지장도 체크</li>
                                        </ul>
                                        <a href="/survey/003_musculoskeletal_program" class="btn btn-success w-100">
                                            <i class="bi bi-pencil-square"></i> 작성하기
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <!-- 004 산업재해 실태조사표 -->
                            <div class="col-lg-4 col-md-6">
                                <div class="card h-100 border-danger">
                                    <div class="card-header bg-danger text-white">
                                        <span class="badge bg-white text-danger">004</span> 산업재해 실태조사표
                                    </div>
                                    <div class="card-body">
                                        <p class="small">산업재해 발생 현황 및 예방 실태조사</p>
                                        <ul class="small text-muted mb-3">
                                            <li>재해 발생 정보 기록</li>
                                            <li>원인 분석 및 예방대책</li>
                                            <li>피재자 정보 관리</li>
                                        </ul>
                                        <a href="/survey/004_industrial_accident_survey" class="btn btn-danger w-100">
                                            <i class="bi bi-pencil-square"></i> 작성하기
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <!-- 005 유해요인 기본조사표 -->
                            <div class="col-lg-4 col-md-6">
                                <div class="card h-100 border-warning">
                                    <div class="card-header bg-warning text-dark">
                                        <span class="badge bg-white text-warning">005</span> 유해요인 기본조사표
                                    </div>
                                    <div class="card-body">
                                        <p class="small">작업환경 유해요인 기본조사 및 위험성 평가</p>
                                        <ul class="small text-muted mb-3">
                                            <li>물리적/화학적 유해요인</li>
                                            <li>인간공학적 유해요인</li>
                                            <li>심리사회적 유해요인</li>
                                        </ul>
                                        <a href="/survey/005_basic_hazard_factor_survey" class="btn btn-warning w-100">
                                            <i class="bi bi-pencil-square"></i> 작성하기
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <!-- 006 고령근로자 작업투입 승인요청서 -->
                            <div class="col-lg-4 col-md-6">
                                <div class="card h-100 border-dark">
                                    <div class="card-header bg-dark text-white">
                                        <span class="badge bg-white text-dark">006</span> 고령근로자 작업투입 승인요청서
                                    </div>
                                    <div class="card-body">
                                        <p class="small">고령근로자 작업 배치 및 관리</p>
                                        <ul class="small text-muted mb-3">
                                            <li>고령근로자 건강상태 평가</li>
                                            <li>작업 적합성 검토</li>
                                            <li>안전관리 승인절차</li>
                                        </ul>
                                        <a href="/survey/006_elderly_worker_approval_form" class="btn btn-dark w-100">
                                            <i class="bi bi-pencil-square"></i> 작성하기
                                        </a>
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

// User login page
app.get('/auth/login', (c) => {
  const loginHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>로그인 - SafeWork</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 min-h-screen">
    <div class="min-h-screen flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
            <div class="text-center mb-8">
                <i class="fas fa-user-circle text-5xl text-indigo-600 mb-4"></i>
                <h1 class="text-3xl font-bold text-gray-800">로그인</h1>
                <p class="text-gray-600 mt-2">SafeWork 안전보건 관리시스템</p>
            </div>
            
            <div id="error-message" class="hidden mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span id="error-text"></span>
            </div>

            <form id="login-form" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-user mr-1"></i> 사용자명
                    </label>
                    <input 
                        type="text" 
                        id="username" 
                        required
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="사용자명을 입력하세요">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-lock mr-1"></i> 비밀번호
                    </label>
                    <input 
                        type="password" 
                        id="password" 
                        required
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="비밀번호를 입력하세요">
                </div>
                
                <button 
                    type="submit" 
                    id="submit-btn"
                    class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition duration-200 font-semibold shadow-lg">
                    <i class="fas fa-sign-in-alt mr-2"></i> 로그인
                </button>
            </form>
            
            <div class="mt-6 text-center space-y-3">
                <p class="text-gray-600">
                    계정이 없으신가요? 
                    <a href="/auth/register" class="text-indigo-600 hover:text-indigo-800 font-semibold">
                        회원가입
                    </a>
                </p>
                <a href="/" class="block text-gray-500 hover:text-gray-700 text-sm">
                    <i class="fas fa-arrow-left mr-1"></i> 메인 페이지로 돌아가기
                </a>
            </div>
        </div>
    </div>

    <script>
        const form = document.getElementById('login-form');
        const submitBtn = document.getElementById('submit-btn');
        const errorMessage = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');

        function showError(message) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
        }

        function hideError() {
            errorMessage.classList.add('hidden');
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideError();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showError('사용자명과 비밀번호를 입력해주세요.');
                return;
            }

            // Disable button during request
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 로그인 중...';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                
                if (data.success && data.token) {
                    // Store token and user info
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Show success message
                    submitBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> 로그인 성공!';
                    submitBtn.classList.remove('from-indigo-600', 'to-purple-600');
                    submitBtn.classList.add('from-green-600', 'to-green-600');
                    
                    // Redirect after short delay
                    setTimeout(() => {
                        window.location.href = data.redirect || '/';
                    }, 1000);
                } else {
                    showError(data.error || '로그인에 실패했습니다.');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> 로그인';
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> 로그인';
            }
        });
    </script>
</body>
</html>`;
  
  return c.html(loginHtml);
});

// User registration page
app.get('/auth/register', (c) => {
  const registerHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>회원가입 - SafeWork</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 min-h-screen">
    <div class="min-h-screen flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
            <div class="text-center mb-8">
                <i class="fas fa-user-plus text-5xl text-indigo-600 mb-4"></i>
                <h1 class="text-3xl font-bold text-gray-800">회원가입</h1>
                <p class="text-gray-600 mt-2">SafeWork 안전보건 관리시스템</p>
            </div>
            
            <div id="error-message" class="hidden mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span id="error-text"></span>
            </div>

            <div id="success-message" class="hidden mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                <i class="fas fa-check-circle mr-2"></i>
                <span id="success-text"></span>
            </div>

            <form id="register-form" class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-user mr-1"></i> 사용자명 <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" 
                        id="username" 
                        required
                        pattern="[a-zA-Z0-9_-]{3,30}"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="3-30자 (영문, 숫자, _, -)">
                    <p class="text-xs text-gray-500 mt-1">영문, 숫자, 언더스코어(_), 하이픈(-) 사용 가능</p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-lock mr-1"></i> 비밀번호 <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="password" 
                        id="password" 
                        required
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="비밀번호 (최소 12자)">
                    <div class="mt-2 text-xs space-y-1">
                        <p id="pw-length" class="text-gray-500"><i class="fas fa-circle text-xs mr-1"></i> 최소 12자 이상</p>
                        <p id="pw-lower" class="text-gray-500"><i class="fas fa-circle text-xs mr-1"></i> 소문자 포함</p>
                        <p id="pw-upper" class="text-gray-500"><i class="fas fa-circle text-xs mr-1"></i> 대문자 포함</p>
                        <p id="pw-number" class="text-gray-500"><i class="fas fa-circle text-xs mr-1"></i> 숫자 포함</p>
                        <p id="pw-special" class="text-gray-500"><i class="fas fa-circle text-xs mr-1"></i> 특수문자 포함</p>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-lock mr-1"></i> 비밀번호 확인 <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="password" 
                        id="password-confirm" 
                        required
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="비밀번호를 다시 입력하세요">
                    <p id="pw-match" class="text-xs text-gray-500 mt-1"></p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-envelope mr-1"></i> 이메일 (선택)
                    </label>
                    <input 
                        type="email" 
                        id="email" 
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="example@domain.com">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-id-card mr-1"></i> 이름 (선택)
                    </label>
                    <input 
                        type="text" 
                        id="full_name" 
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="실명">
                </div>
                
                <button 
                    type="submit" 
                    id="submit-btn"
                    class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition duration-200 font-semibold shadow-lg">
                    <i class="fas fa-user-plus mr-2"></i> 회원가입
                </button>
            </form>
            
            <div class="mt-6 text-center space-y-3">
                <p class="text-gray-600">
                    이미 계정이 있으신가요? 
                    <a href="/auth/login" class="text-indigo-600 hover:text-indigo-800 font-semibold">
                        로그인
                    </a>
                </p>
                <a href="/" class="block text-gray-500 hover:text-gray-700 text-sm">
                    <i class="fas fa-arrow-left mr-1"></i> 메인 페이지로 돌아가기
                </a>
            </div>
        </div>
    </div>

    <script>
        const form = document.getElementById('register-form');
        const submitBtn = document.getElementById('submit-btn');
        const errorMessage = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        const successMessage = document.getElementById('success-message');
        const successText = document.getElementById('success-text');
        const passwordInput = document.getElementById('password');
        const passwordConfirmInput = document.getElementById('password-confirm');

        function showError(message) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
            successMessage.classList.add('hidden');
        }

        function showSuccess(message) {
            successText.textContent = message;
            successMessage.classList.remove('hidden');
            errorMessage.classList.add('hidden');
        }

        function hideMessages() {
            errorMessage.classList.add('hidden');
            successMessage.classList.add('hidden');
        }

        // Real-time password validation
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            
            // Length check
            const lengthCheck = document.getElementById('pw-length');
            if (password.length >= 12) {
                lengthCheck.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i> 최소 12자 이상';
                lengthCheck.classList.remove('text-gray-500');
                lengthCheck.classList.add('text-green-600');
            } else {
                lengthCheck.innerHTML = '<i class="fas fa-circle text-xs mr-1"></i> 최소 12자 이상';
                lengthCheck.classList.remove('text-green-600');
                lengthCheck.classList.add('text-gray-500');
            }

            // Lowercase check
            const lowerCheck = document.getElementById('pw-lower');
            if (/[a-z]/.test(password)) {
                lowerCheck.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i> 소문자 포함';
                lowerCheck.classList.remove('text-gray-500');
                lowerCheck.classList.add('text-green-600');
            } else {
                lowerCheck.innerHTML = '<i class="fas fa-circle text-xs mr-1"></i> 소문자 포함';
                lowerCheck.classList.remove('text-green-600');
                lowerCheck.classList.add('text-gray-500');
            }

            // Uppercase check
            const upperCheck = document.getElementById('pw-upper');
            if (/[A-Z]/.test(password)) {
                upperCheck.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i> 대문자 포함';
                upperCheck.classList.remove('text-gray-500');
                upperCheck.classList.add('text-green-600');
            } else {
                upperCheck.innerHTML = '<i class="fas fa-circle text-xs mr-1"></i> 대문자 포함';
                upperCheck.classList.remove('text-green-600');
                upperCheck.classList.add('text-gray-500');
            }

            // Number check
            const numberCheck = document.getElementById('pw-number');
            if (/[0-9]/.test(password)) {
                numberCheck.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i> 숫자 포함';
                numberCheck.classList.remove('text-gray-500');
                numberCheck.classList.add('text-green-600');
            } else {
                numberCheck.innerHTML = '<i class="fas fa-circle text-xs mr-1"></i> 숫자 포함';
                numberCheck.classList.remove('text-green-600');
                numberCheck.classList.add('text-gray-500');
            }

            // Special character check
            const specialCheck = document.getElementById('pw-special');
            if (/[^a-zA-Z0-9]/.test(password)) {
                specialCheck.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i> 특수문자 포함';
                specialCheck.classList.remove('text-gray-500');
                specialCheck.classList.add('text-green-600');
            } else {
                specialCheck.innerHTML = '<i class="fas fa-circle text-xs mr-1"></i> 특수문자 포함';
                specialCheck.classList.remove('text-green-600');
                specialCheck.classList.add('text-gray-500');
            }
        });

        // Password match check
        passwordConfirmInput.addEventListener('input', function() {
            const password = passwordInput.value;
            const confirmPassword = this.value;
            const matchMessage = document.getElementById('pw-match');

            if (confirmPassword === '') {
                matchMessage.textContent = '';
                return;
            }

            if (password === confirmPassword) {
                matchMessage.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i> 비밀번호가 일치합니다';
                matchMessage.classList.remove('text-gray-500', 'text-red-500');
                matchMessage.classList.add('text-green-600');
            } else {
                matchMessage.innerHTML = '<i class="fas fa-times-circle text-red-500 mr-1"></i> 비밀번호가 일치하지 않습니다';
                matchMessage.classList.remove('text-gray-500', 'text-green-600');
                matchMessage.classList.add('text-red-500');
            }
        });

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideMessages();

            const username = document.getElementById('username').value.trim();
            const password = passwordInput.value;
            const passwordConfirm = passwordConfirmInput.value;
            const email = document.getElementById('email').value.trim() || undefined;
            const full_name = document.getElementById('full_name').value.trim() || undefined;
            
            // Client-side validation
            if (!username || !password) {
                showError('사용자명과 비밀번호를 입력해주세요.');
                return;
            }

            if (password !== passwordConfirm) {
                showError('비밀번호가 일치하지 않습니다.');
                return;
            }

            // Disable button during request
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 가입 중...';
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        username, 
                        password, 
                        email, 
                        full_name 
                    })
                });

                const data = await response.json();
                
                if (data.success && data.token) {
                    // Store token and user info
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Show success message
                    showSuccess('회원가입이 완료되었습니다! 로그인되었습니다.');
                    submitBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> 가입 완료!';
                    submitBtn.classList.remove('from-indigo-600', 'to-purple-600');
                    submitBtn.classList.add('from-green-600', 'to-green-600');
                    
                    // Redirect after short delay
                    setTimeout(() => {
                        window.location.href = data.redirect || '/';
                    }, 1500);
                } else {
                    // Show detailed error messages
                    if (data.details && Array.isArray(data.details)) {
                        showError(data.details.join(' '));
                    } else {
                        showError(data.error || '회원가입에 실패했습니다.');
                    }
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-user-plus mr-2"></i> 회원가입';
                }
            } catch (error) {
                console.error('Registration error:', error);
                showError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-user-plus mr-2"></i> 회원가입';
            }
        });
    </script>
</body>
</html>`;
  
  return c.html(registerHtml);
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

  // dv06_2025-09-26_10-36_Flask_089eeaf 복구 버전
  if (surveyType === '001_musculoskeletal_symptom_survey') {
    console.log('✅ 001 DV06 RESTORE - dv06_2025-09-26_10-36_Flask_089eeaf - CLOUDFLARE WORKERS NATIVE');
    return c.html(form001Dv06Template);
  }

  if (surveyType === '002_musculoskeletal_symptom_program') {
    console.log('✅ 002 Analysis Tool - 001 Survey Data Analysis with NIOSH');
    return c.html(form002AnalysisTool);
  }

  if (surveyType === '003_musculoskeletal_program') {
    console.log('✅ 003 Musculoskeletal Disease Prevention Program Survey');
    return c.html(form003Template);
  }

  if (surveyType === '004_industrial_accident_survey') {
    console.log('✅ 004 Industrial Accident Survey');
    return c.html(form004Template);
  }

  if (surveyType === '005_basic_hazard_factor_survey') {
    console.log('✅ 005 Basic Hazard Factor Survey');
    return c.html(form005Template);
  }

  if (surveyType === '006_elderly_worker_approval_form') {
    console.log('✅ 006 Elderly Worker Assignment Approval Request Form');
    return c.html(form006Template);
  }

  if (surveyType === '002_excel_download_legacy') {
    console.log('✅ 002 Excel-based Hazard Assessment Tool - Download Page (LEGACY)');
    const downloadPageHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>002 근골격계부담작업 유해요인조사 - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px 0;
        }
        .download-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .excel-icon {
            font-size: 4rem;
            color: #217346;
        }
        .btn-download {
            background: #217346;
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 1.2rem;
            border-radius: 10px;
        }
        .btn-download:hover {
            background: #1a5c37;
            color: white;
        }
    </style>
</head>
<body>
    <div class="download-container">
        <div class="text-center mb-4">
            <i class="bi bi-file-earmark-excel excel-icon"></i>
            <h1 class="display-5 mt-3">002 근골격계부담작업 유해요인조사</h1>
            <p class="lead text-muted">Excel 기반 평가 도구</p>
        </div>

        <div class="alert alert-info">
            <i class="bi bi-info-circle"></i>
            <strong>안내:</strong> 이 조사는 Excel 파일을 다운로드하여 작성하는 방식입니다.
        </div>

        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title"><i class="bi bi-clipboard-check"></i> 조사 내용</h5>
                <ul class="mb-0">
                    <li>작업 환경 평가</li>
                    <li>신체 부담 요인 분석</li>
                    <li>근골격계 질환 위험도 평가</li>
                    <li>개선 방안 도출</li>
                </ul>
            </div>
        </div>

        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title"><i class="bi bi-download"></i> 다운로드</h5>
                <p class="text-muted">Excel 파일을 다운로드하여 작성 후, 관리자에게 제출해주세요.</p>
                <a href="/api/excel/download/002" class="btn btn-download w-100">
                    <i class="bi bi-file-earmark-excel"></i> Excel 파일 다운로드 (1.8MB)
                </a>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <h5 class="card-title"><i class="bi bi-question-circle"></i> 사용 안내</h5>
                <ol>
                    <li>Excel 파일을 다운로드합니다</li>
                    <li>파일을 열어 각 항목을 작성합니다</li>
                    <li>작성 완료 후 저장합니다</li>
                    <li>관리자에게 파일을 제출합니다</li>
                </ol>
                <a href="/api/excel/download/002-guide" class="btn btn-outline-primary mt-2">
                    <i class="bi bi-file-pdf"></i> 사용안내서 다운로드 (PDF)
                </a>
            </div>
        </div>

        <div class="text-center mt-4">
            <a href="/" class="btn btn-secondary">
                <i class="bi bi-house"></i> 메인으로 돌아가기
            </a>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
    return c.html(downloadPageHtml);
  }

  // Map survey types to template keys
  const formTemplates: Record<string, string> = {
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
    const surveyTitles: Record<string, string> = {
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

// Global Error Handler - Must be registered with app.onError()
app.onError(errorHandler);

// 404 Not Found Handler - Must be registered after all routes
app.notFound(notFoundHandler);

// Export both HTTP handler and Queue consumer
export default {
  fetch: app.fetch,
  queue: queueHandler.queue,
};

// Cloud Native Architecture - 100% Cloudflare Workers
// Last updated: 2025-10-04

