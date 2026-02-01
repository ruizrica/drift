# Drift CI - Enterprise-Grade Autonomous CI Agent

The only CI agent that understands your codebase patterns, constraints, and conventions - and enforces them automatically.

## Why Drift CI?

Traditional CI tools check syntax and run tests. Drift CI understands your **architecture**:

- **Pattern Compliance** - Enforces coding patterns learned from your codebase
- **Constraint Verification** - Validates architectural invariants ("all API endpoints must have auth")
- **Impact Analysis** - Shows the blast radius of every change
- **Security Boundaries** - Catches data leaks before they ship
- **Test Coverage** - Flags untested code that touches sensitive data
- **Module Coupling** - Warns about dependency cycles and coupling issues
- **Error Handling** - Finds missing error handling and swallowed exceptions
- **Contract Checking** - Detects BE/FE API mismatches
- **Secret Detection** - Catches hardcoded credentials

## Installation

```bash
npm install -g driftdetect-ci
```

## Quick Start

### Analyze a Pull Request

```bash
drift-ci analyze --pr 123 --owner myorg --repo myrepo
```

### Analyze Local Changes

```bash
drift-ci local
```

## GitHub Action

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
          fail-on-violation: true
```

## Analysis Capabilities

### Core Analysis (Always On)

| Feature | Description |
|---------|-------------|
| Pattern Compliance | Checks code against learned patterns |
| Constraint Verification | Validates architectural constraints |
| Impact Analysis | Calculates change blast radius |
| Security Boundaries | Detects data boundary violations |

### Extended Analysis (Configurable)

| Feature | Description |
|---------|-------------|
| Test Coverage | Finds untested functions |
| Module Coupling | Detects dependency cycles |
| Error Handling | Finds missing error handling |
| Contract Checking | Detects BE/FE mismatches |
| Constants Analysis | Finds magic values and secrets |

### Advanced Analysis (Enterprise)

| Feature | Description |
|---------|-------------|
| Quality Gates | Configurable pass/fail policies |
| Pattern Trends | Track pattern health over time |
| Decision Mining | Auto-generate ADRs from git history |
| Speculative Execution | Simulate implementation approaches |

## Output Formats

- **GitHub** - PR comments with inline annotations
- **GitLab** - MR comments with code quality reports
- **SARIF** - IDE integration (VS Code, etc.)
- **JSON** - Machine-readable for custom integrations
- **Text** - Human-readable console output

## Configuration

```yaml
# .drift/ci-config.yaml
analysis:
  patternCheck: true
  constraintVerification: true
  impactAnalysis: true
  securityBoundaries: true
  testCoverage: true
  moduleCoupling: true
  errorHandling: true
  
qualityGates:
  enabled: true
  policy: strict
  
thresholds:
  minPatternConfidence: 0.7
  maxImpactDepth: 10
  minTestCoverage: 80
```

## Programmatic Usage

```typescript
import { 
  PRAnalyzer, 
  createDriftAdapter, 
  GitHubProvider,
  DEFAULT_CONFIG 
} from 'driftdetect-ci';

// Initialize
const github = new GitHubProvider({ token: process.env.GITHUB_TOKEN });
const deps = await createDriftAdapter({ rootPath: '.' });
const analyzer = new PRAnalyzer(deps, DEFAULT_CONFIG.analysis);

// Analyze
const prContext = await github.getPRContext(123, 'owner', 'repo');
const result = await analyzer.analyze(prContext, '.');

// Check result
if (result.status === 'fail') {
  console.log('Violations:', result.patterns.violations);
  console.log('Constraints:', result.constraints.violated);
  console.log('Security:', result.security.hardcodedSecrets);
  process.exit(1);
}
```

## Analysis Result Structure

```typescript
interface AnalysisResult {
  status: 'pass' | 'warn' | 'fail';
  summary: string;
  score: number; // 0-100 overall health
  
  // Core
  patterns: PatternAnalysis;
  constraints: ConstraintAnalysis;
  impact: ImpactAnalysis;
  security: SecurityAnalysis;
  
  // Extended
  tests: TestAnalysis;
  coupling: CouplingAnalysis;
  errors: ErrorAnalysis;
  contracts: ContractAnalysis;
  constants: ConstantsAnalysis;
  
  // Quality Gates
  qualityGates: QualityGateResult;
  
  // AI
  suggestions: Suggestion[];
  learnings: Learning[];
}
```

## Enterprise Features

### Quality Gates

Define pass/fail policies for your team:

```yaml
qualityGates:
  policy: strict
  gates:
    patternCompliance: true
    constraintVerification: true
    regressionDetection: true
    impactSimulation: true
    securityBoundary: true
```

### Memory & Learning

Drift CI learns from your PRs:
- Patterns that get approved become conventions
- Corrections teach the system your preferences
- The more you use it, the smarter it gets

### Multi-Provider Support

- GitHub (Actions, Comments, Check Runs)
- GitLab (CI, MR Comments, Code Quality)
- Bitbucket (Pipelines, PR Comments)
- Azure DevOps (Pipelines, PR Comments)

## Requirements

- Node.js 18+
- A `.drift` directory (run `drift scan` first)

## License

Apache-2.0
