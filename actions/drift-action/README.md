# Drift CI GitHub Action

Autonomous pattern-aware code analysis for pull requests. Drift CI analyzes your PRs for:

- **Pattern Violations** - Detects code that doesn't follow established patterns
- **Constraint Verification** - Ensures architectural constraints are satisfied
- **Impact Analysis** - Shows the blast radius of changes
- **Security Boundaries** - Catches sensitive data exposure

## Usage

```yaml
name: Drift CI

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Drift CI
        uses: dadbodgeoff/drift/actions/drift-action@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `github-token` | GitHub token for API access | `${{ github.token }}` |
| `fail-on-violation` | Fail the action if violations are found | `false` |
| `post-comment` | Post analysis results as PR comment | `true` |
| `create-check` | Create a check run with annotations | `true` |
| `pattern-check` | Enable pattern violation checking | `true` |
| `impact-analysis` | Enable impact analysis | `true` |
| `constraint-verification` | Enable constraint verification | `true` |
| `security-boundaries` | Enable security boundary checking | `true` |
| `memory-enabled` | Enable Cortex memory for learning | `true` |

## Outputs

| Output | Description |
|--------|-------------|
| `status` | Analysis status (`pass`, `warn`, `fail`) |
| `summary` | Analysis summary |
| `violations-count` | Number of violations found |
| `drift-score` | Drift score (0-100) |
| `result-json` | Full analysis result as JSON |

## Example with Outputs

```yaml
- name: Run Drift CI
  id: drift
  uses: dadbodgeoff/drift/actions/drift-action@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    fail-on-violation: true

- name: Check Results
  if: always()
  run: |
    echo "Status: ${{ steps.drift.outputs.status }}"
    echo "Violations: ${{ steps.drift.outputs.violations-count }}"
    echo "Drift Score: ${{ steps.drift.outputs.drift-score }}"
```

## Example with Strict Mode

```yaml
- name: Run Drift CI (Strict)
  uses: dadbodgeoff/drift/actions/drift-action@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    fail-on-violation: true
    pattern-check: true
    constraint-verification: true
    security-boundaries: true
```

## What Gets Analyzed

### Pattern Violations
Drift learns your codebase patterns and flags code that deviates:
- Naming conventions
- Error handling patterns
- API response formats
- Authentication patterns
- And more...

### Constraint Verification
Architectural constraints are verified:
- "All API endpoints must have authentication"
- "Database access only through repository layer"
- "Sensitive data must be encrypted"

### Impact Analysis
Shows what your changes affect:
- Entry points impacted
- Functions in the call chain
- Risk score based on blast radius

### Security Boundaries
Catches data flow issues:
- Sensitive data exposure
- Missing boundary checks
- PII leakage paths

## Memory & Learning

Drift CI learns from your PRs over time:
- Patterns that get approved become conventions
- Corrections teach the system your preferences
- The more you use it, the smarter it gets

## Requirements

- Node.js 18+
- A `.drift` directory in your repo (run `drift scan` first)

## License

Apache-2.0
