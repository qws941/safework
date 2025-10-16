/**
 * Prometheus Metrics Endpoint
 * Exposes application metrics in Prometheus format
 *
 * CLAUDE.md Compliance: Constitutional Framework v11.11
 * - Grafana is Truth: Metrics scraped by Prometheus on Synology NAS
 * - Mandatory: /metrics endpoint for all services
 */

import { Hono } from 'hono';
import { Env } from '../index';
import { createD1Client } from '../db/d1-client';

export const metricsRoutes = new Hono<{ Bindings: Env }>();

/**
 * Prometheus Metrics Endpoint
 * GET /metrics
 *
 * Returns application metrics in Prometheus exposition format
 *
 * Metrics exposed:
 * - safework_surveys_total: Total number of surveys submitted
 * - safework_surveys_by_form_type: Survey count by form type
 * - safework_users_total: Total number of registered users
 * - safework_users_active: Number of active users
 * - safework_companies_total: Number of companies
 * - safework_processes_total: Number of processes
 * - safework_roles_total: Number of roles
 * - safework_last_survey_timestamp: Timestamp of last survey submission
 *
 * @example
 * curl https://safework.jclee.me/metrics
 */
metricsRoutes.get('/', async (c) => {
  const db = createD1Client(c.env.PRIMARY_DB);

  try {
    // Fetch metrics from D1 database
    const [
      surveyCountResult,
      userCountResult,
      activeUserCountResult,
      companyCountResult,
      processCountResult,
      roleCountResult,
      lastSurveyResult,
      surveysByFormResult
    ] = await Promise.all([
      // Total surveys
      db.query<{ count: number }>('SELECT COUNT(*) as count FROM surveys'),

      // Total users
      db.query<{ count: number }>('SELECT COUNT(*) as count FROM users'),

      // Active users (logged in within last 30 days)
      db.query<{ count: number }>(`
        SELECT COUNT(*) as count FROM users
        WHERE is_active = 1 AND last_login >= datetime('now', '-30 days')
      `),

      // Total companies
      db.query<{ count: number }>('SELECT COUNT(*) as count FROM companies WHERE is_active = 1'),

      // Total processes
      db.query<{ count: number }>('SELECT COUNT(*) as count FROM processes WHERE is_active = 1'),

      // Total roles
      db.query<{ count: number }>('SELECT COUNT(*) as count FROM roles WHERE is_active = 1'),

      // Last survey submission timestamp
      db.query<{ max_date: string }>(`
        SELECT MAX(submission_date) as max_date FROM surveys
      `),

      // Surveys by form type
      db.query<{ form_type: string; count: number }>(`
        SELECT form_type, COUNT(*) as count FROM surveys
        GROUP BY form_type
      `)
    ]);

    // Extract counts
    const surveyCount = surveyCountResult.results[0]?.count || 0;
    const userCount = userCountResult.results[0]?.count || 0;
    const activeUserCount = activeUserCountResult.results[0]?.count || 0;
    const companyCount = companyCountResult.results[0]?.count || 0;
    const processCount = processCountResult.results[0]?.count || 0;
    const roleCount = roleCountResult.results[0]?.count || 0;
    const lastSurveyDate = lastSurveyResult.results[0]?.max_date;
    const lastSurveyTimestamp = lastSurveyDate ? new Date(lastSurveyDate).getTime() / 1000 : 0;

    // Build Prometheus exposition format
    const metrics = [];

    // Application info
    metrics.push('# HELP safework_info SafeWork application information');
    metrics.push('# TYPE safework_info gauge');
    metrics.push(`safework_info{version="1.0.0",environment="${c.env.ENVIRONMENT || 'unknown'}"} 1`);
    metrics.push('');

    // Total surveys
    metrics.push('# HELP safework_surveys_total Total number of surveys submitted');
    metrics.push('# TYPE safework_surveys_total counter');
    metrics.push(`safework_surveys_total ${surveyCount}`);
    metrics.push('');

    // Surveys by form type
    metrics.push('# HELP safework_surveys_by_form_type Survey count by form type');
    metrics.push('# TYPE safework_surveys_by_form_type counter');
    for (const row of surveysByFormResult.results) {
      metrics.push(`safework_surveys_by_form_type{form_type="${row.form_type}"} ${row.count}`);
    }
    metrics.push('');

    // Total users
    metrics.push('# HELP safework_users_total Total number of registered users');
    metrics.push('# TYPE safework_users_total gauge');
    metrics.push(`safework_users_total ${userCount}`);
    metrics.push('');

    // Active users
    metrics.push('# HELP safework_users_active Number of active users (last 30 days)');
    metrics.push('# TYPE safework_users_active gauge');
    metrics.push(`safework_users_active ${activeUserCount}`);
    metrics.push('');

    // Companies
    metrics.push('# HELP safework_companies_total Number of active companies');
    metrics.push('# TYPE safework_companies_total gauge');
    metrics.push(`safework_companies_total ${companyCount}`);
    metrics.push('');

    // Processes
    metrics.push('# HELP safework_processes_total Number of active processes');
    metrics.push('# TYPE safework_processes_total gauge');
    metrics.push(`safework_processes_total ${processCount}`);
    metrics.push('');

    // Roles
    metrics.push('# HELP safework_roles_total Number of active roles');
    metrics.push('# TYPE safework_roles_total gauge');
    metrics.push(`safework_roles_total ${roleCount}`);
    metrics.push('');

    // Last survey timestamp
    metrics.push('# HELP safework_last_survey_timestamp Unix timestamp of last survey submission');
    metrics.push('# TYPE safework_last_survey_timestamp gauge');
    metrics.push(`safework_last_survey_timestamp ${lastSurveyTimestamp}`);
    metrics.push('');

    // Database connection status
    metrics.push('# HELP safework_db_up Database connection status (1 = up, 0 = down)');
    metrics.push('# TYPE safework_db_up gauge');
    metrics.push('safework_db_up 1');
    metrics.push('');

    // Return Prometheus format
    return c.text(metrics.join('\n'), 200, {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
    });

  } catch (error) {
    console.error('Metrics collection failed:', error);

    // Return minimal metrics on error
    const errorMetrics = [
      '# HELP safework_db_up Database connection status (1 = up, 0 = down)',
      '# TYPE safework_db_up gauge',
      'safework_db_up 0',
      '',
      '# HELP safework_scrape_error Scrape error status',
      '# TYPE safework_scrape_error gauge',
      'safework_scrape_error 1'
    ];

    return c.text(errorMetrics.join('\n'), 500, {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
    });
  }
});

/**
 * Health check for metrics endpoint
 * GET /metrics/health
 */
metricsRoutes.get('/health', async (c) => {
  return c.json({
    status: 'healthy',
    service: 'metrics',
    timestamp: new Date().toISOString()
  });
});

export default metricsRoutes;
