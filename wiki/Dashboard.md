# Dashboard

Drift includes a web dashboard for visualizing patterns, call graphs, and codebase health.

## Starting the Dashboard

```bash
drift dashboard
```

**Output:**
```
🎯 Drift Dashboard

Starting server on http://localhost:3847
Opening browser...

Press Ctrl+C to stop
```

### Options

```bash
# Custom port
drift dashboard --port 3000

# Don't auto-open browser
drift dashboard --no-browser

# Verbose logging
drift dashboard --verbose
```

---

## Dashboard Features

### Pattern Overview

View all discovered and approved patterns:

- Pattern categories and counts
- Confidence scores
- Location counts
- Approval status

### Pattern Details

Click any pattern to see:

- All locations where the pattern appears
- Code examples
- Outliers (code that doesn't match)
- Confidence breakdown

### Call Graph Visualization

Interactive visualization of your call graph:

- Function relationships
- Data flow paths
- Entry points
- Sensitive data access

### Health Score

Overall codebase health based on:

- Pattern consistency
- Test coverage
- Coupling metrics
- Security boundaries

### Trends

Track changes over time:

- Pattern confidence trends
- New patterns discovered
- Outliers introduced
- Health score history

---

## Screenshots

### Main Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Drift Dashboard                                    [Search] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Health Score: 78/100                                           │
│  ████████████████████░░░░░                                      │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Patterns    │ │ Call Graph  │ │ Security    │               │
│  │    127      │ │   1,842     │ │    47       │               │
│  │  approved   │ │  functions  │ │  boundaries │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
│  Recent Activity                                                │
│  ─────────────────────────────────────────────                  │
│  • 3 new patterns discovered                                    │
│  • 2 outliers in api category                                   │
│  • Health score +2 from last scan                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Pattern View

```
┌─────────────────────────────────────────────────────────────────┐
│  Patterns > api-rest-controller                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  api-rest-controller                          [Approve] [Ignore]│
│  ═══════════════════════════════════════════════════════════    │
│                                                                 │
│  Status: Discovered                                             │
│  Confidence: 0.92 ████████████████████░                         │
│  Locations: 47                                                  │
│  Category: api                                                  │
│                                                                 │
│  Description:                                                   │
│  REST controller pattern with @Controller decorator and         │
│  standard HTTP method handlers.                                 │
│                                                                 │
│  Example:                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ @Controller('/api/v1/users')                            │   │
│  │ export class UsersController {                          │   │
│  │   @Get('/:id')                                          │   │
│  │   async getUser(@Param('id') id: string) {              │   │
│  │     return this.userService.findById(id);               │   │
│  │   }                                                     │   │
│  │ }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Locations (47)                                                 │
│  ─────────────────────────────────────────────                  │
│  src/controllers/users.controller.ts:12                         │
│  src/controllers/orders.controller.ts:8                         │
│  src/controllers/products.controller.ts:15                      │
│  ...                                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Call Graph View

```
┌─────────────────────────────────────────────────────────────────┐
│  Call Graph > handleLogin                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌──────────────┐                             │
│                    │ handleLogin  │                             │
│                    └──────┬───────┘                             │
│              ┌────────────┼────────────┐                        │
│              ▼            ▼            ▼                        │
│     ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│     │ findUser   │ │ verifyPwd  │ │ createSess │               │
│     └─────┬──────┘ └────────────┘ └─────┬──────┘               │
│           ▼                             ▼                       │
│     ┌────────────┐               ┌────────────┐                │
│     │ db.query   │               │ redis.set  │                │
│     │ 🔴 users   │               │            │                │
│     └────────────┘               └────────────┘                │
│                                                                 │
│  Legend: 🔴 Sensitive data access                               │
│                                                                 │
│  Data Access:                                                   │
│  • users.email (PII)                                            │
│  • users.password_hash (SENSITIVE)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Access

The dashboard exposes a REST API:

### Get Status

```bash
curl http://localhost:3000/api/status
```

### Get Patterns

```bash
curl http://localhost:3000/api/patterns
curl http://localhost:3000/api/patterns/api-rest-controller
```

### Get Call Graph

```bash
curl http://localhost:3000/api/callgraph/function/handleLogin
```

---

## Configuration

### Custom Port

```json
// .drift/config.json
{
  "dashboard": {
    "port": 3847,
    "host": "0.0.0.0"
  }
}
```

### Authentication

For team environments, enable authentication:

```json
{
  "dashboard": {
    "auth": {
      "enabled": true,
      "type": "basic",
      "users": {
        "admin": "$2b$10$..."
      }
    }
  }
}
```

---

## Troubleshooting

### Dashboard won't start

1. Check port is available: `lsof -i :3847`
2. Try different port: `drift dashboard --port 3000`
3. Check for errors: `drift dashboard --verbose`

### No data showing

1. Run a scan first: `drift scan`
2. Check `.drift/` directory exists
3. Verify patterns were discovered: `drift status`

### Slow loading

1. Large codebases may take time to load
2. Build call graph first: `drift callgraph build`
3. Use incremental scans: `drift scan --incremental`

---

## Next Steps

- [Architecture](Architecture) — How Drift works
- [Pattern Categories](Pattern-Categories) — Understanding patterns
- [Call Graph Analysis](Call-Graph-Analysis) — Data flow analysis
