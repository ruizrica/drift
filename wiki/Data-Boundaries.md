# Data Boundaries

Drift tracks data access patterns and enforces boundaries around sensitive data, ensuring code only accesses data it's authorized to use.

## Overview

Data boundaries help you:
- Track which code accesses which database tables
- Identify sensitive field access (PII, credentials, financial)
- Enforce access rules with configurable boundaries
- Detect violations before they reach production

---

## Quick Start

```bash
# View data access overview
drift boundaries

# List all discovered tables
drift boundaries tables

# Show access to specific table
drift boundaries table users

# Show what data a file accesses
drift boundaries file src/services/user.ts

# Show all sensitive field access
drift boundaries sensitive

# Check for boundary violations
drift boundaries check

# Generate starter rules
drift boundaries init-rules
```

---

## Commands

### Overview

```bash
drift boundaries
```

Shows summary of data access patterns:

```
🗄️  Data Boundaries

Tables Discovered: 12
Access Points: 234
Sensitive Fields: 18

Top Accessed Tables:
  users            89 access points (23 files)
  orders           67 access points (15 files)
  payments         45 access points (8 files)
  products         34 access points (12 files)
  sessions         23 access points (5 files)

Sensitive Field Access:
  users.email              45 locations
  users.phone              23 locations
  payments.card_number     12 locations
  users.password_hash      8 locations
  users.ssn                3 locations

Run 'drift boundaries table <name>' for details
```

### List Tables

```bash
drift boundaries tables
```

Lists all discovered database tables:

```
🗄️  Discovered Tables
────────────────────────────────────────────────────────────

  users (User)
    89 access points in 23 files
    ⚠ 5 sensitive fields

  orders (Order)
    67 access points in 15 files

  payments (Payment)
    45 access points in 8 files
    ⚠ 3 sensitive fields

  products (Product)
    34 access points in 12 files
```

### Table Details

```bash
drift boundaries table <name>
```

Shows detailed access information for a table:

```bash
drift boundaries table users
```

```
🗄️  Table: users
────────────────────────────────────────────────────────────

Model: User
Fields: id, email, phone, password_hash, created_at, updated_at
Access Points: 89

Sensitive Fields:
  ⚠ email (pii)
  ⚠ phone (pii)
  ⚠ password_hash (credentials)

Access Points:
  src/services/user.ts
    Line 23: read id, email, phone
    Line 45: write email, phone
    Line 67: read password_hash
  
  src/api/users.ts
    Line 12: read id, email
    Line 34: write email
  
  src/auth/login.ts
    Line 56: read email, password_hash
```

### File Access

```bash
drift boundaries file <pattern>
```

Shows what data a file or pattern accesses:

```bash
drift boundaries file src/services/payment.ts
```

```
📁 Data Access: src/services/payment.ts
────────────────────────────────────────────────────────────

src/services/payment.ts
  Tables: payments, users, orders
  Access Points: 12
    Line 23: read payments id, amount, status
    Line 45: write payments status
    Line 67: read users email
    Line 89: read orders total
```

### Sensitive Access

```bash
drift boundaries sensitive
```

Shows all sensitive field access grouped by type:

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

### Check Violations

```bash
drift boundaries check
```

Checks for boundary violations against configured rules:

```
🔍 Boundary Check
────────────────────────────────────────────────────────────

Rules: 3
Violations: 2

Errors (1):
  ✗ src/api/admin.ts:45
    Credentials accessed outside auth services
    → Move password_hash access to src/auth/

Warnings (1):
  ⚠ src/utils/export.ts:23
    Sensitive user data accessed from utility file
    → Consider using a dedicated export service
```

### Initialize Rules

```bash
drift boundaries init-rules
```

Generates a starter `rules.json` file:

```
✓ Created starter rules.json

Location: .drift/boundaries/rules.json

Included rules:
  ● sensitive-data-access
    Sensitive user data should only be accessed from user services
  ● credentials-access
    Credentials should only be accessed from auth services
  ● payment-data-access
    Payment data should only be accessed from payment services

Edit the rules.json file to customize boundaries for your project.
Then run 'drift boundaries check' to validate.
```

---

## Rules Configuration

### rules.json Structure

