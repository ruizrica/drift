# Reports & Export

Drift generates reports in multiple formats and exports pattern data for various use cases.

## Overview

Drift provides two main commands:
- `drift report` — Generate formatted reports
- `drift export` — Export pattern data

---

## Reports

### Quick Start

```bash
# Generate text report
drift report

# JSON format
drift report --format json

# GitHub Actions format
drift report --format github

# GitLab CI format
drift report --format gitlab

# Save to file
drift report --output report.txt
```

### Command Options

```bash
drift report [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <format>` | Output format: text, json, github, gitlab | text |
| `-o, --output <path>` | Output file path | stdout |
| `-c, --categories <list>` | Include only specific categories | all |
| `--verbose` | Enable verbose output | false |

### Report Formats

#### Text Format

Human-readable report:

```
╔══════════════════════════════════════════════════════════════╗
║                     DRIFT PATTERN REPORT                      ║
╠══════════════════════════════════════════════════════════════╣
║  Generated: 2024-01-15T10:30:00.000Z                         ║
║  Project:   /Users/dev/my-project                            ║
╚══════════════════════════════════════════════════════════════╝

SUMMARY
───────────────────────────────────────────────────────────────
  Total Violations:  23
  Errors:            5
  Warnings:          12
  Info:              6

VIOLATIONS BY FILE
───────────────────────────────────────────────────────────────

src/api/users.ts
  Line 45: [ERROR] Missing error handling for database call
  Line 67: [WARNING] Bare catch clause

src/services/payment.ts
  Line 23: [ERROR] Swallowed error in catch block
  Line 89: [WARNING] Missing input validation
```

#### JSON Format

Machine-readable format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "rootDir": "/Users/dev/my-project",
  "summary": {
    "total": 23,
    "errors": 5,
    "warnings": 12,
    "infos": 6,
    "hints": 0
  },
  "violations": [
    {
      "id": "pattern-123-file-45",
      "patternId": "pattern-123",
      "severity": "error",
      "file": "src/api/users.ts",
      "range": {
        "start": { "line": 45, "character": 0 },
        "end": { "line": 45, "character": 50 }
      },
      "message": "Missing error handling for database call",
      "explanation": "Database calls should be wrapped in try/catch"
    }
  ],
  "patterns": [...]
}
```

#### GitHub Actions Format

For GitHub Actions annotations:

```
::error file=src/api/users.ts,line=45::Missing error handling for database call
::warning file=src/api/users.ts,line=67::Bare catch clause
::error file=src/services/payment.ts,line=23::Swallowed error in catch block
```

#### GitLab CI Format

For GitLab Code Quality:

```json
[
  {
    "description": "Missing error handling for database call",
    "fingerprint": "abc123",
    "severity": "major",
    "location": {
      "path": "src/api/users.ts",
      "lines": { "begin": 45 }
    }
  }
]
```

### Category Filtering

Generate reports for specific categories:

```bash
# Only API and auth patterns
drift report --categories api,auth

# Only security patterns
drift report --categories security

# Multiple categories
drift report --categories api,auth,security,errors
```

### Report Storage

Reports are automatically saved to `.drift/reports/`:

```
.drift/reports/
├── report-2024-01-15T10-30-00.txt
├── report-2024-01-14T09-15-00.txt
└── report-2024-01-13T14-45-00.json
```

---

## Export

### Quick Start

```bash
# Export as JSON
drift export

# AI-optimized context
drift export --format ai-context

# Human-readable summary
drift export --format summary

# Markdown format
drift export --format markdown

