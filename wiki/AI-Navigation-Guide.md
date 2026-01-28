# AI Navigation Guide

A decision tree that helps AI agents pick the right Drift tools based on user intent. This is the "cheat sheet" for efficient tool selection.

## Overview

With 50 MCP tools available, AI agents need guidance on which tools to use. The Navigation Guide provides:

- **Decision Tree** — Match user keywords to tool sequences
- **Surgical Lookups** — Quick Q&A mappings
- **Common Mistakes** — What NOT to do

---

## The Decision Tree

### Code Generation Tasks

| User Says | Intent | Tool Sequence | Why |
|-----------|--------|---------------|-----|
| "add", "create", "implement", "build", "new feature" | Generate new code | `drift_context` → `drift_code_examples` → `drift_validate_change` | Context gives patterns, examples show implementations, validate checks compliance |
| "modal", "dialog", "popup", "form", "component" | Create UI component | `drift_context` → `drift_similar` → `drift_code_examples` | Find similar components first |
| "api", "endpoint", "route", "controller" | Create API endpoint | `drift_context` → `drift_typescript` (routes) → `drift_code_examples` | Check existing routes first |

### Bug Fixing Tasks

| User Says | Intent | Tool Sequence | Why |
|-----------|--------|---------------|-----|
| "fix", "bug", "error", "broken", "not working" | Fix a bug | `drift_context` → `drift_file_patterns` → `drift_callers` | Understand area, check conventions, find callers |
| "crash", "exception", "unhandled", "throw" | Fix error handling | `drift_error_handling` → `drift_callers` → `drift_code_examples` | Find gaps, trace call chain, see patterns |

### Refactoring Tasks

| User Says | Intent | Tool Sequence | Why |
|-----------|--------|---------------|-----|
| "refactor", "restructure", "reorganize", "clean up" | Refactor safely | `drift_impact_analysis` → `drift_coupling` → `drift_test_topology` | Check blast radius, find coupling, ensure tests |
| "move", "rename", "extract", "split" | Move/rename code | `drift_impact_analysis` → `drift_callers` → `drift_imports` | Check impact, find usages, fix imports |

### Security Tasks

| User Says | Intent | Tool Sequence | Why |
|-----------|--------|---------------|-----|
| "security", "vulnerability", "audit", "sensitive" | Security review | `drift_security_summary` → `drift_reachability` → `drift_env` | Overview, trace data, check secrets |
| "auth", "authentication", "authorization", "permission" | Review auth | `drift_context` (focus="auth") → `drift_middleware` → `drift_patterns_list` | Auth patterns, middleware, all auth patterns |

### Understanding Code

| User Says | Intent | Tool Sequence | Why |
|-----------|--------|---------------|-----|
| "understand", "explain", "how does", "what does" | Understand code | `drift_explain` → `drift_callers` → `drift_file_patterns` | Full explanation, usage, conventions |
| "who calls", "what calls", "used by", "dependencies" | Find relationships | `drift_callers` → `drift_impact_analysis` | Direct callers, full dependency tree |
| "data flow", "reaches", "access", "touches" | Trace data | `drift_reachability` → `drift_security_summary` | Forward/inverse data flow |

### Testing Tasks

| User Says | Intent | Tool Sequence | Why |
|-----------|--------|---------------|-----|
| "test", "coverage", "untested", "spec" | Work with tests | `drift_test_topology` → `drift_test_template` | Coverage status, generate scaffolding |

### Pattern Discovery

| User Says | Intent | Tool Sequence | Why |
|-----------|--------|---------------|-----|
| "pattern", "convention", "how do we", "standard" | Find patterns | `drift_patterns_list` → `drift_code_examples` | List patterns, see implementations |
| "similar", "like this", "example of", "show me" | Find similar code | `drift_similar` → `drift_code_examples` | Semantic search, pattern examples |

---

## Surgical Lookups

Quick answers to specific questions:

