# Speculative Execution Engine (Pre-Flight Simulation)

## Overview

The Speculative Execution Engine simulates multiple implementation approaches BEFORE any code is generated, scoring them by friction, impact, and pattern alignment. This is the first system that explores the solution space BEFORE committing to an approach.

## Why This Is Novel

Current AI coding assistants:
1. **Generate code and hope** — no pre-analysis
2. **Use RAG to find similar code** — copy patterns blindly  
3. **Run static analysis AFTER generation** — too late

**Drift's Speculative Engine:**
- Explores the solution space BEFORE committing
- Scores approaches against the ACTUAL codebase graph
- Surfaces trade-offs to the agent/human BEFORE any code is written
- Finds the path of least resistance through existing architecture

## Multi-Language Support

Supports all 5 Drift languages with framework-specific strategies:

| Language   | Frameworks                          | Strategy Examples                    |
|------------|-------------------------------------|--------------------------------------|
| TypeScript | Express, NestJS, Next.js, Fastify   | Middleware, Decorator, Guard, HOC    |
| Python     | FastAPI, Django, Flask              | Decorator, Middleware, Mixin         |
| Java       | Spring Boot                         | Aspect, Interceptor, Filter, Advice  |
| C#         | ASP.NET Core                        | Middleware, Filter, Attribute        |
| PHP        | Laravel                             | Middleware, Policy, Gate, Observer   |


## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SPECULATIVE EXECUTION ENGINE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        INPUT LAYER                                   │    │
│  │  Task: "Add rate limiting to the API"                               │    │
│  │  Constraints: ["must work with existing auth", "minimal changes"]   │    │
│  │  Approaches: (optional) ["middleware", "decorator", "per-route"]    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LANGUAGE DETECTION                                │    │
│  │  Detects: TypeScript (Express) | Python (FastAPI) | Java (Spring)   │    │
│  │           C# (ASP.NET) | PHP (Laravel)                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    APPROACH GENERATOR                                │    │
│  │  Uses language-specific strategy templates                          │    │
│  │  Enriches with target files from call graph                         │    │
│  │  Matches against existing patterns                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                    ┌───────────────┼───────────────┐                        │
│                    ▼               ▼               ▼                        │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐            │
│  │  IMPACT SCORER   │ │ PATTERN SCORER   │ │ FRICTION SCORER  │            │
│  │  - Files affected│ │ - Alignment %    │ │ - Code churn     │            │
│  │  - Entry points  │ │ - Conflicts      │ │ - Learning curve │            │
│  │  - Data paths    │ │ - Would outlier? │ │ - Test effort    │            │
│  │  - Breaking risk │ │ - New pattern?   │ │ - Refactor need  │            │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘            │
│                    │               │               │                        │
│                    └───────────────┼───────────────┘                        │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    COMPOSITE SCORER                                  │    │
│  │  Weights: Friction (30%) + Impact (25%) + Pattern (30%) + Sec (15%) │    │
│  │  Constraint satisfaction as tiebreaker                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    OUTPUT LAYER                                      │    │
│  │  Ranked approaches with scores, reasoning, trade-offs               │    │
│  │  Recommended approach with next steps                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```


## File Structure

```
drift/packages/core/src/simulation/
├── index.ts                           # Public exports
├── types.ts                           # Type definitions
├── simulation-engine.ts               # Main orchestrator
├── approach-generator.ts              # Generates approaches from task
├── language-strategies/               # Language-specific strategy templates
│   ├── index.ts
│   ├── typescript-strategies.ts       # Express, NestJS, Next.js, Fastify
│   ├── python-strategies.ts           # FastAPI, Django, Flask
│   ├── java-strategies.ts             # Spring Boot
│   ├── csharp-strategies.ts           # ASP.NET Core
│   └── php-strategies.ts              # Laravel
├── scorers/
│   ├── index.ts
│   ├── impact-scorer.ts               # Uses ImpactAnalyzer
│   ├── pattern-alignment-scorer.ts    # Uses PatternService
│   ├── friction-scorer.ts             # Composite friction calculation
│   └── security-scorer.ts             # Uses ReachabilityEngine
└── __tests__/
    ├── simulation-engine.test.ts
    ├── approach-generator.test.ts
    ├── language-strategies.test.ts
    └── scorers.test.ts

