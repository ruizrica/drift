# Cortex V2 Overview

Cortex V2 is Drift's intelligent memory system — a living knowledge base that learns from your codebase and interactions to provide contextual guidance during development.

---

## ⚡ Quick Start (30 Seconds)

```bash
# Initialize memory system
drift memory init

# Add institutional knowledge
drift memory add tribal "Always use bcrypt for passwords" --importance critical

# Get context for a task
drift memory why "authentication"

# Check system health
drift memory health
```

---

## 📋 Technical Overview

Cortex V2 replaces static `AGENTS.md` files with a dynamic memory system that:

1. **Learns continuously** — Extracts knowledge from corrections and feedback
2. **Decays naturally** — Unused memories lose confidence over time
3. **Retrieves intelligently** — Returns context based on intent and focus
4. **Validates automatically** — Identifies stale or conflicting memories
5. **Compresses efficiently** — Minimizes token usage with hierarchical compression

### Why Replace AGENTS.md?

| Static AGENTS.md | Cortex Memory |
|------------------|---------------|
| Written once, forgotten | Learns continuously from corrections |
| Gets stale immediately | Confidence decays on unused memories |
| Manual updates required | Self-correcting through feedback |
| One-size-fits-all dump | Intent-aware retrieval |
| No way to know if accurate | Validation and health monitoring |
| Clutters your repo | Stored in `.drift/memory/` |

### Migration from AGENTS.md

```bash
# 1. Initialize Cortex
drift memory init

# 2. Add your key knowledge
drift memory add tribal "Always use bcrypt for passwords" --importance critical
drift memory add tribal "Services should not call controllers directly" --topic Architecture
drift memory add procedural "Deploy: 1) Run tests 2) Build 3) Push to main" --topic Deployment

# 3. Delete your AGENTS.md
rm AGENTS.md  # 🎉

# 4. AI now gets context dynamically
drift memory why "authentication"
```

---

## 🧠 Memory Types

Cortex supports 9 memory types, each with different decay characteristics:

| Type | Icon | Description | Half-Life | Use Case |
|------|------|-------------|-----------|----------|
| `core` | 🏠 | Project identity | ∞ (never) | Project name, tech stack |
| `tribal` | ⚠️ | Institutional knowledge | 365 days | "Never use MD5", gotchas |
| `procedural` | 📋 | How-to knowledge | 180 days | Deploy process, checklists |
| `semantic` | 💡 | Consolidated knowledge | 90 days | Auto-generated summaries |
| `episodic` | 💭 | Interaction records | 7 days | Raw material for consolidation |
| `pattern_rationale` | 🎯 | Why patterns exist | 180 days | "Repository pattern for testability" |
| `constraint_override` | ✅ | Approved exceptions | 90 days | "Allow direct DB in migrations" |
| `decision_context` | 📝 | Architectural decisions | 180 days | "Chose PostgreSQL for ACID" |
| `code_smell` | 🚫 | Anti-patterns | 90 days | "Avoid any type in TypeScript" |

### Half-Life Decay

Confidence decays exponentially based on age:

```
effective_confidence = base_confidence × 2^(-age_days / half_life)
```

**Example:** A tribal memory with 100% confidence after 365 days has ~50% effective confidence.

Usage boosts confidence — frequently accessed memories decay slower.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cortex V2                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │   Retrieval     │  │    Learning     │  │   Generation     │ │
│  │  Orchestrator   │  │  Orchestrator   │  │  Orchestrator    │ │
│  │                 │  │                 │  │                  │ │
│  │ • Intent-aware  │  │ • Correction    │  │ • Code context   │ │
│  │ • Compression   │  │   extraction    │  │ • Provenance     │ │
│  │ • Ranking       │  │ • Fact mining   │  │ • Validation     │ │
│  │ • Deduplication │  │ • Confidence    │  │ • Feedback       │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘ │
│           │                    │                     │           │
│  ┌────────┴────────────────────┴─────────────────────┴─────────┐ │
│  │                      Core Services                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │ │
│  │  │ Storage  │  │  Causal  │  │  Decay   │  │ Consolidation│ │ │
│  │  │ (SQLite) │  │  Graph   │  │Calculator│  │    Engine    │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │ │
│  │  │Embedding │  │ Session  │  │Prediction│  │  Validation  │ │ │
│  │  │ Provider │  │ Context  │  │  Cache   │  │    Engine    │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SQLite Storage Backend                         │
│                  .drift/memory/cortex.db                         │
│                                                                  │
│  Tables: memories, causal_links, embeddings, sessions,           │
│          predictions, validation_history, consolidation_log      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Retrieval Orchestrator** | Intent-aware memory retrieval with compression and ranking |
| **Learning Orchestrator** | Extracts knowledge from corrections and feedback |
| **Generation Orchestrator** | Provides context for code generation with provenance |
| **Storage** | SQLite-based persistence with full-text search |
| **Causal Graph** | Tracks relationships between memories (derived_from, supersedes, etc.) |
| **Decay Calculator** | Computes effective confidence based on age and usage |
| **Consolidation Engine** | Merges episodic memories into semantic knowledge |
| **Embedding Provider** | Generates embeddings for semantic search (local or OpenAI) |
| **Session Context** | Tracks what's been sent to avoid duplication |
| **Prediction Cache** | Pre-fetches likely-needed memories |
| **Validation Engine** | Identifies stale, conflicting, or invalid memories |

