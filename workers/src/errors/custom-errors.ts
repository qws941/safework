/**
 * Custom Error Classes for SafeWork Application
 * Provides structured error handling with HTTP status codes
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * HTTP 400 - Bad Request
 * Client sent invalid data
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

/**
 * HTTP 401 - Unauthorized
 * Authentication required or failed
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

/**
 * HTTP 403 - Forbidden
 * User doesn't have permission
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

/**
 * HTTP 404 - Not Found
 * Resource not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, true, 'NOT_FOUND');
  }
}

/**
 * HTTP 409 - Conflict
 * Resource already exists or conflict with current state
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: unknown) {
    super(message, 409, true, 'CONFLICT_ERROR', details);
  }
}

/**
 * HTTP 429 - Too Many Requests
 * Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number
  ) {
    super(message, 429, true, 'RATE_LIMIT_ERROR', { retryAfter });
  }
}

/**
 * HTTP 500 - Internal Server Error
 * Database operation failed
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: unknown) {
    super(message, 500, true, 'DATABASE_ERROR', details);
  }
}

/**
 * HTTP 503 - Service Unavailable
 * External service unavailable
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string = 'External service unavailable',
    details?: unknown
  ) {
    super(`${service}: ${message}`, 503, true, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

/**
 * HTTP 500 - Internal Server Error
 * Unexpected error (non-operational)
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', details?: unknown) {
    super(message, 500, false, 'INTERNAL_ERROR', details);
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Extract stack trace from error
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}
