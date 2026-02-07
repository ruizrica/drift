# Cortex Multi-Agent Memory — Implementation Task Tracker

> **Source of Truth:** MULTIAGENT-IMPLEMENTATION-SPEC.md v1.0.0
> **Target Coverage:** ≥80% test coverage per module (`cargo tarpaulin -p cortex-crdt -p cortex-multiagent --ignore-tests`)
> **Total New Files:** 90 | **Total Modified Files:** 30 | **Total Touched:** 120
> **Total Phases:** 4 (A–D, with D split into D1–D3)
> **Quality Gates:** 7 (QG-MA0 through QG-MA4, plus QG-MA3a and QG-MA3b)
> **Rule:** No Phase N+1 begins until Phase N quality gate passes with ≥80% coverage.
> **Verification:** This tracker accounts for 100% of files in MULTIAGENT-IMPLEMENTATION-SPEC.md,
>   100% of 21 property-based tests, 100% of 16 benchmark targets, and includes enterprise
>   monitoring, logging, error handling, and observability requirements.

---

## How To Use This Document

- Agents: check off `[ ]` → `[x]` as you complete each task
- Every implementation task has a unique ID: `PMA{phase}-{crate}-{number}` (PMA = Phase Multi-Agent)
- Every test task has a unique ID: `TMA{phase}-{crate}-{number}` (TMA = Test Multi-Agent)
- Quality gates are pass/fail — all criteria must pass before proceeding
- For behavioral details on any task → MULTIAGENT-IMPLEMENTATION-SPEC.md
- For file paths and structure → MULTIAGENT-IMPLEMENTATION-SPEC.md (Complete File Inventory section)
- For parent system context → CORTEX-IMPLEMENTATION-SPEC.md

---

## Enterprise Requirements Checklist

Every module must include:
- [ ] **Error Handling**: All errors use `CortexResult<T>` with specific error variants
- [ ] **Logging**: `tracing::info!`, `tracing::warn!`, `tracing::error!` at appropriate levels
- [ ] **Metrics**: Performance-critical paths instrumented with `tracing::instrument`
- [ ] **Validation**: Input validation with clear error messages
- [ ] **Documentation**: Public API has doc comments with examples
- [ ] **Testing**: Unit tests + integration tests + property tests where applicable
- [ ] **Benchmarks**: Performance-critical operations have criterion benchmarks

---

## Phase A: CRDT Foundation + Core Types (~35 new files, ~8 modified)

### Workspace Registration

- [ ] `PMA-WS-01` — Modify `crates/cortex/Cargo.toml` — add `"cortex-crdt"` and `"cortex-multiagent"` to `[workspace.members]`, add both to `[workspace.dependencies]` with path references

### cortex-core: New Types + Trait + Config + Error

#### Models — Agent Types

- [ ] `PMA-CORE-01` — Create `cortex-core/src/models/agent.rs` — AgentId struct (UUID-based String wrapper with new() and default_agent()), AgentRegistration struct (agent_id, name, namespace, capabilities, parent_agent, registered_at, last_active, status), AgentStatus enum (Active, Idle { since }, Deregistered { at }), SpawnConfig struct (parent_agent, projection, trust_discount, auto_promote_on_deregister, ttl)
  - **Logging**: Log agent registration/deregistration at info level
  - **Validation**: Validate agent names are non-empty, capabilities are valid strings
  - **Docs**: Document AgentId::default_agent() backward compatibility semantics

#### Models — Namespace Types

- [ ] `PMA-CORE-02` — Create `cortex-core/src/models/namespace.rs` — NamespaceId struct (scope, name), NamespaceScope enum (Agent(AgentId), Team(String), Project(String)), NamespacePermission enum (Read, Write, Share, Admin), NamespaceACL struct (namespace, grants), MemoryProjection struct (id, source, target, filter, compression_level, live, created_at, created_by), ProjectionFilter struct (memory_types, min_confidence, min_importance, linked_files, tags, max_age_days, predicate)
  - **Validation**: Validate namespace URIs match pattern `{scope}://{name}/`
  - **Docs**: Document default namespace backward compatibility
  - **Serde**: All types derive Serialize + Deserialize

#### Models — Provenance Types

- [ ] `PMA-CORE-03` — Create `cortex-core/src/models/provenance.rs` — ProvenanceRecord struct (memory_id, origin, chain, chain_confidence), ProvenanceOrigin enum (Human, AgentCreated, Derived, Imported, Projected), ProvenanceHop struct (agent_id, action, timestamp, confidence_delta), ProvenanceAction enum (Created, SharedTo, ProjectedTo, MergedWith, ConsolidatedFrom, ValidatedBy, UsedInDecision, CorrectedBy, ReclassifiedFrom)
  - **Logging**: Log provenance chain creation at debug level
  - **Validation**: Validate confidence_delta is in [-1.0, 1.0]
  - **Docs**: Document provenance chain confidence calculation

#### Models — Cross-Agent Types

- [ ] `PMA-CORE-04` — Create `cortex-core/src/models/cross_agent.rs` — CrossAgentRelation enum (InformedBy, DecisionBasedOn, IndependentCorroboration, CrossAgentContradiction, Refinement), CrossAgentContradiction struct (memory_a, agent_a, trust_a, memory_b, agent_b, trust_b, contradiction_type, resolution), ContradictionResolution enum (TrustWins, NeedsHumanReview, ContextDependent, TemporalSupersession), AgentTrust struct (agent_id, target_agent, overall_trust, domain_trust, evidence, last_updated), TrustEvidence struct (validated_count, contradicted_count, useful_count, total_received)
  - **Validation**: Validate trust scores are in [0.0, 1.0]
  - **Docs**: Document trust calculation formula
  - **Serde**: All types derive Serialize + Deserialize

#### Models — Module Registration

- [ ] `PMA-CORE-05` — Modify `cortex-core/src/models/mod.rs` — add `pub mod agent;`, `pub mod namespace;`, `pub mod provenance;`, `pub mod cross_agent;` + re-export all public types

#### Memory — Add Multi-Agent Fields

- [ ] `PMA-CORE-06` — Modify `cortex-core/src/memory/base.rs` — add `namespace: NamespaceId` field (default: `agent://default/`), add `source_agent: AgentId` field (default: `AgentId::default_agent()`)
  - **Migration Note**: Document that existing memories get default values
  - **Validation**: Validate namespace and source_agent are set on all new memories

- [ ] `PMA-CORE-07` — Modify `cortex-core/src/memory/relationships.rs` — add `CrossAgent(CrossAgentRelation)` variant to existing relationship enum
  - **Docs**: Document cross-agent relationship semantics

#### Errors

- [ ] `PMA-CORE-08` — Create `cortex-core/src/errors/multiagent_error.rs` — MultiAgentError enum with 10 variants: AgentNotFound(String), AgentAlreadyRegistered(String), NamespaceNotFound(String), PermissionDenied { agent, namespace, permission }, ProjectionNotFound(String), InvalidNamespaceUri(String), CausalOrderViolation { expected, found }, CyclicDependency(String), SyncFailed(String), TrustComputationFailed(String); implement Display and Error traits
  - **Error Messages**: Clear, actionable error messages for each variant
  - **Context**: Include relevant IDs in error messages for debugging

- [ ] `PMA-CORE-09` — Modify `cortex-core/src/errors/mod.rs` — add `pub mod multiagent_error;` + `pub use multiagent_error::MultiAgentError;`

- [ ] `PMA-CORE-10` — Modify `cortex-core/src/errors/cortex_error.rs` — add `MultiAgentError(#[from] MultiAgentError)` variant to CortexError enum
  - **Error Propagation**: Ensure From trait enables `?` operator usage

#### Trait

- [ ] `PMA-CORE-11` — Create `cortex-core/src/traits/multiagent_engine.rs` — IMultiAgentEngine async_trait with 12 methods: register_agent, deregister_agent, get_agent, list_agents, create_namespace, check_permission, share_memory, create_projection, sync_with, get_provenance, get_trust, detect_consensus
  - **Docs**: Document each method with parameters, return values, and error conditions
  - **Async**: All methods are async for consistency with existing engine traits

- [ ] `PMA-CORE-12` — Modify `cortex-core/src/traits/mod.rs` — add `pub mod multiagent_engine;` + `pub use multiagent_engine::IMultiAgentEngine;`

#### Config

- [ ] `PMA-CORE-13` — Create `cortex-core/src/config/multiagent_config.rs` — MultiAgentConfig struct with 17 fields (enabled: bool default false, default_namespace, agent_idle_timeout_hours, delta_queue_max_size, backpressure_batch_interval_secs, trust_bootstrap_score, trust_decay_rate, trust_contradiction_penalty, trust_validation_bonus, trust_usage_bonus, spawn_trust_discount, correction_dampening_factor, correction_min_threshold, consensus_similarity_threshold, consensus_min_agents, consensus_confidence_boost, contradiction_trust_auto_resolve_threshold) + impl Default
  - **Validation**: Validate all thresholds are in valid ranges
  - **Docs**: Document each config field with rationale for default value
  - **Serde**: Derive Serialize + Deserialize for config file support

- [ ] `PMA-CORE-14` — Modify `cortex-core/src/config/mod.rs` — add `pub mod multiagent_config;` + `pub use MultiAgentConfig;` + add `multiagent: MultiAgentConfig` field to CortexConfig struct
  - **Default**: Ensure CortexConfig::default() includes multiagent config

### cortex-crdt: New Crate — CRDT Primitives

#### Crate Setup

- [ ] `PMA-CRDT-01` — Create `cortex-crdt/Cargo.toml` — package metadata (name, version.workspace, edition.workspace, etc.), deps: cortex-core, chrono, serde, serde_json; dev-deps: proptest, criterion, test-fixtures; bench target: crdt_bench
  - **Deps**: Minimal dependencies, no unnecessary bloat
  - **Features**: Consider feature flags for optional functionality

