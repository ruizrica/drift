/**
 * @drift/detectors - Pattern detectors for Drift
 *
 * This package provides modular, pluggable pattern detectors:
 * - Registry: Detector registration and lazy loading
 * - Base: Abstract detector classes
 * - 15 categories of detectors (101 total)
 *
 * Usage:
 * ```typescript
 * import { createAllDetectorsArray, BaseDetector } from '@drift/detectors';
 * 
 * const detectors = createAllDetectorsArray();
 * for (const detector of detectors) {
 *   const result = await detector.detect(context);
 * }
 * ```
 */

// Export version
export const VERSION = '0.0.1';

// Registry exports
export * from './registry/index.js';

// Base exports (core interfaces)
export * from './base/index.js';

// Contract exports (BE↔FE mismatch detection)
export * from './contracts/index.js';

// ============================================================================
// Detector Factory Imports
// ============================================================================

// API Detectors
import {
  createRouteStructureDetector,
  createHttpMethodsDetector,
  createResponseEnvelopeDetector,
  createErrorFormatDetector,
  createPaginationDetector,
  createClientPatternsDetector,
  createRetryPatternsDetector,
  // Analysis functions for direct use
  analyzeRouteStructure,
  analyzeHttpMethods,
  analyzeResponseEnvelope,
  analyzeErrorFormat,
  analyzePagination,
  analyzeClientPatterns,
  analyzeRetryPatterns,
} from './api/index.js';

// Auth Detectors
import {
  createAuthMiddlewareDetector,
  createTokenHandlingDetector,
  createPermissionChecksDetector,
  createRbacPatternsDetector,
  createResourceOwnershipDetector,
  createAuditLoggingDetector,
  createAllAuthDetectors,
  analyzeAuthMiddleware,
  analyzeTokenHandling,
  analyzePermissions,
  analyzeRbac,
  analyzeOwnership,
  analyzeAuditLogging,
} from './auth/index.js';

// Security Detectors
import {
  createInputSanitizationDetector,
  createSQLInjectionDetector,
  createXSSPreventionDetector,
  createCSRFProtectionDetector,
  createCSPHeadersDetector,
  createSecretManagementDetector,
  createRateLimitingDetector,
  createSecurityDetectors,
  analyzeInputSanitization,
  analyzeSQLInjection,
  analyzeXSSPrevention,
  analyzeCSRFProtection,
  analyzeCSPHeaders,
  analyzeSecretManagement,
  analyzeRateLimiting,
} from './security/index.js';

// Error Detectors
import {
  createExceptionHierarchyDetector,
  createErrorCodesDetector,
  createTryCatchPlacementDetector,
  createErrorPropagationDetector,
  createAsyncErrorsDetector,
  createCircuitBreakerDetector,
  createErrorLoggingDetector,
  createAllErrorDetectors,
  analyzeExceptionHierarchy,
  analyzeErrorCodes,
  analyzeTryCatchPlacement,
  analyzeErrorPropagation,
  analyzeAsyncErrors,
  analyzeCircuitBreaker,
  analyzeErrorLogging,
} from './errors/index.js';

// Logging Detectors
import {
  createStructuredFormatDetector,
  createLogLevelsDetector,
  createContextFieldsDetector,
  createCorrelationIdsDetector,
  createPIIRedactionDetector,
  createMetricNamingDetector,
  createHealthChecksDetector,
  createAllLoggingDetectors,
  analyzeStructuredFormat,
  analyzeLogLevels,
  analyzeContextFields,
  analyzeCorrelationIds,
  analyzePIIRedaction,
  analyzeMetricNaming,
  analyzeHealthChecks,
} from './logging/index.js';

// Testing Detectors
import {
  createTestFileNamingDetector,
  createTestCoLocationDetector,
  createTestStructureDetector,
  createMockPatternsDetector,
  createFixturePatternsDetector,
  createDescribeNamingDetector,
  createSetupTeardownDetector,
  createAllTestingDetectors,
  analyzeTestFileNaming,
  analyzeTestStructure,
  analyzeMockPatterns,
  analyzeFixturePatterns,
  analyzeDescribeNaming,
  analyzeSetupTeardown,
} from './testing/index.js';

// Data Access Detectors
import {
  createQueryPatternsDetector,
  createRepositoryPatternDetector,
  createTransactionPatternsDetector,
  createValidationPatternsDetector,
  createDTOPatternsDetector,
  createNPlusOneDetector,
  createConnectionPoolingDetector,
  createAllDataAccessDetectors,
  analyzeQueryPatterns,
  analyzeRepositoryPattern,
  analyzeTransactionPatterns,
  analyzeValidationPatterns,
  analyzeDTOPatterns,
  analyzeNPlusOne,
  analyzeConnectionPooling,
} from './data-access/index.js';

