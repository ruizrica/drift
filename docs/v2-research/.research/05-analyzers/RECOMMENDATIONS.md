# 05 Analyzers — V2 Recommendations

## Summary

14 recommendations organized by priority, synthesized from comprehensive analysis of Drift's analyzer system and external research from 12+ authoritative sources. The recommendations address five critical gaps: incremental computation (Salsa-based query system), architectural boundaries (rust-analyzer-inspired layering), security analysis (taint tracking), semantic generalization (multi-language type/scope analysis), and developer experience (fix coverage, feedback loops). Combined, these changes would transform Drift's analyzer system from a capable but monolithic TypeScript implementation into an enterprise-grade, Rust-powered semantic analysis engine suitable for million-line codebases with sub-second response times.

---

## Recommendations

### R1: Salsa-Based Incremental Query System

**Priority**: P0 (Critical)
**Effort**: Very High
**Impact**: 10-100x performance improvement for incremental analysis; enables IDE-grade responsiveness

**Current State**:
Drift's analyzers are stateless functions that re-compute everything on each invocation. There is no caching, no dependency tracking, and no incremental updates. For a 10,000-file codebase, every scan re-analyzes all 10,000 files even if only one file changed.

**Proposed Change**:
Adopt the Salsa framework for incremental computation in Drift's Rust core. Define analyzers as Salsa queries with explicit inputs and outputs:

```rust
#[salsa::query_group(AnalyzerDatabase)]
pub trait AnalyzerDb {
    // Inputs (set by the client)
    #[salsa::input]
    fn file_content(&self, file: FileId) -> Arc<String>;
    
    #[salsa::input]
    fn file_config(&self, file: FileId) -> Arc<FileConfig>;
    
    // Derived queries (computed on demand, cached)
    fn parse(&self, file: FileId) -> Arc<ParseResult>;
    fn symbols(&self, file: FileId) -> Arc<SymbolTable>;
    fn types(&self, file: FileId) -> Arc<TypeInfo>;
    fn flow(&self, file: FileId) -> Arc<FlowAnalysis>;
    fn secrets(&self, file: FileId) -> Arc<Vec<SecretCandidate>>;
    fn coupling(&self, module: ModuleId) -> Arc<CouplingMetrics>;
}
```

**Key Design Decisions**:

1. **File-level granularity**: Each file is an independent query input. Changing one file only invalidates queries that depend on that file.

2. **Function-body isolation**: Following rust-analyzer's invariant: "typing inside a function's body never invalidates global derived data." Achieve this by separating function signatures (module-level) from function bodies (local).

3. **Durability levels**: Mark standard library analysis as high-durability (rarely changes), user code as low-durability (changes frequently).

4. **Revision-based cancellation**: When inputs change, increment a global revision counter. Long-running queries check the counter and cancel if stale.


**Rationale**:
Every production-grade semantic analyzer uses incremental computation. rust-analyzer processes millions of lines with sub-second response times using Salsa. Roslyn uses a similar query-based model. Google's Tricorder explicitly designs for incremental analysis. Without incrementality, Drift cannot scale to enterprise codebases.

**Evidence**:
- rust-analyzer (R1): Salsa-based incremental computation enables IDE-grade responsiveness
- Salsa Framework (R3): "The key idea is that you define your program as a set of queries"
- Google Tricorder (R12): "Instead of analyzing entire large projects, we focus on files affected by a pending code change"

**Implementation Notes**:
- Salsa is a Rust crate; integrate directly into `drift-core`
- Expose query results to TypeScript via NAPI
- Start with file-level queries, refine to function-level as needed
- Implement cancellation via `Cancelled::throw()` pattern from rust-analyzer

**Risks**:
- Salsa has a learning curve; requires understanding query dependencies
- Retrofitting existing analyzers to query model is significant work
- TypeScript layer must handle cancelled queries gracefully

**Dependencies**:
- 01-rust-core: Salsa integration is Rust-only
- 02-parsers: Parsing must be a Salsa query for incremental parsing
- All analyzer categories: Must be refactored to query model

