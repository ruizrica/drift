/**
 * GitHub Comment Reporter - Formats analysis results as markdown comments
 */

import type {
  AnalysisResult,
  CommentPayload,
  Annotation,
  PatternViolation,
  ConstraintResult,
  SecurityAnalysis,
  Suggestion,
} from '../types.js';

export interface ReporterConfig {
  showSuggestions: boolean;
  showImpact: boolean;
  showLearnings: boolean;
  maxAnnotations: number;
  collapseLongSections: boolean;
}

const DEFAULT_CONFIG: ReporterConfig = {
  showSuggestions: true,
  showImpact: true,
  showLearnings: false,
  maxAnnotations: 50,
  collapseLongSections: true,
};

export class GitHubCommentReporter {
  constructor(private config: ReporterConfig = DEFAULT_CONFIG) {}

  /**
   * Format analysis result as a GitHub comment
   */
  format(result: AnalysisResult): CommentPayload {
    const sections: string[] = [];

    // Header with status badge
    sections.push(this.formatHeader(result));

    // Summary
    sections.push(this.formatSummary(result));

    // Pattern violations
    if (result.patterns.violations.length > 0) {
      sections.push(this.formatPatternViolations(result.patterns.violations));
    }

    // Constraint violations
    if (result.constraints.violated.length > 0) {
      sections.push(this.formatConstraintViolations(result.constraints.violated));
    }

    // Security issues
    if (result.security.boundaryViolations.length > 0 || result.security.sensitiveDataExposure.length > 0) {
      sections.push(this.formatSecurityIssues(result.security));
    }

    // Impact analysis
    if (this.config.showImpact && result.impact.affectedFiles.length > 0) {
      sections.push(this.formatImpact(result));
    }

    // Suggestions
    if (this.config.showSuggestions && result.suggestions.length > 0) {
      sections.push(this.formatSuggestions(result.suggestions));
    }

    // Footer
    sections.push(this.formatFooter());

    const body = sections.join('\n\n');
    const annotations = this.extractAnnotations(result);

    return {
      body,
      status: result.status === 'pass' ? 'success' : result.status === 'fail' ? 'failure' : 'pending',
      annotations: annotations.slice(0, this.config.maxAnnotations),
    };
  }

  private formatHeader(result: AnalysisResult): string {
    const emoji = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    const status = result.status === 'pass' ? 'Passed' : result.status === 'warn' ? 'Warning' : 'Failed';
    
    return `## ${emoji} Drift CI Analysis: ${status}`;
  }

  private formatSummary(result: AnalysisResult): string {
    const lines: string[] = ['### Summary', '', result.summary, ''];

    // Quick stats
    const stats: string[] = [];
    if (result.patterns.violations.length > 0) {
      stats.push(`🔴 ${result.patterns.violations.length} pattern violation(s)`);
    }
    if (result.constraints.violated.length > 0) {
      stats.push(`🚫 ${result.constraints.violated.length} constraint(s) violated`);
    }
    if (result.security.boundaryViolations.length > 0) {
      stats.push(`🔒 ${result.security.boundaryViolations.length} security issue(s)`);
    }
    if (result.impact.affectedFiles.length > 0) {
      stats.push(`📁 ${result.impact.affectedFiles.length} file(s) impacted`);
    }
    if (result.patterns.driftScore > 0) {
      stats.push(`📊 Drift score: ${result.patterns.driftScore}/100`);
    }

    if (stats.length > 0) {
      lines.push(stats.join(' | '));
    }

    return lines.join('\n');
  }

  private formatPatternViolations(violations: PatternViolation[]): string {
    const lines: string[] = ['### 🔴 Pattern Violations', ''];

    const grouped = this.groupBy(violations, v => v.severity);
    
    for (const severity of ['error', 'warning', 'info'] as const) {
      const items = grouped.get(severity) ?? [];
      if (items.length === 0) continue;

      const emoji = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
      
      for (const v of items.slice(0, 10)) {
        lines.push(`${emoji} **${v.pattern}** in \`${v.file}:${v.line}\``);
        lines.push(`  - Expected: ${v.expected}`);
        lines.push(`  - Found: ${v.actual}`);
        if (v.suggestedFix) {
          lines.push(`  - 💡 Fix: ${v.suggestedFix}`);
        }
        lines.push('');
      }

      if (items.length > 10) {
        lines.push(`<details><summary>...and ${items.length - 10} more ${severity}s</summary>\n`);
        for (const v of items.slice(10)) {
          lines.push(`- \`${v.file}:${v.line}\` - ${v.pattern}`);
        }
        lines.push('</details>\n');
      }
    }

    return lines.join('\n');
  }

