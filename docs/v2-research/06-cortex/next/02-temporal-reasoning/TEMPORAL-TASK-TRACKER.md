# Cortex Temporal Reasoning — Implementation Task Tracker

> **Source of Truth:** TEMPORAL-IMPLEMENTATION-SPEC.md v1.0.0
> **Target Coverage:** ≥80% test coverage per module (`cargo tarpaulin -p cortex-temporal --ignore-tests`)
> **Total New Files:** 91 | **Total Modified Files:** 31 | **Total Touched:** 122
> **Total Phases:** 4 (A–D, with D split into D1–D4)
> **Quality Gates:** 7 (QG-T0 through QG-T4, plus QG-T3a through QG-T3d)
> **Rule:** No Phase N+1 begins until Phase N quality gate passes with ≥80% coverage.
> **Verification:** This tracker accounts for 100% of files in FILE-MAP.md,
>   100% of specifications in TEMPORAL-IMPLEMENTATION-SPEC.md,
>   100% of 12 property-based tests, and 100% of 17 benchmark targets.

---

## How To Use This Document

- Agents: check off `[ ]` → `[x]` as you complete each task
- Every implementation task has a unique ID: `PT{phase}-{crate}-{number}` (PT = Phase Temporal)
- Every test task has a unique ID: `TT{phase}-{crate}-{number}` (TT = Test Temporal)
- Quality gates are pass/fail — all criteria must pass before proceeding
- For behavioral details on any task → TEMPORAL-IMPLEMENTATION-SPEC.md
- For file paths and structure → FILE-MAP.md
- For parent system context → CORTEX-IMPLEMENTATION-SPEC.md

---

## Phase A: Event Store Foundation (~32 new files, ~12 modified)

### Workspace Registration

- [ ] `PTA-WS-01` — Modify `crates/cortex/Cargo.toml` — add `"cortex-temporal"` to `[workspace.members]`, add `cortex-temporal = { path = "cortex-temporal" }` to `[workspace.dependencies]`, add `zstd = "0.13"` to workspace deps

### cortex-core: New Types + Trait + Config + Error

#### Models (Phase A subset — event + snapshot types only)

- [ ] `PTA-CORE-01` — Create `cortex-core/src/models/temporal_event.rs` — MemoryEvent struct (event_id, memory_id, recorded_at, event_type, delta, actor, caused_by, schema_version), MemoryEventType enum (17 variants), EventActor enum (User, Agent, System), MemorySnapshot struct, SnapshotReason enum
- [ ] `PTA-CORE-02` — Modify `cortex-core/src/models/mod.rs` — add `mod temporal_event;` + pub use re-exports for MemoryEvent, MemoryEventType, EventActor, MemorySnapshot, SnapshotReason

#### Errors

- [ ] `PTA-CORE-03` — Create `cortex-core/src/errors/temporal_error.rs` — TemporalError enum (9 variants: EventAppendFailed, SnapshotCreationFailed, ReconstructionFailed, QueryFailed, InvalidTemporalBounds, ImmutableFieldViolation, SchemaVersionMismatch, CompactionFailed, InvalidEpistemicTransition)
- [ ] `PTA-CORE-04` — Modify `cortex-core/src/errors/mod.rs` — add `mod temporal_error;` + `pub use`
- [ ] `PTA-CORE-05` — Modify `cortex-core/src/errors/cortex_error.rs` — add `TemporalError(#[from] TemporalError)` variant to CortexError enum

#### Trait

- [ ] `PTA-CORE-06` — Create `cortex-core/src/traits/temporal_engine.rs` — ITemporalEngine async_trait (13 methods: record_event, get_events, reconstruct_at, reconstruct_all_at, query_as_of, query_range, query_diff, replay_decision, query_temporal_causal, compute_drift_metrics, get_drift_alerts, create_view, get_view)
- [ ] `PTA-CORE-07` — Modify `cortex-core/src/traits/mod.rs` — add `mod temporal_engine;` + `pub use ITemporalEngine`

#### Config

- [ ] `PTA-CORE-08` — Create `cortex-core/src/config/temporal_config.rs` — TemporalConfig struct (20 fields with defaults: snapshot thresholds, compaction age, drift frequencies, alert thresholds, epistemic settings, view intervals) + `impl Default`
- [ ] `PTA-CORE-09` — Modify `cortex-core/src/config/mod.rs` — add `pub mod temporal_config;` + `pub use TemporalConfig` + add `temporal: TemporalConfig` field to CortexConfig struct

### cortex-storage: Migration + Query Modules

#### Migration

- [ ] `PTA-STOR-01` — Create `cortex-storage/src/migrations/v014_temporal_tables.rs` — CREATE TABLE memory_events (7 cols + schema_version, 3 indexes), memory_events_archive, memory_snapshots (1 index), drift_snapshots (1 index), materialized_views, + 2 new indexes on existing memories table (idx_memories_valid_range, idx_memories_transaction_range)
- [ ] `PTA-STOR-02` — Modify `cortex-storage/src/migrations/mod.rs` — add `pub mod v014_temporal_tables;` + register in migration runner

#### New Query Modules

- [ ] `PTA-STOR-03` — Create `cortex-storage/src/queries/event_ops.rs` — insert_event, insert_event_batch, get_events_for_memory, get_events_in_range, get_events_by_type, get_event_count, move_events_to_archive (raw SQL, no business logic)
- [ ] `PTA-STOR-04` — Create `cortex-storage/src/queries/snapshot_ops.rs` — insert_snapshot, get_nearest_snapshot, get_snapshots_for_memory, delete_old_snapshots (raw SQL)
- [ ] `PTA-STOR-05` — Modify `cortex-storage/src/queries/mod.rs` — add `pub mod event_ops;` + `pub mod snapshot_ops;`

#### Mutation Path Wiring (Event Emission)

- [ ] `PTA-STOR-06` — Modify `cortex-storage/src/queries/memory_crud.rs` — in create_memory(): emit Created event in same transaction; in update_memory(): emit ContentUpdated/TagsModified/ConfidenceChanged/ImportanceChanged based on changed fields; in archive_memory(): emit Archived event; in restore_memory(): emit Restored event
- [ ] `PTA-STOR-07` — Modify `cortex-storage/src/queries/audit_ops.rs` — in record_audit(): also call event_ops::insert_event() in same SQLite transaction (CR3)
- [ ] `PTA-STOR-08` — Modify `cortex-storage/src/queries/link_ops.rs` — in add_link(): emit LinkAdded event; in remove_link(): emit LinkRemoved event
- [ ] `PTA-STOR-09` — Modify `cortex-storage/src/queries/version_ops.rs` — in create_version(): emit ContentUpdated event with version delta

