/**
 * Loki Logger Utility
 * Centralized logging to Grafana Loki for observability
 *
 * CLAUDE.md Compliance: Constitutional Framework v11.11
 * - Grafana is Truth: All logs go to loki.jclee.me
 * - Observability Constitution: Mandatory Loki integration
 */

import { Env } from '../index';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: string | number | boolean;
}

export interface LokiStream {
  stream: Record<string, string>;
  values: Array<[string, string]>;
}

export interface LokiPushRequest {
  streams: LokiStream[];
}

/**
 * Log structured message to Grafana Loki
 *
 * @param env - Cloudflare Workers environment bindings
 * @param level - Log level (DEBUG, INFO, WARN, ERROR, FATAL)
 * @param message - Log message
 * @param labels - Additional labels for Loki stream
 * @param metadata - Additional metadata in log entry
 *
 * @example
 * await logToLoki(c.env, 'INFO', 'User registered', { endpoint: '/api/auth/register' }, { user_id: 123 });
 */
export async function logToLoki(
  env: Env,
  level: LogLevel,
  message: string,
  labels: Record<string, string> = {},
  metadata: Record<string, string | number | boolean> = {}
): Promise<void> {
  const lokiUrl = 'https://loki.jclee.me/loki/api/v1/push';

  // Build log entry with structured data
  const logEntry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  // Build Loki stream with labels
  const stream: Record<string, string> = {
    job: 'safework',
    environment: env.ENVIRONMENT || 'unknown',
    service: 'workers',
    ...labels
  };

  // Loki expects nanosecond timestamps (19 digits)
  const nanosecondTimestamp = `${Date.now()}000000`;

  const payload: LokiPushRequest = {
    streams: [{
      stream,
      values: [[
        nanosecondTimestamp,
        JSON.stringify(logEntry)
      ]]
    }]
  };

  try {
    const response = await fetch(lokiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // Fail-open: Log to console if Loki unavailable
      console.warn(`Loki push failed (${response.status}):`, message);
    }
  } catch (error) {
    // Fail-open: Don't block request if logging fails
    console.error('Failed to log to Loki:', error instanceof Error ? error.message : error);
  }
}

/**
 * Convenience wrapper for INFO level logs
 */
export async function logInfo(
  env: Env,
  message: string,
  labels?: Record<string, string>,
  metadata?: Record<string, string | number | boolean>
): Promise<void> {
  return logToLoki(env, 'INFO', message, labels, metadata);
}

/**
 * Convenience wrapper for WARN level logs
 */
export async function logWarn(
  env: Env,
  message: string,
  labels?: Record<string, string>,
  metadata?: Record<string, string | number | boolean>
): Promise<void> {
  return logToLoki(env, 'WARN', message, labels, metadata);
}

/**
 * Convenience wrapper for ERROR level logs
 */
export async function logError(
  env: Env,
  message: string,
  labels?: Record<string, string>,
  metadata?: Record<string, string | number | boolean>
): Promise<void> {
  return logToLoki(env, 'ERROR', message, labels, metadata);
}

/**
 * Log HTTP request/response
 */
export async function logRequest(
  env: Env,
  method: string,
  path: string,
  status: number,
  duration: number,
  metadata: Record<string, string | number | boolean> = {}
): Promise<void> {
  const level: LogLevel = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';

  await logToLoki(
    env,
    level,
    `${method} ${path} ${status}`,
    {
      endpoint: path,
      method,
    },
    {
      status,
      duration_ms: duration,
      ...metadata
    }
  );
}

/**
 * Log authentication events
 */
export async function logAuth(
  env: Env,
  event: 'login' | 'register' | 'logout' | 'refresh' | 'verify',
  success: boolean,
  username?: string,
  metadata: Record<string, string | number | boolean> = {}
): Promise<void> {
  const level: LogLevel = success ? 'INFO' : 'WARN';

  await logToLoki(
    env,
    level,
    `Auth ${event}: ${success ? 'SUCCESS' : 'FAILED'}`,
    {
      auth_event: event,
    },
    {
      success,
      ...(username && { username }),
      ...metadata
    }
  );
}

/**
 * Log survey submissions
 */
export async function logSurvey(
  env: Env,
  formType: string,
  surveyId: number,
  userId: number,
  metadata: Record<string, string | number | boolean> = {}
): Promise<void> {
  await logToLoki(
    env,
    'INFO',
    `Survey submitted: ${formType}`,
    {
      form_type: formType,
    },
    {
      survey_id: surveyId,
      user_id: userId,
      ...metadata
    }
  );
}
