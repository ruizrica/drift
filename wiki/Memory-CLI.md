# Memory CLI Reference

Complete reference for the `drift memory` command — managing Cortex V2 memories from the command line.

---

## ⚡ Quick Start (30 Seconds)

```bash
# Initialize memory system
drift memory init

# Add your first memory
drift memory add tribal "Always use bcrypt for passwords" --importance critical

# See what you've stored
drift memory list

# Search memories
drift memory search "password"
```

---

## 📋 Technical Overview

The `drift memory` command provides full CRUD operations for Cortex V2 memories. Memories are stored in a SQLite database at `.drift/memory/cortex.db` and support:

- **9 memory types** with different decay rates
- **Semantic search** via embeddings (local Transformers.js or OpenAI)
- **Confidence decay** based on age and usage
- **Automatic consolidation** of episodic memories
- **Health monitoring** and validation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        drift memory CLI                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Cortex V2 Engine                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Retrieval  │  │ Consolidation│  │  Validation │              │
│  │   Engine    │  │    Engine   │  │    Engine   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Decay     │  │  Learning   │  │  Embedding  │              │
│  │ Calculator  │  │   System    │  │  Provider   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SQLite Storage Backend                         │
│                  .drift/memory/cortex.db                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚫 Replacing AGENTS.md

Stop maintaining static `AGENTS.md` or `CLAUDE.md` files. They become stale immediately.

**Migrate in 2 minutes:**

```bash
# 1. Initialize
drift memory init

# 2. Add your key knowledge
drift memory add tribal "Always use bcrypt for passwords" --importance critical
drift memory add tribal "Services should not call controllers" --topic Architecture  
drift memory add tribal "All API routes need auth middleware" --topic Security
drift memory add procedural "Deploy: 1) Run tests 2) Build 3) Push to main"

# 3. Delete your AGENTS.md
rm AGENTS.md  # 🎉
```

**Why this is better:**

| Static AGENTS.md | Cortex Memory |
|------------------|---------------|
| Gets stale immediately | Confidence decays on unused knowledge |
| No search capability | Semantic search via embeddings |
| No context awareness | Intent-aware retrieval |
| No feedback loop | AI learns from corrections |
| No health monitoring | Health reports show what's outdated |

---

## 📊 Memory Types

| Type | Icon | Description | Half-Life | Use Case |
|------|------|-------------|-----------|----------|
| `core` | 🏠 | Project identity and preferences | ∞ (never) | Project name, tech stack, team conventions |
| `tribal` | ⚠️ | Institutional knowledge, gotchas | 365 days | "Never use MD5", "Always validate input" |
| `procedural` | 📋 | How-to knowledge, procedures | 180 days | Deploy process, PR checklist |
| `semantic` | 💡 | Consolidated knowledge | 90 days | Auto-generated from episodic memories |
| `episodic` | 💭 | Interaction records | 7 days | Raw material for consolidation |
| `pattern_rationale` | 🎯 | Why patterns exist | 180 days | "We use repository pattern for testability" |
| `constraint_override` | ✅ | Approved exceptions | 90 days | "Allow direct DB in migrations" |
| `decision_context` | 📝 | Architectural decisions | 180 days | "Chose PostgreSQL for ACID compliance" |
| `code_smell` | 🚫 | Anti-patterns to avoid | 90 days | "Avoid any type in TypeScript" |

### Half-Life Explained

Confidence decays over time using exponential decay:

```
effective_confidence = base_confidence × 2^(-age_days / half_life)
```

- **365-day half-life**: After 1 year, confidence drops to 50%
- **180-day half-life**: After 6 months, confidence drops to 50%
- **90-day half-life**: After 3 months, confidence drops to 50%
- **7-day half-life**: After 1 week, confidence drops to 50%

Usage boosts confidence — frequently accessed memories decay slower.

---

## 🔧 Command Reference

### Global Options

```bash
drift memory [options] <subcommand>

Options:
  -f, --format <format>   Output format: text, json (default: "text")
  -v, --verbose           Enable verbose output
  -h, --help              Display help
```

---

### `drift memory init`

Initialize the memory system for a project.

```bash
drift memory init
```

**What it creates:**

```
.drift/memory/
└── cortex.db            # SQLite database with all tables and indexes
```

**Example output:**

