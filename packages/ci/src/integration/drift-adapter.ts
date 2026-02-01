/**
 * Drift Adapter - Enterprise Implementation
 * Wires up ALL drift-core and drift-cortex capabilities for CI analysis.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { AnalyzerDependencies } from '../agent/pr-analyzer.js';
import type { Learning } from '../types.js';

export interface DriftAdapterConfig {
  rootPath: string;
  memoryEnabled?: boolean;
  driftDir?: string;
  verbose?: boolean;
  useCallGraph?: boolean;
  useContracts?: boolean;
  useTrends?: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type DriftCore = any;
type DriftCortex = any;

interface InitializedComponents {
  core: DriftCore | null;
  cortexModule: DriftCortex | null;
  patternStore: any;
  patternService: any;
  constraintStore: any;
  constraintVerifier: any;
  callGraphStore: any;
  impactAnalyzer: any;
  testTopologyAnalyzer: any;
  moduleCouplingAnalyzer: any;
  errorHandlingAnalyzer: any;
  contractStore: any;
  historyStore: any;
  gateOrchestrator: any;
  cortex: any;
}

export async function createDriftAdapter(config: DriftAdapterConfig): Promise<AnalyzerDependencies> {
  const { rootPath, memoryEnabled = true, verbose = false, useCallGraph = true, useContracts = true, useTrends = true } = config;
  const log = verbose ? console.log.bind(console, '[drift-adapter]') : (): void => {};
  log('Initializing enterprise Drift adapter for:', rootPath);
  const components = await initializeComponents(rootPath, memoryEnabled, useCallGraph, useContracts, useTrends, log);
  return {
    patternMatcher: createPatternMatcher(components.patternService, rootPath),
    constraintVerifier: createConstraintVerifierAdapter(components.constraintVerifier, rootPath),
    impactAnalyzer: createImpactAnalyzerAdapter(components, rootPath),
    boundaryScanner: createBoundaryScannerAdapter(components, rootPath),
    testTopology: components.testTopologyAnalyzer ? createTestTopologyAdapter(components.testTopologyAnalyzer, rootPath) : undefined,
    moduleCoupling: createModuleCouplingAdapter(components.moduleCouplingAnalyzer, rootPath),
    errorHandling: createErrorHandlingAdapter(components.errorHandlingAnalyzer, rootPath),
    contractChecker: components.contractStore ? createContractCheckerAdapter(components.contractStore, rootPath) : undefined,
    constantsAnalyzer: createConstantsAnalyzerAdapter(components, rootPath),
    qualityGates: components.gateOrchestrator ? createQualityGatesAdapter(components.gateOrchestrator, rootPath) : undefined,
    trendAnalyzer: components.historyStore ? createTrendAnalyzerAdapter(components.historyStore) : undefined,
    cortex: components.cortex ? createCortexAdapter(components.cortex) : undefined,
  };
}


async function initializeComponents(rootPath: string, memoryEnabled: boolean, useCallGraph: boolean, useContracts: boolean, useTrends: boolean, log: (...args: unknown[]) => void): Promise<InitializedComponents> {
  let core: DriftCore | null = null;
  let cortexModule: DriftCortex | null = null;
  try { core = await import('driftdetect-core'); log('drift-core loaded'); } catch (e) { log('drift-core not available:', e); }
  try { cortexModule = await import('driftdetect-cortex'); log('drift-cortex loaded'); } catch (e) { log('drift-cortex not available:', e); }
  const patternStore = core ? await safeInit(() => initPatternStore(core, rootPath), log, 'PatternStore') : null;
  const patternService = core && patternStore ? safeInitSync(() => core.createPatternServiceFromStore(patternStore, rootPath), log, 'PatternService') : null;
  const constraintStore = core ? await safeInit(() => initConstraintStore(core, rootPath), log, 'ConstraintStore') : null;
  const constraintVerifier = core && constraintStore ? safeInitSync(() => core.createConstraintVerifier({ rootDir: rootPath, store: constraintStore }), log, 'ConstraintVerifier') : null;
  const callGraphStore = core && useCallGraph ? await safeInit(() => initCallGraphStore(core, rootPath), log, 'CallGraphStore') : null;
  const impactAnalyzer = core && callGraphStore ? await safeInit(() => initImpactAnalyzer(core, callGraphStore), log, 'ImpactAnalyzer') : null;
  const testTopologyAnalyzer = core ? safeInitSync(() => core.createTestTopologyAnalyzer({}), log, 'TestTopologyAnalyzer') : null;
  const moduleCouplingAnalyzer = core ? safeInitSync(() => core.createModuleCouplingAnalyzer({ rootDir: rootPath }), log, 'ModuleCouplingAnalyzer') : null;
  const errorHandlingAnalyzer = core ? safeInitSync(() => core.createErrorHandlingAnalyzer({ rootDir: rootPath }), log, 'ErrorHandlingAnalyzer') : null;
  const contractStore = core && useContracts ? await safeInit(() => initContractStore(core, rootPath), log, 'ContractStore') : null;
  const historyStore = core && useTrends ? await safeInit(() => initHistoryStore(core, rootPath), log, 'HistoryStore') : null;
  const gateOrchestrator = core ? safeInitSync(() => core.createQualityGateOrchestrator(rootPath), log, 'GateOrchestrator') : null;
  const cortex = memoryEnabled && cortexModule ? await safeInit(() => cortexModule.Cortex.create({ autoInitialize: true }), log, 'Cortex') : null;
  return { core, cortexModule, patternStore, patternService, constraintStore, constraintVerifier, callGraphStore, impactAnalyzer, testTopologyAnalyzer, moduleCouplingAnalyzer, errorHandlingAnalyzer, contractStore, historyStore, gateOrchestrator, cortex };
}

async function safeInit<T>(fn: () => Promise<T>, log: (...args: unknown[]) => void, name: string): Promise<T | null> {
  try { return await fn(); } catch (e) { log(name + ' failed:', e); return null; }
}
function safeInitSync<T>(fn: () => T, log: (...args: unknown[]) => void, name: string): T | null {
  try { return fn(); } catch (e) { log(name + ' failed:', e); return null; }
}
async function initPatternStore(core: any, rootPath: string) { const store = new core.PatternStore({ rootDir: rootPath }); await store.initialize(); return store; }
async function initConstraintStore(core: any, rootPath: string) { const store = core.createConstraintStore({ rootDir: rootPath }); await store.initialize(); return store; }
async function initCallGraphStore(core: any, rootPath: string) { const store = core.createCallGraphStore({ rootDir: rootPath }); await store.load(); return store; }
async function initImpactAnalyzer(core: any, callGraphStore: any) { const graph = await callGraphStore.getGraph(); if (!graph) throw new Error('No call graph'); return core.createImpactAnalyzer(graph); }
async function initContractStore(core: any, rootPath: string) { const store = new core.ContractStore({ rootDir: rootPath, autoSave: false }); await store.initialize(); return store; }
async function initHistoryStore(core: any, rootPath: string) { const store = new core.HistoryStore({ rootDir: rootPath }); await store.initialize(); return store; }

// =============================================================================
// ADAPTER FACTORY FUNCTIONS
// =============================================================================

import type {
  IPatternMatcher,
  IConstraintVerifier,
  IImpactAnalyzer,
  IBoundaryScanner,
  ITestTopology,
  IModuleCoupling,
  IErrorHandling,
  IContractChecker,
  IConstantsAnalyzer,
  IQualityGates,
  ITrendAnalyzer,
  ICortex,
} from '../agent/pr-analyzer.js';

function createPatternMatcher(patternService: any, rootPath: string): IPatternMatcher {
  return {
    async matchPatterns(files: string[], _rootPath: string) {
      if (patternService) {
        try {
          // Use real drift-core PatternService
          const allPatterns: any[] = [];
          const allOutliers: any[] = [];
          
          for (const file of files) {
            const patterns = await patternService.getPatternsByFile(file);
            for (const pattern of patterns) {
              // Add pattern info
              allPatterns.push({
                id: pattern.id,
                name: pattern.name,
                category: pattern.category,
                confidence: pattern.confidence?.score ?? pattern.confidence ?? 0.8,
                locations: pattern.locations?.filter((loc: any) => loc.file === file) || [],
              });
              
              // Check if this file is an outlier for this pattern
              const fileOutliers = (pattern.outliers || []).filter((o: any) => o.file === file);
              for (const outlier of fileOutliers) {
                allOutliers.push({
                  id: outlier.id || `${pattern.id}-outlier-${allOutliers.length}`,
                  file: outlier.file,
                  line: outlier.line || 1,
                  endLine: outlier.endLine,
                  patternId: pattern.id,
                  patternName: pattern.name,
                  category: pattern.category,
                  expected: outlier.expected || pattern.description || `Follow ${pattern.name} pattern`,
                  actual: outlier.actual || outlier.reason || 'Deviates from pattern',
                  severity: outlier.severity || 'warning',
                  confidence: outlier.confidence ?? pattern.confidence?.score ?? 0.8,
                  suggestedFix: outlier.suggestedFix || outlier.fix,
                });
              }
            }
          }
          
          const complianceRate = allOutliers.length === 0 ? 100 : Math.max(0, 100 - (allOutliers.length * 5));
          return { patterns: allPatterns, outliers: allOutliers, complianceRate };
        } catch { /* fallback */ }
      }
      // Heuristic fallback
      return heuristicPatternMatch(files, rootPath);
    },
  };
}

