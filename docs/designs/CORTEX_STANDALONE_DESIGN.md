# Cortex Standalone: Domain-Agnostic AI Memory System

> **Design Document v1.0**  
> **Status:** Proposal  
> **Author:** Drift Team  
> **Date:** February 2026

## Executive Summary

Extract Cortex from Drift as a standalone, domain-agnostic AI memory system. This enables use cases beyond code (business decisions, research notes, project knowledge) while maintaining full backward compatibility with Drift's code-aware features.

**Key insight:** Cortex already has zero hard dependencies on drift-core. The code-specific features are isolated in the validation layer and can be made optional.

---

## Problem Statement

A user asked: *"Could I use Cortex for business decisions? We recently decided to register a UK subsidiary and want to remember why."*

Current state:
- Cortex is bundled inside Drift
- Memory types are code-focused (pattern_rationale, code_smell, etc.)
- Validation assumes code citations exist
- MCP tools only available through drift MCP server
- Intents are code-specific (add_feature, fix_bug, etc.)

**Opportunity:** The core memory architecture (storage, embeddings, retrieval, consolidation, decay) is completely domain-agnostic. With minimal changes, Cortex becomes a general-purpose AI memory system.

---

## Goals

1. **Zero breaking changes** to existing Drift users
2. **Standalone package** installable without drift-core
3. **Domain-agnostic memory types** for non-code use cases
4. **Pluggable validation** - code validation optional
5. **Standalone MCP server** for direct AI integration
6. **Same powerful features** - consolidation, decay, semantic search, causal graphs

---

## Architecture

### Package Structure

```
packages/
├── cortex/                    # Core memory system (exists)
│   ├── src/
│   │   ├── storage/          # SQLite + vector search
│   │   ├── embeddings/       # Local/OpenAI/Ollama
│   │   ├── retrieval/        # Intent-aware retrieval
│   │   ├── consolidation/    # Sleep-inspired compression
│   │   ├── decay/            # Time-based confidence decay
│   │   ├── validation/       # Self-healing (make optional)
│   │   ├── causal/           # Causal graph system
│   │   └── types/            # Memory type definitions
│   └── package.json          # Remove drift-core peer dep
│
├── cortex-mcp/               # NEW: Standalone MCP server
│   ├── src/
│   │   ├── server.ts         # MCP server entry
│   │   └── tools/            # Memory tools (extracted)
│   └── package.json
│
├── cortex-code/              # NEW: Code-specific extensions
│   ├── src/
│   │   ├── validation/       # Citation validator
│   │   ├── types/            # Code memory types
│   │   └── integration.ts    # Drift integration
│   └── package.json
│
└── mcp/                      # Existing Drift MCP (unchanged)
    └── ...                   # Uses cortex + cortex-code
```

### Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│                    User Applications                     │
└─────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  cortex-mcp   │    │  drift-mcp    │    │   Your App    │
│  (standalone) │    │  (full drift) │    │   (direct)    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └──────────┬──────────┴──────────┬──────────┘
                   ▼                     ▼
           ┌─────────────┐       ┌─────────────────┐
           │   cortex    │◄──────│   cortex-code   │
           │   (core)    │       │  (code-aware)   │
           └─────────────┘       └─────────────────┘
```

---

## Memory Type System

### Existing Types (Keep As-Is)

| Type | Domain | Description |
|------|--------|-------------|
| `core` | Any | Project identity and preferences |
| `tribal` | Any | Institutional knowledge |
| `procedural` | Any | How-to procedures |
| `semantic` | Any | Consolidated knowledge |
| `episodic` | Any | Interaction history |
| `decision_context` | Any | Decision rationale |

### Code-Specific Types (Move to cortex-code)

| Type | Domain | Description |
|------|--------|-------------|
| `pattern_rationale` | Code | Why patterns exist |
| `constraint_override` | Code | Approved exceptions |
| `code_smell` | Code | Anti-patterns to avoid |

### New Domain-Agnostic Types

| Type | Domain | Description |
|------|--------|-------------|
| `decision` | Any | Standalone decision record |
| `insight` | Any | Learned insight or observation |
| `reference` | Any | External reference or citation |
| `relationship` | Any | Entity relationship knowledge |
| `preference` | Any | User/team preferences |

---

## Intent System

### Current Intents (Code-Focused)

```typescript
type Intent = 
  | 'add_feature'
  | 'fix_bug'
  | 'refactor'
  | 'security_audit'
  | 'understand_code'
  | 'add_test';
