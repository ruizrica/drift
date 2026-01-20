/**
 * DriftDataReader Property-Based Tests
 *
 * Property tests for verifying data reading consistency from the .drift/ folder structure.
 *
 * Feature: drift-dashboard, Property 2: Drift Data Reading Consistency
 *
 * **Validates: Requirements 1.6**
 *
 * Property: *For any* valid `.drift/` folder structure containing patterns and violations,
 * the DriftDataReader SHALL return data that matches the file contents exactly
 * (round-trip: write to .drift, read via reader, data matches).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { DriftDataReader } from '../drift-data-reader.js';
import type {
  PatternFile,
  StoredPattern,
  PatternStatus,
  PatternCategory,
  Severity,
  ConfidenceLevel,
  PatternLocation,
  OutlierLocation,
  ConfidenceInfo,
  PatternMetadata,
  DetectorConfig,
} from 'driftdetect-core';

// ============================================================================
// Constants
// ============================================================================

const PATTERN_CATEGORIES: PatternCategory[] = [
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
  'documentation',
];

const PATTERN_STATUSES: PatternStatus[] = ['discovered', 'approved', 'ignored'];
const SEVERITIES: Severity[] = ['error', 'warning', 'info', 'hint'];
const CONFIDENCE_LEVELS: ConfidenceLevel[] = ['high', 'medium', 'low', 'uncertain'];

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

/**
 * Generate a valid file path (relative path with .ts extension)
 */
const arbitraryFilePath = fc
  .array(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'.split('')), {
      minLength: 1,
      maxLength: 20,
    }),
    { minLength: 1, maxLength: 4 }
  )
  .map((parts) => parts.join('/') + '.ts');

/**
 * Generate a valid pattern ID (UUID-like format)
 */
const arbitraryPatternId = fc.uuid();

/**
 * Generate a valid pattern name
 */
const arbitraryPatternName = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_'.split('')),
  { minLength: 1, maxLength: 50 }
);

/**
 * Generate a valid description
 */
const arbitraryDescription = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-_'.split('')),
  { minLength: 1, maxLength: 200 }
);

/**
 * Generate a valid subcategory
 */
const arbitrarySubcategory = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-_'.split('')),
  { minLength: 1, maxLength: 30 }
);

/**
 * Generate a valid pattern category
 */
const arbitraryCategory = fc.constantFrom(...PATTERN_CATEGORIES);

/**
 * Generate a valid pattern status
 */
const arbitraryStatus = fc.constantFrom(...PATTERN_STATUSES);

/**
 * Generate a valid severity
 */
const arbitrarySeverity = fc.constantFrom(...SEVERITIES);

/**
 * Generate a valid confidence level
 */
const arbitraryConfidenceLevel = fc.constantFrom(...CONFIDENCE_LEVELS);

/**
 * Generate a valid ISO timestamp
 */
const arbitraryISOTimestamp = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map((d) => d.toISOString());

/**
 * Generate a valid PatternLocation
 */
const arbitraryPatternLocation: fc.Arbitrary<PatternLocation> = fc.record({
  file: arbitraryFilePath,
  line: fc.integer({ min: 1, max: 10000 }),
  column: fc.integer({ min: 1, max: 500 }),
  endLine: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  endColumn: fc.option(fc.integer({ min: 1, max: 500 }), { nil: undefined }),
});

/**
 * Generate a valid OutlierLocation
 */
const arbitraryOutlierLocation: fc.Arbitrary<OutlierLocation> = fc.record({
  file: arbitraryFilePath,
  line: fc.integer({ min: 1, max: 10000 }),
  column: fc.integer({ min: 1, max: 500 }),
  endLine: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  endColumn: fc.option(fc.integer({ min: 1, max: 500 }), { nil: undefined }),
  reason: arbitraryDescription,
  deviationScore: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
});

/**
 * Generate a valid ConfidenceInfo
 */
