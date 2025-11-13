import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { workerRoutes } from './routes/worker';
import { excelProcessorRoutes } from './routes/excel-processor';
import { form001Dv06Template } from './templates/001-dv06-restore';
import { form001Routes } from './routes/form-001';
import { surveyD1Routes } from './routes/survey-d1';
import { analysisRoutes } from './routes/analysis';
import { unifiedAdminRoutes } from './routes/admin-unified';
import warningSignRoutes from './routes/warning-sign';
import { nativeApiRoutes } from './routes/native-api';
import { healthExamRoutes } from './routes/health-exam';
import { workEnvironmentRoutes } from './routes/work-environment';
import { safetyEducationRoutes } from './routes/safety-education';
import metricsRoutes from './routes/metrics';
import queueHandler from './queue-handler';
import { securityHeaders, ProductionSecurityHeaders } from './middleware/securityHeaders';
import { logRequest } from './utils/loki-logger';
import { rateLimiter, RateLimitPresets } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

export interface Env {
  // KV Namespaces - CF Native Naming
  SAFEWORK_KV: KVNamespace;  // Unified storage: sessions, forms, cache
  CACHE_LAYER: KVNamespace;
  AUTH_STORE: KVNamespace;

  // D1 Database
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

  // Slack Integration (stored as secrets)
  SLACK_WEBHOOK_URL?: string; // Incoming webhook URL from n8n or Slack
  SLACK_BOT_TOKEN?: string;   // Bot User OAuth Token (optional, for advanced features)

  [key: string]: any;
}

const app = new Hono<{ Bindings: Env }>();

