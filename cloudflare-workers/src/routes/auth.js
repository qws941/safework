// Authentication routes
import { hashPassword, verifyPassword, generateToken } from '../utils/auth';

export const authRoutes = {
  // User login
  login: async (request, env) => {
    try {
      const { username, password } = await request.json();

      // Get user from KV
      const user = await env.USERS.get(`user_${username}`, { type: 'json' });

      if (!user || user.password !== password) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Invalid credentials'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Create session
      const sessionId = crypto.randomUUID();
      const session = {
        userId: user.id,
        username: user.username,
        createdAt: new Date().toISOString()
      };

      await env.SESSIONS.put(sessionId, JSON.stringify(session), {
        expirationTtl: 86400 // 24 hours
      });

      return new Response(JSON.stringify({
        status: 'success',
        message: 'Login successful',
        data: {
          sessionId,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
        }
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

  // User logout
  logout: async (request, env) => {
    try {
      const cookie = request.headers.get('Cookie');
      const sessionId = cookie?.match(/session_id=([^;]+)/)?.[1];

      if (sessionId) {
        await env.SESSIONS.delete(sessionId);
      }

      return new Response(JSON.stringify({
        status: 'success',
        message: 'Logout successful'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'session_id=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
        }
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

  // User registration
  register: async (request, env) => {
    try {
      const { username, password, email } = await request.json();

      // Check if user exists
      const existing = await env.USERS.get(`user_${username}`);
      if (existing) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Username already exists'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Create new user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = {
        id: userId,
        username,
        password, // In production, hash the password
        email,
        createdAt: new Date().toISOString()
      };

      await env.USERS.put(`user_${username}`, JSON.stringify(user));

      return new Response(JSON.stringify({
        status: 'success',
        message: 'Registration successful',
        data: {
          id: userId,
          username,
          email
        }
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

  // Verify session
  verify: async (request, env) => {
    try {
      const cookie = request.headers.get('Cookie');
      const sessionId = cookie?.match(/session_id=([^;]+)/)?.[1];

      if (!sessionId) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'No session found'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const session = await env.SESSIONS.get(sessionId, { type: 'json' });

      if (!session) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Invalid session'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        status: 'success',
        data: session
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
  }
};