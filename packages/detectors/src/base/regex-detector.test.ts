/**
 * Tests for RegexDetector abstract class
 *
 * @requirements 6.4 - THE Detector_System SHALL support detection methods: ast, regex, semantic, structural, and custom
 */

import { describe, it, expect } from 'vitest';
import type { PatternCategory, Language, Violation, QuickFix } from 'driftdetect-core';
import {
  RegexDetector,
  isRegexDetector,
  type RegexMatch,
  type LineMatch,
  type CaptureResult,
  type PatternLocation,
} from './regex-detector.js';
import { BaseDetector, type DetectionContext, type DetectionResult, type ProjectContext } from './base-detector.js';

// ============================================================================
// Test Implementation of RegexDetector
// ============================================================================

/**
 * Concrete implementation of RegexDetector for testing
 */
class TestRegexDetector extends RegexDetector {
  readonly id = 'test/regex-detector';
  readonly category: PatternCategory = 'documentation';
  readonly subcategory = 'comments';
  readonly name = 'Test Regex Detector';
  readonly description = 'A test regex detector for unit testing';
  readonly supportedLanguages: Language[] = ['typescript', 'javascript'];

  async detect(context: DetectionContext): Promise<DetectionResult> {
    return this.createEmptyResult();
  }

  generateQuickFix(_violation: Violation): QuickFix | null {
    return null;
  }

  // Expose protected methods for testing
  public testMatchAll(content: string, pattern: RegExp, options = {}): RegexMatch[] {
    return this.matchAll(content, pattern, options);
  }

  public testMatchLines(content: string, pattern: RegExp, options = {}): LineMatch[] {
    return this.matchLines(content, pattern, options);
  }

  public testExtractCaptures(content: string, pattern: RegExp, options = {}): CaptureResult[] {
    return this.extractCaptures(content, pattern, options);
  }

  public testFindPatternLocations(content: string, pattern: RegExp, file: string, options = {}): PatternLocation[] {
    return this.findPatternLocations(content, pattern, file, options);
  }

  public testHasMatch(content: string, pattern: RegExp): boolean {
    return this.hasMatch(content, pattern);
  }

  public testCountMatches(content: string, pattern: RegExp): number {
    return this.countMatches(content, pattern);
  }

  public testFindFirst(content: string, pattern: RegExp): LineMatch | null {
    return this.findFirst(content, pattern);
  }

  public testFindLast(content: string, pattern: RegExp): LineMatch | null {
    return this.findLast(content, pattern);
  }

  public testMatchInRange(content: string, pattern: RegExp, startLine: number, endLine: number): LineMatch[] {
    return this.matchInRange(content, pattern, startLine, endLine);
  }

  public testReplaceAll(content: string, pattern: RegExp, replacement: string): string {
    return this.replaceAll(content, pattern, replacement);
  }

  public testSplitByPattern(content: string, pattern: RegExp, limit?: number): string[] {
    return this.splitByPattern(content, pattern, limit);
  }

  public testGetMatchingLines(content: string, pattern: RegExp): Array<{ line: number; content: string }> {
    return this.getMatchingLines(content, pattern);
  }

  public testGetNonMatchingLines(content: string, pattern: RegExp): Array<{ line: number; content: string }> {
    return this.getNonMatchingLines(content, pattern);
  }

  public testCreateAlternationPattern(strings: string[], flags?: string): RegExp {
    return this.createAlternationPattern(strings, flags);
  }

  public testCreateWordBoundaryPattern(strings: string[], flags?: string): RegExp {
    return this.createWordBoundaryPattern(strings, flags);
  }

  public testEscapeRegex(str: string): string {
    return this.escapeRegex(str);
  }

  public testCreatePatternFromTemplate(template: string, values: Record<string, string>, flags?: string): RegExp {
    return this.createPatternFromTemplate(template, values, flags);
  }

