/**
 * Drift CI Agent Types - Enterprise Edition
 * 
 * Comprehensive type definitions for the autonomous CI agent
 * that leverages ALL Drift analysis capabilities.
 */

// =============================================================================
// PROVIDER TYPES
// =============================================================================

export type CIProvider = 'github' | 'gitlab' | 'bitbucket' | 'azure-devops';

export interface PRContext {
  provider: CIProvider;
  owner: string;
  repo: string;
  prNumber: number;
  baseBranch: string;
  headBranch: string;
  headSha: string;
  baseSha: string;
  author: string;
  title: string;
  description?: string;
  labels?: string[];
  changedFiles: string[];
  additions: number;
  deletions: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface AnalysisConfig {
  // Core Analysis
  patternCheck: boolean;
  constraintVerification: boolean;
  impactAnalysis: boolean;
  securityBoundaries: boolean;
  
  // Extended Analysis
  testCoverage: boolean;
  moduleCoupling: boolean;
  errorHandling: boolean;
  contractMismatch: boolean;
  constantsAnalysis: boolean;
  
  // Advanced Analysis
  decisionMining: boolean;
  patternTrends: boolean;
  speculativeExecution: boolean;
  
  // Behavior
  blockOnViolation: boolean;
  autoFix: boolean;
  updateMemory: boolean;
  
  // Thresholds
  minPatternConfidence: number;
  maxImpactDepth: number;
  minTestCoverage: number;
  maxCouplingScore: number;
}

export interface AgentConfig {
  // Provider settings
  provider: CIProvider;
  token: string;
  
  // Analysis settings
  analysis: AnalysisConfig;
  
  // Quality Gate settings
  qualityGates: QualityGateConfig;
  
  // Memory settings
  memoryEnabled: boolean;
  memoryPath?: string;
  
  // Output settings
  commentOnPR: boolean;
  createCheckRun: boolean;
  failOnViolation: boolean;
  outputFormat: OutputFormat;
}

export interface QualityGateConfig {
  enabled: boolean;
  policy: 'default' | 'strict' | 'relaxed' | 'ci-fast' | string;
  gates: {
    patternCompliance: boolean;
    constraintVerification: boolean;
    regressionDetection: boolean;
    impactSimulation: boolean;
    securityBoundary: boolean;
    customRules: boolean;
  };
}

export type OutputFormat = 'text' | 'json' | 'github' | 'gitlab' | 'sarif';

// =============================================================================
// ANALYSIS RESULTS
// =============================================================================

export interface AnalysisResult {
  status: 'pass' | 'warn' | 'fail';
  summary: string;
  score: number; // 0-100 overall health score
  
  // Core Analysis Results
  patterns: PatternAnalysis;
  constraints: ConstraintAnalysis;
  impact: ImpactAnalysis;
  security: SecurityAnalysis;
  
  // Extended Analysis Results
  tests: TestAnalysis;
  coupling: CouplingAnalysis;
  errors: ErrorAnalysis;
  contracts: ContractAnalysis;
  constants: ConstantsAnalysis;
  
  // Quality Gate Results
  qualityGates: QualityGateResult;
  
  // Suggestions & Learnings
  suggestions: Suggestion[];
  learnings: Learning[];
  
