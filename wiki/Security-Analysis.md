# Security Analysis

Drift tracks sensitive data flows through your codebase, helping you understand and secure data access patterns.

## Overview

Drift's security analysis answers critical questions:

- **Where is sensitive data accessed?** — Find all code that touches PII, credentials, financial data
- **Who can reach sensitive data?** — Trace from entry points to data access
- **Are there boundary violations?** — Detect unauthorized data access
- **What's the attack surface?** — Map entry points to sensitive operations

---

## Sensitive Data Classification

Drift automatically classifies data sensitivity:

| Classification | Examples | Risk Level |
|----------------|----------|------------|
| **CRITICAL** | Passwords, API keys, tokens, secrets | 🔴 Highest |
| **SENSITIVE** | SSN, credit cards, bank accounts | 🔴 High |
| **PII** | Email, phone, address, name, DOB | 🟡 Medium |
| **INTERNAL** | User IDs, internal flags | 🟢 Low |

### Automatic Detection

Drift detects sensitive data by:

1. **Column/field names** — `password`, `ssn`, `credit_card`, `api_key`
2. **Table names** — `users`, `payments`, `credentials`
3. **Patterns** — Email regex, phone patterns, card numbers
4. **Annotations** — `@sensitive`, `@pii`, custom markers

---

## Security Summary

Get an overview of your security posture:

```bash
drift callgraph status --security
```

**Output:**
```
🔒 Security-Prioritized Data Access
────────────────────────────────────────────────────────────

Summary:
  Total Access Points: 47
  🔴 Critical (P0/P1): 8
  🟡 High (P2): 12
  ⚪ Low (P3/P4): 27

Regulatory Implications:
  GDPR, PCI-DSS, HIPAA

🚨 Critical Security Items (P0/P1):
  P0 🔑 users.password_hash
       read password_hash
       src/auth/login.ts:45
       Credentials access - highest priority
       Regulations: PCI-DSS
  ...
```

### MCP Tool: `drift_security_summary`

```json
{
  "focus": "critical",
  "limit": 10
}
```

---

## Finding Sensitive Data Access

### List All Sensitive Access

```bash
drift boundaries sensitive
```

**Output:**
```
🔒 Sensitive Field Access
────────────────────────────────────────────────────────────

CREDENTIALS (8):
  ● users.password_hash
    src/auth/login.ts:56
    src/auth/register.ts:34
    src/services/user.ts:67

PII (68):
  ● users.email
    src/services/user.ts:23
    src/api/users.ts:12
    src/notifications/email.ts:45
  ● users.phone
    src/services/user.ts:23
    src/notifications/sms.ts:12

FINANCIAL (12):
  ● payments.card_number
    src/services/payment.ts:34
    src/checkout/process.ts:56
```

### View Table Access

```bash
# View specific table access
drift boundaries table users

# View all tables
drift boundaries tables
```

---

## Tracing Data Flow

### Forward: "What sensitive data can this code access?"

```bash
drift callgraph reach src/api/users.ts:42
```

**Output:**
```
🔎 Reachability Analysis
────────────────────────────────────────────────────────────

Origin: src/api/users.ts:42
Tables Reachable: users, payment_methods
Functions Traversed: 12
Max Depth: 10

⚠️  Sensitive Fields Accessible:
  ● users.email (pii)
    2 access point(s), 3 path(s)
  ● users.phone (pii)
    1 access point(s), 2 path(s)
  ● payment_methods.card_last_four (financial)
    1 access point(s), 1 path(s)

Data Access Points:
  read users.email, phone
    Path: handleRequest → getUserProfile → fetchUser
  read payment_methods.card_last_four
    Path: handleRequest → getPaymentMethods → fetchPayments
```

### Inverse: "Who can access this sensitive data?"

```bash
drift callgraph inverse users.password_hash
```

**Output:**
```
🔄 Inverse Reachability
────────────────────────────────────────────────────────────

Target: users.password_hash
Direct Accessors: 3
Entry Points That Can Reach: 4

Access Paths:
  🚪 login
     Path: login → verifyPassword
  🚪 register
     Path: register → hashPassword
  🚪 changePassword
     Path: changePassword → verifyPassword
  🚪 resetPassword
     Path: resetPassword → hashPassword
```

---

## Boundary Rules

Define rules for who can access what data:

### Initialize Rules

```bash
drift boundaries init-rules
```

Creates `.drift/boundaries/rules.json`:

