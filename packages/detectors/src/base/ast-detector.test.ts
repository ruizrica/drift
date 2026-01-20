/**
 * Tests for ASTDetector abstract class
 *
 * @requirements 6.4 - THE Detector_System SHALL support detection methods: ast, regex, semantic, structural, and custom
 * @requirements 6.6 - THE Detector SHALL be independently testable with mock AST inputs
 */

import { describe, it, expect } from 'vitest';
import type { PatternCategory, Language, Violation, QuickFix, AST, ASTNode } from 'driftdetect-core';
import {
  ASTDetector,
  isASTDetector,
  type ASTPattern,
  type ASTMatchResult,
} from './ast-detector.js';
import { BaseDetector, type DetectionContext, type DetectionResult, type ProjectContext } from './base-detector.js';

// ============================================================================
// Test Implementation of ASTDetector
// ============================================================================

/**
 * Concrete implementation of ASTDetector for testing
 */
class TestASTDetector extends ASTDetector {
  readonly id = 'test/ast-detector';
  readonly category: PatternCategory = 'structural';
  readonly subcategory = 'test-subcategory';
  readonly name = 'Test AST Detector';
  readonly description = 'A test AST detector for unit testing';
  readonly supportedLanguages: Language[] = ['typescript', 'javascript'];

  async detect(context: DetectionContext): Promise<DetectionResult> {
    if (!context.ast) {
      return this.createEmptyResult();
    }
    return this.createEmptyResult();
  }

  generateQuickFix(_violation: Violation): QuickFix | null {
    return null;
  }

  // Expose protected methods for testing
  public testFindNodes(ast: AST, nodeType: string): ASTNode[] {
    return this.findNodes(ast, nodeType);
  }

  public testFindNodesByTypes(ast: AST, nodeTypes: string[]): ASTNode[] {
    return this.findNodesByTypes(ast, nodeTypes);
  }

  public testFindFirstNode(ast: AST, nodeType: string): ASTNode | null {
    return this.findFirstNode(ast, nodeType);
  }

  public testFindNodesWhere(ast: AST, predicate: (node: ASTNode) => boolean): ASTNode[] {
    return this.findNodesWhere(ast, predicate);
  }

  public testFindAncestor(node: ASTNode, nodeType: string, ast: AST): ASTNode | null {
    return this.findAncestor(node, nodeType, ast);
  }

  public testFindAllAncestors(node: ASTNode, ast: AST): ASTNode[] {
    return this.findAllAncestors(node, ast);
  }

  public testFindDescendants(node: ASTNode): ASTNode[] {
    return this.findDescendants(node);
  }

  public testFindDescendantsByType(node: ASTNode, nodeType: string): ASTNode[] {
    return this.findDescendantsByType(node, nodeType);
  }

  public testGetNodeText(node: ASTNode, content?: string): string {
    return this.getNodeText(node, content);
  }

  public testGetNodeTextTrimmed(node: ASTNode, content?: string): string {
    return this.getNodeTextTrimmed(node, content);
  }

  public testMatchPattern(ast: AST, pattern: ASTPattern): ASTMatchResult[] {
    return this.matchPattern(ast, pattern);
  }

  public testGetParentChain(ast: AST, targetNode: ASTNode): ASTNode[] {
    return this.getParentChain(ast, targetNode);
  }

  public testGetParent(ast: AST, node: ASTNode): ASTNode | null {
    return this.getParent(ast, node);
  }

  public testGetNodeDepth(ast: AST, targetNode: ASTNode): number {
    return this.getNodeDepth(ast, targetNode);
  }

  public testIsLeafNode(node: ASTNode): boolean {
    return this.isLeafNode(node);
  }

  public testGetChildrenByType(node: ASTNode, nodeType: string): ASTNode[] {
    return this.getChildrenByType(node, nodeType);
  }

  public testGetFirstChildByType(node: ASTNode, nodeType: string): ASTNode | null {
    return this.getFirstChildByType(node, nodeType);
  }