- [ ] `PMA-CRDT-02` — Create `cortex-crdt/src/lib.rs` — module declarations (clock, primitives, memory, graph), re-exports of public API (VectorClock, all CRDT primitives, MemoryCRDT, FieldDelta, MergeEngine, CausalGraphCRDT)
  - **Docs**: Crate-level documentation explaining CRDT purpose and usage
  - **Examples**: Include usage examples in crate docs

#### Vector Clock

- [ ] `PMA-CRDT-03` — Create `cortex-crdt/src/clock.rs` — VectorClock struct (clocks: HashMap<String, u64>), methods: new(), increment(agent_id), get(agent_id), merge(other), happens_before(other), concurrent_with(other), dominates(other)
  - **Logging**: Log clock operations at trace level for debugging
  - **Validation**: Validate agent_id is non-empty
  - **Docs**: Document causal ordering semantics with examples
  - **Tests**: Property tests for commutativity, associativity, idempotency


#### CRDT Primitives Module

- [ ] `PMA-CRDT-04` — Create `cortex-crdt/src/primitives/mod.rs` — module declarations + re-exports for all primitives

- [ ] `PMA-CRDT-05` — Create `cortex-crdt/src/primitives/gcounter.rs` — GCounter struct (counts: HashMap<String, u64>), methods: new(), increment(agent_id), value(), merge(other), delta_since(other)
  - **Invariant**: Value is monotonically increasing
  - **Logging**: Log merge operations at debug level
  - **Docs**: Document grow-only semantics and use cases (access_count, retrieval_count)
  - **Serde**: Derive Serialize + Deserialize
  - **Tests**: Commutativity, associativity, idempotency property tests

- [ ] `PMA-CRDT-06` — Create `cortex-crdt/src/primitives/lww_register.rs` — LWWRegister<T> struct (value: T, timestamp: DateTime<Utc>, agent_id: String), methods: new(), set(value, timestamp, agent_id), get(), merge(other), delta_since(other)
  - **Tie-Breaking**: Lexicographic agent_id when timestamps equal
  - **Logging**: Log merge conflicts at debug level
  - **Docs**: Document last-writer-wins semantics and tie-breaking rule
  - **Serde**: Serialize + Deserialize where T: Serialize + Deserialize
  - **Tests**: Merge commutativity, tie-breaking correctness

- [ ] `PMA-CRDT-07` — Create `cortex-crdt/src/primitives/mv_register.rs` — MVRegister<T> struct (values: Vec<(T, VectorClock)>), methods: new(), set(value, clock), get(), is_conflicted(), resolve(value), merge(other)
  - **Conflict Detection**: is_conflicted() returns true when multiple concurrent values
  - **Logging**: Log conflicts at warn level for visibility
  - **Docs**: Document multi-value semantics and when to use vs LWW
  - **Serde**: Serialize + Deserialize where T: Serialize + Deserialize
  - **Tests**: Concurrent value preservation, conflict resolution

- [ ] `PMA-CRDT-08` — Create `cortex-crdt/src/primitives/or_set.rs` — UniqueTag struct (agent_id, seq), ORSet<T> struct (adds: HashMap<T, HashSet<UniqueTag>>, tombstones: HashSet<UniqueTag>), methods: new(), add(value, agent_id, seq), remove(value), contains(value), elements(), len(), merge(other), delta_since(other)
  - **Add-Wins**: Concurrent add + remove → element present
  - **Logging**: Log add/remove operations at debug level
  - **Docs**: Document add-wins semantics and tombstone management
  - **Serde**: Serialize + Deserialize where T: Serialize + Deserialize + Eq + Hash
  - **Tests**: Add-wins property test, size bounded by unique adds

- [ ] `PMA-CRDT-09` — Create `cortex-crdt/src/primitives/max_register.rs` — MaxRegister<T: Ord> struct (value: T, timestamp: DateTime<Utc>), methods: new(), set(value), get(), merge(other), delta_since(other)
  - **Only-Up**: Value only increases, never decreases
  - **Logging**: Log rejected updates (value <= current) at trace level
  - **Docs**: Document max-wins semantics and use cases (confidence, last_accessed)
  - **Serde**: Serialize + Deserialize where T: Serialize + Deserialize + Ord
  - **Tests**: Monotonicity property test, merge commutativity

#### Memory CRDT Module

- [ ] `PMA-CRDT-10` — Create `cortex-crdt/src/memory/mod.rs` — module declarations + re-exports

- [ ] `PMA-CRDT-11` — Create `cortex-crdt/src/memory/memory_crdt.rs` — MemoryCRDT struct with per-field CRDT wrappers (id: immutable, memory_type: LWWRegister, content: LWWRegister, summary: LWWRegister, transaction_time: immutable, valid_time: LWWRegister, valid_until: LWWRegister, base_confidence: MaxRegister, importance: LWWRegister, last_accessed: MaxRegister, access_count: GCounter, linked_patterns: ORSet, linked_constraints: ORSet, linked_files: ORSet, linked_functions: ORSet, tags: ORSet, archived: LWWRegister, superseded_by: LWWRegister, supersedes: ORSet, namespace: LWWRegister, provenance: Vec<ProvenanceHop>, clock: VectorClock), methods: merge(other), to_base_memory(), from_base_memory(memory, agent_id), content_hash()
  - **Logging**: Log merge operations at info level with memory_id
  - **Validation**: Validate all fields after merge maintain invariants
  - **Docs**: Document per-field CRDT type mapping table
  - **Metrics**: Instrument merge() with tracing::instrument for performance monitoring
  - **Tests**: Merge convergence property test, round-trip test

- [ ] `PMA-CRDT-12` — Create `cortex-crdt/src/memory/field_delta.rs` — FieldDelta enum with 13 variants (ContentUpdated, SummaryUpdated, ConfidenceBoosted, TagAdded, TagRemoved, LinkAdded, LinkRemoved, AccessCountIncremented, ImportanceChanged, ArchivedChanged, ProvenanceHopAdded, MemoryCreated, NamespaceChanged), each with appropriate fields
  - **Serde**: Use #[serde(tag = "type", content = "data")] for clean JSON
  - **Logging**: Log delta application at debug level
  - **Docs**: Document each variant's purpose and when it's emitted
  - **Validation**: Validate delta fields are within valid ranges

- [ ] `PMA-CRDT-13` — Create `cortex-crdt/src/memory/merge_engine.rs` — MergeEngine struct (stateless), MemoryDelta struct (memory_id, source_agent, clock, field_deltas, timestamp), methods: merge_memories(local, remote), apply_delta(local, delta), compute_delta(local, remote_clock)
  - **Causal Ordering**: Validate causal ordering before applying deltas
  - **Logging**: Log causal violations at warn level
  - **Error Handling**: Return CausalOrderViolation error for out-of-order deltas
  - **Docs**: Document causal delivery guarantee
  - **Metrics**: Instrument apply_delta for performance monitoring
  - **Tests**: Causal delivery property test

#### Graph CRDT Module

- [ ] `PMA-CRDT-14` — Create `cortex-crdt/src/graph/mod.rs` — module declarations + re-exports

- [ ] `PMA-CRDT-15` — Create `cortex-crdt/src/graph/dag_crdt.rs` — CausalGraphCRDT struct (edges: ORSet<CausalEdge>, strengths: HashMap<(String, String), MaxRegister<f64>>), methods: new(), add_edge(edge, agent_id, seq), remove_edge(source, target), update_strength(source, target, strength), merge(other), resolve_cycles(), detect_cycle(), would_create_cycle(edge), to_petgraph(), edges()
  - **Cycle Prevention**: Local check before add, global resolution after merge
  - **Logging**: Log cycle detection at warn level with cycle path
  - **Error Handling**: Return CyclicDependency error for invalid adds
  - **Docs**: Document novel DAG CRDT contribution and cycle resolution algorithm
  - **Metrics**: Instrument merge() and resolve_cycles() for performance
  - **Tests**: Acyclicity property test, weakest-link removal determinism

### Phase A Tests (≥80% coverage target per module)

#### CRDT Primitive Tests

- [ ] `TMA-CRDT-01` — GCounter increment + value: increment 3 agents → value = sum
- [ ] `TMA-CRDT-02` — GCounter merge commutativity: merge(A,B) == merge(B,A)
- [ ] `TMA-CRDT-03` — GCounter merge associativity: merge(A, merge(B,C)) == merge(merge(A,B), C)
- [ ] `TMA-CRDT-04` — GCounter merge idempotency: merge(A,A) == A
- [ ] `TMA-CRDT-05` — LWWRegister set + get: set value → get returns it
- [ ] `TMA-CRDT-06` — LWWRegister merge keeps newer: two timestamps → merge keeps higher
- [ ] `TMA-CRDT-07` — LWWRegister tie-break by agent_id: same timestamp → lexicographic wins
- [ ] `TMA-CRDT-08` — LWWRegister merge commutativity: merge(A,B) == merge(B,A)
- [ ] `TMA-CRDT-09` — MVRegister concurrent values: two concurrent sets → both present
- [ ] `TMA-CRDT-10` — MVRegister is_conflicted: concurrent → true; single → false
- [ ] `TMA-CRDT-11` — MVRegister resolve collapses: resolve → single value, not conflicted
- [ ] `TMA-CRDT-12` — ORSet add + contains: add element → contains returns true
- [ ] `TMA-CRDT-13` — ORSet remove + contains: add then remove → contains returns false
- [ ] `TMA-CRDT-14` — ORSet add-wins semantics: concurrent add + remove → element present
- [ ] `TMA-CRDT-15` — ORSet merge commutativity: merge(A,B) == merge(B,A)
- [ ] `TMA-CRDT-16` — ORSet size bounded: property test size ≤ unique adds
- [ ] `TMA-CRDT-17` — MaxRegister only-up: set lower value → unchanged
- [ ] `TMA-CRDT-18` — MaxRegister merge keeps max: two values → merge keeps greater
- [ ] `TMA-CRDT-19` — VectorClock increment: increment agent → that entry +1
- [ ] `TMA-CRDT-20` — VectorClock merge component-wise max: merge(A,B) → per-agent max
- [ ] `TMA-CRDT-21` — VectorClock happens_before: A < B when all A ≤ B, at least one <
- [ ] `TMA-CRDT-22` — VectorClock concurrent: neither happens_before → concurrent

