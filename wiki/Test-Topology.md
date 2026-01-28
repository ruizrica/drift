# Test Topology

Drift maps your tests to source code, enabling intelligent test selection and coverage analysis.

## What is Test Topology?

Test topology answers the question: **"Which tests should I run when I change this code?"**

Instead of running your entire test suite, Drift identifies the minimum set of tests that cover your changes:

```
Changed: src/auth/login.ts

Affected Tests:
  ✓ tests/auth/login.test.ts (direct)
  ✓ tests/api/auth.controller.test.ts (calls login)
  ✓ tests/e2e/auth-flow.test.ts (integration)
  
Skip: 247 other tests (not affected)
```

---

## Building Test Topology

```bash
# Build test-to-code mapping
drift test-topology build

# Check status
drift test-topology status
```

**Output:**
```
🧪 Test Topology Status
────────────────────────────────────────────────────────────

📊 Test Summary
──────────────────────────────────────────────────────────
  Test Files:      89
  Test Cases:      1,234
  Avg Quality:     72/100

📈 Coverage
──────────────────────────────────────────────────────────
  Files:     156/247 (63%)
  Functions: 1,456/1,842 (79%)

🔧 By Framework
──────────────────────────────────────────────────────────
  🃏 jest         67 tests
  ⚡ vitest       22 tests
```

---

## Finding Affected Tests

### For Changed Files

```bash
# Multiple files
drift test-topology affected src/auth/login.ts src/auth/session.ts
```

**Output:**
```
🎯 Minimum Test Set
────────────────────────────────────────────────────────────

Changed Files: 2
Changed Code Coverage: 87%

Tests to Run: 4/89
Time Saved: ~37s

Selected Tests:
  ✓ loginUser
    tests/auth/login.test.ts
  ✓ validateCredentials
    tests/auth/login.test.ts
  ✓ POST /api/auth/login
    tests/api/auth.controller.test.ts
  ✓ requireAuth middleware
    tests/middleware/auth.test.ts
```

### MCP Tool: `drift_test_topology`

```json
{
  "action": "affected",
  "files": ["src/auth/login.ts", "src/auth/session.ts"]
}
```

---

## Finding Uncovered Code

### List Uncovered Files

```bash
drift test-topology uncovered
```

**Output:**
```
🔍 Uncovered Functions
────────────────────────────────────────────────────────────

● processRefund
  src/payments/refund.ts:45
  Risk: 75/100
  💾 Accesses data

● bulkUpdate
  src/admin/bulk-operations.ts:23
  Risk: 60/100
  🚪 Entry point

● validateBatch
  src/admin/bulk-operations.ts:89
  Risk: 45/100
```

### Filter by Risk

```bash
# Only high risk
drift test-topology uncovered --min-risk high

# Limit results
drift test-topology uncovered --limit 10
```

### MCP Tool

```json
{
  "action": "uncovered",
  "minRisk": "high",
  "limit": 20
}
```

---

## Test Coverage Analysis

The test topology provides coverage information as part of the status and build commands:

```bash
drift test-topology status
```

Shows coverage metrics including:
- File coverage percentage
- Function coverage percentage
- Quality scores by framework

### MCP Tool

```json
{
  "action": "status"
}
```

---

## Mock Analysis

### Find Mock Patterns

```bash
drift test-topology mocks
```

**Output:**
```
🎭 Mock Analysis
────────────────────────────────────────────────────────────

🎭 Mock Summary
──────────────────────────────────────────────────────────
  Total Mocks:     145
  External:        89 (61%)
  Internal:        56 (39%)
  Avg Mock Ratio:  35%

📦 Most Mocked Modules
──────────────────────────────────────────────────────────
  @prisma/client           ████████████████████ 45
  node-fetch               ████████████████ 34
  ../services/auth         ██████████ 23

⚠️  High Mock Ratio Tests
──────────────────────────────────────────────────────────
  ● should process payment
    tests/payments/processor.test.ts (78% mocked)
  ● should handle bulk update
    tests/admin/bulk.test.ts (72% mocked)
```

### MCP Tool

```json
{
  "action": "mocks"
}
```

---

## Test Quality Metrics

Test quality metrics are included in the build and status output:

```bash
drift test-topology build
```

Shows quality scores including:
- Average quality score (0-100)
- Framework breakdown
- Mock ratio analysis

### MCP Tool

```json
{
  "action": "status"
}
```

---

## CI/CD Integration

### Run Only Affected Tests

```bash
# Get affected tests as JSON
drift test-topology affected src/auth/login.ts --format json > affected.json

# Run with Jest
jest $(cat affected.json | jq -r '.result.tests[].file' | sort -u | tr '\n' ' ')

# Run with Vitest
vitest run $(cat affected.json | jq -r '.result.tests[].file' | sort -u | tr '\n' ' ')
```

