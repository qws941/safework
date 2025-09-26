// SafeWork Cloudflare Workers - Completely Redesigned with Modern Mobile-First UI
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Access Control List (ACL) Configuration
    const PUBLIC_PATHS = [
      '/survey/001_musculoskeletal_symptom_survey',  // 근로자용 설문지 - 공개
      '/health',
      '/api/health'
    ];

    const ALLOWED_IPS = [
      '203.245.108.0/24',  // 허용된 IP 대역
      '127.0.0.1',
      '::1'
    ];

    // Authorized users for Basic Authentication
    const AUTHORIZED_USERS = {
      'admin': 'safework2024',
      'manager': 'safework2024'
    };

    // Check if path is public
    const isPublicPath = PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath));

    // If not public path, check authentication
    if (!isPublicPath && path !== '/') {
      const clientIP = request.headers.get('CF-Connecting-IP') ||
                      request.headers.get('X-Forwarded-For') ||
                      request.headers.get('X-Real-IP');

      // Check Basic Authentication
      const authorization = request.headers.get('Authorization');

      if (!authorization) {
        return new Response('Authentication required', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="SafeWork Protected Area"',
            'Content-Type': 'text/plain'
          }
        });
      }

      const [scheme, credentials] = authorization.split(' ');

      if (scheme !== 'Basic') {
        return new Response('Invalid authentication', { status: 401 });
      }

      const decodedCredentials = atob(credentials);
      const [username, password] = decodedCredentials.split(':');

      if (!AUTHORIZED_USERS[username] || AUTHORIZED_USERS[username] !== password) {
        return new Response('Invalid username or password', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="SafeWork Protected Area"'
          }
        });
      }
    }

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    // Handle OPTIONS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (path === '/health' || path === '/api/health') {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: env.ENVIRONMENT || 'development',
          version: env.API_VERSION || 'v1',
          components: {
            workers: 'operational',
            kv: 'operational',
            api: 'operational'
          }
        };

        // Test KV namespace
        try {
          if (env.SURVEYS) {
            await env.SURVEYS.put('health_check', Date.now().toString(), {
              expirationTtl: 60
            });
          }
        } catch (error) {
          health.components.kv = 'degraded';
          health.status = 'degraded';
        }

        return new Response(JSON.stringify(health, null, 2), {
          headers: corsHeaders
        });
      }

      // Survey routes - return static forms or proxy to API
      if (path === '/survey/' || path === '/survey') {
        return Response.redirect(url.origin + '/survey/index', 302);
      }

      // Survey API endpoints
      if (path === '/api/surveys' && request.method === 'GET') {
        try {
          const { keys } = await env.SURVEYS.list();
          const surveys = [];

          for (const key of keys) {
            if (key.name.startsWith('survey_')) {
              const data = await env.SURVEYS.get(key.name, { type: 'json' });
              if (data) surveys.push(data);
            }
          }

          return new Response(JSON.stringify({
            status: 'success',
            count: surveys.length,
            data: surveys
          }), {
            headers: corsHeaders
          });
        } catch (error) {
          return new Response(JSON.stringify({
            status: 'error',
            message: error.message
          }), {
            status: 500,
            headers: corsHeaders
          });
        }
      }

      // Create survey
      if (path === '/api/surveys' && request.method === 'POST') {
        try {
          const data = await request.json();
          const id = 'survey_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

          const survey = {
            id,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await env.SURVEYS.put(id, JSON.stringify(survey));

          return new Response(JSON.stringify({
            status: 'success',
            message: 'Survey created successfully',
            data: survey
          }), {
            status: 201,
            headers: corsHeaders
          });
        } catch (error) {
          return new Response(JSON.stringify({
            status: 'error',
            message: error.message
          }), {
            status: 500,
            headers: corsHeaders
          });
        }
      }

      // Admin login page
      if (path === '/admin/login' && request.method === 'GET') {
        return new Response(`
          <!DOCTYPE html>
          <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SafeWork Admin Login</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .login-container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                padding: 40px;
                width: 400px;
                max-width: 90%;
              }
              h2 {
                color: #333;
                margin-bottom: 30px;
                text-align: center;
              }
              .form-group {
                margin-bottom: 20px;
              }
              label {
                display: block;
                margin-bottom: 5px;
                color: #666;
                font-weight: 500;
              }
              input {
                width: 100%;
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 16px;
              }
              button {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
              }
            </style>
          </head>
          <body>
            <div class="login-container">
              <h2>SafeWork 관리자 로그인</h2>
              <form method="POST" action="/admin/login">
                <div class="form-group">
                  <label>사용자명</label>
                  <input type="text" name="username" required>
                </div>
                <div class="form-group">
                  <label>비밀번호</label>
                  <input type="password" name="password" required>
                </div>
                <button type="submit">로그인</button>
              </form>
            </div>
          </body>
          </html>
        `, {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8'
          }
        });
      }

      // Admin login handler
      if (path === '/admin/login' && request.method === 'POST') {
        const formData = await request.formData();
        const username = formData.get('username');
        const password = formData.get('password');

        if (username === 'admin' && password === 'safework2024') {
          const sessionId = crypto.randomUUID();
          await env.SESSIONS.put(sessionId, JSON.stringify({
            username,
            loggedInAt: new Date().toISOString()
          }), {
            expirationTtl: 86400
          });

          return new Response(null, {
            status: 302,
            headers: {
              'Location': '/admin',
              'Set-Cookie': `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
            }
          });
        } else {
          return new Response(null, {
            status: 302,
            headers: {
              'Location': '/admin/login?error=invalid'
            }
          });
        }
      }

      // Admin dashboard (redirect to login if not authenticated)
      if (path === '/admin' || path === '/admin/safework') {
        const cookie = request.headers.get('Cookie');
        const sessionId = cookie?.match(/session_id=([^;]+)/)?.[1];

        if (!sessionId || !await env.SESSIONS.get(sessionId)) {
          return new Response(null, {
            status: 302,
            headers: {
              'Location': '/admin/login'
            }
          });
        }

        // 실시간 데이터 조회
        let surveyCount = 0;
        let userCount = 0;
        try {
          const { keys: surveyKeys } = await env.SURVEYS.list();
          surveyCount = surveyKeys.filter(key => key.name.startsWith('survey_')).length;

          const { keys: userKeys } = await env.USERS.list();
          userCount = userKeys.length;
        } catch (error) {
          console.error('Dashboard data error:', error);
        }

        return new Response(`
          <!DOCTYPE html>
          <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SafeWork 관리자 대시보드</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
              }
              .dashboard-container {
                max-width: 1200px;
                margin: 0 auto;
              }
              .header {
                background: white;
                border-radius: 16px;
                padding: 30px;
                margin-bottom: 30px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                text-align: center;
              }
              .header h1 {
                color: #1f2937;
                font-size: 2.5rem;
                margin-bottom: 10px;
              }
              .header .subtitle {
                color: #6b7280;
                font-size: 1.1rem;
              }
              .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 25px;
                margin: 30px 0;
              }
              .stat-card {
                background: white;
                padding: 30px;
                border-radius: 16px;
                text-align: center;
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                transition: transform 0.3s ease;
              }
              .stat-card:hover {
                transform: translateY(-5px);
              }
              .stat-number {
                font-size: 3rem;
                font-weight: 700;
                color: #667eea;
                margin-bottom: 10px;
              }
              .stat-label {
                font-size: 1.1rem;
                color: #4b5563;
                font-weight: 600;
              }
              .stat-description {
                font-size: 0.9rem;
                color: #9ca3af;
                margin-top: 5px;
              }
              .actions {
                background: white;
                border-radius: 16px;
                padding: 30px;
                margin-top: 30px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
              }
              .actions h3 {
                color: #1f2937;
                margin-bottom: 20px;
                font-size: 1.5rem;
              }
              .action-buttons {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
              }
              .action-btn {
                padding: 15px 25px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
                text-align: center;
                transition: transform 0.3s ease;
              }
              .action-btn:hover {
                transform: translateY(-2px);
              }
              .logout-btn {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              }
              .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #10b981;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 600;
              }
              @media (max-width: 768px) {
                .dashboard-container { padding: 16px; }
                .header { padding: 24px; }
                .header h1 { font-size: 2rem; }
                .stats { grid-template-columns: 1fr; gap: 20px; }
                .stat-card { padding: 24px; }
                .stat-number { font-size: 2.5rem; }
              }
            </style>
          </head>
          <body>
            <div class="dashboard-container">
              <div class="header">
                <h1>🏥 SafeWork 관리자</h1>
                <p class="subtitle">산업안전보건 관리 시스템</p>
                <div style="margin-top: 16px;">
                  <span class="status-indicator">
                    ✅ 시스템 정상 운영
                  </span>
                </div>
              </div>

              <div class="stats">
                <div class="stat-card">
                  <div class="stat-number">${surveyCount}</div>
                  <div class="stat-label">설문조사 응답</div>
                  <div class="stat-description">근골격계 증상조사표</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${userCount}</div>
                  <div class="stat-label">등록된 사용자</div>
                  <div class="stat-description">관리자 및 응답자</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">⚡</div>
                  <div class="stat-label">Cloudflare Workers</div>
                  <div class="stat-description">글로벌 엣지 배포</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">🔒</div>
                  <div class="stat-label">보안 강화</div>
                  <div class="stat-description">SSL/TLS + DDoS 보호</div>
                </div>
              </div>

              <div class="actions">
                <h3>🔧 관리 기능</h3>
                <div class="action-buttons">
                  <a href="/api/surveys" class="action-btn">📊 설문 데이터 보기</a>
                  <a href="/survey/001_musculoskeletal_symptom_survey" class="action-btn">📝 설문 양식 확인</a>
                  <a href="/api/health" class="action-btn">⚙️ 시스템 상태</a>
                  <a href="/admin/logout" class="action-btn logout-btn">🚪 로그아웃</a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `, {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8'
          }
        });
      }

      // Admin logout
      if (path === '/admin/logout') {
        const cookie = request.headers.get('Cookie');
        const sessionId = cookie?.match(/session_id=([^;]+)/)?.[1];

        if (sessionId) {
          try {
            await env.SESSIONS.delete(sessionId);
          } catch (error) {
            console.error('Logout error:', error);
          }
        }

        return new Response(null, {
          status: 302,
          headers: {
            'Location': '/admin/login',
            'Set-Cookie': 'session_id=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
          }
        });
      }

      // 🎨 COMPLETELY REDESIGNED MODERN MOBILE-FIRST SAFEWORK SURVEY FORM
      if (path.startsWith('/survey/')) {
        const formType = path.split('/')[2];

        if (formType === '001_musculoskeletal_symptom_survey') {
          const modernSurveyForm = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏥 근골격계 증상조사표 - SafeWork</title>
    <style>
        /* 🎨 SafeWork Modern Design System - Mobile First */
        :root {
            --sw-primary: #667eea;
            --sw-primary-light: #a5b4fc;
            --sw-primary-dark: #4f46e5;
            --sw-secondary: #64748b;
            --sw-success: #10b981;
            --sw-warning: #f59e0b;
            --sw-danger: #ef4444;
            --sw-white: #ffffff;
            --sw-gray-50: #f8fafc;
            --sw-gray-100: #f1f5f9;
            --sw-gray-200: #e2e8f0;
            --sw-gray-300: #cbd5e1;
            --sw-gray-600: #475569;
            --sw-gray-700: #334155;
            --sw-gray-900: #1e293b;
            --sw-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --sw-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', 'Noto Sans KR', sans-serif;
            background: linear-gradient(135deg, var(--sw-primary) 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 16px;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            color: var(--sw-gray-900);
        }

        /* 📱 Mobile-First Container */
        .survey-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 0;
            min-width: 0;
            overflow-x: hidden;
        }

        /* 🎨 Modern Header */
        .survey-header {
            background: linear-gradient(145deg, var(--sw-white) 0%, var(--sw-gray-50) 100%);
            border-radius: 20px;
            padding: 32px 24px;
            margin-bottom: 24px;
            text-align: center;
            box-shadow: var(--sw-shadow-xl);
            border: 1px solid rgba(99, 102, 241, 0.1);
            position: relative;
            overflow: hidden;
        }

        .survey-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: linear-gradient(90deg, var(--sw-primary), var(--sw-primary-light));
        }

        .survey-title {
            font-size: 2rem;
            font-weight: 800;
            color: var(--sw-gray-900);
            margin-bottom: 12px;
            letter-spacing: -0.025em;
        }

        .survey-subtitle {
            color: var(--sw-gray-600);
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 16px;
        }

        .compliance-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, var(--sw-success) 0%, #059669 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        /* 🎯 Modern Section Cards */
        .section-card {
            background: linear-gradient(145deg, var(--sw-white) 0%, var(--sw-gray-50) 100%);
            border-radius: 20px;
            padding: 32px 28px;
            margin-bottom: 28px;
            box-shadow: var(--sw-shadow-xl);
            border: 1px solid rgba(99, 102, 241, 0.1);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .section-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(90deg, var(--sw-primary), var(--sw-primary-light));
        }

        .section-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 25px 50px -12px rgba(99, 102, 241, 0.25);
        }

        .section-title {
            color: var(--sw-gray-900);
            font-size: 1.75rem;
            font-weight: 800;
            margin-bottom: 28px;
            padding-bottom: 20px;
            border-bottom: 3px solid var(--sw-primary);
            display: flex;
            align-items: center;
            gap: 16px;
            letter-spacing: -0.025em;
        }

        .section-icon {
            font-size: 2rem;
            color: var(--sw-primary);
            text-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
        }

        /* 📋 Modern Form Elements */
        .form-row {
            display: grid;
            gap: 24px;
            margin-bottom: 24px;
            grid-template-columns: 1fr;
        }

        .form-group {
            position: relative;
        }

        .form-label {
            display: block;
            margin-bottom: 12px;
            color: var(--sw-gray-900);
            font-weight: 700;
            font-size: 1rem;
            letter-spacing: -0.01em;
        }

        .form-label.required::after {
            content: ' *';
            color: var(--sw-danger);
            font-weight: 800;
            font-size: 1.1em;
        }

        .form-control {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid var(--sw-gray-200);
            border-radius: 12px;
            font-size: 1.1rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: var(--sw-white);
            font-weight: 500;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            min-height: 48px;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--sw-primary);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
            transform: translateY(-1px);
        }

        .form-control:hover:not(:focus) {
            border-color: var(--sw-gray-300);
        }

        /* 🎛️ Modern Radio & Checkbox Groups */
        .radio-group, .checkbox-group {
            display: grid;
            gap: 16px;
            margin-top: 12px;
            grid-template-columns: 1fr;
        }

        .radio-item, .checkbox-item {
            display: flex;
            align-items: center;
            padding: 18px 24px;
            border: 2px solid var(--sw-gray-200);
            border-radius: 16px;
            background: var(--sw-white);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            font-weight: 600;
            font-size: 1rem;
            min-height: 60px;
        }

        .radio-item:hover, .checkbox-item:hover {
            border-color: var(--sw-primary);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.15);
        }

        .radio-item input:checked + label,
        .checkbox-item input:checked + label {
            color: var(--sw-primary);
            font-weight: 700;
        }

        .radio-item input, .checkbox-item input {
            margin-right: 12px;
            transform: scale(1.3);
            position: relative;
            z-index: 2;
        }

        .radio-item label, .checkbox-item label {
            position: relative;
            z-index: 2;
            cursor: pointer;
            flex: 1;
        }

        /* 💡 Interactive Body Parts Selection */
        .body-parts-container {
            background: linear-gradient(145deg, var(--sw-gray-50) 0%, var(--sw-white) 100%);
            border-radius: 16px;
            padding: 28px;
            margin: 24px 0;
            border: 2px solid var(--sw-gray-200);
        }

        .body-parts-grid {
            display: grid;
            gap: 20px;
            margin-top: 20px;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }

        .body-part-card {
            background: var(--sw-white);
            border: 3px solid var(--sw-gray-200);
            border-radius: 20px;
            padding: 24px 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            min-height: 120px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .body-part-card:hover {
            transform: translateY(-5px);
            border-color: var(--sw-primary);
            box-shadow: 0 15px 35px rgba(99, 102, 241, 0.2);
        }

        .body-part-card.selected {
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            color: white;
            border-color: var(--sw-primary-dark);
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(99, 102, 241, 0.4);
        }

        .body-part-icon {
            font-size: 3rem;
            margin-bottom: 12px;
            display: block;
            position: relative;
            z-index: 2;
        }

        .body-part-card.selected .body-part-icon {
            color: white;
        }

        .body-part-name {
            font-weight: 700;
            font-size: 1.1rem;
            position: relative;
            z-index: 2;
        }

        /* 📊 Modern Symptoms Table */
        .symptoms-table-container {
            margin-top: 32px;
            background: var(--sw-white);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: var(--sw-shadow-lg);
            border: 1px solid var(--sw-gray-200);
        }

        .symptoms-table {
            width: 100%;
            border-collapse: collapse;
        }

        .symptoms-table th {
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            color: white;
            padding: 20px 16px;
            text-align: center;
            font-weight: 700;
            font-size: 1rem;
        }

        .symptoms-table td {
            padding: 20px 16px;
            border-bottom: 1px solid var(--sw-gray-200);
            text-align: center;
        }

        .symptoms-table tr:hover {
            background: var(--sw-gray-50);
        }

        .symptoms-table tr:last-child td {
            border-bottom: none;
        }

        .question-cell {
            text-align: left !important;
            font-weight: 600;
            color: var(--sw-gray-900);
        }

        .answer-cell input[type="radio"] {
            transform: scale(1.3);
            cursor: pointer;
        }

        /* 🎯 Modern Submit Button - Sticky for Mobile */
        .submit-container {
            position: sticky;
            bottom: 20px;
            z-index: 1000;
            text-align: center;
            margin-top: 40px;
        }

        .submit-btn {
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            color: white;
            border: none;
            padding: 20px 48px;
            border-radius: 50px;
            font-size: 1.25rem;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
            min-width: 280px;
            letter-spacing: -0.025em;
            min-height: 64px;
        }

        .submit-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(99, 102, 241, 0.4);
        }

        .submit-btn:active {
            transform: translateY(-1px);
        }

        /* 🎨 Progress Indicator */
        .progress-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            z-index: 10000;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--sw-primary), var(--sw-primary-light));
            width: 0%;
            transition: width 0.3s ease;
        }

        /* 📱 Responsive Design */
        @media (min-width: 640px) {
            body { padding: 24px; }
            .form-row { grid-template-columns: repeat(2, 1fr); }
            .survey-container { padding: 0; }
            .section-card { padding: 40px 36px; }
            .radio-group, .checkbox-group { 
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            }
        }

        @media (min-width: 768px) {
            .survey-title { font-size: 2.5rem; }
            .section-title { font-size: 2rem; }
            .body-parts-grid { 
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
            }
        }

        @media (min-width: 1024px) {
            .form-row { grid-template-columns: repeat(3, 1fr); }
            .radio-group, .checkbox-group { 
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
            }
        }

        /* 🚨 Alert & Notification Styles */
        .alert {
            padding: 20px 24px;
            margin-bottom: 24px;
            border-radius: 12px;
            background: linear-gradient(145deg, rgba(99, 102, 241, 0.1) 0%, rgba(167, 180, 252, 0.1) 100%);
            border: 2px solid var(--sw-primary-light);
            color: var(--sw-primary-dark);
            font-weight: 600;
        }

        /* ✨ Loading & Animation States */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .section-card {
            animation: fadeInUp 0.6s ease-out;
        }

        .section-card:nth-child(even) {
            animation-delay: 0.1s;
        }

        .section-card:nth-child(odd) {
            animation-delay: 0.2s;
        }
    </style>
</head>
<body>
    <!-- 🎯 Progress Indicator -->
    <div class="progress-container">
        <div class="progress-bar" id="progressBar"></div>
    </div>

    <div class="survey-container">
        <!-- 🎨 Modern Header -->
        <div class="survey-header">
            <h1 class="survey-title">🏥 근골격계 증상조사표</h1>
            <p class="survey-subtitle">산업안전보건 관리 시스템 - SafeWork</p>
            <div class="compliance-badge">
                ✅ 산업안전보건기준에 관한 규칙 제657조 준수
            </div>
        </div>

        <form method="POST" action="/survey/001_musculoskeletal_symptom_survey/submit" id="surveyForm">
            
            <!-- I. 기본정보 -->
            <div class="section-card">
                <h2 class="section-title">
                    <span class="section-icon">👤</span>
                    I. 기본정보
                </h2>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">성명</label>
                        <input type="text" name="name" class="form-control" placeholder="홍길동" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label required">연령</label>
                        <input type="number" name="age" class="form-control" placeholder="35" min="18" max="80" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">성별</label>
                        <div class="radio-group">
                            <div class="radio-item">
                                <input type="radio" id="gender_male" name="gender" value="남" required>
                                <label for="gender_male">남성</label>
                            </div>
                            <div class="radio-item">
                                <input type="radio" id="gender_female" name="gender" value="여" required>
                                <label for="gender_female">여성</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- II. 근무정보 -->
            <div class="section-card">
                <h2 class="section-title">
                    <span class="section-icon">🏢</span>
                    II. 근무정보
                </h2>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">업체명</label>
                        <select name="company" class="form-control" required id="company_select">
                            <option value="">-- 업체를 선택하세요 --</option>
                            <option value="미래도시건설">미래도시건설</option>
                            <option value="직영팀">직영팀</option>
                            <option value="포커스이엔씨">포커스이엔씨</option>
                            <option value="골조팀">골조팀</option>
                            <option value="티이엔">티이엔</option>
                            <option value="기타">기타 (직접입력)</option>
                        </select>
                        <input type="text" name="company_custom" class="form-control" id="company_custom" 
                               placeholder="업체명을 입력하세요" maxlength="50" style="display:none; margin-top: 12px;">
                    </div>
                    <div class="form-group">
                        <label class="form-label required">공정명/부서</label>
                        <select name="process" class="form-control" required id="process_select">
                            <option value="">-- 공정을 선택하세요 --</option>
                            <option value="관리자">관리자</option>
                            <option value="철근">철근</option>
                            <option value="형틀목공">형틀목공</option>
                            <option value="콘크리트타설">콘크리트타설</option>
                            <option value="비계">비계</option>
                            <option value="전기">전기</option>
                            <option value="배관">배관</option>
                            <option value="방수">방수</option>
                            <option value="도장">도장</option>
                            <option value="미장">미장</option>
                            <option value="석공">석공</option>
                            <option value="타일">타일</option>
                            <option value="토공">토공</option>
                            <option value="굴삭">굴삭</option>
                            <option value="크레인">크레인</option>
                            <option value="신호수">신호수</option>
                            <option value="용접">용접</option>
                            <option value="기타">기타 (직접입력)</option>
                        </select>
                        <input type="text" name="process_custom" class="form-control" id="process_custom" 
                               placeholder="공정명을 입력하세요" maxlength="50" style="display:none; margin-top: 12px;">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">직위/역할</label>
                        <select name="role" class="form-control" required>
                            <option value="">-- 직위/역할을 선택하세요 --</option>
                            <option value="관리자">관리자</option>
                            <option value="보통인부">보통인부</option>
                            <option value="장비기사">장비기사</option>
                            <option value="신호수">신호수</option>
                            <option value="용접공">용접공</option>
                            <option value="전기공">전기공</option>
                            <option value="배관공">배관공</option>
                            <option value="타워크레인운전원">타워크레인운전원</option>
                            <option value="굴삭기기사">굴삭기기사</option>
                            <option value="안전관리자">안전관리자</option>
                            <option value="보건관리자">보건관리자</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">현 직장경력</label>
                        <div style="display: flex; gap: 12px;">
                            <input type="number" name="work_years" class="form-control" placeholder="년" min="0" max="50" style="flex: 1;">
                            <input type="number" name="work_months" class="form-control" placeholder="개월" min="0" max="11" style="flex: 1;">
                        </div>
                    </div>
                </div>
            </div>

            <!-- III. 작업특성 -->
            <div class="section-card">
                <h2 class="section-title">
                    <span class="section-icon">⚙️</span>
                    III. 작업특성
                </h2>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">하루 평균 작업시간</label>
                        <select name="daily_work_hours" class="form-control" required>
                            <option value="">선택하세요</option>
                            <option value="6시간 미만">6시간 미만</option>
                            <option value="6-8시간">6-8시간</option>
                            <option value="8-10시간">8-10시간</option>
                            <option value="10-12시간">10-12시간</option>
                            <option value="12시간 이상">12시간 이상</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label required">주요 작업내용 (중복선택 가능)</label>
                    <div class="checkbox-group">
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_lifting" name="work_type" value="중량물 들기/옮기기">
                            <label for="work_lifting">🏋️ 중량물 들기/옮기기</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_repetitive" name="work_type" value="반복작업">
                            <label for="work_repetitive">🔄 반복작업</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_sitting" name="work_type" value="장시간 앉아서 작업">
                            <label for="work_sitting">🪑 장시간 앉아서 작업</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_standing" name="work_type" value="장시간 서서 작업">
                            <label for="work_standing">🧍 장시간 서서 작업</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_bending" name="work_type" value="구부린 자세 작업">
                            <label for="work_bending">🤸 구부린 자세 작업</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_computer" name="work_type" value="컴퓨터/VDT 작업">
                            <label for="work_computer">💻 컴퓨터/VDT 작업</label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 1. 여가 및 취미활동 -->
            <div class="section-card">
                <h2 class="section-title">
                    <span class="section-icon">🎨</span>
                    1. 여가 및 취미활동
                </h2>
                
                <div class="alert">
                    <strong>📝 작성방법:</strong> 규칙적인 (한번에 30분 이상, 1주일에 2-3회, 적어도 1회 이상) 여가 및 취미활동을 하고 계시는 곳에 표시(✓)하여 주십시오.
                </div>

                <div class="checkbox-group">
                    <div class="checkbox-item">
                        <input type="checkbox" id="hobby_computer" name="hobby" value="컴퓨터 관련활동">
                        <label for="hobby_computer">💻 컴퓨터 관련활동</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="hobby_instrument" name="hobby" value="악기연주">
                        <label for="hobby_instrument">🎹 악기연주 (피아노, 바이올린 등)</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="hobby_knitting" name="hobby" value="뜨개질/자수/붓글씨">
                        <label for="hobby_knitting">🧶 뜨개질/자수/붓글씨</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="hobby_racket_sports" name="hobby" value="테니스/배드민턴/스쿼시">
                        <label for="hobby_racket_sports">🏸 테니스/배드민턴/스쿼시</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="hobby_ball_sports" name="hobby" value="축구/족구/농구/스키">
                        <label for="hobby_ball_sports">⚽ 축구/족구/농구/스키</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="hobby_golf" name="hobby" value="골프">
                        <label for="hobby_golf">⛳ 골프</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="hobby_household" name="hobby" value="집안일">
                        <label for="hobby_household">🏠 집안일 (걸레질, 손빨래, 설거지 등)</label>
                    </div>
                </div>
            </div>

            <!-- 2. 가사노동시간 -->
            <div class="section-card">
                <h2 class="section-title">
                    <span class="section-icon">🏠</span>
                    2. 가사노동시간
                </h2>

                <div class="form-group">
                    <label class="form-label">하루 평균 가사노동시간</label>
                    <select name="housework_hours" class="form-control">
                        <option value="">선택하세요</option>
                        <option value="없음">없음</option>
                        <option value="1시간 미만">1시간 미만</option>
                        <option value="1-2시간">1-2시간</option>
                        <option value="2-4시간">2-4시간</option>
                        <option value="4시간 이상">4시간 이상</option>
                    </select>
                </div>
            </div>

            <!-- 3. 진단받은 질병 -->
            <div class="section-card">
                <h2 class="section-title">
                    <span class="section-icon">🩺</span>
                    3. 진단받은 질병
                </h2>

                <div class="form-group">
                    <label class="form-label">의사로부터 진단받은 근골격계 질병이 있으십니까?</label>
                    <div class="radio-group">
                        <div class="radio-item">
                            <input type="radio" id="diagnosed_yes" name="diagnosed_disease" value="예">
                            <label for="diagnosed_yes">예</label>
                        </div>
                        <div class="radio-item">
                            <input type="radio" id="diagnosed_no" name="diagnosed_disease" value="아니오">
                            <label for="diagnosed_no">아니오</label>
                        </div>
                    </div>
                </div>

                <div class="form-group" id="disease_details" style="display: none;">
                    <label class="form-label">진단받은 질병명과 치료기간</label>
                    <textarea name="disease_description" class="form-control" rows="3" 
                        placeholder="예: 어깨충돌증후군 (2023년 3월 진단, 물리치료 3개월)"></textarea>
                </div>
            </div>

            <!-- 4. 과거 사고 -->
            <div class="section-card">
                <h2 class="section-title">
                    <span class="section-icon">🚨</span>
                    4. 과거 사고
                </h2>

                <div class="form-group">
                    <label class="form-label">지난 1년간 작업 중 부상을 당한 적이 있습니까?</label>
                    <div class="radio-group">
                        <div class="radio-item">
                            <input type="radio" id="accident_yes" name="past_accident" value="예">
                            <label for="accident_yes">예</label>
                        </div>
                        <div class="radio-item">
                            <input type="radio" id="accident_no" name="past_accident" value="아니오">
                            <label for="accident_no">아니오</label>
                        </div>
                    </div>
                </div>

                <div class="form-group" id="accident_details" style="display: none;">
                    <label class="form-label">부상 부위 및 경위</label>
                    <textarea name="accident_description" class="form-control" rows="3" 
                        placeholder="부상 부위, 발생 경위, 치료 여부 등을 상세히 기록해주세요"></textarea>
                </div>
            </div>

            <!-- 5. 육체적 부담 정도 -->
            <div class="section-card">
                <h2 class="section-title">
                    <span class="section-icon">💪</span>
                    5. 육체적 부담 정도
                </h2>

                <div class="form-group">
                    <label class="form-label required">현재 작업의 전반적인 육체적 부담 정도</label>
                    <div class="radio-group">
                        <div class="radio-item">
                            <input type="radio" id="burden_very_light" name="physical_burden" value="매우 가벼움" required>
                            <label for="burden_very_light">매우 가벼움</label>
                        </div>
                        <div class="radio-item">
                            <input type="radio" id="burden_light" name="physical_burden" value="가벼움" required>
                            <label for="burden_light">가벼움</label>
                        </div>
                        <div class="radio-item">
                            <input type="radio" id="burden_moderate" name="physical_burden" value="보통" required>
                            <label for="burden_moderate">보통</label>
                        </div>
                        <div class="radio-item">
                            <input type="radio" id="burden_heavy" name="physical_burden" value="무거움" required>
                            <label for="burden_heavy">무거움</label>
                        </div>
                        <div class="radio-item">
                            <input type="radio" id="burden_very_heavy" name="physical_burden" value="매우 무거움" required>
                            <label for="burden_very_heavy">매우 무거움</label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- II. 근골격계 증상조사 -->
            <div class="section-card">
                <h2 class="section-title">
                    <span class="section-icon">🩺</span>
                    II. 근골격계 증상조사
                </h2>

                <div class="alert">
                    <strong>📋 조사 기준:</strong> 지난 1년간 경험한 증상을 기준으로 응답해주세요. 
                    증상이 현재도 지속되거나 재발하는 경우에도 해당됩니다.
                </div>

                <div class="form-group">
                    <label class="form-label required">지난 1년간 목, 어깨, 허리, 팔/다리 등에 통증이나 불편감을 느낀 적이 있습니까?</label>
                    <div class="radio-group">
                        <div class="radio-item">
                            <input type="radio" id="symptoms_yes" name="has_symptoms" value="예" required>
                            <label for="symptoms_yes">예 (증상이 있었음)</label>
                        </div>
                        <div class="radio-item">
                            <input type="radio" id="symptoms_no" name="has_symptoms" value="아니오" required>
                            <label for="symptoms_no">아니오 (증상이 없었음)</label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- IV. 신체부위별 증상 -->
            <div class="section-card" id="bodyPartSymptoms" style="display: none;">
                <h2 class="section-title">
                    <span class="section-icon">🏥</span>
                    IV. 신체부위별 증상
                </h2>

                <div class="alert">
                    <strong>📝 작성방법:</strong> 증상이 있는 신체부위를 선택하고, 각 부위별로 증상의 빈도를 평가해주세요.
                </div>

                <div class="body-parts-container">
                    <label class="form-label">증상이 있는 신체부위를 모두 선택하세요</label>
                    <div class="body-parts-grid">
                        <div class="body-part-card" data-part="neck">
                            <div class="body-part-icon">🦴</div>
                            <div class="body-part-name">목</div>
                            <input type="checkbox" name="affected_parts" value="목" style="display: none;">
                        </div>
                        <div class="body-part-card" data-part="shoulder">
                            <div class="body-part-icon">💪</div>
                            <div class="body-part-name">어깨</div>
                            <input type="checkbox" name="affected_parts" value="어깨" style="display: none;">
                        </div>
                        <div class="body-part-card" data-part="arm">
                            <div class="body-part-icon">🤲</div>
                            <div class="body-part-name">팔/팔꿈치</div>
                            <input type="checkbox" name="affected_parts" value="팔/팔꿈치" style="display: none;">
                        </div>
                        <div class="body-part-card" data-part="wrist">
                            <div class="body-part-icon">✋</div>
                            <div class="body-part-name">손목/손</div>
                            <input type="checkbox" name="affected_parts" value="손목/손" style="display: none;">
                        </div>
                        <div class="body-part-card" data-part="back">
                            <div class="body-part-icon">🧍</div>
                            <div class="body-part-name">허리</div>
                            <input type="checkbox" name="affected_parts" value="허리" style="display: none;">
                        </div>
                        <div class="body-part-card" data-part="leg">
                            <div class="body-part-icon">🦵</div>
                            <div class="body-part-name">다리/발</div>
                            <input type="checkbox" name="affected_parts" value="다리/발" style="display: none;">
                        </div>
                    </div>
                </div>

                <!-- 증상 평가 테이블 -->
                <div id="symptomEvaluationTable" style="display: none;">
                    <h3 style="color: var(--sw-primary); margin: 32px 0 20px 0; font-size: 1.5rem;">선택한 부위의 증상을 평가해주세요</h3>
                    <div class="symptoms-table-container">
                        <table class="symptoms-table">
                            <thead>
                                <tr>
                                    <th style="min-width: 300px;">증상 평가 항목</th>
                                    <th>전혀<br>없음<br>(0점)</th>
                                    <th>가끔<br>(1점)</th>
                                    <th>자주<br>(2점)</th>
                                    <th>항상<br>(3점)</th>
                                </tr>
                            </thead>
                            <tbody id="symptomTableBody">
                                <!-- JavaScript로 동적 생성 -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- V. 추가정보 -->
            <div class="section-card">
                <h2 class="section-title">
                    <span class="section-icon">📝</span>
                    V. 추가정보
                </h2>

                <div class="form-group">
                    <label class="form-label">증상에 대한 자세한 설명</label>
                    <textarea name="symptom_description" class="form-control" rows="4"
                        placeholder="언제부터 시작되었는지, 어떤 작업을 할 때 심해지는지, 치료를 받은 적이 있는지 등을 자세히 적어주세요."></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">작업환경 개선 제안사항</label>
                    <textarea name="improvement_suggestions" class="form-control" rows="3"
                        placeholder="근골격계 질환 예방을 위해 필요한 작업환경 개선사항이 있다면 적어주세요."></textarea>
                </div>
            </div>

            <!-- 🎯 Sticky Submit Button -->
            <div class="submit-container">
                <button type="submit" class="submit-btn" id="submitBtn">
                    📋 설문조사 제출하기
                </button>
            </div>
        </form>
    </div>

    <script>
        // 🎯 Progress Tracking
        function updateProgress() {
            const form = document.getElementById('surveyForm');
            const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
            const completed = Array.from(inputs).filter(input => {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    const name = input.name;
                    return form.querySelector('input[name="' + name + '"]:checked');
                }
                return input.value.trim() !== '';
            });

            const progress = (completed.length / inputs.length) * 100;
            document.getElementById('progressBar').style.width = progress + '%';
        }

        // 📝 Custom Input Handlers
        document.querySelectorAll('#company_select, #process_select').forEach(select => {
            select.addEventListener('change', function() {
                const customInput = document.getElementById(this.id.replace('_select', '_custom'));
                if (this.value === '기타') {
                    customInput.style.display = 'block';
                    customInput.required = true;
                    customInput.focus();
                } else {
                    customInput.style.display = 'none';
                    customInput.required = false;
                    customInput.value = '';
                }
                updateProgress();
            });
        });

        // 🩺 Disease Details Toggle
        document.querySelectorAll('input[name="diagnosed_disease"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const details = document.getElementById('disease_details');
                details.style.display = this.value === '예' ? 'block' : 'none';
                updateProgress();
            });
        });

        // 🚨 Accident Details Toggle
        document.querySelectorAll('input[name="past_accident"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const details = document.getElementById('accident_details');
                details.style.display = this.value === '예' ? 'block' : 'none';
                updateProgress();
            });
        });

        // 🏥 Symptoms Section Toggle
        document.querySelectorAll('input[name="has_symptoms"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const section = document.getElementById('bodyPartSymptoms');
                section.style.display = this.value === '예' ? 'block' : 'none';
                updateProgress();
            });
        });

        // 💪 Interactive Body Parts Selection
        document.querySelectorAll('.body-part-card').forEach(card => {
            card.addEventListener('click', function() {
                const checkbox = this.querySelector('input[type="checkbox"]');
                const isSelected = this.classList.contains('selected');

                if (isSelected) {
                    this.classList.remove('selected');
                    checkbox.checked = false;
                } else {
                    this.classList.add('selected');
                    checkbox.checked = true;
                }

                updateSymptomTable();
                updateProgress();
            });
        });

        function updateSymptomTable() {
            const selectedCards = document.querySelectorAll('.body-part-card.selected');
            const table = document.getElementById('symptomEvaluationTable');
            const tbody = document.getElementById('symptomTableBody');
            
            if (selectedCards.length > 0) {
                tbody.innerHTML = '';
                
                selectedCards.forEach((card, index) => {
                    const partName = card.querySelector('.body-part-name').textContent;
                    const partValue = card.querySelector('input[type="checkbox"]').value;
                    const partKey = card.dataset.part;
                    
                    // 부위별 구분 헤더
                    if (index === 0) {
                        const headerRow = tbody.insertRow();
                        headerRow.innerHTML = '<td colspan="5" style="background: var(--sw-primary); color: white; padding: 16px; text-align: center; font-weight: 700; font-size: 1.1rem;">선택된 부위별 증상 평가</td>';
                    }
                    
                    const partHeaderRow = tbody.insertRow();
                    partHeaderRow.innerHTML = '<td colspan="5" style="background: var(--sw-primary-light); color: white; padding: 12px; text-align: center; font-weight: 600;">' + partName + ' 증상 평가</td>';
                    
                    // 5개 증상 질문
                    const symptoms = [
                        { key: 'pain', text: '통증이나 아픔이 있다' },
                        { key: 'stiffness', text: '뻣뻣하거나 경직된 느낌이 있다' },
                        { key: 'numbness', text: '저리거나 화끈거리는 느낌이 있다' },
                        { key: 'swelling', text: '부어오른 느낌이나 붓기가 있다' },
                        { key: 'interference', text: '일상생활이나 업무에 지장을 준다' }
                    ];
                    
                    symptoms.forEach((symptom, symIndex) => {
                        const row = tbody.insertRow();
                        const fieldName = partKey + '_' + symptom.key + '_frequency';
                        row.innerHTML = '<td class="question-cell">' + (symIndex + 1) + '. ' + symptom.text + '</td>' +
                            '<td class="answer-cell"><input type="radio" name="' + fieldName + '" value="0" required></td>' +
                            '<td class="answer-cell"><input type="radio" name="' + fieldName + '" value="1"></td>' +
                            '<td class="answer-cell"><input type="radio" name="' + fieldName + '" value="2"></td>' +
                            '<td class="answer-cell"><input type="radio" name="' + fieldName + '" value="3"></td>';
                    });
                });
                
                table.style.display = 'block';
            } else {
                table.style.display = 'none';
                tbody.innerHTML = '';
            }
        }

        // 📋 Form Validation & Submission
        document.getElementById('surveyForm').addEventListener('submit', function(e) {
            const hasSymptoms = document.querySelector('input[name="has_symptoms"]:checked');
            
            if (hasSymptoms && hasSymptoms.value === '예') {
                const selectedParts = document.querySelectorAll('.body-part-card.selected');
                
                if (selectedParts.length === 0) {
                    e.preventDefault();
                    alert('증상이 있는 신체부위를 최소 1개 이상 선택해주세요.');
                    document.querySelector('.body-parts-container').scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                    return false;
                }

                // 선택된 부위별 증상 평가 완료 확인
                const requiredRadios = document.querySelectorAll('#symptomEvaluationTable input[required]');
                const questions = {};
                let allAnswered = true;

                requiredRadios.forEach(radio => {
                    const name = radio.name;
                    if (!questions[name]) {
                        questions[name] = false;
                    }
                    if (radio.checked) {
                        questions[name] = true;
                    }
                });

                Object.values(questions).forEach(answered => {
                    if (!answered) allAnswered = false;
                });

                if (!allAnswered) {
                    e.preventDefault();
                    alert('선택한 신체부위의 모든 증상 평가 항목을 완료해주세요.');
                    document.getElementById('symptomEvaluationTable').scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                    return false;
                }
            }

            // Submit button loading state
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.innerHTML = '⏳ 제출중...';
            submitBtn.disabled = true;
        });

        // 🎯 Real-time Progress Updates
        document.addEventListener('change', updateProgress);
        document.addEventListener('input', updateProgress);
        
        // Initialize progress
        updateProgress();

        // 🎨 Loading Animation
        window.addEventListener('load', function() {
            document.body.style.opacity = '1';
        });

        // 📱 Touch Optimizations for Mobile
        if ('ontouchstart' in window) {
            document.querySelectorAll('.form-control, .radio-item, .checkbox-item, .body-part-card').forEach(element => {
                if (!element.style.minHeight) {
                    element.style.minHeight = '48px';
                }
                if (!element.style.fontSize) {
                    element.style.fontSize = '16px';
                }
            });
        }
    </script>
</body>
</html>`;

          return new Response(modernSurveyForm, {
            headers: {
              'Content-Type': 'text/html;charset=UTF-8'
            }
          });
        }

        // Handle form submission for the redesigned form
        if (path.endsWith('/submit') && request.method === 'POST') {
          const formData = await request.formData();
          const data = {};

          // 다중 값 필드 처리 (체크박스 등)
          const multiValueFields = ['work_type', 'affected_parts', 'hobby'];

          for (const [key, value] of formData.entries()) {
            if (multiValueFields.includes(key)) {
              if (!data[key]) {
                data[key] = [];
              }
              data[key].push(value);
            } else {
              data[key] = value;
            }
          }

          const id = 'survey_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

          // 원본 SafeWork 호환 데이터 구조
          const survey = {
            id,
            form_type: '001_musculoskeletal_symptom_survey',
            user_id: 1, // 익명 사용자
            responses: data,

            // 기본 정보 추출
            name: data.name || '',
            age: parseInt(data.age) || 0,
            gender: data.gender || '',
            company: data.company_custom || data.company || '',
            department: data.process_custom || data.process || '',
            role: data.role || '',
            work_years: parseInt(data.work_years) || 0,
            work_months: parseInt(data.work_months) || 0,

            // 작업 특성
            daily_work_hours: data.daily_work_hours || '',
            work_type: Array.isArray(data.work_type) ? data.work_type : [data.work_type || ''].filter(Boolean),

            // 여가 활동
            hobby: Array.isArray(data.hobby) ? data.hobby : [data.hobby || ''].filter(Boolean),
            
            // 추가 정보
            housework_hours: data.housework_hours || '',
            diagnosed_disease: data.diagnosed_disease || '',
            disease_description: data.disease_description || '',
            past_accident: data.past_accident || '',
            accident_description: data.accident_description || '',
            physical_burden: data.physical_burden || '',
            
            // 증상 관련
            has_symptoms: data.has_symptoms || '',
            affected_parts: Array.isArray(data.affected_parts) ? data.affected_parts : [data.affected_parts || ''].filter(Boolean),
            
            // 부위별 증상 데이터 구조화
            symptoms_by_part: (() => {
              const symptomsByPart = {};
              const bodyParts = ['neck', 'shoulder', 'arm', 'wrist', 'back', 'leg'];
              const symptomTypes = ['pain', 'stiffness', 'numbness', 'swelling', 'interference'];
              
              bodyParts.forEach(part => {
                const partSymptoms = {};
                let hasSymptoms = false;
                
                symptomTypes.forEach(symptom => {
                  const fieldName = part + '_' + symptom + '_frequency';
                  if (data[fieldName] !== undefined) {
                    partSymptoms[symptom] = parseInt(data[fieldName]) || 0;
                    hasSymptoms = true;
                  }
                });
                
                if (hasSymptoms) {
                  symptomsByPart[part] = partSymptoms;
                }
              });
              
              return symptomsByPart;
            })(),

            // 추가 정보
            symptom_description: data.symptom_description || '',
            improvement_suggestions: data.improvement_suggestions || '',

            // 메타데이터
            submitted_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            environment: env.ENVIRONMENT || 'development',

            // 한국 시간대 추가
            submitted_at_kst: new Intl.DateTimeFormat('ko-KR', {
              timeZone: 'Asia/Seoul',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }).format(new Date())
          };

          await env.SURVEYS.put(id, JSON.stringify(survey));

          // 📢 MCP Slack API로 알림 전송 (웹훅 대신)
          // SafeWork 채널 ID: C09EBJMS8DN
          const SLACK_CHANNEL_ID = 'C09EBJMS8DN';

          try {
            // 증상 부위별 상세 정보 생성
            const symptomSummary = [];
            const bodyParts = ['neck', 'shoulder', 'elbow', 'wrist', 'back', 'knee'];
            const symptomTypes = ['pain', 'numbness', 'stiffness', 'weakness', 'discomfort'];

            bodyParts.forEach(part => {
              if (data[part]) {
                const partSymptoms = [];
                symptomTypes.forEach(symptom => {
                  const fieldName = part + '_' + symptom + '_frequency';
                  if (data[fieldName] !== undefined) {
                    const frequency = parseInt(data[fieldName]) || 0;
                    const levels = ['없음', '가끔', '종종', '항상'];
                    partSymptoms.push(`${symptom}: ${levels[frequency]}`);
                  }
                });

                if (partSymptoms.length > 0) {
                  const partNames = {
                    neck: '목', shoulder: '어깨', elbow: '팔꿈치',
                    wrist: '손목', back: '허리', knee: '무릎'
                  };
                  symptomSummary.push(`*${partNames[part]}:* ${partSymptoms.join(', ')}`);
                }
              }
            });

            // 전체 데이터를 JSON 형태로 첨부 (Slack 메시지 제한 고려)
            const fullDataText = JSON.stringify(data, null, 2);
            const truncatedData = fullDataText.length > 1000 ?
              fullDataText.substring(0, 1000) + '...' : fullDataText;

            const slackMessage = {
              text: `🏥 새로운 SafeWork 설문조사 제출 - ${data.name || '익명'}`,
              blocks: [
                {
                  type: "header",
                  text: {
                    type: "plain_text",
                    text: "🏥 SafeWork 근골격계 증상조사표 제출"
                  }
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*설문 ID:* ${id}\n*제출 시간:* ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
                  }
                },
                {
                  type: "section",
                  fields: [
                    {
                      type: "mrkdwn",
                      text: `*👤 제출자 정보*\n이름: ${data.name || '익명'}\n성별: ${data.gender || 'N/A'}\n나이: ${data.age || 'N/A'}세`
                    },
                    {
                      type: "mrkdwn",
                      text: `*🏢 근무 정보*\n회사: ${data.company || 'N/A'}\n공정: ${data.process || 'N/A'}\n직책: ${data.role || 'N/A'}\n근무연수: ${data.work_years || 'N/A'}년`
                    }
                  ]
                },
                {
                  type: "section",
                  fields: [
                    {
                      type: "mrkdwn",
                      text: `*🏥 건강 정보*\n부서: ${data.department || 'N/A'}\n증상 여부: ${data.has_symptoms || 'N/A'}\n작업 형태: ${data.work_type || 'N/A'}`
                    },
                    {
                      type: "mrkdwn",
                      text: `*🎯 취미 활동*\n${data.hobby ? (Array.isArray(data.hobby) ? data.hobby.join(', ') : data.hobby) : 'N/A'}`
                    }
                  ]
                }
              ]
            };

            // 증상 정보가 있으면 추가
            if (symptomSummary.length > 0) {
              slackMessage.blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*🩺 증상 상세 정보*\n${symptomSummary.join('\n')}`
                }
              });
            }

            // 전체 데이터 첨부
            slackMessage.blocks.push(
              {
                type: "divider"
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*📊 전체 제출 데이터*\n\`\`\`${truncatedData}\`\`\``
                }
              },
              {
                type: "context",
                elements: [
                  {
                    type: "mrkdwn",
                    text: `환경: ${env.ENVIRONMENT} | 링크: https://safework.jclee.me | 버전: ${env.API_VERSION}`
                  }
                ]
              }
            );

            // MCP API 통합 메시지 (실제 MCP는 Worker에서 직접 사용 불가, 로컬에서만 작동)
            // Production에서는 여전히 웹훅 방식 사용 필요
            if (env.SLACK_WEBHOOK_URL && env.SLACK_WEBHOOK_URL.startsWith('https://hooks.slack.com/services/')) {
              console.log('Sending Slack notification via webhook...');

              const response = await fetch(env.SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(slackMessage)
              });

              const responseText = await response.text();
              if (!response.ok) {
                console.error('Slack webhook failed:', responseText);
              } else {
                console.log('Slack notification sent successfully');
              }
            } else {
              // MCP Slack 통합 안내 메시지
              console.log('💡 Slack 알림 설정 안내:');
              console.log('1. Cloudflare Dashboard에서 SLACK_WEBHOOK_URL 환경변수 설정');
              console.log('2. 또는 로컬에서 MCP Slack 도구로 직접 알림 전송');
              console.log(`채널 ID: ${SLACK_CHANNEL_ID} (safework)`);
            }
          } catch (error) {
            console.error('Slack notification error:', error);
          }

          return new Response(`
            <!DOCTYPE html>
            <html lang="ko">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>✅ 제출 완료 - SafeWork</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 20px;
                }
                .success-container {
                  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
                  border-radius: 24px;
                  padding: 48px 40px;
                  max-width: 600px;
                  width: 100%;
                  text-align: center;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                  border: 1px solid rgba(99, 102, 241, 0.1);
                  position: relative;
                  overflow: hidden;
                }
                .success-container::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  height: 6px;
                  background: linear-gradient(90deg, #10b981, #059669);
                }
                .success-icon {
                  font-size: 4rem;
                  color: #10b981;
                  margin-bottom: 24px;
                  animation: bounce 2s infinite;
                }
                @keyframes bounce {
                  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                  40% { transform: translateY(-10px); }
                  60% { transform: translateY(-5px); }
                }
                .success-title {
                  color: #1f2937;
                  font-size: 2.5rem;
                  font-weight: 800;
                  margin-bottom: 16px;
                  letter-spacing: -0.025em;
                }
                .success-message {
                  color: #6b7280;
                  font-size: 1.2rem;
                  margin-bottom: 32px;
                  line-height: 1.6;
                }
                .success-details {
                  background: #f0fdf4;
                  border: 2px solid #bbf7d0;
                  border-radius: 12px;
                  padding: 20px;
                  margin: 24px 0;
                  text-align: left;
                }
                .success-details h4 {
                  color: #166534;
                  margin-bottom: 12px;
                  font-weight: 600;
                }
                .success-details ul {
                  color: #166534;
                  list-style-position: inside;
                }
                .success-details li {
                  margin-bottom: 4px;
                }
                .action-buttons {
                  display: flex;
                  gap: 16px;
                  justify-content: center;
                  margin-top: 32px;
                  flex-wrap: wrap;
                }
                .btn {
                  padding: 16px 32px;
                  border-radius: 12px;
                  font-size: 1.1rem;
                  font-weight: 600;
                  text-decoration: none;
                  transition: all 0.3s ease;
                  border: none;
                  cursor: pointer;
                }
                .btn-primary {
                  background: linear-gradient(135deg, #667eea 0%, #4f46e5 100%);
                  color: white;
                  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
                }
                .btn-primary:hover {
                  transform: translateY(-3px);
                  box-shadow: 0 12px 35px rgba(99, 102, 241, 0.4);
                }
                .btn-secondary {
                  background: #f8fafc;
                  color: #475569;
                  border: 2px solid #e2e8f0;
                }
                .btn-secondary:hover {
                  background: #e2e8f0;
                  transform: translateY(-2px);
                }
                @media (max-width: 640px) {
                  .success-container { padding: 32px 24px; }
                  .success-title { font-size: 2rem; }
                  .action-buttons { flex-direction: column; }
                  .btn { width: 100%; }
                }
              </style>
            </head>
            <body>
              <div class="success-container">
                <div class="success-icon">✅</div>
                <h1 class="success-title">제출 완료!</h1>
                <p class="success-message">
                  근골격계 증상조사표가 성공적으로 제출되었습니다.<br>
                  귀중한 시간을 내어 응답해 주셔서 감사합니다.
                </p>
                
                <div class="success-details">
                  <h4>📋 제출 정보</h4>
                  <ul>
                    <li><strong>응답자:</strong> \${survey.name || '익명'}</li>
                    <li><strong>업체:</strong> \${survey.company || 'N/A'}</li>
                    <li><strong>부서/공정:</strong> \${survey.department || 'N/A'}</li>
                    <li><strong>제출시간:</strong> \${survey.submitted_at_kst}</li>
                    <li><strong>설문ID:</strong> \${survey.id}</li>
                  </ul>
                </div>

                <div class="action-buttons">
                  <a href="/" class="btn btn-primary">🏠 홈으로 돌아가기</a>
                  <a href="/survey/001_musculoskeletal_symptom_survey" class="btn btn-secondary">📝 새 설문 작성</a>
                </div>
              </div>
            </body>
            </html>
          `, {
            headers: {
              'Content-Type': 'text/html;charset=UTF-8'
            }
          });
        }
      }

      // Home page
      if (path === '/') {
        return new Response(`
          <!DOCTYPE html>
          <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SafeWork - 산업안전보건 통합 관리 시스템</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }

              :root {
                --primary: #2563eb;
                --primary-dark: #1e40af;
                --secondary: #7c3aed;
                --success: #10b981;
                --danger: #ef4444;
                --warning: #f59e0b;
                --dark: #1f2937;
                --light: #f3f4f6;
              }

              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
                background-attachment: fixed;
              }

              .main-container {
                max-width: 1200px;
                margin: 0 auto;
                animation: fadeIn 0.6s ease-out;
              }

              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }

              /* Header Section */
              .header {
                background: white;
                border-radius: 20px;
                padding: 40px;
                margin-bottom: 30px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                text-align: center;
              }

              .logo {
                font-size: 3.5em;
                font-weight: 800;
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
                letter-spacing: -2px;
              }

              .subtitle {
                color: #64748b;
                font-size: 1.3em;
                font-weight: 500;
                margin-bottom: 20px;
              }

              .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border-radius: 50px;
                font-weight: 600;
                animation: pulse 2s infinite;
              }

              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }

              /* Navigation Cards */
              .nav-section {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 25px;
                margin-bottom: 30px;
              }

              .nav-card {
                background: white;
                border-radius: 16px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                text-decoration: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 2px solid transparent;
                position: relative;
                overflow: hidden;
              }

              .nav-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background: linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%);
                transform: scaleX(0);
                transition: transform 0.3s;
              }

              .nav-card:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                border-color: var(--primary);
              }

              .nav-card:hover::before {
                transform: scaleX(1);
              }

              .card-icon {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 28px;
                margin-bottom: 20px;
              }

              .nav-card.admin .card-icon { background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); }
              .nav-card.survey .card-icon { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }

              .card-title {
                font-size: 1.5em;
                font-weight: 700;
                color: var(--dark);
                margin-bottom: 10px;
              }

              .card-desc {
                color: #64748b;
                line-height: 1.6;
                margin-bottom: 15px;
              }

              .card-badge {
                display: inline-block;
                padding: 6px 12px;
                background: var(--light);
                color: var(--primary);
                border-radius: 20px;
                font-size: 0.85em;
                font-weight: 600;
              }

              /* Quick Actions */
              .quick-actions {
                background: white;
                border-radius: 16px;
                padding: 25px;
                margin-bottom: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              }

              .quick-actions h3 {
                color: var(--dark);
                margin-bottom: 20px;
                font-size: 1.3em;
                font-weight: 700;
              }

              .action-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
              }

              .action-btn {
                padding: 12px 24px;
                background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                color: white;
                border-radius: 10px;
                text-decoration: none;
                font-weight: 600;
                transition: all 0.3s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
              }

              .action-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
              }

              .action-btn.secondary {
                background: white;
                color: var(--primary);
                border: 2px solid var(--primary);
              }

              /* Footer */
              .footer {
                text-align: center;
                color: white;
                padding: 20px;
                font-size: 0.9em;
                opacity: 0.9;
              }

              /* Responsive */
              @media (max-width: 768px) {
                .nav-section {
                  grid-template-columns: 1fr;
                }

                .logo {
                  font-size: 2.5em;
                }

                .header {
                  padding: 30px 20px;
                }
              }
            </style>
          </head>
          <body>
            <div class="main-container">
              <!-- Header -->
              <div class="header">
                <h1 class="logo">SafeWork</h1>
                <p class="subtitle">산업안전보건 통합 관리 시스템</p>
                <span class="status-badge">
                  <i class="bi bi-check-circle-fill"></i>
                  시스템 정상 운영중
                </span>
              </div>

              <!-- Main Navigation -->
              <div class="nav-section">
                <!-- Worker Survey -->
                <a href="/survey/001_musculoskeletal_symptom_survey" class="nav-card survey">
                  <div class="card-icon">
                    <i class="bi bi-clipboard2-pulse"></i>
                  </div>
                  <h2 class="card-title">근골격계 증상조사</h2>
                  <p class="card-desc">근로자 자가진단 설문조사<br>통증 및 불편함을 체계적으로 평가</p>
                  <span class="card-badge">근로자용</span>
                </a>

                <!-- Admin Program -->
                <a href="/survey/002_musculoskeletal_symptom_program" class="nav-card admin">
                  <div class="card-icon">
                    <i class="bi bi-shield-check"></i>
                  </div>
                  <h2 class="card-title">유해요인 조사</h2>
                  <p class="card-desc">작업장 위험도 평가 프로그램<br>안전관리자 전용 분석 도구</p>
                  <span class="card-badge">관리자용</span>
                </a>

                <!-- Admin Panel -->
                <a href="/admin/survey" class="nav-card admin">
                  <div class="card-icon">
                    <i class="bi bi-gear-wide-connected"></i>
                  </div>
                  <h2 class="card-title">관리자 대시보드</h2>
                  <p class="card-desc">설문 데이터 관리 및 분석<br>통계 및 리포트 생성</p>
                  <span class="card-badge">인증 필요</span>
                </a>
              </div>

              <!-- Quick Actions -->
              <div class="quick-actions">
                <h3><i class="bi bi-lightning-charge"></i> 빠른 실행</h3>
                <div class="action-buttons">
                  <a href="/survey/" class="action-btn">
                    <i class="bi bi-list-check"></i>
                    전체 설문 목록
                  </a>
                  <a href="/api/health" class="action-btn secondary">
                    <i class="bi bi-activity"></i>
                    시스템 상태
                  </a>
                  <a href="/admin/login" class="action-btn secondary">
                    <i class="bi bi-box-arrow-in-right"></i>
                    관리자 로그인
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div class="footer">
                <p>© 2025 SafeWork - 산업안전보건공단 인증 시스템</p>
                <p>Powered by Cloudflare Workers & PostgreSQL</p>
              </div>
            </div>
          </body>
          </html>
        `, {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8'
          }
        });
      }

      // 404 Not Found
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};