/**
 * Error Logging Utility for SafeWork
 * Structured logging for Grafana/Loki integration
 */

import { AppError, getErrorMessage, getErrorStack } from '../errors/custom-errors';

export interface ErrorLogContext {
  requestId?: string;
  userId?: number;
  url?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

export interface StructuredErrorLog {
  level: 'error' | 'warn' | 'info';
  message: string;
  error: {
    name: string;
    message: string;
    code?: string;
    statusCode?: number;
    isOperational?: boolean;
    stack?: string;
    details?: unknown;
  };
  context: ErrorLogContext;
  environment: string;
}

/**
 * Log error with structured format
 */
export function logError(
  error: unknown,
  context: Partial<ErrorLogContext> = {},
  environment: string = 'production'
): StructuredErrorLog {
  const timestamp = new Date().toISOString();

  const errorLog: StructuredErrorLog = {
    level: 'error',
    message: getErrorMessage(error),
    error: {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: getErrorMessage(error),
      code: error instanceof AppError ? error.code : undefined,
      statusCode: error instanceof AppError ? error.statusCode : 500,
      isOperational: error instanceof AppError ? error.isOperational : false,
      stack: getErrorStack(error),
      details: error instanceof AppError ? error.details : undefined,
    },
    context: {
      ...context,
      timestamp,
    },
    environment,
  };

  // Console log with structured format (for Cloudflare Workers logs)
  console.error(JSON.stringify(errorLog, null, 2));

  return errorLog;
}

/**
 * Log warning with structured format
 */
export function logWarning(
  message: string,
  context: Partial<ErrorLogContext> = {},
  details?: unknown
): void {
  const timestamp = new Date().toISOString();

  console.warn(JSON.stringify({
    level: 'warn',
    message,
    details,
    context: {
      ...context,
      timestamp,
    },
  }, null, 2));
}

/**
 * Log info with structured format
 */
export function logInfo(
  message: string,
  context: Partial<ErrorLogContext> = {},
  details?: unknown
): void {
  const timestamp = new Date().toISOString();

  console.log(JSON.stringify({
    level: 'info',
    message,
    details,
    context: {
      ...context,
      timestamp,
    },
  }, null, 2));
}

/**
 * Extract request context from Hono Context
 */
export function extractRequestContext(c: {
  req: {
    url: string;
    method: string;
    header: (name: string) => string | undefined;
  };
}): Partial<ErrorLogContext> {
  return {
    url: c.req.url,
    method: c.req.method,
    ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
    userAgent: c.req.header('User-Agent'),
    requestId: c.req.header('CF-Ray'), // Cloudflare Ray ID
  };
}
