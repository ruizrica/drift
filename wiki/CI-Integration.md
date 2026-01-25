# CI Integration

Integrate Drift into your CI/CD pipeline for automated pattern drift detection.

## Quick Start

Add Drift to your CI pipeline in 3 steps:

```yaml
# 1. Install
npm install -g driftdetect

# 2. Initialize (if not already)
drift init --yes

# 3. Run quality gate
drift gate --ci --fail-on error
```

---

## GitHub Actions

### Basic Pattern Check

```yaml
name: Drift Pattern Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install Drift
        run: npm install -g driftdetect
        
      - name: Initialize Drift
        run: drift init --yes
        
      - name: Scan for patterns
        run: drift scan
        
      - name: Run quality gate
        run: drift gate --ci --format github
```

### With Caching (Recommended)

Cache the `.drift` folder to speed up subsequent runs:

```yaml
name: Drift Pattern Check

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Cache Drift data
        uses: actions/cache@v4
        with:
          path: .drift
          key: drift-${{ runner.os }}-${{ hashFiles('**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py') }}
          restore-keys: |
            drift-${{ runner.os }}-
            
      - name: Install Drift
        run: npm install -g driftdetect
        
      - name: Initialize Drift
        run: drift init --yes
        
      - name: Incremental scan
        run: drift scan --incremental
        
      - name: Run quality gate
        run: drift gate --ci --format github
```

### Full Pipeline with Artifacts

```yaml
name: Drift Full Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  drift-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for better analysis
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Cache Drift data
        uses: actions/cache@v4
        with:
          path: .drift
          key: drift-${{ runner.os }}-${{ github.sha }}
          restore-keys: |
            drift-${{ runner.os }}-
            
      - name: Install Drift
        run: npm install -g driftdetect
        
      - name: Initialize Drift
        run: drift init --yes
        
      - name: Full scan
        run: drift scan --verbose
        
      - name: Run quality gate
        id: gate
        run: drift gate --ci --format sarif --output drift-results.sarif
        continue-on-error: true
        
      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: drift-results.sarif
          
      - name: Upload Drift artifacts
        uses: actions/upload-artifact@v4
        with:
          name: drift-analysis
          path: |
            .drift/patterns/
            .drift/views/
            drift-results.sarif
          retention-days: 30
          
      - name: Check gate result
        if: steps.gate.outcome == 'failure'
        run: exit 1
```

### Monorepo Support

For monorepos, scan each package separately:

```yaml
name: Drift Monorepo Check

on:
  pull_request:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.changes.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
      - id: changes
        uses: dorny/paths-filter@v3
        with:
          filters: |
            backend:
              - 'packages/backend/**'
            frontend:
              - 'packages/frontend/**'
            shared:
              - 'packages/shared/**'

  drift-check:
    needs: detect-changes
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: [backend, frontend, shared]
    if: needs.detect-changes.outputs.packages != '[]'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install Drift
        run: npm install -g driftdetect
        
      - name: Scan package
        run: |
          cd packages/${{ matrix.package }}
          drift init --yes
          drift scan
          drift gate --ci --format github
```

---

## GitLab CI

### Basic Configuration

```yaml
# .gitlab-ci.yml
drift:
  image: node:20
  stage: test
  script:
    - npm install -g driftdetect
    - drift init --yes
    - drift scan
    - drift gate --ci --format gitlab
  artifacts:
    reports:
      codequality: drift-report.json
    paths:
      - .drift/
    expire_in: 1 week
  cache:
    key: drift-${CI_COMMIT_REF_SLUG}
    paths:
      - .drift/
```

### With Code Quality Report

