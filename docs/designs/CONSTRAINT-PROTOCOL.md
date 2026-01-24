# Constraint Protocol Design

> Learned Architectural Invariants for AI-Assisted Code Generation

## Executive Summary

The Constraint Protocol transforms Drift from a **descriptive** tool ("here's how your code works") into a **prescriptive** tool ("here's what your code MUST do"). By learning architectural invariants from the codebase itself, Drift can provide AI agents with guardrails that ensure generated code actually fits the codebase.

**Key Innovation:** Constraints are LEARNED from the codebase, not manually defined. They represent invariants that are true 95%+ of the time across the codebase.

---

## Why This Is Novel

### Current AI Coding Limitations

| Approach | What It Does | What It Can't Do |
|----------|--------------|------------------|
| **Linters** | Check predefined syntax/style rules | Know YOUR codebase's invariants |
| **RAG** | Find and copy similar code | Enforce that copied code follows invariants |
| **System Prompts** | Provide generic guidelines | Say "in THIS codebase, X always happens" |
| **drift_validate_change** | Check if code matches patterns | Enforce that code SATISFIES invariants |

### What Constraints Enable

- "All API endpoints in THIS codebase MUST have rate limiting"
- "Data access to users table MUST go through UserRepository"
- "All async operations MUST have error handling within 2 call levels"
- "All public API functions MUST have test coverage"

---

## Multi-Language Support

Constraints work across all 6 Drift-supported languages:

| Language | Frameworks | Constraint Examples |
|----------|------------|---------------------|
| **TypeScript/JavaScript** | Express, NestJS, Next.js, Fastify | Middleware chains, decorators, guards |
| **Python** | FastAPI, Django, Flask | Decorators, dependencies, middleware |
| **Java** | Spring Boot | Aspects, filters, annotations |
| **C#** | ASP.NET Core | Middleware, filters, attributes |
| **PHP** | Laravel | Middleware, policies, gates |

### Language-Specific Constraint Patterns

#### TypeScript/JavaScript
```typescript
// Constraint: API endpoints must have rate limiting
// Detected via: middleware chain analysis, decorator detection
{
  invariant: {
    type: 'must_precede',
    predicate: {
      entryPointMustHave: {
        inCallChain: ['rateLimiter', 'throttle', '@Throttle', '@RateLimit'],
        position: 'before_handler',
      },
    },
  },
}
```

#### Python
```typescript
// Constraint: FastAPI endpoints must have dependency injection for auth
// Detected via: decorator analysis, Depends() usage
{
  invariant: {
    type: 'must_have',
    predicate: {
      functionMustHave: {
        decorator: ['@router.get', '@router.post', '@app.get', '@app.post'],
        parameter: { type: 'Depends', contains: ['get_current_user', 'auth'] },
      },
    },
  },
}
```

#### Java (Spring Boot)
```typescript
// Constraint: Controllers must have @PreAuthorize or @Secured
// Detected via: annotation analysis
{
  invariant: {
    type: 'must_have',
    predicate: {
      classMustHave: {
        annotation: ['@RestController', '@Controller'],
        methodAnnotation: ['@PreAuthorize', '@Secured', '@RolesAllowed'],
      },
    },
  },
}
```

#### C# (ASP.NET Core)
```typescript
// Constraint: Controllers must have [Authorize] attribute
// Detected via: attribute analysis
{
  invariant: {
    type: 'must_have',
    predicate: {
      classMustHave: {
        attribute: ['[ApiController]'],
        classOrMethodAttribute: ['[Authorize]', '[AllowAnonymous]'],
      },
    },
  },
}
```

#### PHP (Laravel)
```typescript
// Constraint: Controllers must use middleware or policies
// Detected via: middleware registration, policy usage
{
  invariant: {
    type: 'must_have',
    predicate: {
      controllerMustHave: {
        middleware: ['auth', 'can:', 'permission:'],
        orMethod: ['authorize', '$this->authorize'],
      },
    },
  },
}
```

---

## Core Data Model

### Constraint Interface

```typescript
interface Constraint {
  /** Unique identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Detailed description */
  description: string;
  
  /** Constraint category */
  category: ConstraintCategory;
  
  /** What this constraint was derived from */
  derivedFrom: ConstraintSource;
  
  /** The invariant being enforced */
  invariant: ConstraintInvariant;
  
  /** Where this constraint applies */
  scope: ConstraintScope;
  
  /** Confidence metrics */
  confidence: ConstraintConfidence;
  
  /** Enforcement configuration */
  enforcement: ConstraintEnforcement;
  
  /** Lifecycle status */
  status: 'discovered' | 'approved' | 'ignored' | 'custom';
  
  /** Language this constraint applies to (or 'all') */
  language: ConstraintLanguage;
  
  /** Metadata */
  metadata: ConstraintMetadata;
}

type ConstraintCategory =
  | 'api'           // API endpoint constraints
  | 'auth'          // Authentication/authorization
  | 'data'          // Data access patterns
  | 'error'         // Error handling
  | 'test'          // Test coverage
  | 'security'      // Security patterns
  | 'structural'    // Module/file structure
  | 'performance'   // Performance patterns
  | 'logging'       // Logging requirements
  | 'validation';   // Input validation

type ConstraintLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'php'
  | 'all';

interface ConstraintSource {
  /** Pattern IDs this was derived from */
  patterns: string[];
  
  /** Call graph paths analyzed */
  callGraphPaths: string[];
  
  /** Boundary rules involved */
  boundaries: string[];
  
  /** Test topology data */
  testTopology?: string[];
  
  /** Error handling analysis */
  errorHandling?: string[];
  
  /** Module coupling data */
  moduleCoupling?: string[];
}
```



### Constraint Invariant Types

