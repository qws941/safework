// Survey routes and form handling
import { surveyForms } from '../templates/surveyForms';

export const surveyRoutes = {
  // List all surveys
  list: async (request, env) => {
    try {
      const { keys } = await env.SURVEYS.list();
      const surveys = [];

      for (const key of keys) {
        const data = await env.SURVEYS.get(key.name, { type: 'json' });
        if (data) {
          surveys.push(data);
        }
      }

      return new Response(JSON.stringify({
        status: 'success',
        count: surveys.length,
        data: surveys
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Get single survey
  get: async (request, { params }, env) => {
    try {
      const survey = await env.SURVEYS.get(`survey_${params.id}`, { type: 'json' });

      if (!survey) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Survey not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        status: 'success',
        data: survey
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Create new survey
  create: async (request, env) => {
    try {
      const data = await request.json();
      const id = `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Update survey
  update: async (request, { params }, env) => {
    try {
      const key = `survey_${params.id}`;
      const existing = await env.SURVEYS.get(key, { type: 'json' });

      if (!existing) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Survey not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const updates = await request.json();
      const updated = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString()
      };

      await env.SURVEYS.put(key, JSON.stringify(updated));

      return new Response(JSON.stringify({
        status: 'success',
        message: 'Survey updated successfully',
        data: updated
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Delete survey
  delete: async (request, { params }, env) => {
    try {
      const key = `survey_${params.id}`;
      await env.SURVEYS.delete(key);

      return new Response(JSON.stringify({
        status: 'success',
        message: 'Survey deleted successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Render survey form
  renderForm: async (request, { params }, env) => {
    const formType = params.form_type;
    const formHtml = surveyForms[formType];

    if (!formHtml) {
      return new Response('Survey form not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return new Response(formHtml, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  },

  // Submit survey form
  submitForm: async (request, { params }, env) => {
    try {
      const formData = await request.formData();
      const data = {};

      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }

      const id = `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const survey = {
        id,
        form_type: params.form_type,
        responses: data,
        submitted_at: new Date().toISOString(),
        ip_address: request.headers.get('CF-Connecting-IP') || 'unknown',
        user_agent: request.headers.get('User-Agent') || 'unknown'
      };

      await env.SURVEYS.put(id, JSON.stringify(survey));

      return new Response(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <title>제출 완료</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .message {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 500px;
            }
            .success-icon {
              font-size: 60px;
              color: #4caf50;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              margin-bottom: 20px;
            }
            a {
              display: inline-block;
              padding: 10px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              transition: background 0.3s;
            }
            a:hover {
              background: #5a67d8;
            }
          </style>
        </head>
        <body>
          <div class="message">
            <div class="success-icon">✅</div>
            <h1>제출 완료</h1>
            <p>설문이 성공적으로 제출되었습니다.</p>
            <p>참여해 주셔서 감사합니다.</p>
            <a href="/">홈으로 돌아가기</a>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    } catch (error) {
      return new Response(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <title>제출 오류</title>
        </head>
        <body>
          <h1>제출 중 오류가 발생했습니다</h1>
          <p>${error.message}</p>
          <a href="javascript:history.back()">돌아가기</a>
        </body>
        </html>
      `, {
        status: 500,
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }
  }
};