drift/packages/cli/src/commands/
└── simulate.ts                        # CLI command: drift simulate

drift/packages/mcp/src/tools/
├── simulation/
│   ├── index.ts                       # Tool definitions
│   └── simulate.ts                    # MCP handler
└── registry.ts                        # Add SIMULATION_TOOLS
```

## CLI Integration

### Command: `drift simulate`

```bash
# Basic usage - auto-detect approaches
drift simulate "add rate limiting to the API"

# With specific approaches
drift simulate "add rate limiting" --approaches middleware,decorator,per-route

# With constraints
drift simulate "add caching" --constraint "must-work-with:redis" --constraint "max-files:5"

# JSON output for scripting
drift simulate "add logging" --format json

# Verbose mode with full reasoning
drift simulate "add authentication" --verbose
```

### Subcommands

```bash
drift simulate run <task>              # Run simulation (default)
drift simulate approaches <task>       # List possible approaches without scoring
drift simulate explain <approach-id>   # Explain a specific approach in detail
```


## MCP Integration

### Tool: `drift_simulate`

```typescript
{
  name: 'drift_simulate',
  description: 'Simulate multiple implementation approaches BEFORE generating code. ' +
    'Scores approaches by friction, impact, and pattern alignment. ' +
    'Returns ranked approaches with trade-offs and recommendations.',
  inputSchema: {
    type: 'object',
    properties: {
      task: {
        type: 'string',
        description: 'Natural language description of what needs to be done',
      },
      approaches: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: specific approaches to simulate (e.g., ["middleware", "decorator"])',
      },
      constraints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['must-work-with', 'avoid-changing', 'max-files', 'pattern-required'] },
            value: { type: 'string' },
          },
        },
        description: 'Constraints that approaches must satisfy',
      },
      maxApproaches: {
        type: 'number',
        description: 'Maximum approaches to simulate (default: 5)',
      },
      includeSecurityAnalysis: {
        type: 'boolean',
        description: 'Include security implications (default: true)',
      },
    },
    required: ['task'],
  },
}
```

### Example Usage

```json
// Input
{
  "task": "add rate limiting to the API",
  "approaches": ["middleware", "decorator", "per-route"],
  "constraints": [
    { "type": "must-work-with", "value": "existing auth middleware" },
    { "type": "max-files", "value": "5" }
  ]
}

