//! Helper for emitting temporal events from mutation paths.
//! Used by memory_crud, link_ops, version_ops, audit_ops to emit events
//! in the same SQLite transaction as the original mutation (CR3).

use chrono::Utc;
use rusqlite::Connection;

use cortex_core::errors::CortexResult;

use crate::queries::event_ops;

/// Emit a temporal event in the same transaction as the calling mutation.
pub fn emit_event(
    conn: &Connection,
    memory_id: &str,
    event_type: &str,
    delta: &serde_json::Value,
    actor_type: &str,
    actor_id: &str,
) -> CortexResult<u64> {
    // Check if the memory_events table exists (graceful pre-migration handling).
    let table_exists: bool = conn
        .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='memory_events'")
        .and_then(|mut stmt| stmt.exists([]))
        .unwrap_or(false);

    if !table_exists {
        return Ok(0); // Pre-migration: no event store yet
    }

    let recorded_at = Utc::now().to_rfc3339();
    let delta_str = delta.to_string();

    event_ops::insert_event(
        conn,
        memory_id,
        &recorded_at,
        event_type,
        &delta_str,
        actor_type,
        actor_id,
        None,
        1,
    )
}
