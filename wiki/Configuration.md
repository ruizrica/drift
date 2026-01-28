# Configuration

Customize Drift for your project.

## Configuration File

Drift stores configuration in `.drift/config.json`:

```json
{
  "version": "2.0.0",
  "project": {
    "id": "uuid-generated-on-init",
    "name": "my-project",
    "description": "Optional project description",
    "initializedAt": "2024-01-01T00:00:00.000Z"
  },
  "severity": {},
  "ignore": [
    "node_modules/**",
    "dist/**",
    "**/*.test.ts"
  ],
  "ci": {
    "failOn": "error",
    "reportFormat": "text"
  },
  "learning": {
    "autoApproveThreshold": 0.95,
    "minOccurrences": 3,
    "semanticLearning": true
  },
  "performance": {
    "maxWorkers": 4,
    "cacheEnabled": true,
    "incrementalAnalysis": true,
    "cacheTTL": 3600
  },
  "features": {
    "callGraph": true,
    "boundaries": true,
    "dna": true,
    "contracts": true
  }
}
```

---

## Configuration Options

### Project Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `project.id` | string | auto-generated | Unique project identifier (UUID) |
| `project.name` | string | folder name | Project display name |
| `project.description` | string | - | Optional project description |
| `project.initializedAt` | string | auto-set | ISO timestamp of initialization |

### Ignore Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ignore` | array | see below | Glob patterns to exclude from scanning |
| `include` | array | - | Glob patterns to include (allowlist mode) |

**Default ignore patterns:**
```json
[
  "node_modules/**",
  "dist/**",
  "build/**",
  ".git/**",
  "coverage/**",
  "*.min.js",
  "*.bundle.js",
  "vendor/**",
  "__pycache__/**",
  ".venv/**",
  "target/**",
  "bin/**",
  "obj/**"
]
```

**Allowlist mode:** If `include` is specified, ONLY those paths are scanned. This takes precedence over `ignore` patterns.

### CI Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ci.failOn` | string | `"error"` | Severity that causes CI failure: `error`, `warning`, `info`, `none` |
| `ci.reportFormat` | string | `"text"` | Output format: `text`, `json`, `sarif`, `github` |
| `ci.uploadResults` | boolean | `false` | Upload results to dashboard |

### Learning Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `learning.autoApproveThreshold` | number | `0.95` | Auto-approve patterns above this confidence (0-1) |
| `learning.minOccurrences` | number | `3` | Minimum occurrences before pattern is detected |
| `learning.semanticLearning` | boolean | `true` | Enable semantic learning |

**Note:** `learning.autoApproveThreshold` is the recommended way to auto-approve patterns. Set to `1.0` to disable auto-approval, or lower (e.g., `0.8`) to be more permissive.

### Performance Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `performance.maxWorkers` | number | `4` | Maximum parallel workers |
| `performance.cacheEnabled` | boolean | `true` | Enable caching |
| `performance.incrementalAnalysis` | boolean | `true` | Enable incremental scanning |
| `performance.cacheTTL` | number | `3600` | Cache TTL in seconds |

### Feature Flags

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `features.callGraph` | boolean | `true` | Enable call graph analysis |
| `features.boundaries` | boolean | `true` | Enable data boundary scanning |
| `features.dna` | boolean | `true` | Enable styling DNA analysis |
| `features.contracts` | boolean | `true` | Enable API contract verification |

---

## .driftignore

Exclude files from scanning. Uses the same syntax as `.gitignore`.

**Important:** Drift automatically respects your `.gitignore` patterns. You don't need to duplicate them in `.driftignore`. The `.driftignore` file is for additional exclusions specific to Drift scanning.

```gitignore
# .driftignore - Additional exclusions for Drift
# (Your .gitignore patterns are already respected automatically)

# Test files (if you don't want patterns from tests)
*.test.ts
*.spec.ts
__tests__/

# Generated files
*.generated.ts
*.d.ts

# Large data files Drift shouldn't analyze
*.sql
*.csv
fixtures/
```

**How it works:**
1. Drift reads both `.gitignore` and `.driftignore`
2. Patterns from both files are combined
3. Files matching EITHER pattern are excluded from scanning
4. This is the default behavior — no configuration needed

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DRIFT_CONFIG` | Path to config file |
| `DRIFT_CACHE_DIR` | Cache directory |
| `DRIFT_LOG_LEVEL` | Log level: debug, info, warn, error |
| `DRIFT_NO_COLOR` | Disable colored output |
| `DRIFT_PARALLEL` | Number of parallel workers |

---

## Per-Project Configuration

### Multiple Projects

Register multiple projects:

```bash
drift projects add ~/code/backend --name backend
drift projects add ~/code/frontend --name frontend
```

Each project has its own `.drift/` directory and configuration.

### Switching Projects

```bash
drift projects switch backend
drift status  # Shows backend status
```

---

## CI Configuration

### GitHub Actions

```yaml
- name: Drift Check
  run: |
    npm install -g driftdetect
    drift init --yes
    drift scan
    drift check --ci --fail-on warning --format github
```

### GitLab CI

```yaml
drift:
  script:
    - npm install -g driftdetect
    - drift init --yes
    - drift scan
    - drift check --ci --fail-on warning --format gitlab
```

### Pre-commit Hook

```bash
# .husky/pre-commit
drift check --staged --fail-on error
```

---

## MCP Server Configuration

### Rate Limiting

```json
{
  "mcp": {
    "rateLimit": {
      "global": 100,
      "expensive": 10
    }
  }
}
```

### Caching

```json
{
  "mcp": {
    "cache": {
      "enabled": true,
      "ttl": 300000,
      "maxSize": 100
    }
  }
}
```

### Tool Filtering (Intelligent Defaults)

By default, Drift automatically detects your project's languages and only exposes relevant MCP tools. A TypeScript project won't see Go, Rust, C++, PHP, or Java tools — reducing AI context overhead from 49 tools to ~35.

**How it works:**
1. On MCP server startup, Drift scans for language markers (package.json, Cargo.toml, go.mod, etc.)
2. Only language-specific tools for detected languages are exposed
3. Core tools (patterns, status, context, etc.) are always available

**Override detection:**

```json
{
  "mcp": {
    "tools": {
      "languages": ["typescript", "python"],
      "include": ["drift_go"],
      "exclude": ["drift_wpf"],
      "all": false
    }
  }
}
```

| Option | Type | Description |
|--------|------|-------------|
| `languages` | array | Override detected languages |
| `include` | array | Additional tools to include |
| `exclude` | array | Tools to exclude |
| `all` | boolean | Set `true` to disable filtering (expose all 49 tools) |

**Supported languages:** typescript, javascript, python, java, php, go, rust, cpp, csharp, wpf

---

## Sensitive Data Configuration

### Custom Sensitive Fields

```json
{
  "boundaries": {
    "sensitiveFields": [
      "ssn",
      "social_security",
      "tax_id",
      "bank_account"
    ]
  }
}
```

### Sensitivity Categories

```json
{
  "boundaries": {
    "categories": {
      "pii": ["email", "phone", "address"],
      "financial": ["credit_card", "bank_account"],
      "health": ["diagnosis", "prescription"],
      "credentials": ["password", "api_key", "token"]
    }
  }
}
```

---

## Resetting Configuration

```bash
# Reset to defaults
rm -rf .drift
drift init

# Keep patterns, reset config only
rm .drift/config.json
drift init --yes
```