```

### New Intent System (Domain-Agnostic)

```typescript
// Base intents (cortex core)
type BaseIntent =
  | 'create'        // Creating something new
  | 'investigate'   // Understanding/researching
  | 'decide'        // Making a decision
  | 'review'        // Reviewing past work
  | 'recall'        // Finding past knowledge
  | 'learn';        // Adding new knowledge

// Code intents (cortex-code extension)
type CodeIntent =
  | 'add_feature'
  | 'fix_bug'
  | 'refactor'
  | 'security_audit'
  | 'understand_code'
  | 'add_test';

// Combined (for Drift)
type Intent = BaseIntent | CodeIntent;
```

### Intent Weighting

```typescript
// Base weights (domain-agnostic)
const BASE_WEIGHTS: Record<BaseIntent, Record<MemoryType, number>> = {
  create: {
    tribal: 0.9,      // "What should I know before creating?"
    procedural: 0.8,  // "How do we usually do this?"
    decision: 0.7,    // "What decisions affect this?"
    preference: 0.6,  // "What are our preferences?"
  },
  decide: {
    decision: 1.0,    // "What similar decisions have we made?"
    tribal: 0.8,      // "What institutional knowledge applies?"
    insight: 0.7,     // "What insights are relevant?"
  },
  recall: {
    semantic: 0.9,    // Consolidated knowledge first
    tribal: 0.8,
    decision: 0.7,
    episodic: 0.5,    // Recent interactions
  },
  // ...
};
```

---

## Validation System

### Current (Code-Coupled)

```typescript
class ValidationEngine {
  // Validates code citations exist
  citationValidator: CitationValidator;  // Reads files!
  // ...
}
```

### New (Pluggable)

```typescript
interface IValidator {
  validate(memory: Memory): Promise<ValidationIssue[]>;
}

class ValidationEngine {
  private validators: IValidator[] = [];

  // Register validators based on domain
  registerValidator(validator: IValidator): void {
    this.validators.push(validator);
  }
}

// Core validators (always available)
class TemporalValidator implements IValidator { }
class ContradictionDetector implements IValidator { }

// Code validators (cortex-code package)
class CitationValidator implements IValidator { }
class PatternAlignmentValidator implements IValidator { }
```

### Configuration

```typescript
const cortex = await Cortex.create({
  validation: {
    // Disable code-specific validation for non-code use
    enableCitationValidation: false,
    enablePatternAlignment: false,
    // Keep temporal and contradiction detection
    enableTemporalValidation: true,
    enableContradictionDetection: true,
  },
});
```

---

## MCP Server (cortex-mcp)

### Standalone Installation

```bash
# Install standalone memory MCP
npm install -g cortex-mcp

# Or use with npx
npx cortex-mcp
```

### MCP Configuration

```json
{
  "mcpServers": {
    "cortex": {
      "command": "npx",
      "args": ["cortex-mcp"],
      "env": {
        "CORTEX_DB_PATH": "./memory.db",
        "CORTEX_EMBEDDING_PROVIDER": "local"
      }
    }
  }
}
```

### Tools (Subset for Standalone)

| Tool | Description |
|------|-------------|
| `cortex_status` | Memory system health |
| `cortex_add` | Add new memory |
| `cortex_search` | Semantic search |
| `cortex_recall` | Context-aware retrieval |
| `cortex_decide` | Decision support |
| `cortex_consolidate` | Trigger consolidation |
| `cortex_validate` | Run validation |
| `cortex_why` | Explain a topic |

### Example: Business Decision

```typescript
// AI adds a decision
await cortex_add({
  type: 'decision',
  content: {
    title: 'UK Subsidiary Registration',
    decision: 'approved',
    summary: 'Register UK subsidiary for EU market access',
    context: 'Post-Brexit compliance requirements',
    alternatives: [
      { option: 'Irish subsidiary', rejected: 'Smaller talent pool' },
      { option: 'No EU presence', rejected: 'Losing EU clients' },
    ],
    stakeholders: ['CEO', 'CFO', 'Legal'],
    revisitWhen: ['Brexit terms change', 'EU expansion > 30% revenue'],
  },
  importance: 'high',
});

// Later, AI recalls relevant decisions
const result = await cortex_recall({
  intent: 'decide',
  focus: 'European expansion',
  maxTokens: 2000,
});
// Returns: UK subsidiary decision + related context
```

---

## New Memory Types

### Decision Memory

```typescript
interface DecisionMemory extends BaseMemory {
  type: 'decision';
  
  /** Decision title */
  title: string;
  /** Decision outcome */
  decision: 'approved' | 'rejected' | 'deferred' | 'superseded';
  /** Brief summary */
  summary: string;
  
