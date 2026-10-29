# Architecture

## Overview

SupportDesk is a monorepo containing two applications: a NestJS REST API backend and an Angular SPA frontend. The backend follows a modular monolith pattern; the frontend is a signal-driven SPA with lazy-loaded feature routes.

```
apps/
├── backend/   NestJS 12 + Fastify
└── frontend/  Angular 22
```

---

## Backend Architecture

### Framework and Transport

NestJS uses **Fastify** as the underlying HTTP transport (not Express). Fastify provides better throughput and lower overhead for a dedicated API server. The `FastifyAdapter` is wired in `main.ts`.

### Module Graph

```
AppModule
├── ConfigModule (global)
├── ThrottlerModule (rate limiting)
├── PrismaModule (global — provides PrismaService)
├── AuthModule
│   ├── JwtModule
│   ├── PassportModule
│   └── APP_GUARD → JwtAuthGuard, RolesGuard
├── UsersModule
├── TicketsModule
├── TicketMessagesModule
├── CategoriesModule
├── AssignmentsModule
├── DashboardModule
└── NotificationsModule
```

### Module Responsibilities

| Module | Responsibility |
|---|---|
| `AuthModule` | Register, login, refresh tokens, logout |
| `UsersModule` | Admin CRUD on users, status management |
| `TicketsModule` | Create/read/update tickets; lifecycle enforcement |
| `TicketMessagesModule` | Per-ticket message threads; internal notes |
| `CategoriesModule` | Ticket category CRUD (admin only) |
| `AssignmentsModule` | Agent self-assign and admin-assign |
| `DashboardModule` | Role-scoped aggregated metrics |
| `NotificationsModule` | In-app notification list and mark-read |
| `PrismaModule` | Global singleton PrismaService |

### Guards and Decorators

All routes are authenticated by default via `APP_GUARD → JwtAuthGuard`. Public routes opt out with the `@Public()` decorator. Role-based access is enforced by `APP_GUARD → RolesGuard` using the `@Roles()` decorator.

Both guards are registered globally in `AuthModule` using:
```ts
{ provide: APP_GUARD, useClass: JwtAuthGuard }
{ provide: APP_GUARD, useClass: RolesGuard }
```

### Request Pipeline

```
Request
  → Fastify
  → ThrottlerGuard (rate limit check)
  → JwtAuthGuard (verify access token)
  → RolesGuard (check @Roles decorator)
  → ValidationPipe (class-validator on DTO)
  → Controller method
  → Service
  → PrismaService → PostgreSQL
  → TransformInterceptor (wrap in { success, data })
  → Response
```

Errors at any stage are caught by `HttpExceptionFilter`, which serializes to:
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "...",
  "timestamp": "...",
  "path": "..."
}
```

### API Versioning

URI-based versioning with default version `1`. All routes are prefixed `api/`. Result: `/api/v1/<resource>`.

### Configuration

A single `configuration.ts` factory maps environment variables to a typed config object. Consumed via NestJS `ConfigService<AppConfig>`.

---

## Frontend Architecture

### Framework

Angular 22 with:
- Standalone components (no NgModules)
- Signals for state management (no NgRx)
- New control flow (`@if`, `@for`, `@switch`)
- `HttpClient` with functional interceptors

### Route Structure

```
/ (AppLayoutComponent, authGuard)
├── /customer (roleGuard('CUSTOMER'))
│   ├── /tickets          - ticket list
│   ├── /tickets/new      - create ticket
│   └── /tickets/:id      - ticket detail
├── /agent (roleGuard('AGENT'))
│   ├── /dashboard        - agent dashboard
│   ├── /tickets          - all tickets queue
│   └── /tickets/:id      - ticket detail
├── /admin (roleGuard('ADMIN'))
│   ├── /dashboard        - admin dashboard
│   ├── /tickets          - all tickets
│   ├── /users            - user management
│   └── /categories       - category management
├── /auth (guestGuard)
│   ├── /login
│   └── /register
├── /notifications
├── /profile
└── ** → NotFoundComponent
```

### State Management

`AuthService` holds the session state via Angular signals:

```ts
_currentUser = signal<User | null>(null);
isAuthenticated = computed(() => !!this._currentUser());
isCustomer = computed(() => this._currentUser()?.role === 'CUSTOMER');
isAgent    = computed(() => this._currentUser()?.role === 'AGENT');
isAdmin    = computed(() => this._currentUser()?.role === 'ADMIN');
```

Feature services maintain their own local signals for their data (ticket list, pagination state, etc.).

### HTTP Interceptor

`authInterceptor` (functional) attaches the access token to every request. On a 401 response it calls `AuthService.refreshToken()`, retries the original request once, and if refresh fails it clears the session and redirects to `/auth/login`.

### Routing Guards

| Guard | Behavior |
|---|---|
| `authGuard` | Redirects to `/auth/login` if not authenticated |
| `guestGuard` | Redirects to role dashboard if already authenticated |
| `roleGuard(role)` | Factory — redirects to `/auth/login` if wrong role |

---

## Database

PostgreSQL 16 accessed through Prisma ORM. See [DATABASE.md](DATABASE.md) for schema details.

---

## Monorepo Layout

```
SupportDesk/
├── package.json            # Root workspace manifest + shared scripts
├── .prettierrc
├── docker-compose.yml
├── .env.example
├── apps/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── vitest.config.ts
│   │   ├── prisma/
│   │   └── src/
│   └── frontend/
│       ├── package.json
│       ├── tsconfig.json
│       ├── angular.json
│       └── src/
└── docs/
```

Root `package.json` uses `workspaces` but individual apps manage their own `node_modules`. The root provides convenience scripts that delegate into each app with `--prefix`.
