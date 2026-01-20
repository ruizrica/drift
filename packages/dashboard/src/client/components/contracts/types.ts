/**
 * Contracts Tab Types
 * 
 * Enterprise-grade type definitions for BE↔FE contract management.
 */

import type { Contract, ContractStatus, HttpMethod, FieldMismatch } from '../../types';

// ============================================================================
// Aggregation Types
// ============================================================================

export interface ContractMetrics {
  total: number;
  byStatus: Record<ContractStatus, number>;
  byMethod: Record<HttpMethod, number>;
  totalMismatches: number;
  mismatchesByType: Record<string, number>;
  verifiedRate: number;
  healthScore: number; // 0-100
}

export interface EndpointGroup {
  basePath: string;
  contracts: Contract[];
  metrics: {
    total: number;
    mismatches: number;
    verified: number;
  };
}

export interface MethodGroup {
  method: HttpMethod;
  contracts: Contract[];
  metrics: {
    total: number;
    mismatches: number;
  };
}

// ============================================================================
// View State Types
// ============================================================================

export type ViewMode = 'list' | 'by-endpoint' | 'by-method';
export type SortField = 'endpoint' | 'method' | 'status' | 'mismatches' | 'confidence';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface ContractViewState {
  viewMode: ViewMode;
  sort: SortConfig;
  selectedContractId: string | null;
  expandedGroups: Set<string>;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface ContractStatistics {
  total: number;
  byStatus: Record<ContractStatus, number>;
  byMethod: Record<HttpMethod, number>;
  totalMismatches: number;
  mismatchesByType: Record<string, number>;
  mismatchesBySeverity: {
    error: number;
    warning: number;
    info: number;
  };
  topMismatchedEndpoints: Array<{ endpoint: string; method: HttpMethod; count: number }>;
  verifiedRate: number;
  healthScore: number;
}

// ============================================================================
// Mismatch Analysis Types
// ============================================================================

export interface MismatchSummary {
  type: FieldMismatch['mismatchType'];
  count: number;
  severity: 'error' | 'warning' | 'info';
  description: string;
}

export interface ContractHealth {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
}

// ============================================================================
// Action Types
// ============================================================================

export type ContractAction = 
  | 'verify'
  | 'ignore'
  | 'copy-for-ai'
  | 'view-backend'
  | 'view-frontend';

export interface BulkVerifyResult {
  success: boolean;
  verified: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}
