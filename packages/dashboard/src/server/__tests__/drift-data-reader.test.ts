/**
 * DriftDataReader Unit Tests
 *
 * Tests for reading patterns and violations from the .drift/ folder structure.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { DriftDataReader } from '../drift-data-reader.js';

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestPatternFile = (category: string, patterns: unknown[]) => ({
  version: '1.0.0',
  category,
  patterns,
  lastUpdated: new Date().toISOString(),
  checksum: 'test-checksum',
});

const createTestPattern = (overrides: Partial<{
  id: string;
  name: string;
  subcategory: string;
  description: string;
  severity: string;
  locations: unknown[];
  outliers: unknown[];
}> = {}) => ({
  id: overrides.id ?? 'test-pattern-1',
  subcategory: overrides.subcategory ?? 'test-subcategory',
  name: overrides.name ?? 'Test Pattern',
  description: overrides.description ?? 'A test pattern description',
  detector: {
    type: 'regex',
    config: { patternId: 'test/pattern' },
  },
  confidence: {
    frequency: 0.8,
    consistency: 0.9,
    age: 0,
    spread: 10,
    score: 0.85,
    level: 'high',
  },
  locations: overrides.locations ?? [
    { file: 'src/test.ts', line: 10, column: 1 },
    { file: 'src/test2.ts', line: 20, column: 5 },
  ],
  outliers: overrides.outliers ?? [],
  metadata: {
    firstSeen: '2024-01-01T00:00:00.000Z',
    lastSeen: '2024-01-15T00:00:00.000Z',
    source: 'auto-detected',
    tags: ['test'],
  },
  severity: overrides.severity ?? 'warning',
  autoFixable: false,
});

const createTestOutlier = (overrides: Partial<{
  file: string;
  line: number;
  column: number;
  reason: string;
  deviationScore: number;
}> = {}) => ({
  file: overrides.file ?? 'src/outlier.ts',
  line: overrides.line ?? 15,
  column: overrides.column ?? 1,
  reason: overrides.reason ?? 'Deviates from expected pattern',
  deviationScore: overrides.deviationScore ?? 0.5,
});

// ============================================================================
// Test Setup
// ============================================================================

describe('DriftDataReader', () => {
  let tempDir: string;
  let driftDir: string;
  let reader: DriftDataReader;

  beforeEach(async () => {
    // Create a temporary directory for test data
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'drift-test-'));
    driftDir = path.join(tempDir, '.drift');
    
    // Create the .drift directory structure
    await fs.mkdir(path.join(driftDir, 'patterns', 'discovered'), { recursive: true });
    await fs.mkdir(path.join(driftDir, 'patterns', 'approved'), { recursive: true });
    await fs.mkdir(path.join(driftDir, 'patterns', 'ignored'), { recursive: true });
    
    reader = new DriftDataReader(driftDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should accept drift directory path', () => {
      const reader = new DriftDataReader('/path/to/.drift');
      expect(reader.directory).toBe('/path/to/.drift');
    });
  });

  // ==========================================================================
  // getPatterns Tests
  // ==========================================================================

  describe('getPatterns', () => {
    it('should return empty array when no patterns exist', async () => {
      const patterns = await reader.getPatterns();
      expect(patterns).toEqual([]);
    });

    it('should read patterns from discovered directory', async () => {
      const testPattern = createTestPattern({ id: 'pattern-1', name: 'API Pattern' });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const patterns = await reader.getPatterns();
      
      expect(patterns).toHaveLength(1);
      expect(patterns[0].id).toBe('pattern-1');
      expect(patterns[0].name).toBe('API Pattern');
      expect(patterns[0].status).toBe('discovered');
      expect(patterns[0].category).toBe('api');
    });

    it('should read patterns from approved directory', async () => {
      const testPattern = createTestPattern({ id: 'approved-1' });
      const patternFile = createTestPatternFile('logging', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'approved', 'logging.json'),
        JSON.stringify(patternFile)
      );

      const patterns = await reader.getPatterns();
      
      expect(patterns).toHaveLength(1);
      expect(patterns[0].id).toBe('approved-1');
      expect(patterns[0].status).toBe('approved');
    });

    it('should read patterns from ignored directory', async () => {
      const testPattern = createTestPattern({ id: 'ignored-1' });
      const patternFile = createTestPatternFile('errors', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'ignored', 'errors.json'),
        JSON.stringify(patternFile)
      );

      const patterns = await reader.getPatterns();
      
      expect(patterns).toHaveLength(1);
      expect(patterns[0].id).toBe('ignored-1');
      expect(patterns[0].status).toBe('ignored');
    });

    it('should read patterns from multiple status directories', async () => {
      const discoveredPattern = createTestPattern({ id: 'discovered-1' });
      const approvedPattern = createTestPattern({ id: 'approved-1' });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [discoveredPattern]))
      );
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'approved', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [approvedPattern]))
      );

      const patterns = await reader.getPatterns();
      
      expect(patterns).toHaveLength(2);
      expect(patterns.map(p => p.id).sort()).toEqual(['approved-1', 'discovered-1']);
    });

    it('should read patterns from multiple category files', async () => {
      const apiPattern = createTestPattern({ id: 'api-1' });
      const loggingPattern = createTestPattern({ id: 'logging-1' });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [apiPattern]))
      );
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'logging.json'),
        JSON.stringify(createTestPatternFile('logging', [loggingPattern]))
      );

      const patterns = await reader.getPatterns();
      
      expect(patterns).toHaveLength(2);
      expect(patterns.find(p => p.id === 'api-1')?.category).toBe('api');
      expect(patterns.find(p => p.id === 'logging-1')?.category).toBe('logging');
    });

    it('should include location and outlier counts', async () => {
      const testPattern = createTestPattern({
        id: 'pattern-with-counts',
        locations: [
          { file: 'a.ts', line: 1, column: 1 },
          { file: 'b.ts', line: 2, column: 1 },
          { file: 'c.ts', line: 3, column: 1 },
        ],
        outliers: [
          createTestOutlier({ file: 'x.ts', line: 10 }),
          createTestOutlier({ file: 'y.ts', line: 20 }),
        ],
      });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const patterns = await reader.getPatterns();
      
      expect(patterns[0].locationCount).toBe(3);
      expect(patterns[0].outlierCount).toBe(2);
    });

    // Filter tests
    describe('filtering', () => {
      beforeEach(async () => {
        // Set up multiple patterns for filtering tests
        const apiPattern = createTestPattern({ 
          id: 'api-1', 
          name: 'API Route Pattern',
          description: 'RESTful API pattern',
        });
        const loggingPattern = createTestPattern({ 
          id: 'logging-1', 
          name: 'Logging Pattern',
          description: 'Console logging pattern',
        });
        
        await fs.writeFile(
          path.join(driftDir, 'patterns', 'discovered', 'api.json'),
          JSON.stringify(createTestPatternFile('api', [apiPattern]))
        );
        await fs.writeFile(
          path.join(driftDir, 'patterns', 'approved', 'logging.json'),
          JSON.stringify(createTestPatternFile('logging', [loggingPattern]))
        );
      });

      it('should filter by category', async () => {
        const patterns = await reader.getPatterns({ category: 'api' });
        
        expect(patterns).toHaveLength(1);
        expect(patterns[0].category).toBe('api');
      });

      it('should filter by status', async () => {
        const patterns = await reader.getPatterns({ status: 'approved' });
        
        expect(patterns).toHaveLength(1);
        expect(patterns[0].status).toBe('approved');
      });

      it('should filter by minimum confidence', async () => {
        const lowConfPattern = createTestPattern({ id: 'low-conf' });
        lowConfPattern.confidence.score = 0.3;
        
        await fs.writeFile(
          path.join(driftDir, 'patterns', 'discovered', 'errors.json'),
          JSON.stringify(createTestPatternFile('errors', [lowConfPattern]))
        );

        const patterns = await reader.getPatterns({ minConfidence: 0.5 });
        
        // Should only include patterns with confidence >= 0.5
        expect(patterns.every(p => p.confidence.score >= 0.5)).toBe(true);
        expect(patterns.find(p => p.id === 'low-conf')).toBeUndefined();
      });

      it('should filter by search term in name', async () => {
        const patterns = await reader.getPatterns({ search: 'API' });
        
        expect(patterns).toHaveLength(1);
        expect(patterns[0].name).toContain('API');
      });

      it('should filter by search term in description', async () => {
        const patterns = await reader.getPatterns({ search: 'console' });
        
        expect(patterns).toHaveLength(1);
        expect(patterns[0].description.toLowerCase()).toContain('console');
      });

      it('should combine multiple filters', async () => {
        const patterns = await reader.getPatterns({ 
          category: 'api',
          status: 'discovered',
        });
        
        expect(patterns).toHaveLength(1);
        expect(patterns[0].category).toBe('api');
        expect(patterns[0].status).toBe('discovered');
      });
    });
  });

  // ==========================================================================
  // getPattern Tests
  // ==========================================================================

  describe('getPattern', () => {
    it('should return null when pattern does not exist', async () => {
      const pattern = await reader.getPattern('non-existent');
      expect(pattern).toBeNull();
    });

    it('should return pattern with locations', async () => {
      const testPattern = createTestPattern({
        id: 'pattern-with-locations',
        locations: [
          { file: 'src/a.ts', line: 10, column: 5 },
          { file: 'src/b.ts', line: 20, column: 10, endLine: 25, endColumn: 15 },
        ],
      });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const pattern = await reader.getPattern('pattern-with-locations');
      
      expect(pattern).not.toBeNull();
      expect(pattern!.id).toBe('pattern-with-locations');
      expect(pattern!.locations).toHaveLength(2);
      expect(pattern!.locations[0]).toEqual({
        file: 'src/a.ts',
        range: {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 5 },
        },
      });
      expect(pattern!.locations[1]).toEqual({
        file: 'src/b.ts',
        range: {
          start: { line: 20, character: 10 },
          end: { line: 25, character: 15 },
        },
      });
    });

    it('should return pattern with outliers', async () => {
      const testPattern = createTestPattern({
        id: 'pattern-with-outliers',
        outliers: [
          createTestOutlier({ 
            file: 'src/outlier.ts', 
            line: 15, 
            column: 1,
            reason: 'Uses different naming convention',
            deviationScore: 0.7,
          }),
        ],
      });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const pattern = await reader.getPattern('pattern-with-outliers');
      
      expect(pattern).not.toBeNull();
      expect(pattern!.outliers).toHaveLength(1);
      expect(pattern!.outliers[0]).toEqual({
        file: 'src/outlier.ts',
        range: {
          start: { line: 15, character: 1 },
          end: { line: 15, character: 1 },
        },
        reason: 'Uses different naming convention',
        deviationScore: 0.7,
      });
    });

    it('should find pattern in any status directory', async () => {
      const approvedPattern = createTestPattern({ id: 'approved-pattern' });
      const patternFile = createTestPatternFile('logging', [approvedPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'approved', 'logging.json'),
        JSON.stringify(patternFile)
      );

      const pattern = await reader.getPattern('approved-pattern');
      
      expect(pattern).not.toBeNull();
      expect(pattern!.status).toBe('approved');
    });

    it('should find pattern in any category file', async () => {
      const errorsPattern = createTestPattern({ id: 'errors-pattern' });
      const patternFile = createTestPatternFile('errors', [errorsPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'errors.json'),
        JSON.stringify(patternFile)
      );

      const pattern = await reader.getPattern('errors-pattern');
      
      expect(pattern).not.toBeNull();
      expect(pattern!.category).toBe('errors');
    });
  });

  // ==========================================================================
  // getViolations Tests
  // ==========================================================================

  describe('getViolations', () => {
    it('should return empty array when no patterns have outliers', async () => {
      const testPattern = createTestPattern({ id: 'no-outliers', outliers: [] });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const violations = await reader.getViolations();
      expect(violations).toEqual([]);
    });

    it('should convert outliers to violations', async () => {
      const testPattern = createTestPattern({
        id: 'pattern-1',
        name: 'Test Pattern',
        severity: 'warning',
        outliers: [
          createTestOutlier({
            file: 'src/violation.ts',
            line: 25,
            column: 10,
            reason: 'Inconsistent naming',
          }),
        ],
      });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const violations = await reader.getViolations();
      
      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatchObject({
        patternId: 'pattern-1',
        patternName: 'Test Pattern',
        severity: 'warning',
        file: 'src/violation.ts',
        message: 'Inconsistent naming',
      });
      expect(violations[0].range).toEqual({
        start: { line: 25, character: 10 },
        end: { line: 25, character: 10 },
      });
    });

    it('should generate unique violation IDs', async () => {
      const testPattern = createTestPattern({
        id: 'pattern-1',
        outliers: [
          createTestOutlier({ file: 'a.ts', line: 10, column: 1 }),
          createTestOutlier({ file: 'b.ts', line: 20, column: 5 }),
        ],
      });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const violations = await reader.getViolations();
      
      expect(violations).toHaveLength(2);
      expect(violations[0].id).not.toBe(violations[1].id);
      expect(violations[0].id).toBe('pattern-1-a.ts-10-1');
      expect(violations[1].id).toBe('pattern-1-b.ts-20-5');
    });

    it('should aggregate violations from multiple patterns', async () => {
      const pattern1 = createTestPattern({
        id: 'pattern-1',
        outliers: [createTestOutlier({ file: 'a.ts', line: 10 })],
      });
      const pattern2 = createTestPattern({
        id: 'pattern-2',
        outliers: [createTestOutlier({ file: 'b.ts', line: 20 })],
      });
      const patternFile = createTestPatternFile('api', [pattern1, pattern2]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const violations = await reader.getViolations();
      
      expect(violations).toHaveLength(2);
      expect(violations.map(v => v.patternId).sort()).toEqual(['pattern-1', 'pattern-2']);
    });

    // Filter tests
    describe('filtering', () => {
      beforeEach(async () => {
        const warningPattern = createTestPattern({
          id: 'warning-pattern',
          name: 'Warning Pattern',
          severity: 'warning',
          outliers: [
            createTestOutlier({ file: 'src/warning.ts', line: 10, reason: 'Warning issue' }),
          ],
        });
        const errorPattern = createTestPattern({
          id: 'error-pattern',
          name: 'Error Pattern',
          severity: 'error',
          outliers: [
            createTestOutlier({ file: 'src/error.ts', line: 20, reason: 'Critical error' }),
          ],
        });
        
        await fs.writeFile(
          path.join(driftDir, 'patterns', 'discovered', 'api.json'),
          JSON.stringify(createTestPatternFile('api', [warningPattern, errorPattern]))
        );
      });

      it('should filter by severity', async () => {
        const violations = await reader.getViolations({ severity: 'error' });
        
        expect(violations).toHaveLength(1);
        expect(violations[0].severity).toBe('error');
      });

      it('should filter by file', async () => {
        const violations = await reader.getViolations({ file: 'src/warning.ts' });
        
        expect(violations).toHaveLength(1);
        expect(violations[0].file).toBe('src/warning.ts');
      });

      it('should filter by pattern ID', async () => {
        const violations = await reader.getViolations({ patternId: 'error-pattern' });
        
        expect(violations).toHaveLength(1);
        expect(violations[0].patternId).toBe('error-pattern');
      });

      it('should filter by search term in message', async () => {
        const violations = await reader.getViolations({ search: 'critical' });
        
        expect(violations).toHaveLength(1);
        expect(violations[0].message.toLowerCase()).toContain('critical');
      });

      it('should filter by search term in pattern name', async () => {
        const violations = await reader.getViolations({ search: 'Warning Pattern' });
        
        expect(violations).toHaveLength(1);
        expect(violations[0].patternName).toBe('Warning Pattern');
      });

      it('should combine multiple filters', async () => {
        const violations = await reader.getViolations({
          severity: 'warning',
          file: 'src/warning.ts',
        });
        
        expect(violations).toHaveLength(1);
        expect(violations[0].severity).toBe('warning');
        expect(violations[0].file).toBe('src/warning.ts');
      });
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should handle missing patterns directory gracefully', async () => {
      // Remove the patterns directory
      await fs.rm(path.join(driftDir, 'patterns'), { recursive: true, force: true });
      
      const patterns = await reader.getPatterns();
      expect(patterns).toEqual([]);
    });

    it('should handle malformed JSON files gracefully', async () => {
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        'not valid json'
      );

      // Should not throw, just skip the malformed file
      const patterns = await reader.getPatterns();
      expect(patterns).toEqual([]);
    });

    it('should continue reading other files when one fails', async () => {
      const validPattern = createTestPattern({ id: 'valid-pattern' });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        'not valid json'
      );
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'logging.json'),
        JSON.stringify(createTestPatternFile('logging', [validPattern]))
      );

      const patterns = await reader.getPatterns();
      
      expect(patterns).toHaveLength(1);
      expect(patterns[0].id).toBe('valid-pattern');
    });
  });

  // ==========================================================================
  // getStats Tests
  // ==========================================================================

  describe('getStats', () => {
    it('should return empty stats when no patterns exist', async () => {
      const stats = await reader.getStats();
      
      expect(stats.patterns.total).toBe(0);
      expect(stats.violations.total).toBe(0);
      expect(stats.files.total).toBe(0);
      expect(stats.healthScore).toBe(100);
    });

    it('should count patterns by status', async () => {
      const discoveredPattern = createTestPattern({ id: 'discovered-1' });
      const approvedPattern = createTestPattern({ id: 'approved-1' });
      const ignoredPattern = createTestPattern({ id: 'ignored-1' });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [discoveredPattern]))
      );
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'approved', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [approvedPattern]))
      );
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'ignored', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [ignoredPattern]))
      );

      const stats = await reader.getStats();
      
      expect(stats.patterns.total).toBe(3);
      expect(stats.patterns.byStatus.discovered).toBe(1);
      expect(stats.patterns.byStatus.approved).toBe(1);
      expect(stats.patterns.byStatus.ignored).toBe(1);
    });

    it('should count patterns by category', async () => {
      const apiPattern = createTestPattern({ id: 'api-1' });
      const loggingPattern = createTestPattern({ id: 'logging-1' });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [apiPattern]))
      );
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'logging.json'),
        JSON.stringify(createTestPatternFile('logging', [loggingPattern]))
      );

      const stats = await reader.getStats();
      
      expect(stats.patterns.byCategory.api).toBe(1);
      expect(stats.patterns.byCategory.logging).toBe(1);
    });

    it('should count violations by severity', async () => {
      const errorPattern = createTestPattern({
        id: 'error-pattern',
        severity: 'error',
        outliers: [createTestOutlier({ file: 'a.ts', line: 10 })],
      });
      const warningPattern = createTestPattern({
        id: 'warning-pattern',
        severity: 'warning',
        outliers: [
          createTestOutlier({ file: 'b.ts', line: 20 }),
          createTestOutlier({ file: 'c.ts', line: 30 }),
        ],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [errorPattern, warningPattern]))
      );

      const stats = await reader.getStats();
      
      expect(stats.violations.total).toBe(3);
      expect(stats.violations.bySeverity.error).toBe(1);
      expect(stats.violations.bySeverity.warning).toBe(2);
    });

    it('should count unique files', async () => {
      const pattern = createTestPattern({
        id: 'pattern-1',
        locations: [
          { file: 'src/a.ts', line: 10, column: 1 },
          { file: 'src/b.ts', line: 20, column: 1 },
          { file: 'src/a.ts', line: 30, column: 1 }, // Duplicate file
        ],
        outliers: [
          createTestOutlier({ file: 'src/c.ts', line: 40 }),
        ],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const stats = await reader.getStats();
      
      expect(stats.files.total).toBe(3); // a.ts, b.ts, c.ts (unique)
    });

    it('should calculate health score based on violations', async () => {
      // Create patterns with violations
      const errorPattern = createTestPattern({
        id: 'error-pattern',
        severity: 'error',
        outliers: [createTestOutlier({ file: 'a.ts', line: 10 })],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [errorPattern]))
      );

      const stats = await reader.getStats();
      
      // Base 100 - 10 (error) = 90
      expect(stats.healthScore).toBe(90);
    });

    it('should add bonus for approved patterns', async () => {
      const approvedPattern = createTestPattern({ id: 'approved-1' });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'approved', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [approvedPattern]))
      );

      const stats = await reader.getStats();
      
      // Base 100 + 10 (100% approval rate) = 110, clamped to 100
      expect(stats.healthScore).toBe(100);
    });

    it('should return lastScan from pattern metadata', async () => {
      const pattern = createTestPattern({ id: 'pattern-1' });
      pattern.metadata.lastSeen = '2024-01-15T12:00:00.000Z';
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const stats = await reader.getStats();
      
      expect(stats.lastScan).toBe('2024-01-15T12:00:00.000Z');
    });
  });

  // ==========================================================================
  // getFileTree Tests
  // ==========================================================================

  describe('getFileTree', () => {
    it('should return empty array when no patterns exist', async () => {
      const tree = await reader.getFileTree();
      expect(tree).toEqual([]);
    });

    it('should build file tree from pattern locations', async () => {
      const pattern = createTestPattern({
        id: 'pattern-1',
        locations: [
          { file: 'src/utils/helper.ts', line: 10, column: 1 },
          { file: 'src/components/Button.tsx', line: 20, column: 1 },
        ],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const tree = await reader.getFileTree();
      
      // Should have 'src' as root
      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe('src');
      expect(tree[0].type).toBe('directory');
      expect(tree[0].children).toBeDefined();
    });

    it('should include pattern counts in file nodes', async () => {
      const pattern = createTestPattern({
        id: 'pattern-1',
        locations: [
          { file: 'src/test.ts', line: 10, column: 1 },
          { file: 'src/test.ts', line: 20, column: 1 }, // Same file, different location
        ],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const tree = await reader.getFileTree();
      
      // Find the file node
      const srcDir = tree.find(n => n.name === 'src');
      expect(srcDir).toBeDefined();
      const fileNode = srcDir!.children?.find(n => n.name === 'test.ts');
      expect(fileNode).toBeDefined();
      expect(fileNode!.patternCount).toBe(2);
    });

    it('should include violation counts and severity in file nodes', async () => {
      const pattern = createTestPattern({
        id: 'pattern-1',
        severity: 'error',
        locations: [{ file: 'src/test.ts', line: 10, column: 1 }],
        outliers: [
          createTestOutlier({ file: 'src/test.ts', line: 20 }),
          createTestOutlier({ file: 'src/test.ts', line: 30 }),
        ],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const tree = await reader.getFileTree();
      
      const srcDir = tree.find(n => n.name === 'src');
      const fileNode = srcDir!.children?.find(n => n.name === 'test.ts');
      expect(fileNode!.violationCount).toBe(2);
      expect(fileNode!.severity).toBe('error');
    });

    it('should aggregate counts in directory nodes', async () => {
      const pattern = createTestPattern({
        id: 'pattern-1',
        locations: [
          { file: 'src/a.ts', line: 10, column: 1 },
          { file: 'src/b.ts', line: 20, column: 1 },
        ],
        outliers: [
          createTestOutlier({ file: 'src/a.ts', line: 30 }),
        ],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const tree = await reader.getFileTree();
      
      const srcDir = tree.find(n => n.name === 'src');
      expect(srcDir!.patternCount).toBe(2);
      expect(srcDir!.violationCount).toBe(1);
    });

    it('should track highest severity in directories', async () => {
      const warningPattern = createTestPattern({
        id: 'warning-pattern',
        severity: 'warning',
        outliers: [createTestOutlier({ file: 'src/a.ts', line: 10 })],
      });
      const errorPattern = createTestPattern({
        id: 'error-pattern',
        severity: 'error',
        outliers: [createTestOutlier({ file: 'src/b.ts', line: 20 })],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [warningPattern, errorPattern]))
      );

      const tree = await reader.getFileTree();
      
      const srcDir = tree.find(n => n.name === 'src');
      expect(srcDir!.severity).toBe('error'); // Highest severity
    });

    it('should sort directories before files', async () => {
      const pattern = createTestPattern({
        id: 'pattern-1',
        locations: [
          { file: 'src/utils/helper.ts', line: 10, column: 1 },
          { file: 'src/index.ts', line: 20, column: 1 },
        ],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const tree = await reader.getFileTree();
      
      const srcDir = tree.find(n => n.name === 'src');
      expect(srcDir!.children![0].type).toBe('directory'); // utils first
      expect(srcDir!.children![1].type).toBe('file'); // index.ts second
    });
  });

  // ==========================================================================
  // getFileDetails Tests
  // ==========================================================================

  describe('getFileDetails', () => {
    it('should return null when file has no patterns or violations', async () => {
      const details = await reader.getFileDetails('non-existent.ts');
      expect(details).toBeNull();
    });

    it('should return patterns for a file', async () => {
      const pattern = createTestPattern({
        id: 'pattern-1',
        name: 'Test Pattern',
        locations: [
          { file: 'src/test.ts', line: 10, column: 1 },
          { file: 'src/test.ts', line: 20, column: 5 },
          { file: 'src/other.ts', line: 30, column: 1 }, // Different file
        ],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const details = await reader.getFileDetails('src/test.ts');
      
      expect(details).not.toBeNull();
      expect(details!.path).toBe('src/test.ts');
      expect(details!.patterns).toHaveLength(1);
      expect(details!.patterns[0].id).toBe('pattern-1');
      expect(details!.patterns[0].locations).toHaveLength(2); // Only locations in this file
    });

    it('should return violations for a file', async () => {
      const pattern = createTestPattern({
        id: 'pattern-1',
        name: 'Test Pattern',
        severity: 'warning',
        locations: [{ file: 'src/test.ts', line: 10, column: 1 }],
        outliers: [
          createTestOutlier({ file: 'src/test.ts', line: 20, reason: 'Issue 1' }),
          createTestOutlier({ file: 'src/test.ts', line: 30, reason: 'Issue 2' }),
          createTestOutlier({ file: 'src/other.ts', line: 40, reason: 'Other file' }),
        ],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const details = await reader.getFileDetails('src/test.ts');
      
      expect(details!.violations).toHaveLength(2);
      expect(details!.violations[0].message).toBe('Issue 1');
      expect(details!.violations[1].message).toBe('Issue 2');
    });

    it('should detect language from file extension', async () => {
      const pattern = createTestPattern({
        id: 'pattern-1',
        locations: [{ file: 'src/component.tsx', line: 10, column: 1 }],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const details = await reader.getFileDetails('src/component.tsx');
      
      expect(details!.language).toBe('typescript');
    });

    it('should return plaintext for unknown extensions', async () => {
      const pattern = createTestPattern({
        id: 'pattern-1',
        locations: [{ file: 'src/data.xyz', line: 10, column: 1 }],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const details = await reader.getFileDetails('src/data.xyz');
      
      expect(details!.language).toBe('plaintext');
    });

    it('should include pattern category', async () => {
      const pattern = createTestPattern({
        id: 'pattern-1',
        locations: [{ file: 'src/test.ts', line: 10, column: 1 }],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [pattern]))
      );

      const details = await reader.getFileDetails('src/test.ts');
      
      expect(details!.patterns[0].category).toBe('api');
    });
  });
});