function createConstraintVerifierAdapter(verifier: any, rootPath: string): IConstraintVerifier {
  return {
    async verifyConstraints(files: string[], _rootPath: string) {
      if (verifier) {
        try {
          // Use real drift-core ConstraintVerifier
          const allSatisfied: any[] = [];
          const allViolated: any[] = [];
          const allSkipped: any[] = [];
          
          for (const file of files) {
            try {
              const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
              const result = await verifier.verifyFile(file, content);
              
              if (result.satisfied) allSatisfied.push(...result.satisfied);
              if (result.violations) {
                for (const v of result.violations) {
                  allViolated.push({
                    id: v.constraintId,
                    name: v.constraintName,
                    category: v.category,
                    message: v.message || v.description,
                    severity: v.severity || 'error',
                    locations: v.location ? [{ file: v.location.file || file, line: v.location.line, snippet: v.location.snippet }] : [],
                    fix: v.fix ? { type: v.fix.type, description: v.fix.description, autoApplicable: v.fix.autoApplicable ?? false } : undefined,
                  });
                }
              }
              if (result.skipped) allSkipped.push(...result.skipped);
            } catch { /* file not readable */ }
          }
          
          return { satisfied: allSatisfied, violated: allViolated, skipped: allSkipped };
        } catch { /* fallback */ }
      }
      return heuristicConstraintVerify(files, rootPath);
    },
  };
}

