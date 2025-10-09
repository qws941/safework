import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { Env } from '../index';
import { verifyPassword } from '../utils/password';

export const authRoutes = new Hono<{ Bindings: Env }>();

// Login endpoint with rate limiting protection
// NOTE: Rate limiting middleware should be applied in index.ts
authRoutes.post('/login', async (c) => {
  const { username, password } = await c.req.json();

  try {
    // Validate input
    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return c.json({ error: 'Invalid credentials format' }, 400);
    }

    // Check environment admin credentials (stored in Cloudflare Secrets)
    // SECURITY: ADMIN_PASSWORD_HASH should be a PBKDF2 hash stored in Cloudflare Secrets
    if (username === c.env.ADMIN_USERNAME && c.env.ADMIN_PASSWORD_HASH) {
      const isValid = await verifyPassword(password, c.env.ADMIN_PASSWORD_HASH);

      if (isValid) {
        const payload = {
          sub: 'admin',
          username: c.env.ADMIN_USERNAME,
          is_admin: true,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
        };

        const token = await sign(payload, c.env.JWT_SECRET);

        // Log successful admin login
        console.info(`Admin login successful: ${c.env.ADMIN_USERNAME}`);

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
    }

    // Check database users
    const user = await c.env.SAFEWORK_DB.prepare(
      'SELECT id, username, password_hash, is_admin, is_active FROM users WHERE username = ?'
    ).bind(username).first();

    if (!user || !user.is_active) {
      // Log failed login attempt (for security monitoring)
      console.warn(`Failed login attempt for username: ${username}`);
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password using PBKDF2 (with backward compatibility for SHA-256)
    const isValid = await verifyPassword(password, user.password_hash as string);

    if (!isValid) {
      console.warn(`Failed login attempt for user: ${username} (incorrect password)`);
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
  // NOTE: Consider implementing token blacklist in KV store for enhanced security
  return c.json({ success: true, message: 'Logged out successfully' });
});