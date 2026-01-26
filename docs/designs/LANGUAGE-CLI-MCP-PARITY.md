# Language CLI & MCP Tool Parity

## Executive Summary

This document outlines the plan to bring all 8 supported languages to full parity by adding dedicated CLI commands and MCP tools for TypeScript, Python, Java, and PHP. Currently only Go, Rust, C++, and C# (WPF) have language-specific tooling.

---

## Current State Analysis

### CLI/MCP Tool Matrix

| Language | CLI Command | MCP Tool | Status |
|----------|-------------|----------|--------|
| TypeScript/JS | ❌ None | ❌ None | **Gap** |
| Python | ❌ None | ❌ None | **Gap** |
| Java | ❌ None | ❌ None | **Gap** |
| C# | ✅ `drift wpf` | ✅ `drift_wpf` | Partial (WPF only) |
| PHP | ❌ None | ❌ None | **Gap** |
| Go | ✅ `drift go` | ✅ `drift_go` | Complete |
| Rust | ✅ `drift rust` | ✅ `drift_rust` | Complete |
| C++ | ✅ `drift cpp` | ✅ `drift_cpp` | Complete |

### Core Infrastructure Matrix (All Complete)

| Component | TS | Python | Java | C# | PHP | Go | Rust | C++ |
|-----------|-----|--------|------|-----|-----|-----|------|-----|
| Tree-sitter Parser | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Regex Fallback | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hybrid Extractor | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Data Access | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Test Topology | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Environment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Goals

1. Add `drift ts` CLI command with TypeScript/JavaScript-specific analysis
2. Add `drift py` CLI command with Python-specific analysis
3. Add `drift java` CLI command with Java-specific analysis
4. Add `drift php` CLI command with PHP-specific analysis
5. Add corresponding MCP tools: `drift_typescript`, `drift_python`, `drift_java`, `drift_php`
6. Ensure consistent action patterns across all language tools

## Non-Goals

- Adding new core extractors (already complete)
- Changing existing hybrid extraction architecture
- Adding new framework detectors (separate effort)
- Modifying tree-sitter parsers

---

## Architecture

### Existing Pattern (Go/Rust/C++)

Each language-specific tool follows this pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Language-Specific Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ CLI Command     │  │  MCP Tool       │  │ Language        │  │
│  │ drift <lang>    │  │  drift_<lang>   │  │ Analyzer        │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                     │           │
│           └────────────────────┼─────────────────────┘           │
│                                ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Existing Hybrid Extractor                       ││
│  │  (Tree-sitter + Regex with confidence tracking)              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### File Structure (New Files)

```
packages/cli/src/commands/
├── ts.ts                    # NEW: drift ts <subcommand>
├── py.ts                    # NEW: drift py <subcommand>
├── java.ts                  # NEW: drift java <subcommand>
├── php.ts                   # NEW: drift php <subcommand>
├── go.ts                    # Existing
├── rust.ts                  # Existing
├── cpp.ts                   # Existing
└── wpf.ts                   # Existing (C# WPF)

packages/mcp/src/tools/analysis/
├── typescript.ts            # NEW: drift_typescript MCP tool
├── python.ts                # NEW: drift_python MCP tool
├── java.ts                  # NEW: drift_java MCP tool
├── php.ts                   # NEW: drift_php MCP tool
├── go.ts                    # Existing
├── rust.ts                  # Existing
├── cpp.ts                   # Existing
└── wpf.ts                   # Existing

packages/core/src/
├── typescript/
│   └── typescript-analyzer.ts   # NEW: TS-specific analysis
├── python/
│   └── python-analyzer.ts       # NEW: Python-specific analysis
├── java/
│   └── java-analyzer.ts         # NEW: Java-specific analysis
└── php/
    └── php-analyzer.ts          # NEW: PHP-specific analysis
```

---

## Standardized Actions

All language-specific tools will support these actions:

| Action | Description |
|--------|-------------|
| `status` | Project overview (files, frameworks, statistics) |
| `routes` | API routes/endpoints analysis |
| `errors` | Error handling patterns |
| `data-access` | Database/ORM patterns |
| `async` | Async patterns (where applicable) |
| `frameworks` | Detected frameworks |

### Language-Specific Actions

| Language | Extra Actions |
|----------|---------------|
| TypeScript | `components` (React), `hooks`, `decorators` (NestJS) |
| Python | `decorators`, `classes`, `imports` |
| Java | `annotations`, `beans`, `interfaces` |
| PHP | `traits`, `namespaces`, `facades` (Laravel) |