  // Metadata
  metadata: AnalysisMetadata;
}

export interface AnalysisMetadata {
  startTime: number;
  endTime: number;
  durationMs: number;
  filesAnalyzed: number;
  linesAnalyzed: number;
  language: string[];
  frameworks: string[];
}

// =============================================================================
// PATTERN ANALYSIS
// =============================================================================

export interface PatternAnalysis {
  violations: PatternViolation[];
  newPatterns: DetectedPattern[];
  driftScore: number; // 0-100, how much this PR drifts from conventions
  trends: PatternTrend[];
  outlierCount: number;
  complianceRate: number; // 0-100
}

export interface PatternViolation {
  id: string;
  file: string;
  line: number;
  endLine?: number | undefined;
  pattern: string;
  patternId: string;
  category: string;
  expected: string;
  actual: string;
  severity: 'error' | 'warning' | 'info';
  confidence: number;
  autoFixable: boolean;
  suggestedFix?: string | undefined;
  codeSnippet?: string | undefined;
}

export interface DetectedPattern {
  id: string;
  name: string;
  category: string;
  confidence: number;
  locations: Array<{ file: string; line: number }>;
  isNew: boolean;
  description?: string;
}

export interface PatternTrend {
  patternId: string;
  patternName: string;
  direction: 'improving' | 'degrading' | 'stable';
  changePercent: number;
  message: string;
}

// =============================================================================
// CONSTRAINT ANALYSIS
// =============================================================================

export interface ConstraintAnalysis {
  verified: ConstraintResult[];
  violated: ConstraintResult[];
  skipped: ConstraintResult[];
  complianceRate: number; // 0-100
}

export interface ConstraintResult {
  constraintId: string;
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  severity: 'error' | 'warning' | 'info';
  locations: Array<{ file: string; line: number; snippet?: string | undefined }>;
  fix?: ConstraintFix | undefined;
}

export interface ConstraintFix {
  type: 'add' | 'remove' | 'modify';
  description: string;
  autoApplicable: boolean;
}

// =============================================================================
// IMPACT ANALYSIS
// =============================================================================

export interface ImpactAnalysis {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedFiles: AffectedFile[];
  affectedFunctions: AffectedFunction[];
  entryPoints: EntryPoint[];
  breakingChanges: BreakingChange[];
  sensitiveDataPaths: SensitiveDataPath[];
  summary: ImpactSummary;
}

export interface AffectedFile {
  file: string;
  depth: number;
  reason: string;
}

export interface AffectedFunction {
  name: string;
  file: string;
  line: number;
  depth: number;
  isEntryPoint: boolean;
  accessesSensitiveData: boolean;
}

export interface EntryPoint {
  name: string;
  file: string;
  line: number;
  type: 'api' | 'ui' | 'cli' | 'worker' | 'webhook' | 'other';
  method?: string;
  path?: string;
}

export interface BreakingChange {
  type: 'api' | 'contract' | 'behavior' | 'schema';
  description: string;
  affectedConsumers: string[];
  severity: 'warning' | 'error';
}

export interface SensitiveDataPath {
  table: string;
  fields: string[];
  operation: 'read' | 'write' | 'delete';
  entryPoint: string;
  sensitivity: 'credentials' | 'financial' | 'health' | 'pii' | 'internal';
}

export interface ImpactSummary {
  directCallers: number;
  transitiveCallers: number;
  affectedEntryPoints: number;
  affectedDataPaths: number;
  maxDepth: number;
}

// =============================================================================
// SECURITY ANALYSIS
// =============================================================================

export interface SecurityAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100 (higher is better)
  boundaryViolations: BoundaryViolation[];
  sensitiveDataExposure: DataExposure[];
  hardcodedSecrets: HardcodedSecret[];
  envVarIssues: EnvVarIssue[];
  summary: SecuritySummary;
}

export interface BoundaryViolation {
  source: string;
  target: string;
  dataType: string;
  severity: 'warning' | 'error';
  description: string;
  path: string[];
}

export interface DataExposure {
  field: string;
  table: string;
  exposedAt: string;
  sensitivity: string;
  regulation?: string; // GDPR, HIPAA, PCI-DSS, etc.
}

export interface HardcodedSecret {
  file: string;
  line: number;
  type: 'api_key' | 'password' | 'token' | 'private_key' | 'connection_string' | 'other';
  severity: 'warning' | 'error' | 'critical';
  pattern: string;
}

export interface EnvVarIssue {
  variable: string;
  issue: 'missing_default' | 'hardcoded' | 'exposed' | 'sensitive_in_logs';
  file: string;
  line: number;
  severity: 'warning' | 'error';
}

export interface SecuritySummary {
  totalIssues: number;
  criticalIssues: number;
  boundaryViolations: number;
  dataExposures: number;
  secretsFound: number;
}

// =============================================================================
// TEST ANALYSIS
// =============================================================================

