//! Event handlers for specification engine bridge events:
//! on_spec_corrected, on_contract_verified, on_decomposition_adjusted.

use chrono::Utc;
use cortex_causal::CausalEngine;
use cortex_core::memory::base::{BaseMemory, TypedContent};
use cortex_core::memory::confidence::Confidence;
use cortex_core::memory::importance::Importance;
use cortex_core::memory::types::*;
use tracing::{info, warn};

use super::corrections::SpecCorrection;
use crate::errors::BridgeResult;

/// Handle a spec correction event: creates Feedback memory + causal edge.
pub fn on_spec_corrected(
    correction: &SpecCorrection,
    causal_engine: &CausalEngine,
    bridge_db: Option<&rusqlite::Connection>,
) -> BridgeResult<String> {
    if correction.module_id.is_empty() {
        return Err(crate::errors::BridgeError::InvalidInput(
            "module_id cannot be empty".to_string(),
        ));
    }

    let memory_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now();

    let content = TypedContent::Feedback(FeedbackContent {
        feedback: format!(
            "Spec correction for module '{}', section '{}': root cause = {}",
            correction.module_id,
            correction.section.as_str(),
            correction.root_cause.variant_name(),
        ),
        category: "spec_correction".to_string(),
        source: "drift_bridge".to_string(),
    });

    let content_hash = BaseMemory::compute_content_hash(&content)
        .unwrap_or_else(|_| blake3::hash(b"fallback").to_hex().to_string());

    let memory = BaseMemory {
        id: memory_id.clone(),
        memory_type: cortex_core::MemoryType::Feedback,
        content,
        summary: format!(
            "Spec correction: {} / {} ({})",
            correction.module_id,
            correction.section.as_str(),
            correction.root_cause.variant_name(),
        ),
        transaction_time: now,
        valid_time: now,
        valid_until: None,
        confidence: Confidence::new(0.8),
        importance: Importance::High,
        last_accessed: now,
        access_count: 0,
        linked_patterns: vec![],
        linked_constraints: vec![],
        linked_files: vec![],
        linked_functions: vec![],
        tags: vec![
            "drift_bridge".to_string(),
            "spec_correction".to_string(),
            format!("module:{}", correction.module_id),
            format!("section:{}", correction.section.as_str()),
        ],
        archived: false,
        superseded_by: None,
        supersedes: None,
        content_hash,
        namespace: Default::default(),
        source_agent: Default::default(),
    };

    // Store the memory
    if let Some(db) = bridge_db {
        crate::storage::store_memory(db, &memory)?;
    }

    // Create causal edges for each upstream module
    for upstream_id in &correction.upstream_modules {
        // Create a minimal upstream memory for the causal edge
        let upstream_memory = create_placeholder_memory(upstream_id);
        let relation = correction.root_cause.to_causal_relation();

        if let Err(e) = causal_engine.add_edge(
            &upstream_memory,
            &memory,
            relation,
            0.8,
            vec![],
            None,
        ) {
            warn!(
                error = %e,
                upstream = upstream_id,
                correction = correction.correction_id,
                "Failed to create causal edge for spec correction"
            );
        }
    }

    info!(
        memory_id = %memory_id,
        module = correction.module_id,
        section = correction.section.as_str(),
        root_cause = correction.root_cause.variant_name(),
        upstream_count = correction.upstream_modules.len(),
        "Created Feedback memory + causal edges for spec correction"
    );

    Ok(memory_id)
}