---

## Phase 1: TypeScript/JavaScript CLI & MCP ✅ COMPLETE

### 1.1 CLI Command: `drift ts`

```bash
# Usage
drift ts status              # Project overview
drift ts routes              # Express/NestJS/Next.js routes
drift ts components          # React components
drift ts hooks               # React hooks usage
drift ts errors              # Error handling patterns
drift ts data-access         # Prisma/TypeORM/Drizzle patterns
drift ts decorators          # NestJS decorators
```

### 1.2 TypeScript Analyzer

```typescript
// packages/core/src/typescript/typescript-analyzer.ts

export interface TypeScriptAnalysisResult {
  projectInfo: {
    files: number;
    lines: number;
    hasTypeScript: boolean;
    hasJavaScript: boolean;
    frameworks: string[];
  };
  statistics: {
    functions: number;
    classes: number;
    interfaces: number;
    types: number;
    components: number;
    hooks: number;
    asyncFunctions: number;
  };
  frameworks: {
    react: boolean;
    nextjs: boolean;
    express: boolean;
    nestjs: boolean;
    fastify: boolean;
  };
  routes: RouteInfo[];
  components: ComponentInfo[];
  hooks: HookInfo[];
  dataAccess: DataAccessInfo[];
}

export class TypeScriptAnalyzer {
  async analyze(projectPath: string): Promise<TypeScriptAnalysisResult>;
  async getRoutes(projectPath: string): Promise<RouteInfo[]>;
  async getComponents(projectPath: string): Promise<ComponentInfo[]>;
  async getHooks(projectPath: string): Promise<HookInfo[]>;
  async getDataAccess(projectPath: string): Promise<DataAccessInfo[]>;
  async getErrorPatterns(projectPath: string): Promise<ErrorPatternInfo[]>;
}
```

### 1.3 MCP Tool: `drift_typescript`

```typescript
// packages/mcp/src/tools/analysis/typescript.ts

export const typescriptTool = {
  name: 'drift_typescript',
  description: 'TypeScript/JavaScript-specific analysis',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'routes', 'components', 'hooks', 'errors', 
               'data-access', 'decorators', 'async'],
        description: 'Analysis action to perform'
      },
      path: {
        type: 'string',
        description: 'Optional path filter'
      }
    },
    required: ['action']
  }
};
```

### 1.4 Frameworks to Detect

| Framework | Detection Pattern |
|-----------|-------------------|
| React | `react`, `useState`, `useEffect`, JSX |
| Next.js | `next`, `getServerSideProps`, app router |
| Express | `express()`, `app.get/post/put/delete` |
| NestJS | `@Controller`, `@Injectable`, `@Module` |
| Fastify | `fastify()`, `fastify.get/post` |
| Prisma | `@prisma/client`, `prisma.` |
| TypeORM | `@Entity`, `Repository` |
| Drizzle | `drizzle-orm` |

---

## Phase 2: Python CLI & MCP

### 2.1 CLI Command: `drift py`

```bash
# Usage
drift py status              # Project overview
drift py routes              # Django/FastAPI/Flask routes
drift py classes             # Class definitions
drift py decorators          # Decorator usage
drift py errors              # Exception handling patterns
drift py data-access         # SQLAlchemy/Django ORM patterns
drift py async               # asyncio patterns
drift py imports             # Import analysis
```

### 2.2 Python Analyzer

```typescript
// packages/core/src/python/python-analyzer.ts

export interface PythonAnalysisResult {
  projectInfo: {
    files: number;
    lines: number;
    pythonVersion: string | null;
    frameworks: string[];
  };
  statistics: {
    functions: number;
    classes: number;
    asyncFunctions: number;
    decorators: number;
  };
  frameworks: {
    django: boolean;
    fastapi: boolean;
    flask: boolean;
    sqlalchemy: boolean;
    pydantic: boolean;
  };
  routes: RouteInfo[];
  classes: ClassInfo[];
  decorators: DecoratorInfo[];
  dataAccess: DataAccessInfo[];
}

export class PythonAnalyzer {
  async analyze(projectPath: string): Promise<PythonAnalysisResult>;
  async getRoutes(projectPath: string): Promise<RouteInfo[]>;
  async getClasses(projectPath: string): Promise<ClassInfo[]>;
  async getDecorators(projectPath: string): Promise<DecoratorInfo[]>;
  async getDataAccess(projectPath: string): Promise<DataAccessInfo[]>;
}
```