### cortex-decay: Event Emission

- [ ] `PTA-DECAY-01` — Modify `cortex-decay/src/engine.rs` — after applying decay to confidence, emit Decayed event with { old_confidence, new_confidence, decay_factor } in same transaction

### cortex-validation: Event Emission

- [ ] `PTA-VALID-01` — Modify `cortex-validation/src/engine.rs` — after validation completes, emit Validated event with { dimension_scores, healing_actions } in same transaction

### cortex-consolidation: Event Emission

- [ ] `PTA-CONS-01` — Modify `cortex-consolidation/src/engine.rs` — after consolidation completes, emit Consolidated events for all participating memories in same transaction
- [ ] `PTA-CONS-02` — Modify `cortex-consolidation/src/pipeline/phase6_pruning.rs` — before archiving memories during pruning, emit Archived events

### cortex-reclassification: Event Emission

- [ ] `PTA-RECLASS-01` — Modify `cortex-reclassification/src/engine.rs` — after reclassifying, emit Reclassified event with { old_type, new_type, confidence }

### cortex-causal: Event Emission

- [ ] `PTA-CAUSAL-01` — Modify `cortex-causal/src/graph/sync.rs` — in persist_edge(): emit RelationshipAdded event; in remove_persisted_edge(): emit RelationshipRemoved event; in update_persisted_strength(): emit StrengthUpdated event; all in same transaction (CR3)

### cortex-temporal: New Crate — Event Store + Snapshot Engine

#### Crate Setup

- [ ] `PTA-TEMP-01` — Create `cortex-temporal/Cargo.toml` — deps: cortex-core, cortex-storage, chrono, serde, serde_json, tokio, thiserror, tracing, zstd; dev-deps: proptest, criterion, test-fixtures; bench target: temporal_bench
- [ ] `PTA-TEMP-02` — Create `cortex-temporal/src/lib.rs` — module declarations (event_store, snapshot, query, dual_time, drift, epistemic, views), re-exports of public API

#### Engine

- [ ] `PTA-TEMP-03` — Create `cortex-temporal/src/engine.rs` — TemporalEngine struct (writer: Arc<WriteConnection>, readers: Arc<ReadPool>, config: TemporalConfig), implements ITemporalEngine (Phase A: record_event, get_events, reconstruct_at, reconstruct_all_at; other methods return not-yet-implemented error)

#### Event Store Module

- [ ] `PTA-TEMP-04` — Create `cortex-temporal/src/event_store/mod.rs` — module declarations + re-exports
- [ ] `PTA-TEMP-05` — Create `cortex-temporal/src/event_store/append.rs` — append(writer, event) -> Result<u64>, append_batch(writer, events) -> Result<Vec<u64>>; uses event_ops::insert_event
- [ ] `PTA-TEMP-06` — Create `cortex-temporal/src/event_store/query.rs` — get_events(reader, memory_id, before), get_events_in_range(reader, memory_id, after_event_id, before_time), get_events_by_type(reader, event_type, before), get_all_events_in_range(reader, from, to); all use ReadPool
- [ ] `PTA-TEMP-07` — Create `cortex-temporal/src/event_store/replay.rs` — replay_events(events, initial_state) -> BaseMemory, apply_event(state, event) -> BaseMemory; 17-variant dispatch modifying correct BaseMemory fields
- [ ] `PTA-TEMP-08` — Create `cortex-temporal/src/event_store/upcaster.rs` — EventUpcaster trait, UpcasterRegistry, upcast_event(raw) -> MemoryEvent; v1 identity upcaster (no-op)
- [ ] `PTA-TEMP-09` — Create `cortex-temporal/src/event_store/compaction.rs` — compact_events(writer, before_date, verified_snapshot_id) -> CompactionResult; moves old events to archive table; respects config.event_compaction_age_days

#### Snapshot Module

- [ ] `PTA-TEMP-10` — Create `cortex-temporal/src/snapshot/mod.rs` — module declarations + re-exports
- [ ] `PTA-TEMP-11` — Create `cortex-temporal/src/snapshot/create.rs` — create_snapshot(writer, memory_id, current_state, reason) -> Result<u64>; zstd compress BaseMemory JSON; create_batch_snapshots for weekly sweep
- [ ] `PTA-TEMP-12` — Create `cortex-temporal/src/snapshot/lookup.rs` — get_nearest_snapshot(reader, memory_id, before) -> Option<MemorySnapshot>, get_snapshots_for_memory(reader, memory_id)
- [ ] `PTA-TEMP-13` — Create `cortex-temporal/src/snapshot/reconstruct.rs` — reconstruct_at(reader, memory_id, target_time) -> Option<BaseMemory>; core algorithm: find nearest snapshot → replay events since snapshot; reconstruct_all_at for bulk reconstruction
- [ ] `PTA-TEMP-14` — Create `cortex-temporal/src/snapshot/retention.rs` — apply_retention_policy(writer, config) -> RetentionResult; 6mo full, then monthly, then quarterly
- [ ] `PTA-TEMP-15` — Create `cortex-temporal/src/snapshot/triggers.rs` — AdaptiveSnapshotTrigger: should_snapshot(reader, memory_id) -> Option<SnapshotReason>; event threshold (50) + periodic check

### Phase A Tests (≥80% coverage target per module)

- [ ] `TTA-01` — Event append round-trip: append event → query by memory_id → event exists with correct fields
- [ ] `TTA-02` — Event batch append: append 100 events in batch → all 100 queryable
- [ ] `TTA-03` — Event query by time range: append at T1, T2, T3 → query before T2 → only T1 events
- [ ] `TTA-04` — Event query by type: append mixed types → query by type → only matching
- [ ] `TTA-05` — Event replay produces current state: create memory → mutate 10 times → replay all events → equals current state
- [ ] `TTA-06` — Event replay handles all 17 types: one test per event type → correct field modified
- [ ] `TTA-07` — Upcaster registry no-op for current version: v1 event → upcast → unchanged
- [ ] `TTA-08` — Compaction moves old events: insert events → create snapshot → compact → events in archive table
- [ ] `TTA-09` — Snapshot creation + lookup: create snapshot → lookup by memory_id → found with correct state
- [ ] `TTA-10` — Snapshot zstd round-trip: compress → decompress → equals original BaseMemory
- [ ] `TTA-11` — Reconstruction from events only: no snapshots → reconstruct → equals current state
- [ ] `TTA-12` — Reconstruction from snapshot + events: snapshot at T1 → events after T1 → reconstruct at T2 → correct
- [ ] `TTA-13` — Reconstruction snapshot+replay == full replay (property test)
- [ ] `TTA-14` — Retention policy deletes old snapshots: create at various ages → apply retention → only recent remain
- [ ] `TTA-15` — Adaptive trigger fires at threshold: insert 50 events → should_snapshot returns true
- [ ] `TTA-16` — Mutation paths emit events: create/update/archive memory → events table has entries
- [ ] `TTA-17` — Migration v014 runs cleanly: fresh DB → run all migrations → v014 tables exist
- [ ] `TTA-18` — No existing test regressions: `cargo test --workspace` passes
- [ ] `TTA-19` — Property test: replay consistency (replay(events) == apply_one_by_one(events))
- [ ] `TTA-20` — Property test: temporal monotonicity (event_ids strictly increasing)
- [ ] `TTA-21` — Property test: event count conservation (appended == queryable)
- [ ] `TTA-22` — Benchmark baseline: event append (single) < 0.1ms
- [ ] `TTA-23` — Benchmark baseline: event append (batch of 100) < 5ms
- [ ] `TTA-24` — Benchmark baseline: reconstruction 50 events < 5ms
- [ ] `TTA-25` — Benchmark baseline: reconstruction snapshot + 10 events < 1ms
- [ ] `TTA-26` — Benchmark baseline: snapshot creation (single memory) < 2ms
- [ ] `TTA-27` — Benchmark baseline: snapshot batch creation (100 memories) < 200ms

