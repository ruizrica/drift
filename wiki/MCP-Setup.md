# MCP Setup

Connect Drift to AI agents via Model Context Protocol (MCP).

---

## ⚡ Quick Setup

```bash
# 1. Install
npm install -g driftdetect driftdetect-mcp

# 2. Scan your project
cd your-project
drift init
drift scan

# 3. Add to your AI tool's config:
```

```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp"
    }
  }
}
```

**4. Restart your AI tool**

**5. Test it:** Ask "What patterns does Drift see in my codebase?"

---

## What is MCP?

MCP (Model Context Protocol) is a standard for connecting AI agents to external tools. Drift's MCP server gives AI agents like Claude, Cursor, Windsurf, and Kiro deep understanding of your codebase.

**With Drift MCP, AI agents can:**
- Understand YOUR patterns and conventions
- Generate code that fits your codebase
- Analyze impact before making changes
- Find security issues and data flows
- Suggest fixes that match your style

---

## Installation

### Step 1: Install Both Packages

```bash
# CLI (for scanning)
npm install -g driftdetect

# MCP server (for AI integration)
npm install -g driftdetect-mcp
```

### Step 2: Scan Your Project

```bash
cd your-project
drift init
drift scan
```

### Step 3: Configure Your AI Tool

Pick your AI tool below:

---

## Claude Desktop

**Config file location:**
- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Add this:**
```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp"
    }
  }
}
```

**Restart Claude Desktop.**

---

## Cursor

**Config file:** `.cursor/mcp.json` in your project folder

**Add this:**
```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp"
    }
  }
}
```

**Restart Cursor.**

---

## Windsurf

**Config:** Settings → MCP Servers

**Add a new server with command:** `driftdetect-mcp`

**Restart Windsurf.**

---

## Kiro

**Config file:** `.kiro/settings/mcp.json` in your project folder

**Add this:**
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

**Restart Kiro.**

---

## VS Code (with MCP extension)

**Config file:** `.vscode/mcp.json` in your project folder

**Add this:**
```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp"
    }
  }
}
```

**Restart VS Code.**

---

## Alternative: npx (No Install)

If you don't want to install globally, use npx:

```json
{
  "mcpServers": {
    "drift": {
      "command": "npx",
      "args": ["-y", "driftdetect-mcp@0.9.39"]
    }
  }
}
```

**Note:** Pin the version to avoid unexpected updates.

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
```

1. AI agent receives your prompt
2. Agent calls Drift MCP tools to understand your codebase
3. Drift returns patterns, examples, and conventions
4. Agent generates code that matches YOUR style

---

## Example Conversation

**You:** "Add a new API endpoint for user preferences"

**AI (via Drift):**
> Based on your codebase patterns:
> - Routes use `@Controller` decorator with `/api/v1` prefix
> - Error responses follow `{ error: string, code: number }` format
> - User endpoints require `@RequireAuth()` middleware
> - Similar endpoints: `src/controllers/user.controller.ts`
>
> Here's the implementation following your conventions...

---

## Available MCP Tools

Drift provides **50 MCP tools** organized in 7 layers:

| Layer | Tools | Purpose |
|-------|-------|---------|
| **Orchestration** | `drift_context`, `drift_package_context` | Start here — curated context |
| **Discovery** | `drift_status`, `drift_capabilities`, `drift_projects` | Quick overview |
| **Surgical** | 12 ultra-focused tools | Precise queries |
| **Exploration** | `drift_patterns_list`, `drift_security_summary`, etc. | Browse patterns |
| **Detail** | `drift_pattern_get`, `drift_code_examples`, etc. | Deep dives |
| **Analysis** | `drift_test_topology`, `drift_coupling`, etc. | Code health |
| **Generation** | `drift_suggest_changes`, `drift_validate_change`, etc. | AI assistance |

→ [Full MCP Tools Reference](MCP-Tools-Reference)

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
```

### MCP Server Options

```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp",
      "env": {
        "DRIFT_PROJECT_PATH": "/path/to/project",
        "DEBUG": "drift:mcp"
      }
    }
  }
}
```

### Command-Line Options

```bash
driftdetect-mcp                    # Use active project
driftdetect-mcp /path/to/project   # Analyze specific project
driftdetect-mcp --no-cache         # Disable response caching
driftdetect-mcp --verbose          # Enable verbose logging
```

---

## Troubleshooting

### MCP server not connecting

1. **Restart your AI client** after config changes
2. **Check the config file path** is correct for your OS
3. **Verify the MCP server runs:**
   ```bash
   driftdetect-mcp --help
   ```

### "Scan required" errors

Run `drift scan` in your project first. The MCP server needs `.drift/` data to work.

### Slow responses

- First call may be slow (loading data)
- Subsequent calls use caching
- For large codebases:
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

Enable debug logging:

```json
{
  "mcpServers": {
    "drift": {
      "command": "driftdetect-mcp",
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

---

## Docker Deployment

Run Drift as a containerized HTTP service:

```bash
# Clone and start
git clone https://github.com/dadbodgeoff/drift.git
cd drift

# Start with your project mounted
PROJECT_PATH=/path/to/your/project docker compose up -d

# Check health
curl http://localhost:3000/health
```

Configure your MCP client to connect via HTTP/SSE:
- SSE endpoint: `http://localhost:3000/sse`
- Message endpoint: `http://localhost:3000/message`
