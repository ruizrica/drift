/**
 * Ignore Once Command - drift.ignoreOnce
 * @requirements 28.3
 */

import type { ServerContext, CommandResult } from '../server/types.js';

/**
 * Execute ignore once command
 * Ignores a specific violation occurrence without affecting other occurrences
 */
export async function executeIgnoreOnce(
  context: ServerContext,
  violationId: string,
  uri: string,
  line: number
): Promise<CommandResult> {
  const { state, logger, connection } = context;

  if (!violationId) {
    return {
      success: false,
      error: 'Violation ID is required',
    };
  }

  if (!uri) {
    return {
      success: false,
      error: 'Document URI is required',
    };
  }

  logger.info(`Ignoring violation once: ${violationId} at ${uri}:${line}`);

  // TODO: Integrate with driftdetect-core to persist inline ignore comment
  // For now, we'll update the in-memory state

  // Find and remove the specific violation
  const violations = state.violations.get(uri);
  if (!violations) {
    return {
      success: false,
      error: `No violations found for document: ${uri}`,
    };
  }

  const violationIndex = violations.findIndex((v) => v.id === violationId);
  if (violationIndex === -1) {
    return {
      success: false,
      error: `Violation not found: ${violationId}`,
    };
  }

  const violation = violations[violationIndex];
  if (!violation) {
    return {
      success: false,
      error: `Violation not found: ${violationId}`,
    };
  }

  // Remove the violation
  violations.splice(violationIndex, 1);
  state.violations.set(uri, violations);

  // Update diagnostics
  const diagnostics = state.diagnostics.get(uri);
  if (diagnostics) {
    const filteredDiagnostics = diagnostics.filter((diag) => diag.violationId !== violationId);
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

  // TODO: Add inline ignore comment to the document
  // This would require a workspace edit to insert a comment like:
  // // drift-ignore-next-line: pattern-id
  // or
  // // drift-ignore: violation-id

  logger.info(`Violation ignored: ${violationId}`);

  return {
    success: true,
    message: `Violation ignored at line ${line + 1}`,
    data: {
      violationId,
      uri,
      line,
      patternId: violation.patternId,
    },
  };
}

/**
 * Generate ignore comment for a violation
 */
export function generateIgnoreComment(
  patternId: string,
  language: string
): string {
  const comment = `drift-ignore-next-line: ${patternId}`;

  switch (language) {
    case 'javascript':
    case 'typescript':
    case 'javascriptreact':
    case 'typescriptreact':
    case 'java':
    case 'c':
    case 'cpp':
    case 'csharp':
    case 'go':
    case 'rust':
    case 'swift':
    case 'kotlin':
      return `// ${comment}`;

    case 'python':
    case 'ruby':
    case 'perl':
    case 'shell':
    case 'bash':
    case 'yaml':
    case 'toml':
      return `# ${comment}`;

    case 'html':
    case 'xml':
    case 'svg':
      return `<!-- ${comment} -->`;

    case 'css':
    case 'scss':
    case 'less':
      return `/* ${comment} */`;

    case 'sql':
      return `-- ${comment}`;

    case 'lua':
      return `-- ${comment}`;

    default:
      return `// ${comment}`;
  }
}

/**
 * Create workspace edit to insert ignore comment
 */
export function createIgnoreCommentEdit(
  uri: string,
  line: number,
  patternId: string,
  language: string,
  indentation: string = ''
): {
  changes: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>>;
} {
  const comment = generateIgnoreComment(patternId, language);

  return {
    changes: {
      [uri]: [
        {
          range: {
            start: { line, character: 0 },
            end: { line, character: 0 },
          },
          newText: `${indentation}${comment}\n`,
        },
      ],
    },
  };
}