  public testLineMatchToLocation(match: LineMatch, file: string) {
    return this.lineMatchToLocation(match, file);
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

const SAMPLE_CODE = `import { useState } from 'react';
import type { FC } from 'react';

// TODO: Add error handling
const Component: FC = () => {
  const [count, setCount] = useState(0);
  
  // FIXME: This is a bug
  return <div>{count}</div>;
};

export default Component;`;

const MULTILINE_CODE = `function hello() {
  console.log('Hello');
}

function world() {
  console.log('World');
}

function test() {
  console.log('Test');
}`;

// ============================================================================
// Tests
// ============================================================================

describe('RegexDetector', () => {
  describe('metadata properties', () => {
    it('should have detectionMethod set to "regex"', () => {
      const detector = new TestRegexDetector();
      expect(detector.detectionMethod).toBe('regex');
    });

    it('should have required metadata properties', () => {
      const detector = new TestRegexDetector();
      expect(detector.id).toBe('test/regex-detector');
      expect(detector.category).toBe('documentation');
      expect(detector.subcategory).toBe('comments');
      expect(detector.name).toBe('Test Regex Detector');
      expect(detector.supportedLanguages).toEqual(['typescript', 'javascript']);
    });
  });

  describe('matchAll()', () => {
    it('should find all matches of a pattern', () => {
      const detector = new TestRegexDetector();
      const matches = detector.testMatchAll(SAMPLE_CODE, /console\.log/g);
      
      expect(matches).toHaveLength(0); // No console.log in SAMPLE_CODE
    });

    it('should find all matches with capture groups', () => {
      const detector = new TestRegexDetector();
      const matches = detector.testMatchAll(MULTILINE_CODE, /function\s+(\w+)/g);
      
      expect(matches).toHaveLength(3);
      expect(matches[0].captures[1]).toBe('hello');
      expect(matches[1].captures[1]).toBe('world');
      expect(matches[2].captures[1]).toBe('test');
    });

    it('should extract named capture groups', () => {
      const detector = new TestRegexDetector();
      const matches = detector.testMatchAll(
        MULTILINE_CODE,
        /function\s+(?<name>\w+)/g
      );
      
      expect(matches).toHaveLength(3);
      expect(matches[0].groups.name).toBe('hello');
      expect(matches[1].groups.name).toBe('world');
      expect(matches[2].groups.name).toBe('test');
    });

    it('should respect maxMatches option', () => {
      const detector = new TestRegexDetector();
      const matches = detector.testMatchAll(
        MULTILINE_CODE,
        /function\s+(\w+)/g,
        { maxMatches: 2 }
      );
      
      expect(matches).toHaveLength(2);
    });

    it('should include match index', () => {
      const detector = new TestRegexDetector();
      const content = 'abc def abc';
      const matches = detector.testMatchAll(content, /abc/g);
      
      expect(matches).toHaveLength(2);
      expect(matches[0].index).toBe(0);
      expect(matches[1].index).toBe(8);
    });

    it('should handle patterns without global flag', () => {
      const detector = new TestRegexDetector();
      const matches = detector.testMatchAll(MULTILINE_CODE, /function\s+(\w+)/);
      
      expect(matches).toHaveLength(3); // Should still find all matches
    });
  });

  describe('matchLines()', () => {
    it('should return matches with line information', () => {
      const detector = new TestRegexDetector();
      const matches = detector.testMatchLines(MULTILINE_CODE, /function\s+(\w+)/g);
      
      expect(matches).toHaveLength(3);
      expect(matches[0].line).toBe(1);
      expect(matches[0].column).toBe(1);
      expect(matches[1].line).toBe(5);
      expect(matches[2].line).toBe(9);
    });

    it('should include line content', () => {
      const detector = new TestRegexDetector();
      const matches = detector.testMatchLines(MULTILINE_CODE, /function\s+(\w+)/g);
      
      expect(matches[0].lineContent).toContain('function hello()');
    });

    it('should calculate end positions correctly', () => {
      const detector = new TestRegexDetector();
      const matches = detector.testMatchLines('const x = 1;', /const/g);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].line).toBe(1);
      expect(matches[0].column).toBe(1);
      expect(matches[0].endLine).toBe(1);
      expect(matches[0].endColumn).toBe(6); // 'const' is 5 chars, end is exclusive
    });

    it('should handle multiline matches', () => {
      const detector = new TestRegexDetector();
      const content = 'start\nmiddle\nend';
      const matches = detector.testMatchLines(content, /start\nmiddle/g);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].line).toBe(1);
      expect(matches[0].endLine).toBe(2);
    });
  });

  describe('extractCaptures()', () => {
    it('should extract named capture groups', () => {
      const detector = new TestRegexDetector();
      const captures = detector.testExtractCaptures(
        SAMPLE_CODE,
        /\/\/\s*(?<type>TODO|FIXME):\s*(?<message>.+)/g
      );
      
      expect(captures).toHaveLength(2);
      expect(captures[0].groups.type).toBe('TODO');
      expect(captures[0].groups.message).toBe('Add error handling');
      expect(captures[1].groups.type).toBe('FIXME');
      expect(captures[1].groups.message).toBe('This is a bug');
    });

    it('should include line and column information', () => {
      const detector = new TestRegexDetector();
      const captures = detector.testExtractCaptures(
        SAMPLE_CODE,
        /\/\/\s*(?<type>TODO|FIXME)/g
      );
      
      expect(captures[0].line).toBe(4);
      expect(captures[1].line).toBe(8);
    });
  });

  describe('findPatternLocations()', () => {
    it('should return PatternLocation objects', () => {
      const detector = new TestRegexDetector();
      const locations = detector.testFindPatternLocations(
        MULTILINE_CODE,
        /function\s+(\w+)/g,
        'src/test.ts'
      );
      
      expect(locations).toHaveLength(3);
      expect(locations[0].file).toBe('src/test.ts');
      expect(locations[0].line).toBe(1);
      expect(locations[0].matchedText).toBe('function hello');
    });

    it('should include capture groups in locations', () => {
      const detector = new TestRegexDetector();
      const locations = detector.testFindPatternLocations(
        MULTILINE_CODE,
        /function\s+(?<name>\w+)/g,
        'src/test.ts'
      );
      
      expect(locations[0].groups.name).toBe('hello');
    });
  });

  describe('hasMatch()', () => {
    it('should return true when pattern matches', () => {
      const detector = new TestRegexDetector();
      expect(detector.testHasMatch(SAMPLE_CODE, /TODO/)).toBe(true);
      expect(detector.testHasMatch(SAMPLE_CODE, /import/)).toBe(true);
    });

    it('should return false when pattern does not match', () => {
      const detector = new TestRegexDetector();
      expect(detector.testHasMatch(SAMPLE_CODE, /NOTFOUND/)).toBe(false);
    });
  });

  describe('countMatches()', () => {
    it('should count all matches', () => {
      const detector = new TestRegexDetector();
      expect(detector.testCountMatches(MULTILINE_CODE, /function/g)).toBe(3);
      expect(detector.testCountMatches(MULTILINE_CODE, /console\.log/g)).toBe(3);
    });

    it('should return 0 when no matches', () => {
      const detector = new TestRegexDetector();
      expect(detector.testCountMatches(SAMPLE_CODE, /NOTFOUND/g)).toBe(0);
    });
  });

  describe('findFirst()', () => {
    it('should return the first match', () => {
      const detector = new TestRegexDetector();
      const match = detector.testFindFirst(MULTILINE_CODE, /function\s+(\w+)/g);
      
      expect(match).not.toBeNull();
      expect(match!.captures[1]).toBe('hello');
      expect(match!.line).toBe(1);
    });

    it('should return null when no match', () => {
      const detector = new TestRegexDetector();
      const match = detector.testFindFirst(SAMPLE_CODE, /NOTFOUND/g);
      
      expect(match).toBeNull();
    });
  });

  describe('findLast()', () => {
    it('should return the last match', () => {
      const detector = new TestRegexDetector();
      const match = detector.testFindLast(MULTILINE_CODE, /function\s+(\w+)/g);
      
      expect(match).not.toBeNull();
      expect(match!.captures[1]).toBe('test');
      expect(match!.line).toBe(9);
    });

    it('should return null when no match', () => {
      const detector = new TestRegexDetector();
      const match = detector.testFindLast(SAMPLE_CODE, /NOTFOUND/g);
      
      expect(match).toBeNull();
    });
  });

  describe('matchInRange()', () => {
    it('should return matches within line range', () => {
      const detector = new TestRegexDetector();
      const matches = detector.testMatchInRange(MULTILINE_CODE, /function/g, 4, 8);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].line).toBe(5);
    });

    it('should return empty array when no matches in range', () => {
      const detector = new TestRegexDetector();
      const matches = detector.testMatchInRange(MULTILINE_CODE, /function/g, 2, 4);
      
      expect(matches).toHaveLength(0);
    });
  });

  describe('replaceAll()', () => {
    it('should replace all matches', () => {
      const detector = new TestRegexDetector();
      const result = detector.testReplaceAll('var x = 1; var y = 2;', /var/g, 'const');
      
      expect(result).toBe('const x = 1; const y = 2;');
    });

    it('should handle patterns without global flag', () => {
      const detector = new TestRegexDetector();
      const result = detector.testReplaceAll('var x = 1; var y = 2;', /var/, 'const');
      
      expect(result).toBe('const x = 1; const y = 2;');
    });
  });

  describe('splitByPattern()', () => {
    it('should split content by pattern', () => {
      const detector = new TestRegexDetector();
      const parts = detector.testSplitByPattern('a,b,c', /,/);
      
      expect(parts).toEqual(['a', 'b', 'c']);
    });

    it('should respect limit parameter', () => {
      const detector = new TestRegexDetector();
      const parts = detector.testSplitByPattern('a,b,c,d', /,/, 2);
      
      expect(parts).toEqual(['a', 'b']);
    });
  });

  describe('getMatchingLines()', () => {
    it('should return lines containing matches', () => {
      const detector = new TestRegexDetector();
      const lines = detector.testGetMatchingLines(MULTILINE_CODE, /function/);
      
      expect(lines).toHaveLength(3);
      expect(lines[0].line).toBe(1);
      expect(lines[0].content).toContain('function hello');
    });
  });

  describe('getNonMatchingLines()', () => {
    it('should return lines not containing matches', () => {
      const detector = new TestRegexDetector();
      const content = 'line1\nfunction test\nline3';
      const lines = detector.testGetNonMatchingLines(content, /function/);
      
      expect(lines).toHaveLength(2);
      expect(lines[0].content).toBe('line1');
      expect(lines[1].content).toBe('line3');
    });
  });

  describe('createAlternationPattern()', () => {
    it('should create alternation pattern', () => {
      const detector = new TestRegexDetector();
      const pattern = detector.testCreateAlternationPattern(['var', 'let', 'const'], 'g');
      
      expect(pattern.source).toBe('var|let|const');
      expect(pattern.flags).toBe('g');
    });

    it('should escape special characters', () => {
      const detector = new TestRegexDetector();
      const pattern = detector.testCreateAlternationPattern(['file.ts', 'file.js']);
      
      expect(pattern.source).toBe('file\\.ts|file\\.js');
    });
  });

  describe('createWordBoundaryPattern()', () => {
    it('should create word boundary pattern', () => {
      const detector = new TestRegexDetector();
      const pattern = detector.testCreateWordBoundaryPattern(['var', 'let', 'const'], 'g');
      
      expect(pattern.source).toBe('\\b(?:var|let|const)\\b');
    });

    it('should match whole words only', () => {
      const detector = new TestRegexDetector();
      const pattern = detector.testCreateWordBoundaryPattern(['var'], 'g');
      
      expect(pattern.test('var x')).toBe(true);
      expect(pattern.test('variable')).toBe(false);
    });
  });

  describe('escapeRegex()', () => {
    it('should escape special regex characters', () => {
      const detector = new TestRegexDetector();
      
      expect(detector.testEscapeRegex('file.ts')).toBe('file\\.ts');
      expect(detector.testEscapeRegex('a*b+c?')).toBe('a\\*b\\+c\\?');
      expect(detector.testEscapeRegex('[test]')).toBe('\\[test\\]');
      expect(detector.testEscapeRegex('(a|b)')).toBe('\\(a\\|b\\)');
      expect(detector.testEscapeRegex('a^b$c')).toBe('a\\^b\\$c');
    });
  });

  describe('createPatternFromTemplate()', () => {
    it('should substitute placeholders', () => {
      const detector = new TestRegexDetector();
      const pattern = detector.testCreatePatternFromTemplate(
        'import\\s+{name}\\s+from',
        { name: '\\w+' },
        'g'
      );
      
      expect(pattern.source).toBe('import\\s+\\w+\\s+from');
    });

    it('should handle multiple placeholders', () => {
      const detector = new TestRegexDetector();
      const pattern = detector.testCreatePatternFromTemplate(
        '{prefix}_{name}_{suffix}',
        { prefix: 'test', name: '\\w+', suffix: 'spec' }
      );
      
      expect(pattern.source).toBe('test_\\w+_spec');
    });
  });

  describe('lineMatchToLocation()', () => {
    it('should convert LineMatch to Location', () => {
      const detector = new TestRegexDetector();
      const lineMatch: LineMatch = {
        match: 'test',
        line: 5,
        column: 10,
        endLine: 5,
        endColumn: 14,
        index: 50,
        groups: {},
        captures: ['test'],
        lineContent: 'const test = 1;',
      };
      
      const location = detector.testLineMatchToLocation(lineMatch, 'src/file.ts');
      
      expect(location.file).toBe('src/file.ts');
      expect(location.line).toBe(5);
      expect(location.column).toBe(10);
      expect(location.endLine).toBe(5);
      expect(location.endColumn).toBe(14);
    });
  });

  describe('regex options', () => {
    it('should support case-insensitive matching', () => {
      const detector = new TestRegexDetector();
      const matches = detector.testMatchAll('TODO todo Todo', /todo/g, { caseInsensitive: true });
      
      expect(matches).toHaveLength(3);
    });

    it('should support multiline matching', () => {
      const detector = new TestRegexDetector();
      const content = 'line1\nline2\nline3';
      const matches = detector.testMatchAll(content, /^line/g, { multiline: true });
      
      expect(matches).toHaveLength(3);
    });

    it('should support dotAll mode', () => {
      const detector = new TestRegexDetector();
      const content = 'start\nmiddle\nend';
      const matches = detector.testMatchAll(content, /start.+end/g, { dotAll: true });
      
      expect(matches).toHaveLength(1);
    });
  });
});

describe('isRegexDetector', () => {
  it('should return true for RegexDetector instances', () => {
    const detector = new TestRegexDetector();
    expect(isRegexDetector(detector)).toBe(true);
  });

  it('should return false for non-regex detectors', () => {
    // Create a mock AST detector
    class MockASTDetector extends BaseDetector {
      readonly id = 'test/ast';
      readonly category: PatternCategory = 'structural';
      readonly subcategory = 'test';
      readonly name = 'AST Detector';
      readonly description = 'Test';
      readonly supportedLanguages: Language[] = ['typescript'];
      readonly detectionMethod = 'ast' as const;

      async detect(_context: DetectionContext): Promise<DetectionResult> {
        return this.createEmptyResult();
      }

      generateQuickFix(_violation: Violation): QuickFix | null {
        return null;
      }
    }

    const astDetector = new MockASTDetector();
    expect(isRegexDetector(astDetector)).toBe(false);
  });
});
