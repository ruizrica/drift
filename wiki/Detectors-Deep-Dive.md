# Detectors Deep Dive

Drift includes **400+ pattern detectors** across 15 categories, with language-specific variants for 9 languages.

## Overview

Detectors are the core of Drift's pattern recognition. Each detector:
- Analyzes code using Tree-sitter AST parsing
- Identifies specific patterns with confidence scores
- Flags violations (outliers) from established patterns
- Supports multiple languages where applicable

---

## Detector Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DETECTOR TYPES                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Regex Detectors │  │ Semantic        │  │ Learning     │ │
│  │                 │  │ Detectors       │  │ Detectors    │ │
│  │ Fast pattern    │  │ AST-based       │  │ ML-enhanced  │ │
│  │ matching        │  │ deep analysis   │  │ detection    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Detector Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Regex** | Fast pattern matching | Simple patterns, naming conventions |
| **Semantic** | AST-based analysis | Complex patterns, code structure |
| **Learning** | ML-enhanced detection | Pattern evolution, confidence tuning |

---

## Detectors by Category

### API Detectors (8 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `http-methods` | HTTP method usage patterns | All |
| `route-structure` | URL path patterns | All |
| `response-envelope` | Response format consistency | All |
| `pagination` | Pagination patterns | All |
| `retry-patterns` | Retry and backoff logic | All |
| `error-format` | Error response structure | All |
| `client-patterns` | API client usage | All |

**Language-Specific:**
- Go: Gin, Echo, Chi, Fiber, net/http
- Rust: Actix, Axum, Rocket, Warp
- C++: Crow, Boost.Beast, cpp-httplib
- PHP/Laravel: Route definitions, controllers

### Auth Detectors (8 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `middleware-usage` | Auth middleware placement | All |
| `permission-checks` | Authorization checks | All |
| `token-handling` | JWT/session handling | All |
| `audit-logging` | Auth event logging | All |
| `resource-ownership` | User-scoped data | All |
| `rbac-patterns` | Role-based access | All |

**Language-Specific:**
- Go: Gin middleware, Echo middleware
- Rust: Actix guards, Axum extractors
- C++: Custom middleware patterns
- ASP.NET: [Authorize] attributes
- Laravel: Gates, Policies, Middleware

### Security Detectors (7 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `input-sanitization` | XSS prevention | All |
| `csrf-protection` | CSRF token validation | All |
| `sql-injection` | Parameterized queries | All |
| `rate-limiting` | Request throttling | All |
| `secret-management` | Env var usage | All |
| `csp-headers` | Content Security Policy | All |
| `xss-prevention` | Cross-site scripting | All |

**Language-Specific:**
- ASP.NET: AntiForgeryToken, ValidateInput
- Laravel: CSRF middleware, validation rules

### Error Detectors (8 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `try-catch-placement` | Error boundary locations | All |
| `error-propagation` | Error flow patterns | All |
| `exception-hierarchy` | Custom error classes | All |
| `error-logging` | Error logging patterns | All |
| `circuit-breaker` | Failure isolation | All |
| `async-errors` | Promise/async handling | TS, Rust, Go |
| `error-codes` | Error code patterns | All |

**Language-Specific:**
- Go: Error wrapping, sentinel errors
- Rust: Result<T, E>, thiserror, anyhow
- C++: Exception handling, RAII

### Logging Detectors (8 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `log-levels` | DEBUG/INFO/WARN/ERROR | All |
| `structured-format` | JSON logging | All |
| `correlation-ids` | Request tracing | All |
| `context-fields` | Log context | All |
| `pii-redaction` | Sensitive data masking | All |
| `health-checks` | Liveness/readiness | All |
| `metric-naming` | Metric conventions | All |

**Language-Specific:**
- ASP.NET: ILogger, Serilog patterns
- Laravel: Log facades, channels

