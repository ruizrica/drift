# Getting Started

Get Drift running in your project in under 5 minutes.

---

## ⚡ Quick Start

```bash
# Install
npm install -g driftdetect

# In your project
cd your-project
drift init
drift scan

# See results
drift status
```

**Done!** Drift now understands your codebase.

---

## Prerequisites

- **Node.js 18+** — [Download here](https://nodejs.org/)
- **npm** — Comes with Node.js

Check your versions:
```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x.x or higher
```

---

## Installation

### Global Install (Recommended)

```bash
# CLI (provides the 'drift' command)
npm install -g driftdetect

# MCP server (for AI integration)
npm install -g driftdetect-mcp
```

### Project Install

```bash
npm install --save-dev driftdetect driftdetect-mcp
```

### Verify Installation

```bash
drift --version
# driftdetect v0.9.40
```

---

## Initialize Your Project

```bash
cd your-project
drift init
```

This creates the `.drift/` directory:

```
.drift/
├── config.json          # Project configuration
├── patterns/            # Pattern storage
│   ├── discovered/      # Auto-discovered patterns
│   ├── approved/        # Patterns you've approved
│   └── ignored/         # Patterns you've ignored
├── lake/                # Analysis data (call graph, etc.)
├── cache/               # Analysis cache
└── history/             # Historical snapshots
```

**Add to `.gitignore`:**
```
# Drift: ignore caches and temporary data
.drift/lake/
.drift/cache/
.drift/history/
.drift/call-graph/
.drift/patterns/discovered/
.drift/patterns/ignored/
.drift/patterns/variants/
```

---

## Run Your First Scan

```bash
drift scan
```

Drift will:
1. Detect languages and frameworks
2. Parse all source files with Tree-sitter
3. Build the call graph
4. Run 400+ pattern detectors
5. Store results in `.drift/`

**Example output:**
```
🔍 Drift - Enterprise Pattern Scanner

✓ Discovered 245 files
✓ Loaded 156 detectors [4 worker threads]
✓ Analyzed 245 files in 12.34s

Patterns detected by category:
  api: 47 occurrences
  auth: 23 occurrences
  errors: 56 occurrences
  data-access: 31 occurrences

✓ Saved 89 new patterns
```

---

## Review What Drift Found

```bash
drift status
```

**Example output:**
```
🔍 Drift - Status

Patterns: 127 total
  Discovered: 127
  Approved: 0
  Ignored: 0

Health Score: 85/100

Languages: TypeScript, Python
Frameworks: Express, Prisma
```

For more detail:
```bash
drift status --detailed
```

---

## Approve Patterns

Approve patterns that represent "how we do things":

```bash
# Approve a specific pattern
drift approve api-rest-controller

# Approve all patterns in a category
drift approve --category api

# Approve high-confidence patterns automatically
drift approve --auto
```

Approved patterns become the "golden standard" for your project.

---

## Connect to AI Agents

### Quick Setup

```bash
npm install -g driftdetect-mcp
```

Add to your AI tool's config:

```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp"
    }
  }
}
```

### Config File Locations

| AI Tool | Config File |
|---------|-------------|
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) |
| **Cursor** | `.cursor/mcp.json` in your project |
| **Windsurf** | Settings → MCP Servers |
| **Kiro** | `.kiro/settings/mcp.json` in your project |
| **VS Code** | `.vscode/mcp.json` in your project |

→ [Full MCP Setup Guide](MCP-Setup)

---

## What's Next?

### Explore Your Codebase

```bash
# See patterns in a specific file
drift files src/api/users.ts

# Find where a pattern is used
drift where api-rest-controller

# Check call graph status
drift callgraph status
```

### Language-Specific Analysis

```bash
# TypeScript/JavaScript
drift ts status
drift ts routes
drift ts components

# Python
drift py status
drift py routes

# Java
drift java status
drift java routes

# And more: drift go, drift rust, drift cpp, drift php, drift wpf
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
    "name": "my-project"
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

→ [Full Configuration Guide](Configuration)

---

## Troubleshooting

### Scan is slow

```bash
# Use incremental scanning
drift scan --incremental

# Increase timeout
drift scan --timeout 600
```

### No patterns found

```bash
# Check if files are being ignored
drift troubleshoot

# Force rescan
drift scan --force
```

### MCP not connecting

```bash
# Check MCP server
drift troubleshoot

# Test MCP manually
driftdetect-mcp --verbose
```

→ [Full Troubleshooting Guide](Troubleshooting)

---

## Upgrade

```bash
# Upgrade to latest
npm install -g driftdetect@latest driftdetect-mcp@latest

# Check versions
drift --version
driftdetect-mcp --version
```
