/**
 * Violations Tab Types
 * 
 * Enterprise-grade type definitions for violation management.
 */

import type { Violation, Severity } from '../../types';

// ============================================================================
// Aggregation Types
// ============================================================================

export interface ViolationMetrics {
  total: number;
  bySeverity: Record<Severity, number>;
  byPattern: Record<string, number>;
  byFile: Record<string, number>;
  byCategory: Record<string, number>;
  criticalCount: number; // errors + warnings
}

export interface FileGroup {
  file: string;
  violations: Violation[];
  metrics: {
    total: number;
    bySeverity: Record<Severity, number>;
    maxSeverity: Severity;
  };
}

export interface PatternGroup {
  patternId: string;
  patternName: string;
  violations: Violation[];
  metrics: {
    total: number;
    bySeverity: Record<Severity, number>;
    affectedFiles: number;
  };
}

export interface CategoryGroup {
  category: string;
  displayName: string;
  icon: string;
  violations: Violation[];
  metrics: {
    total: number;
    bySeverity: Record<Severity, number>;
    affectedFiles: number;
    patterns: string[];
  };
}

export interface SeverityGroup {
  severity: Severity;
  violations: Violation[];
  categories: CategoryGroup[];
}

// ============================================================================
// View State Types
// ============================================================================

export type ViewMode = 'list' | 'by-file' | 'by-pattern' | 'by-category' | 'by-severity';
export type SortField = 'severity' | 'file' | 'pattern' | 'line' | 'category';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface ViolationViewState {
  viewMode: ViewMode;
  sort: SortConfig;
  expandedViolations: Set<string>;
  expandedGroups: Set<string>;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface ViolationStatistics {
  total: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<string, number>;
  byPattern: Map<string, { name: string; count: number }>;
  affectedFiles: number;
  topFiles: Array<{ file: string; count: number }>;
  topPatterns: Array<{ id: string; name: string; count: number }>;
  topCategories: Array<{ category: string; count: number; icon: string }>;
  realtimeCount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// ============================================================================
// Action Types
// ============================================================================

export type ViolationAction = 
  | 'fix'
  | 'ignore'
  | 'copy-for-ai'
  | 'view-pattern'
  | 'open-file';

export interface BulkFixResult {
  success: boolean;
  fixed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}
