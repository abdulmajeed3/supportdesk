# Implementation Plan

This document records the phased implementation approach used to build SupportDesk.

---

## Phase 1 — Repository Scaffold

**Goal:** Establish the monorepo structure and baseline tooling.

- Created root `package.json` with npm workspaces for `apps/backend` and `apps/frontend`
- Scaffolded NestJS backend (`nest new`) with Fastify adapter
- Scaffolded Angular frontend (`ng new`) with standalone components, strict TypeScript
- Configured ESLint and Prettier at the root
- Added `.gitignore`, `.env.example`
- Added `docker-compose.yml` for PostgreSQL 16 (dev on port 5432, test on port 5433)

**Key decision:** Backend uses CommonJS (`"module": "commonjs"` in tsconfig, no `"type": "module"` in package.json). NestJS 12's scaffold generates ESM-style imports with `.js` extensions; removing ESM avoids path extension issues when mixing scaffold-generated and hand-written files.

---

## Phase 2 — Database Schema

**Goal:** Define all data models before writing any service code.

- Wrote `apps/backend/prisma/schema.prisma` with all models
- Key design choices:
  - `TicketSequence` single-row table for atomic ticket number generation
  - `RefreshToken.tokenHash` stores SHA-256 hash, never plaintext
  - `TicketCategory.isActive` for soft-deactivation (hard delete breaks FK references)
  - `TicketMessage.isInternal` for agent-only notes
- Created first Prisma migration
- Wrote `prisma/seed.ts` with realistic development data

---

## Phase 3 — Authentication Module

**Goal:** JWT authentication with refresh token rotation before any other feature.

- `AuthService` with `register`, `login`, `refreshTokens`, `logout`, `logoutAll`
- Argon2id password hashing
- JWT access token (15 min) + refresh token (7 days)
- Token rotation: old hash revoked, new token issued
- Replay detection: if revoked token submitted, all user tokens revoked
- `JwtStrategy` validates token and checks `UserStatus.ACTIVE`
- Global `APP_GUARD` with `JwtAuthGuard` + `RolesGuard`
- `@Public()` decorator for opt-out
- `@Roles()` decorator for role constraints
- Email enumeration prevention: same 401 for wrong email and wrong password

---

## Phase 4 — Common Infrastructure

**Goal:** Cross-cutting concerns before feature modules.

- `HttpExceptionFilter` — consistent error shape
- `TransformInterceptor` — wraps all responses in `{ success, data }`
- `PaginationDto` and `paginate<T>()` utility
- `PrismaModule` — global singleton
- `configuration.ts` — typed config factory from environment variables
- `ThrottlerModule` — rate limiting

---

## Phase 5 — Tickets Module

**Goal:** Core helpdesk functionality.

- `ticket-lifecycle.ts` — `VALID_TRANSITIONS` and `CUSTOMER_TRANSITIONS` maps, `assertValidTransition()`
- `TicketsService` with CRUD, lifecycle enforcement, `getNextTicketNumber()` raw SQL
- Customer access control — `assertAccess()` checks ticket ownership
- Auto-status-advance on message post (OPEN → IN_PROGRESS, WAITING_FOR_CUSTOMER → IN_PROGRESS)
- Ticket filtering and pagination
- DTOs with class-validator for all inputs

---

## Phase 6 — Supporting Modules

**Goal:** Complete the API surface.

- `TicketMessagesModule` — threaded conversation, internal notes, auto-status on post
- `CategoriesModule` — admin CRUD, soft-deactivate
- `AssignmentsModule` — agent self-assign, admin assign, unassign, history
- `UsersModule` — admin CRUD on users, status toggle, create agent
- `NotificationsModule` — list, mark-read, mark-all-read
- `DashboardModule` — role-scoped aggregated metrics from live queries

---

## Phase 7 — Backend Configuration and Documentation

**Goal:** Complete API configuration.

- Swagger/OpenAPI setup in `main.ts`
- URI versioning (default `1`)
- CORS configured to `FRONTEND_URL`
- Global prefix `api`
- Fastify bootstrap with `FastifyAdapter`

---

## Phase 8 — Frontend Core

**Goal:** Application shell before any feature screens.

- `app.config.ts` — providers, interceptors, router
- `app.routes.ts` — top-level route tree with lazy loading
- `AuthService` — signal-based state, localStorage token management
- `authInterceptor` — token injection, 401 → refresh → retry
- Guards: `authGuard`, `guestGuard`, `roleGuard` factory
- Environment files for API URL

---

## Phase 9 — Frontend Layout and Styling

**Goal:** Design system and shell before feature pages.

- `styles.scss` — CSS custom properties (light/dark), full design system
- Status/priority badge color-coding
- Message thread bubbles (customer vs agent)
- Responsive sidebar layout
- `AppLayoutComponent` — sidebar, role-based nav, notifications badge, hamburger mobile menu

---

## Phase 10 — Customer Features

**Goal:** Full customer workflow.

- Login and register pages
- Ticket list page with status filter and pagination
- Create ticket form
- Ticket detail page with message thread and reply form

---

## Phase 11 — Agent and Admin Features

**Goal:** Staff-side workflow.

- Agent dashboard and ticket queue
- Ticket detail with status controls, priority, internal notes, assignment
- Admin dashboard with system metrics
- User management page (list, create agent, suspend/activate)
- Category management page (list, create, edit, deactivate)

---

## Phase 12 — Tests

**Goal:** Verify correctness with automated tests.

- `ticket-lifecycle.spec.ts` — 9 tests covering all transition scenarios
- `auth.service.spec.ts` — 5 tests
- `categories.service.spec.ts` — 4 tests
- GitHub Actions CI pipeline

---

## Phase 13 — Documentation

**Goal:** All required docs for a portfolio-quality project.

- `README.md` — comprehensive setup and overview
- `docs/ARCHITECTURE.md` — module graph, request pipeline
- `docs/DATABASE.md` — all tables, enums, migration workflow
- `docs/API.md` — all endpoints with request/response shapes
- `docs/SECURITY.md` — threat model, controls, known limitations
- `docs/TESTING.md` — test strategy, coverage, known gaps
- `docs/DEPLOYMENT.md` — local, production, Docker, CI
- `docs/TROUBLESHOOTING.md` — common issues and fixes
- `docs/IMPLEMENTATION_PLAN.md` — this document
- `CONTRIBUTING.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `LICENSE`
- GitHub issue templates and PR template

---

## Phase 14 — Validation

**Goal:** Confirm everything compiles and tests pass.

- Backend type-check and build (`nest build`)
- Frontend type-check and build (`ng build`)
- Fix any compilation or import errors
- Confirm tests pass
- Verify Prisma client is on a consistent version

---

## Known Technical Debt

| Item | Notes |
|---|---|
| Integration tests | Unit tests with mocks do not catch DB-level bugs; integration tests against a real DB are planned |
| Frontend component tests | Scaffolded but not fully implemented |
| E2E tests | Planned via Playwright |
| Prisma version alignment | Scaffold may install Prisma v8 RC; `@prisma/client` may be v7.x — should be reconciled |
| Refresh token rotation on concurrent requests | A race condition exists if two requests arrive simultaneously before the first rotation completes — mitigated in practice by short access token lifetime |
