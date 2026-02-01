/**
 * PR Analyzer - Enterprise-Grade Analysis Engine
 * 
 * Orchestrates ALL Drift analysis capabilities against PR changes.
 * This is the core engine that makes Drift CI a killer feature.
 */

import type {
  PRContext,
  AnalysisConfig,
  AnalysisResult,
  PatternAnalysis,
  ImpactAnalysis,
  ConstraintAnalysis,
  SecurityAnalysis,
  TestAnalysis,
  CouplingAnalysis,
  ErrorAnalysis,
  ContractAnalysis,
  ConstantsAnalysis,
  QualityGateResult,
  Suggestion,
  Learning,
  AnalysisMetadata,
} from '../types.js';

// =============================================================================
// ANALYZER DEPENDENCIES INTERFACE
// =============================================================================

/**
 * All the Drift capabilities that can be injected into the analyzer.
 * Each interface maps to a drift-core or drift-cortex capability.
 */
export interface AnalyzerDependencies {
  // Core Analysis
  patternMatcher: IPatternMatcher;
  constraintVerifier: IConstraintVerifier;
  impactAnalyzer: IImpactAnalyzer;
  boundaryScanner: IBoundaryScanner;
  
  // Extended Analysis
  testTopology?: ITestTopology | undefined;
  moduleCoupling?: IModuleCoupling | undefined;
  errorHandling?: IErrorHandling | undefined;
  contractChecker?: IContractChecker | undefined;
  constantsAnalyzer?: IConstantsAnalyzer | undefined;
  
  // Advanced Analysis
  qualityGates?: IQualityGates | undefined;
  trendAnalyzer?: ITrendAnalyzer | undefined;
  
  // Memory
  cortex?: ICortex | undefined;
}


// =============================================================================
// CAPABILITY INTERFACES
// =============================================================================

export interface IPatternMatcher {
  matchPatterns(files: string[], rootPath: string): Promise<PatternMatchResult>;
}

export interface IConstraintVerifier {
  verifyConstraints(files: string[], rootPath: string): Promise<ConstraintVerifyResult>;
}

export interface IImpactAnalyzer {
  analyzeImpact(files: string[], rootPath: string, maxDepth: number): Promise<ImpactResult>;
}

export interface IBoundaryScanner {
  scanBoundaries(files: string[], rootPath: string): Promise<BoundaryResult>;
}

export interface ITestTopology {
  analyzeTestCoverage(files: string[], rootPath: string): Promise<TestResult>;
}

export interface IModuleCoupling {
  analyzeCoupling(files: string[], rootPath: string): Promise<CouplingResult>;
}

export interface IErrorHandling {
  analyzeErrorHandling(files: string[], rootPath: string): Promise<ErrorResult>;
}

export interface IContractChecker {
  checkContracts(files: string[], rootPath: string): Promise<ContractResult>;
}

export interface IConstantsAnalyzer {
  analyzeConstants(files: string[], rootPath: string): Promise<ConstantsResult>;
}

export interface IQualityGates {
  runGates(files: string[], rootPath: string, policy: string): Promise<QualityGateResult>;
}

export interface ITrendAnalyzer {
  analyzeTrends(rootPath: string): Promise<TrendResult>;
}

export interface ICortex {
  getContextForFiles(files: string[]): Promise<MemoryContext>;
  recordLearning(learning: Learning): Promise<void>;
}


// =============================================================================
// INTERNAL RESULT TYPES
// =============================================================================

interface PatternMatchResult {
  patterns: Array<{
    id: string;
    name: string;
    category: string;
    confidence: number;
    locations: Array<{ file: string; line: number }>;
  }>;
  outliers: Array<{
    id: string;
    file: string;
    line: number;
    endLine?: number;
    patternId: string;
    patternName: string;
    category: string;
    expected: string;
    actual: string;
    severity: string;
    confidence: number;
    suggestedFix?: string;
  }>;
  complianceRate: number;
}

interface ConstraintVerifyResult {
  satisfied: Array<{
    id: string;
    name: string;
    category: string;
    message: string;
  }>;
  violated: Array<{
    id: string;
    name: string;
    category: string;
    message: string;
    severity: string;
    locations: Array<{ file: string; line: number; snippet?: string }>;
    fix?: { type: string; description: string; autoApplicable: boolean };
  }>;
  skipped: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
}

