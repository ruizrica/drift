/**
 * Drift Dashboard Server
 *
 * Main entry point for the dashboard server package.
 * Exports the DashboardServer class and related types.
 */

export { DashboardServer } from './dashboard-server.js';
export type { DashboardServerOptions } from './dashboard-server.js';

export { DriftDataReader } from './drift-data-reader.js';
export type {
  PatternQuery,
  ViolationQuery,
  DashboardPattern,
  DashboardPatternWithLocations,
  DashboardViolation,
  DashboardStats,
  FileTreeNode,
  FileDetails,
  DriftConfig,
  DetectorConfigEntry,
  SemanticLocation,
  OutlierWithDetails,
} from './drift-data-reader.js';

export { createApiRoutes, errorHandler, notFoundHandler } from './api-routes.js';
export type { ApiError } from './api-routes.js';
export { NotFoundError, BadRequestError, InternalServerError } from './api-routes.js';

export { createExpressApp } from './express-app.js';
export type { ExpressAppOptions } from './express-app.js';

export { WebSocketManager } from './websocket-server.js';
export type { WebSocketMessage, WebSocketMessageType, PatternUpdatePayload, PatternsChangedPayload } from './websocket-server.js';

export { PatternWatcher } from './pattern-watcher.js';
export type { PatternChangeEvent, PatternWatcherOptions } from './pattern-watcher.js';
