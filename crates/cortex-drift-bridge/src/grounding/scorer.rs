//! Grounding score computation with 4 thresholds.
//!
//! Thresholds:
//! - Validated: ≥ 0.7
//! - Partial: ≥ 0.4
//! - Weak: ≥ 0.2
//! - Invalidated: < 0.2

use serde::{Deserialize, Serialize};

use super::evidence::GroundingEvidence;
use super::{AdjustmentMode, ConfidenceAdjustment, GroundingConfig};

/// Grounding verdict — the outcome of comparing memory against reality.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GroundingVerdict {
    /// Memory is strongly supported by Drift data (score >= 0.7).
    Validated,
    /// Memory is partially supported (0.4 <= score < 0.7).
    Partial,
    /// Memory is weakly supported (0.2 <= score < 0.4).
    Weak,
    /// Memory is contradicted by Drift data (score < 0.2).
    Invalidated,
    /// Memory type is not groundable.
    NotGroundable,
    /// Insufficient Drift data to ground this memory.
    InsufficientData,
}

/// Grounding score computation engine.
pub struct GroundingScorer {
    config: GroundingConfig,
}

impl GroundingScorer {
    pub fn new(config: GroundingConfig) -> Self {
        Self { config }
    }

    /// Compute the grounding score from evidence items.
    /// Uses weighted average of support scores.
    pub fn compute_score(&self, evidence: &[GroundingEvidence]) -> f64 {
        if evidence.is_empty() {
            return 0.0;
        }

        // Filter out evidence with non-finite support_score or weight to prevent
        // NaN/Infinity from poisoning the entire weighted average.
        let valid: Vec<&GroundingEvidence> = evidence
            .iter()
            .filter(|e| e.support_score.is_finite() && e.weight.is_finite() && e.weight > 0.0)
            .collect();

        if valid.is_empty() {
            return 0.0;
        }

        let total_weight: f64 = valid.iter().map(|e| e.weight).sum();
        if total_weight <= 0.0 {
            return 0.0;
        }

        let weighted_sum: f64 = valid
            .iter()
            .map(|e| e.support_score * e.weight)
            .sum();

        (weighted_sum / total_weight).clamp(0.0, 1.0)
    }

    /// Convert a grounding score to a verdict.
    pub fn score_to_verdict(&self, score: f64) -> GroundingVerdict {
        if score >= 0.7 {
            GroundingVerdict::Validated
        } else if score >= 0.4 {
            GroundingVerdict::Partial
        } else if score >= 0.2 {
            GroundingVerdict::Weak
        } else {
            GroundingVerdict::Invalidated
        }
    }

    /// Compute the confidence adjustment based on grounding verdict and score delta.
    pub fn compute_confidence_adjustment(
        &self,
        verdict: &GroundingVerdict,
        _score_delta: Option<f64>,
        current_confidence: f64,
    ) -> ConfidenceAdjustment {
        match verdict {
            GroundingVerdict::Validated => {
                // Clamp so confidence never exceeds 1.0
                let clamped_delta = self.config.boost_delta.min(1.0 - current_confidence);
                ConfidenceAdjustment {
                    mode: AdjustmentMode::Boost,
                    delta: Some(clamped_delta),
                    reason: "Memory validated by Drift scan data".to_string(),
                }
            }
            GroundingVerdict::Partial => {
                ConfidenceAdjustment {
                    mode: AdjustmentMode::Penalize,
                    delta: Some(-self.config.partial_penalty),
                    reason: "Memory only partially supported by Drift data".to_string(),
                }
            }
            GroundingVerdict::Weak => {
                ConfidenceAdjustment {
                    mode: AdjustmentMode::Penalize,
                    delta: Some(-self.config.weak_penalty),
                    reason: "Memory weakly supported by Drift data".to_string(),
                }
            }
            GroundingVerdict::Invalidated => {
                // Apply contradiction drop but respect the floor
                let new_confidence = (current_confidence - self.config.contradiction_drop)
                    .max(self.config.invalidated_floor);
                let actual_delta = new_confidence - current_confidence;
                ConfidenceAdjustment {
                    mode: AdjustmentMode::Penalize,
                    delta: Some(actual_delta),
                    reason: format!(
                        "Memory contradicted by Drift data (floor: {})",
                        self.config.invalidated_floor
                    ),
                }
            }
            GroundingVerdict::NotGroundable | GroundingVerdict::InsufficientData => {
                ConfidenceAdjustment {
                    mode: AdjustmentMode::NoChange,
                    delta: None,
                    reason: format!("No adjustment: {:?}", verdict),
                }
            }
        }
    }

    /// Determine if a contradiction should be generated.
    pub fn should_generate_contradiction(
        &self,
        _score: f64,
        score_delta: Option<f64>,
        verdict: &GroundingVerdict,
    ) -> bool {
        // Generate contradiction if:
        // 1. Score is Invalidated, OR
        // 2. Score dropped significantly (delta < -0.3)
        *verdict == GroundingVerdict::Invalidated
            || score_delta.is_some_and(|d| d < -self.config.contradiction_drop)
    }
}

impl Default for GroundingScorer {
    fn default() -> Self {
        Self::new(GroundingConfig::default())
    }
}
