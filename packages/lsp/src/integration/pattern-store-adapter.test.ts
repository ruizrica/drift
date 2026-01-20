/**
 * Pattern Store Adapter Integration Tests
 *
 * Tests the integration between the LSP server and driftdetect-core pattern store.
 * Verifies approve, ignore, and variant operations persist correctly.
 *
 * @requirements 28.1-28.4 - LSP Server Commands
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { PatternStoreAdapter, createPatternStoreAdapter } from './pattern-store-adapter.js';
import type { CreateVariantInput } from './types.js';

/**
 * Mock logger for testing
 */
function createMockLogger() {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
}

/**
 * Create a test pattern file with discovered patterns
 */
async function createTestPatternFile(testDir: string): Promise<void> {
  const patternFile = {
    version: '1.0.0',
    category: 'structural',
    patterns: [
      {
        id: 'test-pattern-1',
        subcategory: 'naming',
        name: 'Test Pattern 1',
        description: 'A test pattern for unit tests',
        detector: {
          type: 'regex',
          config: {},
          regex: { pattern: 'test.*', flags: 'i' },
        },
        confidence: {
          frequency: 0.8,
          consistency: 0.9,
          age: 30,
          spread: 10,
          score: 0.85,
          level: 'high',
        },
        locations: [
          { file: 'src/test.ts', line: 1, column: 1 },
        ],
        outliers: [],
        metadata: {
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
        },
        severity: 'warning',
        autoFixable: false,
      },
    ],
    lastUpdated: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(testDir, '.drift', 'patterns', 'discovered', 'structural.json'),
    JSON.stringify(patternFile, null, 2)
  );
}

