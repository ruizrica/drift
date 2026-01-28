# Wrappers Detection

Drift detects framework wrapper patterns — custom abstractions built on top of framework primitives like React hooks, Express middleware, and database clients.

## Overview

Wrappers are functions that wrap framework primitives to add custom behavior:

```typescript
// This is a wrapper around React's useState
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initial;
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue] as const;
}
```

Drift identifies these patterns and clusters similar wrappers together.

---

## Quick Start

```bash
# Scan for wrappers
drift wrappers

# Include test files
drift wrappers --include-tests

# Filter by category
drift wrappers --category state-management

# JSON output
drift wrappers --json

# Verbose output
drift wrappers --verbose
```

---

## Command Options

```bash
drift wrappers [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --dir <path>` | Project directory | `.` |
| `-j, --json` | Output as JSON | false |
| `-v, --verbose` | Show detailed output | false |
| `--include-tests` | Include test files | false |
| `--min-confidence <n>` | Minimum cluster confidence (0-1) | 0.5 |
| `--min-cluster-size <n>` | Minimum wrappers per cluster | 2 |
| `--max-depth <n>` | Maximum wrapper depth | 10 |
| `--category <cat>` | Filter by category | all |

---

## Output

```
📊 Wrapper Analysis Summary

  Files scanned:     234
  Functions found:   1,847
  Wrappers detected: 45
  Clusters found:    12
  Duration:          1,234ms

🔧 Frameworks Detected

  react - 156 primitives
  express - 23 primitives
  prisma - 18 primitives

📦 Wrapper Clusters

  useAuth Hooks (state-management) 92%
    Custom authentication state management hooks
    Primitives: useState, useEffect, useContext +2 more
    8 wrappers, avg depth 2.3, 156 usages

  API Client Wrappers (data-fetching) 87%
    Wrappers around fetch/axios for API calls
    Primitives: fetch, axios.get, axios.post
    5 wrappers, avg depth 1.8, 89 usages

  Database Helpers (data-access) 85%
    Prisma client wrappers with error handling
    Primitives: prisma.user.findMany, prisma.user.create
    6 wrappers, avg depth 2.1, 67 usages

📈 Wrappers by Category

  state-management     ████████████████████ 15
  data-fetching        ████████████████ 12
  data-access          ██████████ 8
  authentication       ████████ 6
  error-handling       ████ 4
```

---

## Wrapper Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `state-management` | State hooks and stores | useLocalStorage, useReducer wrappers |
| `data-fetching` | API and data fetching | useFetch, useQuery wrappers |
| `side-effects` | Effect management | useDebounce, useInterval |
| `authentication` | Auth state and logic | useAuth, useSession |
| `authorization` | Permission checking | usePermissions, useRoles |
| `validation` | Input validation | useForm, useValidation |
| `dependency-injection` | DI patterns | useService, useRepository |
| `middleware` | Request/response middleware | withAuth, withLogging |
| `testing` | Test utilities | renderWithProviders |
| `logging` | Logging wrappers | useLogger, withTelemetry |
| `caching` | Cache management | useCachedQuery, withCache |
| `error-handling` | Error boundaries | useErrorBoundary, withErrorHandler |
| `async-utilities` | Async helpers | useAsync, usePromise |
| `form-handling` | Form state | useFormField, useFormSubmit |
| `routing` | Navigation wrappers | useTypedRouter, useQueryParams |
| `factory` | Factory patterns | createService, createRepository |
| `decorator` | Decorator patterns | @Cached, @Logged |
| `utility` | General utilities | usePrevious, useToggle |

---

## MCP Tool

### drift_wrappers

```typescript
drift_wrappers({
  category?: string,           // Filter by category
  includeTests?: boolean,      // Include test files (default: false)
  limit?: number,              // Max clusters to return (default: 20)
  minConfidence?: number,      // Min cluster confidence 0-1 (default: 0.5)
  minClusterSize?: number,     // Min wrappers per cluster (default: 2)
  maxDepth?: number            // Max wrapper depth (default: 10)
})
```

**Categories:**
- `state-management`, `data-fetching`, `side-effects`, `authentication`
- `authorization`, `validation`, `dependency-injection`, `middleware`
- `testing`, `logging`, `caching`, `error-handling`, `async-utilities`
- `form-handling`, `routing`, `factory`, `decorator`, `utility`, `other`

**Returns:**
```json
{
  "clusters": [
    {
      "name": "useAuth Hooks",
      "category": "state-management",
      "confidence": 0.92,
      "description": "Custom authentication state management hooks",
      "primitiveSignature": ["useState", "useEffect", "useContext"],
      "wrappers": [
        {
          "name": "useAuth",
          "file": "src/hooks/useAuth.ts",
          "line": 12,
          "depth": 2,
          "calledBy": ["LoginForm", "Dashboard", "ProfilePage"]
        }
      ],
      "avgDepth": 2.3,
      "totalUsages": 156
    }
  ],
  "frameworks": [
    { "name": "react", "primitiveCount": 156 }
  ],
  "summary": {
    "totalWrappers": 45,
    "totalClusters": 12,
    "wrappersByCategory": {
      "state-management": 15,
      "data-fetching": 12
    }
  }
}
```

