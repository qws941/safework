# SafeWork Security Migration Guide

**Created**: 2025-10-09
**Purpose**: Critical security improvements to address vulnerabilities identified in comprehensive audit
**Priority**: 🔴 **CRITICAL - Execute immediately**
**Estimated Time**: 30 minutes
**Downtime**: ~2 minutes (during redeployment)

---

## 🚨 Executive Summary

This guide addresses **4 critical security vulnerabilities** discovered during the automated security audit:

1. **Hardcoded admin password** in `auth.ts:14` (CVSS 9.8 - Critical)
2. **JWT_SECRET plaintext exposure** in `wrangler.toml:32` (CVSS 9.1 - Critical)
3. **Weak password hashing** using SHA-256 without salt (CVSS 7.5 - High)
4. **No rate limiting** allowing unlimited login attempts (CVSS 7.3 - High)

**Status**: ✅ Code fixes implemented, awaiting Cloudflare Secrets configuration

---

## 📋 Table of Contents

1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Step 1: Generate Strong Secrets](#step-1-generate-strong-secrets)
3. [Step 2: Configure Cloudflare Secrets](#step-2-configure-cloudflare-secrets)
4. [Step 3: Deploy Updated Code](#step-3-deploy-updated-code)
5. [Step 4: Verification](#step-4-verification)
6. [Rollback Plan](#rollback-plan)
7. [Post-Migration Tasks](#post-migration-tasks)

---

## Pre-Migration Checklist

Before starting, ensure you have:

- [ ] Access to Cloudflare account with Workers permissions
- [ ] `wrangler` CLI installed and authenticated (`wrangler login`)
- [ ] Current admin password documented (for rehashing)
- [ ] Backup of current deployment (create checkpoint)
- [ ] Notification sent to team about brief downtime

```bash
# Verify wrangler is installed and authenticated
wrangler whoami

# Expected output: You are logged in with email: your-email@example.com
```

---

## Step 1: Generate Strong Secrets

### 1.1 Generate JWT_SECRET

Generate a cryptographically secure random string:

```bash
# Method 1: Using OpenSSL (recommended)
openssl rand -base64 64

# Method 2: Using /dev/urandom
head -c 64 /dev/urandom | base64

# Method 3: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Save the output** - you'll use this in Step 2.

Example output:
```
Kx7Jk8mNp9qRt3sU5vW6xY8zA0bC1dE2fG3hI4jK5lM6nO7pQ8rS9tU0vW1xY2zA3bC4dE5fG6h=
```

### 1.2 Generate ADMIN_PASSWORD_HASH

You need to hash your desired admin password using PBKDF2.

**Option A: Using Node.js Script (Recommended)**

Create a temporary script `hash-password.js`:

```javascript
// hash-password.js
const crypto = require('crypto');

const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

async function hashPassword(password) {
  // Generate random salt
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive key using PBKDF2
  const hash = await new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256',
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      }
    );
  });

  // Format: pbkdf2$iterations$salt$hash
  const saltB64 = salt.toString('base64');
  const hashB64 = hash.toString('base64');

  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltB64}$${hashB64}`;
}

// Usage
const password = process.argv[2];
if (!password) {
  console.error('Usage: node hash-password.js <your-new-password>');
  process.exit(1);
}

hashPassword(password).then(hash => {
  console.log('\n✅ PBKDF2 Hash Generated:');
  console.log(hash);
  console.log('\n⚠️  SECURITY: Store this hash in Cloudflare Secrets immediately');
  console.log('   Delete this script after use');
});
```

Run the script:

```bash
node hash-password.js "YourNewStrongPassword123!@#"

# Expected output:
# ✅ PBKDF2 Hash Generated:
# pbkdf2$600000$Kx7Jk8mNp9qRt3sU5vW6xY8z$zA0bC1dE2fG3hI4jK5lM6nO7pQ8rS9tU0vW1xY2zA3b=
```

**Option B: Using Python Script**

```python
# hash_password.py
import hashlib
import base64
import os
import sys

PBKDF2_ITERATIONS = 600000
SALT_LENGTH = 16
KEY_LENGTH = 32

def hash_password(password: str) -> str:
    salt = os.urandom(SALT_LENGTH)
    hash_bytes = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        PBKDF2_ITERATIONS,
        KEY_LENGTH
    )

    salt_b64 = base64.b64encode(salt).decode('utf-8')
    hash_b64 = base64.b64encode(hash_bytes).decode('utf-8')

    return f"pbkdf2${PBKDF2_ITERATIONS}${salt_b64}${hash_b64}"

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: python hash_password.py <your-new-password>')
        sys.exit(1)

    password = sys.argv[1]
    hashed = hash_password(password)

    print('\n✅ PBKDF2 Hash Generated:')
    print(hashed)
    print('\n⚠️  SECURITY: Store this hash in Cloudflare Secrets immediately')
```

Run the script:

```bash
python hash_password.py "YourNewStrongPassword123!@#"
```

**🔒 Security Best Practices for Admin Password:**

- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, and special characters
- Not based on dictionary words
- Unique to SafeWork system

Example strong password generator:

```bash
# Generate a strong random password
openssl rand -base64 20 | tr -d "=+/" | cut -c1-20
```

**⚠️ IMPORTANT**: Delete the hash generation scripts after use. Never commit them to Git.

---

## Step 2: Configure Cloudflare Secrets

### 2.1 Navigate to Workers Directory

```bash
cd /home/jclee/app/safework/workers
```

### 2.2 Set JWT_SECRET

```bash
wrangler secret put JWT_SECRET --env production
```

When prompted, paste the JWT_SECRET you generated in Step 1.1 and press Enter.

**Expected output**:
```
 ⛅️ wrangler 3.78.12
-------------------
✨ Success! Uploaded secret JWT_SECRET
```

### 2.3 Set ADMIN_PASSWORD_HASH

```bash
wrangler secret put ADMIN_PASSWORD_HASH --env production
```

When prompted, paste the PBKDF2 hash you generated in Step 1.2 and press Enter.

**Expected output**:
```
 ⛅️ wrangler 3.78.12
-------------------
✨ Success! Uploaded secret ADMIN_PASSWORD_HASH
```

### 2.4 Verify Secrets (Optional)

List all configured secrets (values are never displayed):

```bash
wrangler secret list --env production
```

**Expected output**:
```
[
  {
    "name": "JWT_SECRET",
    "type": "secret_text"
  },
  {
    "name": "ADMIN_PASSWORD_HASH",
    "type": "secret_text"
  }
]
```

---

## Step 3: Deploy Updated Code

### 3.1 Review Changes

Verify the security improvements are in place:

```bash
# Check that hardcoded password is removed
grep -n "bingogo1" workers/src/routes/auth.ts
# Expected: No results (empty output)

# Check that JWT_SECRET is removed from wrangler.toml
grep -n "JWT_SECRET.*safework-jwt-secret" workers/wrangler.toml
# Expected: No results (empty output)

# Verify new security middlewares are imported
grep -n "securityHeaders\|rateLimiter" workers/src/index.ts
# Expected: Lines showing imports and usage
```

### 3.2 Type Check

```bash
cd workers/
npm run type-check
```

**Expected output**:
```
> type-check
> tsc --noEmit

✅ No errors found
```

### 3.3 Run Tests

```bash
npm test
```

**Expected output**:
```
 ✓ src/utils/password.test.ts (5)
   ✓ PBKDF2 Password Hashing
     ✓ should hash password correctly
     ✓ should verify password correctly
     ✓ should reject incorrect password
     ✓ should handle legacy SHA-256 hashes
     ✓ should validate password strength

Test Files  1 passed (1)
     Tests  5 passed (5)
```

### 3.4 Deploy to Production

```bash
npm run deploy:prod
```

**Expected output**:
```
 ⛅️ wrangler 3.78.12
-------------------
Total Upload: 285.42 KiB / gzip: 75.18 KiB
Uploaded safework (2.34 sec)
Published safework (2.87 sec)
  https://safework.jclee.me
Current Deployment ID: 89a7c3f2-4b5e-4d6f-8a1b-9c0d1e2f3g4h
```

**⏱️ Downtime Window**: Approximately 2-3 seconds during deployment.

---

## Step 4: Verification

### 4.1 Health Check

```bash
curl -s https://safework.jclee.me/api/health | jq
```

**Expected output**:
```json
{
  "status": "healthy",
  "platform": "Cloudflare Workers",
  "environment": "production"
}
```

### 4.2 Verify Security Headers

```bash
curl -I https://safework.jclee.me/api/health
```

**Expected headers**:
```
HTTP/2 200
content-type: application/json; charset=UTF-8
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
x-frame-options: DENY
x-content-type-options: nosniff
strict-transport-security: max-age=31536000; includeSubDomains
referrer-policy: strict-origin-when-cross-origin
permissions-policy: accelerometer=('none'), camera=('none'), ...
x-xss-protection: 1; mode=block
```

### 4.3 Verify Rate Limiting

Test login rate limiting (should block after 5 attempts):

```bash
for i in {1..6}; do
  echo "Attempt $i:"
  curl -s -X POST https://safework.jclee.me/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}' | jq -r '.error'
  sleep 1
done
```

**Expected output**:
```
Attempt 1: Invalid credentials
Attempt 2: Invalid credentials
Attempt 3: Invalid credentials
Attempt 4: Invalid credentials
Attempt 5: Invalid credentials
Attempt 6: Too many login attempts. Your IP has been temporarily blocked for 15 minutes.
```

### 4.4 Test Admin Login

```bash
curl -X POST https://safework.jclee.me/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourNewStrongPassword123!@#"}' | jq
```

**Expected output**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "is_admin": true
  },
  "redirect": "/api/admin/dashboard"
}
```

### 4.5 Verify PBKDF2 Password Hashing

Check Cloudflare Workers logs for successful PBKDF2 verification:

```bash
wrangler tail --env production --format pretty
```

Then trigger a login. Look for log entries confirming PBKDF2 verification (no "Legacy SHA-256" warnings).

---

## Rollback Plan

If any issues occur during migration, follow this rollback procedure:

### Option A: Quick Rollback (Restore Previous Deployment)

```bash
# List recent deployments
wrangler deployments list --env production

