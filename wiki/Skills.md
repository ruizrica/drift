# Skills

Skills are reusable implementation guides that AI agents can use to implement common patterns correctly.

## What are Skills?

Skills are curated, production-ready implementation guides for common software patterns. Each skill contains:

- **SKILL.md** — Complete implementation guide with code examples
- **Metadata** — Category, time estimate, compatibility
- **Multiple languages** — TypeScript and Python implementations

When you ask an AI agent to implement something like "add circuit breaker to my API client", Drift can provide the skill as context, ensuring the AI generates production-quality code.

---

## Available Skills (71)

Drift includes 71 skills across 12 categories:

### Resilience (10 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `circuit-breaker` | Prevent cascade failures with fail-fast | 4h |
| `retry-fallback` | Exponential backoff with fallbacks | 3h |
| `graceful-shutdown` | Clean shutdown handling | 2h |
| `graceful-degradation` | Degrade gracefully under load | 3h |
| `backpressure` | Handle overload with backpressure | 4h |
| `distributed-lock` | Distributed locking patterns | 4h |
| `leader-election` | Leader election for distributed systems | 4h |
| `resilient-storage` | Fault-tolerant storage patterns | 4h |
| `health-checks` | Liveness and readiness probes | 2h |
| `error-handling` | Comprehensive error handling | 3h |

### API & Integration (8 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `api-client` | Robust API client patterns | 4h |
| `api-versioning` | API versioning strategies | 3h |
| `idempotency` | Idempotent API operations | 3h |
| `rate-limiting` | Rate limiting implementation | 3h |
| `pagination` | Cursor and offset pagination | 2h |
| `request-validation` | Input validation patterns | 2h |
| `data-transformers` | DTO and data transformation | 2h |
| `webhook-security` | Secure webhook handling | 3h |

### Authentication & Security (7 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `jwt-auth` | JWT authentication with refresh | 4h |
| `supabase-auth` | Supabase authentication setup | 3h |
| `oauth-social-login` | OAuth and social login | 4h |
| `middleware-protection` | Auth middleware patterns | 3h |
| `row-level-security` | Database RLS patterns | 4h |
| `tier-entitlements` | Feature tiers and entitlements | 3h |
| `audit-logging` | Security audit logging | 3h |

### Workers & Jobs (6 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `background-jobs` | Background job processing | 4h |
| `dead-letter-queue` | DLQ for failed jobs | 3h |
| `job-state-machine` | Job state management | 4h |
| `worker-orchestration` | Worker coordination | 4h |
| `worker-health-monitoring` | Worker health checks | 3h |
| `server-tick` | Server tick loop patterns | 4h |

### Data Pipeline (7 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `batch-processing` | Batch data processing | 4h |
| `checkpoint-resume` | Resumable processing | 4h |
| `deduplication` | Data deduplication | 3h |
| `geographic-clustering` | Geo-based data clustering | 4h |
| `snapshot-aggregation` | Time-series aggregation | 4h |
| `validation-quarantine` | Data validation with quarantine | 3h |
| `analytics-pipeline` | Analytics data pipeline | 4h |

### Caching (3 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `caching-strategies` | Cache patterns and strategies | 4h |
| `intelligent-cache` | Smart cache invalidation | 4h |
| `soft-delete` | Soft delete with cache | 2h |

### Database (2 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `database-migrations` | Safe migration patterns | 3h |
| `multi-tenancy` | Multi-tenant database design | 4h |

### Observability (4 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `logging-observability` | Structured logging | 3h |
| `metrics-collection` | Metrics and monitoring | 3h |
| `anomaly-detection` | Anomaly detection patterns | 4h |
| `provenance-audit` | Data provenance tracking | 4h |

### Frontend (5 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `design-tokens` | Design token system | 3h |
| `mobile-components` | Mobile-first components | 4h |
| `pwa-setup` | Progressive Web App setup | 4h |
| `game-loop` | Fixed timestep game loop | 4h |
| `sse-streaming` | Server-sent events | 3h |

### Real-time (4 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `websocket-management` | WebSocket connection handling | 4h |
| `sse-resilience` | Resilient SSE connections | 3h |
| `atomic-matchmaking` | Real-time matchmaking | 4h |
| `community-feed` | Real-time feed patterns | 4h |

### AI & ML (4 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `ai-coaching` | AI coaching system | 4h |
| `ai-generation-client` | AI generation client | 4h |
| `prompt-engine` | Prompt engineering patterns | 4h |
| `scoring-engine` | ML scoring engine | 4h |

### Infrastructure (6 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `environment-config` | Environment configuration | 2h |
| `feature-flags` | Feature flag system | 3h |
| `monorepo-structure` | Monorepo organization | 3h |
| `typescript-strict` | Strict TypeScript setup | 2h |
| `cloud-storage` | Cloud storage patterns | 3h |
| `file-uploads` | Secure file uploads | 3h |

### Integrations (6 skills)
| Skill | Description | Time |
|-------|-------------|------|
| `email-service` | Email service integration | 3h |
| `stripe-integration` | Stripe payment integration | 4h |
| `error-sanitization` | Error message sanitization | 2h |
| `exception-taxonomy` | Exception hierarchy design | 3h |
| `fuzzy-matching` | Fuzzy string matching | 3h |

---

## Using Skills

### List Available Skills

```bash
drift skills list
```

