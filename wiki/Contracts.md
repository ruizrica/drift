# Contracts

API contracts define the agreement between frontend and backend. Drift detects mismatches automatically.

## What are API Contracts?

An API contract is the implicit agreement between code that calls an API and code that implements it:

```typescript
// Frontend expects:
fetch('/api/users/123')
  .then(res => res.json())
  .then(data => {
    console.log(data.user.name);  // Expects { user: { name: string } }
  });

// Backend provides:
app.get('/api/users/:id', (req, res) => {
  res.json({ data: user });  // Returns { data: User } — MISMATCH!
});
```

Drift detects these mismatches before they cause runtime errors.

---

## Contract Lifecycle

```
Frontend Code ──┐
                ├──→ Drift Analyzes ──→ Contract ──→ Verified/Mismatch
Backend Code ───┘
```

1. **Discovery** — Drift finds API calls in frontend and endpoints in backend
2. **Matching** — Drift matches calls to endpoints by path and method
3. **Verification** — Drift compares expected vs actual response shapes
4. **Status** — Contracts are marked as verified, mismatch, or discovered

---

## Contract Status

| Status | Meaning |
|--------|---------|
| **Verified** | Frontend and backend agree |
| **Mismatch** | Frontend expects different shape than backend provides |
| **Discovered** | Found but not yet verified (needs review) |
| **Ignored** | Intentionally excluded from checking |

---

## Scanning for Contracts

Contracts are detected during regular scans:

```bash
drift scan
```

Contract detection happens automatically as part of the scan process.

---

## Viewing Contracts

### Via MCP Tool

Use the `drift_contracts_list` MCP tool to view contracts:

```json
{
  "status": "mismatch",
  "limit": 20
}
```

**Parameters:**
- `status` — Filter by status: `all`, `verified`, `mismatch`, `discovered`
- `limit` — Maximum results (default: 20, max: 50)
- `cursor` — Pagination cursor

**Returns:**
```json
{
  "summary": "45 contracts: 40 verified, 3 mismatches, 2 discovered. ⚠️ 3 need attention.",
  "contracts": [
    {
      "id": "contract-123",
      "endpoint": "/api/users/:id",
      "method": "GET",
      "status": "mismatch",
      "frontendFile": "src/api/users.ts",
      "backendFile": "src/routes/users.ts",
      "mismatchCount": 1
    }
  ],
  "stats": {
    "verified": 40,
    "mismatch": 3,
    "discovered": 2
  }
}
```

---

## Fixing Mismatches

### Option 1: Fix Backend

```typescript
// Before
res.json({ data: user });

// After
res.json({ user });
```

### Option 2: Fix Frontend

```typescript
// Before
const { user } = await response.json();

// After
const { data: user } = await response.json();
```

### Option 3: Ignore (Intentional Difference)

Mark contracts as intentionally different using the MCP tool or by configuring ignore paths.

---

## Contract Detection

### Frontend Detection

Drift detects API calls in:

| Pattern | Example |
|---------|---------|
| `fetch()` | `fetch('/api/users')` |
| `axios` | `axios.get('/api/users')` |
| `$http` | `$http.get('/api/users')` |
| Custom clients | `apiClient.get('/users')` |

### Backend Detection

Drift detects endpoints in:

| Framework | Pattern |
|-----------|---------|
| Express | `app.get('/api/users', handler)` |
| NestJS | `@Get('/users')` |
| FastAPI | `@app.get('/users')` |
| Django | `path('users/', views.users)` |
| Spring | `@GetMapping("/users")` |
| Laravel | `Route::get('/users', ...)` |
| Gin | `r.GET("/users", handler)` |
| Actix | `web::get().to(handler)` |

---

## Response Shape Analysis

Drift analyzes response shapes by:

1. **Type inference** — From TypeScript types, JSDoc, or runtime analysis
2. **Pattern matching** — Common response envelope patterns
3. **Static analysis** — What the code actually returns

### Supported Patterns

```typescript
// Direct return
res.json(user);  // Shape: User

// Envelope pattern
res.json({ data: user });  // Shape: { data: User }

// With metadata
res.json({ 
  data: user, 
  meta: { timestamp: Date.now() } 
});  // Shape: { data: User, meta: { timestamp: number } }

// Error response
res.status(400).json({ error: 'Invalid input' });  // Shape: { error: string }
```