export interface TestAnalysis {
  coverageScore: number; // 0-100
  uncoveredFunctions: UncoveredFunction[];
  minimumTestSet: MinimumTest[];
  mockIssues: MockIssue[];
  testQuality: TestQualityMetrics;
}

export interface UncoveredFunction {
  name: string;
  file: string;
  line: number;
  reason: string;
  risk: 'low' | 'medium' | 'high';
  accessesSensitiveData: boolean;
}

export interface MinimumTest {
  testFile: string;
  testName: string;
  coversFunction: string;
  reason: string;
}

export interface MockIssue {
  testFile: string;
  line: number;
  issue: 'over_mocking' | 'missing_mock' | 'stale_mock' | 'implementation_detail';
  description: string;
}

export interface TestQualityMetrics {
  assertionDensity: number;
  mockRatio: number;
  setupComplexity: number;
  isolationScore: number;
}

// =============================================================================
// COUPLING ANALYSIS
// =============================================================================

export interface CouplingAnalysis {
  score: number; // 0-100 (lower is better)
  cycles: DependencyCycle[];
  hotspots: CouplingHotspot[];
  unusedExports: UnusedExport[];
  metrics: CouplingMetrics;
}

export interface DependencyCycle {
  modules: string[];
  severity: 'info' | 'warning' | 'critical';
  breakSuggestion: string;
}

export interface CouplingHotspot {
  module: string;
  afferentCoupling: number;
  efferentCoupling: number;
  instability: number;
  suggestion: string;
}

export interface UnusedExport {
  file: string;
  symbol: string;
  line: number;
}

export interface CouplingMetrics {
  averageAfferent: number;
  averageEfferent: number;
  averageInstability: number;
  cycleCount: number;
}

// =============================================================================
// ERROR HANDLING ANALYSIS
// =============================================================================

export interface ErrorAnalysis {
  score: number; // 0-100 (higher is better)
  gaps: ErrorGap[];
  boundaries: ErrorBoundary[];
  swallowedExceptions: SwallowedException[];
  metrics: ErrorMetrics;
}

export interface ErrorGap {
  file: string;
  line: number;
  function: string;
  issue: 'unhandled_promise' | 'missing_catch' | 'empty_catch' | 'generic_catch';
  severity: 'warning' | 'error';
  suggestion: string;
}

export interface ErrorBoundary {
  file: string;
  line: number;
  type: 'try_catch' | 'error_boundary' | 'middleware' | 'global';
  catches: string[];
  rethrows: boolean;
}

export interface SwallowedException {
  file: string;
  line: number;
  exceptionType: string;
  severity: 'warning' | 'error';
}

export interface ErrorMetrics {
  handledPaths: number;
  unhandledPaths: number;
  boundaryCount: number;
  swallowedCount: number;
}

// =============================================================================
// CONTRACT ANALYSIS
// =============================================================================

export interface ContractAnalysis {
  mismatches: ContractMismatch[];
  discovered: DiscoveredContract[];
  verified: VerifiedContract[];
}

export interface ContractMismatch {
  endpoint: string;
  method: string;
  issue: 'type_mismatch' | 'missing_field' | 'extra_field' | 'status_mismatch';
  backend: { file: string; line: number; type: string };
  frontend: { file: string; line: number; type: string };
  severity: 'warning' | 'error';
}

export interface DiscoveredContract {
  endpoint: string;
  method: string;
  requestType?: string;
  responseType?: string;
  source: 'backend' | 'frontend';
}

export interface VerifiedContract {
  endpoint: string;
  method: string;
  status: 'verified' | 'partial';
}

// =============================================================================
// CONSTANTS ANALYSIS
// =============================================================================

export interface ConstantsAnalysis {
  magicValues: MagicValue[];
  deadConstants: DeadConstant[];
  inconsistencies: ConstantInconsistency[];
  secrets: PotentialSecret[];
}

export interface MagicValue {
  file: string;
  line: number;
  value: string | number;
  suggestion: string;
  severity: 'info' | 'warning';
}

export interface DeadConstant {
  file: string;
  line: number;
  name: string;
  confidence: number;
}

