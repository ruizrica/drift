//! # cortex-drift-bridge
//!
//! The integration bridge between Cortex memory and Drift analysis.
//! This is the ONLY crate that imports from both systems (D4: leaf, not spine).
//!
//! ## Responsibilities
//! 1. Event Mapping — Drift events → Cortex memories (21 event types)
//! 2. Link Translation — Drift PatternLink → Cortex EntityLink (5 constructors)
//! 3. Grounding Logic — compare Cortex memories against Drift scan results
//! 4. Grounding Feedback Loop — adjust confidence, detect contradictions
//! 5. Intent Extensions — 10 code-specific intents for Cortex
//! 6. Combined MCP Tools — drift_why, drift_memory_learn, drift_grounding_check
//! 7. Specification Engine Bridge — causal corrections, adaptive weights, decomposition transfer

pub mod errors;
pub mod event_mapping;
pub mod grounding;
pub mod intents;
pub mod license;
pub mod link_translation;
pub mod napi;
pub mod specification;
pub mod storage;
pub mod tools;

use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tracing::{info, warn};

/// The main bridge runtime. Manages connections to both drift.db and cortex.db.
pub struct BridgeRuntime {
    /// Connection to drift.db (read-only via ATTACH or direct).
    drift_db: Option<Mutex<rusqlite::Connection>>,
    /// Connection to cortex.db (read/write for memory creation).
    cortex_db: Option<Mutex<rusqlite::Connection>>,
    /// Bridge-specific tables (stored in cortex.db or separate bridge.db).
    bridge_db: Option<Mutex<rusqlite::Connection>>,
    /// Whether the bridge is available (cortex.db exists and is accessible).
    available: AtomicBool,
    /// Bridge configuration.
    config: BridgeConfig,
}

/// Bridge configuration from drift.toml [bridge] section.
#[derive(Debug, Clone)]
pub struct BridgeConfig {
    /// Path to cortex.db.
    pub cortex_db_path: Option<String>,
    /// Path to drift.db.
    pub drift_db_path: Option<String>,
    /// Whether the bridge is enabled.
    pub enabled: bool,
    /// License tier.
    pub license_tier: license::LicenseTier,
    /// Grounding configuration.
    pub grounding: grounding::GroundingConfig,
}

impl Default for BridgeConfig {
    fn default() -> Self {
        Self {
            cortex_db_path: None,
            drift_db_path: None,
            enabled: true,
            license_tier: license::LicenseTier::Community,
            grounding: grounding::GroundingConfig::default(),
        }
    }
}

impl BridgeRuntime {
    /// Create a new bridge runtime with the given configuration.
    pub fn new(config: BridgeConfig) -> Self {
        Self {
            drift_db: None,
            cortex_db: None,
            bridge_db: None,
            available: AtomicBool::new(false),
            config,
        }
    }

    /// Initialize the bridge: open databases, create bridge tables.
    /// Returns Ok(true) if bridge is fully available, Ok(false) if degraded.
    pub fn initialize(&mut self) -> Result<bool, errors::BridgeError> {
        if !self.config.enabled {
            info!("Bridge disabled by configuration");
            return Ok(false);
        }

        // Try to open cortex.db
        let cortex_path = self.config.cortex_db_path.as_deref().unwrap_or("cortex.db");
        if !Path::new(cortex_path).exists() {
            info!(path = cortex_path, "cortex.db not found — bridge in degraded mode");
            self.available.store(false, Ordering::SeqCst);
            return Ok(false);
        }

        match rusqlite::Connection::open(cortex_path) {
            Ok(conn) => {
                self.cortex_db = Some(Mutex::new(conn));
            }
            Err(e) => {
                warn!(error = %e, "Failed to open cortex.db — bridge in degraded mode");
                self.available.store(false, Ordering::SeqCst);
                return Ok(false);
            }
        }

        // Try to open drift.db (read-only)
        let drift_path = self.config.drift_db_path.as_deref().unwrap_or("drift.db");
        if Path::new(drift_path).exists() {
            match rusqlite::Connection::open_with_flags(
                drift_path,
                rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
            ) {
                Ok(conn) => {
                    self.drift_db = Some(Mutex::new(conn));
                }
                Err(e) => {
                    warn!(error = %e, "Failed to open drift.db — grounding unavailable");
                }
            }
        }

        // Create bridge tables in cortex.db
        if let Some(ref db) = self.cortex_db {
            let conn = db.lock().map_err(|e| errors::BridgeError::Config(e.to_string()))?;
            storage::create_bridge_tables(&conn)?;
        }

        self.available.store(true, Ordering::SeqCst);
        info!("Bridge initialized successfully");
        Ok(true)
    }

    /// Check if the bridge is available (cortex.db accessible).
    pub fn is_available(&self) -> bool {
        self.available.load(Ordering::SeqCst)
    }

    /// Shutdown the bridge, closing all connections.
    pub fn shutdown(&mut self) {
        self.drift_db = None;
        self.cortex_db = None;
        self.bridge_db = None;
        self.available.store(false, Ordering::SeqCst);
        info!("Bridge shut down");
    }

    /// Get the bridge configuration.
    pub fn config(&self) -> &BridgeConfig {
        &self.config
    }
}
