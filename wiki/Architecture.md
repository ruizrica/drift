# Architecture

How Drift works under the hood.

## Overview

Drift is a **codebase intelligence platform** that learns patterns from your code and provides that knowledge to AI agents. It combines static analysis, call graph construction, and pattern detection into a unified system.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Your Codebase                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Drift Core Engine                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Tree-sitter │  │ Call Graph  │  │  Pattern    │              │
│  │   Parsers   │──│   Builder   │──│  Detector   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Data Lake (.drift/)                       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐     ┌─────────┐     ┌─────────┐
        │   CLI   │     │   MCP   │     │   LSP   │
        │ Commands│     │  Server │     │  Server │
        └─────────┘     └─────────┘     └─────────┘
```

---

## Data Storage (.drift/)

All Drift data is stored in the `.drift/` directory at your project root.

```
.drift/
├── config.json              # Project configuration
├── manifest.json            # Scan metadata
├── indexes/
│   ├── by-category.json     # Patterns indexed by category
│   └── by-file.json         # Patterns indexed by file
├── patterns/
│   ├── approved/            # Approved patterns
│   ├── discovered/          # Newly discovered patterns
│   ├── ignored/             # Ignored patterns
│   └── variants/            # Pattern variants
├── lake/
│   ├── callgraph/           # Call graph data
│   │   └── files/           # Per-file call data
│   ├── examples/            # Code examples
│   │   └── patterns/        # Examples by pattern
│   ├── patterns/            # Pattern definitions
│   └── security/            # Security analysis
│       └── tables/          # Data access tables
├── contracts/
│   ├── discovered/          # Discovered API contracts
│   ├── verified/            # Verified contracts
│   ├── mismatch/            # Mismatched contracts
│   └── ignored/             # Ignored contracts
├── constraints/
│   ├── approved/            # Approved constraints
│   ├── discovered/          # Discovered constraints
│   └── custom/              # Custom constraints
├── boundaries/
│   └── access-map.json      # Data access boundaries
├── history/
│   └── snapshots/           # Historical snapshots
├── views/
│   ├── pattern-index.json   # Pattern index view
│   └── status.json          # Status view
└── reports/                 # Generated reports
```

### Data Lake Layer

The Data Lake provides optimized storage for large-scale analysis:

- **Sharded storage** — Large datasets split across files
- **Incremental updates** — Only changed files re-analyzed
- **Lazy loading** — Data loaded on demand
- **Compression** — Efficient storage format

---

## Pattern System

### Pattern Lifecycle

```
Source Code
    │
    ▼
┌─────────────────┐
│   Discovery     │ ← Drift finds patterns in your code
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Discovered    │ ← New patterns await review
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Approved│ │Ignored│ ← You decide what matters
└───┬───┘ └───────┘
    │
    ▼
┌─────────────────┐
│   Enforcement   │ ← Drift detects outliers
└─────────────────┘
```

### Pattern Categories

Drift detects 15 categories of patterns:

| Category | Description | Examples |
|----------|-------------|----------|
| `api` | REST endpoints, GraphQL | Route handlers, resolvers |
| `auth` | Authentication | Login, JWT, sessions |
| `security` | Security patterns | Validation, sanitization |
| `errors` | Error handling | Try/catch, Result types |
| `logging` | Observability | Structured logging |
| `data-access` | Database queries | ORM patterns, raw SQL |
| `config` | Configuration | Env vars, settings |
| `testing` | Test patterns | Mocks, fixtures |
| `performance` | Optimization | Caching, memoization |
| `components` | UI components | React, Vue, Angular |
| `styling` | CSS patterns | Tailwind, CSS-in-JS |
| `structural` | Code organization | Modules, exports |
| `types` | Type definitions | Interfaces, schemas |
| `accessibility` | A11y patterns | ARIA, semantic HTML |
| `documentation` | Doc patterns | JSDoc, docstrings |

### Pattern Confidence

Each pattern has a confidence score (0.0-1.0):

- **0.9-1.0** — High confidence, consistent pattern
- **0.7-0.9** — Good confidence, some variation
- **0.5-0.7** — Moderate confidence, review recommended
- **<0.5** — Low confidence, may be noise

---

## Call Graph

The call graph maps function calls across your codebase.

### Building the Call Graph

```
Source Files
    │
    ▼
