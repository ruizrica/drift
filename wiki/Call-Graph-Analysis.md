# Call Graph Analysis

Drift builds a complete call graph of your codebase, enabling powerful data flow analysis and impact assessment.

## What is a Call Graph?

A call graph maps every function call in your codebase:

```
main()
  ├── handleRequest()
  │     ├── validateInput()
  │     ├── authenticate()
  │     │     └── verifyToken()
  │     └── processData()
  │           ├── fetchUser()
  │           │     └── db.query("SELECT * FROM users")
  │           └── updateRecord()
  │                 └── db.query("UPDATE users SET...")
  └── sendResponse()
```

This enables Drift to answer questions like:
- "What data can this code access?"
- "Who can access this sensitive data?"
- "What's the blast radius if I change this function?"

---

## Building the Call Graph

```bash
# Build call graph (happens automatically during scan)
drift scan

# Or build explicitly
drift callgraph build

# Check status
drift callgraph status

# Security-prioritized view (P0-P4 tiers)
drift callgraph status --security
```

**Output:**
```
Call Graph Status
=================

Files analyzed: 247
Functions extracted: 1,842
Calls mapped: 5,631
Data access points: 312

Languages:
  TypeScript: 189 files, 1,456 functions
  Python: 58 files, 386 functions

Frameworks detected:
  Express: 45 route handlers
  Prisma: 89 data access points
  FastAPI: 23 endpoints
```

---

## Forward Reachability

**"What data can this code access?"**

Starting from a code location, trace forward to see all data it can reach:

```bash
# From a specific line
drift callgraph reach src/api/users.ts:42

# From a function
drift callgraph reach handleUserUpdate

# Limit traversal depth
drift callgraph reach src/api/users.ts:42 --max-depth 5
```

**Example Output:**
```
Forward Reachability from src/api/users.ts:42
=============================================

Direct Access (depth 1):
  → users.email (PII)
  → users.name (PII)
  → users.updated_at

Via fetchUserProfile (depth 2):
  → users.password_hash (SENSITIVE)
  → users.phone (PII)
  → sessions.token (SENSITIVE)

Via updateUserPreferences (depth 3):
  → preferences.* 
  → audit_log.* 

Total: 12 data points reachable
  - 4 PII fields
  - 2 SENSITIVE fields
  - 6 regular fields
```

### MCP Tool: `drift_reachability`

```json
{
  "direction": "forward",
  "location": "src/api/users.ts:42",
  "maxDepth": 10,
  "sensitiveOnly": true,
  "limit": 15
}
```

---

## Inverse Reachability

**"Who can access this data?"**

Starting from a data point, trace backward to find all code that can access it:

```bash
# Who can access password hashes?
drift callgraph inverse users.password_hash

# Who can access any user data?
drift callgraph inverse users

# Limit depth
drift callgraph inverse users.email --max-depth 5
```

**Example Output:**
```
Inverse Reachability to users.password_hash
===========================================

Direct Access:
  ← src/auth/login.ts:verifyPassword (line 45)
  ← src/auth/register.ts:hashPassword (line 23)
  ← src/admin/users.ts:resetPassword (line 89)

Indirect Access (via verifyPassword):
  ← src/api/auth.controller.ts:login (line 34)
  ← src/api/auth.controller.ts:changePassword (line 78)

Entry Points:
  POST /api/auth/login
  POST /api/auth/change-password
  POST /api/admin/users/:id/reset-password

⚠️  Warning: 3 entry points can reach sensitive data
```

### MCP Tool: `drift_reachability`

```json
{
  "direction": "inverse",
  "target": "users.password_hash",
  "maxDepth": 10,
  "limit": 15
}
```

---

## Impact Analysis

**"What breaks if I change this?"**

Before making changes, understand the blast radius:

```bash
# Analyze impact of changing a file
drift callgraph impact src/auth/login.ts

# Analyze impact of changing a function
drift callgraph impact verifyToken

# Find dead code (functions never called)
drift callgraph dead

# Analyze test coverage for sensitive data
drift callgraph coverage
```

**Example Output:**
```
Impact Analysis: src/auth/login.ts
==================================

Direct Callers (12):
  src/api/auth.controller.ts:login
  src/api/auth.controller.ts:refreshToken
  src/middleware/auth.ts:requireAuth
  ...

Indirect Callers (47):
  All routes using @RequireAuth middleware
  
Affected Tests (8):
  tests/auth/login.test.ts
  tests/api/auth.controller.test.ts
  tests/middleware/auth.test.ts
  tests/e2e/auth-flow.test.ts
  ...

Entry Points Affected (23):
  All authenticated API endpoints

Risk Assessment: HIGH
  - Core authentication function
  - 23 entry points depend on this
  - Recommend comprehensive testing
```

### MCP Tool: `drift_impact_analysis`

```json
{
  "target": "src/auth/login.ts",
  "maxDepth": 10,
  "limit": 10
}
```

---

## Function Details

Get detailed information about a specific function:

```bash
drift callgraph function handleUserUpdate
```

