/**
 * Ignore Pattern Command - drift.ignorePattern
 * @requirements 28.2
 */

import type { ServerContext, CommandResult } from '../server/types.js';

/**
 * Execute ignore pattern command
 * Marks a pattern as ignored, suppressing all violations for that pattern
 */
export async function executeIgnorePattern(
  context: ServerContext,
  patternId: string
): Promise<CommandResult> {
  const { state, logger, connection } = context;

  if (!patternId) {
    return {
      success: false,
      error: 'Pattern ID is required',
    };
  }

  logger.info(`Ignoring pattern: ${patternId}`);

  // TODO: Integrate with driftdetect-core pattern store to persist ignore
  // For now, we'll update the in-memory state

  // Remove violations for this pattern from all documents
  let removedCount = 0;
  for (const [uri, violations] of state.violations) {
    const filtered = violations.filter((v) => v.patternId !== patternId);
    const removed = violations.length - filtered.length;
    if (removed > 0) {
      state.violations.set(uri, filtered);
      removedCount += removed;

      // Update diagnostics for this document
      const diagnostics = state.diagnostics.get(uri);
      if (diagnostics) {
        const filteredDiagnostics = diagnostics.filter((diag) => diag.patternId !== patternId);
        state.diagnostics.set(uri, filteredDiagnostics);

        // Publish updated diagnostics
        connection.sendDiagnostics({
          uri,
          diagnostics: filteredDiagnostics.map((diag) => ({
            range: diag.range,
            severity: diag.severity === 'error' ? 1 : diag.severity === 'warning' ? 2 : diag.severity === 'info' ? 3 : 4,
            code: diag.code,
            source: diag.source,
            message: diag.message,
          })),
        });
      }
    }
  }

  // Show notification
  connection.window.showInformationMessage(
    `Pattern "${patternId}" ignored. ${removedCount} violation${removedCount === 1 ? '' : 's'} suppressed.`
  );

  logger.info(`Pattern ignored: ${patternId}, suppressed ${removedCount} violations`);

  return {
    success: true,
    message: `Pattern "${patternId}" ignored`,
    data: {
      patternId,
      suppressedViolations: removedCount,
    },
  };
}

/**
 * Ignore multiple patterns at once
 */
export async function executeIgnorePatterns(
  context: ServerContext,
  patternIds: string[]
): Promise<CommandResult> {
  const results: { patternId: string; suppressedViolations: number }[] = [];

  for (const patternId of patternIds) {
    const result = await executeIgnorePattern(context, patternId);
    if (result.success && result.data) {
      results.push(result.data as { patternId: string; suppressedViolations: number });
    }
  }

  const totalSuppressed = results.reduce((sum, r) => sum + r.suppressedViolations, 0);

  return {
    success: true,
    message: `Ignored ${results.length} patterns, suppressed ${totalSuppressed} violations`,
    data: { results },
  };
}
