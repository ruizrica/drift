//! 4 bridge-specific SQLite tables with retention policies.
//!
//! Tables:
//! - bridge_grounding_results (90 days Community, unlimited Enterprise)
//! - bridge_grounding_snapshots (365 days)
//! - bridge_event_log (30 days)
//! - bridge_metrics (7 days)

use chrono::Utc;
use rusqlite::{params, Connection};

use crate::errors::{BridgeError, BridgeResult};
use crate::grounding::{GroundingResult, GroundingSnapshot};

/// Create all 4 bridge-specific tables.
pub fn create_bridge_tables(conn: &Connection) -> BridgeResult<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS bridge_grounding_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            memory_id TEXT NOT NULL,
            grounding_score REAL NOT NULL,
            classification TEXT NOT NULL,
            evidence TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
        ) STRICT;

        CREATE TABLE IF NOT EXISTS bridge_grounding_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total_memories INTEGER NOT NULL,
            grounded_count INTEGER NOT NULL,
            validated_count INTEGER NOT NULL,
            partial_count INTEGER NOT NULL,
            weak_count INTEGER NOT NULL,
            invalidated_count INTEGER NOT NULL,
            avg_score REAL NOT NULL DEFAULT 0.0,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
        ) STRICT;

        CREATE TABLE IF NOT EXISTS bridge_event_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            memory_type TEXT,
            memory_id TEXT,
            confidence REAL,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
        ) STRICT;

        CREATE TABLE IF NOT EXISTS bridge_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            recorded_at INTEGER NOT NULL DEFAULT (unixepoch())
        ) STRICT;

        CREATE TABLE IF NOT EXISTS bridge_memories (
            id TEXT PRIMARY KEY NOT NULL,
            memory_type TEXT NOT NULL,
            content TEXT NOT NULL,
            summary TEXT NOT NULL,
            confidence REAL NOT NULL,
            importance TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '[]',
            linked_patterns TEXT NOT NULL DEFAULT '[]',
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
        ) STRICT;

        CREATE INDEX IF NOT EXISTS idx_grounding_results_memory ON bridge_grounding_results(memory_id);
        CREATE INDEX IF NOT EXISTS idx_event_log_type ON bridge_event_log(event_type);
        CREATE INDEX IF NOT EXISTS idx_metrics_name ON bridge_metrics(metric_name);
        CREATE INDEX IF NOT EXISTS idx_memories_type ON bridge_memories(memory_type);
        ",
    )?;
    Ok(())
}

/// Store a memory in the bridge_memories table.
pub fn store_memory(conn: &Connection, memory: &cortex_core::memory::BaseMemory) -> BridgeResult<()> {
    let content_json = serde_json::to_string(&memory.content)?;
    let tags_json = serde_json::to_string(&memory.tags)?;
    let patterns_json = serde_json::to_string(&memory.linked_patterns)?;

    conn.execute(
        "INSERT INTO bridge_memories (id, memory_type, content, summary, confidence, importance, tags, linked_patterns)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            memory.id,
            format!("{:?}", memory.memory_type),
            content_json,
            memory.summary,
            memory.confidence.value(),
            format!("{:?}", memory.importance),
            tags_json,
            patterns_json,
        ],
    )?;
    Ok(())
}

/// Log an event in the bridge_event_log table.
pub fn log_event(
    conn: &Connection,
    event_type: &str,
    memory_type: Option<&str>,
    memory_id: Option<&str>,
    confidence: Option<f64>,
) -> BridgeResult<()> {
    conn.execute(
        "INSERT INTO bridge_event_log (event_type, memory_type, memory_id, confidence) VALUES (?1, ?2, ?3, ?4)",
        params![event_type, memory_type, memory_id, confidence],
    )?;
    Ok(())
}

/// Record a grounding result.
pub fn record_grounding_result(conn: &Connection, result: &GroundingResult) -> BridgeResult<()> {
    let evidence_json = serde_json::to_string(&result.evidence)?;
    conn.execute(
        "INSERT INTO bridge_grounding_results (memory_id, grounding_score, classification, evidence)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            result.memory_id,
            result.grounding_score,
            format!("{:?}", result.verdict),
            evidence_json,
        ],
    )?;
    Ok(())
}

