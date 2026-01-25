/**
 * Warp Framework Detector
 *
 * Detects Warp web framework patterns in Rust code.
 * 
 * Patterns detected:
 * - Filter chains
 * - Route definitions
 * - Rejection handling
 * - WebSocket support
 * - CORS configuration
 */

import type { PatternCategory } from 'driftdetect-core';

/**
 * Pattern match for Rust detectors
 */
export interface RustPatternMatch {
  id: string;
  name: string;
  category: PatternCategory;
  file: string;
  line: number;
  column: number;
  context: string;
  confidence: number;
  framework: string;
}

export interface WarpDetectorOptions {
  includeFilters?: boolean;
  includeRejections?: boolean;
}

export interface WarpRoute {
  method: string;
  path: string;
  file: string;
  line: number;
  filters: string[];
}

export interface WarpFilter {
  name: string;
  type: 'path' | 'method' | 'header' | 'body' | 'query' | 'custom';
  file: string;
  line: number;
}

export interface WarpDetectionResult {
  routes: WarpRoute[];
  filters: WarpFilter[];
  rejections: RustPatternMatch[];
  websockets: RustPatternMatch[];
  patterns: RustPatternMatch[];
}

/**
 * Detect Warp framework patterns
 */
export function detectWarpPatterns(
  source: string,
  filePath: string,
  options: WarpDetectorOptions = {}
): WarpDetectionResult {
  const routes: WarpRoute[] = [];
  const filters: WarpFilter[] = [];
  const rejections: RustPatternMatch[] = [];
  const websockets: RustPatternMatch[] = [];
  const patterns: RustPatternMatch[] = [];

  // Detect path filters with methods
  const pathMethodPattern = /warp::path\s*\(\s*"([^"]+)"\s*\)[^;]*\.(get|post|put|delete|patch|head|options)\s*\(\s*\)/gi;
  let match;
  
  while ((match = pathMethodPattern.exec(source)) !== null) {
    const path = match[1] ?? '';
    const method = match[2]?.toUpperCase() ?? 'GET';
    const line = getLineNumber(source, match.index);

    routes.push({
      method,
      path: `/${path}`,
      file: filePath,
      line,
      filters: [],
    });

    patterns.push({
      id: `warp-route-${filePath}:${line}`,
      name: 'warp-route',
      category: 'api' as PatternCategory,
      file: filePath,
      line,
      column: 0,
      context: `${method} /${path}`,
      confidence: 0.9,
      framework: 'warp',
    });
  }

  // Detect standalone method filters
  const methodPattern = /warp::(get|post|put|delete|patch|head|options)\s*\(\s*\)/gi;
  while ((match = methodPattern.exec(source)) !== null) {
    const method = match[1]?.toUpperCase() ?? 'GET';
    const line = getLineNumber(source, match.index);

    // Check if this is part of a route we already captured
    const existingRoute = routes.find(r => r.line === line);
    if (!existingRoute) {
      routes.push({
        method,
        path: '/',
        file: filePath,
        line,
        filters: [],
      });
    }
  }

  // Detect filters
  if (options.includeFilters !== false) {
    // Path filters
    const pathPattern = /warp::path\s*\(\s*"([^"]+)"\s*\)/g;
    while ((match = pathPattern.exec(source)) !== null) {
      const pathSegment = match[1] ?? '';
      const line = getLineNumber(source, match.index);

      filters.push({
        name: pathSegment,
        type: 'path',
        file: filePath,
        line,
      });
    }

    // Path parameter filters
    const pathParamPattern = /warp::path::param\s*::<\s*(\w+)\s*>\s*\(\s*\)/g;
    while ((match = pathParamPattern.exec(source)) !== null) {
      const paramType = match[1] ?? 'String';
      const line = getLineNumber(source, match.index);

      filters.push({
        name: `param:${paramType}`,
        type: 'path',
        file: filePath,
        line,
      });

      patterns.push({
        id: `warp-path-param-${filePath}:${line}`,
        name: 'warp-path-param',
        category: 'api' as PatternCategory,
        file: filePath,
        line,
        column: 0,
        context: `Path parameter: ${paramType}`,
        confidence: 0.85,
        framework: 'warp',
      });
    }

    // Header filters
    const headerPattern = /warp::header\s*::<\s*(\w+)\s*>\s*\(\s*"([^"]+)"\s*\)/g;
    while ((match = headerPattern.exec(source)) !== null) {
      const headerType = match[1] ?? 'String';
      const headerName = match[2] ?? '';
      const line = getLineNumber(source, match.index);

      filters.push({
        name: headerName,
        type: 'header',
        file: filePath,
        line,
      });

      patterns.push({
        id: `warp-header-${filePath}:${line}`,
        name: 'warp-header-filter',
        category: 'api' as PatternCategory,
        file: filePath,
        line,
        column: 0,
        context: `Header filter: ${headerName} (${headerType})`,
        confidence: 0.85,
        framework: 'warp',
      });
    }

    // Body filters
    const bodyPattern = /warp::body::(json|form|bytes|stream)\s*\(\s*\)/g;
    while ((match = bodyPattern.exec(source)) !== null) {
      const bodyType = match[1] ?? 'json';
      const line = getLineNumber(source, match.index);

      filters.push({
        name: bodyType,
        type: 'body',
        file: filePath,
        line,
      });

      patterns.push({
        id: `warp-body-${filePath}:${line}`,
        name: 'warp-body-filter',
        category: 'api' as PatternCategory,
        file: filePath,
        line,
        column: 0,
        context: `Body filter: ${bodyType}`,
        confidence: 0.85,
        framework: 'warp',
      });
    }

    // Query filters
    const queryPattern = /warp::query\s*::<\s*([^>]+)\s*>\s*\(\s*\)/g;
    while ((match = queryPattern.exec(source)) !== null) {
      const queryType = match[1]?.trim() ?? '';
      const line = getLineNumber(source, match.index);

      filters.push({
        name: queryType,
        type: 'query',
        file: filePath,
        line,
      });

      patterns.push({
        id: `warp-query-${filePath}:${line}`,
        name: 'warp-query-filter',
        category: 'api' as PatternCategory,
        file: filePath,
        line,
        column: 0,
        context: `Query filter: ${queryType}`,
        confidence: 0.85,
        framework: 'warp',
      });
    }
  }

  // Detect rejection handling
  if (options.includeRejections !== false) {
    const rejectPattern = /\.recover\s*\(\s*(\w+)\s*\)/g;
    while ((match = rejectPattern.exec(source)) !== null) {
      const handler = match[1] ?? 'unknown';
      const line = getLineNumber(source, match.index);

      rejections.push({
        id: `warp-rejection-${filePath}:${line}`,
        name: 'warp-rejection-handler',
        category: 'errors' as PatternCategory,
        file: filePath,
        line,
        column: 0,
        context: `Rejection handler: ${handler}`,
        confidence: 0.9,
        framework: 'warp',
      });
    }

    // Custom rejection types
    const customRejectPattern = /impl\s+warp::reject::Reject\s+for\s+(\w+)/g;
    while ((match = customRejectPattern.exec(source)) !== null) {
      const rejectType = match[1] ?? 'unknown';
      const line = getLineNumber(source, match.index);

      rejections.push({
        id: `warp-custom-rejection-${filePath}:${line}`,
        name: 'warp-custom-rejection',
        category: 'errors' as PatternCategory,
        file: filePath,
        line,
        column: 0,
        context: `Custom rejection: ${rejectType}`,
        confidence: 0.9,
        framework: 'warp',
      });
    }
  }

  // Detect WebSocket support
  const wsPattern = /warp::ws\s*\(\s*\)/g;
  while ((match = wsPattern.exec(source)) !== null) {
    const line = getLineNumber(source, match.index);

    websockets.push({
      id: `warp-websocket-${filePath}:${line}`,
      name: 'warp-websocket',
      category: 'api' as PatternCategory,
      file: filePath,
      line,
      column: 0,
      context: 'WebSocket endpoint',
      confidence: 0.95,
      framework: 'warp',
    });
  }

  // Detect CORS configuration
  const corsPattern = /warp::cors\s*\(\s*\)/g;
  while ((match = corsPattern.exec(source)) !== null) {
    const line = getLineNumber(source, match.index);

    patterns.push({
      id: `warp-cors-${filePath}:${line}`,
      name: 'warp-cors',
      category: 'security' as PatternCategory,
      file: filePath,
      line,
      column: 0,
      context: 'CORS configuration',
      confidence: 0.9,
      framework: 'warp',
    });
  }

  // Detect filter composition
  const andPattern = /\.and\s*\(/g;
  let andCount = 0;
  while ((match = andPattern.exec(source)) !== null) {
    andCount++;
  }

  if (andCount > 0) {
    patterns.push({
      id: `warp-filter-composition-${filePath}`,
      name: 'warp-filter-composition',
      category: 'structural' as PatternCategory,
      file: filePath,
      line: 1,
      column: 0,
      context: `Filter composition: ${andCount} .and() calls`,
      confidence: 0.8,
      framework: 'warp',
    });
  }

  return {
    routes,
    filters,
    rejections,
    websockets,
    patterns,
  };
}

/**
 * Get line number from character index
 */
function getLineNumber(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

/**
 * Check if source uses Warp framework
 */
export function isWarpProject(source: string): boolean {
  return source.includes('warp::') ||
         source.includes('use warp') ||
         source.includes('warp::Filter');
}