#### Memory CRDT Tests

- [ ] `TMA-CRDT-23` — MemoryCRDT from_base_memory round-trip: from → to == original
- [ ] `TMA-CRDT-24` — MemoryCRDT merge convergence: two divergent → merge → identical
- [ ] `TMA-CRDT-25` — MemoryCRDT delta computation: compute → apply → states converge
- [ ] `TMA-CRDT-26` — MergeEngine causal ordering: apply with missing predecessor → error

#### DAG CRDT Tests

- [ ] `TMA-CRDT-27` — CausalGraphCRDT add edge: add edge → edge present
- [ ] `TMA-CRDT-28` — CausalGraphCRDT self-loop rejected: add A→A → error
- [ ] `TMA-CRDT-29` — CausalGraphCRDT multi-hop cycle rejected: A→B, B→C, C→A → last fails
- [ ] `TMA-CRDT-30` — CausalGraphCRDT merge-introduced cycle resolved: A adds A→B, B adds B→A → merge → weakest removed
- [ ] `TMA-CRDT-31` — CausalGraphCRDT strength max-wins: two agents update → max wins

#### Property-Based Tests (proptest)

- [ ] `TMA-PROP-01` — Property test: GCounter commutativity for random counters
- [ ] `TMA-PROP-02` — Property test: GCounter associativity
- [ ] `TMA-PROP-03` — Property test: GCounter idempotency
- [ ] `TMA-PROP-04` — Property test: LWWRegister commutativity
- [ ] `TMA-PROP-05` — Property test: LWWRegister associativity
- [ ] `TMA-PROP-06` — Property test: LWWRegister idempotency
- [ ] `TMA-PROP-07` — Property test: ORSet commutativity
- [ ] `TMA-PROP-08` — Property test: ORSet associativity
- [ ] `TMA-PROP-09` — Property test: ORSet idempotency
- [ ] `TMA-PROP-10` — Property test: ORSet add-wins (concurrent add + remove → present)
- [ ] `TMA-PROP-11` — Property test: ORSet size bounded by unique adds
- [ ] `TMA-PROP-12` — Property test: MaxRegister commutativity
- [ ] `TMA-PROP-13` — Property test: MaxRegister monotonicity (value never decreases)
- [ ] `TMA-PROP-14` — Property test: VectorClock causal delivery (never applies future deltas)
- [ ] `TMA-PROP-15` — Property test: MemoryCRDT merge commutativity for all field types
- [ ] `TMA-PROP-16` — Property test: MemoryCRDT convergence (after sync, same state)
- [ ] `TMA-PROP-17` — Property test: CausalGraphCRDT acyclicity (always acyclic after merge)
- [ ] `TMA-PROP-18` — Property test: CausalGraphCRDT edge commutativity
- [ ] `TMA-PROP-19` — Property test: Trust bounds (0.0 ≤ trust ≤ 1.0)

#### Stress Tests

- [ ] `TMA-STRESS-01` — High-volume CRDT merge: 10K memories across 5 agents, full merge < 5s
- [ ] `TMA-STRESS-02` — Delta computation under load: 100K field deltas < 10s
- [ ] `TMA-STRESS-03` — DAG CRDT merge with 1K edges across 3 agents < 1s

#### Benchmark Baselines (criterion)

- [ ] `TMA-BENCH-01` — GCounter merge (5 agents) < 0.01ms
- [ ] `TMA-BENCH-02` — LWWRegister merge < 0.001ms
- [ ] `TMA-BENCH-03` — ORSet merge (100 elements) < 0.1ms
- [ ] `TMA-BENCH-04` — ORSet merge (1000 elements) < 1ms
- [ ] `TMA-BENCH-05` — MaxRegister merge < 0.001ms
- [ ] `TMA-BENCH-06` — VectorClock merge (20 agents) < 0.01ms
- [ ] `TMA-BENCH-07` — MemoryCRDT full merge < 0.5ms
- [ ] `TMA-BENCH-08` — Delta computation (50 changed fields) < 0.2ms
- [ ] `TMA-BENCH-09` — DAG CRDT merge (500 edges) < 5ms
- [ ] `TMA-BENCH-10` — DAG CRDT cycle detection (1K edges) < 10ms

#### Test File Creation

- [ ] `TMA-TEST-01` — Create `cortex-crdt/tests/crdt_test.rs` — all CRDT primitive unit tests
- [ ] `TMA-TEST-02` — Create `cortex-crdt/tests/memory_crdt_test.rs` — MemoryCRDT merge + delta tests
- [ ] `TMA-TEST-03` — Create `cortex-crdt/tests/dag_crdt_test.rs` — CausalGraphCRDT tests
- [ ] `TMA-TEST-04` — Create `cortex-crdt/tests/property_tests.rs` — entry point for proptest module
- [ ] `TMA-TEST-05` — Create `cortex-crdt/tests/property/mod.rs` — module declarations
- [ ] `TMA-TEST-06` — Create `cortex-crdt/tests/property/crdt_properties.rs` — all 19 property tests
- [ ] `TMA-TEST-07` — Create `cortex-crdt/tests/stress_test.rs` — high-volume merge tests
- [ ] `TMA-TEST-08` — Create `cortex-crdt/benches/crdt_bench.rs` — all 10 benchmark targets

### QG-MA0: CRDT Foundation Quality Gate

- [ ] All `TMA-CRDT-*` tests pass (31 unit tests)
- [ ] All `TMA-PROP-*` tests pass (19 property tests)
- [ ] All `TMA-STRESS-*` tests pass (3 stress tests)
- [ ] All `TMA-BENCH-*` benchmarks meet targets (10 benchmarks)
- [ ] `cargo check -p cortex-crdt` exits 0
- [ ] `cargo clippy -p cortex-crdt` — zero warnings
- [ ] `cargo test -p cortex-crdt` — zero failures
- [ ] `cargo test -p cortex-core` — zero regressions
- [ ] `cargo test --workspace` — zero regressions
- [ ] Coverage ≥80% for cortex-crdt primitives modules
- [ ] Coverage ≥80% for cortex-crdt memory modules
- [ ] Coverage ≥80% for cortex-crdt graph modules
- [ ] Coverage ≥80% for cortex-core models (agent, namespace, provenance, cross_agent)
- [ ] Benchmark baselines established and documented
- [ ] CRDT storage overhead analysis: 10K memories, 5 agents → < 10MB overhead

---

## Phase B: Storage + Namespaces + Projections (~20 new files, ~6 modified)

**Prerequisite:** QG-MA0 passed with ≥80% coverage on all Phase A modules.

### cortex-storage: Migration + Query Modules

#### Migration v015

- [ ] `PMB-STOR-01` — Create `cortex-storage/src/migrations/v015_multiagent_tables.rs` — CREATE TABLE agent_registry (agent_id PK, name, namespace, capabilities JSON, parent_agent, registered_at, last_active, status, created_at, updated_at) + 2 indexes (status, parent); memory_namespaces (namespace_id PK, scope, name, owner, created_at); namespace_permissions (namespace_id + agent_id composite PK, permissions JSON, granted_by, granted_at); memory_projections (projection_id PK, source_namespace, target_namespace, filter JSON, compression_level, live, created_at, created_by) + 2 indexes (source, target); provenance_log (hop_id PK, memory_id, agent_id, action, timestamp, confidence_delta, metadata JSON, hop_index) + 2 indexes (memory_id, agent_id); agent_trust (agent_id + target_agent composite PK, overall_trust, domain_trust JSON, evidence JSON, last_updated); delta_queue (delta_id PK, target_agent, delta JSON, created_at, applied, applied_at) + 2 indexes (target+applied, created_at); ALTER TABLE memories ADD COLUMN namespace_id DEFAULT 'agent://default/', ADD COLUMN source_agent DEFAULT 'default'; CREATE INDEX idx_memories_namespace ON memories(namespace_id); CREATE INDEX idx_memories_source_agent ON memories(source_agent)
  - **Logging**: Log migration start/complete at info level
  - **Error Handling**: Rollback on any error, clear error messages
  - **Validation**: Verify all tables and indexes created successfully
  - **Docs**: Document migration purpose and backward compatibility

- [ ] `PMB-STOR-02` — Modify `cortex-storage/src/migrations/mod.rs` — add `pub mod v015_multiagent_tables;` + register v015 in migration runner

#### Query Modules

- [ ] `PMB-STOR-03` — Create `cortex-storage/src/queries/multiagent_ops.rs` — Agent registry CRUD: insert_agent, get_agent, list_agents, update_agent_status, update_last_active, delete_agent; Namespace CRUD: insert_namespace, get_namespace, list_namespaces, delete_namespace; Permission CRUD: insert_permission, get_permissions, check_permission, delete_permission; Projection CRUD: insert_projection, get_projection, list_projections, delete_projection; Provenance: insert_provenance_hop, get_provenance_chain, get_provenance_origin; Trust: insert_trust, get_trust, update_trust, list_trust_for_agent; Delta queue: enqueue_delta, dequeue_deltas, mark_deltas_applied, pending_delta_count, purge_applied_deltas
  - **Raw SQL**: No business logic, just SQL operations
  - **Logging**: Log all DB operations at debug level
  - **Error Handling**: Return clear errors for constraint violations
  - **Metrics**: Instrument performance-critical queries
  - **Docs**: Document each function's SQL operation

- [ ] `PMB-STOR-04` — Modify `cortex-storage/src/queries/mod.rs` — add `pub mod multiagent_ops;`

- [ ] `PMB-STOR-05` — Modify `cortex-storage/src/queries/memory_crud.rs` — extend create_memory() to include namespace_id and source_agent columns; extend get_memory() to return namespace_id and source_agent; add get_memories_by_namespace(namespace_id), get_memories_by_agent(agent_id)
  - **Backward Compat**: Default values for existing memories
  - **Logging**: Log namespace/agent filtering at debug level
  - **Validation**: Validate namespace_id and source_agent are set