**Output:**
```
Function: handleUserUpdate
==========================

Location: src/services/user.service.ts:45-89
Signature: async handleUserUpdate(userId: string, data: UpdateUserDTO): Promise<User>

Calls (8):
  → validateUpdateData (src/validators/user.ts:12)
  → fetchUser (src/repositories/user.ts:34)
  → checkPermissions (src/auth/permissions.ts:56)
  → updateUser (src/repositories/user.ts:78)
  → invalidateCache (src/cache/user.ts:23)
  → publishEvent (src/events/user.ts:45)
  → logAudit (src/audit/logger.ts:12)
  → sendNotification (src/notifications/user.ts:34)

Called By (3):
  ← UserController.update (src/controllers/user.controller.ts:67)
  ← AdminController.updateUser (src/controllers/admin.controller.ts:123)
  ← BatchProcessor.processUserUpdates (src/jobs/batch.ts:89)

Data Access:
  → users.* (read, write)
  → audit_log.* (write)
  → cache:user:* (delete)

Patterns Detected:
  - Repository pattern
  - Event-driven updates
  - Audit logging
```

---

## Cross-Language Analysis

Drift's call graph works across languages:

```
TypeScript Frontend          Python Backend
==================          ==============
fetchUsers()                 
  → fetch('/api/users')  ──→  get_users()
                                → db.query(users)
                                
updateUser()
  → fetch('/api/users/:id') ──→ update_user()
                                  → validate_input()
                                  → db.update(users)
```

This enables:
- **API contract verification** — Frontend calls match backend endpoints
- **Full-stack data flow** — Trace data from UI to database
- **Cross-service impact** — Understand microservice dependencies

---

## How It Works

### 1. AST Parsing

Drift uses Tree-sitter to parse source code into ASTs:

```typescript
// Source code
function handleLogin(email: string, password: string) {
  const user = await findUserByEmail(email);
  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? createSession(user) : null;
}

// Extracted calls
[
  { callee: "findUserByEmail", args: ["email"], line: 2 },
  { callee: "verifyPassword", args: ["password", "user.passwordHash"], line: 3 },
  { callee: "createSession", args: ["user"], line: 4 }
]
```

### 2. Call Resolution

Drift resolves call targets across files:

```
handleLogin
  → findUserByEmail → src/repositories/user.ts:findUserByEmail
  → verifyPassword → src/auth/password.ts:verifyPassword
  → createSession → src/auth/session.ts:createSession
```

### 3. Data Access Detection

Drift detects database access patterns:

```typescript
// Prisma
const user = await prisma.user.findUnique({ where: { email } });
// Detected: users.* (read)

// Raw SQL
const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
// Detected: users.* (read)

// TypeORM
const user = await userRepository.findOne({ email });
// Detected: users.* (read)
```

### 4. Graph Construction

All data is combined into a unified call graph:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Call Graph                               │
├─────────────────────────────────────────────────────────────────┤
│  Nodes: Functions, Methods, Classes                              │
│  Edges: Calls, Data Access, Imports                              │
│  Metadata: Line numbers, Types, Patterns                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Storage & Performance

### Sharded Storage

For large codebases, Drift uses sharded storage:

```
.drift/lake/callgraph/
├── files/
│   ├── src_api_users.json
│   ├── src_api_auth.json
│   └── ...
├── index.json
└── metadata.json
```

### Incremental Updates

Only changed files are re-analyzed:

```bash
# Full build
drift callgraph build

# Incremental (default)
drift callgraph build --incremental

# Force full rebuild
drift callgraph build --force
```

### Performance

| Codebase Size | Build Time | Query Time |
|---------------|------------|------------|
| <10K LOC | <5s | <100ms |
| 10-100K LOC | 10-60s | <500ms |
| 100K-1M LOC | 1-10min | <2s |
| >1M LOC | 10-30min | <5s |

---

## Best Practices

### 1. Build Before Querying

```bash
# Always scan first
drift scan

# Then query
drift callgraph reach src/api/users.ts:42
```

### 2. Use Depth Limits

For large codebases, limit traversal depth:

```bash
drift callgraph reach src/api/users.ts:42 --max-depth 5
```

### 3. Focus on Sensitive Data

Use `--sensitive-only` to focus on what matters:

```bash
drift callgraph inverse users.password_hash --sensitive-only
```

### 4. Combine with Impact Analysis

Before making changes:

```bash
# 1. Check what you're changing
drift callgraph function handleLogin

# 2. Check impact
drift callgraph impact handleLogin

# 3. Check test coverage for sensitive data
drift callgraph coverage

# 4. Check what tests to run
drift test-topology affected src/auth/login.ts
```

---

## Troubleshooting

### "No call graph data"

Run `drift scan` first to build the call graph.

### "Function not found"

Check the function name matches exactly. Use `drift callgraph status` to see what's indexed.

### "Slow queries"

- Use `--max-depth` to limit traversal
- Use `--sensitive-only` to filter results
- Run `drift callgraph build --force` to rebuild

### "Missing calls"

Some dynamic calls can't be statically analyzed:
- `eval()` / `exec()`
- Dynamic imports
- Reflection-based calls

Drift uses regex fallback for common patterns but may miss edge cases.