### 2.3 MCP Tool: `drift_python`

```typescript
// packages/mcp/src/tools/analysis/python.ts

export const pythonTool = {
  name: 'drift_python',
  description: 'Python-specific analysis',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'routes', 'classes', 'decorators', 'errors',
               'data-access', 'async', 'imports'],
        description: 'Analysis action to perform'
      },
      path: {
        type: 'string',
        description: 'Optional path filter'
      }
    },
    required: ['action']
  }
};
```

### 2.4 Frameworks to Detect

| Framework | Detection Pattern |
|-----------|-------------------|
| Django | `django`, `from django.`, `urls.py` |
| FastAPI | `fastapi`, `@app.get`, `@router.` |
| Flask | `flask`, `@app.route` |
| SQLAlchemy | `sqlalchemy`, `Base`, `Session` |
| Django ORM | `models.Model`, `objects.filter` |
| Pydantic | `pydantic`, `BaseModel` |
| Tortoise | `tortoise-orm` |

---

## Phase 3: Java CLI & MCP

### 3.1 CLI Command: `drift java`

```bash
# Usage
drift java status            # Project overview
drift java routes            # Spring MVC routes
drift java annotations       # Annotation usage
drift java beans             # Spring beans
drift java interfaces        # Interface definitions
drift java errors            # Exception handling
drift java data-access       # JPA/Hibernate patterns
```

### 3.2 Java Analyzer

```typescript
// packages/core/src/java/java-analyzer.ts

export interface JavaAnalysisResult {
  projectInfo: {
    files: number;
    lines: number;
    javaVersion: string | null;
    buildTool: 'maven' | 'gradle' | null;
    frameworks: string[];
  };
  statistics: {
    classes: number;
    interfaces: number;
    enums: number;
    methods: number;
    annotations: number;
  };
  frameworks: {
    springBoot: boolean;
    springMvc: boolean;
    springSecurity: boolean;
    jpa: boolean;
    hibernate: boolean;
  };
  routes: RouteInfo[];
  beans: BeanInfo[];
  entities: EntityInfo[];
  repositories: RepositoryInfo[];
}

export class JavaAnalyzer {
  async analyze(projectPath: string): Promise<JavaAnalysisResult>;
  async getRoutes(projectPath: string): Promise<RouteInfo[]>;
  async getBeans(projectPath: string): Promise<BeanInfo[]>;
  async getEntities(projectPath: string): Promise<EntityInfo[]>;
  async getAnnotations(projectPath: string): Promise<AnnotationInfo[]>;
}
```

### 3.3 MCP Tool: `drift_java`

```typescript
// packages/mcp/src/tools/analysis/java.ts

export const javaTool = {
  name: 'drift_java',
  description: 'Java-specific analysis',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'routes', 'annotations', 'beans', 'interfaces',
               'errors', 'data-access', 'entities'],
        description: 'Analysis action to perform'
      },
      path: {
        type: 'string',
        description: 'Optional path filter'
      }
    },
    required: ['action']
  }
};
```

### 3.4 Frameworks to Detect

| Framework | Detection Pattern |
|-----------|-------------------|
| Spring Boot | `@SpringBootApplication`, `spring-boot` |
| Spring MVC | `@RestController`, `@RequestMapping` |
| Spring Security | `@EnableWebSecurity`, `SecurityConfig` |
| JPA | `@Entity`, `@Repository`, `EntityManager` |
| Hibernate | `hibernate`, `SessionFactory` |
| MyBatis | `mybatis`, `@Mapper` |

---

## Phase 4: PHP CLI & MCP

### 4.1 CLI Command: `drift php`

```bash
# Usage
drift php status             # Project overview
drift php routes             # Laravel routes
drift php traits             # Trait usage
drift php namespaces         # Namespace analysis
drift php facades            # Laravel facades
drift php errors             # Exception handling
drift php data-access        # Eloquent patterns
```

### 4.2 PHP Analyzer

