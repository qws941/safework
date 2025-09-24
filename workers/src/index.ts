import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { logger } from 'hono/logger';
import { surveyRoutes } from './routes/survey';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { workerRoutes } from './routes/worker';

export interface Env {
  SAFEWORK_DB: D1Database;
  SAFEWORK_KV: KVNamespace;
  JWT_SECRET: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: ['https://safework2.jclee.me', 'http://localhost:3000'],
  credentials: true,
}));

// Public routes
app.route('/api/auth', authRoutes);
app.route('/api/health', healthRoutes);
app.route('/api/survey', surveyRoutes);

// Protected routes (require JWT)
app.use('/api/admin/*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
  });
  return jwtMiddleware(c, next);
});

app.route('/api/admin', adminRoutes);
app.route('/api/workers', workerRoutes);

// Root health check - Updated with MCP deployment
app.get('/', (c) => {
  return c.json({
    service: 'SafeWork2',
    status: 'healthy',
    platform: 'Cloudflare Workers',
    version: '1.0.1',
    deployment: 'MCP-optimized',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err}`);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;