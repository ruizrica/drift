/**
 * Pattern Tab Types
 * 
 * Enterprise-grade type definitions for pattern management.
 */

import type { Pattern, PatternCategory, PatternStatus } from '../../types';

// ============================================================================
// Aggregation Types
// ============================================================================

export interface PatternMetrics {
  totalLocations: number;
  totalOutliers: number;
  avgConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  complianceRate: number; // locations / (locations + outliers)
}

export interface DetectorGroup {
  id: string;
  detectorName: string;
  category: PatternCategory;
  patterns: Pattern[];
  metrics: PatternMetrics;
  statuses: Set<PatternStatus>;
  dominantStatus: PatternStatus;
}

export interface CategoryGroup {
  category: PatternCategory;
  label: string;
  description: string;
  icon: string;
  detectors: DetectorGroup[];
  metrics: PatternMetrics;
  patternCount: number;
}

// ============================================================================
// View State Types
// ============================================================================

export type ViewMode = 'grouped' | 'flat' | 'table';
export type SortField = 'name' | 'confidence' | 'locations' | 'outliers' | 'status' | 'category';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface PatternViewState {
  viewMode: ViewMode;
  sort: SortConfig;
  expandedCategories: Set<string>;
  expandedDetectors: Set<string>;
  selectedPatternId: string | null;
}

// ============================================================================
// Action Types
// ============================================================================

export type PatternAction = 
  | 'approve'
  | 'ignore'
  | 'delete'
  | 'edit'
  | 'copy-for-ai';

export interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

// ============================================================================
// Review Panel Types
// ============================================================================

export interface ReviewablePattern extends Pattern {
  reviewPriority: number; // Higher = more urgent
  reviewReason: string;
}

export interface ReviewSession {
  patterns: ReviewablePattern[];
  currentIndex: number;
  excludedIds: Set<string>;
  completedIds: Set<string>;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface PatternStatistics {
  total: number;
  byStatus: Record<PatternStatus, number>;
  byCategory: Record<PatternCategory, number>;
  byConfidenceLevel: {
    high: number;    // >= 0.95
    medium: number;  // >= 0.70
    low: number;     // >= 0.50
    uncertain: number; // < 0.50
  };
  needsReview: number;
  readyForApproval: number;
  totalOutliers: number;
  avgConfidence: number;
  complianceRate: number;
}
