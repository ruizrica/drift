# Getting Started

Get Drift running in your project in under 5 minutes.

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm**, **pnpm**, or **yarn**
- A codebase in any supported language

---

## Installation

### Global Install (Recommended)

Install both the CLI and MCP server:

```bash
# CLI (provides the 'drift' command)
npm install -g driftdetect

# MCP server (provides 'driftdetect-mcp' and 'drift-mcp' commands)
npm install -g driftdetect-mcp
```

### Project Install

```bash
npm install --save-dev driftdetect driftdetect-mcp
```

### Verify Installation

```bash
drift --version
# driftdetect v0.9.27

driftdetect-mcp --help
# Shows MCP server options
```

---

## Initialize Your Project

```bash
cd your-project
drift init
```

This creates the `.drift/` directory with:
- `config.json` — Project configuration
- `patterns/` — Pattern storage (discovered, approved, ignored, variants)
- `history/` — Historical snapshots for trend tracking
- `cache/` — Analysis cache
- `reports/` — Generated reports

**Output:**
```
🔍 Drift - Architectural Drift Detection

✓ Created .drift directory structure
✓ Created config.json

Drift initialized successfully!

Configuration: .drift/config.json
Patterns: .drift/patterns/
Ignore rules: .driftignore

📝 Add to your .gitignore:

  # Drift: ignore caches and temporary data
  .drift/lake/
  .drift/cache/
  .drift/history/
  .drift/call-graph/
  .drift/patterns/discovered/
  .drift/patterns/ignored/
  .drift/patterns/variants/
  ...

✓ Registered as my-project
```

---

## Run Your First Scan

```bash
drift scan
```

Drift will:
1. Detect languages and frameworks in your project
2. Parse all source files with Tree-sitter
3. Build the call graph
4. Run 400+ pattern detectors
5. Store results in `.drift/`

**Output:**
```
🔍 Drift - Enterprise Pattern Scanner

✓ Discovered 245 files
✓ Loaded 156 detectors (400+ available) [4 worker threads]
✓ Analyzed 245 files in 12.34s (127 pattern types, 23 violations)

Patterns detected by category:
  api: 47 occurrences
  auth: 23 occurrences
  errors: 56 occurrences
  data-access: 31 occurrences
  ...

⚠️  23 Violations Found:
  Errors (5):
    src/api/users.ts:45 - Missing error handling in async function
    ...

✓ Saved 89 new patterns (38 already existed)

To review and approve patterns:
  drift status
  drift approve <pattern-id>
```

---

## Review Discovered Patterns

```bash
drift status --detailed
```

**Output:**
```
🔍 Drift - Status

Patterns: 127 total
  Discovered: 127
  Approved: 0
  Ignored: 0

By Category:
  api           23 patterns (18%)
  auth          15 patterns (12%)
  errors        18 patterns (14%)
  data-access   31 patterns (24%)
  components    12 patterns (9%)
  ...

By Confidence:
  High (≥0.85):    89 patterns
  Medium (0.7-0.84): 32 patterns
  Low (<0.7):        6 patterns

Top Patterns:
  1. api-rest-controller (confidence: 0.95, 47 locations)
  2. auth-middleware-pattern (confidence: 0.92, 23 locations)
  3. error-try-catch-pattern (confidence: 0.91, 56 locations)
```

---

## Approve Patterns

Approve patterns that represent "how we do things":

```bash
# Approve a specific pattern
drift approve api-rest-controller

# Approve all patterns in a category
drift approve --category api

# Approve high-confidence patterns
drift approve --min-confidence 0.9
```

Approved patterns become the "golden standard" for your project. Drift will flag code that doesn't follow them.

---

## Connect to AI Agents

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp"
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp"
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP configuration:

```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp"
    }
  }
}
```

### Kiro

Add to `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp",
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

See [[MCP-Setup]] for more options including npx usage and environment variables.

---

## What's Next?

### Explore Your Codebase

```bash
# See patterns in a specific file
drift files src/api/users.ts

# Find where a pattern is used
drift where api-rest-controller

# Analyze call graph
drift callgraph status
```

### Language-Specific Analysis

```bash
# TypeScript/JavaScript
drift ts routes
drift ts components
drift ts hooks

# Python
drift py routes
drift py decorators

# Java
drift java routes
drift java annotations

# And more: drift go, drift rust, drift cpp, drift php
```

### Build Analysis Data

```bash
# Build call graph (for data flow analysis)
drift callgraph build

# Build test topology (for coverage analysis)
drift test-topology build

# Build coupling graph (for dependency analysis)
drift coupling build
```

### Get Recommendations

```bash
# What should I do next?
drift next-steps

# Diagnose issues
drift troubleshoot
```

---

## Typical Workflow

### Daily Development

```bash
# Before starting work
drift status

# After making changes
drift check --staged

# Before committing
drift gate
```

### Code Review

```bash
# Check impact of changes
drift callgraph reach src/api/users.ts

# Find affected tests
drift test-topology affected src/api/users.ts

# Run quality gates
drift gate --policy strict
```

### Onboarding

```bash
# Understand the codebase
drift status --detailed
drift ts routes
drift boundaries overview

# Find patterns for a feature area
drift where --category auth
drift files src/auth/
```

---

## Configuration

Edit `.drift/config.json` to customize:

```json
{
  "version": "2.0.0",
  "project": {
    "id": "uuid",
    "name": "my-project",
    "initializedAt": "2024-01-01T00:00:00.000Z"
  },
  "ignore": [
    "node_modules/**",
    "dist/**",
    "**/*.test.ts"
  ],
  "learning": {
    "autoApproveThreshold": 0.95,
    "minOccurrences": 3
  },
  "features": {
    "callGraph": true,
    "boundaries": true,
    "contracts": true
  }
}
```

See [[Configuration]] for all options.

---

## Troubleshooting

### Scan is slow

```bash
# Use incremental scanning (only changed files)
drift scan --incremental

# Increase timeout (default is 300 seconds / 5 minutes)
drift scan --timeout 600
```

### No patterns found

```bash
# Check if files are being ignored
drift troubleshoot

# Force rescan (ignore cache)
drift scan --force
```

### MCP not connecting

```bash
# Check MCP server
drift troubleshoot

# Test MCP manually
driftdetect-mcp --verbose
```

See [[Troubleshooting]] for more solutions.
