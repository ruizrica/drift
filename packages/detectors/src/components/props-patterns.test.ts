/**
 * Props Patterns Detector Tests
 *
 * Tests for component props handling pattern detection.
 *
 * @requirements 8.2 - THE Component_Detector SHALL detect props patterns
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PropsPatternDetector,
  createPropsPatternDetector,
  detectDestructuringPattern,
  detectDefaultPropsPattern,
  detectSpreadingPattern,
  detectTypePattern,
  extractPropNames,
  extractPropsWithDefaults,
  getPropsTypeName,
  usesFCType,
  analyzePropsPatterns,
  isReactComponent,
  getComponentName,
  type ComponentPropsInfo,
} from './props-patterns.js';
import type { DetectionContext, ProjectContext } from '../base/index.js';
import type { ASTNode } from 'driftdetect-core';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(
  file: string,
  content: string = ''
): DetectionContext {
  const projectContext: ProjectContext = {
    rootDir: '/project',
    files: [file],
    config: {},
  };

  return {
    file,
    content,
    ast: null,
    imports: [],
    exports: [],
    projectContext,
    language: 'typescript',
    extension: '.tsx',
    isTestFile: false,
    isTypeDefinition: false,
  };
}

function createMockNode(text: string, row: number = 0): ASTNode {
  return {
    type: 'arrow_function',
    text,
    startPosition: { row, column: 0 },
    endPosition: { row: row + text.split('\n').length, column: 0 },
    children: [],
  };
}


// ============================================================================
// Helper Function Tests
// ============================================================================

describe('detectDestructuringPattern', () => {
  it('should detect signature destructuring', () => {
    const node = createMockNode(`({ name, value }) => <div>{name}</div>`);
    expect(detectDestructuringPattern(node, '')).toBe('signature');
  });

  it('should detect signature destructuring with type annotation', () => {
    const node = createMockNode(`({ name, value }: Props) => <div>{name}</div>`);
    expect(detectDestructuringPattern(node, '')).toBe('signature');
  });

  it('should detect body destructuring', () => {
    const node = createMockNode(`(props) => {
      const { name, value } = props;
      return <div>{name}</div>;
    }`);
    expect(detectDestructuringPattern(node, '')).toBe('body');
  });

  it('should detect direct props access', () => {
    const node = createMockNode(`(props) => <div>{props.name}</div>`);
    expect(detectDestructuringPattern(node, '')).toBe('direct-access');
  });

  it('should detect no props', () => {
    const node = createMockNode(`() => <div>Hello</div>`);
    expect(detectDestructuringPattern(node, '')).toBe('none');
  });
});

describe('detectDefaultPropsPattern', () => {
  it('should detect default parameters in signature', () => {
    const node = createMockNode(`({ name = 'default', value = 42 }) => <div>{name}</div>`);
    expect(detectDefaultPropsPattern(node, '', 'MyComponent')).toBe('default-parameters');
  });

  it('should detect destructuring defaults in body', () => {
    const node = createMockNode(`(props) => {
      const { name = 'default' } = props;
      return <div>{name}</div>;
    }`);
    expect(detectDefaultPropsPattern(node, '', 'MyComponent')).toBe('destructuring-defaults');
  });

  it('should detect nullish coalescing', () => {
    const node = createMockNode(`(props) => <div>{props.name ?? 'default'}</div>`);
    expect(detectDefaultPropsPattern(node, '', 'MyComponent')).toBe('nullish-coalescing');
  });

  it('should detect logical OR', () => {
    const node = createMockNode(`(props) => <div>{props.name || 'default'}</div>`);
    expect(detectDefaultPropsPattern(node, '', 'MyComponent')).toBe('logical-or');
  });

  it('should detect static defaultProps', () => {
    const node = createMockNode(`(props) => <div>{props.name}</div>`);
    const content = `
      const MyComponent = (props) => <div>{props.name}</div>;
      MyComponent.defaultProps = { name: 'default' };
    `;
    expect(detectDefaultPropsPattern(node, content, 'MyComponent')).toBe('static-defaultProps');
  });

  it('should detect no defaults', () => {
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(detectDefaultPropsPattern(node, '', 'MyComponent')).toBe('none');
  });
});


describe('detectSpreadingPattern', () => {
  it('should detect rest spread pattern', () => {
    const node = createMockNode(`({ name, ...rest }) => <Child {...rest} />`);
    expect(detectSpreadingPattern(node, '')).toBe('rest-spread');
  });

  it('should detect full props spread', () => {
    const node = createMockNode(`(props) => <Child {...props} />`);
    expect(detectSpreadingPattern(node, '')).toBe('full-spread');
  });

  it('should detect selective spreading', () => {
    const node = createMockNode(`(props) => <Child name={props.name} value={props.value} />`);
    expect(detectSpreadingPattern(node, '')).toBe('selective-spread');
  });

  it('should detect no spreading', () => {
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(detectSpreadingPattern(node, '')).toBe('none');
  });
});

describe('detectTypePattern', () => {
  it('should detect inline type', () => {
    const node = createMockNode(`({ name }: { name: string }) => <div>{name}</div>`);
    expect(detectTypePattern(node, '', 'MyComponent')).toBe('inline');
  });

  it('should detect FC generic type', () => {
    const content = `const MyComponent: React.FC<Props> = ({ name }) => <div>{name}</div>`;
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(detectTypePattern(node, content, 'MyComponent')).toBe('generic');
  });

  it('should detect interface type', () => {
    const content = `
      interface ButtonProps { name: string; }
      const Button = ({ name }: ButtonProps) => <div>{name}</div>
    `;
    const node = createMockNode(`({ name }: ButtonProps) => <div>{name}</div>`);
    expect(detectTypePattern(node, content, 'Button')).toBe('interface');
  });

  it('should detect type alias', () => {
    const content = `
      type ButtonProps = { name: string; };
      const Button = ({ name }: ButtonProps) => <div>{name}</div>
    `;
    const node = createMockNode(`({ name }: ButtonProps) => <div>{name}</div>`);
    expect(detectTypePattern(node, content, 'Button')).toBe('type-alias');
  });

  it('should detect propTypes', () => {
    const content = `
      const MyComponent = (props) => <div>{props.name}</div>;
      MyComponent.propTypes = { name: PropTypes.string };
    `;
    const node = createMockNode(`(props) => <div>{props.name}</div>`);
    expect(detectTypePattern(node, content, 'MyComponent')).toBe('prop-types');
  });

  it('should detect no type definition', () => {
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(detectTypePattern(node, '', 'MyComponent')).toBe('none');
  });
});


describe('extractPropNames', () => {
  it('should extract props from signature destructuring', () => {
    const node = createMockNode(`({ name, value, onClick }) => <div>{name}</div>`);
    const props = extractPropNames(node, '');
    expect(props).toContain('name');
    expect(props).toContain('value');
    expect(props).toContain('onClick');
  });

  it('should extract props from body destructuring', () => {
    const node = createMockNode(`(props) => {
      const { name, value } = props;
      return <div>{name}</div>;
    }`);
    const props = extractPropNames(node, '');
    expect(props).toContain('name');
    expect(props).toContain('value');
  });

  it('should extract props from direct access', () => {
    const node = createMockNode(`(props) => <div>{props.name}{props.value}</div>`);
    const props = extractPropNames(node, '');
    expect(props).toContain('name');
    expect(props).toContain('value');
  });

  it('should not include rest spread in prop names', () => {
    const node = createMockNode(`({ name, ...rest }) => <div>{name}</div>`);
    const props = extractPropNames(node, '');
    expect(props).toContain('name');
    expect(props).not.toContain('rest');
    expect(props).not.toContain('...rest');
  });

  it('should remove duplicates', () => {
    const node = createMockNode(`(props) => <div>{props.name}{props.name}</div>`);
    const props = extractPropNames(node, '');
    expect(props.filter(p => p === 'name')).toHaveLength(1);
  });
});

describe('extractPropsWithDefaults', () => {
  it('should extract props with defaults from signature', () => {
    const node = createMockNode(`({ name = 'default', value = 42, onClick }) => <div>{name}</div>`);
    const propsWithDefaults = extractPropsWithDefaults(node, '');
    expect(propsWithDefaults).toContain('name');
    expect(propsWithDefaults).toContain('value');
    expect(propsWithDefaults).not.toContain('onClick');
  });

  it('should extract props with defaults from body destructuring', () => {
    const node = createMockNode(`(props) => {
      const { name = 'default', value } = props;
      return <div>{name}</div>;
    }`);
    const propsWithDefaults = extractPropsWithDefaults(node, '');
    expect(propsWithDefaults).toContain('name');
    expect(propsWithDefaults).not.toContain('value');
  });
});

describe('getPropsTypeName', () => {
  it('should get type name from FC generic', () => {
    const content = `const Button: React.FC<ButtonProps> = ({ name }) => <div>{name}</div>`;
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(getPropsTypeName(node, content)).toBe('ButtonProps');
  });

  it('should get type name from parameter annotation', () => {
    const node = createMockNode(`({ name }: ButtonProps) => <div>{name}</div>`);
    expect(getPropsTypeName(node, '')).toBe('ButtonProps');
  });

  it('should return undefined when no type name', () => {
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(getPropsTypeName(node, '')).toBeUndefined();
  });
});

describe('usesFCType', () => {
  it('should detect React.FC usage', () => {
    const content = `const Button: React.FC<Props> = ({ name }) => <div>{name}</div>`;
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(usesFCType(node, content)).toBe(true);
  });

  it('should detect FC usage', () => {
    const content = `const Button: FC<Props> = ({ name }) => <div>{name}</div>`;
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(usesFCType(node, content)).toBe(true);
  });

  it('should return false when no FC type', () => {
    const content = `const Button = ({ name }) => <div>{name}</div>`;
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(usesFCType(node, content)).toBe(false);
  });
});


describe('isReactComponent', () => {
  it('should identify arrow function component', () => {
    const content = `const Button = ({ name }) => <div>{name}</div>`;
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(isReactComponent(node, content)).toBe(true);
  });

  it('should reject non-JSX returning function', () => {
    const content = `const helper = (x) => x * 2`;
    const node = createMockNode(`(x) => x * 2`);
    expect(isReactComponent(node, content)).toBe(false);
  });

  it('should reject lowercase named functions', () => {
    const content = `const button = () => <div>test</div>`;
    const node = createMockNode(`() => <div>test</div>`);
    expect(isReactComponent(node, content)).toBe(false);
  });
});

describe('getComponentName', () => {
  it('should get name from const declaration', () => {
    const content = `const Button = ({ name }) => <div>{name}</div>`;
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(getComponentName(node, content)).toBe('Button');
  });

  it('should get name from export const declaration', () => {
    const content = `export const Button = ({ name }) => <div>{name}</div>`;
    const node = createMockNode(`({ name }) => <div>{name}</div>`);
    expect(getComponentName(node, content)).toBe('Button');
  });
});

// ============================================================================
// Analysis Function Tests
// ============================================================================

describe('analyzePropsPatterns', () => {
  it('should identify dominant destructuring pattern', () => {
    const components: ComponentPropsInfo[] = [
      {
        componentName: 'Button',
        filePath: 'Button.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'none',
        spreadingPattern: 'none',
        typePattern: 'none',
        propsTypeName: undefined,
        propsWithDefaults: [],
        allPropNames: ['name'],
        usesFCType: false,
      },
      {
        componentName: 'Card',
        filePath: 'Card.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'none',
        spreadingPattern: 'none',
        typePattern: 'none',
        propsTypeName: undefined,
        propsWithDefaults: [],
        allPropNames: ['title'],
        usesFCType: false,
      },
      {
        componentName: 'Modal',
        filePath: 'Modal.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'body',
        defaultPropsPattern: 'none',
        spreadingPattern: 'none',
        typePattern: 'none',
        propsTypeName: undefined,
        propsWithDefaults: [],
        allPropNames: ['isOpen'],
        usesFCType: false,
      },
    ];

    const analysis = analyzePropsPatterns(components);
    expect(analysis.dominantDestructuringPattern).toBe('signature');
    expect(analysis.confidence.destructuring).toBeGreaterThan(0.5);
  });

  it('should identify inconsistent components', () => {
    const components: ComponentPropsInfo[] = [
      {
        componentName: 'Button',
        filePath: 'Button.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'default-parameters',
        spreadingPattern: 'none',
        typePattern: 'interface',
        propsTypeName: 'ButtonProps',
        propsWithDefaults: ['disabled'],
        allPropNames: ['name', 'disabled'],
        usesFCType: false,
      },
      {
        componentName: 'Card',
        filePath: 'Card.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'default-parameters',
        spreadingPattern: 'none',
        typePattern: 'interface',
        propsTypeName: 'CardProps',
        propsWithDefaults: [],
        allPropNames: ['title'],
        usesFCType: false,
      },
      {
        componentName: 'Modal',
        filePath: 'Modal.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'body', // Inconsistent
        defaultPropsPattern: 'static-defaultProps', // Inconsistent
        spreadingPattern: 'none',
        typePattern: 'prop-types', // Inconsistent
        propsTypeName: undefined,
        propsWithDefaults: [],
        allPropNames: ['isOpen'],
        usesFCType: false,
      },
    ];

    const analysis = analyzePropsPatterns(components);
    expect(analysis.inconsistentComponents).toHaveLength(1);
    expect(analysis.inconsistentComponents[0]?.componentName).toBe('Modal');
  });

  it('should handle empty components list', () => {
    const analysis = analyzePropsPatterns([]);
    expect(analysis.dominantDestructuringPattern).toBe('unknown');
    expect(analysis.confidence.destructuring).toBe(0);
    expect(analysis.inconsistentComponents).toHaveLength(0);
  });
});


// ============================================================================
// Detector Class Tests
// ============================================================================

describe('PropsPatternDetector', () => {
  let detector: PropsPatternDetector;

  beforeEach(() => {
    detector = createPropsPatternDetector();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(detector.id).toBe('components/props-patterns');
    });

    it('should have correct category', () => {
      expect(detector.category).toBe('components');
    });

    it('should have correct subcategory', () => {
      expect(detector.subcategory).toBe('props-handling');
    });

    it('should support typescript and javascript', () => {
      expect(detector.supportedLanguages).toContain('typescript');
      expect(detector.supportedLanguages).toContain('javascript');
    });

    it('should use ast detection method', () => {
      expect(detector.detectionMethod).toBe('ast');
    });
  });

  describe('detect', () => {
    it('should handle empty file', async () => {
      const context = createMockContext('empty.tsx', '');
      const result = await detector.detect(context);

      expect(result.patterns).toHaveLength(0);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle file with no components', async () => {
      const content = `
        export const helper = (x: number) => x * 2;
        export const formatDate = (date: Date) => date.toISOString();
      `;
      const context = createMockContext('utils.ts', content);
      const result = await detector.detect(context);

      expect(result.patterns).toHaveLength(0);
      expect(result.violations).toHaveLength(0);
    });

    // Note: Full detector integration tests require AST parsing which is not available
    // in the test environment. The helper functions are tested separately above.
  });

  describe('generateQuickFix', () => {
    it('should generate quick fix for destructuring violation', () => {
      const violation = {
        id: 'test-violation',
        patternId: 'components/props-patterns',
        severity: 'warning' as const,
        file: 'Alert.tsx',
        range: { start: { line: 1, character: 1 }, end: { line: 1, character: 1 } },
        message: "Component 'Alert' uses props destructured in function body but project uses props destructured in function signature",
        expected: 'Consistent props handling',
        actual: 'Inconsistent props handling',
        aiExplainAvailable: true,
        aiFixAvailable: true,
        firstSeen: new Date(),
        occurrences: 1,
      };

      const fix = detector.generateQuickFix(violation);

      expect(fix).not.toBeNull();
      expect(fix?.title).toContain('Refactor');
      expect(fix?.kind).toBe('refactor');
    });

    it('should return null for violations without pattern info', () => {
      const violation = {
        id: 'test-violation',
        patternId: 'components/props-patterns',
        severity: 'warning' as const,
        file: 'Alert.tsx',
        range: { start: { line: 1, character: 1 }, end: { line: 1, character: 1 } },
        message: 'Some generic message',
        expected: 'Consistent props handling',
        actual: 'Inconsistent props handling',
        aiExplainAvailable: true,
        aiFixAvailable: true,
        firstSeen: new Date(),
        occurrences: 1,
      };

      const fix = detector.generateQuickFix(violation);

      expect(fix).toBeNull();
    });
  });
});


// ============================================================================
// Integration Tests - Using analyzePropsPatterns directly
// ============================================================================

describe('PropsPatternDetector Integration', () => {
  it('should analyze real-world component patterns', () => {
    // Test the analysis function directly with mock component info
    const components: ComponentPropsInfo[] = [
      {
        componentName: 'Button',
        filePath: 'Button.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'default-parameters',
        spreadingPattern: 'none',
        typePattern: 'interface',
        propsTypeName: 'ButtonProps',
        propsWithDefaults: ['disabled', 'variant'],
        allPropNames: ['label', 'onClick', 'disabled', 'variant'],
        usesFCType: false,
      },
      {
        componentName: 'Card',
        filePath: 'Card.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'none',
        spreadingPattern: 'none',
        typePattern: 'interface',
        propsTypeName: 'CardProps',
        propsWithDefaults: [],
        allPropNames: ['title', 'footer'],
        usesFCType: false,
      },
    ];

    const analysis = analyzePropsPatterns(components);

    // Should detect signature destructuring as dominant
    expect(analysis.dominantDestructuringPattern).toBe('signature');
    
    // Should detect interface type pattern
    expect(analysis.dominantTypePattern).toBe('interface');
    
    // No violations since all components follow the same pattern
    expect(analysis.inconsistentComponents).toHaveLength(0);
  });

  it('should detect mixed patterns and report violations', () => {
    const components: ComponentPropsInfo[] = [
      {
        componentName: 'Button',
        filePath: 'Button.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'default-parameters',
        spreadingPattern: 'none',
        typePattern: 'interface',
        propsTypeName: 'ButtonProps',
        propsWithDefaults: [],
        allPropNames: ['label'],
        usesFCType: false,
      },
      {
        componentName: 'Card',
        filePath: 'Card.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'default-parameters',
        spreadingPattern: 'none',
        typePattern: 'interface',
        propsTypeName: 'CardProps',
        propsWithDefaults: [],
        allPropNames: ['title'],
        usesFCType: false,
      },
      {
        componentName: 'Modal',
        filePath: 'Modal.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'default-parameters',
        spreadingPattern: 'none',
        typePattern: 'interface',
        propsTypeName: 'ModalProps',
        propsWithDefaults: [],
        allPropNames: ['isOpen'],
        usesFCType: false,
      },
      {
        componentName: 'Alert',
        filePath: 'Alert.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'body', // Inconsistent
        defaultPropsPattern: 'static-defaultProps', // Inconsistent
        spreadingPattern: 'none',
        typePattern: 'prop-types', // Inconsistent
        propsTypeName: undefined,
        propsWithDefaults: [],
        allPropNames: ['message'],
        usesFCType: false,
      },
    ];

    const analysis = analyzePropsPatterns(components);

    // Should have violations for Alert
    expect(analysis.inconsistentComponents.length).toBeGreaterThan(0);
    const alertInconsistent = analysis.inconsistentComponents.find(c => c.componentName === 'Alert');
    expect(alertInconsistent).toBeDefined();
  });

  it('should handle FC type components', () => {
    const components: ComponentPropsInfo[] = [
      {
        componentName: 'Button',
        filePath: 'Button.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'none',
        spreadingPattern: 'none',
        typePattern: 'generic',
        propsTypeName: 'ButtonProps',
        propsWithDefaults: [],
        allPropNames: ['label'],
        usesFCType: true,
      },
      {
        componentName: 'Card',
        filePath: 'Card.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'none',
        spreadingPattern: 'none',
        typePattern: 'generic',
        propsTypeName: 'CardProps',
        propsWithDefaults: [],
        allPropNames: ['title'],
        usesFCType: true,
      },
    ];

    const analysis = analyzePropsPatterns(components);

    // Should detect FC generic type pattern
    expect(analysis.dominantTypePattern).toBe('generic');
  });

  it('should handle props spreading patterns', () => {
    const components: ComponentPropsInfo[] = [
      {
        componentName: 'Button',
        filePath: 'Button.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'none',
        spreadingPattern: 'rest-spread',
        typePattern: 'none',
        propsTypeName: undefined,
        propsWithDefaults: [],
        allPropNames: ['label'],
        usesFCType: false,
      },
      {
        componentName: 'Card',
        filePath: 'Card.tsx',
        line: 1,
        column: 1,
        destructuringPattern: 'signature',
        defaultPropsPattern: 'none',
        spreadingPattern: 'rest-spread',
        typePattern: 'none',
        propsTypeName: undefined,
        propsWithDefaults: [],
        allPropNames: ['title'],
        usesFCType: false,
      },
    ];

    const analysis = analyzePropsPatterns(components);

    // Should detect rest-spread pattern
    expect(analysis.dominantSpreadingPattern).toBe('rest-spread');
    expect(analysis.dominantDestructuringPattern).toBe('signature');
  });
});
