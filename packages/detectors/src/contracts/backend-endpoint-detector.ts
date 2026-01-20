/**
 * Backend Endpoint Detector
 *
 * Extracts API endpoint definitions from backend code.
 * Supports Python (FastAPI, Flask) and TypeScript (Express).
 */

import type { ContractField, HttpMethod, Language } from 'driftdetect-core';
import type { DetectionContext, DetectionResult } from '../base/base-detector.js';
import { BaseDetector } from '../base/base-detector.js';
import type { ExtractedEndpoint, BackendExtractionResult } from './types.js';

// ============================================================================
// FastAPI Pattern Matchers
// ============================================================================

const FASTAPI_ROUTE_PATTERNS = [
  /@(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi,
  /@(?:app|router)\.api_route\s*\(\s*["']([^"']+)["']/gi,
];

const FLASK_ROUTE_PATTERNS = [
  /@(?:app|bp|blueprint)\.(route|get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi,
];

const EXPRESS_ROUTE_PATTERNS = [
  /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
];

// ============================================================================
// Field Extraction Helpers
// ============================================================================

// Response wrappers that don't represent actual response schema
const RESPONSE_WRAPPERS = new Set([
  'JSONResponse', 'Response', 'HTMLResponse', 'PlainTextResponse',
  'RedirectResponse', 'StreamingResponse', 'FileResponse',
  'jsonify', 'make_response',  // Flask
]);

/**
 * Extract fields from a Pydantic model class definition
 */
function extractPydanticModelFields(content: string, modelName: string): ContractField[] {
  const fields: ContractField[] = [];
  
  // Find the class definition: class ModelName(BaseModel):
  const classPattern = new RegExp(`class\\s+${modelName}\\s*\\([^)]*\\)\\s*:`, 'g');
  const classMatch = classPattern.exec(content);
  if (!classMatch) return fields;
  
  const classStart = classMatch.index + classMatch[0].length;
  const lines = content.substring(classStart).split('\n');
  
  // Parse fields until we hit another class or unindented line
  for (let i = 0; i < lines.length && i < 30; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Stop at next class definition or unindented non-empty line
    if (i > 0 && line.match(/^[^\s]/) && line.trim()) break;
    if (line.match(/^class\s+/)) break;
    
    // Match field definitions: field_name: Type or field_name: Optional[Type] = default
    const fieldMatch = line.match(/^\s+(\w+)\s*:\s*(?:Optional\[)?(\w+)(?:\])?\s*(?:=.*)?$/);
    if (fieldMatch && fieldMatch[1] && fieldMatch[2]) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const isOptional = line.includes('Optional[') || line.includes('= None') || line.includes('= Field(');
      
      // Skip private fields and class methods
      if (!fieldName.startsWith('_') && fieldName !== 'class') {
        fields.push({
          name: fieldName,
          type: mapPythonType(fieldType),
          optional: isOptional,
          nullable: line.includes('= None'),
          line: 0,
        });
      }
    }
  }
  
  return fields;
}

/**
 * Map Python types to generic types
 */
function mapPythonType(pythonType: string): string {
  const typeMap: Record<string, string> = {
    'str': 'string',
    'int': 'number',
    'float': 'number',
    'bool': 'boolean',
    'list': 'array',
    'dict': 'object',
    'List': 'array',
    'Dict': 'object',
    'Any': 'any',
  };
  return typeMap[pythonType] || pythonType;
}

/**
 * Extract response_model from FastAPI decorator
 */
function extractResponseModel(content: string, decoratorLine: number): string | null {
  const lines = content.split('\n');
  // Look at the decorator line and possibly the next few lines (for multi-line decorators)
  const decoratorContent = lines.slice(decoratorLine - 1, decoratorLine + 2).join(' ');
  
  const responseModelMatch = decoratorContent.match(/response_model\s*=\s*(\w+)/);
  return responseModelMatch && responseModelMatch[1] ? responseModelMatch[1] : null;
}

function extractPythonResponseFields(content: string, line: number): ContractField[] {
  const fields: ContractField[] = [];
  const lines = content.split('\n');
  const endLine = Math.min(line + 50, lines.length);
  
  // First, check if there's a response_model in the decorator
  const responseModel = extractResponseModel(content, line);
  if (responseModel && !RESPONSE_WRAPPERS.has(responseModel)) {
    const modelFields = extractPydanticModelFields(content, responseModel);
    if (modelFields.length > 0) {
      return modelFields;
    }
  }
  
  // Fallback: scan function body for return statements
  let foundFields = false;
  
  for (let i = line; i < endLine; i++) {
    const lineContent = lines[i];
    if (!lineContent) continue;
    
    // Stop at next function/class definition
    if (i > line && lineContent.match(/^(?:def|class|@)\s/)) break;
    
    // Pattern 1: return {...} - direct dict return
    const dictMatch = lineContent.match(/return\s*\{([^}]+)\}/);
    if (dictMatch && dictMatch[1]) {
      extractDictFields(dictMatch[1], i + 1, fields);
      foundFields = true;
      continue;
    }
    
    // Pattern 2: return JSONResponse({...}) or jsonify({...}) - wrapper with dict
    const wrapperDictMatch = lineContent.match(/return\s+(\w+)\s*\(\s*\{([^}]+)\}/);
    if (wrapperDictMatch && wrapperDictMatch[1] && wrapperDictMatch[2]) {
      const wrapperName = wrapperDictMatch[1];
      if (RESPONSE_WRAPPERS.has(wrapperName)) {
        extractDictFields(wrapperDictMatch[2], i + 1, fields);
        foundFields = true;
        continue;
      }
    }
    
    // Pattern 3: return SomeModel(...) - Pydantic model return (without response_model)
    if (!foundFields && !responseModel) {
      const modelMatch = lineContent.match(/return\s+(\w+)\s*\(/);
      if (modelMatch && modelMatch[1]) {
        const modelName = modelMatch[1];
        if (!RESPONSE_WRAPPERS.has(modelName)) {
          // Try to extract fields from the model definition
          const modelFields = extractPydanticModelFields(content, modelName);
          if (modelFields.length > 0) {
            fields.push(...modelFields);
            foundFields = true;
          }
        }
      }
    }
  }
  
  return fields;
}

function extractDictFields(dictContent: string, line: number, fields: ContractField[]): void {
  const keyMatches = dictContent.matchAll(/["'](\w+)["']\s*:/g);
  for (const match of keyMatches) {
    if (match[1]) {
      fields.push({
        name: match[1],
        type: 'unknown',
        optional: false,
        nullable: false,
        line,
      });
    }
  }
}

function extractExpressResponseFields(content: string, line: number): ContractField[] {
  const fields: ContractField[] = [];
  const lines = content.split('\n');
  const endLine = Math.min(line + 50, lines.length);
  
  for (let i = line; i < endLine; i++) {
    const lineContent = lines[i];
    if (!lineContent) continue;
    
    const jsonMatch = lineContent.match(/res\.(?:json|send)\s*\(\s*\{([^}]+)\}/);
    if (jsonMatch && jsonMatch[1]) {
      const objContent = jsonMatch[1];
      const keyMatches = objContent.matchAll(/(\w+)\s*:/g);
      for (const match of keyMatches) {
        if (match[1]) {
          fields.push({
            name: match[1],
            type: 'unknown',
            optional: false,
            nullable: false,
            line: i + 1,
          });
        }
      }
    }
  }
  
  return fields;
}

function normalizePath(path: string): string {
  return path
    .replace(/\{(\w+)\}/g, ':$1')
    .replace(/<(\w+)>/g, ':$1')
    .replace(/\$\{(\w+)\}/g, ':$1');
}

// ============================================================================
// Backend Endpoint Detector
// ============================================================================

export class BackendEndpointDetector extends BaseDetector {
  readonly id = 'contracts/backend-endpoints';
  readonly category = 'api' as const;
  readonly subcategory = 'contracts';
  readonly name = 'Backend Endpoint Detector';
  readonly description = 'Extracts API endpoint definitions from backend code for contract matching';
  readonly supportedLanguages: Language[] = ['python', 'typescript', 'javascript'];
  readonly detectionMethod = 'regex' as const;

  async detect(context: DetectionContext): Promise<DetectionResult> {
    const { content, language, file } = context;
    
    let result: BackendExtractionResult;
    
    if (language === 'python') {
      result = this.extractPythonEndpoints(content, file);
    } else if (language === 'typescript' || language === 'javascript') {
      result = this.extractExpressEndpoints(content, file);
    } else {
      return this.createEmptyResult();
    }
    
    return this.createResult([], [], result.confidence, {
      custom: {
        extractedEndpoints: result.endpoints,
        framework: result.framework,
      },
    });
  }

  private extractPythonEndpoints(content: string, file: string): BackendExtractionResult {
    const endpoints: ExtractedEndpoint[] = [];
    let framework = 'unknown';
    
    if (content.includes('from fastapi') || content.includes('import fastapi')) {
      framework = 'fastapi';
    } else if (content.includes('from flask') || content.includes('import flask')) {
      framework = 'flask';
    }
    
    const patterns = framework === 'fastapi' ? FASTAPI_ROUTE_PATTERNS : FLASK_ROUTE_PATTERNS;
    
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(content)) !== null) {
        const method = (match[1]?.toUpperCase() || 'GET') as HttpMethod;
        const path = match[2] || match[1] || '';
        if (!path) continue;
        
        const line = content.substring(0, match.index).split('\n').length;
        
        endpoints.push({
          method,
          path,
          normalizedPath: normalizePath(path),
          file,
          line,
          responseFields: extractPythonResponseFields(content, line),
          framework,
        });
      }
    }
    
    return {
      endpoints,
      framework,
      confidence: endpoints.length > 0 ? 0.8 : 0,
    };
  }

  private extractExpressEndpoints(content: string, file: string): BackendExtractionResult {
    const endpoints: ExtractedEndpoint[] = [];
    const framework = 'express';
    
    if (content.includes('import React') || content.includes('from "react"')) {
      return { endpoints: [], framework, confidence: 0 };
    }
    
    for (const pattern of EXPRESS_ROUTE_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(content)) !== null) {
        const method = (match[1]?.toUpperCase() || 'GET') as HttpMethod;
        const path = match[2] || '';
        if (!path) continue;
        
        const line = content.substring(0, match.index).split('\n').length;
        
        endpoints.push({
          method,
          path,
          normalizedPath: normalizePath(path),
          file,
          line,
          responseFields: extractExpressResponseFields(content, line),
          framework,
        });
      }
    }
    
    return {
      endpoints,
      framework,
      confidence: endpoints.length > 0 ? 0.8 : 0,
    };
  }

  generateQuickFix(): null {
    return null;
  }
}

export function createBackendEndpointDetector(): BackendEndpointDetector {
  return new BackendEndpointDetector();
}

export function extractBackendEndpoints(
  content: string,
  file: string,
  language: 'python' | 'typescript' | 'javascript'
): BackendExtractionResult {
  const detector = new BackendEndpointDetector();
  
  if (language === 'python') {
    return (detector as any).extractPythonEndpoints(content, file);
  } else {
    return (detector as any).extractExpressEndpoints(content, file);
  }
}
