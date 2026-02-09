//! drift_grounding_check MCP tool: "Check grounding status of a memory."
//! Returns grounding score, verdict, evidence, and history.

use serde_json::json;

use crate::errors::BridgeResult;
use crate::grounding::loop_runner::MemoryForGrounding;
use crate::grounding::{GroundingConfig, GroundingLoopRunner};

/// Handle the drift_grounding_check MCP tool request.
///
/// Grounds a single memory and returns detailed results.
pub fn handle_drift_grounding_check(
    memory: &MemoryForGrounding,
    config: &GroundingConfig,
    bridge_db: Option<&rusqlite::Connection>,
) -> BridgeResult<serde_json::Value> {
    let runner = GroundingLoopRunner::new(config.clone());
    let result = runner.ground_single(memory, None, bridge_db)?;

    let evidence_json: Vec<serde_json::Value> = result
        .evidence
        .iter()
        .map(|e| {
            json!({
                "type": format!("{:?}", e.evidence_type),
                "description": e.description,
                "drift_value": e.drift_value,
                "memory_claim": e.memory_claim,
                "support_score": e.support_score,
                "weight": e.weight,
            })
        })
        .collect();

    // Get history if bridge_db is available
    let history = bridge_db
        .and_then(|db| {
            crate::storage::tables::get_grounding_history(db, &memory.memory_id, 10).ok()
        })
        .unwrap_or_default();

    let history_json: Vec<serde_json::Value> = history
        .iter()
        .map(|(score, classification, ts)| {
            json!({
                "grounding_score": score,
                "classification": classification,
                "timestamp": ts,
            })
        })
        .collect();

    Ok(json!({
        "memory_id": result.memory_id,
        "verdict": format!("{:?}", result.verdict),
        "grounding_score": result.grounding_score,
        "previous_score": result.previous_score,
        "score_delta": result.score_delta,
        "confidence_adjustment": {
            "mode": format!("{:?}", result.confidence_adjustment.mode),
            "delta": result.confidence_adjustment.delta,
            "reason": result.confidence_adjustment.reason,
        },
        "evidence": evidence_json,
        "generates_contradiction": result.generates_contradiction,
        "duration_ms": result.duration_ms,
        "history": history_json,
    }))
}
