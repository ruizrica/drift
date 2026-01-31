# Decision Mining

Drift can mine architectural decisions from your git history and generate Architecture Decision Records (ADRs) automatically.

> **Note:** Decision Mining is currently available via the MCP tool `drift_decisions`. The CLI command `drift decisions` is planned for a future release.

---

## ⚡ Quick Start (MCP)

Use the `drift_decisions` MCP tool to mine and query decisions:

```json
// Mine decisions from git history
{ "action": "mine" }

// List all decisions
{ "action": "list" }

// Get decision details
{ "action": "get", "id": "ADR-001" }

// Search decisions
{ "action": "search", "query": "redis caching" }
```

---

## What is Decision Mining?

Decision Mining analyzes your git commits to discover implicit architectural decisions:

- **Technology adoptions** — "We started using Redis for caching"
- **Pattern introductions** — "We adopted the repository pattern"
- **Architecture changes** — "We migrated from monolith to microservices"
- **API changes** — "We versioned our API"

Instead of manually writing ADRs, Drift discovers them from your commit history.

---

## How It Works

```
Git History
    │
    ▼
┌─────────────────┐
│  Commit Analysis │ ← Analyze commit messages and diffs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Clustering     │ ← Group related commits
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Classification │ ← Categorize decisions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ADR Generation │ ← Generate decision records
└─────────────────┘
```

1. **Commit Analysis** — Drift analyzes commit messages, file changes, and patterns
2. **Clustering** — Related commits are grouped into decision clusters
3. **Classification** — Each cluster is categorized (technology, pattern, architecture, etc.)
4. **ADR Generation** — Drift generates structured ADRs with context, decision, and consequences

---

## Mining Decisions

> **Note:** The CLI commands below are planned for a future release. Currently, use the MCP tool `drift_decisions` instead.

### Via MCP Tool (Available Now)

```json
// Mine decisions
{ "action": "mine" }

// Mine with date range
{ "action": "mine", "since": "2024-01-01", "until": "2024-06-30" }

// Mine with confidence threshold
{ "action": "mine", "minConfidence": 0.7 }
```

### Via CLI (Planned)

```bash
drift decisions mine
```

**Output:**
```
📜 Mining Architectural Decisions
══════════════════════════════════════════════════════

Initializing...
Analyzing git history...
Mining decisions from commits...
Saving decisions...

✓ Decision mining complete

📊 Summary
──────────────────────────────────────────────────────
  Total Decisions:     12
  Commits Analyzed:    847
  Significant Commits: 156
  Avg Cluster Size:    8.3

📋 By Status
──────────────────────────────────────────────────────
  Draft:      12
  Confirmed:  0
  Superseded: 0
  Rejected:   0

🎯 By Confidence
──────────────────────────────────────────────────────
  High:   4
  Medium: 6
  Low:    2

🏷️  Top Categories
──────────────────────────────────────────────────────
  📦 technology-adoption     4
  🎨 pattern-introduction    3
  🏗️ architecture-change     2
  🔒 security-enhancement    2
  ⚡ performance-optimization 1

──────────────────────────────────────────────────────
📌 Next Steps:
  • drift decisions status    View mining summary
  • drift decisions list      List all decisions
  • drift decisions show <id> View decision details
  • drift decisions confirm   Confirm a draft decision
```

### Mining Options

```bash
# Mine from specific date range
drift decisions mine --since 2024-01-01 --until 2024-06-30

# Set minimum confidence threshold
drift decisions mine --min-confidence 0.7

# Verbose output
drift decisions mine --verbose
```

---

## Viewing Decisions

### List All Decisions

```bash
drift decisions list
```

**Output:**
```
📜 Architectural Decisions
────────────────────────────────────────────────────────────────

○ ADR-001 [medium]
  Adopt Redis for Session Storage
  📦 technology-adoption | 12 commits | 3 weeks

○ ADR-002 [high]
  Implement Repository Pattern for Data Access
  🎨 pattern-introduction | 23 commits | 2 months

● ADR-003 [high]
  Migrate Authentication to JWT
  🔒 security-enhancement | 18 commits | 1 month

○ ADR-004 [medium]
  Add Circuit Breaker to External API Calls
  🎨 pattern-introduction | 8 commits | 1 week
```