```typescript
interface ConstraintInvariant {
  /** Type of invariant */
  type: ConstraintType;
  
  /** Human-readable condition */
  condition: string;
  
  /** Machine-checkable predicate */
  predicate: ConstraintPredicate;
}

type ConstraintType =
  | 'must_have'        // X must exist when Y exists
  | 'must_not_have'    // X must not exist when Y exists
  | 'must_precede'     // X must happen before Y
  | 'must_follow'      // X must happen after Y
  | 'must_colocate'    // X and Y must be in same scope
  | 'must_separate'    // X and Y must be in different scopes
  | 'must_wrap'        // X must be wrapped by Y
  | 'must_propagate'   // X must propagate through call chain
  | 'cardinality'      // Exactly N of X per Y
  | 'data_flow'        // Data must flow through X before Y
  | 'naming'           // Must follow naming convention
  | 'structure';       // Must follow structural pattern

/** Language-agnostic predicate that can be evaluated */
interface ConstraintPredicate {
  // Entry point constraints
  entryPointMustHave?: {
    inCallChain?: string[];
    position?: 'before_handler' | 'after_handler' | 'anywhere';
    decorator?: string[];
    annotation?: string[];
    attribute?: string[];
    middleware?: string[];
  };
  
  // Function constraints
  functionMustHave?: {
    decorator?: string[];
    annotation?: string[];
    attribute?: string[];
    parameter?: { type: string; contains?: string[] };
    returnType?: string;
    errorHandling?: boolean;
    withinDepthOf?: { entryPoint: number };
  };
  
  // Class constraints
  classMustHave?: {
    decorator?: string[];
    annotation?: string[];
    attribute?: string[];
    implements?: string[];
    extends?: string[];
    methodAnnotation?: string[];
    classOrMethodAttribute?: string[];
  };
  
  // Data access constraints
  dataAccess?: {
    table: string;
    mustGoThrough?: string[];
    mustNotAccess?: string[];
    requiresAuth?: boolean;
  };
  
  // Call chain constraints
  callChain?: {
    from: string;
    to: string;
    mustInclude?: string[];
    mustNotInclude?: string[];
    maxDepth?: number;
  };
  
  // Test constraints
  testCoverage?: {
    minCoverage?: number;
    types?: ('unit' | 'integration' | 'e2e')[];
    mustTest?: ('happy_path' | 'error_cases' | 'edge_cases')[];
  };
  
  // Naming constraints
  naming?: {
    pattern: string;  // Regex
    scope: 'file' | 'function' | 'class' | 'variable';
  };
}
```

### Constraint Scope

```typescript
interface ConstraintScope {
  /** File glob patterns */
  files?: string[];
  
  /** Function name patterns */
  functions?: string[];
  
  /** Class name patterns */
  classes?: string[];
  
  /** Pattern categories */
  categories?: PatternCategory[];
  
  /** Apply to all entry points */
  entryPoints?: boolean;
  
  /** Apply to all data accessors */
  dataAccessors?: boolean;
  
  /** Apply to specific modules */
  modules?: string[];
  
  /** Exclude patterns */
  exclude?: {
    files?: string[];
    functions?: string[];
    classes?: string[];
  };
}
```

### Constraint Confidence

```typescript
interface ConstraintConfidence {
  /** Overall confidence score (0-1) */
  score: number;
  
  /** Number of conforming instances */
  evidence: number;
  
  /** Number of violations found */
  violations: number;
  
  /** Violation details for review */
  violationDetails?: Array<{
    file: string;
    line: number;
    reason: string;
  }>;
  
  /** When confidence was last calculated */
  lastVerified: string;
  
  /** Confidence trend */
  trend?: 'improving' | 'stable' | 'declining';
}
```

### Constraint Enforcement

```typescript
interface ConstraintEnforcement {
  /** Severity level */
  level: 'error' | 'warning' | 'info';
  
  /** Can this be auto-fixed? */
  autoFix?: ConstraintFix;
  
  /** Human guidance for fixing */
  guidance: string;
  
  /** Related documentation */
  docs?: string;
  
  /** Example of correct implementation */
  example?: {
    file: string;
    line: number;
    code: string;
  };
}

interface ConstraintFix {
  /** Type of fix */
  type: 'add_decorator' | 'add_middleware' | 'wrap_try_catch' | 
        'add_annotation' | 'add_attribute' | 'add_import' | 
        'add_parameter' | 'refactor';
  
  /** Fix template (language-specific) */
  template: string;
  
  /** Templates per language */
  templates?: Record<ConstraintLanguage, string>;
  
  /** Confidence that fix is correct */
  confidence: number;
}
```

### Constraint Metadata

```typescript
interface ConstraintMetadata {
  /** When first discovered */
  createdAt: string;
  
  /** When last updated */
  updatedAt: string;
  
  /** Who approved (if approved) */
  approvedBy?: string;
  
  /** When approved */
  approvedAt?: string;
  
  /** Tags for filtering */
  tags?: string[];
  
  /** Related constraints */
  relatedConstraints?: string[];
  
  /** Notes */
  notes?: string;
}
```

---

## Storage Architecture

### Directory Structure

```
.drift/
├── constraints/
│   ├── discovered/           # Auto-discovered constraints
│   │   ├── api.json
│   │   ├── auth.json
│   │   ├── data.json
│   │   ├── error.json
│   │   ├── test.json
│   │   ├── security.json
│   │   └── structural.json
│   ├── approved/             # User-approved constraints
│   │   └── {category}.json
│   ├── ignored/              # User-ignored constraints
│   │   └── {category}.json
│   ├── custom/               # User-defined constraints
│   │   └── {category}.json
│   ├── index.json            # Quick lookup index
│   └── history/              # Constraint change history
│       └── {date}.json
```

### Index Schema

```typescript
interface ConstraintIndex {
  version: string;
  generatedAt: string;
  
  /** Total counts */
  counts: {
    total: number;
    byStatus: Record<ConstraintStatus, number>;
    byCategory: Record<ConstraintCategory, number>;
    byLanguage: Record<ConstraintLanguage, number>;
  };
  
  /** Quick lookup maps */
  byFile: Record<string, string[]>;      // file glob → constraint IDs
  byCategory: Record<string, string[]>;  // category → constraint IDs
  byLanguage: Record<string, string[]>;  // language → constraint IDs
  
  /** Constraint summaries for fast listing */
  summaries: ConstraintSummary[];
}

interface ConstraintSummary {
  id: string;
  name: string;
  category: ConstraintCategory;
  language: ConstraintLanguage;
  status: ConstraintStatus;
  confidence: number;
  enforcement: 'error' | 'warning' | 'info';
  evidence: number;
  violations: number;
}
```



