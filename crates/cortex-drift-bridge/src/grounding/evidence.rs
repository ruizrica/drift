//! 10 evidence types with weights for grounding score computation.

use serde::{Deserialize, Serialize};

/// The 10 evidence types that contribute to grounding scores.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EvidenceType {
    /// Pattern confidence from Drift's Bayesian scoring.
    PatternConfidence,
    /// Pattern occurrence rate (% of files matching).
    PatternOccurrence,
    /// False positive rate from violation feedback.
    FalsePositiveRate,
    /// Constraint verification result.
    ConstraintVerification,
    /// Coupling metric snapshot.
    CouplingMetric,
    /// DNA health score.
    DnaHealth,
    /// Test coverage data.
    TestCoverage,
    /// Error handling gap count.
    ErrorHandlingGaps,
    /// Decision mining evidence.
    DecisionEvidence,
    /// Boundary detection data.
    BoundaryData,
}

impl EvidenceType {
    /// All 10 evidence types.
    pub const ALL: [EvidenceType; 10] = [
        Self::PatternConfidence,
        Self::PatternOccurrence,
        Self::FalsePositiveRate,
        Self::ConstraintVerification,
        Self::CouplingMetric,
        Self::DnaHealth,
        Self::TestCoverage,
        Self::ErrorHandlingGaps,
        Self::DecisionEvidence,
        Self::BoundaryData,
    ];

    /// Default weight for this evidence type in grounding score computation.
    pub fn default_weight(&self) -> f64 {
        match self {
            Self::PatternConfidence => 0.20,
            Self::PatternOccurrence => 0.15,
            Self::FalsePositiveRate => 0.10,
            Self::ConstraintVerification => 0.10,
            Self::CouplingMetric => 0.08,
            Self::DnaHealth => 0.08,
            Self::TestCoverage => 0.10,
            Self::ErrorHandlingGaps => 0.07,
            Self::DecisionEvidence => 0.07,
            Self::BoundaryData => 0.05,
        }
    }
}

/// Evidence supporting a grounding verdict.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroundingEvidence {
    /// What type of evidence this is.
    pub evidence_type: EvidenceType,
    /// Human-readable description.
    pub description: String,
    /// The Drift data point (e.g., pattern confidence, FP rate).
    pub drift_value: f64,
    /// The Cortex memory claim (e.g., expected confidence).
    pub memory_claim: Option<f64>,
    /// How strongly this evidence supports/contradicts the memory (0.0-1.0).
    pub support_score: f64,
    /// Weight of this evidence type.
    pub weight: f64,
}

impl GroundingEvidence {
    /// Create a new evidence item.
    pub fn new(
        evidence_type: EvidenceType,
        description: impl Into<String>,
        drift_value: f64,
        memory_claim: Option<f64>,
        support_score: f64,
    ) -> Self {
        Self {
            weight: evidence_type.default_weight(),
            evidence_type,
            description: description.into(),
            drift_value,
            memory_claim,
            support_score: support_score.clamp(0.0, 1.0),
        }
    }
}