// Config Detectors
import {
  createEnvNamingDetector,
  createRequiredOptionalDetector,
  createDefaultValuesDetector,
  createFeatureFlagsDetector,
  createConfigValidationDetector,
  createEnvironmentDetectionDetector,
  createConfigDetectors,
  analyzeEnvNaming,
  analyzeRequiredOptional,
  analyzeDefaultValues,
  analyzeFeatureFlags,
  analyzeConfigValidation,
  analyzeEnvironmentDetection,
} from './config/index.js';

// Types Detectors
import {
  createFileLocationDetector,
  createNamingConventionsDetector,
  createInterfaceVsTypeDetector,
  createGenericPatternsDetector,
  createUtilityTypesDetector,
  createTypeAssertionsDetector,
  createAnyUsageDetector,
  createTypesDetectors,
  analyzeFileLocation,
  analyzeNamingConventions,
  analyzeInterfaceVsType,
  analyzeGenericPatterns,
  analyzeUtilityTypes,
  analyzeTypeAssertions,
  analyzeAnyUsage,
} from './types/index.js';

// Structural Detectors
import {
  createFileNamingDetector,
  createDirectoryStructureDetector,
  createCoLocationDetector,
  createBarrelExportsDetector,
  createImportOrderingDetector,
  createModuleBoundariesDetector,
  createCircularDependenciesDetector,
  createPackageBoundariesDetector,
} from './structural/index.js';

// Component Detectors
import {
  createComponentStructureDetector,
  createPropsPatternDetector,
  createDuplicateDetector,
  createNearDuplicateDetector,
  createStatePatternDetector,
  createCompositionDetector,
  createRefForwardingDetector,
} from './components/index.js';

// Styling Detectors
import {
  createDesignTokensDetector,
  createSpacingScaleDetector,
  createColorUsageDetector,
  createTypographyDetector,
  createClassNamingDetector,
  createTailwindPatternsDetector,
  createZIndexScaleDetector,
  createResponsiveDetector,
} from './styling/index.js';

// Accessibility Detectors
import {
  createAccessibilityDetectors,
  createSemanticHtmlDetector,
  createAriaRolesDetector,
  createKeyboardNavDetector,
  createFocusManagementDetector,
  createHeadingHierarchyDetector,
  createAltTextDetector,
  analyzeSemanticHtml,
  analyzeAriaRoles,
  analyzeKeyboardNav,
  analyzeFocusManagement,
  analyzeHeadingHierarchy,
  analyzeAltText,
} from './accessibility/index.js';

// Documentation Detectors
import {
  createDocumentationDetectors,
  createJsdocPatternsDetector,
  createReadmeStructureDetector,
  createTodoPatternsDetector,
  createDeprecationDetector,
  createExampleCodeDetector,
  analyzeJsdocPatterns,
  analyzeReadmeStructure,
  analyzeTodoPatterns,
  analyzeDeprecation,
  analyzeExampleCode,
} from './documentation/index.js';

// Performance Detectors
import {
  createPerformanceDetectors,
  createCodeSplittingDetector,
  createLazyLoadingDetector,
  createMemoizationDetector,
  createCachingPatternsDetector,
  createDebounceThrottleDetector,
  createBundleSizeDetector,
  analyzeCodeSplitting,
  analyzeLazyLoading,
  analyzeMemoization,
  analyzeCachingPatterns,
  analyzeDebounceThrottle,
  analyzeBundleSize,
} from './performance/index.js';

import type { BaseDetector } from './base/index.js';

// ============================================================================
// Re-export Factory Functions
// ============================================================================

// API
export {
  createRouteStructureDetector,
  createHttpMethodsDetector,
  createResponseEnvelopeDetector,
  createErrorFormatDetector,
  createPaginationDetector,
  createClientPatternsDetector,
  createRetryPatternsDetector,
  analyzeRouteStructure,
  analyzeHttpMethods,
  analyzeResponseEnvelope,
  analyzeErrorFormat,
  analyzePagination,
  analyzeClientPatterns,
  analyzeRetryPatterns,
};