// Output
{
  "summary": "Simulated 3 approaches for 'add rate limiting'. Recommended: 'Middleware Approach' (score: 82/100). Low friction path found.",
  "recommended": {
    "approach": {
      "id": "rate-limiting-middleware-1706...",
      "name": "Middleware Approach for Rate Limiting",
      "strategy": "middleware",
      "targetFiles": ["src/middleware/index.ts", "src/app.ts"],
      "followsPatterns": ["express-middleware-chain", "error-handling-middleware"]
    },
    "score": 82,
    "friction": { "overall": 25, "codeChurn": 20, "patternDeviation": 15, "testingEffort": 30 },
    "impact": { "filesAffected": 3, "entryPointsAffected": 0, "riskLevel": "low" },
    "patternAlignment": { "alignmentScore": 85, "alignedPatterns": [...] },
    "pros": ["Centralized logic", "Easy to enable/disable", "Follows existing patterns"],
    "cons": ["Adds latency to all requests"],
    "nextSteps": ["Review 'express-middleware-chain' examples", "Run impact analysis on src/middleware/index.ts"]
  },
  "approaches": [...],
  "tradeoffs": [
    {
      "approach1": "Middleware Approach",
      "approach2": "Decorator Approach",
      "comparison": "'Middleware Approach' has 15% less friction. 'Decorator Approach' offers more fine-grained control."
    }
  ]
}
```


## Language-Specific Strategies

### TypeScript (Express, NestJS, Next.js, Fastify)

| Task Category    | Strategies                                           |
|------------------|------------------------------------------------------|
| Rate Limiting    | Middleware, Decorator (@RateLimit), Per-route        |
| Authentication   | Middleware, Guard (NestJS), HOC (Next.js)            |
| Authorization    | Guard, Decorator (@Roles), Middleware                |
| Caching          | Decorator (@Cacheable), Interceptor, Middleware      |
| Logging          | Middleware, Interceptor, Decorator (@Log)            |
| Validation       | Pipe (NestJS), Middleware, Decorator (@Validate)     |
| Error Handling   | Filter (NestJS), Middleware, Wrapper                 |

### Python (FastAPI, Django, Flask)

| Task Category    | Strategies                                           |
|------------------|------------------------------------------------------|
| Rate Limiting    | Decorator (@limiter), Middleware, Dependency         |
| Authentication   | Dependency (FastAPI), Decorator, Middleware          |
| Authorization    | Dependency, Decorator (@permission_required)         |
| Caching          | Decorator (@cache), Middleware                       |
| Logging          | Decorator (@log), Middleware, Context Manager        |
| Validation       | Pydantic Model, Decorator, Middleware                |
| Error Handling   | Exception Handler, Decorator, Context Manager        |

### Java (Spring Boot)

| Task Category    | Strategies                                           |
|------------------|------------------------------------------------------|
| Rate Limiting    | Aspect (@RateLimited), Filter, Interceptor           |
| Authentication   | Filter, SecurityConfig, @PreAuthorize                |
| Authorization    | @PreAuthorize, @Secured, Method Security             |
| Caching          | @Cacheable, @CacheEvict, CacheManager                |
| Logging          | Aspect (@Logged), Filter, Interceptor                |
| Validation       | @Valid, @Validated, Custom Validator                 |
| Error Handling   | @ControllerAdvice, @ExceptionHandler                 |

### C# (ASP.NET Core)

| Task Category    | Strategies                                           |
|------------------|------------------------------------------------------|
| Rate Limiting    | Middleware, ActionFilter, Attribute                  |
| Authentication   | Middleware, [Authorize], Policy                      |
| Authorization    | Policy, [Authorize(Roles)], Requirement Handler      |
| Caching          | [ResponseCache], IMemoryCache, Middleware            |
| Logging          | Middleware, ActionFilter, Attribute                  |
| Validation       | [Required], FluentValidation, ActionFilter           |
| Error Handling   | Middleware, ExceptionFilter, ProblemDetails          |

### PHP (Laravel)

| Task Category    | Strategies                                           |
|------------------|------------------------------------------------------|
| Rate Limiting    | Middleware (throttle), Route Middleware              |
| Authentication   | Middleware (auth), Guard, Gate                       |
| Authorization    | Policy, Gate, Middleware                             |
| Caching          | Cache Facade, @cache Blade, Middleware               |
| Logging          | Middleware, Observer, Event Listener                 |
| Validation       | FormRequest, Validator Facade, Rule Objects          |
| Error Handling   | Exception Handler, Middleware, Renderable Exception  |


## Core Types

```typescript
// Task Categories (auto-detected from description)
type TaskCategory =
  | 'rate-limiting' | 'authentication' | 'authorization'
  | 'api-endpoint' | 'data-access' | 'error-handling'
  | 'caching' | 'logging' | 'testing' | 'validation'
  | 'middleware' | 'refactoring' | 'generic';

// Approach Strategies (language-agnostic)
type ApproachStrategy =
  | 'middleware' | 'decorator' | 'wrapper' | 'per-route'
  | 'per-function' | 'centralized' | 'distributed'
  | 'aspect' | 'filter' | 'interceptor' | 'guard'
  | 'policy' | 'dependency' | 'custom';

// Simulation Task
interface SimulationTask {
  description: string;
  category?: TaskCategory;
  target?: string;
  constraints?: SimulationConstraint[];
  scope?: 'function' | 'file' | 'module' | 'codebase';
}

// Simulation Approach
interface SimulationApproach {
  id: string;
  name: string;
  description: string;
  strategy: ApproachStrategy;
  language: CallGraphLanguage;
  framework?: string;
  targetFiles: string[];
  targetFunctions?: string[];
  newFiles?: string[];
  followsPatterns?: string[];
  estimatedLinesAdded?: number;
  template?: string;
}

