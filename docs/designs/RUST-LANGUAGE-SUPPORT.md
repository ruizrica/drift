# Rust Language Support Design

## Overview

Add comprehensive support for Rust, enabling full call graph analysis, data flow mapping, pattern detection, and framework-aware extraction across Rust codebases. This follows Drift's established hybrid extraction pattern: tree-sitter (primary) with regex fallback for enterprise-grade coverage.

## Motivation

Rust is rapidly becoming the language of choice for systems programming, WebAssembly, embedded systems, and performance-critical backend services. Enterprise customers building with Actix-web, Axum, Rocket, or using Rust for microservices need Drift support. Current gap prevents:

- Mapping HTTP handlers to database operations
- Tracing data flow through middleware chains and async contexts
- Detecting Rust-specific patterns (error handling with Result, ownership, lifetimes)
- Understanding trait implementations and generic constraints
- Analyzing SQLx, Diesel, and SeaORM database access patterns

## Goals

1. Parse Rust files with tree-sitter (primary) and regex fallback
2. Extract functions, methods, structs, traits, enums, and calls
3. Detect Rust framework patterns (Actix-web, Axum, Rocket, Warp)
4. Extract data access patterns (SQLx, Diesel, SeaORM, tokio-postgres)
5. Integrate with existing call graph and pattern detection (15 categories, 170+ patterns)
6. Support CLI and MCP interfaces
7. Test topology extraction for Rust testing frameworks

## Non-Goals

- Macro expansion beyond common patterns (proc-macro analysis is separate initiative)
- Unsafe code block deep analysis (basic detection only)
- Borrow checker simulation
- Compile-time const evaluation


---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Rust Support Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Rust Tree-Sitter│  │  Rust Regex     │  │ Rust Data Access│  │
│  │ Extractor       │──│  Fallback       │──│  Extractor      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│         │                    │                     │             │
│         ▼                    ▼                     ▼             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Rust Hybrid Extractor                           ││
│  │  (Combines AST + Regex with confidence tracking)             ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │           Existing Call Graph + Pattern System               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
packages/core/src/
├── parsers/tree-sitter/
│   ├── rust-loader.ts                    # Tree-sitter Rust grammar loader
│   └── tree-sitter-rust-parser.ts        # Rust-specific parser utilities
├── call-graph/extractors/
│   ├── rust-extractor.ts                 # Main Rust extractor (tree-sitter)
│   ├── rust-hybrid-extractor.ts          # Hybrid AST + regex extractor
│   ├── rust-data-access-extractor.ts     # SQLx/Diesel/SeaORM detection
│   └── regex/
│       └── rust-regex.ts                 # Regex fallback patterns
├── test-topology/extractors/
│   ├── rust-test-extractor.ts            # Rust testing framework extractor
│   └── regex/
│       └── rust-test-regex.ts            # Test regex fallback
├── unified-provider/
│   ├── normalization/
│   │   └── rust-normalizer.ts            # Rust-specific normalization
│   └── matching/
│       ├── sqlx-matcher.ts               # SQLx pattern matcher
│       ├── diesel-matcher.ts             # Diesel pattern matcher
│       └── seaorm-matcher.ts             # SeaORM pattern matcher
├── environment/extractors/
│   └── rust-env-extractor.ts             # Environment variable extraction
├── constants/extractors/
│   ├── rust-extractor.ts                 # Constants/enums extraction
│   └── regex/
│       └── rust-regex.ts                 # Constants regex fallback

packages/cli/src/commands/
├── rust.ts                               # drift rust <subcommand>

packages/mcp/src/tools/analysis/
├── rust.ts                               # drift_rust MCP tool

packages/detectors/src/
├── api/rust/
│   ├── actix-detector.ts                 # Actix-web framework patterns
│   ├── axum-detector.ts                  # Axum framework patterns
│   ├── rocket-detector.ts                # Rocket framework patterns
│   └── warp-detector.ts                  # Warp framework patterns
├── errors/rust/
│   └── error-handling-detector.ts        # Rust error handling patterns
└── auth/rust/
    └── middleware-detector.ts            # Auth middleware patterns
```


---

## Phase 1: Core Type Updates

### 1.1 CallGraphLanguage Type

Update `packages/core/src/call-graph/types.ts`:

```typescript
/**
 * Supported languages for call graph extraction
 */
export type CallGraphLanguage = 
  | 'python' 
  | 'typescript' 
  | 'javascript' 
  | 'java' 
  | 'csharp' 
  | 'php' 
  | 'go'
  | 'rust';  // NEW
```

### 1.2 UnifiedLanguage Type

Update `packages/core/src/unified-provider/types.ts`:

```typescript
/**
 * Supported languages for unified extraction
 */
export type UnifiedLanguage = 
  | 'typescript' 
  | 'javascript' 
  | 'python' 
  | 'java' 
  | 'csharp' 
  | 'php' 
  | 'go'
  | 'rust';  // NEW
```

---

## Phase 2: Tree-Sitter Parser Setup

### 2.1 Rust Grammar Loader

```typescript
// packages/core/src/parsers/tree-sitter/rust-loader.ts

/**
 * Tree-sitter Rust Loader
 *
 * Handles loading tree-sitter and tree-sitter-rust with graceful fallback.
 * Provides functions to check availability and access the parser/language.
 *
 * @requirements Rust Language Support
 */

import { createRequire } from 'node:module';
import type { TreeSitterParser, TreeSitterLanguage } from './types.js';

// Create require function for ESM compatibility
const require = createRequire(import.meta.url);

// ============================================
// Module State
// ============================================

/** Whether tree-sitter-rust is available */
let rustAvailable: boolean | null = null;

/** Cached tree-sitter module */
let cachedTreeSitter: (new () => TreeSitterParser) | null = null;

/** Cached Rust language */
let cachedRustLanguage: TreeSitterLanguage | null = null;

/** Loading error message if any */
let loadingError: string | null = null;

// ============================================
// Public API
// ============================================

/**
 * Check if tree-sitter-rust is available.
 *
 * This function attempts to load tree-sitter and tree-sitter-rust
 * on first call and caches the result.
 *
 * @returns true if tree-sitter-rust is available and working
 */
export function isRustTreeSitterAvailable(): boolean {
  if (rustAvailable !== null) {
    return rustAvailable;
  }

  try {
    loadRustTreeSitter();
    rustAvailable = true;
  } catch (error) {
    rustAvailable = false;
    loadingError = error instanceof Error ? error.message : 'Unknown error loading tree-sitter-rust';
    logDebug(`tree-sitter-rust not available: ${loadingError}`);
  }

  return rustAvailable;
}

/**
 * Get the Rust language for tree-sitter.
 *
 * @returns TreeSitter Rust language
 * @throws Error if tree-sitter-rust is not available
 */
export function getRustLanguage(): TreeSitterLanguage {
  if (!isRustTreeSitterAvailable()) {
    throw new Error(`tree-sitter-rust is not available: ${loadingError ?? 'unknown error'}`);
  }

  if (!cachedRustLanguage) {
    throw new Error('tree-sitter-rust language not loaded');
  }

  return cachedRustLanguage;
}

/**
 * Get the tree-sitter Parser constructor for Rust.
 *
 * @returns TreeSitter Parser constructor
 * @throws Error if tree-sitter is not available
 */
export function getRustParserConstructor(): new () => TreeSitterParser {
  if (!isRustTreeSitterAvailable()) {
    throw new Error(`tree-sitter-rust is not available: ${loadingError ?? 'unknown error'}`);
  }

  if (!cachedTreeSitter) {
    throw new Error('tree-sitter not loaded');
  }

  return cachedTreeSitter;
}

/**
 * Create a new Rust parser instance.
 *
 * @returns Configured TreeSitter parser for Rust
 * @throws Error if tree-sitter-rust is not available
 */
export function createRustParser(): TreeSitterParser {
  const Parser = getRustParserConstructor();
  const language = getRustLanguage();

  const parser = new Parser();
  parser.setLanguage(language);

  return parser;
}

/**
 * Reset cached state (for testing).
 */
export function resetRustTreeSitter(): void {
  rustAvailable = null;
  cachedTreeSitter = null;
  cachedRustLanguage = null;
  loadingError = null;
}

// ============================================
// Internal Functions
// ============================================

/**
 * Load tree-sitter and tree-sitter-rust modules.
 */
function loadRustTreeSitter(): void {
  // Load tree-sitter
  const TreeSitter = require('tree-sitter');
  cachedTreeSitter = TreeSitter;

  // Load tree-sitter-rust
  const RustLanguage = require('tree-sitter-rust');
  cachedRustLanguage = RustLanguage;
}

/**
 * Debug logging helper
 */
function logDebug(message: string): void {
  if (process.env.DEBUG?.includes('drift')) {
    console.debug(`[rust-loader] ${message}`);
  }
}
```

### 2.2 Dependencies

Add to `packages/core/package.json`:

```json
{
  "dependencies": {
    "tree-sitter-rust": "^0.21.0"
  }
}
```


---

## Phase 3: Rust-Specific Types

### 3.1 Rust Type Definitions

```typescript
// packages/core/src/call-graph/extractors/rust-types.ts

/**
 * Rust-specific type definitions for call graph extraction
 */

export interface RustFunction {
  name: string;
  qualifiedName: string;           // crate::module::Type::method or crate::module::function
  parameters: RustParameter[];
  returnType?: string;
  generics?: RustGeneric[];
  lifetimes?: string[];
  isAsync: boolean;
  isUnsafe: boolean;
  isConst: boolean;
  isExported: boolean;             // pub visibility
  visibility: RustVisibility;
  startLine: number;
  endLine: number;
  bodyStartLine: number;
  bodyEndLine: number;
}

export interface RustMethod extends RustFunction {
  selfType: RustSelfType;          // &self, &mut self, self, etc.
  implTarget: string;              // The type this method is implemented for
  traitImpl?: string;              // If implementing a trait
}

export type RustSelfType = 
  | 'self'           // self
  | '&self'          // &self
  | '&mut self'      // &mut self
  | 'Box<Self>'      // Box<Self>
  | 'Rc<Self>'       // Rc<Self>
  | 'Arc<Self>'      // Arc<Self>
  | 'Pin<&Self>'     // Pin<&Self>
  | 'Pin<&mut Self>' // Pin<&mut Self>
  | 'none';          // Associated function (no self)

export type RustVisibility = 
  | 'pub'            // Public
  | 'pub(crate)'     // Crate-visible
  | 'pub(super)'     // Parent module visible
  | 'pub(self)'      // Current module only
  | 'pub(in path)'   // Visible in specific path
  | 'private';       // Default private

export interface RustParameter {
  name: string;
  type: string;
  isMutable: boolean;              // mut param
  isReference: boolean;            // &param or &mut param
  lifetime?: string;               // 'a in &'a str
}

export interface RustGeneric {
  name: string;
  bounds: string[];                // T: Clone + Send
  default?: string;                // T = String
}

export interface RustStruct {
  name: string;
  isExported: boolean;
  visibility: RustVisibility;
  fields: RustField[];
  generics?: RustGeneric[];
  lifetimes?: string[];
  derives: string[];               // #[derive(Debug, Clone)]
  attributes: string[];            // Other attributes
  startLine: number;
  endLine: number;
}

export interface RustField {
  name: string;
  type: string;
  visibility: RustVisibility;
  attributes: string[];            // #[serde(rename = "...")]
}

export interface RustEnum {
  name: string;
  isExported: boolean;
  visibility: RustVisibility;
  variants: RustEnumVariant[];
  generics?: RustGeneric[];
  derives: string[];
  startLine: number;
  endLine: number;
}

export interface RustEnumVariant {
  name: string;
  kind: 'unit' | 'tuple' | 'struct';
  fields?: RustField[];            // For struct variants
  types?: string[];                // For tuple variants
  discriminant?: string;           // = 0, = 1, etc.
}

export interface RustTrait {
  name: string;
  isExported: boolean;
  visibility: RustVisibility;
  methods: RustTraitMethod[];
  supertraits: string[];           // trait Foo: Bar + Baz
  generics?: RustGeneric[];
  startLine: number;
  endLine: number;
}

export interface RustTraitMethod {
  name: string;
  parameters: RustParameter[];
  returnType?: string;
  hasDefaultImpl: boolean;
  isAsync: boolean;
}

export interface RustImpl {
  targetType: string;              // The type being implemented
  traitName?: string;              // If implementing a trait
  generics?: RustGeneric[];
  whereClause?: string;
  methods: string[];               // Method names
  startLine: number;
  endLine: number;
}

export interface RustUse {
  path: string;                    // std::collections::HashMap
  alias?: string;                  // as MyMap
  isGlob: boolean;                 // use std::*
  isSelf: boolean;                 // use module::{self, ...}
  items?: string[];                // use module::{A, B, C}
  visibility: RustVisibility;
  line: number;
}

export interface RustCall {
  calleeName: string;
  receiver?: string;               // For method calls
  modulePath?: string;             // For qualified calls
  fullExpression: string;
  line: number;
  column: number;
  argumentCount: number;
  isMethodCall: boolean;
  isAwait: boolean;                // .await
  isMacro: boolean;                // macro!()
  isTurbofish: boolean;            // ::<Type>
  isUnsafe: boolean;               // Inside unsafe block
}

export interface RustMacroCall {
  name: string;                    // println, vec, sqlx::query
  fullExpression: string;
  line: number;
  column: number;
  argumentCount: number;
}
```


---

## Phase 4: Tree-Sitter Extractor

### 4.1 Rust Tree-Sitter Extractor

```typescript
// packages/core/src/call-graph/extractors/rust-extractor.ts

/**
 * Rust Call Graph Extractor
 *
 * Extracts functions, calls, imports, and exports from Rust
 * using tree-sitter for AST parsing.
 *
 * Handles:
 * - Function definitions (fn, async fn, unsafe fn, const fn)
 * - Method definitions (impl blocks)
 * - Struct and enum definitions
 * - Trait definitions and implementations
 * - Use statements (imports)
 * - Function and method calls
 * - Macro invocations
 * - Async/await patterns
 * - Generic type parameters and lifetimes
 */

import { BaseCallGraphExtractor } from './base-extractor.js';
import type {
  CallGraphLanguage,
  FileExtractionResult,
  ParameterInfo,
} from '../types.js';
import {
  isRustTreeSitterAvailable,
  createRustParser,
} from '../../parsers/tree-sitter/rust-loader.js';
import type { TreeSitterParser, TreeSitterNode } from '../../parsers/tree-sitter/types.js';

/**
 * Rust call graph extractor using tree-sitter
 */
export class RustCallGraphExtractor extends BaseCallGraphExtractor {
  readonly language: CallGraphLanguage = 'rust';
  readonly extensions: string[] = ['.rs'];

  private parser: TreeSitterParser | null = null;

  /**
   * Check if tree-sitter is available
   */
  static isAvailable(): boolean {
    return isRustTreeSitterAvailable();
  }

  /**
   * Extract call graph information from Rust source
   */
  extract(source: string, filePath: string): FileExtractionResult {
    const result = this.createEmptyResult(filePath);

    if (!isRustTreeSitterAvailable()) {
      result.errors.push('Tree-sitter not available for Rust parsing');
      return result;
    }

    try {
      if (!this.parser) {
        this.parser = createRustParser();
      }

      const tree = this.parser.parse(source);

      // Extract module path from file path
      const modulePath = this.extractModulePath(filePath);

      this.visitNode(tree.rootNode, result, source, modulePath);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown parse error');
    }

    return result;
  }

  /**
   * Extract module path from file path
   */
  private extractModulePath(filePath: string): string {
    // Convert src/handlers/user.rs -> handlers::user
    const parts = filePath
      .replace(/\.rs$/, '')
      .split('/')
      .filter(p => p !== 'src' && p !== 'lib' && p !== 'mod');
    
    return parts.join('::') || 'crate';
  }