---

## CI Integration

### Quality Gate

Use the quality gate to check contracts:

```bash
drift gate --gates contract-verification
```

### GitHub Actions

```yaml
- name: Check API Contracts
  run: |
    drift scan
    drift gate --gates contract-verification --format github
```

---

## MCP Integration

### `drift_contracts_list` Tool

```json
{
  "status": "mismatch",
  "limit": 20
}
```

**Parameters:**
- `status` — Filter: `all`, `verified`, `mismatch`, `discovered`
- `limit` — Max results (default: 20, max: 50)
- `cursor` — Pagination cursor for large result sets

**Returns:**
```json
{
  "summary": "3 contract mismatches found",
  "contracts": [
    {
      "id": "contract-abc123",
      "endpoint": "GET /api/users/:id",
      "method": "GET",
      "status": "mismatch",
      "frontendFile": "src/api/users.ts",
      "backendFile": "src/routes/users.ts",
      "mismatchCount": 1
    }
  ],
  "stats": {
    "verified": 40,
    "mismatch": 3,
    "discovered": 2
  }
}
```

### Use with AI Agents

Ask your AI agent:

> "Check if there are any API contract mismatches"

The AI will call `drift_contracts_list` and report any issues.

---

## Configuration

### Custom API Patterns

Add custom API client patterns in `.drift/config.json`:

```json
{
  "contracts": {
    "frontendPatterns": [
      {
        "name": "customClient",
        "pattern": "myApi\\.(get|post|put|delete)\\(['\"]([^'\"]+)['\"]",
        "methodGroup": 1,
        "pathGroup": 2
      }
    ],
    "backendPatterns": [
      {
        "name": "customRouter",
        "pattern": "router\\.(get|post)\\(['\"]([^'\"]+)['\"]",
        "methodGroup": 1,
        "pathGroup": 2
      }
    ]
  }
}
```

### Ignore Paths

```json
{
  "contracts": {
    "ignorePaths": [
      "/api/health",
      "/api/metrics",
      "/api/internal/*"
    ]
  }
}
```

### Response Envelope

Tell Drift about your standard response envelope:

```json
{
  "contracts": {
    "responseEnvelope": {
      "dataKey": "data",
      "errorKey": "error",
      "metaKey": "meta"
    }
  }
}
```

---

## Cross-Language Contracts

Drift tracks contracts across language boundaries:

```
TypeScript Frontend ──→ Python Backend
React App ──→ Go API
Vue.js ──→ Java Spring
```

### Example: TypeScript → Python

**Frontend (TypeScript):**
```typescript
const response = await fetch('/api/users');
const users: User[] = await response.json();
```

**Backend (Python/FastAPI):**
```python
@app.get("/api/users")
def get_users() -> List[UserResponse]:
    return users
```

Drift verifies the TypeScript `User` type matches Python's `UserResponse`.

---

## Best Practices

### 1. Scan Regularly

```bash
# Add to CI
drift scan --contracts
drift contracts check --fail-on mismatch
```

### 2. Fix Mismatches Early

Don't let mismatches accumulate. Fix them as they're discovered.

### 3. Use TypeScript Types

Strong typing helps Drift detect mismatches more accurately:

```typescript
interface UserResponse {
  user: User;
}

const response = await fetch('/api/users/123');
const data: UserResponse = await response.json();
```

### 4. Document Intentional Differences

Configure ignore paths in `.drift/config.json` for endpoints that intentionally differ.

### 5. Review Discovered Contracts

Use the MCP tool to review discovered contracts:

```json
{
  "status": "discovered"
}
```

---

## Troubleshooting

### No contracts found

1. Ensure both frontend and backend are scanned
2. Check API patterns are recognized
3. Add custom patterns if using non-standard clients

### False positive mismatches

1. Check if response envelope is configured correctly
2. Verify type definitions are accurate
3. Ignore intentional differences

### Missing endpoints

1. Check backend framework is supported
2. Verify route files are not in `.driftignore`
3. Add custom patterns for non-standard routers

---

## Next Steps

- [Constraints](Constraints) — Architectural invariants
- [Quality Gates](Quality-Gates) — Enforce contracts in CI
- [Security Analysis](Security-Analysis) — Data flow across APIs
