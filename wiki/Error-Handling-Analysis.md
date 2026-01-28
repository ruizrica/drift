# Error Handling Analysis

Drift provides deep analysis of error handling patterns, detecting gaps, boundaries, and unhandled error paths in your codebase.

## Overview

The error handling analyzer:
- Maps try/catch blocks and error boundaries
- Detects swallowed errors and bare catch clauses
- Finds unhandled async error paths
- Calculates error handling quality scores
- Suggests improvements

---

## Quick Start

```bash
# Build error handling analysis
drift error-handling build

# View overview
drift error-handling status

# Find gaps
drift error-handling gaps

# List error boundaries
drift error-handling boundaries

# Find unhandled paths
drift error-handling unhandled

# Analyze specific function
drift error-handling analyze src/api/users.ts:createUser
```

---

## Commands

### Build Analysis

```bash
drift error-handling build
```

Analyzes your codebase and builds the error handling topology. Requires call graph to be built first.

**Output:**
```
🛡️  Building Error Handling Analysis
══════════════════════════════════════════════════

✓ Error handling analysis built successfully

📊 Summary
──────────────────────────────────────────────────
  Functions:       847
  Coverage:        72%
  Avg Quality:     68/100
  Unhandled Paths: 12

📈 Quality Distribution
──────────────────────────────────────────────────
  ● Excellent: 234
  ● Good:      312
  ● Fair:      189
  ● Poor:      112

⚠️  Top Issues
──────────────────────────────────────────────────
  🔴 Swallowed errors: 23
  🟡 Unhandled async: 15
  🔵 Bare catch: 8
```

### Status Overview

```bash
drift error-handling status
```

Shows current error handling health.

### Find Gaps

```bash
drift error-handling gaps [options]
```

**Options:**
- `-l, --limit <number>` — Maximum results (default: 20)
- `-s, --min-severity <level>` — Minimum severity: low, medium, high, critical

**Output:**
```
🔍 Error Handling Gaps
────────────────────────────────────────────────────────────

🔴 processPayment
  src/services/payment.ts:45
  Type: No error handling
  Risk: 85/100
  External API call without try/catch
  → Add try/catch with specific error handling

🟡 fetchUserData
  src/api/users.ts:23
  Type: Swallowed error
  Risk: 65/100
  Catch block logs but doesn't rethrow or handle
  → Either rethrow or implement recovery logic
```

### List Boundaries

```bash
drift error-handling boundaries
```

Shows all error boundaries (try/catch blocks that protect code paths).

**Output:**
```
🛡️  Error Boundaries
────────────────────────────────────────────────────────────

🛡️ handleApiRequest
  src/middleware/error-handler.ts:12
  Coverage: 95%
  Catches from: 47 functions
  Handles: ApiError, ValidationError

🏗️ ErrorBoundary (React)
  src/components/ErrorBoundary.tsx:8
  Coverage: 100%
  Catches from: 156 components
  Framework: react
```

### Find Unhandled Paths

```bash
drift error-handling unhandled [options]
```

Finds error paths that can propagate to entry points without being caught.

**Options:**
- `-s, --min-severity <level>` — Minimum severity (default: medium)

**Output:**
```
⚠️  Unhandled Error Paths
────────────────────────────────────────────────────────────

🔴 POST /api/payments
  Database errors can reach HTTP handler uncaught
  Path length: 4 functions
  Error type: DatabaseError
  → Suggested boundary: src/api/payments.ts:handlePayment

🟡 WebSocket onMessage
  Parse errors propagate to connection handler
  Path length: 3 functions
  Error type: JSONParseError
  → Suggested boundary: src/ws/handler.ts:onMessage
```

### Analyze Function

```bash
drift error-handling analyze <function>
```

Deep analysis of a specific function's error handling.

**Example:**
```bash
drift error-handling analyze src/services/user.ts:createUser
```

**Output:**
```
🔍 Function Analysis: createUser
────────────────────────────────────────────────────────────

Function Info
──────────────────────────────────────────────────
  Has try/catch: Yes
  Can throw:     Yes
  Is async:      Yes
  Quality:       75/100
  Protected:     Yes

Catch Clauses
──────────────────────────────────────────────────
  Line 45: catches ValidationError → recover
  Line 52: catches DatabaseError → rethrow

Incoming Errors
──────────────────────────────────────────────────
  ← validateUserInput (ValidationError)
  ← hashPassword (CryptoError)

Outgoing Errors
──────────────────────────────────────────────────
  → saveToDatabase (caught)
  → sendWelcomeEmail (uncaught)

⚠️  Issues
──────────────────────────────────────────────────
  🟡 Email errors not handled - could fail silently

💡 Suggestions
──────────────────────────────────────────────────
  → Add error handling for sendWelcomeEmail
  → Consider using a job queue for email sending
```

