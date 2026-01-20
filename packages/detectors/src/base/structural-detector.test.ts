/**
 * Tests for StructuralDetector abstract class
 *
 * @requirements 6.4 - THE Detector_System SHALL support detection methods: ast, regex, semantic, structural, and custom
 */

import { describe, it, expect } from 'vitest';
import type { PatternCategory, Language, Violation, QuickFix } from 'driftdetect-core';
import {
  StructuralDetector,
  isStructuralDetector,
  type NamingConvention,
  type NamingConventionResult,
  type PathMatchResult,
  type PathInfo,
  type PathMatchOptions,
} from './structural-detector.js';
import { BaseDetector, type DetectionContext, type DetectionResult, type ProjectContext } from './base-detector.js';

// ============================================================================
// Test Implementation of StructuralDetector
// ============================================================================

/**
 * Concrete implementation of StructuralDetector for testing
 */
class TestStructuralDetector extends StructuralDetector {
  readonly id = 'test/structural-detector';
  readonly category: PatternCategory = 'structural';
  readonly subcategory = 'file-naming';
  readonly name = 'Test Structural Detector';
  readonly description = 'A test structural detector for unit testing';
  readonly supportedLanguages: Language[] = ['typescript', 'javascript'];

  async detect(_context: DetectionContext): Promise<DetectionResult> {
    return this.createEmptyResult();
  }

  generateQuickFix(_violation: Violation): QuickFix | null {
    return null;
  }

  // Expose protected methods for testing
  public testMatchPath(path: string, pattern: string, options?: PathMatchOptions): PathMatchResult {
    return this.matchPath(path, pattern, options);
  }

  public testMatchFileName(fileName: string, pattern: string, options?: PathMatchOptions): PathMatchResult {
    return this.matchFileName(fileName, pattern, options);
  }

  public testGetFileExtension(path: string): string {
    return this.getFileExtension(path);
  }

  public testGetFileName(path: string): string {
    return this.getFileName(path);
  }

  public testGetDirectoryPath(path: string): string {
    return this.getDirectoryPath(path);
  }

  public testGetPathInfo(path: string): PathInfo {
    return this.getPathInfo(path);
  }

  public testIsInDirectory(path: string, directory: string, recursive?: boolean): boolean {
    return this.isInDirectory(path, directory, recursive);
  }

  public testGetRelativePath(path: string, basePath: string): string {
    return this.getRelativePath(path, basePath);
  }

  public testGetCommonBasePath(paths: string[]): string {
    return this.getCommonBasePath(paths);
  }

  public testGetSiblingFiles(path: string, allFiles: string[]): string[] {
    return this.getSiblingFiles(path, allFiles);
  }

  public testMatchNamingConvention(name: string, convention: NamingConvention): NamingConventionResult {
    return this.matchNamingConvention(name, convention);
  }

  public testDetectNamingConvention(name: string): NamingConvention | null {
    return this.detectNamingConvention(name);
  }

  public testConvertToConvention(name: string, convention: NamingConvention): string {
    return this.convertToConvention(name, convention);
  }

  public testIsTestFile(path: string): boolean {
    return this.isTestFile(path);
  }

  public testIsTypeDefinitionFile(path: string): boolean {
    return this.isTypeDefinitionFile(path);
  }

  public testIsIndexFile(path: string): boolean {
    return this.isIndexFile(path);
  }

  public testIsConfigFile(path: string): boolean {
    return this.isConfigFile(path);
  }

  public testCreateFileLocation(file: string, line?: number, column?: number) {
    return this.createFileLocation(file, line, column);
  }
}


// ============================================================================
// Tests
// ============================================================================