export interface ConstantInconsistency {
  name: string;
  locations: Array<{ file: string; line: number; value: string }>;
  severity: 'warning' | 'error';
}

export interface PotentialSecret {
  file: string;
  line: number;
  name: string;
  pattern: string;
  severity: 'warning' | 'error' | 'critical';
}

// =============================================================================
// QUALITY GATE RESULTS
// =============================================================================

export interface QualityGateResult {
  status: 'pass' | 'warn' | 'fail';
  gates: GateResult[];
  policy: string;
  aggregation: 'all_pass' | 'weighted' | 'any_pass';
}

export interface GateResult {
  id: string;
  name: string;
  status: 'pass' | 'warn' | 'fail' | 'skip';
  score: number;
  violations: number;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// SUGGESTIONS & LEARNINGS
// =============================================================================

export interface Suggestion {
  id: string;
  type: 'pattern' | 'refactor' | 'security' | 'performance' | 'test' | 'error_handling';
  title: string;
  description: string;
  file?: string | undefined;
  line?: number | undefined;
  priority: 'low' | 'medium' | 'high';
  effort: 'trivial' | 'small' | 'medium' | 'large';
  autoFixable: boolean;
  fix?: SuggestedFix | undefined;
}

export interface SuggestedFix {
  type: 'replace' | 'insert' | 'delete';
  file: string;
  startLine: number;
  endLine: number;
  oldCode?: string;
  newCode: string;
}

export interface Learning {
  id: string;
  type: 'pattern' | 'correction' | 'preference' | 'decision';
  content: string;
  confidence: number;
  source: 'pr_merged' | 'pr_rejected' | 'manual' | 'inferred';
  context?: Record<string, unknown>;
}

// =============================================================================
// OUTPUT TYPES
// =============================================================================

export interface CommentPayload {
  body: string;
  status: 'success' | 'failure' | 'pending';
  annotations: Annotation[];
}

export interface Annotation {
  path: string;
  startLine: number;
  endLine: number;
  level: 'notice' | 'warning' | 'failure';
  message: string;
  title: string;
  rawDetails?: string;
}

export interface SARIFOutput {
  version: '2.1.0';
  $schema: string;
  runs: SARIFRun[];
}

export interface SARIFRun {
  tool: { driver: { name: string; version: string; rules: SARIFRule[] } };
  results: SARIFResult[];
}

export interface SARIFRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription?: { text: string };
  defaultConfiguration: { level: 'note' | 'warning' | 'error' };
}

export interface SARIFResult {
  ruleId: string;
  level: 'note' | 'warning' | 'error';
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: { startLine: number; endLine?: number };
    };
  }>;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  // Core Analysis
  patternCheck: true,
  constraintVerification: true,
  impactAnalysis: true,
  securityBoundaries: true,
  
  // Extended Analysis
  testCoverage: true,
  moduleCoupling: true,
  errorHandling: true,
  contractMismatch: true,
  constantsAnalysis: true,
  
  // Advanced Analysis
  decisionMining: false,
  patternTrends: true,
  speculativeExecution: false,
  
  // Behavior
  blockOnViolation: false,
  autoFix: false,
  updateMemory: true,
  
  // Thresholds
  minPatternConfidence: 0.7,
  maxImpactDepth: 10,
  minTestCoverage: 80,
  maxCouplingScore: 50,
};

export const DEFAULT_QUALITY_GATE_CONFIG: QualityGateConfig = {
  enabled: true,
  policy: 'default',
  gates: {
    patternCompliance: true,
    constraintVerification: true,
    regressionDetection: true,
    impactSimulation: true,
    securityBoundary: true,
    customRules: false,
  },
};

export const DEFAULT_CONFIG: AgentConfig = {
  provider: 'github',
  token: '',
  analysis: DEFAULT_ANALYSIS_CONFIG,
  qualityGates: DEFAULT_QUALITY_GATE_CONFIG,
  memoryEnabled: true,
  commentOnPR: true,
  createCheckRun: true,
  failOnViolation: false,
  outputFormat: 'github',
};
