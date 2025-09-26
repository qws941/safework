// Health check routes
export const healthRoutes = {
  health: async (request, env) => {
    const checks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT || 'development',
      version: env.API_VERSION || 'v1',
      components: {
        workers: 'operational',
        kv: 'operational',
        api: 'operational'
      }
    };

    // Test KV namespace if available
    try {
      if (env.SURVEYS) {
        await env.SURVEYS.put('health_check', Date.now().toString(), {
          expirationTtl: 60
        });
        checks.components.kv = 'operational';
      }
    } catch (error) {
      checks.components.kv = 'degraded';
      checks.status = 'degraded';
    }

    return new Response(JSON.stringify(checks, null, 2), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};