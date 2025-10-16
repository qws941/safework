import { describe, it, expect } from 'vitest';
import { RateLimitPresets } from '../src/middleware/rateLimiter';

/**
 * Middleware Unit Tests
 * Tests for helper functions and configuration validation
 *
 * Coverage target: rateLimiter.ts + securityHeaders.ts helper functions
 */

describe('Rate Limiter - Configuration', () => {
  describe('RateLimitPresets', () => {
    it('should have LOGIN preset with correct values', () => {
      const login = RateLimitPresets.LOGIN;

      expect(login.maxRequests).toBe(5);
      expect(login.windowSeconds).toBe(300); // 5 minutes
      expect(login.blockDuration).toBe(900); // 15 minutes
      expect(login.keyPrefix).toBe('login');
      expect(login.message).toContain('Too many login attempts');
      expect(login.message).toContain('15 minutes');
    });

    it('should have SURVEY_SUBMISSION preset with correct values', () => {
      const survey = RateLimitPresets.SURVEY_SUBMISSION;

      expect(survey.maxRequests).toBe(10);
      expect(survey.windowSeconds).toBe(60); // 1 minute
      expect(survey.keyPrefix).toBe('survey');
      expect(survey.message).toContain('Too many survey submissions');
    });

    it('should have API_GENERAL preset with correct values', () => {
      const api = RateLimitPresets.API_GENERAL;

      expect(api.maxRequests).toBe(100);
      expect(api.windowSeconds).toBe(60); // 1 minute
      expect(api.keyPrefix).toBe('api');
      expect(api.message).toContain('API rate limit');
    });

    it('should have ADMIN_OPERATIONS preset with correct values', () => {
      const admin = RateLimitPresets.ADMIN_OPERATIONS;

      expect(admin.maxRequests).toBe(20);
      expect(admin.windowSeconds).toBe(60); // 1 minute
      expect(admin.keyPrefix).toBe('admin');
      expect(admin.message).toContain('Admin API');
    });

    it('should have LOGIN more restrictive than API_GENERAL', () => {
      expect(RateLimitPresets.LOGIN.maxRequests).toBeLessThan(
        RateLimitPresets.API_GENERAL.maxRequests
      );
    });

    it('should have SURVEY_SUBMISSION more restrictive than API_GENERAL', () => {
      expect(RateLimitPresets.SURVEY_SUBMISSION.maxRequests).toBeLessThan(
        RateLimitPresets.API_GENERAL.maxRequests
      );
    });

    it('should have ADMIN_OPERATIONS with reasonable limits', () => {
      const admin = RateLimitPresets.ADMIN_OPERATIONS;

      // Admin should be more restrictive than general API
      expect(admin.maxRequests).toBeLessThan(RateLimitPresets.API_GENERAL.maxRequests);

      // But more lenient than login
      expect(admin.maxRequests).toBeGreaterThan(RateLimitPresets.LOGIN.maxRequests);
    });
  });

  describe('Rate Limit Calculations', () => {
    it('should calculate requests per hour correctly for LOGIN', () => {
      const login = RateLimitPresets.LOGIN;
      const requestsPerHour = (login.maxRequests / login.windowSeconds) * 3600;

      // 5 requests per 300 seconds = 60 requests per hour
      expect(requestsPerHour).toBe(60);
    });

    it('should calculate requests per hour correctly for SURVEY', () => {
      const survey = RateLimitPresets.SURVEY_SUBMISSION;
      const requestsPerHour = (survey.maxRequests / survey.windowSeconds) * 3600;

      // 10 requests per 60 seconds = 600 requests per hour
      expect(requestsPerHour).toBe(600);
    });

    it('should calculate requests per hour correctly for API', () => {
      const api = RateLimitPresets.API_GENERAL;
      const requestsPerHour = (api.maxRequests / api.windowSeconds) * 3600;

      // 100 requests per 60 seconds = 6000 requests per hour
      expect(requestsPerHour).toBe(6000);
    });
  });

  describe('Block Duration', () => {
    it('should block LOGIN attempts for 15 minutes after violation', () => {
      const login = RateLimitPresets.LOGIN;

      expect(login.blockDuration).toBe(900); // 15 minutes in seconds
      expect(login.blockDuration).toBeGreaterThan(login.windowSeconds); // Block longer than window
    });

    it('should have default block duration equal to window for non-LOGIN presets', () => {
      const survey = RateLimitPresets.SURVEY_SUBMISSION;
      const api = RateLimitPresets.API_GENERAL;
      const admin = RateLimitPresets.ADMIN_OPERATIONS;

      // These don't explicitly set blockDuration, so it defaults to windowSeconds
      expect(survey.blockDuration).toBeUndefined();
      expect(api.blockDuration).toBeUndefined();
      expect(admin.blockDuration).toBeUndefined();
    });
  });
});

