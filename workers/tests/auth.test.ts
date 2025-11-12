import { describe, it, expect, beforeAll } from 'vitest';
import { hashPassword } from '../src/utils/password';

/**
 * Authentication Routes Tests
 * Tests for /api/auth endpoints including login, register, JWT, refresh, verify
 *
 * Coverage target: auth.ts (385 LOC) → 70-80% coverage
 */

const BASE_URL = 'https://safework.jclee.me';

// Mock environment for unit tests
const UNSTABLE_DEV_SESSION_ID = process.env.UNSTABLE_DEV_SESSION_ID || '';

describe('Authentication - Password Utilities', () => {
  it('should hash passwords with PBKDF2', async () => {
    const password = 'TestPassword123!@#';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(50); // PBKDF2 hashes are long
    expect(hash).toMatch(/^pbkdf2\$/); // Format: pbkdf2$iterations$salt$hash
    expect(hash.split('$').length).toBe(4); // 4 parts separated by $
  });

  it('should produce different hashes for same password (salted)', async () => {
    const password = 'TestPassword123!@#';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2); // Different salts
  });
});

describe.skip('Authentication - Registration (/api/auth/register)', () => {
  const validUser = {
    username: `testuser${Date.now()}`, // Unique username
    password: 'ValidPass123!@#',
    email: `test${Date.now()}@example.com`,
    full_name: 'Test User',
  };

  describe('Valid Registration', () => {
    it('should register new user with valid credentials', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validUser),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(validUser.username);
      expect(data.user.is_admin).toBe(false);
      expect(data.redirect).toBe('/');
    });

    it('should auto-login after registration (return JWT token)', async () => {
      const uniqueUser = {
        ...validUser,
        username: `autouser${Date.now()}`,
        email: `auto${Date.now()}@example.com`,
      };

      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uniqueUser),
      });

      const data = await response.json();

      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe('string');
      expect(data.token.split('.').length).toBe(3); // JWT format: header.payload.signature
    });
  });

  describe('Username Validation', () => {
    it('should reject missing username', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'ValidPass123!@#' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Username and password are required');
    });

    it('should reject username too short (<3 chars)', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ab',
          password: 'ValidPass123!@#',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('3-30 characters');
    });

    it('should reject username too long (>30 chars)', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'a'.repeat(31),
          password: 'ValidPass123!@#',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('3-30 characters');
    });

    it('should reject username with special characters', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test@user#',
          password: 'ValidPass123!@#',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('alphanumeric');
    });

    it('should accept username with underscore and hyphen', async () => {
      const uniqueUser = {
        ...validUser,
        username: `test_user-${Date.now()}`,
        email: `underscore${Date.now()}@example.com`,
      };

      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uniqueUser),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject duplicate username', async () => {
      // Register first time
      const uniqueUsername = `duplicate${Date.now()}`;
      await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validUser,
          username: uniqueUsername,
        }),
      });

      // Try to register again with same username
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validUser,
          username: uniqueUsername,
          email: `different${Date.now()}@example.com`,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Username already exists');
    });
  });

  describe('Password Validation', () => {
    it('should reject missing password', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: `user${Date.now()}` }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Username and password are required');
    });

    it('should reject password too short (<12 chars)', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `shortpw${Date.now()}`,
          password: 'Short1!',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Password does not meet security requirements');
      expect(data.details).toContain('at least 12 characters');
    });

    it('should reject password without lowercase', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `nolower${Date.now()}`,
          password: 'NOLOWERCASE123!@#',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toContain('lowercase');
    });

    it('should reject password without uppercase', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `noupper${Date.now()}`,
          password: 'nouppercase123!@#',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toContain('uppercase');
    });

    it('should reject password without number', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `nonum${Date.now()}`,
          password: 'NoNumbersHere!@#',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toContain('number');
    });

    it('should reject password without special character', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `nospecial${Date.now()}`,
          password: 'NoSpecialChars123',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toContain('special character');
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email format', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validUser,
          username: `validmail${Date.now()}`,
          email: `valid${Date.now()}@example.com`,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validUser,
          username: `invalidmail${Date.now()}`,
          email: 'not-an-email',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid email format');
    });

    it('should allow registration without email (optional field)', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `noemail${Date.now()}`,
          password: 'ValidPass123!@#',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject duplicate email', async () => {
      const uniqueEmail = `duplicate${Date.now()}@example.com`;

      // Register first time
      await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validUser,
          username: `first${Date.now()}`,
          email: uniqueEmail,
        }),
      });

      // Try to register again with same email
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validUser,
          username: `second${Date.now()}`,
          email: uniqueEmail,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Email already registered');
    });
  });
});