// Simulated Approach (with scores)
interface SimulatedApproach {
  approach: SimulationApproach;
  friction: FrictionMetrics;
  impact: ImpactMetrics;
  patternAlignment: PatternAlignmentMetrics;
  security: SecurityMetrics;
  score: number;
  rank: number;
  reasoning: string;
  pros: string[];
  cons: string[];
  warnings: string[];
  nextSteps: string[];
  satisfiedConstraints: string[];
  unsatisfiedConstraints: string[];
}

// Simulation Result
interface SimulationResult {
  task: SimulationTask;
  approaches: SimulatedApproach[];
  recommended: SimulatedApproach;
  summary: string;
  tradeoffs: ApproachTradeoff[];
  confidence: SimulationConfidence;
  metadata: SimulationMetadata;
}
```


## Scoring System

### Friction Score (30% weight)

| Metric            | Weight | Description                                    |
|-------------------|--------|------------------------------------------------|
| Code Churn        | 25%    | Lines added + modified                         |
| Pattern Deviation | 30%    | How much it deviates from established patterns |
| Testing Effort    | 20%    | Estimated test cases needed                    |
| Refactoring Need  | 15%    | Amount of existing code to change              |
| Learning Curve    | 10%    | Complexity of the approach                     |

### Impact Score (25% weight)

| Metric              | Weight | Description                                  |
|---------------------|--------|----------------------------------------------|
| Files Affected      | 15%    | Direct + transitive files                    |
| Functions Affected  | 20%    | Functions that need changes                  |
| Entry Points        | 30%    | User-facing endpoints affected               |
| Sensitive Data      | 25%    | Data paths that could be affected            |
| Max Depth           | 10%    | How deep the impact propagates               |

### Pattern Alignment Score (30% weight)

| Metric              | Weight | Description                                  |
|---------------------|--------|----------------------------------------------|
| Aligned Patterns    | 40%    | Number of patterns this follows              |
| Conflict Severity   | 30%    | Severity of pattern conflicts                |
| Would Be Outlier    | 20%    | Would this create a new outlier?             |
| Creates New Pattern | 10%    | Would this establish a new pattern?          |

### Security Score (15% weight)

| Metric              | Weight | Description                                  |
|---------------------|--------|----------------------------------------------|
| Data Access Risk    | 40%    | Sensitive data access implications           |
| Auth Implications   | 35%    | Authentication/authorization changes         |
| Security Warnings   | 25%    | Known security anti-patterns                 |

### Composite Score Formula

```
score = (100 - friction) * 0.30 +
        (100 - impact) * 0.25 +
        patternAlignment * 0.30 +
        (100 - securityRisk) * 0.15
```

Lower friction/impact/security = better. Higher pattern alignment = better.


## Integration with Existing Systems

### Uses These Core Components

| Component              | Purpose                                          |
|------------------------|--------------------------------------------------|
| `CallGraphAnalyzer`    | Get call graph for impact analysis               |
| `ImpactAnalyzer`       | Calculate affected files/functions               |
| `ReachabilityEngine`   | Trace data access paths                          |
| `PatternService`       | Get patterns for alignment scoring               |
| `LanguageIntelligence` | Detect frameworks and normalize across languages |
| `BoundaryStore`        | Get sensitive data access points                 |

### Data Flow

```
1. Task Input
   ↓
2. LanguageIntelligence.detectFrameworks() → Detect project language/framework
   ↓
3. ApproachGenerator.generate() → Generate language-specific approaches
   ↓
4. For each approach:
   ├─ ImpactAnalyzer.analyzeFile() → Impact metrics
   ├─ PatternService.search() → Pattern alignment
   ├─ ReachabilityEngine.getReachableData() → Security metrics
   └─ FrictionScorer.score() → Friction metrics
   ↓
5. CompositeScorer.rank() → Ranked approaches
   ↓
6. TradeoffGenerator.compare() → Trade-off analysis
   ↓
