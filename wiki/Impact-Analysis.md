# Impact Analysis

Understand the "blast radius" of code changes before making them. Impact Analysis shows what breaks, what's affected, and what tests need to run.

## Overview

Before refactoring or modifying code, you need to know:
- What functions call this code?
- What entry points reach it?
- What sensitive data paths are affected?
- What tests cover this code?

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPACT ANALYSIS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Target: src/auth/validateToken.ts                               │
│                                                                  │
│  ┌─────────────┐                                                 │
│  │ Direct      │  requireAuth(), checkPermission()               │
│  │ Callers (5) │  verifySession(), refreshToken(), logout()      │
│  └─────────────┘                                                 │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                 │
│  │ Entry       │  POST /api/login, GET /api/users                │
│  │ Points (12) │  POST /api/orders, DELETE /api/session          │
│  └─────────────┘                                                 │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                 │
│  │ Sensitive   │  users.password_hash, sessions.token            │
│  │ Data (3)    │  audit_logs.user_id                             │
│  └─────────────┘                                                 │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                 │
│  │ Tests       │  auth.test.ts, middleware.test.ts               │
│  │ Affected (8)│  integration/login.test.ts                      │
│  └─────────────┘                                                 │
│                                                                  │
│  Risk Level: HIGH (public API, sensitive data)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## CLI Command

### Basic Impact Analysis

```bash
drift callgraph impact src/auth/validateToken.ts
```

**Output:**

```
Impact Analysis: src/auth/validateToken.ts
══════════════════════════════════════════

Direct Callers (5):
  • requireAuth         src/middleware/auth.ts:34
  • checkPermission     src/middleware/rbac.ts:12
  • verifySession       src/services/session.ts:45
  • refreshToken        src/services/token.ts:23
  • logout              src/controllers/auth.ts:67

Entry Points (12):
  • POST /api/login           src/routes/auth.ts:12
  • GET /api/users            src/routes/users.ts:8
  • POST /api/orders          src/routes/orders.ts:15
  • DELETE /api/session       src/routes/auth.ts:34
  ... and 8 more

Sensitive Data Paths (3):
  ⚠ users.password_hash      via verifySession
  ⚠ sessions.token           via refreshToken
  ⚠ audit_logs.user_id       via requireAuth

Affected Tests (8):
  • auth.test.ts              5 test cases
  • middleware.test.ts        2 test cases
  • integration/login.test.ts 1 test case

Risk Assessment: HIGH
  - Public API exposure: 12 endpoints
  - Sensitive data access: 3 paths
  - Test coverage: 87%
```

### Function-Level Analysis

```bash
drift callgraph impact validateToken
```

### With Depth Limit

```bash
drift callgraph reach src/auth/validateToken.ts --max-depth 3
```

---

## MCP Tool

### drift_impact_analysis

```typescript
drift_impact_analysis({
  target: "src/auth/validateToken.ts",  // File or function
  maxDepth: 10,                          // Call graph depth
  limit: 10                              // Max items per section
})
```

**Response:**

```json
{
  "summary": "validateToken has 5 direct callers, reaches 12 entry points, accesses 3 sensitive data paths",
  "data": {
    "target": {
      "file": "src/auth/validateToken.ts",
      "function": "validateToken",
      "line": 15,
      "exported": true
    },
    "directCallers": [
      {
        "function": "requireAuth",
        "file": "src/middleware/auth.ts",
        "line": 34,
        "callSite": 45
      }
    ],
    "entryPoints": [
      {
        "type": "route",
        "method": "POST",
        "path": "/api/login",
        "file": "src/routes/auth.ts",
        "line": 12,
        "depth": 3
      }
    ],
    "sensitiveDataPaths": [
      {
        "table": "users",
        "field": "password_hash",
        "accessedVia": "verifySession",
        "sensitivity": "secret"
      }
    ],
    "affectedTests": [
      {
        "file": "src/__tests__/auth.test.ts",
        "testCount": 5,
        "coverage": "direct"
      }
    ],
    "riskAssessment": {
      "level": "high",
      "factors": [
        "Public API exposure: 12 endpoints",
        "Sensitive data access: 3 paths"
      ],
      "testCoverage": 0.87
    }
  },
  "hints": {
    "nextActions": [
      "Run affected tests: npm test -- auth.test.ts middleware.test.ts",
      "Review sensitive data access before changes",
      "Consider adding integration tests for /api/login"
    ]
  }
}
```

---

## Understanding the Output

### Direct Callers

Functions that directly call your target:

```
validateToken()
     ↑
     │ called by
     │
├── requireAuth()
├── checkPermission()
├── verifySession()
├── refreshToken()
└── logout()
```

### Entry Points

Public interfaces that eventually reach your target:

- **Routes** — HTTP endpoints (`POST /api/login`)
- **Event handlers** — Message queue consumers
- **Scheduled jobs** — Cron tasks
- **CLI commands** — Command-line entry points

### Sensitive Data Paths

Data access that flows through your target:

| Sensitivity | Examples |
|-------------|----------|
| `secret` | Passwords, API keys, tokens |
| `credential` | Session IDs, auth tokens |
| `pii` | Email, phone, address |
| `financial` | Credit cards, bank accounts |

### Risk Assessment

Calculated from:
- **Public exposure** — How many entry points?
- **Sensitive data** — What data is accessed?
- **Test coverage** — How well tested?
- **Coupling** — How many dependencies?

---

## Use Cases

### 1. Pre-Refactoring Check

Before changing a function:

```bash
drift callgraph reach src/utils/formatDate.ts
```

If impact is low (few callers, no sensitive data), safe to refactor.

### 2. Security Review

Before modifying auth code:

```typescript
drift_impact_analysis({
  target: "src/auth/middleware.ts"
})
```

Review all sensitive data paths before changes.

### 3. Test Planning

Find minimum tests to run:

```typescript
drift_test_topology({
  action: "affected",
  files: ["src/auth/validateToken.ts"]
})
```

### 4. Code Review

Assess PR risk:

```bash
drift gate --staged
# Includes impact analysis for changed files
```

---

## Integration with Other Tools

### With Coupling Analysis

```typescript
// Find highly coupled modules
drift_coupling({ action: "hotspots" })

// Then analyze impact of changing them
drift_impact_analysis({ target: "src/core/database.ts" })
```

### With Test Topology

```typescript
// Get impact analysis
const impact = await drift_impact_analysis({ target: "src/auth/login.ts" });

// Get minimum test set
const tests = await drift_test_topology({
  action: "affected",
  files: [impact.data.target.file]
});
```

### With Quality Gates

```bash
# Quality gate includes impact simulation
drift gate --gates impact-simulation
```

---

## Configuration

### .drift/config.json

```json
{
  "impactAnalysis": {
    "maxDepth": 10,
    "includeTests": true,
    "sensitiveDataTracking": true,
    "riskThresholds": {
      "high": {
        "entryPoints": 10,
        "sensitiveDataPaths": 1
      },
      "medium": {
        "entryPoints": 5,
        "sensitiveDataPaths": 0
      }
    }
  }
}
```

---

## Next Steps

- [Call Graph Analysis](Call-Graph-Analysis) — How the call graph works
- [Security Analysis](Security-Analysis) — Sensitive data tracking
- [Test Topology](Test-Topology) — Test coverage mapping
- [Coupling Analysis](Coupling-Analysis) — Dependency analysis
