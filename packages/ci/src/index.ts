/**
 * Drift CI - Enterprise-Grade Autonomous CI Agent
 * 
 * The only CI agent that understands your codebase patterns,
 * constraints, and conventions - and enforces them automatically.
 * 
 * Features:
 * - Pattern compliance checking with real drift-core integration
 * - Constraint verification against architectural invariants
 * - Impact analysis using call graph (when available)
 * - Security boundary scanning with secret detection
 * - Test coverage analysis with call graph integration
 * - Module coupling analysis with cycle detection
 * - Error handling gap detection
 * - BE↔FE contract mismatch detection
 * - Quality gates with configurable policies
 * - Pattern trend analysis
 * - Cortex AI memory integration
 * - Multi-provider support (GitHub, GitLab)
 * - SARIF output for IDE integration
 * 
 * @packageDocumentation
 */

// Types (comprehensive)
export * from './types.js';

// Core Analyzer
export { 
  PRAnalyzer,
  type AnalyzerDependencies,
  type IPatternMatcher,
  type IConstraintVerifier,
  type IImpactAnalyzer,
  type IBoundaryScanner,
  type ITestTopology,
  type IModuleCoupling,
  type IErrorHandling,
  type IContractChecker,
  type IConstantsAnalyzer,
  type IQualityGates,
  type ITrendAnalyzer,
  type ICortex,
} from './agent/pr-analyzer.js';

// Providers
export { 
  GitHubProvider, 
  createGitHubProvider, 
  type GitHubProviderConfig,
} from './providers/github.js';

export {
  GitLabProvider,
  createGitLabProvider,
  type GitLabProviderConfig,
} from './providers/gitlab.js';

// Reporters
export { 
  GitHubCommentReporter, 
  createGitHubCommentReporter, 
  type ReporterConfig,
} from './reporters/github-comment.js';

export {
  SARIFReporter,
  createSARIFReporter,
  type SARIFReporterConfig,
} from './reporters/sarif.js';

// Integration
export { 
  createDriftAdapter, 
  type DriftAdapterConfig,
} from './integration/drift-adapter.js';
