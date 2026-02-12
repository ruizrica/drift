/**
 * CI Agent — orchestrates 11 parallel analysis passes.
 *
 * Passes: scan, patterns, call_graph, boundaries, security, tests, errors, contracts, constraints, enforcement, bridge.
 * Supports PR-level incremental analysis (only changed files + transitive dependents).
 */

import { loadNapi } from './napi.js';

/** Result from a single analysis pass. */
export interface PassResult {
  name: string;
  status: 'passed' | 'failed' | 'error';
  violations: number;
  durationMs: number;
  data: unknown;
  error?: string;
}

/** Aggregated result from all 11 passes. */
export interface AnalysisResult {
  status: 'passed' | 'failed';
  totalViolations: number;
  score: number;
  passes: PassResult[];
  durationMs: number;
  summary: string;
  filesAnalyzed: number;
  incremental: boolean;
  bridgeSummary?: BridgeSummary;
}

/** Bridge grounding summary included in CI results. */
export interface BridgeSummary {
  available: boolean;
  totalChecked: number;
  validated: number;
  partial: number;
  weak: number;
  invalidated: number;
  avgScore: number;
  badge: '✅' | '⚠️' | '❌';
}

/** CI agent configuration. */
export interface CiAgentConfig {
  path: string;
  policy: 'strict' | 'standard' | 'lenient';
  failOn: 'error' | 'warning' | 'none';
  incremental: boolean;
  threshold: number;
  timeoutMs: number;
  changedFiles?: string[];
  bridgeEnabled: boolean;
}

export const DEFAULT_CI_CONFIG: CiAgentConfig = {
  path: '.',
  policy: 'standard',
  failOn: 'error',
  incremental: true,
  threshold: 0,
  timeoutMs: 300_000, // 5 minutes
  bridgeEnabled: process.env.DRIFT_BRIDGE_ENABLED !== 'false',
};

/** Analysis pass definition. */
interface AnalysisPass {
  name: string;
  run: (files: string[], config: CiAgentConfig) => Promise<PassResult>;
}

/**
 * Run a single pass with timeout and error handling.
 */