```typescript
// packages/core/src/php/php-analyzer.ts

export interface PhpAnalysisResult {
  projectInfo: {
    files: number;
    lines: number;
    phpVersion: string | null;
    frameworks: string[];
  };
  statistics: {
    classes: number;
    traits: number;
    interfaces: number;
    functions: number;
    namespaces: number;
  };
  frameworks: {
    laravel: boolean;
    symfony: boolean;
    wordpress: boolean;
  };
  routes: RouteInfo[];
  controllers: ControllerInfo[];
  models: ModelInfo[];
  traits: TraitInfo[];
}

export class PhpAnalyzer {
  async analyze(projectPath: string): Promise<PhpAnalysisResult>;
  async getRoutes(projectPath: string): Promise<RouteInfo[]>;
  async getControllers(projectPath: string): Promise<ControllerInfo[]>;
  async getModels(projectPath: string): Promise<ModelInfo[]>;
  async getTraits(projectPath: string): Promise<TraitInfo[]>;
}
```

### 4.3 MCP Tool: `drift_php`

```typescript
// packages/mcp/src/tools/analysis/php.ts

export const phpTool = {
  name: 'drift_php',
  description: 'PHP-specific analysis',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'routes', 'traits', 'namespaces', 'facades',
               'errors', 'data-access', 'controllers', 'models'],
        description: 'Analysis action to perform'
      },
      path: {
        type: 'string',
        description: 'Optional path filter'
      }
    },
    required: ['action']
  }
};
```

### 4.4 Frameworks to Detect

| Framework | Detection Pattern |
|-----------|-------------------|
| Laravel | `laravel`, `Illuminate\`, `artisan` |
| Symfony | `symfony`, `Symfony\` |
| WordPress | `wp-`, `add_action`, `add_filter` |
| Eloquent | `Eloquent`, `Model`, `hasMany` |
| Doctrine | `doctrine`, `EntityManager` |

---

## Implementation Roadmap

### Phase 1: TypeScript/JavaScript (Priority: High)

| Task | Effort | Files |
|------|--------|-------|
| Create TypeScript analyzer | 2d | `typescript-analyzer.ts` |
| Create `drift ts` CLI command | 1d | `ts.ts` |
| Create `drift_typescript` MCP tool | 1d | `typescript.ts` |
| Add React component detection | 1d | `typescript-analyzer.ts` |
| Add hook detection | 0.5d | `typescript-analyzer.ts` |
| Add route detection (Express/NestJS/Next) | 1d | `typescript-analyzer.ts` |
| Tests | 1d | `typescript-analyzer.test.ts` |
| **Total** | **7.5d** | |

### Phase 2: Python (Priority: High)

| Task | Effort | Files |
|------|--------|-------|
| Create Python analyzer | 2d | `python-analyzer.ts` |
| Create `drift py` CLI command | 1d | `py.ts` |
| Create `drift_python` MCP tool | 1d | `python.ts` |
| Add Django route detection | 1d | `python-analyzer.ts` |
| Add FastAPI route detection | 0.5d | `python-analyzer.ts` |
| Add Flask route detection | 0.5d | `python-analyzer.ts` |
| Tests | 1d | `python-analyzer.test.ts` |
| **Total** | **7d** | |

### Phase 3: Java (Priority: Medium)

| Task | Effort | Files |
|------|--------|-------|
| Create Java analyzer | 2d | `java-analyzer.ts` |
| Create `drift java` CLI command | 1d | `java.ts` |
| Create `drift_java` MCP tool | 1d | `java.ts` |
| Add Spring route detection | 1d | `java-analyzer.ts` |
| Add bean detection | 0.5d | `java-analyzer.ts` |
| Add entity detection | 0.5d | `java-analyzer.ts` |
| Tests | 1d | `java-analyzer.test.ts` |
| **Total** | **7d** | |

### Phase 4: PHP (Priority: Medium)

| Task | Effort | Files |
|------|--------|-------|
| Create PHP analyzer | 2d | `php-analyzer.ts` |
| Create `drift php` CLI command | 1d | `php.ts` |
| Create `drift_php` MCP tool | 1d | `php.ts` |
| Add Laravel route detection | 1d | `php-analyzer.ts` |
| Add Eloquent model detection | 0.5d | `php-analyzer.ts` |
| Add trait detection | 0.5d | `php-analyzer.ts` |
| Tests | 1d | `php-analyzer.test.ts` |
| **Total** | **7d** | |

### Total Effort: ~28.5 days

---

## CLI Output Format

All language commands will follow consistent output formatting:

```
📊 TypeScript Project Status
═══════════════════════════════
Files: 156 (142 .ts, 14 .tsx)
Lines: 24,521

Detected Frameworks: React, Next.js, Prisma

