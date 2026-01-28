# Language Support

Drift supports **9 programming languages** with full feature parity across all analysis capabilities.

## Language Matrix

| Language | Tree-Sitter | Call Graph | Data Access | Regex Fallback | Test Topology |
|----------|-------------|------------|-------------|----------------|---------------|
| TypeScript | ✅ | ✅ | ✅ | ✅ | ✅ |
| JavaScript | ✅ | ✅ | ✅ | ✅ | ✅ |
| Python | ✅ | ✅ | ✅ | ✅ | ✅ |
| Java | ✅ | ✅ | ✅ | ✅ | ✅ |
| C# | ✅ | ✅ | ✅ | ✅ | ✅ |
| PHP | ✅ | ✅ | ✅ | ✅ | ✅ |
| Go | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rust | ✅ | ✅ | ✅ | ✅ | ✅ |
| C++ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## TypeScript / JavaScript

### Frameworks
- **React** — Component detection, hooks, JSX analysis
- **Next.js** — App router, API routes, server components
- **Express** — Middleware chains, route handlers
- **NestJS** — Decorators, modules, dependency injection
- **Node.js** — CommonJS/ESM, native modules

### ORMs & Data Access
- **Prisma** — Schema models, queries, transactions
- **TypeORM** — Entities, repositories, query builder
- **Sequelize** — Models, associations, migrations
- **Drizzle** — Schema, queries, relations
- **Knex** — Query builder, migrations
- **Mongoose** — Schemas, models, queries
- **Supabase** — Client queries, RLS policies

### File Extensions
`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`

### Features
- Full AST parsing via Tree-sitter
- Decorator extraction (`@Controller`, `@Injectable`, etc.)
- Import/export resolution
- React component and hook detection
- Express middleware chain analysis
- Type inference from TypeScript

---

## Python

### Frameworks
- **Django** — Views, models, middleware, admin
- **FastAPI** — Routes, dependencies, Pydantic models
- **Flask** — Routes, blueprints, extensions

### ORMs & Data Access
- **Django ORM** — Models, querysets, managers
- **SQLAlchemy** — Models, sessions, queries
- **Tortoise ORM** — Models, queries, relations

### File Extensions
`.py`

### Features
- Full AST parsing via Tree-sitter
- Decorator extraction (`@app.route`, `@login_required`)
- Class-based view detection
- Django model and migration analysis
- FastAPI dependency injection
- Type hint extraction (PEP 484)

---

## Java

### Frameworks
- **Spring Boot** — Auto-configuration, starters
- **Spring MVC** — Controllers, services, repositories
- **Spring Security** — Authentication, authorization

### ORMs & Data Access
- **JPA / Hibernate** — Entities, repositories, JPQL
- **Spring Data** — Repository interfaces, query methods

### File Extensions
`.java`

### Features
- Full AST parsing via Tree-sitter
- Annotation extraction (`@RestController`, `@Service`, `@Repository`)
- Spring bean detection and dependency injection
- JPA entity and relationship mapping
- Interface implementation tracking
- Lombok annotation support

---

## C#

### Frameworks
- **ASP.NET Core** — Controllers, middleware, DI
- **ASP.NET MVC** — Views, controllers, routing
- **WPF** — MVVM, commands, data binding

### ORMs & Data Access
- **Entity Framework Core** — DbContext, entities, migrations
- **Entity Framework** — Legacy EF support
- **Dapper** — SQL queries, mapping

### File Extensions
`.cs`

### Features
- Full AST parsing via Tree-sitter
- Attribute extraction (`[ApiController]`, `[HttpGet]`, `[Authorize]`)
- Controller and action detection
- DbContext usage tracking
- Dependency injection patterns
- LINQ query detection
- WPF ViewModel and Command patterns

### WPF-Specific Analysis

```bash
# Analyze WPF patterns
drift wpf status

# Find MVVM violations
drift wpf violations

# Analyze data binding
drift wpf bindings
```

---

## PHP