  public testHasChildOfType(node: ASTNode, nodeType: string): boolean {
    return this.hasChildOfType(node, nodeType);
  }

  public testHasDescendantOfType(node: ASTNode, nodeType: string): boolean {
    return this.hasDescendantOfType(node, nodeType);
  }

  public testGetSiblings(ast: AST, node: ASTNode): ASTNode[] {
    return this.getSiblings(ast, node);
  }

  public testGetNextSibling(ast: AST, node: ASTNode): ASTNode | null {
    return this.getNextSibling(ast, node);
  }

  public testGetPreviousSibling(ast: AST, node: ASTNode): ASTNode | null {
    return this.getPreviousSibling(ast, node);
  }

  public testCountNodes(ast: AST, nodeType: string): number {
    return this.countNodes(ast, nodeType);
  }

  public testHasNodeOfType(ast: AST, nodeType: string): boolean {
    return this.hasNodeOfType(ast, nodeType);
  }

  public testGetLineNumber(node: ASTNode): number {
    return this.getLineNumber(node);
  }

  public testGetColumnNumber(node: ASTNode): number {
    return this.getColumnNumber(node);
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockASTNode(
  type: string,
  text: string,
  children: ASTNode[] = [],
  startRow: number = 0,
  startCol: number = 0,
  endRow: number = 0,
  endCol: number = 10
): ASTNode {
  return {
    type,
    text,
    children,
    startPosition: { row: startRow, column: startCol },
    endPosition: { row: endRow, column: endCol },
  };
}

function createMockAST(rootNode: ASTNode): AST {
  return {
    rootNode,
    text: rootNode.text,
  };
}

/**
 * Creates a sample AST representing:
 * ```
 * function hello() {
 *   const x = 1;
 *   return x;
 * }
 * class MyClass {
 *   method() {}
 * }
 * ```
 */
function createSampleAST(): AST {
  const identifier1 = createMockASTNode('identifier', 'hello', [], 0, 9, 0, 14);
  const identifier2 = createMockASTNode('identifier', 'x', [], 1, 8, 1, 9);
  const number = createMockASTNode('number', '1', [], 1, 12, 1, 13);
  const variableDeclarator = createMockASTNode('variable_declarator', 'x = 1', [identifier2, number], 1, 8, 1, 13);
  const constDecl = createMockASTNode('lexical_declaration', 'const x = 1;', [variableDeclarator], 1, 2, 1, 14);
  
  const returnIdentifier = createMockASTNode('identifier', 'x', [], 2, 9, 2, 10);
  const returnStmt = createMockASTNode('return_statement', 'return x;', [returnIdentifier], 2, 2, 2, 11);
  
  const functionBody = createMockASTNode('statement_block', '{ const x = 1; return x; }', [constDecl, returnStmt], 0, 17, 3, 1);
  const functionDecl = createMockASTNode('function_declaration', 'function hello() { const x = 1; return x; }', [identifier1, functionBody], 0, 0, 3, 1);

  const classIdentifier = createMockASTNode('identifier', 'MyClass', [], 4, 6, 4, 13);
  const methodIdentifier = createMockASTNode('identifier', 'method', [], 5, 2, 5, 8);
  const methodBody = createMockASTNode('statement_block', '{}', [], 5, 11, 5, 13);
  const methodDef = createMockASTNode('method_definition', 'method() {}', [methodIdentifier, methodBody], 5, 2, 5, 13);
  const classBody = createMockASTNode('class_body', '{ method() {} }', [methodDef], 4, 14, 6, 1);
  const classDecl = createMockASTNode('class_declaration', 'class MyClass { method() {} }', [classIdentifier, classBody], 4, 0, 6, 1);

  const program = createMockASTNode('program', 'function hello() {...} class MyClass {...}', [functionDecl, classDecl], 0, 0, 6, 1);

  return createMockAST(program);
}

function createMockProjectContext(): ProjectContext {
  return {
    rootDir: '/test/project',
    files: ['src/index.ts'],
    config: {},
  };
}

function createMockDetectionContext(ast: AST | null = null): DetectionContext {
  return {
    file: 'src/test.ts',
    content: 'const x = 1;',
    ast,
    imports: [],
    exports: [],
    projectContext: createMockProjectContext(),
    language: 'typescript',
    extension: '.ts',
    isTestFile: false,
    isTypeDefinition: false,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ASTDetector', () => {
  describe('metadata properties', () => {
    it('should have detectionMethod set to "ast"', () => {
      const detector = new TestASTDetector();
      expect(detector.detectionMethod).toBe('ast');
    });

    it('should have all required metadata properties', () => {
      const detector = new TestASTDetector();
      expect(detector.id).toBe('test/ast-detector');
      expect(detector.category).toBe('structural');
      expect(detector.subcategory).toBe('test-subcategory');
      expect(detector.name).toBe('Test AST Detector');
      expect(detector.description).toBe('A test AST detector for unit testing');
      expect(detector.supportedLanguages).toEqual(['typescript', 'javascript']);
    });
  });

  describe('findNodes()', () => {
    it('should find all nodes of a specific type', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const identifiers = detector.testFindNodes(ast, 'identifier');
      expect(identifiers.length).toBeGreaterThan(0);
      expect(identifiers.every(n => n.type === 'identifier')).toBe(true);
    });

    it('should return empty array when no nodes match', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const nodes = detector.testFindNodes(ast, 'nonexistent_type');
      expect(nodes).toEqual([]);
    });

    it('should find function declarations', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      expect(functions).toHaveLength(1);
      expect(functions[0].type).toBe('function_declaration');
    });

    it('should find class declarations', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const classes = detector.testFindNodes(ast, 'class_declaration');
      expect(classes).toHaveLength(1);
      expect(classes[0].type).toBe('class_declaration');
    });
  });

  describe('findNodesByTypes()', () => {
    it('should find nodes matching multiple types', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const nodes = detector.testFindNodesByTypes(ast, ['function_declaration', 'class_declaration']);
      expect(nodes).toHaveLength(2);
      expect(nodes.some(n => n.type === 'function_declaration')).toBe(true);
      expect(nodes.some(n => n.type === 'class_declaration')).toBe(true);
    });

    it('should return empty array when no types match', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const nodes = detector.testFindNodesByTypes(ast, ['nonexistent1', 'nonexistent2']);
      expect(nodes).toEqual([]);
    });
  });

  describe('findFirstNode()', () => {
    it('should find the first node of a specific type', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const node = detector.testFindFirstNode(ast, 'identifier');
      expect(node).not.toBeNull();
      expect(node?.type).toBe('identifier');
    });

    it('should return null when no node matches', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const node = detector.testFindFirstNode(ast, 'nonexistent_type');
      expect(node).toBeNull();
    });
  });

  describe('findNodesWhere()', () => {
    it('should find nodes matching a predicate', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const nodes = detector.testFindNodesWhere(ast, (node) => node.type === 'identifier' && node.text === 'hello');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].text).toBe('hello');
    });

    it('should return empty array when predicate never matches', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const nodes = detector.testFindNodesWhere(ast, () => false);
      expect(nodes).toEqual([]);
    });
  });

  describe('findAncestor()', () => {
    it('should find ancestor of a specific type', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      // Find an identifier inside the function
      const identifiers = detector.testFindNodes(ast, 'identifier');
      const xIdentifier = identifiers.find(n => n.text === 'x');
      expect(xIdentifier).toBeDefined();

      // Find its function_declaration ancestor
      const ancestor = detector.testFindAncestor(xIdentifier!, 'function_declaration', ast);
      expect(ancestor).not.toBeNull();
      expect(ancestor?.type).toBe('function_declaration');
    });

    it('should return null when ancestor type not found', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const identifiers = detector.testFindNodes(ast, 'identifier');
      const ancestor = detector.testFindAncestor(identifiers[0], 'nonexistent_type', ast);
      expect(ancestor).toBeNull();
    });
  });

  describe('findAllAncestors()', () => {
    it('should find all ancestors of a node', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      // Find a deeply nested node
      const numbers = detector.testFindNodes(ast, 'number');
      expect(numbers.length).toBeGreaterThan(0);

      const ancestors = detector.testFindAllAncestors(numbers[0], ast);
      expect(ancestors.length).toBeGreaterThan(0);
      // Ancestors should be from immediate parent to root
      expect(ancestors[ancestors.length - 1].type).toBe('program');
    });
  });

  describe('findDescendants()', () => {
    it('should find all descendants of a node', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      const descendants = detector.testFindDescendants(functions[0]);
      expect(descendants.length).toBeGreaterThan(0);
    });

    it('should return empty array for leaf nodes', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const numbers = detector.testFindNodes(ast, 'number');
      const descendants = detector.testFindDescendants(numbers[0]);
      expect(descendants).toEqual([]);
    });
  });

  describe('findDescendantsByType()', () => {
    it('should find descendants of a specific type', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      const identifiers = detector.testFindDescendantsByType(functions[0], 'identifier');
      expect(identifiers.length).toBeGreaterThan(0);
      expect(identifiers.every(n => n.type === 'identifier')).toBe(true);
    });
  });

  describe('getNodeText()', () => {
    it('should return node text directly', () => {
      const detector = new TestASTDetector();
      const node = createMockASTNode('identifier', 'myVariable');

      const text = detector.testGetNodeText(node);
      expect(text).toBe('myVariable');
    });

    it('should extract text from content for single-line nodes', () => {
      const detector = new TestASTDetector();
      const content = 'const myVariable = 42;';
      const node = createMockASTNode('identifier', 'myVariable', [], 0, 6, 0, 16);

      const text = detector.testGetNodeText(node, content);
      expect(text).toBe('myVariable');
    });

    it('should extract text from content for multi-line nodes', () => {
      const detector = new TestASTDetector();
      const content = 'function test() {\n  return 1;\n}';
      const node = createMockASTNode('function_declaration', 'function test() {...}', [], 0, 0, 2, 1);

      const text = detector.testGetNodeText(node, content);
      expect(text).toContain('function test()');
    });
  });

  describe('getNodeTextTrimmed()', () => {
    it('should return trimmed node text', () => {
      const detector = new TestASTDetector();
      const node = createMockASTNode('identifier', '  myVariable  ');

      const text = detector.testGetNodeTextTrimmed(node);
      expect(text).toBe('myVariable');
    });
  });

  describe('matchPattern()', () => {
    it('should match nodes by type', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const matches = detector.testMatchPattern(ast, { type: 'function_declaration' });
      expect(matches).toHaveLength(1);
      expect(matches[0].node.type).toBe('function_declaration');
      expect(matches[0].confidence).toBe(1);
    });

    it('should match nodes by text', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const matches = detector.testMatchPattern(ast, { type: 'identifier', text: 'hello' });
      expect(matches).toHaveLength(1);
      expect(matches[0].node.text).toBe('hello');
    });

    it('should match nodes by regex', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const matches = detector.testMatchPattern(ast, { type: 'identifier', text: /^[a-z]+$/ });
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should match nodes with predicate', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const matches = detector.testMatchPattern(ast, {
        type: 'identifier',
        predicate: (node) => node.text.length > 3,
      });
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every(m => m.node.text.length > 3)).toBe(true);
    });

    it('should capture nodes', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const matches = detector.testMatchPattern(ast, {
        type: 'function_declaration',
        capture: 'func',
      });
      expect(matches).toHaveLength(1);
      expect(matches[0].captures.get('func')).toBeDefined();
      expect(matches[0].captures.get('func')?.type).toBe('function_declaration');
    });

    it('should return empty array when no matches', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const matches = detector.testMatchPattern(ast, { type: 'nonexistent_type' });
      expect(matches).toEqual([]);
    });
  });

  describe('getParentChain()', () => {
    it('should return parent chain from root to immediate parent', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const numbers = detector.testFindNodes(ast, 'number');
      const chain = detector.testGetParentChain(ast, numbers[0]);
      
      expect(chain.length).toBeGreaterThan(0);
      expect(chain[0].type).toBe('program');
    });

    it('should return empty array for root node', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const chain = detector.testGetParentChain(ast, ast.rootNode);
      expect(chain).toEqual([]);
    });
  });

  describe('getParent()', () => {
    it('should return immediate parent', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      const parent = detector.testGetParent(ast, functions[0]);
      
      expect(parent).not.toBeNull();
      expect(parent?.type).toBe('program');
    });

    it('should return null for root node', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const parent = detector.testGetParent(ast, ast.rootNode);
      expect(parent).toBeNull();
    });
  });

  describe('getNodeDepth()', () => {
    it('should return 0 for root node', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const depth = detector.testGetNodeDepth(ast, ast.rootNode);
      expect(depth).toBe(0);
    });

    it('should return correct depth for nested nodes', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      const depth = detector.testGetNodeDepth(ast, functions[0]);
      expect(depth).toBe(1);
    });

    it('should return -1 for nodes not in AST', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();
      const orphanNode = createMockASTNode('orphan', 'orphan');

      const depth = detector.testGetNodeDepth(ast, orphanNode);
      expect(depth).toBe(-1);
    });
  });

  describe('isLeafNode()', () => {
    it('should return true for nodes without children', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const numbers = detector.testFindNodes(ast, 'number');
      expect(detector.testIsLeafNode(numbers[0])).toBe(true);
    });

    it('should return false for nodes with children', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      expect(detector.testIsLeafNode(functions[0])).toBe(false);
    });
  });

  describe('getChildrenByType()', () => {
    it('should return children of a specific type', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      const identifiers = detector.testGetChildrenByType(functions[0], 'identifier');
      
      expect(identifiers.length).toBeGreaterThan(0);
      expect(identifiers.every(n => n.type === 'identifier')).toBe(true);
    });

    it('should return empty array when no children match', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      const nonexistent = detector.testGetChildrenByType(functions[0], 'nonexistent');
      
      expect(nonexistent).toEqual([]);
    });
  });

  describe('getFirstChildByType()', () => {
    it('should return first child of a specific type', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      const identifier = detector.testGetFirstChildByType(functions[0], 'identifier');
      
      expect(identifier).not.toBeNull();
      expect(identifier?.type).toBe('identifier');
    });

    it('should return null when no child matches', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      const nonexistent = detector.testGetFirstChildByType(functions[0], 'nonexistent');
      
      expect(nonexistent).toBeNull();
    });
  });

  describe('hasChildOfType()', () => {
    it('should return true when child of type exists', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      expect(detector.testHasChildOfType(functions[0], 'identifier')).toBe(true);
    });

    it('should return false when no child of type exists', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      expect(detector.testHasChildOfType(functions[0], 'nonexistent')).toBe(false);
    });
  });

  describe('hasDescendantOfType()', () => {
    it('should return true when descendant of type exists', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      expect(detector.testHasDescendantOfType(functions[0], 'number')).toBe(true);
    });

    it('should return false when no descendant of type exists', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      expect(detector.testHasDescendantOfType(functions[0], 'class_declaration')).toBe(false);
    });
  });

  describe('getSiblings()', () => {
    it('should return sibling nodes', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      const siblings = detector.testGetSiblings(ast, functions[0]);
      
      expect(siblings.length).toBeGreaterThan(0);
      expect(siblings.some(s => s.type === 'class_declaration')).toBe(true);
    });

    it('should return empty array for root node', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const siblings = detector.testGetSiblings(ast, ast.rootNode);
      expect(siblings).toEqual([]);
    });
  });

  describe('getNextSibling()', () => {
    it('should return next sibling', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      const nextSibling = detector.testGetNextSibling(ast, functions[0]);
      
      expect(nextSibling).not.toBeNull();
      expect(nextSibling?.type).toBe('class_declaration');
    });

    it('should return null for last sibling', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const classes = detector.testFindNodes(ast, 'class_declaration');
      const nextSibling = detector.testGetNextSibling(ast, classes[0]);
      
      expect(nextSibling).toBeNull();
    });
  });

  describe('getPreviousSibling()', () => {
    it('should return previous sibling', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const classes = detector.testFindNodes(ast, 'class_declaration');
      const prevSibling = detector.testGetPreviousSibling(ast, classes[0]);
      
      expect(prevSibling).not.toBeNull();
      expect(prevSibling?.type).toBe('function_declaration');
    });

    it('should return null for first sibling', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const functions = detector.testFindNodes(ast, 'function_declaration');
      const prevSibling = detector.testGetPreviousSibling(ast, functions[0]);
      
      expect(prevSibling).toBeNull();
    });
  });

  describe('countNodes()', () => {
    it('should count nodes of a specific type', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const count = detector.testCountNodes(ast, 'identifier');
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 when no nodes match', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      const count = detector.testCountNodes(ast, 'nonexistent');
      expect(count).toBe(0);
    });
  });

  describe('hasNodeOfType()', () => {
    it('should return true when node type exists', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      expect(detector.testHasNodeOfType(ast, 'function_declaration')).toBe(true);
    });

    it('should return false when node type does not exist', () => {
      const detector = new TestASTDetector();
      const ast = createSampleAST();

      expect(detector.testHasNodeOfType(ast, 'nonexistent')).toBe(false);
    });
  });

  describe('getLineNumber()', () => {
    it('should return 1-indexed line number', () => {
      const detector = new TestASTDetector();
      const node = createMockASTNode('test', 'test', [], 5, 0, 5, 10);

      expect(detector.testGetLineNumber(node)).toBe(6);
    });
  });

  describe('getColumnNumber()', () => {
    it('should return 1-indexed column number', () => {
      const detector = new TestASTDetector();
      const node = createMockASTNode('test', 'test', [], 0, 10, 0, 20);

      expect(detector.testGetColumnNumber(node)).toBe(11);
    });
  });
});


