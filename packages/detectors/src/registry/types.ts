/**
 * Registry type definitions
 *
 * Defines detector metadata types for the detector registry system.
 * These types are used to describe and categorize detectors.
 *
 * @requirements 6.1 - THE Detector_System SHALL define a BaseDetector interface that all detectors implement
 */

import type { PatternCategory, Language } from 'driftdetect-core';

// ============================================================================
// Detection Method Types
// ============================================================================

/**
 * Detection methods supported by the detector system
 *
 * - ast: AST-based detection using parsed syntax trees
 * - regex: Regular expression-based text pattern matching
 * - semantic: Semantic analysis using type information and symbol resolution
 * - structural: File/directory structure analysis
 * - custom: Custom detection logic
 *
 * @requirements 6.4 - THE Detector_System SHALL support detection methods: ast, regex, semantic, structural, and custom
 */
export type DetectionMethod = 'ast' | 'regex' | 'semantic' | 'structural' | 'custom';

/**
 * Array of all valid detection methods for validation
 */
export const DETECTION_METHODS: DetectionMethod[] = [
  'ast',
  'regex',
  'semantic',
  'structural',
  'custom',
];

// ============================================================================
// Detector Info Types
// ============================================================================

/**
 * Detector metadata interface
 *
 * Contains all metadata about a detector including its identity,
 * categorization, and capabilities. This interface is used by the
 * registry to manage and query detectors.
 *
 * @requirements 6.1 - THE Detector_System SHALL define a BaseDetector interface that all detectors implement
 * @requirements 6.3 - THE Detector SHALL declare its category, supported languages, and detection method
 */
export interface DetectorInfo {
  /** Unique detector identifier (e.g., 'structural/file-naming') */
  id: string;

  /** Detector category matching PatternCategory from driftdetect-core */
  category: PatternCategory;

  /** Detector subcategory for more specific classification (e.g., 'naming-conventions') */
  subcategory: string;

  /** Human-readable name for display (e.g., 'File Naming Convention Detector') */
  name: string;

  /** Detailed description of what the detector does */
  description: string;

  /** Languages this detector supports */
  supportedLanguages: Language[];

  /** How this detector performs detection */
  detectionMethod: DetectionMethod;
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Detector registration options
 *
 * Options that can be provided when registering a detector
 */
export interface DetectorRegistrationOptions {
  /** Whether to override an existing detector with the same ID */
  override?: boolean;

  /** Priority for this detector (higher = runs first when multiple detectors match) */
  priority?: number;

  /** Whether this detector is enabled by default */
  enabled?: boolean;
}

/**
 * Registered detector entry in the registry
 *
 * Contains the detector info plus registration metadata
 */
export interface RegisteredDetector {
  /** Detector metadata */
  info: DetectorInfo;

  /** Registration priority (default: 0) */
  priority: number;

  /** Whether the detector is enabled */
  enabled: boolean;

  /** Timestamp when the detector was registered */
  registeredAt: Date;
}

/**
 * Query options for finding detectors in the registry
 */
export interface DetectorQuery {
  /** Filter by category */
  category?: PatternCategory;

  /** Filter by subcategory */
  subcategory?: string;

  /** Filter by supported language */
  language?: Language;

  /** Filter by detection method */
  detectionMethod?: DetectionMethod;

  /** Filter by enabled status */
  enabled?: boolean;

  /** Only return detectors with IDs matching this pattern */
  idPattern?: string | RegExp;
}

/**
 * Result of a detector query
 */
export interface DetectorQueryResult {
  /** Matching detectors */
  detectors: RegisteredDetector[];

  /** Total count of matching detectors */
  count: number;
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

/**
 * Re-export PatternCategory and Language from driftdetect-core for convenience
 * so consumers don't need to import from multiple packages
 */
export type { PatternCategory, Language } from 'driftdetect-core';
