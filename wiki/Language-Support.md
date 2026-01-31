# Language Support

Drift supports **10 programming languages** with full feature parity across all analysis capabilities.

---

## ⚡ Quick Reference

| Language | CLI Command | Frameworks | ORMs |
|----------|-------------|------------|------|
| TypeScript/JS | `drift ts` | Express, NestJS, Next.js, Fastify | Prisma, TypeORM, Sequelize, Drizzle, Knex, Mongoose, Supabase |
| Python | `drift py` | FastAPI, Django, Flask | Django ORM, SQLAlchemy, Supabase |
| Java | `drift java` | Spring Boot | Spring Data JPA, Hibernate |
| C# | `drift wpf` | ASP.NET Core, WPF | Entity Framework Core, Dapper |
| PHP | `drift php` | Laravel | Eloquent, Doctrine |
| Go | `drift go` | Gin, Echo, Fiber, Chi, net/http | GORM, sqlx, Ent, Bun |
| Rust | `drift rust` | Actix, Axum, Rocket, Warp | SQLx, Diesel, SeaORM |
| C++ | `drift cpp` | Crow, Boost.Beast, Qt | SQLite, ODBC, Qt SQL |
| C | — | — | — |

---

## Language Matrix

| Language | Parser | Call Graph | Data Access | Test Topology |
|----------|--------|------------|-------------|---------------|
| TypeScript | ✅ tree-sitter | ✅ | ✅ | ✅ |
| JavaScript | ✅ tree-sitter | ✅ | ✅ | ✅ |
| Python | ✅ tree-sitter | ✅ | ✅ | ✅ |
| Java | ✅ tree-sitter | ✅ | ✅ | ✅ |
| C# | ✅ tree-sitter | ✅ | ✅ | ✅ |
| PHP | ✅ tree-sitter | ✅ | ✅ | ✅ |
| Go | ✅ tree-sitter | ✅ | ✅ | ✅ |
| Rust | ✅ tree-sitter | ✅ | ✅ | ✅ |
| C | ✅ tree-sitter | ✅ | ✅ | ✅ |
| C++ | ✅ tree-sitter | ✅ | ✅ | ✅ |

All parsing is done natively in Rust using tree-sitter bindings.

---

## TypeScript / JavaScript

### Quick Start
```bash
drift ts status              # Project overview
drift ts routes              # HTTP routes
drift ts components          # React components
drift ts hooks               # React hooks
drift ts data-access         # Database patterns
drift ts decorators          # NestJS decorators
```

### Frameworks (4)
| Framework | Detection Method |
|-----------|------------------|
| Next.js | `next` in package.json |
| Express | `express` in package.json |
| Fastify | `fastify` in package.json |
| NestJS | `@nestjs/core` in package.json |

### ORMs & Data Access (8)
| ORM | Detection | Patterns Detected |
|-----|-----------|-------------------|
| Supabase | `@supabase/supabase-js` | `.from()`, `.select()`, `.insert()`, `.update()`, `.delete()` |
| Prisma | `@prisma/client` | `prisma.model.findMany()`, `prisma.model.create()` |
| TypeORM | `typeorm` | `@Entity`, `getRepository()`, `Repository<T>` |
| Sequelize | `sequelize` | `Model.findAll()`, `Model.findOne()`, `Model.create()` |
| Drizzle | `drizzle-orm` | `db.select()`, `db.insert()`, `db.update()` |
| Knex | `knex` | `knex('table')`, `.where()`, `.insert()` |
| Mongoose | `mongoose` | `Schema`, `Model.find()`, `Model.findOne()` |
| Raw SQL | `pg`, `mysql2`, `better-sqlite3` | Direct SQL queries |

### Features
- Full AST parsing via Tree-sitter
- Decorator extraction (`@Controller`, `@Injectable`, etc.)
- Import/export resolution
- React component and hook detection
- Express middleware chain analysis
- Type inference from TypeScript

### File Extensions
`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`

---

## Python

### Quick Start
```bash
drift py status              # Project overview
drift py routes              # HTTP routes
drift py errors              # Error handling
drift py data-access         # Database patterns
drift py decorators          # Decorator usage
drift py async               # Async patterns
```

### Frameworks (1)
| Framework | Detection Method |
|-----------|------------------|
| FastAPI | `@app.get`, `@app.post` decorators |

*Django and Flask detected via imports*

