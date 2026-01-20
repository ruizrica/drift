/**
 * Types for contract detection
 */

import type { ContractField, HttpMethod } from 'driftdetect-core';

/**
 * Extracted endpoint from backend code
 */
export interface ExtractedEndpoint {
  method: HttpMethod;
  path: string;
  normalizedPath: string;
  file: string;
  line: number;
  responseFields: ContractField[];
  requestFields?: ContractField[];
  responseTypeName?: string;
  framework: string;
}

/**
 * Extracted API call from frontend code
 */
export interface ExtractedApiCall {
  method: HttpMethod;
  path: string;
  normalizedPath: string;
  file: string;
  line: number;
  responseType?: string;
  responseFields: ContractField[];
  requestType?: string;
  requestFields?: ContractField[];
  library: string;
}

/**
 * Result of backend endpoint extraction
 */
export interface BackendExtractionResult {
  endpoints: ExtractedEndpoint[];
  framework: string;
  confidence: number;
}

/**
 * Result of frontend API call extraction
 */
export interface FrontendExtractionResult {
  apiCalls: ExtractedApiCall[];
  library: string;
  confidence: number;
}
