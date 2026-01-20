/**
 * LSP-specific type definitions for Drift
 *
 * These types bridge driftdetect-core types with LSP protocol types.
 * They maintain compatibility with vscode-languageserver while
 * providing Drift-specific extensions.
 *
 * @requirements 27.1-27.6, 28.1-28.9
 */

import type {
  Violation,
  QuickFix,
  Range,
  Position,
  Severity,
  WorkspaceEdit as CoreWorkspaceEdit,
} from 'driftdetect-core';

// ============================================================================
// Re-export core types for convenience
// ============================================================================

export type { Range, Position, Severity };

// ============================================================================
// LSP Location Type
// ============================================================================

/**
 * Location in a document (LSP compatible)
 */
export interface Location {
  uri: string;
  range: Range;
}

// ============================================================================
// Diagnostic Types
// ============================================================================

/**
 * Diagnostic severity mapping to LSP DiagnosticSeverity numbers
 * LSP: 1 = Error, 2 = Warning, 3 = Information, 4 = Hint
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

/**
 * Drift diagnostic - extends LSP Diagnostic with Drift-specific data
 */
export interface DriftDiagnostic {
  /** Unique violation identifier */
  violationId: string;

  /** Pattern that was violated */
  patternId: string;

  /** Severity level */
  severity: DiagnosticSeverity;

  /** Human-readable message */
  message: string;

  /** Range in the document */
  range: Range;

  /** Source identifier (always 'drift') */
  source: string;

  /** Code (pattern ID for navigation) */
  code: string;

  /** Related information for multi-location diagnostics */
  relatedInformation?: DiagnosticRelatedInformation[];

  /** Available quick fixes */
  quickFixes: DriftQuickFix[];

  /** Additional data for code actions */
  data?: DiagnosticData;
}

/**
 * Related information for diagnostics
 */
export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

/**
 * Additional diagnostic data for code actions and commands
 */
export interface DiagnosticData {
  violationId: string;
  patternId: string;
  file: string;
  confidence?: number | undefined;
  expected?: string | undefined;
  actual?: string | undefined;
  aiExplainAvailable?: boolean | undefined;
  aiFixAvailable?: boolean | undefined;
}

// ============================================================================
// Quick Fix Types
// ============================================================================

/**
 * Drift quick fix - LSP compatible code action
 */
export interface DriftQuickFix {
  /** Human-readable title */
  title: string;

  /** Whether this is the preferred fix */
  isPreferred: boolean;

  /** Kind of code action */
  kind: CodeActionKind;

  /** Workspace edit to apply */
  edit: WorkspaceEdit;

  /** Optional command to execute after edit */
  command?: Command;

  /** Confidence score (0-1) */
  confidence?: number;
}

/**
 * Code action kinds supported by Drift
 */
export type CodeActionKind = 'quickfix' | 'refactor' | 'source';

/**
 * Workspace edit (LSP compatible)
 */
export interface WorkspaceEdit {
  changes?: Record<string, TextEdit[]>;
}

/**
 * Text edit (LSP compatible)
 */
export interface TextEdit {
  range: Range;
  newText: string;
}

// ============================================================================
// Command Types
// ============================================================================

/**
 * LSP Command
 */
export interface Command {
  title: string;
  command: string;
  arguments?: unknown[];
}

/**
 * Result of executing a command
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

// ============================================================================
// Server State Types
// ============================================================================

/**
 * Server state - tracks all runtime state
 */
export interface ServerState {
  /** Whether server has been initialized */
  initialized: boolean;

  /** Workspace folders being tracked */
  workspaceFolders: WorkspaceFolder[];

  /** Open documents */
  documents: Map<string, DocumentState>;

  /** Diagnostics by document URI */
  diagnostics: Map<string, DriftDiagnostic[]>;

  /** Known patterns */
  patterns: Map<string, PatternInfo>;

  /** Violations by document URI */
  violations: Map<string, ViolationInfo[]>;

  /** Server configuration */
  configuration: ServerConfiguration;
}

/**
 * Workspace folder
 */
export interface WorkspaceFolder {
  uri: string;
  name: string;
}

/**
 * Document state for open documents
 */
export interface DocumentState {
  uri: string;
  content: string;
  version: number;
  languageId: string;
  isDirty: boolean;
  lastScanTime: number | undefined;
  cachedViolations: ViolationInfo[] | undefined;
}

/**
 * Pattern information for display
 */