---

### R2: Layered Architecture with Explicit API Boundaries

**Priority**: P0 (Critical)
**Effort**: High
**Impact**: Enables independent evolution of layers; improves testability; clarifies responsibilities

**Current State**:
Drift's analyzer code mixes concerns. The same crate contains parsing, semantic analysis, and IDE features. There are no explicit API boundaries. Internal types leak across layers. This makes refactoring difficult and testing complex.

**Proposed Change**:
Adopt rust-analyzer's layered architecture with explicit boundaries:

```
Layer 1: syntax (API Boundary)
├── Tree-sitter parsing
├── Syntax tree types (value types, no semantic info)
├── No dependencies on other Drift crates
└── Can be used standalone for syntax-only tools

Layer 2: hir-def, hir-ty (Internal)
├── Low-level semantic analysis
├── ECS-style with raw IDs and direct DB queries
├── Scope resolution, type inference, flow analysis
└── Not an API boundary — can change freely

Layer 3: hir (API Boundary)
├── High-level semantic API
├── OO-flavored facade over hir-def/hir-ty
├── Stable types for external consumers
└── Source-to-HIR mapping

Layer 4: ide (API Boundary)
├── IDE features built on hir
├── POD types only (no syntax trees, no hir types)
├── Editor terminology (offsets, labels, not definitions)
└── Conceptually serializable
```

**Key Design Decisions**:

1. **Syntax as value type**: "The tree is fully determined by the contents of its syntax nodes, it doesn't need global context." This enables parallel parsing and clean separation.

2. **Internal layers can change**: hir-def and hir-ty are not API boundaries. They can be refactored freely without breaking external consumers.

3. **IDE layer uses editor terminology**: The ide layer talks about "offsets" and "labels", not "definitions" and "types". This makes it easy to serialize for LSP.

4. **Source-to-HIR mapping in hir**: The recursive pattern for resolving syntax to semantics lives in the hir layer, not scattered across the codebase.

**Rationale**:
rust-analyzer's architecture enables a small team to maintain a complex codebase. Clear boundaries mean changes in one layer don't cascade. The syntax crate can be used by tools that don't need semantic analysis. The ide crate provides a stable API for multiple consumers (LSP, CLI, tests).

**Evidence**:
- rust-analyzer (R1): "syntax crate is completely independent from the rest of rust-analyzer"
- rust-analyzer (R1): "hir-xxx crates are not, and will never be, an API boundary"
- Roslyn (R2): Separates Syntax API from Semantic API with clear boundaries

**Implementation Notes**:
- Start by extracting syntax layer from drift-core
- Define hir types as the stable semantic API
- Refactor ide layer to use only POD types
- Document which crates are API boundaries

**Risks**:
- Large refactoring effort across multiple crates
- May break existing consumers during transition
- Requires discipline to maintain boundaries

**Dependencies**:
- All Drift crates: Affects the entire codebase structure
- 07-mcp: MCP tools should consume ide layer, not internal types
- 11-ide: VSCode extension should use ide layer

---

### R3: Taint Analysis for Security Detection

**Priority**: P0 (Critical)
**Effort**: Very High
**Impact**: Dramatically reduces false positives in security detection; catches real vulnerabilities that pattern matching misses

**Current State**:
Drift's security detectors use pattern matching (regex, AST patterns) to find vulnerabilities. This approach has high false positive rates because it can't distinguish between sanitized and unsanitized data. For example, Drift flags `query("SELECT * FROM users WHERE id = " + userId)` even if `userId` was validated.

**Proposed Change**:
Implement interprocedural taint analysis with source-sink-sanitizer model:

```rust
// Taint sources (where untrusted data enters)
enum TaintSource {
    UserInput,      // req.body, req.query, req.params
    NetworkData,    // fetch response, socket data
    FileRead,       // fs.readFile, file input
    DatabaseResult, // query results (for second-order injection)
    Environment,    // process.env (for some contexts)
}

// Taint sinks (where untrusted data is dangerous)
enum TaintSink {
    SqlQuery,       // database queries
    CommandExec,    // child_process, exec, system
    FileWrite,      // fs.writeFile, file output
    HtmlRender,     // innerHTML, dangerouslySetInnerHTML
    UrlRedirect,    // res.redirect, window.location
    Deserialization,// JSON.parse, pickle.loads
}

// Sanitizers (functions that make data safe)
struct Sanitizer {
    function: FunctionId,
    sanitizes: Vec<TaintSink>, // which sinks this sanitizer protects against
}

// Taint analysis result
struct TaintFlow {
    source: TaintSource,
    source_location: Location,
    sink: TaintSink,
    sink_location: Location,
    path: Vec<Location>,       // data flow path
    sanitized: bool,           // was data sanitized?
    sanitizer: Option<FunctionId>,
}
```

**Key Design Decisions**:

1. **Interprocedural**: Track taint across function boundaries using call graph.

2. **Context-sensitive**: Distinguish between different call sites of the same function.

3. **Configurable sanitizers**: Allow users to mark custom functions as sanitizers.

4. **Path recording**: Record the data flow path for debugging and explanation.

5. **Framework-aware**: Recognize framework-specific sources (Express req.body, Django request.POST).

**Rationale**:
Taint analysis is the industry standard for SAST security detection. SonarQube, Checkmarx, Fortify, and Semgrep all use taint analysis. Pattern-based detection has unacceptably high false positive rates for enterprise use.

**Evidence**:
- JetBrains (R6): "Taint analysis traces the flow of untrusted data through your application"
- SonarSource (R6): "SonarQube's taint analysis tracks user-controllable data through your entire application"
- Qt (R6): "Taint analysis is a core technique used in Static Analysis Security Testing (SAST)"

**Implementation Notes**:
- Build on Flow Analyzer's CFG and data flow infrastructure
- Integrate with Call Graph for interprocedural analysis
- Start with SQL injection and XSS (highest value)
- Add sanitizer recognition for common libraries (express-validator, DOMPurify)

**Risks**:
- Interprocedural analysis is expensive; may impact performance
- Sanitizer database requires ongoing maintenance
- False negatives possible if sanitizers not recognized

**Dependencies**:
- 04-call-graph: Required for interprocedural tracking
- 05-analyzers/flow-analyzer: CFG and data flow infrastructure
- 21-security: Security boundary integration

---

### R4: Generalized Semantic Analysis for All Languages

**Priority**: P1 (Important)
**Effort**: Very High
**Impact**: Enables type-aware analysis for Python, Java, Go, etc.; currently TypeScript-only

**Current State**:
Drift's Type Analyzer and Semantic Analyzer only work for TypeScript. Other languages get basic AST analysis but no type information, no scope resolution, and no symbol tables. This limits the quality of analysis for non-TypeScript codebases.

**Proposed Change**:
Design a language-agnostic semantic model with per-language implementations:

```rust
// Language-agnostic semantic traits
trait TypeSystem {
    fn infer_type(&self, expr: ExprId) -> TypeId;
    fn is_subtype(&self, sub: TypeId, super_: TypeId) -> bool;
    fn resolve_member(&self, type_: TypeId, name: &str) -> Option<MemberId>;
}

trait ScopeResolver {
    fn resolve_name(&self, name: &str, scope: ScopeId) -> Option<SymbolId>;
    fn visible_symbols(&self, scope: ScopeId) -> Vec<SymbolId>;
    fn scope_at_position(&self, pos: Position) -> ScopeId;
}

// Per-language implementations
struct TypeScriptSemantics { /* ... */ }
struct PythonSemantics { /* ... */ }
struct JavaSemantics { /* ... */ }
struct GoSemantics { /* ... */ }

impl TypeSystem for TypeScriptSemantics { /* ... */ }
impl TypeSystem for PythonSemantics { /* ... */ }
// etc.
```

**Key Design Decisions**:

1. **Trait-based abstraction**: Define semantic operations as traits, implement per language.

2. **Gradual typing support**: Python and JavaScript have optional types; the model must handle untyped code gracefully.