### QG-T0: Event Store Foundation Quality Gate

- [ ] All `TTA-*` tests pass
- [ ] `cargo check -p cortex-temporal` exits 0
- [ ] `cargo clippy -p cortex-temporal` — zero warnings
- [ ] `cargo test -p cortex-temporal` — zero failures
- [ ] `cargo test --workspace` — zero regressions
- [ ] Coverage ≥80% for cortex-temporal event_store modules
- [ ] Coverage ≥80% for cortex-temporal snapshot modules
- [ ] Benchmark baselines established



---

## Phase B: Temporal Queries (~14 new files, ~3 modified)

**Prerequisite:** QG-T0 passed with ≥80% coverage on all Phase A modules.

### cortex-storage: Temporal Query Module

- [ ] `PTB-STOR-01` — Create `cortex-storage/src/queries/temporal_ops.rs` — get_memories_valid_at(conn, valid_time, system_time), get_memories_in_range(conn, from, to, mode), get_memories_modified_between(conn, from, to); raw SQL with temporal indexes
- [ ] `PTB-STOR-02` — Modify `cortex-storage/src/queries/mod.rs` — add `pub mod temporal_ops;`

### cortex-temporal: Query Module

- [ ] `PTB-TEMP-01` — Create `cortex-temporal/src/query/mod.rs` — module declarations + TemporalQueryDispatcher (routes TemporalQuery enum to correct handler)
- [ ] `PTB-TEMP-02` — Create `cortex-temporal/src/query/as_of.rs` — execute_as_of(reader, AsOfQuery) -> Vec<BaseMemory>; bitemporal filter (transaction_time <= S AND valid_time <= V AND valid_until > V); uses reconstruct_all_at; applies integrity filter
- [ ] `PTB-TEMP-03` — Create `cortex-temporal/src/query/range.rs` — execute_range(reader, TemporalRangeQuery) -> Vec<BaseMemory>; 4 modes (Overlaps, Contains, StartedDuring, EndedDuring); optimized via temporal indexes on memories table
- [ ] `PTB-TEMP-04` — Create `cortex-temporal/src/query/diff.rs` — execute_diff(reader, TemporalDiffQuery) -> TemporalDiff; event-range optimization (O(events_in_range) not O(total_memories×2)); computes DiffStats (net_change, confidence_trend, churn_rate)
- [ ] `PTB-TEMP-05` — Create `cortex-temporal/src/query/integrity.rs` — enforce_temporal_integrity(memories, query_time) -> Vec<BaseMemory>; filters dangling refs (linked_patterns, linked_files, linked_functions, superseded_by); temporal join constraint for relationships

### cortex-core: Query Type Models (Phase B subset)

- [ ] `PTB-CORE-01` — Create `cortex-core/src/models/temporal_query.rs` — AsOfQuery, TemporalRangeQuery, TemporalRangeMode (4 variants), TemporalDiffQuery, DiffScope (4 variants), DecisionReplayQuery, TemporalCausalQuery
- [ ] `PTB-CORE-02` — Create `cortex-core/src/models/temporal_diff.rs` — TemporalDiff, MemoryModification, ConfidenceShift, DiffStats
- [ ] `PTB-CORE-03` — Modify `cortex-core/src/models/mod.rs` — add `mod temporal_query;` + `mod temporal_diff;` + pub use re-exports

### cortex-temporal: Dual-Time Module

- [ ] `PTB-TEMP-06` — Create `cortex-temporal/src/dual_time/mod.rs` — module declarations + re-exports
- [ ] `PTB-TEMP-07` — Create `cortex-temporal/src/dual_time/validation.rs` — validate_transaction_time_immutability(old, new) -> Result<()>; validate_temporal_bounds(memory) -> Result<()> (valid_time <= valid_until)
- [ ] `PTB-TEMP-08` — Create `cortex-temporal/src/dual_time/correction.rs` — apply_temporal_correction(writer, memory_id, corrected_valid_time, corrected_valid_until) -> Result<()>; closes old record, creates corrected version, sets supersedes/superseded_by
- [ ] `PTB-TEMP-09` — Create `cortex-temporal/src/dual_time/late_arrival.rs` — handle_late_arriving_fact(memory, actual_valid_time) -> BaseMemory; sets transaction_time=now, valid_time=past; validates valid_time < transaction_time

### cortex-temporal: Update Engine for Phase B

- [ ] `PTB-TEMP-10` — Modify `cortex-temporal/src/engine.rs` — implement query_as_of, query_range, query_diff methods on TemporalEngine (previously returned not-yet-implemented)

### Phase B Tests (≥80% coverage target per module)

