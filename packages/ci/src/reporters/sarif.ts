/**
 * SARIF Reporter - Generates SARIF 2.1.0 output for IDE integration
 * 
 * SARIF (Static Analysis Results Interchange Format) is the standard
 * for static analysis tools. This enables integration with:
 * - VS Code (via SARIF Viewer extension)
 * - GitHub Code Scanning
 * - Azure DevOps
 * - JetBrains IDEs
 */

import type {
  AnalysisResult,
  SARIFOutput,
  SARIFRun,
  SARIFRule,
  SARIFResult,
  PatternViolation,
  ConstraintResult,
  SecurityAnalysis,
  ErrorGap,
} from '../types.js';

export interface SARIFReporterConfig {
  /** Tool name shown in SARIF output */
  toolName: string;
  /** Tool version */
  toolVersion: string;
  /** Include suggestions as informational results */
  includeSuggestions: boolean;
  /** Include test coverage gaps */
  includeTestGaps: boolean;
  /** Include coupling issues */
  includeCouplingIssues: boolean;
}

const DEFAULT_CONFIG: SARIFReporterConfig = {
  toolName: 'Drift CI',
  toolVersion: '0.9.46',
  includeSuggestions: true,
  includeTestGaps: true,
  includeCouplingIssues: true,
};

export class SARIFReporter {
  private config: SARIFReporterConfig;