7. Result with recommendations
```

## Implementation Phases

### Phase 1: Core Engine (Week 1)
- [ ] Types and interfaces
- [ ] Simulation engine orchestrator
- [ ] Basic approach generator (TypeScript only)
- [ ] Impact scorer integration
- [ ] Pattern alignment scorer

### Phase 2: Multi-Language Support (Week 2)
- [ ] TypeScript strategies (Express, NestJS, Next.js, Fastify)
- [ ] Python strategies (FastAPI, Django, Flask)
- [ ] Java strategies (Spring Boot)
- [ ] C# strategies (ASP.NET Core)
- [ ] PHP strategies (Laravel)

### Phase 3: CLI Integration (Week 3)
- [ ] `drift simulate` command
- [ ] Text output formatting
- [ ] JSON output for scripting
- [ ] Verbose mode with full reasoning

### Phase 4: MCP Integration (Week 3)
- [ ] `drift_simulate` tool definition
- [ ] Handler implementation
- [ ] Response builder integration
- [ ] Add to tool registry

### Phase 5: Testing & Polish (Week 4)
- [ ] Unit tests for all scorers
- [ ] Integration tests with demo repos
- [ ] E2E tests for CLI and MCP
- [ ] Documentation and examples


## Example Scenarios

### Scenario 1: Rate Limiting in Express (TypeScript)

**Task:** "Add rate limiting to the API"

**Detected:** TypeScript + Express

**Generated Approaches:**

1. **Middleware Approach** (Score: 82)
   - Strategy: `middleware`
   - Target: `src/middleware/rate-limiter.ts` (new), `src/app.ts`
   - Follows: `express-middleware-chain` pattern
   - Pros: Centralized, easy to configure
   - Cons: Applies to all routes

2. **Decorator Approach** (Score: 75)
   - Strategy: `decorator`
   - Target: `src/decorators/rate-limit.ts` (new), multiple controllers
   - Follows: `decorator-pattern` pattern
   - Pros: Fine-grained control
   - Cons: More files to modify

3. **Per-Route Approach** (Score: 58)
   - Strategy: `per-route`
   - Target: All route files
   - Follows: None (would be outlier)
   - Pros: Maximum flexibility
   - Cons: Code duplication, inconsistent

**Recommendation:** Middleware Approach

### Scenario 2: Authentication in Spring Boot (Java)

**Task:** "Add JWT authentication"

**Detected:** Java + Spring Boot

**Generated Approaches:**

1. **Security Filter Chain** (Score: 88)
   - Strategy: `filter`
   - Target: `SecurityConfig.java`, `JwtFilter.java` (new)
   - Follows: `spring-security-config` pattern
   - Pros: Standard Spring Security approach
   - Cons: Learning curve for Spring Security

2. **Aspect-Oriented** (Score: 72)
   - Strategy: `aspect`
   - Target: `AuthAspect.java` (new), controllers
   - Follows: `spring-aop` pattern
   - Pros: Non-invasive
   - Cons: Can be "magical"

3. **Per-Controller** (Score: 55)
   - Strategy: `per-function`
   - Target: All controllers
   - Follows: None
   - Pros: Explicit
   - Cons: Massive code duplication

**Recommendation:** Security Filter Chain

### Scenario 3: Caching in Laravel (PHP)

**Task:** "Add caching to expensive queries"

**Detected:** PHP + Laravel

**Generated Approaches:**

1. **Cache Facade in Repository** (Score: 85)
   - Strategy: `centralized`
   - Target: Repository classes
   - Follows: `laravel-repository` pattern
   - Pros: Clean separation
   - Cons: Need to modify each repository

2. **Query Scope with Cache** (Score: 78)
   - Strategy: `mixin`
   - Target: Model classes
   - Follows: `eloquent-scope` pattern
   - Pros: Reusable across models
   - Cons: Couples caching to models

3. **Middleware Cache** (Score: 65)
   - Strategy: `middleware`
   - Target: `CacheMiddleware.php` (new)
   - Follows: `laravel-middleware` pattern
   - Pros: Transparent
   - Cons: Less control over cache keys

**Recommendation:** Cache Facade in Repository

## Success Metrics

| Metric                        | Target    |
|-------------------------------|-----------|
| Approach generation time      | < 2s      |
| Full simulation time          | < 5s      |
| Pattern alignment accuracy    | > 80%     |
| Impact prediction accuracy    | > 75%     |
| User satisfaction (surveys)   | > 4/5     |
| Adoption rate (MCP calls)     | > 100/day |
