# Pattern Categories

Drift detects patterns across 14 categories.

## Categories Overview

| Category | Description | Examples |
|----------|-------------|----------|
| `api` | API endpoint patterns | REST controllers, route handlers, middleware |
| `auth` | Authentication patterns | JWT handling, session management, OAuth |
| `security` | Security patterns | Input validation, CSRF protection, rate limiting |
| `errors` | Error handling patterns | Try-catch blocks, error boundaries, logging |
| `logging` | Logging patterns | Log levels, structured logging, audit trails |
| `data-access` | Database access patterns | ORM usage, queries, transactions |
| `config` | Configuration patterns | Environment variables, feature flags |
| `testing` | Testing patterns | Test structure, mocking, assertions |
| `performance` | Performance patterns | Caching, lazy loading, optimization |
| `components` | UI component patterns | Component structure, props, state |
| `styling` | Styling patterns | CSS-in-JS, design tokens, themes |
| `structural` | Code structure patterns | File naming, folder organization |
| `types` | Type definition patterns | Interfaces, type guards, generics |
| `accessibility` | Accessibility patterns | ARIA labels, keyboard navigation |

---

## api

API endpoint and routing patterns.

**What Drift Detects:**
- REST controller decorators (`@Controller`, `@Get`, `@Post`)
- Route handler signatures
- Request/response typing
- Middleware chains
- API versioning patterns
- Response format conventions

**Example Pattern:**
```typescript
// Drift learns your API pattern:
@Controller('/api/v1/users')
export class UserController {
  @Get('/:id')
  @RequireAuth()
  async getUser(@Param('id') id: string): Promise<UserResponse> {
    // ...
  }
}
```

---

## auth

Authentication and authorization patterns.

**What Drift Detects:**
- JWT token handling
- Session management
- OAuth flows
- Permission checks
- Role-based access control
- Auth middleware usage

**Example Pattern:**
```typescript
// Drift learns your auth pattern:
@RequireAuth()
@RequireRole('admin')
async deleteUser(userId: string) {
  // ...
}
```

---

## security

Security-related patterns.

**What Drift Detects:**
- Input validation
- SQL injection prevention
- XSS protection
- CSRF tokens
- Rate limiting
- Sensitive data handling

**Example Pattern:**
```typescript
// Drift learns your validation pattern:
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const validated = schema.parse(input);
```

---

## errors

Error handling patterns.

**What Drift Detects:**
- Try-catch block structure
- Error class hierarchies
- Error response formats
- Error logging
- Error boundaries (React)
- Async error handling

**Example Pattern:**
```typescript
// Drift learns your error pattern:
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new AppError('OPERATION_FAILED', error);
}
```

---

## logging

Logging and observability patterns.

**What Drift Detects:**
- Log level usage
- Structured logging format
- Context inclusion
- Audit logging
- Performance logging
- Error logging

**Example Pattern:**
```typescript
// Drift learns your logging pattern:
logger.info('User action', {
  userId: user.id,
  action: 'login',
  timestamp: new Date().toISOString()
});
```

---

## data-access

Database and data access patterns.

**What Drift Detects:**
- ORM usage (Prisma, TypeORM, etc.)
- Query patterns
- Transaction handling
- Repository patterns
- Data validation
- Soft delete patterns

**Example Pattern:**
```typescript
// Drift learns your data access pattern:
const user = await prisma.user.findUnique({
  where: { id },
  include: { profile: true }
});
```

---

## config

Configuration and environment patterns.

**What Drift Detects:**
- Environment variable access
- Config file structure
- Feature flags
- Secret management
- Default values
- Validation

**Example Pattern:**
```typescript
// Drift learns your config pattern:
const config = {
  port: process.env.PORT || 3000,
  database: {
    url: requireEnv('DATABASE_URL'),
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10')
  }
};
```

---

## testing

Testing patterns.

**What Drift Detects:**
- Test file naming
- Test structure (describe/it)
- Mocking patterns
- Assertion styles
- Setup/teardown
- Test data factories

**Example Pattern:**
```typescript
// Drift learns your test pattern:
describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create user', async () => {
    const user = await userService.create(mockUserData);
    expect(user.id).toBeDefined();
  });
});
```

---

## performance

Performance optimization patterns.

**What Drift Detects:**
- Caching strategies
- Lazy loading
- Memoization
- Batch processing
- Connection pooling
- Query optimization

---

## components

UI component patterns (React, Vue, etc.).

**What Drift Detects:**
- Component structure
- Props patterns
- State management
- Hooks usage
- Event handling
- Composition patterns

---

## styling

CSS and styling patterns.

**What Drift Detects:**
- CSS-in-JS patterns
- Design token usage
- Theme structure
- Responsive patterns
- Animation patterns
- Spacing conventions

---

## structural

Code organization patterns.

**What Drift Detects:**
- File naming conventions
- Folder structure
- Module organization
- Import patterns
- Export patterns
- Index files

---

## types

TypeScript type patterns.

**What Drift Detects:**
- Interface definitions
- Type aliases
- Generic patterns
- Type guards
- Utility types
- Discriminated unions

---

## accessibility

Accessibility patterns.

**What Drift Detects:**
- ARIA attributes
- Keyboard navigation
- Focus management
- Screen reader support
- Color contrast
- Semantic HTML

---

## Filtering by Category

### CLI

```bash
# List patterns in a category
drift where --category api

# Approve all in a category
drift approve --category auth --yes

# Export specific categories
drift export --categories api,auth,errors
```

### MCP

```json
{
  "tool": "drift_patterns_list",
  "parameters": {
    "categories": ["api", "auth", "errors"]
  }
}
```