// Auth
export {
  createAuthMiddlewareDetector,
  createTokenHandlingDetector,
  createPermissionChecksDetector,
  createRbacPatternsDetector,
  createResourceOwnershipDetector,
  createAuditLoggingDetector,
  createAllAuthDetectors,
  analyzeAuthMiddleware,
  analyzeTokenHandling,
  analyzePermissions,
  analyzeRbac,
  analyzeOwnership,
  analyzeAuditLogging,
};

// Security
export {
  createInputSanitizationDetector,
  createSQLInjectionDetector,
  createXSSPreventionDetector,
  createCSRFProtectionDetector,
  createCSPHeadersDetector,
  createSecretManagementDetector,
  createRateLimitingDetector,
  createSecurityDetectors,
  analyzeInputSanitization,
  analyzeSQLInjection,
  analyzeXSSPrevention,
  analyzeCSRFProtection,
  analyzeCSPHeaders,
  analyzeSecretManagement,
  analyzeRateLimiting,
};

// Errors
export {
  createExceptionHierarchyDetector,
  createErrorCodesDetector,
  createTryCatchPlacementDetector,
  createErrorPropagationDetector,
  createAsyncErrorsDetector,
  createCircuitBreakerDetector,
  createErrorLoggingDetector,
  createAllErrorDetectors,
  analyzeExceptionHierarchy,
  analyzeErrorCodes,
  analyzeTryCatchPlacement,
  analyzeErrorPropagation,
  analyzeAsyncErrors,
  analyzeCircuitBreaker,
  analyzeErrorLogging,
};

// Logging
export {
  createStructuredFormatDetector,
  createLogLevelsDetector,
  createContextFieldsDetector,
  createCorrelationIdsDetector,
  createPIIRedactionDetector,
  createMetricNamingDetector,
  createHealthChecksDetector,
  createAllLoggingDetectors,
  analyzeStructuredFormat,
  analyzeLogLevels,
  analyzeContextFields,
  analyzeCorrelationIds,
  analyzePIIRedaction,
  analyzeMetricNaming,
  analyzeHealthChecks,
};

// Testing
export {
  createTestFileNamingDetector,
  createTestCoLocationDetector,
  createTestStructureDetector,
  createMockPatternsDetector,
  createFixturePatternsDetector,
  createDescribeNamingDetector,
  createSetupTeardownDetector,
  createAllTestingDetectors,
  analyzeTestFileNaming,
  analyzeTestStructure,
  analyzeMockPatterns,
  analyzeFixturePatterns,
  analyzeDescribeNaming,
  analyzeSetupTeardown,
};

// Data Access
export {
  createQueryPatternsDetector,
  createRepositoryPatternDetector,
  createTransactionPatternsDetector,
  createValidationPatternsDetector,
  createDTOPatternsDetector,
  createNPlusOneDetector,
  createConnectionPoolingDetector,
  createAllDataAccessDetectors,
  analyzeQueryPatterns,
  analyzeRepositoryPattern,
  analyzeTransactionPatterns,
  analyzeValidationPatterns,
  analyzeDTOPatterns,
  analyzeNPlusOne,
  analyzeConnectionPooling,
};

// Config
export {
  createEnvNamingDetector,
  createRequiredOptionalDetector,
  createDefaultValuesDetector,
  createFeatureFlagsDetector,
  createConfigValidationDetector,
  createEnvironmentDetectionDetector,
  createConfigDetectors,
  analyzeEnvNaming,
  analyzeRequiredOptional,
  analyzeDefaultValues,
  analyzeFeatureFlags,
  analyzeConfigValidation,
  analyzeEnvironmentDetection,
};

// Types
export {
  createFileLocationDetector,
  createNamingConventionsDetector,
  createInterfaceVsTypeDetector,
  createGenericPatternsDetector,
  createUtilityTypesDetector,
  createTypeAssertionsDetector,
  createAnyUsageDetector,
  createTypesDetectors,
  analyzeFileLocation,
  analyzeNamingConventions,
  analyzeInterfaceVsType,
  analyzeGenericPatterns,
  analyzeUtilityTypes,
  analyzeTypeAssertions,
  analyzeAnyUsage,
};

// Structural
export {
  createFileNamingDetector,
  createDirectoryStructureDetector,
  createCoLocationDetector,
  createBarrelExportsDetector,
  createImportOrderingDetector,
  createModuleBoundariesDetector,
  createCircularDependenciesDetector,
  createPackageBoundariesDetector,
};

// Components
export {
  createComponentStructureDetector,
  createPropsPatternDetector,
  createDuplicateDetector,
  createNearDuplicateDetector,
  createStatePatternDetector,
  createCompositionDetector,
  createRefForwardingDetector,
};

