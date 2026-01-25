# Enterprise Quality Gates System

## Implementation Specification v1.0

**Status:** Ready for Implementation  
**Author:** Drift Team  
**Last Updated:** 2026-01-25  
**License:** Apache-2.0 (core), BSL-1.1 (enterprise features when gated)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Directory Structure](#3-directory-structure)
4. [Core Types](#4-core-types)
5. [Gate Implementations](#5-gate-implementations)
6. [Policy Engine](#6-policy-engine)
7. [Orchestrator](#7-orchestrator)
8. [Reporters](#8-reporters)
9. [CLI Integration](#9-cli-integration)
10. [MCP Integration](#10-mcp-integration)
11. [Dashboard Integration](#11-dashboard-integration)
12. [Storage & Persistence](#12-storage--persistence)
13. [Testing Strategy](#13-testing-strategy)
14. [Implementation Order](#14-implementation-order)
15. [File-by-File Specification](#15-file-by-file-specification)

---

## 1. Executive Summary

### 1.1 Purpose

The Enterprise Quality Gates system provides automated code quality enforcement
that goes beyond traditional linting. While tools like SonarQube check syntax
and security vulnerabilities, Drift Quality Gates check **architectural
consistency** — ensuring new code matches established patterns in YOUR codebase.

### 1.2 Unique Value Proposition

**"SonarQube tells you if your code is bad. Drift tells you if your code fits
YOUR codebase."**


### 1.3 The Six Quality Gates

| Gate | What It Checks | Unique Value |
|------|----------------|--------------|
| Pattern Compliance | Do changed files follow established patterns? | No other tool checks "does this match how WE do things" |
| Constraint Verification | Does code satisfy learned architectural invariants? | Constraints are discovered, not manually configured |
| Regression Detection | Did this change make pattern health worse? | Tracks architectural health over time |
| Impact Simulation | What's the blast radius of this change? | Pre-merge impact prediction using call graph |
| Security Boundary | Does this respect data access boundaries? | Validates auth paths to sensitive data |
| Custom Rules | User-defined rules specific to their codebase | Extensibility for unique requirements |

### 1.4 Licensing Strategy

**IMPORTANT:** All features are available to all users initially. The licensing
infrastructure is in place but NOT enforced. When ready to monetize:

- **Community (Free):** Pattern Compliance gate, basic thresholds, all output formats
- **Team ($):** Policy Engine, Regression Detection, Custom Rules
- **Enterprise ($$):** Impact Simulation, Security Boundary, multi-repo governance

The code includes `// FUTURE_GATE: feature-name` comments where license checks
should be added when ready.

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DRIFT QUALITY GATES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      GATE ORCHESTRATOR                               │    │
│  │  - Loads policy configuration                                        │    │
│  │  - Determines which gates to run                                     │    │
│  │  - Coordinates parallel gate execution                               │    │
│  │  - Aggregates results                                                │    │
│  │  - Makes final pass/fail decision                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐         │
│  │   GATE 1    │          │   GATE 2    │          │   GATE 3    │         │
│  │  Pattern    │          │ Constraint  │          │ Regression  │         │
│  │ Compliance  │          │Verification │          │ Detection   │         │
│  │             │          │             │          │             │         │
│  │ Uses:       │          │ Uses:       │          │ Uses:       │         │
│  │ - Patterns  │          │ - Constraints│         │ - History   │         │
│  │ - Outliers  │          │ - Verifier  │          │ - Snapshots │         │
│  └─────────────┘          └─────────────┘          └─────────────┘         │
│         │                          │                          │             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐         │
│  │   GATE 4    │          │   GATE 5    │          │   GATE 6    │         │
│  │   Impact    │          │  Security   │          │   Custom    │         │
│  │ Simulation  │          │  Boundary   │          │   Rules     │         │
│  │             │          │             │          │             │         │
│  │ Uses:       │          │ Uses:       │          │ Uses:       │         │
│  │ - CallGraph │          │ - Reachability│        │ - RuleEngine│         │
│  │ - Simulation│          │ - Boundaries│          │ - UserRules │         │
│  └─────────────┘          └─────────────┘          └─────────────┘         │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      RESULT AGGREGATOR                               │    │
│  │  - Combines gate results                                             │    │
│  │  - Applies policy rules                                              │    │
│  │  - Calculates overall score                                          │    │
│  │  - Determines pass/fail/warn                                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐         │
│  │    Text     │          │    JSON     │          │   GitHub    │         │
│  │  Reporter   │          │  Reporter   │          │  Reporter   │         │
│  └─────────────┘          └─────────────┘          └─────────────┘         │
│         │                          │                          │             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐         │
│  │   GitLab    │          │    SARIF    │          │   Webhook   │         │
│  │  Reporter   │          │  Reporter   │          │  Reporter   │         │
│  └─────────────┘          └─────────────┘          └─────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```


### 2.2 Design Principles

1. **Single Responsibility:** Each gate does ONE thing well
2. **Open/Closed:** New gates can be added without modifying orchestrator
3. **Dependency Injection:** Gates receive dependencies, don't create them
4. **Interface Segregation:** Gates implement minimal interface
5. **Composition over Inheritance:** Gates are composed, not inherited
6. **Fail-Safe Defaults:** If a gate errors, it warns but doesn't block
7. **Parallel Execution:** Independent gates run concurrently
8. **Deterministic Results:** Same input always produces same output

### 2.3 Data Flow

```
Input Files → File Resolver → Gate Orchestrator
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              Gate 1-2         Gate 3-4         Gate 5-6
                    │               │               │
                    └───────────────┼───────────────┘
                                    ▼
                            Result Aggregator
                                    │
                                    ▼
                            Policy Evaluator
                                    │
                                    ▼
                              Reporter(s)
                                    │
                                    ▼
                            Output (stdout/file)
```

---

## 3. Directory Structure

### 3.1 Core Package Structure

```
drift/packages/core/src/quality-gates/
├── index.ts                           # Public API exports
├── types.ts                           # All type definitions
│
├── orchestrator/
│   ├── index.ts                       # Orchestrator exports
│   ├── gate-orchestrator.ts           # Main orchestrator implementation
│   ├── gate-registry.ts               # Gate registration and discovery
│   ├── parallel-executor.ts           # Parallel gate execution
│   └── result-aggregator.ts           # Combines gate results
│
├── gates/
│   ├── index.ts                       # Gate exports
│   ├── base-gate.ts                   # Abstract base gate class
│   ├── gate-interface.ts              # Gate interface definition
│   │
│   ├── pattern-compliance/
│   │   ├── index.ts
│   │   ├── pattern-compliance-gate.ts # Gate implementation
│   │   ├── compliance-calculator.ts   # Calculates compliance rate
│   │   └── outlier-detector.ts        # Detects new outliers
│   │
│   ├── constraint-verification/
│   │   ├── index.ts
│   │   ├── constraint-verification-gate.ts
│   │   ├── constraint-evaluator.ts    # Evaluates constraints
│   │   └── violation-formatter.ts     # Formats violations
│   │
│   ├── regression-detection/
│   │   ├── index.ts
│   │   ├── regression-detection-gate.ts
│   │   ├── snapshot-comparator.ts     # Compares snapshots
│   │   ├── delta-calculator.ts        # Calculates health deltas
│   │   └── regression-classifier.ts   # Classifies regressions
│   │
│   ├── impact-simulation/
│   │   ├── index.ts
│   │   ├── impact-simulation-gate.ts
│   │   ├── blast-radius-analyzer.ts   # Analyzes impact scope
│   │   └── risk-assessor.ts           # Assesses change risk
│   │
│   ├── security-boundary/
│   │   ├── index.ts
│   │   ├── security-boundary-gate.ts
│   │   ├── access-path-validator.ts   # Validates data access paths
│   │   └── auth-chain-checker.ts      # Checks auth in call chain
│   │
│   └── custom-rules/
│       ├── index.ts
│       ├── custom-rules-gate.ts
│       ├── rule-parser.ts             # Parses rule definitions
│       ├── rule-evaluator.ts          # Evaluates rules
│       └── built-in-rules.ts          # Built-in rule library
│
├── policy/
│   ├── index.ts                       # Policy exports
│   ├── policy-types.ts                # Policy type definitions
│   ├── policy-loader.ts               # Loads policy from config
│   ├── policy-evaluator.ts            # Evaluates policy rules
│   ├── policy-validator.ts            # Validates policy config
│   └── default-policies.ts            # Built-in default policies
│
├── reporters/
│   ├── index.ts                       # Reporter exports
│   ├── reporter-interface.ts          # Reporter interface
│   ├── text-reporter.ts               # Human-readable output
│   ├── json-reporter.ts               # JSON output
│   ├── github-reporter.ts             # GitHub Actions annotations
│   ├── gitlab-reporter.ts             # GitLab Code Quality
│   ├── sarif-reporter.ts              # SARIF format
│   └── webhook-reporter.ts            # Webhook callbacks
│
├── store/
│   ├── index.ts                       # Store exports
│   ├── gate-run-store.ts              # Stores gate run history
│   ├── snapshot-store.ts              # Stores health snapshots
│   └── policy-store.ts                # Stores policy configs
│
├── utils/
│   ├── index.ts                       # Utility exports
│   ├── file-resolver.ts               # Resolves files to check
│   ├── git-utils.ts                   # Git operations (staged, diff)
│   ├── score-calculator.ts            # Calculates scores
│   └── threshold-checker.ts           # Checks thresholds
│
└── __tests__/
    ├── orchestrator.test.ts
    ├── gates/
    │   ├── pattern-compliance.test.ts
    │   ├── constraint-verification.test.ts
    │   ├── regression-detection.test.ts
    │   ├── impact-simulation.test.ts
    │   ├── security-boundary.test.ts
    │   └── custom-rules.test.ts
    ├── policy/
    │   ├── policy-loader.test.ts
    │   └── policy-evaluator.test.ts
    └── reporters/
        ├── text-reporter.test.ts
        ├── json-reporter.test.ts
        └── sarif-reporter.test.ts
```


### 3.2 CLI Package Structure

```
drift/packages/cli/src/
├── commands/
│   └── gate.ts                        # drift gate command
│
└── reporters/
    └── gate/
        ├── index.ts                   # Reporter exports for CLI
        ├── text-formatter.ts          # CLI text formatting
        └── progress-reporter.ts       # Progress indicators
```

### 3.3 MCP Package Structure

```
drift/packages/mcp/src/tools/
└── analysis/
    └── quality-gate.ts                # drift_quality_gate MCP tool
```

### 3.4 Dashboard Package Structure

```
drift/packages/dashboard/src/
├── client/components/
│   └── QualityGatesTab.tsx            # Quality Gates dashboard tab
│
└── server/
    └── quality-gates-api.ts           # API endpoints for dashboard
```

### 3.5 Storage Structure

```
.drift/
├── quality-gates/
│   ├── policies/
│   │   ├── default.json               # Default policy
│   │   ├── strict.json                # Strict policy
│   │   └── custom/                    # User-defined policies
│   │       └── *.json
│   │
│   ├── rules/
│   │   └── custom/                    # User-defined rules
│   │       └── *.json
│   │
│   ├── history/
│   │   └── runs/                      # Gate run history
│   │       └── {timestamp}.json
│   │
│   └── snapshots/
│       └── {branch}/                  # Health snapshots by branch
│           └── {timestamp}.json
│
└── config.json                        # May include quality gate config
```

---

## 4. Core Types

### 4.1 File: `types.ts`

This file contains ALL type definitions for the quality gates system.
No types should be defined elsewhere.

```typescript
/**
 * Quality Gates System - Type Definitions
 * 
 * @license Apache-2.0
 * 
 * This file contains all type definitions for the quality gates system.
 * Types are organized into logical sections for maintainability.
 */

// =============================================================================
// SECTION 1: Core Enums and Constants
// =============================================================================

/**
 * Gate execution status
 */
export type GateStatus = 'passed' | 'failed' | 'warned' | 'skipped' | 'errored';

/**
 * Severity levels for violations
 */
export type ViolationSeverity = 'error' | 'warning' | 'info' | 'hint';

/**
 * Gate identifiers - each gate has a unique ID
 */
export type GateId = 
  | 'pattern-compliance'
  | 'constraint-verification'
  | 'regression-detection'
  | 'impact-simulation'
  | 'security-boundary'
  | 'custom-rules';

/**
 * Output format options
 */
export type OutputFormat = 
  | 'text' 
  | 'json' 
  | 'github' 
  | 'gitlab' 
  | 'sarif'
  | 'webhook';

/**
 * Policy aggregation modes
 */
export type AggregationMode = 'any' | 'all' | 'weighted' | 'threshold';

// =============================================================================
// SECTION 2: Gate Input/Output Types
// =============================================================================

/**
 * Input provided to all gates
 */
export interface GateInput {
  /** Files to check (relative paths) */
  files: string[];
  
  /** Project root directory */
  projectRoot: string;
  
  /** Current branch name */
  branch: string;
  
  /** Base branch for comparison (for PRs) */
  baseBranch?: string;
  
  /** Commit SHA being checked */
  commitSha?: string;
  
  /** Whether running in CI environment */
  isCI: boolean;
  
  /** Gate-specific configuration */
  config: GateConfig;
  
  /** Shared context from orchestrator */
  context: GateContext;
}

/**
 * Shared context available to all gates
 * Populated by orchestrator to avoid redundant loading
 */
export interface GateContext {
  /** Loaded patterns (if available) */
  patterns?: import('../patterns/types').Pattern[];
  
  /** Loaded constraints (if available) */
  constraints?: import('../constraints/types').Constraint[];
  
  /** Call graph (if available) */
  callGraph?: import('../call-graph/types').CallGraph;
  
  /** Previous snapshot for comparison (if available) */
  previousSnapshot?: HealthSnapshot;
  
  /** Custom rules (if available) */
  customRules?: CustomRule[];
}


/**
 * Base result returned by all gates
 */
export interface GateResult {
  /** Gate identifier */
  gateId: GateId;
  
  /** Gate display name */
  gateName: string;
  
  /** Execution status */
  status: GateStatus;
  
  /** Whether the gate passed */
  passed: boolean;
  
  /** Score out of 100 */
  score: number;
  
  /** Human-readable summary */
  summary: string;
  
  /** Detailed violations */
  violations: GateViolation[];
  
  /** Warnings (non-blocking) */
  warnings: string[];
  
  /** Execution time in milliseconds */
  executionTimeMs: number;
  
  /** Gate-specific details */
  details: Record<string, unknown>;
  
  /** Error message if status is 'errored' */
  error?: string;
}

/**
 * A single violation from a gate
 */
export interface GateViolation {
  /** Unique violation ID */
  id: string;
  
  /** Gate that produced this violation */
  gateId: GateId;
  
  /** Severity level */
  severity: ViolationSeverity;
  
  /** File path (relative) */
  file: string;
  
  /** Line number (1-indexed) */
  line: number;
  
  /** Column number (1-indexed) */
  column: number;
  
  /** End line (optional) */
  endLine?: number;
  
  /** End column (optional) */
  endColumn?: number;
  
  /** Short message */
  message: string;
  
  /** Detailed explanation */
  explanation: string;
  
  /** Rule or pattern ID that was violated */
  ruleId: string;
  
  /** Suggested fix (if available) */
  suggestedFix?: string;
  
  /** Documentation URL */
  documentationUrl?: string;
}

// =============================================================================
// SECTION 3: Gate-Specific Configuration Types
// =============================================================================

/**
 * Base configuration for all gates
 */
export interface BaseGateConfig {
  /** Whether this gate is enabled */
  enabled: boolean;
  
  /** Whether failures block the pipeline */
  blocking: boolean;
  
  /** Custom thresholds override defaults */
  thresholds?: Record<string, number>;
}

/**
 * Pattern Compliance Gate configuration
 */
export interface PatternComplianceConfig extends BaseGateConfig {
  /** Minimum compliance rate (0-100) */
  minComplianceRate: number;
  
  /** Maximum new outliers allowed */
  maxNewOutliers: number;
  
  /** Pattern categories to check (empty = all) */
  categories: string[];
  
  /** Minimum pattern confidence to consider */
  minPatternConfidence: number;
  
  /** Whether to check only approved patterns */
  approvedOnly: boolean;
}

/**
 * Constraint Verification Gate configuration
 */
export interface ConstraintVerificationConfig extends BaseGateConfig {
  /** Enforce approved constraints */
  enforceApproved: boolean;
  
  /** Enforce discovered constraints (usually false) */
  enforceDiscovered: boolean;
  
  /** Minimum constraint confidence to enforce */
  minConfidence: number;
  
  /** Constraint categories to check (empty = all) */
  categories: string[];
}

/**
 * Regression Detection Gate configuration
 */
export interface RegressionDetectionConfig extends BaseGateConfig {
  /** Maximum allowed confidence drop (percentage points) */
  maxConfidenceDrop: number;
  
  /** Maximum allowed compliance drop (percentage points) */
  maxComplianceDrop: number;
  
  /** Maximum new outliers per pattern */
  maxNewOutliersPerPattern: number;
  
  /** Categories where ANY regression fails */
  criticalCategories: string[];
  
  /** Comparison baseline ('previous-commit' | 'branch-base' | 'snapshot') */
  baseline: 'previous-commit' | 'branch-base' | 'snapshot';
}

/**
 * Impact Simulation Gate configuration
 */
export interface ImpactSimulationConfig extends BaseGateConfig {
  /** Maximum downstream files affected */
  maxFilesAffected: number;
  
  /** Maximum downstream functions affected */
  maxFunctionsAffected: number;
  
  /** Maximum API entry points affected */
  maxEntryPointsAffected: number;
  
  /** Maximum friction score (0-100) */
  maxFrictionScore: number;
  
  /** Whether to analyze sensitive data paths */
  analyzeSensitiveData: boolean;
}

/**
 * Security Boundary Gate configuration
 */
export interface SecurityBoundaryConfig extends BaseGateConfig {
  /** Allow new sensitive data access points */
  allowNewSensitiveAccess: boolean;
  
  /** Tables that MUST have auth in call chain */
  protectedTables: string[];
  
  /** Maximum hops to sensitive data */
  maxDataFlowDepth: number;
  
  /** Required auth patterns in call chain */
  requiredAuthPatterns: string[];
}

/**
 * Custom Rules Gate configuration
 */
export interface CustomRulesConfig extends BaseGateConfig {
  /** Rule files to load */
  ruleFiles: string[];
  
  /** Inline rule definitions */
  inlineRules: CustomRule[];
  
  /** Whether to use built-in rules */
  useBuiltInRules: boolean;
}

/**
 * Union type for all gate configs
 */
export type GateConfig = 
  | PatternComplianceConfig
  | ConstraintVerificationConfig
  | RegressionDetectionConfig
  | ImpactSimulationConfig
  | SecurityBoundaryConfig
  | CustomRulesConfig;


// =============================================================================
// SECTION 4: Gate-Specific Result Types
// =============================================================================

/**
 * Pattern Compliance Gate result details
 */
export interface PatternComplianceDetails {
  /** Overall compliance rate (0-100) */
  complianceRate: number;
  
  /** Number of patterns checked */
  patternsChecked: number;
  
  /** Number of files checked */
  filesChecked: number;
  
  /** New outliers introduced */
  newOutliers: OutlierDetail[];
  
  /** Existing outliers in changed files */
  existingOutliers: number;
  
  /** Compliance by category */
  byCategory: Record<string, { compliant: number; total: number }>;
}

/**
 * Detail about a single outlier
 */
export interface OutlierDetail {
  /** Pattern ID */
  patternId: string;
  
  /** Pattern name */
  patternName: string;
  
  /** File path */
  file: string;
  
  /** Line number */
  line: number;
  
  /** Reason for outlier */
  reason: string;
  
  /** Whether this is a new outlier (not in baseline) */
  isNew: boolean;
}

/**
 * Constraint Verification Gate result details
 */
export interface ConstraintVerificationDetails {
  /** Constraints that passed */
  satisfied: ConstraintResult[];
  
  /** Constraints that failed */
  violated: ConstraintViolationDetail[];
  
  /** Constraints that were skipped */
  skipped: SkippedConstraint[];
  
  /** Results by category */
  byCategory: Record<string, { passed: number; failed: number }>;
}

/**
 * Result for a single constraint check
 */
export interface ConstraintResult {
  /** Constraint ID */
  constraintId: string;
  
  /** Constraint description */
  description: string;
  
  /** Whether it passed */
  passed: boolean;
  
  /** Confidence in the result */
  confidence: number;
}

/**
 * Detail about a constraint violation
 */
export interface ConstraintViolationDetail {
  /** Constraint ID */
  constraintId: string;
  
  /** Constraint description */
  description: string;
  
  /** Files that violate */
  violatingFiles: string[];
  
  /** Specific violation locations */
  locations: Array<{ file: string; line: number; reason: string }>;
}

/**
 * Constraint that was skipped
 */
export interface SkippedConstraint {
  /** Constraint ID */
  constraintId: string;
  
  /** Reason for skipping */
  reason: string;
}

/**
 * Regression Detection Gate result details
 */
export interface RegressionDetectionDetails {
  /** Patterns that regressed */
  regressions: PatternRegression[];
  
  /** Patterns that improved */
  improvements: PatternImprovement[];
  
  /** Overall health delta (-100 to +100) */
  overallHealthDelta: number;
  
  /** Health delta by category */
  categoryDeltas: Record<string, number>;
  
  /** Baseline used for comparison */
  baseline: {
    type: 'previous-commit' | 'branch-base' | 'snapshot';
    reference: string;
    timestamp: string;
  };
}

/**
 * A pattern that regressed
 */
export interface PatternRegression {
  /** Pattern ID */
  patternId: string;
  
  /** Pattern name */
  patternName: string;
  
  /** Previous confidence */
  previousConfidence: number;
  
  /** Current confidence */
  currentConfidence: number;
  
  /** Confidence delta */
  confidenceDelta: number;
  
  /** Previous compliance */
  previousCompliance: number;
  
  /** Current compliance */
  currentCompliance: number;
  
  /** Compliance delta */
  complianceDelta: number;
  
  /** New outliers introduced */
  newOutliers: number;
  
  /** Severity of regression */
  severity: 'minor' | 'moderate' | 'severe';
}

/**
 * A pattern that improved
 */
export interface PatternImprovement {
  /** Pattern ID */
  patternId: string;
  
  /** Pattern name */
  patternName: string;
  
  /** Confidence improvement */
  confidenceImprovement: number;
  
  /** Compliance improvement */
  complianceImprovement: number;
  
  /** Outliers fixed */
  outliersFixed: number;
}

/**
 * Impact Simulation Gate result details
 */
export interface ImpactSimulationDetails {
  /** Number of files affected */
  filesAffected: number;
  
  /** Number of functions affected */
  functionsAffected: number;
  
  /** Entry points affected */
  entryPointsAffected: string[];
  
  /** Friction score (0-100) */
  frictionScore: number;
  
  /** Breaking risk assessment */
  breakingRisk: 'low' | 'medium' | 'high' | 'critical';
  
  /** Sensitive data paths affected */
  sensitiveDataPaths: SensitiveDataPath[];
  
  /** Affected files list */
  affectedFiles: AffectedFile[];
}

/**
 * A sensitive data path
 */
export interface SensitiveDataPath {
  /** Starting point */
  from: string;
  
  /** Sensitive data accessed */
  sensitiveData: string;
  
  /** Path through code */
  path: string[];
}

/**
 * An affected file
 */
export interface AffectedFile {
  /** File path */
  file: string;
  
  /** How it's affected */
  affectedBy: 'direct' | 'transitive';
  
  /** Distance from changed file */
  distance: number;
}


/**
 * Security Boundary Gate result details
 */
export interface SecurityBoundaryDetails {
  /** New sensitive data access points */
  newSensitiveAccess: DataAccessPoint[];
  
  /** Unauthorized access paths */
  unauthorizedPaths: UnauthorizedPath[];
  
  /** Tables accessed by changed code */
  tablesAccessed: string[];
  
  /** Auth coverage percentage */
  authCoverage: number;
  
  /** Protected tables status */
  protectedTablesStatus: Record<string, 'protected' | 'unprotected' | 'partial'>;
}

/**
 * A data access point
 */
export interface DataAccessPoint {
  /** File where access occurs */
  file: string;
  
  /** Line number */
  line: number;
  
  /** Table/data being accessed */
  dataAccessed: string;
  
  /** Type of access */
  accessType: 'read' | 'write' | 'delete';
  
  /** Whether auth is in call chain */
  hasAuth: boolean;
}

/**
 * An unauthorized access path
 */
export interface UnauthorizedPath {
  /** Entry point */
  entryPoint: string;
  
  /** Sensitive data reached */
  sensitiveData: string;
  
  /** Path through code */
  path: string[];
  
  /** Missing auth check */
  missingAuth: string;
}

/**
 * Custom Rules Gate result details
 */
export interface CustomRulesDetails {
  /** Results for each rule */
  ruleResults: RuleResult[];
  
  /** Rules that failed */
  failedRules: string[];
  
  /** Rules that passed */
  passedRules: string[];
  
  /** Rules that were skipped */
  skippedRules: string[];
}

/**
 * Result for a single rule
 */
export interface RuleResult {
  /** Rule ID */
  ruleId: string;
  
  /** Rule name */
  ruleName: string;
  
  /** Whether it passed */
  passed: boolean;
  
  /** Violations if failed */
  violations: RuleViolation[];
  
  /** Files checked */
  filesChecked: number;
}

/**
 * A rule violation
 */
export interface RuleViolation {
  /** File path */
  file: string;
  
  /** Line number */
  line: number;
  
  /** Violation message */
  message: string;
}

// =============================================================================
// SECTION 5: Custom Rule Types
// =============================================================================

/**
 * A custom rule definition
 */
export interface CustomRule {
  /** Unique rule ID */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what the rule checks */
  description: string;
  
  /** Severity when violated */
  severity: ViolationSeverity;
  
  /** Rule condition */
  condition: RuleCondition;
  
  /** Message to show when violated */
  message: string;
  
  /** Documentation URL */
  documentationUrl?: string;
  
  /** Whether rule is enabled */
  enabled: boolean;
  
  /** Tags for categorization */
  tags: string[];
}

/**
 * Rule condition types
 */
export type RuleCondition = 
  | FilePatternCondition
  | ContentPatternCondition
  | DependencyCondition
  | NamingCondition
  | StructureCondition
  | CompositeCondition;

/**
 * File pattern condition
 */
export interface FilePatternCondition {
  type: 'file-pattern';
  
  /** Files that must exist matching pattern */
  mustExist?: string;
  
  /** Files that must not exist matching pattern */
  mustNotExist?: string;
  
  /** For each file matching this pattern... */
  forEachFile?: string;
  
  /** ...there must be a corresponding file matching this */
  correspondingFile?: string;
}

/**
 * Content pattern condition
 */
export interface ContentPatternCondition {
  type: 'content-pattern';
  
  /** Files to check */
  files: string;
  
  /** Pattern that must be present */
  mustContain?: string;
  
  /** Pattern that must not be present */
  mustNotContain?: string;
  
  /** Regex pattern */
  regex?: string;
}

/**
 * Dependency condition
 */
export interface DependencyCondition {
  type: 'dependency';
  
  /** Source files */
  from: string;
  
  /** Cannot import from */
  cannotImport?: string;
  
  /** Must import from */
  mustImport?: string;
}

/**
 * Naming condition
 */
export interface NamingCondition {
  type: 'naming';
  
  /** Files to check */
  files: string;
  
  /** Naming pattern (regex) */
  pattern: string;
  
  /** What should match (file, class, function, variable) */
  target: 'file' | 'class' | 'function' | 'variable';
}

/**
 * Structure condition
 */
export interface StructureCondition {
  type: 'structure';
  
  /** Directory that must exist */
  directoryMustExist?: string;
  
  /** File that must exist */
  fileMustExist?: string;
  
  /** Maximum file count in directory */
  maxFilesInDirectory?: { directory: string; max: number };
}

/**
 * Composite condition (AND/OR)
 */
export interface CompositeCondition {
  type: 'composite';
  
  /** Operator */
  operator: 'and' | 'or' | 'not';
  
  /** Child conditions */
  conditions: RuleCondition[];
}


// =============================================================================
// SECTION 6: Policy Types
// =============================================================================

/**
 * A quality gate policy
 */
export interface QualityPolicy {
  /** Unique policy ID */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description */
  description: string;
  
  /** Policy version */
  version: string;
  
  /** When this policy applies */
  scope: PolicyScope;
  
  /** Gate configurations */
  gates: PolicyGateConfigs;
  
  /** How to aggregate gate results */
  aggregation: AggregationConfig;
  
  /** Actions to take based on result */
  actions: PolicyActions;
  
  /** Policy metadata */
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
  };
}

/**
 * Policy scope - when the policy applies
 */
export interface PolicyScope {
  /** Branch patterns (glob) */
  branches?: string[];
  
  /** Path patterns (glob) */
  paths?: string[];
  
  /** Author patterns (for different rules for bots) */
  authors?: string[];
  
  /** File patterns to include */
  includeFiles?: string[];
  
  /** File patterns to exclude */
  excludeFiles?: string[];
  
  /** Time-based scope (e.g., stricter before release) */
  timeRange?: {
    after?: string;
    before?: string;
  };
}

/**
 * Gate configurations within a policy
 */
export interface PolicyGateConfigs {
  'pattern-compliance': PatternComplianceConfig | 'skip';
  'constraint-verification': ConstraintVerificationConfig | 'skip';
  'regression-detection': RegressionDetectionConfig | 'skip';
  'impact-simulation': ImpactSimulationConfig | 'skip';
  'security-boundary': SecurityBoundaryConfig | 'skip';
  'custom-rules': CustomRulesConfig | 'skip';
}

/**
 * Aggregation configuration
 */
export interface AggregationConfig {
  /** How to determine overall pass/fail */
  mode: AggregationMode;
  
  /** Weights for weighted mode */
  weights?: Record<GateId, number>;
  
  /** Minimum score for threshold mode */
  minScore?: number;
  
  /** Gates that must pass regardless of mode */
  requiredGates?: GateId[];
}

/**
 * Actions to take based on result
 */
export interface PolicyActions {
  /** Actions on pass */
  onPass: PolicyAction[];
  
  /** Actions on fail */
  onFail: PolicyAction[];
  
  /** Actions on warn */
  onWarn: PolicyAction[];
}

/**
 * A single policy action
 */
export type PolicyAction = 
  | { type: 'comment'; template: string }
  | { type: 'label'; add?: string[]; remove?: string[] }
  | { type: 'webhook'; url: string; payload?: Record<string, unknown> }
  | { type: 'slack'; channel: string; message: string }
  | { type: 'jira'; project: string; issueType: string };

// =============================================================================
// SECTION 7: Orchestrator Types
// =============================================================================

/**
 * Options for running quality gates
 */
export interface QualityGateOptions {
  /** Project root directory */
  projectRoot: string;
  
  /** Files to check (if not specified, uses staged/changed files) */
  files?: string[];
  
  /** Policy to use (ID or inline) */
  policy?: string | QualityPolicy;
  
  /** Specific gates to run (overrides policy) */
  gates?: GateId[];
  
  /** Output format */
  format?: OutputFormat;
  
  /** Whether running in CI */
  ci?: boolean;
  
  /** Verbose output */
  verbose?: boolean;
  
  /** Dry run (show what would be checked) */
  dryRun?: boolean;
  
  /** Branch name */
  branch?: string;
  
  /** Base branch for comparison */
  baseBranch?: string;
  
  /** Commit SHA */
  commitSha?: string;
  
  /** Webhook URL for results */
  webhookUrl?: string;
  
  /** Save results to history */
  saveHistory?: boolean;
}

/**
 * Overall quality gate result
 */
export interface QualityGateResult {
  /** Overall pass/fail */
  passed: boolean;
  
  /** Overall status */
  status: GateStatus;
  
  /** Overall score (0-100) */
  score: number;
  
  /** Human-readable summary */
  summary: string;
  
  /** Individual gate results */
  gates: Record<GateId, GateResult>;
  
  /** All violations across gates */
  violations: GateViolation[];
  
  /** All warnings across gates */
  warnings: string[];
  
  /** Policy that was applied */
  policy: {
    id: string;
    name: string;
  };
  
  /** Execution metadata */
  metadata: {
    /** Total execution time */
    executionTimeMs: number;
    
    /** Files checked */
    filesChecked: number;
    
    /** Gates run */
    gatesRun: GateId[];
    
    /** Gates skipped */
    gatesSkipped: GateId[];
    
    /** Timestamp */
    timestamp: string;
    
    /** Branch */
    branch: string;
    
    /** Commit SHA */
    commitSha?: string;
    
    /** CI environment */
    ci: boolean;
  };
  
  /** Exit code for CLI */
  exitCode: number;
}


// =============================================================================
// SECTION 8: Health Snapshot Types
// =============================================================================

/**
 * A point-in-time snapshot of codebase health
 */
export interface HealthSnapshot {
  /** Snapshot ID */
  id: string;
  
  /** Branch name */
  branch: string;
  
  /** Commit SHA */
  commitSha: string;
  
  /** Timestamp */
  timestamp: string;
  
  /** Overall health score */
  healthScore: number;
  
  /** Pattern health */
  patterns: PatternHealthSnapshot[];
  
  /** Constraint health */
  constraints: ConstraintHealthSnapshot[];
  
  /** Security health */
  security: SecurityHealthSnapshot;
  
  /** Metadata */
  metadata: {
    filesAnalyzed: number;
    patternsAnalyzed: number;
    constraintsAnalyzed: number;
  };
}

/**
 * Pattern health in a snapshot
 */
export interface PatternHealthSnapshot {
  /** Pattern ID */
  patternId: string;
  
  /** Pattern name */
  patternName: string;
  
  /** Category */
  category: string;
  
  /** Confidence score */
  confidence: number;
  
  /** Compliance rate */
  compliance: number;
  
  /** Number of locations */
  locations: number;
  
  /** Number of outliers */
  outliers: number;
}

/**
 * Constraint health in a snapshot
 */
export interface ConstraintHealthSnapshot {
  /** Constraint ID */
  constraintId: string;
  
  /** Description */
  description: string;
  
  /** Category */
  category: string;
  
  /** Whether satisfied */
  satisfied: boolean;
  
  /** Confidence */
  confidence: number;
}

/**
 * Security health in a snapshot
 */
export interface SecurityHealthSnapshot {
  /** Auth coverage */
  authCoverage: number;
  
  /** Sensitive data access points */
  sensitiveAccessPoints: number;
  
  /** Protected tables */
  protectedTables: number;
  
  /** Unprotected tables */
  unprotectedTables: number;
}

// =============================================================================
// SECTION 9: Reporter Types
// =============================================================================

/**
 * Reporter interface
 */
export interface Reporter {
  /** Reporter ID */
  id: string;
  
  /** Format this reporter produces */
  format: OutputFormat;
  
  /** Generate report from result */
  generate(result: QualityGateResult, options: ReporterOptions): string;
  
  /** Write report to destination */
  write(report: string, options: ReporterOptions): Promise<void>;
}

/**
 * Reporter options
 */
export interface ReporterOptions {
  /** Output file path (if writing to file) */
  outputPath?: string;
  
  /** Verbose output */
  verbose?: boolean;
  
  /** Include suggestions */
  includeSuggestions?: boolean;
  
  /** Include code snippets */
  includeCodeSnippets?: boolean;
  
  /** Webhook URL (for webhook reporter) */
  webhookUrl?: string;
  
  /** GitHub token (for GitHub reporter) */
  githubToken?: string;
  
  /** GitLab token (for GitLab reporter) */
  gitlabToken?: string;
}

// =============================================================================
// SECTION 10: Store Types
// =============================================================================

/**
 * Gate run record
 */
export interface GateRunRecord {
  /** Run ID */
  id: string;
  
  /** Timestamp */
  timestamp: string;
  
  /** Branch */
  branch: string;
  
  /** Commit SHA */
  commitSha?: string;
  
  /** Policy used */
  policyId: string;
  
  /** Overall result */
  passed: boolean;
  
  /** Score */
  score: number;
  
  /** Gate results summary */
  gates: Record<GateId, { passed: boolean; score: number }>;
  
  /** Violation count */
  violationCount: number;
  
  /** Execution time */
  executionTimeMs: number;
  
  /** CI environment */
  ci: boolean;
}

// =============================================================================
// SECTION 11: Factory Types
// =============================================================================

/**
 * Gate factory function type
 */
export type GateFactory = (context: GateFactoryContext) => Gate;

/**
 * Context provided to gate factories
 */
export interface GateFactoryContext {
  /** Project root */
  projectRoot: string;
  
  /** Pattern service */
  patternService?: import('../patterns/types').IPatternService;
  
  /** Constraint store */
  constraintStore?: import('../constraints/types').ConstraintStore;
  
  /** Call graph analyzer */
  callGraphAnalyzer?: import('../call-graph/types').CallGraphAnalyzer;
  
  /** History store */
  historyStore?: import('../store/types').HistoryStore;
  
  /** Logger */
  logger?: import('../utils/types').Logger;
}

/**
 * Gate interface
 */
export interface Gate {
  /** Gate ID */
  id: GateId;
  
  /** Gate name */
  name: string;
  
  /** Gate description */
  description: string;
  
  /** Execute the gate */
  execute(input: GateInput): Promise<GateResult>;
  
  /** Validate configuration */
  validateConfig(config: GateConfig): { valid: boolean; errors: string[] };
  
  /** Get default configuration */
  getDefaultConfig(): GateConfig;
}
```


---

## 5. Gate Implementations

### 5.1 Base Gate Class

All gates extend this abstract base class.

```typescript
// File: drift/packages/core/src/quality-gates/gates/base-gate.ts

import type {
  Gate,
  GateId,
  GateInput,
  GateResult,
  GateConfig,
  GateStatus,
  GateViolation,
} from '../types.js';

/**
 * Abstract base class for all quality gates.
 * Provides common functionality and enforces consistent behavior.
 */
export abstract class BaseGate implements Gate {
  abstract readonly id: GateId;
  abstract readonly name: string;
  abstract readonly description: string;

  /**
   * Execute the gate. Wraps the implementation with error handling
   * and timing.
   */
  async execute(input: GateInput): Promise<GateResult> {
    const startTime = Date.now();
    
    try {
      // Validate config
      const validation = this.validateConfig(input.config);
      if (!validation.valid) {
        return this.createErrorResult(
          `Invalid configuration: ${validation.errors.join(', ')}`,
          Date.now() - startTime
        );
      }
      
      // Check if gate is enabled
      if (!input.config.enabled) {
        return this.createSkippedResult('Gate is disabled', Date.now() - startTime);
      }
      
      // Execute the actual gate logic
      const result = await this.executeGate(input);
      
      return {
        ...result,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error),
        Date.now() - startTime
      );
    }
  }

  /**
   * Implement this method in subclasses to provide gate-specific logic.
   */
  protected abstract executeGate(input: GateInput): Promise<GateResult>;

  /**
   * Validate the gate configuration.
   */
  abstract validateConfig(config: GateConfig): { valid: boolean; errors: string[] };

  /**
   * Get the default configuration for this gate.
   */
  abstract getDefaultConfig(): GateConfig;

  /**
   * Create a result indicating the gate was skipped.
   */
  protected createSkippedResult(reason: string, executionTimeMs: number): GateResult {
    return {
      gateId: this.id,
      gateName: this.name,
      status: 'skipped',
      passed: true, // Skipped gates don't block
      score: 100,
      summary: `Skipped: ${reason}`,
      violations: [],
      warnings: [],
      executionTimeMs,
      details: { skipReason: reason },
    };
  }

  /**
   * Create a result indicating the gate errored.
   */
  protected createErrorResult(error: string, executionTimeMs: number): GateResult {
    return {
      gateId: this.id,
      gateName: this.name,
      status: 'errored',
      passed: true, // Errored gates don't block by default (fail-safe)
      score: 0,
      summary: `Error: ${error}`,
      violations: [],
      warnings: [`Gate execution failed: ${error}`],
      executionTimeMs,
      details: {},
      error,
    };
  }

  /**
   * Create a violation object.
   */
  protected createViolation(
    params: Omit<GateViolation, 'id' | 'gateId'>
  ): GateViolation {
    return {
      id: `${this.id}-${params.file}-${params.line}-${params.ruleId}`,
      gateId: this.id,
      ...params,
    };
  }

  /**
   * Calculate score from violations.
   */
  protected calculateScore(
    totalChecks: number,
    violations: GateViolation[]
  ): number {
    if (totalChecks === 0) return 100;
    
    const errorWeight = 10;
    const warningWeight = 3;
    const infoWeight = 1;
    
    let penalty = 0;
    for (const v of violations) {
      switch (v.severity) {
        case 'error': penalty += errorWeight; break;
        case 'warning': penalty += warningWeight; break;
        case 'info': penalty += infoWeight; break;
        default: penalty += 0.5;
      }
    }
    
    const maxPenalty = totalChecks * errorWeight;
    const score = Math.max(0, 100 - (penalty / maxPenalty) * 100);
    return Math.round(score);
  }

  /**
   * Determine status from score and config.
   */
  protected determineStatus(
    score: number,
    violations: GateViolation[],
    config: GateConfig
  ): GateStatus {
    const hasErrors = violations.some(v => v.severity === 'error');
    const hasWarnings = violations.some(v => v.severity === 'warning');
    
    if (hasErrors) return 'failed';
    if (hasWarnings) return 'warned';
    return 'passed';
  }
}
```


### 5.2 Pattern Compliance Gate

```typescript
// File: drift/packages/core/src/quality-gates/gates/pattern-compliance/pattern-compliance-gate.ts

import { BaseGate } from '../base-gate.js';
import type {
  GateId,
  GateInput,
  GateResult,
  GateConfig,
  PatternComplianceConfig,
  PatternComplianceDetails,
  GateViolation,
  OutlierDetail,
} from '../../types.js';
import { ComplianceCalculator } from './compliance-calculator.js';
import { OutlierDetector } from './outlier-detector.js';

/**
 * Pattern Compliance Gate
 * 
 * Checks whether changed files follow established patterns in the codebase.
 * This is Drift's unique value - no other tool checks architectural consistency.
 */
export class PatternComplianceGate extends BaseGate {
  readonly id: GateId = 'pattern-compliance';
  readonly name = 'Pattern Compliance';
  readonly description = 'Checks if code follows established patterns';

  private complianceCalculator: ComplianceCalculator;
  private outlierDetector: OutlierDetector;

  constructor() {
    super();
    this.complianceCalculator = new ComplianceCalculator();
    this.outlierDetector = new OutlierDetector();
  }

  protected async executeGate(input: GateInput): Promise<GateResult> {
    const config = input.config as PatternComplianceConfig;
    const patterns = input.context.patterns ?? [];
    
    // Filter patterns by config
    const relevantPatterns = this.filterPatterns(patterns, config);
    
    if (relevantPatterns.length === 0) {
      return {
        gateId: this.id,
        gateName: this.name,
        status: 'passed',
        passed: true,
        score: 100,
        summary: 'No patterns to check against',
        violations: [],
        warnings: ['No approved patterns found. Run `drift scan` and `drift approve` first.'],
        executionTimeMs: 0,
        details: {
          complianceRate: 100,
          patternsChecked: 0,
          filesChecked: input.files.length,
          newOutliers: [],
          existingOutliers: 0,
          byCategory: {},
        } as PatternComplianceDetails,
      };
    }

    // Calculate compliance
    const compliance = await this.complianceCalculator.calculate(
      input.files,
      relevantPatterns,
      input.projectRoot
    );

    // Detect new outliers
    const newOutliers = await this.outlierDetector.detectNew(
      input.files,
      relevantPatterns,
      input.context.previousSnapshot,
      input.projectRoot
    );

    // Build violations
    const violations = this.buildViolations(newOutliers, config);

    // Determine pass/fail
    const passed = this.evaluateThresholds(compliance, newOutliers, config);
    const score = this.calculateComplianceScore(compliance, newOutliers, config);
    const status = passed ? 'passed' : 'failed';

    const details: PatternComplianceDetails = {
      complianceRate: compliance.overallRate,
      patternsChecked: relevantPatterns.length,
      filesChecked: input.files.length,
      newOutliers,
      existingOutliers: compliance.existingOutliers,
      byCategory: compliance.byCategory,
    };

    return {
      gateId: this.id,
      gateName: this.name,
      status,
      passed,
      score,
      summary: this.buildSummary(compliance, newOutliers, passed),
      violations,
      warnings: this.buildWarnings(compliance),
      executionTimeMs: 0,
      details,
    };
  }

  validateConfig(config: GateConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const c = config as PatternComplianceConfig;

    if (c.minComplianceRate < 0 || c.minComplianceRate > 100) {
      errors.push('minComplianceRate must be between 0 and 100');
    }
    if (c.maxNewOutliers < 0) {
      errors.push('maxNewOutliers must be non-negative');
    }
    if (c.minPatternConfidence < 0 || c.minPatternConfidence > 1) {
      errors.push('minPatternConfidence must be between 0 and 1');
    }

    return { valid: errors.length === 0, errors };
  }

  getDefaultConfig(): PatternComplianceConfig {
    return {
      enabled: true,
      blocking: true,
      minComplianceRate: 80,
      maxNewOutliers: 0,
      categories: [], // Empty = all categories
      minPatternConfidence: 0.7,
      approvedOnly: true,
    };
  }

  private filterPatterns(patterns: any[], config: PatternComplianceConfig): any[] {
    return patterns.filter(p => {
      // Filter by approval status
      if (config.approvedOnly && p.status !== 'approved') return false;
      
      // Filter by confidence
      if (p.confidence < config.minPatternConfidence) return false;
      
      // Filter by category
      if (config.categories.length > 0 && !config.categories.includes(p.category)) {
        return false;
      }
      
      return true;
    });
  }

  private buildViolations(
    outliers: OutlierDetail[],
    config: PatternComplianceConfig
  ): GateViolation[] {
    return outliers.map(o => this.createViolation({
      severity: 'error',
      file: o.file,
      line: o.line,
      column: 1,
      message: `Deviates from pattern: ${o.patternName}`,
      explanation: o.reason,
      ruleId: o.patternId,
      suggestedFix: `Follow the established ${o.patternName} pattern`,
    }));
  }

  private evaluateThresholds(
    compliance: any,
    newOutliers: OutlierDetail[],
    config: PatternComplianceConfig
  ): boolean {
    if (compliance.overallRate < config.minComplianceRate) return false;
    if (newOutliers.length > config.maxNewOutliers) return false;
    return true;
  }

  private calculateComplianceScore(
    compliance: any,
    newOutliers: OutlierDetail[],
    config: PatternComplianceConfig
  ): number {
    // Base score from compliance rate
    let score = compliance.overallRate;
    
    // Penalty for new outliers
    const outlierPenalty = newOutliers.length * 5;
    score = Math.max(0, score - outlierPenalty);
    
    return Math.round(score);
  }

  private buildSummary(
    compliance: any,
    newOutliers: OutlierDetail[],
    passed: boolean
  ): string {
    if (passed) {
      return `Pattern compliance: ${compliance.overallRate.toFixed(1)}% (${newOutliers.length} new outliers)`;
    }
    return `Pattern compliance failed: ${compliance.overallRate.toFixed(1)}% compliance, ${newOutliers.length} new outliers`;
  }

  private buildWarnings(compliance: any): string[] {
    const warnings: string[] = [];
    
    // Warn about low-confidence patterns
    if (compliance.lowConfidencePatterns > 0) {
      warnings.push(`${compliance.lowConfidencePatterns} patterns have low confidence`);
    }
    
    return warnings;
  }
}
```


### 5.3 Constraint Verification Gate

```typescript
// File: drift/packages/core/src/quality-gates/gates/constraint-verification/constraint-verification-gate.ts

import { BaseGate } from '../base-gate.js';
import type {
  GateId,
  GateInput,
  GateResult,
  GateConfig,
  ConstraintVerificationConfig,
  ConstraintVerificationDetails,
  GateViolation,
  ConstraintResult,
  ConstraintViolationDetail,
  SkippedConstraint,
} from '../../types.js';
import { ConstraintEvaluator } from './constraint-evaluator.js';
import { ViolationFormatter } from './violation-formatter.js';

/**
 * Constraint Verification Gate
 * 
 * Verifies that code satisfies learned architectural invariants.
 * Constraints are discovered from the codebase, not manually configured.
 */
export class ConstraintVerificationGate extends BaseGate {
  readonly id: GateId = 'constraint-verification';
  readonly name = 'Constraint Verification';
  readonly description = 'Verifies code satisfies architectural constraints';

  private evaluator: ConstraintEvaluator;
  private formatter: ViolationFormatter;

  constructor() {
    super();
    this.evaluator = new ConstraintEvaluator();
    this.formatter = new ViolationFormatter();
  }

  protected async executeGate(input: GateInput): Promise<GateResult> {
    const config = input.config as ConstraintVerificationConfig;
    const constraints = input.context.constraints ?? [];

    // Filter constraints by config
    const relevantConstraints = this.filterConstraints(constraints, config);

    if (relevantConstraints.length === 0) {
      return {
        gateId: this.id,
        gateName: this.name,
        status: 'passed',
        passed: true,
        score: 100,
        summary: 'No constraints to verify',
        violations: [],
        warnings: ['No constraints found. Run `drift constraints discover` first.'],
        executionTimeMs: 0,
        details: {
          satisfied: [],
          violated: [],
          skipped: [],
          byCategory: {},
        } as ConstraintVerificationDetails,
      };
    }

    // Evaluate constraints
    const results = await this.evaluator.evaluate(
      input.files,
      relevantConstraints,
      input.projectRoot,
      input.context
    );

    // Categorize results
    const satisfied: ConstraintResult[] = [];
    const violated: ConstraintViolationDetail[] = [];
    const skipped: SkippedConstraint[] = [];

    for (const result of results) {
      if (result.skipped) {
        skipped.push({
          constraintId: result.constraintId,
          reason: result.skipReason ?? 'Unknown',
        });
      } else if (result.passed) {
        satisfied.push({
          constraintId: result.constraintId,
          description: result.description,
          passed: true,
          confidence: result.confidence,
        });
      } else {
        violated.push({
          constraintId: result.constraintId,
          description: result.description,
          violatingFiles: result.violatingFiles,
          locations: result.locations,
        });
      }
    }

    // Build violations
    const violations = this.buildViolations(violated, config);

    // Calculate results
    const passed = this.evaluateResults(violated, config);
    const score = this.calculateScore(satisfied.length, violated.length);
    const status = passed ? (violated.length > 0 ? 'warned' : 'passed') : 'failed';

    const details: ConstraintVerificationDetails = {
      satisfied,
      violated,
      skipped,
      byCategory: this.groupByCategory(results),
    };

    return {
      gateId: this.id,
      gateName: this.name,
      status,
      passed,
      score,
      summary: this.buildSummary(satisfied, violated, passed),
      violations,
      warnings: this.buildWarnings(skipped),
      executionTimeMs: 0,
      details,
    };
  }

  validateConfig(config: GateConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const c = config as ConstraintVerificationConfig;

    if (c.minConfidence < 0 || c.minConfidence > 1) {
      errors.push('minConfidence must be between 0 and 1');
    }

    return { valid: errors.length === 0, errors };
  }

  getDefaultConfig(): ConstraintVerificationConfig {
    return {
      enabled: true,
      blocking: true,
      enforceApproved: true,
      enforceDiscovered: false,
      minConfidence: 0.9,
      categories: [],
    };
  }

  private filterConstraints(constraints: any[], config: ConstraintVerificationConfig): any[] {
    return constraints.filter(c => {
      // Filter by status
      if (c.status === 'approved' && !config.enforceApproved) return false;
      if (c.status === 'discovered' && !config.enforceDiscovered) return false;
      if (c.status === 'ignored') return false;

      // Filter by confidence
      if (c.confidence < config.minConfidence) return false;

      // Filter by category
      if (config.categories.length > 0 && !config.categories.includes(c.category)) {
        return false;
      }

      return true;
    });
  }

  private buildViolations(
    violated: ConstraintViolationDetail[],
    config: ConstraintVerificationConfig
  ): GateViolation[] {
    const violations: GateViolation[] = [];

    for (const v of violated) {
      for (const loc of v.locations) {
        violations.push(this.createViolation({
          severity: config.blocking ? 'error' : 'warning',
          file: loc.file,
          line: loc.line,
          column: 1,
          message: `Constraint violated: ${v.description}`,
          explanation: loc.reason,
          ruleId: v.constraintId,
        }));
      }
    }

    return violations;
  }

  private evaluateResults(
    violated: ConstraintViolationDetail[],
    config: ConstraintVerificationConfig
  ): boolean {
    if (!config.blocking) return true;
    return violated.length === 0;
  }

  private calculateScore(satisfied: number, violated: number): number {
    const total = satisfied + violated;
    if (total === 0) return 100;
    return Math.round((satisfied / total) * 100);
  }

  private groupByCategory(results: any[]): Record<string, { passed: number; failed: number }> {
    const byCategory: Record<string, { passed: number; failed: number }> = {};

    for (const r of results) {
      const cat = r.category ?? 'uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = { passed: 0, failed: 0 };
      }
      if (r.passed) {
        byCategory[cat].passed++;
      } else {
        byCategory[cat].failed++;
      }
    }

    return byCategory;
  }

  private buildSummary(
    satisfied: ConstraintResult[],
    violated: ConstraintViolationDetail[],
    passed: boolean
  ): string {
    const total = satisfied.length + violated.length;
    if (passed) {
      return `Constraints: ${satisfied.length}/${total} satisfied`;
    }
    return `Constraint verification failed: ${violated.length} violations`;
  }

  private buildWarnings(skipped: SkippedConstraint[]): string[] {
    if (skipped.length === 0) return [];
    return [`${skipped.length} constraints were skipped`];
  }
}
```


### 5.4 Regression Detection Gate

```typescript
// File: drift/packages/core/src/quality-gates/gates/regression-detection/regression-detection-gate.ts

import { BaseGate } from '../base-gate.js';
import type {
  GateId,
  GateInput,
  GateResult,
  GateConfig,
  RegressionDetectionConfig,
  RegressionDetectionDetails,
  GateViolation,
  PatternRegression,
  PatternImprovement,
} from '../../types.js';
import { SnapshotComparator } from './snapshot-comparator.js';
import { DeltaCalculator } from './delta-calculator.js';
import { RegressionClassifier } from './regression-classifier.js';

/**
 * Regression Detection Gate
 * 
 * Detects when changes make pattern health worse.
 * Compares current state against a baseline (previous commit, branch base, or snapshot).
 * 
 * FUTURE_GATE: gate:regression-detection
 */
export class RegressionDetectionGate extends BaseGate {
  readonly id: GateId = 'regression-detection';
  readonly name = 'Regression Detection';
  readonly description = 'Detects pattern health regressions';

  private comparator: SnapshotComparator;
  private deltaCalculator: DeltaCalculator;
  private classifier: RegressionClassifier;

  constructor() {
    super();
    this.comparator = new SnapshotComparator();
    this.deltaCalculator = new DeltaCalculator();
    this.classifier = new RegressionClassifier();
  }

  protected async executeGate(input: GateInput): Promise<GateResult> {
    const config = input.config as RegressionDetectionConfig;

    // Get baseline snapshot
    const baseline = await this.getBaseline(input, config);
    if (!baseline) {
      return {
        gateId: this.id,
        gateName: this.name,
        status: 'passed',
        passed: true,
        score: 100,
        summary: 'No baseline available for comparison',
        violations: [],
        warnings: ['No previous snapshot found. First run establishes baseline.'],
        executionTimeMs: 0,
        details: {
          regressions: [],
          improvements: [],
          overallHealthDelta: 0,
          categoryDeltas: {},
          baseline: { type: config.baseline, reference: 'none', timestamp: '' },
        } as RegressionDetectionDetails,
      };
    }

    // Calculate current state
    const currentSnapshot = await this.calculateCurrentSnapshot(input);

    // Compare snapshots
    const comparison = this.comparator.compare(baseline, currentSnapshot);

    // Classify regressions and improvements
    const regressions = this.classifier.classifyRegressions(comparison.regressions);
    const improvements = this.classifier.classifyImprovements(comparison.improvements);

    // Calculate deltas
    const overallHealthDelta = this.deltaCalculator.calculateOverall(baseline, currentSnapshot);
    const categoryDeltas = this.deltaCalculator.calculateByCategory(baseline, currentSnapshot);

    // Build violations for regressions
    const violations = this.buildViolations(regressions, config);

    // Evaluate pass/fail
    const passed = this.evaluateRegressions(regressions, config, overallHealthDelta);
    const score = this.calculateRegressionScore(regressions, improvements, overallHealthDelta);
    const status = passed ? (regressions.length > 0 ? 'warned' : 'passed') : 'failed';

    const details: RegressionDetectionDetails = {
      regressions,
      improvements,
      overallHealthDelta,
      categoryDeltas,
      baseline: {
        type: config.baseline,
        reference: baseline.commitSha ?? baseline.id,
        timestamp: baseline.timestamp,
      },
    };

    return {
      gateId: this.id,
      gateName: this.name,
      status,
      passed,
      score,
      summary: this.buildSummary(regressions, improvements, overallHealthDelta, passed),
      violations,
      warnings: this.buildWarnings(regressions, config),
      executionTimeMs: 0,
      details,
    };
  }

  validateConfig(config: GateConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const c = config as RegressionDetectionConfig;

    if (c.maxConfidenceDrop < 0 || c.maxConfidenceDrop > 100) {
      errors.push('maxConfidenceDrop must be between 0 and 100');
    }
    if (c.maxComplianceDrop < 0 || c.maxComplianceDrop > 100) {
      errors.push('maxComplianceDrop must be between 0 and 100');
    }
    if (c.maxNewOutliersPerPattern < 0) {
      errors.push('maxNewOutliersPerPattern must be non-negative');
    }

    return { valid: errors.length === 0, errors };
  }

  getDefaultConfig(): RegressionDetectionConfig {
    return {
      enabled: true,
      blocking: true,
      maxConfidenceDrop: 5,
      maxComplianceDrop: 10,
      maxNewOutliersPerPattern: 3,
      criticalCategories: ['auth', 'security'],
      baseline: 'branch-base',
    };
  }

  private async getBaseline(
    input: GateInput,
    config: RegressionDetectionConfig
  ): Promise<any | null> {
    // Try to get baseline from context first
    if (input.context.previousSnapshot) {
      return input.context.previousSnapshot;
    }

    // Otherwise, load based on config
    // This would use the snapshot store
    return null;
  }

  private async calculateCurrentSnapshot(input: GateInput): Promise<any> {
    // Calculate current pattern health from context
    const patterns = input.context.patterns ?? [];
    
    return {
      id: `current-${Date.now()}`,
      branch: input.branch,
      commitSha: input.commitSha,
      timestamp: new Date().toISOString(),
      patterns: patterns.map(p => ({
        patternId: p.id,
        patternName: p.name,
        category: p.category,
        confidence: p.confidence,
        compliance: this.calculatePatternCompliance(p),
        locations: p.locations?.length ?? 0,
        outliers: p.outliers?.length ?? 0,
      })),
    };
  }

  private calculatePatternCompliance(pattern: any): number {
    const locations = pattern.locations?.length ?? 0;
    const outliers = pattern.outliers?.length ?? 0;
    const total = locations + outliers;
    if (total === 0) return 100;
    return (locations / total) * 100;
  }

  private buildViolations(
    regressions: PatternRegression[],
    config: RegressionDetectionConfig
  ): GateViolation[] {
    return regressions
      .filter(r => r.severity === 'severe' || 
                   config.criticalCategories.includes(r.patternName))
      .map(r => this.createViolation({
        severity: r.severity === 'severe' ? 'error' : 'warning',
        file: 'project',
        line: 0,
        column: 0,
        message: `Pattern regression: ${r.patternName}`,
        explanation: `Confidence dropped ${r.confidenceDelta.toFixed(1)}%, compliance dropped ${r.complianceDelta.toFixed(1)}%`,
        ruleId: r.patternId,
      }));
  }

  private evaluateRegressions(
    regressions: PatternRegression[],
    config: RegressionDetectionConfig,
    overallDelta: number
  ): boolean {
    // Check for severe regressions
    const severeRegressions = regressions.filter(r => r.severity === 'severe');
    if (severeRegressions.length > 0) return false;

    // Check critical categories
    for (const r of regressions) {
      if (config.criticalCategories.includes(r.patternName)) {
        return false;
      }
    }

    // Check thresholds
    for (const r of regressions) {
      if (Math.abs(r.confidenceDelta) > config.maxConfidenceDrop) return false;
      if (Math.abs(r.complianceDelta) > config.maxComplianceDrop) return false;
      if (r.newOutliers > config.maxNewOutliersPerPattern) return false;
    }

    return true;
  }

  private calculateRegressionScore(
    regressions: PatternRegression[],
    improvements: PatternImprovement[],
    overallDelta: number
  ): number {
    // Start at 100, subtract for regressions, add for improvements
    let score = 100;

    for (const r of regressions) {
      switch (r.severity) {
        case 'severe': score -= 20; break;
        case 'moderate': score -= 10; break;
        case 'minor': score -= 5; break;
      }
    }

    for (const i of improvements) {
      score += Math.min(5, i.confidenceImprovement);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private buildSummary(
    regressions: PatternRegression[],
    improvements: PatternImprovement[],
    overallDelta: number,
    passed: boolean
  ): string {
    const deltaStr = overallDelta >= 0 ? `+${overallDelta.toFixed(1)}` : overallDelta.toFixed(1);
    
    if (passed) {
      if (regressions.length === 0 && improvements.length > 0) {
        return `Pattern health improved: ${deltaStr}% (${improvements.length} patterns improved)`;
      }
      return `Pattern health: ${deltaStr}% (${regressions.length} regressions, ${improvements.length} improvements)`;
    }
    return `Pattern health regression detected: ${deltaStr}% (${regressions.length} regressions)`;
  }

  private buildWarnings(
    regressions: PatternRegression[],
    config: RegressionDetectionConfig
  ): string[] {
    const warnings: string[] = [];

    const minorRegressions = regressions.filter(r => r.severity === 'minor');
    if (minorRegressions.length > 0) {
      warnings.push(`${minorRegressions.length} minor regressions detected`);
    }

    return warnings;
  }
}
```


### 5.5 Impact Simulation Gate

```typescript
// File: drift/packages/core/src/quality-gates/gates/impact-simulation/impact-simulation-gate.ts

import { BaseGate } from '../base-gate.js';
import type {
  GateId,
  GateInput,
  GateResult,
  GateConfig,
  ImpactSimulationConfig,
  ImpactSimulationDetails,
  GateViolation,
  SensitiveDataPath,
  AffectedFile,
} from '../../types.js';
import { BlastRadiusAnalyzer } from './blast-radius-analyzer.js';
import { RiskAssessor } from './risk-assessor.js';

/**
 * Impact Simulation Gate
 * 
 * Analyzes the blast radius of changes using the call graph.
 * Predicts impact BEFORE merge.
 * 
 * FUTURE_GATE: gate:impact-simulation
 */
export class ImpactSimulationGate extends BaseGate {
  readonly id: GateId = 'impact-simulation';
  readonly name = 'Impact Simulation';
  readonly description = 'Analyzes blast radius of changes';

  private blastRadiusAnalyzer: BlastRadiusAnalyzer;
  private riskAssessor: RiskAssessor;

  constructor() {
    super();
    this.blastRadiusAnalyzer = new BlastRadiusAnalyzer();
    this.riskAssessor = new RiskAssessor();
  }

  protected async executeGate(input: GateInput): Promise<GateResult> {
    const config = input.config as ImpactSimulationConfig;
    const callGraph = input.context.callGraph;

    if (!callGraph) {
      return {
        gateId: this.id,
        gateName: this.name,
        status: 'passed',
        passed: true,
        score: 100,
        summary: 'No call graph available for impact analysis',
        violations: [],
        warnings: ['Call graph not available. Run `drift callgraph build` first.'],
        executionTimeMs: 0,
        details: {
          filesAffected: 0,
          functionsAffected: 0,
          entryPointsAffected: [],
          frictionScore: 0,
          breakingRisk: 'low',
          sensitiveDataPaths: [],
          affectedFiles: [],
        } as ImpactSimulationDetails,
      };
    }

    // Analyze blast radius
    const blastRadius = await this.blastRadiusAnalyzer.analyze(
      input.files,
      callGraph,
      input.projectRoot
    );

    // Assess risk
    const risk = this.riskAssessor.assess(blastRadius, config);

    // Find sensitive data paths if configured
    let sensitiveDataPaths: SensitiveDataPath[] = [];
    if (config.analyzeSensitiveData) {
      sensitiveDataPaths = await this.findSensitiveDataPaths(
        input.files,
        callGraph,
        input.projectRoot
      );
    }

    // Build violations
    const violations = this.buildViolations(blastRadius, risk, config);

    // Evaluate pass/fail
    const passed = this.evaluateImpact(blastRadius, risk, config);
    const score = this.calculateImpactScore(blastRadius, risk);
    const status = passed ? (risk.level !== 'low' ? 'warned' : 'passed') : 'failed';

    const details: ImpactSimulationDetails = {
      filesAffected: blastRadius.filesAffected.length,
      functionsAffected: blastRadius.functionsAffected,
      entryPointsAffected: blastRadius.entryPoints,
      frictionScore: risk.frictionScore,
      breakingRisk: risk.level,
      sensitiveDataPaths,
      affectedFiles: blastRadius.filesAffected.map(f => ({
        file: f.path,
        affectedBy: f.direct ? 'direct' : 'transitive',
        distance: f.distance,
      })),
    };

    return {
      gateId: this.id,
      gateName: this.name,
      status,
      passed,
      score,
      summary: this.buildSummary(blastRadius, risk, passed),
      violations,
      warnings: this.buildWarnings(blastRadius, risk, sensitiveDataPaths),
      executionTimeMs: 0,
      details,
    };
  }

  validateConfig(config: GateConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const c = config as ImpactSimulationConfig;

    if (c.maxFilesAffected < 0) {
      errors.push('maxFilesAffected must be non-negative');
    }
    if (c.maxFunctionsAffected < 0) {
      errors.push('maxFunctionsAffected must be non-negative');
    }
    if (c.maxEntryPointsAffected < 0) {
      errors.push('maxEntryPointsAffected must be non-negative');
    }
    if (c.maxFrictionScore < 0 || c.maxFrictionScore > 100) {
      errors.push('maxFrictionScore must be between 0 and 100');
    }

    return { valid: errors.length === 0, errors };
  }

  getDefaultConfig(): ImpactSimulationConfig {
    return {
      enabled: true,
      blocking: true,
      maxFilesAffected: 20,
      maxFunctionsAffected: 50,
      maxEntryPointsAffected: 10,
      maxFrictionScore: 60,
      analyzeSensitiveData: true,
    };
  }

  private async findSensitiveDataPaths(
    files: string[],
    callGraph: any,
    projectRoot: string
  ): Promise<SensitiveDataPath[]> {
    // Use reachability analysis to find paths to sensitive data
    const paths: SensitiveDataPath[] = [];
    
    // This would integrate with the existing reachability analyzer
    // For now, return empty array
    
    return paths;
  }

  private buildViolations(
    blastRadius: any,
    risk: any,
    config: ImpactSimulationConfig
  ): GateViolation[] {
    const violations: GateViolation[] = [];

    if (blastRadius.filesAffected.length > config.maxFilesAffected) {
      violations.push(this.createViolation({
        severity: 'error',
        file: 'project',
        line: 0,
        column: 0,
        message: `Too many files affected: ${blastRadius.filesAffected.length} > ${config.maxFilesAffected}`,
        explanation: 'This change has a large blast radius',
        ruleId: 'impact-files-affected',
      }));
    }

    if (blastRadius.entryPoints.length > config.maxEntryPointsAffected) {
      violations.push(this.createViolation({
        severity: 'error',
        file: 'project',
        line: 0,
        column: 0,
        message: `Too many entry points affected: ${blastRadius.entryPoints.length} > ${config.maxEntryPointsAffected}`,
        explanation: 'This change affects many API endpoints',
        ruleId: 'impact-entry-points',
      }));
    }

    if (risk.frictionScore > config.maxFrictionScore) {
      violations.push(this.createViolation({
        severity: 'error',
        file: 'project',
        line: 0,
        column: 0,
        message: `High friction score: ${risk.frictionScore} > ${config.maxFrictionScore}`,
        explanation: 'This change introduces significant friction',
        ruleId: 'impact-friction',
      }));
    }

    return violations;
  }

  private evaluateImpact(
    blastRadius: any,
    risk: any,
    config: ImpactSimulationConfig
  ): boolean {
    if (blastRadius.filesAffected.length > config.maxFilesAffected) return false;
    if (blastRadius.functionsAffected > config.maxFunctionsAffected) return false;
    if (blastRadius.entryPoints.length > config.maxEntryPointsAffected) return false;
    if (risk.frictionScore > config.maxFrictionScore) return false;
    if (risk.level === 'critical') return false;
    return true;
  }

  private calculateImpactScore(blastRadius: any, risk: any): number {
    // Inverse of friction score
    return Math.max(0, 100 - risk.frictionScore);
  }

  private buildSummary(blastRadius: any, risk: any, passed: boolean): string {
    if (passed) {
      return `Impact: ${blastRadius.filesAffected.length} files, ${blastRadius.entryPoints.length} endpoints (${risk.level} risk)`;
    }
    return `High impact detected: ${blastRadius.filesAffected.length} files, ${blastRadius.entryPoints.length} endpoints (${risk.level} risk)`;
  }

  private buildWarnings(
    blastRadius: any,
    risk: any,
    sensitiveDataPaths: SensitiveDataPath[]
  ): string[] {
    const warnings: string[] = [];

    if (risk.level === 'medium') {
      warnings.push('Medium risk change - consider additional review');
    }

    if (sensitiveDataPaths.length > 0) {
      warnings.push(`${sensitiveDataPaths.length} sensitive data paths affected`);
    }

    return warnings;
  }
}
```


### 5.6 Security Boundary Gate

```typescript
// File: drift/packages/core/src/quality-gates/gates/security-boundary/security-boundary-gate.ts

import { BaseGate } from '../base-gate.js';
import type {
  GateId,
  GateInput,
  GateResult,
  GateConfig,
  SecurityBoundaryConfig,
  SecurityBoundaryDetails,
  GateViolation,
  DataAccessPoint,
  UnauthorizedPath,
} from '../../types.js';
import { AccessPathValidator } from './access-path-validator.js';
import { AuthChainChecker } from './auth-chain-checker.js';

/**
 * Security Boundary Gate
 * 
 * Validates that code respects data access boundaries.
 * Ensures auth is in the call chain for sensitive data access.
 * 
 * FUTURE_GATE: gate:security-boundary
 */
export class SecurityBoundaryGate extends BaseGate {
  readonly id: GateId = 'security-boundary';
  readonly name = 'Security Boundary';
  readonly description = 'Validates data access boundaries';

  private accessPathValidator: AccessPathValidator;
  private authChainChecker: AuthChainChecker;

  constructor() {
    super();
    this.accessPathValidator = new AccessPathValidator();
    this.authChainChecker = new AuthChainChecker();
  }

  protected async executeGate(input: GateInput): Promise<GateResult> {
    const config = input.config as SecurityBoundaryConfig;
    const callGraph = input.context.callGraph;

    if (!callGraph) {
      return {
        gateId: this.id,
        gateName: this.name,
        status: 'passed',
        passed: true,
        score: 100,
        summary: 'No call graph available for security analysis',
        violations: [],
        warnings: ['Call graph not available. Run `drift callgraph build` first.'],
        executionTimeMs: 0,
        details: {
          newSensitiveAccess: [],
          unauthorizedPaths: [],
          tablesAccessed: [],
          authCoverage: 100,
          protectedTablesStatus: {},
        } as SecurityBoundaryDetails,
      };
    }

    // Find data access points in changed files
    const accessPoints = await this.accessPathValidator.findAccessPoints(
      input.files,
      callGraph,
      input.projectRoot
    );

    // Check auth chain for each access point
    const authResults = await this.authChainChecker.checkAll(
      accessPoints,
      callGraph,
      config.requiredAuthPatterns
    );

    // Identify new sensitive access
    const newSensitiveAccess = accessPoints.filter(ap => 
      ap.hasAuth === false && 
      this.isSensitiveTable(ap.dataAccessed, config.protectedTables)
    );

    // Find unauthorized paths
    const unauthorizedPaths = authResults.filter(r => !r.hasAuth).map(r => ({
      entryPoint: r.entryPoint,
      sensitiveData: r.dataAccessed,
      path: r.path,
      missingAuth: r.missingAuth,
    }));

    // Calculate auth coverage
    const authCoverage = this.calculateAuthCoverage(accessPoints);

    // Get protected tables status
    const protectedTablesStatus = this.getProtectedTablesStatus(
      accessPoints,
      config.protectedTables
    );

    // Build violations
    const violations = this.buildViolations(
      newSensitiveAccess,
      unauthorizedPaths,
      config
    );

    // Evaluate pass/fail
    const passed = this.evaluateSecurity(
      newSensitiveAccess,
      unauthorizedPaths,
      config
    );
    const score = this.calculateSecurityScore(authCoverage, unauthorizedPaths);
    const status = passed ? (unauthorizedPaths.length > 0 ? 'warned' : 'passed') : 'failed';

    const details: SecurityBoundaryDetails = {
      newSensitiveAccess,
      unauthorizedPaths,
      tablesAccessed: [...new Set(accessPoints.map(ap => ap.dataAccessed))],
      authCoverage,
      protectedTablesStatus,
    };

    return {
      gateId: this.id,
      gateName: this.name,
      status,
      passed,
      score,
      summary: this.buildSummary(newSensitiveAccess, unauthorizedPaths, authCoverage, passed),
      violations,
      warnings: this.buildWarnings(accessPoints, config),
      executionTimeMs: 0,
      details,
    };
  }

  validateConfig(config: GateConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const c = config as SecurityBoundaryConfig;

    if (c.maxDataFlowDepth < 1) {
      errors.push('maxDataFlowDepth must be at least 1');
    }

    return { valid: errors.length === 0, errors };
  }

  getDefaultConfig(): SecurityBoundaryConfig {
    return {
      enabled: true,
      blocking: true,
      allowNewSensitiveAccess: false,
      protectedTables: ['users', 'payments', 'credentials', 'tokens'],
      maxDataFlowDepth: 5,
      requiredAuthPatterns: ['authenticate', 'authorize', 'checkAuth', 'requireAuth'],
    };
  }

  private isSensitiveTable(table: string, protectedTables: string[]): boolean {
    const normalizedTable = table.toLowerCase();
    return protectedTables.some(pt => 
      normalizedTable.includes(pt.toLowerCase())
    );
  }

  private calculateAuthCoverage(accessPoints: DataAccessPoint[]): number {
    if (accessPoints.length === 0) return 100;
    const withAuth = accessPoints.filter(ap => ap.hasAuth).length;
    return Math.round((withAuth / accessPoints.length) * 100);
  }

  private getProtectedTablesStatus(
    accessPoints: DataAccessPoint[],
    protectedTables: string[]
  ): Record<string, 'protected' | 'unprotected' | 'partial'> {
    const status: Record<string, 'protected' | 'unprotected' | 'partial'> = {};

    for (const table of protectedTables) {
      const tableAccess = accessPoints.filter(ap => 
        ap.dataAccessed.toLowerCase().includes(table.toLowerCase())
      );

      if (tableAccess.length === 0) {
        status[table] = 'protected'; // Not accessed = protected
      } else {
        const withAuth = tableAccess.filter(ap => ap.hasAuth).length;
        if (withAuth === tableAccess.length) {
          status[table] = 'protected';
        } else if (withAuth === 0) {
          status[table] = 'unprotected';
        } else {
          status[table] = 'partial';
        }
      }
    }

    return status;
  }

  private buildViolations(
    newSensitiveAccess: DataAccessPoint[],
    unauthorizedPaths: UnauthorizedPath[],
    config: SecurityBoundaryConfig
  ): GateViolation[] {
    const violations: GateViolation[] = [];

    // Violations for new sensitive access
    if (!config.allowNewSensitiveAccess) {
      for (const access of newSensitiveAccess) {
        violations.push(this.createViolation({
          severity: 'error',
          file: access.file,
          line: access.line,
          column: 1,
          message: `New sensitive data access without auth: ${access.dataAccessed}`,
          explanation: `This code accesses ${access.dataAccessed} without authentication in the call chain`,
          ruleId: 'security-sensitive-access',
          suggestedFix: 'Add authentication middleware to the call chain',
        }));
      }
    }

    // Violations for unauthorized paths
    for (const path of unauthorizedPaths) {
      violations.push(this.createViolation({
        severity: 'error',
        file: path.path[0] ?? 'unknown',
        line: 0,
        column: 0,
        message: `Unauthorized path to sensitive data: ${path.sensitiveData}`,
        explanation: `Path from ${path.entryPoint} to ${path.sensitiveData} lacks ${path.missingAuth}`,
        ruleId: 'security-unauthorized-path',
        suggestedFix: `Add ${path.missingAuth} to the call chain`,
      }));
    }

    return violations;
  }

  private evaluateSecurity(
    newSensitiveAccess: DataAccessPoint[],
    unauthorizedPaths: UnauthorizedPath[],
    config: SecurityBoundaryConfig
  ): boolean {
    if (!config.allowNewSensitiveAccess && newSensitiveAccess.length > 0) {
      return false;
    }
    if (unauthorizedPaths.length > 0) {
      return false;
    }
    return true;
  }

  private calculateSecurityScore(
    authCoverage: number,
    unauthorizedPaths: UnauthorizedPath[]
  ): number {
    let score = authCoverage;
    score -= unauthorizedPaths.length * 10;
    return Math.max(0, Math.round(score));
  }

  private buildSummary(
    newSensitiveAccess: DataAccessPoint[],
    unauthorizedPaths: UnauthorizedPath[],
    authCoverage: number,
    passed: boolean
  ): string {
    if (passed) {
      return `Security: ${authCoverage}% auth coverage`;
    }
    return `Security issues: ${newSensitiveAccess.length} new sensitive access, ${unauthorizedPaths.length} unauthorized paths`;
  }

  private buildWarnings(
    accessPoints: DataAccessPoint[],
    config: SecurityBoundaryConfig
  ): string[] {
    const warnings: string[] = [];

    const unprotectedAccess = accessPoints.filter(ap => !ap.hasAuth);
    if (unprotectedAccess.length > 0 && config.allowNewSensitiveAccess) {
      warnings.push(`${unprotectedAccess.length} data access points without auth`);
    }

    return warnings;
  }
}
```


### 5.7 Custom Rules Gate

```typescript
// File: drift/packages/core/src/quality-gates/gates/custom-rules/custom-rules-gate.ts

import { BaseGate } from '../base-gate.js';
import type {
  GateId,
  GateInput,
  GateResult,
  GateConfig,
  CustomRulesConfig,
  CustomRulesDetails,
  GateViolation,
  CustomRule,
  RuleResult,
  RuleViolation,
} from '../../types.js';
import { RuleParser } from './rule-parser.js';
import { RuleEvaluator } from './rule-evaluator.js';
import { BUILT_IN_RULES } from './built-in-rules.js';

/**
 * Custom Rules Gate
 * 
 * Evaluates user-defined rules specific to their codebase.
 * Provides extensibility for unique requirements.
 * 
 * FUTURE_GATE: gate:custom-rules
 */
export class CustomRulesGate extends BaseGate {
  readonly id: GateId = 'custom-rules';
  readonly name = 'Custom Rules';
  readonly description = 'Evaluates custom codebase rules';

  private ruleParser: RuleParser;
  private ruleEvaluator: RuleEvaluator;

  constructor() {
    super();
    this.ruleParser = new RuleParser();
    this.ruleEvaluator = new RuleEvaluator();
  }

  protected async executeGate(input: GateInput): Promise<GateResult> {
    const config = input.config as CustomRulesConfig;

    // Load rules
    const rules = await this.loadRules(config, input.projectRoot);

    if (rules.length === 0) {
      return {
        gateId: this.id,
        gateName: this.name,
        status: 'passed',
        passed: true,
        score: 100,
        summary: 'No custom rules configured',
        violations: [],
        warnings: [],
        executionTimeMs: 0,
        details: {
          ruleResults: [],
          failedRules: [],
          passedRules: [],
          skippedRules: [],
        } as CustomRulesDetails,
      };
    }

    // Evaluate each rule
    const ruleResults: RuleResult[] = [];
    for (const rule of rules) {
      if (!rule.enabled) {
        ruleResults.push({
          ruleId: rule.id,
          ruleName: rule.name,
          passed: true,
          violations: [],
          filesChecked: 0,
        });
        continue;
      }

      const result = await this.ruleEvaluator.evaluate(
        rule,
        input.files,
        input.projectRoot
      );
      ruleResults.push(result);
    }

    // Categorize results
    const failedRules = ruleResults.filter(r => !r.passed).map(r => r.ruleId);
    const passedRules = ruleResults.filter(r => r.passed && r.filesChecked > 0).map(r => r.ruleId);
    const skippedRules = ruleResults.filter(r => r.filesChecked === 0).map(r => r.ruleId);

    // Build violations
    const violations = this.buildViolations(ruleResults, rules);

    // Evaluate pass/fail
    const passed = failedRules.length === 0;
    const score = this.calculateRulesScore(ruleResults);
    const status = passed ? 'passed' : 'failed';

    const details: CustomRulesDetails = {
      ruleResults,
      failedRules,
      passedRules,
      skippedRules,
    };

    return {
      gateId: this.id,
      gateName: this.name,
      status,
      passed,
      score,
      summary: this.buildSummary(ruleResults, passed),
      violations,
      warnings: this.buildWarnings(skippedRules),
      executionTimeMs: 0,
      details,
    };
  }

  validateConfig(config: GateConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const c = config as CustomRulesConfig;

    // Validate inline rules
    for (const rule of c.inlineRules ?? []) {
      if (!rule.id) errors.push('Rule missing id');
      if (!rule.name) errors.push('Rule missing name');
      if (!rule.condition) errors.push(`Rule ${rule.id} missing condition`);
    }

    return { valid: errors.length === 0, errors };
  }

  getDefaultConfig(): CustomRulesConfig {
    return {
      enabled: true,
      blocking: true,
      ruleFiles: [],
      inlineRules: [],
      useBuiltInRules: false,
    };
  }

  private async loadRules(
    config: CustomRulesConfig,
    projectRoot: string
  ): Promise<CustomRule[]> {
    const rules: CustomRule[] = [];

    // Load built-in rules if enabled
    if (config.useBuiltInRules) {
      rules.push(...BUILT_IN_RULES);
    }

    // Load rules from files
    for (const ruleFile of config.ruleFiles) {
      const fileRules = await this.ruleParser.parseFile(ruleFile, projectRoot);
      rules.push(...fileRules);
    }

    // Add inline rules
    rules.push(...(config.inlineRules ?? []));

    return rules;
  }

  private buildViolations(
    ruleResults: RuleResult[],
    rules: CustomRule[]
  ): GateViolation[] {
    const violations: GateViolation[] = [];
    const ruleMap = new Map(rules.map(r => [r.id, r]));

    for (const result of ruleResults) {
      if (result.passed) continue;

      const rule = ruleMap.get(result.ruleId);
      const severity = rule?.severity ?? 'error';

      for (const v of result.violations) {
        violations.push(this.createViolation({
          severity,
          file: v.file,
          line: v.line,
          column: 1,
          message: v.message,
          explanation: rule?.description ?? '',
          ruleId: result.ruleId,
          documentationUrl: rule?.documentationUrl,
        }));
      }
    }

    return violations;
  }

  private calculateRulesScore(ruleResults: RuleResult[]): number {
    const evaluated = ruleResults.filter(r => r.filesChecked > 0);
    if (evaluated.length === 0) return 100;

    const passed = evaluated.filter(r => r.passed).length;
    return Math.round((passed / evaluated.length) * 100);
  }

  private buildSummary(ruleResults: RuleResult[], passed: boolean): string {
    const evaluated = ruleResults.filter(r => r.filesChecked > 0);
    const passedCount = evaluated.filter(r => r.passed).length;

    if (passed) {
      return `Custom rules: ${passedCount}/${evaluated.length} passed`;
    }
    return `Custom rules failed: ${evaluated.length - passedCount} rules violated`;
  }

  private buildWarnings(skippedRules: string[]): string[] {
    if (skippedRules.length === 0) return [];
    return [`${skippedRules.length} rules were skipped (no matching files)`];
  }
}
```


---

## 6. Policy Engine

### 6.1 Policy Loader

```typescript
// File: drift/packages/core/src/quality-gates/policy/policy-loader.ts

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { QualityPolicy } from '../types.js';
import { PolicyValidator } from './policy-validator.js';
import { DEFAULT_POLICIES } from './default-policies.js';

/**
 * Loads quality gate policies from various sources.
 */
export class PolicyLoader {
  private validator: PolicyValidator;
  private policiesDir: string;

  constructor(projectRoot: string) {
    this.validator = new PolicyValidator();
    this.policiesDir = path.join(projectRoot, '.drift', 'quality-gates', 'policies');
  }

  /**
   * Load a policy by ID.
   */
  async load(policyId: string): Promise<QualityPolicy> {
    // Check built-in policies first
    const builtIn = DEFAULT_POLICIES[policyId];
    if (builtIn) {
      return builtIn;
    }

    // Try to load from custom policies
    const customPath = path.join(this.policiesDir, 'custom', `${policyId}.json`);
    try {
      const content = await fs.readFile(customPath, 'utf-8');
      const policy = JSON.parse(content) as QualityPolicy;
      
      const validation = this.validator.validate(policy);
      if (!validation.valid) {
        throw new Error(`Invalid policy: ${validation.errors.join(', ')}`);
      }
      
      return policy;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Policy not found: ${policyId}`);
      }
      throw error;
    }
  }

  /**
   * Load the appropriate policy for the current context.
   */
  async loadForContext(context: {
    branch: string;
    paths: string[];
    author?: string;
  }): Promise<QualityPolicy> {
    // List all policies
    const policies = await this.listAll();

    // Find matching policy based on scope
    for (const policy of policies) {
      if (this.matchesScope(policy, context)) {
        return policy;
      }
    }

    // Fall back to default
    return DEFAULT_POLICIES['default'];
  }

  /**
   * List all available policies.
   */
  async listAll(): Promise<QualityPolicy[]> {
    const policies: QualityPolicy[] = [];

    // Add built-in policies
    policies.push(...Object.values(DEFAULT_POLICIES));

    // Add custom policies
    try {
      const customDir = path.join(this.policiesDir, 'custom');
      const files = await fs.readdir(customDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const content = await fs.readFile(path.join(customDir, file), 'utf-8');
          const policy = JSON.parse(content) as QualityPolicy;
          policies.push(policy);
        } catch {
          // Skip invalid files
        }
      }
    } catch {
      // Custom directory doesn't exist
    }

    return policies;
  }

  /**
   * Save a custom policy.
   */
  async save(policy: QualityPolicy): Promise<void> {
    const validation = this.validator.validate(policy);
    if (!validation.valid) {
      throw new Error(`Invalid policy: ${validation.errors.join(', ')}`);
    }

    const customDir = path.join(this.policiesDir, 'custom');
    await fs.mkdir(customDir, { recursive: true });

    const filePath = path.join(customDir, `${policy.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(policy, null, 2));
  }

  /**
   * Check if a policy matches the given context.
   */
  private matchesScope(
    policy: QualityPolicy,
    context: { branch: string; paths: string[]; author?: string }
  ): boolean {
    const scope = policy.scope;

    // Check branch
    if (scope.branches && scope.branches.length > 0) {
      const branchMatches = scope.branches.some(pattern => 
        this.matchGlob(context.branch, pattern)
      );
      if (!branchMatches) return false;
    }

    // Check paths
    if (scope.paths && scope.paths.length > 0) {
      const pathMatches = context.paths.some(p =>
        scope.paths!.some(pattern => this.matchGlob(p, pattern))
      );
      if (!pathMatches) return false;
    }

    // Check author
    if (scope.authors && scope.authors.length > 0 && context.author) {
      const authorMatches = scope.authors.some(pattern =>
        this.matchGlob(context.author!, pattern)
      );
      if (!authorMatches) return false;
    }

    return true;
  }

  /**
   * Simple glob matching.
   */
  private matchGlob(value: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(value);
  }
}
```

### 6.2 Policy Evaluator

```typescript
// File: drift/packages/core/src/quality-gates/policy/policy-evaluator.ts

import type {
  QualityPolicy,
  GateResult,
  GateId,
  GateStatus,
  AggregationMode,
} from '../types.js';

/**
 * Evaluates gate results against a policy to determine overall pass/fail.
 */
export class PolicyEvaluator {
  /**
   * Evaluate gate results against a policy.
   */
  evaluate(
    gateResults: Record<GateId, GateResult>,
    policy: QualityPolicy
  ): {
    passed: boolean;
    status: GateStatus;
    score: number;
    summary: string;
  } {
    const aggregation = policy.aggregation;

    // Check required gates first
    if (aggregation.requiredGates) {
      for (const gateId of aggregation.requiredGates) {
        const result = gateResults[gateId];
        if (result && !result.passed) {
          return {
            passed: false,
            status: 'failed',
            score: this.calculateScore(gateResults, aggregation),
            summary: `Required gate failed: ${result.gateName}`,
          };
        }
      }
    }

    // Evaluate based on aggregation mode
    switch (aggregation.mode) {
      case 'any':
        return this.evaluateAny(gateResults, aggregation);
      case 'all':
        return this.evaluateAll(gateResults, aggregation);
      case 'weighted':
        return this.evaluateWeighted(gateResults, aggregation);
      case 'threshold':
        return this.evaluateThreshold(gateResults, aggregation);
      default:
        return this.evaluateAny(gateResults, aggregation);
    }
  }

  /**
   * Any gate failure = overall failure.
   */
  private evaluateAny(
    gateResults: Record<GateId, GateResult>,
    aggregation: any
  ): { passed: boolean; status: GateStatus; score: number; summary: string } {
    const results = Object.values(gateResults);
    const failed = results.filter(r => r.status === 'failed');
    const warned = results.filter(r => r.status === 'warned');

    const passed = failed.length === 0;
    const status: GateStatus = failed.length > 0 ? 'failed' : 
                               warned.length > 0 ? 'warned' : 'passed';
    const score = this.calculateScore(gateResults, aggregation);

    let summary: string;
    if (passed) {
      summary = `All gates passed (${results.length} gates)`;
    } else {
      summary = `${failed.length} gate(s) failed: ${failed.map(f => f.gateName).join(', ')}`;
    }

    return { passed, status, score, summary };
  }

  /**
   * All gates must fail for overall failure.
   */
  private evaluateAll(
    gateResults: Record<GateId, GateResult>,
    aggregation: any
  ): { passed: boolean; status: GateStatus; score: number; summary: string } {
    const results = Object.values(gateResults);
    const passed = results.filter(r => r.passed);

    const overallPassed = passed.length > 0;
    const status: GateStatus = overallPassed ? 'passed' : 'failed';
    const score = this.calculateScore(gateResults, aggregation);

    const summary = overallPassed
      ? `${passed.length}/${results.length} gates passed`
      : 'All gates failed';

    return { passed: overallPassed, status, score, summary };
  }

  /**
   * Weighted average of gate scores.
   */
  private evaluateWeighted(
    gateResults: Record<GateId, GateResult>,
    aggregation: any
  ): { passed: boolean; status: GateStatus; score: number; summary: string } {
    const weights = aggregation.weights ?? {};
    let totalWeight = 0;
    let weightedScore = 0;

    for (const [gateId, result] of Object.entries(gateResults)) {
      const weight = weights[gateId] ?? 1;
      totalWeight += weight;
      weightedScore += result.score * weight;
    }

    const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 100;
    const minScore = aggregation.minScore ?? 70;
    const passed = score >= minScore;
    const status: GateStatus = passed ? 'passed' : 'failed';

    const summary = passed
      ? `Weighted score: ${score}/100 (min: ${minScore})`
      : `Weighted score below threshold: ${score}/100 (min: ${minScore})`;

    return { passed, status, score, summary };
  }

  /**
   * Overall score must meet threshold.
   */
  private evaluateThreshold(
    gateResults: Record<GateId, GateResult>,
    aggregation: any
  ): { passed: boolean; status: GateStatus; score: number; summary: string } {
    const score = this.calculateScore(gateResults, aggregation);
    const minScore = aggregation.minScore ?? 70;
    const passed = score >= minScore;
    const status: GateStatus = passed ? 'passed' : 'failed';

    const summary = passed
      ? `Score: ${score}/100 (min: ${minScore})`
      : `Score below threshold: ${score}/100 (min: ${minScore})`;

    return { passed, status, score, summary };
  }

  /**
   * Calculate overall score from gate results.
   */
  private calculateScore(
    gateResults: Record<GateId, GateResult>,
    aggregation: any
  ): number {
    const results = Object.values(gateResults);
    if (results.length === 0) return 100;

    const weights = aggregation.weights ?? {};
    let totalWeight = 0;
    let weightedScore = 0;

    for (const [gateId, result] of Object.entries(gateResults)) {
      const weight = weights[gateId as GateId] ?? 1;
      totalWeight += weight;
      weightedScore += result.score * weight;
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 100;
  }
}
```


### 6.3 Default Policies

```typescript
// File: drift/packages/core/src/quality-gates/policy/default-policies.ts

import type { QualityPolicy } from '../types.js';

/**
 * Built-in default policies.
 */
export const DEFAULT_POLICIES: Record<string, QualityPolicy> = {
  /**
   * Default policy - balanced settings for most projects.
   */
  default: {
    id: 'default',
    name: 'Default Policy',
    description: 'Balanced quality gate settings for most projects',
    version: '1.0.0',
    scope: {},
    gates: {
      'pattern-compliance': {
        enabled: true,
        blocking: true,
        minComplianceRate: 80,
        maxNewOutliers: 0,
        categories: [],
        minPatternConfidence: 0.7,
        approvedOnly: true,
      },
      'constraint-verification': {
        enabled: true,
        blocking: true,
        enforceApproved: true,
        enforceDiscovered: false,
        minConfidence: 0.9,
        categories: [],
      },
      'regression-detection': {
        enabled: true,
        blocking: false, // Warn only by default
        maxConfidenceDrop: 5,
        maxComplianceDrop: 10,
        maxNewOutliersPerPattern: 3,
        criticalCategories: ['auth', 'security'],
        baseline: 'branch-base',
      },
      'impact-simulation': {
        enabled: true,
        blocking: false, // Warn only by default
        maxFilesAffected: 20,
        maxFunctionsAffected: 50,
        maxEntryPointsAffected: 10,
        maxFrictionScore: 60,
        analyzeSensitiveData: true,
      },
      'security-boundary': {
        enabled: true,
        blocking: true,
        allowNewSensitiveAccess: false,
        protectedTables: ['users', 'payments', 'credentials', 'tokens'],
        maxDataFlowDepth: 5,
        requiredAuthPatterns: ['authenticate', 'authorize', 'checkAuth', 'requireAuth'],
      },
      'custom-rules': {
        enabled: false,
        blocking: true,
        ruleFiles: [],
        inlineRules: [],
        useBuiltInRules: false,
      },
    },
    aggregation: {
      mode: 'any',
      requiredGates: ['pattern-compliance'],
    },
    actions: {
      onPass: [],
      onFail: [],
      onWarn: [],
    },
    metadata: {
      createdAt: '2026-01-25T00:00:00Z',
      updatedAt: '2026-01-25T00:00:00Z',
    },
  },

  /**
   * Strict policy - for main/release branches.
   */
  strict: {
    id: 'strict',
    name: 'Strict Policy',
    description: 'Strict quality gate settings for main/release branches',
    version: '1.0.0',
    scope: {
      branches: ['main', 'master', 'release/*'],
    },
    gates: {
      'pattern-compliance': {
        enabled: true,
        blocking: true,
        minComplianceRate: 90,
        maxNewOutliers: 0,
        categories: [],
        minPatternConfidence: 0.8,
        approvedOnly: true,
      },
      'constraint-verification': {
        enabled: true,
        blocking: true,
        enforceApproved: true,
        enforceDiscovered: true, // Also enforce discovered
        minConfidence: 0.85,
        categories: [],
      },
      'regression-detection': {
        enabled: true,
        blocking: true, // Block on regressions
        maxConfidenceDrop: 2,
        maxComplianceDrop: 5,
        maxNewOutliersPerPattern: 1,
        criticalCategories: ['auth', 'security', 'api'],
        baseline: 'branch-base',
      },
      'impact-simulation': {
        enabled: true,
        blocking: true, // Block on high impact
        maxFilesAffected: 15,
        maxFunctionsAffected: 30,
        maxEntryPointsAffected: 5,
        maxFrictionScore: 40,
        analyzeSensitiveData: true,
      },
      'security-boundary': {
        enabled: true,
        blocking: true,
        allowNewSensitiveAccess: false,
        protectedTables: ['users', 'payments', 'credentials', 'tokens', 'sessions'],
        maxDataFlowDepth: 3,
        requiredAuthPatterns: ['authenticate', 'authorize', 'checkAuth', 'requireAuth'],
      },
      'custom-rules': {
        enabled: true,
        blocking: true,
        ruleFiles: [],
        inlineRules: [],
        useBuiltInRules: true,
      },
    },
    aggregation: {
      mode: 'any',
      requiredGates: ['pattern-compliance', 'security-boundary'],
    },
    actions: {
      onPass: [],
      onFail: [],
      onWarn: [],
    },
    metadata: {
      createdAt: '2026-01-25T00:00:00Z',
      updatedAt: '2026-01-25T00:00:00Z',
    },
  },

  /**
   * Relaxed policy - for feature branches.
   */
  relaxed: {
    id: 'relaxed',
    name: 'Relaxed Policy',
    description: 'Relaxed quality gate settings for feature branches',
    version: '1.0.0',
    scope: {
      branches: ['feature/*', 'fix/*', 'chore/*'],
    },
    gates: {
      'pattern-compliance': {
        enabled: true,
        blocking: true,
        minComplianceRate: 70,
        maxNewOutliers: 3,
        categories: [],
        minPatternConfidence: 0.6,
        approvedOnly: true,
      },
      'constraint-verification': {
        enabled: true,
        blocking: false, // Warn only
        enforceApproved: true,
        enforceDiscovered: false,
        minConfidence: 0.9,
        categories: [],
      },
      'regression-detection': 'skip',
      'impact-simulation': {
        enabled: true,
        blocking: false, // Warn only
        maxFilesAffected: 50,
        maxFunctionsAffected: 100,
        maxEntryPointsAffected: 20,
        maxFrictionScore: 80,
        analyzeSensitiveData: false,
      },
      'security-boundary': {
        enabled: true,
        blocking: true, // Still block on security
        allowNewSensitiveAccess: true, // But allow new access
        protectedTables: ['users', 'payments', 'credentials'],
        maxDataFlowDepth: 10,
        requiredAuthPatterns: ['authenticate', 'authorize'],
      },
      'custom-rules': 'skip',
    },
    aggregation: {
      mode: 'any',
    },
    actions: {
      onPass: [],
      onFail: [],
      onWarn: [],
    },
    metadata: {
      createdAt: '2026-01-25T00:00:00Z',
      updatedAt: '2026-01-25T00:00:00Z',
    },
  },

  /**
   * CI-only policy - minimal checks for fast CI.
   */
  'ci-fast': {
    id: 'ci-fast',
    name: 'CI Fast Policy',
    description: 'Minimal checks for fast CI feedback',
    version: '1.0.0',
    scope: {},
    gates: {
      'pattern-compliance': {
        enabled: true,
        blocking: true,
        minComplianceRate: 70,
        maxNewOutliers: 5,
        categories: [],
        minPatternConfidence: 0.7,
        approvedOnly: true,
      },
      'constraint-verification': 'skip',
      'regression-detection': 'skip',
      'impact-simulation': 'skip',
      'security-boundary': 'skip',
      'custom-rules': 'skip',
    },
    aggregation: {
      mode: 'any',
    },
    actions: {
      onPass: [],
      onFail: [],
      onWarn: [],
    },
    metadata: {
      createdAt: '2026-01-25T00:00:00Z',
      updatedAt: '2026-01-25T00:00:00Z',
    },
  },
};
```


---

## 7. Orchestrator

### 7.1 Gate Orchestrator

```typescript
// File: drift/packages/core/src/quality-gates/orchestrator/gate-orchestrator.ts

import type {
  QualityGateOptions,
  QualityGateResult,
  QualityPolicy,
  GateId,
  GateResult,
  GateInput,
  GateContext,
  GateViolation,
} from '../types.js';
import { GateRegistry } from './gate-registry.js';
import { ParallelExecutor } from './parallel-executor.js';
import { ResultAggregator } from './result-aggregator.js';
import { PolicyLoader } from '../policy/policy-loader.js';
import { PolicyEvaluator } from '../policy/policy-evaluator.js';
import { FileResolver } from '../utils/file-resolver.js';

/**
 * Main orchestrator for quality gates.
 * Coordinates gate execution and aggregates results.
 */
export class GateOrchestrator {
  private registry: GateRegistry;
  private executor: ParallelExecutor;
  private aggregator: ResultAggregator;
  private policyLoader: PolicyLoader;
  private policyEvaluator: PolicyEvaluator;
  private fileResolver: FileResolver;

  constructor(projectRoot: string) {
    this.registry = new GateRegistry();
    this.executor = new ParallelExecutor();
    this.aggregator = new ResultAggregator();
    this.policyLoader = new PolicyLoader(projectRoot);
    this.policyEvaluator = new PolicyEvaluator();
    this.fileResolver = new FileResolver(projectRoot);
  }

  /**
   * Run quality gates with the given options.
   */
  async run(options: QualityGateOptions): Promise<QualityGateResult> {
    const startTime = Date.now();

    // Resolve files to check
    const files = await this.resolveFiles(options);
    if (files.length === 0) {
      return this.createEmptyResult(options, startTime);
    }

    // Load policy
    const policy = await this.loadPolicy(options);

    // Determine which gates to run
    const gatesToRun = this.determineGates(options, policy);

    // Build shared context
    const context = await this.buildContext(options, policy);

    // Execute gates
    const gateResults = await this.executeGates(
      gatesToRun,
      files,
      options,
      policy,
      context
    );

    // Evaluate policy
    const evaluation = this.policyEvaluator.evaluate(gateResults, policy);

    // Aggregate results
    const result = this.aggregator.aggregate(
      gateResults,
      evaluation,
      policy,
      {
        files,
        startTime,
        options,
      }
    );

    // Save to history if configured
    if (options.saveHistory !== false) {
      await this.saveToHistory(result, options);
    }

    return result;
  }

  /**
   * Resolve files to check.
   */
  private async resolveFiles(options: QualityGateOptions): Promise<string[]> {
    if (options.files && options.files.length > 0) {
      return options.files;
    }

    // Default to staged files in CI, all files otherwise
    if (options.ci) {
      return this.fileResolver.getStagedFiles();
    }

    return this.fileResolver.getChangedFiles(options.baseBranch);
  }

  /**
   * Load the appropriate policy.
   */
  private async loadPolicy(options: QualityGateOptions): Promise<QualityPolicy> {
    if (typeof options.policy === 'object') {
      return options.policy;
    }

    if (typeof options.policy === 'string') {
      return this.policyLoader.load(options.policy);
    }

    // Auto-detect based on context
    return this.policyLoader.loadForContext({
      branch: options.branch ?? 'main',
      paths: options.files ?? [],
    });
  }

  /**
   * Determine which gates to run.
   */
  private determineGates(
    options: QualityGateOptions,
    policy: QualityPolicy
  ): GateId[] {
    // If specific gates requested, use those
    if (options.gates && options.gates.length > 0) {
      return options.gates;
    }

    // Otherwise, use gates from policy
    const gates: GateId[] = [];
    for (const [gateId, config] of Object.entries(policy.gates)) {
      if (config !== 'skip' && config.enabled) {
        gates.push(gateId as GateId);
      }
    }

    return gates;
  }

  /**
   * Build shared context for gates.
   */
  private async buildContext(
    options: QualityGateOptions,
    policy: QualityPolicy
  ): Promise<GateContext> {
    const context: GateContext = {};

    // Load patterns if any gate needs them
    const needsPatterns = this.gatesNeed(policy, ['pattern-compliance', 'regression-detection']);
    if (needsPatterns) {
      context.patterns = await this.loadPatterns(options.projectRoot);
    }

    // Load constraints if needed
    const needsConstraints = this.gatesNeed(policy, ['constraint-verification']);
    if (needsConstraints) {
      context.constraints = await this.loadConstraints(options.projectRoot);
    }

    // Load call graph if needed
    const needsCallGraph = this.gatesNeed(policy, ['impact-simulation', 'security-boundary']);
    if (needsCallGraph) {
      context.callGraph = await this.loadCallGraph(options.projectRoot);
    }

    // Load previous snapshot if needed
    const needsSnapshot = this.gatesNeed(policy, ['regression-detection']);
    if (needsSnapshot) {
      context.previousSnapshot = await this.loadPreviousSnapshot(options);
    }

    // Load custom rules if needed
    const needsRules = this.gatesNeed(policy, ['custom-rules']);
    if (needsRules) {
      context.customRules = await this.loadCustomRules(options.projectRoot, policy);
    }

    return context;
  }

  /**
   * Check if any of the specified gates are enabled.
   */
  private gatesNeed(policy: QualityPolicy, gateIds: GateId[]): boolean {
    for (const gateId of gateIds) {
      const config = policy.gates[gateId];
      if (config !== 'skip' && config.enabled) {
        return true;
      }
    }
    return false;
  }

  /**
   * Execute gates in parallel where possible.
   */
  private async executeGates(
    gatesToRun: GateId[],
    files: string[],
    options: QualityGateOptions,
    policy: QualityPolicy,
    context: GateContext
  ): Promise<Record<GateId, GateResult>> {
    const results: Record<GateId, GateResult> = {} as Record<GateId, GateResult>;

    // Build inputs for each gate
    const inputs: Array<{ gateId: GateId; input: GateInput }> = [];
    for (const gateId of gatesToRun) {
      const config = policy.gates[gateId];
      if (config === 'skip') continue;

      inputs.push({
        gateId,
        input: {
          files,
          projectRoot: options.projectRoot,
          branch: options.branch ?? 'main',
          baseBranch: options.baseBranch,
          commitSha: options.commitSha,
          isCI: options.ci ?? false,
          config,
          context,
        },
      });
    }

    // Execute in parallel
    const gateResults = await this.executor.execute(
      inputs,
      this.registry
    );

    // Map results
    for (const { gateId, result } of gateResults) {
      results[gateId] = result;
    }

    return results;
  }

  /**
   * Create result for empty file list.
   */
  private createEmptyResult(
    options: QualityGateOptions,
    startTime: number
  ): QualityGateResult {
    return {
      passed: true,
      status: 'passed',
      score: 100,
      summary: 'No files to check',
      gates: {} as Record<GateId, GateResult>,
      violations: [],
      warnings: ['No files matched for quality gate check'],
      policy: { id: 'default', name: 'Default Policy' },
      metadata: {
        executionTimeMs: Date.now() - startTime,
        filesChecked: 0,
        gatesRun: [],
        gatesSkipped: [],
        timestamp: new Date().toISOString(),
        branch: options.branch ?? 'main',
        commitSha: options.commitSha,
        ci: options.ci ?? false,
      },
      exitCode: 0,
    };
  }

  // Helper methods for loading data (implementations would use existing services)
  private async loadPatterns(projectRoot: string): Promise<any[]> {
    // Use existing pattern service
    return [];
  }

  private async loadConstraints(projectRoot: string): Promise<any[]> {
    // Use existing constraint store
    return [];
  }

  private async loadCallGraph(projectRoot: string): Promise<any> {
    // Use existing call graph analyzer
    return null;
  }

  private async loadPreviousSnapshot(options: QualityGateOptions): Promise<any> {
    // Use snapshot store
    return null;
  }

  private async loadCustomRules(projectRoot: string, policy: QualityPolicy): Promise<any[]> {
    // Load from policy config
    return [];
  }

  private async saveToHistory(result: QualityGateResult, options: QualityGateOptions): Promise<void> {
    // Use gate run store
  }
}
```


### 7.2 Gate Registry

```typescript
// File: drift/packages/core/src/quality-gates/orchestrator/gate-registry.ts

import type { Gate, GateId, GateFactory, GateFactoryContext } from '../types.js';
import { PatternComplianceGate } from '../gates/pattern-compliance/index.js';
import { ConstraintVerificationGate } from '../gates/constraint-verification/index.js';
import { RegressionDetectionGate } from '../gates/regression-detection/index.js';
import { ImpactSimulationGate } from '../gates/impact-simulation/index.js';
import { SecurityBoundaryGate } from '../gates/security-boundary/index.js';
import { CustomRulesGate } from '../gates/custom-rules/index.js';

/**
 * Registry for quality gates.
 * Manages gate registration and instantiation.
 */
export class GateRegistry {
  private gates: Map<GateId, Gate> = new Map();
  private factories: Map<GateId, GateFactory> = new Map();

  constructor() {
    // Register built-in gates
    this.registerBuiltInGates();
  }

  /**
   * Register built-in gates.
   */
  private registerBuiltInGates(): void {
    this.register('pattern-compliance', () => new PatternComplianceGate());
    this.register('constraint-verification', () => new ConstraintVerificationGate());
    this.register('regression-detection', () => new RegressionDetectionGate());
    this.register('impact-simulation', () => new ImpactSimulationGate());
    this.register('security-boundary', () => new SecurityBoundaryGate());
    this.register('custom-rules', () => new CustomRulesGate());
  }

  /**
   * Register a gate factory.
   */
  register(gateId: GateId, factory: GateFactory): void {
    this.factories.set(gateId, factory);
  }

  /**
   * Get a gate instance.
   */
  get(gateId: GateId, context?: GateFactoryContext): Gate {
    // Check if already instantiated
    let gate = this.gates.get(gateId);
    if (gate) return gate;

    // Get factory
    const factory = this.factories.get(gateId);
    if (!factory) {
      throw new Error(`Unknown gate: ${gateId}`);
    }

    // Create instance
    gate = factory(context ?? { projectRoot: process.cwd() });
    this.gates.set(gateId, gate);

    return gate;
  }

  /**
   * Check if a gate is registered.
   */
  has(gateId: GateId): boolean {
    return this.factories.has(gateId);
  }

  /**
   * List all registered gate IDs.
   */
  list(): GateId[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Clear cached gate instances.
   */
  clear(): void {
    this.gates.clear();
  }
}
```

### 7.3 Parallel Executor

```typescript
// File: drift/packages/core/src/quality-gates/orchestrator/parallel-executor.ts

import type { GateId, GateInput, GateResult } from '../types.js';
import type { GateRegistry } from './gate-registry.js';

/**
 * Executes gates in parallel where possible.
 */
export class ParallelExecutor {
  /**
   * Execute gates in parallel.
   */
  async execute(
    inputs: Array<{ gateId: GateId; input: GateInput }>,
    registry: GateRegistry
  ): Promise<Array<{ gateId: GateId; result: GateResult }>> {
    // Group gates by dependencies
    const groups = this.groupByDependencies(inputs);

    const results: Array<{ gateId: GateId; result: GateResult }> = [];

    // Execute each group in sequence, gates within group in parallel
    for (const group of groups) {
      const groupResults = await Promise.all(
        group.map(async ({ gateId, input }) => {
          const gate = registry.get(gateId);
          const result = await gate.execute(input);
          return { gateId, result };
        })
      );
      results.push(...groupResults);
    }

    return results;
  }

  /**
   * Group gates by dependencies.
   * Gates without dependencies can run in parallel.
   */
  private groupByDependencies(
    inputs: Array<{ gateId: GateId; input: GateInput }>
  ): Array<Array<{ gateId: GateId; input: GateInput }>> {
    // For now, all gates are independent and can run in parallel
    // In the future, we could add dependency tracking
    return [inputs];
  }
}
```

### 7.4 Result Aggregator

```typescript
// File: drift/packages/core/src/quality-gates/orchestrator/result-aggregator.ts

import type {
  QualityGateResult,
  QualityGateOptions,
  QualityPolicy,
  GateId,
  GateResult,
  GateViolation,
  GateStatus,
} from '../types.js';

/**
 * Aggregates gate results into a final quality gate result.
 */
export class ResultAggregator {
  /**
   * Aggregate gate results.
   */
  aggregate(
    gateResults: Record<GateId, GateResult>,
    evaluation: {
      passed: boolean;
      status: GateStatus;
      score: number;
      summary: string;
    },
    policy: QualityPolicy,
    context: {
      files: string[];
      startTime: number;
      options: QualityGateOptions;
    }
  ): QualityGateResult {
    // Collect all violations
    const violations: GateViolation[] = [];
    for (const result of Object.values(gateResults)) {
      violations.push(...result.violations);
    }

    // Collect all warnings
    const warnings: string[] = [];
    for (const result of Object.values(gateResults)) {
      warnings.push(...result.warnings);
    }

    // Determine gates run and skipped
    const gatesRun = Object.keys(gateResults) as GateId[];
    const allGates: GateId[] = [
      'pattern-compliance',
      'constraint-verification',
      'regression-detection',
      'impact-simulation',
      'security-boundary',
      'custom-rules',
    ];
    const gatesSkipped = allGates.filter(g => !gatesRun.includes(g));

    // Determine exit code
    const exitCode = evaluation.passed ? 0 : 1;

    return {
      passed: evaluation.passed,
      status: evaluation.status,
      score: evaluation.score,
      summary: evaluation.summary,
      gates: gateResults,
      violations,
      warnings,
      policy: {
        id: policy.id,
        name: policy.name,
      },
      metadata: {
        executionTimeMs: Date.now() - context.startTime,
        filesChecked: context.files.length,
        gatesRun,
        gatesSkipped,
        timestamp: new Date().toISOString(),
        branch: context.options.branch ?? 'main',
        commitSha: context.options.commitSha,
        ci: context.options.ci ?? false,
      },
      exitCode,
    };
  }
}
```


---

## 8. Reporters

### 8.1 Reporter Interface

```typescript
// File: drift/packages/core/src/quality-gates/reporters/reporter-interface.ts

import type { QualityGateResult, OutputFormat, ReporterOptions } from '../types.js';

/**
 * Interface for quality gate reporters.
 */
export interface Reporter {
  /** Reporter ID */
  readonly id: string;
  
  /** Format this reporter produces */
  readonly format: OutputFormat;
  
  /**
   * Generate report string from result.
   */
  generate(result: QualityGateResult, options?: ReporterOptions): string;
  
  /**
   * Write report to destination (file, stdout, webhook, etc.).
   */
  write(report: string, options?: ReporterOptions): Promise<void>;
}

/**
 * Base class for reporters.
 */
export abstract class BaseReporter implements Reporter {
  abstract readonly id: string;
  abstract readonly format: OutputFormat;
  
  abstract generate(result: QualityGateResult, options?: ReporterOptions): string;
  
  async write(report: string, options?: ReporterOptions): Promise<void> {
    if (options?.outputPath) {
      const fs = await import('node:fs/promises');
      await fs.writeFile(options.outputPath, report);
    } else {
      console.log(report);
    }
  }
}
```

### 8.2 JSON Reporter

```typescript
// File: drift/packages/core/src/quality-gates/reporters/json-reporter.ts

import { BaseReporter } from './reporter-interface.js';
import type { QualityGateResult, ReporterOptions } from '../types.js';

/**
 * JSON reporter for machine-readable output.
 */
export class JsonReporter extends BaseReporter {
  readonly id = 'json';
  readonly format = 'json' as const;

  generate(result: QualityGateResult, options?: ReporterOptions): string {
    const output = {
      passed: result.passed,
      status: result.status,
      score: result.score,
      summary: result.summary,
      gates: Object.fromEntries(
        Object.entries(result.gates).map(([id, gate]) => [
          id,
          {
            passed: gate.passed,
            status: gate.status,
            score: gate.score,
            summary: gate.summary,
            violationCount: gate.violations.length,
            warningCount: gate.warnings.length,
          },
        ])
      ),
      violations: result.violations.map(v => ({
        id: v.id,
        gateId: v.gateId,
        severity: v.severity,
        file: v.file,
        line: v.line,
        column: v.column,
        message: v.message,
        ruleId: v.ruleId,
      })),
      warnings: result.warnings,
      policy: result.policy,
      metadata: result.metadata,
      exitCode: result.exitCode,
    };

    return JSON.stringify(output, null, 2);
  }
}
```

### 8.3 GitHub Reporter

```typescript
// File: drift/packages/core/src/quality-gates/reporters/github-reporter.ts

import { BaseReporter } from './reporter-interface.js';
import type { QualityGateResult, ReporterOptions, GateViolation } from '../types.js';

/**
 * GitHub Actions reporter with annotations.
 */
export class GitHubReporter extends BaseReporter {
  readonly id = 'github';
  readonly format = 'github' as const;

  generate(result: QualityGateResult, options?: ReporterOptions): string {
    const lines: string[] = [];

    // Output annotations for violations
    for (const violation of result.violations) {
      lines.push(this.formatAnnotation(violation));
    }

    // Output summary
    lines.push('');
    lines.push(`::group::Quality Gate Summary`);
    lines.push(`Status: ${result.passed ? '✅ Passed' : '❌ Failed'}`);
    lines.push(`Score: ${result.score}/100`);
    lines.push(`Policy: ${result.policy.name}`);
    lines.push('');

    // Gate results
    for (const [gateId, gate] of Object.entries(result.gates)) {
      const icon = gate.passed ? '✅' : gate.status === 'warned' ? '⚠️' : '❌';
      lines.push(`${icon} ${gate.gateName}: ${gate.score}/100 - ${gate.summary}`);
    }

    lines.push('::endgroup::');

    // Set output variables
    lines.push('');
    lines.push(`::set-output name=passed::${result.passed}`);
    lines.push(`::set-output name=score::${result.score}`);
    lines.push(`::set-output name=violations::${result.violations.length}`);

    return lines.join('\n');
  }

  private formatAnnotation(violation: GateViolation): string {
    const level = violation.severity === 'error' ? 'error' : 
                  violation.severity === 'warning' ? 'warning' : 'notice';
    
    return `::${level} file=${violation.file},line=${violation.line},col=${violation.column}::${violation.message}`;
  }
}
```

### 8.4 GitLab Reporter

```typescript
// File: drift/packages/core/src/quality-gates/reporters/gitlab-reporter.ts

import { BaseReporter } from './reporter-interface.js';
import type { QualityGateResult, ReporterOptions } from '../types.js';

/**
 * GitLab Code Quality reporter.
 */
export class GitLabReporter extends BaseReporter {
  readonly id = 'gitlab';
  readonly format = 'gitlab' as const;

  generate(result: QualityGateResult, options?: ReporterOptions): string {
    // GitLab Code Quality format
    const issues = result.violations.map(v => ({
      description: v.message,
      check_name: v.ruleId,
      fingerprint: v.id,
      severity: this.mapSeverity(v.severity),
      location: {
        path: v.file,
        lines: {
          begin: v.line,
          end: v.endLine ?? v.line,
        },
      },
    }));

    return JSON.stringify(issues, null, 2);
  }

  private mapSeverity(severity: string): string {
    switch (severity) {
      case 'error': return 'critical';
      case 'warning': return 'major';
      case 'info': return 'minor';
      default: return 'info';
    }
  }
}
```

### 8.5 SARIF Reporter

```typescript
// File: drift/packages/core/src/quality-gates/reporters/sarif-reporter.ts

import { BaseReporter } from './reporter-interface.js';
import type { QualityGateResult, ReporterOptions, GateViolation } from '../types.js';

/**
 * SARIF (Static Analysis Results Interchange Format) reporter.
 * Compatible with GitHub Security, VS Code, and other tools.
 */
export class SarifReporter extends BaseReporter {
  readonly id = 'sarif';
  readonly format = 'sarif' as const;

  generate(result: QualityGateResult, options?: ReporterOptions): string {
    const sarif = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'Drift Quality Gates',
              version: '1.0.0',
              informationUri: 'https://driftscan.dev',
              rules: this.buildRules(result),
            },
          },
          results: this.buildResults(result),
          invocations: [
            {
              executionSuccessful: true,
              endTimeUtc: result.metadata.timestamp,
            },
          ],
        },
      ],
    };

    return JSON.stringify(sarif, null, 2);
  }

  private buildRules(result: QualityGateResult): any[] {
    const ruleIds = new Set(result.violations.map(v => v.ruleId));
    return Array.from(ruleIds).map(ruleId => ({
      id: ruleId,
      name: ruleId,
      shortDescription: {
        text: `Quality gate rule: ${ruleId}`,
      },
    }));
  }

  private buildResults(result: QualityGateResult): any[] {
    return result.violations.map(v => ({
      ruleId: v.ruleId,
      level: this.mapLevel(v.severity),
      message: {
        text: v.message,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: v.file,
            },
            region: {
              startLine: v.line,
              startColumn: v.column,
              endLine: v.endLine ?? v.line,
              endColumn: v.endColumn ?? v.column,
            },
          },
        },
      ],
    }));
  }

  private mapLevel(severity: string): string {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'note';
      default: return 'none';
    }
  }
}
```

### 8.6 Text Reporter

```typescript
// File: drift/packages/core/src/quality-gates/reporters/text-reporter.ts

import { BaseReporter } from './reporter-interface.js';
import type { QualityGateResult, ReporterOptions } from '../types.js';

/**
 * Human-readable text reporter.
 */
export class TextReporter extends BaseReporter {
  readonly id = 'text';
  readonly format = 'text' as const;

  generate(result: QualityGateResult, options?: ReporterOptions): string {
    const lines: string[] = [];
    const verbose = options?.verbose ?? false;

    // Header
    lines.push('');
    lines.push('═'.repeat(60));
    lines.push('  DRIFT QUALITY GATE RESULTS');
    lines.push('═'.repeat(60));
    lines.push('');

    // Overall status
    const statusIcon = result.passed ? '✅' : '❌';
    lines.push(`  Status:  ${statusIcon} ${result.status.toUpperCase()}`);
    lines.push(`  Score:   ${result.score}/100`);
    lines.push(`  Policy:  ${result.policy.name}`);
    lines.push('');

    // Gate results
    lines.push('─'.repeat(60));
    lines.push('  GATE RESULTS');
    lines.push('─'.repeat(60));
    lines.push('');

    for (const [gateId, gate] of Object.entries(result.gates)) {
      const icon = gate.passed ? '✅' : gate.status === 'warned' ? '⚠️' : '❌';
      lines.push(`  ${icon} ${gate.gateName}`);
      lines.push(`     Score: ${gate.score}/100`);
      lines.push(`     ${gate.summary}`);
      
      if (verbose && gate.violations.length > 0) {
        lines.push(`     Violations: ${gate.violations.length}`);
      }
      lines.push('');
    }

    // Violations
    if (result.violations.length > 0) {
      lines.push('─'.repeat(60));
      lines.push('  VIOLATIONS');
      lines.push('─'.repeat(60));
      lines.push('');

      for (const v of result.violations.slice(0, verbose ? undefined : 10)) {
        const icon = v.severity === 'error' ? '❌' : v.severity === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`  ${icon} ${v.file}:${v.line}`);
        lines.push(`     ${v.message}`);
        if (verbose && v.explanation) {
          lines.push(`     ${v.explanation}`);
        }
        lines.push('');
      }

      if (!verbose && result.violations.length > 10) {
        lines.push(`  ... and ${result.violations.length - 10} more violations`);
        lines.push('');
      }
    }

    // Warnings
    if (result.warnings.length > 0) {
      lines.push('─'.repeat(60));
      lines.push('  WARNINGS');
      lines.push('─'.repeat(60));
      lines.push('');

      for (const w of result.warnings) {
        lines.push(`  ⚠️ ${w}`);
      }
      lines.push('');
    }

    // Footer
    lines.push('─'.repeat(60));
    lines.push(`  Files checked: ${result.metadata.filesChecked}`);
    lines.push(`  Gates run: ${result.metadata.gatesRun.length}`);
    lines.push(`  Time: ${result.metadata.executionTimeMs}ms`);
    lines.push('═'.repeat(60));
    lines.push('');

    return lines.join('\n');
  }
}
```


---

## 9. CLI Integration

### 9.1 Gate Command

```typescript
// File: drift/packages/cli/src/commands/gate.ts

import { Command } from 'commander';
import chalk from 'chalk';
import {
  GateOrchestrator,
  TextReporter,
  JsonReporter,
  GitHubReporter,
  GitLabReporter,
  SarifReporter,
  type QualityGateOptions,
  type QualityGateResult,
  type OutputFormat,
} from 'driftdetect-core';
import { createSpinner, status } from '../ui/spinner.js';

export interface GateCommandOptions {
  policy?: string;
  gates?: string;
  format?: OutputFormat;
  ci?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  staged?: boolean;
  output?: string;
  failOn?: 'error' | 'warning' | 'none';
}

/**
 * Gate command implementation.
 */
async function gateAction(options: GateCommandOptions): Promise<void> {
  const rootDir = process.cwd();
  const isCi = options.ci ?? !!process.env['CI'];
  const format = options.format ?? (isCi ? 'json' : 'text');
  const showProgress = !isCi && format === 'text';

  if (showProgress) {
    console.log();
    console.log(chalk.bold('🔍 Drift Quality Gate'));
    console.log();
  }

  // Build options
  const gateOptions: QualityGateOptions = {
    projectRoot: rootDir,
    policy: options.policy,
    gates: options.gates?.split(',').map(g => g.trim()) as any,
    format,
    ci: isCi,
    verbose: options.verbose,
    dryRun: options.dryRun,
    branch: process.env['GITHUB_HEAD_REF'] ?? process.env['CI_COMMIT_BRANCH'] ?? 'main',
    baseBranch: process.env['GITHUB_BASE_REF'] ?? process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'],
    commitSha: process.env['GITHUB_SHA'] ?? process.env['CI_COMMIT_SHA'],
  };

  // Dry run
  if (options.dryRun) {
    console.log(chalk.yellow('Dry run mode - showing what would be checked:'));
    console.log(JSON.stringify(gateOptions, null, 2));
    return;
  }

  // Run quality gates
  const spinner = showProgress ? createSpinner('Running quality gates...') : null;
  spinner?.start();

  try {
    const orchestrator = new GateOrchestrator(rootDir);
    const result = await orchestrator.run(gateOptions);

    spinner?.stop();

    // Generate report
    const reporter = getReporter(format);
    const report = reporter.generate(result, { verbose: options.verbose });

    // Output report
    if (options.output) {
      await reporter.write(report, { outputPath: options.output });
      if (showProgress) {
        status.success(`Report written to ${options.output}`);
      }
    } else {
      console.log(report);
    }

    // Determine exit code
    const exitCode = determineExitCode(result, options.failOn ?? 'error');
    
    if (showProgress) {
      if (exitCode === 0) {
        status.success('Quality gate passed!');
      } else {
        status.error('Quality gate failed');
      }
    }

    process.exit(exitCode);
  } catch (error) {
    spinner?.fail('Quality gate failed');
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * Get reporter for format.
 */
function getReporter(format: OutputFormat) {
  switch (format) {
    case 'json': return new JsonReporter();
    case 'github': return new GitHubReporter();
    case 'gitlab': return new GitLabReporter();
    case 'sarif': return new SarifReporter();
    case 'text':
    default: return new TextReporter();
  }
}

/**
 * Determine exit code based on result and fail-on setting.
 */
function determineExitCode(
  result: QualityGateResult,
  failOn: 'error' | 'warning' | 'none'
): number {
  if (failOn === 'none') return 0;
  
  if (failOn === 'warning') {
    return result.status === 'passed' ? 0 : 1;
  }
  
  // failOn === 'error'
  return result.passed ? 0 : 1;
}

/**
 * Create the gate command.
 */
export function createGateCommand(): Command {
  return new Command('gate')
    .description('Run quality gates on code changes')
    .option('-p, --policy <policy>', 'Policy to use (default, strict, relaxed, or custom)')
    .option('-g, --gates <gates>', 'Specific gates to run (comma-separated)')
    .option('-f, --format <format>', 'Output format (text, json, github, gitlab, sarif)', 'text')
    .option('--ci', 'Run in CI mode')
    .option('-v, --verbose', 'Verbose output')
    .option('--dry-run', 'Show what would be checked without running')
    .option('--staged', 'Check only staged files')
    .option('-o, --output <file>', 'Write report to file')
    .option('--fail-on <level>', 'Fail threshold (error, warning, none)', 'error')
    .action(gateAction);
}
```


---

## 10. MCP Integration

### 10.1 Quality Gate MCP Tool

```typescript
// File: drift/packages/mcp/src/tools/analysis/quality-gate.ts

import {
  GateOrchestrator,
  type QualityGateOptions,
  type QualityGateResult,
  type GateId,
} from 'driftdetect-core';
import { createResponseBuilder, Errors } from '../../infrastructure/index.js';

// ============================================================================
// Types
// ============================================================================

export interface QualityGateArgs {
  /** Files to check (defaults to staged/changed files) */
  files?: string[];
  
  /** Policy to use */
  policy?: string;
  
  /** Specific gates to run */
  gates?: GateId[];
  
  /** Include remediation suggestions */
  includeRemediation?: boolean;
  
  /** Verbose output */
  verbose?: boolean;
}

// ============================================================================
// Handler
// ============================================================================

export async function handleQualityGate(
  projectRoot: string,
  args: QualityGateArgs
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const builder = createResponseBuilder<{ result: QualityGateResult }>();

  try {
    // Build options
    const options: QualityGateOptions = {
      projectRoot,
      files: args.files,
      policy: args.policy,
      gates: args.gates,
      verbose: args.verbose,
      ci: false,
    };

    // Run quality gates
    const orchestrator = new GateOrchestrator(projectRoot);
    const result = await orchestrator.run(options);

    // Build summary
    const statusEmoji = result.passed ? '✅' : '❌';
    let summaryText = `${statusEmoji} Quality Gate ${result.status.toUpperCase()}: `;
    summaryText += `Score ${result.score}/100. `;
    summaryText += `${result.violations.length} violations across ${result.metadata.gatesRun.length} gates.`;

    // Build hints
    const hints: any = {
      nextActions: [],
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
    };

    if (!result.passed) {
      hints.nextActions.push('Review violations and fix issues');
      hints.nextActions.push('Run `drift gate --verbose` for details');
    }

    if (args.includeRemediation && result.violations.length > 0) {
      hints.nextActions.push('Use drift_suggest_changes for fix suggestions');
    }

    return builder
      .withSummary(summaryText)
      .withData({ result })
      .withHints(hints)
      .buildContent();
  } catch (error) {
    return builder
      .withError(error instanceof Error ? error.message : String(error))
      .buildContent();
  }
}

// ============================================================================
// Tool Definition
// ============================================================================

export const qualityGateTool = {
  name: 'drift_quality_gate',
  description: `Run quality gates on code changes. Checks pattern compliance, constraint verification, regression detection, impact simulation, and security boundaries.

Returns pass/fail status with detailed results for each gate.

Use this BEFORE committing or merging to ensure code quality.`,
  inputSchema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Files to check (defaults to staged/changed files)',
      },
      policy: {
        type: 'string',
        description: 'Policy to use: default, strict, relaxed, or custom policy ID',
      },
      gates: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'pattern-compliance',
            'constraint-verification',
            'regression-detection',
            'impact-simulation',
            'security-boundary',
            'custom-rules',
          ],
        },
        description: 'Specific gates to run (defaults to all enabled in policy)',
      },
      includeRemediation: {
        type: 'boolean',
        description: 'Include remediation suggestions for violations',
      },
      verbose: {
        type: 'boolean',
        description: 'Include detailed information',
      },
    },
  },
};
```

---

## 11. Dashboard Integration

### 11.1 Quality Gates Tab Component

```typescript
// File: drift/packages/dashboard/src/client/components/QualityGatesTab.tsx

import React, { useState, useEffect } from 'react';

interface GateResult {
  gateId: string;
  gateName: string;
  passed: boolean;
  score: number;
  summary: string;
  violations: number;
}

interface QualityGateRun {
  id: string;
  timestamp: string;
  branch: string;
  passed: boolean;
  score: number;
  gates: GateResult[];
  violations: number;
}

export function QualityGatesTab() {
  const [runs, setRuns] = useState<QualityGateRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<QualityGateRun | null>(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  async function fetchRuns() {
    try {
      const response = await fetch('/api/quality-gates/runs');
      const data = await response.json();
      setRuns(data.runs);
      if (data.runs.length > 0) {
        setSelectedRun(data.runs[0]);
      }
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading quality gate history...</div>;
  }

  return (
    <div className="quality-gates-tab">
      <div className="header">
        <h2>Quality Gates</h2>
        <div className="stats">
          <div className="stat">
            <span className="label">Pass Rate</span>
            <span className="value">
              {calculatePassRate(runs)}%
            </span>
          </div>
          <div className="stat">
            <span className="label">Avg Score</span>
            <span className="value">
              {calculateAvgScore(runs)}
            </span>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="runs-list">
          <h3>Recent Runs</h3>
          {runs.map(run => (
            <div
              key={run.id}
              className={`run-item ${run.passed ? 'passed' : 'failed'} ${selectedRun?.id === run.id ? 'selected' : ''}`}
              onClick={() => setSelectedRun(run)}
            >
              <span className="status">{run.passed ? '✅' : '❌'}</span>
              <span className="branch">{run.branch}</span>
              <span className="score">{run.score}/100</span>
              <span className="time">{formatTime(run.timestamp)}</span>
            </div>
          ))}
        </div>

        {selectedRun && (
          <div className="run-details">
            <h3>Run Details</h3>
            <div className="summary">
              <div className={`status-badge ${selectedRun.passed ? 'passed' : 'failed'}`}>
                {selectedRun.passed ? 'PASSED' : 'FAILED'}
              </div>
              <div className="score-display">
                <span className="score">{selectedRun.score}</span>
                <span className="max">/100</span>
              </div>
            </div>

            <div className="gates">
              <h4>Gate Results</h4>
              {selectedRun.gates.map(gate => (
                <div key={gate.gateId} className={`gate ${gate.passed ? 'passed' : 'failed'}`}>
                  <span className="icon">{gate.passed ? '✅' : '❌'}</span>
                  <span className="name">{gate.gateName}</span>
                  <span className="score">{gate.score}/100</span>
                  <span className="summary">{gate.summary}</span>
                </div>
              ))}
            </div>

            {selectedRun.violations > 0 && (
              <div className="violations-summary">
                <span className="count">{selectedRun.violations}</span>
                <span className="label">violations</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function calculatePassRate(runs: QualityGateRun[]): number {
  if (runs.length === 0) return 100;
  const passed = runs.filter(r => r.passed).length;
  return Math.round((passed / runs.length) * 100);
}

function calculateAvgScore(runs: QualityGateRun[]): number {
  if (runs.length === 0) return 100;
  const total = runs.reduce((sum, r) => sum + r.score, 0);
  return Math.round(total / runs.length);
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}
```


---

## 12. Storage & Persistence

### 12.1 Gate Run Store

```typescript
// File: drift/packages/core/src/quality-gates/store/gate-run-store.ts

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { QualityGateResult, GateRunRecord, GateId } from '../types.js';

/**
 * Stores quality gate run history.
 */
export class GateRunStore {
  private runsDir: string;
  private maxRuns: number;

  constructor(projectRoot: string, maxRuns = 100) {
    this.runsDir = path.join(projectRoot, '.drift', 'quality-gates', 'history', 'runs');
    this.maxRuns = maxRuns;
  }

  /**
   * Save a gate run result.
   */
  async save(result: QualityGateResult): Promise<string> {
    await fs.mkdir(this.runsDir, { recursive: true });

    const record: GateRunRecord = {
      id: `run-${Date.now()}`,
      timestamp: result.metadata.timestamp,
      branch: result.metadata.branch,
      commitSha: result.metadata.commitSha,
      policyId: result.policy.id,
      passed: result.passed,
      score: result.score,
      gates: Object.fromEntries(
        Object.entries(result.gates).map(([id, gate]) => [
          id,
          { passed: gate.passed, score: gate.score },
        ])
      ) as Record<GateId, { passed: boolean; score: number }>,
      violationCount: result.violations.length,
      executionTimeMs: result.metadata.executionTimeMs,
      ci: result.metadata.ci,
    };

    const filePath = path.join(this.runsDir, `${record.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2));

    // Cleanup old runs
    await this.cleanup();

    return record.id;
  }

  /**
   * Get recent runs.
   */
  async getRecent(limit = 20): Promise<GateRunRecord[]> {
    try {
      const files = await fs.readdir(this.runsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

      const runs: GateRunRecord[] = [];
      for (const file of jsonFiles.slice(0, limit)) {
        const content = await fs.readFile(path.join(this.runsDir, file), 'utf-8');
        runs.push(JSON.parse(content));
      }

      return runs;
    } catch {
      return [];
    }
  }

  /**
   * Get a specific run.
   */
  async get(runId: string): Promise<GateRunRecord | null> {
    try {
      const filePath = path.join(this.runsDir, `${runId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get runs for a branch.
   */
  async getByBranch(branch: string, limit = 20): Promise<GateRunRecord[]> {
    const all = await this.getRecent(this.maxRuns);
    return all.filter(r => r.branch === branch).slice(0, limit);
  }

  /**
   * Cleanup old runs.
   */
  private async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.runsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort();

      if (jsonFiles.length > this.maxRuns) {
        const toDelete = jsonFiles.slice(0, jsonFiles.length - this.maxRuns);
        for (const file of toDelete) {
          await fs.unlink(path.join(this.runsDir, file));
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
```

### 12.2 Snapshot Store

```typescript
// File: drift/packages/core/src/quality-gates/store/snapshot-store.ts

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { HealthSnapshot } from '../types.js';

/**
 * Stores health snapshots for regression detection.
 */
export class SnapshotStore {
  private snapshotsDir: string;
  private maxSnapshotsPerBranch: number;

  constructor(projectRoot: string, maxSnapshotsPerBranch = 50) {
    this.snapshotsDir = path.join(projectRoot, '.drift', 'quality-gates', 'snapshots');
    this.maxSnapshotsPerBranch = maxSnapshotsPerBranch;
  }

  /**
   * Save a health snapshot.
   */
  async save(snapshot: HealthSnapshot): Promise<void> {
    const branchDir = path.join(this.snapshotsDir, this.sanitizeBranch(snapshot.branch));
    await fs.mkdir(branchDir, { recursive: true });

    const filePath = path.join(branchDir, `${snapshot.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2));

    // Cleanup old snapshots
    await this.cleanup(snapshot.branch);
  }

  /**
   * Get the latest snapshot for a branch.
   */
  async getLatest(branch: string): Promise<HealthSnapshot | null> {
    try {
      const branchDir = path.join(this.snapshotsDir, this.sanitizeBranch(branch));
      const files = await fs.readdir(branchDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

      if (jsonFiles.length === 0) return null;

      const content = await fs.readFile(path.join(branchDir, jsonFiles[0]), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get snapshot by commit SHA.
   */
  async getByCommit(branch: string, commitSha: string): Promise<HealthSnapshot | null> {
    try {
      const branchDir = path.join(this.snapshotsDir, this.sanitizeBranch(branch));
      const files = await fs.readdir(branchDir);

      for (const file of files) {
        const content = await fs.readFile(path.join(branchDir, file), 'utf-8');
        const snapshot = JSON.parse(content) as HealthSnapshot;
        if (snapshot.commitSha === commitSha) {
          return snapshot;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get snapshots for a branch.
   */
  async getByBranch(branch: string, limit = 10): Promise<HealthSnapshot[]> {
    try {
      const branchDir = path.join(this.snapshotsDir, this.sanitizeBranch(branch));
      const files = await fs.readdir(branchDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

      const snapshots: HealthSnapshot[] = [];
      for (const file of jsonFiles.slice(0, limit)) {
        const content = await fs.readFile(path.join(branchDir, file), 'utf-8');
        snapshots.push(JSON.parse(content));
      }

      return snapshots;
    } catch {
      return [];
    }
  }

  /**
   * Sanitize branch name for filesystem.
   */
  private sanitizeBranch(branch: string): string {
    return branch.replace(/[/\\:*?"<>|]/g, '-');
  }

  /**
   * Cleanup old snapshots.
   */
  private async cleanup(branch: string): Promise<void> {
    try {
      const branchDir = path.join(this.snapshotsDir, this.sanitizeBranch(branch));
      const files = await fs.readdir(branchDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort();

      if (jsonFiles.length > this.maxSnapshotsPerBranch) {
        const toDelete = jsonFiles.slice(0, jsonFiles.length - this.maxSnapshotsPerBranch);
        for (const file of toDelete) {
          await fs.unlink(path.join(branchDir, file));
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
```


---

## 13. Testing Strategy

### 13.1 Unit Tests

Each component should have comprehensive unit tests:

```typescript
// File: drift/packages/core/src/quality-gates/__tests__/gates/pattern-compliance.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternComplianceGate } from '../../gates/pattern-compliance/index.js';
import type { GateInput, PatternComplianceConfig } from '../../types.js';

describe('PatternComplianceGate', () => {
  let gate: PatternComplianceGate;

  beforeEach(() => {
    gate = new PatternComplianceGate();
  });

  describe('getDefaultConfig', () => {
    it('should return valid default config', () => {
      const config = gate.getDefaultConfig();
      expect(config.enabled).toBe(true);
      expect(config.minComplianceRate).toBe(80);
      expect(config.maxNewOutliers).toBe(0);
    });
  });

  describe('validateConfig', () => {
    it('should accept valid config', () => {
      const config: PatternComplianceConfig = {
        enabled: true,
        blocking: true,
        minComplianceRate: 80,
        maxNewOutliers: 0,
        categories: [],
        minPatternConfidence: 0.7,
        approvedOnly: true,
      };
      const result = gate.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid compliance rate', () => {
      const config: PatternComplianceConfig = {
        enabled: true,
        blocking: true,
        minComplianceRate: 150, // Invalid
        maxNewOutliers: 0,
        categories: [],
        minPatternConfidence: 0.7,
        approvedOnly: true,
      };
      const result = gate.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('minComplianceRate must be between 0 and 100');
    });
  });

  describe('execute', () => {
    it('should pass when no patterns exist', async () => {
      const input: GateInput = {
        files: ['src/test.ts'],
        projectRoot: '/test',
        branch: 'main',
        isCI: false,
        config: gate.getDefaultConfig(),
        context: { patterns: [] },
      };

      const result = await gate.execute(input);
      expect(result.passed).toBe(true);
      expect(result.status).toBe('passed');
    });

    it('should fail when compliance is below threshold', async () => {
      const input: GateInput = {
        files: ['src/test.ts'],
        projectRoot: '/test',
        branch: 'main',
        isCI: false,
        config: {
          ...gate.getDefaultConfig(),
          minComplianceRate: 90,
        },
        context: {
          patterns: [
            {
              id: 'test-pattern',
              name: 'Test Pattern',
              status: 'approved',
              confidence: 0.8,
              category: 'api',
              locations: [{ file: 'src/a.ts', line: 1 }],
              outliers: [
                { file: 'src/test.ts', line: 1, reason: 'Does not match' },
                { file: 'src/test.ts', line: 10, reason: 'Does not match' },
              ],
            },
          ],
        },
      };

      const result = await gate.execute(input);
      expect(result.passed).toBe(false);
    });
  });
});
```

### 13.2 Integration Tests

```typescript
// File: drift/packages/core/src/quality-gates/__tests__/integration.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { GateOrchestrator } from '../orchestrator/index.js';

describe('Quality Gates Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'drift-test-'));
    
    // Create .drift directory structure
    await fs.mkdir(path.join(tempDir, '.drift', 'patterns', 'approved'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '.drift', 'quality-gates', 'policies'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should run all gates with default policy', async () => {
    // Create a test file
    await fs.writeFile(path.join(tempDir, 'test.ts'), 'export const x = 1;');

    const orchestrator = new GateOrchestrator(tempDir);
    const result = await orchestrator.run({
      projectRoot: tempDir,
      files: ['test.ts'],
    });

    expect(result).toBeDefined();
    expect(result.passed).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('should respect policy configuration', async () => {
    const orchestrator = new GateOrchestrator(tempDir);
    const result = await orchestrator.run({
      projectRoot: tempDir,
      files: ['test.ts'],
      policy: 'strict',
    });

    expect(result.policy.id).toBe('strict');
  });

  it('should run only specified gates', async () => {
    const orchestrator = new GateOrchestrator(tempDir);
    const result = await orchestrator.run({
      projectRoot: tempDir,
      files: ['test.ts'],
      gates: ['pattern-compliance'],
    });

    expect(result.metadata.gatesRun).toContain('pattern-compliance');
    expect(result.metadata.gatesRun).not.toContain('constraint-verification');
  });
});
```

### 13.3 E2E Tests

```typescript
// File: drift/packages/cli/src/commands/__tests__/gate.e2e.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

describe('drift gate E2E', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'drift-e2e-'));
    
    // Initialize drift
    execSync('drift init', { cwd: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should run gate command successfully', () => {
    const result = execSync('drift gate --format json', {
      cwd: tempDir,
      encoding: 'utf-8',
    });

    const output = JSON.parse(result);
    expect(output.passed).toBeDefined();
    expect(output.score).toBeDefined();
  });

  it('should output GitHub format', () => {
    const result = execSync('drift gate --format github', {
      cwd: tempDir,
      encoding: 'utf-8',
    });

    expect(result).toContain('::group::');
  });

  it('should respect --fail-on option', () => {
    // This should not throw even if there are warnings
    execSync('drift gate --fail-on error', {
      cwd: tempDir,
      encoding: 'utf-8',
    });
  });
});
```


---

## 14. Implementation Order

### Phase 1: Foundation (Week 1-2)

**Goal:** Core infrastructure and Pattern Compliance gate working end-to-end.

1. **Types** (`types.ts`)
   - All type definitions
   - Enums and constants

2. **Base Infrastructure**
   - `gates/base-gate.ts`
   - `gates/gate-interface.ts`
   - `orchestrator/gate-registry.ts`

3. **Pattern Compliance Gate**
   - `gates/pattern-compliance/pattern-compliance-gate.ts`
   - `gates/pattern-compliance/compliance-calculator.ts`
   - `gates/pattern-compliance/outlier-detector.ts`

4. **Basic Orchestrator**
   - `orchestrator/gate-orchestrator.ts` (simplified)
   - `orchestrator/result-aggregator.ts`

5. **CLI Command**
   - `cli/commands/gate.ts`

6. **Basic Reporters**
   - `reporters/text-reporter.ts`
   - `reporters/json-reporter.ts`

### Phase 2: Policy Engine (Week 3-4)

**Goal:** Policy-based configuration and CI integration.

1. **Policy System**
   - `policy/policy-types.ts`
   - `policy/policy-loader.ts`
   - `policy/policy-evaluator.ts`
   - `policy/policy-validator.ts`
   - `policy/default-policies.ts`

2. **CI Reporters**
   - `reporters/github-reporter.ts`
   - `reporters/gitlab-reporter.ts`
   - `reporters/sarif-reporter.ts`

3. **Parallel Execution**
   - `orchestrator/parallel-executor.ts`

4. **Storage**
   - `store/gate-run-store.ts`

### Phase 3: Advanced Gates (Week 5-6)

**Goal:** Constraint Verification and Regression Detection gates.

1. **Constraint Verification Gate**
   - `gates/constraint-verification/constraint-verification-gate.ts`
   - `gates/constraint-verification/constraint-evaluator.ts`
   - `gates/constraint-verification/violation-formatter.ts`

2. **Regression Detection Gate**
   - `gates/regression-detection/regression-detection-gate.ts`
   - `gates/regression-detection/snapshot-comparator.ts`
   - `gates/regression-detection/delta-calculator.ts`
   - `gates/regression-detection/regression-classifier.ts`

3. **Snapshot Storage**
   - `store/snapshot-store.ts`

### Phase 4: Impact & Security Gates (Week 7-8)

**Goal:** Impact Simulation and Security Boundary gates.

1. **Impact Simulation Gate**
   - `gates/impact-simulation/impact-simulation-gate.ts`
   - `gates/impact-simulation/blast-radius-analyzer.ts`
   - `gates/impact-simulation/risk-assessor.ts`

2. **Security Boundary Gate**
   - `gates/security-boundary/security-boundary-gate.ts`
   - `gates/security-boundary/access-path-validator.ts`
   - `gates/security-boundary/auth-chain-checker.ts`

### Phase 5: Custom Rules & MCP (Week 9-10)

**Goal:** Custom Rules gate and MCP integration.

1. **Custom Rules Gate**
   - `gates/custom-rules/custom-rules-gate.ts`
   - `gates/custom-rules/rule-parser.ts`
   - `gates/custom-rules/rule-evaluator.ts`
   - `gates/custom-rules/built-in-rules.ts`

2. **MCP Integration**
   - `mcp/tools/analysis/quality-gate.ts`

3. **Dashboard Integration**
   - `dashboard/components/QualityGatesTab.tsx`
   - `dashboard/server/quality-gates-api.ts`

### Phase 6: Polish & Documentation (Week 11-12)

**Goal:** Production-ready release.

1. **Comprehensive Testing**
   - Unit tests for all components
   - Integration tests
   - E2E tests

2. **Documentation**
   - Wiki pages
   - CLI help text
   - Example policies

3. **Performance Optimization**
   - Caching
   - Lazy loading
   - Parallel execution tuning

---

## 15. File-by-File Specification

### 15.1 Index Files

Each directory should have an `index.ts` that exports public API:

```typescript
// File: drift/packages/core/src/quality-gates/index.ts

// Types
export * from './types.js';

// Orchestrator
export { GateOrchestrator } from './orchestrator/index.js';
export { GateRegistry } from './orchestrator/index.js';

// Gates
export { PatternComplianceGate } from './gates/pattern-compliance/index.js';
export { ConstraintVerificationGate } from './gates/constraint-verification/index.js';
export { RegressionDetectionGate } from './gates/regression-detection/index.js';
export { ImpactSimulationGate } from './gates/impact-simulation/index.js';
export { SecurityBoundaryGate } from './gates/security-boundary/index.js';
export { CustomRulesGate } from './gates/custom-rules/index.js';

// Policy
export { PolicyLoader } from './policy/index.js';
export { PolicyEvaluator } from './policy/index.js';
export { DEFAULT_POLICIES } from './policy/index.js';

// Reporters
export { TextReporter } from './reporters/index.js';
export { JsonReporter } from './reporters/index.js';
export { GitHubReporter } from './reporters/index.js';
export { GitLabReporter } from './reporters/index.js';
export { SarifReporter } from './reporters/index.js';

// Store
export { GateRunStore } from './store/index.js';
export { SnapshotStore } from './store/index.js';

// Factory function
export function createQualityGateOrchestrator(projectRoot: string): GateOrchestrator {
  return new GateOrchestrator(projectRoot);
}
```

### 15.2 Core Package Export

Add to `drift/packages/core/src/index.ts`:

```typescript
// Quality Gates
export * from './quality-gates/index.js';
```

---

## Appendix A: CI Configuration Examples

### GitHub Actions

```yaml
# .github/workflows/drift-quality-gate.yml
name: Drift Quality Gate

on:
  pull_request:
    branches: [main, develop]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Drift
        run: npm install -g driftdetect

      - name: Run Quality Gate
        id: drift-gate
        run: drift gate --format github --output gate-results.json
        continue-on-error: true

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: drift-gate-results
          path: gate-results.json

      - name: Check Result
        if: steps.drift-gate.outcome == 'failure'
        run: exit 1
```

### GitLab CI

```yaml
# .gitlab-ci.yml
drift-quality-gate:
  stage: test
  image: node:20
  before_script:
    - npm install -g driftdetect
  script:
    - drift gate --format gitlab --output gl-code-quality-report.json
  artifacts:
    reports:
      codequality: gl-code-quality-report.json
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

---

## Appendix B: Example Custom Rules

```json
{
  "id": "require-test-files",
  "name": "Require Test Files",
  "description": "Every source file in src/ must have a corresponding test file",
  "severity": "warning",
  "enabled": true,
  "tags": ["testing"],
  "condition": {
    "type": "file-pattern",
    "forEachFile": "src/**/*.ts",
    "correspondingFile": "src/**/*.test.ts"
  },
  "message": "Missing test file for {file}"
}
```

```json
{
  "id": "no-direct-db-in-controllers",
  "name": "No Direct DB in Controllers",
  "description": "Controller files should not import database modules directly",
  "severity": "error",
  "enabled": true,
  "tags": ["architecture"],
  "condition": {
    "type": "dependency",
    "from": "**/controllers/**/*.ts",
    "cannotImport": "**/database/**"
  },
  "message": "Controllers should use services, not direct database access"
}
```

---

**END OF SPECIFICATION**

This document provides a complete, implementable specification for the Drift Enterprise Quality Gates system. Follow the implementation order and file specifications exactly for consistent results.
