# Cortex Universal Memory Types

Cortex V2 introduces **10 universal memory types** that go beyond code-specific knowledge to capture the full context of your development environment.

---

## 📋 Overview

| Type | Icon | Half-Life | Purpose |
|------|------|-----------|---------|
| `agent_spawn` | 🤖 | 365 days | Reusable agent configurations |
| `entity` | 📦 | 180 days | Projects, products, teams, systems |
| `goal` | 🎯 | 90 days | Objectives with progress tracking |
| `feedback` | 📝 | 120 days | Corrections and learning signals |
| `workflow` | 📋 | 180 days | Step-by-step processes |
| `conversation` | 💬 | 30 days | Summarized past discussions |
| `incident` | 🚨 | 365 days | Postmortems and lessons learned |
| `meeting` | 📅 | 60 days | Meeting notes and action items |
| `skill` | 🧠 | 180 days | Knowledge domains and proficiency |
| `environment` | 🌍 | 90 days | Environment configurations |

---

## 🤖 Agent Spawn

Reusable agent configurations that can be invoked on demand. Say "spawn my code reviewer" and get a specialized agent with specific tools, constraints, and personality.

### Schema

```typescript
interface AgentSpawnMemory {
  type: 'agent_spawn';
  name: string;                    // "Code Reviewer"
  slug: string;                    // "code-reviewer"
  description: string;             // What this agent does
  systemPrompt: string;            // Agent personality/instructions
  tools: string[];                 // Tools the agent can use
  constraints?: string[];          // Limitations
  triggerPatterns: string[];       // What activates this agent
  autoSpawn: boolean;              // Auto-spawn on trigger
  version: string;                 // "1.0.0"
  stats: {
    invocationCount: number;
    successRate: number;
    avgDurationMs: number;
  };
}
```

### CLI Commands

```bash
# Add an agent spawn
drift memory agent-spawn add \
  --name "Code Reviewer" \
  --slug "code-reviewer" \
  --description "Reviews code for quality" \
  --system-prompt "You are a thorough code reviewer..." \
  --tools "readFile,grepSearch,getDiagnostics" \
  --triggers "review this,code review"

# List agent spawns
drift memory agent-spawn list

# Invoke an agent
drift memory agent-spawn invoke code-reviewer

# Show details
drift memory agent-spawn show code-reviewer

# Delete
drift memory agent-spawn delete code-reviewer
```

### MCP Tool: `drift_agent_spawn`

```typescript
// List all agent spawns
{ action: "list" }

// Get agent spawn details
{ action: "get", slug: "code-reviewer" }

// Invoke an agent spawn
{ action: "invoke", slug: "code-reviewer", context: { file: "src/auth.ts" } }

// Create a new agent spawn
{
  action: "create",
  name: "Security Auditor",
  slug: "security-auditor",
  description: "Checks for security vulnerabilities",
  systemPrompt: "You are a security expert...",
  tools: ["readFile", "grepSearch", "drift_security_summary"],
  triggerPatterns: ["security audit", "check security"]
}
```

### Built-in Templates

| Agent | Purpose | Tools |
|-------|---------|-------|
| Code Reviewer | Reviews code quality | readFile, grepSearch, getDiagnostics |
| Security Auditor | Finds vulnerabilities | readFile, grepSearch, drift_security_summary |
| Documentation Writer | Writes docs | readFile, fsWrite, drift_signature |
| Refactoring Assistant | Suggests improvements | readFile, drift_coupling, drift_similar |
| Test Writer | Generates tests | readFile, fsWrite, drift_test_template |

---

## 📦 Entity

Tracks projects, products, teams, services, and systems. AI agents understand relationships and provide context-aware assistance.

### Schema

```typescript
interface EntityMemory {
  type: 'entity';
  entityType: 'project' | 'product' | 'team' | 'service' | 'system' | 'client' | 'vendor';
  name: string;                    // "Auth Service"
  keyFacts: string[];              // Important facts
  status: 'active' | 'planned' | 'maintenance' | 'deprecated' | 'archived';
  attributes: Record<string, any>; // Custom attributes
  relationships: Array<{
    targetId: string;
    type: 'owns' | 'depends_on' | 'maintained_by' | 'related_to';
  }>;
}
```

### CLI Commands

```bash
# Add an entity
drift memory entity add \
  --type service \
  --name "Auth Service" \
  --status active \
  --facts "Handles authentication,Uses JWT,Redis for sessions"

# List entities
drift memory entity list
drift memory entity list --type service

# Show details
drift memory entity show "Auth Service"

# Update
drift memory entity update "Auth Service" --status maintenance

# Delete
drift memory entity delete "Auth Service"
```

### MCP Tool: `drift_entity`

```typescript
// List all entities
{ action: "list" }

// Filter by type
{ action: "list", entityType: "service" }

// Get entity details
{ action: "get", name: "Auth Service" }

// Create entity
{
  action: "create",
  entityType: "service",
  name: "Payment Service",
  keyFacts: ["Handles Stripe integration", "PCI compliant"],
  status: "active"
}

// Update entity
{ action: "update", name: "Auth Service", status: "maintenance" }
```