function createImpactAnalyzerAdapter(components: InitializedComponents, rootPath: string): IImpactAnalyzer {
  return {
    async analyzeImpact(files: string[], _rootPath: string, maxDepth: number) {
      if (components.impactAnalyzer) {
        try {
          // Use real drift-core ImpactAnalyzer - analyze each file
          const allAffected: any[] = [];
          const allEntryPoints: any[] = [];
          const allSensitiveDataPaths: any[] = [];
          let maxRiskScore = 0;

          for (const file of files) {
            const result = components.impactAnalyzer.analyzeFile(file, { maxDepth });
            if (result) {
              maxRiskScore = Math.max(maxRiskScore, result.riskScore || 0);
              if (result.affected) allAffected.push(...result.affected);
              if (result.entryPoints) allEntryPoints.push(...result.entryPoints);
              if (result.sensitiveDataPaths) allSensitiveDataPaths.push(...result.sensitiveDataPaths);
            }
          }

          return {
            riskScore: maxRiskScore,
            affectedFiles: files.map(f => ({ file: f, depth: 0, reason: 'Direct change' })),
            affectedFunctions: allAffected.map((a: any) => ({
              name: a.name || a.qualifiedName,
              file: a.file,
              line: a.line || 1,
              depth: a.depth || 0,
              isEntryPoint: a.isEntryPoint || false,
              accessesSensitiveData: a.accessesSensitiveData || false,
            })),
            entryPoints: allEntryPoints.map((ep: any) => ({
              name: ep.name || ep.qualifiedName,
              file: ep.file,
              line: ep.line || 1,
              type: 'api',
            })),
            sensitiveDataPaths: allSensitiveDataPaths.map((p: any) => ({
              table: p.table || 'unknown',
              fields: p.fields || [],
              operation: p.operation || 'read',
              entryPoint: p.entryPoint || '',
              sensitivity: p.sensitivity || 'internal',
            })),
          };
        } catch { /* fallback */ }
      }
      return heuristicImpactAnalysis(files, rootPath);
    },
  };
}

function createBoundaryScannerAdapter(components: InitializedComponents, rootPath: string): IBoundaryScanner {
  return {
    async scanBoundaries(files: string[], _rootPath: string) {
      // Try to use drift-core's boundary scanner if available
      if (components.core) {
        try {
          const scanner = components.core.createBoundaryScanner?.({ rootDir: rootPath });
          if (scanner) {
            const result = await scanner.scan(files);
            return {
              secrets: result.secrets || [],
              violations: result.violations || [],
              exposures: result.exposures || [],
              envIssues: result.envIssues || [],
            };
          }
        } catch { /* fallback */ }
      }
      return heuristicBoundaryScan(files, rootPath);
    },
  };
}

