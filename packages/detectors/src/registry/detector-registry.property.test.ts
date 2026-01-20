/**
 * Property-based tests for DetectorRegistry
 *
 * **Property 4: Detector Registry Uniqueness**
 * Duplicate id registration SHALL fail
 *
 * **Validates: Requirements 6.1, 6.2**
 *
 * @requirements 6.1 - THE Detector_System SHALL define a BaseDetector interface that all detectors implement
 * @requirements 6.2 - THE Detector_System SHALL provide a registry for detector discovery and management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import type { PatternCategory, Language, Violation, QuickFix } from 'driftdetect-core';
import {
  DetectorRegistry,
  DetectorRegistrationError,
} from './detector-registry.js';
import { BaseDetector, type DetectionContext, type DetectionResult } from '../base/base-detector.js';
import type { DetectionMethod } from './types.js';

// ============================================================================
// Arbitrary Generators
// ============================================================================

/**
 * Generate valid detector ID segments (lowercase letters, numbers, hyphens)
 */
const detectorIdSegmentArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
    minLength: 1,
    maxLength: 20,
  })
  .filter((s) => /^[a-z][a-z0-9-]*$/.test(s));

/**
 * Generate valid detector IDs in format: category/name
 */
const detectorIdArb = fc
  .tuple(detectorIdSegmentArb, detectorIdSegmentArb)
  .map(([category, name]) => `${category}/${name}`);

/**
 * Generate valid pattern categories
 */
const categoryArb = fc.constantFrom<PatternCategory>(
  'structural',
  'components',
  'styling',
  'api',
  'auth',
  'errors',
  'data-access',
  'testing',
  'logging',
  'security',
  'config',
  'types',
  'performance',
  'accessibility',
  'documentation'
);

/**
 * Generate valid languages
 */
const languageArb = fc.constantFrom<Language>(
  'typescript',
  'javascript',
  'python',
  'css',
  'scss',
  'json',
  'yaml',
  'markdown',
  'html'
);

/**
 * Generate valid detection methods
 */
const detectionMethodArb = fc.constantFrom<DetectionMethod>(
  'ast',
  'regex',
  'semantic',
  'structural',
  'custom'
);

/**
 * Generate arrays of unique languages
 */
const languagesArb = fc.uniqueArray(languageArb, { minLength: 1, maxLength: 5 });

// ============================================================================
// Test Detector Factory
// ============================================================================

/**
 * Create a test detector with the given properties
 */
function createTestDetector(
  id: string,
  category: PatternCategory = 'structural',
  subcategory: string = 'testing',
  supportedLanguages: Language[] = ['typescript'],
  detectionMethod: DetectionMethod = 'structural'
): BaseDetector {
  return new (class extends BaseDetector {
    readonly id = id;
    readonly category = category;
    readonly subcategory = subcategory;
    readonly name = `Test Detector ${id}`;
    readonly description = `A test detector with id ${id}`;
    readonly supportedLanguages = supportedLanguages;
    readonly detectionMethod = detectionMethod;

    async detect(_context: DetectionContext): Promise<DetectionResult> {
      return this.createEmptyResult();
    }

    generateQuickFix(_violation: Violation): QuickFix | null {
      return null;
    }
  })();
}

// ============================================================================
// Property Tests
// ============================================================================