# Rollback to previous deployment
wrangler rollback --deployment-id <PREVIOUS_DEPLOYMENT_ID> --env production
```

### Option B: Revert Code Changes

```bash
cd /home/jclee/app/safework
git stash
# Or restore from checkpoint if using Claude Code checkpointing
```

Then redeploy:

```bash
cd workers/
npm run deploy:prod
```

### Option C: Emergency Admin Access

If admin login fails after migration, temporarily add a fallback:

1. Add a temporary secret with the old SHA-256 hash:
   ```bash
   wrangler secret put ADMIN_LEGACY_HASH --env production
   # Enter the old SHA-256 hash when prompted
   ```

2. Modify `auth.ts` to check both hashes (temporary fix only)

3. Redeploy and fix the issue

4. Remove the temporary secret

---

## Post-Migration Tasks

### Immediate (Within 24 hours)

- [ ] **Update password management documentation**
  - Document new admin password in secure password manager (1Password, LastPass, etc.)
  - Share with authorized personnel using secure channels

- [ ] **Revoke old credentials**
  - Old hardcoded password `bingogo1` is no longer valid
  - Verify no git history leaks remain in public repositories

- [ ] **Monitor rate limiting**
  - Check Cloudflare Workers logs for rate limit events
  - Adjust thresholds if legitimate users are being blocked

- [ ] **Security scan**
  - Re-run automated security audit
  - Verify no hardcoded secrets remain: `git grep -i "secret\|password\|key" workers/`

### Week 1

- [ ] **Migrate database users to PBKDF2**
  - Create migration script for existing users in D1 database
  - Rehash all SHA-256 passwords to PBKDF2 format
  - Notify users to update passwords on next login

- [ ] **Enable monitoring alerts**
  - Set up Cloudflare Workers log alerts for security events
  - Configure Slack/email notifications for rate limit violations

- [ ] **Document incident response**
  - Create `SECURITY.md` with vulnerability reporting procedure
  - Define escalation path for security incidents

### Month 1

- [ ] **Regular security audits**
  - Schedule monthly automated security scans
  - Review rate limiting effectiveness

- [ ] **Implement JWT refresh tokens**
  - Add refresh token mechanism for better session management
  - Store refresh tokens in KV with expiration

- [ ] **Add security logging**
  - Log all admin operations to KV for audit trail
  - Implement alerting for suspicious activity patterns

---

## Security Improvements Summary

### Before Migration (Security Score: 55.6/100 - F)

| Issue | Status |
|-------|--------|
| Hardcoded password | ❌ `if (password === 'bingogo1')` in code |
| JWT Secret | ❌ Plaintext in `wrangler.toml` |
| Password Hashing | ❌ SHA-256 without salt |
| Rate Limiting | ❌ None |
| Security Headers | ❌ Missing (CSP, HSTS, etc.) |

### After Migration (Expected Score: 90/100 - A-)

| Issue | Status |
|-------|--------|
| Hardcoded password | ✅ Removed, using Cloudflare Secrets |
| JWT Secret | ✅ Stored in Cloudflare Secrets |
| Password Hashing | ✅ PBKDF2-SHA256 (600k iterations) |
| Rate Limiting | ✅ 5 attempts per 5 min (login) |
| Security Headers | ✅ CSP, HSTS, X-Frame-Options, etc. |

---

## Troubleshooting

### Issue: "Error 1101: Worker threw JavaScript exception"

**Cause**: Missing Cloudflare Secrets (JWT_SECRET or ADMIN_PASSWORD_HASH)

**Solution**:
```bash
# Verify secrets are configured
wrangler secret list --env production

