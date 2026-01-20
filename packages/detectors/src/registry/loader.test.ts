/**
 * Tests for DetectorLoader
 *
 * @requirements 6.7 - THE Detector_System SHALL support lazy loading of detectors
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PatternCategory, Language, Violation, QuickFix } from 'driftdetect-core';
import {
  DetectorLoader,
  createDetectorModule,
  createLoader,
  type DetectorModule,
  type LoadResult,
} from './loader.js';
import { DetectorRegistry, DetectorRegistrationError } from './detector-registry.js';
import { BaseDetector, type DetectionContext, type DetectionResult } from '../base/base-detector.js';
import type { DetectorInfo, DetectionMethod } from './types.js';

// ============================================================================
// Test Detector Implementation
// ============================================================================

/**
 * Concrete test detector for testing the loader
 */
class TestDetector extends BaseDetector {
  readonly id: string;
  readonly category: PatternCategory;
  readonly subcategory: string;
  readonly name: string;
  readonly description: string;
  readonly supportedLanguages: Language[];
  readonly detectionMethod: DetectionMethod;

  constructor(
    id: string = 'test/test-detector',
    category: PatternCategory = 'structural',
    subcategory: string = 'testing',
    supportedLanguages: Language[] = ['typescript', 'javascript']
  ) {
    super();
    this.id = id;
    this.category = category;
    this.subcategory = subcategory;
    this.name = 'Test Detector';
    this.description = 'A test detector for unit testing';
    this.supportedLanguages = supportedLanguages;
    this.detectionMethod = 'structural';
  }

  async detect(_context: DetectionContext): Promise<DetectionResult> {
    return this.createEmptyResult();
  }