// Styling
export {
  createDesignTokensDetector,
  createSpacingScaleDetector,
  createColorUsageDetector,
  createTypographyDetector,
  createClassNamingDetector,
  createTailwindPatternsDetector,
  createZIndexScaleDetector,
  createResponsiveDetector,
};

// Accessibility
export {
  createAccessibilityDetectors,
  createSemanticHtmlDetector,
  createAriaRolesDetector,
  createKeyboardNavDetector,
  createFocusManagementDetector,
  createHeadingHierarchyDetector,
  createAltTextDetector,
  analyzeSemanticHtml,
  analyzeAriaRoles,
  analyzeKeyboardNav,
  analyzeFocusManagement,
  analyzeHeadingHierarchy,
  analyzeAltText,
};

// Documentation
export {
  createDocumentationDetectors,
  createJsdocPatternsDetector,
  createReadmeStructureDetector,
  createTodoPatternsDetector,
  createDeprecationDetector,
  createExampleCodeDetector,
  analyzeJsdocPatterns,
  analyzeReadmeStructure,
  analyzeTodoPatterns,
  analyzeDeprecation,
  analyzeExampleCode,
};

// Performance
export {
  createPerformanceDetectors,
  createCodeSplittingDetector,
  createLazyLoadingDetector,
  createMemoizationDetector,
  createCachingPatternsDetector,
  createDebounceThrottleDetector,
  createBundleSizeDetector,
  analyzeCodeSplitting,
  analyzeLazyLoading,
  analyzeMemoization,
  analyzeCachingPatterns,
  analyzeDebounceThrottle,
  analyzeBundleSize,
};

// ============================================================================
// Master Factory Functions
// ============================================================================

/**
 * Create all API detectors
 */
export function createAllApiDetectors() {
  return {
    routeStructure: createRouteStructureDetector(),
    httpMethods: createHttpMethodsDetector(),
    responseEnvelope: createResponseEnvelopeDetector(),
    errorFormat: createErrorFormatDetector(),
    pagination: createPaginationDetector(),
    clientPatterns: createClientPatternsDetector(),
    retryPatterns: createRetryPatternsDetector(),
  };
}

/**
 * Create all structural detectors
 */
export function createAllStructuralDetectors() {
  return {
    fileNaming: createFileNamingDetector(),
    directoryStructure: createDirectoryStructureDetector(),
    coLocation: createCoLocationDetector(),
    barrelExports: createBarrelExportsDetector(),
    importOrdering: createImportOrderingDetector(),
    moduleBoundaries: createModuleBoundariesDetector(),
    circularDeps: createCircularDependenciesDetector(),
    packageBoundaries: createPackageBoundariesDetector(),
  };
}

/**
 * Create all component detectors
 */
export function createAllComponentDetectors() {
  return {
    componentStructure: createComponentStructureDetector(),
    propsPattern: createPropsPatternDetector(),
    duplicate: createDuplicateDetector(),
    nearDuplicate: createNearDuplicateDetector(),
    statePattern: createStatePatternDetector(),
    composition: createCompositionDetector(),
    refForwarding: createRefForwardingDetector(),
  };
}

/**
 * Create all styling detectors
 */
export function createAllStylingDetectors() {
  return {
    designTokens: createDesignTokensDetector(),
    spacingScale: createSpacingScaleDetector(),
    colorUsage: createColorUsageDetector(),
    typography: createTypographyDetector(),
    classNaming: createClassNamingDetector(),
    tailwindPatterns: createTailwindPatternsDetector(),
    zIndexScale: createZIndexScaleDetector(),
    responsive: createResponsiveDetector(),
  };
}

/**
 * Create all detectors as a flat array for easy iteration
 */
