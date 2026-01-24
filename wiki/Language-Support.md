# Language Support

Drift supports 6 programming languages with full feature parity.

## Supported Languages

| Language | Tree-Sitter | Call Graph | Data Access | Regex Fallback |
|----------|-------------|------------|-------------|----------------|
| TypeScript | ✅ | ✅ | ✅ | ✅ |
| JavaScript | ✅ | ✅ | ✅ | ✅ |
| Python | ✅ | ✅ | ✅ | ✅ |
| Java | ✅ | ✅ | ✅ | ✅ |
| C# | ✅ | ✅ | ✅ | ✅ |
| PHP | ✅ | ✅ | ✅ | ✅ |

---

## TypeScript / JavaScript

### Frameworks
- React
- Next.js
- Express
- Node.js
- NestJS

### ORMs & Data Access
- Prisma
- TypeORM
- Sequelize
- Drizzle
- Knex
- Mongoose
- Supabase

### File Extensions
`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`

### Features
- Full AST parsing via Tree-sitter
- Decorator extraction (`@Controller`, `@Injectable`, etc.)
- Import/export resolution
- React component detection
- Hook pattern detection
- Express middleware chains

---

## Python

### Frameworks
- Django
- FastAPI
- Flask

### ORMs & Data Access
- Django ORM
- SQLAlchemy
- Tortoise ORM

### File Extensions
`.py`

### Features
- Full AST parsing via Tree-sitter
- Decorator extraction (`@app.route`, `@login_required`)
- Class-based view detection
- Django model detection
- FastAPI dependency injection
- Type hint extraction

---

## Java

### Frameworks
- Spring Boot
- Spring MVC

### ORMs & Data Access
- JPA / Hibernate
- Spring Data

### File Extensions
`.java`

### Features
- Full AST parsing via Tree-sitter
- Annotation extraction (`@RestController`, `@Service`, `@Repository`)
- Spring bean detection
- JPA entity detection
- Dependency injection patterns
- Interface implementation tracking

---

## C#

### Frameworks
- ASP.NET Core
- ASP.NET MVC

### ORMs & Data Access
- Entity Framework Core
- Entity Framework
- Dapper

### File Extensions
`.cs`

### Features
- Full AST parsing via Tree-sitter
- Attribute extraction (`[ApiController]`, `[HttpGet]`, `[Authorize]`)
- Controller detection
- DbContext usage tracking
- Dependency injection patterns
- LINQ query detection

---

## PHP

### Frameworks
- Laravel

### ORMs & Data Access
- Eloquent

### File Extensions
`.php`

### Features
- Full AST parsing via Tree-sitter
- Attribute/annotation extraction
- Laravel controller detection
- Eloquent model detection
- Middleware detection
- Route detection

---

## How Parsing Works

### Tree-sitter (Primary)

Drift uses Tree-sitter for accurate AST parsing:

1. **Parse** — Source code → AST
2. **Extract** — Functions, classes, decorators, imports
3. **Resolve** — Call targets, data access points
4. **Build** — Call graph, pattern index

Tree-sitter provides:
- Fast incremental parsing
- Error recovery (partial parsing on syntax errors)
- Language-agnostic queries

### Regex Fallback

When Tree-sitter fails (rare), Drift falls back to regex extraction:

- Catches common patterns
- Lower accuracy but better than nothing
- Useful for edge cases

---

## Adding Language Support

Drift's architecture supports adding new languages:

1. **Tree-sitter grammar** — Install the grammar package
2. **Extractor** — Implement function/call extraction
3. **Data access detector** — Implement ORM pattern detection
4. **Test regex** — Add test file detection patterns

See `packages/core/src/call-graph/extractors/` for examples.

---

## Checking Parser Status

```bash
# Show parser status
drift parser

# Test parser functionality
drift parser --test
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
```

---

## Mixed-Language Projects

Drift handles polyglot codebases:

```bash
# Scan everything
drift scan

# Scan specific language
drift scan --include "**/*.py"
```

The call graph connects across languages when possible (e.g., TypeScript frontend calling Python API).