---

## Understanding Wrapper Depth

Wrapper depth indicates how many layers of abstraction exist:

```typescript
// Depth 1: Direct wrapper
function useToggle(initial: boolean) {
  const [value, setValue] = useState(initial);  // Wraps useState
  return [value, () => setValue(v => !v)];
}

// Depth 2: Wrapper of wrapper
function useDarkMode() {
  const [isDark, toggle] = useToggle(false);    // Wraps useToggle
  useEffect(() => {
    document.body.classList.toggle('dark', isDark);
  }, [isDark]);
  return [isDark, toggle];
}

// Depth 3: Another layer
function useTheme() {
  const [isDark, toggleDark] = useDarkMode();   // Wraps useDarkMode
  const [accent, setAccent] = useState('blue');
  return { isDark, toggleDark, accent, setAccent };
}
```

High depth (>5) may indicate over-abstraction.

---

## Cluster Confidence

Confidence scores indicate how certain Drift is about the cluster:

| Score | Meaning |
|-------|---------|
| 90-100% | Very confident — clear pattern with consistent usage |
| 70-89% | Confident — good pattern match |
| 50-69% | Moderate — possible pattern, review recommended |
| <50% | Low — may be false positive |

Factors affecting confidence:
- Number of wrappers in cluster
- Consistency of primitive usage
- Usage count across codebase
- Naming conventions

---

## Use Cases

### 1. Discover Custom Hooks

Find all custom React hooks in your codebase:

```bash
drift wrappers --category state-management --verbose
```

### 2. Audit Abstraction Layers

Check for over-abstraction:

```bash
drift wrappers --max-depth 10 --json | jq '.clusters[] | select(.avgDepth > 4)'
```

### 3. Find Unused Wrappers

Identify wrappers with low usage:

```bash
drift wrappers --json | jq '.clusters[] | select(.totalUsages < 3)'
```

### 4. Document Patterns

Generate documentation for your wrapper patterns:

```bash
drift wrappers --verbose > docs/WRAPPER_PATTERNS.md
```

---

## Framework Detection

Drift automatically detects these frameworks and their primitives:

### React
- `useState`, `useEffect`, `useContext`, `useReducer`
- `useMemo`, `useCallback`, `useRef`
- `useLayoutEffect`, `useImperativeHandle`

### Express
- `app.get`, `app.post`, `app.use`
- `router.get`, `router.post`
- `req.body`, `res.json`, `next()`

### Prisma
- `prisma.*.findMany`, `prisma.*.findUnique`
- `prisma.*.create`, `prisma.*.update`
- `prisma.$transaction`

### Axios
- `axios.get`, `axios.post`, `axios.put`
- `axios.create`, `axios.interceptors`

### And more...
- NestJS decorators and providers
- TypeORM repositories
- Mongoose models
- Redis clients

---

## Best Practices

### 1. Keep Wrapper Depth Low

```typescript
// ✅ Good - shallow wrapper
function useUser(id: string) {
  return useQuery(['user', id], () => fetchUser(id));
}

// ⚠️ Consider - deep nesting
function useUserProfile(id: string) {
  const user = useUser(id);           // Depth 1
  const settings = useUserSettings(id); // Depth 1
  const merged = useMergedData(user, settings); // Depth 2
  return useFormattedProfile(merged);  // Depth 3
}
```

### 2. Name Wrappers Clearly

```typescript
// ✅ Good - clear naming
function useLocalStorage<T>(key: string, initial: T) { }
function useDebounce<T>(value: T, delay: number) { }
function withErrorBoundary(Component: React.FC) { }

// ❌ Bad - unclear naming
function useData() { }
function helper() { }
function wrap(fn: Function) { }
```

### 3. Document Wrapper Purpose

```typescript
/**
 * Persists state to localStorage with automatic serialization.
 * 
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 */
function useLocalStorage<T>(key: string, initial: T) { }
```

### 4. Cluster Related Wrappers

Keep related wrappers in the same file or directory:

```
src/hooks/
├── auth/
│   ├── useAuth.ts
│   ├── useSession.ts
│   └── usePermissions.ts
├── data/
│   ├── useQuery.ts
│   ├── useMutation.ts
│   └── useCache.ts
└── ui/
    ├── useToggle.ts
    ├── useDebounce.ts
    └── useMediaQuery.ts
```

---

## Integration

### With Pattern Detection

Wrapper patterns are automatically detected and can be approved:

```bash
drift scan
drift status --category structural
# Look for "Custom Hook Pattern" or "Middleware Wrapper Pattern"
drift approve <pattern-id>
```

### With Call Graph

Wrappers appear in call graph analysis:

```bash
drift callgraph callers useAuth
# Shows all components using the useAuth wrapper
```

### With Test Topology

See which wrappers have test coverage:

```bash
drift test-topology coverage src/hooks/useAuth.ts
```

---

## Next Steps

- [Pattern Categories](Pattern-Categories) — See all pattern types
- [Call Graph Analysis](Call-Graph-Analysis) — Trace wrapper usage
- [Hooks Detection](MCP-Tools-Reference#drift_hooks) — Find React/Vue hooks
