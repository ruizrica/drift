# Code Examples

Get real code snippets from your codebase that demonstrate how patterns are implemented. Essential for AI agents to generate code that matches your conventions.

## Overview

Instead of generic examples, `drift_code_examples` returns actual code from YOUR codebase showing how patterns are used in practice.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CODE EXAMPLES                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Pattern: "api-rest-controller"                                  │
│                                                                  │
│  Example 1: src/controllers/users.ts:12-45                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ @Controller('/api/users')                                   │ │
│  │ export class UsersController {                              │ │
│  │   @Get('/:id')                                              │ │
│  │   async getUser(@Param('id') id: string) {                  │ │
│  │     const user = await this.userService.findById(id);       │ │
│  │     return { data: user, meta: { timestamp: Date.now() } }; │ │
│  │   }                                                         │ │
│  │ }                                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Example 2: src/controllers/orders.ts:8-38                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ @Controller('/api/orders')                                  │ │
│  │ export class OrdersController {                             │ │
│  │   // Similar pattern...                                     │ │
│  │ }                                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## MCP Tool

### drift_code_examples

```typescript
drift_code_examples({
  categories: ["api", "auth"],     // Filter by categories
  pattern: "api-rest-controller",  // Specific pattern ID
  maxExamples: 3,                  // Examples per pattern
  contextLines: 10                 // Lines of context
})
```

**Response:**

```json
{
  "summary": "api, auth: 6 code examples from 2 patterns.",
  "data": {
    "examples": [
      {
        "patternId": "api-rest-controller",
        "patternName": "REST Controller Pattern",
        "category": "api",
        "file": "src/controllers/users.ts",
        "line": 12,
        "code": ">  12 | @Controller('/api/users')\n   13 | export class UsersController {\n   14 |   @Get('/:id')\n   15 |   async getUser(@Param('id') id: string) {\n   16 |     const user = await this.userService.findById(id);\n   17 |     return { data: user, meta: { timestamp: Date.now() } };\n   18 |   }\n   19 | }",
        "explanation": "REST controller pattern for handling HTTP requests"
      },
      {
        "patternId": "auth-middleware-usage",
        "patternName": "Auth Middleware Pattern",
        "category": "auth",
        "file": "src/middleware/auth.ts",
        "line": 5,
        "code": ">   5 | export const requireAuth = async (req, res, next) => {\n    6 |   // Auth middleware implementation...\n    7 | }",
        "explanation": "Authentication middleware pattern"
      }
    ],
    "patternsFound": 2,
    "examplesReturned": 6
  },
  "hints": {
    "nextActions": [
      "Use these examples as templates for new code",
      "Use drift_pattern_get for more details on specific patterns"
    ],
    "relatedTools": ["drift_pattern_get", "drift_patterns_list"]
  }
}
```

---

## CLI Command

### Get Examples by Category

```bash
drift export --format ai-context --categories api,auth --snippets
```

### Get Examples for Specific Pattern

```bash
drift where api-rest-controller --verbose
```

---

## Use Cases

### 1. Before Writing New Code

```typescript
// AI agent workflow
const context = await drift_context({
  intent: "add_feature",
  focus: "user authentication"
});

// Get real examples
const examples = await drift_code_examples({
  categories: ["auth"],
  maxExamples: 3
});

// Now generate code following the examples
```

### 2. Learning Codebase Conventions

```typescript
// New developer wants to understand API patterns
drift_code_examples({
  categories: ["api"],
  maxExamples: 5,
  contextLines: 15
})
```

### 3. Code Review Reference

```typescript
// Reviewer wants to show correct pattern
drift_code_examples({
  pattern: "error-handling-try-catch",
  maxExamples: 2
})
```

---

## Example Output Formats

### Minimal (for token efficiency)

```typescript
drift_code_examples({
  pattern: "api-rest-controller",
  maxExamples: 1,
  contextLines: 5
})
```

```json
{
  "summary": "1 code examples from 1 patterns.",
  "data": {
    "examples": [{
      "patternId": "api-rest-controller",
      "patternName": "REST Controller Pattern",
      "category": "api",
      "file": "src/controllers/users.ts",
      "line": 12,
      "code": ">  12 | @Controller('/api/users')..."
    }],
    "patternsFound": 1,
    "examplesReturned": 1
  }
}
```

### Detailed (for understanding)

```typescript
drift_code_examples({
  categories: ["api"],
  maxExamples: 3,
  contextLines: 15
})
```

Returns more context lines around each pattern match with explanations.

---

## Integration with drift_context

The `drift_context` tool can guide you to relevant examples:

```typescript
drift_context({
  intent: "add_feature",
  focus: "REST endpoint"
})
```

**Then use drift_code_examples for detailed snippets:**

```typescript
// After getting pattern IDs from drift_context
drift_code_examples({
  pattern: "api-rest-controller",
  maxExamples: 3
})
```

---

## Best Practices

### 1. Start with drift_context

```typescript
// This gives you pattern IDs
const context = await drift_context({ intent: "add_feature", focus: "auth" });

// Then get detailed examples
const examples = await drift_code_examples({
  pattern: context.relevantPatterns[0].id
});
```

### 2. Use Category Filtering

```typescript
// Don't request all categories
drift_code_examples({ categories: ["api"] })  // ✅ Good

// Avoid
drift_code_examples({})  // ❌ Too broad, wastes tokens
```

### 3. Limit Examples

```typescript
// Usually 2-3 examples are enough
drift_code_examples({
  pattern: "error-handling",
  maxExamples: 3  // ✅ Sufficient
})
```

### 4. Adjust Context Lines

```typescript
// More context for complex patterns
drift_code_examples({
  pattern: "transaction-patterns",
  contextLines: 20  // Need more context for transactions
})

// Less context for simple patterns
drift_code_examples({
  pattern: "log-levels",
  contextLines: 5  // Simple pattern, less context needed
})
```

---

## Next Steps

- [Similar Code Search](Similar-Code.md) — Find semantically similar code
- [Pattern Categories](Pattern-Categories) — All 15 categories
- [MCP Tools Reference](MCP-Tools-Reference) — All 50 tools
