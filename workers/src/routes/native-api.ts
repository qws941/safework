/**
 * Cloudflare Native API Routes
 * R2 Storage, Queues, and AI integration endpoints
 */

import { Hono } from 'hono';
import { R2StorageService } from '../services/r2-storage';
import { AIValidatorService } from '../services/ai-validator';
import { QueueMessage } from '../services/queue-processor';

interface NativeEnv {
  PRIMARY_DB: D1Database;
  SAFEWORK_KV: KVNamespace;
  SAFEWORK_STORAGE: R2Bucket;
  SAFEWORK_QUEUE?: Queue<any>;  // Optional - Requires Paid Plan
  AI: Ai;
  [key: string]: any;
}

export const nativeApiRoutes = new Hono<{ Bindings: NativeEnv }>();

// ============================================
// R2 File Storage Routes
// ============================================

/**
 * Upload file to R2
 */
nativeApiRoutes.post('/files/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    const category = (formData.get('category') as string) || 'document';
    const formType = formData.get('formType') as string;

    if (!file || typeof file === 'string') {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    const fileObj = file as File;

    const storage = new R2StorageService(c.env.SAFEWORK_STORAGE);

    const key = `uploads/${category}/${Date.now()}_${fileObj.name}`;
    const result = await storage.uploadFile(key, await fileObj.arrayBuffer(), {
      filename: fileObj.name,
      contentType: fileObj.type,
      size: fileObj.size,
      uploadedAt: new Date().toISOString(),
      category: category as any,
      formType,
    });

    return c.json(result);
  } catch (error) {
    console.error('File upload error:', error);
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});

/**
 * Download file from R2
 */
nativeApiRoutes.get('/files/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key');
    const storage = new R2StorageService(c.env.SAFEWORK_STORAGE);

    const file = await storage.downloadFile(key);

    if (!file) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.customMetadata?.filename || 'download'}"`,
      },
    });
  } catch (error) {
    console.error('File download error:', error);
    return c.json({ success: false, error: 'Download failed' }, 500);
  }
});

/**
 * List files
 */
nativeApiRoutes.get('/files', async (c) => {
  try {
    const prefix = c.req.query('prefix') || '';
    const limit = parseInt(c.req.query('limit') || '100');

    const storage = new R2StorageService(c.env.SAFEWORK_STORAGE);
    const result = await storage.listFiles(prefix, limit);

    return c.json({
      success: true,
      files: result.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
      })),
      truncated: result.truncated,
    });
  } catch (error) {
    console.error('File list error:', error);
    return c.json({ success: false, error: 'Failed to list files' }, 500);
  }
});

/**
 * Delete file
 */
nativeApiRoutes.delete('/files/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key');
    const storage = new R2StorageService(c.env.SAFEWORK_STORAGE);

    const success = await storage.deleteFile(key);

    return c.json({ success, message: success ? 'File deleted' : 'Delete failed' });
  } catch (error) {
    console.error('File delete error:', error);
    return c.json({ success: false, error: 'Delete failed' }, 500);
  }
});

// ============================================
// Queue Job Routes
// ============================================

/**
 * Submit export job to queue
 */
nativeApiRoutes.post('/jobs/export', async (c) => {
  try {
    if (!c.env.SAFEWORK_QUEUE) {
      return c.json({
        success: false,
        error: 'Queues not available - requires Cloudflare Workers Paid plan'
      }, 503);
    }

    const body = await c.req.json();

    const message: QueueMessage = {
      type: 'export',
      payload: body,
      timestamp: new Date().toISOString(),
      priority: body.priority || 'normal',
    };

    await c.env.SAFEWORK_QUEUE.send(message);

    return c.json({
      success: true,
      message: 'Export job queued',
      jobId: `export_${Date.now()}`,
    });
  } catch (error) {
    console.error('Queue export error:', error);
    return c.json({ success: false, error: 'Failed to queue job' }, 500);
  }
});

/**
 * Submit report generation job to queue
 */
nativeApiRoutes.post('/jobs/report', async (c) => {
  try {
    if (!c.env.SAFEWORK_QUEUE) {
      return c.json({
        success: false,
        error: 'Queues not available - requires Cloudflare Workers Paid plan'
      }, 503);
    }

    const body = await c.req.json();

    const message: QueueMessage = {
      type: 'report',
      payload: body,
      timestamp: new Date().toISOString(),
      priority: body.priority || 'normal',
    };

    await c.env.SAFEWORK_QUEUE.send(message);

    return c.json({
      success: true,
      message: 'Report job queued',
      jobId: `report_${Date.now()}`,
    });
  } catch (error) {
    console.error('Queue report error:', error);
    return c.json({ success: false, error: 'Failed to queue job' }, 500);
  }
});

/**
 * Submit analysis job to queue
 */
nativeApiRoutes.post('/jobs/analysis', async (c) => {
  try {
    if (!c.env.SAFEWORK_QUEUE) {
      return c.json({
        success: false,
        error: 'Queues not available - requires Cloudflare Workers Paid plan'
      }, 503);
    }

    const body = await c.req.json();

    const message: QueueMessage = {
      type: 'analysis',
      payload: body,
      timestamp: new Date().toISOString(),
      priority: body.priority || 'high',
    };

    await c.env.SAFEWORK_QUEUE.send(message);

    return c.json({
      success: true,
      message: 'Analysis job queued',
      jobId: `analysis_${Date.now()}`,
    });
  } catch (error) {
    console.error('Queue analysis error:', error);
    return c.json({ success: false, error: 'Failed to queue job' }, 500);
  }
});