describe.skip('Authentication - Login (/api/auth/login)', () => {
  let testUser: { username: string; password: string };

  beforeAll(async () => {
    // Create a test user for login tests
    testUser = {
      username: `logintest${Date.now()}`,
      password: 'LoginTest123!@#',
    };

    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...testUser,
        email: `logintest${Date.now()}@example.com`,
      }),
    });
  });

  describe('Valid Login', () => {
    it('should login with correct credentials', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(testUser.username);
    });

    it('should return JWT token with correct format', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      const data = await response.json();

      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe('string');
      expect(data.token.split('.').length).toBe(3); // JWT format
    });
  });

  describe('Invalid Login', () => {
    // Helper to avoid rate limiting
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    it('should reject missing username', async () => {
      await sleep(3000); // 3s delay to avoid rate limiting
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'SomePassword123!@#' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Username and password are required');
    });

    it('should reject missing password', async () => {
      await sleep(3000); // 3s delay to avoid rate limiting
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUser.username }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Username and password are required');
    });

    it('should reject wrong password', async () => {
      await sleep(3000); // 3s delay to avoid rate limiting
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUser.username,
          password: 'WrongPassword123!@#',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid credentials');
    });

    it('should reject non-existent username', async () => {
      await sleep(3000); // 3s delay to avoid rate limiting
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'nonexistentuser12345',
          password: 'SomePassword123!@#',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid credentials');
    });
  });
});

describe.skip('Authentication - Token Verification (/api/auth/verify)', () => {
  let validToken: string;

  // Helper to avoid rate limiting
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  beforeAll(async () => {
    await sleep(3000); // 3s delay to avoid rate limiting

    // Get a valid token
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `verifytest${Date.now()}`,
        password: 'VerifyTest123!@#',
      }),
    });

    // If login fails (user doesn't exist), register first
    if (loginResponse.status === 401) {
      const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `verifytest${Date.now()}`,
          password: 'VerifyTest123!@#',
          email: `verify${Date.now()}@example.com`,
        }),
      });

      const registerData = await registerResponse.json();
      validToken = registerData.token;
    } else {
      const loginData = await loginResponse.json();
      validToken = loginData.token;
    }
  });

  it('should verify valid token', async () => {
    await sleep(3000); // 3s delay to avoid rate limiting

    const response = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${validToken}`,
      },
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
  });

  it('should reject missing token', async () => {
    await sleep(3000); // 3s delay to avoid rate limiting

    const response = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'GET',
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.valid).toBe(false);
  });

  it('should reject malformed token', async () => {
    await sleep(3000); // 3s delay to avoid rate limiting

    const response = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid.token.here',
      },
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.valid).toBe(false);
  });

  it('should reject token without Bearer prefix', async () => {
    await sleep(3000); // 3s delay to avoid rate limiting

    const response = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': validToken, // Missing "Bearer " prefix
      },
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.valid).toBe(false);
  });
});

describe.skip('Authentication - Token Refresh (/api/auth/refresh)', () => {
  let validToken: string;

  // Helper to avoid rate limiting
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  beforeAll(async () => {
    await sleep(3000); // 3s delay to avoid rate limiting

    // Create user and get token
    const uniqueUsername = `refreshtest${Date.now()}`;
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: uniqueUsername,
        password: 'RefreshTest123!@#',
        email: `refresh${Date.now()}@example.com`,
      }),
    });

    const data = await response.json();
    validToken = data.token;
  });

  it('should refresh valid token', async () => {
    await sleep(3000); // 3s delay to avoid rate limiting

    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validToken}`,
      },
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.token).not.toBe(validToken); // New token should be different
    expect(data.user).toBeDefined();
  });

  it('should return new token with extended expiry', async () => {
    await sleep(3000); // 3s delay to avoid rate limiting

    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validToken}`,
      },
    });

    const data = await response.json();

    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe('string');
    expect(data.token.split('.').length).toBe(3); // JWT format
  });

  it('should reject missing token', async () => {
    await sleep(3000); // 3s delay to avoid rate limiting

    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('No token provided');
  });

  it('should reject invalid token', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid.token.here',
      },
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid token');
  });
});

describe.skip('Authentication - Logout (/api/auth/logout)', () => {
  it('should return success on logout', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('Logged out successfully');
  });

  it('should logout without token (stateless JWT)', async () => {
    // Logout is client-side in stateless JWT system
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
    });

    expect(response.status).toBe(200);
  });
});
