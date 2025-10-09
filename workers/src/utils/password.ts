/**
 * PBKDF2-based password hashing for Cloudflare Workers
 * Uses Web Crypto API (bcrypt not available in Workers environment)
 *
 * Security specifications:
 * - Algorithm: PBKDF2-SHA256
 * - Iterations: 600,000 (OWASP 2023 recommendation)
 * - Salt: 16 bytes (128 bits)
 * - Key length: 32 bytes (256 bits)
 */

const PBKDF2_ITERATIONS = 600000; // OWASP 2023 recommendation for PBKDF2-SHA256
const SALT_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Hash a password using PBKDF2
 * @param password - Plain text password
 * @returns Hash string in format: pbkdf2$iterations$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Import password as key material
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive key using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8 // bits
  );

  // Convert to base64 for storage
  const hashArray = new Uint8Array(hashBuffer);
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...hashArray));

  // Format: pbkdf2$iterations$salt$hash
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltB64}$${hashB64}`;
}

/**
 * Verify a password against a stored hash
 * @param password - Plain text password to verify
 * @param storedHash - Stored hash string
 * @returns True if password matches
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Handle legacy SHA-256 hashes (for backward compatibility during migration)
  if (!storedHash.startsWith('pbkdf2$')) {
    // Legacy SHA-256 verification (should be migrated)
    console.warn('Legacy SHA-256 password hash detected - please migrate to PBKDF2');
    return verifyLegacySHA256(password, storedHash);
  }

  // Parse PBKDF2 hash
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    throw new Error('Invalid hash format');
  }

  const iterations = parseInt(parts[1], 10);
  const saltB64 = parts[2];
  const hashB64 = parts[3];

  // Decode salt and hash
  const salt = new Uint8Array(
    atob(saltB64).split('').map(c => c.charCodeAt(0))
  );
  const expectedHash = new Uint8Array(
    atob(hashB64).split('').map(c => c.charCodeAt(0))
  );

  // Import password as key material
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive key using same parameters
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8 // bits
  );

  // Constant-time comparison
  const actualHash = new Uint8Array(hashBuffer);
  return constantTimeEqual(actualHash, expectedHash);
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

/**
 * Legacy SHA-256 verification (for backward compatibility)
 * WARNING: This is insecure and should only be used during migration
 */
async function verifyLegacySHA256(password: string, hash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hash === hashHex;
}

/**
 * Check if a password meets security requirements
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
