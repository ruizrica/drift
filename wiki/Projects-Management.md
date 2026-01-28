# Projects Management

Drift maintains a registry of projects, allowing you to manage multiple codebases from a central location.

## Overview

The project registry:
- Tracks all drift-initialized projects
- Enables quick switching between projects
- Stores project metadata and health status
- Supports filtering and searching

---

## Quick Start

```bash
# List all projects
drift projects list

# Switch to a project
drift projects switch my-api

# Add current directory
drift projects add

# View project details
drift projects info

# Remove invalid projects
drift projects cleanup
```

---

## Commands

### List Projects

```bash
drift projects list [options]
```

**Options:**
- `-a, --all` — Include invalid projects
- `--json` — Output as JSON
- `-l, --language <lang>` — Filter by language
- `-f, --framework <framework>` — Filter by framework
- `-t, --tag <tag>` — Filter by tag

**Output:**
```
📁 Registered Projects (5)

  Status  Name                 Language     Framework    Last Used      Path
  ──────────────────────────────────────────────────────────────────────────────────────────
▶ ●       my-api               typescript   express      today          ~/projects/my-api
  ●       frontend-app         typescript   react        yesterday      ~/projects/frontend
  ●       data-service         python       fastapi      3 days ago     ~/projects/data-svc
  ○       old-project          javascript   express      2 months ago   ~/projects/old
  ✗       deleted-project      typescript   nestjs       1 year ago     ~/projects/deleted

Active: my-api (~/projects/my-api)
```

