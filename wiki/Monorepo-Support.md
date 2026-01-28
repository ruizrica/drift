# Monorepo Support

Drift provides first-class support for monorepos, with package-scoped analysis, cross-package impact tracking, and optimized context generation.

## Overview

Monorepos present unique challenges:
- Patterns may differ between packages
- Changes in shared packages affect many consumers
- AI context needs to be scoped appropriately

Drift handles all of this:

```
┌─────────────────────────────────────────────────────────────────┐
│                         MONOREPO                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  packages/                                                       │
│  ├── @app/api        ← Backend patterns (Express, Prisma)        │
│  ├── @app/web        ← Frontend patterns (React, Tailwind)       │
│  ├── @app/shared     ← Shared types and utilities                │
│  ├── @app/mobile     ← Mobile patterns (React Native)            │
│  └── @app/admin      ← Admin patterns (similar to web)           │
│                                                                  │
│  Drift understands:                                              │
│  • Package boundaries                                            │
│  • Internal dependencies (@app/web → @app/shared)                │
│  • Pattern scoping (API patterns only in @app/api)               │
│  • Cross-package impact (change in shared affects all)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Package Detection

Drift automatically detects packages from:

| Source | Example |
|--------|---------|
| npm workspaces | `package.json` → `workspaces: ["packages/*"]` |
| pnpm workspaces | `pnpm-workspace.yaml` |
| Yarn workspaces | `package.json` → `workspaces` |
| Lerna | `lerna.json` |
| Nx | `nx.json` + `project.json` |
| Turborepo | `turbo.json` |

### List Detected Packages

```bash
drift context --list
```

**Output:**

```
Detected Packages
═════════════════

  Package              Path                 Language    Framework
  ─────────────────────────────────────────────────────────────────
  @app/api             packages/api         TypeScript  Express
  @app/web             packages/web         TypeScript  React
  @app/shared          packages/shared      TypeScript  -
  @app/mobile          packages/mobile      TypeScript  React Native
  @app/admin           packages/admin       TypeScript  React

Total: 5 packages
```

---

## Package-Scoped Analysis

### Scan Specific Package

```bash
drift scan --project @app/api
# or
drift scan -p @app/api
```

### Get Package Status

```bash
# Switch to project first, then get status
drift projects switch @app/api
drift status --detailed
```

**Output:**

```
Package: @app/api
═════════════════

Patterns: 23 (8 approved, 15 discovered)
Categories: api (12), auth (5), data-access (6)
Health Score: 85/100

Dependencies:
  Internal: @app/shared
  External: express, prisma, zod
```

### Package-Scoped Context

```bash
drift context @app/api --format ai
```

Returns context scoped to `@app/api` and its dependencies.

### Scan All Projects

```bash
drift scan --all-projects
```

Scans all registered projects in sequence.

---

## Cross-Package Impact

### Impact Analysis

When you change shared code, see all affected packages:

```bash
drift callgraph reach packages/shared/src/types.ts
```

**Output:**

```
Impact Analysis: packages/shared/src/types.ts
═════════════════════════════════════════════

Affected Packages:
  • @app/api      12 files, 34 imports
  • @app/web      8 files, 21 imports
  • @app/mobile   5 files, 12 imports
  • @app/admin    3 files, 8 imports

Total Impact: 28 files across 4 packages
```

### MCP Tool

```typescript
drift_impact_analysis({
  target: "packages/shared/src/types.ts"
})
```

Returns cross-package impact data.

---

## Package-Scoped Patterns

### Different Patterns Per Package

Patterns are scoped to packages:

```
@app/api patterns:
  • api-rest-controller (Express routes)
  • data-access-prisma (Prisma queries)
  • auth-middleware (JWT validation)

@app/web patterns:
  • component-structure (React components)
  • styling-tailwind (Tailwind classes)
  • hooks-custom (Custom hooks)