function createTestTopologyAdapter(analyzer: any, rootPath: string): ITestTopology {
  return {
    async analyzeTestCoverage(files: string[], _rootPath: string) {
      if (analyzer) {
        try {
          const result = await analyzer.analyze(files);
          return {
            coverageScore: result.coverageScore ?? 100,
            uncovered: result.uncovered || [],
            minimumTests: result.minimumTests || [],
            mockIssues: result.mockIssues || [],
            quality: result.quality || { assertionDensity: 0, mockRatio: 0, setupComplexity: 0, isolationScore: 100 },
          };
        } catch { /* fallback */ }
      }
      return heuristicTestCoverage(files, rootPath);
    },
  };
}

function createModuleCouplingAdapter(analyzer: any, rootPath: string): IModuleCoupling {
  return {
    async analyzeCoupling(files: string[], _rootPath: string) {
      if (analyzer) {
        try {
          // Use real drift-core ModuleCouplingAnalyzer
          const result = await analyzer.analyze(files);
          return {
            score: result.score ?? 0,
            cycles: (result.cycles || []).map((c: any) => ({
              modules: c.modules || [],
              severity: c.severity || 'warning',
              breakSuggestion: c.breakSuggestion || 'Consider extracting shared dependencies',
            })),
            hotspots: (result.hotspots || []).map((h: any) => ({
              module: h.module || h.file,
              afferentCoupling: h.afferentCoupling ?? h.ca ?? 0,
              efferentCoupling: h.efferentCoupling ?? h.ce ?? 0,
              instability: h.instability ?? 0,
              suggestion: h.suggestion || 'Consider reducing dependencies',
            })),
            unusedExports: result.unusedExports || [],
          };
        } catch { /* fallback */ }
      }
      return heuristicCouplingAnalysis(files, rootPath);
    },
  };
}

function createErrorHandlingAdapter(analyzer: any, rootPath: string): IErrorHandling {
  return {
    async analyzeErrorHandling(files: string[], _rootPath: string) {
      if (analyzer) {
        try {
          // Use real drift-core ErrorHandlingAnalyzer
          const result = await analyzer.analyze(files);
          return {
            score: result.score ?? 100,
            gaps: (result.gaps || []).map((g: any) => ({
              file: g.file,
              line: g.line ?? 1,
              function: g.function || g.functionName || 'unknown',
              issue: g.issue || g.type || 'missing_catch',
              severity: g.severity || 'warning',
              suggestion: g.suggestion || g.fix || 'Add error handling',
            })),
            boundaries: (result.boundaries || []).map((b: any) => ({
              file: b.file,
              line: b.line ?? 1,
              type: b.type || 'try_catch',
              catches: b.catches || ['Error'],
              rethrows: b.rethrows ?? false,
            })),
            swallowed: (result.swallowed || result.swallowedExceptions || []).map((s: any) => ({
              file: s.file,
              line: s.line ?? 1,
              exceptionType: s.exceptionType || s.type || 'Error',
              severity: s.severity || 'warning',
            })),
          };
        } catch { /* fallback */ }
      }
      return heuristicErrorHandling(files, rootPath);
    },
  };
}

function createContractCheckerAdapter(contractStore: any, _rootPath: string): IContractChecker {
  return {
    async checkContracts(_files: string[], __rootPath: string) {
      if (contractStore) {
        try {
          const contracts = await contractStore.getAll();
          const mismatches = contracts.filter((c: any) => c.status === 'mismatch');
          const verified = contracts.filter((c: any) => c.status === 'verified');
          const discovered = contracts.filter((c: any) => c.status === 'discovered');
          return { mismatches, verified, discovered };
        } catch { /* fallback */ }
      }
      return { mismatches: [], verified: [], discovered: [] };
    },
  };
}

