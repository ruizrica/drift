/**
 * Violations Tab Constants
 * 
 * Centralized configuration for violation display and categorization.
 */

import type { Severity } from '../../types';

// ============================================================================
// Severity Configuration
// ============================================================================

export const SEVERITY_ORDER: Severity[] = ['error', 'warning', 'info', 'hint'];

export const SEVERITY_CONFIG: Record<Severity, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  priority: number;
}> = {
  error: {
    label: 'Error',
    icon: '🔴',
    color: 'text-severity-error',
    bgColor: 'bg-severity-error/10',
    borderColor: 'border-severity-error/30',
    description: 'Critical issues that must be fixed',
    priority: 4,
  },
  warning: {
    label: 'Warning',
    icon: '🟡',
    color: 'text-severity-warning',
    bgColor: 'bg-severity-warning/10',
    borderColor: 'border-severity-warning/30',
    description: 'Issues that should be addressed',
    priority: 3,
  },
  info: {
    label: 'Info',
    icon: '🔵',
    color: 'text-severity-info',
    bgColor: 'bg-severity-info/10',
    borderColor: 'border-severity-info/30',
    description: 'Informational notices',
    priority: 2,
  },
  hint: {
    label: 'Hint',
    icon: '💡',
    color: 'text-dark-muted',
    bgColor: 'bg-dark-muted/10',
    borderColor: 'border-dark-muted/30',
    description: 'Suggestions for improvement',
    priority: 1,
  },
};

// ============================================================================
// Category Configuration
// ============================================================================

export const CATEGORY_CONFIG: Record<string, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  priority: number;
}> = {
  security: {
    label: 'Security',
    icon: '🔒',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    description: 'Security vulnerabilities and risks',
    priority: 10,
  },
  auth: {
    label: 'Authentication',
    icon: '🔑',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    description: 'Authentication and authorization issues',
    priority: 9,
  },
  api: {
    label: 'API',
    icon: '🌐',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    description: 'API structure and consistency',
    priority: 8,
  },
  'data-access': {
    label: 'Data Access',
    icon: '💾',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    description: 'Database and data layer patterns',
    priority: 7,
  },
  errors: {
    label: 'Error Handling',
    icon: '⚠️',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    description: 'Error handling patterns',
    priority: 6,
  },
  structural: {
    label: 'Structure',
    icon: '🏗️',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    description: 'Code organization and architecture',
    priority: 5,
  },
  components: {
    label: 'Components',
    icon: '🧩',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    description: 'Component patterns and structure',
    priority: 4,
  },
  styling: {
    label: 'Styling',
    icon: '🎨',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    description: 'CSS and styling patterns',
    priority: 3,
  },
  performance: {
    label: 'Performance',
    icon: '⚡',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    description: 'Performance optimizations',
    priority: 2,
  },
  documentation: {
    label: 'Documentation',
    icon: '📝',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    description: 'Documentation and comments',
    priority: 1,
  },
  testing: {
    label: 'Testing',
    icon: '🧪',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    description: 'Testing patterns and coverage',
    priority: 1,
  },
  other: {
    label: 'Other',
    icon: '📋',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    description: 'Other violations',
    priority: 0,
  },
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_CONFIG).sort(
  (a, b) => CATEGORY_CONFIG[b].priority - CATEGORY_CONFIG[a].priority
);

// ============================================================================
// Display Limits
// ============================================================================

export const DISPLAY_LIMITS = {
  VIOLATIONS_PER_PAGE: 50,
  TOP_FILES: 5,
  TOP_PATTERNS: 5,
  TOP_CATEGORIES: 5,
  CODE_SNIPPET_LINES: 10,
  REALTIME_BUFFER: 100,
  GROUP_PREVIEW: 3,
} as const;

// ============================================================================
// View Mode Configuration
// ============================================================================

export const VIEW_MODE_CONFIG = {
  list: {
    label: 'List',
    icon: '📋',
    description: 'All violations in a flat list',
  },
  'by-severity': {
    label: 'By Severity',
    icon: '⚠️',
    description: 'Violations grouped by severity level',
  },
  'by-category': {
    label: 'By Category',
    icon: '📂',
    description: 'Violations grouped by category',
  },
  'by-file': {
    label: 'By File',
    icon: '📁',
    description: 'Violations grouped by file',
  },
  'by-pattern': {
    label: 'By Pattern',
    icon: '🔍',
    description: 'Violations grouped by pattern',
  },
} as const;
