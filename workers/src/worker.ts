/**
 * SafeWork Cloudflare Workers Edge Proxy
 * High-performance edge computing layer for SafeWork application
 */

import { Hono } from 'hono';
import { cache } from 'hono/cache';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';

// Type definitions
interface Env {
  SAFEWORK_CACHE: KVNamespace;
  BACKEND_URL: string;
  ENVIRONMENT: string;
  DEBUG: boolean;
}

interface CacheConfig {
  maxAge: number;
  key: string;
}

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['https://safework2.jclee.me', 'https://safework.jclee.me'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Rate limiting store
const rateLimitStore = new Map<string, number[]>();

// Utility functions
function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For')?.split(',')[0] || 
         'unknown';
}

function isRateLimited(clientIP: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(clientIP) || [];
  
  // Clean old timestamps
  const recentTimestamps = timestamps.filter(timestamp => 
    now - timestamp < windowMs
  );
  
  if (recentTimestamps.length >= limit) {
    return true;
  }
  
  recentTimestamps.push(now);
  rateLimitStore.set(clientIP, recentTimestamps);
  return false;
}

async function getCachedResponse(
  env: Env, 
  key: string
): Promise<Response | null> {
  try {
    const cached = await env.SAFEWORK_CACHE.get(key);
    if (cached) {
      const data = JSON.parse(cached);
      return new Response(data.body, {
        headers: data.headers,
        status: data.status
      });
    }
  } catch (error) {
    console.error('Cache retrieval error:', error);
  }
  return null;
}

async function setCachedResponse(
  env: Env,
  key: string,
  response: Response,
  maxAge: number
): Promise<void> {
  try {
    const responseClone = response.clone();
    const body = await responseClone.text();
    const headers: Record<string, string> = {};
    
    responseClone.headers.forEach((value, name) => {
      headers[name] = value;
    });
    
    const cacheData = {
      body,
      headers,
      status: responseClone.status
    };
    
    await env.SAFEWORK_CACHE.put(
      key,
      JSON.stringify(cacheData),
      { expirationTtl: maxAge }
    );
  } catch (error) {
    console.error('Cache storage error:', error);
  }
}

function shouldCache(pathname: string, method: string): CacheConfig | null {
  if (method !== 'GET') return null;
  
  // Static assets - long cache
  if (pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?|ttf)$/)) {
    return { maxAge: 86400, key: `static:${pathname}` }; // 24 hours
  }
  
  // Health endpoint - short cache
  if (pathname === '/health') {
    return { maxAge: 300, key: 'health' }; // 5 minutes
  }
  
  // Survey forms - medium cache
  if (pathname.startsWith('/survey/')) {
    return { maxAge: 1800, key: `survey:${pathname}` }; // 30 minutes
  }
  
  // Admin pages - no cache
  if (pathname.startsWith('/admin')) {
    return null;
  }
  
  // Default cache for other GET requests
  return { maxAge: 600, key: `page:${pathname}` }; // 10 minutes
}

async function proxyRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const backendUrl = new URL(env.BACKEND_URL);
  
  // Construct backend URL
  const proxyUrl = new URL(url.pathname + url.search, backendUrl);
  
  // Clone headers and remove some that shouldn't be forwarded
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cf-ray');
  headers.delete('cf-ipcountry');
  headers.set('x-forwarded-for', getClientIP(request));
  headers.set('x-forwarded-proto', 'https');
  headers.set('x-forwarded-host', url.hostname);
  
  const proxyRequest = new Request(proxyUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' ? null : request.body
  });
  
  try {
    const response = await fetch(proxyRequest);
    
    // Clone response and add edge headers
    const edgeResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
    edgeResponse.headers.set('x-served-by', 'cloudflare-workers');
    edgeResponse.headers.set('x-cache-status', 'MISS');
    
    return edgeResponse;
    
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response('Backend service unavailable', {
      status: 502,
      headers: {
        'content-type': 'application/json',
        'x-served-by': 'cloudflare-workers'
      }
    });
  }
}

// Health check endpoint
app.get('/health', async (c) => {
  const env = c.env;
  
  try {
    // Check backend health
    const backendHealth = await fetch(`${env.BACKEND_URL}/health`);
    const healthData = await backendHealth.json();
    
    const edgeHealthData = {
      status: 'healthy',
      edge: {
        region: c.req.header('cf-ray')?.split('-')[1] || 'unknown',
        colo: c.req.header('cf-ipcountry') || 'unknown',
        timestamp: new Date().toISOString()
      },
      backend: healthData,
      cache: {
        available: !!env.SAFEWORK_CACHE,
        environment: env.ENVIRONMENT
      }
    };
    
    return c.json(edgeHealthData);
    
  } catch (error) {
    return c.json({
      status: 'degraded',
      error: 'Backend health check failed',
      edge: {
        region: c.req.header('cf-ray')?.split('-')[1] || 'unknown',
        timestamp: new Date().toISOString()
      }
    }, 503);
  }
});

// Static asset optimization
app.get('/static/*', async (c) => {
  const response = await proxyRequest(c.req.raw, c.env);
  
  // Optimize static assets
  if (response.ok) {
    const contentType = response.headers.get('content-type') || '';
    
    // Add optimal caching headers
    response.headers.set('cache-control', 'public, max-age=86400, immutable');
    response.headers.set('x-served-by', 'cloudflare-workers');
    
    // Enable compression for text-based assets
    if (contentType.includes('text/') || 
        contentType.includes('application/javascript') ||
        contentType.includes('application/json')) {
      response.headers.set('content-encoding', 'br, gzip');
    }
  }
  
  return response;
});

// Main proxy handler with caching
app.all('*', async (c) => {
  const request = c.req.raw;
  const env = c.env;
  const clientIP = getClientIP(request);
  const url = new URL(request.url);
  
  // Rate limiting
  if (isRateLimited(clientIP)) {
    return c.json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP'
    }, 429);
  }
  
  // Check cache for GET requests
  const cacheConfig = shouldCache(url.pathname, request.method);
  
  if (cacheConfig) {
    const cachedResponse = await getCachedResponse(env, cacheConfig.key);
    if (cachedResponse) {
      cachedResponse.headers.set('x-cache-status', 'HIT');
      cachedResponse.headers.set('x-served-by', 'cloudflare-workers');
      return cachedResponse;
    }
  }
  
  // Proxy to backend
  const response = await proxyRequest(request, env);
  
  // Cache successful responses
  if (cacheConfig && response.ok) {
    await setCachedResponse(env, cacheConfig.key, response, cacheConfig.maxAge);
  }
  
  return response;
});

// Export worker
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return app.fetch(request, env, ctx);
  }
};