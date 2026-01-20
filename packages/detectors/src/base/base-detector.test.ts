/**
 * Tests for BaseDetector abstract class
 *
 * @requirements 6.1 - THE Detector_System SHALL define a BaseDetector interface that all detectors implement
 * @requirements 6.3 - THE Detector SHALL declare its category, supported languages, and detection method
 * @requirements 6.6 - THE Detector SHALL be independently testable with mock AST inputs
 */

import { describe, it, expect, vi } from 'vitest';
import type { PatternCategory, Language, PatternMatch, Violation, QuickFix } from 'driftdetect-core';
import {
  BaseDetector,
  isBaseDetector,
  type DetectionContext,
  type DetectionResult,
  type ProjectContext,
} from './base-detector.js';

// ============================================================================
// Test Implementation of BaseDetector
// ============================================================================

/**
 * Concrete implementation of BaseDetector for testing
 */
class TestDetector extends BaseDetector {
  readonly id = 'test/test-detector';
  readonly category: PatternCategory = 'structural';
  readonly subcategory = 'test-subcategory';
  readonly name = 'Test Detector';
  readonly description = 'A test detector for unit testing';
  readonly supportedLanguages: Language[] = ['typescript', 'javascript'];
  readonly detectionMethod = 'ast' as const;

  // Track method calls for testing
  detectCalled = false;
  generateQuickFixCalled = false;
  onRegisterCalled = false;
  onFileChangeCalled = false;
  onUnloadCalled = false;
  lastFileChanged: string | null = null;

  async detect(context: DetectionContext): Promise<DetectionResult> {
    this.detectCalled = true;
    return this.createEmptyResult();
  }

  generateQuickFix(violation: Violation): QuickFix | null {
    this.generateQuickFixCalled = true;
    return null;
  }

  onRegister(): void {
    this.onRegisterCalled = true;
  }

  onFileChange(file: string): void {
    this.onFileChangeCalled = true;
    this.lastFileChanged = file;
  }

  onUnload(): void {
    this.onUnloadCalled = true;
  }
}

/**
 * Detector that returns patterns and violations for testing
 */
class PatternDetector extends BaseDetector {
  readonly id = 'test/pattern-detector';
  readonly category: PatternCategory = 'components';
  readonly subcategory = 'props-patterns';
  readonly name = 'Pattern Detector';
  readonly description = 'Returns patterns for testing';
  readonly supportedLanguages: Language[] = ['typescript'];
  readonly detectionMethod = 'ast' as const;

  private mockPatterns: PatternMatch[] = [];
  private mockViolations: Violation[] = [];

  setMockPatterns(patterns: PatternMatch[]): void {
    this.mockPatterns = patterns;
  }

  setMockViolations(violations: Violation[]): void {
    this.mockViolations = violations;
  }

  async detect(_context: DetectionContext): Promise<DetectionResult> {
    return this.createResult(this.mockPatterns, this.mockViolations, 0.95);
  }

