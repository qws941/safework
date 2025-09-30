import { Hono } from 'hono';
import { Env } from '../index';

export const surveyRoutes = new Hono<{ Bindings: Env }>();

// Get all survey forms metadata
surveyRoutes.get('/forms', async (c) => {
  const forms = [
    {
      id: '001_musculoskeletal_symptom_survey',
      name: '근골격계 증상조사표',
      description: '근골격계 질환 예방을 위한 증상 설문조사',
      fields: 40,
    },
    {
      id: '002_musculoskeletal_symptom_program',
      name: '근골격계부담작업 유해요인조사',
      description: '근골격계 부담작업 유해요인 조사 및 평가',
      fields: 25,
    },
    {
      id: '003_cardiovascular_risk_assessment',
      name: '심뇌혈관질환 위험도평가',
      description: '심뇌혈관질환 발병 위험도 평가 설문',
      fields: 27,
    },
    {
      id: '004_industrial_accident_survey',
      name: '산업재해 실태조사표',
      description: '산업재해 발생 현황 및 예방을 위한 실태조사',
      fields: 33,
    },
    {
      id: '005_basic_hazard_factor_survey',
      name: '유해요인 기본조사표',
      description: '작업환경 유해요인 기본조사 및 위험성 평가',
      fields: 35,
    },
    {
      id: '006_elderly_worker_approval_form',
      name: '고령근로자 작업투입 승인요청서',
      description: '고령근로자의 안전한 작업투입을 위한 승인 요청 및 관리',
      fields: 26,
    },
  ];

  return c.json({ forms });
});

// Get specific survey form
surveyRoutes.get('/form/:formId', async (c) => {
  const formId = c.req.param('formId');
  
  try {
    // In real implementation, fetch form structure from D1 or KV
    const formStructure = await c.env.SAFEWORK_KV.get(`form_${formId}`, 'json');
    
    if (!formStructure) {
      return c.json({ error: 'Form not found' }, 404);
    }
    
    return c.json(formStructure);
  } catch (error) {
    return c.json({ error: 'Failed to fetch form' }, 500);
  }
});

// Render survey form HTML
surveyRoutes.get('/:formId', async (c) => {
  const formId = c.req.param('formId');

  // Define form templates mapping
  const formTemplates = {
    '001_musculoskeletal_symptom_survey': '001',
    '001_musculoskeletal_symptom_survey_intuitive': '001_intuitive',
    '002_musculoskeletal_symptom_program': '002',
    '002_musculoskeletal_symptom_program_intuitive': '002_intuitive',
    '003_cardiovascular_risk_assessment': '003',
    '004_industrial_accident_survey': '004',
    '005_basic_hazard_factor_survey': '005',
    '006_elderly_worker_approval_form': '006'
  };

  const templateKey = formTemplates[formId];
  if (!templateKey) {
    return c.text('Form not found', 404);
  }

  try {
    // First try to get from KV storage (for intuitive templates)
    let template = await c.env.SAFEWORK_KV.get(`template_${templateKey}`);

    if (!template && c.env.FORM_TEMPLATES) {
      // Fallback to FORM_TEMPLATES binding
      template = await c.env.FORM_TEMPLATES.get(`${templateKey}_form.html`);
    }

    if (!template) {
      // Fallback: Proxy to backend
      const backendUrl = c.env.BACKEND_URL || 'https://safework.jclee.me';
      const response = await fetch(`${backendUrl}/survey/${formId}`);
      if (response.ok) {
        template = await response.text();
      } else {
        return c.text('Template not found', 404);
      }
    }

    return c.html(template);
  } catch (error) {
    console.error('Template error:', error);
    return c.text('Failed to load form template', 500);
  }
});

// Submit survey response
surveyRoutes.post('/submit', async (c) => {
  const body = await c.req.json();
  const { form_type, response_data, worker_id, department_id, is_anonymous } = body;
  
  try {
    // Get client info
    const ip_address = c.req.header('CF-Connecting-IP') || 'unknown';
    const user_agent = c.req.header('User-Agent') || 'unknown';
    
    if (c.env.SAFEWORK_DB) {
      // Insert into D1 database
      const result = await c.env.SAFEWORK_DB.prepare(`
        INSERT INTO surveys (
          form_type, 
          user_id,
          worker_id, 
          department_id, 
          response_data, 
          is_anonymous, 
          ip_address, 
          user_agent,
          submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        form_type,
        is_anonymous ? 1 : null, // anonymous user_id = 1
        worker_id || null,
        department_id || null,
        JSON.stringify(response_data),
        is_anonymous ? 1 : 0,
        ip_address,
        user_agent
      ).run();
      
      return c.json({
        success: true,
        message: '설문이 성공적으로 제출되었습니다',
        survey_id: result.meta.last_row_id,
      });
    } else {
      // Fallback: Store in KV temporarily
      const surveyId = `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const surveyData = {
        form_type,
        response_data,
        worker_id,
        department_id,
        is_anonymous,
        ip_address,
        user_agent,
        submitted_at: new Date().toISOString()
      };
      
      await c.env.SAFEWORK_KV.put(surveyId, JSON.stringify(surveyData), {
        expirationTtl: 86400 * 30, // 30 days
      });
      
      return c.json({
        success: true,
        message: '설문이 성공적으로 제출되었습니다 (임시 저장)',
        survey_id: surveyId,
      });
    }
  } catch (error) {
    console.error('Survey submission error:', error);
    return c.json({ error: 'Failed to submit survey' }, 500);
  }
});

// Get survey responses (admin only - but public for anonymous viewing)
surveyRoutes.get('/responses/:formType', async (c) => {
  const formType = c.req.param('formType');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  
  try {
    if (c.env.SAFEWORK_DB) {
      const result = await c.env.SAFEWORK_DB.prepare(`
        SELECT 
          id, 
          form_type, 
          worker_id, 
          department_id, 
          is_anonymous,
          submitted_at,
          created_at
        FROM surveys 
        WHERE form_type = ?
        ORDER BY submitted_at DESC
        LIMIT ? OFFSET ?
      `).bind(formType, limit, offset).all();
      
      return c.json({
        responses: result.results,
        total: result.results.length,
        limit,
        offset,
      });
    } else {
      // Fallback: Return mock data or KV stored data
      return c.json({
        responses: [],
        total: 0,
        limit,
        offset,
        message: 'Database not configured - using fallback mode',
      });
    }
  } catch (error) {
    console.error('Failed to fetch responses:', error);
    return c.json({ error: 'Failed to fetch responses' }, 500);
  }
});

// Get survey statistics
surveyRoutes.get('/stats', async (c) => {
  try {
    const stats = await c.env.SAFEWORK_DB.prepare(`
      SELECT 
        form_type,
        COUNT(*) as count,
        COUNT(DISTINCT worker_id) as unique_workers,
        MAX(submitted_at) as last_submission
      FROM surveys
      GROUP BY form_type
    `).all();
    
    return c.json({
      statistics: stats.results,
      total_surveys: stats.results.reduce((sum: number, s: any) => sum + (Number(s.count) || 0), 0),
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch statistics' }, 500);
  }
});