### ORMs & Data Access (3)
| ORM | Detection | Patterns Detected |
|-----|-----------|-------------------|
| Django ORM | `django` | `Model.objects.filter()`, `Model.objects.get()` |
| SQLAlchemy | `sqlalchemy` | `session.query()`, `session.add()`, `session.commit()` |
| Supabase | `supabase` | Same as TypeScript Supabase |

### Features
- Full AST parsing via Tree-sitter
- Decorator extraction (`@app.route`, `@login_required`)
- Class-based view detection
- Django model and migration analysis
- FastAPI dependency injection
- Type hint extraction (PEP 484)

### File Extensions
`.py`

---

## Java

### Quick Start
```bash
drift java status            # Project overview
drift java routes            # HTTP routes
drift java errors            # Error handling
drift java data-access       # Database patterns
drift java annotations       # Annotation usage
```

### Frameworks (1)
| Framework | Detection Method |
|-----------|------------------|
| Spring Boot | `spring-boot` in pom.xml or build.gradle |

### ORMs & Data Access (2)
| ORM | Detection | Patterns Detected |
|-----|-----------|-------------------|
| Spring Data JPA | `spring-data-jpa` | `JpaRepository`, `@Query`, `EntityManager` |
| Hibernate | `hibernate` | `Session`, `@Entity`, `@Table` |

### Features
- Full AST parsing via Tree-sitter
- Annotation extraction (`@RestController`, `@Service`, `@Repository`)
- Spring bean detection and dependency injection
- JPA entity and relationship mapping
- Interface implementation tracking
- Lombok annotation support

### File Extensions
`.java`

---

## C#

### Quick Start
```bash
drift wpf status             # Project overview
drift wpf bindings           # XAML bindings
drift wpf mvvm               # MVVM compliance
drift wpf datacontext        # DataContext resolution
drift wpf commands           # ICommand implementations
```

### Frameworks (2)
| Framework | Detection Method |
|-----------|------------------|
| ASP.NET Core | `Microsoft.AspNetCore` in .csproj |
| WPF | `.xaml` files with WPF namespaces |

### ORMs & Data Access (2)
| ORM | Detection | Patterns Detected |
|-----|-----------|-------------------|
| Entity Framework Core | `Microsoft.EntityFrameworkCore` | `DbContext`, `.Where()`, `.ToList()`, `.SaveChanges()` |
| Dapper | `Dapper` | `connection.Query()`, `connection.Execute()` |

### Features
- Full AST parsing via Tree-sitter
- Attribute extraction (`[ApiController]`, `[HttpGet]`, `[Authorize]`)
- Controller and action detection
- DbContext usage tracking
- Dependency injection patterns
- LINQ query detection
- WPF ViewModel and Command patterns

### File Extensions
`.cs`

---

## PHP

### Quick Start
```bash
drift php status             # Project overview
drift php routes             # HTTP routes
drift php errors             # Error handling
drift php data-access        # Database patterns
drift php traits             # Trait usage
```

### Frameworks (1)
| Framework | Detection Method |
|-----------|------------------|
| Laravel | `laravel/framework` in composer.json |

### ORMs & Data Access (2)
| ORM | Detection | Patterns Detected |
|-----|-----------|-------------------|
| Eloquent | `laravel/framework` | `Model::where()`, `Model::find()`, `->save()` |
| Doctrine | `doctrine/orm` | `EntityManager`, `Repository`, `@ORM\Entity` |

### Features
- Full AST parsing via Tree-sitter
- Attribute/annotation extraction
- Laravel controller and route detection
- Eloquent model and relationship analysis
- Middleware detection
- Service provider patterns

### File Extensions
`.php`

---

## Go

### Quick Start
```bash
drift go status              # Project overview
drift go routes              # HTTP routes
drift go errors              # Error handling
drift go interfaces          # Interface analysis
drift go data-access         # Database patterns
drift go goroutines          # Concurrency patterns
```

### Frameworks (5)
| Framework | Detection Method |
|-----------|------------------|
| Gin | `gin.Context`, `gin.Engine` |
| Echo | `echo.Context`, `echo.Echo` |
| Fiber | `fiber.Ctx`, `fiber.App` |
| Chi | `chi.Router`, `chi.Mux` |
| net/http | `http.HandleFunc`, `http.ListenAndServe` |