interface ImpactResult {
  riskScore: number;
  affectedFiles: Array<{ file: string; depth: number; reason: string }>;
  affectedFunctions: Array<{
    name: string;
    file: string;
    line: number;
    depth: number;
    isEntryPoint: boolean;
    accessesSensitiveData: boolean;
  }>;
  entryPoints: Array<{
    name: string;
    file: string;
    line: number;
    type: string;
    method?: string;
    path?: string;
  }>;
  sensitiveDataPaths: Array<{
    table: string;
    fields: string[];
    operation: string;
    entryPoint: string;
    sensitivity: string;
  }>;
}


interface BoundaryResult {
  violations: Array<{
    source: string;
    target: string;
    dataType: string;
    severity: string;
    description: string;
    path: string[];
  }>;
  exposures: Array<{
    field: string;
    table: string;
    exposedAt: string;
    sensitivity: string;
    regulation?: string;
  }>;
  secrets: Array<{
    file: string;
    line: number;
    type: string;
    severity: string;
    pattern: string;
  }>;
  envIssues: Array<{
    variable: string;
    issue: string;
    file: string;
    line: number;
    severity: string;
  }>;
}

interface TestResult {
  coverageScore: number;
  uncovered: Array<{
    name: string;
    file: string;
    line: number;
    reason: string;
    risk: string;
    accessesSensitiveData: boolean;
  }>;
  minimumTests: Array<{
    testFile: string;
    testName: string;
    coversFunction: string;
    reason: string;
  }>;
  mockIssues: Array<{
    testFile: string;
    line: number;
    issue: string;
    description: string;
  }>;
  quality: {
    assertionDensity: number;
    mockRatio: number;
    setupComplexity: number;
    isolationScore: number;
  };
}

interface CouplingResult {
  score: number;
  cycles: Array<{
    modules: string[];
    severity: string;
    breakSuggestion: string;
  }>;
  hotspots: Array<{
    module: string;
    afferentCoupling: number;
    efferentCoupling: number;
    instability: number;
    suggestion: string;
  }>;
  unusedExports: Array<{
    file: string;
    symbol: string;
    line: number;
  }>;
}


interface ErrorResult {
  score: number;
  gaps: Array<{
    file: string;
    line: number;
    function: string;
    issue: string;
    severity: string;
    suggestion: string;
  }>;
  boundaries: Array<{
    file: string;
    line: number;
    type: string;
    catches: string[];
    rethrows: boolean;
  }>;
  swallowed: Array<{
    file: string;
    line: number;
    exceptionType: string;
    severity: string;
  }>;
}

interface ContractResult {
  mismatches: Array<{
    endpoint: string;
    method: string;
    issue: string;
    backend: { file: string; line: number; type: string };
    frontend: { file: string; line: number; type: string };
    severity: string;
  }>;
  discovered: Array<{
    endpoint: string;
    method: string;
    requestType?: string;
    responseType?: string;
    source: string;
  }>;
  verified: Array<{
    endpoint: string;
    method: string;
    status: string;
  }>;
}

interface ConstantsResult {
  magicValues: Array<{
    file: string;
    line: number;
    value: string | number;
    suggestion: string;
    severity: string;
  }>;
  deadConstants: Array<{
    file: string;
    line: number;
    name: string;
    confidence: number;
  }>;
  inconsistencies: Array<{
    name: string;
    locations: Array<{ file: string; line: number; value: string }>;
    severity: string;
  }>;
  secrets: Array<{
    file: string;
    line: number;
    name: string;
    pattern: string;
    severity: string;
  }>;
}

interface TrendResult {
  patterns: Array<{
    patternId: string;
    patternName: string;
    direction: string;
    changePercent: number;
    message: string;
  }>;
}

interface MemoryContext {
  relevantPatterns: string[];
  warnings: string[];
  suggestions: string[];
}


// =============================================================================
// PR ANALYZER CLASS
// =============================================================================

export class PRAnalyzer {
  constructor(
    private deps: AnalyzerDependencies,
    private config: AnalysisConfig
  ) {}

