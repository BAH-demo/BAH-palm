# Secure Development Guidelines

> Security best practices for TypeScript/Next.js development in the PALM project, aligned with NIST SP 800-53 and DISA STIG requirements.

## Input Validation (STIG V-220631, NIST SI-10)

All user inputs must be validated using a whitelist approach before processing.

### TypeScript

```typescript
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_INPUT_LENGTH = 255;

function validateEmail(email: string): boolean {
  if (!email || email.length > MAX_INPUT_LENGTH) return false;
  return EMAIL_PATTERN.test(email);
}

function validateUsername(username: string): boolean {
  if (!username || username.length < 3 || username.length > 32) return false;
  return USERNAME_PATTERN.test(username);
}

function sanitizeString(input: string, maxLength = MAX_INPUT_LENGTH): string | null {
  if (!input || input.length > maxLength) return null;
  const sanitized = input.trim().replace(/[<>"';&|`$()]/g, '');
  return sanitized || null;
}
```

## Input Sanitization (STIG V-220632, NIST SI-10)

Use parameterized queries for all database operations. With Prisma ORM, queries are parameterized by default.

### Prisma (Safe by Default)

```typescript
// CORRECT - Prisma handles parameterization
const user = await prisma.user.findUnique({ where: { id: userId } });

// WRONG - Raw query without parameterization
const user = await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = '${userId}'`);

// CORRECT - Parameterized raw query when needed
const user = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;
```

## Authentication (STIG V-220629, NIST IA-2, IA-5)

### Password Requirements

- Minimum 14 characters
- Must include: uppercase, lowercase, digit, special character
- Hash with bcrypt (12 rounds minimum)
- Never store plaintext passwords

### Account Lockout

- Lock account after 5 failed login attempts
- 15-minute lockout duration
- Log all failed attempts with IP address

### Password Validation

```typescript
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 14) {
    return { valid: false, error: 'Password must be at least 14 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain an uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain a lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a digit' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    return { valid: false, error: 'Password must contain a special character' };
  }
  return { valid: true };
}
```

## Session Management (STIG V-220630, NIST AC-12)

- Session timeout: 15 minutes of inactivity
- Bind sessions to originating IP address
- Regenerate session ID after authentication
- Secure cookie flags: `Secure`, `HttpOnly`, `SameSite=Strict`

### Next.js / NextAuth Configuration

```typescript
// next-auth configuration
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 15 * 60, // 15 minutes per STIG V-220630
  },
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: true,
      },
    },
  },
};
```

## Encryption (STIG V-220633, V-220634, NIST SC-8, SC-28)

- **At rest**: AES-256 for all sensitive data
- **In transit**: TLS 1.2+ required for all communications
- **Key management**: Store encryption keys securely via environment variables
- **Disabled protocols**: SSLv2, SSLv3, TLS 1.0, TLS 1.1

## Audit Logging (STIG V-220635, NIST AU-2, AU-3)

Log the following events in structured JSON format:

| Event | When to Log |
|-------|------------|
| `authentication_success` | User successfully authenticates |
| `authentication_failure` | Authentication attempt fails |
| `account_lockout` | Account locked due to failed attempts |
| `authorization_failure` | Access denied to resource |
| `data_access` | Sensitive data read |
| `data_modification` | Data created, updated, or deleted |
| `admin_action` | Privileged operation performed |

### Structured Logging

```typescript
interface AuditLogEntry {
  timestamp: string;
  event_type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  user_id: string;
  ip_address: string;
  outcome: 'success' | 'failure';
  details: Record<string, unknown>;
}

function auditLog(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const log: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(log));
}
```

## Security Headers (STIG V-220641, NIST SI-11)

All HTTP responses must include the following headers. Configure in `next.config.js`:

```javascript
// next.config.js
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Content-Security-Policy', value: "default-src 'self'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

## Error Handling (STIG V-220641, NIST SI-11)

- Return generic error messages to users
- Log detailed errors internally
- Never expose stack traces or internal details

### Next.js API Route

```typescript
export async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await processData(req.body);
    return res.status(200).json({ status: 'ok', data: result });
  } catch (error) {
    console.error('Processing error:', error);
    return res.status(500).json({ error: 'An error occurred' });
  }
}
```

## Secrets Management

- Never hardcode secrets, API keys, or credentials in source code
- Use environment variables loaded from `.env.local` (never committed)
- Use a secret manager in production (AWS Secrets Manager, HashiCorp Vault)
- Ensure `.env*` files are in `.gitignore`

## References

- [NIST SP 800-53 Rev 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [NIST SP 800-207 Zero Trust Architecture](https://csrc.nist.gov/publications/detail/sp/800-207/final)
- [DISA STIGs](https://public.cyber.mil/stigs/)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Federal Security Compliance Framework](https://github.com/COG-GTM/fedreral_security_comliance)