describe('DetectorRegistry Property Tests', () => {
  let registry: DetectorRegistry;

  beforeEach(() => {
    registry = new DetectorRegistry();
  });

  /**
   * **Property 4: Detector Registry Uniqueness**
   * Duplicate id registration SHALL fail
   *
   * **Validates: Requirements 6.1, 6.2**
   */
  describe('Property 4: Detector Registry Uniqueness', () => {
    it('duplicate id registration SHALL fail', () => {
      fc.assert(
        fc.property(detectorIdArb, categoryArb, languagesArb, (id, category, languages) => {
          // Create two detectors with the same ID
          const detector1 = createTestDetector(id, category, 'sub1', languages);
          const detector2 = createTestDetector(id, category, 'sub2', languages);

          // First registration should succeed
          registry.register(detector1);
          expect(registry.has(id)).toBe(true);

          // Second registration with same ID should fail
          expect(() => registry.register(detector2)).toThrow(DetectorRegistrationError);

          // Registry should still have exactly one detector with this ID
          expect(registry.size).toBe(1);

          // Clean up for next iteration
          registry.clear();
        }),
        { numRuns: 100 }
      );
    });

    it('unique ids can all be registered', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(detectorIdArb, { minLength: 1, maxLength: 20 }),
          categoryArb,
          languagesArb,
          (ids, category, languages) => {
            // Register all detectors with unique IDs
            for (const id of ids) {
              const detector = createTestDetector(id, category, 'testing', languages);
              registry.register(detector);
            }

            // All should be registered
            expect(registry.size).toBe(ids.length);

            // Each ID should be present
            for (const id of ids) {
              expect(registry.has(id)).toBe(true);
            }

            // Clean up for next iteration
            registry.clear();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('override option allows duplicate registration', () => {
      fc.assert(
        fc.property(detectorIdArb, categoryArb, languagesArb, (id, category, languages) => {
          // Create two detectors with the same ID
          const detector1 = createTestDetector(id, category, 'original', languages);
          const detector2 = createTestDetector(id, category, 'replacement', languages);

          // First registration
          registry.register(detector1);
          const info1 = registry.getInfo(id);
          expect(info1?.info.subcategory).toBe('original');

          // Second registration with override should succeed
          registry.register(detector2, { override: true });
          const info2 = registry.getInfo(id);
          expect(info2?.info.subcategory).toBe('replacement');

          // Still only one detector
          expect(registry.size).toBe(1);

          // Clean up for next iteration
          registry.clear();
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Registration preserves detector info
   */
  describe('Property: Registration preserves detector info', () => {
    it('registered detector info matches original', () => {
      fc.assert(
        fc.property(
          detectorIdArb,
          categoryArb,
          detectorIdSegmentArb,
          languagesArb,
          detectionMethodArb,
          (id, category, subcategory, languages, method) => {
            const detector = createTestDetector(id, category, subcategory, languages, method);

            registry.register(detector);

            const info = registry.getInfo(id);
            expect(info).toBeDefined();
            expect(info?.info.id).toBe(id);
            expect(info?.info.category).toBe(category);
            expect(info?.info.subcategory).toBe(subcategory);
            expect(info?.info.supportedLanguages).toEqual(languages);
            expect(info?.info.detectionMethod).toBe(method);

            // Clean up for next iteration
            registry.clear();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Query results are consistent
   */
  describe('Property: Query results are consistent', () => {
    it('query by category returns only matching detectors', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(
            fc.tuple(detectorIdArb, categoryArb),
            { minLength: 1, maxLength: 10 },
            { selector: ([id]) => id }
          ),
          categoryArb,
          (detectorSpecs, queryCategory) => {
            // Register all detectors
            for (const [id, category] of detectorSpecs) {
              const detector = createTestDetector(id, category);
              registry.register(detector);
            }

            // Query by category
            const result = registry.query({ category: queryCategory });

            // All results should have the queried category
            for (const registered of result.detectors) {
              expect(registered.info.category).toBe(queryCategory);
            }

            // Count should match expected
            const expectedCount = detectorSpecs.filter(([, cat]) => cat === queryCategory).length;
            expect(result.count).toBe(expectedCount);

            // Clean up for next iteration
            registry.clear();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('query by language returns only detectors supporting that language', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(
            fc.tuple(detectorIdArb, languagesArb),
            { minLength: 1, maxLength: 10 },
            { selector: ([id]) => id }
          ),
          languageArb,
          (detectorSpecs, queryLanguage) => {
            // Register all detectors
            for (const [id, languages] of detectorSpecs) {
              const detector = createTestDetector(id, 'structural', 'testing', languages);
              registry.register(detector);
            }

            // Query by language
            const result = registry.query({ language: queryLanguage });

            // All results should support the queried language
            for (const registered of result.detectors) {
              expect(registered.info.supportedLanguages).toContain(queryLanguage);
            }

            // Clean up for next iteration
            registry.clear();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Additional property: Enable/disable is idempotent
   */
  describe('Property: Enable/disable is idempotent', () => {
    it('multiple enable calls have same effect as one', () => {
      fc.assert(
        fc.property(detectorIdArb, fc.integer({ min: 1, max: 10 }), (id, enableCount) => {
          const detector = createTestDetector(id);
          registry.register(detector, { enabled: false });

          // Enable multiple times
          for (let i = 0; i < enableCount; i++) {
            registry.enable(id);
          }

          // Should be enabled
          expect(registry.isEnabled(id)).toBe(true);

          // Clean up for next iteration
          registry.clear();
        }),
        { numRuns: 100 }
      );
    });

    it('multiple disable calls have same effect as one', () => {
      fc.assert(
        fc.property(detectorIdArb, fc.integer({ min: 1, max: 10 }), (id, disableCount) => {
          const detector = createTestDetector(id);
          registry.register(detector, { enabled: true });

          // Disable multiple times
          for (let i = 0; i < disableCount; i++) {
            registry.disable(id);
          }

          // Should be disabled
          expect(registry.isEnabled(id)).toBe(false);

          // Clean up for next iteration
          registry.clear();
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Unregister removes detector completely
   */
  describe('Property: Unregister removes detector completely', () => {
    it('unregistered detector is not findable', () => {
      fc.assert(
        fc.property(detectorIdArb, (id) => {
          const detector = createTestDetector(id);
          registry.register(detector);

          expect(registry.has(id)).toBe(true);

          registry.unregister(id);

          expect(registry.has(id)).toBe(false);
          expect(registry.getInfo(id)).toBeUndefined();
          expect(registry.getSync(id)).toBeUndefined();
          expect(registry.query({ idPattern: `^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` }).count).toBe(0);

          // Clean up for next iteration
          registry.clear();
        }),
        { numRuns: 100 }
      );
    });
  });
});
