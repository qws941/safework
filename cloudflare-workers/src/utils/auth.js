// Authentication utilities
export function hashPassword(password) {
  // In production, use proper hashing like bcrypt
  return password; // Placeholder
}

export function verifyPassword(password, hash) {
  // In production, use proper verification
  return password === hash; // Placeholder
}

export function generateToken() {
  return crypto.randomUUID();
}