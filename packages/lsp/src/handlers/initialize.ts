/**
 * Initialize Handler
 *
 * Handles the LSP initialize request and initialized notification.
 * Sets up server state and returns capabilities to the client.
 *
 * @requirements 27.1 - THE LSP_Server SHALL implement the Language Server Protocol specification
 */

import type { Connection } from 'vscode-languageserver';

// ============================================================================
// Types
// ============================================================================

interface ServerState {
  initialized: boolean;
  workspaceFolders: Array<{ uri: string; name: string }>;
  hasConfigurationCapability: boolean;
  hasWorkspaceFolderCapability: boolean;
}

interface Logger {
  error(message: string): void;
  warn(message: string): void;
  info(message: string): void;
  debug(message: string): void;
}

/**
 * Initialize handler interface
 */
export interface InitializeHandler {
  /** Called when server is fully initialized */
  onInitialized(): void;
}

// ============================================================================
// Handler Factory
// ============================================================================

/**
 * Create the initialize handler
 *
 * Note: The actual onInitialize is handled in server.ts since it needs
 * to return the InitializeResult synchronously. This handler provides
 * additional initialization logic.
 */
export function createInitializeHandler(
  _connection: Connection,
  state: ServerState,
  logger: Logger
): InitializeHandler {
  return {
    onInitialized(): void {
      logger.info('Server initialization complete');

      // Perform any post-initialization tasks
      if (state.workspaceFolders.length > 0) {
        logger.debug(`Monitoring ${state.workspaceFolders.length} workspace folder(s)`);

        // TODO: Initialize driftdetect-core scanner for each workspace
        // TODO: Load patterns from .drift/ directories
        // TODO: Perform initial scan if needed
      }
    },
  };
}