### Filter Decisions

```bash
# By category
drift decisions list --category technology-adoption

# By status
drift decisions list --status confirmed

# Limit results
drift decisions list --limit 5
```

### View Decision Details

```bash
drift decisions show ADR-001
```

**Output:**
```
○ ADR-001: Adopt Redis for Session Storage
════════════════════════════════════════════════════════════════

📋 Metadata
──────────────────────────────────────────────────────
  Status:     draft
  Category:   📦 technology-adoption
  Confidence: medium (72%)
  Duration:   3 weeks
  Commits:    12
  Files:      8
  Languages:  TypeScript

📜 Architecture Decision Record
──────────────────────────────────────────────────────

Context:
  The application was using in-memory session storage, which didn't
  scale across multiple server instances. Users were being logged out
  when requests hit different servers.

Decision:
  Adopt Redis as the session storage backend. Use ioredis client with
  connection pooling. Sessions expire after 24 hours of inactivity.

Consequences:
  • Sessions persist across server restarts
  • Horizontal scaling now works correctly
  • Added Redis as infrastructure dependency
  • Need to manage Redis availability

📎 Evidence
──────────────────────────────────────────────────────
  💬 "Add Redis for session storage"
    Source: commit abc1234
  📝 Added ioredis dependency
    Source: package.json change
  📝 Created RedisSessionStore class
    Source: src/auth/session-store.ts

📝 Commits
──────────────────────────────────────────────────────
  abc1234 Add Redis for session storage
    John Doe | Jan 15, 2024
  def5678 Configure Redis connection pooling
    John Doe | Jan 16, 2024
  ghi9012 Add session expiration handling
    Jane Smith | Jan 17, 2024
  ... and 9 more commits
```

---

## Decision Lifecycle

### Status Flow

```
Draft → Confirmed → (Superseded)
  │
  └──→ Rejected
```

| Status | Meaning |
|--------|---------|
| `draft` | Newly mined, awaiting review |
| `confirmed` | Reviewed and confirmed as accurate |
| `superseded` | Replaced by a newer decision |
| `rejected` | Not a real decision (false positive) |

### Confirm a Decision

```bash
drift decisions confirm ADR-001
```

### View Timeline

```bash
drift decisions timeline
```

**Output:**
```
📅 Decision Timeline
────────────────────────────────────────────────────────────────

January 2024
────────────────────────────────────────
  15 ○ ADR-001: Adopt Redis for Session Storage
      📦 technology-adoption
  22 ○ ADR-002: Implement Repository Pattern
      🎨 pattern-introduction

February 2024
────────────────────────────────────────
   5 ● ADR-003: Migrate Authentication to JWT
      🔒 security-enhancement
  18 ○ ADR-004: Add Circuit Breaker
      🎨 pattern-introduction
```

### Find Decisions for a File

```bash
drift decisions for-file src/auth/session-store.ts
```

---

## Searching Decisions

### Via MCP Tool

Use the `drift_decisions` MCP tool with the `search` action:

```json
{
  "action": "search",
  "query": "redis caching"
}
```

---

## Exporting ADRs

### Export as Markdown

```bash
drift decisions export
```

Creates `docs/adr/` with markdown files:

```
docs/adr/
├── adr-001-adopt-redis-for-session-storage.md
├── adr-002-implement-repository-pattern.md
├── adr-003-migrate-authentication-to-jwt.md
└── adr-004-add-circuit-breaker.md
```

### ADR Format

```markdown
# ADR-001: Adopt Redis for Session Storage

**Status:** confirmed
**Category:** technology-adoption
**Confidence:** medium (72%)
**Date:** Jan 15, 2024 - Feb 2, 2024

## Context

The application was using in-memory session storage, which didn't
scale across multiple server instances...

## Decision

Adopt Redis as the session storage backend...

## Consequences

- Sessions persist across server restarts
- Horizontal scaling now works correctly
- Added Redis as infrastructure dependency
- Need to manage Redis availability

## Evidence

- **commit-message**: "Add Redis for session storage"
- **dependency-change**: Added ioredis dependency
- **code-change**: Created RedisSessionStore class

## Related Commits

- `abc1234` Add Redis for session storage
- `def5678` Configure Redis connection pooling
- `ghi9012` Add session expiration handling

---
*Mined by Drift on Mar 15, 2024*
```