# If missing, add them
wrangler secret put JWT_SECRET --env production
wrangler secret put ADMIN_PASSWORD_HASH --env production
```

### Issue: Admin login fails with "Invalid credentials"

**Cause**: Incorrect PBKDF2 hash or password

**Solution**:
1. Regenerate PBKDF2 hash with correct password
2. Update Cloudflare Secret:
   ```bash
   wrangler secret put ADMIN_PASSWORD_HASH --env production
   ```
3. Redeploy if necessary

### Issue: Rate limiting blocking legitimate users

**Cause**: Rate limit thresholds too strict

**Solution**:
Edit `workers/src/middleware/rateLimiter.ts`:
```typescript
export const RateLimitPresets = {
  LOGIN: {
    maxRequests: 10, // Increase from 5
    windowSeconds: 300,
    // ...
  }
}
```

Redeploy:
```bash
npm run deploy:prod
```

---

## Compliance & Audit Trail

**Migration Performed By**: Claude Code Autonomous System
**Date**: 2025-10-09
**Audit Report**: `COMPREHENSIVE_QUALITY_REPORT.md`
**Security Report**: `SECURITY_CORS_VERIFICATION_REPORT.md`

**Compliance Standards Addressed**:
- ✅ OWASP Top 10 2021 - A02:2021 (Cryptographic Failures)
- ✅ OWASP Top 10 2021 - A04:2021 (Insecure Design)
- ✅ OWASP Top 10 2021 - A07:2021 (Identification and Authentication Failures)
- ✅ CWE-798 (Use of Hard-coded Credentials)
- ✅ CWE-326 (Inadequate Encryption Strength)
- ✅ CWE-307 (Improper Restriction of Excessive Authentication Attempts)

---

## Next Steps

After successful migration, proceed with:

1. **Week 2-3**: Complete Forms 003-006 implementation (see `COMPREHENSIVE_QUALITY_REPORT.md`)
2. **Week 4-5**: CI/CD improvements (staging environment, auto-rollback)
3. **Month 2**: Performance optimization and monitoring integration

**Target Overall Security Score**: 90/100 (A-) by Week 2

---

## Support

If you encounter issues during migration:

1. Check Cloudflare Workers logs: `wrangler tail --env production`
2. Review comprehensive quality report: `COMPREHENSIVE_QUALITY_REPORT.md`
3. Consult security verification report: `SECURITY_CORS_VERIFICATION_REPORT.md`
4. Contact DevOps team or create GitHub issue with `security` label

---

**Document Status**: ✅ Ready for production migration
**Last Updated**: 2025-10-09
**Review Schedule**: Update after successful migration
