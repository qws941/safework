import { Hono } from 'hono';
import { Env } from '../index';

export const healthRoutes = new Hono<{ Bindings: Env }>();

// Main health check
healthRoutes.get('/', async (c) => {
  const checks = {
    service: 'healthy',
    database: 'unknown',
    cache: 'unknown',
  };
  
  try {
    // Check D1 database
    const dbCheck = await c.env.SAFEWORK_DB.prepare('SELECT 1 as ok').first();
    checks.database = dbCheck?.ok === 1 ? 'healthy' : 'unhealthy';
  } catch (error) {
    checks.database = 'unhealthy';
  }
  
  try {
    // Check KV namespace
    await c.env.SAFEWORK_KV.put('health_check', new Date().toISOString(), {
      expirationTtl: 60,
    });
    checks.cache = 'healthy';
  } catch (error) {
    checks.cache = 'unhealthy';
  }
  
  const allHealthy = Object.values(checks).every(status => status === 'healthy');
  
  return c.json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
    platform: 'Cloudflare Workers',
    region: c.req.header('CF-Ray')?.split('-')[1] || 'unknown',
  }, allHealthy ? 200 : 503);
});

// Health check plans management
healthRoutes.get('/plans', async (c) => {
  try {
    const year = c.req.query('year') || new Date().getFullYear();
    
    const plans = await c.env.SAFEWORK_DB.prepare(`
      SELECT * FROM health_check_plans 
      WHERE year = ? 
      ORDER BY created_at DESC
    `).bind(year).all();
    
    return c.json({
      year,
      plans: plans.results,
      total: plans.results.length,
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch health check plans' }, 500);
  }
});

// Create health check plan
healthRoutes.post('/plans', async (c) => {
  const body = await c.req.json();
  const { year, plan_type, description, target_count } = body;
  
  try {
    const result = await c.env.SAFEWORK_DB.prepare(`
      INSERT INTO health_check_plans (year, plan_type, description, target_count, status)
      VALUES (?, ?, ?, ?, 'planned')
    `).bind(year, plan_type, description, target_count).run();
    
    return c.json({
      success: true,
      plan_id: result.meta.last_row_id,
      message: '건강검진 계획이 생성되었습니다',
    });
  } catch (error) {
    return c.json({ error: 'Failed to create health check plan' }, 500);
  }
});

// Get health check targets for a worker
healthRoutes.get('/targets/:workerId', async (c) => {
  const workerId = c.req.param('workerId');
  
  try {
    const targets = await c.env.SAFEWORK_DB.prepare(`
      SELECT 
        hct.*,
        hcp.year,
        hcp.plan_type,
        hcp.description as plan_description
      FROM health_check_targets hct
      JOIN health_check_plans hcp ON hct.plan_id = hcp.id
      WHERE hct.worker_id = ?
      ORDER BY hct.check_date DESC
    `).bind(workerId).all();
    
    return c.json({
      worker_id: workerId,
      targets: targets.results,
      total: targets.results.length,
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch health check targets' }, 500);
  }
});

// Submit health check result
healthRoutes.post('/results', async (c) => {
  const body = await c.req.json();
  const {
    target_id,
    worker_id,
    check_date,
    height,
    weight,
    blood_pressure_sys,
    blood_pressure_dia,
    vision_left,
    vision_right,
    blood_sugar,
    cholesterol_total,
    result_summary,
    recommendations,
  } = body;
  
  try {
    const result = await c.env.SAFEWORK_DB.prepare(`
      INSERT INTO health_check_results (
        target_id, worker_id, check_date,
        height, weight, blood_pressure_sys, blood_pressure_dia,
        vision_left, vision_right, blood_sugar, cholesterol_total,
        result_summary, recommendations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      target_id, worker_id, check_date,
      height, weight, blood_pressure_sys, blood_pressure_dia,
      vision_left, vision_right, blood_sugar, cholesterol_total,
      result_summary, recommendations
    ).run();
    
    // Update target status
    await c.env.SAFEWORK_DB.prepare(`
      UPDATE health_check_targets 
      SET status = 'completed' 
      WHERE id = ?
    `).bind(target_id).run();
    
    return c.json({
      success: true,
      result_id: result.meta.last_row_id,
      message: '건강검진 결과가 등록되었습니다',
    });
  } catch (error) {
    console.error('Failed to submit health check result:', error);
    return c.json({ error: 'Failed to submit health check result' }, 500);
  }
});