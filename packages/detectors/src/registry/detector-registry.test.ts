/**
 * Tests for DetectorRegistry
 *
 * @requirements 6.2 - THE Detector_System SHALL provide a registry for detector discovery and management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PatternCategory, Language, PatternMatch, Violation, QuickFix } from 'driftdetect-core';
import {
  DetectorRegistry,
  DetectorRegistrationError,
  DetectorNotFoundError,
  defaultRegistry,
  registerDetector,
  getDetector,
  queryDetectors,
  type RegistryEvent,
} from './detector-registry.js';
import { BaseDetector, type DetectionContext, type DetectionResult } from '../base/base-detector.js';
import type { DetectorInfo, DetectionMethod } from './types.js';

// ============================================================================
// Test Detector Implementation
// ============================================================================

/**
 * Concrete test detector for testing the registry
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

/**
 * Detector with lifecycle hooks for testing
 */
class LifecycleDetector extends TestDetector {
  public registerCalled = false;
  public unloadCalled = false;
  public fileChangeCalled = false;
  public lastChangedFile: string | undefined;

  constructor(id: string = 'test/lifecycle-detector') {
    super(id);
  }

  onRegister(): void {
    this.registerCalled = true;
  }

  onUnload(): void {
    this.unloadCalled = true;
  }

