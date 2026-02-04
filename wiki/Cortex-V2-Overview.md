# Cortex V2 Overview

Cortex V2 is Drift's intelligent memory system — a living knowledge base that learns from your codebase and interactions to provide contextual guidance during development.

---

## ⚡ Quick Start (30 Seconds)

```bash
# Run the interactive setup wizard (recommended)
drift memory setup

# Or initialize manually
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
6. **Detects contradictions** — Identifies and resolves conflicting information
7. **Tracks causality** — Understands "why" decisions were made

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
# 1. Run the setup wizard
drift memory setup

# 2. Or add knowledge manually
drift memory add tribal "Always use bcrypt for passwords" --importance critical
drift memory add tribal "Services should not call controllers directly" --topic Architecture

# 3. Delete your AGENTS.md
rm AGENTS.md  # 🎉

# 4. AI now gets context dynamically
drift memory why "authentication"
```

---

## 🧠 Memory Types (23 Total)

Cortex V2 supports **23 memory types** across three categories:

### Domain-Agnostic Types (9)

| Type | Icon | Half-Life | Purpose |
|------|------|-----------|---------|
| `core` | 🏠 | ∞ (never) | Project identity, preferences, critical constraints |
| `tribal` | ⚠️ | 365 days | Institutional knowledge, gotchas, warnings |
| `procedural` | 📋 | 180 days | How-to knowledge, step-by-step procedures |
| `semantic` | 💡 | 90 days | Consolidated knowledge from episodic memories |
| `episodic` | 💭 | 7 days | Raw interaction records (auto-consolidated) |
| `decision` | ⚖️ | 180 days | Standalone decisions with context |
| `insight` | 💎 | 90 days | Learned observations and discoveries |
| `reference` | 📚 | 60 days | External references and documentation |
| `preference` | ⭐ | 120 days | User/team preferences |

### Code-Specific Types (4)

| Type | Icon | Half-Life | Purpose |
|------|------|-----------|---------|
| `pattern_rationale` | 🎯 | 180 days | Why patterns exist in the codebase |
| `constraint_override` | ✅ | 90 days | Approved exceptions to constraints |
| `decision_context` | 📝 | 180 days | Human context for architectural decisions |
| `code_smell` | 🚫 | 90 days | Anti-patterns to avoid |

### Universal Memory Types (10) — NEW in V2

| Type | Icon | Half-Life | Purpose |
|------|------|-----------|---------|
| `agent_spawn` | 🤖 | 365 days | Reusable agent configurations |
| `entity` | 📦 | 180 days | Projects, products, teams, systems |
| `goal` | 🎯 | 90 days | Objectives with progress tracking |
| `feedback` | 📝 | 120 days | Corrections and learning signals |
| `workflow` | 📋 | 180 days | Step-by-step processes |
| `conversation` | 💬 | 30 days | Summarized past discussions |
| `incident` | 🚨 | 365 days | Postmortems and lessons learned |
| `meeting` | 📅 | 60 days | Meeting notes and action items |
| `skill` | 🧠 | 180 days | Knowledge domains and proficiency |
| `environment` | 🌍 | 90 days | Environment configurations |

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
┌─────────────────────────────────────────────────────────────────────┐
│                         CORTEX V2                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Storage    │  │ Embeddings  │  │  Retrieval  │  │Consolidation│ │
│  │  (SQLite)   │  │ (Local/API) │  │   Engine    │  │   Engine    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Validation  │  │   Decay     │  │Contradiction│  │   Causal    │ │
│  │   Engine    │  │ Calculator  │  │  Detector   │  │   Graph     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Learning   │  │ Prediction  │  │ Generation  │  │   Session   │ │
│  │Orchestrator │  │   Engine    │  │Orchestrator │  │   Manager   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   SQLite Storage Backend                             │
│                  .drift/memory/cortex.db                             │
│                                                                      │
│  Tables: memories, causal_links, embeddings, sessions,               │
│          predictions, validation_history, consolidation_log          │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Storage** | SQLite-based persistence with sqlite-vec for vector search |
| **Embeddings** | Generates embeddings (local Transformers.js, OpenAI, or Ollama) |
| **Retrieval Engine** | Intent-aware memory retrieval with compression and ranking |
| **Consolidation Engine** | Merges episodic memories into semantic knowledge |
| **Validation Engine** | Identifies stale, conflicting, or invalid memories |
| **Decay Calculator** | Computes effective confidence based on age and usage |
| **Contradiction Detector** | Finds and resolves conflicting memories |
| **Causal Graph** | Tracks relationships between memories (derived_from, supersedes, etc.) |
| **Learning Orchestrator** | Extracts knowledge from corrections and feedback |
| **Prediction Engine** | Pre-fetches likely-needed memories |
| **Generation Orchestrator** | Provides context for code generation with provenance |
| **Session Manager** | Tracks what's been sent to avoid duplication |

---

## 🎯 Key Features

### 1. Interactive Setup Wizard

The easiest way to initialize Cortex:

```bash
drift memory setup
```

The wizard walks you through 7 optional sections:
1. **Core Identity** — Project name, tech stack, preferences
2. **Tribal Knowledge** — Gotchas, warnings, institutional knowledge
3. **Workflows** — Deploy, code review, release processes
4. **Agent Spawns** — Reusable agent configurations
5. **Entities** — Projects, teams, services
6. **Skills** — Knowledge domains and proficiency
7. **Environments** — Production, staging, dev configs

All sections are optional — skip any with 'n'.