3. **Type inference levels**: Some languages (TypeScript, Rust) have full inference; others (Python) have limited inference. Support both.

4. **External type information**: Support type stubs (Python .pyi), declaration files (TypeScript .d.ts), and IDE-provided types.

**Rationale**:
Roslyn provides semantic analysis for C# and VB.NET through a unified API. rust-analyzer provides it for Rust. Drift should provide equivalent capabilities for all supported languages, not just TypeScript.

**Evidence**:
- Roslyn (R2): "The Semantic API answers questions like 'What names are in scope?', 'What members are accessible?'"
- rust-analyzer (R1): "hir provides a static, fully resolved view of the code"

**Implementation Notes**:
- Start with Python (large user base, type hints increasingly common)
- Leverage existing type checkers (pyright, mypy) for Python type info
- Java and Go have strong type systems; implementation is more straightforward
- Consider LSP integration for external type information

**Risks**:
- Each language is a significant implementation effort
- Type systems differ significantly; abstraction may leak
- Maintaining parity across languages is ongoing work

**Dependencies**:
- 02-parsers: Need rich AST for each language
- Per-language analyzers: Existing language analyzers become semantic implementations

---

### R5: Compilation Abstraction for Cross-File Analysis

**Priority**: P1 (Important)
**Effort**: High
**Impact**: Enables accurate cross-file analysis; provides context for semantic queries

**Current State**:
Drift analyzes files independently. There's no unified "Compilation" concept that bundles source files with their dependencies, configuration, and target environment. This makes cross-file analysis ad-hoc and incomplete.

**Proposed Change**:
Introduce a Compilation abstraction inspired by Roslyn:

```rust
struct Compilation {
    // Source files in this compilation
    source_files: Vec<FileId>,
    
    // External dependencies (node_modules, pip packages, etc.)
    dependencies: Vec<DependencyId>,
    
    // Compilation options (target, module system, etc.)
    options: CompilationOptions,
    
    // Language-specific compiler (for type checking, etc.)
    language: Language,
}

impl Compilation {
    // Get semantic model for a file in this compilation
    fn get_semantic_model(&self, file: FileId) -> SemanticModel;
    
    // Get all symbols defined in this compilation
    fn get_all_symbols(&self) -> Vec<Symbol>;
    
    // Resolve a symbol reference
    fn resolve_symbol(&self, reference: SymbolReference) -> Option<Symbol>;
}

struct SemanticModel {
    compilation: Arc<Compilation>,
    file: FileId,
}

impl SemanticModel {
    fn get_type_info(&self, expr: ExprId) -> TypeInfo;
    fn get_symbol_info(&self, name: NameId) -> SymbolInfo;
    fn get_declared_symbols(&self) -> Vec<Symbol>;
}
```

**Key Design Decisions**:

1. **Compilation as context**: All semantic queries happen in the context of a Compilation.

2. **Dependency resolution**: The Compilation knows about external dependencies (npm packages, pip packages) and can resolve imports to them.

3. **SemanticModel per file**: Each file gets a SemanticModel that provides semantic queries in the Compilation context.

4. **Immutable snapshots**: Compilations are immutable. Changes create new Compilations (with shared unchanged data via Salsa).

**Rationale**:
Roslyn's Compilation abstraction is the key to accurate semantic analysis. "An instance of Compilation is analogous to a single project as seen by the compiler and represents everything needed to compile a program."

**Evidence**:
- Roslyn (R2): "The compilation includes the set of source files, assembly references, and compiler options"
- Roslyn (R2): "You can reason about the meaning of the code using all the other information in this context"

**Implementation Notes**:
- Integrate with project discovery (package.json, pyproject.toml, Cargo.toml)
- Cache dependency analysis (node_modules rarely changes)
- Support multi-project workspaces (monorepos)

**Risks**:
- Dependency resolution is complex and language-specific
- Large dependency trees may impact memory usage
- External type information may be incomplete or incorrect

**Dependencies**:
- R4: Generalized semantic analysis uses Compilation context
- 25-services-layer: Project discovery feeds Compilation creation