/// Handle a contract verification event.
/// Pass → positive Feedback memory with confidence boost.
/// Fail → Feedback memory with VerificationFeedback metadata.
pub fn on_contract_verified(
    module_id: &str,
    passed: bool,
    section: &super::corrections::SpecSection,
    mismatch_type: Option<&str>,
    severity: Option<f64>,
    bridge_db: Option<&rusqlite::Connection>,
) -> BridgeResult<String> {
    let memory_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now();

    // Reject NaN severity
    if let Some(sev) = severity {
        if sev.is_nan() {
            return Err(crate::errors::BridgeError::InvalidInput(
                "severity cannot be NaN".to_string(),
            ));
        }
    }

    let (feedback_text, confidence) = if passed {
        (
            format!("Contract verification passed for module '{}'", module_id),
            0.85,
        )
    } else {
        (
            format!(
                "Contract verification failed for module '{}': section={}, mismatch={}, severity={:?}",
                module_id,
                section.as_str(),
                mismatch_type.unwrap_or("unknown"),
                severity,
            ),
            0.7,
        )
    };

    let content = TypedContent::Feedback(FeedbackContent {
        feedback: feedback_text,
        category: if passed {
            "contract_verified_pass".to_string()
        } else {
            "contract_verified_fail".to_string()
        },
        source: "drift_bridge".to_string(),
    });

    let content_hash = BaseMemory::compute_content_hash(&content)
        .unwrap_or_else(|_| blake3::hash(b"fallback").to_hex().to_string());

    let memory = BaseMemory {
        id: memory_id.clone(),
        memory_type: cortex_core::MemoryType::Feedback,
        content,
        summary: format!(
            "Contract {}: {} ({})",
            if passed { "passed" } else { "failed" },
            module_id,
            section.as_str(),
        ),
        transaction_time: now,
        valid_time: now,
        valid_until: None,
        confidence: Confidence::new(confidence),
        importance: if passed { Importance::Normal } else { Importance::High },
        last_accessed: now,
        access_count: 0,
        linked_patterns: vec![],
        linked_constraints: vec![],
        linked_files: vec![],
        linked_functions: vec![],
        tags: vec![
            "drift_bridge".to_string(),
            "contract_verification".to_string(),
            format!("module:{}", module_id),
            format!("result:{}", if passed { "pass" } else { "fail" }),
        ],
        archived: false,
        superseded_by: None,
        supersedes: None,
        content_hash,
        namespace: Default::default(),
        source_agent: Default::default(),
    };

    if let Some(db) = bridge_db {
        crate::storage::store_memory(db, &memory)?;
    }

    Ok(memory_id)
}

/// Handle a decomposition adjustment event.
/// Creates DecisionContext memory linked to DNA hash.
pub fn on_decomposition_adjusted(
    module_id: &str,
    adjustment_type: &str,
    dna_hash: &str,
    bridge_db: Option<&rusqlite::Connection>,
) -> BridgeResult<String> {
    let memory_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now();

    let content = TypedContent::DecisionContext(DecisionContextContent {
        decision: format!(
            "Module boundary adjusted: {} ({})",
            module_id, adjustment_type,
        ),
        context: format!("DNA hash: {}. Adjustment applied based on structural analysis.", dna_hash),
        adr_link: None,
        trade_offs: vec![format!("Adjustment: {}", adjustment_type)],
    });

    let content_hash = BaseMemory::compute_content_hash(&content)
        .unwrap_or_else(|_| blake3::hash(b"fallback").to_hex().to_string());

    let memory = BaseMemory {
        id: memory_id.clone(),
        memory_type: cortex_core::MemoryType::DecisionContext,
        content,
        summary: format!("Decomposition adjusted: {} ({})", module_id, adjustment_type),
        transaction_time: now,
        valid_time: now,
        valid_until: None,
        confidence: Confidence::new(0.75),
        importance: Importance::Normal,
        last_accessed: now,
        access_count: 0,
        linked_patterns: vec![],
        linked_constraints: vec![],
        linked_files: vec![],
        linked_functions: vec![],
        tags: vec![
            "drift_bridge".to_string(),
            "decomposition_adjusted".to_string(),
            format!("module:{}", module_id),
            format!("dna:{}", dna_hash),
        ],
        archived: false,
        superseded_by: None,
        supersedes: None,
        content_hash,
        namespace: Default::default(),
        source_agent: Default::default(),
    };

    if let Some(db) = bridge_db {
        crate::storage::store_memory(db, &memory)?;
    }

    info!(
        memory_id = %memory_id,
        module = module_id,
        adjustment = adjustment_type,
        dna_hash = dna_hash,
        "Created DecisionContext memory for decomposition adjustment"
    );

    Ok(memory_id)
}

/// Create a placeholder BaseMemory for causal edge creation.
fn create_placeholder_memory(id: &str) -> BaseMemory {
    let now = Utc::now();
    let content = TypedContent::Insight(InsightContent {
        observation: format!("Placeholder for module {}", id),
        evidence: vec![],
    });
    let content_hash = BaseMemory::compute_content_hash(&content)
        .unwrap_or_else(|_| blake3::hash(b"fallback").to_hex().to_string());

    BaseMemory {
        id: id.to_string(),
        memory_type: cortex_core::MemoryType::Insight,
        content,
        summary: format!("Module: {}", id),
        transaction_time: now,
        valid_time: now,
        valid_until: None,
        confidence: Confidence::new(0.5),
        importance: Importance::Normal,
        last_accessed: now,
        access_count: 0,
        linked_patterns: vec![],
        linked_constraints: vec![],
        linked_files: vec![],
        linked_functions: vec![],
        tags: vec![],
        archived: false,
        superseded_by: None,
        supersedes: None,
        content_hash,
        namespace: Default::default(),
        source_agent: Default::default(),
    }
}
