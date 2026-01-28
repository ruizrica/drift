# Similar Code Search

Find code semantically similar to what you're about to write. Returns relevant examples with patterns and conventions to use as templates.

## Overview

When creating new code, find existing code that does something similar. This ensures consistency and helps you follow established patterns.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIMILAR CODE SEARCH                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Query: "user preferences CRUD"                                  │
│  Intent: api_endpoint                                            │
│                                                                  │
│  Results:                                                        │
│                                                                  │
│  1. src/controllers/settings.ts (92% match)                      │
│     └─ User settings CRUD operations                             │
│     └─ Patterns: REST controller, validation, auth               │
│                                                                  │
│  2. src/controllers/profile.ts (87% match)                       │
│     └─ User profile management                                   │
│     └─ Patterns: REST controller, DTO validation                 │
│                                                                  │
│  3. src/controllers/notifications.ts (78% match)                 │
│     └─ Notification preferences                                  │
│     └─ Patterns: REST controller, partial updates                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## MCP Tool

### drift_similar

```typescript
drift_similar({
  intent: "api_endpoint",              // What kind of code
  description: "user preferences CRUD", // Natural language description
  limit: 3,                            // Max results
  scope: "src/controllers"             // Optional: limit to directory
})
```

**Intent Options:**

| Intent | Description |
|--------|-------------|
| `api_endpoint` | REST/GraphQL endpoints |
| `service` | Business logic services |
| `component` | UI components |
| `hook` | React/Vue hooks |
| `utility` | Helper functions |
| `test` | Test files |
| `middleware` | Request middleware |

**Response:**

```json
{
  "summary": "Found 3 similar api_endpoint example(s). Top: src/controllers/settings.ts",
  "data": {
    "matches": [
      {
        "file": "src/controllers/settings.ts",
        "function": "getSettings",
        "class": "SettingsController",
        "similarity": 0.92,
        "reason": "Has api_endpoint decorator. Matches 3 api_endpoint patterns",
        "preview": "@Get export async function getSettings(user: AuthUser): Promise<Settings>",
        "patterns": ["REST Controller", "DTO Validation", "Auth Middleware"]
      },
      {
        "file": "src/controllers/profile.ts",
        "function": "updateProfile",
        "similarity": 0.87,
        "reason": "Has api_endpoint decorator. Name matches 2 keywords",
        "preview": "@Put export async function updateProfile(dto: UpdateProfileDto): Promise<Profile>",
        "patterns": ["REST Controller", "DTO Validation"]
      },
      {
        "file": "src/controllers/notifications.ts",
        "function": "getNotificationPreferences",
        "similarity": 0.78,
        "reason": "Matches 2 api_endpoint patterns",
        "preview": "@Get export async function getNotificationPreferences(): Promise<NotificationSettings>",
        "patterns": ["REST Controller"]
      }
    ],
    "conventions": {
      "naming": "camelCase",
      "errorHandling": "Async with try/catch",
      "imports": "Path alias (@/)"
    }
  },
  "hints": {
    "nextActions": [
      "Use drift_signature to get full signature for \"getSettings\"",
      "Use drift_imports to get correct imports for your new file"
    ],
    "relatedTools": ["drift_signature", "drift_imports", "drift_code_examples"]
  }
}
```

---

## Use Cases

### 1. Creating a New API Endpoint

```typescript
// Find similar endpoints
const similar = await drift_similar({
  intent: "api_endpoint",
  description: "order history with pagination"
});

// Use the most similar as template
// similar.data.results[0].snippet
```

### 2. Creating a New Component

```typescript
drift_similar({
  intent: "component",
  description: "modal dialog with form validation"
})
```

### 3. Creating a New Service

```typescript
drift_similar({
  intent: "service",
  description: "email notification service"
})
```

### 4. Creating a New Hook

```typescript
drift_similar({
  intent: "hook",
  description: "data fetching with caching"
})
```

---

## How It Works

### 1. Semantic Analysis

Drift analyzes your description using:
- Keyword extraction
- Intent classification
- Domain matching

### 2. Code Indexing

All code is indexed by:
- Function/class names
- Comments and documentation
- Pattern associations
- File structure

### 3. Similarity Scoring

Results are scored by:
- Semantic similarity to description
- Pattern overlap
- Structural similarity
- Recency (newer code preferred)

---

## Integration with Workflow

### Recommended Flow

```typescript
// 1. Get context for your task
const context = await drift_context({
  intent: "add_feature",
  focus: "user preferences"
});

// 2. Find similar code
const similar = await drift_similar({
  intent: "api_endpoint",
  description: "user preferences CRUD"
});

// 3. Get detailed examples if needed
const examples = await drift_code_examples({
  pattern: similar.data.commonPatterns[0].id
});

// 4. Generate code using templates

// 5. Validate generated code
await drift_validate_change({
  file: "src/controllers/preferences.ts",
  content: generatedCode
});
```

---

## Scoping Results

### By Directory

```typescript
drift_similar({
  intent: "service",
  description: "payment processing",
  scope: "src/services"  // Only search in services
})
```

### By Pattern Category

```typescript
// First find patterns
const patterns = await drift_patterns_list({
  categories: ["api"]
});

// Then find similar code with those patterns
drift_similar({
  intent: "api_endpoint",
  description: "user management"
})
```

---

## Best Practices

### 1. Be Specific in Descriptions

```typescript
// ✅ Good - specific
drift_similar({
  description: "paginated list endpoint with filtering and sorting"
})

// ❌ Bad - too vague
drift_similar({
  description: "list endpoint"
})
```

### 2. Use Appropriate Intent

```typescript
// ✅ Match intent to what you're creating
drift_similar({
  intent: "hook",  // Creating a hook
  description: "form validation with error handling"
})

// ❌ Wrong intent
drift_similar({
  intent: "api_endpoint",  // But creating a hook
  description: "form validation"
})
```

### 3. Scope When Possible

```typescript
// ✅ Scoped search is faster and more relevant
drift_similar({
  intent: "component",
  description: "data table",
  scope: "src/components"
})
```

### 4. Review Conventions

The response includes `conventions` — these show the coding style used in similar code:

```json
{
  "conventions": {
    "naming": "camelCase",
    "errorHandling": "Async with try/catch",
    "imports": "Path alias (@/)"
  }
}
```

Follow these conventions when writing your new code.
```

---

## Next Steps

- [Code Examples](Code-Examples) — Get detailed code snippets
- [Validate Change](Validate-Change) — Verify generated code
- [Pattern Categories](Pattern-Categories) — All 15 categories