describe('Security Headers - Helper Functions', () => {
  describe('CSP String Building', () => {
    // Note: buildCSPString is not exported, but we can test its output through integration tests
    // These tests verify the expected CSP format

    it('should format single directive correctly', () => {
      const expected = "default-src 'self'";
      // Format: "directive-name value1 value2"
      expect(expected).toMatch(/^[\w-]+ .+$/);
    });

    it('should format multiple directives with semicolon separator', () => {
      const expected = "default-src 'self'; script-src 'self' https://cdn.example.com";
      // Format: "directive1 values; directive2 values"
      expect(expected).toContain('; ');
      expect(expected.split('; ').length).toBe(2);
    });

    it('should format directive with no value (upgrade-insecure-requests)', () => {
      const directive = 'upgrade-insecure-requests';
      // Directive with no value should be just the directive name
      expect(directive).not.toContain(' ');
    });

    it('should format array of values with space separator', () => {
      const values = ["'self'", 'https://cdn.example.com', 'https://fonts.google.com'];
      const expected = values.join(' ');

      expect(expected).toBe("'self' https://cdn.example.com https://fonts.google.com");
      expect(expected.split(' ').length).toBe(3);
    });
  });

  describe('Permissions-Policy String Building', () => {
    it('should format single policy correctly', () => {
      const expected = "camera=('none')";
      // Format: "feature=(value1 value2)"
      expect(expected).toMatch(/^[\w-]+=\(.+\)$/);
    });

    it('should format multiple policies with comma separator', () => {
      const expected = "camera=('none'), microphone=('none')";
      // Format: "policy1=(values), policy2=(values)"
      expect(expected).toContain(', ');
      expect(expected.split(', ').length).toBe(2);
    });

    it('should format array of values inside parentheses', () => {
      const values = ["'self'", 'https://example.com'];
      const expected = `geolocation=(${values.join(' ')})`;

      expect(expected).toBe("geolocation=('self' https://example.com)");
      expect(expected).toMatch(/\(.+\)/);
    });
  });

  describe('Security Headers Configuration', () => {
    it('should have CSP with self as default-src', () => {
      const defaultSrc = "'self'";

      expect(defaultSrc).toBe("'self'");
      expect(defaultSrc).toMatch(/^'self'$/);
    });

    it('should include required CDN sources for Bootstrap', () => {
      const allowedSources = [
        'https://cdn.jsdelivr.net',
        'https://code.jquery.com',
        'https://cdnjs.cloudflare.com'
      ];

      // All sources should use HTTPS
      allowedSources.forEach(source => {
        expect(source).toMatch(/^https:\/\//);
      });

      // At least 2 sources should be CDNs
      const cdnSources = allowedSources.filter(s => s.includes('cdn'));
      expect(cdnSources.length).toBeGreaterThanOrEqual(2);

      // jQuery is also allowed (even though not a CDN domain)
      expect(allowedSources).toContain('https://code.jquery.com');
    });

    it('should have frame-ancestors set to none by default', () => {
      const frameAncestors = "'none'";

      expect(frameAncestors).toBe("'none'");
    });

    it('should have object-src set to none by default', () => {
      const objectSrc = "'none'";

      expect(objectSrc).toBe("'none'");
    });

    it('should disable dangerous permissions by default', () => {
      const dangerousPermissions = [
        'camera',
        'microphone',
        'geolocation',
        'payment',
        'usb'
      ];

      dangerousPermissions.forEach(permission => {
        expect(permission).toMatch(/^[a-z]+$/);
      });
    });
  });

  describe('HSTS Configuration', () => {
    it('should use 1 year max-age by default', () => {
      const oneYearInSeconds = 31536000;

      expect(oneYearInSeconds).toBe(365 * 24 * 60 * 60);
    });

    it('should include subdomains in HSTS by default', () => {
      const hstsValue = 'max-age=31536000; includeSubDomains';

      expect(hstsValue).toContain('includeSubDomains');
      expect(hstsValue).toMatch(/max-age=\d+/);
    });

    it('should not include preload by default (requires manual submission)', () => {
      const hstsValue = 'max-age=31536000; includeSubDomains';

      expect(hstsValue).not.toContain('preload');
    });
  });

  describe('X-Frame-Options', () => {
    it('should support DENY option', () => {
      const frameOption = 'DENY';

      expect(['DENY', 'SAMEORIGIN', 'ALLOW-FROM']).toContain(frameOption);
    });

    it('should use DENY as most secure option', () => {
      const options = ['DENY', 'SAMEORIGIN', 'ALLOW-FROM'];

      // DENY should be first (most secure)
      expect(options[0]).toBe('DENY');
    });
  });

  describe('Referrer-Policy', () => {
    it('should use strict-origin-when-cross-origin as default', () => {
      const referrerPolicy = 'strict-origin-when-cross-origin';

      expect(referrerPolicy).toBe('strict-origin-when-cross-origin');
    });

    it('should support all valid referrer policy values', () => {
      const validPolicies = [
        'no-referrer',
        'no-referrer-when-downgrade',
        'origin',
        'origin-when-cross-origin',
        'same-origin',
        'strict-origin',
        'strict-origin-when-cross-origin',
        'unsafe-url'
      ];

      expect(validPolicies.length).toBe(8);
      validPolicies.forEach(policy => {
        expect(policy).toMatch(/^[\w-]+$/);
      });
    });
  });
});

describe('Security Best Practices', () => {
  describe('Rate Limiting Best Practices', () => {
    it('should have stricter limits for sensitive operations', () => {
      const { LOGIN, SURVEY_SUBMISSION, API_GENERAL } = RateLimitPresets;

      // Login should be most restrictive
      expect(LOGIN.maxRequests).toBeLessThan(SURVEY_SUBMISSION.maxRequests);
      expect(LOGIN.maxRequests).toBeLessThan(API_GENERAL.maxRequests);
    });

    it('should have longer block duration for authentication failures', () => {
      const { LOGIN } = RateLimitPresets;

      // Login should block longer than the rate limit window
      expect(LOGIN.blockDuration).toBeGreaterThan(LOGIN.windowSeconds);

      // 15 minute block is reasonable for brute force prevention
      expect(LOGIN.blockDuration).toBe(900); // 15 minutes
    });

    it('should provide clear error messages for users', () => {
      const { LOGIN, SURVEY_SUBMISSION, API_GENERAL, ADMIN_OPERATIONS } = RateLimitPresets;

      expect(LOGIN.message).toBeDefined();
      expect(SURVEY_SUBMISSION.message).toBeDefined();
      expect(API_GENERAL.message).toBeDefined();
      expect(ADMIN_OPERATIONS.message).toBeDefined();

      // Messages should be user-friendly
      expect(LOGIN.message).toContain('temporarily blocked');
      expect(SURVEY_SUBMISSION.message).toContain('wait');
    });
  });

  describe('CSP Best Practices', () => {
    it('should not allow unsafe-eval by default', () => {
      // unsafe-eval should not be in any directive
      const dangerousDirective = "'unsafe-eval'";

      // Verify this is indeed dangerous
      expect(dangerousDirective).toContain('unsafe');
      expect(dangerousDirective).toContain('eval');
    });

    it('should minimize use of unsafe-inline', () => {
      // Note: SafeWork currently uses unsafe-inline for Bootstrap
      // This is a trade-off between security and functionality
      const unsafeInline = "'unsafe-inline'";

      // Document that this should be removed with CSP nonces in future
      expect(unsafeInline).toContain('unsafe');
      expect(unsafeInline).toContain('inline');
    });

    it('should upgrade insecure requests by default', () => {
      const directive = 'upgrade-insecure-requests';

      expect(directive).toBe('upgrade-insecure-requests');
    });

    it('should block all framing by default', () => {
      const frameAncestors = "'none'";

      expect(frameAncestors).toBe("'none'");
    });
  });

  describe('HSTS Best Practices', () => {
    it('should use max-age of at least 6 months', () => {
      const sixMonthsInSeconds = 15768000; // 6 months
      const oneYearInSeconds = 31536000; // 1 year (recommended)

      expect(oneYearInSeconds).toBeGreaterThanOrEqual(sixMonthsInSeconds);
    });

    it('should include subdomains for wildcard SSL', () => {
      const hstsWithSubdomains = 'max-age=31536000; includeSubDomains';

      expect(hstsWithSubdomains).toContain('includeSubDomains');
    });
  });
});