export interface PatternInfo {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  confidence?: number;
  frequency?: number;
  severity?: Severity;
  autoFixable?: boolean;
}

/**
 * Violation information - simplified from driftdetect-core Violation
 * Uses range instead of location for LSP compatibility
 */
export interface ViolationInfo {
  id: string;
  patternId: string;
  message: string;
  severity: string;
  file: string;
  range: Range;
  expected?: string | undefined;
  actual?: string | undefined;
  explanation?: string | undefined;
  quickFix?: QuickFixInfo | undefined;
  aiExplainAvailable?: boolean | undefined;
  aiFixAvailable?: boolean | undefined;
  confidence?: number | undefined;
}

/**
 * Quick fix information
 */
export interface QuickFixInfo {
  title: string;
  isPreferred: boolean;
  confidence: number;
}

/**
 * Server configuration
 */
export interface ServerConfiguration {
  /** Enable/disable diagnostics */
  diagnosticsEnabled: boolean;

  /** Delay before publishing diagnostics (ms) */
  diagnosticDelay: number;

  /** Enable/disable code lens */
  codeLensEnabled: boolean;

  /** Enable/disable hover */
  hoverEnabled: boolean;

  /** Maximum diagnostics per file */
  maxDiagnosticsPerFile: number;

  /** Minimum confidence to show violations */
  minConfidence: number;

  /** Severity mapping overrides */
  severityMapping: SeverityMapping;

  /** Enable AI features */
  aiEnabled: boolean;

  /** File patterns to exclude */
  excludePatterns: string[];
}

/**
 * Severity mapping configuration
 */
export interface SeverityMapping {
  error: DiagnosticSeverity;
  warning: DiagnosticSeverity;
  info: DiagnosticSeverity;
  hint: DiagnosticSeverity;
}

// ============================================================================
// Code Lens Types
// ============================================================================

/**
 * Drift code lens
 */
export interface DriftCodeLens {
  range: Range;
  command?: Command;
  data?: CodeLensData;
}

/**
 * Code lens data for deferred resolution
 */
export interface CodeLensData {
  patternId?: string;
  violationId?: string;
  violationCount?: number;
  confidence?: number;
  uri: string;
}

// ============================================================================
// Capability Options
// ============================================================================

/**
 * Server capability options
 */
export interface ServerCapabilityOptions {
  textDocumentSync?: boolean | number;
  hover?: boolean;
  codeActions?: boolean;
  codeLens?: boolean;
  executeCommand?: boolean;
  commands?: readonly string[];
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert driftdetect-core Violation to ViolationInfo
 */
export function violationToInfo(violation: Violation): ViolationInfo {
  return {
    id: violation.id,
    patternId: violation.patternId,
    message: violation.message,
    severity: violation.severity,
    file: violation.file,
    range: violation.range,
    expected: violation.expected,
    actual: violation.actual,
    explanation: violation.explanation,
    quickFix: violation.quickFix
      ? {
          title: violation.quickFix.title,
          isPreferred: violation.quickFix.isPreferred,
          confidence: violation.quickFix.confidence,
        }
      : undefined,
    aiExplainAvailable: violation.aiExplainAvailable,
    aiFixAvailable: violation.aiFixAvailable,
  };
}

/**
 * Convert ViolationInfo to DriftDiagnostic
 */
export function violationToLspDiagnostic(
  violation: ViolationInfo,
  _pattern?: PatternInfo
): DriftDiagnostic {
  const quickFixes: DriftQuickFix[] = [];

  // Add quick fix if available
  if (violation.quickFix) {
    quickFixes.push({
      title: violation.quickFix.title,
      isPreferred: violation.quickFix.isPreferred,
      kind: 'quickfix',
      edit: { changes: {} },
      confidence: violation.quickFix.confidence,
    });
  }

  return {
    violationId: violation.id,
    patternId: violation.patternId,
    severity: mapSeverity(violation.severity),
    message: violation.message,
    range: violation.range,
    source: 'drift',
    code: violation.patternId,
    quickFixes,
    data: {
      violationId: violation.id,
      patternId: violation.patternId,
      file: violation.file,
      confidence: violation.confidence,
      expected: violation.expected,
      actual: violation.actual,
      aiExplainAvailable: violation.aiExplainAvailable,
      aiFixAvailable: violation.aiFixAvailable,
    },
  };
}

/**
 * Map severity string to DiagnosticSeverity
 */
export function mapSeverity(severity: string): DiagnosticSeverity {
  switch (severity.toLowerCase()) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
    case 'information':
      return 'info';
    case 'hint':
    default:
      return 'hint';
  }
}