```
🧠 Initializing Memory System
══════════════════════════════════════════════════════════════

✓ Memory system initialized

Database: .drift/memory/cortex.db

────────────────────────────────────────────────────────────────
📌 Next Steps:
  • drift memory add tribal "..."   Add tribal knowledge
  • drift memory status             View memory statistics
  • drift memory import <file>      Import memories from file
```

**Verified:** ✅ Tested and working

---

### `drift memory status`

Show memory system status and health overview.

```bash
drift memory status
```

**Example output:**

```
🧠 Memory System Status
══════════════════════════════════════════════════════════════

📊 Overview
──────────────────────────────────────────────────────────────
  Total Memories:      10
  Avg Confidence:      98%
  Low Confidence:      0
  Recently Accessed:   1 (last 7 days)
  Pending Consolidation: 0

📋 By Type
──────────────────────────────────────────────────────────────
  ⚠️ tribal               5 (365d half-life)
  📋 procedural           1 (180d half-life)
  🎯 pattern_rationale    1 (180d half-life)
  ✅ constraint_override  1 (90d half-life)
  📝 decision_context     1 (180d half-life)
  🚫 code_smell           1 (90d half-life)

💚 Health
──────────────────────────────────────────────────────────────
  Score: 100/100 (healthy)
```

**Verified:** ✅ Tested and working

---

### `drift memory add`

Add a new memory to the system.

```bash
drift memory add <type> <content> [options]

Arguments:
  type      Memory type: tribal, procedural, pattern_rationale, 
            code_smell, decision_context, constraint_override
  content   The memory content (text)

Options:
  -t, --topic <topic>         Topic or name for the memory
  -s, --severity <severity>   Severity: info, warning, critical (default: warning)
  -i, --importance <level>    Importance: low, normal, high, critical (default: normal)
  --tags <tags>               Comma-separated tags
  --file <file>               Link to a file path
  --pattern <pattern>         Link to a pattern ID
```

**Examples:**

```bash
# Add tribal knowledge with high importance
drift memory add tribal "Always use bcrypt for password hashing, never MD5" \
  --topic "Security" \
  --severity critical \
  --importance high

# Add a procedural memory
drift memory add procedural "To deploy: 1) Run tests 2) Build 3) Push to main" \
  --topic "Deployment Process"

# Add a code smell
drift memory add code_smell "Avoid using any type in TypeScript" \
  --topic "TypeScript" \
  --severity warning

# Add with file link
drift memory add tribal "This file handles all auth logic" \
  --file src/auth/index.ts

# Add pattern rationale
drift memory add pattern_rationale "We use repository pattern for testability" \
  --topic "Architecture"

# Add decision context
drift memory add decision_context "Chose PostgreSQL over MongoDB for ACID compliance" \
  --topic "Database"

# Add constraint override
drift memory add constraint_override "Allow direct DB access in migration scripts" \
  --topic "Migrations"
```

**Example output:**

```
Using local (Transformers.js) embedding provider
✓ Memory added

  ⚠️ ID: mem_ml2pgp3g_8421ace03a97
  Type: tribal
  Importance: high
```

**Verified:** ✅ Tested and working

---

### `drift memory list`

List memories with optional filters.

```bash
drift memory list [options]

Options:
  -t, --type <type>           Filter by memory type
  -i, --importance <level>    Filter by importance: low, normal, high, critical
  -l, --limit <number>        Maximum results (default: 20)
  --min-confidence <number>   Minimum confidence threshold (0-1)
```

**Examples:**

```bash
# List all memories
drift memory list

# List tribal knowledge only
drift memory list --type tribal

# List high-importance memories
drift memory list --importance high

# List with minimum confidence
drift memory list --min-confidence 0.8

# Limit results
drift memory list --limit 5
```

**Example output:**

```
🧠 Memories
────────────────────────────────────────────────────────────────

⚠️ TRIBAL
────────────────────────────────────────────────────────────────
  ⚠️ mem_ml2p... 100%
    Test memory for documentation verification
  ⚠️ mem_ml2o... 80%
    Learned: MD5 is cryptographically broken. Use bcrypt with c...
  ⚠️ mem_ml2o... 100%
    Services should never call controllers directly

✅ CONSTRAINT_OVERRIDE
────────────────────────────────────────────────────────────────
  ✅ mem_ml2o... 100%
    Allow direct DB access in migration scripts

📝 DECISION_CONTEXT
────────────────────────────────────────────────────────────────
  📝 mem_ml2o... 100%
    We chose PostgreSQL over MongoDB for ACID compliance

Showing 10 memories
```

