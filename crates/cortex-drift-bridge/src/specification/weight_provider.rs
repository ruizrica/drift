//! Bridge WeightProvider impl: adaptive weights from Cortex Skill memories.
//!
//! Formula: adjusted_weight = base_weight × (1 + failure_rate × boost_factor)
//! where boost_factor = 0.5
//! Minimum sample size of 15-20 enforced.
//! Weights stored as Skill memory with 365-day half-life.

use std::collections::HashMap;
use std::sync::Mutex;

use drift_core::traits::weight_provider::{AdaptiveWeightTable, MigrationPath, WeightProvider};
use tracing::{info, warn};

/// Boost factor for weight adjustment formula.
const BOOST_FACTOR: f64 = 0.5;

/// Minimum sample size before adaptive weights are used.
const MIN_SAMPLE_SIZE: usize = 15;

/// Maximum allowed weight for any single section.
const MAX_WEIGHT: f64 = 5.0;

/// Bridge implementation of WeightProvider.
/// Reads Cortex Skill memories and computes adaptive weights.
pub struct BridgeWeightProvider {
    /// Connection to cortex.db for reading Skill memories.
    cortex_db: Option<Mutex<rusqlite::Connection>>,
    /// Cached weight tables per migration path.
    cache: Mutex<HashMap<String, AdaptiveWeightTable>>,
}

impl BridgeWeightProvider {
    pub fn new(cortex_db: Option<Mutex<rusqlite::Connection>>) -> Self {
        Self {
            cortex_db,
            cache: Mutex::new(HashMap::new()),
        }
    }

    /// Create a no-op provider for standalone mode.
    pub fn no_op() -> Self {
        Self {
            cortex_db: None,
            cache: Mutex::new(HashMap::new()),
        }
    }

    /// Compute adaptive weights from verification feedback.
    ///
    /// Takes a list of (section_name, was_failure) pairs and computes adjusted weights.
    pub fn compute_adaptive_weights(
        feedback: &[(String, bool)],
    ) -> AdaptiveWeightTable {
        let defaults = AdaptiveWeightTable::static_defaults();

        if feedback.len() < MIN_SAMPLE_SIZE {
            info!(
                sample_size = feedback.len(),
                min = MIN_SAMPLE_SIZE,
                "Insufficient sample size for adaptive weights — using static defaults"
            );
            return defaults;
        }

        let _total = feedback.len() as f64;
        let mut failure_counts: HashMap<String, u32> = HashMap::new();
        let total_failures: u32 = feedback.iter().filter(|(_, f)| *f).count() as u32;

        for (section, is_failure) in feedback {
            if *is_failure {
                *failure_counts.entry(section.clone()).or_insert(0) += 1;
            }
        }

        let mut weights = defaults.weights.clone();
        let mut failure_distribution = HashMap::new();

        if total_failures == 0 {
            // All passes — return static defaults (no division by zero)
            return AdaptiveWeightTable {
                weights,
                failure_distribution,
                sample_size: feedback.len(),
                last_updated: chrono::Utc::now().timestamp(),
            };
        }

        for (section, count) in &failure_counts {
            let failure_rate = *count as f64 / total_failures as f64;
            failure_distribution.insert(section.clone(), failure_rate);

            if let Some(base_weight) = weights.get(section).copied() {
                let adjusted = base_weight * (1.0 + failure_rate * BOOST_FACTOR);
                let clamped = adjusted.min(MAX_WEIGHT);
                weights.insert(section.clone(), clamped);
            } else {
                // Section not in weight table — add with default base of 1.0
                let adjusted = 1.0 * (1.0 + failure_rate * BOOST_FACTOR);
                weights.insert(section.clone(), adjusted.min(MAX_WEIGHT));
            }
        }

        AdaptiveWeightTable {
            weights,
            failure_distribution,
            sample_size: feedback.len(),
            last_updated: chrono::Utc::now().timestamp(),
        }
    }

    /// Cache key for a migration path.
    fn cache_key(path: &MigrationPath) -> String {
        format!(
            "{}:{}:{}:{}",
            path.source_language,
            path.target_language,
            path.source_framework.as_deref().unwrap_or("none"),
            path.target_framework.as_deref().unwrap_or("none"),
        )
    }
}

impl WeightProvider for BridgeWeightProvider {
    fn get_weights(&self, path: &MigrationPath) -> AdaptiveWeightTable {
        // Check cache first
        let key = Self::cache_key(path);
        if let Ok(cache) = self.cache.lock() {
            if let Some(cached) = cache.get(&key) {
                return cached.clone();
            }
        }

        // If no cortex_db, return static defaults (graceful degradation)
        let Some(ref db_mutex) = self.cortex_db else {
            return AdaptiveWeightTable::static_defaults();
        };

        // Try to read from cortex.db
        let conn = match db_mutex.lock() {
            Ok(c) => c,
            Err(_) => return AdaptiveWeightTable::static_defaults(),
        };

        // Query for Skill memories containing weight tables for this migration path
        let result = conn.prepare(
            "SELECT content FROM bridge_memories
             WHERE memory_type = 'Skill'
             AND json_extract(content, '$.data.domain') = 'adaptive_weights'
             AND json_extract(content, '$.data.skill_name') LIKE ?1
             ORDER BY created_at DESC LIMIT 1",
        );

        match result {
            Ok(mut stmt) => {
                let search = format!("%{}%{}%", path.source_language, path.target_language);
                match stmt.query_row(rusqlite::params![search], |row| {
                    row.get::<_, String>(0)
                }) {
                    Ok(content_json) => {
                        if let Ok(content) = serde_json::from_str::<serde_json::Value>(&content_json) {
                            if let Some(weights_obj) = content.get("data").and_then(|d| d.get("evidence")) {
                                // Parse stored weights
                                if let Ok(weights_map) = serde_json::from_value::<HashMap<String, f64>>(
                                    weights_obj.clone(),
                                ) {
                                    let table = AdaptiveWeightTable {
                                        weights: weights_map,
                                        failure_distribution: HashMap::new(),
                                        sample_size: 0,
                                        last_updated: chrono::Utc::now().timestamp(),
                                    };
                                    // Cache it
                                    if let Ok(mut cache) = self.cache.lock() {
                                        cache.insert(key, table.clone());
                                    }
                                    return table;
                                }
                            }
                        }
                        AdaptiveWeightTable::static_defaults()
                    }
                    Err(_) => AdaptiveWeightTable::static_defaults(),
                }
            }
            Err(e) => {
                warn!(error = %e, "Failed to query adaptive weights — using static defaults");
                AdaptiveWeightTable::static_defaults()
            }
        }
    }
}
