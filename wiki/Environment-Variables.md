# Environment Variables

Drift analyzes how your code accesses environment variables, classifies their sensitivity, and helps prevent security issues.

## Overview

Drift scans your codebase to find:

- **All environment variable access** — Every `process.env`, `os.environ`, etc.
- **Sensitivity classification** — Secrets, credentials, config
- **Required vs optional** — Variables with/without defaults
- **Access patterns** — Which code accesses which variables

---

## Scanning for Environment Variables

```bash
drift env scan
```

**Output:**
```
🔍 Scanning for environment variable access...

✓ Scan complete

Files scanned: 234
Variables found: 47
Access points: 156
Secrets detected: 8
Duration: 1234ms

⚠️  8 secret variables detected
Run 'drift env secrets' to see details
```

---

## Viewing Environment Variables

### Overview

```bash
drift env
```

Shows a summary of all discovered environment variables with sensitivity breakdown.

### List All Variables

```bash
drift env list
```

**Output:**
```
🔐 Environment Variables
─────────────────────────────────────────────────────────────────

  DATABASE_URL (required)
    8 access points in 3 files

  JWT_SECRET (required)
    4 access points in 2 files

  PORT
    2 access points in 1 files
```

### Filter by Sensitivity

```bash
# Only secrets
drift env list -s secret

# Only credentials
drift env list -s credential

# Only config
drift env list -s config
```

### View Secrets Only

```bash
drift env secrets
```

**Output:**
```
🔴 Secret Environment Variables
═════════════════════════════════════════════════════════════════

⚠️  These variables contain sensitive data. Ensure they are:
    • Never committed to git
    • Stored securely (vault, secrets manager)
    • Rotated regularly

Variable              Accessed By                    Classification
──────────────────────────────────────────────────────────────────
DATABASE_URL          src/db/connection.ts:12        database-credential
JWT_SECRET            src/auth/jwt.ts:8              auth-secret
STRIPE_SECRET_KEY     src/payments/stripe.ts:15      api-key
AWS_SECRET_ACCESS_KEY src/storage/s3.ts:23           cloud-credential
SENDGRID_API_KEY      src/email/sendgrid.ts:10       api-key
ENCRYPTION_KEY        src/crypto/encrypt.ts:5        encryption-key
GITHUB_TOKEN          src/integrations/github.ts:5   api-token
SLACK_WEBHOOK_SECRET  src/webhooks/slack.ts:8        webhook-secret
```

### View Required Variables

```bash
drift env required
```

Shows variables that have no default and will crash if missing.

---

## Variable Details

### View Specific Variable

```bash
drift env var DATABASE_URL
```

**Output:**
```
🔐 Variable: DATABASE_URL
─────────────────────────────────────────────────────────────────

Sensitivity: secret
Has Default: no
Required: yes
Access Points: 3

Access Points:
  src/db/connection.ts
    Line 12: process.env 
  src/db/migrations.ts
    Line 5: requireEnv (has default)
```

### View Variables by File

```bash
drift env file src/config.ts
```

**Output:**
```
📁 Environment Access: src/config.ts
─────────────────────────────────────────────────────────────────

src/config.ts
  Variables: NODE_ENV, PORT, DATABASE_URL, REDIS_URL
  ⚠ Sensitive: DATABASE_URL, REDIS_URL
    Line 3: NODE_ENV via process.env
    Line 5: PORT via process.env
    Line 8: DATABASE_URL via process.env
```

### View Required Variables

```bash
drift env required
```

Shows variables that have no default and will crash if missing.

---

## Sensitivity Classification

Drift automatically classifies variables by sensitivity:

### 🔴 Secrets (Highest Risk)

Variables that could cause immediate security breach if exposed:

| Pattern | Examples |
|---------|----------|
| `*_SECRET*` | JWT_SECRET, CLIENT_SECRET |
| `*_KEY` | API_KEY, ENCRYPTION_KEY |
| `*_TOKEN` | ACCESS_TOKEN, GITHUB_TOKEN |
| `*PASSWORD*` | DB_PASSWORD, SMTP_PASSWORD |
| `*_PRIVATE*` | PRIVATE_KEY |

