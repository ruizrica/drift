/**
 * Integration module exports
 *
 * Provides integration between @drift/lsp and driftdetect-core.
 * Connects the LSP server to the core scanner, pattern store,
 * and variant manager for full drift detection functionality.
 */

export * from './core-scanner.js';
export * from './pattern-store-adapter.js';
export * from './types.js';
