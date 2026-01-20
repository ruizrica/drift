/**
 * Create Variant Command - drift.createVariant
 * @requirements 28.4
 */

import type { ServerContext, CommandResult } from '../server/types.js';

/**
 * Execute create variant command
 * Creates a new pattern variant from an existing violation
 */
export async function executeCreateVariant(
  context: ServerContext,
  patternId: string,
  violationId?: string
): Promise<CommandResult> {
  const { state, logger, connection } = context;

  if (!patternId) {
    return {
      success: false,
      error: 'Pattern ID is required',
    };
  }

  logger.info(`Creating variant for pattern: ${patternId}`);

  // Get the base pattern
  const basePattern = state.patterns.get(patternId);
  if (!basePattern) {
    return {
      success: false,
      error: `Pattern not found: ${patternId}`,
    };
  }

  // If violation ID provided, get the violation for context
  let violation: { file: string; location?: unknown } | null = null;
  if (violationId) {
    for (const violations of state.violations.values()) {
      const found = violations.find((v) => v.id === violationId);
      if (found) {
        violation = { file: found.file, location: found.range };
        break;
      }
    }
  }

  // TODO: Integrate with driftdetect-core variant manager
  // For now, we'll create a variant with a generated name

  // Generate variant ID and name
  const variantId = generateVariantId(patternId);
  const variantName = `${basePattern.name ?? patternId} (variant)`;

  // Create the variant (in-memory for now)
  const variant = {
    id: variantId,
    basePatternId: patternId,
    name: variantName,
    description: undefined,
    createdAt: new Date().toISOString(),
    context: violation ? {
      file: violation.file,
      location: violation.location,
    } : undefined,
  };

  logger.info(`Variant created: ${variantId}`);

  // Show success message
  connection.window.showInformationMessage(
    `Variant "${variantName}" created for pattern "${patternId}"`
  );

  return {
    success: true,
    message: `Variant "${variantName}" created`,
    data: {
      variant,
      basePatternId: patternId,
    },
  };
}

/**
 * Generate a unique variant ID
 */
function generateVariantId(basePatternId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${basePatternId}:variant:${timestamp}${random}`;
}

/**
 * Validate variant name
 */
export function validateVariantName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Variant name cannot be empty';
  }

  if (name.length > 100) {
    return 'Variant name must be 100 characters or less';
  }

  if (!/^[a-zA-Z0-9\s\-_()]+$/.test(name)) {
    return 'Variant name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses';
  }

  return null;
}

/**
 * Get suggested variant names based on violation context
 */
export function getSuggestedVariantNames(
  basePatternName: string,
  violationContext?: {
    file?: string;
    message?: string;
  }
): string[] {
  const suggestions: string[] = [];

  // Base suggestion
  suggestions.push(`${basePatternName} (variant)`);

  // File-based suggestion
  if (violationContext?.file) {
    const fileName = violationContext.file.split('/').pop()?.replace(/\.[^.]+$/, '');
    if (fileName) {
      suggestions.push(`${basePatternName} (${fileName})`);
    }
  }

  // Context-based suggestions
  suggestions.push(`${basePatternName} (alternative)`);
  suggestions.push(`${basePatternName} (exception)`);
  suggestions.push(`${basePatternName} (legacy)`);

  return suggestions;
}
