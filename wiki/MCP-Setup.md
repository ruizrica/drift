# MCP Setup

Connect Drift to AI agents via Model Context Protocol (MCP).

## What is MCP?

MCP (Model Context Protocol) is a standard for connecting AI agents to external tools. Drift's MCP server gives AI agents like Claude, Cursor, Windsurf, and Kiro deep understanding of your codebase.

**With Drift MCP, AI agents can:**
- Understand YOUR patterns and conventions
- Generate code that fits your codebase
- Analyze impact before making changes
- Find security issues and data flows
- Suggest fixes that match your style

---

## Quick Setup

### Recommended: Global Install

For production use, install globally with a pinned version:

```bash
npm install -g driftdetect-mcp@0.9.23
```

Then configure your MCP client to use the installed binary.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

**With global install:**
```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp"
    }
  }
}
```

**With npx (pinned version):**
```json
{
  "mcpServers": {
    "drift": {
      "command": "npx",
      "args": ["-y", "driftdetect-mcp@0.9.23"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json`):

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

### VS Code (with MCP extension)

Add to your VS Code MCP settings:

```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp"
    }
  }
}
```

---

## Initialize Your Project

Before the MCP server can help, scan your project:

```bash
cd your-project
drift init
drift scan
```

For advanced analysis, also build:

```bash
drift test-topology build
drift coupling build
drift error-handling build
```

---

## Verify Connection

Ask your AI agent:

> "What patterns does Drift see in this codebase?"

If connected, it will call `drift_status` and show your pattern summary.

---

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Agent      │────▶│   Drift MCP     │────▶│   Your Code     │
│ (Claude, etc.)  │◀────│    Server       │◀────│   (.drift/)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │  "Add auth endpoint"  │
        │                       │
        ▼                       ▼
   AI understands          Drift returns
   YOUR patterns           patterns, examples,
   and conventions         and guidance
```

1. AI agent receives your prompt
2. Agent calls Drift MCP tools to understand your codebase
3. Drift returns patterns, examples, and conventions
4. Agent generates code that matches YOUR style

---

## Example Conversation

**You**: "Add a new API endpoint for user preferences"

**AI (via Drift)**:
> Based on your codebase patterns:
> - Routes use `@Controller` decorator with `/api/v1` prefix
> - Error responses follow `{ error: string, code: number }` format
> - User endpoints require `@RequireAuth()` middleware
> - Similar endpoints: `src/controllers/user.controller.ts`
>
> Here's the implementation following your conventions...

---

## Available MCP Tools

Drift provides **45+ MCP tools** organized in 7 layers:

| Layer | Tools | Purpose |
|-------|-------|---------|
| **Orchestration** | `drift_context`, `drift_package_context` | Start here — curated context |
| **Discovery** | `drift_status`, `drift_capabilities`, `drift_projects` | Quick overview |
| **Surgical** | 12 ultra-focused tools | Precise queries |
| **Exploration** | `drift_patterns_list`, `drift_security_summary`, etc. | Browse patterns |
| **Detail** | `drift_pattern_get`, `drift_code_examples`, etc. | Deep dives |
| **Analysis** | `drift_test_topology`, `drift_coupling`, etc. | Code health |
| **Generation** | `drift_suggest_changes`, `drift_validate_change`, etc. | AI assistance |

See [MCP Tools Reference](MCP-Tools-Reference) for full documentation.

### Key Tools

| Tool | When to Use |
|------|-------------|
| `drift_context` | Starting any task — returns curated context |
| `drift_status` | Quick health check |
| `drift_code_examples` | Need real examples from your code |
| `drift_impact_analysis` | Before making changes |
| `drift_validate_change` | After generating code |

---

## Multi-Project Support

Work across multiple codebases:

```bash
# Register projects
drift projects add ~/code/backend
drift projects add ~/code/frontend

# List registered projects
drift projects list

# Switch active project
drift projects switch backend
```

The MCP server can query any registered project using the `project` parameter:

```json
{
  "intent": "add_feature",
  "focus": "authentication",
  "project": "backend"
}
```

---

## Configuration Options

### Environment Variables

```bash
# Set project path
export DRIFT_PROJECT_PATH=/path/to/project

# Enable debug logging
export DEBUG=drift:*

# Set cache directory
export DRIFT_CACHE_DIR=/path/to/cache
```

### MCP Server Options

```json
{
  "mcpServers": {
    "drift": {
      "command": "npx",
      "args": ["-y", "driftdetect-mcp"],
      "env": {
        "DRIFT_PROJECT_PATH": "/path/to/project",
        "DEBUG": "drift:mcp"
      }
    }
  }
}
```

---

## Troubleshooting

### MCP server not connecting

1. Restart your AI client after config changes
2. Check the config file path is correct for your OS
3. Verify the MCP server runs without errors:
   ```bash
   driftdetect-mcp --help
   # or with npx:
   npx driftdetect-mcp@0.9.23 --help
   ```

### "Scan required" errors

Run `drift scan` in your project first. The MCP server needs `.drift/` data to work.

### Slow responses

- First call may be slow (loading data)
- Subsequent calls use caching
- For large codebases, use incremental scans:
  ```bash
  drift scan --incremental
  ```

### Analysis tools return empty results

Some tools require pre-built data:

```bash
drift test-topology build
drift coupling build
drift error-handling build
```

### Wrong project being analyzed

Check which project is active:

```bash
drift projects list
drift projects switch <project-name>
```

### Debug mode

Enable debug logging to see what's happening:

```json
{
  "mcpServers": {
    "drift": {
      "command": "npx",
      "args": ["-y", "driftdetect-mcp@0.9.23"],
      "env": {
        "DEBUG": "drift:*"
      }
    }
  }
}
```

---

## Best Practices

1. **Scan regularly** — Run `drift scan` after significant changes
2. **Approve patterns** — Approved patterns give better recommendations
3. **Use `drift_context`** — Start with this tool for most tasks
4. **Build analysis data** — Run build commands for full analysis
5. **Register all projects** — Multi-project support helps with monorepos
