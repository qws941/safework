// Admin panel routes
export const adminRoutes = {
  // Admin dashboard
  dashboard: async (request, env) => {
    // Check if logged in
    const cookie = request.headers.get('Cookie');
    const sessionId = cookie?.match(/session_id=([^;]+)/)?.[1];

    if (!sessionId) {
      return Response.redirect('/admin/login', 302);
    }

    const session = await env.SESSIONS.get(sessionId);
    if (!session) {
      return Response.redirect('/admin/login', 302);
    }

    return new Response(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SafeWork Admin Dashboard</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header h1 { font-size: 24px; }
          .container {
            max-width: 1200px;
            margin: 20px auto;
            padding: 0 20px;
          }
          .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          .card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.3s;
          }
          .card:hover { transform: translateY(-5px); }
          .card h3 {
            color: #667eea;
            margin-bottom: 15px;
          }
          .card p { color: #666; }
          .stats {
            font-size: 2em;
            font-weight: bold;
            color: #333;
            margin: 10px 0;
          }
          .nav {
            background: white;
            padding: 15px;
            margin-top: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .nav a {
            color: #667eea;
            text-decoration: none;
            padding: 10px 15px;
            margin-right: 10px;
            border-radius: 5px;
            display: inline-block;
            transition: background 0.3s;
          }
          .nav a:hover {
            background: #f0f0f0;
          }
          .logout {
            float: right;
            background: #ff5252;
            color: white !important;
          }
          .logout:hover {
            background: #ff1744 !important;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SafeWork 관리자 대시보드</h1>
          <p>산업안전보건 관리 시스템</p>
        </div>

        <div class="container">
          <div class="nav">
            <a href="/admin">대시보드</a>
            <a href="/admin/surveys">설문 관리</a>
            <a href="/admin/users">사용자 관리</a>
            <a href="/admin/documents">문서 관리</a>
            <a href="/admin/safework">SafeWork 설정</a>
            <a href="/admin/logout" class="logout">로그아웃</a>
          </div>

          <div class="cards">
            <div class="card">
              <h3>📋 설문조사</h3>
              <div class="stats" id="surveyCount">0</div>
              <p>등록된 설문 수</p>
            </div>

            <div class="card">
              <h3>👥 사용자</h3>
              <div class="stats" id="userCount">0</div>
              <p>등록된 사용자 수</p>
            </div>

            <div class="card">
              <h3>📄 문서</h3>
              <div class="stats" id="docCount">0</div>
              <p>업로드된 문서 수</p>
            </div>

            <div class="card">
              <h3>✅ 시스템 상태</h3>
              <div class="stats" style="color: #4caf50;">정상</div>
              <p>Cloudflare Workers</p>
            </div>
          </div>
        </div>

        <script>
          // Load stats
          async function loadStats() {
            try {
              const surveyResponse = await fetch('/api/surveys');
              const surveyData = await surveyResponse.json();
              document.getElementById('surveyCount').textContent = surveyData.count || 0;
            } catch (error) {
              console.error('Error loading stats:', error);
            }
          }
          loadStats();
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  },

  // Login page
  loginPage: async () => {
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
            transition: border-color 0.3s;
          }
          input:focus {
            outline: none;
            border-color: #667eea;
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
            transition: transform 0.3s;
          }
          button:hover {
            transform: translateY(-2px);
          }
          .error {
            color: #f44336;
            margin-top: 10px;
            text-align: center;
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="login-container">
          <h2>SafeWork 관리자 로그인</h2>
          <form id="loginForm" method="POST" action="/admin/login">
            <div class="form-group">
              <label for="username">사용자명</label>
              <input type="text" id="username" name="username" required autofocus>
            </div>
            <div class="form-group">
              <label for="password">비밀번호</label>
              <input type="password" id="password" name="password" required>
            </div>
            <button type="submit">로그인</button>
            <div class="error" id="error"></div>
          </form>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  },

  // Login handler
  login: async (request, env) => {
    try {
      const formData = await request.formData();
      const username = formData.get('username');
      const password = formData.get('password');

      // Simple authentication (in production, use proper hashing)
      if (username === 'admin' && password === 'safework2024') {
        const sessionId = crypto.randomUUID();
        await env.SESSIONS.put(sessionId, JSON.stringify({
          username,
          loggedInAt: new Date().toISOString()
        }), {
          expirationTtl: 86400 // 24 hours
        });

        return new Response(null, {
          status: 302,
          headers: {
            'Location': '/admin',
            'Set-Cookie': `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
          }
        });
      } else {
        return Response.redirect('/admin/login?error=invalid', 302);
      }
    } catch (error) {
      return Response.redirect('/admin/login?error=system', 302);
    }
  },

  // Logout handler
  logout: async (request, env) => {
    const cookie = request.headers.get('Cookie');
    const sessionId = cookie?.match(/session_id=([^;]+)/)?.[1];

    if (sessionId) {
      await env.SESSIONS.delete(sessionId);
    }

    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/admin/login',
        'Set-Cookie': 'session_id=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
      }
    });
  },

  // SafeWork dashboard
  safeworkDashboard: async (request, env) => {
    // Check authentication
    const cookie = request.headers.get('Cookie');
    const sessionId = cookie?.match(/session_id=([^;]+)/)?.[1];

    if (!sessionId || !await env.SESSIONS.get(sessionId)) {
      return Response.redirect('/admin/login', 302);
    }

    return new Response(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>SafeWork 설정</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }
          h1 { color: #333; }
          .container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 1200px;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>SafeWork 설정</h1>
          <p>산업안전보건 관리 시스템 설정 페이지</p>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  },

  // Survey list
  surveyList: async (request, env) => {
    // Check authentication
    const cookie = request.headers.get('Cookie');
    const sessionId = cookie?.match(/session_id=([^;]+)/)?.[1];

    if (!sessionId || !await env.SESSIONS.get(sessionId)) {
      return Response.redirect('/admin/login', 302);
    }

    return new Response(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>설문 관리</title>
      </head>
      <body>
        <h1>설문 관리</h1>
        <div id="surveys">Loading...</div>
        <script>
          fetch('/api/surveys')
            .then(res => res.json())
            .then(data => {
              document.getElementById('surveys').innerHTML = JSON.stringify(data, null, 2);
            });
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  },

  // User list
  userList: async (request, env) => {
    // Check authentication
    const cookie = request.headers.get('Cookie');
    const sessionId = cookie?.match(/session_id=([^;]+)/)?.[1];

    if (!sessionId || !await env.SESSIONS.get(sessionId)) {
      return Response.redirect('/admin/login', 302);
    }

    return new Response(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>사용자 관리</title>
      </head>
      <body>
        <h1>사용자 관리</h1>
        <p>사용자 목록 페이지</p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  },

  // Document list
  documentList: async (request, env) => {
    // Check authentication
    const cookie = request.headers.get('Cookie');
    const sessionId = cookie?.match(/session_id=([^;]+)/)?.[1];

    if (!sessionId || !await env.SESSIONS.get(sessionId)) {
      return Response.redirect('/admin/login', 302);
    }

    return new Response(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>문서 관리</title>
      </head>
      <body>
        <h1>문서 관리</h1>
        <p>문서 목록 페이지</p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};