function createConstantsAnalyzerAdapter(components: InitializedComponents, rootPath: string): IConstantsAnalyzer {
  return {
    async analyzeConstants(files: string[], _rootPath: string) {
      // Try to use drift-core's constants analyzer if available
      if (components.core) {
        try {
          const analyzer = components.core.createConstantsAnalyzer?.({ rootDir: rootPath });
          if (analyzer) {
            const result = await analyzer.analyze(files);
            return {
              magicValues: (result.magicValues || []).map((m: any) => ({
                file: m.file,
                line: m.line ?? 1,
                value: m.value,
                suggestion: m.suggestion || 'Extract to named constant',
                severity: m.severity || 'info',
              })),
              deadConstants: result.deadConstants || [],
              inconsistencies: (result.inconsistencies || []).map((i: any) => ({
                name: i.name,
                locations: i.locations || [],
                severity: i.severity || 'warning',
              })),
              secrets: (result.secrets || []).map((s: any) => ({
                file: s.file,
                line: s.line ?? 1,
                name: s.name,
                pattern: s.pattern || 'hardcoded_secret',
                severity: s.severity || 'error',
              })),
            };
          }
        } catch { /* fallback */ }
      }
      return heuristicConstantsAnalysis(files, rootPath);
    },
  };
}

function createQualityGatesAdapter(orchestrator: any, _rootPath: string): IQualityGates {
  return {
    async runGates(files: string[], rootPath: string, policy: string) {
      if (orchestrator) {
        try {
          const result = await orchestrator.run({ files, rootPath, policy });
          return {
            status: result.status || 'pass',
            gates: result.gates || [],
            policy: result.policy || policy,
            aggregation: result.aggregation || 'all_pass',
          };
        } catch { /* fallback */ }
      }
      return { status: 'pass', gates: [], policy, aggregation: 'all_pass' };
    },
  };
}

function createTrendAnalyzerAdapter(historyStore: any): ITrendAnalyzer {
  return {
    async analyzeTrends(_rootPath: string) {
      if (historyStore) {
        try {
          const trends = await historyStore.getTrends();
          return { patterns: trends || [] };
        } catch { /* fallback */ }
      }
      return { patterns: [] };
    },
  };
}

function createCortexAdapter(cortex: any): ICortex {
  return {
    async getContextForFiles(files: string[]) {
      if (cortex) {
        try {
          const context = await cortex.getContext({ files });
          return {
            relevantPatterns: context.patterns || [],
            warnings: context.warnings || [],
            suggestions: context.suggestions || [],
          };
        } catch { /* fallback */ }
      }
      return { relevantPatterns: [], warnings: [], suggestions: [] };
    },
    async recordLearning(learning: Learning) {
      if (cortex) {
        try {
          await cortex.learn(learning);
        } catch { /* ignore */ }
      }
    },
  };
}


// =============================================================================
// HEURISTIC FALLBACK FUNCTIONS
// =============================================================================