/// Record a grounding snapshot.
pub fn record_grounding_snapshot(conn: &Connection, snapshot: &GroundingSnapshot) -> BridgeResult<()> {
    conn.execute(
        "INSERT INTO bridge_grounding_snapshots
         (total_memories, grounded_count, validated_count, partial_count, weak_count, invalidated_count, avg_score)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            snapshot.total_checked,
            snapshot.validated + snapshot.partial + snapshot.weak + snapshot.invalidated,
            snapshot.validated,
            snapshot.partial,
            snapshot.weak,
            snapshot.invalidated,
            snapshot.avg_grounding_score,
        ],
    )?;
    Ok(())
}

/// Record a metric.
pub fn record_metric(conn: &Connection, name: &str, value: f64) -> BridgeResult<()> {
    conn.execute(
        "INSERT INTO bridge_metrics (metric_name, metric_value) VALUES (?1, ?2)",
        params![name, value],
    )?;
    Ok(())
}

/// ATTACH cortex.db for cross-DB queries. Returns Ok(true) if successful.
/// Uses parameterized query to prevent SQL injection via malicious paths.
pub fn attach_cortex_db(conn: &Connection, cortex_path: &str) -> BridgeResult<bool> {
    match conn.execute("ATTACH DATABASE ?1 AS cortex", params![cortex_path]) {
        Ok(_) => Ok(true),
        Err(e) => {
            tracing::warn!(error = %e, path = cortex_path, "Failed to ATTACH cortex.db");
            Err(BridgeError::AttachFailed {
                db_path: cortex_path.to_string(),
                source: e,
            })
        }
    }
}

/// Detach cortex.db after cross-DB queries.
pub fn detach_cortex_db(conn: &Connection) -> BridgeResult<()> {
    conn.execute_batch("DETACH DATABASE cortex")?;
    Ok(())
}

/// Get the previous grounding score for a memory.
pub fn get_previous_grounding_score(conn: &Connection, memory_id: &str) -> BridgeResult<Option<f64>> {
    let mut stmt = conn.prepare(
        "SELECT grounding_score FROM bridge_grounding_results
         WHERE memory_id = ?1 ORDER BY created_at DESC LIMIT 1",
    )?;
    let result = stmt.query_row(params![memory_id], |row| row.get::<_, f64>(0));
    match result {
        Ok(score) => Ok(Some(score)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Get grounding history for a memory.
pub fn get_grounding_history(
    conn: &Connection,
    memory_id: &str,
    limit: usize,
) -> BridgeResult<Vec<(f64, String, i64)>> {
    let mut stmt = conn.prepare(
        "SELECT grounding_score, classification, created_at FROM bridge_grounding_results
         WHERE memory_id = ?1 ORDER BY created_at DESC LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![memory_id, limit as i64], |row| {
        Ok((
            row.get::<_, f64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
        ))
    })?;
    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

/// Apply retention policy: delete old records.
pub fn apply_retention(conn: &Connection, community_tier: bool) -> BridgeResult<()> {
    let now = Utc::now().timestamp();

    // bridge_event_log: 30 days
    conn.execute(
        "DELETE FROM bridge_event_log WHERE created_at < ?1",
        params![now - 30 * 86400],
    )?;

    // bridge_metrics: 7 days
    conn.execute(
        "DELETE FROM bridge_metrics WHERE recorded_at < ?1",
        params![now - 7 * 86400],
    )?;

    // bridge_grounding_snapshots: 365 days
    conn.execute(
        "DELETE FROM bridge_grounding_snapshots WHERE created_at < ?1",
        params![now - 365 * 86400],
    )?;

    // bridge_grounding_results: 90 days for Community, unlimited for Enterprise
    if community_tier {
        conn.execute(
            "DELETE FROM bridge_grounding_results WHERE created_at < ?1",
            params![now - 90 * 86400],
        )?;
    }

    Ok(())
}