---

## 🎯 Key Features

### 1. Causal Memory Graph

Memories are linked with causal relationships:

```
┌─────────────────┐     derived_from     ┌─────────────────┐
│ Security Audit  │ ──────────────────▶  │ Use bcrypt for  │
│ (2024-01)       │                      │ passwords       │
└─────────────────┘                      └─────────────────┘
                                                │
                                                │ supersedes
                                                ▼
                                         ┌─────────────────┐
                                         │ Use MD5 for     │
                                         │ passwords       │
                                         └─────────────────┘
```

**Relationship types:**
- `derived_from` — Memory was created based on another
- `supersedes` — Memory replaces an older one
- `supports` — Memory provides evidence for another
- `contradicts` — Memory conflicts with another
- `related_to` — General relationship

### 2. Intent-Aware Retrieval

Retrieval adapts based on what you're trying to do:

| Intent | Prioritizes |
|--------|-------------|
| `add_feature` | Pattern rationales, procedural knowledge |
| `fix_bug` | Code smells, tribal knowledge, error patterns |
| `refactor` | Structural patterns, coupling analysis |
| `security_audit` | Security patterns, constraint overrides |
| `understand_code` | Decision context, pattern rationales |
| `add_test` | Test patterns, coverage requirements |

### 3. Active Learning

Cortex learns from corrections automatically:

```bash
# AI suggests using MD5
# You correct it
drift memory learn \
  --original "Use MD5 for hashing" \
  --feedback "MD5 is insecure. Use bcrypt instead."

# Cortex creates:
# 1. New tribal memory: "Use bcrypt, not MD5"
# 2. Code smell memory: "MD5 is insecure"
# 3. Causal link: correction → new memories
```

### 4. Token Efficiency

Hierarchical compression minimizes token usage:

| Level | Description | Tokens |
|-------|-------------|--------|
| 0 | IDs only | ~50 |
| 1 | One-line summaries | ~200 |
| 2 | With examples | ~500 |
| 3 | Full detail | ~1000+ |

Session-based deduplication prevents sending the same memory twice.

### 5. Automatic Consolidation

Episodic memories (7-day half-life) are automatically consolidated:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Episodic: Fixed │     │ Episodic: Fixed │     │ Episodic: Fixed │
│ auth bug #123   │     │ auth bug #456   │     │ auth bug #789   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼ consolidation
                    ┌─────────────────────────┐
                    │ Semantic: Auth bugs     │
                    │ often caused by token   │
                    │ validation issues       │
                    └─────────────────────────┘
```

---

## 💻 CLI Commands

```bash
# Initialize
drift memory init

# Add memories
drift memory add tribal "Always use bcrypt" --importance critical
drift memory add procedural "Deploy: 1) Test 2) Build 3) Push"

# Query
drift memory list
drift memory search "authentication"
drift memory why "user registration" --intent add_feature

# Feedback
drift memory feedback <id> confirm
drift memory feedback <id> reject --details "Outdated"

# Maintenance
drift memory validate --scope stale
drift memory consolidate
drift memory health

# Export/Import
drift memory export backup.json
drift memory import backup.json
```

→ [Full Memory CLI Reference](Memory-CLI)

---

## 🤖 MCP Tools

Cortex V2 exposes 14 MCP tools for AI agents:

| Tool | Description |
|------|-------------|
| `drift_why` | Get causal narrative explaining WHY something exists |
| `drift_memory_status` | Health overview with recommendations |
| `drift_memory_for_context` | Get memories for current context with compression |
| `drift_memory_search` | Semantic search with session deduplication |
| `drift_memory_add` | Add memory with automatic causal inference |
| `drift_memory_learn` | Learn from corrections (full pipeline) |
| `drift_memory_feedback` | Confirm, reject, or modify memories |
| `drift_memory_health` | Comprehensive health report |
| `drift_memory_explain` | Get causal explanation for a memory |
| `drift_memory_predict` | Get predicted memories for context |
| `drift_memory_conflicts` | Detect conflicting memories |
| `drift_memory_graph` | Visualize memory relationships |
| `drift_memory_validate` | Validate memories and get healing suggestions |
| `drift_memory_get` | Get memory with optional causal chain |

→ [Full MCP Tools Reference](MCP-Tools-Reference)

---

## 📊 Programmatic API

### TypeScript/JavaScript

```typescript
import { getCortex } from 'driftdetect-cortex';

