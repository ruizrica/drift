//! Grounding logic: compare Cortex memories against Drift scan results.
//! The killer feature (D7) — first AI memory system with empirically validated memory.

pub mod classification;
pub mod evidence;
pub mod loop_runner;
pub mod scheduler;
pub mod scorer;

pub use classification::{classify_groundability, Groundability};
pub use evidence::{EvidenceType, GroundingEvidence};
pub use loop_runner::GroundingLoopRunner;
pub use scheduler::{GroundingScheduler, TriggerType};
pub use scorer::{GroundingScorer, GroundingVerdict};

use serde::{Deserialize, Serialize};

/// Configuration for the grounding system.
#[derive(Debug, Clone)]
pub struct GroundingConfig {
    /// Whether grounding is enabled.
    pub enabled: bool,
    /// Maximum memories per grounding loop.
    pub max_memories_per_loop: usize,
    /// Confidence boost for validated memories.
    pub boost_delta: f64,
    /// Confidence penalty for partially grounded memories.
    pub partial_penalty: f64,
    /// Confidence penalty for weakly grounded memories.
    pub weak_penalty: f64,
    /// Minimum confidence floor (never zero).
    pub invalidated_floor: f64,
    /// Confidence drop for contradictions.
    pub contradiction_drop: f64,
    /// Full grounding every N scans.
    pub full_grounding_interval: u32,
}

impl Default for GroundingConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_memories_per_loop: 500,
            boost_delta: 0.05,
            partial_penalty: 0.05,
            weak_penalty: 0.15,
            invalidated_floor: 0.1,
            contradiction_drop: 0.3,
            full_grounding_interval: 10,
        }
    }
}

/// Result of grounding a single memory against Drift scan data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroundingResult {
    /// Unique ID for this grounding check.
    pub id: String,
    /// The memory being grounded.
    pub memory_id: String,
    /// The grounding verdict.
    pub verdict: GroundingVerdict,
    /// Grounding score: 0.0 (completely ungrounded) to 1.0 (fully grounded).
    pub grounding_score: f64,
    /// Previous grounding score (for trend detection).
    pub previous_score: Option<f64>,
    /// Score delta (current - previous). Negative = drifting.
    pub score_delta: Option<f64>,
    /// Confidence adjustment to apply to the memory.
    pub confidence_adjustment: ConfidenceAdjustment,
    /// Evidence supporting the grounding verdict.
    pub evidence: Vec<GroundingEvidence>,
    /// Whether a contradiction should be generated.
    pub generates_contradiction: bool,
    /// Duration of the grounding check in milliseconds.
    pub duration_ms: u32,
}

/// How to adjust memory confidence based on grounding.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceAdjustment {
    /// The adjustment mode.
    pub mode: AdjustmentMode,
    /// The delta to apply (for Boost/Penalize mode).
    pub delta: Option<f64>,
    /// Reason for the adjustment.
    pub reason: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AdjustmentMode {
    NoChange,
    Boost,
    Penalize,
    FlagForReview,
}

/// Snapshot of grounding state across all groundable memories.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroundingSnapshot {
    pub total_checked: u32,
    pub validated: u32,
    pub partial: u32,
    pub weak: u32,
    pub invalidated: u32,
    pub not_groundable: u32,
    pub insufficient_data: u32,
    pub avg_grounding_score: f64,
    pub contradictions_generated: u32,
    pub duration_ms: u32,
}
