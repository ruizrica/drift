/**
 * Pattern Tab Constants
 * 
 * Centralized configuration for pattern display and categorization.
 */

import type { PatternCategory, PatternStatus } from '../../types';

// ============================================================================
// Category Configuration
// ============================================================================

export const CATEGORY_ORDER: PatternCategory[] = [
  'api', 'auth', 'security', 'errors', 'logging', 'data-access',
  'config', 'testing', 'performance', 'components', 'styling',
  'structural', 'types', 'accessibility', 'documentation', 
  'validation', 'error-handling', 'other'
];

export const CATEGORY_CONFIG: Record<PatternCategory, {
  label: string;
  icon: string;
  description: string;
  color: string;
}> = {
  'api': {
    label: 'API Patterns',
    icon: '🔌',
    description: 'HTTP routes, responses, and API communication patterns',
    color: 'text-blue-400',
  },
  'auth': {
    label: 'Authentication',
    icon: '🔐',
    description: 'Login, sessions, permissions, and access control',
    color: 'text-purple-400',
  },
  'security': {
    label: 'Security',
    icon: '🛡️',
    description: 'Input validation, sanitization, and security practices',
    color: 'text-red-400',
  },
  'errors': {
    label: 'Error Handling',
    icon: '⚠️',
    description: 'Error throwing, catching, and handling patterns',
    color: 'text-orange-400',
  },
  'logging': {
    label: 'Logging',
    icon: '📝',
    description: 'Console logs, debug statements, and logging conventions',
    color: 'text-gray-400',
  },
  'data-access': {
    label: 'Data Access',
    icon: '💾',
    description: 'Database queries, ORM usage, and data fetching',
    color: 'text-green-400',
  },
  'config': {
    label: 'Configuration',
    icon: '⚙️',
    description: 'Environment variables, settings, and config management',
    color: 'text-slate-400',
  },
  'testing': {
    label: 'Testing',
    icon: '🧪',
    description: 'Test structure, mocking patterns, and test utilities',
    color: 'text-cyan-400',
  },
  'performance': {
    label: 'Performance',
    icon: '⚡',
    description: 'Caching, memoization, and optimization patterns',
    color: 'text-yellow-400',
  },
  'components': {
    label: 'Components',
    icon: '🧩',
    description: 'React component structure, hooks, and state management',
    color: 'text-pink-400',
  },
  'styling': {
    label: 'Styling',
    icon: '🎨',
    description: 'CSS classes, design tokens, Tailwind usage, theming',
    color: 'text-fuchsia-400',
  },
  'structural': {
    label: 'Structural',
    icon: '📁',
    description: 'File naming, imports, exports, and code organization',
    color: 'text-amber-400',
  },
  'types': {
    label: 'Types',
    icon: '📋',
    description: 'TypeScript types, interfaces, and type definitions',
    color: 'text-indigo-400',
  },
  'accessibility': {
    label: 'Accessibility',
    icon: '♿',
    description: 'ARIA labels, keyboard navigation, screen reader support',
    color: 'text-teal-400',
  },
  'documentation': {
    label: 'Documentation',
    icon: '📚',
    description: 'Comments, JSDoc, README patterns',
    color: 'text-emerald-400',
  },
  'validation': {
    label: 'Validation',
    icon: '✅',
    description: 'Input validation, schema validation, and data checks',
    color: 'text-lime-400',
  },
  'error-handling': {
    label: 'Error Handling',
    icon: '🚨',
    description: 'Error boundaries, fallbacks, and recovery patterns',
    color: 'text-rose-400',
  },
  'other': {
    label: 'Other',
    icon: '📦',
    description: 'Patterns that don\'t fit other categories',
    color: 'text-neutral-400',
  },
};

// ============================================================================
// Status Configuration
// ============================================================================

export const STATUS_CONFIG: Record<PatternStatus, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  discovered: {
    label: 'Discovered',
    icon: '🔍',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    description: 'Newly detected pattern awaiting review',
  },
  approved: {
    label: 'Approved',
    icon: '✓',
    color: 'text-status-approved',
    bgColor: 'bg-status-approved/10 border-status-approved/20',
    description: 'Verified as an intentional pattern',
  },
  ignored: {
    label: 'Ignored',
    icon: '✗',
    color: 'text-dark-muted',
    bgColor: 'bg-dark-muted/10 border-dark-muted/20',
    description: 'Marked as not relevant or false positive',
  },
};

// ============================================================================
// Confidence Thresholds
// ============================================================================

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.95,
  MEDIUM: 0.70,
  LOW: 0.50,
} as const;

export const CONFIDENCE_CONFIG = {
  high: {
    label: 'High Confidence',
    color: 'text-status-approved',
    bgColor: 'bg-status-approved/10',
    threshold: CONFIDENCE_THRESHOLDS.HIGH,
  },
  medium: {
    label: 'Medium Confidence',
    color: 'text-severity-warning',
    bgColor: 'bg-severity-warning/10',
    threshold: CONFIDENCE_THRESHOLDS.MEDIUM,
  },
  low: {
    label: 'Low Confidence',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    threshold: CONFIDENCE_THRESHOLDS.LOW,
  },
  uncertain: {
    label: 'Uncertain',
    color: 'text-severity-error',
    bgColor: 'bg-severity-error/10',
    threshold: 0,
  },
} as const;

// ============================================================================
// Display Limits
// ============================================================================

export const DISPLAY_LIMITS = {
  LOCATIONS_PREVIEW: 20,
  OUTLIERS_PREVIEW: 10,
  QUICK_REVIEW_LOCATIONS: 3,
  QUICK_REVIEW_OUTLIERS: 5,
  NEEDS_REVIEW_OUTLIERS: 15,
  NEEDS_REVIEW_LOCATIONS: 5,
  REALTIME_VIOLATIONS: 100,
} as const;