  /** Context that led to this decision */
  context?: string;
  /** Alternatives considered */
  alternatives?: Array<{
    option: string;
    rejected?: string;  // Why rejected
  }>;
  /** People involved */
  stakeholders?: string[];
  /** Conditions to revisit */
  revisitWhen?: string[];
  
  /** Domain/category */
  domain?: string;
  /** Related decisions */
  relatedDecisions?: string[];
}
```

### Insight Memory

```typescript
interface InsightMemory extends BaseMemory {
  type: 'insight';
  
  /** What was learned */
  insight: string;
  /** How it was learned */
  source: 'observation' | 'experiment' | 'feedback' | 'research' | 'experience';
  /** Domain this applies to */
  domain?: string;
  /** Confidence in this insight */
  validated?: boolean;
  /** Evidence supporting this */
  evidence?: string[];
}
```

### Reference Memory

```typescript
interface ReferenceMemory extends BaseMemory {
  type: 'reference';
  
  /** Reference title */
  title: string;
  /** URL or location */
  url?: string;
  /** Key points from this reference */
  keyPoints: string[];
  /** When this was last verified */
  lastVerified?: string;
  /** Domain/topic */
  domain?: string;
}
```

---

## Migration Path

### For Existing Drift Users

**No changes required.** Drift continues to work exactly as before.

```typescript
// Drift MCP server automatically uses cortex + cortex-code
// All existing memory types and tools work unchanged
```

### For New Standalone Users

```bash
# Install standalone
npm install cortex-memory cortex-mcp

# Initialize
npx cortex init --domain business  # or: research, personal, etc.

# Configure MCP
npx cortex mcp-config >> ~/.config/claude/mcp.json
```

### For Drift Users Wanting Both

```json
{
  "mcpServers": {
    "drift": {
      "command": "npx",
      "args": ["driftdetect-mcp"]
    },
    "cortex-business": {
      "command": "npx", 
      "args": ["cortex-mcp"],
      "env": {
        "CORTEX_DB_PATH": "./business-memory.db"
      }
    }
  }
}
```

---

## Implementation Plan

### Phase 1: Decouple (1-2 days)

1. Remove `peerDependency` on drift-core from cortex package.json
2. Make CitationValidator optional (config flag)
3. Make PatternAlignmentValidator optional (config flag)
4. Add domain-agnostic intents to retrieval engine
5. Update tests to work without drift-core

### Phase 2: New Types (1 day)

1. Add `DecisionMemory` type
2. Add `InsightMemory` type  
3. Add `ReferenceMemory` type
4. Add `PreferenceMemory` type
5. Update storage schema for new types
6. Add intent weights for new types

### Phase 3: Standalone MCP (1-2 days)

1. Create `cortex-mcp` package
2. Extract memory tools from drift-mcp
3. Rename tools (drift_memory_* → cortex_*)
4. Add standalone server entry point
5. Add CLI for initialization
6. Write standalone documentation

### Phase 4: Code Extensions (1 day)

1. Create `cortex-code` package
2. Move CitationValidator to cortex-code
3. Move PatternAlignmentValidator to cortex-code
4. Move code-specific memory types
5. Update drift-mcp to use cortex + cortex-code

### Phase 5: Polish (1 day)

1. Update all documentation
2. Add migration guide
3. Add domain-specific examples
4. Performance testing
5. Release preparation

**Total: ~6-8 days of work**

---

## API Examples

### Business Use Case

```typescript
import { Cortex } from 'cortex-memory';

const cortex = await Cortex.create({
  storage: { path: './company-memory.db' },
  embeddings: { provider: 'local' },
  validation: { enableCitationValidation: false },
});

// Record a decision
await cortex.add({
  type: 'decision',
  title: 'Q1 Hiring Plan',
  decision: 'approved',
  summary: 'Hire 3 engineers, 1 designer',
  context: 'Series A funding closed, need to scale product team',
  stakeholders: ['CEO', 'CTO', 'HR'],
  revisitWhen: ['Runway < 12 months', 'Product roadmap changes'],
  importance: 'high',
  confidence: 1.0,
});

// Add tribal knowledge
await cortex.add({
  type: 'tribal',
  topic: 'hiring',
  knowledge: 'Always do a paid trial project before full-time offers',
  severity: 'warning',
  source: { type: 'experience' },
});

// Later: recall for a new decision
const context = await cortex.retrieve({
  intent: 'decide',
  focus: 'hiring senior engineer',
  maxTokens: 2000,
});
// Returns: Q1 plan + hiring tribal knowledge
```

### Research Use Case

```typescript
const cortex = await Cortex.create({
  storage: { path: './research-memory.db' },
});

