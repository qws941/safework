import { Hono } from 'hono';
import { Env } from '../index';

export const workerRoutes = new Hono<{ Bindings: Env }>();

// Get all workers
workerRoutes.get('/', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  const department_id = c.req.query('department_id');
  
  try {
    let query = `
      SELECT 
        w.*,
        d.name as department_name
      FROM workers w
      LEFT JOIN departments d ON w.department_id = d.id
      WHERE w.is_active = 1
    `;
    
    const bindings = [];
    if (department_id) {
      query += ' AND w.department_id = ?';
      bindings.push(department_id);
    }
    
    query += ' ORDER BY w.name ASC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);
    
    const result = await c.env.SAFEWORK_DB.prepare(query).bind(...bindings).all();
    
    return c.json({
      workers: result.results,
      total: result.results.length,
      limit,
      offset,
    });
  } catch {
    return c.json({ error: 'Failed to fetch workers' }, 500);
  }
});

// Get worker by ID
workerRoutes.get('/:id', async (c) => {
  const workerId = c.req.param('id');
  
  try {
    const worker = await c.env.SAFEWORK_DB.prepare(`
      SELECT 
        w.*,
        d.name as department_name
      FROM workers w
      LEFT JOIN departments d ON w.department_id = d.id
      WHERE w.id = ?
    `).bind(workerId).first();
    
    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404);
    }
    
    return c.json(worker);
  } catch {
    return c.json({ error: 'Failed to fetch worker' }, 500);
  }
});

// Create new worker
workerRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const {
    employee_number,
    name,
    department_id,
    position,
    hire_date,
    birth_date,
    gender,
    phone,
    email,
  } = body;
  
  try {
    // Check if employee number already exists
    const existing = await c.env.SAFEWORK_DB.prepare(
      'SELECT id FROM workers WHERE employee_number = ?'
    ).bind(employee_number).first();
    
    if (existing) {
      return c.json({ error: '이미 존재하는 사원번호입니다' }, 400);
    }
    
    const result = await c.env.SAFEWORK_DB.prepare(`
      INSERT INTO workers (
        employee_number, name, department_id, position,
        hire_date, birth_date, gender, phone, email, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      employee_number, name, department_id, position,
      hire_date, birth_date, gender, phone, email
    ).run();
    
    return c.json({
      success: true,
      worker_id: result.meta.last_row_id,
      message: '근로자가 등록되었습니다',
    });
  } catch (error) {
    console.error('Failed to create worker:', error);
    return c.json({ error: 'Failed to create worker' }, 500);
  }
});

// Update worker
workerRoutes.put('/:id', async (c) => {
  const workerId = c.req.param('id');
  const body = await c.req.json();
  
  try {
    const fields = [];
    const values = [];
    
    // Dynamically build update query
    const allowedFields = [
      'name', 'department_id', 'position', 'hire_date',
      'birth_date', 'gender', 'phone', 'email', 'is_active'
    ];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(body[field]);
      }
    }
    
    if (fields.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }
    
    values.push(workerId);
    
    await c.env.SAFEWORK_DB.prepare(`
      UPDATE workers 
      SET ${fields.join(', ')}, updated_at = datetime('now')
      WHERE id = ?
    `).bind(...values).run();
    
    return c.json({
      success: true,
      message: '근로자 정보가 수정되었습니다',
    });
  } catch {
    return c.json({ error: 'Failed to update worker' }, 500);
  }
});

// Delete worker (soft delete)
workerRoutes.delete('/:id', async (c) => {
  const workerId = c.req.param('id');
  
  try {
    await c.env.SAFEWORK_DB.prepare(`
      UPDATE workers 
      SET is_active = 0, updated_at = datetime('now')
      WHERE id = ?
    `).bind(workerId).run();
    
    return c.json({
      success: true,
      message: '근로자가 비활성화되었습니다',
    });
  } catch {
    return c.json({ error: 'Failed to delete worker' }, 500);
  }
});

// Get worker health history
workerRoutes.get('/:id/health-history', async (c) => {
  const workerId = c.req.param('id');
  
  try {
    const results = await c.env.SAFEWORK_DB.prepare(`
      SELECT * FROM health_check_results
      WHERE worker_id = ?
      ORDER BY check_date DESC
      LIMIT 10
    `).bind(workerId).all();
    
    const visits = await c.env.SAFEWORK_DB.prepare(`
      SELECT * FROM medical_visits
      WHERE worker_id = ?
      ORDER BY visit_date DESC
      LIMIT 10
    `).bind(workerId).all();
    
    return c.json({
      worker_id: workerId,
      health_checks: results.results,
      medical_visits: visits.results,
    });
  } catch {
    return c.json({ error: 'Failed to fetch health history' }, 500);
  }
});