/**
 * Convert DiagnosticSeverity to LSP severity number
 * LSP: 1 = Error, 2 = Warning, 3 = Information, 4 = Hint
 */
export function severityToNumber(severity: DiagnosticSeverity): number {
  switch (severity) {
    case 'error':
      return 1;
    case 'warning':
      return 2;
    case 'info':
      return 3;
    case 'hint':
      return 4;
  }
}

/**
 * Convert LSP severity number to DiagnosticSeverity
 */
export function numberToSeverity(num: number): DiagnosticSeverity {
  switch (num) {
    case 1:
      return 'error';
    case 2:
      return 'warning';
    case 3:
      return 'info';
    case 4:
    default:
      return 'hint';
  }
}

/**
 * Convert driftdetect-core QuickFix to DriftQuickFix
 */
export function quickFixToLsp(quickFix: QuickFix, _uri: string): DriftQuickFix {
  const changes: Record<string, TextEdit[]> = {};

  // Convert workspace edit
  if (quickFix.edit.changes) {
    for (const [fileUri, edits] of Object.entries(quickFix.edit.changes)) {
      changes[fileUri] = edits.map((edit) => ({
        range: edit.range,
        newText: edit.newText,
      }));
    }
  }

  return {
    title: quickFix.title,
    isPreferred: quickFix.isPreferred,
    kind: quickFix.kind as CodeActionKind,
    edit: { changes },
    confidence: quickFix.confidence,
  };
}

/**
 * Convert driftdetect-core WorkspaceEdit to LSP WorkspaceEdit
 */
export function workspaceEditToLsp(edit: CoreWorkspaceEdit): WorkspaceEdit {
  const changes: Record<string, TextEdit[]> = {};

  if (edit.changes) {
    for (const [uri, edits] of Object.entries(edit.changes)) {
      changes[uri] = edits.map((e) => ({
        range: e.range,
        newText: e.newText,
      }));
    }
  }

  return { changes };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create default server configuration
 */
export function createDefaultConfiguration(): ServerConfiguration {
  return {
    diagnosticsEnabled: true,
    diagnosticDelay: 200,
    codeLensEnabled: true,
    hoverEnabled: true,
    maxDiagnosticsPerFile: 100,
    minConfidence: 0.5,
    severityMapping: {
      error: 'error',
      warning: 'warning',
      info: 'info',
      hint: 'hint',
    },
    aiEnabled: false,
    excludePatterns: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
  };
}

/**
 * Create initial server state
 */
export function createInitialState(): ServerState {
  return {
    initialized: false,
    workspaceFolders: [],
    documents: new Map(),
    diagnostics: new Map(),
    patterns: new Map(),
    violations: new Map(),
    configuration: createDefaultConfiguration(),
  };
}

/**
 * Create empty document state
 */
export function createDocumentState(
  uri: string,
  content: string,
  version: number,
  languageId: string
): DocumentState {
  return {
    uri,
    content,
    version,
    languageId,
    isDirty: false,
    lastScanTime: undefined,
    cachedViolations: undefined,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a position is within a range
 */
export function isPositionInRange(position: Position, range: Range): boolean {
  const { line, character } = position;
  const { start, end } = range;

  if (line < start.line || line > end.line) {
    return false;
  }

  if (line === start.line && character < start.character) {
    return false;
  }

  if (line === end.line && character > end.character) {
    return false;
  }

  return true;
}

/**
 * Check if two ranges overlap
 */
export function rangesOverlap(a: Range, b: Range): boolean {
  // a ends before b starts
  if (a.end.line < b.start.line) {
    return false;
  }
  if (a.end.line === b.start.line && a.end.character < b.start.character) {
    return false;
  }

  // b ends before a starts
  if (b.end.line < a.start.line) {
    return false;
  }
  if (b.end.line === a.start.line && b.end.character < a.start.character) {
    return false;
  }

  return true;
}

/**
 * Get file name from URI
 */
export function getFileName(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] ?? uri;
}

/**
 * Format position for display
 */
export function formatPosition(position: Position): string {
  return `${position.line + 1}:${position.character + 1}`;
}

/**
 * Format range for display
 */
export function formatRange(range: Range): string {
  if (range.start.line === range.end.line) {
    return `line ${range.start.line + 1}`;
  }
  return `lines ${range.start.line + 1}-${range.end.line + 1}`;
}