### Frameworks
- **Laravel** — Controllers, models, middleware, Blade

### ORMs & Data Access
- **Eloquent** — Models, relationships, query builder

### File Extensions
`.php`

### Features
- Full AST parsing via Tree-sitter
- Attribute/annotation extraction
- Laravel controller and route detection
- Eloquent model and relationship analysis
- Middleware detection
- Service provider patterns

---

## Go

### Frameworks
- **Gin** — Routes, middleware, handlers
- **Echo** — Routes, middleware, context
- **Fiber** — Routes, middleware, handlers
- **Chi** — Router, middleware chains
- **net/http** — Standard library handlers

### ORMs & Data Access
- **GORM** — Models, queries, associations
- **sqlx** — Queries, scanning, transactions
- **database/sql** — Standard library
- **ent** — Schema, queries, edges

### File Extensions
`.go`

### Features
- Full AST parsing via Tree-sitter
- Function and method extraction
- Interface and struct analysis
- Goroutine and defer detection
- Error handling pattern detection (`if err != nil`)
- Package-level analysis

### Go-Specific Analysis

```bash
# Analyze Go patterns
drift go status

# Find error handling gaps
drift go errors

# Analyze interfaces
drift go interfaces
```

---

## Rust

### Frameworks
- **Actix-web** — Routes, middleware, extractors
- **Axum** — Routes, layers, extractors
- **Rocket** — Routes, guards, fairings
- **Warp** — Filters, routes, rejections

### ORMs & Data Access
- **SQLx** — Queries, compile-time checking
- **Diesel** — Schema, queries, associations
- **SeaORM** — Entities, queries, relations
- **tokio-postgres** — Async queries

### File Extensions
`.rs`

### Features
- Full AST parsing via Tree-sitter
- Function, method, and impl block extraction
- Trait and struct analysis
- Async/await pattern detection
- Result/Option error handling
- Macro invocation tracking
- Lifetime and generic analysis

### Rust-Specific Analysis

```bash
# Analyze Rust patterns
drift rust status

# Find unsafe blocks
drift rust unsafe

# Analyze error handling
drift rust errors
```

---

## C++

### Frameworks
- **Unreal Engine** — UObject, UClass, UFUNCTION macros
- **Qt** — QObject, signals/slots, MOC
- **Boost** — Beast (HTTP), Asio (async)
- **STL** — Standard library patterns

### ORMs & Data Access
- **SQLite** — sqlite3 API, prepared statements
- **ODBC** — Database connectivity
- **Qt SQL** — QSqlDatabase, QSqlQuery

### File Extensions
`.cpp`, `.cc`, `.cxx`, `.c++`, `.hpp`, `.hh`, `.hxx`, `.h`, `.ipp`, `.tpp`

### Features
- Full AST parsing via Tree-sitter
- Class, struct, and template extraction
- Virtual function and inheritance analysis
- RAII and smart pointer detection
- Namespace analysis
- Preprocessor macro detection
- Constructor/destructor tracking

### C++-Specific Analysis

```bash
# Analyze C++ patterns
drift cpp status

# Find memory issues
drift cpp memory

# Analyze templates
drift cpp templates
```

---

## How Parsing Works

### Tree-sitter (Primary)

Drift uses Tree-sitter for accurate AST parsing:

1. **Parse** — Source code → Abstract Syntax Tree
2. **Extract** — Functions, classes, decorators, imports
3. **Resolve** — Call targets, data access points
4. **Build** — Call graph, pattern index

Tree-sitter provides:
- Fast incremental parsing
- Error recovery (partial parsing on syntax errors)
- Language-agnostic queries
- Consistent API across languages

### Regex Fallback

When Tree-sitter fails (rare), Drift falls back to regex extraction:

- Catches common patterns
- Lower accuracy but better than nothing
- Useful for edge cases and malformed code
- Confidence tracking distinguishes AST vs regex results

### Hybrid Extraction

Drift combines both approaches:

```
Source Code
    ↓
┌─────────────────┐
│  Tree-sitter    │ ← Primary (high confidence)
│  AST Parsing    │
└────────┬────────┘
         │
         ↓ (if fails)
┌─────────────────┐
│  Regex Fallback │ ← Secondary (lower confidence)
│  Extraction     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Hybrid Merger  │ ← Combines with confidence scores
└────────┬────────┘
         │
         ↓
   Call Graph + Patterns
```

---

## Checking Parser Status

```bash
# Show parser status for all languages
drift parser

# Test parser functionality
drift parser --test

# Show detailed parser info
drift parser --verbose
```

Output:
```
Parser Status
=============

TypeScript: ✅ Ready (tree-sitter-typescript)
JavaScript: ✅ Ready (tree-sitter-javascript)
Python:     ✅ Ready (tree-sitter-python)
Java:       ✅ Ready (tree-sitter-java)
C#:         ✅ Ready (tree-sitter-c-sharp)
PHP:        ✅ Ready (tree-sitter-php)
Go:         ✅ Ready (tree-sitter-go)
Rust:       ✅ Ready (tree-sitter-rust)
C++:        ✅ Ready (tree-sitter-cpp)
```

---

## Mixed-Language Projects

Drift handles polyglot codebases seamlessly:

```bash
# Scan everything
drift scan

# Scan specific language
drift scan --include "**/*.py"

# Scan multiple languages
drift scan --include "**/*.ts" --include "**/*.py"
```

### Cross-Language Call Graph

The call graph connects across languages when possible:

- TypeScript frontend → Python API
- Go service → Rust library
- C# backend → C++ native module

This enables:
- Full data flow tracing across service boundaries
- API contract verification between frontend and backend
- Impact analysis across the entire stack

---

## Adding Language Support

Drift's architecture supports adding new languages:

1. **Tree-sitter grammar** — Install the grammar package
2. **Extractor** — Implement function/call extraction
3. **Data access detector** — Implement ORM pattern detection
4. **Test regex** — Add test file detection patterns
5. **Framework detectors** — Add framework-specific patterns

See `packages/core/src/call-graph/extractors/` for examples.

---

## Language-Specific CLI & MCP Tools

All 9 languages have dedicated CLI commands and MCP tools:

| Language | CLI Command | MCP Tool | Actions |
|----------|-------------|----------|---------|
| TypeScript/JS | `drift ts` | `drift_typescript` | status, routes, components, hooks, errors, data-access, decorators |
| Python | `drift py` | `drift_python` | status, routes, errors, data-access, decorators, async |
| Java | `drift java` | `drift_java` | status, routes, errors, data-access, annotations |
| PHP | `drift php` | `drift_php` | status, routes, errors, data-access, traits |
| Go | `drift go` | `drift_go` | status, routes, errors, interfaces, data-access, goroutines |
| Rust | `drift rust` | `drift_rust` | status, routes, errors, traits, data-access, async |
| C++ | `drift cpp` | `drift_cpp` | status, classes, memory, templates, virtual |
| WPF (C#) | `drift wpf` | `drift_wpf` | status, bindings, mvvm, datacontext, commands |

### Examples

```bash
# TypeScript/JavaScript
drift ts status              # Project overview
drift ts routes              # HTTP routes (Express, NestJS, Next.js, Fastify)
drift ts components          # React components
drift ts hooks               # React hooks usage
drift ts data-access         # Database patterns (Prisma, TypeORM, etc.)

# Python
drift py status              # Project overview
drift py routes              # HTTP routes (Flask, FastAPI, Django)
drift py decorators          # Decorator usage
drift py async               # Async patterns

# Java
drift java status            # Project overview
drift java routes            # HTTP routes (Spring, JAX-RS, Micronaut)
drift java annotations       # Annotation usage

# PHP
drift php status             # Project overview
drift php routes             # HTTP routes (Laravel, Symfony)
drift php traits             # Trait definitions and usage
```

These provide language-specific analysis beyond the general tools.