export function createAllDetectorsArray(): BaseDetector[] {
  const detectors: BaseDetector[] = [];

  // API detectors (7)
  const apiDetectors = createAllApiDetectors();
  detectors.push(
    apiDetectors.routeStructure,
    apiDetectors.httpMethods,
    apiDetectors.responseEnvelope,
    apiDetectors.errorFormat,
    apiDetectors.pagination,
    apiDetectors.clientPatterns,
    apiDetectors.retryPatterns
  );

  // Auth detectors (6)
  const authDetectors = createAllAuthDetectors();
  detectors.push(
    authDetectors.middlewareUsage,
    authDetectors.tokenHandling,
    authDetectors.permissionChecks,
    authDetectors.rbacPatterns,
    authDetectors.resourceOwnership,
    authDetectors.auditLogging
  );

  // Security detectors (7)
  detectors.push(...createSecurityDetectors());

  // Error detectors (7)
  const errorDetectors = createAllErrorDetectors();
  detectors.push(
    errorDetectors.exceptionHierarchy,
    errorDetectors.errorCodes,
    errorDetectors.tryCatchPlacement,
    errorDetectors.errorPropagation,
    errorDetectors.asyncErrors,
    errorDetectors.circuitBreaker,
    errorDetectors.errorLogging
  );

  // Structural detectors (8)
  const structuralDetectors = createAllStructuralDetectors();
  detectors.push(
    structuralDetectors.fileNaming,
    structuralDetectors.directoryStructure,
    structuralDetectors.coLocation,
    structuralDetectors.barrelExports,
    structuralDetectors.importOrdering,
    structuralDetectors.moduleBoundaries,
    structuralDetectors.circularDeps,
    structuralDetectors.packageBoundaries
  );

  // Component detectors (7)
  const componentDetectors = createAllComponentDetectors();
  detectors.push(
    componentDetectors.componentStructure,
    componentDetectors.propsPattern,
    componentDetectors.duplicate,
    componentDetectors.nearDuplicate,
    componentDetectors.statePattern,
    componentDetectors.composition,
    componentDetectors.refForwarding
  );

  // Styling detectors (8)
  const stylingDetectors = createAllStylingDetectors();
  detectors.push(
    stylingDetectors.designTokens,
    stylingDetectors.spacingScale,
    stylingDetectors.colorUsage,
    stylingDetectors.typography,
    stylingDetectors.classNaming,
    stylingDetectors.tailwindPatterns,
    stylingDetectors.zIndexScale,
    stylingDetectors.responsive
  );

  // Logging detectors (7)
  const loggingDetectors = createAllLoggingDetectors();
  detectors.push(
    loggingDetectors.structuredFormat,
    loggingDetectors.logLevels,
    loggingDetectors.contextFields,
    loggingDetectors.correlationIds,
    loggingDetectors.piiRedaction,
    loggingDetectors.metricNaming,
    loggingDetectors.healthChecks
  );

  // Testing detectors (7)
  const testingDetectors = createAllTestingDetectors();
  detectors.push(
    testingDetectors.fileNaming,
    testingDetectors.coLocation,
    testingDetectors.testStructure,
    testingDetectors.mockPatterns,
    testingDetectors.fixturePatterns,
    testingDetectors.describeNaming,
    testingDetectors.setupTeardown
  );

  // Data access detectors (7)
  const dataAccessDetectors = createAllDataAccessDetectors();
  detectors.push(
    dataAccessDetectors.queryPatterns,
    dataAccessDetectors.repositoryPattern,
    dataAccessDetectors.transactionPatterns,
    dataAccessDetectors.validationPatterns,
    dataAccessDetectors.dtoPatterns,
    dataAccessDetectors.nPlusOne,
    dataAccessDetectors.connectionPooling
  );

  // Config detectors (6)
  detectors.push(...createConfigDetectors());

  // Types detectors (7)
  detectors.push(...createTypesDetectors());

  // Accessibility detectors (6)
  detectors.push(...createAccessibilityDetectors());

  // Documentation detectors (5)
  detectors.push(...createDocumentationDetectors());

  // Performance detectors (6)
  detectors.push(...createPerformanceDetectors());

  return detectors;
}

/**
 * Create all detectors grouped by category
 */
export function createAllDetectors() {
  return {
    api: createAllApiDetectors(),
    auth: createAllAuthDetectors(),
    security: createSecurityDetectors(),
    errors: createAllErrorDetectors(),
    structural: createAllStructuralDetectors(),
    components: createAllComponentDetectors(),
    styling: createAllStylingDetectors(),
    logging: createAllLoggingDetectors(),
    testing: createAllTestingDetectors(),
    dataAccess: createAllDataAccessDetectors(),
    config: createConfigDetectors(),
    types: createTypesDetectors(),
    accessibility: createAccessibilityDetectors(),
    documentation: createDocumentationDetectors(),
    performance: createPerformanceDetectors(),
  };
}

/**
 * Get detector count by category
 */
export function getDetectorCounts() {
  return {
    api: 7,
    auth: 6,
    security: 7,
    errors: 7,
    structural: 8,
    components: 7,
    styling: 8,
    logging: 7,
    testing: 7,
    dataAccess: 7,
    config: 6,
    types: 7,
    accessibility: 6,
    documentation: 5,
    performance: 6,
    total: 101, // All detectors wired
  };
}