```json
{
  "version": "1.0",
  "sensitivity": {
    "critical": [
      "users.password_hash",
      "users.ssn",
      "payments.card_number"
    ],
    "sensitive": [
      "users.email",
      "users.phone",
      "users.address"
    ],
    "general": []
  },
  "boundaries": [
    {
      "id": "sensitive-data-access",
      "description": "Sensitive user data should only be accessed from user services",
      "tables": ["users"],
      "fields": ["users.email", "users.phone", "users.address"],
      "allowedPaths": [
        "**/services/user*.ts",
        "**/repositories/user*.ts"
      ],
      "excludePaths": ["**/*.test.ts", "**/tests/**"],
      "severity": "warning",
      "enabled": true
    },
    {
      "id": "credentials-access",
      "description": "Credentials should only be accessed from auth services",
      "fields": ["users.password_hash", "users.ssn"],
      "allowedPaths": [
        "**/services/auth*.ts",
        "**/auth/**"
      ],
      "severity": "error",
      "enabled": true
    }
  ],
  "globalExcludes": [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.d.ts"
  ]
}
```

### Rule Properties

| Property | Description | Required |
|----------|-------------|----------|
| `id` | Unique rule identifier | Yes |
| `description` | Human-readable description | Yes |
| `tables` | Tables this rule applies to | No |
| `fields` | Specific fields this rule applies to | No |
| `allowedPaths` | Glob patterns for allowed access | Yes |
| `excludePaths` | Glob patterns to exclude from checking | No |
| `severity` | `error`, `warning`, or `info` | Yes |
| `enabled` | Whether rule is active | Yes |

### Sensitivity Levels

| Level | Description | Examples |
|-------|-------------|----------|
| `critical` | Highest sensitivity, strictest rules | Passwords, SSN, card numbers |
| `sensitive` | Personal/private data | Email, phone, address |
| `general` | Non-sensitive data | Names, preferences |

---

## Sensitivity Types

Drift automatically classifies sensitive fields:

| Type | Description | Examples |
|------|-------------|----------|
| `pii` | Personally Identifiable Information | email, phone, address, name |
| `credentials` | Authentication data | password_hash, api_key, token |
| `financial` | Financial data | card_number, bank_account, ssn |
| `health` | Health information | medical_record, diagnosis |

---

## MCP Tool

### drift_reachability

Use inverse reachability to find who can access sensitive data:

```typescript
drift_reachability({
  direction: "inverse",
  target: "users.password_hash",
  sensitiveOnly: true
})
```

**Returns:**
```json
{
  "target": "users.password_hash",
  "accessors": [
    {
      "function": "validatePassword",
      "file": "src/auth/login.ts",
      "line": 56,
      "path": ["validatePassword", "login", "POST /api/auth/login"]
    }
  ],
  "entryPoints": [
    "POST /api/auth/login",
    "POST /api/auth/register"
  ]
}
```

---

## Use Cases

### 1. Compliance Auditing

Track PII access for GDPR/CCPA compliance:

```bash
drift boundaries sensitive --format json > pii-audit.json
```

### 2. Security Review

Find all credential access points:

```bash
drift boundaries table users | grep password_hash
```

### 3. Refactoring Safety

Before moving code, check data dependencies:

```bash
drift boundaries file src/services/user.ts
```

### 4. CI/CD Enforcement

Block PRs that violate boundaries:

```yaml
- name: Check Data Boundaries
  run: |
    drift boundaries check --format json > violations.json
    if [ $(jq '.violationCount' violations.json) -gt 0 ]; then
      echo "Data boundary violations found"
      exit 1
    fi
```

---

## Best Practices

### 1. Start with Discovery

Run a scan first to discover data access patterns:

```bash
drift scan
drift boundaries
```

### 2. Define Clear Boundaries

Create rules that match your architecture:

```json
{
  "id": "user-data-boundary",
  "description": "User data only accessible from user domain",
  "tables": ["users", "user_profiles", "user_settings"],
  "allowedPaths": [
    "**/domains/user/**",
    "**/services/user/**"
  ],
  "severity": "error"
}
```

### 3. Exclude Tests

Don't enforce boundaries in test files:

```json
{
  "excludePaths": ["**/*.test.ts", "**/*.spec.ts", "**/tests/**"],
  "globalExcludes": ["**/fixtures/**", "**/mocks/**"]
}
```

### 4. Gradual Enforcement

Start with warnings, then escalate to errors:

```json
{
  "severity": "warning"  // Start here
  // Later change to "error"
}
```

---

## Integration

### With Security Analysis

Boundaries feed into security analysis:

```bash
drift security
# Shows sensitive data access patterns
```

### With Call Graph

Trace data access through call chains:

```bash
drift callgraph reachability --target users.email
```

### With Quality Gates

Add boundary checks to quality gates:

```bash
drift gate --gates security-boundary
```

---

## Next Steps

- [Security Analysis](Security-Analysis) — Comprehensive security review
- [Call Graph Analysis](Call-Graph-Analysis) — Trace data flow
- [Quality Gates](Quality-Gates) — Enforce boundaries in CI