### Data Access Detectors (8 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `repository-pattern` | Data abstraction | All |
| `query-patterns` | ORM usage | All |
| `n-plus-one` | Query optimization | All |
| `dto-patterns` | Data transfer objects | All |
| `transaction-patterns` | ACID compliance | All |
| `connection-pooling` | DB connections | All |
| `validation-patterns` | Input validation | All |

**ORM Support:**
| Language | ORMs |
|----------|------|
| TypeScript | Prisma, TypeORM, Drizzle, Sequelize, Mongoose |
| Python | Django ORM, SQLAlchemy, Tortoise, Peewee |
| Java | JPA, Hibernate, MyBatis, Spring Data |
| C# | Entity Framework, Dapper |
| PHP | Eloquent, Doctrine, PDO |
| Go | GORM, sqlx, database/sql, Ent, Bun |
| Rust | SQLx, Diesel, SeaORM |

### Config Detectors (7 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `environment-detection` | Dev/staging/prod | All |
| `feature-flags` | Toggle functionality | All |
| `default-values` | Fallback config | All |
| `required-optional` | Mandatory settings | All |
| `config-validation` | Config validation | All |
| `env-naming` | ENV_VAR naming | All |
| `constants-detector` | Constant patterns | All |

### Testing Detectors (8 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `file-naming` | Test file conventions | All |
| `describe-naming` | Test suite structure | All |
| `fixture-patterns` | Test data setup | All |
| `mock-patterns` | Mocking strategies | All |
| `setup-teardown` | Before/after hooks | All |
| `test-structure` | Arrange-Act-Assert | All |
| `co-location` | Tests near source | All |

**Framework Support:**
| Language | Frameworks |
|----------|------------|
| TypeScript | Jest, Vitest, Mocha, Jasmine |
| Python | pytest, unittest, nose |
| Java | JUnit, TestNG, Mockito |
| C# | xUnit, NUnit, MSTest |
| PHP | PHPUnit, Pest |
| Go | testing, testify, gomock |
| Rust | rust-test, tokio-test |
| C++ | Google Test, Catch2, Boost.Test |

### Performance Detectors (6 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `caching-patterns` | Cache usage | All |
| `code-splitting` | Dynamic imports | TS, JS |
| `lazy-loading` | Deferred loading | All |
| `memoization` | Computed caching | All |
| `debounce-throttle` | Rate limiting | All |
| `bundle-size` | Import optimization | TS, JS |

### Component Detectors (8 base)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `component-structure` | Component organization | TS, JS |
| `props-patterns` | Prop types/defaults | TS, JS |
| `state-patterns` | State management | TS, JS |
| `composition` | Component composition | TS, JS |
| `ref-forwarding` | Ref handling | TS, JS |
| `near-duplicate` | Similar components | TS, JS |
| `duplicate-detection` | Exact duplicates | TS, JS |

### Styling Detectors (8 base)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `class-naming` | BEM, utility-first | CSS, TS |
| `design-tokens` | Color, spacing, typography | CSS, TS |
| `responsive` | Breakpoints, media queries | CSS, TS |
| `spacing-scale` | Consistent spacing | CSS, TS |
| `typography` | Font usage | CSS, TS |
| `color-usage` | Color palette | CSS, TS |
| `z-index-scale` | Layering | CSS, TS |
| `tailwind-patterns` | Utility class usage | CSS, TS |

### Structural Detectors (8 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `file-naming` | Naming conventions | All |
| `directory-structure` | Folder organization | All |
| `barrel-exports` | Index files | TS, JS |
| `circular-deps` | Import cycles | All |
| `co-location` | Related files together | All |
| `import-ordering` | Import organization | All |
| `module-boundaries` | Package structure | All |
| `package-boundaries` | Monorepo boundaries | All |