---

## MCP Tool

### drift_error_handling

```typescript
drift_error_handling({
  action: "status" | "gaps" | "boundaries" | "unhandled" | "analyze",
  function?: string,      // For analyze action (function path)
  limit?: number,         // For gaps action (default: 20)
  minSeverity?: "low" | "medium" | "high" | "critical"  // For gaps/unhandled (default: medium)
})
```

**Actions:**
- `status` — Overview of error handling health
- `gaps` — Find error handling gaps
- `boundaries` — List error boundaries
- `unhandled` — Find unhandled error paths
- `analyze` — Analyze specific function

---

## Gap Types

| Type | Description | Risk |
|------|-------------|------|
| `no-try-catch` | Function makes risky calls without error handling | High |
| `swallowed-error` | Catch block doesn't rethrow or handle properly | Medium |
| `unhandled-async` | Async operation without await or .catch() | High |
| `bare-catch` | Catch block with no error parameter | Low |
| `missing-boundary` | Entry point without error protection | Critical |

---

## Quality Scoring

Each function receives a quality score (0-100) based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Has try/catch | 30% | Function has error handling |
| Specific catches | 20% | Catches specific error types |
| No swallowing | 20% | Doesn't silently swallow errors |
| Async handling | 15% | Properly handles async errors |
| Boundary coverage | 15% | Protected by error boundary |

**Quality Levels:**
- **Excellent** (80-100): Comprehensive error handling
- **Good** (60-79): Adequate error handling
- **Fair** (40-59): Basic error handling
- **Poor** (0-39): Insufficient error handling

---

## Error Boundaries

Drift detects two types of error boundaries:

### Code Boundaries
Standard try/catch blocks that protect code paths:

```typescript
// Detected as error boundary
try {
  await processPayment(order);
} catch (error) {
  if (error instanceof PaymentError) {
    return { success: false, error: error.message };
  }
  throw error;
}
```

### Framework Boundaries
Framework-specific error handling:

```typescript
// React Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    logError(error, info);
  }
}

// Express error middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

// NestJS exception filter
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) { }
}
```

---

## Best Practices

### 1. Protect Entry Points

Every entry point (HTTP handler, WebSocket handler, job processor) should have error handling:

```typescript
// ✅ Good
app.post('/api/users', async (req, res) => {
  try {
    const user = await createUser(req.body);
    res.json(user);
  } catch (error) {
    handleApiError(error, res);
  }
});

// ❌ Bad - errors propagate to framework
app.post('/api/users', async (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
});
```

### 2. Don't Swallow Errors

```typescript
// ❌ Bad - swallowed error
try {
  await riskyOperation();
} catch (error) {
  console.log('Error:', error);
  // Error is lost!
}

// ✅ Good - proper handling
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error });
  throw new OperationError('Failed to complete operation', { cause: error });
}
```

### 3. Use Specific Catches

```typescript
// ❌ Bad - catches everything
try {
  await processOrder(order);
} catch (error) {
  return { error: 'Something went wrong' };
}

// ✅ Good - specific handling
try {
  await processOrder(order);
} catch (error) {
  if (error instanceof ValidationError) {
    return { error: error.message, fields: error.fields };
  }
  if (error instanceof PaymentError) {
    return { error: 'Payment failed', code: error.code };
  }
  throw error; // Rethrow unknown errors
}
```

### 4. Handle Async Errors

```typescript
// ❌ Bad - unhandled promise rejection
async function processItems(items) {
  items.forEach(item => {
    processItem(item); // Missing await!
  });
}

// ✅ Good - proper async handling
async function processItems(items) {
  await Promise.all(
    items.map(item => processItem(item))
  );
}
```

---

## Integration with Other Features

### Call Graph
Error handling analysis uses the call graph to trace error propagation paths.

### Quality Gates
Add error handling checks to your CI:

```yaml
# .github/workflows/ci.yml
- name: Check Error Handling
  run: |
    drift error-handling build
    drift error-handling gaps --min-severity high --format json > gaps.json
    if [ $(jq '.total' gaps.json) -gt 0 ]; then
      echo "High severity error handling gaps found"
      exit 1
    fi
```

### Constraints
Create constraints to enforce error handling patterns:

```bash
drift constraints extract
# Discovers patterns like "all API handlers must have try/catch"
```

---

## Next Steps

- [Call Graph Analysis](Call-Graph-Analysis) — Understand error propagation
- [Quality Gates](Quality-Gates) — Enforce error handling in CI
- [Constraints](Constraints) — Define error handling requirements
