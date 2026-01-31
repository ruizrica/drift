# Getting Started

Get Drift running and understanding your codebase in under 5 minutes.

---

## ⚡ Quick Start (30 Seconds)

```bash
# Install globally
npm install -g driftdetect

# Run the guided setup wizard
cd your-project
drift setup

# See what Drift discovered
drift status
```

**That's it.** Drift now understands your codebase patterns, conventions, and architecture.

The setup wizard walks you through:
- ✅ Initializing Drift
- ✅ Scanning for patterns  
- ✅ Auto-approving high-confidence patterns
- ✅ Building call graph (optional)
- ✅ Setting up test topology (optional)
- ✅ Initializing Cortex memory (optional)

**Quick setup (skip prompts):**
```bash
drift setup -y
```

---

## 📋 Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | 18.0.0+ | `node --version` |
| npm | 9.0.0+ | `npm --version` |
| pnpm (optional) | 8.0.0+ | `pnpm --version` |

```bash
# Verify your environment
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x.x or higher
```

---

## 🔧 Installation Options

### Option 1: Global Install (Recommended)

```bash
# CLI tool (provides the 'drift' command)
npm install -g driftdetect

# MCP server (for AI agent integration)
npm install -g driftdetect-mcp

# Verify installation
drift --version
# Output: driftdetect v0.9.40
```

### Option 2: Project-Local Install

```bash
# Add as dev dependencies
npm install --save-dev driftdetect driftdetect-mcp

# Run via npx
npx drift --version
```

### Option 3: From Source (Development)

```bash
git clone https://github.com/dadbodgeoff/drift.git
cd drift
pnpm install
pnpm build

# Run locally
node packages/cli/dist/bin/drift.js --version
```

---

## 🚀 Initialize Your Project

### Option A: Guided Setup (Recommended)

```bash
cd your-project
drift setup
```

The setup wizard guides you through all features and lets you choose what to enable.

### Option B: Manual Setup

```bash
cd your-project
drift init
drift scan
drift approve --auto  # Auto-approve high-confidence patterns
```

This creates the `.drift/` directory structure:

```
.drift/
├── config.json              # Project configuration
├── manifest.json            # Analysis manifest
├── patterns/
│   ├── discovered/          # Auto-discovered patterns
│   ├── approved/            # Patterns you've approved
│   └── ignored/             # Patterns you've ignored
├── lake/                    # Analysis data lake
│   ├── callgraph/           # Function call relationships
│   ├── patterns/            # Pattern instances
│   └── security/            # Security analysis data
├── indexes/                 # Fast lookup indexes
├── cache/                   # Analysis cache
├── history/                 # Historical snapshots
└── memory/                  # Cortex memory database (if initialized)
```

### Recommended .gitignore Additions

```gitignore
# Drift: Commit approved patterns, ignore transient data
.drift/lake/
.drift/cache/
.drift/history/
.drift/call-graph/
.drift/patterns/discovered/
.drift/patterns/ignored/
.drift/patterns/variants/
.drift/indexes/
.drift/memory/

# Keep these in version control:
# .drift/config.json
# .drift/patterns/approved/
# .drift/constraints/approved/
```

---

## 🔍 Run Your First Scan

```bash
drift scan
```

**What happens during a scan:**

1. **Language Detection** — Identifies TypeScript, Python, Java, C#, PHP, Go, Rust, C++
2. **Framework Detection** — Recognizes Express, NestJS, Spring Boot, Laravel, FastAPI, etc.
3. **Tree-sitter Parsing** — Builds AST for all source files
4. **Pattern Detection** — Runs 400+ detectors across 15 categories
5. **Call Graph Building** — Maps function calls and data flow
6. **Security Analysis** — Identifies sensitive data access patterns
7. **Storage** — Persists results to `.drift/` directory

**Example output:**

```
🔍 Drift - Enterprise Pattern Scanner

✓ Discovered 1,245 files
✓ Loaded 156 detectors [4 worker threads]
✓ Analyzed 1,245 files in 23.45s

Patterns detected by category:
  api:          147 occurrences
  auth:          89 occurrences
  errors:       234 occurrences
  data-access:  156 occurrences
  security:      78 occurrences
  testing:      112 occurrences

✓ Saved 312 new patterns
✓ Call graph: 2,847 functions, 8,234 call sites
```

### Scan Options

```bash
# Incremental scan (only changed files)
drift scan --incremental

# Generate manifest file
drift scan --manifest

# Include contract detection
drift scan --contracts

# Include boundary analysis
drift scan --boundaries

# Set timeout (milliseconds)
drift scan --timeout 120000
```

---

## 📊 Review Results

### Quick Status

```bash
drift status
```

**Example output:**

```
🔍 Drift - Status

✔ Patterns loaded

Pattern Summary
┌─────────────────────────┬───────────────┐
│ Metric                  │         Count │
├─────────────────────────┼───────────────┤
│ Total Patterns          │           312 │
│   Approved              │             0 │
│   Discovered            │           312 │
│   Ignored               │             0 │
├─────────────────────────┼───────────────┤
│ Total Violations        │             0 │
└─────────────────────────┴───────────────┘

Health Score: 85/100

By Category
┌─────────────────────────┬────────────┬────────────┬────────────┐
│ Category                │   Patterns │ Violations │   Coverage │
├─────────────────────────┼────────────┼────────────┼────────────┤
│ api                     │        147 │          0 │        88% │
│ auth                    │         89 │          0 │        76% │
│ errors                  │        234 │          0 │        75% │
│ data-access             │        156 │          0 │        73% │
└─────────────────────────┴────────────┴────────────┴────────────┘
```

### Detailed Status

```bash
drift status --detailed
```

### Language-Specific Analysis