// Observability Middleware - Loki Logging + Performance Tracking
// CLAUDE.md Compliance: Constitutional Framework v11.11
app.use('*', async (c, next) => {
  const start = Date.now();

  await next();

  const duration = Date.now() - start;

  // Log to Grafana Loki (fail-open, non-blocking)
  try {
    await logRequest(
      c.env,
      c.req.method,
      c.req.path,
      c.res.status,
      duration,
      {
        user_agent: c.req.header('User-Agent') || 'unknown',
        cf_ray: c.req.header('CF-Ray') || 'unknown',
        ...(c.req.header('Authorization') && { authenticated: true })
      }
    );
  } catch (error) {
    // Fail-open: Don't block request if logging fails
    console.warn('Loki logging failed (non-blocking):', error);
  }

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
app.route('/metrics', metricsRoutes);  // Prometheus metrics endpoint (CLAUDE.md compliance)
app.route('/api/survey/d1', surveyD1Routes);  // D1 Native API (001)
app.route('/api/excel', excelProcessorRoutes);
app.route('/api/form/001', form001Routes);
app.route('/api/analysis', analysisRoutes);  // Form 002, 003, 004 - Analysis Tools based on Form 001 data
app.route('/api/warning-sign', warningSignRoutes);  // Warning Sign Generator (Edge API)
app.route('/api/native', nativeApiRoutes);  // Cloudflare Native Services (R2, Queue, AI)
app.route('/api/health-exam', healthExamRoutes);  // Health Examination Management (Forms 007-008)
app.route('/api/work-environment', workEnvironmentRoutes);  // Work Environment Measurement (Forms 009-010)
app.route('/api/safety-education', safetyEducationRoutes);  // Safety Education Management (Forms 011-012)

// Admin routes - Unified Dashboard (all forms 001-006)
app.route('/admin', unifiedAdminRoutes);  // Unified Admin dashboard pages
app.route('/api/admin', unifiedAdminRoutes);  // Unified Admin API

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

// SafeWork Main UI - Simplified to 2 main actions
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeWork 안전보건 관리시스템</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        :root {
            --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        body {
            background: var(--gradient-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .main-container {
            max-width: 600px;
            width: 100%;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 20px;
            padding: 60px 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
        }
        .logo {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: #1f2937;
        }
        .subtitle {
            color: #6b7280;
            margin-bottom: 3rem;
        }
        .action-btn {
            width: 100%;
            padding: 20px;
            font-size: 1.1rem;
            font-weight: 600;
            border-radius: 12px;
            border: none;
            transition: all 0.3s ease;
            margin-bottom: 1rem;
        }
        .btn-survey {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
        }
        .btn-survey:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(16, 185, 129, 0.4);
            color: white;
        }
        .btn-admin {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
        }
        .btn-admin:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(59, 130, 246, 0.4);
            color: white;
        }
        .icon-large {
            font-size: 2rem;
            margin-right: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="main-container">
        <div class="logo">
            <i class="bi bi-hospital text-primary"></i>
        </div>
        <h1>SafeWork</h1>
        <p class="subtitle">안전보건 관리시스템</p>

        <div class="d-grid gap-3">
            <a href="/survey/001_musculoskeletal_symptom_survey" class="btn btn-survey action-btn">
                <i class="bi bi-pencil-square icon-large"></i>
                근골격계 증상조사표 작성
            </a>

            <a href="/admin" class="btn btn-admin action-btn">
                <i class="bi bi-speedometer2 icon-large"></i>
                보건관리자 웹콘솔
            </a>
        </div>

        <div class="mt-4 pt-4 border-top">
            <small class="text-muted">
                © 2024 SafeWork v2.0 - Powered by Cloudflare Workers
            </small>
        </div>
    </div>
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
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root {
            --primary-color: #667eea;
            --primary-dark: #5568d3;
            --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        body {
            background: var(--gradient-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .login-container {
            max-width: 450px;
            width: 100%;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
        }
        .icon-circle {
            width: 80px;
            height: 80px;
            background: var(--gradient-primary);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        .btn-primary {
            background: var(--gradient-primary);
            border: none;
            padding: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }
        .form-control:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.25rem rgba(102, 126, 234, 0.25);
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="text-center mb-4">
            <div class="icon-circle">
                <i class="fas fa-user-circle text-white" style="font-size: 2.5rem;"></i>
            </div>
            <h1 class="h3 fw-bold text-dark mb-2">로그인</h1>
            <p class="text-muted">SafeWork 안전보건 관리시스템</p>
        </div>

        <div id="error-message" class="alert alert-danger d-none" role="alert">
            <i class="fas fa-exclamation-circle me-2"></i>
            <span id="error-text"></span>
        </div>

        <form id="login-form">
            <div class="mb-3">
                <label for="username" class="form-label fw-semibold">
                    <i class="fas fa-user me-1"></i> 사용자명
                </label>
                <input
                    type="text"
                    class="form-control form-control-lg"
                    id="username"
                    required
                    placeholder="사용자명을 입력하세요">
            </div>

            <div class="mb-4">
                <label for="password" class="form-label fw-semibold">
                    <i class="fas fa-lock me-1"></i> 비밀번호
                </label>
                <input
                    type="password"
                    class="form-control form-control-lg"
                    id="password"
                    required
                    placeholder="비밀번호를 입력하세요">
            </div>

            <button
                type="submit"
                id="submit-btn"
                class="btn btn-primary btn-lg w-100">
                <i class="fas fa-sign-in-alt me-2"></i> 로그인
            </button>
        </form>

        <div class="mt-4 text-center">
            <p class="text-muted mb-2">
                계정이 없으신가요?
                <a href="/auth/register" class="text-decoration-none fw-semibold" style="color: var(--primary-color);">
                    회원가입
                </a>
            </p>
            <a href="/" class="text-muted text-decoration-none small">
                <i class="fas fa-arrow-left me-1"></i> 메인 페이지로 돌아가기
            </a>
        </div>
    </div>

    <script>
        const form = document.getElementById('login-form');
        const submitBtn = document.getElementById('submit-btn');
        const errorMessage = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');

        function showError(message) {
            errorText.textContent = message;
            errorMessage.classList.remove('d-none');
        }

        function hideError() {
            errorMessage.classList.add('d-none');
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
                    submitBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i> 로그인 성공!';
                    submitBtn.classList.add('btn-success');
                    submitBtn.classList.remove('btn-primary');
                    
                    // Redirect after short delay
                    setTimeout(() => {
                        window.location.href = data.redirect || '/';
                    }, 1000);
                } else {
                    showError(data.error || '로그인에 실패했습니다.');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i> 로그인';
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i> 로그인';
            }
        });
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
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
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root {
            --primary-color: #667eea;
            --primary-dark: #5568d3;
            --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        body {
            background: var(--gradient-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .register-container {
            max-width: 500px;
            width: 100%;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
        }
        .icon-circle {
            width: 80px;
            height: 80px;
            background: var(--gradient-primary);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        .btn-primary {
            background: var(--gradient-primary);
            border: none;
            padding: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }
        .form-control:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.25rem rgba(102, 126, 234, 0.25);
        }
        .password-requirement {
            font-size: 0.875rem;
            padding: 4px 0;
        }
        .password-requirement.valid {
            color: #10b981;
        }
        .password-requirement.invalid {
            color: #6b7280;
        }
    </style>
</head>
<body>
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

// Survey form route - using actual form templates
app.get('/survey/:surveyType', async (c) => {
  const surveyType = c.req.param('surveyType');

  // dv06_2025-09-26_10-36_Flask_089eeaf 복구 버전
  if (surveyType === '001_musculoskeletal_symptom_survey') {
    console.log('✅ 001 DV06 RESTORE - dv06_2025-09-26_10-36_Flask_089eeaf - CLOUDFLARE WORKERS NATIVE');
    return c.html(form001Dv06Template);
  }

  // Forms 003, 004, 005, 006 have been removed
  // Now Forms 002-004 are analysis tools based on Form 001 data
  // Access via:
  // - /api/analysis/002/niosh
  // - /api/analysis/003/questionnaire-summary
  // - /api/analysis/004/statistics-summary

  // Map survey types to template keys
  const formTemplates: Record<string, string> = {
    '001_musculoskeletal_symptom_survey': '001',
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