```

### View Package Patterns

```bash
drift status --package @app/api --detailed
```

### Approve Package-Specific Patterns

```bash
drift approve api-rest-controller --package @app/api
```

---

## MCP Tools for Monorepos

### drift_package_context

Get AI context for a specific package:

```typescript
drift_package_context({
  package: "@app/api",
  format: "ai",
  includeSnippets: true,
  includeDependencies: true
})
```

### drift_context with Project

Scope context to a package:

```typescript
drift_context({
  intent: "add_feature",
  focus: "user authentication",
  project: "@app/api"
})
```

### drift_projects

Manage registered projects:

```typescript
drift_projects({
  action: "list"
})
```

---

## Configuration

### .drift/config.json

```json
{
  "monorepo": {
    "enabled": true,
    "root": ".",
    "packages": {
      "@app/api": {
        "path": "packages/api",
        "language": "typescript",
        "framework": "express",
        "categories": ["api", "auth", "data-access"]
      },
      "@app/web": {
        "path": "packages/web",
        "language": "typescript",
        "framework": "react",
        "categories": ["components", "styling", "hooks"]
      },
      "@app/shared": {
        "path": "packages/shared",
        "language": "typescript",
        "isShared": true
      }
    },
    "dependencies": {
      "@app/api": ["@app/shared"],
      "@app/web": ["@app/shared"],
      "@app/mobile": ["@app/shared"]
    }
  }
}
```

### Package-Level Config

Each package can have its own `.drift/config.json`:

```
packages/
├── api/
│   └── .drift/
│       └── config.json  ← API-specific config
├── web/
│   └── .drift/
│       └── config.json  ← Web-specific config
└── shared/
    └── .drift/
        └── config.json  ← Shared config
```

---

## Workflows

### 1. Working in a Package

```typescript
// 1. Get package-scoped context
const context = await drift_context({
  intent: "add_feature",
  focus: "payment processing",
  project: "@app/api"
});

// 2. Find similar code in this package
const similar = await drift_similar({
  intent: "service",
  description: "payment processing",
  scope: "packages/api"
});

// 3. Generate and validate
const validation = await drift_validate_change({
  file: "packages/api/src/services/payment.ts",
  content: generatedCode
});
```

### 2. Changing Shared Code

```typescript
// 1. Check cross-package impact
const impact = await drift_impact_analysis({
  target: "packages/shared/src/types.ts"
});

// 2. Get affected tests across packages
const tests = await drift_test_topology({
  action: "affected",
  files: ["packages/shared/src/types.ts"]
});

// 3. Run quality gate
const gate = await drift_quality_gate({
  files: ["packages/shared/src/types.ts"],
  gates: "impact-simulation"
});
```

### 3. Package-Specific Quality Gates

```bash
# Run quality gate for specific package
drift gate --root packages/api

# Run for all packages
drift gate --root .
```

---

## Best Practices

### 1. Scope AI Context

Always scope context to the package you're working in:

```typescript
// ✅ Good - scoped context
drift_context({
  intent: "add_feature",
  focus: "user profile",
  project: "@app/web"
})

// ❌ Bad - unscoped (includes all packages)
drift_context({
  intent: "add_feature",
  focus: "user profile"
})
```

### 2. Check Cross-Package Impact

Before changing shared code:

```typescript
const impact = await drift_impact_analysis({
  target: "packages/shared/src/utils.ts"
});

if (impact.data.affectedPackages.length > 2) {
  // High impact - extra review needed
}
```

### 3. Use Package-Specific Patterns

Approve patterns at the package level by switching to the project first:

```bash
# API patterns
drift projects switch @app/api
drift approve api-rest-controller

# Web patterns
drift projects switch @app/web
drift approve component-structure
```

### 4. Run Tests Across Packages

When changing shared code:

```bash
# Get affected tests across all packages
drift test-topology affected packages/shared/src/types.ts

# Run them
npm test -- --filter @app/api --filter @app/web
```

---

## Turborepo/Nx Integration

### Turborepo

```json
// turbo.json
{
  "pipeline": {
    "drift:check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

```bash
turbo run drift:check
```

### Nx

```json
// project.json
{
  "targets": {
    "drift-check": {
      "executor": "nx:run-commands",
      "options": {
        "command": "drift check"
      }
    }
  }
}
```

```bash
nx run-many --target=drift-check
```

---

## Next Steps

- [Package Context](Package-Context) — AI context for packages
- [Projects Management](Projects-Management) — Multi-project registry
- [Impact Analysis](Impact-Analysis) — Cross-package impact
- [Quality Gates](Quality-Gates) — CI/CD integration
