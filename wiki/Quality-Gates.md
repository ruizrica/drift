# Quality Gates

Automated code quality enforcement that checks architectural consistency.

## Overview

Quality Gates go beyond traditional linting. While tools like ESLint check syntax, Drift Quality Gates check **architectural consistency** — ensuring new code matches established patterns in YOUR codebase.

```bash
# Run quality gate
drift gate

# Run in CI mode
drift gate --ci --format github
```

---

## The Six Gates

| Gate | What It Checks | When It Fails |
|------|----------------|---------------|
| **Pattern Compliance** | Do changed files follow established patterns? | New code doesn't match how you do things |
| **Constraint Verification** | Does code satisfy architectural invariants? | Violates learned rules (e.g., "all API routes have auth") |
| **Regression Detection** | Did this change make pattern health worse? | Pattern confidence dropped significantly |
| **Impact Simulation** | What's the blast radius of this change? | Change affects too many downstream files |
| **Security Boundary** | Does this respect data access boundaries? | Sensitive data accessed without auth |
| **Custom Rules** | User-defined rules for your codebase | Violates your custom rules |

---

## Quick Start

### 1. Initialize and Scan

```bash
drift init
drift scan
```

### 2. Approve Canonical Patterns

```bash
# See discovered patterns
drift status

# Approve patterns that represent "how we do things"
drift approve auth-middleware-pattern
drift approve api-error-format
```

### 3. Run Quality Gate

```bash
drift gate
```

---

## CLI Usage

### Basic Commands

```bash
# Run all gates with default policy
drift gate

# Run specific gates
drift gate --gates pattern-compliance,security-boundary

# Run with specific policy
drift gate --policy strict

# Check specific files
drift gate src/api/users.ts src/api/orders.ts

# Specify project root
drift gate --root /path/to/project
```

### CI Mode

```bash
# JSON output for CI
drift gate --ci

# GitHub Actions annotations
drift gate --ci --format github

# GitLab Code Quality
drift gate --ci --format gitlab

# SARIF for security tools
drift gate --ci --format sarif
```

### Output Options

```bash
# Verbose output
drift gate --verbose

# Write to file
drift gate --output report.json

# Fail threshold
drift gate --fail-on error    # Only fail on errors (default)
drift gate --fail-on warning  # Fail on warnings too
drift gate --fail-on none     # Never fail (report only)
```

---

## Policies

Policies define which gates run and their thresholds.

### Built-in Policies

| Policy | Description | Use Case |
|--------|-------------|----------|
| `default` | Balanced settings | Day-to-day development |
| `strict` | All gates, low thresholds | Release branches |
| `relaxed` | Fewer gates, higher thresholds | Experimental branches |
| `ci-fast` | Essential gates only | Fast CI feedback |

### Using Policies

```bash
# Use strict policy
drift gate --policy strict

# Use relaxed for feature branches
drift gate --policy relaxed
```

### Custom Policies

Create `.drift/quality-gates/policies/custom.json`:

```json
{
  "id": "custom",
  "name": "Custom Policy",
  "description": "Our team's quality standards",
  "gates": {
    "pattern-compliance": {
      "enabled": true,
      "blocking": true,
      "minComplianceRate": 85,
      "maxNewOutliers": 3,
      "categories": ["api", "auth", "errors"],
      "minPatternConfidence": 0.7,
      "approvedOnly": true
    },
    "constraint-verification": {
      "enabled": true,
      "blocking": true,
      "enforceApproved": true,
      "enforceDiscovered": false,
      "minConfidence": 0.8
    },
    "regression-detection": {
      "enabled": true,
      "blocking": false,
      "maxConfidenceDrop": 10,
      "maxComplianceDrop": 15,
      "criticalCategories": ["auth", "security"]
    },
    "impact-simulation": {
      "enabled": true,
      "blocking": false,
      "maxFilesAffected": 50,
      "maxFrictionScore": 70
    },
    "security-boundary": {
      "enabled": true,
      "blocking": true,
      "allowNewSensitiveAccess": false,
      "protectedTables": ["users", "payments", "sessions"]
    },
    "custom-rules": {
      "enabled": false
    }
  },
  "aggregation": {
    "mode": "weighted",
    "weights": {
      "pattern-compliance": 30,
      "constraint-verification": 25,
      "regression-detection": 15,
      "impact-simulation": 10,
      "security-boundary": 20
    },
    "passingScore": 70
  }
}
```

Use custom policy:

```bash
drift gate --policy custom
```

---

## Gate Configuration

### Pattern Compliance

Checks if code follows established patterns:

```json
{
  "pattern-compliance": {
    "enabled": true,
    "blocking": true,
    "minComplianceRate": 80,
    "maxNewOutliers": 5,
    "categories": [],
    "minPatternConfidence": 0.6,
    "approvedOnly": true
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `minComplianceRate` | Minimum % of code following patterns | 80 |
| `maxNewOutliers` | Max new pattern violations allowed | 5 |
| `categories` | Categories to check (empty = all) | [] |
| `minPatternConfidence` | Min confidence to consider | 0.6 |
| `approvedOnly` | Only check approved patterns | true |

### Constraint Verification

Checks architectural invariants:

```json
{
  "constraint-verification": {
    "enabled": true,
    "blocking": true,
    "enforceApproved": true,
    "enforceDiscovered": false,
    "minConfidence": 0.8,
    "categories": []
  }
}
```

### Regression Detection

Detects pattern health degradation:

```json
{
  "regression-detection": {
    "enabled": true,
    "blocking": false,
    "maxConfidenceDrop": 10,
    "maxComplianceDrop": 15,
    "maxNewOutliersPerPattern": 3,
    "criticalCategories": ["auth", "security"],
    "baseline": "branch-base"
  }
}
```

### Impact Simulation

Analyzes change blast radius:

```json
{
  "impact-simulation": {
    "enabled": true,
    "blocking": false,
    "maxFilesAffected": 50,
    "maxFunctionsAffected": 100,
    "maxEntryPointsAffected": 10,
    "maxFrictionScore": 70,
    "analyzeSensitiveData": true
  }
}
```

### Security Boundary

Validates data access paths:

```json
{
  "security-boundary": {
    "enabled": true,
    "blocking": true,
    "allowNewSensitiveAccess": false,
    "protectedTables": ["users", "payments", "sessions"],
    "maxDataFlowDepth": 10,
    "requiredAuthPatterns": ["requireAuth", "authenticate"]
  }
}
```

### Custom Rules

User-defined rules:

```json
{
  "custom-rules": {
    "enabled": true,
    "blocking": false,
    "ruleFiles": [".drift/rules/*.json"],
    "inlineRules": [
      {
        "id": "no-console-log",
        "name": "No console.log in production",
        "description": "Use logger instead of console.log",
        "severity": "warning",
        "condition": {
          "type": "regex",
          "pattern": "console\\.log\\(",
          "files": "src/**/*.ts",
          "exclude": "**/*.test.ts"
        },
        "message": "Use logger.info() instead of console.log()"
      }
    ],
    "useBuiltInRules": true
  }
}
```

---

## MCP Integration

Use quality gates from AI assistants:

```
Check if my changes pass quality gates
```

The `drift_quality_gate` MCP tool runs gates and returns results.

### MCP Tool Parameters

```typescript
drift_quality_gate({
  files?: string[],        // Files to check (defaults to changed files)
  policy?: string,         // Policy: default, strict, relaxed, ci-fast
  gates?: string,          // Comma-separated gates to run
  format?: string,         // Output format: text, json, github, gitlab, sarif
  verbose?: boolean,       // Include detailed output
  branch?: string,         // Current branch name
  baseBranch?: string      // Base branch for comparison
})
```

---

## Interpreting Results

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All gates passed |
| 1 | One or more gates failed |

### Result Structure

```json
{
  "passed": false,
  "status": "failed",
  "score": 72,
  "summary": "2 gates failed, 4 passed",
  "gates": {
    "pattern-compliance": {
      "status": "passed",
      "score": 85,
      "violations": []
    },
    "security-boundary": {
      "status": "failed",
      "score": 45,
      "violations": [...]
    }
  },
  "violations": [...],
  "warnings": [...],
  "metadata": {
    "executionTimeMs": 1234,
    "filesChecked": 42,
    "gatesRun": ["pattern-compliance", "security-boundary", ...]
  }
}
```

---

## Best Practices

### 1. Start with Pattern Compliance

Begin with just pattern compliance, then add more gates:

```bash
drift gate --gates pattern-compliance
```

### 2. Approve Patterns First

Gates are most useful after you've approved canonical patterns:

```bash
drift status  # See discovered patterns
drift approve <pattern-id>  # Approve good ones
```

### 3. Use Different Policies for Different Branches

```yaml
# CI example
- name: Quality gate
  run: |
    if [ "${{ github.ref }}" == "refs/heads/main" ]; then
      drift gate --policy strict
    else
      drift gate --policy default
    fi
```

### 4. Make Security Gates Blocking

Security boundary violations should block merges:

```json
{
  "security-boundary": {
    "enabled": true,
    "blocking": true
  }
}
```

### 5. Review Violations, Don't Just Suppress

When a gate fails:
1. Review the violation
2. Fix if it's a real issue
3. Approve the pattern if it's intentional
4. Adjust thresholds only as last resort

---

## Troubleshooting

### Gate always fails

1. Check if patterns are approved: `drift status`
2. Review violations: `drift gate --verbose`
3. Adjust thresholds in policy

### Gate too slow

1. Use `--gates` to run specific gates
2. Use `ci-fast` policy
3. Check file count being analyzed

### False positives

1. Approve legitimate patterns
2. Adjust `minPatternConfidence`
3. Exclude files in `.driftignore`

---

## Next Steps

- [CI Integration](CI-Integration) — Run gates in CI/CD
- [Git Hooks](Git-Hooks) — Run gates on commit
- [Configuration](Configuration) — Customize settings
