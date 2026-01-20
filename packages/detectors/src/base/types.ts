/**
 * Base detector type definitions
 */

import type { PatternMatch, Violation } from 'driftdetect-core';

export interface DetectionContext {
  /** File being analyzed */
  file: string;
  /** File content */
  content: string;
  /** Parsed AST (if available) */
  ast: unknown | null;
  /** Import information */
  imports: ImportInfo[];
  /** Export information */
  exports: ExportInfo[];
  /** Project-wide context */
  projectContext: ProjectContext;
}

export interface ImportInfo {
  /** Module being imported */
  module: string;
  /** Named imports */
  namedImports: string[];
  /** Default import name */
  defaultImport?: string;
  /** Whether it's a type-only import */
  isTypeOnly: boolean;
}

export interface ExportInfo {
  /** Export name */
  name: string;
  /** Whether it's a default export */
  isDefault: boolean;
  /** Whether it's a type-only export */
  isTypeOnly: boolean;
}

export interface ProjectContext {
  /** Root directory */
  rootDir: string;
  /** All project files */
  files: string[];
  /** Configuration */
  config: Record<string, unknown>;
}

export interface DetectionResult {
  /** Patterns found */
  patterns: PatternMatch[];
  /** Violations found */
  violations: Violation[];
  /** Overall confidence */
  confidence: number;
}
