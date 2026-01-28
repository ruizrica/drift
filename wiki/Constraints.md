# Constraints

Architectural constraints are invariants that MUST be satisfied in your codebase. Drift learns these from your code and enforces them.

## What are Constraints?

Constraints are rules that define how your codebase should be structured:

- **"All API routes must have authentication"**
- **"Controllers cannot import database modules directly"**
- **"Services must be in the services/ directory"**
- **"Error responses must follow the standard format"**

Unlike patterns (which describe HOW you do things), constraints describe what MUST or MUST NOT happen.

---

## Constraint Lifecycle

```
Your Code → Drift Extracts → Discovered → You Review → Approved/Ignored → Enforced
```

1. **Extraction** — Drift analyzes your code and discovers implicit constraints
2. **Discovery** — New constraints await your review
3. **Approval** — You approve constraints that should be enforced
4. **Enforcement** — Drift flags violations in quality gates

---

## Extracting Constraints

Drift can automatically discover constraints from your codebase:

```bash
drift constraints extract
```

**Output:**
```
Constraint Extraction
=====================

Discovered 12 new constraints:

HIGH CONFIDENCE (3):
  auth-required-on-api
    "All /api/* routes use authentication middleware"
    Confidence: 0.95 (47/49 routes)
    
  services-in-services-dir
    "Service classes are located in src/services/"
    Confidence: 0.92 (23/25 services)
    
  error-response-format
    "Error responses use { error: string, code: number } format"
    Confidence: 0.91 (34/37 error handlers)

MEDIUM CONFIDENCE (5):
  ...

LOW CONFIDENCE (4):
  ...

Run 'drift constraints list' to see all constraints.
```

---

## Managing Constraints

### List Constraints

```bash
# List all constraints
drift constraints list

# Filter by status
drift constraints list --status discovered
drift constraints list --status approved

# Filter by category
drift constraints list --category auth
drift constraints list --category structural
```

**Output:**
```
Constraints
===========

APPROVED (5):
  ✓ auth-required-on-api (auth)
    All /api/* routes use authentication middleware
    
  ✓ no-direct-db-in-controllers (structural)
    Controllers cannot import database modules
    
  ✓ services-in-services-dir (structural)
    Service classes in src/services/
    
  ...

DISCOVERED (7):
  ? error-response-format (api)
    Error responses use standard format
    Confidence: 0.91
    
  ? logging-in-services (logging)
    Services use structured logging
    Confidence: 0.85
    
  ...

IGNORED (2):
  ✗ legacy-auth-pattern (auth)
    Ignored: Migrating to new auth system
```

### Show Constraint Details

```bash
drift constraints show auth-required-on-api
```

**Output:**
```
Constraint: auth-required-on-api
================================

Category: auth
Status: approved
Confidence: 0.95

Description:
  All /api/* routes use authentication middleware

Rule:
  Source: src/api/**/*.ts, src/routes/**/*.ts
  Requires: @RequireAuth, @Authenticate, authMiddleware

Evidence (47 locations):
  src/api/users.controller.ts:12 - @RequireAuth()
  src/api/orders.controller.ts:8 - @RequireAuth()
  src/routes/payments.ts:15 - authMiddleware
  ...

Violations (2):
  ⚠️  src/api/health.ts:5 - No auth (intentional?)
  ⚠️  src/api/webhooks.ts:12 - No auth (webhook endpoint)
```

### Approve Constraints

```bash
# Approve a specific constraint
drift constraints approve auth-required-on-api
```

### Ignore Constraints

```bash
# Ignore a constraint
drift constraints ignore legacy-auth-pattern --reason "Migrating to new system"
```

### Verify Files

Check if a file satisfies all constraints:

```bash
drift constraints verify src/api/users.controller.ts
```

**Output:**
```
Constraint Verification: src/api/users.controller.ts
====================================================

✓ auth-required-on-api
  Route has @RequireAuth decorator

✓ no-direct-db-in-controllers
  No database imports found

✓ error-response-format
  Error responses use standard format

⚠️  logging-in-services (discovered, not enforced)
  Missing structured logging

All approved constraints satisfied.
```

### Check All Files

Check all source files against constraints:

```bash
drift constraints check
```

**Options:**
- `-c, --category <category>` — Filter by category
- `--min-confidence <number>` — Minimum confidence threshold

### Export Constraints

Export constraints to a JSON file:

```bash
drift constraints export constraints-backup.json
```

**Options:**
- `-c, --category <category>` — Filter by category
- `-s, --status <status>` — Filter by status

---