```json
{
  "rules": [
    {
      "id": "no-pii-in-logs",
      "description": "PII should not be logged",
      "deny": {
        "source": "src/logging/**",
        "access": ["*.email", "*.phone", "*.ssn", "*.address"]
      }
    },
    {
      "id": "passwords-auth-only",
      "description": "Password access restricted to auth module",
      "allow": {
        "access": ["users.password_hash"],
        "only": ["src/auth/**"]
      }
    },
    {
      "id": "financial-requires-audit",
      "description": "Financial data access must be audited",
      "require": {
        "access": ["payments.*", "transactions.*"],
        "pattern": "audit-logging"
      }
    }
  ]
}
```

### Check Violations

```bash
drift boundaries check
```

**Output:**
```
Boundary Violations
===================

❌ VIOLATION: no-pii-in-logs
   src/logging/request-logger.ts:34 accesses users.email
   Rule: PII should not be logged
   
❌ VIOLATION: passwords-auth-only
   src/admin/debug.ts:12 accesses users.password_hash
   Rule: Password access restricted to auth module
   
⚠️  WARNING: financial-requires-audit
   src/payments/refund.ts:45 accesses payments.* without audit logging
   Rule: Financial data access must be audited

3 violations, 1 warning
```

---

## Security Patterns

Drift detects security-related patterns in your code:

### Authentication Patterns

```bash
drift patterns list --category auth
```

**Detected patterns:**
- JWT token verification
- Session management
- OAuth flows
- API key validation
- Rate limiting

### Input Validation

```bash
drift patterns list --category security
```

**Detected patterns:**
- Input sanitization
- SQL injection prevention
- XSS prevention
- CSRF protection
- Request validation

### Error Handling

```bash
drift error-handling gaps --security
```

**Finds:**
- Sensitive data in error messages
- Stack traces exposed to users
- Missing error handling on auth paths

---

## CI/CD Integration

### Quality Gate: Security Boundary

```bash
drift gate --gates security-boundary
```

**Checks:**
- No new boundary violations
- No unauthenticated access to sensitive data
- No sensitive data in logs
- Audit logging on financial operations

### GitHub Actions Example

```yaml
name: Security Check
on: [pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Drift
        run: npm install -g driftdetect
        
      - name: Scan
        run: drift scan
        
      - name: Security Check
        run: drift boundaries check --ci
        
      - name: Quality Gate
        run: drift gate --gates security-boundary --format github
```

---

## MCP Tools for Security

### `drift_security_summary`

Get security overview:

```json
{
  "focus": "critical",  // all, critical, data-access, auth
  "limit": 10
}
```

### `drift_reachability`

Trace sensitive data:

```json
{
  "direction": "inverse",
  "target": "users.password_hash",
  "sensitiveOnly": true,
  "maxDepth": 10
}
```

### `drift_boundaries`

Check boundaries:

```json
{
  "action": "check",
  "file": "src/api/users.ts"
}
```

---

## Best Practices

### 1. Define Boundaries Early

Create boundary rules before issues arise:

```bash
drift boundaries init-rules
# Edit .drift/boundaries/rules.json
drift boundaries check
```

### 2. Review Sensitive Access Regularly

```bash
# Weekly security review
drift boundaries sensitive --level critical
drift boundaries check
```

### 3. Audit New Endpoints

Before deploying new endpoints:

```bash
# Check what sensitive data the new code can access
drift callgraph reach src/api/new-endpoint.ts --sensitive-only
```

### 4. Integrate with CI

```bash
# Block PRs that violate boundaries
drift gate --gates security-boundary --fail-on warning
```

### 5. Use AI for Security Reviews

Ask your AI agent:

> "Review this endpoint for security issues using Drift"

The AI will call `drift_security_summary` and `drift_reachability` to analyze the code.

---

## Troubleshooting

### "No sensitive data detected"

Drift may not recognize custom sensitive fields. Add them to config:

```json
// .drift/config.json
{
  "security": {
    "sensitivePatterns": [
      "custom_secret_field",
      "*_token",
      "*_key"
    ]
  }
}
```

### "Too many false positives"

Adjust sensitivity or add exceptions:

```json
// .drift/boundaries/rules.json
{
  "exceptions": [
    {
      "file": "src/tests/**",
      "reason": "Test files can access any data"
    }
  ]
}
```

### "Missing data access points"

Some ORMs or custom data access may not be detected. Check:

```bash
drift parser --test
drift boundaries tables
```

If tables are missing, Drift may need framework-specific detection for your ORM.
