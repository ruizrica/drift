/**
 * Contracts Components Index
 * 
 * Enterprise-grade BE↔FE contract management components.
 */

export { ContractsTab } from './ContractsTab';
export { ContractStats } from './ContractStats';
export { ContractFilters } from './ContractFilters';
export { ContractList } from './ContractList';
export { ContractDetail, ContractDetailEmpty } from './ContractDetail';

// Types
export type {
  ContractMetrics,
  EndpointGroup,
  MethodGroup,
  ViewMode,
  SortField,
  SortDirection,
  SortConfig,
  ContractViewState,
  ContractStatistics,
  MismatchSummary,
  ContractHealth,
  ContractAction,
  BulkVerifyResult,
} from './types';

// Utils
export {
  calculateMetrics,
  calculateStatistics,
  groupByEndpoint,
  groupByMethod,
  sortContracts,
  analyzeContractHealth,
  summarizeMismatches,
  formatEndpoint,
  formatFieldType,
  getConfidenceColor,
  formatPercentage,
} from './utils';

// Constants
export {
  METHOD_ORDER,
  METHOD_CONFIG,
  STATUS_CONFIG,
  MISMATCH_TYPE_CONFIG,
  DISPLAY_LIMITS,
  VIEW_MODE_CONFIG,
} from './constants';
