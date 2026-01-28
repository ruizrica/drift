# Suggest Changes

Get AI-guided suggestions for fixing pattern violations, security issues, or code quality problems. Returns specific code changes with before/after examples and rationale.

## Overview

When Drift detects issues, `drift_suggest_changes` provides actionable fixes:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUGGESTED CHANGES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Issue: Pattern violation in src/api/users.ts                    │
│  Pattern: api-rest-controller                                    │
│                                                                  │
│  BEFORE:                                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ app.get('/users/:id', async (req, res) => {                 │ │
│  │   const user = await db.users.findById(req.params.id);      │ │
│  │   res.json(user);  // ❌ Missing response envelope           │ │
│  │ });                                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  AFTER:                                                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ app.get('/users/:id', async (req, res) => {                 │ │
│  │   const user = await db.users.findById(req.params.id);      │ │
│  │   res.json({                                                │ │
│  │     data: user,                                             │ │
│  │     meta: { timestamp: Date.now() }                         │ │
│  │   });  // ✅ Matches response envelope pattern               │ │
│  │ });                                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Rationale: Your codebase uses a consistent response envelope    │
│  pattern with { data, meta } structure. This change aligns       │
│  with 23 other endpoints.                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## MCP Tool

### drift_suggest_changes

```typescript
drift_suggest_changes({
  target: "src/api/users.ts",        // File or function
  issue: "outlier",                   // Type of issue
  patternId: "api-rest-controller",   // Specific pattern (for outliers)
  maxSuggestions: 3                   // Max suggestions to return
})
```

**Issue Types:**

