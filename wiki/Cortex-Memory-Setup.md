# Cortex Memory Setup Wizard

The `drift memory setup` command is an interactive wizard that walks you through setting up your AI's long-term memory with project identity, preferences, tribal knowledge, workflows, and more.

---

## ⚡ Quick Start

```bash
# Run the interactive wizard
drift memory setup

# Accept defaults for required sections
drift memory setup -y

# Skip specific sections
drift memory setup --skip tribal,agents
```

---

## 📋 Overview

The setup wizard guides you through **7 optional sections**:

| Section | Icon | What It Creates | Purpose |
|---------|------|-----------------|---------|
| Core Identity | 🏠 | `core` memory | Project name, tech stack, preferences |
| Tribal Knowledge | ⚠️ | `tribal` memories | Gotchas, warnings, institutional knowledge |
| Workflows | 📋 | `workflow` memories | Deploy, review, release processes |
| Agent Spawns | 🤖 | `agent_spawn` memories | Reusable agent configurations |
| Entities | 📦 | `entity` memories | Projects, teams, services |
| Skills | 🧠 | `skill` memories | Knowledge domains and proficiency |
| Environments | 🌍 | `environment` memories | Prod, staging, dev configs |

**All sections are optional** — skip any with 'n' when prompted.

---

## 🏠 Section 1: Core Identity

Creates the permanent "core" memory that never decays. AI agents will always have access to this context.

**What it captures:**
- Project name and description
- Tech stack (auto-detected from package.json, requirements.txt, go.mod, Cargo.toml)
- Primary language
- Frameworks
- Preferences:
  - Verbosity level (minimal/normal/detailed)
  - Code style (naming conventions)
  - Focus areas
  - Topics to avoid

**Example interaction:**

```
━━━ 🏠 Core Identity ━━━
Define your project identity and preferences

  This creates the permanent "core" memory that never decays.
  AI agents will always have access to this context.

? Set up core identity? Yes
? Project name: my-awesome-app
? Project description: A SaaS platform for team collaboration
  Detected tech stack: TypeScript, React, Prisma, PostgreSQL
? Tech stack (comma-separated, or press Enter to accept): TypeScript, React, Prisma, PostgreSQL
? Primary language: TypeScript
? Frameworks (comma-separated): React, Next.js, Express

  Now let's set your preferences for AI interactions:

? Response verbosity: Normal - Balanced explanations (recommended)
? Set up code style preferences? Yes
? Variable naming convention: camelCase
? Component naming convention: PascalCase (React style)
? Focus areas (comma-separated): security, performance, testing
? Topics to avoid (comma-separated): legacy code, deprecated APIs
```

---

## ⚠️ Section 2: Tribal Knowledge

Captures institutional knowledge — the stuff that's not written down anywhere. The gotchas, warnings, and hard-won lessons only experienced team members know.

**What it captures:**
- Topic (e.g., "authentication", "payments", "database")
- Knowledge (the actual gotcha or warning)
- Severity (info/warning/critical)

**Example interaction:**

```
━━━ ⚠️ Tribal Knowledge ━━━
Capture institutional knowledge and gotchas

  Tribal knowledge is the stuff that's not written down anywhere.
  The gotchas, warnings, and hard-won lessons only experienced
  team members know. AI agents will surface these as warnings.

? Add tribal knowledge? Yes

  Examples:
    • "Never call the payment API without idempotency keys"
    • "The legacy auth system has a 5-second timeout"
    • "Always check user.isActive before user.permissions"

? Topic: authentication
? Knowledge: JWT tokens must be validated on every request, not just at login
? Severity: Critical - Must not ignore
  ✓ Added: authentication

? Add another piece of tribal knowledge? Yes
? Topic: payments
? Knowledge: Always use idempotency keys when calling Stripe API
? Severity: Critical - Must not ignore
  ✓ Added: payments

? Add another piece of tribal knowledge? No
```

---

## 📋 Section 3: Workflows

Defines step-by-step processes that AI can guide you through. When you say "how do I deploy?", the AI will walk you through your specific deployment process.

**Templates available:**
- Deploy to Production
- Code Review Process
- Release New Version
- Onboard New Team Member
- Incident Response
- Custom Workflow

