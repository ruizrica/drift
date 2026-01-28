# Watch Mode

Drift's watch mode provides real-time pattern detection as you edit files, with automatic persistence to the pattern store.

## Overview

Watch mode:
- Monitors file changes in real-time
- Detects patterns and violations instantly
- Persists patterns to the `.drift` store
- Supports debouncing and filtering
- Provides live feedback during development

---

## Quick Start

```bash
# Start watching
drift watch

# With verbose output
drift watch --verbose

# Filter by categories
drift watch --categories api,auth,errors

# Custom debounce delay
drift watch --debounce 500

# Without persistence (violations only)
drift watch --no-persist
```

---

## Command Options

```bash
drift watch [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--verbose` | Show detailed output | false |
| `--context <file>` | Auto-update AI context file | none |
| `-c, --categories <list>` | Filter by categories (comma-separated) | all |
| `--debounce <ms>` | Debounce delay in milliseconds | 300 |
| `--no-persist` | Disable pattern persistence | false |

---

## Output

```
🔍 Drift Watch Mode

  Watching: /Users/dev/my-project
  Categories: api, auth, errors
  Debounce: 300ms
  Persistence: enabled

  Press Ctrl+C to stop

──────────────────────────────────────────────────
[10:23:45] Loaded 847 existing patterns
[10:23:45] Loaded 156 detectors
[10:23:45] Watching for changes...

[10:24:12] ✓ src/api/users.ts (3 patterns)
[10:24:18] ✗ src/services/payment.ts - 1 error, 2 warnings
    ● Line 45: Missing error handling for external API call
    ● Line 67: Bare catch clause
    ● Line 89: Swallowed error
[10:24:25] ✓ src/hooks/useAuth.ts (2 patterns)
[10:24:31] Deleted: src/old-file.ts
[10:24:45] Saved patterns to disk
```

---

## How It Works

### 1. File Watching

Watch mode uses native file system events to detect changes:

```
File Change Event
       │
       ▼
┌─────────────────┐
│   Debounce      │  Wait for typing to stop
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Hash Check     │  Skip if content unchanged
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Pattern Detect  │  Run all applicable detectors
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store Update   │  Merge patterns into store
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Console Output │  Show results
└─────────────────┘
```

### 2. Smart Merging

When a file changes, watch mode:
1. Removes old patterns from that file
2. Detects new patterns
3. Merges into existing pattern store
4. Preserves patterns from other files

### 3. File Tracking

Watch mode maintains a file map (`.drift/index/file-map.json`) that tracks:
- Last scan timestamp
- Content hash
- Pattern IDs found in file

This enables:
- Skipping unchanged files
- Efficient incremental updates
- Clean removal when files are deleted

---

## Supported File Types

| Extension | Language |
|-----------|----------|
| `.ts`, `.tsx` | TypeScript |
| `.js`, `.jsx` | JavaScript |
| `.py` | Python |
| `.cs` | C# |
| `.css`, `.scss` | CSS |
| `.json` | JSON |
| `.md` | Markdown |

---

## Ignored Paths

Watch mode automatically ignores:
- `node_modules/`
- `.git/`
- `dist/`
- `build/`
- `coverage/`
- `.turbo/`
- `.drift/`

---

## AI Context File

Use `--context` to maintain an auto-updated context file for AI assistants:

```bash
drift watch --context .drift/CONTEXT.md
```

This creates a file that's updated on every change:

```markdown
# Drift Context (Auto-updated)

Last updated: 2024-01-15T10:24:45.000Z

## Current Stats
- Patterns tracked: 847
- Active violations: 23

This file is auto-updated by `drift watch`.
Run `drift export --format ai-context` for full pattern details.

## Quick Commands
- `drift where <pattern>` - Find pattern locations
- `drift files <path>` - See patterns in a specific file
- `drift status` - View pattern summary
- `drift dashboard` - Open web UI
```

---

## Persistence

### With Persistence (default)

Patterns are saved to `.drift/patterns/`:

```bash
drift watch
# Patterns persist across sessions
# Full scan not needed after restart
```

### Without Persistence

Only show violations, don't save patterns:

```bash
drift watch --no-persist
# Useful for quick feedback during development
# Patterns not saved to disk
```

---

## File Locking

Watch mode uses file locking to prevent conflicts:

- Lock file: `.drift/index/.lock`
- Timeout: 10 seconds
- Automatic cleanup on exit

This ensures safe concurrent access when:
- Multiple watch processes run
- CLI commands run during watch
- MCP server accesses patterns

---

## Category Filtering

Filter which patterns to detect:

```bash
# Only API and auth patterns
drift watch --categories api,auth

# Only error patterns
drift watch --categories errors

# Multiple categories
drift watch --categories api,auth,security,errors
```

Available categories:
- `api` — API patterns
- `auth` — Authentication
- `security` — Security patterns
- `errors` — Error handling
- `logging` — Logging patterns
- `testing` — Test patterns
- `data-access` — Database patterns
- `config` — Configuration
- `types` — Type patterns
- `structural` — Code structure
- `components` — UI components
- `styling` — CSS/styling
- `accessibility` — A11y patterns
- `documentation` — Doc patterns
- `performance` — Performance

---

## Debouncing

Debounce prevents excessive scanning during rapid edits:

```bash
# Default: 300ms
drift watch

# Faster feedback (may increase CPU)
drift watch --debounce 100

# Slower, more efficient
drift watch --debounce 1000
```

**Recommendation:**
- Fast typing: 300-500ms
- Slow saves: 100-200ms
- Large files: 500-1000ms

---

## Use Cases

### 1. Development Feedback

Get instant feedback while coding:

```bash
drift watch --verbose
```

### 2. CI/CD Integration

Run watch in CI for incremental checks:

```bash
# In CI script
timeout 60 drift watch --no-persist &
# Run tests
npm test
# Watch catches pattern violations during tests
```

### 3. AI-Assisted Development

Keep AI context updated:

```bash
drift watch --context .cursor/drift-context.md
```

### 4. Team Development

Multiple developers can run watch simultaneously (file locking prevents conflicts).

---

## Troubleshooting

### High CPU Usage

```bash
# Increase debounce
drift watch --debounce 1000

# Filter categories
drift watch --categories api,auth
```

### Missing Patterns

```bash
# Check if file type is supported
drift watch --verbose

# Ensure file isn't in ignored paths
```

### Lock Conflicts

```bash
# If lock file is stale, remove it
rm .drift/index/.lock

# Or wait for timeout (10 seconds)
```

### Patterns Not Saving

```bash
# Ensure persistence is enabled
drift watch  # Not --no-persist

# Check disk space
df -h

# Check permissions
ls -la .drift/
```

---

## Integration

### With Dashboard

View watch results in real-time:

```bash
# Terminal 1
drift watch

# Terminal 2
drift dashboard
# Dashboard updates as patterns change
```

### With MCP Server

Watch mode and MCP server can run simultaneously:

```bash
# Terminal 1
drift watch

# Terminal 2 (or in IDE)
# MCP server reads patterns updated by watch
```

### With Git Hooks

Combine with pre-commit:

```bash
# .husky/pre-commit
drift watch --no-persist &
WATCH_PID=$!
npm test
kill $WATCH_PID
```

---

## Next Steps

- [Incremental Scans](Incremental-Scans) — Efficient re-scanning
- [Dashboard](Dashboard) — Visual pattern monitoring
- [Quality Gates](Quality-Gates) — CI/CD integration
