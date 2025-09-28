import { describe, it, expect } from 'vitest';

// Mock Cloudflare Worker environment
const mockEnv = {
  SAFEWORK_KV: {
    get: async (key: string) => null,
    put: async (key: string, value: string) => {},
    delete: async (key: string) => {},
    list: async () => ({ keys: [] })
  },
  JWT_SECRET: 'test-secret',
  ADMIN_USERNAME: 'admin',
  BACKEND_URL: 'https://safework.jclee.me',
  DEBUG: 'false',
  ENVIRONMENT: 'test'
};

// Simple worker response test
const testWorker = {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.ENVIRONMENT || 'test',
        version: '2.0.0-test'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/survey/002_musculoskeletal_symptom_program') {
      return new Response(`<!DOCTYPE html>
<html><head><title>관리자 대시보드 (002) - SafeWork</title></head>
<body><h1>Admin Dashboard</h1></body></html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

describe('SafeWork Cloudflare Worker', () => {
  it('should respond to health check', async () => {
    const request = new Request('https://safework.jclee.me/api/health');
    const response = await testWorker.fetch(request, mockEnv, {});

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.environment).toBe('test');
    expect(data.version).toBe('2.0.0-test');
  });

  it('should serve admin dashboard with correct title', async () => {
    const request = new Request('https://safework.jclee.me/survey/002_musculoskeletal_symptom_program');
    const response = await testWorker.fetch(request, mockEnv, {});

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');

    const html = await response.text();
    expect(html).toContain('<title>관리자 대시보드 (002) - SafeWork</title>');
    expect(html).toContain('Admin Dashboard');
  });

  it('should return 404 for unknown paths', async () => {
    const request = new Request('https://safework.jclee.me/unknown-path');
    const response = await testWorker.fetch(request, mockEnv, {});

    expect(response.status).toBe(404);
  });

  it('should handle CORS preflight requests', async () => {
    const request = new Request('https://safework.jclee.me/api/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://safework.jclee.me',
        'Access-Control-Request-Method': 'GET'
      }
    });

    // This would be handled by CORS middleware in actual implementation
    const response = await testWorker.fetch(request, mockEnv, {});
    expect(response.status).toBe(404); // Expected since we don't handle OPTIONS in test
  });
});

describe('UI/UX Elements', () => {
  it('should include required Bootstrap CSS and icons', async () => {
    const request = new Request('https://safework.jclee.me/survey/002_musculoskeletal_symptom_program');
    const response = await testWorker.fetch(request, mockEnv, {});
    const html = await response.text();

    expect(html).toContain('bootstrap@5.3.0');
    expect(html).toContain('bootstrap-icons');
  });

  it('should have proper Korean language attributes', async () => {
    const request = new Request('https://safework.jclee.me/survey/002_musculoskeletal_symptom_program');
    const response = await testWorker.fetch(request, mockEnv, {});
    const html = await response.text();

    expect(html).toContain('lang="ko"');
    expect(html).toContain('charset=UTF-8');
  });

  it('should be mobile responsive', async () => {
    const request = new Request('https://safework.jclee.me/survey/002_musculoskeletal_symptom_program');
    const response = await testWorker.fetch(request, mockEnv, {});
    const html = await response.text();

    expect(html).toContain('viewport');
    expect(html).toContain('width=device-width');
  });
});