  /**
   * Visit a tree-sitter node and extract information
   */
  private visitNode(
    node: TreeSitterNode,
    result: FileExtractionResult,
    source: string,
    modulePath: string
  ): void {
    switch (node.type) {
      case 'function_item':
        this.extractFunctionItem(node, result, source, modulePath);
        break;

      case 'impl_item':
        this.extractImplItem(node, result, source, modulePath);
        break;

      case 'struct_item':
        this.extractStructItem(node, result, modulePath);
        break;

      case 'enum_item':
        this.extractEnumItem(node, result, modulePath);
        break;

      case 'trait_item':
        this.extractTraitItem(node, result, modulePath);
        break;

      case 'use_declaration':
        this.extractUseDeclaration(node, result);
        break;

      case 'call_expression':
        this.extractCallExpression(node, result, source);
        break;

      case 'macro_invocation':
        this.extractMacroInvocation(node, result, source);
        break;

      case 'await_expression':
        this.extractAwaitExpression(node, result, source);
        break;

      default:
        // Recurse into children
        for (const child of node.children) {
          this.visitNode(child, result, source, modulePath);
        }
    }
  }

  /**
   * Extract a function item
   */
  private extractFunctionItem(
    node: TreeSitterNode,
    result: FileExtractionResult,
    source: string,
    modulePath: string
  ): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;

    const name = nameNode.text;
    const isExported = this.hasVisibilityModifier(node, 'pub');
    const isAsync = this.hasModifier(node, 'async');
    const isUnsafe = this.hasModifier(node, 'unsafe');
    const isConst = this.hasModifier(node, 'const');
    
    const parametersNode = node.childForFieldName('parameters');
    const returnTypeNode = node.childForFieldName('return_type');
    const bodyNode = node.childForFieldName('body');

    const parameters = parametersNode ? this.extractParameters(parametersNode) : [];
    const returnType = returnTypeNode ? this.extractType(returnTypeNode) : undefined;

    result.functions.push(
      this.createFunction({
        name,
        qualifiedName: `${modulePath}::${name}`,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        startColumn: node.startPosition.column,
        endColumn: node.endPosition.column,
        parameters,
        returnType,
        isMethod: false,
        isStatic: true,
        isExported,
        isConstructor: name === 'new' || name === 'default',
        isAsync,
        decorators: this.extractAttributes(node),
        bodyStartLine: bodyNode ? bodyNode.startPosition.row + 1 : node.startPosition.row + 1,
        bodyEndLine: bodyNode ? bodyNode.endPosition.row + 1 : node.endPosition.row + 1,
      })
    );