- [ ] `PMB-STOR-06` — Modify `cortex-storage/src/queries/memory_query.rs` — add optional `namespace_filter: Option<NamespaceId>` parameter to search queries; when Some, add WHERE namespace_id = ? clause; when None, search all namespaces
  - **Performance**: Use namespace index for filtered queries
  - **Logging**: Log namespace filter usage at debug level
  - **Docs**: Document backward compatibility (None = all namespaces)

### cortex-multiagent: New Crate — Multi-Agent Orchestration

#### Crate Setup

- [ ] `PMB-MA-01` — Create `cortex-multiagent/Cargo.toml` — package metadata, deps: cortex-core, cortex-crdt, cortex-storage, chrono, serde, serde_json, tokio, uuid, dashmap, thiserror, tracing, rusqlite; dev-deps: proptest, test-fixtures, tokio (test-util), tempfile
  - **Deps**: Minimal, well-justified dependencies
  - **Features**: Consider feature flags for optional functionality

- [ ] `PMB-MA-02` — Create `cortex-multiagent/src/lib.rs` — module declarations (engine, registry, namespace, projection, share, provenance, trust, sync, consolidation, validation), re-exports of public API
  - **Docs**: Crate-level documentation explaining multi-agent purpose
  - **Examples**: Include usage examples in crate docs

#### Engine

- [ ] `PMB-MA-03` — Create `cortex-multiagent/src/engine.rs` — MultiAgentEngine struct (writer: Arc<WriteConnection>, readers: Arc<ReadPool>, config: MultiAgentConfig), implements IMultiAgentEngine (Phase B: register_agent, deregister_agent, get_agent, list_agents, create_namespace, check_permission, share_memory, create_projection; other methods return not-yet-implemented error)
  - **Logging**: Log all engine operations at info level
  - **Error Handling**: Wrap all errors in MultiAgentError
  - **Metrics**: Instrument all public methods
  - **Docs**: Document engine lifecycle and method usage

#### Registry Module

- [ ] `PMB-MA-04` — Create `cortex-multiagent/src/registry/mod.rs` — module declarations + re-exports

- [ ] `PMB-MA-05` — Create `cortex-multiagent/src/registry/agent_registry.rs` — AgentRegistry struct, methods: register(writer, name, capabilities), deregister(writer, agent_id), get_agent(reader, agent_id), list_agents(reader, filter), update_last_active(writer, agent_id), mark_idle(writer, agent_id)
  - **Logging**: Log registration/deregistration at info level with agent_id
  - **Error Handling**: AgentAlreadyRegistered, AgentNotFound errors
  - **Validation**: Validate name non-empty, capabilities valid
  - **Docs**: Document agent lifecycle states
  - **Metrics**: Track active agent count

- [ ] `PMB-MA-06` — Create `cortex-multiagent/src/registry/spawn.rs` — spawn_agent(writer, reader, config), deregister_spawned(writer, reader, agent_id, auto_promote)
  - **Logging**: Log spawned agent creation with parent reference
  - **Trust Inheritance**: Apply trust_discount to parent trust scores
  - **Validation**: Validate parent_agent exists
  - **Docs**: Document spawned agent semantics and auto-promotion

#### Namespace Module

- [ ] `PMB-MA-07` — Create `cortex-multiagent/src/namespace/mod.rs` — module declarations + re-exports

- [ ] `PMB-MA-08` — Create `cortex-multiagent/src/namespace/manager.rs` — NamespaceManager struct, methods: create_namespace(writer, scope, owner), get_namespace(reader, id), list_namespaces(reader, scope_filter), delete_namespace(writer, id)
  - **Logging**: Log namespace creation/deletion at info level
  - **Error Handling**: NamespaceNotFound, InvalidNamespaceUri errors
  - **Validation**: Validate namespace URI format, scope is valid
  - **Default Permissions**: Grant based on scope (agent=all, team=read+write, project=read)
  - **Docs**: Document namespace scopes and default permissions

- [ ] `PMB-MA-09` — Create `cortex-multiagent/src/namespace/permissions.rs` — NamespacePermissionManager struct, methods: grant(writer, namespace_id, agent_id, permissions, granted_by), revoke(writer, namespace_id, agent_id, permissions), check(reader, namespace_id, agent_id, permission), get_acl(reader, namespace_id)
  - **Logging**: Log permission grants/revokes at info level
  - **Error Handling**: PermissionDenied error with clear context
  - **Validation**: Validate permission enum values
  - **Caching**: Consider DashMap cache for permission checks
  - **Docs**: Document permission model and inheritance

- [ ] `PMB-MA-10` — Create `cortex-multiagent/src/namespace/addressing.rs` — parse(uri), to_uri(namespace), is_agent(namespace), is_team(namespace), is_project(namespace), is_shared(namespace), default_namespace()
  - **Logging**: Log invalid URI parsing at warn level
  - **Error Handling**: InvalidNamespaceUri with clear message
  - **Validation**: Case-insensitive scope, case-preserving name
  - **Docs**: Document URI format and backward compatibility

#### Projection Module

- [ ] `PMB-MA-11` — Create `cortex-multiagent/src/projection/mod.rs` — module declarations + re-exports

- [ ] `PMB-MA-12` — Create `cortex-multiagent/src/projection/engine.rs` — ProjectionEngine struct, methods: create_projection(writer, projection), delete_projection(writer, id), get_projection(reader, id), list_projections(reader, namespace), evaluate_filter(memory, filter)
  - **Logging**: Log projection creation/deletion at info level
  - **Error Handling**: ProjectionNotFound, PermissionDenied errors
  - **Validation**: Validate source/target namespaces exist, creator has Share permission
  - **Filter Logic**: AND all filter conditions
  - **Docs**: Document projection semantics and filter evaluation

- [ ] `PMB-MA-13` — Create `cortex-multiagent/src/projection/subscription.rs` — SubscriptionManager struct, methods: subscribe(projection_id), unsubscribe(projection_id), push_delta(projection_id, delta), drain_queue(projection_id)
  - **Logging**: Log subscription lifecycle at debug level
  - **Error Handling**: ProjectionNotFound error
  - **Queue Management**: Bounded queue with overflow detection
  - **Metrics**: Track queue depth per projection
  - **Docs**: Document live projection semantics

- [ ] `PMB-MA-14` — Create `cortex-multiagent/src/projection/backpressure.rs` — BackpressureController struct, SubscriptionState struct, SyncMode enum, check_backpressure(state)
  - **Logging**: Log mode transitions at info level
  - **Thresholds**: Queue > 80% → Batched, < 50% → Streaming
  - **Docs**: Document backpressure strategy and mode transitions

- [ ] `PMB-MA-15` — Create `cortex-multiagent/src/projection/compression.rs` — compress_for_projection(memory, level)
  - **Delegation**: Delegates to cortex-compression L0-L3
  - **Logging**: Log compression level at debug level
  - **Docs**: Document compression levels and use cases

#### Share Module

- [ ] `PMB-MA-16` — Create `cortex-multiagent/src/share/mod.rs` — module declarations + re-exports

- [ ] `PMB-MA-17` — Create `cortex-multiagent/src/share/actions.rs` — share(writer, reader, memory_id, target_namespace, agent_id), promote(writer, reader, memory_id, target_namespace, agent_id), retract(writer, reader, memory_id, namespace, agent_id)
  - **Logging**: Log share/promote/retract at info level with memory_id and namespaces
  - **Error Handling**: PermissionDenied with clear context
  - **Permission Checks**: Validate before each action
  - **Provenance**: Record hop for each action
  - **Docs**: Document share vs promote semantics

### Phase B Tests (≥80% coverage target per module)

#### Registry Tests

- [ ] `TMB-REG-01` — Agent registration creates agent + namespace
- [ ] `TMB-REG-02` — Agent deregistration archives namespace, preserves provenance
- [ ] `TMB-REG-03` — Agent lifecycle transitions: Active → Idle → Deregistered
- [ ] `TMB-REG-04` — Spawned agent creation with parent reference
- [ ] `TMB-REG-05` — Spawned agent deregister with memory promotion
- [ ] `TMB-REG-06` — Agent status transitions validation (Deregistered → Active invalid)

#### Namespace Tests