**Verified:** ✅ Tested and working

---

### `drift memory show`

Show detailed information about a specific memory.

```bash
drift memory show <id>

Arguments:
  id    Memory ID (full or partial, e.g., mem_abc123 or abc123)
```

**Example:**

```bash
drift memory show mem_ml2o
```

**Example output:**

```
⚠️ TRIBAL
══════════════════════════════════════════════════════════════

Details
──────────────────────────────────────────────────────────────
  ID:          mem_ml2o1234_abc456def789
  Type:        tribal
  Confidence:  100%
  Importance:  high
  Created:     1/31/2026, 10:30:00 AM
  Updated:     1/31/2026, 10:30:00 AM
  Accessed:    3 times

Summary
──────────────────────────────────────────────────────────────
  Always use bcrypt for password hashing

Knowledge
──────────────────────────────────────────────────────────────
  Topic:    Security
  Severity: critical
  Always use bcrypt for password hashing, never MD5 or SHA1.

Tags
──────────────────────────────────────────────────────────────
  security, passwords, hashing

📉 Decay
──────────────────────────────────────────────────────────────
  Current Confidence: 100%
  Effective Confidence: 100%
  Age Factor: 100%
  Usage Factor: 100%
```

**Verified:** ✅ Tested and working

---

### `drift memory search`

Search memories using semantic similarity.

```bash
drift memory search <query> [options]

Arguments:
  query   Search query (natural language)

Options:
  -t, --type <type>     Filter by memory type
  -l, --limit <number>  Maximum results (default: 20)
```

**Examples:**

```bash
# Search for authentication-related memories
drift memory search "authentication"

# Search within tribal knowledge
drift memory search "password" --type tribal

# Limit results
drift memory search "security" --limit 5
```

**Example output:**

```
🔍 Search Results for "bcrypt"
────────────────────────────────────────────────────────────────

  ⚠️ mem_ml2o... 80%
    Learned: MD5 is cryptographically broken. Use bcrypt with c...
  ⚠️ mem_ml2o... 100%
    Always use bcrypt for password hashing, never MD5 or SHA1
  ⚠️ mem_ml2n... 100%
    Always use bcrypt for password hashing

Found 3 memories
```

**Verified:** ✅ Tested and working

---

### `drift memory update`

Update an existing memory.

```bash
drift memory update <id> [options]

Arguments:
  id    Memory ID

Options:
  -c, --confidence <number>   New confidence value (0-1)
  -i, --importance <level>    New importance: low, normal, high, critical
  --tags <tags>               New comma-separated tags
  --summary <summary>         New summary text
```

**Example:**

```bash
drift memory update mem_abc123 \
  --confidence 0.9 \
  --importance critical \
  --tags "security,critical,passwords"
```

**Verified:** ✅ Tested and working

---

### `drift memory delete`

Delete a memory (soft delete — can be recovered).

```bash
drift memory delete <id>

Arguments:
  id    Memory ID to delete
```

**Example:**

```bash
drift memory delete mem_abc123
```

**Verified:** ✅ Tested and working

---

### `drift memory learn`

Learn from a correction. Creates new memories based on feedback.

```bash
drift memory learn [options]

Options:
  -o, --original <text>   Original code or response (required)
  -f, --feedback <text>   Feedback or correction (required)
  -c, --code <code>       Corrected code
  --file <file>           Related file path
```

**Example:**

```bash
drift memory learn \
  --original "Use MD5 for hashing passwords" \
  --feedback "MD5 is insecure. Use bcrypt instead." \
  --code "const hash = await bcrypt.hash(password, 10);" \
  --file src/auth/password.ts
```

**Example output:**

```
✓ Learned from correction

📝 Memories Created:
  mem_xyz789_abc123

💡 Extracted Principles:
  • Use bcrypt for password hashing instead of MD5

Category: security
```

**Verified:** ✅ Tested and working

---

### `drift memory feedback`

Provide feedback on a memory to adjust its confidence.