// Add research insight
await cortex.add({
  type: 'insight',
  insight: 'Users prefer weekly summaries over daily notifications',
  source: 'experiment',
  domain: 'user-research',
  evidence: ['A/B test showed 40% higher engagement', 'Survey feedback'],
  confidence: 0.9,
});

// Add reference
await cortex.add({
  type: 'reference',
  title: 'Nielsen Norman Group: Notification UX',
  url: 'https://nngroup.com/articles/notification-ux',
  keyPoints: [
    'Batch notifications reduce cognitive load',
    'User control over frequency is critical',
  ],
  domain: 'ux-research',
});

// Recall for new feature
const context = await cortex.retrieve({
  intent: 'create',
  focus: 'notification system redesign',
});
```

---

## Success Metrics

1. **Adoption:** 100+ standalone installs in first month
2. **Compatibility:** Zero breaking changes for Drift users
3. **Performance:** <100ms retrieval for 10k memories
4. **Satisfaction:** Positive feedback from non-code use cases

---

## Open Questions

1. **Branding:** Keep "Cortex" name or rebrand for standalone?
2. **Pricing:** Same license for standalone? Separate tier?
3. **Cloud sync:** Add optional cloud backup for standalone?
4. **Templates:** Pre-built memory templates for common domains?

---

## Appendix: Full Type Definitions


### Base Memory (Unchanged)

```typescript
interface BaseMemory {
  id: string;
  type: MemoryType;
  
  // Bitemporal
  transactionTime: { recordedAt: string };
  validTime: { validFrom: string; validTo?: string };
  
  // Confidence
  confidence: number;  // 0.0 - 1.0
  importance: 'low' | 'normal' | 'high' | 'critical';
  
  // Access tracking
  lastAccessed?: string;
  accessCount: number;
  
  // Compression
  summary: string;  // ~20 tokens
  
  // Linking (optional)
  linkedPatterns?: string[];
  linkedConstraints?: string[];
  linkedFiles?: string[];
  linkedFunctions?: string[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  tags?: string[];
  
  // Archival
  archived?: boolean;
  archiveReason?: string;
  supersededBy?: string;
  supersedes?: string;
}
```

### Decision Memory (New)

```typescript
interface DecisionMemory extends BaseMemory {
  type: 'decision';
  
  title: string;
  decision: 'approved' | 'rejected' | 'deferred' | 'superseded';
  summary: string;
  
  // Context
  context?: string;
  businessContext?: string;
  technicalContext?: string;
  
  // Alternatives
  alternatives?: Array<{
    option: string;
    pros?: string[];
    cons?: string[];
    rejected?: string;
  }>;
  
  // Stakeholders
  stakeholders?: string[];
  decisionMaker?: string;
  
  // Lifecycle
  revisitWhen?: string[];
  expiresAt?: string;
  reviewSchedule?: 'monthly' | 'quarterly' | 'yearly' | 'never';
  
  // Domain
  domain?: string;
  category?: string;
  relatedDecisions?: string[];
}
```

### Insight Memory (New)

```typescript
interface InsightMemory extends BaseMemory {
  type: 'insight';
  
  insight: string;
  source: 'observation' | 'experiment' | 'feedback' | 'research' | 'experience' | 'inference';
  
  // Validation
  validated?: boolean;
  validatedBy?: string;
  validatedAt?: string;
  
  // Evidence
  evidence?: string[];
  contradictions?: string[];
  
  // Scope
  domain?: string;
  applicability?: 'universal' | 'contextual' | 'specific';
  conditions?: string[];  // When this insight applies
}
```

### Reference Memory (New)

```typescript
interface ReferenceMemory extends BaseMemory {
  type: 'reference';
  
  title: string;
  url?: string;
  
  // Content
  keyPoints: string[];
  fullContent?: string;  // Optional full text
  
  // Metadata
  author?: string;
  publishedAt?: string;
  lastVerified?: string;
  
  // Classification
  domain?: string;
  referenceType?: 'article' | 'paper' | 'documentation' | 'book' | 'video' | 'other';
  
  // Quality
  authoritative?: boolean;
  outdated?: boolean;
}
```

### Preference Memory (New)

```typescript
interface PreferenceMemory extends BaseMemory {
  type: 'preference';
  
  // What
  preference: string;
  category: string;  // e.g., 'communication', 'workflow', 'tools'
  
  // Scope
  scope: 'personal' | 'team' | 'organization';
  appliesTo?: string[];  // Specific contexts
  