  /**
   * Run comprehensive analysis on PR changes
   */
  async analyze(context: PRContext, rootPath: string): Promise<AnalysisResult> {
    const startTime = Date.now();
    const files = context.changedFiles;

    // Phase 1: Core Analysis (always run, in parallel)
    const [patterns, constraints, impact, security] = await Promise.all([
      this.config.patternCheck 
        ? this.analyzePatterns(files, rootPath)
        : this.emptyPatternAnalysis(),
      this.config.constraintVerification
        ? this.analyzeConstraints(files, rootPath)
        : this.emptyConstraintAnalysis(),
      this.config.impactAnalysis
        ? this.analyzeImpact(files, rootPath)
        : this.emptyImpactAnalysis(),
      this.config.securityBoundaries
        ? this.analyzeSecurity(files, rootPath)
        : this.emptySecurityAnalysis(),
    ]);

    // Phase 2: Extended Analysis (optional, in parallel)
    const [tests, coupling, errors, contracts, constants] = await Promise.all([
      this.config.testCoverage && this.deps.testTopology
        ? this.analyzeTests(files, rootPath)
        : this.emptyTestAnalysis(),
      this.config.moduleCoupling && this.deps.moduleCoupling
        ? this.analyzeCoupling(files, rootPath)
        : this.emptyCouplingAnalysis(),
      this.config.errorHandling && this.deps.errorHandling
        ? this.analyzeErrors(files, rootPath)
        : this.emptyErrorAnalysis(),
      this.config.contractMismatch && this.deps.contractChecker
        ? this.analyzeContracts(files, rootPath)
        : this.emptyContractAnalysis(),
      this.config.constantsAnalysis && this.deps.constantsAnalyzer
        ? this.analyzeConstants(files, rootPath)
        : this.emptyConstantsAnalysis(),
    ]);

    // Phase 3: Quality Gates (if enabled)
    const qualityGates = this.deps.qualityGates
      ? await this.deps.qualityGates.runGates(files, rootPath, 'default')
      : this.emptyQualityGateResult();

    // Phase 4: Memory Context (if enabled)
    let memoryContext: MemoryContext | undefined;
    if (this.deps.cortex) {
      memoryContext = await this.deps.cortex.getContextForFiles(files);
    }

    // Phase 5: Trend Analysis (if enabled)
    let trends: TrendResult | undefined;
    if (this.config.patternTrends && this.deps.trendAnalyzer) {
      trends = await this.deps.trendAnalyzer.analyzeTrends(rootPath);
    }

    // Merge trend data into patterns
    if (trends) {
      patterns.trends = trends.patterns.map(t => ({
        patternId: t.patternId,
        patternName: t.patternName,
        direction: t.direction as 'improving' | 'degrading' | 'stable',
        changePercent: t.changePercent,
        message: t.message,
      }));
    }

    // Generate suggestions
    const suggestions = this.generateSuggestions(
      patterns, constraints, impact, security, tests, coupling, errors, memoryContext
    );

    // Extract learnings
    const learnings = this.extractLearnings(patterns, context);

    // Calculate overall score
    const score = this.calculateOverallScore(
      patterns, constraints, impact, security, tests, coupling, errors
    );

    // Determine status
    const status = this.determineStatus(
      patterns, constraints, security, qualityGates, score
    );

    // Generate summary
    const endTime = Date.now();
    const summary = this.generateSummary(
      patterns, constraints, impact, security, tests, coupling, errors, endTime - startTime
    );

    // Build metadata
    const metadata: AnalysisMetadata = {
      startTime,
      endTime,
      durationMs: endTime - startTime,
      filesAnalyzed: files.length,
      linesAnalyzed: context.additions + context.deletions,
      language: this.detectLanguages(files),
      frameworks: [], // TODO: Detect frameworks
    };

    return {
      status,
      summary,
      score,
      patterns,
      constraints,
      impact,
      security,
      tests,
      coupling,
      errors,
      contracts,
      constants,
      qualityGates,
      suggestions,
      learnings,
      metadata,
    };
  }


  // ===========================================================================
  // ANALYSIS METHODS
  // ===========================================================================

