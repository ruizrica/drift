# Pattern Categories

Drift detects patterns across **15 categories** covering all aspects of modern software development.

---

## Overview

| Category | Description | Example Patterns |
|----------|-------------|------------------|
| `api` | REST endpoints, GraphQL | Route handlers, response format |
| `auth` | Authentication/authorization | Middleware, guards, RBAC |
| `security` | Security patterns | Validation, sanitization, CSRF |
| `errors` | Error handling | Try/catch, Result types |
| `logging` | Observability | Structured logging, correlation |
| `data-access` | Database queries | ORM patterns, repositories |
| `config` | Configuration | Environment vars, feature flags |
| `testing` | Test patterns | Mocks, fixtures, setup |
| `performance` | Optimization | Caching, memoization |
| `components` | UI components | React, Vue, Angular |
| `styling` | CSS patterns | Tailwind, CSS-in-JS |
| `structural` | Code organization | Modules, exports, naming |
| `types` | Type definitions | Interfaces, schemas |
| `accessibility` | A11y patterns | ARIA, semantic HTML |
| `documentation` | Doc patterns | JSDoc, docstrings |

---

## API Patterns

Patterns for HTTP endpoints and API design.

### What's Detected

- **HTTP Methods** — GET, POST, PUT, DELETE usage
- **Route Structure** — Path patterns, parameters
- **Response Envelopes** — Consistent response format
- **Pagination** — Cursor vs offset, page size
- **Retry Patterns** — Exponential backoff, circuit breaker
- **Error Formats** — Error response structure
- **Client Patterns** — Fetch, Axios, custom clients

### Example

```typescript
// Detected pattern: REST controller with consistent structure
@Controller('/api/v1/users')
export class UsersController {
  @Get('/:id')
  async getUser(@Param('id') id: string) {
    return { data: user, meta: { timestamp: Date.now() } };
  }
}
```

### Violations Flagged

- POST for read operations
- GET for mutations
- Inconsistent response format
- Missing pagination on list endpoints

---

## Auth Patterns

Patterns for authentication and authorization.

### What's Detected

- **Middleware Usage** — Auth middleware placement
- **Permission Checks** — Role-based access control
- **Token Handling** — JWT, session tokens
- **Audit Logging** — Auth event tracking
- **Resource Ownership** — User-scoped data access

### Example

```typescript
// Detected pattern: Auth middleware before handlers
@Controller('/api/admin')
@UseGuards(AuthGuard, RoleGuard('admin'))
export class AdminController {
  // All routes require auth + admin role
}
```

### Violations Flagged

- Unprotected sensitive endpoints
- Missing role checks
- Inconsistent auth middleware

---

## Security Patterns

Patterns for application security.

### What's Detected

- **Input Sanitization** — XSS prevention
- **CSRF Protection** — Token validation
- **SQL Injection Prevention** — Parameterized queries
- **Rate Limiting** — Request throttling
- **Secret Management** — Environment variables
- **CSP Headers** — Content Security Policy

### Example

```typescript
// Detected pattern: Input validation before processing
@Post('/users')
@UsePipes(ValidationPipe)
async createUser(@Body() dto: CreateUserDto) {
  // dto is validated and sanitized
}
```

### Violations Flagged

- Raw SQL with string concatenation
- Missing input validation
- Hardcoded secrets

---

## Error Patterns

Patterns for error handling.

### What's Detected

- **Try-Catch Placement** — Error boundary locations
- **Error Propagation** — How errors flow up
- **Exception Hierarchy** — Custom error classes
- **Error Logging** — What gets logged
- **Circuit Breaker** — Failure isolation
- **Async Errors** — Promise rejection handling

### Example

```typescript
// Detected pattern: Consistent error handling
try {
  const result = await service.process();
  return result;
} catch (error) {
  logger.error('Processing failed', { error, context });
  throw new AppError('PROCESSING_FAILED', error);
}
```

### Violations Flagged

- Empty catch blocks
- Swallowed errors
- Inconsistent error types

---

## Logging Patterns

Patterns for observability.

### What's Detected

- **Log Levels** — DEBUG, INFO, WARN, ERROR usage
- **Structured Format** — JSON logging
- **Correlation IDs** — Request tracing
- **Context Fields** — What's included in logs
- **PII Redaction** — Sensitive data masking
- **Health Checks** — Liveness/readiness probes
- **Metrics** — Custom metrics collection

### Example

