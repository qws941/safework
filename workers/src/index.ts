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
  SAFEWORK_KV?: KVNamespace;
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

// SafeWork Main UI
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeWork - 산업안전보건 관리시스템</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .card-hover:hover { transform: translateY(-2px); transition: all 0.3s ease; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- Header -->
    <header class="gradient-bg text-white shadow-lg">
        <div class="container mx-auto px-4 py-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <i class="fas fa-hard-hat text-3xl"></i>
                    <div>
                        <h1 class="text-2xl font-bold">SafeWork</h1>
                        <p class="text-blue-100 text-sm">산업안전보건 관리시스템</p>
                    </div>
                </div>
                <div class="hidden md:flex space-x-4">
                    <a href="/admin" class="bg-white bg-opacity-20 px-4 py-2 rounded-lg hover:bg-opacity-30 transition">
                        <i class="fas fa-cog mr-2"></i>관리자
                    </a>
                    <a href="/api/health" class="bg-white bg-opacity-20 px-4 py-2 rounded-lg hover:bg-opacity-30 transition">
                        <i class="fas fa-heartbeat mr-2"></i>상태확인
                    </a>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
        <!-- Status Cards -->
        <div class="grid md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow-lg p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">시스템 상태</h3>
                        <p class="text-2xl font-bold text-green-600 mt-2" id="system-status">정상</p>
                    </div>
                    <div class="bg-green-100 p-3 rounded-full">
                        <i class="fas fa-check-circle text-2xl text-green-600"></i>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-lg p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">활성 워커</h3>
                        <p class="text-2xl font-bold text-blue-600 mt-2">1,247</p>
                    </div>
                    <div class="bg-blue-100 p-3 rounded-full">
                        <i class="fas fa-users text-2xl text-blue-600"></i>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-lg p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">완료된 설문</h3>
                        <p class="text-2xl font-bold text-purple-600 mt-2" id="survey-count">0</p>
                    </div>
                    <div class="bg-purple-100 p-3 rounded-full">
                        <i class="fas fa-clipboard-list text-2xl text-purple-600"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- Survey Forms Section -->
        <div class="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <i class="fas fa-clipboard-check mr-3 text-blue-600"></i>
                설문조사
            </h2>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="border border-gray-200 rounded-lg p-6 hover:border-blue-300 card-hover cursor-pointer" onclick="openSurvey('musculoskeletal')">
                    <div class="text-center">
                        <i class="fas fa-bone text-3xl text-red-500 mb-4"></i>
                        <h3 class="text-lg font-semibold mb-2">근골격계 증상조사</h3>
                        <p class="text-gray-600 text-sm mb-4">근무환경으로 인한 근골격계 문제 조사</p>
                        <button class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">
                            설문 시작
                        </button>
                    </div>
                </div>
                
                <div class="border border-gray-200 rounded-lg p-6 hover:border-green-300 card-hover cursor-pointer" onclick="openSurvey('safety')">
                    <div class="text-center">
                        <i class="fas fa-shield-alt text-3xl text-green-500 mb-4"></i>
                        <h3 class="text-lg font-semibold mb-2">안전의식 조사</h3>
                        <p class="text-gray-600 text-sm mb-4">직장 내 안전의식 및 문화 조사</p>
                        <button class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition">
                            설문 시작
                        </button>
                    </div>
                </div>
                
                <div class="border border-gray-200 rounded-lg p-6 hover:border-yellow-300 card-hover cursor-pointer" onclick="openSurvey('environment')">
                    <div class="text-center">
                        <i class="fas fa-leaf text-3xl text-yellow-500 mb-4"></i>
                        <h3 class="text-lg font-semibold mb-2">작업환경 조사</h3>
                        <p class="text-gray-600 text-sm mb-4">작업장 환경 및 위험요소 조사</p>
                        <button class="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition">
                            설문 시작
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-xl shadow-lg p-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <i class="fas fa-bolt mr-3 text-yellow-500"></i>
                빠른 작업
            </h2>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <a href="/api/auth" class="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                    <i class="fas fa-sign-in-alt text-blue-600 mr-3"></i>
                    <span class="font-semibold text-gray-800">로그인</span>
                </a>
                
                <a href="/api/survey" class="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
                    <i class="fas fa-poll text-green-600 mr-3"></i>
                    <span class="font-semibold text-gray-800">설문 관리</span>
                </a>
                
                <a href="/api/workers" class="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
                    <i class="fas fa-users-cog text-purple-600 mr-3"></i>
                    <span class="font-semibold text-gray-800">직원 관리</span>
                </a>
                
                <a href="/api/health" class="flex items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition">
                    <i class="fas fa-chart-line text-red-600 mr-3"></i>
                    <span class="font-semibold text-gray-800">통계 보기</span>
                </a>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-800 text-white py-8 mt-16">
        <div class="container mx-auto px-4 text-center">
            <div class="flex items-center justify-center mb-4">
                <i class="fas fa-hard-hat text-2xl mr-3"></i>
                <span class="text-xl font-bold">SafeWork</span>
            </div>
            <p class="text-gray-400">산업안전보건 관리시스템 - Powered by Cloudflare Workers</p>
            <div class="mt-4 flex justify-center space-x-4">
                <span class="text-sm text-gray-500">버전: 1.0.1</span>
                <span class="text-sm text-gray-500">플랫폼: Edge Computing</span>
                <span class="text-sm text-gray-500" id="server-time"></span>
            </div>
        </div>
    </footer>

    <script>
        // Update server time
        document.getElementById('server-time').textContent = new Date().toLocaleString('ko-KR');
        
        // Load system status
        fetch('/api/health')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'healthy') {
                    document.getElementById('system-status').textContent = '정상 운영';
                    document.getElementById('system-status').className = 'text-2xl font-bold text-green-600 mt-2';
                }
            })
            .catch(error => {
                document.getElementById('system-status').textContent = '점검 중';
                document.getElementById('system-status').className = 'text-2xl font-bold text-yellow-600 mt-2';
            });

        function openSurvey(type) {
            const surveyUrls = {
                'musculoskeletal': '/api/survey/001_musculoskeletal_symptom_survey',
                'safety': '/api/survey/safety_awareness',
                'environment': '/api/survey/work_environment'
            };
            
            const url = surveyUrls[type] || '/api/survey';
            window.open(url, '_blank');
        }

        // Add some interactive effects
        document.addEventListener('DOMContentLoaded', function() {
            // Animate numbers
            const counters = document.querySelectorAll('[id$="-count"]');
            counters.forEach(counter => {
                const target = Math.floor(Math.random() * 100);
                let current = 0;
                const increment = target / 50;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        counter.textContent = target;
                        clearInterval(timer);
                    } else {
                        counter.textContent = Math.floor(current);
                    }
                }, 20);
            });
        });
    </script>
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
            
            // Simple demo authentication
            if (username === 'admin' && password === 'admin') {
                alert('관리자 로그인 성공! 실제 시스템에서는 JWT 토큰을 사용합니다.');
                window.location.href = '/api/admin';
            } else {
                alert('잘못된 인증 정보입니다.');
            }
        });
    </script>
</body>
</html>`;
  
  return c.html(adminHtml);
});

// Survey form route
app.get('/survey/:surveyType', (c) => {
  const surveyType = c.req.param('surveyType');
  const surveyTitles = {
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
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-2xl mx-auto">
            <div class="bg-white rounded-lg shadow-lg p-8">
                <div class="text-center mb-8">
                    <i class="fas fa-clipboard-list text-4xl text-blue-600 mb-4"></i>
                    <h1 class="text-3xl font-bold text-gray-800">${title}</h1>
                    <p class="text-gray-600 mt-2">안전한 작업환경을 위한 설문에 참여해주세요</p>
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