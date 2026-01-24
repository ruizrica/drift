# Getting Started

Get Drift running in under 2 minutes.

## Installation

```bash
npm install -g driftdetect
```

Or use npx without installing:

```bash
npx driftdetect init
```

## Quick Start

```bash
# Navigate to your project
cd your-project

# Initialize Drift (creates .drift/ directory)
drift init

# Scan your codebase
drift scan

# See what Drift learned
drift status
```

## What Happens During Scan

1. **File Discovery** — Drift finds all source files (respects `.driftignore`)
2. **Pattern Detection** — 150+ detectors analyze your code
3. **Call Graph Building** — Maps function calls and data access
4. **Pattern Storage** — Results saved to `.drift/` directory

## First Scan Output

After scanning, `drift status` shows:

```
Drift Status
============

Patterns: 47 discovered, 0 approved, 0 ignored
Categories: api (12), auth (8), errors (15), data-access (12)
Health Score: 72/100

Run 'drift approve <pattern-id>' to approve patterns
Run 'drift dashboard' to explore in the web UI
```

## Next Steps

1. **Explore patterns**: `drift dashboard` opens a web UI
2. **Approve patterns**: `drift approve <id>` marks patterns as canonical
3. **Connect to AI**: See [MCP Setup](MCP-Setup) to connect to Claude/Cursor
4. **CI integration**: `drift check --ci` fails on violations

## Project Structure

After initialization, Drift creates:

```
your-project/
├── .drift/
│   ├── config.json      # Project configuration
│   ├── patterns/        # Detected patterns by category
│   ├── callgraph/       # Call graph data
│   ├── boundaries/      # Data access boundaries
│   └── views/           # Pre-computed views
└── .driftignore         # Files to exclude from scanning
```

## Ignoring Files

Edit `.driftignore` (same syntax as `.gitignore`):

```
node_modules/
dist/
build/
*.test.ts
*.spec.ts
__tests__/
```

## Troubleshooting First Scan

**Scan takes too long?**
- Check `.driftignore` excludes `node_modules/`, `dist/`
- Try scanning a subdirectory: `drift scan src/`
- Use timeout: `drift scan --timeout 600`

**No patterns found?**
- Ensure you're scanning source files, not just config
- Check language is supported (TS, Python, Java, C#, PHP)
- Run `drift parser --test` to verify parsers work

**Permission errors?**
- Drift needs write access to create `.drift/` directory
- Run in a directory you own
