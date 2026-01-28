# Validate Change

Validate proposed code changes against codebase patterns before committing. Catches pattern violations, constraint breaches, and inconsistencies early.

## Overview

Before committing code, validate it matches your codebase conventions:

```
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION RESULT                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  File: src/api/users.ts                                          │
│  Status: ⚠️ WARNINGS (2)                                         │
│                                                                  │
│  Compliance Score: 78/100                                        │
│                                                                  │
│  ✅ PASSED                                                       │
│  • REST Controller Pattern                                       │
│  • Error Handling Pattern                                        │
│  • Logging Pattern                                               │
│                                                                  │
│  ⚠️ WARNINGS                                                     │
│  • Response envelope missing meta.requestId                      │
│  • Missing rate limiting middleware                              │
│                                                                  │
│  💡 SUGGESTIONS                                                  │
│  • Add requestId to response meta for tracing                    │
│  • Consider adding @RateLimit decorator                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## MCP Tools

### drift_validate_change

Validate complete file content:

```typescript
drift_validate_change({
  file: "src/api/users.ts",
  content: `
    @Controller('/api/users')
    export class UsersController {
      @Get('/:id')
      async getUser(@Param('id') id: string) {
        const user = await this.userService.findById(id);
        return { data: user };
      }
    }
  `,
  strictMode: false
})
```

**Or validate a diff:**

```typescript
drift_validate_change({
  file: "src/api/users.ts",
  diff: `
--- a/src/api/users.ts
+++ b/src/api/users.ts
@@ -10,6 +10,10 @@ export class UsersController {
+  @Post('/')
+  async createUser(@Body() dto: CreateUserDto) {
+    return this.userService.create(dto);
+  }
  `,
  strictMode: true
})
```

**Response:**

```json
{
  "summary": "⚠️ Code has 2 warning(s) (78% compliance)",
  "data": {
    "summary": "⚠️ Code has 2 warning(s) (78% compliance)",
    "file": "src/api/users.ts",
    "overallScore": 78,
    "status": "warn",
    "violations": [
      {
        "patternId": "api-response-envelope",
        "patternName": "Response Envelope Pattern",
        "severity": "warning",
        "message": "Response envelope missing meta.requestId",
        "line": 8,
        "suggestion": "Add requestId: req.id to meta object",
        "confidence": 0.85
      },
      {
        "patternId": "semantic-sensitive-data",
        "patternName": "Sensitive Data Access",
        "severity": "info",
        "message": "Accessing sensitive fields: password_hash",
        "line": 12,
        "suggestion": "Ensure proper authorization and audit logging for sensitive data access",
        "confidence": 0.9
      }
    ],
    "compliance": [
      {
        "patternId": "api-rest-controller",
        "patternName": "REST Controller Pattern",
        "status": "compliant",
        "score": 100,
        "details": "1/1 semantic checks passed"
      },
      {
        "patternId": "error-handling-try-catch",
        "patternName": "Error Handling Pattern",
        "status": "compliant",
        "score": 100,
        "details": "1/1 semantic checks passed"
      }
    ],
    "semanticValidation": {
      "functions": {
        "total": 0,
        "withErrorHandling": 0,
        "async": 0,
        "exported": 0
      },
      "dataAccess": {
        "total": 2,
        "rawSql": 0,
        "sensitiveFields": 1
      },
      "imports": {
        "total": 0,
        "external": 0
      }
    },
    "suggestions": [
      "Review sensitive data access for proper authorization",
      "Add requestId: req.id to meta object"
    ],
    "stats": {
      "patternsChecked": 4,
      "compliant": 2,
      "violations": 0,
      "warnings": 2
    }
  },
  "hints": {
    "nextActions": [
      "Review violations and apply suggested fixes",
      "Use drift_suggest_changes for detailed fix suggestions",
      "Use drift_code_examples to see correct implementations"
    ],
    "relatedTools": ["drift_suggest_changes", "drift_code_examples", "drift_pattern_get"]
  }
}
```

### drift_prevalidate

Quick validation before writing code (lighter weight):

```typescript
drift_prevalidate({
  code: `
    async function createUser(data: CreateUserDto) {
      return await prisma.user.create({ data });
    }
  `,
  targetFile: "src/services/user.ts",
  kind: "function"
})
```

**Kind Options:**

| Kind | Description |
|------|-------------|
| `function` | Single function |
| `class` | Class definition |
| `component` | React/Vue component |
| `test` | Test file |
| `full-file` | Complete file |

**Response:**

```json
{
  "summary": "Code looks good! Score: 85/100. Matches expected patterns.",
  "data": {
    "valid": true,
    "score": 85,
    "violations": [],
    "expectedPatterns": ["data-access-prisma", "async-await", "dto-patterns"],
    "suggestions": [
      "Wrap async operations in try/catch"
    ]
  },
  "hints": {
    "nextActions": [
      "Code is ready to write",
      "Use drift_imports to add correct imports"
    ],
    "relatedTools": ["drift_code_examples", "drift_imports", "drift_similar"]
  }
}
```

---

## CLI Commands

### Validate Staged Files

```bash
drift check --staged
```

Validates all staged files before commit.

### Validate Specific Files

```bash
drift check src/api/users.ts src/services/user.ts
```

### Strict Mode

```bash
drift check --staged --fail-on warning
```

Fails on any warning (not just errors).

---

## Validation Modes

### Standard Mode

```typescript
drift_validate_change({
  file: "src/api/users.ts",
  content: code,
  strictMode: false  // Default
})
```

- Errors block merge
- Warnings are advisory
- Suggestions are informational

### Strict Mode

```typescript
drift_validate_change({
  file: "src/api/users.ts",
  content: code,
  strictMode: true
})
```

- Errors block merge
- Warnings block merge
- Used for main/release branches

---

## What Gets Validated

### 1. Pattern Compliance

Does the code follow established patterns?

```json
{
  "compliance": [
    { 
      "patternId": "api-rest-controller",
      "patternName": "REST Controller Pattern",
      "status": "compliant",
      "score": 100,
      "details": "1/1 semantic checks passed"
    }
  ],
  "violations": [
    { 
      "patternId": "error-handling",
      "patternName": "Error Handling Pattern",
      "severity": "warning",
      "message": "Missing try-catch",
      "suggestion": "Add try/catch or use Result<T> pattern"
    }
  ]
}
```

### 2. Semantic Validation

Analyzes data access patterns and security concerns:

```json
{
  "semanticValidation": {
    "functions": { "total": 3, "withErrorHandling": 2, "async": 3, "exported": 2 },
    "dataAccess": { "total": 2, "rawSql": 0, "sensitiveFields": 1 },
    "imports": { "total": 5, "external": 3 }
  }
}
```

### 3. Security Checks

Are there security concerns?

```json
{
  "violations": [
    {
      "patternId": "semantic-raw-sql",
      "patternName": "Raw SQL Detection",
      "severity": "warning",
      "message": "Raw SQL query detected accessing \"users\"",
      "line": 23,
      "suggestion": "Use parameterized queries or ORM methods to prevent SQL injection"
    }
  ]
}
```

---

## Integration Workflows

### Pre-Commit Hook

```bash
# .husky/pre-commit
drift check --staged --fail-on error
```

### CI Pipeline

```yaml
# GitHub Actions
- name: Validate Changes
  run: drift check --ci --format github