Statistics:
  Functions: 423
  Classes: 45
  Components: 67
  Hooks: 89
  Async Functions: 156

Data Access:
  Prisma models: 12
  Queries detected: 89
```

---

## MCP Tool Registration

Update `packages/mcp/src/tools/analysis/index.ts`:

```typescript
import { typescriptTool, handleTypescript } from './typescript.js';
import { pythonTool, handlePython } from './python.js';
import { javaTool, handleJava } from './java.js';
import { phpTool, handlePhp } from './php.js';
import { goTool, handleGo } from './go.js';
import { rustTool, handleRust } from './rust.js';
import { cppTool, handleCpp } from './cpp.js';
import { wpfTool, handleWpf } from './wpf.js';

export const analysisTools = [
  typescriptTool,  // NEW
  pythonTool,      // NEW
  javaTool,        // NEW
  phpTool,         // NEW
  goTool,
  rustTool,
  cppTool,
  wpfTool,
];

export const analysisHandlers = {
  drift_typescript: handleTypescript,  // NEW
  drift_python: handlePython,          // NEW
  drift_java: handleJava,              // NEW
  drift_php: handlePhp,                // NEW
  drift_go: handleGo,
  drift_rust: handleRust,
  drift_cpp: handleCpp,
  drift_wpf: handleWpf,
};
```

---

## CLI Command Registration

Update `packages/cli/src/commands/index.ts`:

```typescript
import { tsCommand } from './ts.js';
import { pyCommand } from './py.js';
import { javaCommand } from './java.js';
import { phpCommand } from './php.js';
import { goCommand } from './go.js';
import { rustCommand } from './rust.js';
import { cppCommand } from './cpp.js';
import { wpfCommand } from './wpf.js';

export const languageCommands = [
  tsCommand,    // NEW
  pyCommand,    // NEW
  javaCommand,  // NEW
  phpCommand,   // NEW
  goCommand,
  rustCommand,
  cppCommand,
  wpfCommand,
];
```

---

## Wiki Updates Required

Update `drift/wiki/Language-Support.md` to add:

```markdown
## Language-Specific MCP Tools

| Language | MCP Tool | CLI Command |
|----------|----------|-------------|
| TypeScript/JS | `drift_typescript` | `drift ts` |
| Python | `drift_python` | `drift py` |
| Java | `drift_java` | `drift java` |
| PHP | `drift_php` | `drift php` |
| Go | `drift_go` | `drift go` |
| Rust | `drift_rust` | `drift rust` |
| C++ | `drift_cpp` | `drift cpp` |
| WPF (C#) | `drift_wpf` | `drift wpf` |
```

Update `drift/wiki/CLI-Reference.md` with new commands.

Update `drift/wiki/MCP-Tools-Reference.md` with new tools.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| All 8 languages have CLI commands | ✅ |
| All 8 languages have MCP tools | ✅ |
| Consistent action patterns across tools | ✅ |
| Framework detection accuracy | 95%+ |
| Route detection accuracy | 90%+ |
| Wiki documentation complete | ✅ |

---

## Testing Strategy

### Unit Tests

Each analyzer should have comprehensive tests:

```typescript
describe('TypeScriptAnalyzer', () => {
  describe('status', () => {
    it('detects React projects', () => {});
    it('detects Next.js projects', () => {});
    it('detects NestJS projects', () => {});
    it('counts components correctly', () => {});
  });
  
  describe('routes', () => {
    it('extracts Express routes', () => {});
    it('extracts NestJS routes', () => {});
    it('extracts Next.js API routes', () => {});
  });
  
  describe('components', () => {
    it('detects functional components', () => {});
    it('detects class components', () => {});
    it('extracts props types', () => {});
  });
});
```

### Integration Tests

Use existing demo projects:
- `demo/frontend/` for TypeScript/React
- `demo/backend/` for TypeScript/Express
- Create `demo/python-backend/` for Python
- Use `demo/spring-backend/` for Java
- Use `demo/laravel-backend/` for PHP

---

## Appendix: Reference Implementations

### Go CLI (Reference)

See `packages/cli/src/commands/go.ts` for the pattern to follow.

### Rust MCP Tool (Reference)

See `packages/mcp/src/tools/analysis/rust.ts` for the pattern to follow.

### C++ Analyzer (Reference)

See `packages/core/src/cpp/cpp-analyzer.ts` for the analyzer pattern.