- [ ] `TMB-NS-01` — Namespace creation for all 3 scopes (agent, team, project)
- [ ] `TMB-NS-02` — Permission grant/revoke/check round-trip
- [ ] `TMB-NS-03` — Default permissions per scope correct
- [ ] `TMB-NS-04` — NamespaceId parse + format round-trip
- [ ] `TMB-NS-05` — Default namespace backward compatibility (agent://default/)
- [ ] `TMB-NS-06` — Invalid namespace URI rejected with clear error
- [ ] `TMB-NS-07` — Permission denied error includes context

#### Projection Tests

- [ ] `TMB-PROJ-01` — Projection creation with filter
- [ ] `TMB-PROJ-02` — Filter evaluation: matching memory returns true
- [ ] `TMB-PROJ-03` — Filter evaluation: non-matching memory returns false
- [ ] `TMB-PROJ-04` — Filter evaluation: all conditions must match (AND logic)
- [ ] `TMB-PROJ-05` — Live projection subscription + delta push
- [ ] `TMB-PROJ-06` — Projection compression L0-L3 correct content reduction
- [ ] `TMB-PROJ-07` — Backpressure mode transition: queue > 80% → Batched
- [ ] `TMB-PROJ-08` — Backpressure recovery: queue < 50% → Streaming

#### Share Tests

- [ ] `TMB-SHARE-01` — Share copies memory with provenance hop
- [ ] `TMB-SHARE-02` — Promote moves memory, updates namespace field
- [ ] `TMB-SHARE-03` — Retract tombstones memory in target namespace
- [ ] `TMB-SHARE-04` — Permission denied on unauthorized share
- [ ] `TMB-SHARE-05` — Share preserves memory content and metadata

#### Storage Tests

- [ ] `TMB-STOR-01` — Migration v015 runs cleanly on fresh DB
- [ ] `TMB-STOR-02` — Migration v015 adds columns with correct defaults
- [ ] `TMB-STOR-03` — Namespace-aware memory queries filter correctly
- [ ] `TMB-STOR-04` — Agent-aware memory queries filter correctly
- [ ] `TMB-STOR-05` — All v015 tables and indexes created

#### Integration Tests

- [ ] `TMB-INT-01` — No existing test regressions: `cargo test --workspace` passes

#### Test File Creation

- [ ] `TMB-TEST-01` — Create `cortex-multiagent/tests/registry_test.rs`
- [ ] `TMB-TEST-02` — Create `cortex-multiagent/tests/namespace_test.rs`
- [ ] `TMB-TEST-03` — Create `cortex-multiagent/tests/projection_test.rs`

### QG-MA1: Storage + Namespaces + Projections Quality Gate

- [ ] All `TMB-*` tests pass (29 tests)
- [ ] `cargo check -p cortex-multiagent` exits 0
- [ ] `cargo clippy -p cortex-multiagent` — zero warnings
- [ ] `cargo test -p cortex-multiagent` — zero failures
- [ ] `cargo test -p cortex-storage` — zero failures
- [ ] `cargo test --workspace` — zero regressions
- [ ] Coverage ≥80% for cortex-multiagent registry modules
- [ ] Coverage ≥80% for cortex-multiagent namespace modules
- [ ] Coverage ≥80% for cortex-multiagent projection modules
- [ ] Coverage ≥80% for cortex-multiagent share modules
- [ ] Coverage ≥80% for cortex-storage multiagent_ops.rs
- [ ] Migration v015 tested on fresh DB and upgrade path

---

## Phase C: Delta Sync + Trust + Provenance (~25 new files, ~5 modified)

**Prerequisite:** QG-MA1 passed with ≥80% coverage on all Phase B modules.

### Provenance Module

- [ ] `PMC-MA-01` — Create `cortex-multiagent/src/provenance/mod.rs` — module declarations + re-exports

- [ ] `PMC-MA-02` — Create `cortex-multiagent/src/provenance/tracker.rs` — ProvenanceTracker struct, methods: record_hop(writer, memory_id, hop), get_provenance(reader, memory_id), get_chain(reader, memory_id), get_origin(reader, memory_id), chain_confidence(reader, memory_id)
  - **Logging**: Log provenance hops at debug level with memory_id and agent_id
  - **Error Handling**: Clear errors for missing provenance
  - **Validation**: Validate confidence_delta in [-1.0, 1.0]
  - **Chain Confidence**: Product of (1.0 + confidence_delta), clamped to [0.0, 1.0]
  - **Docs**: Document provenance chain semantics

- [ ] `PMC-MA-03` — Create `cortex-multiagent/src/provenance/correction.rs` — CorrectionPropagator struct, CorrectionResult struct, methods: propagate_correction(writer, reader, memory_id, correction), correction_strength(hop_distance)
  - **Logging**: Log correction propagation at info level with affected memories
  - **Dampening**: strength = base × 0.7^hop_distance
  - **Threshold**: Stop when strength < 0.05
  - **Docs**: Document dampening rationale and threshold

- [ ] `PMC-MA-04` — Create `cortex-multiagent/src/provenance/cross_agent.rs` — CrossAgentTracer struct, CrossAgentTrace struct, methods: trace_cross_agent(reader, memory_id, max_depth)
  - **Logging**: Log cross-agent traces at debug level
  - **Traversal**: Follow provenance across agent boundaries
  - **Confidence Chain**: Track confidence at each hop
  - **Docs**: Document cross-agent traversal semantics

### Trust Module

- [ ] `PMC-MA-05` — Create `cortex-multiagent/src/trust/mod.rs` — module declarations + re-exports

- [ ] `PMC-MA-06` — Create `cortex-multiagent/src/trust/scorer.rs` — TrustScorer struct, methods: get_trust(reader, agent_id, target_agent), compute_overall_trust(evidence), compute_domain_trust(domain, evidence), effective_confidence(memory_confidence, trust_score), update_trust(writer, agent_id, target_agent, trust)
  - **Logging**: Log trust computations at debug level
  - **Formula**: (validated + useful) / (total + 1) × (1 - contradicted / (total + 1))
  - **Bounds**: Clamp to [0.0, 1.0]
  - **Metrics**: Track trust score distribution
  - **Docs**: Document trust formula and rationale

- [ ] `PMC-MA-07` — Create `cortex-multiagent/src/trust/evidence.rs` — TrustEvidenceTracker struct, methods: record_validation(writer, agent_id, target_agent, memory_id), record_contradiction(writer, agent_id, target_agent, memory_id), record_usage(writer, agent_id, target_agent, memory_id), get_evidence(reader, agent_id, target_agent)
  - **Logging**: Log evidence recording at debug level
  - **Atomicity**: All evidence updates in transactions
  - **Docs**: Document evidence types and their impact

- [ ] `PMC-MA-08` — Create `cortex-multiagent/src/trust/decay.rs` — apply_trust_decay(trust, days_since_evidence, decay_rate)
  - **Formula**: trust + (0.5 - trust) × (1 - 0.99^days)
  - **Logging**: Log decay application at debug level
  - **Docs**: Document decay toward neutral (0.5) rationale

- [ ] `PMC-MA-09` — Create `cortex-multiagent/src/trust/bootstrap.rs` — bootstrap_trust(agent_id, target_agent), bootstrap_from_parent(parent_trust, discount)
  - **Default**: New agents start at 0.5
  - **Inheritance**: Spawned agents inherit parent × discount (0.8)
  - **Docs**: Document bootstrap semantics

### Sync Module

- [ ] `PMC-MA-10` — Create `cortex-multiagent/src/sync/mod.rs` — module declarations + re-exports

- [ ] `PMC-MA-11` — Create `cortex-multiagent/src/sync/protocol.rs` — DeltaSyncEngine struct, SyncRequest struct, SyncResponse struct, SyncAck struct, SyncResult struct, methods: initiate_sync(writer, reader, source_agent, target_agent), handle_sync_request(reader, request), acknowledge_sync(writer, ack)
  - **Logging**: Log sync operations at info level with agent IDs and delta counts
  - **Protocol**: Request → Response → Ack three-phase
  - **Error Handling**: SyncFailed with clear context
  - **Metrics**: Track sync latency and delta counts
  - **Docs**: Document sync protocol flow

- [ ] `PMC-MA-12` — Create `cortex-multiagent/src/sync/delta_queue.rs` — DeltaQueue struct, methods: enqueue(writer, delta, target_agent), dequeue(reader, target_agent, limit), mark_applied(writer, delta_ids), pending_count(reader, target_agent), purge_applied(writer, older_than)
  - **Logging**: Log queue operations at debug level
  - **Persistence**: Backed by delta_queue SQLite table
  - **Cleanup**: Purge old applied deltas
  - **Docs**: Document queue semantics

- [ ] `PMC-MA-13` — Create `cortex-multiagent/src/sync/causal_delivery.rs` — CausalDeliveryManager struct, methods: can_apply(delta, local_clock), buffer_delta(delta), drain_applicable(local_clock)
  - **Logging**: Log buffered deltas at debug level
  - **Causal Check**: Validate all predecessors applied
  - **Buffer**: In-memory buffer for out-of-order deltas
  - **Docs**: Document causal delivery guarantee

- [ ] `PMC-MA-14` — Create `cortex-multiagent/src/sync/cloud_integration.rs` — CloudSyncAdapter struct, SyncTransport enum, methods: sync_via_cloud(source_agent, target_agent), sync_via_local(source_agent, target_agent), detect_sync_mode(target_agent)
  - **Logging**: Log sync mode detection at debug level
  - **Transport**: Local (SQLite) vs Cloud (HTTP)
  - **Docs**: Document transport selection logic

### Phase C Tests (≥80% coverage target per module)

#### Provenance Tests

- [ ] `TMC-PROV-01` — Provenance hop recording and chain retrieval
- [ ] `TMC-PROV-02` — Chain confidence computation correct
- [ ] `TMC-PROV-03` — Correction propagation with dampening (0.7^hop)
- [ ] `TMC-PROV-04` — Correction stops at threshold (strength < 0.05)
- [ ] `TMC-PROV-05` — Cross-agent trace across 3 agents
- [ ] `TMC-PROV-06` — Provenance origin detection correct

#### Trust Tests

- [ ] `TMC-TRUST-01` — Trust bootstrap at 0.5 for new agents
- [ ] `TMC-TRUST-02` — Trust increase from validation (+0.05)
- [ ] `TMC-TRUST-03` — Trust decrease from contradiction (-0.10)
- [ ] `TMC-TRUST-04` — Domain-specific trust computation
- [ ] `TMC-TRUST-05` — Effective confidence modulation (memory × trust)
- [ ] `TMC-TRUST-06` — Trust decay toward neutral over time
- [ ] `TMC-TRUST-07` — Spawned agent trust inheritance with discount
- [ ] `TMC-TRUST-08` — Trust bounds [0.0, 1.0] maintained

#### Sync Tests

- [ ] `TMC-SYNC-01` — Delta sync protocol: request → response → ack
- [ ] `TMC-SYNC-02` — Causal delivery: in-order deltas applied immediately
- [ ] `TMC-SYNC-03` — Causal delivery: out-of-order deltas buffered
- [ ] `TMC-SYNC-04` — Causal delivery: drain after unblock
- [ ] `TMC-SYNC-05` — Delta queue: enqueue + dequeue round-trip
- [ ] `TMC-SYNC-06` — Delta queue: mark_applied excludes from dequeue
- [ ] `TMC-SYNC-07` — Cloud vs local sync mode detection
- [ ] `TMC-SYNC-08` — Sync convergence: both agents have identical state

#### Property Tests

- [ ] `TMC-PROP-01` — Property test: Trust bounds (0.0 ≤ trust ≤ 1.0)
- [ ] `TMC-PROP-02` — Property test: Trust decay monotonicity (always toward 0.5)
- [ ] `TMC-PROP-03` — Property test: Causal delivery correctness (same final state)
- [ ] `TMC-PROP-04` — Property test: Delta sync convergence
- [ ] `TMC-PROP-05` — Property test: Correction dampening monotonicity

#### Test File Creation

- [ ] `TMC-TEST-01` — Create `cortex-multiagent/tests/provenance_test.rs`
- [ ] `TMC-TEST-02` — Create `cortex-multiagent/tests/trust_test.rs`
- [ ] `TMC-TEST-03` — Create `cortex-multiagent/tests/sync_test.rs`

### QG-MA2: Delta Sync + Trust + Provenance Quality Gate

- [ ] All `TMC-*` tests pass (24 tests)
- [ ] `cargo test -p cortex-multiagent` — zero failures
- [ ] `cargo test --workspace` — zero regressions
- [ ] Coverage ≥80% for cortex-multiagent provenance modules
- [ ] Coverage ≥80% for cortex-multiagent trust modules
- [ ] Coverage ≥80% for cortex-multiagent sync modules

---

## Phase D: Cross-Crate Integration + NAPI + TypeScript (~15 new files, ~12 modified)

**Prerequisite:** QG-MA2 passed with ≥80% coverage on all Phase C modules.

### Phase D1: Cross-Crate Integration — Consolidation + Validation

#### Consolidation Module

- [ ] `PMD1-MA-01` — Create `cortex-multiagent/src/consolidation/mod.rs` — module declarations + re-exports

- [ ] `PMD1-MA-02` — Create `cortex-multiagent/src/consolidation/consensus.rs` — ConsensusDetector struct, ConsensusCandidate struct, methods: detect_consensus(reader, memories_by_namespace, embedding_engine, threshold)
  - **Logging**: Log consensus detection at info level with agent count
  - **Threshold**: Embedding similarity > 0.9, agent_count >= 2
  - **Confidence Boost**: +0.2 for consensus
  - **Docs**: Document consensus semantics and threshold rationale

- [ ] `PMD1-MA-03` — Create `cortex-multiagent/src/consolidation/cross_namespace.rs` — CrossNamespaceConsolidator struct, methods: consolidate_cross_namespace(writer, reader)
  - **Logging**: Log consolidation at info level with memory counts
  - **Pipeline**: Phase 0 (gather) → Phases 1-3 (HDBSCAN) → Phase 4 (consensus boost) → Phase 5 (pruning)
  - **Namespace**: Place consolidated memory in team/project namespace
  - **Docs**: Document cross-namespace consolidation pipeline

#### Validation Module

- [ ] `PMD1-MA-04` — Create `cortex-multiagent/src/validation/mod.rs` — module declarations + re-exports

- [ ] `PMD1-MA-05` — Create `cortex-multiagent/src/validation/cross_agent.rs` — CrossAgentValidator struct, methods: detect_contradictions(reader, namespace), resolve_contradiction(contradiction)
  - **Logging**: Log contradictions at warn level with agent IDs
  - **Resolution**: Trust diff > 0.3 → TrustWins; ≤ 0.3 → NeedsHumanReview
  - **Context**: Different scope tags → ContextDependent
  - **Temporal**: Newer + validated → TemporalSupersession
  - **Docs**: Document resolution strategy rationale

#### Existing Crate Modifications

- [ ] `PMD1-CAUSAL-01` — Modify `cortex-causal/src/relations.rs` — add `CrossAgent(CrossAgentRelation)` variant to CausalRelation enum
  - **Docs**: Document cross-agent relation semantics

- [ ] `PMD1-CAUSAL-02` — Modify `cortex-causal/src/graph/sync.rs` — extend CausalEdge with optional `source_agent: Option<AgentId>` field
  - **Backward Compat**: None for single-agent edges
  - **Docs**: Document source_agent usage

- [ ] `PMD1-CAUSAL-03` — Create `cortex-causal/src/graph/cross_agent.rs` — trace_cross_agent(memory_id, max_depth), cross_agent_narrative(trace)
  - **Logging**: Log cross-agent traversal at debug level
  - **Docs**: Document cross-agent causal semantics

- [ ] `PMD1-CAUSAL-04` — Modify `cortex-causal/src/graph/mod.rs` — add `pub mod cross_agent;`

- [ ] `PMD1-CONS-01` — Modify `cortex-consolidation/src/engine.rs` — when multi-agent enabled, extend consolidation to work across namespaces, delegate to cortex-multiagent
  - **Feature Flag**: Check MultiAgentConfig.enabled
  - **Logging**: Log cross-namespace consolidation at info level
  - **Docs**: Document multi-agent consolidation extension

- [ ] `PMD1-CONS-02` — Modify `cortex-consolidation/src/pipeline/phase6_pruning.rs` — preserve cross-agent provenance when archiving, place consolidated memory in team/project namespace
  - **Provenance**: Preserve all contributing agents
  - **Docs**: Document provenance preservation

- [ ] `PMD1-VALID-01` — Modify `cortex-validation/src/engine.rs` — when multi-agent enabled, extend contradiction detection across namespaces, delegate to cortex-multiagent, update trust evidence after validation
  - **Feature Flag**: Check MultiAgentConfig.enabled
  - **Trust Update**: Record validation/contradiction evidence
  - **Logging**: Log cross-agent validation at info level
  - **Docs**: Document multi-agent validation extension

- [ ] `PMD1-RET-01` — Modify `cortex-retrieval/src/ranking/scorer.rs` — when multi-agent enabled, add trust-weighted scoring factor, memories from higher-trust agents rank higher
  - **Weight**: Trust score modulates ranking
  - **Logging**: Log trust-weighted scoring at debug level
  - **Docs**: Document trust-weighted ranking

- [ ] `PMD1-RET-02` — Modify `cortex-retrieval/src/engine.rs` — add optional `namespace_filter: Option<NamespaceId>` to retrieval queries, respect projection compression levels
  - **Filter**: When Some, filter by namespace
  - **Compression**: Respect projection level when retrieving
  - **Docs**: Document namespace-aware retrieval

- [ ] `PMD1-CLOUD-01` — Modify `cortex-cloud/src/sync/protocol.rs` — extend sync request/response to include `agent_id: AgentId` field
  - **Backward Compat**: Default to AgentId::default_agent()
  - **Docs**: Document agent_id in sync protocol

- [ ] `PMD1-CLOUD-02` — Modify `cortex-cloud/src/conflict/resolver.rs` — when multi-agent enabled, use CRDT merge instead of LWW/local-wins/remote-wins
  - **Feature Flag**: Check MultiAgentConfig.enabled
  - **Fallback**: Existing strategies for single-agent
  - **Docs**: Document CRDT merge for multi-agent

- [ ] `PMD1-SESS-01` — Modify `cortex-session/src/context.rs` — add `agent_id: AgentId` field to SessionContext (default: AgentId::default_agent())
  - **Backward Compat**: Default agent for existing sessions
  - **Docs**: Document agent_id in session context

- [ ] `PMD1-SESS-02` — Modify `cortex-session/src/dedup.rs` — session dedup now per-agent within namespace, key changes from (session_id, content_hash) to (session_id, agent_id, namespace_id, content_hash)
  - **Dedup Key**: Include agent_id and namespace_id
  - **Docs**: Document multi-agent dedup semantics

### Phase D1 Tests (≥80% coverage on changed code)

#### Consolidation Tests

- [ ] `TMD1-CONS-01` — Consensus detection: 2 agents with similar memories → candidate found
- [ ] `TMD1-CONS-02` — Consensus detection: dissimilar memories → no candidate
- [ ] `TMD1-CONS-03` — Cross-namespace consolidation pipeline end-to-end
- [ ] `TMD1-CONS-04` — Confidence boost applied correctly (+0.2)

#### Validation Tests

- [ ] `TMD1-VALID-01` — Cross-agent contradiction detection
- [ ] `TMD1-VALID-02` — Trust-weighted resolution: high diff → TrustWins
- [ ] `TMD1-VALID-03` — Trust-weighted resolution: low diff → NeedsHumanReview
- [ ] `TMD1-VALID-04` — Context-dependent resolution
- [ ] `TMD1-VALID-05` — Temporal supersession resolution

#### Integration Tests

- [ ] `TMD1-INT-01` — Trust-weighted retrieval scoring works
- [ ] `TMD1-INT-02` — Namespace-aware retrieval filters correctly
- [ ] `TMD1-INT-03` — CRDT merge in cloud sync
- [ ] `TMD1-INT-04` — Session context includes agent_id
- [ ] `TMD1-INT-05` — Cross-agent causal traversal
- [ ] `TMD1-INT-06` — No retrieval test regressions
- [ ] `TMD1-INT-07` — No validation test regressions
- [ ] `TMD1-INT-08` — No consolidation test regressions
- [ ] `TMD1-INT-09` — No causal test regressions
- [ ] `TMD1-INT-10` — No cloud test regressions
- [ ] `TMD1-INT-11` — No session test regressions

#### Test File Creation

- [ ] `TMD1-TEST-01` — Create `cortex-multiagent/tests/consolidation_test.rs`
- [ ] `TMD1-TEST-02` — Create `cortex-multiagent/tests/validation_test.rs`

### QG-MA3a: Cross-Crate Integration Quality Gate

- [ ] All `TMD1-*` tests pass (20 tests)
- [ ] `cargo test -p cortex-multiagent` — zero failures
- [ ] `cargo test -p cortex-causal` — zero failures
- [ ] `cargo test -p cortex-consolidation` — zero failures
- [ ] `cargo test -p cortex-validation` — zero failures
- [ ] `cargo test -p cortex-retrieval` — zero failures
- [ ] `cargo test -p cortex-cloud` — zero failures
- [ ] `cargo test -p cortex-session` — zero failures
- [ ] `cargo test --workspace` — zero regressions
- [ ] Coverage ≥80% for cortex-multiagent consolidation modules
- [ ] Coverage ≥80% for cortex-multiagent validation modules
- [ ] Coverage ≥80% for all modified existing crate code

---

### Phase D2: NAPI Bindings + TypeScript Bridge

#### NAPI Bindings

- [ ] `PMD2-NAPI-01` — Create `cortex-napi/src/bindings/multiagent.rs` — 12 #[napi] functions: register_agent, deregister_agent, get_agent, list_agents, create_namespace, share_memory, create_projection, retract_memory, get_provenance, trace_cross_agent, get_trust, sync_agents
  - **Error Handling**: Convert Rust errors to NAPI errors with clear messages
  - **Logging**: Log NAPI calls at debug level
  - **Validation**: Validate all inputs before calling Rust
  - **Docs**: Document each function with TypeScript signature

- [ ] `PMD2-NAPI-02` — Create `cortex-napi/src/conversions/multiagent_types.rs` — NAPI-friendly types: NapiAgentRegistration, NapiProvenanceRecord, NapiProvenanceHop, NapiCrossAgentTrace, NapiAgentTrust, NapiSyncResult, NapiNamespaceACL; From/Into conversions
  - **Lossless**: Round-trip preserves all fields
  - **Docs**: Document conversion semantics

- [ ] `PMD2-NAPI-03` — Modify `cortex-napi/src/bindings/mod.rs` — add `pub mod multiagent;`

- [ ] `PMD2-NAPI-04` — Modify `cortex-napi/src/conversions/mod.rs` — add `pub mod multiagent_types;`

#### TypeScript Bridge

- [ ] `PMD2-TS-01` — Modify `packages/cortex/src/bridge/types.ts` — add TypeScript interfaces: AgentRegistration, AgentStatus, AgentId, NamespaceId, NamespaceScope, NamespacePermission, NamespaceACL, MemoryProjection, ProjectionFilter, ProvenanceRecord, ProvenanceHop, ProvenanceOrigin, ProvenanceAction, AgentTrust, TrustEvidence, CrossAgentContradiction, ContradictionResolution, CrossAgentTrace, SyncResult
  - **Type Safety**: Strict TypeScript types
  - **Docs**: JSDoc comments for all interfaces

- [ ] `PMD2-TS-02` — Modify `packages/cortex/src/bridge/client.ts` — add 12 multi-agent methods: registerAgent, deregisterAgent, getAgent, listAgents, createNamespace, shareMemory, createProjection, retractMemory, getProvenance, traceCrossAgent, getTrust, syncAgents
  - **Error Handling**: Wrap NAPI errors in TypeScript errors
  - **Validation**: Validate inputs before calling NAPI
  - **Docs**: JSDoc comments for all methods

### Phase D2 Tests

#### NAPI Tests

- [ ] `TMD2-NAPI-01` — NAPI register_agent round-trip: TS → Rust → TS
- [ ] `TMD2-NAPI-02` — NAPI share_memory round-trip
- [ ] `TMD2-NAPI-03` — NAPI get_provenance round-trip
- [ ] `TMD2-NAPI-04` — NAPI get_trust round-trip
- [ ] `TMD2-NAPI-05` — NAPI sync_agents round-trip
- [ ] `TMD2-NAPI-06` — All 12 NAPI functions compile: `cargo check -p cortex-napi` exits 0
- [ ] `TMD2-NAPI-07` — Type conversions lossless: Rust → NAPI → Rust preserves all fields

#### TypeScript Tests

- [ ] `TMD2-TS-01` — Modify `packages/cortex/tests/bridge.test.ts` — add test cases for all 12 multi-agent bridge methods
- [ ] `TMD2-TS-02` — Bridge test suite passes: `vitest run` in packages/cortex

### QG-MA3b: NAPI + TypeScript Quality Gate

- [ ] All `TMD2-*` tests pass (9 tests)
- [ ] `cargo check -p cortex-napi` exits 0
- [ ] `cargo clippy -p cortex-napi` — zero warnings
- [ ] Coverage ≥80% for cortex-napi bindings/multiagent.rs
- [ ] Coverage ≥80% for cortex-napi conversions/multiagent_types.rs
- [ ] `vitest run` in packages/cortex passes

---

### Phase D3: MCP Tools + CLI Commands

#### MCP Tools

- [ ] `PMD3-MCP-01` — Create `packages/cortex/src/tools/multiagent/drift_agent_register.ts` — MCP tool: register a new agent; input: name, capabilities; output: AgentRegistration
  - **Validation**: Validate name non-empty
  - **Error Handling**: Clear error messages
  - **Docs**: Tool description and examples

- [ ] `PMD3-MCP-02` — Create `packages/cortex/src/tools/multiagent/drift_agent_share.ts` — MCP tool: share memory to another namespace; input: memory_id, target_namespace, agent_id; output: success + provenance_hop
  - **Validation**: Validate namespace URI format
  - **Docs**: Tool description and examples

- [ ] `PMD3-MCP-03` — Create `packages/cortex/src/tools/multiagent/drift_agent_project.ts` — MCP tool: create a memory projection; input: source_namespace, target_namespace, filter, compression_level, live; output: projection_id
  - **Validation**: Validate filter structure
  - **Docs**: Tool description and examples

- [ ] `PMD3-MCP-04` — Create `packages/cortex/src/tools/multiagent/drift_agent_provenance.ts` — MCP tool: query provenance chain; input: memory_id, max_depth; output: provenance + cross_agent_trace
  - **Validation**: Validate max_depth > 0
  - **Docs**: Tool description and examples

- [ ] `PMD3-MCP-05` — Create `packages/cortex/src/tools/multiagent/drift_agent_trust.ts` — MCP tool: query trust scores; input: agent_id, target_agent (optional); output: trust scores
  - **Docs**: Tool description and examples

- [ ] `PMD3-MCP-06` — Modify `packages/cortex/src/tools/index.ts` — register all 5 new multi-agent tools

#### CLI Commands

- [ ] `PMD3-CLI-01` — Create `packages/cortex/src/cli/agents.ts` — `drift cortex agents` command; subcommands: list, register, deregister, info; options: --status, --capabilities
  - **Output**: Formatted table for list, JSON for info
  - **Error Handling**: Clear error messages
  - **Docs**: Command help text

- [ ] `PMD3-CLI-02` — Create `packages/cortex/src/cli/namespaces.ts` — `drift cortex namespaces` command; subcommands: list, create, permissions; options: --scope, --agent
  - **Output**: Formatted table for list
  - **Docs**: Command help text

- [ ] `PMD3-CLI-03` — Create `packages/cortex/src/cli/provenance.ts` — `drift cortex provenance <memory-id>` command; options: --depth, --format (text/json)
  - **Output**: Formatted chain for text, JSON for json
  - **Docs**: Command help text

- [ ] `PMD3-CLI-04` — Modify `packages/cortex/src/cli/index.ts` — register agents, namespaces, provenance commands

### Phase D3 Tests

#### MCP Tool Tests

- [ ] `TMD3-MCP-01` — MCP tool drift_agent_register works
- [ ] `TMD3-MCP-02` — MCP tool drift_agent_share works
- [ ] `TMD3-MCP-03` — MCP tool drift_agent_provenance works
- [ ] `TMD3-MCP-04` — MCP tool drift_agent_trust works

#### CLI Tests (Manual Verification)

- [ ] `TMD3-CLI-01` — CLI agents command runs: `drift cortex agents list`
- [ ] `TMD3-CLI-02` — CLI namespaces command runs: `drift cortex namespaces list`
- [ ] `TMD3-CLI-03` — CLI provenance command runs: `drift cortex provenance <id>`

### QG-MA3c: MCP Tools + CLI Quality Gate

- [ ] All `TMD3-*` tests pass (7 tests)
- [ ] All 5 MCP tools functional
- [ ] All 3 CLI commands functional
- [ ] TypeScript tests pass

---

## Golden Test Fixtures (Phase A-D)

### CRDT Merge Fixtures

- [ ] `PMF-GOLD-01` — Create `test-fixtures/golden/multiagent/crdt_merge_simple.json` — 2 agents, 1 memory, divergent tag edits, expected merged state
- [ ] `PMF-GOLD-02` — Create `test-fixtures/golden/multiagent/crdt_merge_conflict.json` — 2 agents, concurrent content edits (LWW), expected winner by timestamp
- [ ] `PMF-GOLD-03` — Create `test-fixtures/golden/multiagent/crdt_merge_confidence.json` — 3 agents, confidence boosts via MaxRegister, expected max value

### Namespace Permission Fixtures

- [ ] `PMF-GOLD-04` — Create `test-fixtures/golden/multiagent/namespace_permissions.json` — agent, team, project namespaces with various grants, expected access results
- [ ] `PMF-GOLD-05` — Create `test-fixtures/golden/multiagent/namespace_default_compat.json` — single-agent with default namespace, expected identical behavior to v1

### Provenance Chain Fixtures

- [ ] `PMF-GOLD-06` — Create `test-fixtures/golden/multiagent/provenance_chain.json` — 3-agent chain (create → share → refine), expected chain + confidence
- [ ] `PMF-GOLD-07` — Create `test-fixtures/golden/multiagent/provenance_correction.json` — correction at depth 0, expected dampened propagation at depths 1-3

### Trust Scoring Fixtures

- [ ] `PMF-GOLD-08` — Create `test-fixtures/golden/multiagent/trust_scoring.json` — agent with known evidence (5 validated, 1 contradicted, 3 useful, 10 total), expected trust values
- [ ] `PMF-GOLD-09` — Create `test-fixtures/golden/multiagent/trust_decay.json` — trust score after 50 days and 100 days without evidence, expected decayed values

### Consensus Detection Fixture

- [ ] `PMF-GOLD-10` — Create `test-fixtures/golden/multiagent/consensus_detection.json` — 3 agents with similar memories about same topic, expected consensus candidate

### Test Entry Points

- [ ] `PMF-TEST-01` — Create `cortex-multiagent/tests/coverage_test.rs` — public API surface coverage
- [ ] `PMF-TEST-02` — Create `cortex-multiagent/tests/golden_test.rs` — golden fixture validation
- [ ] `PMF-TEST-03` — Create `cortex-multiagent/tests/stress_test.rs` — high-volume + concurrent tests (5 agents, 10K memories, full sync cycle < 30s; concurrent delta application from 3 agents; projection with 1K matching memories; trust computation with 10K evidence records)

---

## QG-MA4: Final Integration Quality Gate

**Prerequisite:** QG-MA3c passed. All phases A through D3 complete.

### End-to-End Integration Tests

- [ ] `TMA-INT-01` — Full agent lifecycle: register → create memories → share → sync → deregister → memories preserved
- [ ] `TMA-INT-02` — CRDT convergence end-to-end: 3 agents, divergent edits → sync → all agents have identical state
- [ ] `TMA-INT-03` — Namespace isolation: Agent A's private memories invisible to Agent B without projection
- [ ] `TMA-INT-04` — Projection filtering: create projection with filter → only matching memories visible to target
- [ ] `TMA-INT-05` — Provenance chain end-to-end: create → share → refine → trace → full chain with correct confidence
- [ ] `TMA-INT-06` — Correction propagation end-to-end: correct memory → propagation through 3-hop chain → dampened correctly
- [ ] `TMA-INT-07` — Trust scoring end-to-end: share memories → validate some → contradict some → trust scores correct
- [ ] `TMA-INT-08` — Trust-weighted retrieval: higher-trust agent's memory ranks above lower-trust agent's memory
- [ ] `TMA-INT-09` — Cross-agent contradiction detection: two agents contradict → detected → resolved by trust
- [ ] `TMA-INT-10` — Consensus detection end-to-end: 3 agents independently learn same thing → consensus detected → confidence boosted
- [ ] `TMA-INT-11` — Delta sync with causal delivery: out-of-order deltas → buffered → applied in correct order → convergence
- [ ] `TMA-INT-12` — Cloud sync with CRDT merge: remote agents sync via cloud → CRDT merge → convergence
- [ ] `TMA-INT-13` — Backward compatibility: single-agent mode → all existing tests pass unchanged
- [ ] `TMA-INT-14` — NAPI round-trip all 12 functions: TypeScript → Rust → TypeScript for every multi-agent function
- [ ] `TMA-INT-15` — MCP tools all 5 functional: each MCP tool returns valid response
- [ ] `TMA-INT-16` — CLI commands all 3 functional: each CLI command produces output

### Final Checks

- [ ] `TMA-FINAL-01` — `cargo test --workspace` passes with zero failures
- [ ] `TMA-FINAL-02` — `cargo tarpaulin -p cortex-crdt --ignore-tests` reports ≥80% overall coverage
- [ ] `TMA-FINAL-03` — `cargo tarpaulin -p cortex-multiagent --ignore-tests` reports ≥80% overall coverage
- [ ] `TMA-FINAL-04` — `cargo bench -p cortex-crdt` — all 10 benchmarks within target
- [ ] `TMA-FINAL-05` — `cargo clippy -p cortex-crdt` — zero warnings
- [ ] `TMA-FINAL-06` — `cargo clippy -p cortex-multiagent` — zero warnings
- [ ] `TMA-FINAL-07` — `cargo clippy --workspace` — zero new warnings from multi-agent changes
- [ ] `TMA-FINAL-08` — CRDT storage overhead within bounds: 10K memories, 5 agents → total CRDT overhead < 10MB
- [ ] `TMA-FINAL-09` — `vitest run` in packages/cortex — all tests pass including multi-agent
- [ ] `TMA-FINAL-10` — All golden fixtures validate correctly
- [ ] `TMA-FINAL-11` — Stress tests pass: 5 agents, 10K memories, full sync < 30s
- [ ] `TMA-FINAL-12` — No memory leaks in long-running sync operations
- [ ] `TMA-FINAL-13` — Observability: all critical paths instrumented with tracing
- [ ] `TMA-FINAL-14` — Error messages are clear and actionable
- [ ] `TMA-FINAL-15` — Documentation complete for all public APIs

---

## Progress Summary

| Phase | Impl Tasks | Test Tasks | Golden Fixtures | Status |
|-------|------------|------------|-----------------|--------|
| A: CRDT Foundation + Core Types | 0/35 | 0/31 | — | ⬜ Not Started |
| B: Storage + Namespaces + Projections | 0/17 | 0/29 | — | ⬜ Not Started |
| C: Delta Sync + Trust + Provenance | 0/14 | 0/24 | — | ⬜ Not Started |
| D1: Cross-Crate Integration | 0/18 | 0/20 | — | ⬜ Not Started |
| D2: NAPI + TypeScript Bridge | 0/6 | 0/9 | — | ⬜ Not Started |
| D3: MCP Tools + CLI | 0/10 | 0/7 | — | ⬜ Not Started |
| Golden Fixtures + Test Files | 0/13 | — | 0/10 | ⬜ Not Started |
| Quality Gates (QG-MA0 → QG-MA4) | 0/7 | 0/31 | — | ⬜ Not Started |
| **TOTAL** | **0/120** | **0/151** | **0/10** | ⬜ **Not Started** |

---

## Enterprise Monitoring & Observability Checklist

### Logging Requirements (All Phases)

- [ ] All agent operations logged at appropriate levels (info for lifecycle, debug for operations)
- [ ] All permission checks logged with agent_id, namespace_id, and permission
- [ ] All CRDT merge operations logged with memory_id and agent_id
- [ ] All sync operations logged with source/target agents and delta counts
- [ ] All trust score updates logged with evidence type and impact
- [ ] All provenance hops logged with action and confidence_delta
- [ ] Error logs include full context (IDs, operation, state)

### Metrics Requirements (All Phases)

- [ ] Active agent count gauge
- [ ] Namespace count by scope (agent/team/project)
- [ ] Projection count and queue depth per projection
- [ ] Delta queue depth per target agent
- [ ] Sync operation latency histogram
- [ ] CRDT merge operation latency histogram
- [ ] Trust score distribution histogram
- [ ] Provenance chain length histogram
- [ ] Permission check latency histogram
- [ ] Consensus detection rate counter

### Error Handling Requirements (All Phases)

- [ ] All errors use CortexResult<T> with specific error variants
- [ ] All error messages include relevant IDs for debugging
- [ ] All error messages are actionable (tell user what to do)
- [ ] All database errors wrapped with context
- [ ] All permission errors include agent, namespace, and permission
- [ ] All sync errors include source/target agents and failure reason
- [ ] All CRDT errors include memory_id and operation

### Performance Requirements (All Phases)

- [ ] Permission checks < 0.01ms (cached)
- [ ] CRDT merge < 0.5ms per memory
- [ ] Delta sync < 50ms for 100 deltas
- [ ] Trust computation < 0.01ms per agent pair
- [ ] Provenance chain retrieval < 10ms for 10-hop chain
- [ ] Namespace filtering uses indexes (no table scans)
- [ ] Projection filter evaluation < 0.05ms per memory

### Security Requirements (All Phases)

- [ ] All namespace operations check permissions before execution
- [ ] All share/promote/retract operations validate agent has required permission
- [ ] All projection creation validates creator has Share permission on source
- [ ] All sync operations validate agent identity
- [ ] All trust scores bounded to [0.0, 1.0]
- [ ] All namespace URIs validated before use
- [ ] SQL injection prevented (parameterized queries only)

---

## Implementation Notes

### Critical Path Items

1. **Phase A CRDT Foundation** — Must be rock-solid. All property tests must pass. This is the mathematical foundation.
2. **Phase B Storage Migration** — Must be backward compatible. Test upgrade path from existing DB.
3. **Phase C Delta Sync** — Causal delivery is critical. Out-of-order deltas must be buffered correctly.
4. **Phase D1 Integration** — Feature flags must work. Single-agent mode must be unaffected.

### Common Pitfalls to Avoid

- **CRDT Merge**: Don't forget to update VectorClock after merge
- **Permission Checks**: Always check before operations, not after
- **Namespace URIs**: Case-insensitive scope, case-preserving name
- **Trust Scores**: Always clamp to [0.0, 1.0] after computation
- **Provenance**: Append-only, never modify existing hops
- **Delta Queue**: Mark applied before removing from queue
- **Causal Delivery**: Check happens_before, not just clock equality

### Testing Strategy

- **Unit Tests**: Test each module in isolation
- **Integration Tests**: Test cross-module interactions
- **Property Tests**: Test CRDT mathematical properties
- **Stress Tests**: Test at scale (10K memories, 5 agents)
- **Golden Tests**: Test against known-good fixtures
- **Regression Tests**: Ensure existing tests still pass

### Performance Optimization Opportunities

- **Permission Caching**: DashMap cache for frequently checked permissions
- **Namespace Index**: Use indexes for namespace filtering
- **Delta Batching**: Batch delta application for better throughput
- **Trust Caching**: Cache trust scores with TTL
- **Provenance Caching**: Cache recent provenance chains

---

## Completion Criteria

This implementation is complete when:

1. ✅ All 120 implementation tasks completed
2. ✅ All 151 test tasks pass
3. ✅ All 10 golden fixtures validate
4. ✅ All 7 quality gates pass
5. ✅ Coverage ≥80% for cortex-crdt and cortex-multiagent
6. ✅ All benchmarks meet targets
7. ✅ Zero clippy warnings
8. ✅ Zero test regressions in workspace
9. ✅ All enterprise requirements met (logging, metrics, errors, performance, security)
10. ✅ Documentation complete for all public APIs

**Estimated Timeline:** 5-7 weeks for a senior engineer working full-time.

**Success Metric:** Multi-agent memory system enables multiple AI agents to share, sync, and collaborate on knowledge with provenance tracking, trust scoring, and conflict-free convergence.