// Get Cortex instance
const cortex = await getCortex();

// Get context for a task
const context = await cortex.retrieval.retrieve({
  intent: 'add_feature',
  focus: 'authentication',
  maxTokens: 2000,
});

// Learn from a correction
await cortex.learning.learnFromCorrection({
  original: 'Use MD5 for hashing',
  correction: 'MD5 is insecure. Use bcrypt.',
  correctCode: 'const hash = await bcrypt.hash(password, 10);',
  context: { activeFile: 'src/auth.ts', intent: 'fix_bug' }
});

// Get "why" explanation
const why = await cortex.why.getWhy({
  intent: 'understand_code',
  focus: 'authentication',
  maxDepth: 3
});
console.log(why.narrative);
// "Authentication uses JWT because of the decision to support 
//  stateless API design. This led to the middleware-auth pattern..."

// Add a memory
await cortex.storage.add({
  type: 'tribal',
  summary: 'Always use bcrypt for passwords',
  knowledge: { topic: 'Security', severity: 'critical' },
  importance: 'high'
});

// Search memories
const results = await cortex.storage.search({
  query: 'password hashing',
  types: ['tribal', 'pattern_rationale'],
  minConfidence: 0.5,
  limit: 10
});

// Validate memories
const validation = await cortex.validation.validate({
  scope: 'stale',
  autoHeal: true
});

// Consolidate episodic memories
const consolidation = await cortex.consolidation.consolidate();
```

### Configuration

```typescript
import { getCortex } from 'driftdetect-cortex';

const cortex = await getCortex({
  storage: {
    type: 'sqlite',
    sqlitePath: '.drift/memory/cortex.db'
  },
  embeddings: {
    type: 'local',  // or 'openai', 'ollama', 'hybrid'
    model: 'all-MiniLM-L6-v2'
  },
  consolidation: {
    minEpisodes: 3,
    similarityThreshold: 0.8
  },
  scheduler: {
    consolidationInterval: 3600000,  // 1 hour
    validationInterval: 86400000     // 24 hours
  }
});
```

---

## 🔧 Embedding Providers

Cortex supports multiple embedding providers:

| Provider | Description | Configuration |
|----------|-------------|---------------|
| `local` | Transformers.js (default) | No API key needed |
| `openai` | OpenAI embeddings | Requires `OPENAI_API_KEY` |
| `ollama` | Local Ollama server | Requires Ollama running |
| `hybrid` | Local + fallback to OpenAI | Best of both worlds |

```bash
# Use local embeddings (default)
drift memory init

# Use OpenAI embeddings
OPENAI_API_KEY=sk-... drift memory init

# Use Ollama
OLLAMA_HOST=http://localhost:11434 drift memory init
```

---

## 📈 Health Monitoring

Check memory system health:

```bash
drift memory health
```

**Output:**

```
🏥 Memory Health Report
══════════════════════════════════════════════════════════════

📊 Overall Health
──────────────────────────────────────────────────────────────
  Score: 85/100 (healthy)

📈 Statistics
──────────────────────────────────────────────────────────────
  Total Memories:      47
  Avg Confidence:      85%
  Low Confidence:      3
  Recently Accessed:   12

⚠️  Issues
──────────────────────────────────────────────────────────────
  ● 3 memories have low confidence
    → Review and validate these memories

💡 Recommendations
──────────────────────────────────────────────────────────────
  • Run `drift memory validate` to clean up low-confidence memories
  • Use `drift memory feedback` to confirm accurate memories
```

---

## 🔄 Typical Workflows

### Daily Development

```bash
# Get context before starting work
drift memory why "feature area" --intent add_feature

# After code review, learn from feedback
drift memory learn --original "..." --feedback "..."
```

### Weekly Maintenance

```bash
# Check health
drift memory health

# Validate stale memories
drift memory validate --scope stale

# Consolidate episodic memories
drift memory consolidate

# Export backup
drift memory export backup-$(date +%Y%m%d).json
```

### Onboarding

```bash
# Show team knowledge
drift memory list --type tribal --importance high

# Show active warnings
drift memory warnings

# Get context for a feature area
drift memory why "authentication"
```

---

## 🔗 Related Documentation

- [Memory CLI Reference](Memory-CLI) — Full CLI command reference
- [Cortex Learning System](Cortex-Learning-System) — How Cortex learns from corrections
- [Cortex Token Efficiency](Cortex-Token-Efficiency) — Compression and deduplication
- [Cortex Causal Graphs](Cortex-Causal-Graphs) — Memory relationships and "why" explanations
- [Cortex Code Generation](Cortex-Code-Generation) — Context for AI code generation
- [Cortex Predictive Retrieval](Cortex-Predictive-Retrieval) — Anticipating memory needs
- [MCP Tools Reference](MCP-Tools-Reference) — All MCP memory tools
