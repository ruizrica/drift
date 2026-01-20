/**
 * Approve Pattern Command - drift.approvePattern
 * @requirements 28.1
 */

import type { ServerContext, CommandResult } from '../server/types.js';

/**
 * Execute approve pattern command
 * Marks a pattern as approved, removing all violations for that pattern
 */
export async function executeApprovePattern(
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

  logger.info(`Approving pattern: ${patternId}`);

  // Check if pattern exists
  const pattern = state.patterns.get(patternId);
  if (!pattern) {
    // Pattern might not be in cache, but we can still approve it
    logger.warn(`Pattern not found in cache: ${patternId}`);
  }

  // TODO: Integrate with driftdetect-core pattern store to persist approval
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
        const filteredDiagnostics = diagnostics.filter((d) => d.patternId !== patternId);
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
    `Pattern "${patternId}" approved. ${removedCount} violation${removedCount === 1 ? '' : 's'} removed.`
  );

  logger.info(`Pattern approved: ${patternId}, removed ${removedCount} violations`);

  return {
    success: true,
    message: `Pattern "${patternId}" approved`,
    data: {
      patternId,
      removedViolations: removedCount,
    },
  };
}

/**
 * Approve multiple patterns at once
 */
export async function executeApprovePatterns(
  context: ServerContext,
  patternIds: string[]
): Promise<CommandResult> {
  const results: { patternId: string; removedViolations: number }[] = [];

  for (const patternId of patternIds) {
    const result = await executeApprovePattern(context, patternId);
    if (result.success && result.data) {
      results.push(result.data as { patternId: string; removedViolations: number });
    }
  }

  const totalRemoved = results.reduce((sum, r) => sum + r.removedViolations, 0);

  return {
    success: true,
    message: `Approved ${results.length} patterns, removed ${totalRemoved} violations`,
    data: { results },
  };
}