### 🟡 Credentials (High Risk)

Variables that provide access to services:

| Pattern | Examples |
|---------|----------|
| `*_URL` (with auth) | DATABASE_URL, REDIS_URL |
| `*_CONNECTION*` | CONNECTION_STRING |
| `*_ACCOUNT*` | SERVICE_ACCOUNT |
| `*_CREDENTIAL*` | AWS_CREDENTIAL |

### 🟢 Config (Lower Risk)

Configuration that doesn't provide access:

| Pattern | Examples |
|---------|----------|
| `PORT`, `HOST` | PORT, API_HOST |
| `*_ENV` | NODE_ENV, APP_ENV |
| `*_LEVEL` | LOG_LEVEL |
| `FEATURE_*` | FEATURE_NEW_UI |
| `*_ENABLED` | DEBUG_ENABLED |

---

## Language Support

Drift detects environment variable access in all supported languages:

### TypeScript/JavaScript

```typescript
process.env.DATABASE_URL
process.env['API_KEY']
const { PORT } = process.env
```

### Python

```python
os.environ['DATABASE_URL']
os.environ.get('API_KEY')
os.getenv('PORT', '3000')
```

### Java

```java
System.getenv("DATABASE_URL")
System.getProperty("api.key")
```

### Go

```go
os.Getenv("DATABASE_URL")
os.LookupEnv("API_KEY")
```

### C#

```csharp
Environment.GetEnvironmentVariable("DATABASE_URL")
Configuration["ApiKey"]
```

### PHP

```php
$_ENV['DATABASE_URL']
getenv('API_KEY')
env('PORT', 3000)
```

### Rust

```rust
std::env::var("DATABASE_URL")
std::env::var_os("API_KEY")
```

---

## MCP Integration

### `drift_env` Tool

```typescript
drift_env({
  action: "overview" | "list" | "secrets" | "required" | "variable" | "file",
  variable?: string,      // For action="variable"
  file?: string,          // For action="file"
  sensitivity?: "secret" | "credential" | "config",  // For action="list"
  limit?: number          // Max items to return
})
```

**Actions:**
- `overview` — Summary of all variables (default)
- `list` — List all variables with optional sensitivity filter
- `secrets` — Show only secret and credential variables
- `required` — Show required variables without defaults
- `variable` — Details for specific variable (requires `variable` parameter)
- `file` — Variables accessed by file pattern (requires `file` parameter)

---

## CI Integration

### Check for Secrets

```bash
drift env secrets --format json
```

Use in CI to detect sensitive environment variables and ensure they're properly managed.

### JSON Output for Automation

```bash
drift env list --format json
drift env secrets --format json
drift env required --format json
```

All commands support `--format json` for CI/CD integration.

---

## Best Practices

### 1. Never Commit Secrets

Add to `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
```

### 2. Use .env.example

Commit a template without values:

```bash
drift env export --format env-example > .env.example
git add .env.example
```

### 3. Validate Required Variables

Check all required variables exist at startup:

```typescript
// Drift detects this pattern
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}
```

### 4. Use Secrets Manager

For production, use a secrets manager:
- AWS Secrets Manager
- HashiCorp Vault
- Google Secret Manager
- Azure Key Vault

### 5. Rotate Secrets Regularly

Track when secrets were last rotated and set reminders.

---

## Troubleshooting

### Variables not detected

1. Check file is being scanned (not in `.driftignore`)
2. Check language is supported
3. Run `drift env scan --verbose`

### Wrong sensitivity classification

Add custom patterns in `.drift/config.json`:

```json
{
  "environment": {
    "sensitivePatterns": {
      "secret": ["*_PRIVATE_*", "MY_SECRET_*"],
      "credential": ["*_CONN_*"],
      "config": ["*_SETTING"]
    }
  }
}
```

---

## Next Steps

- [Security Analysis](Security-Analysis) — Sensitive data tracking
- [Configuration](Configuration) — Drift configuration
- [Quality Gates](Quality-Gates) — Enforce security in CI