describe('StructuralDetector', () => {
  describe('metadata properties', () => {
    it('should have detectionMethod set to "structural"', () => {
      const detector = new TestStructuralDetector();
      expect(detector.detectionMethod).toBe('structural');
    });

    it('should have required metadata properties', () => {
      const detector = new TestStructuralDetector();
      expect(detector.id).toBe('test/structural-detector');
      expect(detector.category).toBe('structural');
      expect(detector.subcategory).toBe('file-naming');
      expect(detector.name).toBe('Test Structural Detector');
      expect(detector.supportedLanguages).toEqual(['typescript', 'javascript']);
    });
  });

  describe('matchPath()', () => {
    it('should match exact paths', () => {
      const detector = new TestStructuralDetector();
      const result = detector.testMatchPath('src/index.ts', 'src/index.ts');
      expect(result.matches).toBe(true);
    });

    it('should match paths with single wildcard', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testMatchPath('src/Button.tsx', 'src/*.tsx').matches).toBe(true);
      expect(detector.testMatchPath('src/components/Button.tsx', 'src/*.tsx').matches).toBe(false);
    });

    it('should match paths with double wildcard', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testMatchPath('src/components/Button.tsx', '**/*.tsx').matches).toBe(true);
      expect(detector.testMatchPath('src/deep/nested/file.tsx', '**/*.tsx').matches).toBe(true);
    });

    it('should match paths with question mark wildcard', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testMatchPath('src/a.ts', 'src/?.ts').matches).toBe(true);
      expect(detector.testMatchPath('src/ab.ts', 'src/?.ts').matches).toBe(false);
    });

    it('should match paths with character classes', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testMatchPath('src/file1.ts', 'src/file[123].ts').matches).toBe(true);
      expect(detector.testMatchPath('src/file4.ts', 'src/file[123].ts').matches).toBe(false);
    });

    it('should match paths with negated character classes', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testMatchPath('src/file4.ts', 'src/file[!123].ts').matches).toBe(true);
      expect(detector.testMatchPath('src/file1.ts', 'src/file[!123].ts').matches).toBe(false);
    });

    it('should match paths with alternation', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testMatchPath('src/file.ts', 'src/file.{ts,tsx}').matches).toBe(true);
      expect(detector.testMatchPath('src/file.tsx', 'src/file.{ts,tsx}').matches).toBe(true);
      expect(detector.testMatchPath('src/file.js', 'src/file.{ts,tsx}').matches).toBe(false);
    });

    it('should support case-insensitive matching', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testMatchPath('src/Button.tsx', 'src/button.tsx', { caseInsensitive: true }).matches).toBe(true);
      expect(detector.testMatchPath('src/Button.tsx', 'src/button.tsx').matches).toBe(false);
    });

    it('should normalize Windows-style paths', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testMatchPath('src\\components\\Button.tsx', 'src/components/*.tsx').matches).toBe(true);
    });
  });


  describe('matchFileName()', () => {
    it('should match file names with wildcards', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testMatchFileName('Button.tsx', '*.tsx').matches).toBe(true);
      expect(detector.testMatchFileName('Button.tsx', '*.ts').matches).toBe(false);
    });

    it('should match file names with prefix patterns', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testMatchFileName('useAuth.ts', 'use*.ts').matches).toBe(true);
      expect(detector.testMatchFileName('getAuth.ts', 'use*.ts').matches).toBe(false);
    });

    it('should extract file name from full path', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testMatchFileName('src/components/Button.tsx', '*.tsx').matches).toBe(true);
    });
  });

  describe('getFileExtension()', () => {
    it('should return file extension with dot', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetFileExtension('Button.tsx')).toBe('.tsx');
      expect(detector.testGetFileExtension('src/utils/helpers.ts')).toBe('.ts');
    });

    it('should return empty string for files without extension', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetFileExtension('README')).toBe('');
      expect(detector.testGetFileExtension('Makefile')).toBe('');
    });

    it('should return only the last extension for multiple dots', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetFileExtension('file.test.ts')).toBe('.ts');
      expect(detector.testGetFileExtension('file.spec.tsx')).toBe('.tsx');
    });

    it('should handle hidden files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetFileExtension('.gitignore')).toBe('');
      expect(detector.testGetFileExtension('.eslintrc.js')).toBe('.js');
    });
  });

  describe('getFileName()', () => {
    it('should return file name without extension', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetFileName('Button.tsx')).toBe('Button');
      expect(detector.testGetFileName('src/components/Button.tsx')).toBe('Button');
    });

    it('should return full name for files without extension', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetFileName('README')).toBe('README');
      expect(detector.testGetFileName('Makefile')).toBe('Makefile');
    });

    it('should preserve multiple dots except the last', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetFileName('file.test.ts')).toBe('file.test');
      expect(detector.testGetFileName('file.spec.tsx')).toBe('file.spec');
    });
  });


  describe('getDirectoryPath()', () => {
    it('should return directory path without file name', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetDirectoryPath('src/components/Button.tsx')).toBe('src/components');
      expect(detector.testGetDirectoryPath('src/index.ts')).toBe('src');
    });

    it('should return empty string for root-level files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetDirectoryPath('index.ts')).toBe('');
      expect(detector.testGetDirectoryPath('README.md')).toBe('');
    });

    it('should handle trailing slashes', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetDirectoryPath('src/utils/')).toBe('src/utils');
    });
  });

  describe('getPathInfo()', () => {
    it('should return complete path information', () => {
      const detector = new TestStructuralDetector();
      const info = detector.testGetPathInfo('src/components/Button.tsx');
      
      expect(info.fullPath).toBe('src/components/Button.tsx');
      expect(info.directory).toBe('src/components');
      expect(info.fileName).toBe('Button.tsx');
      expect(info.baseName).toBe('Button');
      expect(info.extension).toBe('.tsx');
      expect(info.segments).toEqual(['src', 'components', 'Button.tsx']);
      expect(info.depth).toBe(2);
    });

    it('should handle root-level files', () => {
      const detector = new TestStructuralDetector();
      const info = detector.testGetPathInfo('index.ts');
      
      expect(info.directory).toBe('');
      expect(info.depth).toBe(0);
    });
  });

  describe('isInDirectory()', () => {
    it('should return true for files directly in directory', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsInDirectory('src/components/Button.tsx', 'src/components')).toBe(true);
    });

    it('should return true for files in subdirectories (recursive)', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsInDirectory('src/components/ui/Button.tsx', 'src/components')).toBe(true);
      expect(detector.testIsInDirectory('src/components/ui/Button.tsx', 'src')).toBe(true);
    });

    it('should return false for files in subdirectories when not recursive', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsInDirectory('src/components/ui/Button.tsx', 'src/components', false)).toBe(false);
    });

    it('should return false for files not in directory', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsInDirectory('src/utils/helpers.ts', 'src/components')).toBe(false);
    });

    it('should handle trailing slashes', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsInDirectory('src/components/Button.tsx', 'src/components/')).toBe(true);
    });
  });


  describe('getRelativePath()', () => {
    it('should return relative path from base', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetRelativePath('src/components/Button.tsx', 'src')).toBe('components/Button.tsx');
      expect(detector.testGetRelativePath('src/components/Button.tsx', 'src/components')).toBe('Button.tsx');
    });

    it('should return original path if not under base', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetRelativePath('other/file.ts', 'src')).toBe('other/file.ts');
    });

    it('should handle trailing slashes in base path', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetRelativePath('src/components/Button.tsx', 'src/')).toBe('components/Button.tsx');
    });
  });

  describe('getCommonBasePath()', () => {
    it('should return common base path for multiple files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetCommonBasePath([
        'src/components/Button.tsx',
        'src/components/Input.tsx',
      ])).toBe('src/components');
    });

    it('should return partial common path', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetCommonBasePath([
        'src/a/file.ts',
        'src/b/file.ts',
      ])).toBe('src');
    });

    it('should return empty string when no common path', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetCommonBasePath([
        'a/file.ts',
        'b/file.ts',
      ])).toBe('');
    });

    it('should return directory for single file', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetCommonBasePath(['src/components/Button.tsx'])).toBe('src/components');
    });

    it('should return empty string for empty array', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testGetCommonBasePath([])).toBe('');
    });
  });

  describe('getSiblingFiles()', () => {
    it('should return files in the same directory', () => {
      const detector = new TestStructuralDetector();
      const allFiles = [
        'src/components/Button.tsx',
        'src/components/Input.tsx',
        'src/components/Select.tsx',
        'src/utils/helpers.ts',
      ];
      
      const siblings = detector.testGetSiblingFiles('src/components/Button.tsx', allFiles);
      
      expect(siblings).toContain('src/components/Input.tsx');
      expect(siblings).toContain('src/components/Select.tsx');
      expect(siblings).not.toContain('src/components/Button.tsx');
      expect(siblings).not.toContain('src/utils/helpers.ts');
    });

    it('should return empty array when no siblings', () => {
      const detector = new TestStructuralDetector();
      const allFiles = ['src/index.ts'];
      
      const siblings = detector.testGetSiblingFiles('src/index.ts', allFiles);
      
      expect(siblings).toEqual([]);
    });
  });


  describe('detectNamingConvention()', () => {
    it('should detect PascalCase', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testDetectNamingConvention('MyComponent')).toBe('PascalCase');
      expect(detector.testDetectNamingConvention('Button')).toBe('PascalCase');
      expect(detector.testDetectNamingConvention('UserProfile')).toBe('PascalCase');
    });

    it('should detect camelCase', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testDetectNamingConvention('myFunction')).toBe('camelCase');
      expect(detector.testDetectNamingConvention('getUserData')).toBe('camelCase');
    });

    it('should detect kebab-case', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testDetectNamingConvention('my-component')).toBe('kebab-case');
      expect(detector.testDetectNamingConvention('user-profile')).toBe('kebab-case');
    });

    it('should detect snake_case', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testDetectNamingConvention('my_variable')).toBe('snake_case');
      expect(detector.testDetectNamingConvention('user_profile')).toBe('snake_case');
    });

    it('should detect SCREAMING_SNAKE_CASE', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testDetectNamingConvention('MAX_VALUE')).toBe('SCREAMING_SNAKE_CASE');
      expect(detector.testDetectNamingConvention('API_KEY')).toBe('SCREAMING_SNAKE_CASE');
    });

    it('should detect flatcase', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testDetectNamingConvention('mycomponent')).toBe('flatcase');
      expect(detector.testDetectNamingConvention('button')).toBe('flatcase');
    });

    it('should return null for empty or invalid names', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testDetectNamingConvention('')).toBe(null);
      expect(detector.testDetectNamingConvention('123abc')).toBe(null);
    });
  });

  describe('matchNamingConvention()', () => {
    it('should return matches: true when convention matches', () => {
      const detector = new TestStructuralDetector();
      
      const result = detector.testMatchNamingConvention('MyComponent', 'PascalCase');
      expect(result.matches).toBe(true);
      expect(result.detectedConvention).toBe('PascalCase');
    });

    it('should return matches: false with suggestion when convention does not match', () => {
      const detector = new TestStructuralDetector();
      
      const result = detector.testMatchNamingConvention('myComponent', 'PascalCase');
      expect(result.matches).toBe(false);
      expect(result.suggestedName).toBe('MyComponent');
    });
  });


  describe('convertToConvention()', () => {
    it('should convert to PascalCase', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testConvertToConvention('myComponent', 'PascalCase')).toBe('MyComponent');
      expect(detector.testConvertToConvention('my-component', 'PascalCase')).toBe('MyComponent');
      expect(detector.testConvertToConvention('my_component', 'PascalCase')).toBe('MyComponent');
    });

    it('should convert to camelCase', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testConvertToConvention('MyComponent', 'camelCase')).toBe('myComponent');
      expect(detector.testConvertToConvention('my-component', 'camelCase')).toBe('myComponent');
      expect(detector.testConvertToConvention('my_component', 'camelCase')).toBe('myComponent');
    });

    it('should convert to kebab-case', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testConvertToConvention('MyComponent', 'kebab-case')).toBe('my-component');
      expect(detector.testConvertToConvention('myComponent', 'kebab-case')).toBe('my-component');
    });

    it('should convert to snake_case', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testConvertToConvention('MyComponent', 'snake_case')).toBe('my_component');
      expect(detector.testConvertToConvention('myComponent', 'snake_case')).toBe('my_component');
    });

    it('should convert to SCREAMING_SNAKE_CASE', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testConvertToConvention('MyComponent', 'SCREAMING_SNAKE_CASE')).toBe('MY_COMPONENT');
      expect(detector.testConvertToConvention('myComponent', 'SCREAMING_SNAKE_CASE')).toBe('MY_COMPONENT');
    });

    it('should convert to flatcase', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testConvertToConvention('MyComponent', 'flatcase')).toBe('mycomponent');
      expect(detector.testConvertToConvention('my-component', 'flatcase')).toBe('mycomponent');
    });
  });

  describe('isTestFile()', () => {
    it('should detect .test.ts files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsTestFile('Button.test.ts')).toBe(true);
      expect(detector.testIsTestFile('src/Button.test.tsx')).toBe(true);
    });

    it('should detect .spec.ts files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsTestFile('Button.spec.ts')).toBe(true);
      expect(detector.testIsTestFile('src/Button.spec.tsx')).toBe(true);
    });

    it('should detect files in __tests__ directory', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsTestFile('src/__tests__/Button.ts')).toBe(true);
      expect(detector.testIsTestFile('__tests__/utils.ts')).toBe(true);
    });

    it('should detect files in test/ or tests/ directory', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsTestFile('test/Button.ts')).toBe(true);
      expect(detector.testIsTestFile('tests/Button.ts')).toBe(true);
    });

    it('should return false for non-test files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsTestFile('Button.tsx')).toBe(false);
      expect(detector.testIsTestFile('src/components/Button.tsx')).toBe(false);
    });
  });


  describe('isTypeDefinitionFile()', () => {
    it('should detect .d.ts files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsTypeDefinitionFile('types.d.ts')).toBe(true);
      expect(detector.testIsTypeDefinitionFile('src/types/index.d.ts')).toBe(true);
    });

    it('should return false for regular .ts files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsTypeDefinitionFile('types.ts')).toBe(false);
      expect(detector.testIsTypeDefinitionFile('Button.tsx')).toBe(false);
    });
  });

  describe('isIndexFile()', () => {
    it('should detect index files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsIndexFile('index.ts')).toBe(true);
      expect(detector.testIsIndexFile('src/index.tsx')).toBe(true);
      expect(detector.testIsIndexFile('src/components/index.ts')).toBe(true);
    });

    it('should return false for non-index files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsIndexFile('Button.tsx')).toBe(false);
      expect(detector.testIsIndexFile('main.ts')).toBe(false);
    });
  });

  describe('isConfigFile()', () => {
    it('should detect rc files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsConfigFile('.eslintrc')).toBe(true);
      expect(detector.testIsConfigFile('.eslintrc.js')).toBe(true);
      expect(detector.testIsConfigFile('.prettierrc.json')).toBe(true);
    });

    it('should detect .config.* files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsConfigFile('vite.config.ts')).toBe(true);
      expect(detector.testIsConfigFile('tailwind.config.js')).toBe(true);
    });

    it('should detect tsconfig files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsConfigFile('tsconfig.json')).toBe(true);
      expect(detector.testIsConfigFile('tsconfig.build.json')).toBe(true);
    });

    it('should detect package.json', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsConfigFile('package.json')).toBe(true);
    });

    it('should detect .env files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsConfigFile('.env')).toBe(true);
      expect(detector.testIsConfigFile('.env.local')).toBe(true);
    });

    it('should return false for non-config files', () => {
      const detector = new TestStructuralDetector();
      
      expect(detector.testIsConfigFile('Button.tsx')).toBe(false);
      expect(detector.testIsConfigFile('utils.ts')).toBe(false);
    });
  });

  describe('createFileLocation()', () => {
    it('should create location with default line and column', () => {
      const detector = new TestStructuralDetector();
      const location = detector.testCreateFileLocation('src/file.ts');
      
      expect(location.file).toBe('src/file.ts');
      expect(location.line).toBe(1);
      expect(location.column).toBe(1);
    });

    it('should create location with custom line and column', () => {
      const detector = new TestStructuralDetector();
      const location = detector.testCreateFileLocation('src/file.ts', 10, 5);
      
      expect(location.file).toBe('src/file.ts');
      expect(location.line).toBe(10);
      expect(location.column).toBe(5);
    });
  });
});


describe('isStructuralDetector', () => {
  it('should return true for StructuralDetector instances', () => {
    const detector = new TestStructuralDetector();
    expect(isStructuralDetector(detector)).toBe(true);
  });

  it('should return false for non-structural detectors', () => {
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
    expect(isStructuralDetector(astDetector)).toBe(false);
  });
});