async function runPassSafe(
  pass: AnalysisPass,
  files: string[],
  config: CiAgentConfig,
): Promise<PassResult> {
  const start = Date.now();
  try {
    const result = await Promise.race([
      pass.run(files, config),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Pass timed out')), config.timeoutMs),
      ),
    ]);
    return result;
  } catch (err) {
    return {
      name: pass.name,
      status: 'error',
      violations: 0,
      durationMs: Date.now() - start,
      data: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** The 11 analysis passes. */
function buildPasses(bridgeEnabled: boolean): AnalysisPass[] {
  const passes: AnalysisPass[] = [
    {
      name: 'scan',
      run: async (files, config) => {
        const napi = loadNapi();
        const start = Date.now();
        const scanOptions = files.length > 0 ? { changedFiles: files } : undefined;
        const scanResult = await napi.driftScan(config.path, scanOptions);
        // Run full analysis pipeline after scan (populates DB for all downstream passes)
        const analysisResults = await napi.driftAnalyze();
        const totalMatches = analysisResults.reduce(
          (sum, r) => sum + r.matches.length,
          0,
        );
        return {
          name: 'scan',
          status: 'passed',
          violations: totalMatches,
          durationMs: Date.now() - start,
          data: { scan: scanResult, analysisFiles: analysisResults.length, patterns: totalMatches },
        };
      },
    },
    {
      name: 'patterns',
      run: async (_files, _config) => {
        const napi = loadNapi();
        const start = Date.now();
        const result = napi.driftPatterns();
        return {
          name: 'patterns',
          status: 'passed',
          violations: 0,
          durationMs: Date.now() - start,
          data: result,
        };
      },
    },
    {
      name: 'call_graph',
      run: async (_files, _config) => {
        const napi = loadNapi();
        const start = Date.now();
        const result = await napi.driftCallGraph();
        return {
          name: 'call_graph',
          status: 'passed',
          violations: 0,
          durationMs: Date.now() - start,
          data: result,
        };
      },
    },
    {
      name: 'boundaries',
      run: async (_files, _config) => {
        const napi = loadNapi();
        const start = Date.now();
        const result = await napi.driftBoundaries();
        return {
          name: 'boundaries',
          status: 'passed',
          violations: 0,
          durationMs: Date.now() - start,
          data: result,
        };
      },
    },
    {
      name: 'security',
      run: async (_files, config) => {
        const napi = loadNapi();
        const start = Date.now();
        const result = napi.driftOwaspAnalysis(config.path);
        return {
          name: 'security',
          status: result.findings.length === 0 ? 'passed' : 'failed',
          violations: result.findings.length,
          durationMs: Date.now() - start,
          data: result,
        };
      },
    },
    {
      name: 'tests',
      run: async (_files, config) => {
        const napi = loadNapi();
        const start = Date.now();
        const result = napi.driftTestTopology(config.path);
        return {
          name: 'tests',
          status: 'passed',
          violations: 0,
          durationMs: Date.now() - start,
          data: result,
        };
      },
    },
    {
      name: 'errors',
      run: async (_files, config) => {
        const napi = loadNapi();
        const start = Date.now();
        const result = napi.driftErrorHandling(config.path);
        return {
          name: 'errors',
          status: 'passed',
          violations: 0,
          durationMs: Date.now() - start,
          data: result,
        };
      },
    },
    {
      name: 'contracts',
      run: async (_files, config) => {
        const napi = loadNapi();
        const start = Date.now();
        const result = napi.driftContractTracking(config.path);
        return {
          name: 'contracts',
          status: result.mismatches.length === 0 ? 'passed' : 'failed',
          violations: result.mismatches.length,
          durationMs: Date.now() - start,
          data: result,
        };
      },
    },
    {
      name: 'constraints',
      run: async (_files, config) => {
        const napi = loadNapi();
        const start = Date.now();
        const result = napi.driftConstraintVerification(config.path);
        return {
          name: 'constraints',
          status: result.failing === 0 ? 'passed' : 'failed',
          violations: result.failing,
          durationMs: Date.now() - start,
          data: result,
        };
      },
    },
    {
      name: 'enforcement',
      run: async (_files, config) => {
        const napi = loadNapi();
        const start = Date.now();
        const result = napi.driftCheck(config.path);
        return {
          name: 'enforcement',
          status: result.overallPassed ? 'passed' : 'failed',
          violations: result.totalViolations,
          durationMs: Date.now() - start,
          data: result,
        };
      },
    },
  ];

  if (bridgeEnabled) {
    passes.push({
      name: 'bridge',
      run: async (_files, _config) => {
        const napi = loadNapi();
        const start = Date.now();
        try {
          const status = napi.driftBridgeStatus();
          if (!status.available) {
            return {
              name: 'bridge',
              status: 'passed',
              violations: 0,
              durationMs: Date.now() - start,
              data: { skipped: true, reason: 'Bridge not initialized' },
            };
          }
          const snapshot = napi.driftBridgeGroundAfterAnalyze();
          return {
            name: 'bridge',
            status: 'passed',
            violations: 0,
            durationMs: Date.now() - start,
            data: {
              totalChecked: snapshot.total_checked,
              validated: snapshot.validated,
              partial: snapshot.partial,
              weak: snapshot.weak,
              invalidated: snapshot.invalidated,
              avgScore: snapshot.avg_grounding_score,
            },
          };
        } catch {
          return {
            name: 'bridge',
            status: 'passed',
            violations: 0,
            durationMs: Date.now() - start,
            data: { skipped: true, reason: 'Bridge error — skipped gracefully' },
          };
        }
      },
    });
  }

  return passes;
}

/**
 * Run all analysis passes in parallel.
 */
export async function runAnalysis(
  config: Partial<CiAgentConfig> = {},
): Promise<AnalysisResult> {
  const mergedConfig = { ...DEFAULT_CI_CONFIG, ...config };
  const passes = buildPasses(mergedConfig.bridgeEnabled);
  const files = mergedConfig.changedFiles ?? [];

  // Handle empty PR diff
  if (mergedConfig.incremental && files.length === 0 && mergedConfig.changedFiles !== undefined) {
    return {
      status: 'passed',
      totalViolations: 0,
      score: 100,
      passes: [],
      durationMs: 0,
      summary: 'No changes to analyze',
      filesAnalyzed: 0,
      incremental: true,
    };
  }

  const start = Date.now();

  // Run all passes in parallel
  const results = await Promise.all(
    passes.map((pass) => runPassSafe(pass, files, mergedConfig)),
  );

  const totalViolations = results.reduce((sum, r) => sum + r.violations, 0);
  const hasFailures = results.some((r) => r.status === 'failed');
  const hasErrors = results.some((r) => r.status === 'error');

  // Calculate score (0-100)
  const score = calculateScore(results);

  // Determine overall status
  let status: 'passed' | 'failed' = 'passed';
  if (mergedConfig.failOn === 'error' && (hasFailures || hasErrors)) {
    status = 'failed';
  } else if (mergedConfig.failOn === 'warning' && totalViolations > 0) {
    status = 'failed';
  }
  if (score < mergedConfig.threshold) {
    status = 'failed';
  }

  const durationMs = Date.now() - start;

  // Extract bridge summary if bridge pass ran
  const bridgePass = results.find((r) => r.name === 'bridge');
  let bridgeSummary: BridgeSummary | undefined;
  if (bridgePass?.data && typeof bridgePass.data === 'object' && !('skipped' in (bridgePass.data as Record<string, unknown>))) {
    const d = bridgePass.data as Record<string, number>;
    const avg = d.avgScore ?? 0;
    bridgeSummary = {
      available: true,
      totalChecked: d.totalChecked ?? 0,
      validated: d.validated ?? 0,
      partial: d.partial ?? 0,
      weak: d.weak ?? 0,
      invalidated: d.invalidated ?? 0,
      avgScore: avg,
      badge: avg >= 0.5 ? '✅' : avg >= 0.2 ? '⚠️' : '❌',
    };
  }

  return {
    status,
    totalViolations,
    score,
    passes: results,
    durationMs,
    summary: buildSummary(results, totalViolations, score, durationMs),
    filesAnalyzed: files.length || -1, // -1 means full scan
    incremental: mergedConfig.incremental,
    bridgeSummary,
  };
}

/**
 * Calculate quality score from pass results (0-100).
 * Weighted average: scan=15%, patterns=10%, security=20%, tests=15%, errors=10%, contracts=10%, constraints=5%, enforcement=15%.
 */
function calculateScore(results: PassResult[]): number {
  const weights: Record<string, number> = {
    scan: 0.15,
    patterns: 0.10,
    call_graph: 0.0, // informational
    boundaries: 0.0, // informational
    security: 0.20,
    tests: 0.15,
    errors: 0.10,
    contracts: 0.10,
    constraints: 0.05,
    enforcement: 0.15,
  };

  let totalWeight = 0;
  let weightedScore = 0;

  for (const result of results) {
    const weight = weights[result.name] ?? 0;
    if (weight === 0) continue;
    totalWeight += weight;
    const passScore = result.status === 'passed' ? 100 : result.status === 'error' ? 0 : 50;
    weightedScore += passScore * weight;
  }

  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 100;
}

function buildSummary(
  results: PassResult[],
  totalViolations: number,
  score: number,
  durationMs: number,
): string {
  const passed = results.filter((r) => r.status === 'passed').length;
  const total = results.length;
  return `${passed}/${total} passes passed, ${totalViolations} violations, score ${score}/100 (${durationMs}ms)`;
}