---

## 🎯 Goal

Tracks objectives with progress. AI agents can help you stay focused and track completion.

### Schema

```typescript
interface GoalMemory {
  type: 'goal';
  title: string;                   // "Improve test coverage to 80%"
  description: string;
  status: 'active' | 'completed' | 'blocked' | 'abandoned';
  progress: number;                // 0-100
  milestones: Array<{
    name: string;
    completed: boolean;
    completedAt?: string;
  }>;
  deadline?: string;               // ISO date
  blockers?: string[];
  relatedEntities?: string[];      // Entity IDs
}
```

### CLI Commands

```bash
# Add a goal
drift memory goal add \
  --title "Improve test coverage to 80%" \
  --description "Increase unit test coverage across all services" \
  --deadline "2024-06-01"

# List goals
drift memory goal list
drift memory goal list --status active

# Update progress
drift memory goal update "Improve test coverage" --progress 65

# Complete a goal
drift memory goal complete "Improve test coverage"

# Show details
drift memory goal show "Improve test coverage"
```

### MCP Tool: `drift_goal`

```typescript
// List all goals
{ action: "list" }

// Get goal details
{ action: "get", title: "Improve test coverage" }

// Create goal
{
  action: "create",
  title: "Migrate to TypeScript 5",
  description: "Update all packages to TypeScript 5",
  deadline: "2024-03-01"
}

// Update progress
{ action: "update", title: "Migrate to TypeScript 5", progress: 75 }

// Complete goal
{ action: "complete", title: "Migrate to TypeScript 5" }
```

---

## 📋 Workflow

Stores step-by-step processes. When you say "how do I deploy?", AI walks you through your specific process.

### Schema

```typescript
interface WorkflowMemory {
  type: 'workflow';
  name: string;                    // "Deploy to Production"
  slug: string;                    // "deploy-production"
  description: string;
  steps: Array<{
    order: number;
    name: string;
    description: string;
    required: boolean;
  }>;
  triggerPhrases: string[];        // ["deploy", "push to prod"]
  stats: {
    executionCount: number;
    successRate: number;
  };
}
```

### CLI Commands

```bash
# Add a workflow
drift memory workflow add \
  --name "Deploy to Production" \
  --slug "deploy-production" \
  --description "Steps to deploy code to production" \
  --triggers "deploy,push to prod"

# List workflows
drift memory workflow list

# Show workflow
drift memory workflow show deploy-production

# Execute workflow (guided)
drift memory workflow execute deploy-production
```

### MCP Tool: `drift_workflow`

```typescript
// List all workflows
{ action: "list" }

// Get workflow details
{ action: "get", slug: "deploy-production" }

// Create workflow
{
  action: "create",
  name: "Code Review Process",
  slug: "code-review",
  description: "How to conduct a code review",
  steps: [
    { order: 1, name: "Check out PR", description: "git fetch && git checkout pr-branch" },
    { order: 2, name: "Run tests", description: "npm test" },
    { order: 3, name: "Review code", description: "Check for quality and best practices" }
  ],
  triggerPhrases: ["code review", "review PR"]
}

// Execute workflow
{ action: "execute", slug: "deploy-production" }
```

---

## 🚨 Incident

Records postmortems and lessons learned. AI agents can reference past incidents to prevent repeating mistakes.

### Schema

```typescript
interface IncidentMemory {
  type: 'incident';
  title: string;                   // "Database outage 2024-01-15"
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'resolved' | 'postmortem';
  timeline: Array<{
    timestamp: string;
    event: string;
  }>;
  rootCause?: string;
  lessonsLearned: string[];
  preventionMeasures: string[];
  affectedEntities?: string[];     // Entity IDs
}
```

### CLI Commands

```bash
# Add an incident
drift memory incident add \
  --title "Database outage 2024-01-15" \
  --severity critical \
  --root-cause "Connection pool exhaustion" \
  --lessons "Always set connection limits,Monitor pool usage"

# List incidents
drift memory incident list
drift memory incident list --severity critical

# Resolve incident
drift memory incident resolve "Database outage 2024-01-15"

# Show details
drift memory incident show "Database outage 2024-01-15"
```

### MCP Tool: `drift_incident`

```typescript
// List all incidents
{ action: "list" }

// Get incident details
{ action: "get", title: "Database outage 2024-01-15" }

// Create incident
{
  action: "create",
  title: "API latency spike",
  severity: "high",
  rootCause: "N+1 query in user endpoint",
  lessonsLearned: ["Always check query count", "Add query monitoring"],
  preventionMeasures: ["Add query count alerts", "Review all new endpoints"]
}

// Resolve incident
{ action: "resolve", title: "API latency spike" }
```

---

## 🧠 Skill

Tracks knowledge domains and proficiency levels. AI tailors explanations based on expertise.

### Schema