- [ ] `TTB-01` — AS OF current time == current state: query_as_of(now()) returns same results as normal query
- [ ] `TTB-02` — AS OF past time excludes future memories: create at T2 → AS OF T1 → not in results
- [ ] `TTB-03` — AS OF respects valid_time: valid March-April → AS OF May → not visible
- [ ] `TTB-04` — AS OF respects transaction_time: created at T2 → AS OF T1 → not visible
- [ ] `TTB-05` — Range Overlaps mode: valid March-May → range April-June → visible
- [ ] `TTB-06` — Range Contains mode: valid March-May → range April-April → visible; range Feb-June → not visible
- [ ] `TTB-07` — Range StartedDuring mode: valid_time=April → range March-May → visible
- [ ] `TTB-08` — Range EndedDuring mode: valid_until=April → range March-May → visible
- [ ] `TTB-09` — Diff identity: diff(T, T) == empty diff for any T
- [ ] `TTB-10` — Diff symmetry: diff(A,B).created == diff(B,A).archived
- [ ] `TTB-11` — Diff detects created memories: create between A and B → in diff.created
- [ ] `TTB-12` — Diff detects archived memories: archive between A and B → in diff.archived
- [ ] `TTB-13` — Diff detects modifications: update between A and B → in diff.modified
- [ ] `TTB-14` — Diff stats are correct: known fixture → stats match expected
- [ ] `TTB-15` — Temporal integrity filters dangling refs: A refs B (created later) → AS OF before B → ref removed
- [ ] `TTB-16` — Temporal integrity preserves valid refs: A refs B (both exist at T) → AS OF T → ref preserved
- [ ] `TTB-17` — transaction_time immutability: attempt update → error
- [ ] `TTB-18` — Temporal bounds validation: valid_time > valid_until → error
- [ ] `TTB-19` — Temporal correction creates new version: correct → old closed, new created
- [ ] `TTB-20` — Late-arriving fact sets correct times: transaction_time=now, valid_time=past
- [ ] `TTB-21` — No existing test regressions: `cargo test --workspace` passes
- [ ] `TTB-22` — Property test: AS OF current == current
- [ ] `TTB-23` — Property test: diff identity (diff(T,T) == empty)
- [ ] `TTB-24` — Property test: diff symmetry
- [ ] `TTB-25` — Property test: temporal referential integrity (no dangling refs at any time T)
- [ ] `TTB-26` — Property test: temporal bounds (valid_time <= valid_until)
- [ ] `TTB-27` — Benchmark: point-in-time single memory < 5ms cold, < 1ms warm
- [ ] `TTB-28` — Benchmark: point-in-time all 10K memories < 500ms cold, < 50ms warm
- [ ] `TTB-29` — Benchmark: temporal diff < 1s cold, < 100ms warm
- [ ] `TTB-30` — Benchmark: range query Overlaps < 50ms

### QG-T1: Temporal Queries Quality Gate

- [ ] All `TTB-*` tests pass
- [ ] `cargo test -p cortex-temporal` — zero failures
- [ ] `cargo test --workspace` — zero regressions
- [ ] Coverage ≥80% for cortex-temporal query modules
- [ ] Coverage ≥80% for cortex-temporal dual_time modules
- [ ] Benchmark baselines established for query operations

---

## Phase C: Decision Replay + Temporal Causal (~6 new files, ~3 modified)

**Prerequisite:** QG-T1 passed with ≥80% coverage on all Phase B modules.

### cortex-core: Decision Replay Model

- [x] `PTC-CORE-01` — Create `cortex-core/src/models/decision_replay.rs` — DecisionReplay struct (decision, available_context, retrieved_context, causal_state, hindsight), HindsightItem struct (memory, relevance, relationship), CausalGraphSnapshot struct (nodes, edges), CausalEdgeSnapshot struct
- [x] `PTC-CORE-02` — Modify `cortex-core/src/models/mod.rs` — add `mod decision_replay;` + pub use re-exports

### cortex-causal: Temporal Graph Reconstruction

- [x] `PTC-CAUSAL-01` — Create `cortex-causal/src/graph/temporal_graph.rs` — reconstruct_graph_at(event_store, as_of) -> StableGraph (builds graph from RelationshipAdded/Removed/StrengthUpdated events); temporal_traversal(memory_id, as_of, direction, max_depth) -> TraversalResult (reuses existing traversal on historical graph)
- [x] `PTC-CAUSAL-02` — Modify `cortex-causal/src/graph/mod.rs` — add `pub mod temporal_graph;`

### cortex-temporal: Decision Replay + Temporal Causal Queries

- [x] `PTC-TEMP-01` — Create `cortex-temporal/src/query/replay.rs` — execute_replay(reader, DecisionReplayQuery) -> DecisionReplay; reconstructs decision at creation time, reconstructs available context, simulates retrieval, reconstructs causal graph, computes hindsight (memories created after decision with similarity > 0.7)
- [x] `PTC-TEMP-02` — Create `cortex-temporal/src/query/temporal_causal.rs` — execute_temporal_causal(reader, TemporalCausalQuery) -> TraversalResult; delegates to cortex-causal temporal_graph module
- [x] `PTC-TEMP-03` — Modify `cortex-temporal/src/engine.rs` — implement replay_decision and query_temporal_causal methods on TemporalEngine

### Phase C Tests (≥80% coverage target per module)

- [x] `TTC-01` — Decision replay returns correct decision state: known decision → replay → matches expected
- [x] `TTC-02` — Decision replay returns correct available context: decision at T → context matches AS OF T
- [x] `TTC-03` — Decision replay computes hindsight: decision at T1, contradicting memory at T2 → in hindsight
- [x] `TTC-04` — Decision replay hindsight relevance threshold: irrelevant memory (similarity < 0.7) → not in hindsight
- [x] `TTC-05` — Decision replay for non-decision memory → appropriate error
- [x] `TTC-06` — Temporal causal at current time == current graph traversal
- [x] `TTC-07` — Temporal causal excludes future edges: edge added at T2 → causal at T1 → not in graph
- [x] `TTC-08` — Temporal causal respects edge removal: added T1, removed T2 → causal at T3 → not in graph
- [x] `TTC-09` — Temporal causal respects strength updates: strength changed at T2 → causal at T1 → old strength
- [x] `TTC-10` — Graph reconstruction from known edge sequence → matches expected graph
- [x] `TTC-11` — No existing test regressions: `cargo test --workspace` passes
- [x] `TTC-12` — Property test: temporal causal at current == current traversal
- [x] `TTC-13` — Property test: graph reconstruction monotonicity (add then remove → not present after removal)
- [x] `TTC-14` — Benchmark: decision replay < 200ms warm
- [x] `TTC-15` — Benchmark: temporal causal traversal < 20ms warm
- [x] `TTC-16` — Benchmark: graph reconstruction 1K edges < 10ms cold, < 2ms warm

### QG-T2: Decision Replay + Temporal Causal Quality Gate

- [x] All `TTC-*` tests pass
- [x] `cargo test -p cortex-temporal` — zero failures
- [x] `cargo test -p cortex-causal` — zero failures (including new temporal_graph tests)
- [x] `cargo test --workspace` — zero regressions
- [x] Coverage ≥80% for cortex-temporal query/replay.rs
- [x] Coverage ≥80% for cortex-temporal query/temporal_causal.rs
- [x] Coverage ≥80% for cortex-causal graph/temporal_graph.rs



