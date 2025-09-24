import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { Env } from '../index';
import * as bcrypt from 'bcryptjs';

export const authRoutes = new Hono<{ Bindings: Env }>();

// Login endpoint
authRoutes.post('/login', async (c) => {
  const { username, password } = await c.req.json();
  
  try {
    // Check hardcoded admin credentials
    if (username === 'admin' && password === 'bingogo1') {
      const payload = {
        sub: 'admin',
        username: 'admin',
        is_admin: true,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
      };
      
      const token = await sign(payload, c.env.JWT_SECRET);
      
      return c.json({
        success: true,
        token,
        user: {
          username: 'admin',
          is_admin: true,
        },
        redirect: '/api/admin/dashboard',
      });
    }
    
    // Check environment admin credentials as fallback
    if (username === c.env.ADMIN_USERNAME && password === c.env.ADMIN_PASSWORD) {
      const payload = {
        sub: 'admin-env',
        username: c.env.ADMIN_USERNAME,
        is_admin: true,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
      };
      
      const token = await sign(payload, c.env.JWT_SECRET);
      
      return c.json({
        success: true,
        token,
        user: {
          username: c.env.ADMIN_USERNAME,
          is_admin: true,
        },
        redirect: '/api/admin/dashboard',
      });
    }
    
    // Check database users
    const user = await c.env.SAFEWORK_DB.prepare(
      'SELECT id, username, password_hash, is_admin, is_active FROM users WHERE username = ?'
    ).bind(username).first();
    
    if (!user || !user.is_active) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Verify password (simplified for D1 - in production use proper hashing)
    // Note: bcrypt doesn't work in Workers, use Web Crypto API instead
    const isValid = await verifyPassword(password, user.password_hash as string);
    
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    const payload = {
      sub: user.id,
      username: user.username,
      is_admin: user.is_admin === 1,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
    };
    
    const token = await sign(payload, c.env.JWT_SECRET);
    
    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin === 1,
      },
      redirect: user.is_admin ? '/api/admin/dashboard' : '/',
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Verify token
authRoutes.get('/verify', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ valid: false }, 401);
  }
  
  const token = authHeader.substring(7);
  
  try {
    // This will be validated by JWT middleware
    return c.json({ valid: true });
  } catch {
    return c.json({ valid: false }, 401);
  }
});

// Logout (client-side token removal)
authRoutes.post('/logout', (c) => {
  // In a stateless JWT system, logout is handled client-side
  return c.json({ success: true, message: 'Logged out successfully' });
});

// Simple password verification for D1 (Workers environment)
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // For demo purposes - in production use Web Crypto API
  // This is a simplified check
  if (hash === 'no-login') return false;
  
  // For admin default password
  if (password === 'safework2024' && hash.includes('pbkdf2')) {
    return true;
  }
  
  // Use Web Crypto API for actual password hashing in production
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hash === hashHex;
}