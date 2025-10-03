/**
 * Cloudflare Queue Processor
 * Background job processing for reports, exports, and notifications
 */

export interface QueueMessage {
  type: 'export' | 'report' | 'notification' | 'analysis' | 'cleanup';
  payload: Record<string, any>;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface ExportJob {
  formType: string;
  format: 'xlsx' | 'csv' | 'pdf';
  dateRange?: { start: string; end: string };
  filters?: Record<string, any>;
  requestedBy?: string;
}

export interface ReportJob {
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  formTypes: string[];
  period: string;
  recipients?: string[];
}

export interface NotificationJob {
  type: 'email' | 'sms' | 'push';
  recipients: string[];
  subject: string;
  message: string;
  data?: Record<string, any>;
}

export interface AnalysisJob {
  formType: string;
  surveyIds: number[];
  analysisType: 'risk' | 'trends' | 'anomalies' | 'insights';
}

/**
 * Queue message handler
 */
export async function handleQueueMessage(
  message: Message<QueueMessage>,
  env: {
    PRIMARY_DB: D1Database;
    SAFEWORK_KV: KVNamespace;
    SAFEWORK_STORAGE: R2Bucket;
    AI: Ai;
  }
): Promise<void> {
  console.log(`Processing queue message: ${message.body.type}`, message.body);

  try {
    switch (message.body.type) {
      case 'export':
        await handleExportJob(message.body.payload as ExportJob, env);
        break;

      case 'report':
        await handleReportJob(message.body.payload as ReportJob, env);
        break;

      case 'notification':
        await handleNotificationJob(message.body.payload as NotificationJob, env);
        break;

      case 'analysis':
        await handleAnalysisJob(message.body.payload as AnalysisJob, env);
        break;

      case 'cleanup':
        await handleCleanupJob(message.body.payload, env);
        break;

      default:
        console.warn(`Unknown job type: ${message.body.type}`);
    }

    // Mark message as processed
    message.ack();
  } catch (error) {
    console.error('Queue processing error:', error);
    // Retry the message
    message.retry();
  }
}

/**
 * Handle export job
 */
async function handleExportJob(job: ExportJob, env: any): Promise<void> {
  console.log('Processing export job:', job);

  // Fetch survey data
  const query = `
    SELECT * FROM surveys
    WHERE form_type = ?
    ${job.dateRange ? 'AND submission_date BETWEEN ? AND ?' : ''}
    ORDER BY submission_date DESC
  `;

  const params = [job.formType];
  if (job.dateRange) {
    params.push(job.dateRange.start, job.dateRange.end);
  }

  const result = await env.PRIMARY_DB.prepare(query).bind(...params).all();

  // Generate export file
  const data = result.results;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `export_${job.formType}_${timestamp}.${job.format}`;
  const key = `exports/${job.formType}/${filename}`;

  // Convert to desired format
  let content: string;
  if (job.format === 'csv') {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    content = [headers, ...rows].join('\n');
  } else {
    content = JSON.stringify(data, null, 2);
  }

  // Store in R2
  await env.SAFEWORK_STORAGE.put(key, content, {
    httpMetadata: {
      contentType: job.format === 'csv' ? 'text/csv' : 'application/json',
    },
    customMetadata: {
      filename,
      formType: job.formType,
      generatedAt: new Date().toISOString(),
      requestedBy: job.requestedBy || 'system',
    },
  });

  // Store download link in KV (expires in 24 hours)
  await env.SAFEWORK_KV.put(
    `export_link:${filename}`,
    JSON.stringify({ key, filename, formType: job.formType }),
    { expirationTtl: 86400 }
  );

  console.log(`Export completed: ${filename}`);
}

/**
 * Handle report generation job
 */
async function handleReportJob(job: ReportJob, env: any): Promise<void> {
  console.log('Processing report job:', job);

  // Fetch data for all form types
  const reportData: Record<string, any> = {};

  for (const formType of job.formTypes) {
    const result = await env.PRIMARY_DB.prepare(
      'SELECT * FROM surveys WHERE form_type = ? ORDER BY submission_date DESC LIMIT 100'
    ).bind(formType).all();

    reportData[formType] = result.results;
  }

  // Generate report using AI
  const prompt = `
Generate a comprehensive ${job.reportType} safety report for the period ${job.period}:

Data:
${JSON.stringify(reportData, null, 2)}

Include:
1. Executive summary
2. Key statistics
3. Trends and patterns
4. Risk areas
5. Recommendations

Write in Korean.
  `;

  const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: [
      {
        role: 'system',
        content: 'You are a workplace safety analyst generating comprehensive reports in Korean.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const report = (aiResponse as any).response || '보고서 생성 실패';

  // Store report in R2
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `report_${job.reportType}_${timestamp}.txt`;
  const key = `reports/${job.reportType}/${filename}`;

  await env.SAFEWORK_STORAGE.put(key, report, {
    httpMetadata: {
      contentType: 'text/plain',
    },
    customMetadata: {
      filename,
      reportType: job.reportType,
      period: job.period,
      generatedAt: new Date().toISOString(),
    },
  });

  console.log(`Report generated: ${filename}`);
}

/**
 * Handle notification job
 */
async function handleNotificationJob(job: NotificationJob, env: any): Promise<void> {
  console.log('Processing notification job:', job);

  // For now, just log the notification
  // In production, integrate with email service (MailChannels, Resend, etc.)
  console.log(`Notification (${job.type}):`, {
    recipients: job.recipients,
    subject: job.subject,
    message: job.message,
  });

  // Store notification log
  await env.SAFEWORK_KV.put(
    `notification:${Date.now()}`,
    JSON.stringify(job),
    { expirationTtl: 604800 } // 7 days
  );
}

/**
 * Handle analysis job
 */
async function handleAnalysisJob(job: AnalysisJob, env: any): Promise<void> {
  console.log('Processing analysis job:', job);

  // Fetch survey data
  const surveys = await env.PRIMARY_DB.prepare(
    `SELECT * FROM surveys WHERE id IN (${job.surveyIds.join(',')}) AND form_type = ?`
  ).bind(job.formType).all();

  const data = surveys.results;

  // Run AI analysis
  let analysisResult: any;

  switch (job.analysisType) {
    case 'risk':
      analysisResult = await analyzeRisk(data, env.AI);
      break;
    case 'trends':
      analysisResult = await analyzeTrends(data, env.AI);
      break;
    case 'anomalies':
      analysisResult = await detectAnomalies(data, env.AI);
      break;
    case 'insights':
      analysisResult = await generateInsights(data, env.AI);
      break;
  }

  // Store analysis results
  const key = `analysis:${job.formType}:${job.analysisType}:${Date.now()}`;
  await env.SAFEWORK_KV.put(key, JSON.stringify(analysisResult), {
    expirationTtl: 2592000, // 30 days
  });

  console.log(`Analysis completed: ${key}`);
}

/**
 * Handle cleanup job
 */
async function handleCleanupJob(payload: any, env: any): Promise<void> {
  console.log('Processing cleanup job:', payload);

  // Clean up old exports
  const exports = await env.SAFEWORK_STORAGE.list({ prefix: 'exports/' });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const obj of exports.objects) {
    if (obj.uploaded < thirtyDaysAgo) {
      await env.SAFEWORK_STORAGE.delete(obj.key);
      console.log(`Deleted old export: ${obj.key}`);
    }
  }

  // Clean up old KV entries
  // Note: KV entries auto-expire based on TTL, so this is optional
}

// Helper functions for analysis

async function analyzeRisk(data: any[], ai: Ai): Promise<any> {
  const prompt = `Analyze health and safety risks from this data: ${JSON.stringify(data)}`;
  const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
  });
  return { type: 'risk', result: (response as any).response };
}

async function analyzeTrends(data: any[], ai: Ai): Promise<any> {
  const prompt = `Identify trends and patterns in this data: ${JSON.stringify(data)}`;
  const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
  });
  return { type: 'trends', result: (response as any).response };
}

async function detectAnomalies(data: any[], ai: Ai): Promise<any> {
  const prompt = `Detect anomalies in this data: ${JSON.stringify(data)}`;
  const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
  });
  return { type: 'anomalies', result: (response as any).response };
}

async function generateInsights(data: any[], ai: Ai): Promise<any> {
  const prompt = `Generate actionable insights from this data: ${JSON.stringify(data)}`;
  const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
  });
  return { type: 'insights', result: (response as any).response };
}