### ORMs & Data Access
| ORM | Detection | Patterns Detected |
|-----|-----------|-------------------|
| GORM | `gorm.io/gorm` | `db.Create()`, `db.Find()`, `db.Where()` |
| sqlx | `github.com/jmoiron/sqlx` | `db.Select()`, `db.Get()`, `db.Exec()` |
| Ent | `entgo.io/ent` | Schema definitions, queries |
| Bun | `github.com/uptrace/bun` | `db.NewSelect()`, `db.NewInsert()` |

### Features
- Full AST parsing via Tree-sitter
- Function and method extraction
- Interface and struct analysis
- Goroutine and defer detection
- Error handling pattern detection (`if err != nil`)
- Package-level analysis

### File Extensions
`.go`

---

## Rust

### Quick Start
```bash
drift rust status            # Project overview
drift rust routes            # HTTP routes
drift rust errors            # Error handling
drift rust traits            # Trait analysis
drift rust data-access       # Database patterns
drift rust async             # Async patterns
```

### Frameworks (4)
| Framework | Detection Method |
|-----------|------------------|
| Actix Web | `#[actix_web::main]`, `#[get]`, `#[post]` |
| Axum | `axum::Router`, `axum::extract` |
| Rocket | `#[rocket::main]`, `#[get]`, `#[post]` |
| Warp | `warp::Filter`, `warp::path` |

### ORMs & Data Access
| ORM | Detection | Patterns Detected |
|-----|-----------|-------------------|
| SQLx | `sqlx` | `sqlx::query!`, `sqlx::query_as!` |
| Diesel | `diesel` | Schema macros, `QueryDsl` |
| SeaORM | `sea-orm` | Entity definitions, queries |

### Features
- Full AST parsing via Tree-sitter
- Function, method, and impl block extraction
- Trait and struct analysis
- Async/await pattern detection
- Result/Option error handling
- Macro invocation tracking
- Lifetime and generic analysis

### File Extensions
`.rs`

---

## C++

### Quick Start
```bash
drift cpp status             # Project overview
drift cpp classes            # Class analysis
drift cpp memory             # Memory management
drift cpp templates          # Template analysis
drift cpp virtual            # Virtual functions
```

### Frameworks (3)
| Framework | Detection Method |
|-----------|------------------|
| Crow | `crow::SimpleApp`, `CROW_ROUTE` |
| Boost.Beast | `boost::beast::http` |
| Qt Network | `QNetworkAccessManager`, `QHttpServer` |

### ORMs & Data Access
| Library | Detection | Patterns Detected |
|---------|-----------|-------------------|
| SQLite | `sqlite3.h` | `sqlite3_prepare()`, `sqlite3_step()` |
| ODBC | `sql.h` | `SQLConnect()`, `SQLExecDirect()` |
| Qt SQL | `QSqlDatabase` | `QSqlQuery`, `QSqlDatabase::open()` |

### Features
- Full AST parsing via Tree-sitter
- Class, struct, and template extraction
- Virtual function and inheritance analysis
- RAII and smart pointer detection
- Namespace analysis
- Preprocessor macro detection
- Constructor/destructor tracking

### File Extensions
`.cpp`, `.cc`, `.cxx`, `.c++`, `.hpp`, `.hh`, `.hxx`, `.h`, `.ipp`, `.tpp`

---

## C

### Features
- Full AST parsing via Tree-sitter
- Function signature extraction
- Include analysis
- Struct definitions
- Preprocessor macro detection

### File Extensions
`.c`, `.h`

---

## How Parsing Works

### Native Rust Parsing

Drift uses native Rust tree-sitter bindings for maximum performance:

1. **Parse** — Source code → Abstract Syntax Tree (native Rust)
2. **Extract** — Functions, classes, decorators, imports
3. **Resolve** — Call targets, data access points
4. **Build** — Call graph stored in SQLite

**Performance:** ~0.5ms per file (10x faster than WASM)

### Hybrid Extraction

Drift combines AST parsing with regex fallback:

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
   Call Graph + Patterns
```

---

## Checking Parser Status

```bash
# Show parser status
drift parser

# Test parser functionality
drift parser --test
```

**Output:**
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
C:          ✅ Ready (tree-sitter-c)
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

---

## Summary

| Category | Count |
|----------|-------|
| **Languages** | 10 |
| **Web Frameworks** | 21 |
| **ORMs / Data Access** | 16 |
| **Base Pattern Detectors** | 400+ |

→ [Full Framework List](https://github.com/dadbodgeoff/drift/blob/main/SUPPORTED_LANGUAGES_FRAMEWORKS.md)