### 2. Causal Memory Graph

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
- `owns` — Entity owns Entity/Goal/Workflow
- `affects` — Incident affects Entity/Environment
- `blocks` — Incident blocks Goal
- `requires` — Workflow requires Skill/Environment
- `learned_from` — Tribal learned from Incident

### 3. Intent-Aware Retrieval

Retrieval adapts based on what you're trying to do:

| Intent | Prioritizes |
|--------|-------------|
| `add_feature` | Pattern rationales, procedural knowledge, workflows |
| `fix_bug` | Code smells, tribal knowledge, error patterns, incidents |
| `refactor` | Structural patterns, coupling analysis |
| `security_audit` | Security patterns, constraint overrides |
| `understand_code` | Decision context, pattern rationales |
| `add_test` | Test patterns, coverage requirements |

### 4. Contradiction Detection

Cortex automatically detects conflicting memories:

```typescript
interface ContradictionResult {
  type: ContradictionType;  // direct, temporal, scope, confidence
  existingMemoryId: string;
  similarity: number;
  explanation: string;
}
```

When contradictions are found:
- Reduces confidence of older memory
- Propagates confidence changes through relationship graph
- Alerts you to resolve conflicts

### 5. Active Learning

Cortex learns from corrections automatically:

```bash
# AI suggests using MD5
# You correct it
drift memory learn "Use bcrypt instead of MD5 for password hashing"

# Cortex creates:
# 1. New tribal memory: "Use bcrypt, not MD5"
# 2. Code smell memory: "MD5 is insecure"
# 3. Causal link: correction → new memories
```

### 6. Token Efficiency

Hierarchical compression minimizes token usage:

| Level | Description | Tokens |
|-------|-------------|--------|
| 0 | IDs only | ~50 |
| 1 | One-line summaries | ~200 |
| 2 | With examples | ~500 |
| 3 | Full detail | ~1000+ |

Session-based deduplication prevents sending the same memory twice.

### 7. Automatic Consolidation

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
# Setup
drift memory setup              # Interactive wizard (recommended)
drift memory init               # Initialize memory system

# Add memories
drift memory add tribal "..." --importance critical
drift memory add procedural "Deploy: 1) Test 2) Build 3) Push"

# Universal memory types
drift memory agent-spawn add    # Add agent configuration
drift memory workflow add       # Add workflow
drift memory entity add         # Add entity
drift memory skill add          # Add skill
drift memory environment add    # Add environment
drift memory goal add           # Add goal
drift memory incident add       # Add incident
drift memory meeting add        # Add meeting notes
drift memory conversation add   # Add conversation summary

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

## 🤖 MCP Tools (25 Total)

Cortex V2 exposes 25 MCP tools for AI agents:

### Core Memory Tools

| Tool | Description |
|------|-------------|
| `drift_memory_status` | Memory system health and statistics |
| `drift_memory_add` | Add new memory with causal inference |
| `drift_memory_search` | Search memories by text/embedding |
| `drift_memory_get` | Get memory by ID |
| `drift_memory_validate` | Validate memory integrity |
| `drift_memory_for_context` | Get memories for current context |
| `drift_memory_learn` | Learn from corrections |
| `drift_why` | Explain why something is the way it is |

### V2 Advanced Tools

| Tool | Description |
|------|-------------|
| `drift_memory_explain` | Comprehensive explanation with causal chain |
| `drift_memory_feedback` | Record feedback for learning |
| `drift_memory_health` | Detailed health metrics |
| `drift_memory_predict` | Predict what context will be needed |
| `drift_memory_conflicts` | Find conflicting memories |
| `drift_memory_graph` | Visualize memory relationships |
| `drift_memory_query` | Rich graph queries (MGQL) |
| `drift_memory_contradictions` | Detect and resolve contradictions |

### Universal Memory Tools

| Tool | Description |
|------|-------------|
| `drift_agent_spawn` | Create/invoke agent configurations |
| `drift_goal` | Track objectives with progress |
| `drift_incident` | Record postmortems |
| `drift_workflow` | Store step-by-step processes |
| `drift_entity` | Track projects/teams/systems |
| `drift_conversation` | Store conversation summaries |
| `drift_meeting` | Record meeting notes |
| `drift_skill` | Track knowledge domains |
| `drift_environment` | Store environment configs |

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

### Initial Setup (Recommended)

```bash
# Run the interactive wizard
drift memory setup

# The wizard guides you through:
# 1. Core identity (project name, tech stack, preferences)
# 2. Tribal knowledge (gotchas, warnings)
# 3. Workflows (deploy, review, release)
# 4. Agent spawns (code reviewer, security auditor)
# 5. Entities (projects, teams, services)
# 6. Skills (knowledge domains)
# 7. Environments (prod, staging, dev)
```

### Daily Development

```bash
# Get context before starting work
drift memory why "feature area" --intent add_feature

# After code review, learn from feedback
drift memory learn "Always validate input before processing"
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
- [Memory Setup Wizard](Cortex-Memory-Setup) — Detailed setup guide
- [Universal Memory Types](Cortex-Universal-Memory-Types) — Agent spawns, workflows, entities
- [Cortex Learning System](Cortex-Learning-System) — How Cortex learns from corrections
- [Cortex Token Efficiency](Cortex-Token-Efficiency) — Compression and deduplication
- [Cortex Causal Graphs](Cortex-Causal-Graphs) — Memory relationships and "why" explanations
- [Cortex Code Generation](Cortex-Code-Generation) — Context for AI code generation
- [Cortex Predictive Retrieval](Cortex-Predictive-Retrieval) — Anticipating memory needs
- [MCP Tools Reference](MCP-Tools-Reference) — All MCP memory tools