**Output:**
```
🎯 Available Skills (71)

  Name                  Category      Time    Description
  ──────────────────────────────────────────────────────────────────────────────────────────
  circuit-breaker       resilience    4h      Implement the circuit breaker pattern to prevent...
  retry-fallback        resilience    3h      Implement retry with exponential backoff and...
  jwt-auth              auth          4h      Implement JWT authentication with refresh token...
  ...

Install a skill: drift skills install <name>
View details:    drift skills info <name>
```

### Filter by Category

```bash
drift skills list --category resilience
```

### Search Skills

```bash
drift skills search "authentication"
```

### View Skill Details

```bash
drift skills info circuit-breaker
```

**Output:**
```
🎯 circuit-breaker

  Description:   Implement the circuit breaker pattern to prevent cascade failures...
  Category:      resilience
  Time:          4h
  Compatibility: TypeScript/JavaScript, Python
  License:       MIT

  Files:
    - SKILL.md

  Preview:

    # Circuit Breaker Pattern

    Prevent cascade failures by failing fast when a service is unhealthy.

    ## When to Use This Skill

    - Adding resilience to external API calls
    - Protecting against slow or failing downstream services
    ...

Install: drift skills install circuit-breaker
```

### Install a Skill

```bash
# Install to .github/skills/
drift skills install circuit-breaker

# Install multiple skills
drift skills install circuit-breaker retry-fallback graceful-shutdown

# Install all skills
drift skills install --all

# Force overwrite existing
drift skills install circuit-breaker --force
```

### Uninstall a Skill

```bash
drift skills uninstall circuit-breaker
```

---

## Skill Structure

Each skill is a directory containing:

```
circuit-breaker/
└── SKILL.md          # Complete implementation guide
```

### SKILL.md Format

```markdown
---
name: circuit-breaker
description: Implement the circuit breaker pattern...
license: MIT
compatibility: TypeScript/JavaScript, Python
metadata:
  category: resilience
  time: 4h
  source: drift-masterguide
---

# Circuit Breaker Pattern

Prevent cascade failures by failing fast when a service is unhealthy.

## When to Use This Skill

- Adding resilience to external API calls
- Protecting against slow or failing downstream services

## Core Concepts

[Explanation of the pattern]

## TypeScript Implementation

```typescript
// Full implementation code
```

## Python Implementation

```python
# Full implementation code
```

## Usage Examples

[Real-world usage examples]

## Best Practices

[Do's and don'ts]

## Common Mistakes

[What to avoid]

## Related Patterns

[Links to related skills]
```

---

## AI Integration

### How AI Agents Use Skills

When you ask an AI agent to implement a pattern:

1. AI recognizes the pattern (e.g., "add circuit breaker")
2. AI loads the relevant skill from `.github/skills/`
3. AI uses the skill as context for code generation
4. Generated code follows the skill's best practices

### Example Conversation

**You**: "Add circuit breaker to my payment API client"

**AI (with skill context)**:
> I'll implement a circuit breaker following the established pattern. Based on the circuit-breaker skill:
>
> - Using 3-state model (CLOSED, OPEN, HALF_OPEN)
> - Configurable failure threshold (default: 5)
> - Timeout before retry (default: 30s)
> - Optional fallback function
>
> Here's the implementation...

### MCP Integration

The `drift_context` tool can include relevant skills:

```json
{
  "intent": "add_feature",
  "focus": "circuit breaker for API client"
}
```

Returns skill content as part of the context.

---

## Creating Custom Skills

### 1. Create Skill Directory

```bash
mkdir -p .github/skills/my-custom-skill
```

### 2. Create SKILL.md

```markdown
---
name: my-custom-skill
description: Description of what this skill does
license: MIT
compatibility: TypeScript/JavaScript
metadata:
  category: custom
  time: 2h
  source: internal
---

# My Custom Skill

[Your implementation guide]
```

### 3. Use the Skill

The skill is now available to AI agents when they work in your project.

---

## Best Practices

### 1. Install Relevant Skills

Don't install all 71 skills. Install only what's relevant:

```bash
# For a typical web API
drift skills install circuit-breaker retry-fallback rate-limiting jwt-auth
```

### 2. Keep Skills Updated

Skills are versioned with Drift. Update when you update Drift:

```bash
drift skills install --all --force
```

### 3. Customize for Your Stack

Fork skills and customize for your specific stack:

```bash
cp .github/skills/jwt-auth/SKILL.md .github/skills/jwt-auth/SKILL.md.bak
# Edit SKILL.md for your auth provider
```

### 4. Create Team Skills

Create custom skills for patterns specific to your team:

```bash
mkdir -p .github/skills/our-api-pattern
# Add SKILL.md with your team's conventions
```

---

## Skill Categories

| Category | Description |
|----------|-------------|
| `resilience` | Fault tolerance and recovery |
| `api` | API design and integration |
| `auth` | Authentication and authorization |
| `workers` | Background job processing |
| `data-pipeline` | Data processing patterns |
| `caching` | Caching strategies |
| `database` | Database patterns |
| `observability` | Logging and monitoring |
| `frontend` | Frontend patterns |
| `realtime` | Real-time communication |
| `ai` | AI/ML integration |
| `infrastructure` | Infrastructure patterns |
| `integrations` | Third-party integrations |

---

## Next Steps

- [Pattern Categories](Pattern-Categories) — Patterns Drift detects
- [MCP Tools Reference](MCP-Tools-Reference) — AI agent tools
- [Contributing](Contributing) — Create and share skills