---

## Phase D1: Drift Metrics + Alerting (~8 new files, ~2 modified)

**Prerequisite:** QG-T2 passed with ≥80% coverage on all Phase C modules.

### cortex-core: Drift Models

- [ ] `PTD1-CORE-01` — Create `cortex-core/src/models/drift_snapshot.rs` — DriftSnapshot struct (timestamp, window, type_metrics, module_metrics, global), TypeDriftMetrics, ModuleDriftMetrics, GlobalDriftMetrics
- [ ] `PTD1-CORE-02` — Create `cortex-core/src/models/drift_alert.rs` — DriftAlert struct (severity, category, message, affected_memories, recommended_action, detected_at), AlertSeverity enum, DriftAlertCategory enum (6 variants)
- [ ] `PTD1-CORE-03` — Modify `cortex-core/src/models/mod.rs` — add `mod drift_snapshot;` + `mod drift_alert;` + pub use re-exports

### cortex-storage: Drift Query Module

- [ ] `PTD1-STOR-01` — Create `cortex-storage/src/queries/drift_ops.rs` — insert_drift_snapshot, get_drift_snapshots(from, to), get_latest_drift_snapshot (raw SQL)
- [ ] `PTD1-STOR-02` — Modify `cortex-storage/src/queries/mod.rs` — add `pub mod drift_ops;`

### cortex-temporal: Drift Module

- [ ] `PTD1-TEMP-01` — Create `cortex-temporal/src/drift/mod.rs` — module declarations + re-exports
- [ ] `PTD1-TEMP-02` — Create `cortex-temporal/src/drift/metrics.rs` — compute_ksi(reader, type, window), compute_confidence_trajectory(reader, type, window, points), compute_contradiction_density(reader, type, window), compute_consolidation_efficiency(reader, window), compute_all_metrics(reader, window) -> DriftSnapshot
- [ ] `PTD1-TEMP-03` — Create `cortex-temporal/src/drift/evidence_freshness.rs` — compute_evidence_freshness(reader, memory) -> f64; freshness_factor per evidence type (file_link, pattern_link, supporting_memory, user_validation); product aggregation; compute_evidence_freshness_index(reader) -> f64
- [ ] `PTD1-TEMP-04` — Create `cortex-temporal/src/drift/alerting.rs` — evaluate_drift_alerts(snapshot, config, recent_alerts) -> Vec<DriftAlert>; 6 alert categories with configurable thresholds; alert dampening (cooldown per category + entity dedup)
- [ ] `PTD1-TEMP-05` — Create `cortex-temporal/src/drift/snapshots.rs` — store_drift_snapshot(writer, snapshot), get_drift_snapshots(reader, from, to), get_latest_drift_snapshot(reader); snapshot frequency: hourly/daily/weekly
- [ ] `PTD1-TEMP-06` — Create `cortex-temporal/src/drift/patterns.rs` — detect_crystallization, detect_erosion, detect_explosion, detect_conflict_wave; each returns detection result + recommended action
- [ ] `PTD1-TEMP-07` — Modify `cortex-temporal/src/engine.rs` — implement compute_drift_metrics and get_drift_alerts methods on TemporalEngine

### Phase D1 Tests (≥80% coverage target per module)

- [ ] `TTD1-01` — KSI = 1.0 for stable dataset: no changes in window → KSI = 1.0
- [ ] `TTD1-02` — KSI bounds [0.0, 1.0]: property test with any input
- [ ] `TTD1-03` — KSI per type is independent: change only episodic → core KSI unchanged
- [ ] `TTD1-04` — Confidence trajectory tracks correctly: known changes → trajectory matches
- [ ] `TTD1-05` — Contradiction density = 0 for clean dataset
- [ ] `TTD1-06` — Consolidation efficiency computes correctly: known consolidation → ratio matches
- [ ] `TTD1-07` — Evidence freshness = 1.0 for fresh evidence: all links valid
- [ ] `TTD1-08` — Evidence freshness < 1.0 for stale links: file changed → freshness drops
- [ ] `TTD1-09` — Evidence freshness bounds [0.0, 1.0]: property test
- [ ] `TTD1-10` — Alert fires when KSI below threshold: KSI=0.2, threshold=0.3 → alert
- [ ] `TTD1-11` — Alert dampening works: same alert within cooldown → not re-fired
- [ ] `TTD1-12` — Critical alert has shorter cooldown: re-fires after 1h, not 24h
- [ ] `TTD1-13` — Drift snapshot round-trip: store → retrieve → equals original
- [ ] `TTD1-14` — Crystallization detection: known lifecycle → detected
- [ ] `TTD1-15` — Erosion detection: declining confidence cluster → detected
- [ ] `TTD1-16` — Explosion detection: spike above 3σ → detected
- [ ] `TTD1-17` — Conflict wave detection: contradiction spike in module → detected
- [ ] `TTD1-18` — Benchmark: KSI computation 10K memories < 100ms
- [ ] `TTD1-19` — Benchmark: full drift metrics 10K memories < 500ms
- [ ] `TTD1-20` — Benchmark: evidence freshness single memory < 1ms
- [ ] `TTD1-21` — Benchmark: alert evaluation (100 metrics) < 10ms

### QG-T3a: Drift Metrics + Alerting Quality Gate

- [ ] All `TTD1-*` tests pass
- [ ] Coverage ≥80% for cortex-temporal drift/metrics.rs
- [ ] Coverage ≥80% for cortex-temporal drift/evidence_freshness.rs
- [ ] Coverage ≥80% for cortex-temporal drift/alerting.rs
- [ ] Coverage ≥80% for cortex-temporal drift/snapshots.rs
- [ ] Coverage ≥80% for cortex-temporal drift/patterns.rs

---

## Phase D2: Epistemic Status + Materialized Views (~9 new files, ~2 modified)

**Prerequisite:** QG-T3a passed.

### cortex-core: Epistemic + View Models

- [ ] `PTD2-CORE-01` — Create `cortex-core/src/models/epistemic_status.rs` — EpistemicStatus enum (Conjecture, Provisional, Verified, Stale with per-variant metadata), AggregationStrategy enum (WeightedAverage, GodelTNorm)
- [ ] `PTD2-CORE-02` — Create `cortex-core/src/models/materialized_view.rs` — MaterializedTemporalView struct (view_id, label, timestamp, memory_count, snapshot_ids, drift_snapshot_id, created_by, auto_refresh)
- [ ] `PTD2-CORE-03` — Modify `cortex-core/src/models/mod.rs` — add `mod epistemic_status;` + `mod materialized_view;` + pub use re-exports

### cortex-storage: View Query Module

