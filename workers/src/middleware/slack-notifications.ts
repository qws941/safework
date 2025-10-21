/**
 * Slack 알림 미들웨어
 *
 * 주요 기능:
 * - 에러 자동 알림 (5xx 에러)
 * - 보안 이벤트 알림
 * - 성능 이상 감지 알림
 */

import { Context, Next } from 'hono';
import { Env } from '../index';
import {
  sendSlackWebhook,
  createErrorAlertMessage,
  createSecurityAlertMessage,
  createPerformanceAlertMessage,
} from '../utils/slack-client';

/**
 * 에러 모니터링 미들웨어
 */
export async function slackErrorMonitoring(c: Context<{ Bindings: Env }>, next: Next) {
  const startTime = Date.now();

  try {
    await next();
  } catch (error) {
    // 에러 발생 시 Slack 알림
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stackTrace = error instanceof Error ? error.stack : undefined;

    // 환경 변수에서 Slack Webhook URL 가져오기
    const webhookUrl = c.env.SLACK_WEBHOOK_URL;

    if (webhookUrl) {
      const message = createErrorAlertMessage({
        severity: 'critical',
        error: errorMessage,
        path: c.req.path,
        method: c.req.method,
        ip: c.req.header('CF-Connecting-IP'),
        stackTrace,
      });

      // Non-blocking 알림 전송
      c.executionCtx.waitUntil(sendSlackWebhook(webhookUrl, message));
    }

    // 에러 재throw (다른 에러 핸들러가 처리하도록)
    throw error;
  }

  // 응답 시간 측정
  const duration = Date.now() - startTime;

  // 성능 이상 감지 (응답 시간 > 2초)
  if (duration > 2000 && c.env.SLACK_WEBHOOK_URL) {
    const message = createPerformanceAlertMessage({
      metric: 'response_time',
      current: duration,
      threshold: 2000,
      unit: 'ms',
    });

    c.executionCtx.waitUntil(
      sendSlackWebhook(c.env.SLACK_WEBHOOK_URL, message)
    );
  }

  // 5xx 에러 감지
  if (c.res.status >= 500 && c.env.SLACK_WEBHOOK_URL) {
    const message = createErrorAlertMessage({
      severity: 'high',
      error: `HTTP ${c.res.status} Error`,
      path: c.req.path,
      method: c.req.method,
      ip: c.req.header('CF-Connecting-IP'),
    });

    c.executionCtx.waitUntil(
      sendSlackWebhook(c.env.SLACK_WEBHOOK_URL, message)
    );
  }
}

/**
 * 보안 이벤트 알림
 */
export async function notifySecurityEvent(
  c: Context<{ Bindings: Env }>,
  eventType: 'brute_force' | 'sql_injection' | 'xss' | 'rate_limit' | 'suspicious_activity',
  details: {
    description: string;
    attempts?: number;
  }
) {
  const webhookUrl = c.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const message = createSecurityAlertMessage({
    type: eventType,
    description: details.description,
    ip: c.req.header('CF-Connecting-IP') || 'Unknown',
    userAgent: c.req.header('User-Agent'),
    attempts: details.attempts,
    path: c.req.path,
  });

  await sendSlackWebhook(webhookUrl, message);
}

/**
 * 일일 요약 스케줄러 (Cloudflare Cron Triggers 사용)
 */
export async function sendDailySummary(env: Env) {
  const webhookUrl = env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  // KV에서 오늘의 통계 조회
  const today = new Date().toISOString().split('T')[0];
  const stats = await env.CACHE_LAYER.get(`daily_stats:${today}`, 'json') as {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    newUsers: number;
    surveysSubmitted: number;
    errors: number;
  } | null;

  if (!stats) {
    console.warn('No daily stats found for', today);
    return;
  }

  const { createDailySummaryMessage } = await import('../utils/slack-client');
  const message = createDailySummaryMessage({
    date: today,
    ...stats,
  });

  await sendSlackWebhook(webhookUrl, message);
}

/**
 * 배포 알림 헬퍼 (CI/CD에서 사용)
 */
export async function notifyDeployment(
  env: Env,
  success: boolean,
  details: {
    environment: string;
    version: string;
    deployer: string;
    duration?: number;
    error?: string;
    logs?: string;
    url?: string;
  }
) {
  const webhookUrl = env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const { createDeploymentSuccessMessage, createDeploymentFailureMessage } =
    await import('../utils/slack-client');

  const message = success
    ? createDeploymentSuccessMessage({
        environment: details.environment,
        version: details.version,
        deployer: details.deployer,
        duration: details.duration || 0,
        url: details.url || 'https://safework.jclee.me',
      })
    : createDeploymentFailureMessage({
        environment: details.environment,
        version: details.version,
        deployer: details.deployer,
        error: details.error || 'Unknown error',
        logs: details.logs,
      });

  await sendSlackWebhook(webhookUrl, message);
}