```bash
drift memory feedback <id> <action> [options]

Arguments:
  id      Memory ID
  action  Feedback action: confirm, reject, modify

Options:
  -d, --details <text>   Additional details about the feedback
```

**Actions:**

| Action | Effect | Use Case |
|--------|--------|----------|
| `confirm` | +10% confidence | Memory is accurate and useful |
| `reject` | -30% confidence | Memory is wrong or outdated |
| `modify` | -10% confidence | Memory needs minor updates |

**Examples:**

```bash
# Confirm a memory is accurate
drift memory feedback mem_abc123 confirm

# Reject an outdated memory
drift memory feedback mem_abc123 reject --details "This pattern is outdated"

# Mark as needing modification
drift memory feedback mem_abc123 modify --details "Needs update for v2 API"
```

**Verified:** ✅ Tested and working

---

### `drift memory validate`

Validate memories and optionally heal issues.

```bash
drift memory validate [options]

Options:
  -s, --scope <scope>         Scope: all, stale, recent, high_importance (default: stale)
  --auto-heal                 Automatically heal minor issues (default: true)
  --remove-invalid            Remove memories that cannot be healed
  --min-confidence <number>   Minimum confidence to keep (default: 0.2)
```

**Example:**

```bash
drift memory validate --scope all --auto-heal
```

**Example output:**

```
🔍 Validation Results
══════════════════════════════════════════════════════════════

📊 Summary
──────────────────────────────────────────────────────────────
  Total Validated: 47
  Valid:           42
  Stale:           3
  Healed:          2
  Duration:        156ms

🔧 Healing Stats
──────────────────────────────────────────────────────────────
  Summaries Fixed:     1
  Confidence Adjusted: 1
```

**Verified:** ✅ Tested and working

---

### `drift memory consolidate`

Consolidate episodic memories into semantic knowledge.

```bash
drift memory consolidate [options]

Options:
  --dry-run   Preview changes without applying them
```

**What consolidation does:**

1. Groups related episodic memories
2. Extracts common patterns and knowledge
3. Creates semantic memories from the groups
4. Prunes redundant episodic memories
5. Frees up token budget

**Example:**

```bash
drift memory consolidate
```

**Example output:**

```
✓ Consolidation Complete
══════════════════════════════════════════════════════════════

📊 Results
──────────────────────────────────────────────────────────────
  Episodes Processed: 15
  Memories Created:   3
  Memories Updated:   2
  Memories Pruned:    8
  Tokens Freed:       2400
  Duration:           234ms
```

**Verified:** ✅ Tested and working

---

### `drift memory warnings`

Show active warnings from tribal knowledge and code smells.

```bash
drift memory warnings [options]

Options:
  --focus <focus>       Filter by focus area (e.g., "auth", "security")
  --severity <level>    Filter by severity: all, critical, warning (default: all)
```

**Example:**

```bash
drift memory warnings --severity critical
```

**Example output:**

```
⚠️  Active Warnings
══════════════════════════════════════════════════════════════

🚨 [CRITICAL] Security
   Always use bcrypt for password hashing, never MD5
   Confidence: 95%

⚠️ [WARNING] TypeScript
   Avoid using 'any' type - use proper typing
   Confidence: 88%

ℹ️ [INFO] Performance
   Consider pagination for lists over 100 items
   Confidence: 75%

Total: 3 warnings
```

**Verified:** ✅ Tested and working

---

### `drift memory why`

Get context for a task — patterns, decisions, tribal knowledge relevant to your focus area.

```bash
drift memory why <focus> [options]

Arguments:
  focus   What you're working on (e.g., "authentication", "database")

Options:
  -i, --intent <intent>     Intent: add_feature, fix_bug, refactor, 
                            security_audit, understand_code, add_test
                            (default: understand_code)
  --max-tokens <number>     Maximum tokens to use (default: 2000)
```

**Examples:**

```bash
# Get context for authentication work
drift memory why "authentication"

# Get context for adding a feature
drift memory why "user registration" --intent add_feature

# Get context for security audit
drift memory why "password handling" --intent security_audit
```

**Example output:**