  private async analyzePatterns(files: string[], rootPath: string): Promise<PatternAnalysis> {
    const result = await this.deps.patternMatcher.matchPatterns(files, rootPath);
    
    return {
      violations: result.outliers.map(o => ({
        id: o.id,
        file: o.file,
        line: o.line,
        endLine: o.endLine,
        pattern: o.patternName,
        patternId: o.patternId,
        category: o.category,
        expected: o.expected,
        actual: o.actual,
        severity: o.severity as 'error' | 'warning' | 'info',
        confidence: o.confidence,
        autoFixable: !!o.suggestedFix,
        suggestedFix: o.suggestedFix,
      })),
      newPatterns: result.patterns
        .filter(p => p.confidence >= this.config.minPatternConfidence)
        .map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          confidence: p.confidence,
          locations: p.locations,
          isNew: false,
        })),
      driftScore: this.calculateDriftScore(result.outliers, files.length),
      trends: [],
      outlierCount: result.outliers.length,
      complianceRate: result.complianceRate,
    };
  }

  private async analyzeConstraints(files: string[], rootPath: string): Promise<ConstraintAnalysis> {
    const result = await this.deps.constraintVerifier.verifyConstraints(files, rootPath);
    
    const total = result.satisfied.length + result.violated.length;
    const complianceRate = total > 0 ? (result.satisfied.length / total) * 100 : 100;

    return {
      verified: result.satisfied.map(s => ({
        constraintId: s.id,
        name: s.name,
        category: s.category,
        status: 'pass' as const,
        message: s.message,
        severity: 'info' as const,
        locations: [],
      })),
      violated: result.violated.map(v => ({
        constraintId: v.id,
        name: v.name,
        category: v.category,
        status: 'fail' as const,
        message: v.message,
        severity: v.severity as 'error' | 'warning' | 'info',
        locations: v.locations,
        fix: v.fix ? {
          type: v.fix.type as 'add' | 'remove' | 'modify',
          description: v.fix.description,
          autoApplicable: v.fix.autoApplicable,
        } : undefined,
      })),
      skipped: result.skipped.map(s => ({
        constraintId: s.id,
        name: s.name,
        category: '',
        status: 'skip' as const,
        message: s.reason,
        severity: 'info' as const,
        locations: [],
      })),
      complianceRate,
    };
  }

  private async analyzeImpact(files: string[], rootPath: string): Promise<ImpactAnalysis> {
    const result = await this.deps.impactAnalyzer.analyzeImpact(
      files, rootPath, this.config.maxImpactDepth
    );

    const riskLevel = this.calculateRiskLevel(result.riskScore);

    return {
      riskScore: result.riskScore,
      riskLevel,
      affectedFiles: result.affectedFiles,
      affectedFunctions: result.affectedFunctions,
      entryPoints: result.entryPoints.map(ep => ({
        ...ep,
        type: ep.type as 'api' | 'ui' | 'cli' | 'worker' | 'webhook' | 'other',
      })),
      breakingChanges: [],
      sensitiveDataPaths: result.sensitiveDataPaths.map(p => ({
        ...p,
        operation: p.operation as 'read' | 'write' | 'delete',
        sensitivity: p.sensitivity as 'credentials' | 'financial' | 'health' | 'pii' | 'internal',
      })),
      summary: {
        directCallers: result.affectedFunctions.filter(f => f.depth === 1).length,
        transitiveCallers: result.affectedFunctions.filter(f => f.depth > 1).length,
        affectedEntryPoints: result.entryPoints.length,
        affectedDataPaths: result.sensitiveDataPaths.length,
        maxDepth: Math.max(...result.affectedFunctions.map(f => f.depth), 0),
      },
    };
  }


  private async analyzeSecurity(files: string[], rootPath: string): Promise<SecurityAnalysis> {
    const result = await this.deps.boundaryScanner.scanBoundaries(files, rootPath);

    const totalIssues = result.violations.length + result.exposures.length + 
                        result.secrets.length + result.envIssues.length;
    const criticalIssues = result.secrets.filter(s => s.severity === 'critical').length +
                          result.violations.filter(v => v.severity === 'error').length;

    const riskLevel = this.calculateSecurityRisk(result);
    const score = Math.max(0, 100 - (totalIssues * 5) - (criticalIssues * 20));

    return {
      riskLevel,
      score,
      boundaryViolations: result.violations.map(v => ({
        ...v,
        severity: v.severity as 'warning' | 'error',
      })),
      sensitiveDataExposure: result.exposures,
      hardcodedSecrets: result.secrets.map(s => ({
        ...s,
        type: s.type as 'api_key' | 'password' | 'token' | 'private_key' | 'connection_string' | 'other',
        severity: s.severity as 'warning' | 'error' | 'critical',
      })),
      envVarIssues: result.envIssues.map(e => ({
        ...e,
        issue: e.issue as 'missing_default' | 'hardcoded' | 'exposed' | 'sensitive_in_logs',
        severity: e.severity as 'warning' | 'error',
      })),
      summary: {
        totalIssues,
        criticalIssues,
        boundaryViolations: result.violations.length,
        dataExposures: result.exposures.length,
        secretsFound: result.secrets.length,
      },
    };
  }

  private async analyzeTests(files: string[], rootPath: string): Promise<TestAnalysis> {
    if (!this.deps.testTopology) return this.emptyTestAnalysis();
    
    const result = await this.deps.testTopology.analyzeTestCoverage(files, rootPath);

    return {
      coverageScore: result.coverageScore,
      uncoveredFunctions: result.uncovered.map(u => ({
        ...u,
        risk: u.risk as 'low' | 'medium' | 'high',
      })),
      minimumTestSet: result.minimumTests,
      mockIssues: result.mockIssues.map(m => ({
        ...m,
        issue: m.issue as 'over_mocking' | 'missing_mock' | 'stale_mock' | 'implementation_detail',
      })),
      testQuality: result.quality,
    };
  }

  private async analyzeCoupling(files: string[], rootPath: string): Promise<CouplingAnalysis> {
    if (!this.deps.moduleCoupling) return this.emptyCouplingAnalysis();
    
    const result = await this.deps.moduleCoupling.analyzeCoupling(files, rootPath);

    return {
      score: result.score,
      cycles: result.cycles.map(c => ({
        ...c,
        severity: c.severity as 'info' | 'warning' | 'critical',
      })),
      hotspots: result.hotspots,
      unusedExports: result.unusedExports,
      metrics: {
        averageAfferent: result.hotspots.reduce((sum, h) => sum + h.afferentCoupling, 0) / 
                        Math.max(result.hotspots.length, 1),
        averageEfferent: result.hotspots.reduce((sum, h) => sum + h.efferentCoupling, 0) / 
                        Math.max(result.hotspots.length, 1),
        averageInstability: result.hotspots.reduce((sum, h) => sum + h.instability, 0) / 
                           Math.max(result.hotspots.length, 1),
        cycleCount: result.cycles.length,
      },
    };
  }

  private async analyzeErrors(files: string[], rootPath: string): Promise<ErrorAnalysis> {
    if (!this.deps.errorHandling) return this.emptyErrorAnalysis();
    
    const result = await this.deps.errorHandling.analyzeErrorHandling(files, rootPath);

    return {
      score: result.score,
      gaps: result.gaps.map(g => ({
        ...g,
        issue: g.issue as 'unhandled_promise' | 'missing_catch' | 'empty_catch' | 'generic_catch',
        severity: g.severity as 'warning' | 'error',
      })),
      boundaries: result.boundaries.map(b => ({
        ...b,
        type: b.type as 'try_catch' | 'error_boundary' | 'middleware' | 'global',
      })),
      swallowedExceptions: result.swallowed.map(s => ({
        ...s,
        severity: s.severity as 'warning' | 'error',
      })),
      metrics: {
        handledPaths: result.boundaries.length,
        unhandledPaths: result.gaps.length,
        boundaryCount: result.boundaries.length,
        swallowedCount: result.swallowed.length,
      },
    };
  }


  private async analyzeContracts(files: string[], rootPath: string): Promise<ContractAnalysis> {
    if (!this.deps.contractChecker) return this.emptyContractAnalysis();
    
    const result = await this.deps.contractChecker.checkContracts(files, rootPath);

    return {
      mismatches: result.mismatches.map(m => ({
        ...m,
        issue: m.issue as 'type_mismatch' | 'missing_field' | 'extra_field' | 'status_mismatch',
        severity: m.severity as 'warning' | 'error',
      })),
      discovered: result.discovered.map(d => ({
        ...d,
        source: d.source as 'backend' | 'frontend',
      })),
      verified: result.verified.map(v => ({
        ...v,
        status: v.status as 'verified' | 'partial',
      })),
    };
  }

  private async analyzeConstants(files: string[], rootPath: string): Promise<ConstantsAnalysis> {
    if (!this.deps.constantsAnalyzer) return this.emptyConstantsAnalysis();
    
    const result = await this.deps.constantsAnalyzer.analyzeConstants(files, rootPath);

    return {
      magicValues: result.magicValues.map(m => ({
        ...m,
        severity: m.severity as 'info' | 'warning',
      })),
      deadConstants: result.deadConstants,
      inconsistencies: result.inconsistencies.map(i => ({
        ...i,
        severity: i.severity as 'warning' | 'error',
      })),
      secrets: result.secrets.map(s => ({
        ...s,
        severity: s.severity as 'warning' | 'error' | 'critical',
      })),
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private calculateDriftScore(outliers: PatternMatchResult['outliers'], fileCount: number): number {
    if (fileCount === 0) return 0;
    
    const weights = { error: 10, warning: 3, info: 1 };
    const score = outliers.reduce((acc, o) => {
      return acc + (weights[o.severity as keyof typeof weights] || 1);
    }, 0);

    return Math.min(100, Math.round((score / fileCount) * 10));
  }

  private calculateRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private calculateSecurityRisk(result: BoundaryResult): 'low' | 'medium' | 'high' | 'critical' {
    const criticalSecrets = result.secrets.filter(s => s.severity === 'critical').length;
    const errorViolations = result.violations.filter(v => v.severity === 'error').length;
    
    if (criticalSecrets > 0) return 'critical';
    if (errorViolations > 0 || result.secrets.length > 0) return 'high';
    if (result.violations.length > 3 || result.exposures.length > 5) return 'medium';
    return 'low';
  }

  private calculateOverallScore(
    patterns: PatternAnalysis,
    constraints: ConstraintAnalysis,
    impact: ImpactAnalysis,
    security: SecurityAnalysis,
    tests: TestAnalysis,
    coupling: CouplingAnalysis,
    errors: ErrorAnalysis
  ): number {
    const weights = {
      patterns: 0.20,
      constraints: 0.20,
      impact: 0.15,
      security: 0.20,
      tests: 0.10,
      coupling: 0.10,
      errors: 0.05,
    };

    const scores = {
      patterns: patterns.complianceRate,
      constraints: constraints.complianceRate,
      impact: Math.max(0, 100 - impact.riskScore),
      security: security.score,
      tests: tests.coverageScore,
      coupling: Math.max(0, 100 - coupling.score),
      errors: errors.score,
    };

    return Math.round(
      Object.entries(weights).reduce((sum, [key, weight]) => {
        return sum + (scores[key as keyof typeof scores] * weight);
      }, 0)
    );
  }


  private determineStatus(
    patterns: PatternAnalysis,
    constraints: ConstraintAnalysis,
    security: SecurityAnalysis,
    qualityGates: QualityGateResult,
    score: number
  ): 'pass' | 'warn' | 'fail' {
    // Fail conditions
    if (qualityGates.status === 'fail') return 'fail';
    if (constraints.violated.length > 0) return 'fail';
    if (security.riskLevel === 'critical') return 'fail';
    if (patterns.violations.some(v => v.severity === 'error')) return 'fail';
    if (score < 50) return 'fail';

    // Warn conditions
    if (qualityGates.status === 'warn') return 'warn';
    if (security.riskLevel === 'high') return 'warn';
    if (patterns.violations.some(v => v.severity === 'warning')) return 'warn';
    if (patterns.driftScore > 50) return 'warn';
    if (score < 70) return 'warn';

    return 'pass';
  }

  private generateSummary(
    patterns: PatternAnalysis,
    constraints: ConstraintAnalysis,
    impact: ImpactAnalysis,
    security: SecurityAnalysis,
    tests: TestAnalysis,
    coupling: CouplingAnalysis,
    errors: ErrorAnalysis,
    durationMs: number
  ): string {
    const parts: string[] = [];

    // Pattern summary
    if (patterns.violations.length > 0) {
      parts.push(`${patterns.violations.length} pattern violation(s)`);
    }
    if (patterns.driftScore > 30) {
      parts.push(`drift score: ${patterns.driftScore}/100`);
    }

    // Constraint summary
    if (constraints.violated.length > 0) {
      parts.push(`${constraints.violated.length} constraint(s) violated`);
    }

    // Impact summary
    if (impact.riskScore > 50) {
      parts.push(`impact risk: ${impact.riskLevel}`);
    }

    // Security summary
    if (security.summary.totalIssues > 0) {
      parts.push(`${security.summary.totalIssues} security issue(s)`);
    }

    // Test summary
    if (tests.uncoveredFunctions.length > 0) {
      parts.push(`${tests.uncoveredFunctions.length} untested function(s)`);
    }

    // Coupling summary
    if (coupling.cycles.length > 0) {
      parts.push(`${coupling.cycles.length} dependency cycle(s)`);
    }

    // Error handling summary
    if (errors.gaps.length > 0) {
      parts.push(`${errors.gaps.length} error handling gap(s)`);
    }

    const summary = parts.length > 0 
      ? parts.join(', ')
      : 'All checks passed';

    return `${summary} (${durationMs}ms)`;
  }

  private generateSuggestions(
    patterns: PatternAnalysis,
    constraints: ConstraintAnalysis,
    impact: ImpactAnalysis,
    security: SecurityAnalysis,
    tests: TestAnalysis,
    coupling: CouplingAnalysis,
    errors: ErrorAnalysis,
    _memoryContext?: MemoryContext
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];
    let id = 0;

    // Pattern suggestions
    for (const v of patterns.violations.filter(v => v.autoFixable)) {
      suggestions.push({
        id: `suggestion-${++id}`,
        type: 'pattern',
        title: `Fix ${v.pattern} violation`,
        description: v.suggestedFix || `Update code to match ${v.pattern} pattern`,
        file: v.file,
        line: v.line,
        priority: v.severity === 'error' ? 'high' : 'medium',
        effort: 'small',
        autoFixable: true,
      });
    }

    // Constraint suggestions
    for (const c of constraints.violated.filter(c => c.fix?.autoApplicable)) {
      suggestions.push({
        id: `suggestion-${++id}`,
        type: 'refactor',
        title: `Fix constraint: ${c.name}`,
        description: c.fix?.description || c.message,
        file: c.locations[0]?.file,
        line: c.locations[0]?.line,
        priority: 'high',
        effort: 'medium',
        autoFixable: true,
      });
    }

    // Security suggestions
    for (const s of security.hardcodedSecrets) {
      suggestions.push({
        id: `suggestion-${++id}`,
        type: 'security',
        title: `Remove hardcoded ${s.type}`,
        description: `Move secret to environment variable or secrets manager`,
        file: s.file,
        line: s.line,
        priority: 'high',
        effort: 'small',
        autoFixable: false,
      });
    }

    // Test suggestions
    for (const u of tests.uncoveredFunctions.filter(u => u.risk === 'high')) {
      suggestions.push({
        id: `suggestion-${++id}`,
        type: 'test',
        title: `Add tests for ${u.name}`,
        description: u.reason,
        file: u.file,
        line: u.line,
        priority: 'medium',
        effort: 'medium',
        autoFixable: false,
      });
    }

    // Coupling suggestions
    for (const c of coupling.cycles.filter(c => c.severity === 'critical')) {
      suggestions.push({
        id: `suggestion-${++id}`,
        type: 'refactor',
        title: 'Break dependency cycle',
        description: c.breakSuggestion,
        priority: 'high',
        effort: 'large',
        autoFixable: false,
      });
    }

    // Error handling suggestions
    for (const g of errors.gaps.filter(g => g.severity === 'error')) {
      suggestions.push({
        id: `suggestion-${++id}`,
        type: 'error_handling',
        title: `Add error handling in ${g.function}`,
        description: g.suggestion,
        file: g.file,
        line: g.line,
        priority: 'high',
        effort: 'small',
        autoFixable: false,
      });
    }

    // Impact suggestions
    if (impact.riskScore > 70) {
      suggestions.push({
        id: `suggestion-${++id}`,
        type: 'refactor',
        title: 'High impact change detected',
        description: `This change affects ${impact.summary.affectedEntryPoints} entry points. Consider breaking into smaller PRs.`,
        priority: 'high',
        effort: 'large',
        autoFixable: false,
      });
    }

    return suggestions;
  }


  private extractLearnings(patterns: PatternAnalysis, _context: PRContext): Learning[] {
    const learnings: Learning[] = [];

    // Learn new high-confidence patterns
    for (const p of patterns.newPatterns.filter(p => p.confidence >= 0.9 && p.isNew)) {
      learnings.push({
        id: `learning-${p.id}`,
        type: 'pattern',
        content: `New pattern detected: ${p.name} in ${p.category}`,
        confidence: p.confidence,
        source: 'pr_merged',
      });
    }

    return learnings;
  }

  private detectLanguages(files: string[]): string[] {
    const extensions = new Set<string>();
    for (const file of files) {
      const ext = file.split('.').pop()?.toLowerCase();
      if (ext) extensions.add(ext);
    }

    const langMap: Record<string, string> = {
      ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
      py: 'Python', java: 'Java', cs: 'C#', php: 'PHP', go: 'Go', rs: 'Rust',
      cpp: 'C++', c: 'C', rb: 'Ruby', swift: 'Swift', kt: 'Kotlin',
    };

    return [...extensions]
      .map(ext => langMap[ext])
      .filter((lang): lang is string => Boolean(lang));
  }

  // ===========================================================================
  // EMPTY RESULT FACTORIES
  // ===========================================================================

  private emptyPatternAnalysis(): PatternAnalysis {
    return { violations: [], newPatterns: [], driftScore: 0, trends: [], outlierCount: 0, complianceRate: 100 };
  }

  private emptyConstraintAnalysis(): ConstraintAnalysis {
    return { verified: [], violated: [], skipped: [], complianceRate: 100 };
  }

  private emptyImpactAnalysis(): ImpactAnalysis {
    return {
      riskScore: 0, riskLevel: 'low', affectedFiles: [], affectedFunctions: [],
      entryPoints: [], breakingChanges: [], sensitiveDataPaths: [],
      summary: { directCallers: 0, transitiveCallers: 0, affectedEntryPoints: 0, affectedDataPaths: 0, maxDepth: 0 },
    };
  }

  private emptySecurityAnalysis(): SecurityAnalysis {
    return {
      riskLevel: 'low', score: 100, boundaryViolations: [], sensitiveDataExposure: [],
      hardcodedSecrets: [], envVarIssues: [],
      summary: { totalIssues: 0, criticalIssues: 0, boundaryViolations: 0, dataExposures: 0, secretsFound: 0 },
    };
  }

  private emptyTestAnalysis(): TestAnalysis {
    return {
      coverageScore: 100, uncoveredFunctions: [], minimumTestSet: [], mockIssues: [],
      testQuality: { assertionDensity: 0, mockRatio: 0, setupComplexity: 0, isolationScore: 100 },
    };
  }

  private emptyCouplingAnalysis(): CouplingAnalysis {
    return {
      score: 0, cycles: [], hotspots: [], unusedExports: [],
      metrics: { averageAfferent: 0, averageEfferent: 0, averageInstability: 0, cycleCount: 0 },
    };
  }

  private emptyErrorAnalysis(): ErrorAnalysis {
    return {
      score: 100, gaps: [], boundaries: [], swallowedExceptions: [],
      metrics: { handledPaths: 0, unhandledPaths: 0, boundaryCount: 0, swallowedCount: 0 },
    };
  }

  private emptyContractAnalysis(): ContractAnalysis {
    return { mismatches: [], discovered: [], verified: [] };
  }

  private emptyConstantsAnalysis(): ConstantsAnalysis {
    return { magicValues: [], deadConstants: [], inconsistencies: [], secrets: [] };
  }

  private emptyQualityGateResult(): QualityGateResult {
    return { status: 'pass', gates: [], policy: 'default', aggregation: 'all_pass' };
  }
}