```typescript
interface SkillMemory {
  type: 'skill';
  name: string;                    // "React Testing"
  domain: string;                  // "frontend"
  proficiencyLevel: 'learning' | 'beginner' | 'competent' | 'proficient' | 'expert';
  keyPrinciples: string[];
  resources?: string[];            // Learning resources
  scope: 'individual' | 'team';
}
```

### CLI Commands

```bash
# Add a skill
drift memory skill add \
  --name "React Testing" \
  --domain "frontend" \
  --proficiency "proficient" \
  --principles "Use RTL,Test behavior not implementation"

# List skills
drift memory skill list
drift memory skill list --domain frontend

# Update proficiency
drift memory skill update "React Testing" --proficiency expert

# Show details
drift memory skill show "React Testing"
```

### MCP Tool: `drift_skill`

```typescript
// List all skills
{ action: "list" }

// Get skill details
{ action: "get", name: "React Testing" }

// Create skill
{
  action: "create",
  name: "Kubernetes",
  domain: "devops",
  proficiencyLevel: "competent",
  keyPrinciples: ["Use namespaces", "Set resource limits", "Use ConfigMaps"]
}

// Update proficiency
{ action: "update", name: "Kubernetes", proficiencyLevel: "proficient" }
```

---

## 🌍 Environment

Stores environment configurations. AI warns about production risks and suggests appropriate environments.

### Schema

```typescript
interface EnvironmentMemory {
  type: 'environment';
  name: string;                    // "Production"
  environmentType: 'production' | 'staging' | 'development' | 'testing' | 'sandbox';
  config: Record<string, any>;
  warnings: string[];              // ["⚠️ This is PRODUCTION"]
  endpoints: Record<string, string>; // { api: "https://api.example.com" }
}
```

### CLI Commands

```bash
# Add an environment
drift memory environment add \
  --name "Production" \
  --type production \
  --warnings "⚠️ This is PRODUCTION - be careful!" \
  --endpoints "api=https://api.example.com,web=https://example.com"

# List environments
drift memory environment list

# Show details
drift memory environment show "Production"

# Update
drift memory environment update "Production" \
  --warnings "⚠️ Requires approval from tech lead"
```

### MCP Tool: `drift_environment`

```typescript
// List all environments
{ action: "list" }

// Get environment details
{ action: "get", name: "Production" }

// Create environment
{
  action: "create",
  name: "Staging",
  environmentType: "staging",
  warnings: ["Data is refreshed weekly from production"],
  endpoints: { api: "https://staging-api.example.com" }
}
```

---

## 📅 Meeting

Records meeting notes and action items.

### Schema

```typescript
interface MeetingMemory {
  type: 'meeting';
  title: string;                   // "Sprint Planning 2024-01-15"
  date: string;                    // ISO date
  attendees: string[];
  summary: string;
  actionItems: Array<{
    task: string;
    assignee: string;
    dueDate?: string;
    completed: boolean;
  }>;
  decisions: string[];
  relatedEntities?: string[];
}
```

### MCP Tool: `drift_meeting`

```typescript
// List meetings
{ action: "list" }

// Create meeting
{
  action: "create",
  title: "Sprint Planning",
  date: "2024-01-15",
  attendees: ["Alice", "Bob", "Charlie"],
  summary: "Planned Q1 features",
  actionItems: [
    { task: "Write auth spec", assignee: "Alice", dueDate: "2024-01-20" }
  ],
  decisions: ["Use JWT for auth", "Deploy weekly"]
}
```

---

## 💬 Conversation

Stores summarized past discussions for context continuity.

### Schema

```typescript
interface ConversationMemory {
  type: 'conversation';
  topic: string;                   // "Authentication redesign"
  summary: string;
  keyPoints: string[];
  decisions: string[];
  openQuestions: string[];
  participants?: string[];
}
```

### MCP Tool: `drift_conversation`

```typescript
// List conversations
{ action: "list" }

// Create conversation summary
{
  action: "create",
  topic: "Authentication redesign",
  summary: "Discussed moving from sessions to JWT",
  keyPoints: ["JWT for stateless auth", "15-minute token expiry"],
  decisions: ["Use refresh tokens", "Store in httpOnly cookies"],
  openQuestions: ["How to handle token revocation?"]
}
```

---

## 🔗 Relationships Between Types

Universal memory types can be linked:

```
Entity (Auth Service)
    │
    ├── owns ──────────► Goal (Improve auth performance)
    │
    ├── affected_by ───► Incident (Auth outage 2024-01)
    │
    └── requires ──────► Skill (JWT expertise)

Workflow (Deploy)
    │
    └── requires ──────► Environment (Production)

Incident (Auth outage)
    │
    └── learned_from ──► Tribal (Always validate tokens)
```

---

## 🔗 Related Documentation

- [Cortex V2 Overview](Cortex-V2-Overview) — Architecture and concepts
- [Memory CLI Reference](Memory-CLI) — Full CLI command reference
- [Memory Setup Wizard](Cortex-Memory-Setup) — Interactive setup guide
- [MCP Tools Reference](MCP-Tools-Reference) — All MCP memory tools
