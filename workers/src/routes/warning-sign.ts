/**
 * Warning Sign Routes for Cloudflare Workers
 * Standalone - NO BACKEND REQUIRED
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../index';
import { GHS_PICTOGRAMS, HAZARD_STATEMENTS, PRECAUTIONARY_STATEMENTS } from '../data/ghs-reference';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use('/*', cors());

/**
 * GET /api/warning-sign/health
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'warning-sign-standalone',
    backend_required: false,
    timestamp: new Date().toISOString(),
    location: c.req.raw.cf?.colo || 'unknown'
  });
});

/**
 * GET /api/warning-sign/pictograms
 * Get all GHS pictograms (from embedded data)
 */
app.get('/pictograms', (c) => {
  return c.json({
    success: true,
    data: GHS_PICTOGRAMS,
    source: 'workers-embedded',
    count: GHS_PICTOGRAMS.length
  });
});

/**
 * GET /api/warning-sign/hazard-statements
 * Get hazard statements with optional filtering
 */
app.get('/hazard-statements', (c) => {
  const hazardClass = c.req.query('hazard_class');
  const category = c.req.query('category');

  let statements = HAZARD_STATEMENTS;

  if (hazardClass) {
    statements = statements.filter(s => s.hazard_class === hazardClass);
  }

  if (category) {
    statements = statements.filter(s => s.category === category);
  }

  return c.json({
    success: true,
    data: statements,
    source: 'workers-embedded',
    count: statements.length
  });
});

/**
 * GET /api/warning-sign/precautionary-statements
 * Get precautionary statements with optional filtering
 */
app.get('/precautionary-statements', (c) => {
  const category = c.req.query('category');

  let statements = PRECAUTIONARY_STATEMENTS;

  if (category) {
    statements = statements.filter(s => s.category === category);
  }

  return c.json({
    success: true,
    data: statements,
    source: 'workers-embedded',
    count: statements.length
  });
});

/**
 * GET /api/warning-sign/templates
 * Get pre-configured templates
 */
app.get('/templates', (c) => {
  const category = c.req.query('category');

  // Sample templates (can be extended)
  const templates = [
    {
      id: 1,
      name_ko: '인화성 액체 기본',
      name_en: 'Flammable Liquid Basic',
      category: 'flammable',
      pictograms: ['GHS02'],
      signal_word: 'Danger',
      hazard_statements: ['H225', 'H319'],
      precautionary_statements: ['P210', 'P233', 'P280', 'P305+P351+P338'],
      is_active: true
    },
    {
      id: 2,
      name_ko: '급성 독성물질',
      name_en: 'Acute Toxic',
      category: 'toxic',
      pictograms: ['GHS06'],
      signal_word: 'Danger',
      hazard_statements: ['H300', 'H310', 'H330'],
      precautionary_statements: ['P260', 'P280', 'P284', 'P310'],
      is_active: true
    },
    {
      id: 3,
      name_ko: '부식성 물질',
      name_en: 'Corrosive Material',
      category: 'corrosive',
      pictograms: ['GHS05'],
      signal_word: 'Danger',
      hazard_statements: ['H314'],
      precautionary_statements: ['P260', 'P280', 'P303+P361+P353', 'P305+P351+P338', 'P310'],
      is_active: true
    }
  ];

  let filtered = templates;
  if (category) {
    filtered = templates.filter(t => t.category === category);
  }

  return c.json({
    success: true,
    data: filtered,
    source: 'workers-embedded',
    count: filtered.length
  });
});

/**
 * POST /api/warning-sign/signs
 * Create/save a warning sign (store in KV)
 */
app.post('/signs', async (c) => {
  try {
    const env = c.env;
    const data = await c.req.json();

    // Generate ID
    const signId = `sign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const sign = {
      id: signId,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store in KV
    await env.SAFEWORK_KV?.put(`warning_sign:${signId}`, JSON.stringify(sign), {
      expirationTtl: 86400 * 30 // 30 days
    });

    return c.json({
      success: true,
      data: sign,
      message: '경고 표지가 성공적으로 생성되었습니다.'
    }, 201);

  } catch (error) {
    console.error('Error creating sign:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/warning-sign/signs/:id
 * Get a specific warning sign
 */
app.get('/signs/:id', async (c) => {
  try {
    const env = c.env;
    const signId = c.req.param('id');

    const signData = await env.SAFEWORK_KV?.get(`warning_sign:${signId}`);

    if (!signData) {
      return c.json({
        success: false,
        error: 'Sign not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: JSON.parse(signData)
    });

  } catch (error) {
    console.error('Error fetching sign:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/warning-sign/signs
 * Get all warning signs (from KV)
 */
app.get('/signs', async (c) => {
  try {
    const env = c.env;

    // List all keys with prefix
    const list = await env.SAFEWORK_KV?.list({ prefix: 'warning_sign:' });

    const signs = [];
    if (list && list.keys) {
      for (const key of list.keys.slice(0, 20)) { // Limit to 20
        const data = await env.SAFEWORK_KV?.get(key.name);
        if (data) {
          signs.push(JSON.parse(data));
        }
      }
    }

    return c.json({
      success: true,
      data: signs,
      count: signs.length,
      source: 'workers-kv'
    });

  } catch (error) {
    console.error('Error fetching signs:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * DELETE /api/warning-sign/signs/:id
 * Delete a warning sign
 */
app.delete('/signs/:id', async (c) => {
  try {
    const env = c.env;
    const signId = c.req.param('id');

    await env.SAFEWORK_KV?.delete(`warning_sign:${signId}`);

    return c.json({
      success: true,
      message: '경고 표지가 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Error deleting sign:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;