### GitHub Actions Example

```yaml
name: Smart Tests
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          
      - name: Install
        run: npm ci
        
      - name: Install Drift
        run: npm install -g driftdetect
        
      - name: Build Test Topology
        run: drift test-topology build
        
      - name: Get Changed Files
        id: changed
        run: |
          FILES=$(git diff --name-only origin/main...HEAD | grep -E '\.(ts|tsx|js|jsx)$' | tr '\n' ' ')
          echo "files=$FILES" >> $GITHUB_OUTPUT
          
      - name: Get Affected Tests
        if: steps.changed.outputs.files != ''
        id: affected
        run: |
          TESTS=$(drift test-topology affected ${{ steps.changed.outputs.files }} --format json | jq -r '.result.tests[].file' | sort -u | tr '\n' ' ')
          echo "tests=$TESTS" >> $GITHUB_OUTPUT
          
      - name: Run Affected Tests
        if: steps.affected.outputs.tests != ''
        run: npm test -- ${{ steps.affected.outputs.tests }}
        
      - name: Skip Tests
        if: steps.affected.outputs.tests == ''
        run: echo "No tests affected by changes"
```

### Pre-commit Hook

```bash
#!/bin/sh
# .husky/pre-commit

# Get changed files
CHANGED=$(git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | tr '\n' ' ')

if [ -n "$CHANGED" ]; then
  # Get affected tests
  AFFECTED=$(drift test-topology affected $CHANGED --format json 2>/dev/null | jq -r '.result.tests[].file' | sort -u | tr '\n' ' ')

  if [ -n "$AFFECTED" ]; then
    echo "Running affected tests..."
    npm test -- $AFFECTED
  fi
fi
```

---

## How It Works

### 1. Test File Detection

Drift identifies test files by:
- File patterns: `*.test.ts`, `*.spec.ts`, `__tests__/*`
- Framework markers: `describe()`, `it()`, `test()`
- Directory conventions: `tests/`, `__tests__/`

### 2. Import Analysis

Drift traces imports from test files:

```typescript
// tests/auth/login.test.ts
import { loginUser } from '../../src/auth/login';
import { UserRepository } from '../../src/repositories/user';

// Drift maps:
// tests/auth/login.test.ts → src/auth/login.ts
// tests/auth/login.test.ts → src/repositories/user.ts
```

### 3. Call Graph Integration

Drift uses the call graph to find indirect dependencies:

```
tests/auth/login.test.ts
  → imports src/auth/login.ts
    → calls src/auth/session.ts
      → calls src/repositories/user.ts
```

So changes to `src/repositories/user.ts` affect `tests/auth/login.test.ts`.

### 4. Mock Detection

Drift identifies mocked dependencies:

```typescript
jest.mock('../../src/repositories/user');

// Drift knows: this test doesn't actually test UserRepository
// So changes to UserRepository don't require this test
```

---

## Supported Test Frameworks

| Framework | Language | Detection |
|-----------|----------|-----------|
| Jest | JS/TS | ✅ Full |
| Vitest | JS/TS | ✅ Full |
| Mocha | JS/TS | ✅ Full |
| pytest | Python | ✅ Full |
| unittest | Python | ✅ Full |
| JUnit | Java | ✅ Full |
| xUnit | C# | ✅ Full |
| PHPUnit | PHP | ✅ Full |
| Go testing | Go | ✅ Full |
| Rust #[test] | Rust | ✅ Full |
| Google Test | C++ | ✅ Full |
| Catch2 | C++ | ✅ Full |

---

## Best Practices

### 1. Build Topology Regularly

```bash
# Add to CI
drift test-topology build

# Or run after significant changes
drift scan
```

### 2. Use Affected Tests in CI

Don't run the full suite on every PR:

```bash
drift test-topology affected src/changed-file.ts --format json
```

### 3. Monitor Uncovered Code

```bash
# Weekly check
drift test-topology uncovered --min-risk high
```

### 4. Fix Mock Inconsistencies

```bash
drift test-topology mocks
# Review and standardize mock patterns
```

---

## Troubleshooting

### "No test mappings found"

1. Check test files are detected:
   ```bash
   drift test-topology status
   ```

2. Verify test file patterns in config:
   ```json
   // .drift/config.json
   {
     "testing": {
       "patterns": ["**/*.test.ts", "**/*.spec.ts", "tests/**/*"]
     }
   }
   ```

### "Affected tests seem wrong"

1. Rebuild topology:
   ```bash
   drift test-topology build --force
   ```

2. Check for dynamic imports that Drift can't trace

### "Missing framework support"

For custom test frameworks, add patterns:

```json
// .drift/config.json
{
  "testing": {
    "frameworks": {
      "custom": {
        "testPattern": "myTest\\(",
        "describePattern": "mySuite\\("
      }
    }
  }
}
```