const arbitraryConfidenceInfo: fc.Arbitrary<ConfidenceInfo> = fc.record({
  frequency: fc.float({ min: 0, max: 1, noNaN: true }),
  consistency: fc.float({ min: 0, max: 1, noNaN: true }),
  age: fc.integer({ min: 0, max: 365 }),
  spread: fc.integer({ min: 1, max: 100 }),
  score: fc.float({ min: 0, max: 1, noNaN: true }),
  level: arbitraryConfidenceLevel,
});

/**
 * Generate a valid PatternMetadata
 */
const arbitraryPatternMetadata: fc.Arbitrary<PatternMetadata> = fc.record({
  firstSeen: arbitraryISOTimestamp,
  lastSeen: arbitraryISOTimestamp,
  approvedAt: fc.option(arbitraryISOTimestamp, { nil: undefined }),
  approvedBy: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  version: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
  tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }), { nil: undefined }),
  relatedPatterns: fc.option(fc.array(fc.uuid(), { maxLength: 3 }), { nil: undefined }),
  source: fc.option(fc.constantFrom('auto-detected', 'imported', 'manual'), { nil: undefined }),
});

/**
 * Generate a valid DetectorConfig
 */
const arbitraryDetectorConfig: fc.Arbitrary<DetectorConfig> = fc.record({
  type: fc.constantFrom('ast', 'regex', 'semantic', 'structural', 'custom'),
  config: fc.constant({ patternId: 'test/pattern' }),
});

/**
 * Generate a valid StoredPattern
 */
const arbitraryStoredPattern: fc.Arbitrary<StoredPattern> = fc.record({
  id: arbitraryPatternId,
  subcategory: arbitrarySubcategory,
  name: arbitraryPatternName,
  description: arbitraryDescription,
  detector: arbitraryDetectorConfig,
  confidence: arbitraryConfidenceInfo,
  locations: fc.array(arbitraryPatternLocation, { minLength: 1, maxLength: 10 }),
  outliers: fc.array(arbitraryOutlierLocation, { maxLength: 5 }),
  metadata: arbitraryPatternMetadata,
  severity: arbitrarySeverity,
  autoFixable: fc.boolean(),
});

/**
 * Generate a valid PatternFile
 */
const arbitraryPatternFile = (category: PatternCategory): fc.Arbitrary<PatternFile> =>
  fc.record({
    version: fc.constant('1.0.0'),
    category: fc.constant(category),
    patterns: fc.array(arbitraryStoredPattern, { minLength: 1, maxLength: 5 }),
    lastUpdated: arbitraryISOTimestamp,
    checksum: fc.option(fc.hexaString({ minLength: 32, maxLength: 32 }), { nil: undefined }),
  });

/**
 * Generate a test scenario with category, status, and pattern file
 */
interface TestScenario {
  category: PatternCategory;
  status: PatternStatus;
  patternFile: PatternFile;
}

const arbitraryTestScenario: fc.Arbitrary<TestScenario> = fc
  .record({
    category: arbitraryCategory,
    status: arbitraryStatus,
  })
  .chain(({ category, status }) =>
    arbitraryPatternFile(category).map((patternFile) => ({
      category,
      status,
      patternFile,
    }))
  );

/**
 * Generate multiple test scenarios (for testing multiple files)
 */
