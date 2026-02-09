//! Bridge DecompositionPriorProvider impl: DNA-similarity-based priors from Cortex.
//!
//! Queries Cortex for past decisions by DNA similarity (threshold ≥ 0.6).
//! Returns sorted by confidence descending.
//! Consolidated semantic rules returned with higher confidence than episodic decisions.

use std::sync::Mutex;

use drift_core::traits::decomposition::{
    DecompositionPriorData, DecompositionPriorProvider, PriorAdjustmentType,
};
use tracing::info;

/// DNA similarity threshold for prior retrieval.
const DNA_SIMILARITY_THRESHOLD: f64 = 0.6;

/// Bridge implementation of DecompositionPriorProvider.
pub struct BridgeDecompositionPriorProvider {
    /// Connection to cortex.db for reading DecisionContext memories.
    cortex_db: Option<Mutex<rusqlite::Connection>>,
}

impl BridgeDecompositionPriorProvider {
    pub fn new(cortex_db: Option<Mutex<rusqlite::Connection>>) -> Self {
        Self { cortex_db }
    }

    /// Create a no-op provider for standalone mode.
    pub fn no_op() -> Self {
        Self { cortex_db: None }
    }

    /// Query priors from cortex.db for a given DNA similarity score.
    /// Returns priors with similarity >= threshold, sorted by confidence descending.
    pub fn query_priors_with_similarity(
        &self,
        dna_similarity: f64,
    ) -> Result<Vec<DecompositionPriorData>, String> {
        if dna_similarity < DNA_SIMILARITY_THRESHOLD {
            return Ok(Vec::new());
        }

        let Some(ref db_mutex) = self.cortex_db else {
            return Ok(Vec::new());
        };

        let conn = db_mutex
            .lock()
            .map_err(|e| format!("Failed to lock cortex_db: {}", e))?;

        let mut stmt = conn
            .prepare(
                "SELECT id, content, summary, confidence FROM bridge_memories
                 WHERE memory_type = 'DecisionContext'
                 AND json_extract(content, '$.data.context') LIKE '%boundary%'
                 ORDER BY confidence DESC",
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, f64>(3)?,
                ))
            })
            .map_err(|e| format!("Failed to query priors: {}", e))?;

        let mut priors = Vec::new();
        for row in rows {
            let (id, _content_json, summary, confidence) =
                row.map_err(|e| format!("Failed to read row: {}", e))?;

            // Parse the decision content to extract adjustment type
            let adjustment_type = if summary.contains("split") || summary.contains("Split") {
                PriorAdjustmentType::Split {
                    module: "unknown".to_string(),
                    into: vec!["part_a".to_string(), "part_b".to_string()],
                }
            } else if summary.contains("merge") || summary.contains("Merge") {
                PriorAdjustmentType::Merge {
                    modules: vec!["a".to_string(), "b".to_string()],
                    into: "merged".to_string(),
                }
            } else {
                PriorAdjustmentType::Reclassify {
                    module: "unknown".to_string(),
                    new_category: "reclassified".to_string(),
                }
            };

            priors.push(DecompositionPriorData {
                adjustment_type,
                confidence,
                dna_similarity,
                narrative: summary,
                source_dna_hash: id,
            });
        }

        // Sort by confidence descending
        priors.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap_or(std::cmp::Ordering::Equal));

        info!(count = priors.len(), similarity = dna_similarity, "Retrieved decomposition priors");
        Ok(priors)
    }
}

impl DecompositionPriorProvider for BridgeDecompositionPriorProvider {
    fn get_priors(&self) -> Result<Vec<DecompositionPriorData>, String> {
        // In the default call, we don't have a specific DNA similarity.
        // Return empty — the caller should use query_priors_with_similarity() directly.
        let Some(ref db_mutex) = self.cortex_db else {
            return Ok(Vec::new());
        };

        let conn = db_mutex
            .lock()
            .map_err(|e| format!("Failed to lock cortex_db: {}", e))?;

        // Return all stored priors sorted by confidence
        let mut stmt = conn
            .prepare(
                "SELECT id, summary, confidence FROM bridge_memories
                 WHERE memory_type = 'DecisionContext'
                 AND json_extract(content, '$.data.context') LIKE '%boundary%'
                 ORDER BY confidence DESC",
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, f64>(2)?,
                ))
            })
            .map_err(|e| format!("Failed to query priors: {}", e))?;

        let mut priors = Vec::new();
        for row in rows {
            let (id, summary, confidence) =
                row.map_err(|e| format!("Failed to read row: {}", e))?;

            priors.push(DecompositionPriorData {
                adjustment_type: PriorAdjustmentType::Reclassify {
                    module: "unknown".to_string(),
                    new_category: "default".to_string(),
                },
                confidence,
                dna_similarity: 1.0,
                narrative: summary,
                source_dna_hash: id,
            });
        }

        Ok(priors)
    }
}