# Save to file
drift export --output patterns.json
```

### Command Options

```bash
drift export [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <format>` | Output format: json, ai-context, summary, markdown | json |
| `-o, --output <file>` | Output file path | stdout |
| `-c, --categories <list>` | Categories to include (comma-separated) | all |
| `--status <status>` | Filter by status: discovered, approved, ignored | all |
| `--min-confidence <n>` | Minimum confidence threshold (0.0-1.0) | 0 |
| `--compact` | Compact output (fewer details) | false |
| `--max-tokens <n>` | Maximum tokens for AI context format | unlimited |
| `--snippets` | Include code snippets | false |

### Export Formats

#### JSON Format

Full pattern data:

```json
{
  "version": "2.0.0",
  "generated": "2024-01-15T10:30:00.000Z",
  "projectRoot": "/Users/dev/my-project",
  "summary": {
    "totalPatterns": 234,
    "patternsByStatus": {
      "discovered": 45,
      "approved": 189,
      "ignored": 0
    },
    "patternsByCategory": {
      "api": 45,
      "auth": 23,
      "errors": 34
    }
  },
  "patterns": {
    "api/routes/express-route-handler": {
      "id": "api/routes/express-route-handler",
      "name": "Express Route Handler",
      "category": "api",
      "status": "approved",
      "confidence": { "score": 0.92 },
      "locations": [...],
      "outliers": [...]
    }
  }
}
```

#### AI Context Format

Optimized for LLM consumption:

```markdown
# Codebase Patterns

## API Patterns (45 patterns)

### Express Route Handler (approved, 92% confidence)
Standard pattern for Express route handlers with error handling.

**Locations:** 23 files
**Example:**
```typescript
app.get('/api/users', async (req, res) => {
  try {
    const users = await userService.getAll();
    res.json(users);
  } catch (error) {
    handleApiError(error, res);
  }
});
```

### API Response Format (approved, 89% confidence)
...

## Auth Patterns (23 patterns)
...
```

#### Summary Format

Quick overview:

```
DRIFT PATTERN SUMMARY
=====================

Total Patterns: 234
  - Approved: 189 (81%)
  - Discovered: 45 (19%)
  - Ignored: 0 (0%)

By Category:
  api:        45 patterns
  auth:       23 patterns
  errors:     34 patterns
  security:   12 patterns
  logging:    18 patterns
  testing:    42 patterns
  data-access: 28 patterns
  config:     15 patterns
  types:      17 patterns

Top Patterns by Confidence:
  1. Express Route Handler (api) - 92%
  2. JWT Auth Middleware (auth) - 91%
  3. Error Boundary (errors) - 89%
```

#### Markdown Format

Documentation-ready:

```markdown
# Pattern Documentation

Generated: 2024-01-15

## Summary

| Category | Patterns | Approved |
|----------|----------|----------|
| api | 45 | 42 |
| auth | 23 | 21 |
| errors | 34 | 30 |

## Patterns

### API Patterns

#### Express Route Handler

**Status:** Approved  
**Confidence:** 92%  
**Locations:** 23 files

Standard pattern for Express route handlers...

**Example:**
```typescript
// Code example
```
```

### Token Estimation

For AI context format, Drift estimates token usage:

```bash
drift export --format ai-context
# Estimated tokens: ~4,500
```

Limit tokens for context windows:

```bash
drift export --format ai-context --max-tokens 8000
```

---

## Use Cases

### 1. CI/CD Integration

Generate reports for CI:

```yaml
# .github/workflows/ci.yml
- name: Generate Report
  run: drift report --format github
```

### 2. AI Assistant Context

Export for AI assistants:

```bash
drift export --format ai-context --output .cursor/context.md
```

### 3. Documentation

Generate pattern documentation:

```bash
drift export --format markdown --output docs/PATTERNS.md
```

### 4. Code Review

Generate report for PR review:

```bash
drift report --format json --output pr-report.json
```

### 5. Compliance

Export approved patterns for compliance:

```bash
drift export --status approved --format json --output compliance.json
```

---

## Filtering

### By Status

```bash
# Only approved patterns
drift export --status approved

# Only discovered (pending review)
drift export --status discovered
```

### By Category

```bash
# Security patterns only
drift export --categories security

# Multiple categories
drift export --categories api,auth,security
```

### By Confidence

```bash
# High confidence only
drift export --min-confidence 0.8

# Medium and above
drift export --min-confidence 0.5
```

### Combined Filters

```bash
drift export \
  --status approved \
  --categories api,auth \
  --min-confidence 0.7 \
  --format ai-context
```

---

## Integration

### With Quality Gates

Use reports in quality gates:

```bash
drift report --format json --output report.json
# Parse report.json in CI to fail on errors
```

### With Dashboard

Export data for external dashboards:

```bash
drift export --format json --output metrics.json
# Import into Grafana, DataDog, etc.
```

### With AI Assistants

Keep AI context updated:

```bash
# In .cursor/settings.json or similar
drift export --format ai-context --output .cursor/drift-context.md
```

---

## Best Practices

### 1. Regular Exports

Schedule regular exports for documentation:

```bash
# Weekly documentation update
0 9 * * 1 drift export --format markdown --output docs/PATTERNS.md
```

### 2. Version Control Reports

Commit reports for tracking:

```bash
drift report --format json --output reports/$(date +%Y-%m-%d).json
git add reports/
git commit -m "Add pattern report"
```

### 3. Token-Aware AI Context

Respect context window limits:

```bash
# For Claude (100k context)
drift export --format ai-context --max-tokens 50000

# For GPT-4 (8k context)
drift export --format ai-context --max-tokens 4000
```

### 4. Include Snippets When Needed

```bash
# For AI context, include snippets
drift export --format ai-context --snippets

# For compliance, skip snippets
drift export --format json --compact
```

---

## Next Steps

- [Quality Gates](Quality-Gates) — Use reports in CI
- [CI Integration](CI-Integration) — Automate reporting
- [Dashboard](Dashboard) — Visual reporting
