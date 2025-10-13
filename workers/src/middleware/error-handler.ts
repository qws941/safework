/**
 * Global Error Handler Middleware for SafeWork
 * Catches all errors and returns structured responses
 */

import { Context } from 'hono';
import { AppError, isAppError, getErrorMessage, ValidationError, DatabaseError } from '../errors/custom-errors';
import { logError, extractRequestContext } from '../utils/error-logger';
import { Env } from '../index';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: unknown;
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Global error handler middleware
 * Must be registered in Hono app with app.onError()
 */
export function errorHandler(err: Error, c: Context<{ Bindings: Env }>) {
  // Extract request context for logging
  const requestContext = extractRequestContext(c);

  // Get environment for logging
  const environment = c.env?.ENVIRONMENT || 'production';

  // Log the error with structured format
  logError(err, requestContext, environment);

  // Determine status code and error details
  let statusCode = 500;
  let errorCode: string | undefined;
  let errorDetails: unknown;
  let message = 'Internal server error';

  if (isAppError(err)) {
    // Custom application error
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    errorDetails = err.details;

    // Don't expose internal error details in production
    if (!err.isOperational && environment === 'production') {
      message = 'Internal server error';
      errorDetails = undefined;
    }
  } else if (err instanceof Error) {
    // Standard Error
    message = environment === 'development' ? err.message : 'Internal server error';
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message,
      code: errorCode,
      statusCode,
      details: environment === 'development' ? errorDetails : undefined,
    },
    timestamp: new Date().toISOString(),
    requestId: requestContext.requestId,
  };

  // Return JSON error response
  return c.json(errorResponse, statusCode as any);
}

/**
 * Not Found (404) handler
 * Must be registered after all routes
 */
export function notFoundHandler(c: Context) {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: `Route not found: ${c.req.method} ${c.req.path}`,
      code: 'NOT_FOUND',
      statusCode: 404,
    },
    timestamp: new Date().toISOString(),
    requestId: c.req.header('CF-Ray'),
  };

  return c.json(errorResponse, 404);
}

/**
 * Async error wrapper for route handlers
 * Automatically catches async errors and passes to error handler
 */
export function asyncHandler<T>(
  fn: (c: Context<{ Bindings: Env }>) => Promise<T>
) {
  return async (c: Context<{ Bindings: Env }>) => {
    try {
      return await fn(c);
    } catch (error) {
      // Pass error to global error handler
      throw error;
    }
  };
}

/**
 * Validation helper that throws ValidationError
 */
export function validateRequest(
  condition: boolean,
  message: string,
  details?: unknown
): asserts condition {
  if (!condition) {
    throw new ValidationError(message, details);
  }
}

/**
 * Database operation wrapper
 * Converts database errors to DatabaseError
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    throw new DatabaseError(`${operationName} failed: ${message}`, {
      originalError: getErrorMessage(error),
    });
  }
}