  onFileChange(file: string): void {
    this.fileChangeCalled = true;
    this.lastChangedFile = file;
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('DetectorRegistry', () => {
  let registry: DetectorRegistry;

  beforeEach(() => {
    registry = new DetectorRegistry();
  });

  describe('register()', () => {
    it('should register a valid detector', () => {
      const detector = new TestDetector();
      registry.register(detector);

      expect(registry.has(detector.id)).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should throw on duplicate registration without override', () => {
      const detector1 = new TestDetector('test/duplicate');
      const detector2 = new TestDetector('test/duplicate');

      registry.register(detector1);

      expect(() => registry.register(detector2)).toThrow(DetectorRegistrationError);
    });

    it('should allow duplicate registration with override option', () => {
      const detector1 = new TestDetector('test/override');
      const detector2 = new TestDetector('test/override');
      detector2.name; // Different instance

      registry.register(detector1);
      registry.register(detector2, { override: true });

      expect(registry.size).toBe(1);
    });

    it('should validate detector ID format', () => {
      // Invalid ID - no slash
      const invalidDetector = {
        id: 'invalid',
        category: 'structural' as PatternCategory,
        subcategory: 'test',
        name: 'Invalid',
        description: 'Invalid detector',
        supportedLanguages: ['typescript'] as Language[],
        detectionMethod: 'structural' as DetectionMethod,
        detect: async () => ({ patterns: [], violations: [], confidence: 1 }),
        generateQuickFix: () => null,
        getInfo: () => ({} as DetectorInfo),
        supportsLanguage: () => true,
      };

      expect(() => registry.register(invalidDetector as unknown as BaseDetector)).toThrow(
        DetectorRegistrationError
      );
    });

    it('should call onRegister lifecycle hook', () => {
      const detector = new LifecycleDetector();
      registry.register(detector);

      expect(detector.registerCalled).toBe(true);
    });

    it('should set priority from options', () => {
      const detector = new TestDetector('test/priority');
      registry.register(detector, { priority: 10 });

      const info = registry.getInfo('test/priority');
      expect(info?.priority).toBe(10);
    });

    it('should set enabled status from options', () => {
      const detector = new TestDetector('test/disabled');
      registry.register(detector, { enabled: false });

      expect(registry.isEnabled('test/disabled')).toBe(false);
    });
  });

  describe('registerFactory()', () => {
    it('should register a factory for lazy loading', () => {
      const info: DetectorInfo = {
        id: 'test/lazy',
        category: 'structural',
        subcategory: 'testing',
        name: 'Lazy Detector',
        description: 'A lazily loaded detector',
        supportedLanguages: ['typescript'],
        detectionMethod: 'structural',
      };

      registry.registerFactory('test/lazy', () => new TestDetector('test/lazy'), info);

      expect(registry.has('test/lazy')).toBe(true);
    });

    it('should instantiate detector on first get()', async () => {
      let instantiated = false;
      const info: DetectorInfo = {
        id: 'test/lazy-get',
        category: 'structural',
        subcategory: 'testing',
        name: 'Lazy Detector',
        description: 'A lazily loaded detector',
        supportedLanguages: ['typescript'],
        detectionMethod: 'structural',
      };

      registry.registerFactory(
        'test/lazy-get',
        () => {
          instantiated = true;
          return new TestDetector('test/lazy-get');
        },
        info
      );

      expect(instantiated).toBe(false);

      const detector = await registry.get('test/lazy-get');

      expect(instantiated).toBe(true);
      expect(detector).toBeDefined();
    });
  });

  describe('unregister()', () => {
    it('should unregister a detector', () => {
      const detector = new TestDetector('test/unregister');
      registry.register(detector);

      expect(registry.has('test/unregister')).toBe(true);

      const result = registry.unregister('test/unregister');

      expect(result).toBe(true);
      expect(registry.has('test/unregister')).toBe(false);
    });

    it('should return false for non-existent detector', () => {
      const result = registry.unregister('test/nonexistent');
      expect(result).toBe(false);
    });

    it('should call onUnload lifecycle hook', () => {
      const detector = new LifecycleDetector('test/unload');
      registry.register(detector);

      registry.unregister('test/unload');

      expect(detector.unloadCalled).toBe(true);
    });
  });

  describe('get()', () => {
    it('should return registered detector', async () => {
      const detector = new TestDetector('test/get');
      registry.register(detector);

      const result = await registry.get('test/get');

      expect(result).toBe(detector);
    });

    it('should return undefined for non-existent detector', async () => {
      const result = await registry.get('test/nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getSync()', () => {
    it('should return instantiated detector', () => {
      const detector = new TestDetector('test/sync');
      registry.register(detector);

      const result = registry.getSync('test/sync');

      expect(result).toBe(detector);
    });

    it('should return undefined for factory-registered detector', () => {
      const info: DetectorInfo = {
        id: 'test/factory-sync',
        category: 'structural',
        subcategory: 'testing',
        name: 'Factory Detector',
        description: 'A factory detector',
        supportedLanguages: ['typescript'],
        detectionMethod: 'structural',
      };

      registry.registerFactory('test/factory-sync', () => new TestDetector('test/factory-sync'), info);

      const result = registry.getSync('test/factory-sync');

      expect(result).toBeUndefined();
    });
  });

  describe('query()', () => {
    beforeEach(() => {
      registry.register(new TestDetector('structural/file-naming', 'structural', 'naming'));
      registry.register(new TestDetector('structural/directory', 'structural', 'organization'));
      registry.register(new TestDetector('components/props', 'components', 'props', ['typescript']));
      registry.register(new TestDetector('styling/colors', 'styling', 'colors', ['css']));
    });

    it('should return all detectors with empty query', () => {
      const result = registry.query();
      expect(result.count).toBe(4);
    });

    it('should filter by category', () => {
      const result = registry.query({ category: 'structural' });
      expect(result.count).toBe(2);
      expect(result.detectors.every((d) => d.info.category === 'structural')).toBe(true);
    });

    it('should filter by subcategory', () => {
      const result = registry.query({ subcategory: 'naming' });
      expect(result.count).toBe(1);
      expect(result.detectors[0].info.id).toBe('structural/file-naming');
    });

    it('should filter by language', () => {
      const result = registry.query({ language: 'css' });
      expect(result.count).toBe(1);
      expect(result.detectors[0].info.id).toBe('styling/colors');
    });

    it('should filter by detection method', () => {
      const result = registry.query({ detectionMethod: 'structural' });
      expect(result.count).toBe(4); // All test detectors use structural
    });

    it('should filter by enabled status', () => {
      registry.disable('structural/file-naming');

      const enabledResult = registry.query({ enabled: true });
      const disabledResult = registry.query({ enabled: false });

      expect(enabledResult.count).toBe(3);
      expect(disabledResult.count).toBe(1);
    });

    it('should filter by ID pattern (string)', () => {
      const result = registry.query({ idPattern: 'structural' });
      expect(result.count).toBe(2);
    });

    it('should filter by ID pattern (RegExp)', () => {
      const result = registry.query({ idPattern: /^structural\// });
      expect(result.count).toBe(2);
    });

    it('should sort by priority', () => {
      registry.register(new TestDetector('test/high-priority'), { priority: 100 });
      registry.register(new TestDetector('test/low-priority'), { priority: -10 });

      const result = registry.query({ idPattern: /^test\// });

      expect(result.detectors[0].info.id).toBe('test/high-priority');
      expect(result.detectors[1].info.id).toBe('test/low-priority');
    });
  });

  describe('enable() / disable()', () => {
    it('should enable a disabled detector', () => {
      const detector = new TestDetector('test/enable');
      registry.register(detector, { enabled: false });

      expect(registry.isEnabled('test/enable')).toBe(false);

      registry.enable('test/enable');

      expect(registry.isEnabled('test/enable')).toBe(true);
    });

    it('should disable an enabled detector', () => {
      const detector = new TestDetector('test/disable');
      registry.register(detector);

      expect(registry.isEnabled('test/disable')).toBe(true);

      registry.disable('test/disable');

      expect(registry.isEnabled('test/disable')).toBe(false);
    });

    it('should return false for non-existent detector', () => {
      expect(registry.enable('test/nonexistent')).toBe(false);
      expect(registry.disable('test/nonexistent')).toBe(false);
    });
  });

  describe('events', () => {
    it('should emit registered event', () => {
      const events: RegistryEvent[] = [];
      registry.addEventListener((event) => events.push(event));

      const detector = new TestDetector('test/event');
      registry.register(detector);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('registered');
      expect(events[0].detectorId).toBe('test/event');
    });

    it('should emit unregistered event', () => {
      const detector = new TestDetector('test/unregister-event');
      registry.register(detector);

      const events: RegistryEvent[] = [];
      registry.addEventListener((event) => events.push(event));

      registry.unregister('test/unregister-event');

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('unregistered');
    });

    it('should emit enabled/disabled events', () => {
      const detector = new TestDetector('test/toggle-event');
      registry.register(detector);

      const events: RegistryEvent[] = [];
      registry.addEventListener((event) => events.push(event));

      registry.disable('test/toggle-event');
      registry.enable('test/toggle-event');

      expect(events.length).toBe(2);
      expect(events[0].type).toBe('disabled');
      expect(events[1].type).toBe('enabled');
    });

    it('should remove event listener', () => {
      const events: RegistryEvent[] = [];
      const listener = (event: RegistryEvent) => events.push(event);

      registry.addEventListener(listener);
      registry.register(new TestDetector('test/listener1'));

      registry.removeEventListener(listener);
      registry.register(new TestDetector('test/listener2'));

      expect(events.length).toBe(1);
    });
  });

  describe('notifyFileChange()', () => {
    it('should notify all detectors of file change', () => {
      const detector1 = new LifecycleDetector('test/notify1');
      const detector2 = new LifecycleDetector('test/notify2');

      registry.register(detector1);
      registry.register(detector2);

      registry.notifyFileChange('/path/to/file.ts');

      expect(detector1.fileChangeCalled).toBe(true);
      expect(detector1.lastChangedFile).toBe('/path/to/file.ts');
      expect(detector2.fileChangeCalled).toBe(true);
      expect(detector2.lastChangedFile).toBe('/path/to/file.ts');
    });
  });

  describe('clear()', () => {
    it('should remove all detectors', () => {
      registry.register(new TestDetector('test/clear1'));
      registry.register(new TestDetector('test/clear2'));

      expect(registry.size).toBe(2);

      registry.clear();

      expect(registry.size).toBe(0);
    });

    it('should call onUnload for all detectors', () => {
      const detector1 = new LifecycleDetector('test/clear-unload1');
      const detector2 = new LifecycleDetector('test/clear-unload2');

      registry.register(detector1);
      registry.register(detector2);

      registry.clear();

      expect(detector1.unloadCalled).toBe(true);
      expect(detector2.unloadCalled).toBe(true);
    });
  });

  describe('getIds() / getAll()', () => {
    it('should return all detector IDs', () => {
      registry.register(new TestDetector('test/ids1'));
      registry.register(new TestDetector('test/ids2'));

      const ids = registry.getIds();

      expect(ids).toContain('test/ids1');
      expect(ids).toContain('test/ids2');
      expect(ids.length).toBe(2);
    });

    it('should return all registered detectors', () => {
      registry.register(new TestDetector('test/all1'));
      registry.register(new TestDetector('test/all2'));

      const all = registry.getAll();

      expect(all.length).toBe(2);
    });
  });
});

describe('Convenience functions', () => {
  beforeEach(() => {
    defaultRegistry.clear();
  });

  it('registerDetector should register with default registry', () => {
    const detector = new TestDetector('test/convenience');
    registerDetector(detector);

    expect(defaultRegistry.has('test/convenience')).toBe(true);
  });

  it('getDetector should get from default registry', async () => {
    const detector = new TestDetector('test/get-convenience');
    defaultRegistry.register(detector);

    const result = await getDetector('test/get-convenience');

    expect(result).toBe(detector);
  });

  it('queryDetectors should query default registry', () => {
    defaultRegistry.register(new TestDetector('structural/query1', 'structural'));
    defaultRegistry.register(new TestDetector('components/query2', 'components'));

    const result = queryDetectors({ category: 'structural' });

    expect(result.count).toBe(1);
  });
});