  private formatConstraintViolations(violations: ConstraintResult[]): string {
    const lines: string[] = ['### 🚫 Constraint Violations', ''];

    for (const v of violations) {
      lines.push(`**${v.name}** (${v.constraintId})`);
      lines.push(`> ${v.message}`);
      if (v.locations.length > 0) {
        lines.push('');
        lines.push('Locations:');
        for (const loc of v.locations.slice(0, 5)) {
          lines.push(`- \`${loc.file}:${loc.line}\``);
        }
        if (v.locations.length > 5) {
          lines.push(`- ...and ${v.locations.length - 5} more`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatSecurityIssues(security: SecurityAnalysis): string {
    const lines: string[] = ['### 🔒 Security Issues', ''];

    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };

    lines.push(`**Risk Level:** ${riskEmoji[security.riskLevel]} ${security.riskLevel.toUpperCase()}`);
    lines.push('');

    if (security.boundaryViolations.length > 0) {
      lines.push('#### Boundary Violations');
      for (const v of security.boundaryViolations) {
        const emoji = v.severity === 'error' ? '❌' : '⚠️';
        lines.push(`${emoji} **${v.dataType}** flows from \`${v.source}\` to \`${v.target}\``);
      }
      lines.push('');
    }

    if (security.sensitiveDataExposure.length > 0) {
      lines.push('#### Sensitive Data Exposure');
      for (const e of security.sensitiveDataExposure) {
        lines.push(`- \`${e.table}.${e.field}\` (${e.sensitivity}) exposed at \`${e.exposedAt}\``);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatImpact(result: AnalysisResult): string {
    const lines: string[] = ['### 📊 Impact Analysis', ''];

    const { impact } = result;
    
    lines.push(`**Risk Score:** ${impact.riskScore}/100`);
    lines.push('');

    if (impact.entryPoints.length > 0) {
      lines.push('**Entry Points Affected:**');
      for (const ep of impact.entryPoints.slice(0, 5)) {
        lines.push(`- \`${ep}\``);
      }
      if (impact.entryPoints.length > 5) {
        lines.push(`- ...and ${impact.entryPoints.length - 5} more`);
      }
      lines.push('');
    }

    if (this.config.collapseLongSections && impact.affectedFiles.length > 10) {
      lines.push('<details><summary>Affected Files (' + impact.affectedFiles.length + ')</summary>\n');
      for (const f of impact.affectedFiles) {
        lines.push(`- \`${f}\``);
      }
      lines.push('</details>');
    } else if (impact.affectedFiles.length > 0) {
      lines.push('**Affected Files:**');
      for (const f of impact.affectedFiles.slice(0, 10)) {
        lines.push(`- \`${f}\``);
      }
    }

    return lines.join('\n');
  }

  private formatSuggestions(suggestions: Suggestion[]): string {
    const lines: string[] = ['### 💡 Suggestions', ''];

    const byPriority = this.groupBy(suggestions, s => s.priority);
    
    for (const priority of ['high', 'medium', 'low'] as const) {
      const items = byPriority.get(priority) ?? [];
      if (items.length === 0) continue;

      const emoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
      
      for (const s of items) {
        lines.push(`${emoji} **${s.title}**`);
        lines.push(`  ${s.description}`);
        if (s.file) {
          lines.push(`  📍 \`${s.file}${s.line ? ':' + s.line : ''}\``);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  private formatFooter(): string {
    return `---\n*Powered by [Drift CI](https://github.com/dadbodgeoff/drift) - Pattern-aware code analysis*`;
  }

  private extractAnnotations(result: AnalysisResult): Annotation[] {
    const annotations: Annotation[] = [];

    // Pattern violations
    for (const v of result.patterns.violations) {
      annotations.push({
        path: v.file,
        startLine: v.line,
        endLine: v.line,
        level: v.severity === 'error' ? 'failure' : v.severity === 'warning' ? 'warning' : 'notice',
        message: `Expected: ${v.expected}\nFound: ${v.actual}${v.suggestedFix ? '\n\nSuggested fix: ' + v.suggestedFix : ''}`,
        title: `Pattern violation: ${v.pattern}`,
      });
    }

    // Constraint violations
    for (const c of result.constraints.violated) {
      for (const loc of c.locations) {
        annotations.push({
          path: loc.file,
          startLine: loc.line,
          endLine: loc.line,
          level: 'failure',
          message: c.message,
          title: `Constraint violated: ${c.name}`,
        });
      }
    }

    // Security issues
    for (const v of result.security.boundaryViolations) {
      annotations.push({
        path: v.source,
        startLine: 1,
        endLine: 1,
        level: v.severity === 'error' ? 'failure' : 'warning',
        message: `Data type "${v.dataType}" flows to ${v.target} without proper boundary check`,
        title: 'Security boundary violation',
      });
    }

    return annotations;
  }

  private groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();
    for (const item of items) {
      const key = keyFn(item);
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
    }
    return map;
  }
}

export function createGitHubCommentReporter(config?: Partial<ReporterConfig>): GitHubCommentReporter {
  return new GitHubCommentReporter({ ...DEFAULT_CONFIG, ...config });
}
