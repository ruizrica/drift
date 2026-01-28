# Drift — Codebase Intelligence for AI Agents

**The most comprehensive MCP server for codebase intelligence**

Drift scans your codebase, learns YOUR patterns, and gives AI agents deep understanding of your conventions. 45+ CLI commands. 50 MCP tools. 9 languages. Your AI finally writes code that fits.

---

## The Problem

AI writes code that works but doesn't fit. It ignores your conventions, misses your patterns, and creates inconsistency. You spend more time fixing AI output than you saved.

**Drift fixes this.**

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR CODEBASE                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        1. DRIFT SCAN                             │
│   $ drift init && drift scan                                     │
│   Analyzes code with Tree-sitter parsing:                        │
│   • Discovers patterns (how YOU write code)                      │
│   • Builds call graph (who calls what, data flow)                │
│   • Maps security boundaries (sensitive data access)             │
│   • Tracks test coverage (which code is tested)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      2. PATTERN LEARNING                         │
│   Drift discovers YOUR conventions:                              │
│   • API patterns (routes, middleware, response format)           │
│   • Auth patterns (decorators, guards, middleware)               │
│   • Error patterns (try/catch, Result types, boundaries)         │
│   You approve what matters: $ drift approve <pattern-id>         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      3. AI GETS CONTEXT                          │
│   drift_context({ intent: "add_feature", focus: "auth" })        │
│   Returns:                                                       │
│   • Your patterns with examples                                  │
│   • Similar code in your codebase                                │
│   • Files to modify                                              │
│   • Security warnings                                            │
│   • Constraints to satisfy                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   4. AI WRITES FITTING CODE                      │
│   Generated code matches YOUR patterns automatically             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Install globally (CLI + MCP server)
npm install -g driftdetect driftdetect-mcp

# Initialize in your project
cd your-project
drift init

# Scan for patterns
drift scan

# See what was discovered
drift status --detailed

# Approve patterns that represent "how we do things"
drift approve <pattern-id>
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Pattern Detection** | 400+ detectors across 15 categories |
| **Multi-Language** | TypeScript, Python, Java, C#, PHP, Go, Rust, C++, WPF |
| **Call Graph** | Complete function call mapping with data flow |
| **Security Analysis** | Sensitive data tracking and boundary enforcement |
| **Test Topology** | Test-to-code mapping and coverage analysis |
| **Coupling Analysis** | Dependency cycles and refactoring opportunities |
| **Quality Gates** | CI/CD integration with pattern compliance |
| **MCP Server** | 50 tools for AI agent integration |
| **CLI** | 45+ commands for analysis and management |
| **Styling DNA** | Component styling pattern analysis |

---

## Documentation

### Getting Started
- [[Getting-Started]] — Installation and first scan
- [[Configuration]] — Project configuration options
- [[MCP-Setup]] — Connect to Claude, Cursor, Windsurf, Kiro
- [[Dashboard]] — Web visualization

### Core Concepts
- [[Architecture]] — How Drift works under the hood
- [[Pattern-Categories]] — The 15 pattern categories
- [[Detectors-Deep-Dive]] — 400+ detectors explained
- [[Language-Support]] — Supported languages and frameworks
- [[Skills]] — 72 implementation guides for AI agents

### Analysis Features
- [[Call-Graph-Analysis]] — Data flow and reachability
- [[Impact-Analysis]] — Understand blast radius of changes
- [[Security-Analysis]] — Sensitive data tracking
- [[Data-Boundaries]] — Data access enforcement
- [[Test-Topology]] — Test coverage mapping
- [[Coupling-Analysis]] — Dependency analysis
- [[Error-Handling-Analysis]] — Error handling gaps and boundaries
- [[Wrappers-Detection]] — Framework wrapper patterns
- [[Environment-Variables]] — Env var analysis
- [[Constants-Analysis]] — Constants and magic numbers
- [[Styling-DNA]] — Component styling patterns

### AI Tools
- [[Code-Examples]] — Get real code snippets
- [[Similar-Code]] — Find semantically similar code
- [[Explain-Tool]] — Comprehensive code explanation
- [[Suggest-Changes]] — AI-guided fix suggestions
- [[Validate-Change]] — Pre-commit validation
- [[AI-Navigation-Guide]] — Tool selection decision tree

### Advanced Features
- [[Constraints]] — Architectural invariants
- [[Contracts]] — API contract verification
- [[Decision-Mining]] — ADRs from git history
- [[Speculative-Execution]] — Simulate before coding
- [[Watch-Mode]] — Real-time pattern detection
- [[Trends-Analysis]] — Pattern regressions and improvements
- [[Projects-Management]] — Multi-project registry
- [[Package-Context]] — Monorepo package context
- [[Monorepo-Support]] — Working with monorepos
- [[Reports-Export]] — Generate reports and export data

### Reference
- [[CLI-Reference]] — All 45+ CLI commands
- [[MCP-Tools-Reference]] — All 50 MCP tools
- [[MCP-Architecture]] — The 7-layer tool design
- [[Quality-Gates]] — CI/CD integration

### CI/CD
- [[Incremental-Scans]] — Efficient re-scanning
- [[CI-Integration]] — GitHub/GitLab setup
- [[Git-Hooks]] — Pre-commit integration

### Community
- [[Contributing]] — How to contribute
- [[Troubleshooting]] — Common issues and fixes
- [[FAQ]] — Frequently asked questions

---

## Architecture Overview

Drift is a **monorepo** with 10 packages:

| Package | Purpose |
|---------|---------|
| `@drift/core` | Multi-language analysis engine |
| `@drift/detectors` | 400+ pattern detectors |
| `@drift/cli` | Command-line interface |
| `@drift/mcp` | MCP server for AI agents |
| `@drift/lsp` | Language Server Protocol |
| `@drift/dashboard` | Web dashboard |
| `@drift/vscode` | VS Code extension |
| `@drift/ai` | AI integration module |
| `@drift/galaxy` | 3D visualization |

---

## License

Apache 2.0 — Free for commercial use.

---

## Links

- [GitHub Repository](https://github.com/your-org/drift)
- [npm Package](https://www.npmjs.com/package/driftdetect)
- [Discord Community](https://discord.gg/drift)
