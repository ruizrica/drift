# Pattern Summary for New Modal Planning

Based on drift scan of `competitive-intelligence-api` codebase.

## Overview

| Category | Patterns | Occurrences |
|----------|----------|-------------|
| components | 56 | 47,113 |
| errors | 50 | 23,343 |
| structural | 63 | 21,220 |
| auth | 49 | 6,540 |
| api | 20 | 794 |

---

## API Patterns

### HTTP Methods
- **GET**: 68 locations (most common)
- **POST**: Used for mutations
- **DELETE**: 22 locations
- **PUT/PATCH**: For updates

### Route Structure
- RESTful patterns: 88 locations
- Route prefix pattern: `/api/v1/{resource}`
- Nested routes: `/api/routes/{domain}/{action}.py`

### Response Envelope
- Consistent response format across 64+ endpoints
- Pattern: `{ data: T, success: boolean, message?: string }`

### Key Files
- `api/main.py` - Main FastAPI app
- `api/routes/*.py` - Route handlers
- `frontend/src/services/api/*.ts` - API clients

---

## Auth Patterns

### Token Handling
- JWT tokens via Supabase
- Token validation in middleware
- Pattern: `get_current_user` dependency injection

### Permission Checks
- Role-based access control (RBAC)
- Subscription tier checks
- Owner validation for resources

### Middleware
- `api/middleware/auth.py` - Auth middleware
- `api/middleware/subscription.py` - Subscription checks
- `api/middleware/rate_limiting.py` - Rate limiting

### Key Patterns
```python
# Dependency injection for auth
async def get_current_user(request: Request) -> dict:
    # Validate token, return user

# Route protection
@router.get("/protected")
async def protected_route(user: dict = Depends(get_current_user)):
    # Only authenticated users
```

---

## Error Patterns

### Exception Hierarchy
- Custom exceptions extending base classes
- HTTP exceptions with status codes
- Structured error responses

### Error Handling
- Try/catch at route level
- Error logging with context
- User-friendly error messages

### Key Patterns
```python
# Structured error response
raise HTTPException(
    status_code=400,
    detail={"error": "message", "code": "ERROR_CODE"}
)

# Error logging
logger.error(f"Error in {operation}: {str(e)}", exc_info=True)
```

---

## Structural Patterns

### File Naming
- Python: `snake_case.py`
- TypeScript: `PascalCase.tsx` for components
- API files: `{domain}.py` or `{domain}/{action}.py`

### Directory Structure
```
api/
  routes/
    {domain}/
      __init__.py
      {action}.py
  middleware/
  schemas/
services/
  {domain}_service.py
frontend/
  src/
    components/
      {domain}/
        {Component}.tsx
    services/
      api/
        {domain}Api.ts
    pages/
      {Page}.tsx
```

### Import Ordering
- Standard library first
- Third-party packages
- Local imports last

---

## Component Patterns

### Structure
- Functional components with hooks
- Props interfaces defined
- State management with useState/useEffect

### Naming
- PascalCase for components
- camelCase for functions/hooks
- Props suffix for prop types

### Key Patterns
```typescript
// Component structure
interface ComponentProps {
  prop1: string;
  prop2?: number;
}

export function Component({ prop1, prop2 }: ComponentProps) {
  const [state, setState] = useState();
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  return <div>...</div>;
}
```

### Common Components
- `ErrorBoundary` - Error handling
- `DataTable` - Data display
- `StatCard` - Statistics display
- `EmptyState` - Empty state handling

---

## Violations Found (516 total)

### Most Common
1. **Network calls without retry logic** (453 warnings)
   - API calls should have retry/backoff
   
2. **List endpoints without pagination** (63 warnings)
   - Large lists need pagination support

### Recommendations
- Add retry logic to API clients
- Implement pagination for list endpoints
- Add error boundaries around async operations

---

## For Your New Modal

Based on these patterns, your new modal should:

### API Layer
- Use existing API client pattern from `frontend/src/services/api/client.ts`
- Follow RESTful conventions
- Return consistent response envelope

### Auth
- Use `get_current_user` dependency
- Check subscription tier if needed
- Validate resource ownership

### Error Handling
- Wrap in try/catch
- Log errors with context
- Return user-friendly messages

### Component Structure
- Functional component with TypeScript
- Define props interface
- Use existing UI components (Card, Button, etc.)

### File Location
- Backend: `api/routes/{domain}.py`
- Frontend: `frontend/src/components/{domain}/{Modal}.tsx`
- API client: `frontend/src/services/api/{domain}Api.ts`
