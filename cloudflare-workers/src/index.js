// SafeWork Cloudflare Workers Application
// Complete industrial safety management system

import { Router } from 'itty-router';
import { surveyRoutes } from './routes/surveys';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { documentRoutes } from './routes/documents';
import { healthRoutes } from './routes/health';
import { corsHeaders } from './utils/cors';

const router = Router();

// Global error handler
async function handleRequest(request, env, ctx) {
  try {
    // Add CORS headers
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    // Route the request
    const response = await router.handle(request, env, ctx);

    if (!response) {
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });
    }

    // Add CORS headers to all responses
    const newResponse = new Response(response.body, response);
    Object.keys(corsHeaders).forEach(key => {
      newResponse.headers.set(key, corsHeaders[key]);
    });

    return newResponse;
  } catch (error) {
    console.error('Request error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}

// Health check endpoint
router.get('/health', (request, env) => healthRoutes.health(request, env));
router.get('/api/health', (request, env) => healthRoutes.health(request, env));

// Survey routes
router.get('/api/surveys', (request, env) => surveyRoutes.list(request, env));
router.get('/api/surveys/:id', (request, env, ctx) => surveyRoutes.get(request, { params: ctx.params }, env));
router.post('/api/surveys', (request, env) => surveyRoutes.create(request, env));
router.put('/api/surveys/:id', (request, env, ctx) => surveyRoutes.update(request, { params: ctx.params }, env));
router.delete('/api/surveys/:id', (request, env, ctx) => surveyRoutes.delete(request, { params: ctx.params }, env));

// Survey form routes (public)
router.get('/survey/:form_type', (request, env, ctx) => surveyRoutes.renderForm(request, { params: ctx.params }, env));
router.post('/survey/:form_type/submit', (request, env, ctx) => surveyRoutes.submitForm(request, { params: ctx.params }, env));

// Admin routes
router.get('/admin', (request, env) => adminRoutes.dashboard(request, env));
router.get('/admin/login', () => adminRoutes.loginPage());
router.post('/admin/login', (request, env) => adminRoutes.login(request, env));
router.get('/admin/logout', (request, env) => adminRoutes.logout(request, env));
router.get('/admin/safework', (request, env) => adminRoutes.safeworkDashboard(request, env));
router.get('/admin/surveys', (request, env) => adminRoutes.surveyList(request, env));
router.get('/admin/users', (request, env) => adminRoutes.userList(request, env));
router.get('/admin/documents', (request, env) => adminRoutes.documentList(request, env));

// Auth routes
router.post('/api/auth/login', (request, env) => authRoutes.login(request, env));
router.post('/api/auth/logout', (request, env) => authRoutes.logout(request, env));
router.post('/api/auth/register', (request, env) => authRoutes.register(request, env));
router.get('/api/auth/verify', (request, env) => authRoutes.verify(request, env));

// Document routes
router.get('/api/documents', (request, env) => documentRoutes.list(request, env));
router.get('/api/documents/:id', (request, env, ctx) => documentRoutes.get(request, { params: ctx.params }, env));
router.post('/api/documents', (request, env) => documentRoutes.upload(request, env));
router.delete('/api/documents/:id', (request, env, ctx) => documentRoutes.delete(request, { params: ctx.params }, env));

// Home page
router.get('/', () => {
  return new Response(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SafeWork - 산업안전보건 관리 시스템</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 40px;
          max-width: 600px;
          width: 100%;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 2.5em;
        }
        .subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 1.2em;
        }
        .links {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 30px;
        }
        .link-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          text-decoration: none;
          color: #333;
          transition: transform 0.3s, box-shadow 0.3s;
          border: 2px solid transparent;
        }
        .link-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          border-color: #667eea;
        }
        .link-card h3 {
          margin-bottom: 10px;
          color: #667eea;
        }
        .link-card p {
          font-size: 0.9em;
          color: #666;
        }
        .status {
          margin-top: 30px;
          padding: 15px;
          background: #e8f5e9;
          border-radius: 10px;
          text-align: center;
          color: #2e7d32;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>SafeWork</h1>
        <p class="subtitle">산업안전보건 관리 시스템</p>

        <div class="status">
          ✅ 시스템 정상 작동중 | Cloudflare Workers
        </div>

        <div class="links">
          <a href="/admin" class="link-card">
            <h3>관리자 패널</h3>
            <p>시스템 관리 및 데이터 조회</p>
          </a>
          <a href="/survey/001_musculoskeletal_symptom_survey" class="link-card">
            <h3>근골격계 증상 조사</h3>
            <p>작업자 건강 평가</p>
          </a>
          <a href="/survey/002_workplace_risk_assessment" class="link-card">
            <h3>작업장 위험성 평가</h3>
            <p>안전 위험 요소 점검</p>
          </a>
          <a href="/api/health" class="link-card">
            <h3>API 상태</h3>
            <p>시스템 헬스체크</p>
          </a>
        </div>
      </div>
    </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8'
    }
  });
});

// Export for Cloudflare Workers
export default {
  fetch: handleRequest
};