  generateQuickFix(_violation: Violation): QuickFix | null {
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test detector info object
 */
function createTestInfo(
  id: string,
  category: PatternCategory = 'structural',
  supportedLanguages: Language[] = ['typescript']
): DetectorInfo {
  return {
    id,
    category,
    subcategory: 'testing',
    name: `Test Detector ${id}`,
    description: `A test detector with id ${id}`,
    supportedLanguages,
    detectionMethod: 'structural',
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('DetectorLoader', () => {
  let registry: DetectorRegistry;
  let loader: DetectorLoader;

  beforeEach(() => {
    registry = new DetectorRegistry();
    loader = new DetectorLoader(registry);
  });

  describe('registerModule()', () => {
    it('should register a detector module', () => {
      const module: DetectorModule = {
        id: 'test/module',
        info: createTestInfo('test/module'),
        modulePath: './test-detector.js',
      };

      loader.registerModule(module);

      expect(loader.hasModule('test/module')).toBe(true);
      expect(loader.size).toBe(1);
    });

    it('should throw on duplicate module registration', () => {
      const module: DetectorModule = {
        id: 'test/duplicate',
        info: createTestInfo('test/duplicate'),
        modulePath: './test-detector.js',
      };

      loader.registerModule(module);

      expect(() => loader.registerModule(module)).toThrow(DetectorRegistrationError);
    });

    it('should register module with registry for lazy loading', () => {
      const module: DetectorModule = {
        id: 'test/registry',
        info: createTestInfo('test/registry'),
        modulePath: './test-detector.js',
      };

      loader.registerModule(module);

      expect(registry.has('test/registry')).toBe(true);
    });
  });

  describe('registerModules()', () => {
    it('should register multiple modules', () => {
      const modules: DetectorModule[] = [
        { id: 'test/module1', info: createTestInfo('test/module1'), modulePath: './m1.js' },
        { id: 'test/module2', info: createTestInfo('test/module2'), modulePath: './m2.js' },
        { id: 'test/module3', info: createTestInfo('test/module3'), modulePath: './m3.js' },
      ];

      loader.registerModules(modules);

      expect(loader.size).toBe(3);
      expect(loader.hasModule('test/module1')).toBe(true);
      expect(loader.hasModule('test/module2')).toBe(true);
      expect(loader.hasModule('test/module3')).toBe(true);
    });
  });

  describe('unregisterModule()', () => {
    it('should unregister a module', () => {
      const module: DetectorModule = {
        id: 'test/unregister',
        info: createTestInfo('test/unregister'),
        modulePath: './test-detector.js',
      };

      loader.registerModule(module);
      expect(loader.hasModule('test/unregister')).toBe(true);

      const result = loader.unregisterModule('test/unregister');

      expect(result).toBe(true);
      expect(loader.hasModule('test/unregister')).toBe(false);
      expect(registry.has('test/unregister')).toBe(false);
    });

    it('should return false for non-existent module', () => {
      const result = loader.unregisterModule('test/nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getStatus()', () => {
    it('should return pending for newly registered module', () => {
      const module: DetectorModule = {
        id: 'test/status',
        info: createTestInfo('test/status'),
        modulePath: './test-detector.js',
      };

      loader.registerModule(module);

      expect(loader.getStatus('test/status')).toBe('pending');
    });

    it('should return undefined for non-existent module', () => {
      expect(loader.getStatus('test/nonexistent')).toBeUndefined();
    });
  });

  describe('getModuleIds()', () => {
    it('should return all registered module IDs', () => {
      loader.registerModule({
        id: 'test/ids1',
        info: createTestInfo('test/ids1'),
        modulePath: './m1.js',
      });
      loader.registerModule({
        id: 'test/ids2',
        info: createTestInfo('test/ids2'),
        modulePath: './m2.js',
      });

      const ids = loader.getModuleIds();

      expect(ids).toContain('test/ids1');
      expect(ids).toContain('test/ids2');
      expect(ids.length).toBe(2);
    });
  });

  describe('getModules()', () => {
    it('should return all registered modules', () => {
      const module1: DetectorModule = {
        id: 'test/modules1',
        info: createTestInfo('test/modules1'),
        modulePath: './m1.js',
      };
      const module2: DetectorModule = {
        id: 'test/modules2',
        info: createTestInfo('test/modules2'),
        modulePath: './m2.js',
      };

      loader.registerModule(module1);
      loader.registerModule(module2);

      const modules = loader.getModules();

      expect(modules.length).toBe(2);
      expect(modules.map((m) => m.id)).toContain('test/modules1');
      expect(modules.map((m) => m.id)).toContain('test/modules2');
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', () => {
      loader.registerModule({
        id: 'test/stats1',
        info: createTestInfo('test/stats1'),
        modulePath: './m1.js',
      });
      loader.registerModule({
        id: 'test/stats2',
        info: createTestInfo('test/stats2'),
        modulePath: './m2.js',
      });

      const stats = loader.getStats();

      expect(stats.pending).toBe(2);
      expect(stats.loading).toBe(0);
      expect(stats.loaded).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear all modules', () => {
      loader.registerModule({
        id: 'test/clear1',
        info: createTestInfo('test/clear1'),
        modulePath: './m1.js',
      });
      loader.registerModule({
        id: 'test/clear2',
        info: createTestInfo('test/clear2'),
        modulePath: './m2.js',
      });

      expect(loader.size).toBe(2);

      loader.clear();

      expect(loader.size).toBe(0);
    });
  });
});

describe('createDetectorModule()', () => {
  it('should create a detector module with required fields', () => {
    const info: Omit<DetectorInfo, 'id'> = {
      category: 'structural',
      subcategory: 'testing',
      name: 'Test Detector',
      description: 'A test detector',
      supportedLanguages: ['typescript'],
      detectionMethod: 'structural',
    };

    const module = createDetectorModule('test/create', info, './test.js');

    expect(module.id).toBe('test/create');
    expect(module.info.id).toBe('test/create');
    expect(module.info.category).toBe('structural');
    expect(module.modulePath).toBe('./test.js');
  });

  it('should create a detector module with optional fields', () => {
    const info: Omit<DetectorInfo, 'id'> = {
      category: 'structural',
      subcategory: 'testing',
      name: 'Test Detector',
      description: 'A test detector',
      supportedLanguages: ['typescript'],
      detectionMethod: 'structural',
    };

    const module = createDetectorModule('test/options', info, './test.js', {
      exportName: 'MyDetector',
      registrationOptions: { priority: 10 },
    });

    expect(module.exportName).toBe('MyDetector');
    expect(module.options?.priority).toBe(10);
  });
});

describe('createLoader()', () => {
  it('should create a loader with the given registry', () => {
    const registry = new DetectorRegistry();
    const loader = createLoader(registry);

    expect(loader).toBeInstanceOf(DetectorLoader);
  });

  it('should create a loader with config', () => {
    const registry = new DetectorRegistry();
    const loader = createLoader(registry, {
      basePath: '/detectors',
      loadTimeout: 5000,
    });

    expect(loader).toBeInstanceOf(DetectorLoader);
  });
});
