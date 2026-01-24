# MCP Setup

Connect Drift to AI agents via Model Context Protocol (MCP).

## What is MCP?

MCP (Model Context Protocol) is a standard for connecting AI agents to external tools. Drift's MCP server gives AI agents like Claude, Cursor, and Windsurf deep understanding of your codebase.

## Quick Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "drift": {
      "command": "npx",
      "args": ["-y", "driftdetect-mcp"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "drift": {
      "command": "npx",
      "args": ["-y", "driftdetect-mcp"]
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
      "command": "npx",
      "args": ["-y", "driftdetect-mcp"]
    }
  }
}
```

## Initialize Your Project

Before the MCP server can help, scan your project:

```bash
cd your-project
drift init
drift scan
```

## Verify Connection

Ask your AI agent:

> "What patterns does Drift see in this codebase?"

If connected, it will call `drift_status` and show your pattern summary.

## How It Works

1. AI agent receives your prompt
2. Agent calls Drift MCP tools to understand your codebase
3. Drift returns patterns, examples, and conventions
4. Agent generates code that matches YOUR style

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

## Available MCP Tools

Drift provides 23 MCP tools organized in layers:

| Layer | Tools | Purpose |
|-------|-------|---------|
| Orchestration | `drift_context` | Intent-aware context (start here) |
| Discovery | `drift_status`, `drift_capabilities`, `drift_projects` | Quick overview |
| Exploration | `drift_patterns_list`, `drift_security_summary`, `drift_contracts_list`, `drift_trends` | Browse patterns |
| Detail | `drift_pattern_get`, `drift_code_examples`, `drift_file_patterns`, `drift_impact_analysis`, `drift_reachability` | Deep dives |
| Analysis | `drift_test_topology`, `drift_coupling`, `drift_error_handling` | Code health |
| Generation | `drift_suggest_changes`, `drift_validate_change`, `drift_explain` | AI assistance |

See [MCP Tools Reference](MCP-Tools-Reference) for full documentation.

## Multi-Project Support

Work across multiple codebases:

```bash
# Register projects
drift projects add ~/code/backend
drift projects add ~/code/frontend

# Switch active project
drift projects switch backend
```

The MCP server can query any registered project using the `project` parameter.

## Troubleshooting

**MCP server not connecting?**
- Restart your AI client after config changes
- Check the config file path is correct for your OS
- Verify `npx driftdetect-mcp` runs without errors

**"Scan required" errors?**
- Run `drift scan` in your project first
- The MCP server needs `.drift/` data to work

**Slow responses?**
- First call may be slow (loading data)
- Subsequent calls use caching
- Large codebases may need `drift scan --incremental`