```typescript
// Detected pattern: Structured logging with context
logger.info('User created', {
  userId: user.id,
  email: '[REDACTED]',
  correlationId: req.correlationId,
});
```

### Violations Flagged

- Console.log in production code
- Missing correlation IDs
- PII in logs

---

## Data Access Patterns

Patterns for database operations.

### What's Detected

- **Repository Pattern** — Data access abstraction
- **Query Patterns** — ORM usage
- **N+1 Detection** — Inefficient queries
- **DTO Patterns** — Data transfer objects
- **Transaction Patterns** — ACID compliance
- **Connection Pooling** — Database connections

### Supported ORMs

| Language | ORMs |
|----------|------|
| TypeScript | Prisma, TypeORM, Drizzle, Sequelize, Mongoose |
| Python | Django ORM, SQLAlchemy, Tortoise |
| Java | JPA, Hibernate, MyBatis |
| C# | Entity Framework, Dapper |
| PHP | Eloquent, Doctrine |
| Go | GORM, sqlx, Ent |
| Rust | SQLx, Diesel, SeaORM |

### Example

```typescript
// Detected pattern: Repository with consistent methods
class UserRepository {
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
  
  async create(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
```

### Violations Flagged

- Raw SQL without parameterization
- N+1 query patterns
- Missing transactions for multi-step operations

---

## Config Patterns

Patterns for configuration management.

### What's Detected

- **Environment Detection** — Dev/staging/prod
- **Feature Flags** — Toggle functionality
- **Default Values** — Fallback configuration
- **Required vs Optional** — Mandatory settings
- **Validation** — Config validation
- **Naming Conventions** — ENV_VAR naming

### Example

```typescript
// Detected pattern: Validated config with defaults
const config = {
  port: parseInt(process.env.PORT ?? '3000'),
  database: {
    url: requireEnv('DATABASE_URL'),
    poolSize: parseInt(process.env.DB_POOL_SIZE ?? '10'),
  },
};
```

### Violations Flagged

- Missing required environment variables
- Hardcoded configuration
- Inconsistent naming

---

## Testing Patterns

Patterns for test code.

### What's Detected

- **File Naming** — Test file conventions
- **Describe Naming** — Test suite structure
- **Fixture Patterns** — Test data setup
- **Mock Patterns** — Mocking strategies
- **Setup/Teardown** — Before/after hooks
- **Test Structure** — Arrange-Act-Assert
- **Co-location** — Tests near source

### Supported Frameworks

| Language | Frameworks |
|----------|------------|
| TypeScript | Jest, Vitest, Mocha |
| Python | pytest, unittest |
| Java | JUnit, TestNG |
| C# | xUnit, NUnit, MSTest |
| PHP | PHPUnit, Pest |
| Go | testing, testify |
| Rust | rust-test, tokio-test |
| C++ | Google Test, Catch2 |

### Example

```typescript
// Detected pattern: Consistent test structure
describe('UserService', () => {
  let service: UserService;
  let mockRepo: MockUserRepository;

  beforeEach(() => {
    mockRepo = createMockUserRepository();
    service = new UserService(mockRepo);
  });

  it('should create user', async () => {
    const result = await service.create(userData);
    expect(result).toMatchObject(expectedUser);
  });
});
```

### Violations Flagged

- Tests without assertions
- Inconsistent naming
- Missing setup/teardown

---

## Performance Patterns

Patterns for optimization.

### What's Detected

- **Caching Patterns** — Cache usage and invalidation
- **Code Splitting** — Dynamic imports
- **Lazy Loading** — Deferred loading
- **Memoization** — Computed value caching
- **Debounce/Throttle** — Rate limiting
- **Bundle Size** — Import optimization

### Example

```typescript
// Detected pattern: Memoized expensive computation
const expensiveResult = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

### Violations Flagged

- Missing memoization for expensive operations
- Unnecessary re-renders
- Large bundle imports

---

## Component Patterns

Patterns for UI components.

### What's Detected

- **Props Patterns** — Prop types and defaults
- **State Patterns** — State management
- **Composition** — Component composition
- **Ref Forwarding** — Ref handling
- **Near-Duplicates** — Similar components
- **Modal Patterns** — Dialog handling

### Example

```tsx
// Detected pattern: Consistent component structure
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  size = 'md',
  children,
  onClick,
}) => {
  return (
    <button className={cn(styles[variant], styles[size])} onClick={onClick}>
      {children}
    </button>
  );
};
```

### Violations Flagged

- Missing prop types
- Inconsistent component structure
- Duplicate components

---

## Styling Patterns

Patterns for CSS and styling.

### What's Detected

- **Class Naming** — BEM, utility-first
- **Design Tokens** — Color, spacing, typography
- **Responsive Patterns** — Breakpoints, media queries
- **Spacing Scale** — Consistent spacing
- **Typography** — Font usage
- **Color Usage** — Color palette
- **Z-Index Scale** — Layering
- **Tailwind Patterns** — Utility class usage

### Example

```tsx
// Detected pattern: Tailwind with consistent spacing
<div className="p-4 md:p-6 lg:p-8 space-y-4">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
  <p className="text-gray-600">Description</p>