| Issue | Description |
|-------|-------------|
| `outlier` | Pattern violation (code doesn't match established pattern) |
| `security` | Security vulnerability or concern |
| `coupling` | High coupling or dependency issue |
| `error-handling` | Missing or improper error handling |
| `test-coverage` | Missing test coverage |
| `pattern-violation` | General pattern non-compliance |

**Response:**

```json
{
  "summary": "Found 2 issue(s) in src/api/users.ts. 2 suggestion(s) provided.",
  "data": {
    "summary": "Found 2 issue(s) in src/api/users.ts. 2 suggestion(s) provided.",
    "target": "src/api/users.ts",
    "issueType": "outlier",
    "suggestions": [
      {
        "id": "outlier-api-rest-controller-48",
        "title": "Pattern violation: REST Controller Pattern",
        "description": "This code deviates from the established \"REST Controller Pattern\" pattern used 23 times in the codebase.",
        "priority": "high",
        "category": "outlier",
        "location": {
          "file": "src/api/users.ts",
          "startLine": 48,
          "endLine": 53
        },
        "before": "res.json(user);",
        "after": "// See src/api/orders.ts:34 for the correct pattern",
        "rationale": "The \"REST Controller Pattern\" pattern has 23 consistent implementations with 92% confidence. This outlier should be refactored to match.",
        "relatedPattern": {
          "id": "api-rest-controller",
          "name": "REST Controller Pattern",
          "confidence": 0.92
        },
        "effort": "small",
        "impact": "Improves consistency and maintainability"
      },
      {
        "id": "error-no-try-catch-47",
        "title": "Error handling gap: no try catch",
        "description": "Missing error handling for database query",
        "priority": "medium",
        "category": "error-handling",
        "location": {
          "file": "src/api/users.ts",
          "startLine": 47,
          "endLine": 50
        },
        "before": "// getUser at line 47",
        "after": "try {\n  // existing code\n} catch (error) {\n  logger.error('Operation failed', { error });\n  throw error;\n}",
        "rationale": "Proper error handling improves reliability and debuggability.",
        "effort": "small",
        "impact": "Improves error visibility and application reliability"
      }
    ],
    "stats": {
      "totalIssues": 2,
      "bySeverity": { "high": 1, "medium": 1 },
      "estimatedEffort": "minimal"
    }
  },
  "hints": {
    "nextActions": [
      "Review suggestions and apply changes",
      "Use drift_validate_change to verify fixes"
    ],
    "relatedTools": ["drift_validate_change", "drift_code_examples", "drift_impact_analysis"]
  }
}
```

---

## Issue-Specific Suggestions

### Pattern Outliers

```typescript
drift_suggest_changes({
  target: "src/api/users.ts",
  issue: "outlier",
  patternId: "api-rest-controller"
})
```

Suggests changes to align with established patterns.

### Security Issues

```typescript
drift_suggest_changes({
  target: "src/auth/login.ts",
  issue: "security"
})
```

Suggests security improvements:
- Input validation
- SQL injection prevention
- XSS protection
- Rate limiting

### Error Handling

```typescript
drift_suggest_changes({
  target: "src/services/payment.ts",
  issue: "error-handling"
})
```

Suggests:
- Try-catch blocks
- Error logging
- Proper error propagation
- Circuit breakers

### Coupling Issues

```typescript
drift_suggest_changes({
  target: "src/core/database.ts",
  issue: "coupling"
})
```

Suggests:
- Interface extraction
- Dependency injection
- Module boundary fixes

### Test Coverage

```typescript
drift_suggest_changes({
  target: "src/services/user.ts",
  issue: "test-coverage"
})
```

Suggests:
- Missing test cases
- Edge cases to cover
- Mock patterns to use

---

## CLI Usage

### Find Outliers First

```bash
drift check --detailed
```

Shows all pattern violations with IDs.

### Get Suggestions

```bash
drift check --suggest
```

Includes fix suggestions in output.

---

## Workflow Integration

### 1. Detect Issues

```typescript
// Find pattern violations
const patterns = await drift_patterns_list({
  status: "discovered"
});

// Check for outliers
const filePatterns = await drift_file_patterns({
  file: "src/api/users.ts"
});
```

### 2. Get Suggestions

```typescript
// Get fix suggestions
const suggestions = await drift_suggest_changes({
  target: "src/api/users.ts",
  issue: "outlier",
  patternId: filePatterns.data.outliers[0].patternId
});
```

### 3. Apply and Validate

```typescript
// Apply suggestion (manually or via AI)
const newCode = applySuggestion(suggestions.data.suggestions[0]);

// Validate the change
const validation = await drift_validate_change({
  file: "src/api/users.ts",
  content: newCode
});
```

---

## Suggestion Quality

### Confidence Scores

Suggestions include a `relatedPattern` with confidence when applicable:

| Score | Meaning |
|-------|---------|
| 0.9+ | High confidence, safe to apply |
| 0.7-0.9 | Good suggestion, review before applying |
| 0.5-0.7 | Possible improvement, needs careful review |
| <0.5 | Low confidence, manual review required |

### Priority Levels

| Priority | Action |
|----------|--------|
| `critical` | Should fix immediately |
| `high` | Should fix before merging |
| `medium` | Should fix, but not blocking |
| `low` | Nice to have improvement |

---

## Best Practices

### 1. Review Before Applying

```typescript
// Always review suggestions
const suggestions = await drift_suggest_changes({
  target: file,
  issue: "outlier"
});

// Check confidence and rationale
for (const suggestion of suggestions.data.suggestions) {
  if (suggestion.confidence > 0.8) {
    // Safe to apply
  } else {
    // Review manually
  }
}
```

### 2. Validate After Applying

```typescript
// After applying suggestions
await drift_validate_change({
  file: "src/api/users.ts",
  content: updatedCode
});
```

### 3. Run Tests

```typescript
// Get affected tests
const tests = await drift_test_topology({
  action: "affected",
  files: ["src/api/users.ts"]
});

// Run them
// npm test -- ${tests.data.testFiles.join(' ')}
```

### 4. Use Related Pattern Info

Suggestions include `relatedPattern` when addressing pattern violations — use this to understand the pattern:

```json
{
  "relatedPattern": {
    "id": "api-rest-controller",
    "name": "REST Controller Pattern",
    "confidence": 0.92
  }
}
```

Use `drift_code_examples` with the pattern ID to see correct implementations.
```

---

## Next Steps

- [Validate Change](Validate-Change) — Verify code compliance
- [Code Examples](Code-Examples) — See pattern implementations
- [Quality Gates](Quality-Gates) — CI/CD integration