┌─────────────────┐
│  Tree-sitter    │ ← Parse AST
│    Parsing      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Extraction    │ ← Extract functions, calls
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Resolution    │ ← Resolve call targets
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Call Graph    │ ← Build graph structure
└─────────────────┘
```

### Unified Provider

The Unified Provider combines multiple extraction strategies:

1. **Tree-sitter AST** — Primary, high accuracy
2. **Regex fallback** — Secondary, for edge cases
3. **Framework-specific** — ORM, middleware detection

### Data Flow Analysis

Drift tracks data flow through your code:

- **Forward reachability** — "What data can this code access?"
- **Inverse reachability** — "Who can access this data?"
- **Sensitive data tracking** — PII, credentials, financial

---

## Framework Detection

Drift detects framework-specific patterns:

### Web Frameworks

| Framework | Detection |
|-----------|-----------|
| Express | Middleware chains, route handlers |
| NestJS | Decorators, modules, DI |
| Django | Views, models, middleware |
| FastAPI | Routes, dependencies |
| Spring Boot | Annotations, beans |
| ASP.NET Core | Controllers, middleware |
| Laravel | Controllers, Eloquent |
| Gin/Echo/Fiber | Handlers, middleware |
| Actix/Axum | Routes, extractors |

### ORM Detection

| ORM | Detection |
|-----|-----------|
| Prisma | Schema, queries |
| TypeORM | Entities, repositories |
| SQLAlchemy | Models, sessions |
| Hibernate | Entities, JPQL |
| Entity Framework | DbContext, LINQ |
| Eloquent | Models, relationships |
| GORM | Models, queries |
| SQLx | Queries, compile-time |
| Diesel | Schema, queries |

---

## Analysis Engines

### Test Topology

Maps tests to source code:

```bash
drift test-topology build
```

- **Coverage mapping** — Which tests cover which code
- **Affected tests** — Minimum test set for changes
- **Mock analysis** — Mock patterns and usage
- **Quality metrics** — Test quality scores

### Module Coupling

Analyzes dependencies:

```bash
drift coupling status
```

- **Dependency cycles** — Circular dependencies
- **Hotspots** — Highly coupled modules
- **Unused exports** — Dead code
- **Refactor impact** — Change blast radius

### Error Handling

Analyzes error patterns:

```bash
drift error-handling status
```

- **Error boundaries** — Where errors are caught
- **Unhandled paths** — Missing error handling
- **Gaps** — Inconsistent patterns
- **Swallowed exceptions** — Silent failures

---

## MCP Server

The MCP server exposes Drift to AI agents:

```
AI Agent (Claude, Cursor, etc.)
         │
         ▼
┌─────────────────┐
│   MCP Protocol  │ ← JSON-RPC over stdio
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Drift MCP      │ ← 45+ tools
│    Server       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Drift Core     │ ← Analysis engine
└─────────────────┘
```

### Tool Layers

Tools are organized for efficient token usage:

1. **Orchestration** — High-level, curated context
2. **Discovery** — Quick overview
3. **Surgical** — Precise, single-purpose
4. **Exploration** — Browse and filter
5. **Detail** — Deep dives
6. **Analysis** — Health metrics
7. **Generation** — AI-assisted changes

---

## CLI Architecture

```
drift <command> [options]
         │
         ▼
┌─────────────────┐
│  Command Parser │ ← Parse args
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Command Handler│ ← Execute command
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Drift Core     │ ← Analysis engine
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Output       │ ← Format results
└─────────────────┘
```

---

## Incremental Analysis

Drift supports incremental analysis for fast updates:

1. **File hashing** — Track file changes
2. **Dependency tracking** — Know what to re-analyze
3. **Partial updates** — Only update changed data
4. **Cache invalidation** — Smart cache management

```bash
# Full scan
drift scan

# Incremental scan (default)
drift scan --incremental

# Force full rescan
drift scan --force
```

---

## Performance

### Memory Optimization

- **Streaming parsing** — Process files without loading all into memory
- **Lazy loading** — Load data on demand
- **Sharded storage** — Split large datasets

### Speed Optimization

- **Parallel parsing** — Multi-threaded file processing
- **Incremental updates** — Only re-analyze changes
- **Caching** — Cache expensive computations

### Typical Performance

| Codebase Size | Initial Scan | Incremental |
|---------------|--------------|-------------|
| Small (<10K LOC) | <5s | <1s |
| Medium (10-100K) | 10-30s | 1-5s |
| Large (100K-1M) | 1-5min | 5-30s |
| Enterprise (>1M) | 5-15min | 30s-2min |