describe('isASTDetector', () => {
  it('should return true for ASTDetector instances', () => {
    const detector = new TestASTDetector();
    expect(isASTDetector(detector)).toBe(true);
  });

  it('should return false for non-AST detectors', () => {
    // Create a mock detector with a different detection method
    class RegexDetector extends BaseDetector {
      readonly id = 'test/regex';
      readonly category: PatternCategory = 'structural';
      readonly subcategory = 'test';
      readonly name = 'Regex Detector';
      readonly description = 'Test';
      readonly supportedLanguages: Language[] = ['typescript'];
      readonly detectionMethod = 'regex' as const;

      async detect(_context: DetectionContext): Promise<DetectionResult> {
        return this.createEmptyResult();
      }

      generateQuickFix(_violation: Violation): QuickFix | null {
        return null;
      }
    }

    const regexDetector = new RegexDetector();
    expect(isASTDetector(regexDetector)).toBe(false);
  });
});

describe('detect() method', () => {
  it('should return empty result when AST is null', async () => {
    const detector = new TestASTDetector();
    const context = createMockDetectionContext(null);

    const result = await detector.detect(context);

    expect(result.patterns).toEqual([]);
    expect(result.violations).toEqual([]);
    expect(result.confidence).toBe(1.0);
  });

  it('should be callable with AST context', async () => {
    const detector = new TestASTDetector();
    const ast = createSampleAST();
    const context = createMockDetectionContext(ast);

    const result = await detector.detect(context);

    expect(result).toBeDefined();
    expect(result.patterns).toBeDefined();
    expect(result.violations).toBeDefined();
  });
});
