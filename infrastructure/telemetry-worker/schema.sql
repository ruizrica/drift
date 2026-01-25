-- Drift Telemetry Database Schema
-- Run with: wrangler d1 execute drift-telemetry --file=schema.sql

-- Events table - stores raw telemetry events
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  installation_id TEXT NOT NULL,
  drift_version TEXT NOT NULL,
  payload TEXT,  -- JSON blob for event-specific data
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_installation ON events(installation_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

-- Daily aggregated stats for fast queries
CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  metric TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  UNIQUE(date, metric)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_metric ON daily_stats(metric);

-- Pattern signatures for ML training (deduplicated)
CREATE TABLE IF NOT EXISTS pattern_signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  signature_hash TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  detection_method TEXT,
  language TEXT,
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  avg_confidence REAL,
  avg_location_count REAL,
  avg_outlier_count REAL
);

CREATE INDEX IF NOT EXISTS idx_signatures_category ON pattern_signatures(category);
CREATE INDEX IF NOT EXISTS idx_signatures_language ON pattern_signatures(language);

-- User action aggregates for ML training
CREATE TABLE IF NOT EXISTS action_aggregates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  confidence_bucket TEXT NOT NULL,  -- 'low', 'medium', 'high'
  count INTEGER NOT NULL DEFAULT 0,
  avg_hours_to_decision REAL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category, action, confidence_bucket)
);

CREATE INDEX IF NOT EXISTS idx_actions_category ON action_aggregates(category);

-- Cleanup: Auto-delete raw events older than 90 days (run via cron)
-- DELETE FROM events WHERE created_at < datetime('now', '-90 days');
