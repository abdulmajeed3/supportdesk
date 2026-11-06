# Changelog

All notable changes to SupportDesk are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **Ticket Search** — full-text search across ticket number, subject, and description body (backend `OR` clause, case-insensitive). Search term and active filters are synced to URL query params (`?search=…&status=…&priority=…&page=…`) with `replaceUrl: true`, making every filtered view bookmarkable and shareable. State is restored from the URL on page load. 300 ms debounce on the search input prevents redundant requests.

---

## [1.0.0] — 2024-01-01

### Added

**Backend**
- NestJS 12 API with Fastify adapter
- PostgreSQL 16 database with Prisma ORM
- JWT authentication with access tokens (15 min) + refresh token rotation
- Argon2id password hashing
- Role-based access control: CUSTOMER, AGENT, ADMIN
- Global JWT + roles guards via APP_GUARD
- Ticket lifecycle state machine with valid-transition enforcement
- Atomic ticket number generation via raw SQL UPDATE
- Refresh tokens stored as SHA-256 hashes
- Email enumeration prevention on login
- Rate limiting on authentication endpoints
- Paginated list endpoints with metadata
- Swagger/OpenAPI documentation at `/api/docs`
- URI versioning (default v1)
- Modules: auth, users, tickets, ticket-messages, categories, assignments, dashboard, notifications, prisma
- HTTP exception filter with consistent error shape
- Transform interceptor wrapping all responses
- Configuration module with typed environment variables
- GitHub Actions CI pipeline with PostgreSQL service

**Frontend**
- Angular 22 SPA with standalone components
- Angular signals for state management (no NgRx)
- JWT token injection via functional HTTP interceptor
- Automatic token refresh on 401 with request retry
- Route guards: authGuard, guestGuard, roleGuard factory
- Lazy-loaded feature routes per role
- Responsive sidebar layout with mobile hamburger menu
- Role-based navigation items
- Customer: ticket list, create ticket, ticket detail with reply
- Agent: dashboard, ticket queue, ticket detail with internal notes and status controls
- Admin: dashboard with system metrics, user management, category management
- Status and priority badges with color coding
- Message thread with customer/agent bubble differentiation
- Pagination component
- CSS design system with custom properties (light mode)
- Notifications list with unread badge
- Empty states and loading spinners

**Database**
- Tables: users, refresh_tokens, ticket_categories, tickets, ticket_sequence, ticket_messages, ticket_assignments, notifications
- Enums: UserRole, UserStatus, TicketStatus, TicketPriority, NotificationType
- Prisma seed data: admin, agent, customer accounts, 5 categories, 3 sample tickets

**Documentation**
- Comprehensive README with quick start, feature overview, permissions table
- docs/ARCHITECTURE.md — module graph, request pipeline
- docs/DATABASE.md — schema, tables, enums, migration workflow
- docs/API.md — all endpoints with request/response examples
- docs/SECURITY.md — auth design, known limitations
- docs/TESTING.md — test strategy and coverage
- docs/DEPLOYMENT.md — local and production setup
- docs/TROUBLESHOOTING.md — common issues and fixes
- docs/IMPLEMENTATION_PLAN.md — phased build approach
- CONTRIBUTING.md — branching, commit style, PR process
- CODE_OF_CONDUCT.md
- Reference-only license (see LICENSE)

**Testing**
- Vitest unit tests: ticket-lifecycle (9), auth service (5), categories service (4)
- GitHub Actions runs tests on push/PR to main and develop
