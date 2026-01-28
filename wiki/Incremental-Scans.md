# Incremental Scans

Speed up Drift scans by only analyzing changed files.

## Overview

Full scans analyze every file in your codebase. Incremental scans only analyze files that have changed since the last scan, dramatically reducing scan time for large codebases.

```bash
# Full scan (all files)
drift scan                    # 45 seconds

# Incremental scan (changed files only)
drift scan --incremental      # 3 seconds
```

---

## How It Works

1. **Content Hashing**: Drift stores a hash of each file's content in `.drift/`
2. **Change Detection**: On incremental scan, Drift compares current file hashes to stored hashes
3. **Selective Analysis**: Only files with different hashes are re-analyzed
4. **Pattern Merging**: New results are merged with existing pattern data

---

## Usage

### Basic Incremental Scan

```bash
drift scan --incremental
```

### Force Full Scan

When you need to rebuild everything:

```bash
drift scan --force
```

### Combine with Other Options

```bash
# Incremental scan with verbose output
drift scan --incremental --verbose

# Incremental scan of specific directory
drift scan src/ --incremental

# Incremental scan with manifest generation
drift scan --incremental --manifest
```

---

## When to Use

### Use Incremental Scans For:

- **PR checks**: Only scan files changed in the PR
- **Pre-commit hooks**: Fast feedback on staged changes
- **Development**: Quick checks while coding
- **Large codebases**: 10,000+ files

### Use Full Scans For:

- **Initial setup**: First scan of a project
- **Main branch**: Ensure complete analysis
- **After major refactors**: Rebuild pattern relationships
- **Weekly/nightly**: Periodic full refresh

---

## CI Integration

### GitHub Actions

```yaml
- name: Scan codebase
  run: |
    if [ "${{ github.event_name }}" == "push" ] && [ "${{ github.ref }}" == "refs/heads/main" ]; then
      # Full scan on push to main
      drift scan --verbose
    else
      # Incremental scan on PRs
      drift scan --incremental
    fi
```

### GitLab CI

```yaml
drift:
  script:
    - drift init --yes
    - |
      if [ "$CI_PIPELINE_SOURCE" == "merge_request_event" ]; then
        drift scan --incremental
      else
        drift scan
      fi
    - drift gate --ci
  cache:
    key: drift-${CI_COMMIT_REF_SLUG}
    paths:
      - .drift/
```

---

## Performance Comparison

| Codebase Size | Full Scan | Incremental (10 files changed) |
|---------------|-----------|-------------------------------|
| 1,000 files   | ~10s      | ~1s                           |
| 10,000 files  | ~60s      | ~3s                           |
| 50,000 files  | ~5min     | ~5s                           |
| 100,000 files | ~15min    | ~8s                           |

*Times vary based on file complexity and hardware.*

---

## Cache Management

### Cache Location

Incremental scan data is stored in `.drift/`:

```
.drift/
├── indexes/
│   └── by-file.json      # File hash index
├── lake/
│   └── patterns/         # Pattern data by file
└── manifest.json         # Scan metadata
```

### Clearing Cache

To force a fresh start:

```bash
# Remove all cached data
rm -rf .drift/indexes .drift/lake

# Or use force flag
drift scan --force
```

### CI Caching

Cache `.drift/` between CI runs:

```yaml
# GitHub Actions
- uses: actions/cache@v4
  with:
    path: .drift
    key: drift-${{ runner.os }}-${{ hashFiles('**/*.ts', '**/*.py') }}
    restore-keys: |
      drift-${{ runner.os }}-
```

---

## Monorepo Support

For monorepos, combine incremental scans with project targeting:

```bash
# Scan only the backend package (incremental)
drift scan packages/backend --incremental

# Scan specific project by name
drift scan -p backend --incremental

# Scan all projects incrementally
drift scan --all-projects --incremental
```

---

## Troubleshooting

### Incremental scan misses changes

1. Check file is not in `.driftignore`
2. Verify file extension is supported
3. Try `--force` to rebuild cache

### Cache grows too large

1. Run periodic full scans to consolidate
2. Check `.driftignore` excludes generated files
3. Consider splitting into multiple projects

### Inconsistent results

If incremental and full scans give different results:

1. Run `drift scan --force` to rebuild
2. Check for race conditions in CI
3. Ensure cache is properly restored

---

## Best Practices

### 1. Use incremental for PRs, full for main

```yaml
# CI example
- run: |
    if [ "$BRANCH" == "main" ]; then
      drift scan --force
    else
      drift scan --incremental
    fi
```

### 2. Cache the `.drift` folder

Always cache between CI runs for incremental scans to work.

### 3. Periodic full scans

Schedule weekly full scans to catch any drift:

```yaml
# GitHub Actions scheduled workflow
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
jobs:
  full-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          npm install -g driftdetect
          drift init --yes
          drift scan --force --verbose
```

### 4. Combine with quality gates

```bash
drift scan --incremental
drift gate --ci --format github
```

---

## Next Steps

- [CI Integration](CI-Integration) — Full CI/CD setup
- [Git Hooks](Git-Hooks) — Pre-commit incremental checks
- [Configuration](Configuration) — Customize scan settings
