import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { logger } from 'hono/logger';
import { surveyRoutes } from './routes/survey';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { workerRoutes } from './routes/worker';

export interface Env {
  SAFEWORK_KV: KVNamespace;
  SAFEWORK_DB?: D1Database;
  JWT_SECRET: string;
  ADMIN_USERNAME: string;
  BACKEND_URL: string;
  DEBUG: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: ['https://safework2.jclee.me', 'http://localhost:3000'],
  credentials: true,
}));

// Public routes
app.route('/api/auth', authRoutes);
app.route('/api/health', healthRoutes);
app.route('/api/survey', surveyRoutes);

// Protected routes (require JWT)
app.use('/api/admin/*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env?.JWT_SECRET || 'fallback-secret',
  });
  return jwtMiddleware(c, next);
});

app.route('/api/admin', adminRoutes);
app.route('/api/workers', workerRoutes);

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

// Survey form route - restored to original format
app.get('/survey/:surveyType', (c) => {
  const surveyType = c.req.param('surveyType');
  const surveyTitles: { [key: string]: string } = {
    '001_musculoskeletal_symptom_survey': '근골격계 증상조사표',
    '002_new_employee_health_checkup': '신규 입사자 건강검진',
    '003_musculoskeletal_program': '근골격계부담작업 유해요인조사',
    'musculoskeletal': '근골격계 증상조사',
    'safety': '안전의식 조사', 
    'environment': '작업환경 조사'
  };
  
  const title = surveyTitles[surveyType] || '설문조사';
  
  const surveyHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --sw-primary: #6366f1;
            --sw-primary-light: #a5b4fc;
            --sw-primary-dark: #4f46e5;
            --sw-secondary: #64748b;
            --sw-success: #10b981;
            --sw-warning: #f59e0b;
            --sw-danger: #ef4444;
        }
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px 0;
        }
        .survey-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        .section-card {
            background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 16px;
            padding: 28px;
            margin-bottom: 24px;
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.08);
            border: 1px solid rgba(99, 102, 241, 0.1);
        }
        .section-title {
            color: var(--sw-primary);
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--sw-primary-light);
        }
        .form-label {
            font-weight: 600;
            color: #475569;
            margin-bottom: 8px;
        }
        .form-control, .form-select {
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px;
        }
        .form-control:focus, .form-select:focus {
            border-color: var(--sw-primary);
            box-shadow: 0 0 0 0.2rem rgba(99, 102, 241, 0.25);
        }
        .btn-primary {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            border: none;
            border-radius: 10px;
            padding: 12px 30px;
            font-weight: 600;
        }
        .question-group {
            background: #f8fafc;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="survey-container">
        <div class="section-card">
            <div class="text-center mb-5">
                <i class="bi bi-clipboard-pulse" style="font-size: 3rem; color: var(--sw-primary);"></i>
                <h1 class="mt-3" style="color: var(--sw-primary);">${title}</h1>
                <p class="text-muted">귀하의 건강한 작업환경을 위해 성실히 작성해 주시기 바랍니다</p>
            </div>
                
                <form id="survey-form" class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">성명</label>
                        <input type="text" name="name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="이름을 입력하세요">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">소속 부서</label>
                        <select name="department" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">부서를 선택하세요</option>
                            <option value="production">생산부</option>
                            <option value="quality">품질관리부</option>
                            <option value="maintenance">정비부</option>
                            <option value="safety">안전관리부</option>
                            <option value="office">사무직</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">근무 경력</label>
                        <select name="experience" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">경력을 선택하세요</option>
                            <option value="less-1">1년 미만</option>
                            <option value="1-3">1-3년</option>
                            <option value="3-5">3-5년</option>
                            <option value="5-10">5-10년</option>
                            <option value="over-10">10년 이상</option>
                        </select>
                    </div>
                    
                    <div class="survey-questions" id="survey-questions">
                        <!-- Dynamic questions will be loaded here -->
                    </div>
                    
                    <div class="flex space-x-4">
                        <button type="submit" class="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200">
                            <i class="fas fa-paper-plane mr-2"></i>설문 제출
                        </button>
                        <a href="/" class="flex-1 bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition duration-200 text-center">
                            <i class="fas fa-home mr-2"></i>메인으로
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        const surveyQuestions = {
            'musculoskeletal': [
                {
                    question: '목, 어깨 부위에 통증이나 불편함을 느끼신 적이 있습니까?',
                    type: 'radio',
                    options: ['전혀 없음', '가끔 있음', '자주 있음', '항상 있음']
                },
                {
                    question: '허리 부위에 통증이나 불편함을 느끼신 적이 있습니까?',
                    type: 'radio', 
                    options: ['전혀 없음', '가끔 있음', '자주 있음', '항상 있음']
                },
                {
                    question: '손목이나 손가락 부위에 통증이나 불편함을 느끼신 적이 있습니까?',
                    type: 'radio',
                    options: ['전혀 없음', '가끔 있음', '자주 있음', '항상 있음']
                }
            ],
            'safety': [
                {
                    question: '작업장의 안전 수칙을 잘 준수하고 있다고 생각하십니까?',
                    type: 'radio',
                    options: ['매우 그렇다', '그렇다', '보통이다', '그렇지 않다', '매우 그렇지 않다']
                },
                {
                    question: '안전 교육이 충분히 이루어지고 있다고 생각하십니까?',
                    type: 'radio',
                    options: ['매우 충분', '충분', '보통', '부족', '매우 부족']
                },
                {
                    question: '위험한 상황을 목격했을 때 즉시 신고하십니까?',
                    type: 'radio',
                    options: ['항상 신고', '대부분 신고', '가끔 신고', '거의 신고하지 않음', '전혀 신고하지 않음']
                }
            ],
            'environment': [
                {
                    question: '작업 공간의 조명이 적절하다고 생각하십니까?',
                    type: 'radio',
                    options: ['매우 적절', '적절', '보통', '부적절', '매우 부적절']
                },
                {
                    question: '작업장의 소음 수준은 어떻습니까?',
                    type: 'radio',
                    options: ['매우 조용', '조용', '보통', '시끄러움', '매우 시끄러움']
                },
                {
                    question: '작업장의 온도와 습도는 적절합니까?',
                    type: 'radio',
                    options: ['매우 적절', '적절', '보통', '부적절', '매우 부적절']
                }
            ]
        };
        
        const currentSurvey = '${surveyType}';
        const questions = surveyQuestions[currentSurvey] || [];
        
        function loadQuestions() {
            const questionsContainer = document.getElementById('survey-questions');
            questionsContainer.innerHTML = questions.map((q, index) => \`
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-3">\${index + 1}. \${q.question}</label>
                    <div class="space-y-2">
                        \${q.options.map((option, optIndex) => \`
                            <label class="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                <input type="radio" name="question_\${index}" value="\${option}" class="text-blue-600">
                                <span class="text-gray-700">\${option}</span>
                            </label>
                        \`).join('')}
                    </div>
                </div>
            \`).join('');
        }
        
        document.getElementById('survey-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const responses = Object.fromEntries(formData);
            
            console.log('Survey responses:', responses);
            
            // Simulate API submission
            alert('설문이 성공적으로 제출되었습니다. 참여해 주셔서 감사합니다!');
            
            // Redirect to main page
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        });
        
        // Load questions on page load
        loadQuestions();
    </script>
</body>
</html>`;
  
  return c.html(surveyHtml);
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

export default app;