  constructor(config: Partial<SARIFReporterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate SARIF output from analysis result
   */
  generate(result: AnalysisResult): SARIFOutput {
    const rules: SARIFRule[] = [];
    const results: SARIFResult[] = [];

    // Pattern violations
    this.addPatternViolations(result.patterns.violations, rules, results);

    // Constraint violations
    this.addConstraintViolations(result.constraints.violated, rules, results);

    // Security issues
    this.addSecurityIssues(result.security, rules, results);

    // Error handling gaps
    this.addErrorHandlingGaps(result.errors.gaps, rules, results);

    // Test coverage gaps (optional)
    if (this.config.includeTestGaps) {
      this.addTestCoverageGaps(result.tests.uncoveredFunctions, rules, results);
    }

    // Coupling issues (optional)
    if (this.config.includeCouplingIssues) {
      this.addCouplingIssues(result.coupling, rules, results);
    }

    // Suggestions (optional)
    if (this.config.includeSuggestions) {
      this.addSuggestions(result.suggestions, rules, results);
    }

    const run: SARIFRun = {
      tool: {
        driver: {
          name: this.config.toolName,
          version: this.config.toolVersion,
          rules: this.deduplicateRules(rules),
        },
      },
      results,
    };

    return {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [run],
    };
  }

  /**
   * Generate SARIF as JSON string
   */
  generateString(result: AnalysisResult, pretty = true): string {
    const sarif = this.generate(result);
    return pretty ? JSON.stringify(sarif, null, 2) : JSON.stringify(sarif);
  }

  // ===========================================================================
  // RULE AND RESULT GENERATORS
  // ===========================================================================

  private addPatternViolations(
    violations: PatternViolation[],
    rules: SARIFRule[],
    results: SARIFResult[]
  ): void {
    for (const v of violations) {
      const ruleId = `drift/pattern/${v.patternId}`;

      rules.push({
        id: ruleId,
        name: v.pattern,
        shortDescription: { text: `Pattern violation: ${v.pattern}` },
        fullDescription: { text: `Expected: ${v.expected}` },
        defaultConfiguration: {
          level: this.severityToLevel(v.severity),
        },
      });

      results.push({
        ruleId,
        level: this.severityToLevel(v.severity),
        message: {
          text: `${v.pattern}: Expected "${v.expected}", found "${v.actual}"${v.suggestedFix ? `. Fix: ${v.suggestedFix}` : ''}`,
        },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: v.file },
            region: {
              startLine: v.line,
              endLine: v.endLine ?? v.line,
            },
          },
        }],
      });
    }
  }

  private addConstraintViolations(
    violations: ConstraintResult[],
    rules: SARIFRule[],
    results: SARIFResult[]
  ): void {
    for (const c of violations) {
      const ruleId = `drift/constraint/${c.constraintId}`;

      rules.push({
        id: ruleId,
        name: c.name,
        shortDescription: { text: `Constraint violation: ${c.name}` },
        fullDescription: { text: c.message },
        defaultConfiguration: {
          level: this.severityToLevel(c.severity),
        },
      });

      for (const loc of c.locations) {
        results.push({
          ruleId,
          level: this.severityToLevel(c.severity),
          message: { text: c.message },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: loc.file },
              region: { startLine: loc.line },
            },
          }],
        });
      }
    }
  }

  private addSecurityIssues(
    security: SecurityAnalysis,
    rules: SARIFRule[],
    results: SARIFResult[]
  ): void {
    // Hardcoded secrets
    for (const s of security.hardcodedSecrets) {
      const ruleId = `drift/security/hardcoded-${s.type}`;

      rules.push({
        id: ruleId,
        name: `Hardcoded ${s.type}`,
        shortDescription: { text: `Hardcoded ${s.type} detected` },
        fullDescription: { text: `Secrets should be stored in environment variables or a secrets manager, not in code.` },
        defaultConfiguration: {
          level: this.severityToLevel(s.severity),
        },
      });

      results.push({
        ruleId,
        level: this.severityToLevel(s.severity),
        message: { text: `Hardcoded ${s.type} detected. Move to environment variable or secrets manager.` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: s.file },
            region: { startLine: s.line },
          },
        }],
      });
    }

    // Boundary violations
    for (const v of security.boundaryViolations) {
      const ruleId = 'drift/security/boundary-violation';

      rules.push({
        id: ruleId,
        name: 'Data Boundary Violation',
        shortDescription: { text: 'Sensitive data crosses security boundary' },
        fullDescription: { text: v.description },
        defaultConfiguration: {
          level: this.severityToLevel(v.severity),
        },
      });

      results.push({
        ruleId,
        level: this.severityToLevel(v.severity),
        message: { text: `${v.dataType} flows from ${v.source} to ${v.target} without proper boundary check` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: v.source },
            region: { startLine: 1 },
          },
        }],
      });
    }

    // Environment variable issues
    for (const e of security.envVarIssues) {
      const ruleId = `drift/security/env-${e.issue}`;

      rules.push({
        id: ruleId,
        name: `Environment Variable Issue: ${e.issue}`,
        shortDescription: { text: `Environment variable ${e.variable} has issue: ${e.issue}` },
        defaultConfiguration: {
          level: this.severityToLevel(e.severity),
        },
      });

      results.push({
        ruleId,
        level: this.severityToLevel(e.severity),
        message: { text: `Environment variable ${e.variable}: ${e.issue}` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: e.file },
            region: { startLine: e.line },
          },
        }],
      });
    }
  }

  private addErrorHandlingGaps(
    gaps: ErrorGap[],
    rules: SARIFRule[],
    results: SARIFResult[]
  ): void {
    for (const g of gaps) {
      const ruleId = `drift/error-handling/${g.issue}`;

      rules.push({
        id: ruleId,
        name: `Error Handling: ${g.issue}`,
        shortDescription: { text: `Missing error handling: ${g.issue}` },
        fullDescription: { text: g.suggestion },
        defaultConfiguration: {
          level: this.severityToLevel(g.severity),
        },
      });

      results.push({
        ruleId,
        level: this.severityToLevel(g.severity),
        message: { text: `${g.function}: ${g.suggestion}` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: g.file },
            region: { startLine: g.line },
          },
        }],
      });
    }
  }

  private addTestCoverageGaps(
    uncovered: Array<{ name: string; file: string; line: number; reason: string; risk: string }>,
    rules: SARIFRule[],
    results: SARIFResult[]
  ): void {
    const ruleId = 'drift/test/uncovered-function';

    if (uncovered.length > 0) {
      rules.push({
        id: ruleId,
        name: 'Uncovered Function',
        shortDescription: { text: 'Function lacks test coverage' },
        defaultConfiguration: { level: 'note' },
      });
    }

    for (const u of uncovered) {
      results.push({
        ruleId,
        level: u.risk === 'high' ? 'warning' : 'note',
        message: { text: `${u.name}: ${u.reason}` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: u.file },
            region: { startLine: u.line },
          },
        }],
      });
    }
  }

  private addCouplingIssues(
    coupling: AnalysisResult['coupling'],
    rules: SARIFRule[],
    results: SARIFResult[]
  ): void {
    // Dependency cycles
    if (coupling.cycles.length > 0) {
      const ruleId = 'drift/coupling/dependency-cycle';

      rules.push({
        id: ruleId,
        name: 'Dependency Cycle',
        shortDescription: { text: 'Circular dependency detected' },
        defaultConfiguration: { level: 'warning' },
      });

      for (const c of coupling.cycles) {
        results.push({
          ruleId,
          level: c.severity === 'critical' ? 'error' : 'warning',
          message: { text: `Dependency cycle: ${c.modules.join(' → ')}. ${c.breakSuggestion}` },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: c.modules[0] ?? 'unknown' },
              region: { startLine: 1 },
            },
          }],
        });
      }
    }

    // Unused exports
    if (coupling.unusedExports.length > 0) {
      const ruleId = 'drift/coupling/unused-export';

      rules.push({
        id: ruleId,
        name: 'Unused Export',
        shortDescription: { text: 'Exported symbol is not imported anywhere' },
        defaultConfiguration: { level: 'note' },
      });

      for (const u of coupling.unusedExports) {
        results.push({
          ruleId,
          level: 'note',
          message: { text: `Unused export: ${u.symbol}` },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: u.file },
              region: { startLine: u.line },
            },
          }],
        });
      }
    }
  }

  private addSuggestions(
    suggestions: AnalysisResult['suggestions'],
    rules: SARIFRule[],
    results: SARIFResult[]
  ): void {
    for (const s of suggestions) {
      const ruleId = `drift/suggestion/${s.type}`;

      rules.push({
        id: ruleId,
        name: s.title,
        shortDescription: { text: s.title },
        fullDescription: { text: s.description },
        defaultConfiguration: { level: 'note' },
      });

      if (s.file) {
        results.push({
          ruleId,
          level: 'note',
          message: { text: s.description },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: s.file },
              region: { startLine: s.line ?? 1 },
            },
          }],
        });
      }
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private severityToLevel(severity: string): 'note' | 'warning' | 'error' {
    switch (severity) {
      case 'error':
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'note';
    }
  }

  private deduplicateRules(rules: SARIFRule[]): SARIFRule[] {
    const seen = new Set<string>();
    return rules.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }
}

export function createSARIFReporter(config?: Partial<SARIFReporterConfig>): SARIFReporter {
  return new SARIFReporter(config);
}