```yaml
drift:
  image: node:20
  stage: test
  script:
    - npm install -g driftdetect
    - drift init --yes
    - drift scan --incremental
    - drift gate --ci --format gitlab --output drift-report.json
  artifacts:
    reports:
      codequality: drift-report.json
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

---

## Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
      
  - script: npm install -g driftdetect
    displayName: 'Install Drift'
    
  - script: drift init --yes
    displayName: 'Initialize Drift'
    
  - script: drift scan
    displayName: 'Scan codebase'
    
  - script: drift gate --ci --format json --output $(Build.ArtifactStagingDirectory)/drift-results.json
    displayName: 'Run quality gate'
    
  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: '$(Build.ArtifactStagingDirectory)'
      artifactName: 'drift-results'
```

---

## CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  drift-check:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - drift-{{ checksum "package.json" }}
            - drift-
      - run:
          name: Install Drift
          command: npm install -g driftdetect
      - run:
          name: Initialize and Scan
          command: |
            drift init --yes
            drift scan --incremental
      - run:
          name: Quality Gate
          command: drift gate --ci --format json --output drift-results.json
      - save_cache:
          key: drift-{{ checksum "package.json" }}
          paths:
            - .drift
      - store_artifacts:
          path: drift-results.json

workflows:
  main:
    jobs:
      - drift-check
```

---

## Output Formats

### GitHub Annotations (`--format github`)

Creates inline annotations on PR diffs:

```
::error file=src/api/users.ts,line=42::Pattern violation: Missing error handling
::warning file=src/utils/auth.ts,line=15::New outlier detected in auth-middleware pattern
```

### GitLab Code Quality (`--format gitlab`)

Generates GitLab Code Quality report:

```json
[
  {
    "description": "Pattern violation: Missing error handling",
    "fingerprint": "abc123",
    "severity": "major",
    "location": {
      "path": "src/api/users.ts",
      "lines": { "begin": 42 }
    }
  }
]
```

### SARIF (`--format sarif`)

Standard format for security/quality tools:

```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [...]
}
```

### JSON (`--format json`)

Raw JSON for custom processing:

```json
{
  "passed": false,
  "score": 72,
  "violations": [...],
  "gates": {...}
}
```

---

## Best Practices

### 1. Cache the `.drift` folder

The `.drift` folder contains learned patterns and call graph data. Caching it:
- Speeds up incremental scans by 10-50x
- Preserves pattern history for regression detection
- Reduces CI minutes

### 2. Use incremental scans for PRs

```bash
drift scan --incremental
```

Only scans files that changed since last scan, dramatically faster for large codebases.

### 3. Run full scans on main branch

```yaml
- name: Full scan on main
  if: github.ref == 'refs/heads/main'
  run: drift scan --force
  
- name: Incremental scan on PR
  if: github.event_name == 'pull_request'
  run: drift scan --incremental
```

### 4. Fail on errors, warn on warnings

```bash
drift gate --fail-on error  # Only fail on errors
drift gate --fail-on warning  # Fail on warnings too
drift gate --fail-on none  # Never fail (report only)
```

### 5. Upload artifacts for debugging

Always upload the `.drift` folder and reports as artifacts for debugging failed builds.

---

## Troubleshooting

### Scan takes too long

1. Check `.driftignore` excludes `node_modules/`, `dist/`
2. Use `--incremental` for PR checks
3. Increase timeout: `drift scan --timeout 600`
4. Scan specific directories: `drift scan src/`

### No patterns found

1. Ensure source files are being scanned (not just config)
2. Check language is supported
3. Run `drift status` to see what was detected

### Cache not working

1. Ensure cache key includes source file hashes
2. Check cache path is `.drift` (not `.drift/`)
3. Verify cache is restored before scan

### Quality gate always fails

1. Check `--fail-on` setting
2. Review violations with `drift gate --verbose`
3. Approve legitimate patterns: `drift approve <id>`

---

## Next Steps

- [Git Hooks](Git-Hooks) — Run Drift on commit/push
- [Quality Gates](Quality-Gates) — Configure gate policies
- [MCP Setup](MCP-Setup) — Connect to AI assistants