const arbitraryMultipleScenarios: fc.Arbitrary<TestScenario[]> = fc
  .array(arbitraryTestScenario, { minLength: 1, maxLength: 5 })
  .map((scenarios) => {
    // Ensure unique category+status combinations to avoid file overwrites
    const seen = new Set<string>();
    return scenarios.filter((s) => {
      const key = `${s.category}-${s.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })
  .filter((scenarios) => scenarios.length > 0);

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Write a pattern file to the .drift directory
 */
async function writePatternFile(
  driftDir: string,
  status: PatternStatus,
  category: PatternCategory,
  patternFile: PatternFile
): Promise<void> {
  const filePath = path.join(driftDir, 'patterns', status, `${category}.json`);
  await fs.writeFile(filePath, JSON.stringify(patternFile, null, 2));
}

/**
 * Create the .drift directory structure
 */
async function createDriftStructure(driftDir: string): Promise<void> {
  for (const status of PATTERN_STATUSES) {
    await fs.mkdir(path.join(driftDir, 'patterns', status), { recursive: true });
  }
}

/**
 * Create a fresh test environment with temp directory and reader
 */
async function createTestEnvironment(): Promise<{
  tempDir: string;
  driftDir: string;
  reader: DriftDataReader;
  cleanup: () => Promise<void>;
}> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'drift-property-test-'));
  const driftDir = path.join(tempDir, '.drift');
  await createDriftStructure(driftDir);
  const reader = new DriftDataReader(driftDir);
  
  return {
    tempDir,
    driftDir,
    reader,
    cleanup: async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    },
  };
}

// ============================================================================
// Property Tests
// ============================================================================

describe('DriftDataReader Property Tests', () => {
  // Note: We don't use beforeEach/afterEach for property tests because
  // each property iteration needs its own isolated environment.
  // Instead, we create and cleanup the environment within each iteration.

  describe('Feature: drift-dashboard, Property 2: Drift Data Reading Consistency', () => {
    /**
     * Property: For any valid pattern file written to .drift/,
     * reading it back via DriftDataReader returns matching data.
     */
    it('should read patterns that match written file contents exactly (single file)', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryTestScenario, async (scenario) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();
          
          try {
            const { category, status, patternFile } = scenario;

            // Write the pattern file
            await writePatternFile(driftDir, status, category, patternFile);

            // Read patterns via DriftDataReader
            const readPatterns = await reader.getPatterns();

            // Verify each written pattern is read correctly
            for (const writtenPattern of patternFile.patterns) {
              const readPattern = readPatterns.find((p) => p.id === writtenPattern.id);

              // Pattern should exist
              expect(readPattern).toBeDefined();
              if (!readPattern) return false;

              // Core fields should match
              expect(readPattern.id).toBe(writtenPattern.id);
              expect(readPattern.name).toBe(writtenPattern.name);
              expect(readPattern.description).toBe(writtenPattern.description);
              expect(readPattern.subcategory).toBe(writtenPattern.subcategory);
              expect(readPattern.severity).toBe(writtenPattern.severity);

              // Category and status should match the file location
              expect(readPattern.category).toBe(category);
              expect(readPattern.status).toBe(status);

              // Confidence should match
              expect(readPattern.confidence.score).toBe(writtenPattern.confidence.score);
              expect(readPattern.confidence.level).toBe(writtenPattern.confidence.level);

              // Counts should match
              expect(readPattern.locationCount).toBe(writtenPattern.locations.length);
              expect(readPattern.outlierCount).toBe(writtenPattern.outliers.length);

              // Metadata should match
              expect(readPattern.metadata.firstSeen).toBe(writtenPattern.metadata.firstSeen);
              expect(readPattern.metadata.lastSeen).toBe(writtenPattern.metadata.lastSeen);
              if (writtenPattern.metadata.tags) {
                expect(readPattern.metadata.tags).toEqual(writtenPattern.metadata.tags);
              }
            }

            return true;
          } finally {
            await cleanup();
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any valid pattern file written to .drift/,
     * getPattern(id) returns the full pattern with locations matching the file.
     */
    it('should read pattern with locations that match written file contents exactly', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryTestScenario, async (scenario) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();
          
          try {
            const { category, status, patternFile } = scenario;

            // Write the pattern file
            await writePatternFile(driftDir, status, category, patternFile);

            // Verify each pattern can be retrieved with full details
            for (const writtenPattern of patternFile.patterns) {
              const readPattern = await reader.getPattern(writtenPattern.id);

              // Pattern should exist
              expect(readPattern).not.toBeNull();
              if (!readPattern) return false;

              // Core fields should match
              expect(readPattern.id).toBe(writtenPattern.id);
              expect(readPattern.name).toBe(writtenPattern.name);
              expect(readPattern.category).toBe(category);
              expect(readPattern.status).toBe(status);

              // Locations should match (converted to SemanticLocation format)
              expect(readPattern.locations.length).toBe(writtenPattern.locations.length);
              for (let i = 0; i < writtenPattern.locations.length; i++) {
                const writtenLoc = writtenPattern.locations[i];
                const readLoc = readPattern.locations[i];

                expect(readLoc.file).toBe(writtenLoc.file);
                expect(readLoc.range.start.line).toBe(writtenLoc.line);
                expect(readLoc.range.start.character).toBe(writtenLoc.column);
                expect(readLoc.range.end.line).toBe(writtenLoc.endLine ?? writtenLoc.line);
                expect(readLoc.range.end.character).toBe(writtenLoc.endColumn ?? writtenLoc.column);
              }

              // Outliers should match (converted to OutlierWithDetails format)
              expect(readPattern.outliers.length).toBe(writtenPattern.outliers.length);
              for (let i = 0; i < writtenPattern.outliers.length; i++) {
                const writtenOutlier = writtenPattern.outliers[i];
                const readOutlier = readPattern.outliers[i];

                expect(readOutlier.file).toBe(writtenOutlier.file);
                expect(readOutlier.range.start.line).toBe(writtenOutlier.line);
                expect(readOutlier.range.start.character).toBe(writtenOutlier.column);
                expect(readOutlier.reason).toBe(writtenOutlier.reason);
                expect(readOutlier.deviationScore).toBe(writtenOutlier.deviationScore);
              }
            }

            return true;
          } finally {
            await cleanup();
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any valid pattern files with outliers written to .drift/,
     * getViolations() returns violations derived from those outliers.
     */
    it('should read violations that match written outliers exactly', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryTestScenario, async (scenario) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();
          
          try {
            const { category, status, patternFile } = scenario;

            // Write the pattern file
            await writePatternFile(driftDir, status, category, patternFile);

            // Read violations via DriftDataReader
            const readViolations = await reader.getViolations();

            // Count expected violations (total outliers across all patterns)
            const expectedViolationCount = patternFile.patterns.reduce(
              (sum, p) => sum + p.outliers.length,
              0
            );
            expect(readViolations.length).toBe(expectedViolationCount);

            // Verify each outlier is converted to a violation correctly
            for (const writtenPattern of patternFile.patterns) {
              for (const writtenOutlier of writtenPattern.outliers) {
                const expectedId = `${writtenPattern.id}-${writtenOutlier.file}-${writtenOutlier.line}-${writtenOutlier.column}`;
                const readViolation = readViolations.find((v) => v.id === expectedId);

                expect(readViolation).toBeDefined();
                if (!readViolation) return false;

                // Violation fields should match
                expect(readViolation.patternId).toBe(writtenPattern.id);
                expect(readViolation.patternName).toBe(writtenPattern.name);
                expect(readViolation.severity).toBe(writtenPattern.severity);
                expect(readViolation.file).toBe(writtenOutlier.file);
                expect(readViolation.message).toBe(writtenOutlier.reason);
                expect(readViolation.range.start.line).toBe(writtenOutlier.line);
                expect(readViolation.range.start.character).toBe(writtenOutlier.column);
              }
            }

            return true;
          } finally {
            await cleanup();
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any multiple valid pattern files written to .drift/,
     * reading them back returns all patterns from all files.
     */
    it('should read all patterns from multiple files correctly', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryMultipleScenarios, async (scenarios) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();
          
          try {
            // Write all pattern files
            for (const scenario of scenarios) {
              await writePatternFile(
                driftDir,
                scenario.status,
                scenario.category,
                scenario.patternFile
              );
            }

            // Read all patterns
            const readPatterns = await reader.getPatterns();

            // Count expected patterns
            const expectedPatternCount = scenarios.reduce(
              (sum, s) => sum + s.patternFile.patterns.length,
              0
            );
            expect(readPatterns.length).toBe(expectedPatternCount);

            // Verify each written pattern exists in the read results
            for (const scenario of scenarios) {
              for (const writtenPattern of scenario.patternFile.patterns) {
                const readPattern = readPatterns.find((p) => p.id === writtenPattern.id);
                expect(readPattern).toBeDefined();
                if (readPattern) {
                  expect(readPattern.category).toBe(scenario.category);
                  expect(readPattern.status).toBe(scenario.status);
                }
              }
            }

            return true;
          } finally {
            await cleanup();
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Pattern count from getPatterns() equals sum of locationCount values.
     * This verifies internal consistency of the data.
     */
    it('should maintain consistency between pattern counts and location counts', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryTestScenario, async (scenario) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();
          
          try {
            const { category, status, patternFile } = scenario;

            // Write the pattern file
            await writePatternFile(driftDir, status, category, patternFile);

            // Read patterns
            const readPatterns = await reader.getPatterns();

            // Verify location counts match
            for (const writtenPattern of patternFile.patterns) {
              const readPattern = readPatterns.find((p) => p.id === writtenPattern.id);
              expect(readPattern).toBeDefined();
              if (readPattern) {
                expect(readPattern.locationCount).toBe(writtenPattern.locations.length);
                expect(readPattern.outlierCount).toBe(writtenPattern.outliers.length);
              }
            }

            return true;
          } finally {
            await cleanup();
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Reading a non-existent pattern returns null.
     */
    it('should return null for non-existent pattern IDs', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (randomId) => {
          const { reader, cleanup } = await createTestEnvironment();
          
          try {
            // Don't write any patterns, just try to read
            const result = await reader.getPattern(randomId);
            expect(result).toBeNull();
            return true;
          } finally {
            await cleanup();
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Empty .drift/ folder returns empty arrays.
     */
    it('should return empty arrays when no patterns exist', async () => {
      const { reader, cleanup } = await createTestEnvironment();
      
      try {
        // Don't write any patterns
        const patterns = await reader.getPatterns();
        const violations = await reader.getViolations();

        expect(patterns).toEqual([]);
        expect(violations).toEqual([]);
      } finally {
        await cleanup();
      }
    });

    /**
     * Property: Filtering by category returns only patterns of that category.
     */
    it('should filter patterns by category correctly', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryMultipleScenarios, async (scenarios) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();
          
          try {
            // Write all pattern files
            for (const scenario of scenarios) {
              await writePatternFile(
                driftDir,
                scenario.status,
                scenario.category,
                scenario.patternFile
              );
            }

            // Test filtering for each category that was written
            const writtenCategories = [...new Set(scenarios.map((s) => s.category))];

            for (const category of writtenCategories) {
              const filteredPatterns = await reader.getPatterns({ category });

              // All returned patterns should have the filtered category
              for (const pattern of filteredPatterns) {
                expect(pattern.category).toBe(category);
              }

              // Count should match expected
              const expectedCount = scenarios
                .filter((s) => s.category === category)
                .reduce((sum, s) => sum + s.patternFile.patterns.length, 0);
              expect(filteredPatterns.length).toBe(expectedCount);
            }

            return true;
          } finally {
            await cleanup();
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Filtering by status returns only patterns of that status.
     */
    it('should filter patterns by status correctly', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryMultipleScenarios, async (scenarios) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();
          
          try {
            // Write all pattern files
            for (const scenario of scenarios) {
              await writePatternFile(
                driftDir,
                scenario.status,
                scenario.category,
                scenario.patternFile
              );
            }

            // Test filtering for each status that was written
            const writtenStatuses = [...new Set(scenarios.map((s) => s.status))];

            for (const status of writtenStatuses) {
              const filteredPatterns = await reader.getPatterns({ status });

              // All returned patterns should have the filtered status
              for (const pattern of filteredPatterns) {
                expect(pattern.status).toBe(status);
              }

              // Count should match expected
              const expectedCount = scenarios
                .filter((s) => s.status === status)
                .reduce((sum, s) => sum + s.patternFile.patterns.length, 0);
              expect(filteredPatterns.length).toBe(expectedCount);
            }

            return true;
          } finally {
            await cleanup();
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================================================
// Property 8: Pattern Status Transitions
// ============================================================================

describe('Feature: drift-dashboard, Property 8: Pattern Status Transitions', () => {
  /**
   * Property: For any pattern with status S, when approve is called,
   * the pattern status becomes 'approved'.
   *
   * **Validates: Requirements 4.4**
   */
  it('should transition pattern to approved status when approvePattern is called', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryTestScenario.filter((s) => s.status !== 'approved'),
        async (scenario) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();

          try {
            const { category, status, patternFile } = scenario;

            // Write the pattern file
            await writePatternFile(driftDir, status, category, patternFile);

            // Approve each pattern
            for (const pattern of patternFile.patterns) {
              await reader.approvePattern(pattern.id);

              // Verify the pattern is now approved
              const readPattern = await reader.getPattern(pattern.id);
              expect(readPattern).not.toBeNull();
              expect(readPattern!.status).toBe('approved');
            }

            return true;
          } finally {
            await cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any pattern with status S, when ignore is called,
   * the pattern status becomes 'ignored'.
   *
   * **Validates: Requirements 4.5**
   */
  it('should transition pattern to ignored status when ignorePattern is called', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryTestScenario.filter((s) => s.status !== 'ignored'),
        async (scenario) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();

          try {
            const { category, status, patternFile } = scenario;

            // Write the pattern file
            await writePatternFile(driftDir, status, category, patternFile);

            // Ignore each pattern
            for (const pattern of patternFile.patterns) {
              await reader.ignorePattern(pattern.id);

              // Verify the pattern is now ignored
              const readPattern = await reader.getPattern(pattern.id);
              expect(readPattern).not.toBeNull();
              expect(readPattern!.status).toBe('ignored');
            }

            return true;
          } finally {
            await cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any pattern, when delete is called,
   * the pattern is removed from storage.
   *
   * **Validates: Requirements 4.6**
   */
  it('should remove pattern from storage when deletePattern is called', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryTestScenario, async (scenario) => {
        const { driftDir, reader, cleanup } = await createTestEnvironment();

        try {
          const { category, status, patternFile } = scenario;

          // Write the pattern file
          await writePatternFile(driftDir, status, category, patternFile);

          // Delete each pattern
          for (const pattern of patternFile.patterns) {
            await reader.deletePattern(pattern.id);

            // Verify the pattern no longer exists
            const readPattern = await reader.getPattern(pattern.id);
            expect(readPattern).toBeNull();
          }

          // Verify all patterns are gone
          const remainingPatterns = await reader.getPatterns();
          expect(remainingPatterns.length).toBe(0);

          return true;
        } finally {
          await cleanup();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Approving an already approved pattern is idempotent.
   */
  it('should be idempotent when approving an already approved pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryTestScenario.map((s) => ({ ...s, status: 'approved' as PatternStatus })),
        async (scenario) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();

          try {
            const { category, patternFile } = scenario;

            // Write the pattern file as approved
            await writePatternFile(driftDir, 'approved', category, patternFile);

            // Approve again (should be idempotent)
            for (const pattern of patternFile.patterns) {
              await reader.approvePattern(pattern.id);

              // Verify the pattern is still approved
              const readPattern = await reader.getPattern(pattern.id);
              expect(readPattern).not.toBeNull();
              expect(readPattern!.status).toBe('approved');
            }

            return true;
          } finally {
            await cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Ignoring an already ignored pattern is idempotent.
   */
  it('should be idempotent when ignoring an already ignored pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryTestScenario.map((s) => ({ ...s, status: 'ignored' as PatternStatus })),
        async (scenario) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();

          try {
            const { category, patternFile } = scenario;

            // Write the pattern file as ignored
            await writePatternFile(driftDir, 'ignored', category, patternFile);

            // Ignore again (should be idempotent)
            for (const pattern of patternFile.patterns) {
              await reader.ignorePattern(pattern.id);

              // Verify the pattern is still ignored
              const readPattern = await reader.getPattern(pattern.id);
              expect(readPattern).not.toBeNull();
              expect(readPattern!.status).toBe('ignored');
            }

            return true;
          } finally {
            await cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Deleting a non-existent pattern throws an error.
   */
  it('should throw error when deleting non-existent pattern', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (randomId) => {
        const { reader, cleanup } = await createTestEnvironment();

        try {
          // Try to delete a non-existent pattern
          await expect(reader.deletePattern(randomId)).rejects.toThrow(
            `Pattern not found: ${randomId}`
          );
          return true;
        } finally {
          await cleanup();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Approving a non-existent pattern throws an error.
   */
  it('should throw error when approving non-existent pattern', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (randomId) => {
        const { reader, cleanup } = await createTestEnvironment();

        try {
          // Try to approve a non-existent pattern
          await expect(reader.approvePattern(randomId)).rejects.toThrow(
            `Pattern not found: ${randomId}`
          );
          return true;
        } finally {
          await cleanup();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Pattern data is preserved during status transitions.
   */
  it('should preserve pattern data during status transitions', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryTestScenario.filter((s) => s.status === 'discovered'),
        async (scenario) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();

          try {
            const { category, patternFile } = scenario;

            // Write the pattern file
            await writePatternFile(driftDir, 'discovered', category, patternFile);

            // For each pattern, approve it and verify data is preserved
            for (const originalPattern of patternFile.patterns) {
              // Get the pattern before transition
              const beforePattern = await reader.getPattern(originalPattern.id);
              expect(beforePattern).not.toBeNull();

              // Approve the pattern
              await reader.approvePattern(originalPattern.id);

              // Get the pattern after transition
              const afterPattern = await reader.getPattern(originalPattern.id);
              expect(afterPattern).not.toBeNull();

              // Verify core data is preserved
              expect(afterPattern!.id).toBe(beforePattern!.id);
              expect(afterPattern!.name).toBe(beforePattern!.name);
              expect(afterPattern!.description).toBe(beforePattern!.description);
              expect(afterPattern!.category).toBe(beforePattern!.category);
              expect(afterPattern!.confidence.score).toBe(beforePattern!.confidence.score);
              expect(afterPattern!.locations.length).toBe(beforePattern!.locations.length);
              expect(afterPattern!.outliers.length).toBe(beforePattern!.outliers.length);

              // Status should have changed
              expect(afterPattern!.status).toBe('approved');
            }

            return true;
          } finally {
            await cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 15: Configuration Round-Trip
// ============================================================================

describe('Feature: drift-dashboard, Property 15: Configuration Round-Trip', () => {
  /**
   * Arbitrary for DriftConfig
   * Note: We use simple JSON-safe values to avoid edge cases like -0 which don't round-trip through JSON
   */
  const arbitrarySimpleJsonValue = fc.oneof(
    fc.string(),
    fc.integer({ min: 1, max: 1000 }), // Avoid 0 and negative zero edge cases
    fc.boolean(),
    fc.constant(null)
  );

  const arbitraryDetectorConfigEntry = fc.record({
    id: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-'.split('')), {
      minLength: 1,
      maxLength: 20,
    }),
    name: fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -'.split('')),
      { minLength: 1, maxLength: 50 }
    ),
    enabled: fc.boolean(),
    category: arbitraryCategory,
    options: fc.option(fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), arbitrarySimpleJsonValue), { nil: undefined }),
  });

  const arbitraryDriftConfig = fc.record({
    version: fc.constant('1.0.0'),
    detectors: fc.array(arbitraryDetectorConfigEntry, { minLength: 1, maxLength: 10 }),
    severityOverrides: fc.dictionary(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-/'.split('')), {
        minLength: 1,
        maxLength: 30,
      }),
      arbitrarySeverity
    ),
    ignorePatterns: fc.array(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789*?/._-'.split('')), {
        minLength: 1,
        maxLength: 50,
      }),
      { maxLength: 10 }
    ),
    watchOptions: fc.option(
      fc.record({
        debounce: fc.integer({ min: 100, max: 5000 }),
        categories: fc.option(fc.array(arbitraryCategory, { maxLength: 5 }), { nil: undefined }),
      }),
      { nil: undefined }
    ),
  });

  /**
   * Property: For any valid DriftConfig, saving the config then reading it back
   * SHALL produce an equivalent configuration object.
   *
   * **Validates: Requirements 7.4, 7.5**
   */
  it('should preserve config data through save and load cycle', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryDriftConfig, async (config) => {
        const { driftDir, reader, cleanup } = await createTestEnvironment();

        try {
          // Write the config using updateConfig (which does a full replace when starting fresh)
          await reader.updateConfig(config);

          // Read the config back
          const readConfig = await reader.getConfig();

          // Verify the config matches
          expect(readConfig.version).toBe(config.version);
          expect(readConfig.detectors).toEqual(config.detectors);
          expect(readConfig.severityOverrides).toEqual(config.severityOverrides);
          expect(readConfig.ignorePatterns).toEqual(config.ignorePatterns);

          if (config.watchOptions) {
            expect(readConfig.watchOptions).toBeDefined();
            expect(readConfig.watchOptions!.debounce).toBe(config.watchOptions.debounce);
            if (config.watchOptions.categories) {
              expect(readConfig.watchOptions!.categories).toEqual(config.watchOptions.categories);
            }
          }

          return true;
        } finally {
          await cleanup();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Partial config updates should merge with existing config.
   */
  it('should merge partial config updates with existing config', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryDriftConfig,
        fc.dictionary(
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-/'.split('')), {
            minLength: 1,
            maxLength: 30,
          }),
          arbitrarySeverity
        ),
        async (initialConfig, newOverrides) => {
          const { driftDir, reader, cleanup } = await createTestEnvironment();

          try {
            // Write initial config
            await reader.updateConfig(initialConfig);

            // Update only severityOverrides
            await reader.updateConfig({ severityOverrides: newOverrides });

            // Read the config back
            const readConfig = await reader.getConfig();

            // Verify severityOverrides were merged
            for (const [key, value] of Object.entries(newOverrides)) {
              expect(readConfig.severityOverrides[key]).toBe(value);
            }

            // Verify other fields are preserved
            expect(readConfig.version).toBe(initialConfig.version);
            expect(readConfig.detectors).toEqual(initialConfig.detectors);
            expect(readConfig.ignorePatterns).toEqual(initialConfig.ignorePatterns);

            return true;
          } finally {
            await cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Reading config when none exists returns default config.
   */
  it('should return default config when no config file exists', async () => {
    const { reader, cleanup } = await createTestEnvironment();

    try {
      // Read config without writing one first
      const config = await reader.getConfig();

      // Verify default config structure
      expect(config.version).toBe('1.0.0');
      expect(config.detectors).toBeDefined();
      expect(config.detectors.length).toBeGreaterThan(0);
      expect(config.severityOverrides).toEqual({});
      expect(config.ignorePatterns).toContain('node_modules/**');
    } finally {
      await cleanup();
    }
  });
});
