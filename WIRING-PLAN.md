# Drift Detector Wiring Plan

## Current State
- 101 detectors exist in `@drift/detectors`
- CLI scanner uses 24 hardcoded regex patterns (LOW VALUE)
- Real detectors are NOT wired to CLI

## Required Changes

### Step 1: Export All Detectors from @drift/detectors

Update `packages/detectors/src/index.ts`:

```typescript
// Add exports for all category factories
export * from './api/index.js';
export * from './auth/index.js';
export * from './security/index.js';
export * from './errors/index.js';
export * from './structural/index.js';
export * from './components/index.js';
export * from './data-access/index.js';
export * from './logging/index.js';
export * from './testing/index.js';
export * from './styling/index.js';
export * from './config/index.js';
export * from './types/index.js';
export * from './accessibility/index.js';
export * from './documentation/index.js';
export * from './performance/index.js';

// Master factory function
export function createAllDetectors() {
  return {
    api: createAllApiDetectors(),
    auth: createAllAuthDetectors(),
    security: createSecurityDetectors(),
    errors: createAllErrorDetectors(),
    // ... etc
  };
}
```

### Step 2: Rewrite Scanner Service

The new `scanner-service.ts` should:

1. Import detector factories from `@drift/detectors`
2. Create detector instances
3. For each file:
   - Determine applicable detectors (by language/file type)
   - Run each detector's `detect()` method
   - Collect patterns and violations
4. Aggregate results across all files
5. Return structured results

### Step 3: Update Scan Command

The `scan.ts` command should:

1. Use the new scanner service
2. Convert detector results to `Pattern` objects
3. Store patterns in `PatternStore`
4. Report violations as outliers

## Detector Interface

Each detector implements:

```typescript
interface BaseDetector {
  id: string;                    // e.g., "api/route-structure"
  category: string;              // e.g., "api"
  subcategory: string;           // e.g., "route-structure"
  name: string;                  // Human-readable name
  description: string;           // What it detects
  supportedLanguages: Language[];// Which languages it works on
  
  detect(context: DetectionContext): Promise<DetectionResult>;
}

interface DetectionContext {
  file: string;
  content: string;
  language: Language;
  ast?: AST;
  projectContext?: ProjectContext;
}

interface DetectionResult {
  patterns: PatternMatch[];      // What patterns were found
  violations: Violation[];       // What violations were found
  confidence: number;            // Overall confidence
  metadata?: DetectionMetadata;
}
```

## Pattern Aggregation Strategy

For each unique pattern type detected:

1. **Group by pattern ID** across all files
2. **Calculate confidence** based on:
   - Frequency: How often the pattern appears
   - Consistency: How consistent the usage is
   - Spread: How many files contain it
3. **Identify outliers**: Files that deviate from the pattern
4. **Create Pattern object** with all locations and outliers

## Example Flow

```
User runs: drift scan

1. Scanner loads detectors
2. For each file:
   - api/route-structure detector finds:
     - Pattern: "kebab-case URLs" (10 matches)
     - Violation: "camelCase URL" (1 match)
   - security/sql-injection detector finds:
     - Pattern: "parameterized queries" (5 matches)
     - Violation: "string concatenation" (1 match)

3. Aggregation:
   - Pattern "api/route-structure/kebab-case":
     - 10 locations
     - 1 outlier (the camelCase one)
     - Confidence: 91%
   - Pattern "security/sql-injection/parameterized":
     - 5 locations
     - 1 outlier (the string concat)
     - Confidence: 83%

4. Store patterns in PatternStore
5. Report to user
```

## Priority Order

1. **Phase 1**: Wire up critical security detectors
   - SQL injection
   - XSS prevention
   - Secret management
   - Auth middleware (unprotected routes)

2. **Phase 2**: Wire up high-value API detectors
   - Route structure
   - Error format
   - Response envelope

3. **Phase 3**: Wire up structural detectors
   - Circular dependencies
   - Module boundaries
   - File naming

4. **Phase 4**: Wire up remaining detectors

## Estimated Effort

- Step 1 (Export detectors): 30 minutes
- Step 2 (Rewrite scanner): 2-3 hours
- Step 3 (Update scan command): 1-2 hours
- Testing: 2-3 hours

**Total: ~8 hours for full enterprise-grade wiring**
