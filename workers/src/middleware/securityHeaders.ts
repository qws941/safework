/**
 * Security Headers Middleware for Cloudflare Workers
 * Implements OWASP recommended security headers
 *
 * Headers implemented:
 * - Content-Security-Policy (CSP)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Strict-Transport-Security (HSTS)
 * - Referrer-Policy
 * - Permissions-Policy
 * - X-XSS-Protection (legacy browsers)
 */

import { Context, Next } from 'hono';

export interface SecurityHeadersConfig {
  /**
   * Enable Content Security Policy
   * @default true
   */
  enableCSP?: boolean;

  /**
   * CSP directives (overrides defaults)
   */
  cspDirectives?: Record<string, string | string[]>;

  /**
   * Enable HSTS (HTTP Strict Transport Security)
   * @default true
   */
  enableHSTS?: boolean;

  /**
   * HSTS max-age in seconds
   * @default 31536000 (1 year)
   */
  hstsMaxAge?: number;

  /**
   * Include subdomains in HSTS
   * @default true
   */
  hstsIncludeSubDomains?: boolean;

  /**
   * Enable HSTS preload
   * @default false (requires manual submission to browsers)
   */
  hstsPreload?: boolean;

  /**
   * X-Frame-Options value
   * @default "DENY"
   */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';

  /**
   * Referrer-Policy value
   * @default "strict-origin-when-cross-origin"
   */
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';

  /**
   * Permissions-Policy directives
   */
  permissionsPolicy?: Record<string, string | string[]>;
}

/**
 * Default CSP directives for SafeWork application
 */
const DEFAULT_CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for inline scripts (should be removed in production)
    'https://cdn.jsdelivr.net',
    'https://unpkg.com'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Bootstrap and inline styles
    'https://cdn.jsdelivr.net',
    'https://fonts.googleapis.com'
  ],
  'font-src': [
    "'self'",
    'https://cdn.jsdelivr.net',
    'https://fonts.gstatic.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:'
  ],
  'connect-src': [
    "'self'",
    'https://safework.jclee.me',
    'https://*.jclee.me'
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
  'upgrade-insecure-requests': []
};

/**
 * Default Permissions-Policy directives
 */
const DEFAULT_PERMISSIONS_POLICY = {
  'accelerometer': ["'none'"],
  'camera': ["'none'"],
  'geolocation': ["'none'"],
  'gyroscope': ["'none'"],
  'magnetometer': ["'none'"],
  'microphone': ["'none'"],
  'payment': ["'none'"],
  'usb': ["'none'"]
};

/**
 * Security headers middleware
 */
export function securityHeaders(config: SecurityHeadersConfig = {}) {
  return async (c: Context, next: Next) => {
    await next();

    // Content-Security-Policy
    if (config.enableCSP !== false) {
      const cspDirectives = config.cspDirectives || DEFAULT_CSP_DIRECTIVES;
      const cspString = buildCSPString(cspDirectives);
      c.header('Content-Security-Policy', cspString);
    }

    // X-Frame-Options
    const frameOptions = config.frameOptions || 'DENY';
    c.header('X-Frame-Options', frameOptions);

    // X-Content-Type-Options
    c.header('X-Content-Type-Options', 'nosniff');

    // Strict-Transport-Security (HSTS)
    if (config.enableHSTS !== false) {
      const maxAge = config.hstsMaxAge || 31536000; // 1 year default
      let hstsValue = `max-age=${maxAge}`;

      if (config.hstsIncludeSubDomains !== false) {
        hstsValue += '; includeSubDomains';
      }

      if (config.hstsPreload) {
        hstsValue += '; preload';
      }

      c.header('Strict-Transport-Security', hstsValue);
    }

    // Referrer-Policy
    const referrerPolicy = config.referrerPolicy || 'strict-origin-when-cross-origin';
    c.header('Referrer-Policy', referrerPolicy);

    // Permissions-Policy
    const permissionsPolicy = config.permissionsPolicy || DEFAULT_PERMISSIONS_POLICY;
    const permissionsPolicyString = buildPermissionsPolicyString(permissionsPolicy);
    c.header('Permissions-Policy', permissionsPolicyString);

    // X-XSS-Protection (legacy, for older browsers)
    c.header('X-XSS-Protection', '1; mode=block');

    // X-DNS-Prefetch-Control
    c.header('X-DNS-Prefetch-Control', 'off');

    // X-Download-Options (IE8+)
    c.header('X-Download-Options', 'noopen');

    // X-Permitted-Cross-Domain-Policies
    c.header('X-Permitted-Cross-Domain-Policies', 'none');
  };
}

/**
 * Build CSP string from directives object
 */
function buildCSPString(directives: Record<string, string | string[]>): string {
  return Object.entries(directives)
    .map(([key, value]) => {
      if (Array.isArray(value) && value.length === 0) {
        // Directive with no value (e.g., upgrade-insecure-requests)
        return key;
      }
      const valueStr = Array.isArray(value) ? value.join(' ') : value;
      return `${key} ${valueStr}`;
    })
    .join('; ');
}

/**
 * Build Permissions-Policy string from directives object
 */
function buildPermissionsPolicyString(directives: Record<string, string | string[]>): string {
  return Object.entries(directives)
    .map(([key, value]) => {
      const valueStr = Array.isArray(value) ? value.join(' ') : value;
      return `${key}=(${valueStr})`;
    })
    .join(', ');
}

/**
 * Production-ready security headers configuration
 */
export const ProductionSecurityHeaders: SecurityHeadersConfig = {
  enableCSP: true,
  enableHSTS: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubDomains: true,
  hstsPreload: false, // Enable after manual submission to HSTS preload list
  frameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin'
};

/**
 * Development security headers configuration (less strict)
 */
export const DevelopmentSecurityHeaders: SecurityHeadersConfig = {
  enableCSP: true,
  cspDirectives: {
    ...DEFAULT_CSP_DIRECTIVES,
    'connect-src': [
      "'self'",
      'http://localhost:*',
      'https://safework.jclee.me'
    ]
  },
  enableHSTS: false, // Disable HSTS in development
  frameOptions: 'SAMEORIGIN',
  referrerPolicy: 'no-referrer-when-downgrade'
};