    // Extract calls from body
    if (bodyNode) {
      this.extractCallsFromBody(bodyNode, result, source);
    }
  }

  /**
   * Extract an impl block
   */
  private extractImplItem(
    node: TreeSitterNode,
    result: FileExtractionResult,
    source: string,
    modulePath: string
  ): void {
    const typeNode = node.childForFieldName('type');
    const traitNode = node.childForFieldName('trait');
    const bodyNode = node.childForFieldName('body');

    if (!typeNode) return;

    const implType = typeNode.text;
    const traitName = traitNode?.text;
    const qualifiedBase = traitName 
      ? `${modulePath}::<${implType} as ${traitName}>`
      : `${modulePath}::${implType}`;

    // Extract methods from impl body
    if (bodyNode) {
      for (const child of bodyNode.children) {
        if (child.type === 'function_item') {
          this.extractMethodFromImpl(child, result, source, qualifiedBase, implType);
        }
      }
    }

    // Record the impl as a "class" for structural purposes
    result.classes.push(
      this.createClass({
        name: implType,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        baseClasses: traitName ? [traitName] : [],
        methods: this.extractMethodNames(bodyNode),
        isExported: this.hasVisibilityModifier(node, 'pub'),
      })
    );
  }

  /**
   * Extract a method from an impl block
   */
  private extractMethodFromImpl(
    node: TreeSitterNode,
    result: FileExtractionResult,
    source: string,
    qualifiedBase: string,
    className: string
  ): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;

    const name = nameNode.text;
    const isExported = this.hasVisibilityModifier(node, 'pub');
    const isAsync = this.hasModifier(node, 'async');
    
    const parametersNode = node.childForFieldName('parameters');
    const returnTypeNode = node.childForFieldName('return_type');
    const bodyNode = node.childForFieldName('body');

    const parameters = parametersNode ? this.extractParameters(parametersNode) : [];
    const returnType = returnTypeNode ? this.extractType(returnTypeNode) : undefined;

    // Check if this is a method (has self) or associated function
    const hasSelf = parameters.some(p => 
      p.name === 'self' || p.name === '&self' || p.name === '&mut self'
    );

    result.functions.push(
      this.createFunction({
        name,
        qualifiedName: `${qualifiedBase}::${name}`,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        startColumn: node.startPosition.column,
        endColumn: node.endPosition.column,
        parameters: parameters.filter(p => !p.name.includes('self')),
        returnType,
        isMethod: hasSelf,
        isStatic: !hasSelf,
        isExported,
        isConstructor: name === 'new' || name === 'default',
        isAsync,
        className,
        decorators: this.extractAttributes(node),
        bodyStartLine: bodyNode ? bodyNode.startPosition.row + 1 : node.startPosition.row + 1,
        bodyEndLine: bodyNode ? bodyNode.endPosition.row + 1 : node.endPosition.row + 1,
      })
    );

    if (bodyNode) {
      this.extractCallsFromBody(bodyNode, result, source);
    }
  }

  /**
   * Extract a struct item
   */
  private extractStructItem(
    node: TreeSitterNode,
    result: FileExtractionResult,
    modulePath: string
  ): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;

    const name = nameNode.text;
    const isExported = this.hasVisibilityModifier(node, 'pub');

    result.classes.push(
      this.createClass({
        name,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        baseClasses: [],
        methods: [],
        isExported,
      })
    );
  }

  /**
   * Extract an enum item
   */
  private extractEnumItem(
    node: TreeSitterNode,
    result: FileExtractionResult,
    modulePath: string
  ): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;

    const name = nameNode.text;
    const isExported = this.hasVisibilityModifier(node, 'pub');

    // Extract variant names as "methods" for pattern matching
    const variants = this.extractEnumVariants(node);

    result.classes.push(
      this.createClass({
        name,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        baseClasses: [],
        methods: variants,
        isExported,
      })
    );
  }

  /**
   * Extract a trait item
   */
  private extractTraitItem(
    node: TreeSitterNode,
    result: FileExtractionResult,
    modulePath: string
  ): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;

    const name = nameNode.text;
    const isExported = this.hasVisibilityModifier(node, 'pub');

    // Extract supertrait bounds
    const boundsNode = node.childForFieldName('bounds');
    const supertraits = boundsNode ? this.extractTraitBounds(boundsNode) : [];

    // Extract method signatures
    const bodyNode = node.childForFieldName('body');
    const methods = bodyNode ? this.extractTraitMethods(bodyNode) : [];

    result.classes.push(
      this.createClass({
        name,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        baseClasses: supertraits,
        methods,
        isExported,
      })
    );
  }

  /**
   * Extract use declaration (import)
   */
  private extractUseDeclaration(
    node: TreeSitterNode,
    result: FileExtractionResult
  ): void {
    const pathNode = node.childForFieldName('argument');
    if (!pathNode) return;

    const path = pathNode.text;
    const isExported = this.hasVisibilityModifier(node, 'pub');

    // Parse the use path
    const { source, names } = this.parseUsePath(path);

    result.imports.push(
      this.createImport({
        source,
        names,
        line: node.startPosition.row + 1,
        isTypeOnly: false,
      })
    );

    // If pub use, also record as export
    if (isExported) {
      for (const name of names) {
        result.exports.push(
          this.createExport({
            name: name.local,
            isDefault: false,
            isReExport: true,
            source,
            line: node.startPosition.row + 1,
          })
        );
      }
    }
  }

  /**
   * Extract call expression
   */
  private extractCallExpression(
    node: TreeSitterNode,
    result: FileExtractionResult,
    source: string
  ): void {
    const funcNode = node.childForFieldName('function');
    const argsNode = node.childForFieldName('arguments');

    if (!funcNode) return;

    let calleeName: string;
    let receiver: string | undefined;
    let isMethodCall = false;

    if (funcNode.type === 'field_expression') {
      // Method call: obj.method()
      const valueNode = funcNode.childForFieldName('value');
      const fieldNode = funcNode.childForFieldName('field');

      if (valueNode && fieldNode) {
        receiver = valueNode.text;
        calleeName = fieldNode.text;
        isMethodCall = true;
      } else {
        calleeName = funcNode.text;
      }
    } else if (funcNode.type === 'scoped_identifier') {
      // Qualified call: Type::method() or module::function()
      calleeName = funcNode.text;
      // Extract the last segment as the function name
      const parts = calleeName.split('::');
      if (parts.length > 1) {
        receiver = parts.slice(0, -1).join('::');
        calleeName = parts[parts.length - 1]!;
      }
    } else if (funcNode.type === 'identifier') {
      calleeName = funcNode.text;
    } else if (funcNode.type === 'generic_function') {
      // Turbofish: func::<Type>()
      const funcNameNode = funcNode.childForFieldName('function');
      calleeName = funcNameNode?.text ?? funcNode.text;
    } else {
      calleeName = funcNode.text;
    }

    let argumentCount = 0;
    if (argsNode) {
      for (const child of argsNode.children) {
        if (child.type !== '(' && child.type !== ')' && child.type !== ',') {
          argumentCount++;
        }
      }
    }

    result.calls.push(
      this.createCall({
        calleeName,
        receiver,
        fullExpression: node.text,
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
        argumentCount,
        isMethodCall,
        isConstructorCall: calleeName === 'new' || calleeName === 'default',
      })
    );
  }

  /**
   * Extract macro invocation
   */
  private extractMacroInvocation(
    node: TreeSitterNode,
    result: FileExtractionResult,
    source: string
  ): void {
    const macroNode = node.childForFieldName('macro');
    if (!macroNode) return;

    const macroName = macroNode.text;

    // Count arguments (simplified)
    const argsNode = node.children.find(c => 
      c.type === 'token_tree' || c.type === 'token_tree_pattern'
    );
    const argumentCount = argsNode ? 1 : 0; // Simplified

    result.calls.push(
      this.createCall({
        calleeName: `${macroName}!`,
        fullExpression: node.text,
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
        argumentCount,
        isMethodCall: false,
        isConstructorCall: macroName === 'vec' || macroName === 'hashmap',
      })
    );
  }

  /**
   * Extract await expression
   */
  private extractAwaitExpression(
    node: TreeSitterNode,
    result: FileExtractionResult,
    source: string
  ): void {
    // The awaited expression is a child
    for (const child of node.children) {
      if (child.type === 'call_expression') {
        this.extractCallExpression(child, result, source);
      } else if (child.type === 'field_expression') {
        // Method chain ending in .await
        this.visitNode(child, result, source, '');
      }
    }
  }

  /**
   * Extract calls from a function body
   */
  private extractCallsFromBody(
    node: TreeSitterNode,
    result: FileExtractionResult,
    source: string
  ): void {
    const visit = (n: TreeSitterNode): void => {
      if (n.type === 'call_expression') {
        this.extractCallExpression(n, result, source);
      } else if (n.type === 'macro_invocation') {
        this.extractMacroInvocation(n, result, source);
      } else if (n.type === 'await_expression') {
        this.extractAwaitExpression(n, result, source);
      }

      for (const child of n.children) {
        visit(child);
      }
    };

    for (const child of node.children) {
      visit(child);
    }
  }

  // ... Helper methods continue below


  /**
   * Extract parameters from parameter list
   */
  private extractParameters(node: TreeSitterNode): ParameterInfo[] {
    const params: ParameterInfo[] = [];

    for (const child of node.children) {
      if (child.type === 'parameter') {
        const patternNode = child.childForFieldName('pattern');
        const typeNode = child.childForFieldName('type');

        const name = patternNode?.text ?? '_';
        const type = typeNode?.text;
        const isMutable = patternNode?.text.startsWith('mut ') ?? false;

        params.push({
          name: name.replace(/^mut\s+/, ''),
          type,
          hasDefault: false,
          isRest: false,
        });
      } else if (child.type === 'self_parameter') {
        // &self, &mut self, self
        params.push({
          name: child.text,
          type: 'Self',
          hasDefault: false,
          isRest: false,
        });
      }
    }

    return params;
  }

  /**
   * Extract type from type node
   */
  private extractType(node: TreeSitterNode): string {
    // Skip the -> token if present
    if (node.type === 'return_type') {
      const typeChild = node.children.find(c => c.type !== '->');
      return typeChild?.text ?? node.text;
    }
    return node.text;
  }

  /**
   * Check if node has a visibility modifier
   */
  private hasVisibilityModifier(node: TreeSitterNode, modifier: string): boolean {
    for (const child of node.children) {
      if (child.type === 'visibility_modifier') {
        return child.text.startsWith(modifier);
      }
    }
    return false;
  }

  /**
   * Check if node has a specific modifier
   */
  private hasModifier(node: TreeSitterNode, modifier: string): boolean {
    for (const child of node.children) {
      if (child.type === modifier || child.text === modifier) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract attributes (#[...])
   */
  private extractAttributes(node: TreeSitterNode): string[] {
    const attrs: string[] = [];
    for (const child of node.children) {
      if (child.type === 'attribute_item' || child.type === 'inner_attribute_item') {
        attrs.push(child.text);
      }
    }
    return attrs;
  }

  /**
   * Extract method names from impl body
   */
  private extractMethodNames(bodyNode: TreeSitterNode | null): string[] {
    if (!bodyNode) return [];

    const methods: string[] = [];
    for (const child of bodyNode.children) {
      if (child.type === 'function_item') {
        const nameNode = child.childForFieldName('name');
        if (nameNode) {
          methods.push(nameNode.text);
        }
      }
    }
    return methods;
  }

  /**
   * Extract enum variant names
   */
  private extractEnumVariants(node: TreeSitterNode): string[] {
    const variants: string[] = [];
    const bodyNode = node.childForFieldName('body');
    
    if (bodyNode) {
      for (const child of bodyNode.children) {
        if (child.type === 'enum_variant') {
          const nameNode = child.childForFieldName('name');
          if (nameNode) {
            variants.push(nameNode.text);
          }
        }
      }
    }
    return variants;
  }

  /**
   * Extract trait bounds
   */
  private extractTraitBounds(boundsNode: TreeSitterNode): string[] {
    const bounds: string[] = [];
    for (const child of boundsNode.children) {
      if (child.type === 'type_identifier' || child.type === 'scoped_type_identifier') {
        bounds.push(child.text);
      }
    }
    return bounds;
  }

  /**
   * Extract trait method signatures
   */
  private extractTraitMethods(bodyNode: TreeSitterNode): string[] {
    const methods: string[] = [];
    for (const child of bodyNode.children) {
      if (child.type === 'function_signature_item' || child.type === 'function_item') {
        const nameNode = child.childForFieldName('name');
        if (nameNode) {
          methods.push(nameNode.text);
        }
      }
    }
    return methods;
  }

  /**
   * Parse use path into source and names
   */
  private parseUsePath(path: string): {
    source: string;
    names: Array<{ imported: string; local: string; isDefault: boolean; isNamespace: boolean }>;
  } {
    // Handle glob imports: use std::collections::*
    if (path.endsWith('::*')) {
      const source = path.slice(0, -3);
      return {
        source,
        names: [{ imported: '*', local: '*', isDefault: false, isNamespace: true }],
      };
    }

    // Handle grouped imports: use std::{HashMap, HashSet}
    const groupMatch = path.match(/^(.+)::\{(.+)\}$/);
    if (groupMatch) {
      const source = groupMatch[1]!;
      const items = groupMatch[2]!.split(',').map(s => s.trim());
      const names = items.map(item => {
        const aliasMatch = item.match(/^(.+)\s+as\s+(.+)$/);
        if (aliasMatch) {
          return {
            imported: aliasMatch[1]!.trim(),
            local: aliasMatch[2]!.trim(),
            isDefault: false,
            isNamespace: false,
          };
        }
        return {
          imported: item,
          local: item,
          isDefault: false,
          isNamespace: item === 'self',
        };
      });
      return { source, names };
    }

    // Handle aliased imports: use std::collections::HashMap as Map
    const aliasMatch = path.match(/^(.+)\s+as\s+(.+)$/);
    if (aliasMatch) {
      const fullPath = aliasMatch[1]!.trim();
      const alias = aliasMatch[2]!.trim();
      const parts = fullPath.split('::');
      const imported = parts.pop()!;
      const source = parts.join('::');
      return {
        source: source || fullPath,
        names: [{ imported, local: alias, isDefault: false, isNamespace: false }],
      };
    }

    // Simple import: use std::collections::HashMap
    const parts = path.split('::');
    const imported = parts.pop()!;
    const source = parts.join('::');
    return {
      source: source || path,
      names: [{ imported, local: imported, isDefault: false, isNamespace: false }],
    };
  }
}

/**
 * Create a Rust extractor instance
 */
export function createRustExtractor(): RustCallGraphExtractor {
  return new RustCallGraphExtractor();
}
```


---

## Phase 5: Regex Fallback

### 5.1 Rust Regex Patterns

```typescript
// packages/core/src/call-graph/extractors/regex/rust-regex.ts

/**
 * Rust Regex Extractor
 *
 * Regex-based fallback extractor for Rust when tree-sitter is unavailable.
 * Provides reasonable extraction coverage using pattern matching.
 */

import { BaseRegexExtractor } from './base-regex-extractor.js';
import type {
  CallGraphLanguage,
  FunctionExtraction,
  CallExtraction,
  ImportExtraction,
  ExportExtraction,
  ClassExtraction,
} from '../../types.js';
import type { LanguagePatterns } from '../types.js';

const RUST_PATTERNS: LanguagePatterns = {
  language: 'rust',
  functions: [],
  classes: [],
  imports: [],
  exports: [],
  calls: [],
};

/**
 * Rust regex-based extractor
 */
export class RustRegexExtractor extends BaseRegexExtractor {
  readonly language: CallGraphLanguage = 'rust';
  readonly extensions: string[] = ['.rs'];
  protected readonly patterns = RUST_PATTERNS;

  // ==========================================================================
  // Source Preprocessing
  // ==========================================================================

  /**
   * Preprocess Rust source to remove comments and strings
   */
  protected override preprocessSource(source: string): string {
    // Remove multi-line comments /* ... */
    let clean = source.replace(/\/\*[\s\S]*?\*\//g, (match) => ' '.repeat(match.length));

    // Remove single-line comments // ...
    clean = clean.replace(/\/\/.*$/gm, (match) => ' '.repeat(match.length));

    // Remove doc comments /// and //!
    clean = clean.replace(/\/\/[\/!].*$/gm, (match) => ' '.repeat(match.length));

    // Remove strings (but preserve line structure)
    clean = clean.replace(/"(?:[^"\\]|\\.)*"/g, (match) => '"' + ' '.repeat(match.length - 2) + '"');

    // Remove raw strings r#"..."#
    clean = clean.replace(/r#*"[\s\S]*?"#*/g, (match) => 'r"' + ' '.repeat(match.length - 3) + '"');

    // Remove char literals
    clean = clean.replace(/'(?:[^'\\]|\\.)'/g, (match) => "'" + ' '.repeat(match.length - 2) + "'");

    return clean;
  }

  // ==========================================================================
  // Function Extraction
  // ==========================================================================

  protected extractFunctions(
    cleanSource: string,
    originalSource: string,
    _filePath: string
  ): FunctionExtraction[] {
    const functions: FunctionExtraction[] = [];
    const seen = new Set<string>();

    // Pattern 1: Regular function declarations
    // pub async fn function_name<T>(params) -> ReturnType {
    const funcPattern = /^(\s*)(pub(?:\s*\([^)]*\))?\s+)?(async\s+)?(unsafe\s+)?(const\s+)?fn\s+([a-zA-Z_]\w*)\s*(?:<[^>]*>)?\s*\(([^)]*)\)\s*(?:->\s*([^{]+?))?\s*(?:where[^{]*)?\s*\{/gm;
    let match;

    while ((match = funcPattern.exec(cleanSource)) !== null) {
      const isExported = !!match[2]?.includes('pub');
      const isAsync = !!match[3];
      const isUnsafe = !!match[4];
      const isConst = !!match[5];
      const name = match[6]!;
      const paramsStr = match[7] ?? '';
      const returnType = match[8]?.trim();
      const startLine = this.getLineNumber(originalSource, match.index);
      const key = `${name}:${startLine}`;

      if (seen.has(key)) continue;
      seen.add(key);

      const endIndex = this.findBlockEnd(cleanSource, match.index);
      const endLine = this.getLineNumber(originalSource, endIndex);

      functions.push(
        this.createFunction({
          name,
          qualifiedName: name,
          startLine,
          endLine,
          parameters: this.parseRustParameters(paramsStr),
          returnType,
          isMethod: false,
          isStatic: true,
          isExported,
          isConstructor: name === 'new' || name === 'default',
          isAsync,
          decorators: [],
        })
      );
    }

    // Pattern 2: Methods in impl blocks
    // impl Type { pub fn method(&self, params) -> ReturnType { } }
    const implPattern = /impl(?:\s*<[^>]*>)?\s+(?:([A-Za-z_]\w*(?:<[^>]*>)?)\s+for\s+)?([A-Za-z_]\w*(?:<[^>]*>)?)\s*(?:where[^{]*)?\s*\{/g;

    while ((match = implPattern.exec(cleanSource)) !== null) {
      const traitName = match[1];
      const typeName = match[2]!;
      const implStart = match.index;
      const implEnd = this.findBlockEnd(cleanSource, implStart);
      const implBody = cleanSource.slice(implStart, implEnd);

      // Extract methods from impl body
      const methodPattern = /(\s*)(pub(?:\s*\([^)]*\))?\s+)?(async\s+)?(unsafe\s+)?(const\s+)?fn\s+([a-zA-Z_]\w*)\s*(?:<[^>]*>)?\s*\(([^)]*)\)\s*(?:->\s*([^{]+?))?\s*(?:where[^{]*)?\s*\{/g;
      let methodMatch;

      while ((methodMatch = methodPattern.exec(implBody)) !== null) {
        const isExported = !!methodMatch[2]?.includes('pub');
        const isAsync = !!methodMatch[3];
        const methodName = methodMatch[6]!;
        const paramsStr = methodMatch[7] ?? '';
        const returnType = methodMatch[8]?.trim();
        const methodStartLine = this.getLineNumber(originalSource, implStart + methodMatch.index);
        const key = `${typeName}.${methodName}:${methodStartLine}`;

        if (seen.has(key)) continue;
        seen.add(key);

        const methodEndIndex = this.findBlockEnd(implBody, methodMatch.index);
        const methodEndLine = this.getLineNumber(originalSource, implStart + methodEndIndex);

        const hasSelf = paramsStr.includes('self');

        functions.push(
          this.createFunction({
            name: methodName,
            qualifiedName: `${typeName}::${methodName}`,
            startLine: methodStartLine,
            endLine: methodEndLine,
            parameters: this.parseRustParameters(paramsStr).filter(p => !p.name.includes('self')),
            returnType,
            isMethod: hasSelf,
            isStatic: !hasSelf,
            isExported,
            isConstructor: methodName === 'new' || methodName === 'default',
            isAsync,
            className: typeName,
            decorators: [],
          })
        );
      }
    }

    return functions;
  }

  /**
   * Parse Rust parameter string
   */
  private parseRustParameters(paramsStr: string): FunctionExtraction['parameters'] {
    if (!paramsStr.trim()) return [];

    const params: FunctionExtraction['parameters'] = [];
    const parts = this.splitRustParams(paramsStr);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Skip self parameters
      if (trimmed === 'self' || trimmed === '&self' || trimmed === '&mut self' ||
          trimmed.startsWith('self:') || trimmed.startsWith('mut self')) {
        continue;
      }

      // Pattern: name: Type or mut name: Type
      const paramMatch = trimmed.match(/^(mut\s+)?([a-zA-Z_]\w*)\s*:\s*(.+)$/);
      if (paramMatch) {
        const isMutable = !!paramMatch[1];
        const name = paramMatch[2]!;
        const type = paramMatch[3]!.trim();

        params.push({ name, type, hasDefault: false, isRest: false });
      }
    }

    return params;
  }

  /**
   * Split Rust parameters respecting nested brackets
   */
  private splitRustParams(paramsStr: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of paramsStr) {
      if (char === '<' || char === '(' || char === '[' || char === '{') depth++;
      else if (char === '>' || char === ')' || char === ']' || char === '}') depth--;
      else if (char === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim()) parts.push(current.trim());

    return parts;
  }

  // ==========================================================================
  // Class (Struct/Enum/Trait) Extraction
  // ==========================================================================

  protected extractClasses(
    cleanSource: string,
    originalSource: string,
    _filePath: string
  ): ClassExtraction[] {
    const classes: ClassExtraction[] = [];

    // Pattern 1: Struct declarations
    const structPattern = /(pub(?:\s*\([^)]*\))?\s+)?struct\s+([A-Za-z_]\w*)(?:<[^>]*>)?\s*(?:\([^)]*\)|(?:where[^{]*)?\s*\{)/g;
    let match;

    while ((match = structPattern.exec(cleanSource)) !== null) {
      const isExported = !!match[1]?.includes('pub');
      const name = match[2]!;
      const startLine = this.getLineNumber(originalSource, match.index);
      const endIndex = this.findBlockEnd(cleanSource, match.index);
      const endLine = this.getLineNumber(originalSource, endIndex);

      classes.push(
        this.createClass({
          name,
          startLine,
          endLine,
          baseClasses: [],
          methods: [],
          isExported,
        })
      );
    }

    // Pattern 2: Enum declarations
    const enumPattern = /(pub(?:\s*\([^)]*\))?\s+)?enum\s+([A-Za-z_]\w*)(?:<[^>]*>)?\s*(?:where[^{]*)?\s*\{/g;

    while ((match = enumPattern.exec(cleanSource)) !== null) {
      const isExported = !!match[1]?.includes('pub');
      const name = match[2]!;
      const startLine = this.getLineNumber(originalSource, match.index);
      const endIndex = this.findBlockEnd(cleanSource, match.index);
      const endLine = this.getLineNumber(originalSource, endIndex);

      // Extract variant names
      const enumBody = cleanSource.slice(match.index, endIndex);
      const variants = this.extractEnumVariants(enumBody);

      classes.push(
        this.createClass({
          name,
          startLine,
          endLine,
          baseClasses: [],
          methods: variants,
          isExported,
        })
      );
    }

    // Pattern 3: Trait declarations
    const traitPattern = /(pub(?:\s*\([^)]*\))?\s+)?(unsafe\s+)?trait\s+([A-Za-z_]\w*)(?:<[^>]*>)?(?:\s*:\s*([^{]+))?\s*(?:where[^{]*)?\s*\{/g;

    while ((match = traitPattern.exec(cleanSource)) !== null) {
      const isExported = !!match[1]?.includes('pub');
      const name = match[3]!;
      const supertraits = match[4]?.split('+').map(s => s.trim()).filter(Boolean) ?? [];
      const startLine = this.getLineNumber(originalSource, match.index);
      const endIndex = this.findBlockEnd(cleanSource, match.index);
      const endLine = this.getLineNumber(originalSource, endIndex);

      classes.push(
        this.createClass({
          name,
          startLine,
          endLine,
          baseClasses: supertraits,
          methods: [],
          isExported,
        })
      );
    }

    return classes;
  }

  /**
   * Extract enum variant names
   */
  private extractEnumVariants(enumBody: string): string[] {
    const variants: string[] = [];
    const variantPattern = /^\s*([A-Za-z_]\w*)\s*(?:\([^)]*\)|(?:\{[^}]*\}))?\s*,?/gm;
    let match;

    // Skip the first line (enum declaration)
    const lines = enumBody.split('\n').slice(1);
    const body = lines.join('\n');

    while ((match = variantPattern.exec(body)) !== null) {
      const name = match[1]!;
      if (name && !['pub', 'fn', 'type', 'const'].includes(name)) {
        variants.push(name);
      }
    }

    return variants;
  }

  // ==========================================================================
  // Import Extraction
  // ==========================================================================

  protected extractImports(
    cleanSource: string,
    originalSource: string,
    _filePath: string
  ): ImportExtraction[] {
    const imports: ImportExtraction[] = [];

    // Pattern: use path::to::item;
    // Pattern: use path::to::{item1, item2};
    // Pattern: use path::to::* ;
    // Pattern: use path::to::item as alias;
    const usePattern = /(pub(?:\s*\([^)]*\))?\s+)?use\s+([^;]+);/g;
    let match;

    while ((match = usePattern.exec(cleanSource)) !== null) {
      const isExported = !!match[1]?.includes('pub');
      const usePath = match[2]!.trim();
      const line = this.getLineNumber(originalSource, match.index);

      const { source, names } = this.parseUsePath(usePath);

      imports.push(
        this.createImport({
          source,
          names,
          line,
          isTypeOnly: false,
        })
      );
    }

    return imports;
  }

  /**
   * Parse use path into source and names
   */
  private parseUsePath(path: string): {
    source: string;
    names: Array<{ imported: string; local: string; isDefault: boolean; isNamespace: boolean }>;
  } {
    // Handle glob imports: use std::collections::*
    if (path.endsWith('::*')) {
      const source = path.slice(0, -3);
      return {
        source,
        names: [{ imported: '*', local: '*', isDefault: false, isNamespace: true }],
      };
    }

    // Handle grouped imports: use std::{HashMap, HashSet}
    const groupMatch = path.match(/^(.+)::\{(.+)\}$/);
    if (groupMatch) {
      const source = groupMatch[1]!;
      const items = groupMatch[2]!.split(',').map(s => s.trim());
      const names = items.map(item => {
        const aliasMatch = item.match(/^(.+)\s+as\s+(.+)$/);
        if (aliasMatch) {
          return {
            imported: aliasMatch[1]!.trim(),
            local: aliasMatch[2]!.trim(),
            isDefault: false,
            isNamespace: false,
          };
        }
        return {
          imported: item,
          local: item,
          isDefault: false,
          isNamespace: item === 'self',
        };
      });
      return { source, names };
    }

    // Handle aliased imports: use std::collections::HashMap as Map
    const aliasMatch = path.match(/^(.+)\s+as\s+(.+)$/);
    if (aliasMatch) {
      const fullPath = aliasMatch[1]!.trim();
      const alias = aliasMatch[2]!.trim();
      const parts = fullPath.split('::');
      const imported = parts.pop()!;
      const source = parts.join('::');
      return {
        source: source || fullPath,
        names: [{ imported, local: alias, isDefault: false, isNamespace: false }],
      };
    }

    // Simple import: use std::collections::HashMap
    const parts = path.split('::');
    const imported = parts.pop()!;
    const source = parts.join('::');
    return {
      source: source || path,
      names: [{ imported, local: imported, isDefault: false, isNamespace: false }],
    };
  }

  // ==========================================================================
  // Export Extraction
  // ==========================================================================

  protected extractExports(
    cleanSource: string,
    originalSource: string,
    _filePath: string
  ): ExportExtraction[] {
    const exports: ExportExtraction[] = [];

    // pub use re-exports
    const pubUsePattern = /pub(?:\s*\([^)]*\))?\s+use\s+([^;]+);/g;
    let match;

    while ((match = pubUsePattern.exec(cleanSource)) !== null) {
      const usePath = match[1]!.trim();
      const line = this.getLineNumber(originalSource, match.index);
      const { source, names } = this.parseUsePath(usePath);

      for (const name of names) {
        exports.push(
          this.createExport({
            name: name.local,
            isDefault: false,
            isReExport: true,
            source,
            line,
          })
        );
      }
    }

    return exports;
  }

  // ==========================================================================
  // Call Extraction
  // ==========================================================================

  protected extractCalls(
    cleanSource: string,
    originalSource: string,
    _filePath: string
  ): CallExtraction[] {
    const calls: CallExtraction[] = [];
    const seen = new Set<string>();

    // Rust keywords to skip
    const keywords = new Set([
      'if', 'else', 'match', 'while', 'for', 'loop', 'return', 'break', 'continue',
      'fn', 'let', 'mut', 'const', 'static', 'type', 'struct', 'enum', 'trait',
      'impl', 'pub', 'use', 'mod', 'crate', 'self', 'super', 'where', 'as',
      'async', 'await', 'move', 'ref', 'dyn', 'unsafe', 'extern',
      'true', 'false', 'Some', 'None', 'Ok', 'Err',
    ]);

    // Pattern 1: Method calls - obj.method()
    const methodCallPattern = /(\w+(?:\.[a-zA-Z_]\w*)*)\s*\.\s*([a-zA-Z_]\w*)\s*(?:::<[^>]*>)?\s*\(/g;
    let match;

    while ((match = methodCallPattern.exec(cleanSource)) !== null) {
      const receiver = match[1]!;
      const calleeName = match[2]!;
      const line = this.getLineNumber(originalSource, match.index);
      const key = `${receiver}.${calleeName}:${line}`;

      if (seen.has(key)) continue;
      if (keywords.has(calleeName)) continue;
      seen.add(key);

      calls.push(
        this.createCall({
          calleeName,
          receiver,
          fullExpression: `${receiver}.${calleeName}`,
          line,
          isMethodCall: true,
        })
      );
    }

    // Pattern 2: Qualified calls - Type::method() or module::function()
    const qualifiedCallPattern = /([A-Za-z_]\w*(?:::[A-Za-z_]\w*)*)\s*(?:::<[^>]*>)?\s*\(/g;

    while ((match = qualifiedCallPattern.exec(cleanSource)) !== null) {
      const fullPath = match[1]!;
      const line = this.getLineNumber(originalSource, match.index);
      const key = `${fullPath}:${line}`;

      if (seen.has(key)) continue;

      const parts = fullPath.split('::');
      const calleeName = parts.pop()!;

      if (keywords.has(calleeName)) continue;
      seen.add(key);

      const receiver = parts.length > 0 ? parts.join('::') : undefined;

      calls.push(
        this.createCall({
          calleeName,
          receiver,
          fullExpression: fullPath,
          line,
          isMethodCall: false,
          isConstructorCall: calleeName === 'new' || calleeName === 'default',
        })
      );
    }

    // Pattern 3: Macro invocations - macro_name!()
    const macroPattern = /([a-zA-Z_]\w*(?:::[a-zA-Z_]\w*)*)!\s*[\(\[\{]/g;

    while ((match = macroPattern.exec(cleanSource)) !== null) {
      const macroName = match[1]!;
      const line = this.getLineNumber(originalSource, match.index);
      const key = `${macroName}!:${line}`;

      if (seen.has(key)) continue;
      seen.add(key);

      calls.push(
        this.createCall({
          calleeName: `${macroName}!`,
          fullExpression: `${macroName}!`,
          line,
          isMethodCall: false,
          isConstructorCall: macroName === 'vec' || macroName === 'hashmap',
        })
      );
    }

    return calls;
  }
}

/**
 * Create a Rust regex extractor instance
 */
export function createRustRegexExtractor(): RustRegexExtractor {
  return new RustRegexExtractor();
}
```


---

## Phase 6: Hybrid Extractor

### 6.1 Rust Hybrid Extractor

```typescript
// packages/core/src/call-graph/extractors/rust-hybrid-extractor.ts

/**
 * Rust Hybrid Extractor
 *
 * Combines tree-sitter (primary) with regex fallback for enterprise-grade
 * Rust code extraction. Provides confidence tracking and graceful degradation.
 */

import { HybridExtractorBase } from './hybrid-extractor-base.js';
import { RustRegexExtractor } from './regex/rust-regex.js';
import type { CallGraphLanguage, FileExtractionResult, ParameterInfo } from '../types.js';
import { isRustTreeSitterAvailable, createRustParser } from '../../parsers/tree-sitter/rust-loader.js';
import type { TreeSitterParser, TreeSitterNode } from '../../parsers/tree-sitter/types.js';
import type { HybridExtractorConfig } from './types.js';

/**
 * Rust hybrid extractor combining tree-sitter and regex
 */
export class RustHybridExtractor extends HybridExtractorBase {
  readonly language: CallGraphLanguage = 'rust';
  readonly extensions: string[] = ['.rs'];
  protected regexExtractor = new RustRegexExtractor();

  private parser: TreeSitterParser | null = null;

  constructor(config?: HybridExtractorConfig) {
    super(config);
  }

  /**
   * Check if tree-sitter is available for Rust
   */
  protected isTreeSitterAvailable(): boolean {
    return isRustTreeSitterAvailable();
  }

  /**
   * Extract using tree-sitter
   */
  protected extractWithTreeSitter(source: string, filePath: string): FileExtractionResult | null {
    if (!isRustTreeSitterAvailable()) {
      return null;
    }

    const result: FileExtractionResult = {
      file: filePath,
      language: this.language,
      functions: [],
      calls: [],
      imports: [],
      exports: [],
      classes: [],
      errors: [],
    };

    try {
      if (!this.parser) {
        this.parser = createRustParser();
      }

      const tree = this.parser.parse(source);
      const modulePath = this.extractModulePath(filePath);

      this.visitNode(tree.rootNode, result, source, modulePath);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown parse error');
    }

    return result;
  }

  /**
   * Extract module path from file path
   */
  private extractModulePath(filePath: string): string {
    const parts = filePath
      .replace(/\.rs$/, '')
      .split('/')
      .filter(p => p !== 'src' && p !== 'lib' && p !== 'mod');
    
    return parts.join('::') || 'crate';
  }

  /**
   * Visit a tree-sitter node and extract information
   */
  private visitNode(
    node: TreeSitterNode,
    result: FileExtractionResult,
    source: string,
    modulePath: string
  ): void {
    switch (node.type) {
      case 'function_item':
        this.extractFunctionItem(node, result, source, modulePath);
        break;

      case 'impl_item':
        this.extractImplItem(node, result, source, modulePath);
        break;

      case 'struct_item':
        this.extractStructItem(node, result, modulePath);
        break;

      case 'enum_item':
        this.extractEnumItem(node, result, modulePath);
        break;

      case 'trait_item':
        this.extractTraitItem(node, result, modulePath);
        break;

      case 'use_declaration':
        this.extractUseDeclaration(node, result);
        break;

      case 'call_expression':
        this.extractCallExpression(node, result);
        break;

      case 'macro_invocation':
        this.extractMacroInvocation(node, result);
        break;

      default:
        for (const child of node.children) {
          this.visitNode(child, result, source, modulePath);
        }
    }
  }

  // ... Implementation mirrors RustCallGraphExtractor
  // (Full implementation would include all the extraction methods)
}

/**
 * Create a Rust hybrid extractor instance
 */
export function createRustHybridExtractor(config?: HybridExtractorConfig): RustHybridExtractor {
  return new RustHybridExtractor(config);
}
```


---

## Phase 7: Data Access Extraction

### 7.1 Rust Data Access Extractor

```typescript
// packages/core/src/call-graph/extractors/rust-data-access-extractor.ts

/**
 * Rust Data Access Extractor
 *
 * Extracts data access patterns from Rust code.
 * Supports:
 * - SQLx (query, query_as, query_scalar, execute)
 * - Diesel (table operations, query builder)
 * - SeaORM (Entity operations)
 * - tokio-postgres (query, execute)
 * - rusqlite (execute, query_row)
 * - MongoDB driver (find, insert, update, delete)
 * - Redis (get, set, hget, hset)
 */

import type { DataAccessPoint, DataOperation, ConfidenceBreakdown } from '../../boundaries/types.js';
import type { CallGraphLanguage } from '../types.js';

export interface RustDataAccessExtractionResult {
  file: string;
  language: CallGraphLanguage;
  accessPoints: DataAccessPoint[];
  errors: string[];
}

/**
 * ORM/Database pattern configuration for Rust
 */
interface RustORMPattern {
  name: string;
  methods: {
    read: string[];
    write: string[];
    delete: string[];
  };
  tableExtraction: 'typeParam' | 'firstArg' | 'macroArg' | 'chainedFrom';
  languages: CallGraphLanguage[];
}

const RUST_ORM_PATTERNS: RustORMPattern[] = [
  // SQLx
  {
    name: 'sqlx',
    methods: {
      read: ['query', 'query_as', 'query_scalar', 'fetch', 'fetch_one', 'fetch_optional', 'fetch_all'],
      write: ['execute', 'query'],
      delete: ['execute'],
    },
    tableExtraction: 'macroArg',
    languages: ['rust'],
  },
  // Diesel
  {
    name: 'diesel',
    methods: {
      read: ['load', 'first', 'get_result', 'get_results', 'select', 'filter', 'find'],
      write: ['insert_into', 'update', 'set', 'execute'],
      delete: ['delete'],
    },
    tableExtraction: 'chainedFrom',
    languages: ['rust'],
  },
  // SeaORM
  {
    name: 'seaorm',
    methods: {
      read: ['find', 'find_by_id', 'find_related', 'all', 'one', 'count'],
      write: ['insert', 'update', 'save', 'insert_many'],
      delete: ['delete', 'delete_many', 'delete_by_id'],
    },
    tableExtraction: 'typeParam',
    languages: ['rust'],
  },
  // tokio-postgres
  {
    name: 'tokio-postgres',
    methods: {
      read: ['query', 'query_one', 'query_opt'],
      write: ['execute', 'execute_raw'],
      delete: ['execute'],
    },
    tableExtraction: 'firstArg',
    languages: ['rust'],
  },
  // rusqlite
  {
    name: 'rusqlite',
    methods: {
      read: ['query_row', 'query_map', 'prepare'],
      write: ['execute', 'execute_batch'],
      delete: ['execute'],
    },
    tableExtraction: 'firstArg',
    languages: ['rust'],
  },
  // MongoDB
  {
    name: 'mongodb',
    methods: {
      read: ['find', 'find_one', 'aggregate', 'count_documents'],
      write: ['insert_one', 'insert_many', 'update_one', 'update_many', 'replace_one'],
      delete: ['delete_one', 'delete_many'],
    },
    tableExtraction: 'chainedFrom',
    languages: ['rust'],
  },
  // Redis
  {
    name: 'redis',
    methods: {
      read: ['get', 'mget', 'hget', 'hgetall', 'lrange', 'smembers', 'zrange'],
      write: ['set', 'mset', 'hset', 'lpush', 'rpush', 'sadd', 'zadd'],
      delete: ['del', 'hdel', 'lrem', 'srem', 'zrem'],
    },
    tableExtraction: 'firstArg',
    languages: ['rust'],
  },
];

export class RustDataAccessExtractor {
  readonly language: CallGraphLanguage = 'rust';
  readonly extensions: string[] = ['.rs'];

  /**
   * Extract data access points from Rust source
   */
  extract(source: string, filePath: string): RustDataAccessExtractionResult {
    const result: RustDataAccessExtractionResult = {
      file: filePath,
      language: this.language,
      accessPoints: [],
      errors: [],
    };

    try {
      // Extract SQLx patterns
      this.extractSqlxPatterns(source, filePath, result);

      // Extract Diesel patterns
      this.extractDieselPatterns(source, filePath, result);

      // Extract SeaORM patterns
      this.extractSeaORMPatterns(source, filePath, result);

      // Extract raw SQL patterns
      this.extractRawSqlPatterns(source, filePath, result);

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown extraction error');
    }

    return result;
  }

  /**
   * Extract SQLx patterns
   */
  private extractSqlxPatterns(
    source: string,
    filePath: string,
    result: RustDataAccessExtractionResult
  ): void {
    // sqlx::query!("SELECT * FROM users WHERE id = $1", id)
    const sqlxMacroPattern = /sqlx::query(?:_as|_scalar)?!\s*\(\s*"([^"]+)"/g;
    let match;

    while ((match = sqlxMacroPattern.exec(source)) !== null) {
      const sql = match[1]!;
      const line = this.getLineNumber(source, match.index);
      const { table, operation, fields } = this.parseSql(sql);

      result.accessPoints.push({
        id: `${filePath}:${line}:sqlx`,
        file: filePath,
        line,
        column: 0,
        table: table || 'unknown',
        operation,
        fields,
        framework: 'sqlx',
        confidence: this.createConfidence(0.9),
        rawExpression: match[0],
      });
    }

    // sqlx::query("SELECT ...").fetch_all(&pool)
    const sqlxQueryPattern = /sqlx::query(?:_as)?(?:::<[^>]+>)?\s*\(\s*"([^"]+)"\s*\)/g;

    while ((match = sqlxQueryPattern.exec(source)) !== null) {
      const sql = match[1]!;
      const line = this.getLineNumber(source, match.index);
      const { table, operation, fields } = this.parseSql(sql);

      result.accessPoints.push({
        id: `${filePath}:${line}:sqlx`,
        file: filePath,
        line,
        column: 0,
        table: table || 'unknown',
        operation,
        fields,
        framework: 'sqlx',
        confidence: this.createConfidence(0.85),
        rawExpression: match[0],
      });
    }
  }

  /**
   * Extract Diesel patterns
   */
  private extractDieselPatterns(
    source: string,
    filePath: string,
    result: RustDataAccessExtractionResult
  ): void {
    // users::table.filter(...).load(&conn)
    const dieselTablePattern = /(\w+)::table\s*\.\s*(filter|select|find|order|limit|offset|load|first|get_result)/g;
    let match;

    while ((match = dieselTablePattern.exec(source)) !== null) {
      const table = match[1]!;
      const method = match[2]!;
      const line = this.getLineNumber(source, match.index);

      const operation = this.getOperationFromMethod(method, 'diesel');

      result.accessPoints.push({
        id: `${filePath}:${line}:diesel`,
        file: filePath,
        line,
        column: 0,
        table,
        operation,
        fields: [],
        framework: 'diesel',
        confidence: this.createConfidence(0.9),
        rawExpression: match[0],
      });
    }

    // diesel::insert_into(users::table)
    const dieselInsertPattern = /diesel::insert_into\s*\(\s*(\w+)::table\s*\)/g;

    while ((match = dieselInsertPattern.exec(source)) !== null) {
      const table = match[1]!;
      const line = this.getLineNumber(source, match.index);

      result.accessPoints.push({
        id: `${filePath}:${line}:diesel`,
        file: filePath,
        line,
        column: 0,
        table,
        operation: 'write',
        fields: [],
        framework: 'diesel',
        confidence: this.createConfidence(0.9),
        rawExpression: match[0],
      });
    }

    // diesel::update(users::table)
    const dieselUpdatePattern = /diesel::update\s*\(\s*(\w+)(?:::table)?\s*\)/g;

    while ((match = dieselUpdatePattern.exec(source)) !== null) {
      const table = match[1]!;
      const line = this.getLineNumber(source, match.index);

      result.accessPoints.push({
        id: `${filePath}:${line}:diesel`,
        file: filePath,
        line,
        column: 0,
        table,
        operation: 'write',
        fields: [],
        framework: 'diesel',
        confidence: this.createConfidence(0.9),
        rawExpression: match[0],
      });
    }

    // diesel::delete(users::table)
    const dieselDeletePattern = /diesel::delete\s*\(\s*(\w+)(?:::table)?\s*\)/g;

    while ((match = dieselDeletePattern.exec(source)) !== null) {
      const table = match[1]!;
      const line = this.getLineNumber(source, match.index);

      result.accessPoints.push({
        id: `${filePath}:${line}:diesel`,
        file: filePath,
        line,
        column: 0,
        table,
        operation: 'delete',
        fields: [],
        framework: 'diesel',
        confidence: this.createConfidence(0.9),
        rawExpression: match[0],
      });
    }
  }

  /**
   * Extract SeaORM patterns
   */
  private extractSeaORMPatterns(
    source: string,
    filePath: string,
    result: RustDataAccessExtractionResult
  ): void {
    // User::find().all(&db)
    // User::find_by_id(id).one(&db)
    const seaormFindPattern = /([A-Z]\w*)::find(?:_by_id|_related)?\s*\(/g;
    let match;

    while ((match = seaormFindPattern.exec(source)) !== null) {
      const entity = match[1]!;
      const line = this.getLineNumber(source, match.index);

      result.accessPoints.push({
        id: `${filePath}:${line}:seaorm`,
        file: filePath,
        line,
        column: 0,
        table: this.entityToTable(entity),
        operation: 'read',
        fields: [],
        framework: 'seaorm',
        confidence: this.createConfidence(0.85),
        rawExpression: match[0],
      });
    }

    // User::insert(model).exec(&db)
    const seaormInsertPattern = /([A-Z]\w*)::insert(?:_many)?\s*\(/g;

    while ((match = seaormInsertPattern.exec(source)) !== null) {
      const entity = match[1]!;
      const line = this.getLineNumber(source, match.index);

      result.accessPoints.push({
        id: `${filePath}:${line}:seaorm`,
        file: filePath,
        line,
        column: 0,
        table: this.entityToTable(entity),
        operation: 'write',
        fields: [],
        framework: 'seaorm',
        confidence: this.createConfidence(0.85),
        rawExpression: match[0],
      });
    }

    // User::delete_by_id(id).exec(&db)
    const seaormDeletePattern = /([A-Z]\w*)::delete(?:_many|_by_id)?\s*\(/g;

    while ((match = seaormDeletePattern.exec(source)) !== null) {
      const entity = match[1]!;
      const line = this.getLineNumber(source, match.index);

      result.accessPoints.push({
        id: `${filePath}:${line}:seaorm`,
        file: filePath,
        line,
        column: 0,
        table: this.entityToTable(entity),
        operation: 'delete',
        fields: [],
        framework: 'seaorm',
        confidence: this.createConfidence(0.85),
        rawExpression: match[0],
      });
    }
  }

  /**
   * Extract raw SQL patterns
   */
  private extractRawSqlPatterns(
    source: string,
    filePath: string,
    result: RustDataAccessExtractionResult
  ): void {
    // Generic SQL string patterns
    const sqlStringPattern = /"(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\s+[^"]+"/gi;
    let match;

    while ((match = sqlStringPattern.exec(source)) !== null) {
      const sql = match[0].slice(1, -1); // Remove quotes
      const line = this.getLineNumber(source, match.index);
      const { table, operation, fields } = this.parseSql(sql);

      result.accessPoints.push({
        id: `${filePath}:${line}:raw-sql`,
        file: filePath,
        line,
        column: 0,
        table: table || 'unknown',
        operation,
        fields,
        framework: 'raw-sql',
        confidence: this.createConfidence(0.7),
        rawExpression: match[0],
      });
    }
  }

  /**
   * Parse SQL to extract table, operation, and fields
   */
  private parseSql(sql: string): { table: string | null; operation: DataOperation; fields: string[] } {
    const upperSql = sql.toUpperCase().trim();
    let operation: DataOperation = 'read';
    let table: string | null = null;
    const fields: string[] = [];

    if (upperSql.startsWith('SELECT')) {
      operation = 'read';
      const fromMatch = sql.match(/FROM\s+["'`]?(\w+)["'`]?/i);
      table = fromMatch?.[1] ?? null;

      // Extract fields from SELECT clause
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
      if (selectMatch && selectMatch[1] !== '*') {
        const fieldList = selectMatch[1]!.split(',').map(f => f.trim().split(/\s+as\s+/i)[0]!.trim());
        fields.push(...fieldList.filter(f => f !== '*'));
      }
    } else if (upperSql.startsWith('INSERT')) {
      operation = 'write';
      const intoMatch = sql.match(/INTO\s+["'`]?(\w+)["'`]?/i);
      table = intoMatch?.[1] ?? null;
    } else if (upperSql.startsWith('UPDATE')) {
      operation = 'write';
      const updateMatch = sql.match(/UPDATE\s+["'`]?(\w+)["'`]?/i);
      table = updateMatch?.[1] ?? null;
    } else if (upperSql.startsWith('DELETE')) {
      operation = 'delete';
      const fromMatch = sql.match(/FROM\s+["'`]?(\w+)["'`]?/i);
      table = fromMatch?.[1] ?? null;
    }

    return { table, operation, fields };
  }

  /**
   * Get operation from method name
   */
  private getOperationFromMethod(method: string, framework: string): DataOperation {
    const pattern = RUST_ORM_PATTERNS.find(p => p.name === framework);
    if (!pattern) return 'read';

    if (pattern.methods.read.includes(method)) return 'read';
    if (pattern.methods.write.includes(method)) return 'write';
    if (pattern.methods.delete.includes(method)) return 'delete';

    return 'read';
  }

  /**
   * Convert entity name to table name (PascalCase to snake_case)
   */
  private entityToTable(entity: string): string {
    return entity
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(source: string, index: number): number {
    return source.slice(0, index).split('\n').length;
  }

  /**
   * Create confidence breakdown
   */
  private createConfidence(score: number): ConfidenceBreakdown {
    return {
      overall: score,
      tableDetection: score,
      operationDetection: score,
      fieldDetection: score * 0.8,
    };
  }
}

/**
 * Create a Rust data access extractor instance
 */
export function createRustDataAccessExtractor(): RustDataAccessExtractor {
  return new RustDataAccessExtractor();
}
```


---

## Phase 8: Pattern Matchers

### 8.1 SQLx Pattern Matcher

```typescript
// packages/core/src/unified-provider/matching/sqlx-matcher.ts

/**
 * SQLx Pattern Matcher
 *
 * Matches SQLx patterns:
 * - sqlx::query!("SELECT * FROM users")
 * - sqlx::query_as!(User, "SELECT * FROM users")
 * - sqlx::query("...").fetch_all(&pool)
 * - sqlx::query("...").execute(&pool)
 *
 * @requirements Rust Language Support
 */

import type { DataOperation } from '../../boundaries/types.js';
import type { UnifiedCallChain, PatternMatchResult, UnifiedLanguage } from '../types.js';
import { BaseMatcher } from './base-matcher.js';

export class SQLxMatcher extends BaseMatcher {
  readonly id = 'sqlx';
  readonly name = 'SQLx';
  readonly languages: UnifiedLanguage[] = ['rust'];
  readonly priority = 95;

  private readonly readMethods = [
    'fetch', 'fetch_one', 'fetch_optional', 'fetch_all',
    'fetch_many', 'query', 'query_as', 'query_scalar',
  ];

  private readonly writeMethods = [
    'execute',
  ];

  match(chain: UnifiedCallChain): PatternMatchResult | null {
    // Pattern 1: sqlx::query*!(...) macros
    if (chain.receiver === 'sqlx' || chain.fullExpression.includes('sqlx::query')) {
      return this.matchSqlxPattern(chain);
    }

    // Pattern 2: pool.fetch*() or conn.execute()
    const receiver = chain.receiver.toLowerCase();
    if (receiver.includes('pool') || receiver.includes('conn') || receiver.includes('db')) {
      return this.matchPoolPattern(chain);
    }

    return null;
  }

  private matchSqlxPattern(chain: UnifiedCallChain): PatternMatchResult | null {
    // Extract SQL from the expression
    const sqlMatch = chain.fullExpression.match(/"([^"]+)"/);
    if (!sqlMatch) return null;

    const sql = sqlMatch[1]!;
    const { table, operation, fields } = this.parseSql(sql);

    return this.createMatch({
      table: table || 'unknown',
      fields,
      operation,
      confidence: 0.95,
      metadata: { pattern: 'sqlx-macro', sql },
    });
  }

  private matchPoolPattern(chain: UnifiedCallChain): PatternMatchResult | null {
    if (chain.segments.length < 1) return null;

    const methodSegment = chain.segments[0];
    if (!methodSegment?.isCall) return null;

    const operation = this.getOperation(methodSegment.name);
    if (!operation) return null;

    return this.createMatch({
      table: 'unknown',
      fields: [],
      operation,
      confidence: 0.7,
      metadata: { pattern: 'pool-method' },
    });
  }

  private getOperation(method: string): DataOperation | null {
    if (this.readMethods.includes(method)) return 'read';
    if (this.writeMethods.includes(method)) return 'write';
    return null;
  }

  private parseSql(sql: string): { table: string | null; operation: DataOperation; fields: string[] } {
    const upperSql = sql.toUpperCase().trim();
    let operation: DataOperation = 'read';
    let table: string | null = null;
    const fields: string[] = [];

    if (upperSql.startsWith('SELECT')) {
      operation = 'read';
      const fromMatch = sql.match(/FROM\s+["'`]?(\w+)["'`]?/i);
      table = fromMatch?.[1] ?? null;
    } else if (upperSql.startsWith('INSERT')) {
      operation = 'write';
      const intoMatch = sql.match(/INTO\s+["'`]?(\w+)["'`]?/i);
      table = intoMatch?.[1] ?? null;
    } else if (upperSql.startsWith('UPDATE')) {
      operation = 'write';
      const updateMatch = sql.match(/UPDATE\s+["'`]?(\w+)["'`]?/i);
      table = updateMatch?.[1] ?? null;
    } else if (upperSql.startsWith('DELETE')) {
      operation = 'delete';
      const fromMatch = sql.match(/FROM\s+["'`]?(\w+)["'`]?/i);
      table = fromMatch?.[1] ?? null;
    }

    return { table, operation, fields };
  }
}
```

### 8.2 Diesel Pattern Matcher

```typescript
// packages/core/src/unified-provider/matching/diesel-matcher.ts

/**
 * Diesel Pattern Matcher
 *
 * Matches Diesel ORM patterns:
 * - users::table.filter(...).load(&conn)
 * - diesel::insert_into(users::table).values(&new_user)
 * - diesel::update(users::table).set(...)
 * - diesel::delete(users.filter(...))
 *
 * @requirements Rust Language Support
 */

import type { DataOperation } from '../../boundaries/types.js';
import type { UnifiedCallChain, PatternMatchResult, UnifiedLanguage } from '../types.js';
import { BaseMatcher } from './base-matcher.js';

export class DieselMatcher extends BaseMatcher {
  readonly id = 'diesel';
  readonly name = 'Diesel';
  readonly languages: UnifiedLanguage[] = ['rust'];
  readonly priority = 90;

  private readonly readMethods = [
    'load', 'first', 'get_result', 'get_results',
    'select', 'filter', 'find', 'order', 'limit',
  ];

  private readonly writeMethods = [
    'insert_into', 'values', 'execute', 'set',
  ];

  private readonly deleteMethods = [
    'delete',
  ];

  match(chain: UnifiedCallChain): PatternMatchResult | null {
    // Pattern 1: table::table.method()
    if (chain.receiver.endsWith('::table')) {
      return this.matchTablePattern(chain);
    }

    // Pattern 2: diesel::insert_into(), diesel::update(), diesel::delete()
    if (chain.receiver === 'diesel') {
      return this.matchDieselFunctionPattern(chain);
    }

    return null;
  }

  private matchTablePattern(chain: UnifiedCallChain): PatternMatchResult | null {
    // Extract table name from receiver (e.g., "users::table" -> "users")
    const table = chain.receiver.replace('::table', '');

    if (chain.segments.length < 1) return null;

    // Find the terminal method to determine operation
    let operation: DataOperation = 'read';
    for (const segment of chain.segments) {
      if (this.readMethods.includes(segment.name)) {
        operation = 'read';
      } else if (this.writeMethods.includes(segment.name)) {
        operation = 'write';
      } else if (this.deleteMethods.includes(segment.name)) {
        operation = 'delete';
      }
    }

    return this.createMatch({
      table,
      fields: [],
      operation,
      confidence: 0.9,
      metadata: { pattern: 'diesel-table' },
    });
  }

  private matchDieselFunctionPattern(chain: UnifiedCallChain): PatternMatchResult | null {
    if (chain.segments.length < 1) return null;

    const firstSegment = chain.segments[0]!;
    let operation: DataOperation = 'read';
    let table = 'unknown';

    if (firstSegment.name === 'insert_into') {
      operation = 'write';
      // Try to extract table from first argument
      if (firstSegment.args.length > 0) {
        const arg = firstSegment.args[0]!;
        if (arg.type === 'identifier') {
          table = arg.value.replace('::table', '');
        }
      }
    } else if (firstSegment.name === 'update') {
      operation = 'write';
      if (firstSegment.args.length > 0) {
        const arg = firstSegment.args[0]!;
        if (arg.type === 'identifier') {
          table = arg.value.replace('::table', '');
        }
      }
    } else if (firstSegment.name === 'delete') {
      operation = 'delete';
      if (firstSegment.args.length > 0) {
        const arg = firstSegment.args[0]!;
        if (arg.type === 'identifier') {
          table = arg.value.replace('::table', '');
        }
      }
    }

    return this.createMatch({
      table,
      fields: [],
      operation,
      confidence: 0.9,
      metadata: { pattern: 'diesel-function' },
    });
  }
}
```

### 8.3 SeaORM Pattern Matcher

```typescript
// packages/core/src/unified-provider/matching/seaorm-matcher.ts

/**
 * SeaORM Pattern Matcher
 *
 * Matches SeaORM patterns:
 * - User::find().all(&db)
 * - User::find_by_id(id).one(&db)
 * - User::insert(model).exec(&db)
 * - User::update(model).exec(&db)
 * - User::delete_by_id(id).exec(&db)
 *
 * @requirements Rust Language Support
 */

import type { DataOperation } from '../../boundaries/types.js';
import type { UnifiedCallChain, PatternMatchResult, UnifiedLanguage } from '../types.js';
import { BaseMatcher } from './base-matcher.js';

export class SeaORMMatcher extends BaseMatcher {
  readonly id = 'seaorm';
  readonly name = 'SeaORM';
  readonly languages: UnifiedLanguage[] = ['rust'];
  readonly priority = 90;

  private readonly readMethods = [
    'find', 'find_by_id', 'find_related', 'all', 'one', 'count',
  ];

  private readonly writeMethods = [
    'insert', 'update', 'save', 'insert_many',
  ];

  private readonly deleteMethods = [
    'delete', 'delete_many', 'delete_by_id',
  ];

  match(chain: UnifiedCallChain): PatternMatchResult | null {
    // Pattern: Entity::method() where Entity is PascalCase
    if (!this.isPascalCase(chain.receiver)) {
      return null;
    }

    if (chain.segments.length < 1) return null;

    const firstSegment = chain.segments[0]!;
    if (!firstSegment.isCall) return null;

    const operation = this.getOperation(firstSegment.name);
    if (!operation) return null;

    const table = this.entityToTable(chain.receiver);

    return this.createMatch({
      table,
      fields: [],
      operation,
      confidence: 0.85,
      metadata: { pattern: 'seaorm-entity', entity: chain.receiver },
    });
  }

  private getOperation(method: string): DataOperation | null {
    if (this.readMethods.includes(method)) return 'read';
    if (this.writeMethods.includes(method)) return 'write';
    if (this.deleteMethods.includes(method)) return 'delete';
    return null;
  }

  private isPascalCase(str: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str);
  }

  private entityToTable(entity: string): string {
    return entity
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}
```


---

## Phase 9: Test Topology Extraction

### 9.1 Rust Test Regex Extractor

```typescript
// packages/core/src/test-topology/extractors/regex/rust-test-regex.ts

/**
 * Rust Test Regex Extractor
 *
 * Regex-based fallback for extracting test information when tree-sitter is unavailable.
 * Supports:
 * - Built-in #[test] attribute
 * - #[tokio::test] for async tests
 * - #[actix_rt::test] for Actix tests
 * - #[rstest] for parameterized tests
 * - Criterion benchmarks
 *
 * @requirements Rust Language Support
 */

import type {
  TestExtraction,
  TestCase,
  MockStatement,
  SetupBlock,
  AssertionInfo,
  TestQualitySignals,
  TestFramework,
} from '../../types.js';

export class RustTestRegexExtractor {
  readonly language = 'rust' as const;
  readonly extensions = ['.rs'];

  /**
   * Extract test information using regex patterns
   */
  extract(content: string, filePath: string): TestExtraction {
    const framework = this.detectFramework(content);
    const testCases = this.extractTestCases(content, filePath, framework);
    const mocks = this.extractMocks(content);
    const setupBlocks = this.extractSetupBlocks(content);

    // Enrich test cases with quality signals
    for (const test of testCases) {
      const testBody = this.extractTestBody(content, test.line);
      const assertions = this.extractAssertions(testBody, test.line);
      const testMocks = mocks.filter(m =>
        m.line >= test.line && m.line <= test.line + 100
      );
      test.assertions = assertions;
      test.quality = this.calculateQuality(assertions, testMocks, test.directCalls);
    }

    return {
      file: filePath,
      framework,
      language: 'rust',
      testCases,
      mocks,
      setupBlocks,
    };
  }

  /**
   * Detect test framework from imports and patterns
   */
  detectFramework(content: string): TestFramework {
    // Check for async test frameworks
    if (content.includes('#[tokio::test]')) return 'tokio-test';
    if (content.includes('#[actix_rt::test]')) return 'actix-test';
    if (content.includes('#[async_std::test]')) return 'async-std-test';

    // Check for rstest
    if (content.includes('#[rstest]') || content.includes('use rstest::')) return 'rstest';

    // Check for criterion benchmarks
    if (content.includes('criterion_group!') || content.includes('use criterion::')) return 'criterion';

    // Check for proptest
    if (content.includes('proptest!') || content.includes('use proptest::')) return 'proptest';

    // Check for quickcheck
    if (content.includes('#[quickcheck]') || content.includes('use quickcheck::')) return 'quickcheck';

    // Default to built-in test framework
    if (content.includes('#[test]') || content.includes('#[cfg(test)]')) return 'rust-test';

    return 'unknown';
  }

  /**
   * Extract test cases from content
   */
  extractTestCases(content: string, filePath: string, framework: TestFramework): TestCase[] {
    const testCases: TestCase[] = [];
    const lines = content.split('\n');

    // Pattern 1: #[test] fn test_name() { }
    const testAttrPattern = /#\[(test|tokio::test|actix_rt::test|async_std::test|rstest|quickcheck)(?:\([^)]*\))?\]\s*(?:async\s+)?fn\s+(\w+)\s*\(/g;
    let match;

    while ((match = testAttrPattern.exec(content)) !== null) {
      const attr = match[1]!;
      const name = match[2]!;
      const line = this.getLineNumber(content, match.index);
      const testBody = this.extractTestBody(content, line);
      const directCalls = this.extractFunctionCalls(testBody);

      testCases.push({
        id: `${filePath}:${name}:${line}`,
        name,
        qualifiedName: name,
        file: filePath,
        line,
        directCalls,
        transitiveCalls: [],
        assertions: [],
        quality: {
          assertionCount: 0,
          hasErrorCases: false,
          hasEdgeCases: false,
          mockRatio: 0,
          setupRatio: 0,
          score: 50,
        },
      });
    }

    // Pattern 2: #[test] with #[should_panic]
    const shouldPanicPattern = /#\[should_panic(?:\([^)]*\))?\]\s*#\[test\]\s*fn\s+(\w+)\s*\(/g;

    while ((match = shouldPanicPattern.exec(content)) !== null) {
      const name = match[1]!;
      const line = this.getLineNumber(content, match.index);

      // Check if already added
      if (testCases.some(t => t.name === name && t.line === line)) continue;

      const testBody = this.extractTestBody(content, line);
      const directCalls = this.extractFunctionCalls(testBody);

      testCases.push({
        id: `${filePath}:${name}:${line}`,
        name,
        qualifiedName: name,
        file: filePath,
        line,
        directCalls,
        transitiveCalls: [],
        assertions: [],
        quality: {
          assertionCount: 0,
          hasErrorCases: true, // should_panic implies error case testing
          hasEdgeCases: false,
          mockRatio: 0,
          setupRatio: 0,
          score: 60,
        },
      });
    }

    // Pattern 3: Criterion benchmarks
    if (framework === 'criterion') {
      const benchPattern = /fn\s+(\w+)\s*\(\s*c:\s*&mut\s+Criterion\s*\)/g;

      while ((match = benchPattern.exec(content)) !== null) {
        const name = match[1]!;
        const line = this.getLineNumber(content, match.index);

        testCases.push({
          id: `${filePath}:bench:${name}:${line}`,
          name,
          qualifiedName: `bench::${name}`,
          file: filePath,
          line,
          directCalls: [],
          transitiveCalls: [],
          assertions: [],
          quality: {
            assertionCount: 0,
            hasErrorCases: false,
            hasEdgeCases: false,
            mockRatio: 0,
            setupRatio: 0,
            score: 50,
          },
        });
      }
    }

    return testCases;
  }

  /**
   * Extract test body based on brace matching
   */
  private extractTestBody(content: string, startLine: number): string {
    const lines = content.split('\n');
    const bodyLines: string[] = [];
    let braceCount = 0;
    let started = false;

    for (let i = startLine - 1; i < Math.min(startLine + 200, lines.length); i++) {
      const line = lines[i]!;

      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      if (started) {
        bodyLines.push(line);
      }

      if (started && braceCount === 0) {
        break;
      }
    }

    return bodyLines.join('\n');
  }

  /**
   * Extract function calls from test body
   */
  private extractFunctionCalls(body: string): string[] {
    const calls: string[] = [];
    const seen = new Set<string>();

    // Pattern for function calls: func_name(
    const callPattern = /\b([a-z_][a-z0-9_]*)\s*\(/g;
    let match;

    while ((match = callPattern.exec(body)) !== null) {
      const name = match[1]!;
      if (this.isTestFrameworkCall(name)) continue;
      if (!seen.has(name)) {
        seen.add(name);
        calls.push(name);
      }
    }

    // Pattern for method calls: .method_name(
    const methodPattern = /\.([a-z_][a-z0-9_]*)\s*\(/g;
    while ((match = methodPattern.exec(body)) !== null) {
      const name = match[1]!;
      if (this.isTestFrameworkCall(name)) continue;
      if (!seen.has(name)) {
        seen.add(name);
        calls.push(name);
      }
    }

    return calls;
  }

  /**
   * Extract assertions from test body
   */
  private extractAssertions(body: string, baseLineNum: number): AssertionInfo[] {
    const assertions: AssertionInfo[] = [];
    const lines = body.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const lineNum = baseLineNum + i;

      // assert! macro
      if (/\bassert!\s*\(/.test(line)) {
        assertions.push({
          matcher: 'assert!',
          line: lineNum,
          isErrorAssertion: false,
          isEdgeCaseAssertion: line.includes('is_none') || line.includes('is_empty'),
        });
      }

      // assert_eq! macro
      if (/\bassert_eq!\s*\(/.test(line)) {
        assertions.push({
          matcher: 'assert_eq!',
          line: lineNum,
          isErrorAssertion: false,
          isEdgeCaseAssertion: false,
        });
      }

      // assert_ne! macro
      if (/\bassert_ne!\s*\(/.test(line)) {
        assertions.push({
          matcher: 'assert_ne!',
          line: lineNum,
          isErrorAssertion: false,
          isEdgeCaseAssertion: false,
        });
      }

      // debug_assert! variants
      if (/\bdebug_assert(?:_eq|_ne)?!\s*\(/.test(line)) {
        assertions.push({
          matcher: 'debug_assert!',
          line: lineNum,
          isErrorAssertion: false,
          isEdgeCaseAssertion: false,
        });
      }

      // Result assertions: .is_ok(), .is_err()
      if (/\.is_ok\(\)/.test(line)) {
        assertions.push({
          matcher: 'is_ok',
          line: lineNum,
          isErrorAssertion: false,
          isEdgeCaseAssertion: false,
        });
      }

      if (/\.is_err\(\)/.test(line)) {
        assertions.push({
          matcher: 'is_err',
          line: lineNum,
          isErrorAssertion: true,
          isEdgeCaseAssertion: false,
        });
      }

      // Option assertions: .is_some(), .is_none()
      if (/\.is_some\(\)/.test(line)) {
        assertions.push({
          matcher: 'is_some',
          line: lineNum,
          isErrorAssertion: false,
          isEdgeCaseAssertion: false,
        });
      }

      if (/\.is_none\(\)/.test(line)) {
        assertions.push({
          matcher: 'is_none',
          line: lineNum,
          isErrorAssertion: false,
          isEdgeCaseAssertion: true,
        });
      }

      // .unwrap() and .expect() - implicit assertions
      if (/\.unwrap\(\)/.test(line) || /\.expect\(/.test(line)) {
        assertions.push({
          matcher: 'unwrap/expect',
          line: lineNum,
          isErrorAssertion: false,
          isEdgeCaseAssertion: false,
        });
      }

      // panic! - explicit panic assertion
      if (/\bpanic!\s*\(/.test(line)) {
        assertions.push({
          matcher: 'panic!',
          line: lineNum,
          isErrorAssertion: true,
          isEdgeCaseAssertion: false,
        });
      }
    }

    return assertions;
  }

  /**
   * Extract mock statements
   */
  extractMocks(content: string): MockStatement[] {
    const mocks: MockStatement[] = [];

    // mockall: #[automock] or mock! macro
    const mockallPattern = /#\[automock\]|mock!\s*\{/g;
    let match;

    while ((match = mockallPattern.exec(content)) !== null) {
      mocks.push({
        target: 'mockall',
        mockType: 'mockall',
        line: this.getLineNumber(content, match.index),
        isExternal: false,
      });
    }

    // mockito: mockito::mock()
    const mockitoPattern = /mockito::mock\s*\(/g;
    while ((match = mockitoPattern.exec(content)) !== null) {
      mocks.push({
        target: 'mockito',
        mockType: 'mockito',
        line: this.getLineNumber(content, match.index),
        isExternal: true,
      });
    }

    // wiremock: MockServer::start()
    const wiremockPattern = /MockServer::start\s*\(/g;
    while ((match = wiremockPattern.exec(content)) !== null) {
      mocks.push({
        target: 'wiremock',
        mockType: 'wiremock',
        line: this.getLineNumber(content, match.index),
        isExternal: true,
      });
    }

    return mocks;
  }

  /**
   * Extract setup blocks
   */
  extractSetupBlocks(content: string): SetupBlock[] {
    const blocks: SetupBlock[] = [];

    // #[fixture] from rstest
    const fixturePattern = /#\[fixture\]\s*(?:pub\s+)?fn\s+(\w+)/g;
    let match;

    while ((match = fixturePattern.exec(content)) !== null) {
      blocks.push({
        type: 'beforeEach',
        line: this.getLineNumber(content, match.index),
        calls: [match[1]!],
      });
    }

    // ctor crate: #[ctor] for module-level setup
    const ctorPattern = /#\[ctor\]\s*fn\s+(\w+)/g;
    while ((match = ctorPattern.exec(content)) !== null) {
      blocks.push({
        type: 'beforeAll',
        line: this.getLineNumber(content, match.index),
        calls: [match[1]!],
      });
    }

    // #[dtor] for module-level teardown
    const dtorPattern = /#\[dtor\]\s*fn\s+(\w+)/g;
    while ((match = dtorPattern.exec(content)) !== null) {
      blocks.push({
        type: 'afterAll',
        line: this.getLineNumber(content, match.index),
        calls: [match[1]!],
      });
    }

    return blocks;
  }

  /**
   * Check if a function name is a test framework call
   */
  private isTestFrameworkCall(name: string): boolean {
    const frameworkCalls = [
      // Assertions
      'assert', 'assert_eq', 'assert_ne', 'debug_assert',
      'panic', 'unreachable', 'todo', 'unimplemented',
      // Result/Option
      'unwrap', 'expect', 'ok', 'err', 'some', 'none',
      'is_ok', 'is_err', 'is_some', 'is_none',
      // Common test utilities
      'setup', 'teardown', 'before', 'after',
      // Async
      'await', 'spawn', 'block_on',
    ];
    return frameworkCalls.includes(name);
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, index: number): number {
    return content.slice(0, index).split('\n').length;
  }

  /**
   * Calculate test quality signals
   */
  private calculateQuality(
    assertions: AssertionInfo[],
    mocks: MockStatement[],
    directCalls: string[]
  ): TestQualitySignals {
    const assertionCount = assertions.length;
    const hasErrorCases = assertions.some(a => a.isErrorAssertion);
    const hasEdgeCases = assertions.some(a => a.isEdgeCaseAssertion);

    const totalCalls = mocks.length + directCalls.length;
    const mockRatio = totalCalls > 0 ? mocks.length / totalCalls : 0;

    let score = 50;
    if (assertionCount >= 1) score += 10;
    if (assertionCount >= 3) score += 10;
    if (hasErrorCases) score += 15;
    if (hasEdgeCases) score += 10;
    if (mockRatio > 0.7) score -= 15;
    else if (mockRatio > 0.5) score -= 5;
    if (assertionCount === 0) score -= 20;

    return {
      assertionCount,
      hasErrorCases,
      hasEdgeCases,
      mockRatio: Math.round(mockRatio * 100) / 100,
      setupRatio: 0,
      score: Math.max(0, Math.min(100, score)),
    };
  }
}

/**
 * Factory function
 */
export function createRustTestRegexExtractor(): RustTestRegexExtractor {
  return new RustTestRegexExtractor();
}
```


---

## Phase 10: Framework Detectors

### 10.1 Actix-web Detector

```typescript
// packages/detectors/src/api/rust/actix-detector.ts

/**
 * Actix-web Framework Detector
 *
 * Detects Actix-web patterns:
 * - #[get("/path")], #[post("/path")], etc.
 * - web::resource("/path").route(...)
 * - HttpResponse builders
 * - Extractors (Path, Query, Json, Form)
 *
 * @requirements Rust Language Support
 */

import type { PatternMatch, PatternCategory } from '../../../core/src/patterns/types.js';

export class ActixDetector {
  readonly id = 'actix-web';
  readonly name = 'Actix-web';
  readonly category: PatternCategory = 'api';
  readonly languages = ['rust'] as const;

  /**
   * Detect Actix-web patterns in source
   */
  detect(source: string, filePath: string): PatternMatch[] {
    const matches: PatternMatch[] = [];

    // Route attribute macros
    this.detectRouteMacros(source, filePath, matches);

    // Resource configuration
    this.detectResourceConfig(source, filePath, matches);

    // Extractors
    this.detectExtractors(source, filePath, matches);

    // Middleware
    this.detectMiddleware(source, filePath, matches);

    return matches;
  }

  private detectRouteMacros(source: string, filePath: string, matches: PatternMatch[]): void {
    // #[get("/users")], #[post("/users")], etc.
    const routePattern = /#\[(get|post|put|delete|patch|head|options|trace)\s*\(\s*"([^"]+)"\s*\)\]/gi;
    let match;

    while ((match = routePattern.exec(source)) !== null) {
      const method = match[1]!.toUpperCase();
      const path = match[2]!;
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:actix-route:${line}`,
        patternId: 'api-endpoint',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.95,
        metadata: {
          framework: 'actix-web',
          method,
          path,
        },
      });
    }

    // #[route("/path", method = "GET")]
    const routeAttrPattern = /#\[route\s*\(\s*"([^"]+)"\s*,\s*method\s*=\s*"(\w+)"\s*\)\]/gi;

    while ((match = routeAttrPattern.exec(source)) !== null) {
      const path = match[1]!;
      const method = match[2]!.toUpperCase();
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:actix-route:${line}`,
        patternId: 'api-endpoint',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.95,
        metadata: {
          framework: 'actix-web',
          method,
          path,
        },
      });
    }
  }

  private detectResourceConfig(source: string, filePath: string, matches: PatternMatch[]): void {
    // web::resource("/path").route(web::get().to(handler))
    const resourcePattern = /web::resource\s*\(\s*"([^"]+)"\s*\)/g;
    let match;

    while ((match = resourcePattern.exec(source)) !== null) {
      const path = match[1]!;
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:actix-resource:${line}`,
        patternId: 'api-resource',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.9,
        metadata: {
          framework: 'actix-web',
          path,
        },
      });
    }

    // web::scope("/api")
    const scopePattern = /web::scope\s*\(\s*"([^"]+)"\s*\)/g;

    while ((match = scopePattern.exec(source)) !== null) {
      const path = match[1]!;
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:actix-scope:${line}`,
        patternId: 'api-scope',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.9,
        metadata: {
          framework: 'actix-web',
          path,
        },
      });
    }
  }

  private detectExtractors(source: string, filePath: string, matches: PatternMatch[]): void {
    // web::Path<T>, web::Query<T>, web::Json<T>, web::Form<T>
    const extractorPattern = /web::(Path|Query|Json|Form|Data)\s*<([^>]+)>/g;
    let match;

    while ((match = extractorPattern.exec(source)) !== null) {
      const extractorType = match[1]!;
      const typeParam = match[2]!;
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:actix-extractor:${line}`,
        patternId: 'api-extractor',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.85,
        metadata: {
          framework: 'actix-web',
          extractorType,
          typeParam,
        },
      });
    }
  }

  private detectMiddleware(source: string, filePath: string, matches: PatternMatch[]): void {
    // .wrap(middleware)
    const wrapPattern = /\.wrap\s*\(\s*([^)]+)\s*\)/g;
    let match;

    while ((match = wrapPattern.exec(source)) !== null) {
      const middleware = match[1]!.trim();
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:actix-middleware:${line}`,
        patternId: 'middleware',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.8,
        metadata: {
          framework: 'actix-web',
          middleware,
        },
      });
    }
  }

  private getLineNumber(source: string, index: number): number {
    return source.slice(0, index).split('\n').length;
  }
}
```

### 10.2 Axum Detector

```typescript
// packages/detectors/src/api/rust/axum-detector.ts

/**
 * Axum Framework Detector
 *
 * Detects Axum patterns:
 * - Router::new().route("/path", get(handler))
 * - axum::extract::{Path, Query, Json}
 * - Extension and State extractors
 * - Middleware layers
 *
 * @requirements Rust Language Support
 */

import type { PatternMatch, PatternCategory } from '../../../core/src/patterns/types.js';

export class AxumDetector {
  readonly id = 'axum';
  readonly name = 'Axum';
  readonly category: PatternCategory = 'api';
  readonly languages = ['rust'] as const;

  /**
   * Detect Axum patterns in source
   */
  detect(source: string, filePath: string): PatternMatch[] {
    const matches: PatternMatch[] = [];

    // Route definitions
    this.detectRoutes(source, filePath, matches);

    // Extractors
    this.detectExtractors(source, filePath, matches);

    // Middleware/Layers
    this.detectLayers(source, filePath, matches);

    return matches;
  }

  private detectRoutes(source: string, filePath: string, matches: PatternMatch[]): void {
    // .route("/path", get(handler))
    const routePattern = /\.route\s*\(\s*"([^"]+)"\s*,\s*(get|post|put|delete|patch|head|options|trace)\s*\(/gi;
    let match;

    while ((match = routePattern.exec(source)) !== null) {
      const path = match[1]!;
      const method = match[2]!.toUpperCase();
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:axum-route:${line}`,
        patternId: 'api-endpoint',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.95,
        metadata: {
          framework: 'axum',
          method,
          path,
        },
      });
    }

    // .route("/path", method_router)
    const methodRouterPattern = /\.route\s*\(\s*"([^"]+)"\s*,\s*(\w+)\s*\)/g;

    while ((match = methodRouterPattern.exec(source)) !== null) {
      const path = match[1]!;
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:axum-route:${line}`,
        patternId: 'api-endpoint',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.85,
        metadata: {
          framework: 'axum',
          path,
        },
      });
    }

    // Router::new()
    const routerPattern = /Router::new\s*\(\s*\)/g;

    while ((match = routerPattern.exec(source)) !== null) {
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:axum-router:${line}`,
        patternId: 'api-router',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.9,
        metadata: {
          framework: 'axum',
        },
      });
    }
  }

  private detectExtractors(source: string, filePath: string, matches: PatternMatch[]): void {
    // axum::extract::{Path, Query, Json, State, Extension}
    const extractorPattern = /(?:axum::extract::)?(Path|Query|Json|State|Extension)\s*<([^>]+)>/g;
    let match;

    while ((match = extractorPattern.exec(source)) !== null) {
      const extractorType = match[1]!;
      const typeParam = match[2]!;
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:axum-extractor:${line}`,
        patternId: 'api-extractor',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.85,
        metadata: {
          framework: 'axum',
          extractorType,
          typeParam,
        },
      });
    }
  }

  private detectLayers(source: string, filePath: string, matches: PatternMatch[]): void {
    // .layer(middleware)
    const layerPattern = /\.layer\s*\(\s*([^)]+)\s*\)/g;
    let match;

    while ((match = layerPattern.exec(source)) !== null) {
      const layer = match[1]!.trim();
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:axum-layer:${line}`,
        patternId: 'middleware',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.8,
        metadata: {
          framework: 'axum',
          layer,
        },
      });
    }

    // ServiceBuilder::new()
    const serviceBuilderPattern = /ServiceBuilder::new\s*\(\s*\)/g;

    while ((match = serviceBuilderPattern.exec(source)) !== null) {
      const line = this.getLineNumber(source, match.index);

      matches.push({
        id: `${filePath}:axum-service-builder:${line}`,
        patternId: 'middleware-builder',
        file: filePath,
        line,
        column: 0,
        matchedText: match[0],
        confidence: 0.85,
        metadata: {
          framework: 'axum',
        },
      });
    }
  }

  private getLineNumber(source: string, index: number): number {
    return source.slice(0, index).split('\n').length;
  }
}
```


---

## Phase 11: Normalizer

### 11.1 Rust Call Chain Normalizer

```typescript
// packages/core/src/unified-provider/normalization/rust-normalizer.ts

/**
 * Rust Call Chain Normalizer
 *
 * Converts Rust AST into unified call chains.
 * Handles Rust-specific patterns including:
 * - Method chaining: obj.method1()?.method2()
 * - Associated functions: Type::new()
 * - Trait methods: <Type as Trait>::method()
 * - Macro invocations: macro_name!(...)
 * - Closures: |x| x + 1
 * - Async/await: .await
 * - Turbofish: func::<Type>()
 *
 * @requirements Rust Language Support
 */

import type { TreeSitterNode } from '../../parsers/tree-sitter/types.js';
import { BaseNormalizer } from './base-normalizer.js';
import type {
  UnifiedCallChain,
  CallChainSegment,
  NormalizedArg,
  UnifiedFunction,
  UnifiedClass,
  UnifiedImport,
  UnifiedExport,
  UnifiedParameter,
} from '../types.js';

/**
 * Rust normalizer
 */
export class RustNormalizer extends BaseNormalizer {
  readonly language = 'rust' as const;

  // ============================================================================
  // Call Chain Normalization
  // ============================================================================

  normalizeCallChains(
    rootNode: TreeSitterNode,
    _source: string,
    filePath: string
  ): UnifiedCallChain[] {
    const chains: UnifiedCallChain[] = [];
    const processedNodes = new Set<TreeSitterNode>();

    this.traverseNode(rootNode, node => {
      if (node.type === 'call_expression' && !processedNodes.has(node)) {
        // Check if this call is part of a larger chain
        const parent = node.parent;
        if (parent?.type === 'field_expression' || parent?.type === 'call_expression') {
          return;
        }

        const chain = this.extractCallChain(node, filePath);
        if (chain && chain.segments.length > 0) {
          chains.push(chain);
          this.markChainNodesProcessed(node, processedNodes);
        }
      }

      // Also handle macro invocations
      if (node.type === 'macro_invocation' && !processedNodes.has(node)) {
        const chain = this.extractMacroChain(node, filePath);
        if (chain) {
          chains.push(chain);
          processedNodes.add(node);
        }
      }
    });

    return chains;
  }

  /**
   * Extract a call chain from a call expression
   */
  private extractCallChain(node: TreeSitterNode, filePath: string): UnifiedCallChain | null {
    const segments: CallChainSegment[] = [];
    let receiver = '';
    let current: TreeSitterNode | null = node;

    while (current) {
      if (current.type === 'call_expression') {
        const funcNode = this.getChildByField(current, 'function');
        const argsNode = this.getChildByField(current, 'arguments');

        if (!funcNode) break;

        const args = argsNode ? this.normalizeArguments(argsNode) : [];

        if (funcNode.type === 'field_expression') {
          // obj.method()
          const fieldNode = this.getChildByField(funcNode, 'field');
          const valueNode = this.getChildByField(funcNode, 'value');

          if (fieldNode) {
            const pos = this.getPosition(fieldNode);
            segments.unshift(this.createSegment(fieldNode.text, true, args, pos.line, pos.column));
          }

          current = valueNode;
        } else if (funcNode.type === 'scoped_identifier') {
          // Type::method() or module::function()
          const pos = this.getPosition(funcNode);
          const parts = funcNode.text.split('::');
          const methodName = parts.pop()!;
          receiver = parts.join('::');
          segments.unshift(this.createSegment(methodName, true, args, pos.line, pos.column));
          break;
        } else if (funcNode.type === 'identifier') {
          // Direct function call
          const pos = this.getPosition(funcNode);
          segments.unshift(this.createSegment(funcNode.text, true, args, pos.line, pos.column));
          receiver = funcNode.text;
          break;
        } else if (funcNode.type === 'generic_function') {
          // Turbofish: func::<Type>()
          const innerFunc = this.getChildByField(funcNode, 'function');
          if (innerFunc) {
            const pos = this.getPosition(innerFunc);
            segments.unshift(this.createSegment(innerFunc.text, true, args, pos.line, pos.column));
            receiver = innerFunc.text;
          }
          break;
        } else {
          break;
        }
      } else if (current.type === 'field_expression') {
        // Property access without call: obj.field
        const fieldNode = this.getChildByField(current, 'field');
        const valueNode = this.getChildByField(current, 'value');

        if (fieldNode) {
          const pos = this.getPosition(fieldNode);
          segments.unshift(this.createSegment(fieldNode.text, false, [], pos.line, pos.column));
        }

        current = valueNode;
      } else if (current.type === 'identifier') {
        receiver = current.text;
        break;
      } else if (current.type === 'await_expression') {
        // Handle .await
        const innerNode = current.namedChildren[0];
        const pos = this.getPosition(current);
        segments.unshift(this.createSegment('await', false, [], pos.line, pos.column));
        current = innerNode ?? null;
      } else if (current.type === 'try_expression') {
        // Handle ? operator
        const innerNode = current.namedChildren[0];
        current = innerNode ?? null;
      } else {
        receiver = current.text;
        break;
      }
    }

    if (segments.length === 0) {
      return null;
    }

    const pos = this.getPosition(node);
    const endPos = this.getEndPosition(node);

    return this.createCallChain(
      receiver,
      segments,
      node.text,
      filePath,
      pos.line,
      pos.column,
      endPos.line,
      endPos.column,
      node
    );
  }

  /**
   * Extract a macro invocation as a call chain
   */
  private extractMacroChain(node: TreeSitterNode, filePath: string): UnifiedCallChain | null {
    const macroNode = this.getChildByField(node, 'macro');
    if (!macroNode) return null;

    const macroName = `${macroNode.text}!`;
    const pos = this.getPosition(node);
    const endPos = this.getEndPosition(node);

    // Parse macro path
    const parts = macroNode.text.split('::');
    const name = parts.pop()!;
    const receiver = parts.join('::');

    const segment = this.createSegment(`${name}!`, true, [], pos.line, pos.column);

    return this.createCallChain(
      receiver,
      [segment],
      node.text,
      filePath,
      pos.line,
      pos.column,
      endPos.line,
      endPos.column,
      node
    );
  }

  /**
   * Normalize arguments from an arguments node
   */
  private normalizeArguments(argsNode: TreeSitterNode): NormalizedArg[] {
    const args: NormalizedArg[] = [];

    for (const child of argsNode.children) {
      if (child.type === '(' || child.type === ')' || child.type === ',') {
        continue;
      }

      args.push(this.normalizeArgument(child));
    }

    return args;
  }

  /**
   * Normalize a single argument
   */
  private normalizeArgument(node: TreeSitterNode): NormalizedArg {
    const pos = this.getPosition(node);

    switch (node.type) {
      case 'string_literal':
      case 'raw_string_literal':
        return this.createStringArg(node.text, pos.line, pos.column);

      case 'integer_literal':
      case 'float_literal':
        return this.createNumberArg(node.text, pos.line, pos.column);

      case 'boolean_literal':
        return this.createBooleanArg(node.text, pos.line, pos.column);

      case 'identifier':
        if (node.text === 'true' || node.text === 'false') {
          return this.createBooleanArg(node.text, pos.line, pos.column);
        }
        if (node.text === 'None') {
          return this.createUnknownArg('None', pos.line, pos.column);
        }
        return this.createIdentifierArg(node.text, pos.line, pos.column);

      case 'struct_expression':
        return this.normalizeStructExpression(node);

      case 'array_expression':
        return this.normalizeArrayExpression(node);

      case 'tuple_expression':
        return this.normalizeTupleExpression(node);

      case 'call_expression':
        return this.createUnknownArg(node.text, pos.line, pos.column);

      case 'closure_expression':
        return this.createUnknownArg(node.text, pos.line, pos.column);

      case 'reference_expression':
        // &value or &mut value
        return this.createUnknownArg(node.text, pos.line, pos.column);

      case 'field_expression':
        return this.createIdentifierArg(node.text, pos.line, pos.column);

      case 'scoped_identifier':
        return this.createIdentifierArg(node.text, pos.line, pos.column);

      default:
        return this.createUnknownArg(node.text, pos.line, pos.column);
    }
  }

  /**
   * Normalize a struct expression
   */
  private normalizeStructExpression(node: TreeSitterNode): NormalizedArg {
    const pos = this.getPosition(node);
    const properties: Record<string, NormalizedArg> = {};

    const bodyNode = this.getChildByField(node, 'body');
    if (bodyNode) {
      for (const child of bodyNode.children) {
        if (child.type === 'field_initializer') {
          const nameNode = this.getChildByField(child, 'name');
          const valueNode = this.getChildByField(child, 'value');

          if (nameNode && valueNode) {
            properties[nameNode.text] = this.normalizeArgument(valueNode);
          }
        } else if (child.type === 'shorthand_field_initializer') {
          const name = child.text;
          properties[name] = this.createIdentifierArg(name, pos.line, pos.column);
        }
      }
    }

    return this.createObjectArg(node.text, properties, pos.line, pos.column);
  }

  /**
   * Normalize an array expression
   */
  private normalizeArrayExpression(node: TreeSitterNode): NormalizedArg {
    const pos = this.getPosition(node);
    const elements: NormalizedArg[] = [];

    for (const child of node.children) {
      if (child.type !== '[' && child.type !== ']' && child.type !== ',' && child.type !== ';') {
        elements.push(this.normalizeArgument(child));
      }
    }

    return this.createArrayArg(node.text, elements, pos.line, pos.column);
  }

  /**
   * Normalize a tuple expression
   */
  private normalizeTupleExpression(node: TreeSitterNode): NormalizedArg {
    const pos = this.getPosition(node);
    const elements: NormalizedArg[] = [];

    for (const child of node.children) {
      if (child.type !== '(' && child.type !== ')' && child.type !== ',') {
        elements.push(this.normalizeArgument(child));
      }
    }

    return this.createArrayArg(node.text, elements, pos.line, pos.column);
  }

  /**
   * Mark all nodes in a chain as processed
   */
  private markChainNodesProcessed(node: TreeSitterNode, processed: Set<TreeSitterNode>): void {
    processed.add(node);
    for (const child of node.children) {
      if (child.type === 'call_expression' || child.type === 'field_expression') {
        this.markChainNodesProcessed(child, processed);
      }
    }
  }

  // ============================================================================
  // Function Extraction
  // ============================================================================

  extractFunctions(
    rootNode: TreeSitterNode,
    _source: string,
    filePath: string
  ): UnifiedFunction[] {
    const functions: UnifiedFunction[] = [];

    this.traverseNode(rootNode, node => {
      if (node.type === 'function_item') {
        const func = this.extractFunctionItem(node, filePath);
        if (func) functions.push(func);
      }
    });

    return functions;
  }

  private extractFunctionItem(
    node: TreeSitterNode,
    filePath: string
  ): UnifiedFunction | null {
    const nameNode = this.getChildByField(node, 'name');
    if (!nameNode) return null;

    const name = nameNode.text;
    const params = this.extractParameters(this.getChildByField(node, 'parameters'));
    const returnTypeNode = this.getChildByField(node, 'return_type');
    const returnType = returnTypeNode ? this.extractType(returnTypeNode) : undefined;
    const bodyNode = this.getChildByField(node, 'body');

    const isExported = this.hasVisibilityModifier(node, 'pub');
    const isAsync = this.hasModifier(node, 'async');
    const isConstructor = name === 'new' || name === 'default';

    const pos = this.getPosition(node);
    const endPos = this.getEndPosition(node);

    return this.createFunction({
      name,
      qualifiedName: name,
      file: filePath,
      startLine: pos.line,
      endLine: endPos.line,
      startColumn: pos.column,
      endColumn: endPos.column,
      parameters: params,
      returnType,
      isMethod: false,
      isStatic: true,
      isExported,
      isConstructor,
      isAsync,
      decorators: this.extractAttributes(node),
      bodyStartLine: bodyNode ? this.getPosition(bodyNode).line : pos.line,
      bodyEndLine: bodyNode ? this.getEndPosition(bodyNode).line : endPos.line,
    });
  }

  private extractParameters(paramsNode: TreeSitterNode | null): UnifiedParameter[] {
    if (!paramsNode) return [];

    const params: UnifiedParameter[] = [];

    for (const child of paramsNode.children) {
      if (child.type === 'parameter') {
        const patternNode = this.getChildByField(child, 'pattern');
        const typeNode = this.getChildByField(child, 'type');

        const name = patternNode?.text.replace(/^mut\s+/, '') ?? '_';
        const type = typeNode?.text;

        params.push(this.createParameter(name, type, false, false));
      } else if (child.type === 'self_parameter') {
        // Skip self parameters in the normalized output
        continue;
      }
    }

    return params;
  }

  private extractType(node: TreeSitterNode): string {
    if (node.type === 'return_type') {
      const typeChild = node.children.find(c => c.type !== '->');
      return typeChild?.text ?? node.text;
    }
    return node.text;
  }

  private hasVisibilityModifier(node: TreeSitterNode, modifier: string): boolean {
    for (const child of node.children) {
      if (child.type === 'visibility_modifier') {
        return child.text.startsWith(modifier);
      }
    }
    return false;
  }

  private hasModifier(node: TreeSitterNode, modifier: string): boolean {
    for (const child of node.children) {
      if (child.type === modifier || child.text === modifier) {
        return true;
      }
    }
    return false;
  }

  private extractAttributes(node: TreeSitterNode): string[] {
    const attrs: string[] = [];
    for (const child of node.children) {
      if (child.type === 'attribute_item' || child.type === 'inner_attribute_item') {
        attrs.push(child.text);
      }
    }
    return attrs;
  }

  // ============================================================================
  // Class (Struct/Enum/Trait) Extraction
  // ============================================================================

  extractClasses(
    rootNode: TreeSitterNode,
    _source: string,
    filePath: string
  ): UnifiedClass[] {
    const classes: UnifiedClass[] = [];

    this.traverseNode(rootNode, node => {
      if (node.type === 'struct_item') {
        const cls = this.extractStructItem(node, filePath);
        if (cls) classes.push(cls);
      } else if (node.type === 'enum_item') {
        const cls = this.extractEnumItem(node, filePath);
        if (cls) classes.push(cls);
      } else if (node.type === 'trait_item') {
        const cls = this.extractTraitItem(node, filePath);
        if (cls) classes.push(cls);
      }
    });

    return classes;
  }

  private extractStructItem(node: TreeSitterNode, filePath: string): UnifiedClass | null {
    const nameNode = this.getChildByField(node, 'name');
    if (!nameNode) return null;

    const name = nameNode.text;
    const isExported = this.hasVisibilityModifier(node, 'pub');

    const pos = this.getPosition(node);
    const endPos = this.getEndPosition(node);

    return this.createClass({
      name,
      file: filePath,
      startLine: pos.line,
      endLine: endPos.line,
      baseClasses: [],
      methods: [],
      isExported,
    });
  }

  private extractEnumItem(node: TreeSitterNode, filePath: string): UnifiedClass | null {
    const nameNode = this.getChildByField(node, 'name');
    if (!nameNode) return null;

    const name = nameNode.text;
    const isExported = this.hasVisibilityModifier(node, 'pub');

    const pos = this.getPosition(node);
    const endPos = this.getEndPosition(node);

    return this.createClass({
      name,
      file: filePath,
      startLine: pos.line,
      endLine: endPos.line,
      baseClasses: [],
      methods: [],
      isExported,
    });
  }

  private extractTraitItem(node: TreeSitterNode, filePath: string): UnifiedClass | null {
    const nameNode = this.getChildByField(node, 'name');
    if (!nameNode) return null;

    const name = nameNode.text;
    const isExported = this.hasVisibilityModifier(node, 'pub');

    const pos = this.getPosition(node);
    const endPos = this.getEndPosition(node);

    return this.createClass({
      name,
      file: filePath,
      startLine: pos.line,
      endLine: endPos.line,
      baseClasses: [],
      methods: [],
      isExported,
    });
  }

  // ============================================================================
  // Import Extraction
  // ============================================================================

  extractImports(
    rootNode: TreeSitterNode,
    _source: string,
    _filePath: string
  ): UnifiedImport[] {
    const imports: UnifiedImport[] = [];

    this.traverseNode(rootNode, node => {
      if (node.type === 'use_declaration') {
        const imp = this.extractUseDeclaration(node);
        if (imp) imports.push(imp);
      }
    });

    return imports;
  }

  private extractUseDeclaration(node: TreeSitterNode): UnifiedImport | null {
    const argNode = this.getChildByField(node, 'argument');
    if (!argNode) return null;

    const path = argNode.text;
    const { source, names } = this.parseUsePath(path);

    return this.createImport({
      source,
      names,
      line: this.getPosition(node).line,
      isTypeOnly: false,
    });
  }

  private parseUsePath(path: string): {
    source: string;
    names: Array<{ imported: string; local: string; isDefault: boolean; isNamespace: boolean }>;
  } {
    // Handle glob imports
    if (path.endsWith('::*')) {
      const source = path.slice(0, -3);
      return {
        source,
        names: [{ imported: '*', local: '*', isDefault: false, isNamespace: true }],
      };
    }

    // Handle grouped imports
    const groupMatch = path.match(/^(.+)::\{(.+)\}$/);
    if (groupMatch) {
      const source = groupMatch[1]!;
      const items = groupMatch[2]!.split(',').map(s => s.trim());
      const names = items.map(item => {
        const aliasMatch = item.match(/^(.+)\s+as\s+(.+)$/);
        if (aliasMatch) {
          return {
            imported: aliasMatch[1]!.trim(),
            local: aliasMatch[2]!.trim(),
            isDefault: false,
            isNamespace: false,
          };
        }
        return {
          imported: item,
          local: item,
          isDefault: false,
          isNamespace: item === 'self',
        };
      });
      return { source, names };
    }

    // Handle aliased imports
    const aliasMatch = path.match(/^(.+)\s+as\s+(.+)$/);
    if (aliasMatch) {
      const fullPath = aliasMatch[1]!.trim();
      const alias = aliasMatch[2]!.trim();
      const parts = fullPath.split('::');
      const imported = parts.pop()!;
      const source = parts.join('::');
      return {
        source: source || fullPath,
        names: [{ imported, local: alias, isDefault: false, isNamespace: false }],
      };
    }

    // Simple import
    const parts = path.split('::');
    const imported = parts.pop()!;
    const source = parts.join('::');
    return {
      source: source || path,
      names: [{ imported, local: imported, isDefault: false, isNamespace: false }],
    };
  }

  // ============================================================================
  // Export Extraction
  // ============================================================================

  extractExports(
    rootNode: TreeSitterNode,
    _source: string,
    _filePath: string
  ): UnifiedExport[] {
    const exports: UnifiedExport[] = [];

    // In Rust, pub items are exports
    this.traverseNode(rootNode, node => {
      if (node.type === 'use_declaration' && this.hasVisibilityModifier(node, 'pub')) {
        const argNode = this.getChildByField(node, 'argument');
        if (argNode) {
          const { source, names } = this.parseUsePath(argNode.text);
          for (const name of names) {
            exports.push(this.createExport({
              name: name.local,
              line: this.getPosition(node).line,
            }));
          }
        }
      }
    });

    return exports;
  }
}
```


---

## Phase 12: CLI & MCP Integration

### 12.1 CLI Command

```typescript
// packages/cli/src/commands/rust.ts

/**
 * Rust Analysis CLI Command
 *
 * Provides Rust-specific analysis commands:
 * - drift rust analyze - Full Rust analysis
 * - drift rust extractors - Show extractor status
 * - drift rust frameworks - Detect frameworks
 *
 * @requirements Rust Language Support
 */

import { Command } from 'commander';
import { createRustHybridExtractor } from '@drift/core/call-graph/extractors/rust-hybrid-extractor.js';
import { createRustDataAccessExtractor } from '@drift/core/call-graph/extractors/rust-data-access-extractor.js';
import { isRustTreeSitterAvailable } from '@drift/core/parsers/tree-sitter/rust-loader.js';

export function createRustCommand(): Command {
  const rust = new Command('rust')
    .description('Rust-specific analysis commands');

  rust
    .command('analyze')
    .description('Analyze Rust files in the project')
    .option('-p, --path <path>', 'Path to analyze', '.')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      console.log('🦀 Analyzing Rust files...\n');

      const extractor = createRustHybridExtractor();
      const dataAccessExtractor = createRustDataAccessExtractor();

      // Implementation would scan files and run extractors
      console.log('Tree-sitter available:', isRustTreeSitterAvailable());
      console.log('Analysis complete.');
    });

  rust
    .command('extractors')
    .description('Show Rust extractor status')
    .action(() => {
      console.log('🦀 Rust Extractor Status\n');
      console.log('Tree-sitter:', isRustTreeSitterAvailable() ? '✓ Available' : '✗ Not available');
      console.log('Regex fallback: ✓ Always available');
      console.log('\nSupported ORMs:');
      console.log('  - SQLx');
      console.log('  - Diesel');
      console.log('  - SeaORM');
      console.log('  - tokio-postgres');
      console.log('  - rusqlite');
      console.log('  - MongoDB');
      console.log('  - Redis');
    });

  rust
    .command('frameworks')
    .description('Detect Rust frameworks in the project')
    .option('-p, --path <path>', 'Path to analyze', '.')
    .action(async (options) => {
      console.log('🦀 Detecting Rust frameworks...\n');

      // Implementation would scan Cargo.toml and source files
      console.log('Detected frameworks:');
      console.log('  (Implementation pending)');
    });

  return rust;
}
```

### 12.2 MCP Tool

```typescript
// packages/mcp/src/tools/analysis/rust.ts

/**
 * Rust Analysis MCP Tool
 *
 * Provides Rust-specific analysis through MCP:
 * - drift_rust_analyze - Analyze Rust code
 * - drift_rust_data_access - Extract data access patterns
 * - drift_rust_frameworks - Detect frameworks
 *
 * @requirements Rust Language Support
 */

import { z } from 'zod';
import { createRustHybridExtractor } from '@drift/core/call-graph/extractors/rust-hybrid-extractor.js';
import { createRustDataAccessExtractor } from '@drift/core/call-graph/extractors/rust-data-access-extractor.js';
import { isRustTreeSitterAvailable } from '@drift/core/parsers/tree-sitter/rust-loader.js';

export const rustAnalyzeSchema = z.object({
  path: z.string().optional().describe('Path to analyze'),
  includeDataAccess: z.boolean().optional().describe('Include data access analysis'),
});

export type RustAnalyzeInput = z.infer<typeof rustAnalyzeSchema>;

export async function rustAnalyze(input: RustAnalyzeInput) {
  const { path = '.', includeDataAccess = true } = input;

  const extractor = createRustHybridExtractor();
  const dataAccessExtractor = createRustDataAccessExtractor();

  return {
    status: 'success',
    treeSitterAvailable: isRustTreeSitterAvailable(),
    path,
    // Results would be populated by actual analysis
    functions: [],
    calls: [],
    imports: [],
    dataAccess: includeDataAccess ? [] : undefined,
  };
}

export const rustDataAccessSchema = z.object({
  source: z.string().describe('Rust source code to analyze'),
  filePath: z.string().optional().describe('File path for context'),
});

export type RustDataAccessInput = z.infer<typeof rustDataAccessSchema>;

export async function rustDataAccess(input: RustDataAccessInput) {
  const { source, filePath = 'unknown.rs' } = input;

  const extractor = createRustDataAccessExtractor();
  const result = extractor.extract(source, filePath);

  return {
    status: 'success',
    file: result.file,
    accessPoints: result.accessPoints,
    errors: result.errors,
  };
}

export const rustFrameworksSchema = z.object({
  path: z.string().optional().describe('Path to analyze'),
});

export type RustFrameworksInput = z.infer<typeof rustFrameworksSchema>;

export async function rustFrameworks(input: RustFrameworksInput) {
  const { path = '.' } = input;

  // Implementation would scan Cargo.toml and detect frameworks
  return {
    status: 'success',
    path,
    frameworks: [],
    webFramework: null,
    ormFramework: null,
    asyncRuntime: null,
  };
}
```

---

## Phase 13: Testing Strategy

### 13.1 Test Files Structure

```
packages/core/src/
├── call-graph/extractors/__tests__/
│   ├── rust-extractor.test.ts
│   ├── rust-hybrid-extractor.test.ts
│   └── rust-data-access-extractor.test.ts
├── call-graph/extractors/regex/__tests__/
│   └── rust-regex.test.ts
├── unified-provider/__tests__/
│   └── rust-normalizer.test.ts
├── unified-provider/matching/__tests__/
│   ├── sqlx-matcher.test.ts
│   ├── diesel-matcher.test.ts
│   └── seaorm-matcher.test.ts
├── test-topology/extractors/__tests__/
│   └── rust-test-extractor.test.ts
└── test-topology/extractors/regex/__tests__/
    └── rust-test-regex.test.ts
```

### 13.2 Test Coverage Requirements

| Component | Coverage Target |
|-----------|-----------------|
| rust-extractor.ts | 90% |
| rust-regex.ts | 85% |
| rust-hybrid-extractor.ts | 85% |
| rust-data-access-extractor.ts | 90% |
| rust-normalizer.ts | 85% |
| sqlx-matcher.ts | 90% |
| diesel-matcher.ts | 90% |
| seaorm-matcher.ts | 90% |
| rust-test-regex.ts | 85% |

### 13.3 Test Scenarios

**Function Extraction:**
- Basic functions: `fn name() { }`
- Async functions: `async fn name() { }`
- Unsafe functions: `unsafe fn name() { }`
- Const functions: `const fn name() { }`
- Generic functions: `fn name<T: Clone>() { }`
- Functions with lifetimes: `fn name<'a>() { }`

**Method Extraction:**
- Impl methods: `impl Type { fn method(&self) { } }`
- Trait impl methods: `impl Trait for Type { fn method(&self) { } }`
- Associated functions: `impl Type { fn new() -> Self { } }`

**Data Access:**
- SQLx queries: `sqlx::query!("SELECT * FROM users")`
- Diesel operations: `users::table.filter(...).load(&conn)`
- SeaORM entities: `User::find().all(&db)`

**Test Detection:**
- `#[test]` functions
- `#[tokio::test]` async tests
- `#[should_panic]` tests
- Criterion benchmarks

---

## Implementation Timeline

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| 1 | Core Type Updates | 1 day |
| 2 | Tree-Sitter Parser Setup | 2 days |
| 3 | Rust-Specific Types | 1 day |
| 4 | Tree-Sitter Extractor | 3 days |
| 5 | Regex Fallback | 2 days |
| 6 | Hybrid Extractor | 1 day |
| 7 | Data Access Extraction | 3 days |
| 8 | Pattern Matchers | 2 days |
| 9 | Test Topology | 2 days |
| 10 | Framework Detectors | 2 days |
| 11 | Normalizer | 2 days |
| 12 | CLI & MCP Integration | 1 day |
| 13 | Testing | 3 days |

**Total Estimated Effort: ~25 days**

---

## Dependencies

### NPM Packages

```json
{
  "dependencies": {
    "tree-sitter-rust": "^0.21.0"
  }
}
```

### Rust Ecosystem Knowledge

The implementation requires understanding of:
- Rust syntax and semantics
- Common Rust frameworks (Actix-web, Axum, Rocket, Warp)
- Rust ORMs (SQLx, Diesel, SeaORM)
- Rust testing conventions
- Async Rust patterns

---

## Success Criteria

1. **Extraction Coverage**: ≥90% of Rust functions, structs, traits, and enums extracted
2. **Data Access Detection**: ≥85% of SQLx, Diesel, and SeaORM patterns detected
3. **Test Detection**: ≥90% of `#[test]` and async test functions detected
4. **Framework Detection**: Actix-web, Axum, Rocket, Warp patterns detected
5. **Performance**: <100ms extraction time for files under 1000 lines
6. **Fallback Reliability**: Regex fallback provides ≥70% coverage when tree-sitter unavailable

---

## Future Enhancements

1. **Macro Expansion**: Expand common macros for deeper analysis
2. **Trait Resolution**: Track trait implementations across files
3. **Lifetime Analysis**: Basic lifetime tracking for data flow
4. **Cargo.toml Integration**: Extract dependencies and features
5. **Workspace Support**: Handle Cargo workspaces with multiple crates
6. **Proc-Macro Detection**: Identify and categorize procedural macros
