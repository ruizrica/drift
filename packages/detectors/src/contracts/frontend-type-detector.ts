/**
 * Frontend Type Detector
 *
 * Extracts API call definitions and their associated TypeScript types
 * from frontend code. Supports fetch, axios, and react-query patterns.
 */

import type { ContractField, HttpMethod, Language } from 'driftdetect-core';
import type { DetectionContext, DetectionResult } from '../base/base-detector.js';
import { BaseDetector } from '../base/base-detector.js';
import type { ExtractedApiCall, FrontendExtractionResult } from './types.js';

// ============================================================================
// API Call Pattern Matchers
// ============================================================================

const FETCH_PATTERNS = [
  /fetch\s*\(\s*["'`]([^"'`]+)["'`](?:\s*,\s*\{[^}]*method\s*:\s*["'](\w+)["'][^}]*\})?\s*\)/gi,
  /fetch\s*\(\s*`([^`]+)`(?:\s*,\s*\{[^}]*method\s*:\s*["'](\w+)["'][^}]*\})?\s*\)/gi,
];

const AXIOS_PATTERNS = [
  /axios\.(get|post|put|patch|delete)\s*(?:<[^(]+>)?\s*\(\s*["'`]([^"'`]+)["'`]/gi,
  /axios\s*\(\s*\{[^}]*url\s*:\s*["'`]([^"'`]+)["'`][^}]*method\s*:\s*["'](\w+)["'][^}]*\}/gi,
];

// Patterns for axios client instances (e.g., apiClient.get('/api/...'))
// Note: Uses a more permissive pattern for generics to handle nested types like <ApiResponse<User[]>>
const AXIOS_CLIENT_PATTERNS = [
  /(\w+Client|\w+Api|api|client)\.(get|post|put|patch|delete)\s*(?:<[^(]+>)?\s*\(\s*["'`]([^"'`]+)["'`]/gi,
];

const REACT_QUERY_PATTERNS = [
  /useQuery\s*(?:<[^>]+>)?\s*\(\s*\{[^}]*queryFn\s*:[^}]*fetch\s*\(\s*["'`]([^"'`]+)["'`]/gi,
  /useMutation\s*(?:<[^>]+>)?\s*\(\s*\{[^}]*mutationFn\s*:[^}]*axios\.(post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
];

// ============================================================================
// Type Extraction Helpers
// ============================================================================

function extractTypeFields(content: string, typeName: string): ContractField[] {
  const fields: ContractField[] = [];
  
  const interfacePattern = new RegExp(
    `(?:interface|type)\\s+${typeName}\\s*(?:=\\s*)?\\{([^}]+)\\}`,
    'gs'
  );
  
  const match = interfacePattern.exec(content);
  if (!match || !match[1]) return fields;
  
  const body = match[1];
  const fieldPattern = /(\w+)(\?)?:\s*([^;,\n]+)/g;
  let fieldMatch;
  
  while ((fieldMatch = fieldPattern.exec(body)) !== null) {
    const name = fieldMatch[1];
    const optional = fieldMatch[2] === '?';
    const typeStr = fieldMatch[3];
    if (!name || !typeStr) continue;
    
    let type = typeStr.trim();
    const nullable = type.includes('| null') || type.includes('null |');
    type = type.replace(/\s*\|\s*null/g, '').replace(/null\s*\|\s*/g, '').trim();
    
    fields.push({ name, type, optional, nullable });
  }
  
  return fields;
}

function findResponseType(content: string, line: number): string | undefined {
  const lines = content.split('\n');
  
  // Look backwards for type annotations
  for (let i = line - 1; i >= Math.max(0, line - 10); i--) {
    const lineContent = lines[i];
    if (!lineContent) continue;
    
    const constMatch = lineContent.match(/const\s+\w+\s*:\s*(\w+)/);
    if (constMatch && constMatch[1]) return constMatch[1];
    
    const thenMatch = lineContent.match(/\.then\s*\(\s*\([^)]*\)\s*:\s*(\w+)/);
    if (thenMatch && thenMatch[1]) return thenMatch[1];
    
    const genericMatch = lineContent.match(/fetch\s*<\s*(\w+)\s*>/);
    if (genericMatch && genericMatch[1]) return genericMatch[1];
    
    const axiosGenericMatch = lineContent.match(/axios\.\w+\s*<\s*(\w+)\s*>/);
    if (axiosGenericMatch && axiosGenericMatch[1]) return axiosGenericMatch[1];
  }
  
  // Look forward for type assertions
  for (let i = line; i < Math.min(lines.length, line + 5); i++) {
    const lineContent = lines[i];
    if (!lineContent) continue;
    
    const asMatch = lineContent.match(/as\s+(\w+)/);
    if (asMatch && asMatch[1]) return asMatch[1];
    
    const jsonAsMatch = lineContent.match(/\.json\(\)\s+as\s+(\w+)/);
    if (jsonAsMatch && jsonAsMatch[1]) return jsonAsMatch[1];
  }
  
  return undefined;
}

/**
 * Find the enclosing function and extract its return type
 * Handles patterns like: async function foo(): Promise<{ field: type }> { ... }
 * Also handles: async function foo(): Promise<TypeName> { ... }
 */
function findFunctionReturnType(content: string, line: number): ContractField[] {
  const lines = content.split('\n');
  
  // Look backwards to find the function declaration
  for (let i = line - 1; i >= Math.max(0, line - 20); i--) {
    const lineContent = lines[i];
    if (!lineContent) continue;
    
    // Match: async function name(...): Promise<{ ... }> or (): Promise<{ ... }> =>
    const promiseMatch = lineContent.match(/:\s*Promise\s*<\s*\{([^}]+)\}/);
    if (promiseMatch && promiseMatch[1]) {
      return extractInlineTypeFields(promiseMatch[1]);
    }
    
    // Match named type: ): Promise<TypeName>
    const namedPromiseMatch = lineContent.match(/:\s*Promise\s*<\s*(\w+)\s*>/);
    if (namedPromiseMatch && namedPromiseMatch[1]) {
      const typeName = namedPromiseMatch[1];
      // Look up the type definition in the file
      const typeFields = extractTypeFields(content, typeName);
      if (typeFields.length > 0) {
        return typeFields;
      }
    }
    
    // Stop if we hit another function or class
    if (lineContent.match(/^(?:export\s+)?(?:async\s+)?function\s/) && i < line - 1) break;
    if (lineContent.match(/^(?:export\s+)?class\s/)) break;
  }
  
  return [];
}

/**
 * Extract fields from inline type definition like { field: type; field2: type2 }
 */
function extractInlineTypeFields(typeBody: string): ContractField[] {
  const fields: ContractField[] = [];
  
  // Match field: type patterns (with optional ? for optional fields)
  const fieldPattern = /(\w+)(\?)?:\s*([^;,]+)/g;
  let match;
  
  while ((match = fieldPattern.exec(typeBody)) !== null) {
    const name = match[1];
    const optional = match[2] === '?';
    let type = match[3];
    if (!name || !type) continue;
    
    type = type.trim();
    const nullable = type.includes('| null') || type.includes('null |');
    type = type.replace(/\s*\|\s*null/g, '').replace(/null\s*\|\s*/g, '').trim();
    
    fields.push({ name, type, optional, nullable });
  }
  
  return fields;
}

/**
 * Combined function to extract response fields from various sources
 */
function extractResponseFields(content: string, line: number): { responseType: string | undefined; fields: ContractField[] } {
  // First try to find a named type
  const responseType = findResponseType(content, line);
  if (responseType) {
    const fields = extractTypeFields(content, responseType);
    if (fields.length > 0) {
      return { responseType, fields };
    }
  }
  
  // Then try to extract from function return type (Promise<{ ... }>)
  const inlineFields = findFunctionReturnType(content, line);
  if (inlineFields.length > 0) {
    return { responseType: undefined, fields: inlineFields };
  }
  
  return { responseType, fields: [] };
}

function normalizePath(path: string): string {
  return path
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/\{(\w+)\}/g, ':$1')
    .replace(/\/+/g, '/');
}

// ============================================================================
// Frontend Type Detector
// ============================================================================

export class FrontendTypeDetector extends BaseDetector {
  readonly id = 'contracts/frontend-types';
  readonly category = 'api' as const;
  readonly subcategory = 'contracts';
  readonly name = 'Frontend Type Detector';
  readonly description = 'Extracts API call definitions and TypeScript types from frontend code';
  readonly supportedLanguages: Language[] = ['typescript', 'javascript'];
  readonly detectionMethod = 'regex' as const;

  async detect(context: DetectionContext): Promise<DetectionResult> {
    const { content, file } = context;
    
    if (this.isBackendFile(content, file)) {
      return this.createEmptyResult();
    }
    
    const result = this.extractApiCalls(content, file);
    
    return this.createResult([], [], result.confidence, {
      custom: {
        extractedApiCalls: result.apiCalls,
        library: result.library,
      },
    });
  }

  private isBackendFile(content: string, _file: string): boolean {
    // Detect by content patterns, not file path
    // Express/Koa/Hapi server patterns
    if (content.includes('express()') || content.includes('app.listen') ||
        content.includes('router.get(') || content.includes('router.post(') ||
        content.includes('res.json(') || content.includes('res.send(') ||
        content.includes('req.body') || content.includes('req.params')) {
      // But not if it also has React/frontend patterns
      if (!content.includes('import React') && !content.includes("from 'react'") &&
          !content.includes('useState') && !content.includes('useEffect')) {
        return true;
      }
    }
    
    return false;
  }

  private extractApiCalls(content: string, file: string): FrontendExtractionResult {
    const apiCalls: ExtractedApiCall[] = [];
    let library = 'fetch';
    
    if (content.includes('import axios') || content.includes("from 'axios'")) {
      library = 'axios';
    } else if (content.includes('@tanstack/react-query') || content.includes('useQuery')) {
      library = 'react-query';
    }
    
    // Extract fetch calls
    for (const pattern of FETCH_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(content)) !== null) {
        const path = match[1];
        if (!path) continue;
        
        const method = (match[2]?.toUpperCase() || 'GET') as HttpMethod;
        const line = content.substring(0, match.index).split('\n').length;
        
        if (!path.startsWith('/api') && !path.startsWith('http')) continue;
        
        const { responseType, fields: responseFields } = extractResponseFields(content, line);
        
        const apiCall: ExtractedApiCall = {
          method,
          path,
          normalizedPath: normalizePath(path),
          file,
          line,
          responseFields,
          library: 'fetch',
        };
        if (responseType) {
          apiCall.responseType = responseType;
        }
        apiCalls.push(apiCall);
      }
    }
    
    // Extract axios calls
    for (const pattern of AXIOS_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(content)) !== null) {
        let method: HttpMethod;
        let path: string;
        
        if (match[1] && ['get', 'post', 'put', 'patch', 'delete'].includes(match[1].toLowerCase())) {
          method = match[1].toUpperCase() as HttpMethod;
          path = match[2] || '';
        } else {
          path = match[1] || '';
          method = (match[2]?.toUpperCase() || 'GET') as HttpMethod;
        }
        
        if (!path) continue;
        
        const line = content.substring(0, match.index).split('\n').length;
        
        if (!path.startsWith('/api') && !path.startsWith('http')) continue;
        
        const { responseType, fields: responseFields } = extractResponseFields(content, line);
        
        const apiCall: ExtractedApiCall = {
          method,
          path,
          normalizedPath: normalizePath(path),
          file,
          line,
          responseFields,
          library: 'axios',
        };
        if (responseType) {
          apiCall.responseType = responseType;
        }
        apiCalls.push(apiCall);
      }
    }
    
    // Extract react-query calls
    for (const pattern of REACT_QUERY_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(content)) !== null) {
        let method: HttpMethod = 'GET';
        let path: string;
        
        if (match[2]) {
          method = (match[1]?.toUpperCase() || 'POST') as HttpMethod;
          path = match[2];
        } else {
          path = match[1] || '';
        }
        
        if (!path) continue;
        
        const line = content.substring(0, match.index).split('\n').length;
        
        if (!path.startsWith('/api') && !path.startsWith('http')) continue;
        
        const { responseType, fields: responseFields } = extractResponseFields(content, line);
        
        const apiCall: ExtractedApiCall = {
          method,
          path,
          normalizedPath: normalizePath(path),
          file,
          line,
          responseFields,
          library: 'react-query',
        };
        if (responseType) {
          apiCall.responseType = responseType;
        }
        apiCalls.push(apiCall);
      }
    }
    
    // Extract axios client instance calls (e.g., apiClient.get('/api/...'))
    for (const pattern of AXIOS_CLIENT_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(content)) !== null) {
        const method = (match[2]?.toUpperCase() || 'GET') as HttpMethod;
        const path = match[3] || '';
        
        if (!path) continue;
        
        const line = content.substring(0, match.index).split('\n').length;
        
        if (!path.startsWith('/api') && !path.startsWith('http')) continue;
        
        const { responseType, fields: responseFields } = extractResponseFields(content, line);
        
        const apiCall: ExtractedApiCall = {
          method,
          path,
          normalizedPath: normalizePath(path),
          file,
          line,
          responseFields,
          library: 'axios',
        };
        if (responseType) {
          apiCall.responseType = responseType;
        }
        apiCalls.push(apiCall);
      }
    }
    
    return {
      apiCalls,
      library,
      confidence: apiCalls.length > 0 ? 0.75 : 0,
    };
  }

  generateQuickFix(): null {
    return null;
  }
}

export function createFrontendTypeDetector(): FrontendTypeDetector {
  return new FrontendTypeDetector();
}

export function extractFrontendApiCalls(content: string, file: string): FrontendExtractionResult {
  const detector = new FrontendTypeDetector();
  return (detector as any).extractApiCalls(content, file);
}
