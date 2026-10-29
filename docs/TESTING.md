# Testing

## Overview

| Layer | Framework | Type |
|---|---|---|
| Backend services | Vitest | Unit tests (mocked dependencies) |
| Ticket lifecycle | Vitest | Unit tests (pure functions) |
| Frontend (planned) | Angular + Vitest | Component / service unit tests |
| E2E (planned) | Playwright | End-to-end browser tests |

---

## Running Tests

```bash
# All backend tests
cd apps/backend && npm test

# Backend with coverage report
cd apps/backend && npm run test:cov

# Backend in watch mode (during development)
cd apps/backend && npm run test:watch

# Frontend tests (once implemented)
cd apps/frontend && npm test
```

---

## Backend Tests

### Structure

Tests live alongside their source files as `*.spec.ts`:

```
src/
├── app.controller.spec.ts
├── auth/
│   └── auth.service.spec.ts
├── categories/
│   └── categories.service.spec.ts
└── tickets/
    └── ticket-lifecycle.spec.ts
```

### Configuration

`vitest.config.ts` at the backend root:
- Environment: `node`
- Timeout: 10 seconds
- Uses `@nestjs/testing` for module creation

### Test Coverage

| File | Scenarios tested |
|---|---|
| `ticket-lifecycle.spec.ts` | All valid/invalid agent transitions, customer reopen, CLOSED terminal state |
| `auth.service.spec.ts` | Register conflict, register success, login wrong password, login user not found, login success |
| `categories.service.spec.ts` | Create conflict, create success, findAll (filtered/unfiltered), update not-found |

### Mocking Strategy

Dependencies are mocked using Vitest's `vi.fn()`. NestJS `TestingModule` is used to wire up the service under test with mock providers:

```ts
const module = await Test.createTestingModule({
  providers: [
    MyService,
    { provide: PrismaService, useValue: mockPrisma },
    { provide: JwtService, useValue: mockJwt },
  ],
}).compile();
```

`vi.clearAllMocks()` runs before each test to prevent state leakage.

### What Is Not Covered

- **Integration tests against a real database:** The current suite is pure unit tests with mocked Prisma. Integration tests would require a running PostgreSQL instance (Docker). The CI pipeline provisions a test database but integration test files have not been written.
- **Controller tests:** Controllers are thin pass-throughs to services; service tests cover the business logic.
- **Auth guard tests:** Guard behavior is tested implicitly via E2E tests (planned).

---

## Frontend Tests

Angular 22 generates Vitest-compatible specs. The `angular.json` test builder uses `@angular/build:application` with Vitest.

Frontend component tests are scaffolded by the CLI but not yet fully implemented. Planned coverage:
- `AuthService` — token storage, computed signals, `getDashboardRoute()`
- `authInterceptor` — token injection, 401 handling
- Route guards — redirect behavior
- Key feature components — render and user interaction

---

## E2E Tests (Planned)

A full E2E suite using Playwright is in the roadmap. It would cover:
- Registration and login
- Create ticket as customer
- Agent workflow: assign, reply, change status
- Admin: create category, create agent account
- Notifications

---

## CI Test Execution

GitHub Actions runs tests on every push and pull request. See `.github/workflows/ci.yml`:
- Backend: spins up PostgreSQL, runs `prisma migrate deploy`, then `npm test`
- Frontend: `npm test` (component tests)

Test failures block merging.

---

## Coverage Thresholds

No formal thresholds are enforced at this time. Run `npm run test:cov` to see current coverage. The output includes Istanbul-style HTML reports in `apps/backend/coverage/`.
