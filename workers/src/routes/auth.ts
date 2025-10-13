import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { Env } from '../index';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../utils/password';

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

// Register new user
// NOTE: Rate limiting middleware should be applied in index.ts
authRoutes.post('/register', async (c) => {
  try {
    const { username, password, email, full_name } = await c.req.json();

    // Validate required fields
    if (!username || !password) {
      return c.json({
        success: false,
        error: 'Username and password are required'
      }, 400);
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return c.json({
        success: false,
        error: 'Username must be 3-30 characters (alphanumeric, underscore, hyphen only)'
      }, 400);
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return c.json({
        success: false,
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      }, 400);
    }

    // Validate email format (if provided)
    if (email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        return c.json({
          success: false,
          error: 'Invalid email format'
        }, 400);
      }
    }

    // Check if username already exists
    const existingUser = await c.env.PRIMARY_DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(username).first();

    if (existingUser) {
      return c.json({
        success: false,
        error: 'Username already exists'
      }, 409);
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await c.env.PRIMARY_DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(email).first();

      if (existingEmail) {
        return c.json({
          success: false,
          error: 'Email already registered'
        }, 409);
      }
    }

    // Hash password using PBKDF2
    const passwordHash = await hashPassword(password);

    // Insert new user
    const result = await c.env.PRIMARY_DB.prepare(
      `INSERT INTO users (username, password_hash, email, full_name, is_admin, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 1, datetime('now'), datetime('now'))`
    ).bind(username, passwordHash, email || null, full_name || null).run();

    if (!result.success) {
      throw new Error('Failed to create user');
    }

    // Get the newly created user
    const newUser = await c.env.PRIMARY_DB.prepare(
      'SELECT id, username, email, full_name, is_admin FROM users WHERE username = ?'
    ).bind(username).first();

    if (!newUser) {
      throw new Error('Failed to retrieve new user');
    }

    // Generate JWT token (auto-login after registration)
    const payload = {
      sub: newUser.id,
      username: newUser.username,
      is_admin: false,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
    };

    const token = await sign(payload, c.env.JWT_SECRET);

    // Log successful registration
    console.info(`New user registered: ${username}`);

    return c.json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        full_name: newUser.full_name,
        is_admin: false,
      },
      redirect: '/',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({
      success: false,
      error: 'Registration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Refresh token
// NOTE: Rate limiting middleware should be applied in index.ts
authRoutes.post('/refresh', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'No token provided'
      }, 401);
    }

    const oldToken = authHeader.substring(7);
    
    // Verify the old token (even if expired, we still want to check signature)
    let payload;
    try {
      payload = await verify(oldToken, c.env.JWT_SECRET);
    } catch (error) {
      // Check if token is expired or invalid
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Allow refresh for expired tokens (within grace period)
      if (errorMessage.includes('exp') || errorMessage.includes('expired')) {
        // Decode without verification to get payload (for expired tokens)
        const parts = oldToken.split('.');
        if (parts.length !== 3) {
          return c.json({
            success: false,
            error: 'Invalid token format'
          }, 401);
        }
        
        try {
          const payloadBase64 = parts[1];
          const payloadJson = atob(payloadBase64);
          payload = JSON.parse(payloadJson);
          
          // Check if token is too old (more than 7 days expired)
          const now = Math.floor(Date.now() / 1000);
          const gracePeriod = 7 * 24 * 60 * 60; // 7 days
          
          if (payload.exp && (now - payload.exp) > gracePeriod) {
            return c.json({
              success: false,
              error: 'Token expired beyond grace period. Please login again.'
            }, 401);
          }
        } catch {
          return c.json({
            success: false,
            error: 'Invalid token'
          }, 401);
        }
      } else {
        return c.json({
          success: false,
          error: 'Invalid token'
        }, 401);
      }
    }

    // Check if user still exists and is active (for database users)
    if (payload.sub !== 'admin') {
      const user = await c.env.PRIMARY_DB.prepare(
        'SELECT id, username, is_admin, is_active FROM users WHERE id = ?'
      ).bind(payload.sub).first();

      if (!user || !user.is_active) {
        return c.json({
          success: false,
          error: 'User not found or inactive'
        }, 401);
      }

      // Issue new token with extended expiry
      const newPayload = {
        sub: user.id,
        username: user.username,
        is_admin: user.is_admin === 1,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
      };

      const newToken = await sign(newPayload, c.env.JWT_SECRET);

      console.info(`Token refreshed for user: ${user.username}`);

      return c.json({
        success: true,
        token: newToken,
        user: {
          id: user.id,
          username: user.username,
          is_admin: user.is_admin === 1,
        },
      });
    }

    // Handle admin token refresh
    if (payload.sub === 'admin') {
      const newPayload = {
        sub: 'admin',
        username: c.env.ADMIN_USERNAME,
        is_admin: true,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
      };

      const newToken = await sign(newPayload, c.env.JWT_SECRET);

      console.info('Admin token refreshed');

      return c.json({
        success: true,
        token: newToken,
        user: {
          username: c.env.ADMIN_USERNAME,
          is_admin: true,
        },
      });
    }

    return c.json({
      success: false,
      error: 'Invalid token payload'
    }, 401);

  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json({
      success: false,
      error: 'Token refresh failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
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
    // Verify the token
    await verify(token, c.env.JWT_SECRET);
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