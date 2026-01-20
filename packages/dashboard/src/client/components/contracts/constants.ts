/**
 * Contracts Tab Constants
 * 
 * Centralized configuration for contract display and categorization.
 */

import type { ContractStatus, HttpMethod, FieldMismatch } from '../../types';

// ============================================================================
// HTTP Method Configuration
// ============================================================================

export const METHOD_ORDER: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export const METHOD_CONFIG: Record<HttpMethod, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  GET: {
    label: 'GET',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    description: 'Retrieve data',
  },
  POST: {
    label: 'POST',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    description: 'Create new resource',
  },
  PUT: {
    label: 'PUT',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    description: 'Replace resource',
  },
  PATCH: {
    label: 'PATCH',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    description: 'Partial update',
  },
  DELETE: {
    label: 'DELETE',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    description: 'Remove resource',
  },
};

// ============================================================================
// Status Configuration
// ============================================================================

export const STATUS_CONFIG: Record<ContractStatus, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  discovered: {
    label: 'Discovered',
    icon: '🔍',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    description: 'Newly detected contract',
  },
  verified: {
    label: 'Verified',
    icon: '✓',
    color: 'text-status-approved',
    bgColor: 'bg-status-approved/10',
    borderColor: 'border-status-approved/20',
    description: 'Confirmed as correct',
  },
  mismatch: {
    label: 'Mismatch',
    icon: '⚠️',
    color: 'text-severity-error',
    bgColor: 'bg-severity-error/10',
    borderColor: 'border-severity-error/20',
    description: 'Type mismatches detected',
  },
  ignored: {
    label: 'Ignored',
    icon: '✗',
    color: 'text-dark-muted',
    bgColor: 'bg-dark-muted/10',
    borderColor: 'border-dark-muted/20',
    description: 'Marked as not relevant',
  },
};

// ============================================================================
// Mismatch Type Configuration
// ============================================================================

export const MISMATCH_TYPE_CONFIG: Record<FieldMismatch['mismatchType'], {
  label: string;
  icon: string;
  color: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
}> = {
  missing_in_frontend: {
    label: 'Missing in Frontend',
    icon: '🔴',
    color: 'text-severity-error',
    description: 'Backend returns field that frontend doesn\'t expect',
    severity: 'error',
  },
  missing_in_backend: {
    label: 'Missing in Backend',
    icon: '🟡',
    color: 'text-severity-warning',
    description: 'Frontend expects field that backend doesn\'t return',
    severity: 'warning',
  },
  type_mismatch: {
    label: 'Type Mismatch',
    icon: '⚠️',
    color: 'text-severity-error',
    description: 'Field types don\'t match between BE and FE',
    severity: 'error',
  },
  optionality_mismatch: {
    label: 'Optionality Mismatch',
    icon: '❓',
    color: 'text-severity-warning',
    description: 'Optional/required status differs',
    severity: 'warning',
  },
  nullability_mismatch: {
    label: 'Nullability Mismatch',
    icon: '∅',
    color: 'text-severity-info',
    description: 'Nullable status differs',
    severity: 'info',
  },
};

// ============================================================================
// Display Limits
// ============================================================================

export const DISPLAY_LIMITS = {
  CONTRACTS_PER_PAGE: 50,
  FIELDS_PREVIEW: 10,
  MISMATCHES_PREVIEW: 5,
  FRONTEND_CALLS_PREVIEW: 5,
  TOP_MISMATCHED: 5,
} as const;

// ============================================================================
// View Mode Configuration
// ============================================================================

export const VIEW_MODE_CONFIG = {
  list: {
    label: 'List',
    icon: '📋',
    description: 'All contracts in a flat list',
  },
  'by-endpoint': {
    label: 'By Endpoint',
    icon: '🔗',
    description: 'Contracts grouped by base path',
  },
  'by-method': {
    label: 'By Method',
    icon: '📡',
    description: 'Contracts grouped by HTTP method',
  },
} as const;