**Legend:**
- `▶` — Active project
- `●` — Healthy
- `○` — Warning (needs attention)
- `✗` — Invalid (path doesn't exist)

### Switch Project

```bash
drift projects switch [name-or-path]
```

Switch the active project context:

```bash
# By name
drift projects switch my-api

# By path
drift projects switch ~/projects/frontend

# Interactive selection
drift projects switch
# Shows selection menu
```

### Add Project

```bash
drift projects add [path] [options]
```

Register a project in the registry:

**Options:**
- `-n, --name <name>` — Project name
- `-d, --description <desc>` — Project description
- `-t, --tags <tags>` — Comma-separated tags

```bash
# Add current directory
drift projects add

# Add specific path
drift projects add ~/projects/new-api

# With metadata
drift projects add --name "Payment API" --tags "api,payments,critical"
```

### Remove Project

```bash
drift projects remove [name-or-path]
```

Remove a project from the registry (doesn't delete files):

```bash
# By name
drift projects remove old-project

# Interactive selection
drift projects remove
```

### Project Info

```bash
drift projects info [name-or-path]
```

View detailed project information:

```bash
drift projects info my-api
```

**Output:**
```
📁 my-api (active)

  ID:          a1b2c3d4
  Path:        /Users/dev/projects/my-api
  Language:    typescript
  Framework:   express
  Registered:  3 months ago
  Last Used:   today
  Description: Main API service
  Tags:        api, backend, critical
  Git Remote:  git@github.com:org/my-api.git

  Patterns:
    Discovered: 234
    Approved:   189
    Ignored:    12

  Health:      92%

  Valid:       Yes
```

### Cleanup

```bash
drift projects cleanup
```

Remove invalid projects (paths that no longer exist):

```bash
drift projects cleanup
```

**Output:**
```
Validating projects...
Found 2 invalid project(s)
  ✗ deleted-project - /Users/dev/projects/deleted
  ✗ old-backup - /Users/dev/backup/old

Remove 2 invalid project(s) from registry? (y/N) y
Removed 2 project(s)
```

### Rename Project

```bash
drift projects rename [name]
```

Rename the active project:

```bash
drift projects rename "Payment Service"
```

---

## MCP Tool

### drift_projects

```typescript
drift_projects({
  action: "list" | "info" | "switch" | "recent" | "register",
  project?: string,      // Project name or ID (for info/switch)
  path?: string,         // Project path (for register)
  language?: string,     // Filter by language (for list)
  framework?: string,    // Filter by framework (for list)
  limit?: number         // Limit results (default: 10)
})
```

**Actions:**
- `list` — List all registered projects
- `info` — Get project details
- `switch` — Change active project
- `recent` — Show recently used projects
- `register` — Add a new project

---

## Project Registry

### Location

The registry is stored at:
- **macOS/Linux:** `~/.drift/projects.json`
- **Windows:** `%USERPROFILE%\.drift\projects.json`

### Structure

```json
{
  "version": "1.0.0",
  "activeId": "a1b2c3d4",
  "projects": [
    {
      "id": "a1b2c3d4",
      "name": "my-api",
      "path": "/Users/dev/projects/my-api",
      "language": "typescript",
      "framework": "express",
      "registeredAt": "2024-01-01T00:00:00.000Z",
      "lastAccessedAt": "2024-01-15T10:30:00.000Z",
      "description": "Main API service",
      "tags": ["api", "backend"],
      "gitRemote": "git@github.com:org/my-api.git",
      "patternCounts": {
        "discovered": 234,
        "approved": 189,
        "ignored": 12
      },
      "health": "healthy",
      "healthScore": 92,
      "isValid": true
    }
  ]
}
```

---

## Project Health

Health is calculated based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Pattern approval rate | 30% | % of patterns approved |
| Outlier ratio | 25% | Fewer outliers = healthier |
| Recent activity | 20% | Recently scanned = healthier |
| Constraint compliance | 15% | Passing constraints |
| Test coverage | 10% | Test topology coverage |

**Health Levels:**
- **Healthy** (80-100%): Well-maintained project
- **Warning** (50-79%): Needs attention
- **Critical** (<50%): Significant issues

---

## Filtering Projects

### By Language

```bash
drift projects list --language typescript
drift projects list --language python
```

### By Framework

```bash
drift projects list --framework react
drift projects list --framework express
drift projects list --framework fastapi
```

### By Tag

```bash
drift projects list --tag critical
drift projects list --tag api
```

### Combined Filters

```bash
drift projects list --language typescript --framework express --tag api
```

---

## Use Cases

### 1. Multi-Project Development

Quickly switch between projects:

```bash
# Working on API
drift projects switch api-service
drift status

# Switch to frontend
drift projects switch frontend-app
drift status
```

### 2. Team Onboarding

List all team projects:

```bash
drift projects list --json > projects.json
# Share with new team members
```

### 3. Project Discovery

Find projects by criteria:

```bash
# All Python projects
drift projects list --language python

# All critical services
drift projects list --tag critical
```

### 4. Maintenance

Clean up stale projects:

```bash
# Find old projects
drift projects list --all

# Remove invalid ones
drift projects cleanup
```

---

## Integration

### With MCP Server

The MCP server uses the active project:

```typescript
// MCP tools operate on active project
drift_context({ intent: "add_feature", focus: "auth" })
// Uses patterns from active project
```

### With CLI Commands

Most CLI commands use the active project:

```bash
drift projects switch my-api
drift status  # Shows my-api status
drift scan    # Scans my-api
```

### With Dashboard

Dashboard shows active project:

```bash
drift projects switch my-api
drift dashboard
# Dashboard displays my-api patterns
```

---

## Best Practices

### 1. Use Descriptive Names

```bash
# ✅ Good
drift projects add --name "Payment Gateway API"
drift projects add --name "Customer Portal Frontend"

# ❌ Bad
drift projects add --name "api"
drift projects add --name "frontend"
```

### 2. Tag Projects

```bash
# Add meaningful tags
drift projects add --tags "api,payments,critical,team-payments"
```

### 3. Regular Cleanup

```bash
# Monthly cleanup
drift projects cleanup
```

### 4. Document Projects

```bash
# Add descriptions
drift projects add --description "Handles all payment processing and Stripe integration"
```

---

## Troubleshooting

### Project Not Found

```
Project not found: my-project
```

**Solutions:**
```bash
# Check registered projects
drift projects list --all

# Re-register if needed
cd /path/to/project
drift projects add
```

### Invalid Project

```
✗ my-project - /path/that/doesnt/exist
```

**Solutions:**
```bash
# Remove invalid project
drift projects remove my-project

# Or cleanup all invalid
drift projects cleanup
```

### Permission Issues

```
Failed to register project
```

**Solutions:**
```bash
# Check drift is initialized
drift init

# Check permissions
ls -la .drift/
```

---

## Next Steps

- [Getting Started](Getting-Started) — Initialize new projects
- [Configuration](Configuration) — Project configuration
- [MCP Setup](MCP-Setup) — Connect AI assistants