**What it captures:**
- Workflow name and description
- Steps (ordered list with descriptions)
- Trigger phrases (what activates this workflow)

**Example interaction:**

```
━━━ 📋 Workflows ━━━
Define step-by-step processes

  Workflows are step-by-step processes that AI can guide you through.
  When you say "how do I deploy?", the AI will walk you through
  your specific deployment process.

? Set up workflows? Yes
? Start with common workflow templates? Deploy to Production, Code Review Process

  Define your deployment steps:

? Step 1 name: Run tests
? Step 1 description: Run the full test suite with `npm test`
? Step 2 name: Build
? Step 2 description: Build the production bundle with `npm run build`
? Step 3 name: Deploy to staging
? Step 3 description: Deploy to staging with `npm run deploy:staging`
? Step 4 name: Smoke test
? Step 4 description: Run smoke tests against staging
? Step 5 name: Deploy to production
? Step 5 description: Deploy to production with `npm run deploy:prod`
? Step 6 name (or press Enter to finish):
  ✓ Added workflow: Deploy to Production (5 steps)
```

---

## 🤖 Section 4: Agent Spawns

Creates reusable AI agent configurations. Say "spawn my code reviewer" and get a specialized agent with specific tools, constraints, and personality.

**Templates available:**
- Code Reviewer — Reviews code for quality and best practices
- Security Auditor — Checks for security vulnerabilities
- Documentation Writer — Writes and improves documentation
- Refactoring Assistant — Suggests code improvements
- Test Writer — Generates test cases
- Custom Agent

**What it captures:**
- Agent name and description
- System prompt (personality/instructions)
- Tools the agent can use
- Trigger patterns (what activates this agent)

**Example interaction:**

```
━━━ 🤖 Agent Spawns ━━━
Create reusable agent configurations

  Agent spawns are reusable AI agent configurations.
  Say "spawn my code reviewer" and get a specialized agent
  with specific tools, constraints, and personality.

? Set up agent spawns? Yes
? Start with common agent templates? Code Reviewer, Security Auditor
  ✓ Added agent: Code Reviewer
  ✓ Added agent: Security Auditor
```

**Default agent configurations:**

| Agent | System Prompt | Tools |
|-------|---------------|-------|
| Code Reviewer | "You are a thorough code reviewer. Focus on code quality, readability, maintainability, and adherence to best practices." | readFile, grepSearch, getDiagnostics |
| Security Auditor | "You are a security expert. Look for vulnerabilities like SQL injection, XSS, authentication issues. Reference OWASP guidelines." | readFile, grepSearch, drift_security_summary |
| Documentation Writer | "You are a technical writer. Write clear, concise documentation. Include examples, explain edge cases." | readFile, fsWrite, drift_signature |
| Refactoring Assistant | "You are a refactoring expert. Identify code smells, suggest improvements, help simplify complex code." | readFile, drift_coupling, drift_similar |
| Test Writer | "You are a testing expert. Write comprehensive tests covering happy paths, edge cases, and error conditions." | readFile, fsWrite, drift_test_template |

---

## 📦 Section 5: Entities

Tracks the key things in your world — projects, teams, services, clients. AI agents will understand relationships and provide context-aware assistance.

**Entity types:**
- Project
- Product
- Team
- Service
- System
- Client
- Vendor

**What it captures:**
- Entity type and name
- Status (active/planned/maintenance/deprecated/archived)
- Key facts about the entity

**Example interaction:**

```
━━━ 📦 Entities ━━━
Track projects, teams, and systems

  Entities are the key things in your world - projects, teams,
  services, clients. AI agents will understand relationships
  and provide context-aware assistance.

? Set up entities? Yes
? Entity type: Service
? Name: Auth Service
? Status: Active
  Add key facts about this entity (press Enter when done):
? Fact 1: Handles all authentication and authorization
? Fact 2: Uses JWT tokens with 15-minute expiry
? Fact 3: Redis for session storage
? Fact 4:
  ✓ Added entity: Auth Service (service)

? Add another entity? Yes
? Entity type: Team
? Name: Platform Team
? Status: Active
? Fact 1: Owns core infrastructure
? Fact 2: On-call rotation every 2 weeks
? Fact 3:
  ✓ Added entity: Platform Team (team)
```

