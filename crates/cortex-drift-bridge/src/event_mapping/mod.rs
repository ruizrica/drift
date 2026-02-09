//! Event mapping: 21 Drift event types → Cortex memory types with confidence mappings.

pub mod mapper;
pub mod memory_types;

pub use mapper::BridgeEventHandler;
pub use memory_types::{EventMapping, EventProcessingResult};