describe('PatternStoreAdapter', () => {
  let adapter: PatternStoreAdapter;
  let logger: ReturnType<typeof createMockLogger>;
  let testDir: string;

  beforeEach(async () => {
    logger = createMockLogger();
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'drift-lsp-adapter-test-'));

    // Create .drift directory structure
    await fs.mkdir(path.join(testDir, '.drift', 'patterns', 'approved'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.drift', 'patterns', 'discovered'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.drift', 'patterns', 'ignored'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.drift', 'patterns', 'variants'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.drift', 'history'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.drift', 'cache'), { recursive: true });
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.shutdown();
    }
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should create an adapter with default config', () => {
      adapter = createPatternStoreAdapter({}, logger);
      expect(adapter).toBeDefined();
      expect(adapter.isInitialized()).toBe(false);
    });

    it('should initialize successfully', async () => {
      adapter = createPatternStoreAdapter({ rootDir: testDir }, logger);
      await adapter.initialize();

      expect(adapter.isInitialized()).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Pattern store adapter initialization complete');
    });

    it('should not re-initialize if already initialized', async () => {
      adapter = createPatternStoreAdapter({ rootDir: testDir }, logger);
      await adapter.initialize();
      await adapter.initialize();

      const initCalls = logger.info.mock.calls.filter(
        (call) => call[0] === 'Pattern store adapter initialization complete'
      );
      expect(initCalls.length).toBe(1);
    });
  });

  describe('approve operation', () => {
    beforeEach(async () => {
      await createTestPatternFile(testDir);
      adapter = createPatternStoreAdapter({ rootDir: testDir }, logger);
      await adapter.initialize();
    });

    /**
     * @requirements 28.1 - drift.approvePattern
     */
    it('should approve a discovered pattern', async () => {
      const result = await adapter.approve('test-pattern-1');

      expect(result.success).toBe(true);
      expect(result.patternId).toBe('test-pattern-1');
      expect(logger.info).toHaveBeenCalledWith('Pattern approved: test-pattern-1');
    });

    it('should return error for non-existent pattern', async () => {
      const result = await adapter.approve('non-existent-pattern');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when not initialized', async () => {
      const uninitializedAdapter = createPatternStoreAdapter({}, logger);
      const result = await uninitializedAdapter.approve('test-pattern-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pattern store not initialized');
    });
  });

  describe('ignore operation', () => {
    beforeEach(async () => {
      await createTestPatternFile(testDir);
      adapter = createPatternStoreAdapter({ rootDir: testDir }, logger);
      await adapter.initialize();
    });

    /**
     * @requirements 28.2 - drift.ignorePattern
     */
    it('should ignore a discovered pattern', async () => {
      const result = await adapter.ignore('test-pattern-1');

      expect(result.success).toBe(true);
      expect(result.patternId).toBe('test-pattern-1');
      expect(logger.info).toHaveBeenCalledWith('Pattern ignored: test-pattern-1');
    });

    it('should return error for non-existent pattern', async () => {
      const result = await adapter.ignore('non-existent-pattern');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when not initialized', async () => {
      const uninitializedAdapter = createPatternStoreAdapter({}, logger);
      const result = await uninitializedAdapter.ignore('test-pattern-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pattern store not initialized');
    });
  });

  describe('createVariant operation', () => {
    beforeEach(async () => {
      await createTestPatternFile(testDir);
      adapter = createPatternStoreAdapter({ rootDir: testDir }, logger);
      await adapter.initialize();
    });

    /**
     * @requirements 28.4 - drift.createVariant
     */
    it('should create a variant for a pattern', async () => {
      const input: CreateVariantInput = {
        patternId: 'test-pattern-1',
        name: 'test-variant',
        reason: 'Intentional deviation for testing',
        scope: 'file',
        scopeValue: 'src/test.ts',
        file: 'src/test.ts',
        line: 1,
        column: 1,
      };

      const result = await adapter.createVariant(input);

      expect(result.success).toBe(true);
      expect(result.patternId).toBe('test-pattern-1');
      expect(result.variantId).toBeDefined();
    });

    it('should create a global variant', async () => {
      const input: CreateVariantInput = {
        patternId: 'test-pattern-1',
        name: 'global-variant',
        reason: 'Global exception for testing',
        scope: 'global',
        file: '',
        line: 1,
        column: 1,
      };

      const result = await adapter.createVariant(input);

      expect(result.success).toBe(true);
    });

    it('should create a directory-scoped variant', async () => {
      const input: CreateVariantInput = {
        patternId: 'test-pattern-1',
        name: 'directory-variant',
        reason: 'Directory exception for testing',
        scope: 'directory',
        scopeValue: 'src/',
        file: 'src/test.ts',
        line: 1,
        column: 1,
      };

      const result = await adapter.createVariant(input);

      expect(result.success).toBe(true);
    });

    it('should return error when not initialized', async () => {
      const uninitializedAdapter = createPatternStoreAdapter({}, logger);
      const input: CreateVariantInput = {
        patternId: 'test-pattern-1',
        name: 'test-variant',
        reason: 'Test',
        scope: 'file',
        file: 'test.ts',
        line: 1,
        column: 1,
      };

      const result = await uninitializedAdapter.createVariant(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Variant manager not initialized');
    });
  });

  describe('pattern queries', () => {
    beforeEach(async () => {
      await createTestPatternFile(testDir);
      adapter = createPatternStoreAdapter({ rootDir: testDir }, logger);
      await adapter.initialize();
    });

    it('should get a pattern by ID', () => {
      const pattern = adapter.getPattern('test-pattern-1');

      expect(pattern).toBeDefined();
      expect(pattern?.id).toBe('test-pattern-1');
      expect(pattern?.name).toBe('Test Pattern 1');
    });

    it('should return undefined for non-existent pattern', () => {
      const pattern = adapter.getPattern('non-existent');

      expect(pattern).toBeUndefined();
    });

    it('should get discovered patterns', () => {
      const patterns = adapter.getDiscoveredPatterns();

      expect(patterns).toBeDefined();
      expect(patterns.length).toBeGreaterThanOrEqual(1);
    });

    it('should get approved patterns', () => {
      const patterns = adapter.getApprovedPatterns();

      expect(patterns).toBeDefined();
      // Initially no approved patterns
      expect(patterns.length).toBe(0);
    });

    it('should get ignored patterns', () => {
      const patterns = adapter.getIgnoredPatterns();

      expect(patterns).toBeDefined();
      // Initially no ignored patterns
      expect(patterns.length).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      adapter = createPatternStoreAdapter({ rootDir: testDir }, logger);
      await adapter.initialize();

      await adapter.shutdown();

      expect(adapter.isInitialized()).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('Pattern store adapter shutdown complete');
    });
  });
});