```

### AI Agent Workflow

```typescript
// 1. Generate code
const generatedCode = await generateCode(prompt);

// 2. Validate before writing
const validation = await drift_validate_change({
  file: targetFile,
  content: generatedCode
});

// 3. If issues, get suggestions
if (validation.data.status !== 'passed') {
  const suggestions = await drift_suggest_changes({
    target: targetFile,
    issue: 'pattern-violation'
  });
  
  // 4. Apply suggestions and re-validate
}

// 5. Write validated code
```

---

## Compliance Scoring

### Score Calculation

The overall score combines pattern compliance and semantic validation:

| Factor | Weight |
|--------|--------|
| Pattern compliance | 50% |
| Semantic validation (no raw SQL, etc.) | 50% |

Penalties are applied for:
- Raw SQL queries: -20 points
- Sensitive data access without protection: -10 points
- Pattern violations: varies by severity

### Score Interpretation

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | `pass` | Good to merge |
| 70-89 | `warn` | Review warnings |
| 50-69 | `warn` | Address issues |
| <50 | `fail` | Significant rework needed |

---

## Best Practices

### 1. Validate Early

```typescript
// Validate before writing to file
const validation = await drift_prevalidate({
  code: generatedCode,
  targetFile: "src/api/users.ts",
  kind: "function"
});

if (!validation.data.valid) {
  // Fix issues before writing
}
```

### 2. Use Appropriate Mode

```typescript
// Feature branches: standard mode
drift_validate_change({ strictMode: false })

// Main branch: strict mode
drift_validate_change({ strictMode: true })
```

### 3. Address Warnings

Even if validation passes, address warnings:

```typescript
if (validation.data.warnings.length > 0) {
  const suggestions = await drift_suggest_changes({
    target: file,
    issue: 'pattern-violation'
  });
}
```

### 4. Run Tests After Validation

```typescript
// After validation passes
const tests = await drift_test_topology({
  action: 'affected',
  files: [file]
});

// Run affected tests
```

---

## Next Steps

- [Quality Gates](Quality-Gates) — CI/CD integration
- [Suggest Changes](Suggest-Changes) — Get fix suggestions
- [Git Hooks](Git-Hooks) — Pre-commit setup