</div>
```

### Violations Flagged

- Hardcoded colors
- Inconsistent spacing
- Missing responsive styles

---

## Structural Patterns

Patterns for code organization.

### What's Detected

- **File Naming** — Naming conventions
- **Directory Structure** — Folder organization
- **Barrel Exports** — Index files
- **Circular Dependencies** — Import cycles
- **Co-location** — Related files together
- **Import Ordering** — Import organization
- **Module Boundaries** — Package structure

### Example

```
// Detected pattern: Feature-based structure
src/
├── features/
│   ├── users/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.ts
│   └── orders/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── index.ts
└── shared/
    ├── components/
    └── utils/
```

### Violations Flagged

- Inconsistent naming
- Circular imports
- Deep nesting

---

## Types Patterns

Patterns for type definitions.

### What's Detected

- **Any Usage** — Type safety violations
- **Interface vs Type** — Declaration style
- **Generic Patterns** — Generic usage
- **Naming Conventions** — Type naming
- **Type Assertions** — Cast usage
- **Utility Types** — Built-in type usage

### Example

```typescript
// Detected pattern: Consistent interface naming
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

interface CreateUserDto {
  email: string;
  password: string;
}

type UserWithPosts = User & { posts: Post[] };
```

### Violations Flagged

- `any` type usage
- Inconsistent naming
- Missing type annotations

---

## Accessibility Patterns

Patterns for accessibility.

### What's Detected

- **Alt Text** — Image descriptions
- **ARIA Roles** — Semantic roles
- **Keyboard Navigation** — Focus handling
- **Focus Management** — Focus trapping
- **Heading Hierarchy** — H1-H6 structure
- **Semantic HTML** — Proper elements

### Example

```tsx
// Detected pattern: Accessible button
<button
  aria-label="Close dialog"
  onClick={onClose}
  onKeyDown={(e) => e.key === 'Escape' && onClose()}
>
  <CloseIcon aria-hidden="true" />
</button>
```

### Violations Flagged

- Missing alt text
- Incorrect heading hierarchy
- Missing ARIA labels

---

## Documentation Patterns

Patterns for code documentation.

### What's Detected

- **JSDoc Patterns** — Function documentation
- **README Structure** — Project documentation
- **Deprecation** — Deprecated code marking
- **Example Code** — Usage examples
- **TODO Patterns** — Task tracking

### Example

```typescript
// Detected pattern: Consistent JSDoc
/**
 * Creates a new user in the system.
 * 
 * @param data - User creation data
 * @returns The created user
 * @throws {ValidationError} If data is invalid
 * @example
 * const user = await createUser({ email: 'test@example.com' });
 */
async function createUser(data: CreateUserDto): Promise<User> {
  // ...
}
```

### Violations Flagged

- Missing documentation on public APIs
- Outdated documentation
- Missing examples

---

## Confidence Scoring

Each pattern has a confidence score (0.0-1.0):

| Score | Level | Meaning |
|-------|-------|---------|
| 0.9-1.0 | High | Strongly established, consistent |
| 0.7-0.9 | Medium | Well-established, some variation |
| 0.5-0.7 | Low | Emerging, review recommended |
| <0.5 | Uncertain | Insufficient data, may be noise |

Confidence is calculated from:
- **Frequency** — How often the pattern appears
- **Consistency** — How uniform the pattern is
- **Spread** — How many files contain it
- **Age** — How long it's existed

---

## Pattern Lifecycle

```
Discovery → Discovered → Approved/Ignored → Enforcement
```

1. **Discovered** — Auto-detected during scan
2. **Approved** — User confirms as "how we do things"
3. **Ignored** — User marks as not relevant
4. **Enforcement** — Approved patterns flag violations

See [[Architecture]] for more details on the pattern system.