- [ ] `PTD2-STOR-01` — Create `cortex-storage/src/queries/view_ops.rs` — insert_materialized_view, get_view_by_label, list_views, delete_view (raw SQL)
- [ ] `PTD2-STOR-02` — Modify `cortex-storage/src/queries/mod.rs` — add `pub mod view_ops;`

### cortex-temporal: Epistemic Module

- [ ] `PTD2-TEMP-01` — Create `cortex-temporal/src/epistemic/mod.rs` — module declarations + re-exports
- [ ] `PTD2-TEMP-02` — Create `cortex-temporal/src/epistemic/status.rs` — determine_initial_status(source: &EventActor) -> EpistemicStatus (always Conjecture)
- [ ] `PTD2-TEMP-03` — Create `cortex-temporal/src/epistemic/transitions.rs` — promote_to_provisional, promote_to_verified, demote_to_stale; validates promotion path (Conjecture→Provisional→Verified only; Stale only from Verified)
- [ ] `PTD2-TEMP-04` — Create `cortex-temporal/src/epistemic/aggregation.rs` — aggregate_confidence(evidences, strategy) -> f64; WeightedAverage (mean) and GodelTNorm (min operator)

### cortex-temporal: Views Module

- [ ] `PTD2-TEMP-05` — Create `cortex-temporal/src/views/mod.rs` — module declarations + re-exports
- [ ] `PTD2-TEMP-06` — Create `cortex-temporal/src/views/create.rs` — create_materialized_view(writer, reader, label, timestamp) -> MaterializedTemporalView; snapshots all active memories, associates drift snapshot
- [ ] `PTD2-TEMP-07` — Create `cortex-temporal/src/views/query.rs` — get_view(reader, label), list_views(reader), diff_views(reader, label_a, label_b) -> TemporalDiff
- [ ] `PTD2-TEMP-08` — Create `cortex-temporal/src/views/auto_refresh.rs` — AutoRefreshScheduler: should_create_view() -> Option<String>; default 14-day interval; skips if no events since last view
- [ ] `PTD2-TEMP-09` — Modify `cortex-temporal/src/engine.rs` — implement create_view and get_view methods on TemporalEngine

### Phase D2 Tests (≥80% coverage target per module)

- [ ] `TTD2-01` — New memory starts as Conjecture
- [ ] `TTD2-02` — Conjecture → Provisional on validation pass
- [ ] `TTD2-03` — Provisional → Verified on confirmation
- [ ] `TTD2-04` — Verified → Stale on evidence decay
- [ ] `TTD2-05` — Conjecture → Verified rejected (InvalidEpistemicTransition)
- [ ] `TTD2-06` — Verified → Provisional rejected (InvalidEpistemicTransition)
- [ ] `TTD2-07` — WeightedAverage aggregation correct: known inputs → expected output
- [ ] `TTD2-08` — GodelTNorm aggregation = min: [0.9, 0.3, 0.8] → 0.3
- [ ] `TTD2-09` — Property test: confidence aggregation bounds [0.0, 1.0] for both strategies
- [ ] `TTD2-10` — Property test: epistemic ordering (only valid promotion paths succeed)
- [ ] `TTD2-11` — Materialized view creation: create → view exists with correct memory count
- [ ] `TTD2-12` — Materialized view lookup: create → lookup by label → found
- [ ] `TTD2-13` — Diff between views: create A, create B → diff returns correct delta
- [ ] `TTD2-14` — Auto-refresh scheduler fires: elapsed > interval → returns label
- [ ] `TTD2-15` — Auto-refresh skips when no changes: no events since last → returns None

### QG-T3b: Epistemic + Views Quality Gate

- [ ] All `TTD2-*` tests pass
- [ ] Coverage ≥80% for cortex-temporal epistemic modules
- [ ] Coverage ≥80% for cortex-temporal views modules

---

## Phase D3: Existing Crate Integration (~0 new files, ~7 modified)

**Prerequisite:** QG-T3b passed.

### cortex-retrieval: Temporal Scoring Factors (TR13, CR8)

- [ ] `PTD3-RET-01` — Modify `cortex-retrieval/src/ranking/scorer.rs` — add evidence_freshness (0.06) and epistemic_status (0.05) as new additive scoring factors; redistribute existing weights (semantic 0.22, keyword 0.13, pattern 0.08, importance 0.08, intent 0.08); epistemic scoring: Verified=1.0, Provisional=0.7, Conjecture=0.4, Stale=0.2
- [ ] `PTD3-RET-02` — Modify `cortex-retrieval/src/ranking/mod.rs` — update ScorerWeights default to include 10 factors summing to 1.0

### cortex-validation: Epistemic Promotion (TR11)

- [ ] `PTD3-VALID-01` — Modify `cortex-validation/src/engine.rs` — after validation pass (all 4 dimensions), trigger epistemic promotion: Conjecture→Provisional; on user confirmation: Provisional→Verified; fail does NOT demote
- [ ] `PTD3-VALID-02` — Modify `cortex-validation/src/dimensions/temporal.rs` — add temporal consistency check: referenced memories must have existed when referencing memory was created

### cortex-observability: Drift in Health Reports (TR7)

- [ ] `PTD3-OBS-01` — Modify `cortex-observability/src/health/reporter.rs` — add `drift_summary: Option<DriftSummary>` to HealthSnapshot; DriftSummary: active_alerts count, overall_ksi, overall_efi, trend indicators
- [ ] `PTD3-OBS-02` — Modify `cortex-observability/src/health/subsystem_checks.rs` — add check_temporal(snapshot) -> SubsystemHealth; checks event store health, snapshot freshness, drift alert count
- [ ] `PTD3-OBS-03` — Modify `cortex-observability/src/health/recommendations.rs` — add temporal recommendations: "Run snapshot compaction" if events > threshold, "Review stale evidence" if EFI < 0.5, "Investigate knowledge churn" if KSI < 0.3

### Phase D3 Tests (≥80% coverage on changed code)

- [ ] `TTD3-01` — Retrieval scorer includes temporal factors: score with temporal ≠ score without
- [ ] `TTD3-02` — Verified memory scores higher than Conjecture
- [ ] `TTD3-03` — Evidence freshness affects ranking: fresh > stale
- [ ] `TTD3-04` — Weights sum to 1.0: assert all 10 weights sum to 1.0
- [ ] `TTD3-05` — Validation promotes epistemic status: validate Conjecture → Provisional
- [ ] `TTD3-06` — Validation does not demote on failure: fail Provisional → stays Provisional
- [ ] `TTD3-07` — Health report includes drift summary: generate → drift_summary present
- [ ] `TTD3-08` — Subsystem check reports temporal health
- [ ] `TTD3-09` — Temporal recommendations generated: low KSI → "investigate churn"
- [ ] `TTD3-10` — No retrieval test regressions: `cargo test -p cortex-retrieval` passes
- [ ] `TTD3-11` — No validation test regressions: `cargo test -p cortex-validation` passes
- [ ] `TTD3-12` — No observability test regressions: `cargo test -p cortex-observability` passes