```bash
# TypeScript/JavaScript projects
drift ts status
drift ts routes          # List HTTP routes
drift ts components      # List React components
drift ts hooks           # Analyze React hooks

# Python projects
drift py status
drift py routes          # List Flask/FastAPI/Django routes

# Java projects
drift java status
drift java routes        # List Spring/JAX-RS routes

# Other languages
drift go status          # Go projects
drift rust status        # Rust projects
drift php status         # PHP/Laravel projects
drift cpp status         # C++ projects
drift wpf status         # WPF/C# projects
```

---

## ✅ Approve Patterns

Approved patterns become the "golden standard" for your project. AI agents and quality gates use approved patterns to ensure consistency.

```bash
# Approve a specific pattern by ID
drift approve api-rest-controller-abc123

# Approve all patterns in a category
drift approve --category api

# Auto-approve high-confidence patterns (>95%)
drift approve --auto

# Skip confirmation prompts
drift approve api-rest-controller-abc123 --yes
```

### Finding Pattern IDs

```bash
# List patterns with IDs
drift where --category api

# Show patterns in a specific file
drift files src/api/users.ts
```

---

## 🤖 Connect to AI Agents

### Quick MCP Setup

```bash
# Install MCP server globally
npm install -g driftdetect-mcp
```

Add to your AI tool's MCP configuration:

```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp"
    }
  }
}
```

### Configuration File Locations

| AI Tool | Config File Location |
|---------|---------------------|
| **Claude Desktop (Mac)** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Claude Desktop (Windows)** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Cursor** | `.cursor/mcp.json` (project root) |
| **Windsurf** | Settings → MCP Servers |
| **Kiro** | `.kiro/settings/mcp.json` (project root) |
| **VS Code** | `.vscode/mcp.json` (project root) |

→ [Full MCP Setup Guide](MCP-Setup)

---

## 🧠 Initialize Memory System (Optional)

Replace static `AGENTS.md` files with living memory:

```bash
# Initialize Cortex memory
drift memory init

# Add institutional knowledge
drift memory add tribal "Always use bcrypt for passwords" --importance critical
drift memory add tribal "Services should not call controllers" --topic Architecture

# Check memory status
drift memory status
```

→ [Cortex V2 Overview](Cortex-V2-Overview) | [Memory CLI Reference](Memory-CLI)

---

## 📈 Build Analysis Data

For deeper analysis capabilities, build additional data structures:

```bash
# Build call graph (required for impact analysis)
drift callgraph build

# Build test topology (required for coverage analysis)
drift test-topology build

# Build coupling graph (required for dependency analysis)
drift coupling build
```

---

## 🔄 Typical Workflows

### Daily Development

```bash
# Morning: Check project status
drift status

# Before committing: Check staged files
drift check --staged

# Before PR: Run quality gates
drift gate
```

### Code Review

```bash
# Understand impact of changes
drift callgraph reach src/api/users.ts

# Find affected tests
drift test-topology affected src/api/users.ts

# Run strict quality gates
drift gate --policy strict
```

### Onboarding New Team Members

```bash
# Understand the codebase
drift status --detailed

# See API routes
drift ts routes

# See data access patterns
drift boundaries overview

# Get context for a feature area
drift memory why "authentication"
```

---

## ⚙️ Configuration

Edit `.drift/config.json` to customize behavior:

```json
{
  "version": "2.0.0",
  "project": {
    "id": "uuid-here",
    "name": "my-project"
  },
  "ignore": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "**/*.test.ts",
    "**/*.spec.ts"
  ],
  "learning": {
    "autoApproveThreshold": 0.95,
    "minOccurrences": 3
  },
  "features": {
    "callGraph": true,
    "boundaries": true,
    "contracts": true,
    "testTopology": true
  },
  "scan": {
    "timeout": 120000,
    "workers": 4
  }
}
```

→ [Full Configuration Guide](Configuration)

---

## 🔧 Troubleshooting

### Common Issues

```bash
# Diagnose issues automatically
drift troubleshoot

# Get personalized recommendations
drift next-steps
```

### Scan is Slow

```bash
# Use incremental scanning
drift scan --incremental

# Increase timeout
drift scan --timeout 300000

# Check what's being scanned
drift troubleshoot -v
```

### No Patterns Found

```bash
# Check if files are being ignored
drift troubleshoot

# Force full rescan
drift scan --force

# Check parser status
drift parser
```

### MCP Not Connecting

```bash
# Test MCP server directly
driftdetect-mcp --verbose

# Check configuration
drift troubleshoot
```

→ [Full Troubleshooting Guide](Troubleshooting)

---

## 🔄 Upgrading

```bash
# Upgrade to latest version
npm install -g driftdetect@latest driftdetect-mcp@latest

# Verify versions
drift --version
driftdetect-mcp --version

# Check for storage migrations
drift migrate-storage status
```

---

## 📚 Next Steps

| Goal | Command | Documentation |
|------|---------|---------------|
| Connect AI agents | `npm install -g driftdetect-mcp` | [MCP Setup](MCP-Setup) |
| Add team knowledge | `drift memory init` | [Memory CLI](Memory-CLI) |
| Analyze call graph | `drift callgraph build` | [Call Graph Analysis](Call-Graph-Analysis) |
| Set up CI/CD | `drift gate --ci` | [Quality Gates](Quality-Gates) |
| Explore patterns | `drift where --category api` | [Pattern Categories](Pattern-Categories) |

---

## 🔗 Related Documentation

- [Home](Home) — Project overview
- [Configuration](Configuration) — Full configuration reference
- [CLI Reference](CLI-Reference) — All 60+ CLI commands
- [MCP Tools Reference](MCP-Tools-Reference) — All 50+ MCP tools
- [Architecture](Architecture) — How Drift works under the hood