// ============================================
// AI Validation Routes
// ============================================

/**
 * Validate survey submission with AI
 */
nativeApiRoutes.post('/ai/validate', async (c) => {
  try {
    const { formType, data } = await c.req.json();

    const ai = new AIValidatorService(c.env.AI);
    const validation = await ai.validateSurveySubmission(formType, data);

    return c.json({
      success: true,
      validation,
    });
  } catch (error) {
    console.error('AI validation error:', error);
    return c.json({ success: false, error: 'Validation failed' }, 500);
  }
});

/**
 * Generate health insights from symptoms
 */
nativeApiRoutes.post('/ai/health-insights', async (c) => {
  try {
    const { symptomsData } = await c.req.json();

    const ai = new AIValidatorService(c.env.AI);
    const insights = await ai.generateHealthInsights(symptomsData);

    return c.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error('AI insights error:', error);
    return c.json({ success: false, error: 'Failed to generate insights' }, 500);
  }
});

/**
 * Detect anomalies in survey data
 */
nativeApiRoutes.post('/ai/detect-anomalies', async (c) => {
  try {
    const { formType, currentData, historicalData } = await c.req.json();

    const ai = new AIValidatorService(c.env.AI);
    const result = await ai.detectAnomalies(formType, currentData, historicalData);

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('AI anomaly detection error:', error);
    return c.json({ success: false, error: 'Anomaly detection failed' }, 500);
  }
});

/**
 * Generate AI summary report
 */
nativeApiRoutes.post('/ai/summary-report', async (c) => {
  try {
    const { formType, data, period } = await c.req.json();

    const ai = new AIValidatorService(c.env.AI);
    const report = await ai.generateSummaryReport(formType, data, period);

    return c.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('AI report generation error:', error);
    return c.json({ success: false, error: 'Report generation failed' }, 500);
  }
});

// ============================================
// Export with R2 Storage
// ============================================

/**
 * Export survey data to Excel and store in R2
 */
nativeApiRoutes.post('/export/excel', async (c) => {
  try {
    const { formType, format = 'csv' } = await c.req.json();

    // Fetch survey data
    const result = await c.env.PRIMARY_DB.prepare(
      'SELECT * FROM surveys WHERE form_type = ? ORDER BY submission_date DESC'
    ).bind(formType).all();

    const storage = new R2StorageService(c.env.SAFEWORK_STORAGE);
    const exportResult = await storage.exportSurveyToExcel(
      formType,
      result.results,
      format
    );

    return c.json(exportResult);
  } catch (error) {
    console.error('Excel export error:', error);
    return c.json({ success: false, error: 'Export failed' }, 500);
  }
});

/**
 * Get export download link
 */
nativeApiRoutes.get('/export/download/:filename', async (c) => {
  try {
    const filename = c.req.param('filename');
    const linkData = await c.env.SAFEWORK_KV.get(`export_link:${filename}`, 'json');

    if (!linkData) {
      return c.json({ success: false, error: 'Export link expired or not found' }, 404);
    }

    const storage = new R2StorageService(c.env.SAFEWORK_STORAGE);
    const file = await storage.downloadFile((linkData as any).key);

    if (!file) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return c.json({ success: false, error: 'Download failed' }, 500);
  }
});

// ============================================
// Health Check for Native Services
// ============================================

/**
 * Check status of all native services
 */
nativeApiRoutes.get('/native/health', async (c) => {
  const health: any = {
    timestamp: new Date().toISOString(),
    services: {},
  };

  // Check D1
  try {
    await c.env.PRIMARY_DB.prepare('SELECT 1').first();
    health.services.d1 = { status: 'healthy' };
  } catch (error) {
    health.services.d1 = { status: 'unhealthy', error: (error as Error).message };
  }

  // Check KV
  try {
    await c.env.SAFEWORK_KV.get('health_check');
    health.services.kv = { status: 'healthy' };
  } catch (error) {
    health.services.kv = { status: 'unhealthy', error: (error as Error).message };
  }

  // Check R2
  try {
    await c.env.SAFEWORK_STORAGE.head('health_check');
    health.services.r2 = { status: 'healthy' };
  } catch (error) {
    // R2 head returns null if not found, which is ok
    health.services.r2 = { status: 'healthy' };
  }

  // Check AI
  try {
    health.services.ai = { status: 'healthy', model: '@cf/meta/llama-3-8b-instruct' };
  } catch (error) {
    health.services.ai = { status: 'unhealthy', error: (error as Error).message };
  }

  // Check Queue
  if (c.env.SAFEWORK_QUEUE) {
    health.services.queue = { status: 'healthy', binding: 'SAFEWORK_QUEUE' };
  } else {
    health.services.queue = { status: 'unavailable', reason: 'Requires Paid Plan' };
  }

  const allHealthy = Object.values(health.services).every(
    (s: any) => s.status === 'healthy' || s.status === 'unavailable'
  );

  return c.json({
    success: allHealthy,
    ...health,
  });
});
