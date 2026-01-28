# Coupling Analysis

Drift analyzes module dependencies to find circular dependencies, highly coupled modules, and refactoring opportunities.

## What is Module Coupling?

Module coupling measures how interconnected your code modules are:

- **Low coupling** = Modules are independent, easy to change
- **High coupling** = Modules are tangled, changes ripple everywhere

```
Low Coupling (Good):          High Coupling (Bad):
┌───┐     ┌───┐               ┌───┐ ←→ ┌───┐
│ A │ ──→ │ B │               │ A │ ←→ │ B │
└───┘     └───┘               └─┬─┘     └─┬─┘
                                │    ╲╱    │
                                ↓    ╱╲    ↓
                              ┌───┐ ←→ ┌───┐
                              │ C │ ←→ │ D │
                              └───┘     └───┘
```

---

## Building Coupling Analysis

```bash
# Build coupling graph
drift coupling build

# Check status
drift coupling status
```

**Output:**
```
Coupling Analysis Status
========================

Modules analyzed: 47
Dependencies: 234
Cycles detected: 3 ⚠️

Metrics:
  Average coupling: 4.2
  Max coupling: 18 (src/services/user.ts)
  Instability index: 0.67

Hotspots: 5 modules with coupling > 10
Unused exports: 23 dead exports found
```

---

## Finding Dependency Cycles

Circular dependencies cause:
- Build issues
- Runtime errors
- Hard-to-understand code
- Difficult refactoring

```bash
drift coupling cycles
```

**Output:**
```
Dependency Cycles
=================

🔴 CRITICAL: 3-module cycle
   src/services/user.ts
     → src/services/auth.ts
       → src/services/session.ts
         → src/services/user.ts (cycle!)
   
   Impact: 12 files affected
   Suggestion: Extract shared types to src/types/

🟡 WARNING: 2-module cycle
   src/utils/validation.ts
     → src/utils/formatting.ts
       → src/utils/validation.ts (cycle!)
   
   Impact: 5 files affected
   Suggestion: Merge into single module or extract common code

🟢 INFO: 2-module cycle (test files)
   tests/helpers/mock-user.ts
     → tests/helpers/mock-auth.ts
       → tests/helpers/mock-user.ts (cycle!)
   
   Impact: Test files only, low priority
```

### Filter by Severity

```bash
# Only critical cycles
drift coupling cycles --min-severity critical

# Limit cycle length
drift coupling cycles --max-cycle-length 5
```

### MCP Tool

```typescript
drift_coupling({
  action: "status" | "cycles" | "hotspots" | "analyze" | "refactor-impact" | "unused-exports",
  module?: string,        // Module path for analyze/refactor-impact actions
  limit?: number,         // Max results for hotspots/unused-exports (default: 15/20)
  minCoupling?: number,   // Minimum coupling threshold for hotspots (default: 3)
  maxCycleLength?: number, // Maximum cycle length to report (default: 10)
  minSeverity?: "info" | "warning" | "critical"  // Minimum severity for cycles (default: info)
})
```

---

## Finding Hotspots

Hotspots are modules with too many dependencies:

```bash
drift coupling hotspots
```

**Output:**
```
Coupling Hotspots
=================

1. src/services/user.ts
   Afferent (incoming): 18
   Efferent (outgoing): 12
   Total coupling: 30
   
   Depends on:
     - src/repositories/user.ts
     - src/services/auth.ts
     - src/services/email.ts
     - ... (9 more)
   
   Used by:
     - src/controllers/user.controller.ts
     - src/controllers/admin.controller.ts
     - src/jobs/user-sync.ts
     - ... (15 more)
   
   ⚠️  High coupling - consider splitting

2. src/utils/helpers.ts
   Afferent: 34
   Efferent: 2
   Total: 36
   
   ⚠️  "God module" - used everywhere
   Suggestion: Split into focused utility modules
```

### MCP Tool

```typescript
drift_coupling({
  action: "hotspots",
  minCoupling: 10,
  limit: 15
})
```

---

## Analyzing Specific Modules

```bash
drift coupling analyze src/services/user.ts
```

**Output:**
```
Module Analysis: src/services/user.ts
=====================================

Dependencies (12):
  Internal:
    → src/repositories/user.ts (5 imports)
    → src/services/auth.ts (3 imports)
    → src/services/email.ts (2 imports)
    → src/utils/validation.ts (4 imports)
    
  External:
    → prisma (8 imports)
    → zod (3 imports)

Dependents (18):
  → src/controllers/user.controller.ts
  → src/controllers/admin.controller.ts
  → src/api/routes/users.ts
  ... (15 more)

Metrics:
  Afferent coupling (Ca): 18
  Efferent coupling (Ce): 12
  Instability (I): 0.40
  Abstractness (A): 0.15
  Distance from main sequence: 0.45

Suggestions:
  1. High efferent coupling - depends on too many modules
  2. Consider extracting user validation to separate module
  3. Email service could be injected instead of imported
```

