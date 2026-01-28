# Trends Analysis

Drift tracks pattern changes over time, showing regressions, improvements, and overall codebase health trends.

## Overview

Trends analysis helps you:
- Detect pattern regressions before they become problems
- Track improvements in code quality
- Monitor category-specific trends
- Make data-driven decisions about technical debt

---

## Quick Start

```bash
# View trends (default: 7 days)
drift trends

# 30-day trends
drift trends --period 30d

# 90-day trends with details
drift trends --period 90d --verbose
```

---

## Command Options

```bash
drift trends [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --period <period>` | Time period: 7d, 30d, or 90d | 7d |
| `--verbose` | Show detailed output including improvements | false |

---

## Output

```
📊 Pattern Trends

Overall: 📈 IMPROVING
Period: 2024-01-08 → 2024-01-15

──────────────────────────────────────────────────
  Regressions:   3
  Improvements:  12
  Stable:        832
──────────────────────────────────────────────────

📉 Regressions (3):

  Critical:
    • Error Handling Coverage (errors)
      Coverage dropped from 85% to 72% (-15%)
    • API Response Validation (api)
      3 new endpoints without validation (+300%)

  Warning:
    • Test Coverage (testing)
      Coverage decreased slightly (-5%)

Category Trends:

  ↑ api: improving
  ↑ auth: improving
  ↓ errors: declining
  → security: stable
  → testing: stable

Use --verbose to see 12 improvements
View full details in the dashboard:
  drift dashboard
```

---

## MCP Tool

### drift_trends

```typescript
drift_trends({
  period?: "7d" | "30d" | "90d",  // Time period (default: 7d)
  category?: string,              // Filter by category
  limit?: number,                 // Max trends to return (default: 20)
  severity?: "all" | "critical" | "warning"  // Filter by severity (default: all)
})
```

**Returns:**
```json
{
  "overallTrend": "improving",
  "startDate": "2024-01-08",
  "endDate": "2024-01-15",
  "regressions": [
    {
      "patternName": "Error Handling Coverage",
      "category": "errors",
      "severity": "critical",
      "changePercent": -15,
      "details": "Coverage dropped from 85% to 72%"
    }
  ],
  "improvements": [
    {
      "patternName": "API Documentation",
      "category": "documentation",
      "severity": "info",
      "changePercent": 25,
      "details": "Documentation coverage increased"
    }
  ],
  "stable": 832,
  "categoryTrends": {
    "api": { "trend": "improving", "change": 12 },
    "errors": { "trend": "declining", "change": -8 }
  }
}
```

---

## Understanding Trends

### Overall Trend

| Status | Meaning |
|--------|---------|
| 📈 IMPROVING | More improvements than regressions |
| 📉 DECLINING | More regressions than improvements |
| ➡️ STABLE | Roughly equal or no significant changes |

### Severity Levels

| Level | Description |
|-------|-------------|
| Critical | Significant regression requiring immediate attention |
| Warning | Notable change that should be addressed |
| Info | Minor change for awareness |

### Change Calculation

Changes are calculated by comparing:
- Pattern counts (more/fewer instances)
- Coverage percentages
- Outlier counts
- Confidence scores

---

## How Trends Work

### 1. History Snapshots

Every scan creates a snapshot in `.drift/history/snapshots/`:

```
.drift/history/snapshots/
├── 2024-01-08T10-00-00.json
├── 2024-01-09T10-00-00.json
├── 2024-01-10T10-00-00.json
└── ...
```

### 2. Comparison

Trends compare the current state to historical snapshots:

```
Current State (today)
       │
       ▼
┌─────────────────┐
│  Compare with   │
│  7/30/90 days   │
│  ago            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Calculate      │
│  - Regressions  │
│  - Improvements │
│  - Stable       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Categorize     │
│  by severity    │
└─────────────────┘
```

### 3. Regression Detection

A regression is detected when:
- Pattern count decreases significantly
- Coverage percentage drops
- Outlier count increases
- Confidence score decreases

---

## Use Cases

### 1. Sprint Retrospectives

Review code quality changes during a sprint:

```bash
drift trends --period 14d --verbose
```

### 2. Release Readiness

Check for regressions before release:

```bash
drift trends --period 7d
# Ensure no critical regressions
```

### 3. Technical Debt Tracking

Monitor long-term trends:

```bash
drift trends --period 90d --verbose
```

### 4. Category Focus

Track specific areas:

```bash
# Via MCP
drift_trends({ category: "security", period: "30d" })
```

---

## Category Trends

Each category gets its own trend:

| Category | What's Tracked |
|----------|----------------|
| `api` | Endpoint patterns, validation, documentation |
| `auth` | Authentication patterns, security |
| `errors` | Error handling coverage, boundaries |
| `security` | Security patterns, vulnerabilities |
| `testing` | Test coverage, test patterns |
| `logging` | Logging consistency, observability |
| `data-access` | Database patterns, queries |
| `performance` | Performance patterns |

---

## Best Practices

### 1. Regular Scans

Run scans regularly to build history:

```bash
# Daily scan (cron or CI)
0 9 * * * cd /project && drift scan
```

### 2. Monitor Critical Categories

Focus on high-impact categories:

```bash
# Check security and errors weekly
drift trends --period 7d | grep -E "(security|errors)"
```

### 3. Set Baselines

After major refactors, establish new baselines:

```bash
drift scan
drift status --detailed
# Document current state as baseline
```

### 4. Act on Regressions

Don't let regressions accumulate:

```bash
# Check for critical regressions
drift trends --period 7d
# If critical regressions found, address immediately
```

---

## CI Integration

Add trend checks to your CI pipeline:

```yaml
# .github/workflows/trends.yml
name: Weekly Trends Check

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am

jobs:
  trends:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Drift
        run: npm install -g driftdetect
      
      - name: Check Trends
        run: |
          drift trends --period 7d > trends.txt
          if grep -q "DECLINING" trends.txt; then
            echo "⚠️ Code quality declining"
            cat trends.txt
            exit 1
          fi
      
      - name: Post to Slack
        if: failure()
        run: |
          curl -X POST $SLACK_WEBHOOK -d @trends.txt
```

---

## Dashboard Integration

View trends visually in the dashboard:

```bash
drift dashboard
```

The dashboard shows:
- Trend graphs over time
- Category breakdowns
- Regression highlights
- Improvement celebrations

---

## Troubleshooting

### No Trends Data

```
Not enough history data to show trends.
Run more scans over time to see pattern trends.
```

**Solution:** Run regular scans to build history:
```bash
drift scan
# Wait and scan again later
drift scan
# Now trends will have data
```

### Unexpected Regressions

If you see regressions after refactoring:

1. Check if patterns were intentionally changed
2. Review the specific files affected
3. Consider if the "regression" is actually an improvement

### Missing Categories

If a category doesn't appear in trends:
- No patterns in that category
- No changes in that category during the period

---

## Next Steps

- [Dashboard](Dashboard) — Visual trend monitoring
- [Quality Gates](Quality-Gates) — Enforce trend requirements
- [CI Integration](CI-Integration) — Automate trend checks
