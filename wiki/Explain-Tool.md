# Explain Tool

Get comprehensive explanations of code in context of your codebase. Combines pattern analysis, call graph, security implications, and dependencies into a coherent narrative.

## Overview

When you need to understand unfamiliar code, `drift_explain` provides a complete picture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CODE EXPLANATION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Target: src/auth/middleware.ts                                  │
│                                                                  │
│  📋 SUMMARY                                                      │
│  Authentication middleware that validates JWT tokens and         │
│  attaches user context to requests. Used by 23 routes.           │
│                                                                  │
│  🎯 PURPOSE                                                      │
│  - Validates incoming JWT tokens                                 │
│  - Extracts user ID and roles from token                         │
│  - Attaches user object to request context                       │
│  - Blocks unauthorized requests                                  │
│                                                                  │
│  📊 PATTERNS USED                                                │
│  - Auth Middleware Pattern (92% confidence)                      │
│  - Error Handling Pattern (88% confidence)                       │
│  - Logging Pattern (85% confidence)                              │
│                                                                  │
│  🔗 DEPENDENCIES                                                 │
│  - Calls: tokenService.verify(), userService.findById()          │
│  - Called by: 23 route handlers                                  │
│  - Entry points: All /api/* routes                               │
│                                                                  │
│  ⚠️ SECURITY                                                     │
│  - Accesses: users.password_hash (read)                          │
│  - Accesses: sessions.token (read/write)                         │
│  - Risk: HIGH (authentication boundary)                          │
│                                                                  │
│  🧪 TESTING                                                      │
│  - Covered by: auth.test.ts (12 tests)                           │
│  - Coverage: 94%                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## MCP Tool

### drift_explain

```typescript
drift_explain({
  target: "src/auth/middleware.ts",  // File, function, or symbol
  depth: "comprehensive",             // summary | detailed | comprehensive
  focus: "security"                   // Optional: security | performance | architecture | testing
})
```

**Depth Options:**

| Depth | Description | Token Cost |
|-------|-------------|------------|
| `summary` | Quick overview, key points | ~500 |
| `detailed` | Patterns, dependencies, basic analysis | ~1500 |
| `comprehensive` | Full analysis including security, testing | ~3000 |

**Focus Options:**

| Focus | Emphasizes |
|-------|------------|
| `security` | Data access, sensitive paths, vulnerabilities |
| `performance` | Caching, N+1 queries, optimization opportunities |
| `architecture` | Patterns, coupling, module boundaries |
| `testing` | Coverage, test quality, gaps |

**Response:**

```json
{
  "summary": "**middleware.ts** is a critical-importance data layer file. Data access layer for users, sessions (read). 2 data access point(s). ⚠️ Deviates from 0 pattern(s). 🔒 1 security concern(s).",
  "data": {
    "target": "src/auth/middleware.ts",
    "depth": "comprehensive",
    "focus": "security",
    "explanation": {
      "summary": "**middleware.ts** is a critical-importance data layer file...",
      "purpose": "Data access layer for users, sessions (read)",
      "context": {
        "module": "auth",
        "role": "data layer",
        "importance": "critical"
      },
      "patterns": [
        {
          "name": "Auth Middleware Pattern",
          "category": "auth",
          "compliance": "follows",
          "note": "Consistent with 23 implementations"
        },
        {
          "name": "Error Handling Pattern",
          "category": "errors",
          "compliance": "follows",
          "note": "Consistent with 45 implementations"
        }
      ],
      "dependencies": {
        "imports": [],
        "usedBy": ["getUsers", "createOrder", "updateProfile"],
        "calls": [],
        "dataAccess": [
          { "table": "users", "operation": "read", "fields": ["id", "email", "password_hash"] },
          { "table": "sessions", "operation": "read", "fields": ["token", "expires_at"] }
        ]
      },
      "security": {
        "sensitiveData": ["password_hash", "token"],
        "accessLevel": "public",
        "concerns": ["Raw SQL at line 23"],
        "reachableSensitiveFields": ["users.password_hash", "sessions.token"]
      },
      "semantics": {
        "functions": 0,
        "asyncFunctions": 0,
        "exportedFunctions": 0,
        "dataAccessPoints": 2,
        "frameworks": ["Prisma"]
      },
      "insights": [
        "Accesses 2 data point(s) across 2 table(s)",
        "Participates in 2 pattern(s)",
        "⚠️ 1 security concern(s)",
        "🔒 Can reach 2 sensitive field(s)"
      ],
      "nextSteps": [
        "Run drift_suggest_changes with issue=\"security\"",
        "Use drift_reachability to trace sensitive data",
        "Review raw SQL queries for injection vulnerabilities"
      ]
    }
  },
  "hints": {
    "nextActions": [
      "Run drift_suggest_changes with issue=\"security\"",
      "Use drift_reachability to trace sensitive data",
      "Review raw SQL queries for injection vulnerabilities"
    ],
    "relatedTools": ["drift_impact_analysis", "drift_reachability", "drift_code_examples"]
  }
}
```

---

## CLI Usage

While there's no direct CLI command, you can get explanations via:

```bash
# Get file patterns and context
drift files src/auth/middleware.ts --verbose

# Get call graph information
drift callgraph function requireAuth

# Get security information
drift boundaries file src/auth/middleware.ts
```

---

## Use Cases

### 1. Onboarding to New Codebase

```typescript
// Understand the main entry point
drift_explain({
  target: "src/index.ts",
  depth: "comprehensive"
})
```

### 2. Before Modifying Code

```typescript
// Understand what you're about to change
drift_explain({
  target: "src/services/payment.ts",
  depth: "detailed",
  focus: "security"
})
```

### 3. Code Review

```typescript
// Understand PR changes in context
drift_explain({
  target: "src/new-feature/handler.ts",
  depth: "detailed",
  focus: "architecture"
})
```

### 4. Security Audit

```typescript
// Deep dive into security-critical code
drift_explain({
  target: "src/auth/",
  depth: "comprehensive",
  focus: "security"
})
```

---

## Explanation Depth Comparison

### Summary

```typescript
drift_explain({ target: "src/auth/middleware.ts", depth: "summary" })
```

```json
{
  "summary": "**middleware.ts** is a critical-importance data layer file. Data access layer for users, sessions (read).",
  "data": {
    "target": "src/auth/middleware.ts",
    "depth": "summary",
    "explanation": {
      "summary": "...",
      "purpose": "Data access layer for users, sessions (read)",
      "context": { "module": "auth", "role": "data layer", "importance": "critical" },
      "patterns": [],
      "dependencies": { "imports": [], "usedBy": [], "calls": [], "dataAccess": [] },
      "insights": ["Accesses 2 data point(s) across 2 table(s)"],
      "nextSteps": ["Use drift_code_examples to see similar implementations"]
    }
  }
}
```

### Detailed

```typescript
drift_explain({ target: "src/auth/middleware.ts", depth: "detailed" })
```

Adds: patterns, dependencies, data access details, basic security info

### Comprehensive

```typescript
drift_explain({ target: "src/auth/middleware.ts", depth: "comprehensive" })
```

Adds: full security analysis with reachable sensitive fields, semantic analysis, detailed insights

---

## Integration with Other Tools

### With Impact Analysis

```typescript
// First understand the code
const explanation = await drift_explain({
  target: "src/auth/middleware.ts",
  depth: "detailed"
});

// Then check impact of changes
const impact = await drift_impact_analysis({
  target: "src/auth/middleware.ts"
});
```

### With Similar Code

```typescript
// Understand existing code
const explanation = await drift_explain({
  target: "src/services/user.ts"
});

// Find similar code to use as reference
const similar = await drift_similar({
  intent: "service",
  description: explanation.data.explanation.purpose
});
```

---

## Best Practices

### 1. Start with Summary

```typescript
// Quick understanding first
const summary = await drift_explain({
  target: "src/complex/module.ts",
  depth: "summary"
});

// Go deeper if needed
if (needsMoreDetail) {
  const detailed = await drift_explain({
    target: "src/complex/module.ts",
    depth: "comprehensive"
  });
}
```

### 2. Use Focus for Specific Concerns

```typescript
// Security review
drift_explain({ target: "src/auth/", focus: "security" })

// Performance optimization
drift_explain({ target: "src/api/", focus: "performance" })
```

### 3. Explain Before Modifying

Always understand code before changing it:

```typescript
// 1. Explain
const explanation = await drift_explain({ target: file });

// 2. Check impact
const impact = await drift_impact_analysis({ target: file });

// 3. Make changes with full context
```

---

## Next Steps

- [Impact Analysis](Impact-Analysis) — Understand blast radius
- [Security Analysis](Security-Analysis) — Deep security review
- [Call Graph Analysis](Call-Graph-Analysis) — Dependency mapping