---

## 🧠 Section 6: Skills

Tracks knowledge domains and proficiency levels. AI will tailor explanations and suggest learning resources based on proficiency.

**Proficiency levels:**
- Learning — Just getting started
- Beginner — Basic understanding
- Competent — Can work independently
- Proficient — Deep knowledge
- Expert — Can teach others

**What it captures:**
- Skill name and domain
- Proficiency level
- Key principles

**Example interaction:**

```
━━━ 🧠 Skills ━━━
Track knowledge domains and proficiency

  Skills help AI understand your team's expertise levels.
  AI will tailor explanations and suggest learning resources
  based on proficiency.

? Set up skills? Yes
? Skill name: React Testing
? Domain: frontend
? Proficiency level: Proficient - Deep knowledge
  Add key principles for this skill (press Enter when done):
? Principle 1: Use React Testing Library, not Enzyme
? Principle 2: Test behavior, not implementation
? Principle 3: Mock at the network boundary
? Principle 4:
  ✓ Added skill: React Testing (proficient)
```

---

## 🌍 Section 7: Environments

Stores environment configurations. AI will warn you about production risks and suggest appropriate environments for testing.

**Environment types:**
- Production
- Staging
- Development
- Testing
- Sandbox

**What it captures:**
- Environment name and type
- Warnings (especially for production)
- Endpoint URLs

**Example interaction:**

```
━━━ 🌍 Environments ━━━
Configure environment information

  Environment configs help AI understand your infrastructure.
  AI will warn you about production risks and suggest
  appropriate environments for testing.

? Set up environments? Yes
? Which environments do you have? Production, Staging, Development

  Configure Production:

? Add production-specific warnings? Yes
? Warning (or press Enter to finish): ⚠️ This is PRODUCTION - be careful!
? Warning (or press Enter to finish): Always test in staging first
? Warning (or press Enter to finish): Requires approval from tech lead
? Warning (or press Enter to finish):
? Add endpoint URLs? Yes
? API URL: https://api.example.com
? Web URL: https://example.com
  ✓ Added environment: Production
```

---

## 📊 Summary Output

After completing the wizard, you'll see a summary:

```
═══════════════════════════════════════════════════════════════
                   CORTEX MEMORY SETUP COMPLETE
═══════════════════════════════════════════════════════════════

  Project:     my-awesome-app
  Tech Stack:  TypeScript, React, Prisma, PostgreSQL

  Memories Created:
    🏠 Core Identity: 1
    ⚠️  Tribal Knowledge: 5
    📋 Workflows: 2
    🤖 Agent Spawns: 2
    📦 Entities: 3
    🧠 Skills: 2
    🌍 Environments: 3

  Your AI agents now have context about:
    • Your project identity and preferences
    • Critical gotchas and warnings
    • Step-by-step processes
    • Specialized agent configurations

  Next steps:
    drift memory status        View memory statistics
    drift memory search <q>    Search memories
    drift memory add tribal    Add more tribal knowledge

═══════════════════════════════════════════════════════════════
```

---

## 🔧 Command Options

```bash
drift memory setup [options]

Options:
  -y, --yes               Accept defaults for required sections
  --verbose               Enable verbose output
  --skip <sections>       Skip sections (comma-separated)
```

**Skip options:**
- `core` — Skip core identity
- `tribal` — Skip tribal knowledge
- `workflows` — Skip workflows
- `agents` — Skip agent spawns
- `entities` — Skip entities
- `skills` — Skip skills
- `environments` — Skip environments

**Examples:**

```bash
# Full interactive wizard
drift memory setup

# Quick setup with defaults
drift memory setup -y

# Skip optional sections
drift memory setup --skip workflows,agents,entities,skills,environments

# Only set up core and tribal knowledge
drift memory setup --skip workflows,agents,entities,skills,environments
```

---

## 🔗 Related Documentation

- [Cortex V2 Overview](Cortex-V2-Overview) — Architecture and concepts
- [Memory CLI Reference](Memory-CLI) — Full CLI command reference
- [Universal Memory Types](Cortex-Universal-Memory-Types) — Agent spawns, workflows, entities
- [MCP Tools Reference](MCP-Tools-Reference) — MCP memory tools