  generateQuickFix(violation: Violation): QuickFix | null {
    return {
      title: `Fix ${violation.id}`,
      kind: 'quickfix',
      edit: { changes: {} },
      isPreferred: true,
      confidence: 0.9,
    };
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockProjectContext(): ProjectContext {
  return {
    rootDir: '/test/project',
    files: ['src/index.ts', 'src/utils.ts'],
    config: {},
  };
}

function createMockDetectionContext(overrides: Partial<DetectionContext> = {}): DetectionContext {
  return {
    file: 'src/test.ts',
    content: 'const x = 1;',
    ast: null,
    imports: [],
    exports: [],
    projectContext: createMockProjectContext(),
    language: 'typescript',
    extension: '.ts',
    isTestFile: false,
    isTypeDefinition: false,
    ...overrides,
  };
}

function createMockViolation(id: string = 'test-violation'): Violation {
  return {
    id,
    patternId: 'test-pattern',
    severity: 'warning',
    file: 'src/test.ts',
    range: {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 10 },
    },
    message: 'Test violation',
    expected: 'expected',
    actual: 'actual',
    aiExplainAvailable: false,
    aiFixAvailable: false,
    firstSeen: new Date(),
    occurrences: 1,
  };
}

function createMockPatternMatch(patternId: string = 'test-pattern'): PatternMatch {
  return {
    patternId,
    location: {
      file: 'src/test.ts',
      line: 1,
      column: 1,
    },
    confidence: 0.9,
    isOutlier: false,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('BaseDetector', () => {
  describe('metadata properties', () => {
    it('should have required metadata properties', () => {
      const detector = new TestDetector();

      expect(detector.id).toBe('test/test-detector');
      expect(detector.category).toBe('structural');
      expect(detector.subcategory).toBe('test-subcategory');
      expect(detector.name).toBe('Test Detector');
      expect(detector.description).toBe('A test detector for unit testing');
      expect(detector.supportedLanguages).toEqual(['typescript', 'javascript']);
      expect(detector.detectionMethod).toBe('ast');
    });

    it('should return detector info via getInfo()', () => {
      const detector = new TestDetector();
      const info = detector.getInfo();

      expect(info).toEqual({
        id: 'test/test-detector',
        category: 'structural',
        subcategory: 'test-subcategory',
        name: 'Test Detector',
        description: 'A test detector for unit testing',
        supportedLanguages: ['typescript', 'javascript'],
        detectionMethod: 'ast',
      });
    });
  });

  describe('detect() method', () => {
    it('should be callable with a detection context', async () => {
      const detector = new TestDetector();
      const context = createMockDetectionContext();

      const result = await detector.detect(context);

      expect(detector.detectCalled).toBe(true);
      expect(result).toBeDefined();
      expect(result.patterns).toEqual([]);
      expect(result.violations).toEqual([]);
      expect(result.confidence).toBe(1.0);
    });

    it('should return patterns and violations', async () => {
      const detector = new PatternDetector();
      const mockPattern = createMockPatternMatch();
      const mockViolation = createMockViolation();

      detector.setMockPatterns([mockPattern]);
      detector.setMockViolations([mockViolation]);

      const context = createMockDetectionContext();
      const result = await detector.detect(context);

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toEqual(mockPattern);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toEqual(mockViolation);
      expect(result.confidence).toBe(0.95);
    });
  });

  describe('generateQuickFix() method', () => {
    it('should be callable with a violation', () => {
      const detector = new TestDetector();
      const violation = createMockViolation();

      const fix = detector.generateQuickFix(violation);

      expect(detector.generateQuickFixCalled).toBe(true);
      expect(fix).toBeNull();
    });

    it('should return a quick fix when available', () => {
      const detector = new PatternDetector();
      const violation = createMockViolation('fix-me');

      const fix = detector.generateQuickFix(violation);

      expect(fix).not.toBeNull();
      expect(fix?.title).toBe('Fix fix-me');
      expect(fix?.kind).toBe('quickfix');
      expect(fix?.isPreferred).toBe(true);
      expect(fix?.confidence).toBe(0.9);
    });
  });

  describe('supportsLanguage() method', () => {
    it('should return true for supported languages', () => {
      const detector = new TestDetector();

      expect(detector.supportsLanguage('typescript')).toBe(true);
      expect(detector.supportsLanguage('javascript')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      const detector = new TestDetector();

      expect(detector.supportsLanguage('python')).toBe(false);
      expect(detector.supportsLanguage('css')).toBe(false);
    });
  });

  describe('lifecycle hooks', () => {
    it('should call onRegister when defined', () => {
      const detector = new TestDetector();

      detector.onRegister?.();

      expect(detector.onRegisterCalled).toBe(true);
    });

    it('should call onFileChange when defined', () => {
      const detector = new TestDetector();

      detector.onFileChange?.('src/changed.ts');

      expect(detector.onFileChangeCalled).toBe(true);
      expect(detector.lastFileChanged).toBe('src/changed.ts');
    });

    it('should call onUnload when defined', () => {
      const detector = new TestDetector();

      detector.onUnload?.();

      expect(detector.onUnloadCalled).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('createEmptyResult() should return empty result', async () => {
      const detector = new TestDetector();
      const context = createMockDetectionContext();

      const result = await detector.detect(context);

      expect(result.patterns).toEqual([]);
      expect(result.violations).toEqual([]);
      expect(result.confidence).toBe(1.0);
    });

    it('createResult() should include metadata when provided', async () => {
      // Create a detector that uses createResult with metadata
      class MetadataDetector extends BaseDetector {
        readonly id = 'test/metadata';
        readonly category: PatternCategory = 'structural';
        readonly subcategory = 'test';
        readonly name = 'Metadata Detector';
        readonly description = 'Test';
        readonly supportedLanguages: Language[] = ['typescript'];
        readonly detectionMethod = 'ast' as const;

        async detect(_context: DetectionContext): Promise<DetectionResult> {
          return this.createResult([], [], 0.8, {
            duration: 100,
            nodesAnalyzed: 50,
            warnings: ['test warning'],
          });
        }

        generateQuickFix(_violation: Violation): QuickFix | null {
          return null;
        }
      }

      const detector = new MetadataDetector();
      const context = createMockDetectionContext();
      const result = await detector.detect(context);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.duration).toBe(100);
      expect(result.metadata?.nodesAnalyzed).toBe(50);
      expect(result.metadata?.warnings).toEqual(['test warning']);
    });
  });
});

describe('isBaseDetector', () => {
  it('should return true for valid BaseDetector instances', () => {
    const detector = new TestDetector();
    expect(isBaseDetector(detector)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isBaseDetector(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isBaseDetector(undefined)).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(isBaseDetector('string')).toBe(false);
    expect(isBaseDetector(123)).toBe(false);
    expect(isBaseDetector(true)).toBe(false);
  });

  it('should return false for objects missing required properties', () => {
    expect(isBaseDetector({})).toBe(false);
    expect(isBaseDetector({ id: 'test' })).toBe(false);
    expect(
      isBaseDetector({
        id: 'test',
        category: 'structural',
        subcategory: 'test',
        name: 'Test',
        description: 'Test',
        supportedLanguages: ['typescript'],
        detectionMethod: 'ast',
        // Missing detect and generateQuickFix
      })
    ).toBe(false);
  });

  it('should return true for objects with all required properties', () => {
    const detectorLike = {
      id: 'test',
      category: 'structural',
      subcategory: 'test',
      name: 'Test',
      description: 'Test',
      supportedLanguages: ['typescript'],
      detectionMethod: 'ast',
      detect: async () => ({ patterns: [], violations: [], confidence: 1 }),
      generateQuickFix: () => null,
    };

    expect(isBaseDetector(detectorLike)).toBe(true);
  });
});

describe('DetectionContext', () => {
  it('should support all required properties', () => {
    const context = createMockDetectionContext({
      file: 'src/component.tsx',
      content: 'export const Component = () => <div />;',
      language: 'typescript',
      extension: '.tsx',
      isTestFile: false,
      isTypeDefinition: false,
      imports: [
        {
          source: 'react',
          namedImports: ['useState'],
          isTypeOnly: false,
          sideEffectOnly: false,
          line: 1,
          column: 1,
        },
      ],
      exports: [
        {
          name: 'Component',
          isDefault: false,
          isTypeOnly: false,
          isReExport: false,
          line: 3,
          column: 1,
        },
      ],
    });

    expect(context.file).toBe('src/component.tsx');
    expect(context.language).toBe('typescript');
    expect(context.extension).toBe('.tsx');
    expect(context.imports).toHaveLength(1);
    expect(context.imports[0].source).toBe('react');
    expect(context.exports).toHaveLength(1);
    expect(context.exports[0].name).toBe('Component');
  });

  it('should support test file detection', () => {
    const testContext = createMockDetectionContext({
      file: 'src/component.test.ts',
      isTestFile: true,
    });

    expect(testContext.isTestFile).toBe(true);
  });

  it('should support type definition detection', () => {
    const typeContext = createMockDetectionContext({
      file: 'src/types.d.ts',
      isTypeDefinition: true,
    });

    expect(typeContext.isTypeDefinition).toBe(true);
  });
});