```
🔍 Context for "authentication"
══════════════════════════════════════════════════════════════

Intent: add_feature | Tokens: 1847/2000 | Time: 45ms

⚠️ TRIBAL
────────────────────────────────────────────────────────────────
  mem_abc1... JWT tokens must be validated on every request
    Relevance: 92%
  mem_def2... Use bcrypt for password hashing
    Relevance: 88%

🎯 PATTERN_RATIONALE
────────────────────────────────────────────────────────────────
  mem_ghi3... Auth middleware pattern exists for stateless API
    Relevance: 85%

📝 DECISION_CONTEXT
────────────────────────────────────────────────────────────────
  mem_jkl4... Chose JWT over sessions for horizontal scaling
    Relevance: 78%
```

**Verified:** ✅ Tested and working

---

### `drift memory export`

Export memories to a JSON file for backup or sharing.

```bash
drift memory export <output> [options]

Arguments:
  output   Output file path (e.g., memories.json)

Options:
  -t, --type <type>           Filter by memory type
  --min-confidence <number>   Minimum confidence threshold (0-1)
  --include-archived          Include archived/deleted memories
```

**Examples:**

```bash
# Export all memories
drift memory export memories.json

# Export only tribal knowledge
drift memory export tribal.json --type tribal

# Export high-confidence memories
drift memory export confident.json --min-confidence 0.8

# Export with timestamp
drift memory export backup-$(date +%Y%m%d).json
```

**Verified:** ✅ Tested and working

---

### `drift memory import`

Import memories from a JSON file.

```bash
drift memory import <input> [options]

Arguments:
  input   Input file path (e.g., memories.json)

Options:
  --overwrite   Overwrite existing memories with same ID
```

**Examples:**

```bash
# Import memories
drift memory import memories.json

# Import and overwrite existing
drift memory import memories.json --overwrite
```

**Verified:** ✅ Tested and working

---

### `drift memory health`

Get a comprehensive health report for the memory system.

```bash
drift memory health
```

**Example output:**

```
🏥 Memory Health Report
══════════════════════════════════════════════════════════════

📊 Overall Health
──────────────────────────────────────────────────────────────
  Score: 100/100 (healthy)

📈 Statistics
──────────────────────────────────────────────────────────────
  Total Memories:      10
  Avg Confidence:      98%
  Low Confidence:      0
  Recently Accessed:   1

💡 Recommendations
──────────────────────────────────────────────────────────────
  • Memory system is healthy. Continue using as normal.
```

**Verified:** ✅ Tested and working

---

## 📤 JSON Output

All commands support `--format json` for programmatic use:

```bash
drift memory status --format json
```

**Example JSON output:**

```json
{
  "total": 10,
  "byType": {
    "tribal": 5,
    "procedural": 1,
    "pattern_rationale": 1,
    "constraint_override": 1,
    "decision_context": 1,
    "code_smell": 1
  },
  "avgConfidence": 0.98,
  "lowConfidenceCount": 0,
  "recentlyAccessed": 1,
  "pendingConsolidation": 0,
  "healthScore": 100
}
```

---

## 🔄 Typical Workflows

### Onboarding New Team Members

```bash
# Show what the team knows
drift memory list --type tribal --importance high

# Show active warnings
drift memory warnings

# Get context for a feature area
drift memory why "authentication"
```

### After Code Review

```bash
# Learn from reviewer feedback
drift memory learn \
  --original "Used string concatenation for SQL" \
  --feedback "Use parameterized queries to prevent SQL injection"

# Add tribal knowledge
drift memory add tribal "Always use parameterized queries" \
  --topic "Security" \
  --severity critical
```

### Regular Maintenance

```bash
# Check health
drift memory health

# Validate and heal
drift memory validate --scope stale --auto-heal

# Consolidate episodic memories
drift memory consolidate

# Export backup
drift memory export backup-$(date +%Y%m%d).json
```

### CI/CD Integration

```bash
# Export memories for CI context
drift memory export ci-context.json --min-confidence 0.7

# Validate memories in CI
drift memory validate --scope all --format json
```

---

## 🔗 Related Documentation

- [Cortex V2 Overview](Cortex-V2-Overview) — Architecture and concepts
- [Cortex Learning System](Cortex-Learning-System) — How Cortex learns from corrections
- [Cortex Token Efficiency](Cortex-Token-Efficiency) — Compression and deduplication
- [Cortex Causal Graphs](Cortex-Causal-Graphs) — Memory relationships
- [MCP Tools Reference](MCP-Tools-Reference) — MCP memory tools