### QG-T3c: Existing Crate Integration Quality Gate

- [ ] All `TTD3-*` tests pass
- [ ] `cargo test -p cortex-retrieval` — zero failures
- [ ] `cargo test -p cortex-validation` — zero failures
- [ ] `cargo test -p cortex-observability` — zero failures
- [ ] `cargo test --workspace` — zero regressions



---

## Phase D4: NAPI Bindings + TypeScript MCP Tools + CLI (~10 new files, ~6 modified)

**Prerequisite:** QG-T3c passed.

### cortex-napi: Temporal Bindings

- [ ] `PTD4-NAPI-01` — Create `cortex-napi/src/bindings/temporal.rs` — 10 #[napi] functions: query_as_of, query_range, query_diff, replay_decision, query_temporal_causal, get_drift_metrics, get_drift_alerts, create_materialized_view, get_materialized_view, list_materialized_views
- [ ] `PTD4-NAPI-02` — Create `cortex-napi/src/conversions/temporal_types.rs` — NapiMemoryEvent, NapiDriftSnapshot, NapiDriftAlert, NapiTemporalDiff, NapiDecisionReplay, NapiMaterializedView, NapiHindsightItem, NapiDiffStats; From/Into conversions
- [ ] `PTD4-NAPI-03` — Modify `cortex-napi/src/bindings/mod.rs` — add `pub mod temporal;`
- [ ] `PTD4-NAPI-04` — Modify `cortex-napi/src/conversions/mod.rs` — add `pub mod temporal_types;`

### TypeScript Bridge

- [ ] `PTD4-TS-01` — Modify `packages/cortex/src/bridge/types.ts` — add TypeScript interfaces: TemporalDiff, DiffStats, DecisionReplay, HindsightItem, DriftSnapshot, DriftAlert, MaterializedTemporalView, EpistemicStatus, AsOfQuery, TemporalRangeQuery, TemporalDiffQuery, DecisionReplayQuery, TemporalCausalQuery
- [ ] `PTD4-TS-02` — Modify `packages/cortex/src/bridge/client.ts` — add 10 temporal methods: queryAsOf, queryRange, queryDiff, replayDecision, queryTemporalCausal, getDriftMetrics, getDriftAlerts, createMaterializedView, getMaterializedView, listMaterializedViews

### TypeScript MCP Tools (5 new tools)

- [ ] `PTD4-MCP-01` — Create `packages/cortex/src/tools/temporal/drift_time_travel.ts` — MCP tool: point-in-time knowledge query; input: system_time, valid_time, filter; calls bridge.queryAsOf()
- [ ] `PTD4-MCP-02` — Create `packages/cortex/src/tools/temporal/drift_time_diff.ts` — MCP tool: compare knowledge between two times; input: time_a, time_b, scope; calls bridge.queryDiff()
- [ ] `PTD4-MCP-03` — Create `packages/cortex/src/tools/temporal/drift_time_replay.ts` — MCP tool: replay decision context; input: decision_memory_id, budget; calls bridge.replayDecision()
- [ ] `PTD4-MCP-04` — Create `packages/cortex/src/tools/temporal/drift_knowledge_health.ts` — MCP tool: drift metrics dashboard; input: window_hours; calls bridge.getDriftMetrics() + getDriftAlerts()
- [ ] `PTD4-MCP-05` — Create `packages/cortex/src/tools/temporal/drift_knowledge_timeline.ts` — MCP tool: knowledge evolution visualization; input: from, to, granularity; calls bridge.getDriftMetrics() per time point
- [ ] `PTD4-MCP-06` — Modify `packages/cortex/src/tools/index.ts` — register all 5 new temporal tools

### TypeScript CLI Commands (3 new commands)

- [ ] `PTD4-CLI-01` — Create `packages/cortex/src/cli/timeline.ts` — `drift cortex timeline` command; options: --from, --to, --type, --module; shows KSI, confidence, contradiction density, EFI over time
- [ ] `PTD4-CLI-02` — Create `packages/cortex/src/cli/diff.ts` — `drift cortex diff` command; options: --from (required), --to (required), --scope; shows structured diff
- [ ] `PTD4-CLI-03` — Create `packages/cortex/src/cli/replay.ts` — `drift cortex replay <decision-id>` command; options: --budget; shows decision context + hindsight
- [ ] `PTD4-CLI-04` — Modify `packages/cortex/src/cli/index.ts` — register timeline, diff, replay commands

### TypeScript Tests

- [ ] `PTD4-TEST-01` — Modify `packages/cortex/tests/bridge.test.ts` — add test cases for all 10 temporal bridge methods

### Phase D4 Tests

- [ ] `TTD4-01` — NAPI query_as_of round-trip: TS → Rust → TS with correct shape
- [ ] `TTD4-02` — NAPI query_diff round-trip: TS → Rust → TS with correct shape
- [ ] `TTD4-03` — NAPI replay_decision round-trip: TS → Rust → TS with correct shape
- [ ] `TTD4-04` — NAPI get_drift_metrics round-trip: TS → Rust → TS with correct shape
- [ ] `TTD4-05` — NAPI create_materialized_view round-trip: TS → Rust → TS with correct shape
- [ ] `TTD4-06` — All 10 NAPI functions compile: `cargo check -p cortex-napi` exits 0
- [ ] `TTD4-07` — Type conversions are lossless: Rust → NAPI → Rust preserves all fields
- [ ] `TTD4-08` — MCP tool drift_time_travel works: tool call → returns memories
- [ ] `TTD4-09` — MCP tool drift_time_diff works: tool call → returns diff
- [ ] `TTD4-10` — MCP tool drift_knowledge_health works: tool call → returns metrics + alerts
- [ ] `TTD4-11` — Bridge test suite passes: `vitest run` in packages/cortex → temporal tests pass

### QG-T3d: NAPI + TypeScript Quality Gate

- [ ] All `TTD4-*` tests pass
- [ ] `cargo check -p cortex-napi` exits 0
- [ ] Coverage ≥80% for cortex-napi bindings/temporal.rs
- [ ] Coverage ≥80% for cortex-napi conversions/temporal_types.rs
- [ ] `vitest run` in packages/cortex passes

---

## Golden Test Fixtures (Phase A-D)

These fixtures are created as needed across phases but tracked here for completeness.