---

## Decision Categories

| Category | Icon | Description |
|----------|------|-------------|
| `technology-adoption` | 📦 | Adopting new technology |
| `technology-removal` | 🗑️ | Removing technology |
| `pattern-introduction` | 🎨 | Introducing new pattern |
| `pattern-migration` | 🔄 | Migrating between patterns |
| `architecture-change` | 🏗️ | Architectural changes |
| `api-change` | 🔌 | API design changes |
| `security-enhancement` | 🔒 | Security improvements |
| `performance-optimization` | ⚡ | Performance improvements |
| `refactoring` | ♻️ | Code refactoring |
| `testing-strategy` | 🧪 | Testing approach changes |
| `infrastructure` | 🔧 | Infrastructure changes |
| `other` | 📋 | Other decisions |

---

## Confidence Levels

| Level | Score | Meaning |
|-------|-------|---------|
| High | 0.8-1.0 | Strong evidence, clear decision |
| Medium | 0.5-0.8 | Good evidence, likely decision |
| Low | 0.0-0.5 | Weak evidence, may be noise |

Confidence is calculated from:
- Commit message clarity
- Number of related commits
- Code change patterns
- Dependency changes
- File naming patterns

---

## MCP Integration

### `drift_decisions` Tool

```json
{
  "action": "list",
  "category": "technology-adoption",
  "limit": 10
}
```

**Actions:**
- `status` — Mining summary
- `list` — List decisions
- `get` — Decision details (requires `id`)
- `for-file` — Decisions affecting a file (requires `file`)
- `timeline` — Chronological view
- `search` — Search decisions (requires `query`)
- `mine` — Run mining

**Parameters:**
- `action` — Required. The action to perform
- `id` — Decision ID for get action
- `file` — File path for for-file action
- `query` — Search query for search action
- `category` — Filter by category: `technology-adoption`, `technology-removal`, `pattern-introduction`, `pattern-migration`, `architecture-change`, `api-change`, `security-enhancement`, `performance-optimization`, `refactoring`, `testing-strategy`, `infrastructure`, `other`
- `limit` — Max results (default: 20)
- `since` — Start date (ISO format) for mine action
- `until` — End date (ISO format) for mine action
- `minConfidence` — Minimum confidence (0-1) for mine action (default: 0.5)

---

## Best Practices

### 1. Write Good Commit Messages

Decision mining works best with descriptive commits:

```bash
# Good
git commit -m "Add Redis for session storage to enable horizontal scaling"

# Bad
git commit -m "fix stuff"
```

### 2. Review Mined Decisions

Not all mined decisions are accurate. Review and confirm:

```bash
drift decisions list --status draft
drift decisions show ADR-001
drift decisions confirm ADR-001
```

### 3. Mine Periodically

Run mining after major milestones:

```bash
# After a release
drift decisions mine --since 2024-01-01
```

### 4. Export for Documentation

Keep ADRs in your docs:

```bash
drift decisions export
git add docs/adr/
git commit -m "Update ADRs from decision mining"
```

---

## Troubleshooting

### No decisions found

1. Check you have enough commit history
2. Lower confidence threshold: `--min-confidence 0.3`
3. Check commits have meaningful messages

### Too many false positives

1. Increase confidence threshold: `--min-confidence 0.8`
2. Review and reject false positives
3. Improve commit message quality going forward

### Mining is slow

1. Limit date range: `--since 2024-01-01`
2. Mining analyzes all commits, so large repos take time

---

## Next Steps

- [Constraints](Constraints) — Architectural invariants
- [Quality Gates](Quality-Gates) — Enforce decisions in CI
- [Architecture](Architecture) — How Drift works