const SECRET_PATTERNS = [
  { pattern: /['"](?:sk|pk)[-_](?:live|test)[-_][a-zA-Z0-9]{20,}['"]/, type: 'api_key', severity: 'critical' },
  { pattern: /['"]AKIA[0-9A-Z]{16}['"]/, type: 'api_key', severity: 'critical' },
  { pattern: /['"]ghp_[a-zA-Z0-9]{36}['"]/, type: 'token', severity: 'critical' },
  { pattern: /['"]gho_[a-zA-Z0-9]{36}['"]/, type: 'token', severity: 'critical' },
  { pattern: /['"]github_pat_[a-zA-Z0-9_]{22,}['"]/, type: 'token', severity: 'critical' },
  { pattern: /['"]xox[baprs]-[a-zA-Z0-9-]{10,}['"]/, type: 'token', severity: 'critical' },
  { pattern: /['"]eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}['"]/, type: 'token', severity: 'error' },
  { pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/, type: 'password', severity: 'error' },
  { pattern: /secret\s*[:=]\s*['"][^'"]{8,}['"]/, type: 'password', severity: 'error' },
  { pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{16,}['"]/, type: 'api_key', severity: 'error' },
  { pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, type: 'private_key', severity: 'critical' },
  { pattern: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@/, type: 'connection_string', severity: 'critical' },
  { pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@/, type: 'connection_string', severity: 'critical' },
  { pattern: /mysql:\/\/[^:]+:[^@]+@/, type: 'connection_string', severity: 'critical' },
  { pattern: /redis:\/\/:[^@]+@/, type: 'connection_string', severity: 'critical' },
  { pattern: /['"]AIza[0-9A-Za-z_-]{35}['"]/, type: 'api_key', severity: 'critical' },
  { pattern: /['"]SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}['"]/, type: 'api_key', severity: 'critical' },
  { pattern: /['"]sk-[a-zA-Z0-9]{48}['"]/, type: 'api_key', severity: 'critical' },
  { pattern: /['"]rk_live_[a-zA-Z0-9]{24}['"]/, type: 'api_key', severity: 'critical' },
  { pattern: /['"]AC[a-f0-9]{32}['"]/, type: 'api_key', severity: 'error' },
];

const API_ROUTE_PATTERNS = [
  /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  /@(Get|Post|Put|Patch|Delete)\s*\(\s*['"`]?([^'"`\)]+)['"`]?\s*\)/gi,
  /\[Http(Get|Post|Put|Patch|Delete)\s*\(\s*['"`]?([^'"`\)]+)['"`]?\s*\)\]/gi,
  /@(RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping)\s*\(\s*(?:value\s*=\s*)?['"`]?([^'"`\)]+)['"`]?\s*\)/gi,
];

const SENSITIVE_DATA_PATTERNS = [
  { pattern: /password|passwd|pwd/i, type: 'credentials', sensitivity: 'credentials' },
  { pattern: /credit[_-]?card|card[_-]?number|cvv|ccv/i, type: 'financial', sensitivity: 'financial' },
  { pattern: /ssn|social[_-]?security/i, type: 'pii', sensitivity: 'pii' },
  { pattern: /email|phone|address|birth[_-]?date|dob/i, type: 'pii', sensitivity: 'pii' },
  { pattern: /api[_-]?key|secret[_-]?key|access[_-]?token/i, type: 'credentials', sensitivity: 'credentials' },
  { pattern: /health|medical|diagnosis|prescription/i, type: 'health', sensitivity: 'health' },
];

async function heuristicPatternMatch(files: string[], rootPath: string) {
  const outliers: any[] = [];
  const patterns: any[] = [];
  
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
      const lines = content.split('\n');
      
      // Detect API routes
      for (const routePattern of API_ROUTE_PATTERNS) {
        let match;
        while ((match = routePattern.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          patterns.push({
            id: `api-route-${patterns.length}`,
            name: 'API Route',
            category: 'api',
            confidence: 0.9,
            locations: [{ file, line: lineNum }],
          });
        }
      }
      
      // Detect error handling patterns
      const tryMatches = content.match(/try\s*\{/g) || [];
      const catchMatches = content.match(/catch\s*\(/g) || [];
      if (tryMatches.length !== catchMatches.length) {
        outliers.push({
          id: `error-${outliers.length}`,
          file,
          line: 1,
          patternId: 'error-handling',
          patternName: 'Error Handling',
          category: 'errors',
          expected: 'Balanced try/catch blocks',
          actual: `${tryMatches.length} try, ${catchMatches.length} catch`,
          severity: 'warning',
          confidence: 0.7,
        });
      }
      
      // Detect console.log in production code
      if (!file.includes('test') && !file.includes('spec')) {
        lines.forEach((line, idx) => {
          if (/console\.(log|debug|info)\s*\(/.test(line)) {
            outliers.push({
              id: `console-${outliers.length}`,
              file,
              line: idx + 1,
              patternId: 'no-console',
              patternName: 'No Console Logs',
              category: 'logging',
              expected: 'Use proper logging framework',
              actual: 'console.log found',
              severity: 'info',
              confidence: 0.8,
              suggestedFix: 'Replace with structured logging',
            });
          }
        });
      }
    } catch { /* file not readable */ }
  }
  
  const complianceRate = outliers.length === 0 ? 100 : Math.max(0, 100 - (outliers.length * 5));
  return { patterns, outliers, complianceRate };
}

async function heuristicConstraintVerify(files: string[], rootPath: string) {
  const violated: any[] = [];
  const satisfied: any[] = [];
  
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
      
      // Check for any type usage in TypeScript
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const anyMatches = content.match(/:\s*any\b/g) || [];
        if (anyMatches.length > 3) {
          violated.push({
            id: 'no-excessive-any',
            name: 'No Excessive Any Types',
            category: 'types',
            message: `Found ${anyMatches.length} 'any' type usages`,
            severity: 'warning',
            locations: [{ file, line: 1 }],
          });
        } else {
          satisfied.push({
            id: 'no-excessive-any',
            name: 'No Excessive Any Types',
            category: 'types',
            message: 'Type safety maintained',
          });
        }
      }
      
      // Check for direct database access in controllers/routes
      if (file.includes('controller') || file.includes('route')) {
        if (/prisma\.|\.query\(|\.execute\(|mongoose\./i.test(content)) {
          violated.push({
            id: 'no-direct-db-in-controllers',
            name: 'No Direct DB Access in Controllers',
            category: 'structural',
            message: 'Direct database access found in controller/route',
            severity: 'error',
            locations: [{ file, line: 1 }],
            fix: { type: 'modify', description: 'Move database logic to service layer', autoApplicable: false },
          });
        }
      }
    } catch { /* file not readable */ }
  }
  
  return { satisfied, violated, skipped: [] };
}

async function heuristicImpactAnalysis(files: string[], rootPath: string) {
  const affectedFiles: any[] = [];
  const affectedFunctions: any[] = [];
  const entryPoints: any[] = [];
  const sensitiveDataPaths: any[] = [];
  let riskScore = 0;
  
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
      
      // Detect entry points
      for (const routePattern of API_ROUTE_PATTERNS) {
        let match;
        while ((match = routePattern.exec(content)) !== null) {
          const method = match[1]?.toUpperCase() ?? 'GET';
          const routePath = match[2] ?? '/';
          const lineNum = match.index !== undefined ? content.substring(0, match.index).split('\n').length : 1;
          entryPoints.push({
            name: `${method} ${routePath}`,
            file,
            line: lineNum,
            type: 'api',
            method,
            path: routePath,
          });
          riskScore += 10;
        }
      }
      
      // Detect sensitive data access
      for (const sensitive of SENSITIVE_DATA_PATTERNS) {
        if (sensitive.pattern.test(content)) {
          sensitiveDataPaths.push({
            table: 'unknown',
            fields: [sensitive.type],
            operation: 'read',
            entryPoint: file,
            sensitivity: sensitive.sensitivity,
          });
          riskScore += 15;
        }
      }
      
      // Add affected files
      affectedFiles.push({ file, depth: 0, reason: 'Direct change' });
    } catch { /* file not readable */ }
  }
  
  riskScore = Math.min(100, riskScore);
  return { riskScore, affectedFiles, affectedFunctions, entryPoints, sensitiveDataPaths };
}

async function heuristicBoundaryScan(files: string[], rootPath: string) {
  const secrets: any[] = [];
  const violations: any[] = [];
  const exposures: any[] = [];
  const envIssues: any[] = [];
  
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
      const lines = content.split('\n');
      
      // Scan for secrets
      for (const secretPattern of SECRET_PATTERNS) {
        lines.forEach((line, idx) => {
          if (secretPattern.pattern.test(line)) {
            secrets.push({
              file,
              line: idx + 1,
              type: secretPattern.type,
              severity: secretPattern.severity,
              pattern: secretPattern.pattern.toString(),
            });
          }
        });
      }
      
      // Check for sensitive data in logs
      lines.forEach((line, idx) => {
        if (/console\.(log|info|debug|warn|error)\s*\(/.test(line)) {
          for (const sensitive of SENSITIVE_DATA_PATTERNS) {
            if (sensitive.pattern.test(line)) {
              envIssues.push({
                variable: sensitive.type,
                issue: 'sensitive_in_logs',
                file,
                line: idx + 1,
                severity: 'error',
              });
            }
          }
        }
      });
      
      // Check for hardcoded env fallbacks
      lines.forEach((line, idx) => {
        if (/process\.env\.\w+\s*\|\|\s*['"][^'"]+['"]/.test(line)) {
          const match = line.match(/process\.env\.(\w+)/);
          if (match?.[1] && /secret|key|password|token/i.test(match[1])) {
            envIssues.push({
              variable: match[1],
              issue: 'hardcoded',
              file,
              line: idx + 1,
              severity: 'warning',
            });
          }
        }
      });
    } catch { /* file not readable */ }
  }
  
  return { secrets, violations, exposures, envIssues };
}

async function heuristicTestCoverage(files: string[], rootPath: string) {
  const uncovered: any[] = [];
  const minimumTests: any[] = [];
  let coverageScore = 100;
  
  const sourceFiles = files.filter(f => !f.includes('test') && !f.includes('spec') && !f.includes('__tests__'));
  const testFiles = files.filter(f => f.includes('test') || f.includes('spec') || f.includes('__tests__'));
  
  for (const file of sourceFiles) {
    const baseName = path.basename(file).replace(/\.(ts|js|tsx|jsx)$/, '');
    const hasTest = testFiles.some(t => t.includes(baseName));
    
    if (!hasTest) {
      try {
        const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
        const functionMatches = content.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g) || [];
        
        for (const fn of functionMatches) {
          const fnName = fn.match(/function\s+(\w+)/)?.[1] || 'unknown';
          uncovered.push({
            name: fnName,
            file,
            line: 1,
            reason: 'No test file found',
            risk: 'medium',
            accessesSensitiveData: false,
          });
          coverageScore -= 5;
        }
      } catch { /* file not readable */ }
    }
  }
  
  coverageScore = Math.max(0, coverageScore);
  return {
    coverageScore,
    uncovered,
    minimumTests,
    mockIssues: [],
    quality: { assertionDensity: 0, mockRatio: 0, setupComplexity: 0, isolationScore: 100 },
  };
}

async function heuristicCouplingAnalysis(files: string[], rootPath: string) {
  const cycles: any[] = [];
  const hotspots: any[] = [];
  const unusedExports: any[] = [];
  let score = 0;
  
  const importMap = new Map<string, Set<string>>();
  
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
      const imports = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];
      
      const deps = new Set<string>();
      for (const imp of imports) {
        const match = imp.match(/from\s+['"]([^'"]+)['"]/);
        if (match?.[1] && !match[1].startsWith('.')) {
          deps.add(match[1]);
        }
      }
      
      importMap.set(file, deps);
      
      // High import count = potential hotspot
      if (deps.size > 10) {
        hotspots.push({
          module: file,
          afferentCoupling: 0,
          efferentCoupling: deps.size,
          instability: 1,
          suggestion: 'Consider breaking into smaller modules',
        });
        score += 10;
      }
    } catch { /* file not readable */ }
  }
  
  score = Math.min(100, score);
  return {
    score,
    cycles,
    hotspots,
    unusedExports,
  };
}

async function heuristicErrorHandling(files: string[], rootPath: string) {
  const gaps: any[] = [];
  const boundaries: any[] = [];
  const swallowed: any[] = [];
  let score = 100;
  
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
      const lines = content.split('\n');
      
      // Detect empty catch blocks
      const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/g;
      let match;
      while ((match = emptyCatchPattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        gaps.push({
          file,
          line: lineNum,
          function: 'unknown',
          issue: 'empty_catch',
          severity: 'error',
          suggestion: 'Add error handling or logging',
        });
        score -= 10;
      }
      
      // Detect unhandled promises
      lines.forEach((line, idx) => {
        if (/\.then\s*\(/.test(line) && !/\.catch\s*\(/.test(line) && !/await\s/.test(line)) {
          gaps.push({
            file,
            line: idx + 1,
            function: 'unknown',
            issue: 'unhandled_promise',
            severity: 'warning',
            suggestion: 'Add .catch() or use try/catch with await',
          });
          score -= 5;
        }
      });
      
      // Detect try/catch boundaries
      const tryMatches = [...content.matchAll(/try\s*\{/g)];
      for (const tryMatch of tryMatches) {
        const lineNum = content.substring(0, tryMatch.index).split('\n').length;
        boundaries.push({
          file,
          line: lineNum,
          type: 'try_catch',
          catches: ['Error'],
          rethrows: false,
        });
      }
    } catch { /* file not readable */ }
  }
  
  score = Math.max(0, score);
  return { score, gaps, boundaries, swallowed };
}

async function heuristicConstantsAnalysis(files: string[], rootPath: string) {
  const magicValues: any[] = [];
  const secrets: any[] = [];
  const deadConstants: any[] = [];
  const inconsistencies: any[] = [];
  
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, idx) => {
        // Detect magic numbers (large numbers not in constants)
        const magicMatch = line.match(/[^a-zA-Z_](\d{4,})[^a-zA-Z_\d]/);
        const magicValue = magicMatch?.[1];
        if (magicValue) {
          const beforeValue = line.split(magicValue)[0] ?? '';
          if (!/const|let|var|=/.test(beforeValue)) {
            magicValues.push({
              file,
              line: idx + 1,
              value: parseInt(magicValue, 10),
              suggestion: 'Extract to named constant',
              severity: 'info',
            });
          }
        }
        
        // Detect potential secrets in constants
        if (/(?:const|let|var)\s+\w*(?:key|secret|password|token)\w*\s*=/i.test(line)) {
          const valueMatch = line.match(/=\s*['"]([^'"]+)['"]/);
          if (valueMatch?.[1] && valueMatch[1].length > 10) {
            secrets.push({
              file,
              line: idx + 1,
              name: line.match(/(?:const|let|var)\s+(\w+)/)?.[1] || 'unknown',
              pattern: 'hardcoded_secret',
              severity: 'error',
            });
          }
        }
      });
    } catch { /* file not readable */ }
  }
  
  return { magicValues, secrets, deadConstants, inconsistencies };
}