### Temporal Reconstruction Fixtures

- [ ] `PTF-GOLD-01` — Create `test-fixtures/golden/temporal/reconstruction_simple.json` — 10 events, 1 memory, expected state at 3 time points
- [ ] `PTF-GOLD-02` — Create `test-fixtures/golden/temporal/reconstruction_with_snapshot.json` — 50 events + 1 snapshot, expected state at 5 time points
- [ ] `PTF-GOLD-03` — Create `test-fixtures/golden/temporal/reconstruction_branching.json` — consolidation + reclassification events
- [ ] `PTF-GOLD-04` — Create `test-fixtures/golden/temporal/reconstruction_late_arrival.json` — late-arriving fact
- [ ] `PTF-GOLD-05` — Create `test-fixtures/golden/temporal/reconstruction_correction.json` — temporal correction

### Temporal Diff Fixtures

- [ ] `PTF-GOLD-06` — Create `test-fixtures/golden/temporal/diff_sprint_boundary.json` — sprint-12 vs sprint-14
- [ ] `PTF-GOLD-07` — Create `test-fixtures/golden/temporal/diff_empty.json` — same time point
- [ ] `PTF-GOLD-08` — Create `test-fixtures/golden/temporal/diff_major_refactor.json` — before/after refactor

### Decision Replay Fixtures

- [ ] `PTF-GOLD-09` — Create `test-fixtures/golden/temporal/replay_auth_decision.json` — auth decision context
- [ ] `PTF-GOLD-10` — Create `test-fixtures/golden/temporal/replay_with_hindsight.json` — decision + contradicting knowledge

### Drift Detection Fixtures

- [ ] `PTF-GOLD-11` — Create `test-fixtures/golden/temporal/drift_stable.json` — stable KB, KSI ≈ 1.0
- [ ] `PTF-GOLD-12` — Create `test-fixtures/golden/temporal/drift_erosion.json` — declining confidence
- [ ] `PTF-GOLD-13` — Create `test-fixtures/golden/temporal/drift_explosion.json` — creation spike

### Test Entry Points

- [ ] `PTF-TEST-01` — Create `cortex-temporal/tests/temporal_test.rs` — event store + snapshot + reconstruction tests
- [ ] `PTF-TEST-02` — Create `cortex-temporal/tests/query_test.rs` — all 5 query type tests
- [ ] `PTF-TEST-03` — Create `cortex-temporal/tests/drift_test.rs` — drift metrics + alerting tests
- [ ] `PTF-TEST-04` — Create `cortex-temporal/tests/epistemic_test.rs` — epistemic status transition tests
- [ ] `PTF-TEST-05` — Create `cortex-temporal/tests/golden_test.rs` — golden fixture validation
- [ ] `PTF-TEST-06` — Create `cortex-temporal/tests/stress_test.rs` — high-volume + concurrent tests
- [ ] `PTF-TEST-07` — Create `cortex-temporal/tests/coverage_test.rs` — public API surface coverage
- [ ] `PTF-TEST-08` — Create `cortex-temporal/tests/property_tests.rs` — entry point for proptest module
- [ ] `PTF-TEST-09` — Create `cortex-temporal/tests/property/mod.rs` — module declarations
- [ ] `PTF-TEST-10` — Create `cortex-temporal/tests/property/temporal_properties.rs` — all 12 property-based tests
- [ ] `PTF-TEST-11` — Create `cortex-temporal/benches/temporal_bench.rs` — all 17 benchmark targets (event append single/batch, reconstruction cold/warm, snapshot single/batch, point-in-time single/all, range query, temporal diff, decision replay, temporal causal, graph reconstruction, KSI, full drift, evidence freshness, alert evaluation)

---

## QG-T4: Final Integration Quality Gate

**Prerequisite:** QG-T3d passed. All phases A through D4 complete.

### End-to-End Integration Tests

- [ ] `TT-INT-01` — Full lifecycle: create memory → mutate 20 times → reconstruct at 5 time points → all correct
- [ ] `TT-INT-02` — Cross-crate event flow: decay engine decays → event recorded → temporal query sees decay
- [ ] `TT-INT-03` — Consolidation temporal trail: consolidate 3 memories → events for all 3 → replay shows consolidation
- [ ] `TT-INT-04` — Validation → epistemic promotion: validate → status promoted → retrieval score changes
- [ ] `TT-INT-05` — Drift metrics end-to-end: create/archive/modify → metrics reflect → alerts fire
- [ ] `TT-INT-06` — Decision replay end-to-end: create decision → add context → replay → context matches
- [ ] `TT-INT-07` — NAPI round-trip all 10 functions: TypeScript → Rust → TypeScript
- [ ] `TT-INT-08` — MCP tools all 5 functional: each returns valid response
- [ ] `TT-INT-09` — CLI commands all 3 functional: each produces output

### Final Checks

- [ ] `TT-FINAL-01` — `cargo test --workspace` passes with zero failures
- [ ] `TT-FINAL-02` — `cargo tarpaulin -p cortex-temporal --ignore-tests` reports ≥80% overall coverage
- [ ] `TT-FINAL-03` — `cargo bench -p cortex-temporal` — all 17 benchmarks within target
- [ ] `TT-FINAL-04` — `cargo clippy -p cortex-temporal` — zero warnings
- [ ] `TT-FINAL-05` — `cargo clippy --workspace` — zero new warnings from temporal changes
- [ ] `TT-FINAL-06` — Storage overhead within bounds: 10K memories, 6 months → total temporal storage < 500MB
- [ ] `TT-FINAL-07` — `vitest run` in packages/cortex — all tests pass including temporal

---

## Progress Summary

| Phase | Impl Tasks | Test Tasks | Status |
|-------|------------|------------|--------|
| A: Event Store Foundation | 0/40 | 0/27 | ⬜ Not Started |
| B: Temporal Queries | 0/15 | 0/30 | ⬜ Not Started |
| C: Decision Replay + Temporal Causal | 7/7 | 16/16 | ✅ Complete |
| D1: Drift Metrics + Alerting | 0/12 | 0/21 | ⬜ Not Started |
| D2: Epistemic + Views | 0/14 | 0/15 | ⬜ Not Started |
| D3: Existing Crate Integration | 0/7 | 0/12 | ⬜ Not Started |
| D4: NAPI + TypeScript + CLI | 0/17 | 0/11 | ⬜ Not Started |
| Golden Fixtures + Test Files | 0/24 | — | ⬜ Not Started |
| Quality Gates (QG-T0 → QG-T4) | 0/14 | 0/16 | ⬜ Not Started |
| **TOTAL** | **0/150** | **0/148** | ⬜ **Not Started** |

