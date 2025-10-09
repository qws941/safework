/**
 * Rate Limiting Middleware for Cloudflare Workers
 * Uses KV store for distributed rate limiting across edge locations
 *
 * Security specifications:
 * - Login endpoint: 5 attempts per 5 minutes per IP
 * - Survey submission: 10 submissions per minute per IP
 * - API endpoints: 100 requests per minute per IP
 */

import { Context, Next } from 'hono';
import { Env } from '../index';

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Custom identifier function (defaults to IP address)
   */
  keyPrefix?: string;

  /**
   * Custom error message
   */
  message?: string;

  /**
   * Block duration after limit exceeded (in seconds)
   * Default: same as windowSeconds
   */
  blockDuration?: number;
}

/**
 * Rate limiter middleware factory
 */
export function rateLimiter(config: RateLimitConfig) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const identifier = getClientIdentifier(c);
    const key = `ratelimit:${config.keyPrefix || 'default'}:${identifier}`;

    try {
      // Check if client is currently blocked
      const blockKey = `${key}:blocked`;
      const blocked = await c.env.AUTH_STORE.get(blockKey);

      if (blocked) {
        return c.json(
          {
            error: config.message || 'Too many requests. Please try again later.',
            retryAfter: parseInt(blocked, 10)
          },
          429
        );
      }

      // Get current request count
      const currentCount = await c.env.AUTH_STORE.get(key);
      const count = currentCount ? parseInt(currentCount, 10) : 0;

      // Check if limit exceeded
      if (count >= config.maxRequests) {
        // Block the client
        const blockDuration = config.blockDuration || config.windowSeconds;
        await c.env.AUTH_STORE.put(blockKey, blockDuration.toString(), {
          expirationTtl: blockDuration
        });

        // Log rate limit violation
        console.warn(`Rate limit exceeded for ${identifier} on ${config.keyPrefix}`);

        return c.json(
          {
            error: config.message || 'Too many requests. Please try again later.',
            retryAfter: blockDuration
          },
          429
        );
      }

      // Increment request count
      await c.env.AUTH_STORE.put(
        key,
        (count + 1).toString(),
        {
          expirationTtl: config.windowSeconds
        }
      );

      // Add rate limit headers
      c.header('X-RateLimit-Limit', config.maxRequests.toString());
      c.header('X-RateLimit-Remaining', (config.maxRequests - count - 1).toString());
      c.header('X-RateLimit-Reset', (Date.now() + config.windowSeconds * 1000).toString());

      await next();
    } catch (error) {
      // Rate limiting failed - log error but allow request to proceed
      // (fail open to prevent denial of service if KV is unavailable)
      console.error('Rate limiter error:', error);
      await next();
    }
  };
}

/**
 * Get client identifier (IP address with fallback to CF-Connecting-IP header)
 */
function getClientIdentifier(c: Context): string {
  // Try Cloudflare's CF-Connecting-IP header first
  const cfIP = c.req.header('CF-Connecting-IP');
  if (cfIP) {
    return cfIP;
  }

  // Fallback to X-Forwarded-For
  const xForwardedFor = c.req.header('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // Fallback to X-Real-IP
  const xRealIP = c.req.header('X-Real-IP');
  if (xRealIP) {
    return xRealIP;
  }

  // Last resort: use request URL as identifier
  return 'unknown';
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  /**
   * Strict rate limit for login attempts
   * 5 attempts per 5 minutes, 15 minute block on violation
   */
  LOGIN: {
    maxRequests: 5,
    windowSeconds: 300, // 5 minutes
    blockDuration: 900, // 15 minutes
    keyPrefix: 'login',
    message: 'Too many login attempts. Your IP has been temporarily blocked for 15 minutes.'
  } as RateLimitConfig,

  /**
   * Moderate rate limit for survey submissions
   * 10 submissions per minute
   */
  SURVEY_SUBMISSION: {
    maxRequests: 10,
    windowSeconds: 60,
    keyPrefix: 'survey',
    message: 'Too many survey submissions. Please wait before submitting again.'
  } as RateLimitConfig,

  /**
   * Lenient rate limit for general API access
   * 100 requests per minute
   */
  API_GENERAL: {
    maxRequests: 100,
    windowSeconds: 60,
    keyPrefix: 'api',
    message: 'API rate limit exceeded. Please slow down your requests.'
  } as RateLimitConfig,

  /**
   * Very strict rate limit for admin operations
   * 20 requests per minute
   */
  ADMIN_OPERATIONS: {
    maxRequests: 20,
    windowSeconds: 60,
    keyPrefix: 'admin',
    message: 'Admin API rate limit exceeded.'
  } as RateLimitConfig
};

/**
 * Manual rate limit check (for use in route handlers)
 */
export async function checkRateLimit(
  c: Context<{ Bindings: Env }>,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const identifier = getClientIdentifier(c);
  const key = `ratelimit:${config.keyPrefix || 'default'}:${identifier}`;

  const currentCount = await c.env.AUTH_STORE.get(key);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  return {
    allowed: count < config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count - 1),
    resetAt: Date.now() + config.windowSeconds * 1000
  };
}