### Types Detectors (7 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `any-usage` | Type safety violations | TS |
| `interface-vs-type` | Declaration style | TS |
| `generic-patterns` | Generic usage | TS, Java, C# |
| `naming-conventions` | Type naming | All |
| `type-assertions` | Cast usage | TS |
| `utility-types` | Built-in type usage | TS |
| `file-location` | Type file placement | TS |

### Accessibility Detectors (6 base)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `alt-text` | Image descriptions | TS, JS |
| `aria-roles` | Semantic roles | TS, JS |
| `keyboard-nav` | Focus handling | TS, JS |
| `focus-management` | Focus trapping | TS, JS |
| `heading-hierarchy` | H1-H6 structure | TS, JS |
| `semantic-html` | Proper elements | TS, JS |

### Documentation Detectors (5 base + language variants)

| Detector | Description | Languages |
|----------|-------------|-----------|
| `jsdoc-patterns` | Function documentation | TS, JS |
| `readme-structure` | Project documentation | All |
| `deprecation` | Deprecated code marking | All |
| `example-code` | Usage examples | All |
| `todo-patterns` | Task tracking | All |

---

## Language-Specific Detector Counts

| Language | Base Detectors | Framework Detectors | Total |
|----------|----------------|---------------------|-------|
| TypeScript/JS | 100+ | Express, React, NestJS, Next.js | 150+ |
| Python | 80+ | Django, FastAPI, Flask | 100+ |
| Java | 70+ | Spring, JAX-RS, Micronaut | 90+ |
| C# | 60+ | ASP.NET, Entity Framework | 80+ |
| PHP | 50+ | Laravel, Symfony | 70+ |
| Go | 50+ | Gin, Echo, Chi | 60+ |
| Rust | 40+ | Actix, Axum, Rocket | 50+ |
| C++ | 30+ | Qt, Boost, Crow | 40+ |

**Total: 400+ detectors**

---

## Detector Configuration

### .driftignore

Exclude files from detection:

```gitignore
# Ignore generated files
**/generated/**
**/*.generated.ts

# Ignore vendor code
vendor/
node_modules/

# Ignore specific patterns
**/legacy/**
```

### Per-Detector Configuration

In `.drift/config.json`:

```json
{
  "detectors": {
    "any-usage": {
      "enabled": true,
      "severity": "warning",
      "allowInTests": true
    },
    "console-log": {
      "enabled": true,
      "severity": "error",
      "allowInDev": true
    }
  }
}
```

---

## Creating Custom Detectors

### Detector Interface

```typescript
interface BaseDetector {
  id: string;
  category: PatternCategory;
  
  getInfo(): DetectorInfo;
  supportsLanguage(lang: string): boolean;
  detect(context: DetectionContext): Promise<DetectionResult>;
}
```

### Example Custom Detector

```typescript
export class CustomPatternDetector extends BaseDetector {
  id = 'custom-pattern';
  category = 'structural';
  
  getInfo() {
    return {
      name: 'Custom Pattern',
      description: 'Detects custom patterns',
      category: 'structural',
      subcategory: 'naming',
    };
  }
  
  supportsLanguage(lang: string) {
    return ['typescript', 'javascript'].includes(lang);
  }
  
  async detect(context: DetectionContext) {
    const patterns: PatternMatch[] = [];
    const violations: Violation[] = [];
    
    // Detection logic here
    
    return { patterns, violations };
  }
}
```

---

## Detector Performance

### Optimization Strategies

1. **Incremental Detection** — Only scan changed files
2. **Parallel Processing** — Run detectors concurrently
3. **Caching** — Cache AST parsing results
4. **Early Exit** — Skip files that don't match

### Performance Metrics

| Operation | Time |
|-----------|------|
| Single file scan | ~10-50ms |
| Full project scan (1000 files) | ~30-60s |
| Incremental scan (10 files) | ~1-2s |

---

## Next Steps

- [Pattern Categories](Pattern-Categories) — Category details
- [Language Support](Language-Support) — Language-specific features
- [Configuration](Configuration) — Detector configuration