### MCP Tool

```typescript
drift_coupling({
  action: "analyze",
  module: "src/services/user.ts"
})
```

---

## Finding Unused Exports

Dead code that's exported but never imported:

```bash
drift coupling unused-exports
```

**Output:**
```
Unused Exports
==============

src/utils/helpers.ts:
  - formatPhoneNumber (exported line 45, never imported)
  - validateEmail (exported line 67, never imported)
  - DEPRECATED_CONSTANT (exported line 12, never imported)

src/services/legacy.ts:
  - oldUserService (entire module unused)
  - migrateUsers (exported line 23, never imported)

src/types/index.ts:
  - OldUserType (exported line 34, never imported)

Total: 23 unused exports
Potential dead code: ~450 lines
```

### MCP Tool

```typescript
drift_coupling({
  action: "unused-exports",
  limit: 20
})
```

---

## Refactor Impact Analysis

Before refactoring, understand the impact:

```bash
drift coupling refactor-impact src/services/user.ts
```

**Output:**
```
Refactor Impact: src/services/user.ts
=====================================

If you modify this module:

Direct impact (18 files):
  src/controllers/user.controller.ts
  src/controllers/admin.controller.ts
  src/api/routes/users.ts
  ... (15 more)

Indirect impact (34 files):
  Files that import the direct dependents
  
Test files affected (8):
  tests/services/user.test.ts
  tests/controllers/user.controller.test.ts
  tests/e2e/users.test.ts
  ... (5 more)

If you rename exports:
  - UserService: 18 files need updates
  - createUser: 12 files need updates
  - updateUser: 15 files need updates

If you move this module:
  - 18 import paths need updates
  - Estimated effort: Medium

Suggestions:
  1. Update tests first
  2. Use IDE refactoring tools for renames
  3. Consider feature flags for gradual rollout
```

### MCP Tool

```typescript
drift_coupling({
  action: "refactor-impact",
  module: "src/services/user.ts"
})
```

---

## Understanding Metrics

### Afferent Coupling (Ca)

Number of modules that depend on this module.

- **High Ca** = Many dependents, changes are risky
- **Low Ca** = Few dependents, safe to change

### Efferent Coupling (Ce)

Number of modules this module depends on.

- **High Ce** = Depends on many things, fragile
- **Low Ce** = Self-contained, stable

### Instability (I)

```
I = Ce / (Ca + Ce)
```

- **I = 0** = Maximally stable (many dependents, few dependencies)
- **I = 1** = Maximally unstable (few dependents, many dependencies)

### Abstractness (A)

Ratio of abstract types to concrete implementations.

- **A = 0** = All concrete (implementation)
- **A = 1** = All abstract (interfaces)

### Distance from Main Sequence (D)

```
D = |A + I - 1|
```

- **D = 0** = Ideal balance
- **D > 0.5** = Problematic (too abstract or too concrete)

---

## CI/CD Integration

### Quality Gate

```bash
drift gate --gates coupling
```

Fails if:
- New dependency cycles introduced
- Coupling exceeds threshold
- New unused exports

### GitHub Actions

```yaml
- name: Check Coupling
  run: |
    drift coupling build
    drift coupling cycles --min-severity warning --ci
    drift coupling hotspots --min-coupling 20 --ci
```

---

## Best Practices

### 1. Fix Cycles First

Cycles are the most problematic coupling issue:

```bash
drift coupling cycles --min-severity critical
```

### 2. Monitor Hotspots

Track highly coupled modules:

```bash
drift coupling hotspots --min-coupling 15
```

### 3. Clean Up Dead Code

Remove unused exports regularly:

```bash
drift coupling unused-exports
```

### 4. Check Before Refactoring

```bash
drift coupling refactor-impact src/module-to-change.ts
```

### 5. Set Coupling Budgets

In CI, fail if coupling exceeds limits:

```bash
drift coupling hotspots --min-coupling 25 --fail-on-match
```

---

## Troubleshooting

### "No coupling data"

Run `drift coupling build` first.

### "Missing dependencies"

Dynamic imports and require() may not be detected. Check:

```bash
drift coupling analyze src/module.ts --verbose
```

### "False positive cycles"

Some cycles are intentional (e.g., type re-exports). Add exceptions:

```json
// .drift/config.json
{
  "coupling": {
    "ignoreCycles": [
      ["src/types/index.ts", "src/types/user.ts"]
    ]
  }
}
```

### "Slow analysis"

For large codebases:

```bash
# Analyze specific directory
drift coupling build --path src/services/

# Limit depth
drift coupling cycles --max-length 5
```