---

## Constraint Extraction Pipeline

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONSTRAINT EXTRACTION PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    EXISTING DRIFT DATA                               │   │
│  │                                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Patterns │ │CallGraph │ │Boundaries│ │  Test    │ │  Error   │  │   │
│  │  │  Store   │ │  Store   │ │  Store   │ │ Topology │ │ Handling │  │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │   │
│  │       │            │            │            │            │         │   │
│  └───────┼────────────┼────────────┼────────────┼────────────┼─────────┘   │
│          │            │            │            │            │              │
│          ▼            ▼            ▼            ▼            ▼              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    INVARIANT DETECTOR                                │   │
│  │                                                                      │   │
│  │  For each high-confidence pattern (>90%):                           │   │
│  │    1. Collect ALL instances across codebase                         │   │
│  │    2. Analyze what's ALWAYS true at those locations                 │   │
│  │    3. Cross-reference with call graph (predecessors/successors)     │   │
│  │    4. Cross-reference with boundaries (data access patterns)        │   │
│  │    5. Cross-reference with test topology (coverage patterns)        │   │
│  │    6. Cross-reference with error handling (error boundaries)        │   │
│  │    7. If something is true 95%+ → candidate constraint              │   │
│  │                                                                      │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                             │
│                               ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CONSTRAINT SYNTHESIZER                            │   │
│  │                                                                      │   │
│  │  For each candidate invariant:                                      │   │
│  │    1. Determine constraint type (must_have, must_precede, etc.)     │   │
│  │    2. Build language-agnostic predicate                             │   │
│  │    3. Define scope (files, functions, entry points, etc.)           │   │
│  │    4. Calculate confidence score                                    │   │
│  │    5. Identify violations (the 5% that don't conform)               │   │
│  │    6. Generate human-readable description                           │   │
│  │    7. Generate fix suggestions                                      │   │
│  │                                                                      │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                             │
│                               ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CONSTRAINT STORE                                  │   │
│  │                                                                      │   │
│  │  .drift/constraints/discovered/{category}.json                      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Category-Specific Extractors

#### API Constraint Extractor

```typescript
// packages/core/src/constraints/extraction/api-constraint-extractor.ts

/**
 * Extracts API-related constraints from patterns and call graph.
 * 
 * Looks for:
 * - Middleware patterns (rate limiting, auth, validation)
 * - Decorator patterns (@RateLimit, @Auth, @Validate)
 * - Response format patterns
 * - Error handling patterns at entry points
 */
export class ApiConstraintExtractor {
  constructor(
    private patternStore: PatternStore,
    private callGraphStore: CallGraphStore,
    private languageIntelligence: LanguageIntelligence,
  ) {}

  async extract(): Promise<Constraint[]> {
    const constraints: Constraint[] = [];
    
    // Get all entry points
    const entryPoints = await this.callGraphStore.getEntryPoints();
    
    // Analyze what's common across entry points
    const commonPatterns = this.findCommonPatterns(entryPoints);
    
    // For each common pattern, create a constraint
    for (const pattern of commonPatterns) {
      if (pattern.frequency >= 0.95) {
        constraints.push(this.synthesizeConstraint(pattern));
      }
    }
    
    return constraints;
  }
  
  private findCommonPatterns(entryPoints: EntryPoint[]): CommonPattern[] {
    // Analyze middleware chains
    // Analyze decorators/annotations
    // Analyze call predecessors
    // Return patterns that appear in 95%+ of entry points
  }
}
```

#### Auth Constraint Extractor

```typescript
// packages/core/src/constraints/extraction/auth-constraint-extractor.ts

/**
 * Extracts authentication/authorization constraints.
 * 
 * Looks for:
 * - Auth checks before data access
 * - Role/permission patterns
 * - Session validation patterns
 * - Token verification patterns
 */
export class AuthConstraintExtractor {
  async extract(): Promise<Constraint[]> {
    const constraints: Constraint[] = [];
    
    // Find all auth-related patterns
    const authPatterns = await this.patternStore.query({
      categories: ['auth', 'security'],
      minConfidence: 0.9,
    });
    
    // Analyze call graph for auth → data access patterns
    const authDataPaths = await this.analyzeAuthDataPaths();
    
    // Create constraints for consistent patterns
    for (const path of authDataPaths) {
      if (path.frequency >= 0.95) {
        constraints.push({
          id: `auth-before-${path.dataAccess}`,
          name: `Auth Required Before ${path.dataAccess}`,
          category: 'auth',
          invariant: {
            type: 'must_precede',
            condition: `Authentication must occur before accessing ${path.dataAccess}`,
            predicate: {
              callChain: {
                from: 'entryPoint',
                to: path.dataAccess,
                mustInclude: path.authFunctions,
              },
            },
          },
          // ... rest of constraint
        });
      }
    }
    
    return constraints;
  }
}
```

#### Data Constraint Extractor

```typescript
// packages/core/src/constraints/extraction/data-constraint-extractor.ts

/**
 * Extracts data access constraints from boundaries and call graph.
 * 
 * Looks for:
 * - Repository patterns (all access through repository)
 * - Service layer patterns
 * - Data validation patterns
 * - Sensitive data access patterns
 */
export class DataConstraintExtractor {
  async extract(): Promise<Constraint[]> {
    const constraints: Constraint[] = [];
    
    // Get boundary data
    const accessMap = await this.boundaryStore.getAccessMap();
    
    // For each table, analyze access patterns
    for (const [table, accessPoints] of Object.entries(accessMap.tables)) {
      const accessPatterns = this.analyzeAccessPatterns(accessPoints);
      
      // If all access goes through a specific class/function
      if (accessPatterns.singleAccessor && accessPatterns.frequency >= 0.95) {
        constraints.push({
          id: `data-access-${table}`,
          name: `${table} Access via ${accessPatterns.accessor}`,
          category: 'data',
          invariant: {
            type: 'must_wrap',
            condition: `All ${table} access must go through ${accessPatterns.accessor}`,
            predicate: {
              dataAccess: {
                table,
                mustGoThrough: [accessPatterns.accessor],
              },
            },
          },
          // ... rest of constraint
        });
      }
    }
    
    return constraints;
  }
}
```

#### Error Constraint Extractor

```typescript
// packages/core/src/constraints/extraction/error-constraint-extractor.ts

/**
 * Extracts error handling constraints from error analysis.
 * 
 * Looks for:
 * - Error handling at entry points
 * - Async error handling patterns
 * - Error propagation patterns
 * - Error boundary patterns
 */
export class ErrorConstraintExtractor {
  async extract(): Promise<Constraint[]> {
    const constraints: Constraint[] = [];
    
    // Get error handling analysis
    const errorAnalysis = await this.errorHandlingAnalyzer.analyze();
    
    // Analyze error handling patterns near entry points
    const entryPointErrorPatterns = this.analyzeEntryPointErrors(errorAnalysis);
    
    // If most entry points have error handling within N levels
    if (entryPointErrorPatterns.frequency >= 0.95) {
      constraints.push({
        id: 'error-handling-entry-points',
        name: 'Error Handling Required Near Entry Points',
        category: 'error',
        invariant: {
          type: 'must_have',
          condition: `Async functions within ${entryPointErrorPatterns.depth} levels of entry points must have error handling`,
          predicate: {
            functionMustHave: {
              errorHandling: true,
              withinDepthOf: { entryPoint: entryPointErrorPatterns.depth },
            },
          },
        },
        // ... rest of constraint
      });
    }
    
    return constraints;
  }
}
```

#### Test Constraint Extractor

```typescript
// packages/core/src/constraints/extraction/test-constraint-extractor.ts

/**
 * Extracts test coverage constraints from test topology.
 * 
 * Looks for:
 * - Test coverage patterns for public APIs
 * - Mock usage patterns
 * - Test file naming patterns
 * - Test organization patterns
 */
export class TestConstraintExtractor {
  async extract(): Promise<Constraint[]> {
    const constraints: Constraint[] = [];
    
    // Get test topology
    const topology = await this.testTopologyAnalyzer.analyze();
    
    // Analyze coverage patterns for entry points
    const entryPointCoverage = this.analyzeEntryPointCoverage(topology);
    
    // If most entry points have test coverage
    if (entryPointCoverage.frequency >= 0.90) {
      constraints.push({
        id: 'test-coverage-entry-points',
        name: 'Test Coverage Required for API Endpoints',
        category: 'test',
        invariant: {
          type: 'must_have',
          condition: 'All public API endpoints must have at least one test',
          predicate: {
            testCoverage: {
              minCoverage: 1,
              types: ['unit', 'integration'],
            },
          },
        },
        scope: {
          entryPoints: true,
        },
        // ... rest of constraint
      });
    }
    
    return constraints;
  }
}
```



---

## Constraint Verification Engine

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONSTRAINT VERIFICATION ENGINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUT: Code content + target file path                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SCOPE RESOLVER                                    │   │
│  │                                                                      │   │
│  │  1. Determine language from file extension                          │   │
│  │  2. Find all constraints applicable to this file                    │   │
│  │  3. Filter by scope (entry points, data accessors, etc.)            │   │
│  │  4. Return ordered list of constraints to check                     │   │
│  │                                                                      │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                             │
│                               ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CODE PARSER                                       │   │
│  │                                                                      │   │
│  │  1. Parse code using Tree-sitter (language-specific)                │   │
│  │  2. Extract functions, classes, decorators, annotations             │   │
│  │  3. Build mini call graph for the file                              │   │
│  │  4. Identify entry points, data accessors                           │   │
│  │                                                                      │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                             │
│                               ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PREDICATE EVALUATOR                               │   │
│  │                                                                      │   │
│  │  For each applicable constraint:                                    │   │
│  │    1. Select appropriate evaluator based on constraint type         │   │
│  │    2. Evaluate predicate against parsed code                        │   │
│  │    3. Record pass/fail with details                                 │   │
│  │                                                                      │   │
│  │  Evaluators:                                                        │   │
│  │    - MustHaveEvaluator                                              │   │
│  │    - MustPrecedeEvaluator                                           │   │
│  │    - MustWrapEvaluator                                              │   │
│  │    - DataFlowEvaluator                                              │   │
│  │    - TestCoverageEvaluator                                          │   │
│  │    - NamingEvaluator                                                │   │
│  │                                                                      │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                             │
│                               ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FIX GENERATOR                                     │   │
│  │                                                                      │   │
│  │  For each violation:                                                │   │
│  │    1. Check if auto-fix is available                                │   │
│  │    2. Generate language-specific fix suggestion                     │   │
│  │    3. Include example from codebase                                 │   │
│  │                                                                      │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                             │
│                               ▼                                             │
│  OUTPUT: VerificationResult                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Verification Result

```typescript
interface VerificationResult {
  /** Overall pass/fail */
  passed: boolean;
  
  /** Summary message */
  summary: string;
  
  /** Constraints that were satisfied */
  satisfied: SatisfiedConstraint[];
  
  /** Constraints that were violated */
  violations: ConstraintViolation[];
  
  /** Constraints that couldn't be checked */
  skipped: SkippedConstraint[];
  
  /** Execution metadata */
  metadata: {
    file: string;
    language: ConstraintLanguage;
    constraintsChecked: number;
    executionTimeMs: number;
  };
}

interface SatisfiedConstraint {
  constraintId: string;
  constraintName: string;
  category: ConstraintCategory;
}

interface ConstraintViolation {
  constraintId: string;
  constraintName: string;
  category: ConstraintCategory;
  severity: 'error' | 'warning' | 'info';
  
  /** What was violated */
  message: string;
  
  /** Where in the code */
  location: {
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
  };
  
  /** Fix suggestion */
  fix?: {
    type: string;
    suggestion: string;
    confidence: number;
  };
  
  /** Example of correct implementation */
  example?: {
    file: string;
    line: number;
    code: string;
  };
  
  /** Human guidance */
  guidance: string;
}

interface SkippedConstraint {
  constraintId: string;
  constraintName: string;
  reason: string;
}
```

### Language-Specific Evaluators

Each evaluator handles language-specific syntax while maintaining a unified interface:

```typescript
// Base evaluator interface
interface PredicateEvaluator {
  evaluate(
    predicate: ConstraintPredicate,
    parsedCode: ParsedCode,
    context: EvaluationContext,
  ): EvaluationResult;
}

// Language-specific implementations
class TypeScriptMustHaveEvaluator implements PredicateEvaluator {
  evaluate(predicate, parsedCode, context): EvaluationResult {
    // Check for decorators: @RateLimit, @Auth, etc.
    // Check for middleware in call chain
    // Check for specific imports
  }
}

class PythonMustHaveEvaluator implements PredicateEvaluator {
  evaluate(predicate, parsedCode, context): EvaluationResult {
    // Check for decorators: @limiter, @auth_required, etc.
    // Check for Depends() parameters
    // Check for middleware registration
  }
}

class JavaMustHaveEvaluator implements PredicateEvaluator {
  evaluate(predicate, parsedCode, context): EvaluationResult {
    // Check for annotations: @PreAuthorize, @RateLimited, etc.
    // Check for aspect pointcuts
    // Check for filter registration
  }
}

class CSharpMustHaveEvaluator implements PredicateEvaluator {
  evaluate(predicate, parsedCode, context): EvaluationResult {
    // Check for attributes: [Authorize], [RateLimit], etc.
    // Check for middleware registration
    // Check for filter attributes
  }
}

class PhpMustHaveEvaluator implements PredicateEvaluator {
  evaluate(predicate, parsedCode, context): EvaluationResult {
    // Check for middleware: ->middleware('auth')
    // Check for policy usage: $this->authorize()
    // Check for gate checks: Gate::allows()
  }
}
```

---

## CLI Integration

### Command: `drift constraints`

```bash
# Extract constraints from codebase
drift constraints extract [options]
  --min-confidence <n>    Minimum confidence threshold (default: 0.90)
  --categories <list>     Categories to extract (default: all)
  --force                 Re-extract even if recent extraction exists

# List constraints
drift constraints list [options]
  --status <status>       Filter by status (discovered/approved/ignored/custom)
  --category <category>   Filter by category
  --language <lang>       Filter by language
  --format <format>       Output format (text/json/table)

# Show constraint details
drift constraints show <id>
  --verbose               Show full details including violations

# Approve a constraint
drift constraints approve <id> [options]
  --yes                   Skip confirmation
  --note <note>           Add approval note

# Ignore a constraint
drift constraints ignore <id> [options]
  --yes                   Skip confirmation
  --reason <reason>       Reason for ignoring

# Verify code against constraints
drift constraints verify <file> [options]
  --content <content>     Code content (alternative to file)
  --strict                Fail on any violation including warnings
  --format <format>       Output format (text/json/github/gitlab)

# Check all files for constraint violations
drift constraints check [options]
  --staged                Only check staged files
  --ci                    CI mode (exit code based on violations)
  --format <format>       Output format

# Create custom constraint
drift constraints create [options]
  --interactive           Interactive constraint builder
  --from-file <file>      Create from JSON file

# Export constraints
drift constraints export [options]
  --format <format>       Export format (json/yaml/markdown)
  --output <file>         Output file
```

### CLI Output Examples

```bash
$ drift constraints list

Constraints (47 total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APPROVED (12)
  ✓ api-rate-limit-required      API endpoints must have rate limiting     98%
  ✓ auth-before-user-data        Auth required before user data access     100%
  ✓ error-handling-async         Async functions must have error handling  95%
  ...

DISCOVERED (32)
  ? data-access-via-repository   User data must go through UserRepository  97%
  ? test-coverage-controllers    Controllers must have test coverage       92%
  ? validation-on-post           POST endpoints must validate input        96%
  ...

IGNORED (3)
  ✗ naming-convention-utils      Utils must follow naming pattern          89%
  ...

$ drift constraints verify src/api/payments.ts

Verifying src/api/payments.ts against 8 applicable constraints...

✓ api-rate-limit-required       Rate limiting middleware present
✓ auth-before-payment-data      Auth check before payment access
✗ error-handling-async          Missing error handling in processPayment()
  
  Line 45: async function processPayment() {
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  
  Suggestion: Wrap async operations in try-catch
  
  Example from src/api/orders.ts:23
  ```typescript
  async function processOrder() {
    try {
      // ... operation
    } catch (error) {
      logger.error('Order processing failed', error);
      throw new OrderProcessingError(error);
    }
  }
  ```

✓ validation-on-post            Input validation present

Result: 1 error, 0 warnings
```



---

## MCP Integration

### Tool: `drift_constraints`

```typescript
{
  name: 'drift_constraints',
  description: 'List and query architectural constraints learned from the codebase. ' +
    'Constraints are invariants that MUST be satisfied, derived from patterns, ' +
    'call graphs, boundaries, and test topology. ' +
    'Use this to understand what rules apply before generating code.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'get', 'for_file', 'for_intent', 'categories'],
        description: 'Action to perform',
        default: 'list',
      },
      id: {
        type: 'string',
        description: 'Constraint ID (for "get" action)',
      },
      category: {
        type: 'string',
        enum: ['api', 'auth', 'data', 'error', 'test', 'security', 'structural', 'all'],
        description: 'Filter by constraint category',
      },
      status: {
        type: 'string',
        enum: ['all', 'approved', 'discovered', 'ignored', 'custom'],
        description: 'Filter by approval status (default: approved + discovered)',
      },
      language: {
        type: 'string',
        enum: ['typescript', 'javascript', 'python', 'java', 'csharp', 'php', 'all'],
        description: 'Filter by language',
      },
      file: {
        type: 'string',
        description: 'Get constraints applicable to a specific file (for "for_file" action)',
      },
      intent: {
        type: 'string',
        enum: ['add_feature', 'fix_bug', 'refactor', 'security_audit', 'add_test'],
        description: 'Get constraints relevant to a task intent (for "for_intent" action)',
      },
      focus: {
        type: 'string',
        description: 'Focus area (used with "for_intent" action)',
      },
      minConfidence: {
        type: 'number',
        description: 'Minimum confidence threshold (0-1)',
        default: 0.9,
      },
      limit: {
        type: 'number',
        description: 'Maximum constraints to return',
        default: 20,
      },
    },
  },
}
```

### Tool: `drift_verify_constraints`

```typescript
{
  name: 'drift_verify_constraints',
  description: 'Verify that code satisfies all applicable architectural constraints. ' +
    'Returns violations with fix suggestions. ' +
    'Use BEFORE committing code to ensure it follows codebase invariants.',
  inputSchema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        description: 'File path where the code will be placed (required)',
      },
      content: {
        type: 'string',
        description: 'The code content to verify',
      },
      diff: {
        type: 'string',
        description: 'Alternative: unified diff format of the change',
      },
      constraints: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific constraint IDs to check (default: all applicable)',
      },
      strictMode: {
        type: 'boolean',
        description: 'Fail on any violation including warnings (default: false)',
        default: false,
      },
      includeExamples: {
        type: 'boolean',
        description: 'Include code examples for violations (default: true)',
        default: true,
      },
    },
    required: ['file'],
  },
}
```

### Enhanced `drift_context` Response

```typescript
// The drift_context tool is enhanced to include constraints automatically

interface ConstraintAwareContextPackage extends ContextPackage {
  // Existing fields...
  summary: string;
  relevantPatterns: RelevantPattern[];
  suggestedFiles: SuggestedFile[];
  guidance: Guidance;
  warnings: Warning[];
  confidence: Confidence;
  deeperDive: DeeperDive[];
  semanticInsights?: SemanticInsights;
  
  // NEW: Active constraints for this task
  constraints: {
    /** Constraints that MUST be satisfied */
    required: Array<{
      id: string;
      name: string;
      category: ConstraintCategory;
      description: string;
      enforcement: 'error' | 'warning';
      language: ConstraintLanguage;
      /** How to verify this constraint */
      verifyWith: 'drift_verify_constraints';
    }>;
    
    /** Constraints that SHOULD be satisfied */
    recommended: Array<{
      id: string;
      name: string;
      category: ConstraintCategory;
      description: string;
      rationale: string;
    }>;
    
    /** Existing violations in the focus area (tech debt) */
    existingViolations: Array<{
      constraintId: string;
      constraintName: string;
      file: string;
      line: number;
      message: string;
    }>;
    
    /** Summary statistics */
    summary: {
      requiredCount: number;
      recommendedCount: number;
      existingViolationCount: number;
    };
  };
  
  // NEW: Constraint-aware guidance
  constraintGuidance: {
    /** Things to ensure before starting */
    beforeYouStart: string[];
    
    /** Things to remember during implementation */
    duringImplementation: string[];
    
    /** Things to verify before committing */
    beforeCommit: string[];
  };
}
```

### MCP Response Examples

#### `drift_constraints` Response

```json
{
  "content": [{
    "type": "text",
    "text": "Found 8 constraints applicable to API development.\n\nRequired (error level):\n- api-rate-limit-required: All API endpoints must have rate limiting (98% confidence)\n- auth-before-data: Auth must precede data access (100% confidence)\n\nRecommended (warning level):\n- validation-on-post: POST endpoints should validate input (96% confidence)\n- error-handling-async: Async functions should have error handling (95% confidence)\n\nUse drift_verify_constraints to check your code against these constraints."
  }],
  "data": {
    "constraints": [
      {
        "id": "api-rate-limit-required",
        "name": "API Rate Limiting Required",
        "category": "api",
        "description": "All API endpoints must have rate limiting middleware",
        "confidence": 0.98,
        "enforcement": "error",
        "language": "all",
        "scope": { "entryPoints": true }
      }
    ],
    "summary": {
      "total": 8,
      "required": 2,
      "recommended": 6
    }
  }
}
```

#### `drift_verify_constraints` Response

```json
{
  "content": [{
    "type": "text",
    "text": "Verification failed: 1 error, 1 warning\n\n❌ ERROR: error-handling-async\n   Line 45: async function processPayment() missing error handling\n   Fix: Wrap in try-catch with proper error logging\n\n⚠️ WARNING: validation-on-post\n   Line 30: POST handler missing input validation\n   Fix: Add validation middleware or schema check\n\n✅ PASSED: api-rate-limit-required, auth-before-data"
  }],
  "data": {
    "passed": false,
    "summary": "1 error, 1 warning, 2 passed",
    "violations": [
      {
        "constraintId": "error-handling-async",
        "constraintName": "Async Error Handling Required",
        "severity": "error",
        "message": "Async function processPayment() missing error handling",
        "location": { "line": 45, "column": 1 },
        "fix": {
          "type": "wrap_try_catch",
          "suggestion": "try {\n  // existing code\n} catch (error) {\n  logger.error('Payment processing failed', error);\n  throw error;\n}",
          "confidence": 0.9
        },
        "example": {
          "file": "src/api/orders.ts",
          "line": 23,
          "code": "async function processOrder() {\n  try {\n    // ...\n  } catch (error) {\n    logger.error('Order failed', error);\n    throw new OrderError(error);\n  }\n}"
        }
      }
    ],
    "satisfied": [
      { "constraintId": "api-rate-limit-required", "constraintName": "API Rate Limiting Required" },
      { "constraintId": "auth-before-data", "constraintName": "Auth Before Data Access" }
    ]
  }
}
```

---

## Integration with Existing Tools

### Integration Points

| Existing Tool | Integration |
|---------------|-------------|
| `drift_context` | Auto-inject relevant constraints based on intent and focus |
| `drift_validate_change` | Add constraint verification alongside pattern validation |
| `drift_suggest_changes` | Include constraint-aware suggestions |
| `drift_code_examples` | Show examples that satisfy constraints |
| `drift_impact_analysis` | Show which constraints might be affected by changes |

### Workflow Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AI AGENT WORKFLOW WITH CONSTRAINTS                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Agent receives task: "Add payment processing endpoint"                 │
│                                                                             │
│  2. Agent calls drift_context(intent: "add_feature", focus: "payments")    │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │ Response includes:                                               │    │
│     │ - relevantPatterns: [payment-handler, api-response-format, ...]  │    │
│     │ - constraints.required: [                                        │    │
│     │     { id: "api-rate-limit", ... },                              │    │
│     │     { id: "auth-before-payment", ... },                         │    │
│     │     { id: "idempotency-key", ... }                              │    │
│     │   ]                                                              │    │
│     │ - constraintGuidance.duringImplementation: [                     │    │
│     │     "Add rate limiting middleware",                              │    │
│     │     "Require idempotency key for POST",                         │    │
│     │     "Validate payment amount and currency"                       │    │
│     │   ]                                                              │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  3. Agent generates code WITH constraints in mind (proactive)              │
│                                                                             │
│  4. Agent calls drift_verify_constraints(file: "...", content: "...")      │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │ Response:                                                        │    │
│     │ - passed: false                                                  │    │
│     │ - violations: [{ id: "idempotency-key", fix: "..." }]           │    │
│     │ - satisfied: ["api-rate-limit", "auth-before-payment"]          │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  5. Agent fixes violations based on suggestions                            │
│                                                                             │
│  6. Agent re-verifies until all constraints pass                           │
│                                                                             │
│  7. Code is ready - follows all codebase invariants                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```



---

## File Structure

### Core Package

```
packages/core/src/constraints/
├── index.ts                           # Public exports
├── types.ts                           # All type definitions
│
├── store/
│   ├── constraint-store.ts            # Main store class
│   ├── constraint-index.ts            # Index management
│   └── constraint-history.ts          # Change tracking
│
├── extraction/
│   ├── index.ts                       # Extraction orchestrator
│   ├── invariant-detector.ts          # Finds candidate invariants
│   ├── constraint-synthesizer.ts      # Converts invariants to constraints
│   │
│   ├── extractors/
│   │   ├── base-extractor.ts          # Abstract base class
│   │   ├── api-constraint-extractor.ts
│   │   ├── auth-constraint-extractor.ts
│   │   ├── data-constraint-extractor.ts
│   │   ├── error-constraint-extractor.ts
│   │   ├── test-constraint-extractor.ts
│   │   ├── security-constraint-extractor.ts
│   │   └── structural-constraint-extractor.ts
│   │
│   └── analyzers/
│       ├── pattern-frequency-analyzer.ts
│       ├── call-chain-analyzer.ts
│       └── coverage-analyzer.ts
│
├── verification/
│   ├── index.ts                       # Verification orchestrator
│   ├── constraint-verifier.ts         # Main verifier class
│   ├── scope-resolver.ts              # Determines applicable constraints
│   ├── fix-generator.ts               # Generates fix suggestions
│   │
│   └── evaluators/
│       ├── base-evaluator.ts          # Abstract base class
│       ├── must-have-evaluator.ts
│       ├── must-precede-evaluator.ts
│       ├── must-wrap-evaluator.ts
│       ├── data-flow-evaluator.ts
│       ├── test-coverage-evaluator.ts
│       ├── naming-evaluator.ts
│       │
│       └── language/
│           ├── typescript-evaluators.ts
│           ├── python-evaluators.ts
│           ├── java-evaluators.ts
│           ├── csharp-evaluators.ts
│           └── php-evaluators.ts
│
└── __tests__/
    ├── constraint-store.test.ts
    ├── extraction.test.ts
    ├── verification.test.ts
    └── evaluators.test.ts
```

### CLI Package

```
packages/cli/src/commands/
└── constraints.ts                     # drift constraints command
```

### MCP Package

```
packages/mcp/src/tools/
├── constraints/
│   ├── index.ts                       # Tool exports
│   ├── constraints.ts                 # drift_constraints handler
│   └── verify.ts                      # drift_verify_constraints handler
│
└── orchestration/
    └── context.ts                     # Enhanced with constraints
```

---

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

#### Week 1: Types and Storage

- [ ] Define all types in `packages/core/src/constraints/types.ts`
  - Constraint interface
  - ConstraintType enum
  - ConstraintPredicate interface
  - ConstraintScope interface
  - VerificationResult interface

- [ ] Implement ConstraintStore in `packages/core/src/constraints/store/`
  - File-based storage (discovered/approved/ignored/custom)
  - CRUD operations
  - Query methods (by category, status, language, file)
  - Index management

- [ ] Add constraint storage to `.drift/` directory structure

#### Week 2: Basic Extraction

- [ ] Implement InvariantDetector
  - Analyze high-confidence patterns
  - Find common characteristics
  - Calculate frequency scores

- [ ] Implement ConstraintSynthesizer
  - Convert invariants to constraints
  - Generate predicates
  - Calculate confidence

- [ ] Implement base extractors
  - ApiConstraintExtractor (basic)
  - AuthConstraintExtractor (basic)

### Phase 2: Full Extraction (Weeks 3-4)

#### Week 3: Category Extractors

- [ ] Complete all category extractors:
  - DataConstraintExtractor
  - ErrorConstraintExtractor
  - TestConstraintExtractor
  - SecurityConstraintExtractor
  - StructuralConstraintExtractor

- [ ] Add language-specific extraction logic
  - TypeScript/JavaScript patterns
  - Python patterns
  - Java patterns
  - C# patterns
  - PHP patterns

#### Week 4: CLI Integration

- [ ] Implement `drift constraints` command
  - `extract` subcommand
  - `list` subcommand
  - `show` subcommand
  - `approve` subcommand
  - `ignore` subcommand

- [ ] Add constraint extraction to `drift scan`
  - Optional `--constraints` flag
  - Auto-extract after pattern detection

### Phase 3: Verification (Weeks 5-6)

#### Week 5: Verification Engine

- [ ] Implement ConstraintVerifier
  - Scope resolution
  - Code parsing
  - Predicate evaluation

- [ ] Implement base evaluators
  - MustHaveEvaluator
  - MustPrecedeEvaluator
  - MustWrapEvaluator

- [ ] Implement language-specific evaluators
  - TypeScript evaluators
  - Python evaluators
  - Java evaluators
  - C# evaluators
  - PHP evaluators

#### Week 6: Fix Generation and CLI

- [ ] Implement FixGenerator
  - Template-based fixes
  - Language-specific templates
  - Example extraction

- [ ] Add verification CLI commands
  - `drift constraints verify`
  - `drift constraints check`

- [ ] Add CI integration
  - Exit codes
  - GitHub/GitLab output formats

### Phase 4: MCP Integration (Week 7)

- [ ] Implement `drift_constraints` MCP tool
  - List action
  - Get action
  - For_file action
  - For_intent action

- [ ] Implement `drift_verify_constraints` MCP tool
  - Content verification
  - Diff verification
  - Fix suggestions

- [ ] Enhance `drift_context`
  - Add constraints field
  - Add constraintGuidance field
  - Auto-inject based on intent

### Phase 5: Testing and Polish (Week 8)

- [ ] Unit tests for all components
- [ ] Integration tests with demo repos
  - TypeScript demo
  - Python demo
  - Java demo
  - C# demo
  - PHP demo

- [ ] E2E tests for CLI and MCP
- [ ] Documentation
- [ ] Performance optimization

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Constraint extraction accuracy | >85% | Manual review of discovered constraints |
| Verification speed | <500ms | Time to verify single file |
| False positive rate | <10% | Violations that aren't real issues |
| False negative rate | <5% | Missed violations |
| Language coverage | 100% | All 6 languages supported |
| CLI/MCP parity | 100% | All features available in both |
| AI agent adoption | >50% | Constraints used in code generation tasks |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Too many false positives | Users ignore constraints | High confidence threshold (95%), easy ignore workflow |
| Extraction too slow | Poor UX | Incremental extraction, caching |
| Language-specific edge cases | Incomplete coverage | Regex fallback, community contributions |
| Constraint conflicts | Confusing guidance | Conflict detection, priority system |
| Over-constraining | Blocks valid code | Warning vs error levels, easy override |

---

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Constraint Templates** - Pre-built constraints for common frameworks
2. **Constraint Sharing** - Export/import constraints between projects
3. **Constraint Evolution** - Track how constraints change over time
4. **AI-Assisted Extraction** - Use LLM to suggest constraints from code comments
5. **Visual Constraint Editor** - Dashboard UI for managing constraints
6. **Constraint Dependencies** - Constraints that depend on other constraints
7. **Custom Predicate Language** - DSL for defining complex predicates

### Integration Opportunities

1. **VSCode Extension** - Real-time constraint violation highlighting
2. **Git Hooks** - Pre-commit constraint verification
3. **CI/CD Integration** - Constraint gates in pipelines
4. **PR Comments** - Auto-comment on constraint violations

---

## Appendix: Constraint Examples by Language

### TypeScript/JavaScript Examples

```typescript
// Rate limiting constraint
{
  id: 'ts-api-rate-limit',
  name: 'Express Rate Limiting',
  language: 'typescript',
  invariant: {
    type: 'must_precede',
    predicate: {
      entryPointMustHave: {
        inCallChain: ['rateLimit', 'rateLimiter', 'slowDown'],
        position: 'before_handler',
      },
    },
  },
}

// NestJS guard constraint
{
  id: 'ts-nestjs-auth-guard',
  name: 'NestJS Auth Guard Required',
  language: 'typescript',
  invariant: {
    type: 'must_have',
    predicate: {
      classMustHave: {
        decorator: ['@Controller'],
        methodAnnotation: ['@UseGuards', '@Public'],
      },
    },
  },
}
```

### Python Examples

```typescript
// FastAPI dependency constraint
{
  id: 'py-fastapi-auth-dependency',
  name: 'FastAPI Auth Dependency',
  language: 'python',
  invariant: {
    type: 'must_have',
    predicate: {
      functionMustHave: {
        decorator: ['@router.get', '@router.post', '@router.put', '@router.delete'],
        parameter: { type: 'Depends', contains: ['get_current_user'] },
      },
    },
  },
}

// Django permission constraint
{
  id: 'py-django-permission',
  name: 'Django Permission Required',
  language: 'python',
  invariant: {
    type: 'must_have',
    predicate: {
      classMustHave: {
        extends: ['APIView', 'ViewSet'],
        attribute: ['permission_classes'],
      },
    },
  },
}
```

### Java Examples

```typescript
// Spring Security constraint
{
  id: 'java-spring-security',
  name: 'Spring Security Annotation',
  language: 'java',
  invariant: {
    type: 'must_have',
    predicate: {
      classMustHave: {
        annotation: ['@RestController'],
        classOrMethodAttribute: ['@PreAuthorize', '@Secured', '@RolesAllowed'],
      },
    },
  },
}

// Spring validation constraint
{
  id: 'java-spring-validation',
  name: 'Spring Request Validation',
  language: 'java',
  invariant: {
    type: 'must_have',
    predicate: {
      functionMustHave: {
        annotation: ['@PostMapping', '@PutMapping'],
        parameter: { annotation: '@Valid' },
      },
    },
  },
}
```

### C# Examples

```typescript
// ASP.NET Core authorization constraint
{
  id: 'csharp-aspnet-authorize',
  name: 'ASP.NET Core Authorization',
  language: 'csharp',
  invariant: {
    type: 'must_have',
    predicate: {
      classMustHave: {
        attribute: ['[ApiController]'],
        classOrMethodAttribute: ['[Authorize]', '[AllowAnonymous]'],
      },
    },
  },
}

// Model validation constraint
{
  id: 'csharp-model-validation',
  name: 'Model State Validation',
  language: 'csharp',
  invariant: {
    type: 'must_have',
    predicate: {
      functionMustHave: {
        attribute: ['[HttpPost]', '[HttpPut]'],
        bodyContains: ['ModelState.IsValid', '[ApiController]'],
      },
    },
  },
}
```

### PHP Examples

```typescript
// Laravel middleware constraint
{
  id: 'php-laravel-middleware',
  name: 'Laravel Auth Middleware',
  language: 'php',
  invariant: {
    type: 'must_have',
    predicate: {
      controllerMustHave: {
        middleware: ['auth', 'auth:sanctum', 'auth:api'],
        orConstructor: ['$this->middleware'],
      },
    },
  },
}

// Laravel policy constraint
{
  id: 'php-laravel-policy',
  name: 'Laravel Policy Authorization',
  language: 'php',
  invariant: {
    type: 'must_have',
    predicate: {
      functionMustHave: {
        bodyContains: ['$this->authorize', 'Gate::allows', 'can('],
      },
    },
  },
}
```

