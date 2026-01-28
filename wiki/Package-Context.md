# Package Context

Generate AI-optimized context scoped to specific packages in monorepos. Minimizes token usage by including only patterns, constraints, and examples relevant to the target package.

## Overview

In large monorepos, AI agents don't need context from every package. Package Context focuses on what matters for the specific package you're working in.

```
┌─────────────────────────────────────────────────────────────────┐
│                         MONOREPO                                 │
├─────────────────────────────────────────────────────────────────┤
│  packages/                                                       │
│  ├── @app/api          ← Working here                           │
│  ├── @app/web                                                    │
│  ├── @app/shared                                                 │
│  └── @app/mobile                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PACKAGE-SCOPED CONTEXT                              │
│                                                                  │
│  ✓ Patterns from @app/api                                        │
│  ✓ Patterns from @app/shared (dependency)                        │
│  ✗ Patterns from @app/web (not relevant)                         │
│  ✗ Patterns from @app/mobile (not relevant)                      │
│                                                                  │
│  Result: 60% fewer tokens, more focused context                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## CLI Commands

### List Packages

```bash
drift context --list
```

**Output:**

```
Detected Packages
═════════════════

  @app/api          packages/api         TypeScript, Express
  @app/web          packages/web         TypeScript, React
  @app/shared       packages/shared      TypeScript
  @app/mobile       packages/mobile      TypeScript, React Native

Total: 4 packages
```

### Generate Package Context

```bash
drift context @app/api
```

**Output:**

```json
{
  "package": "@app/api",
  "patterns": [
    {
      "id": "api-rest-controller",
      "name": "REST Controller Pattern",
      "confidence": 0.92,
      "locations": 12
    }
  ],
  "constraints": [
    {
      "id": "auth-required",
      "rule": "All /api/* routes require authentication"
    }
  ],
  "dependencies": {
    "internal": ["@app/shared"],
    "external": ["express", "prisma"]
  }
}
```

### AI-Optimized Format

```bash
drift context @app/api --format ai --snippets
```

Generates markdown optimized for AI consumption with code snippets.

### Markdown Format

```bash
drift context @app/api --format markdown
```

Generates human-readable markdown documentation.

### Export to File

```bash
drift context @app/api -o context.json
```

---

## MCP Tool

### drift_package_context

```typescript
drift_package_context({
  package: "@app/api",           // Package name or path
  format: "ai",                  // json | ai (markdown)
  includeSnippets: true,         // Include code examples
  includeDependencies: true,     // Include internal deps
  categories: ["api", "auth"],   // Filter categories
  minConfidence: 0.7,            // Minimum pattern confidence
  maxTokens: 8000                // Token budget
})
```

**Response:**

```json
{
  "summary": "Context for @app/api: 8 patterns, 3 constraints, 2 internal deps",
  "data": {
    "package": {
      "name": "@app/api",
      "path": "packages/api",
      "language": "typescript",
      "framework": "express"
    },
    "patterns": [
      {
        "id": "api-rest-controller",
        "name": "REST Controller Pattern",
        "category": "api",
        "confidence": 0.92,
        "snippet": "// Example code...",
        "locations": ["src/controllers/users.ts:12", "src/controllers/orders.ts:8"]
      }
    ],
    "constraints": [
      {
        "id": "auth-required",
        "name": "Authentication Required",
        "rule": "All /api/* routes must use @RequireAuth",
        "enforcement": "error"
      }
    ],
    "dependencies": {
      "internal": [
        {
          "name": "@app/shared",
          "patterns": ["shared-types", "shared-utils"]
        }
      ]
    },
    "tokenEstimate": 2450
  }
}
```

### List Packages via MCP

```typescript
drift_package_context({
  list: true
})
```

---

## How It Works

### 1. Package Detection

Drift detects packages from:
- `package.json` workspaces
- `pnpm-workspace.yaml`
- `lerna.json`
- Directory structure with `package.json` files

### 2. Dependency Resolution

For each package, Drift identifies:
- **Internal dependencies** — Other packages in the monorepo
- **External dependencies** — npm packages
- **Peer dependencies** — Shared across packages

### 3. Pattern Scoping

Patterns are scoped to packages:
- Patterns found only in `@app/api` → included
- Patterns found in `@app/shared` (dependency) → included
- Patterns found in `@app/web` (unrelated) → excluded

### 4. Token Optimization

Context is optimized for token budget:
- High-confidence patterns first
- Most relevant examples
- Truncation with `[truncated]` markers

---

## Configuration

### .drift/config.json

```json
{
  "monorepo": {
    "enabled": true,
    "packageDetection": "auto",
    "workspaceRoot": ".",
    "packages": {
      "@app/api": {
        "path": "packages/api",
        "categories": ["api", "auth", "data-access"]
      },
      "@app/web": {
        "path": "packages/web",
        "categories": ["components", "styling"]
      }
    }
  }
}
```

---

## Use Cases

### 1. Focused AI Context

```bash
# Instead of full codebase context
drift context @app/api --format ai | pbcopy
# Paste into AI chat
```

### 2. Package-Specific Quality Gates

```bash
drift gate --package @app/api
```

### 3. Cross-Package Impact Analysis

```bash
drift impact @app/shared/src/types.ts
# Shows impact across all dependent packages
```

### 4. Package Health Dashboard

```bash
drift projects switch @app/api
drift status --detailed
```

---

## Integration with drift_context

The main `drift_context` tool accepts a `project` parameter for package targeting:

```typescript
drift_context({
  intent: "add_feature",
  focus: "user authentication",
  project: "@app/api"  // Scope to this package
})
```

This returns context scoped to `@app/api` and its dependencies.

---

## Next Steps

- [Projects Management](Projects-Management) — Multi-project registry
- [MCP Tools Reference](MCP-Tools-Reference) — All 50 tools
- [Configuration](Configuration) — Project configuration