| Question | Tool | Example |
|----------|------|---------|
| Who calls this function? | `drift_callers` | `function: "handleSubmit"` |
| What's this function's signature? | `drift_signature` | `symbol: "createUser"` |
| What type is this? | `drift_type` | `type: "UserDTO"` |
| How do I import X? | `drift_imports` | `symbols: ["useState", "useEffect"], targetFile: "src/App.tsx"` |
| What changed recently? | `drift_recent` | `area: "src/api/"` |
| What dependencies do we use? | `drift_dependencies` | `search: "react"` |
| What middleware exists? | `drift_middleware` | `type: "auth"` |
| What hooks exist? | `drift_hooks` | `category: "fetch"` |
| What errors can occur? | `drift_errors` | `action: "types"` |
| Generate a test template | `drift_test_template` | `targetFile: "src/services/user.ts"` |
| Validate my code | `drift_prevalidate` | `code: "...", targetFile: "src/api/users.ts"` |

---

## Common Mistakes

### ❌ DON'T

1. **Skip `drift_context`** — It synthesizes multiple sources and saves tool calls
2. **Use `drift_code_examples` without `drift_context` first** — You need pattern IDs
3. **Guess file paths** — Use `drift_files_list` to find them
4. **Call language tools for general queries** — Use `drift_context` instead
5. **Make multiple calls when one suffices** — `drift_context` often has everything

### ✅ DO

1. **Start with `drift_context`** for any code generation task
2. **Use `drift_callers`** for "who uses X" questions — it's fast and precise
3. **Use `drift_similar`** when creating code similar to existing code
4. **Validate generated code** with `drift_validate_change` or `drift_prevalidate`
5. **Check `hints.nextActions`** in every response for guidance

---

## Tool Selection Flowchart

```
User Request
     │
     ▼
┌─────────────────────────────────────────┐
│  Is this a code generation task?         │
│  (add, create, implement, build)         │
└─────────────────────────────────────────┘
     │ Yes                    │ No
     ▼                        ▼
drift_context          ┌─────────────────────────────────────────┐
     │                 │  Is this a quick lookup?                 │
     ▼                 │  (signature, callers, type, imports)     │
drift_code_examples    └─────────────────────────────────────────┘
     │                      │ Yes                    │ No
     ▼                      ▼                        ▼
drift_validate_change  Use surgical tool      ┌─────────────────────────────────────────┐
                                              │  Is this analysis/understanding?         │
                                              │  (explain, impact, security)             │
                                              └─────────────────────────────────────────┘
                                                   │ Yes                    │ No
                                                   ▼                        ▼
                                              Use analysis tool       drift_status
                                              (explain, impact,       (general health)
                                               security_summary)
```

---

## MCP Tool: drift_capabilities

Get the full navigation guide programmatically:

```typescript
drift_capabilities({})
```

**Returns:**

```json
{
  "summary": "Drift provides 50 MCP tools for codebase intelligence",
  "agentNavigationGuide": {
    "decisionTree": [...],
    "surgicalLookups": [...],
    "commonMistakes": [...]
  },
  "layers": [...],
  "quickStart": {
    "steps": [
      "1. drift_status → Get health overview",
      "2. drift_context → Get curated context",
      "3. drift_code_examples → See implementations",
      "4. Generate code following patterns",
      "5. drift_validate_change → Verify compliance"
    ]
  }
}
```

---

## Quick Reference Card

### Starting a Task
```
drift_context → drift_code_examples → drift_validate_change
```

### Understanding Code
```
drift_explain → drift_callers → drift_impact_analysis
```

### Security Review
```
drift_security_summary → drift_reachability → drift_env
```

### Refactoring
```
drift_impact_analysis → drift_coupling → drift_test_topology
```

### Quick Lookups
```
drift_signature | drift_callers | drift_type | drift_imports
```

---

## Next Steps

- [MCP Tools Reference](MCP-Tools-Reference) — All 50 tools detailed
- [MCP Architecture](MCP-Architecture) — The 7-layer design
- [FAQ](FAQ) — Common questions