## Constraint Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `auth` | Authentication/authorization | Auth middleware required |
| `api` | API design rules | Response format, versioning |
| `structural` | Code organization | File locations, naming |
| `security` | Security requirements | Input validation, sanitization |
| `data` | Data access rules | No direct DB in controllers |
| `error` | Error handling | Standard error format |
| `test` | Testing requirements | Test file locations |
| `logging` | Observability | Structured logging |
| `performance` | Performance rules | Caching requirements |
| `validation` | Input validation | Schema validation |

---

## Custom Constraints

Create custom constraints in `.drift/constraints/custom/`:

```json
{
  "id": "no-console-in-production",
  "name": "No console.log in production code",
  "category": "logging",
  "description": "Use structured logger instead of console.log",
  "rule": {
    "type": "forbidden-pattern",
    "pattern": "console\\.(log|warn|error)\\(",
    "files": "src/**/*.ts",
    "exclude": ["**/*.test.ts", "**/*.spec.ts"]
  },
  "severity": "warning",
  "message": "Use logger.info/warn/error instead of console methods"
}
```

### Rule Types

| Type | Description |
|------|-------------|
| `forbidden-pattern` | Regex pattern that must NOT appear |
| `required-pattern` | Regex pattern that MUST appear |
| `import-restriction` | Module import rules |
| `file-location` | File must be in specific directory |
| `naming-convention` | File/class/function naming rules |
| `dependency-rule` | Module dependency restrictions |

### Import Restriction Example

```json
{
  "id": "no-db-in-controllers",
  "name": "No database imports in controllers",
  "category": "structural",
  "rule": {
    "type": "import-restriction",
    "source": "src/controllers/**/*.ts",
    "forbidden": ["prisma", "@prisma/client", "src/db/**"]
  }
}
```

### File Location Example

```json
{
  "id": "services-location",
  "name": "Services must be in services directory",
  "category": "structural",
  "rule": {
    "type": "file-location",
    "pattern": "*Service.ts",
    "allowedPaths": ["src/services/**", "src/**/services/**"]
  }
}
```

---

## CI Integration

### Quality Gate

Constraints are checked by the `constraint-verification` gate:

```bash
drift gate --gates constraint-verification
```

### GitHub Actions

```yaml
- name: Check Constraints
  run: |
    drift constraints check
    drift gate --gates constraint-verification --format github
```

### Pre-commit Hook

```bash
#!/bin/sh
# .husky/pre-commit

# Check constraints on changed files
drift constraints check
```

---

## MCP Integration

### `drift_constraints` Tool

```json
{
  "action": "list",
  "status": "approved",
  "category": "auth"
}
```

**Actions:**
- `list` — List all constraints
- `show` — Show constraint details (requires `id`)
- `extract` — Discover new constraints from codebase
- `approve` — Approve a constraint (requires `id`)
- `ignore` — Ignore a constraint (requires `id`, optional `reason`)
- `verify` — Verify file against constraints (requires `file`)

**Parameters:**
- `action` — Required. The action to perform
- `id` — Constraint ID for show/approve/ignore actions
- `file` — File path for verify action
- `category` — Filter by category: `api`, `auth`, `data`, `error`, `test`, `security`, `structural`, `performance`, `logging`, `validation`
- `status` — Filter by status: `discovered`, `approved`, `ignored`, `custom`
- `limit` — Max results (default: 20)
- `minConfidence` — Minimum confidence (0-1)
- `reason` — Reason for ignore action

### Example: Check Before Generating Code

```json
{
  "action": "verify",
  "file": "src/api/new-endpoint.ts"
}
```

---

## Best Practices

### 1. Start with High-Confidence Constraints

```bash
drift constraints extract --min-confidence 0.9
drift constraints list --status discovered
# Review and approve individually
drift constraints approve <constraint-id>
```

### 2. Review Discovered Constraints Regularly

```bash
drift constraints list --status discovered
```

### 3. Document Why Constraints Exist

```bash
drift constraints approve auth-required --note "Security requirement per SOC2"
```

### 4. Use Custom Constraints for Team Rules

Create `.drift/constraints/custom/team-rules.json` for rules specific to your team.

### 5. Integrate with CI

```bash
drift gate --gates constraint-verification --fail-on error
```

---

## Troubleshooting

### No constraints discovered

1. Run a full scan first: `drift scan`
2. Check you have enough code for patterns to emerge
3. Lower confidence threshold: `drift constraints extract --min-confidence 0.5`

### Too many false positives

1. Ignore irrelevant constraints: `drift constraints ignore <id>`
2. Add exceptions to custom constraints
3. Adjust confidence thresholds

### Constraint not being enforced

1. Check constraint is approved: `drift constraints show <id>`
2. Verify quality gate includes `constraint-verification`
3. Check file isn't excluded in constraint rule

---

## Next Steps

- [Quality Gates](Quality-Gates) — Enforce constraints in CI
- [Contracts](Contracts) — API contract verification
- [Configuration](Configuration) — Customize constraint settings
