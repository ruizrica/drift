/**
 * Violations Components Index
 * 
 * Enterprise-grade violation management components.
 */

export { ViolationsTab } from './ViolationsTab';
export { ViolationStats } from './ViolationStats';
export { ViolationFilters } from './ViolationFilters';
export { ViolationList } from './ViolationList';

// Types
export type {
  ViolationMetrics,
  FileGroup,
  PatternGroup,
  ViewMode,
  SortField,
  SortDirection,
  SortConfig,
  ViolationViewState,
  ViolationStatistics,
  ViolationAction,
  BulkFixResult,
} from './types';

// Utils
export {
  calculateMetrics,
  calculateStatistics,
  groupByFile,
  groupByPattern,
  sortViolations,
  getSeverityPriority,
  getMaxSeverity,
  getSeverityColor,
  getSeverityBgColor,
  formatFilePath,
  formatLineRange,
  getFileName,
  mergeViolations,
} from './utils';

// Constants
export {
  SEVERITY_ORDER,
  SEVERITY_CONFIG,
  DISPLAY_LIMITS,
  VIEW_MODE_CONFIG,
} from './constants';
