//! Bridge-specific SQLite tables and storage operations.

pub mod tables;

pub use tables::{
    attach_cortex_db, create_bridge_tables, get_grounding_history,
    get_previous_grounding_score, log_event, record_grounding_result,
    record_grounding_snapshot, record_metric, store_memory,
};