  // Strength
  strength: 'suggestion' | 'preference' | 'requirement';
  
  // Rationale
  reason?: string;
}
```

---

## Appendix: MCP Tool Schemas

### cortex_add

```json
{
  "name": "cortex_add",
  "description": "Add a new memory. Supports: tribal, procedural, semantic, decision, insight, reference, preference.",
  "parameters": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": ["tribal", "procedural", "semantic", "decision", "insight", "reference", "preference"]
      },
      "content": {
        "type": "object",
        "description": "Memory content (varies by type)"
      },
      "importance": {
        "type": "string",
        "enum": ["low", "normal", "high", "critical"],
        "default": "normal"
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" }
      },
      "relatedMemoryIds": {
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "required": ["type", "content"]
  }
}
```

### cortex_recall

```json
{
  "name": "cortex_recall",
  "description": "Retrieve memories relevant to a context. Uses semantic search and intent-based weighting.",
  "parameters": {
    "type": "object",
    "properties": {
      "intent": {
        "type": "string",
        "enum": ["create", "investigate", "decide", "review", "recall", "learn"],
        "description": "What you're trying to do"
      },
      "focus": {
        "type": "string",
        "description": "Topic or area of focus"
      },
      "domain": {
        "type": "string",
        "description": "Optional domain filter"
      },
      "maxTokens": {
        "type": "number",
        "default": 2000
      },
      "maxMemories": {
        "type": "number",
        "default": 10
      }
    },
    "required": ["intent", "focus"]
  }
}
```

### cortex_decide

```json
{
  "name": "cortex_decide",
  "description": "Get decision support. Returns relevant past decisions, tribal knowledge, and insights.",
  "parameters": {
    "type": "object",
    "properties": {
      "question": {
        "type": "string",
        "description": "The decision question"
      },
      "domain": {
        "type": "string",
        "description": "Domain of the decision"
      },
      "options": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Options being considered"
      }
    },
    "required": ["question"]
  }
}
```

---

## Appendix: Configuration Schema

```typescript
interface CortexConfig {
  // Storage
  storage?: {
    type?: 'sqlite';
    path?: string;  // Default: './cortex.db'
  };
  
  // Embeddings
  embeddings?: {
    provider?: 'local' | 'openai' | 'ollama';
    model?: string;
    apiKey?: string;  // For OpenAI
    baseUrl?: string; // For Ollama
  };
  
  // Validation
  validation?: {
    enableTemporalValidation?: boolean;      // Default: true
    enableContradictionDetection?: boolean;  // Default: true
    enableCitationValidation?: boolean;      // Default: false (standalone)
    enablePatternAlignment?: boolean;        // Default: false (standalone)
  };
  
  // Consolidation
  consolidation?: {
    minEpisodes?: number;           // Default: 5
    maxEpisodeAge?: number;         // Default: 7 days
    consolidationThreshold?: number; // Default: 3
    pruneAfterConsolidation?: boolean; // Default: true
  };
  
  // Scheduler
  scheduler?: {
    enabled?: boolean;              // Default: true
    consolidationInterval?: number; // Default: 24 hours
    validationInterval?: number;    // Default: 168 hours (weekly)
  };
  
  // Domain (new)
  domain?: {
    name?: string;        // e.g., 'business', 'research', 'personal'
    customTypes?: string[]; // Additional memory types
    customIntents?: string[]; // Additional intents
  };
}
```

---

## Appendix: CLI Reference

```bash
# Initialize a new Cortex database
cortex init [--domain <domain>] [--path <path>]

# Add a memory interactively
cortex add

# Search memories
cortex search <query>

# Show status
cortex status

# Run consolidation
cortex consolidate [--dry-run]

# Run validation
cortex validate [--auto-heal]

# Export memories
cortex export [--format json|markdown] [--output <file>]

# Import memories
cortex import <file>

# Generate MCP config
cortex mcp-config [--output <file>]

# Start MCP server (for testing)
cortex serve [--port <port>]
```

---

## Conclusion

Cortex Standalone transforms a code-specific memory system into a general-purpose AI memory layer. The architecture already supports this - we're just exposing it properly.

**For the PhD user asking about business decisions:** Yes, this would work perfectly. They'd get:
- Semantic search across all decisions
- Automatic decay of old decisions (unless reinforced)
- Consolidation of related decisions into patterns
- Intent-aware retrieval ("I'm making a decision about X")
- Causal linking between related decisions

**For Drift:** Zero changes. The code-aware features remain, just properly isolated.

**For the ecosystem:** A new category of tool - AI memory that actually understands context, not just stores text.
