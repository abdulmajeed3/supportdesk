# SupportDesk

> **Reference Only — All Rights Reserved**
>
> This repository is publicly available for portfolio presentation and technical evaluation only. Public visibility does not grant permission to deploy, operate, commercially use, modify, redistribute, or create derivative works from this software. Any additional use requires prior written authorization under the applicable license and subject to applicable law. All rights not expressly granted are reserved.
>
> See [LICENSE](LICENSE). To request permission for additional use, contact majeed.developer0@gmail.com.

A professional, full-stack customer support and helpdesk platform for managing support tickets, agent queues, and customer communications.

[![CI](https://github.com/YOUR_USERNAME/SupportDesk/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/SupportDesk/actions/workflows/ci.yml)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [User Roles and Permissions](#user-roles-and-permissions)
- [Ticket Lifecycle](#ticket-lifecycle)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Development Scripts](#development-scripts)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Production Build](#production-build)
- [Security Overview](#security-overview)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

SupportDesk is a focused, production-quality helpdesk application that demonstrates modern full-stack development practices. Customers submit support tickets, support agents manage and resolve them, and administrators oversee the entire operation.

**Intended users:** Developers evaluating full-stack portfolio projects; teams wanting a clean reference for Angular + NestJS + Prisma integration.

---

## Features

### Customer
- Register and log in with secure JWT authentication
- Create, view, and search support tickets
- Search by ticket number, subject, or description body — filters and search term persist in the URL (bookmarkable, shareable)
- Select category and priority
- Reply to open tickets
- Reopen resolved tickets
- In-app notifications for agent replies and status changes

### Agent
- View all tickets and search + filter by status, priority, category — URL query params preserved
- Assign tickets to themselves
- Update ticket status with enforced lifecycle transitions
- Change ticket priority
- Reply publicly or post internal notes
- Dashboard showing assigned tickets and queue metrics

### Administrator
- All agent capabilities plus system-level management
- Create and manage agent accounts
- Manage ticket categories (create, edit, activate/deactivate)
- System-wide dashboard with status/priority breakdowns and category workload
- User account management (activate/suspend)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 22, TypeScript, RxJS, Angular Router, Reactive Forms, SCSS |
| Backend | NestJS 12, Fastify, TypeScript, Passport/JWT |
| Database | PostgreSQL 16, Prisma ORM |
| Auth | JWT (access + refresh tokens), Argon2id password hashing |
| Testing | Vitest (backend unit), Angular unit tests |
| Tooling | npm workspaces, ESLint, Prettier, Docker Compose |
| CI/CD | GitHub Actions |

---

## Architecture

```mermaid
graph TB
    Browser["Browser\n(Angular 22)"] -->|HTTP/REST| API
    subgraph Backend ["NestJS (Fastify)"]
        API["API Gateway\n/api/v1"] --> Auth
        API --> Tickets
        API --> Messages["TicketMessages"]
        API --> Categories
        API --> Assignments
        API --> Dashboard
        API --> Notifications
        Auth --> JWT["JWT Strategy\n+ Guards"]
        Tickets --> TLife["Ticket Lifecycle\nRules"]
    end
    Backend -->|Prisma Client| DB["PostgreSQL 16"]
```

The backend follows a modular monolith pattern. Each domain (auth, tickets, categories, etc.) is an independent NestJS module with its own controller, service, and DTOs. Cross-cutting concerns (guards, decorators, filters, interceptors) live in `common/`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed module responsibilities and data flow.

---

## Repository Structure

```
SupportDesk/
├── apps/
│   ├── backend/                 # NestJS + Fastify API
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Database schema
│   │   │   └── seed.ts          # Development seed data
│   │   └── src/
│   │       ├── auth/            # JWT auth, login, register
│   │       ├── users/           # User management
│   │       ├── tickets/         # Ticket CRUD + lifecycle
│   │       ├── ticket-messages/ # Conversation threads
│   │       ├── categories/      # Ticket categories
│   │       ├── assignments/     # Ticket assignments
│   │       ├── dashboard/       # Role-specific metrics
│   │       ├── notifications/   # In-app notifications
│   │       ├── prisma/          # PrismaService
│   │       └── common/          # Guards, decorators, filters
│   └── frontend/                # Angular 22 SPA
│       └── src/app/
│           ├── core/            # Services, guards, models, interceptors
│           ├── features/        # Feature modules (auth, customer, agent, admin)
│           └── shared/          # Layout, reusable components
├── docs/                        # Technical documentation
├── .github/                     # GitHub Actions, issue templates
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## User Roles and Permissions

| Action | Customer | Agent | Admin |
|---|:---:|:---:|:---:|
| Register | ✅ | — | — |
| Login | ✅ | ✅ | ✅ |
| View own tickets | ✅ | — | — |
| View all tickets | — | ✅ | ✅ |
| Create ticket | ✅ | — | ✅ |
| Reply to ticket | ✅ (public) | ✅ (public + internal) | ✅ |
| Reopen resolved ticket | ✅ | ✅ | ✅ |
| Change ticket status | ✅ (reopen only) | ✅ | ✅ |
| Change ticket priority | ❌ | ✅ | ✅ |
| Assign ticket | ❌ | Self only | Any agent |
| View assignment history | ❌ | ✅ | ✅ |
| Manage categories | ❌ | ❌ | ✅ |
| Create agent accounts | ❌ | ❌ | ✅ |
| Suspend/activate users | ❌ | ❌ | ✅ |
| View admin dashboard | ❌ | ❌ | ✅ |

All permissions are enforced **server-side**. Frontend guards are UX only.

---

## Ticket Lifecycle

```
OPEN ──────────► IN_PROGRESS ──────────► WAITING_FOR_CUSTOMER
  │                   │                          │
  │                   └──────────────────────────┤
  │                                              │
  └──────────────────────────────────────────────┼──► RESOLVED ──► CLOSED
                                                 │         │
                                                 │         └──► OPEN (customer/agent reopen)
                                                 ▼
                                              CLOSED (terminal)
```

- Agents can make most transitions; customers can only reopen `RESOLVED → OPEN`
- `CLOSED` is terminal — no further transitions are permitted
- When an agent replies to an `OPEN` ticket, status auto-advances to `IN_PROGRESS`
- When a customer replies to a `WAITING_FOR_CUSTOMER` ticket, status returns to `IN_PROGRESS`

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20 LTS | Developed on Node 26 |
| npm | 10 | Comes with Node |
| Docker + Docker Compose | Any recent | For PostgreSQL |
| Git | Any | — |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/SupportDesk.git
cd SupportDesk

# 2. Copy and configure environment
cp .env.example apps/backend/.env
# Edit apps/backend/.env — at minimum set JWT secrets

# 3. Start PostgreSQL
docker compose up -d postgres

# 4. Install dependencies
npm install --prefix apps/backend
npm install --prefix apps/frontend

# 5. Run database migrations and seed
npm run db:migrate      # from project root
npm run db:seed

# 6. Start the backend (http://localhost:3000)
npm run backend

# 7. In another terminal, start the frontend (http://localhost:4200)
npm run frontend
```

---

## Environment Configuration

Copy `.env.example` to `apps/backend/.env` and set:

```bash
# Required — generate with: openssl rand -base64 64
JWT_ACCESS_SECRET=your_long_random_secret_here
JWT_REFRESH_SECRET=your_different_long_random_secret_here

# Database (default values match docker-compose.yml)
DATABASE_URL=postgresql://supportdesk:supportdesk_password@localhost:5432/supportdesk
```

See [.env.example](.env.example) for all available variables.

---

## Database Setup

### Start PostgreSQL via Docker

```bash
docker compose up -d postgres
```

### Run migrations

```bash
# From project root
npm run db:migrate

# Or directly
cd apps/backend && npx prisma migrate dev
```

### Seed development data

```bash
npm run db:seed
```

This creates:
- Admin: `admin@supportdesk.local` / `Admin@123456`
- Agent: `agent.sarah@supportdesk.local` / `Agent@123456`
- Customer: `alice@example.com` / `Customer@123456`
- 5 ticket categories and 3 sample tickets

### Prisma Studio (database GUI)

```bash
npm run db:studio
```

---

## Running the Application

### Backend (NestJS — port 3000)

```bash
cd apps/backend
npm run start:dev
```

### Frontend (Angular — port 4200)

```bash
cd apps/frontend
npm start
```

### Run both together

```bash
# From project root
npm run dev
```

---

## Development Scripts

All scripts can be run from the project root or from within each app's directory.

| Command | Description |
|---|---|
| `npm run backend` | Start backend in watch mode |
| `npm run frontend` | Start frontend dev server |
| `npm run dev` | Start both concurrently |
| `npm run build` | Production builds (both apps) |
| `npm run test` | Run all tests |
| `npm run test:backend` | Run backend tests only |
| `npm run lint` | Lint both apps |
| `npm run format` | Format all files with Prettier |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database |
| `npm run db:reset` | Reset and re-seed database |
| `npm run db:studio` | Open Prisma Studio |

---

## API Documentation

Once the backend is running, visit:

- **Swagger UI:** http://localhost:3000/api/docs
- **API Base URL:** http://localhost:3000/api/v1

### Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <access_token>
```

Obtain tokens via `POST /api/v1/auth/login` or `POST /api/v1/auth/register`.

### Response format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/tickets"
}
```

See [docs/API.md](docs/API.md) for the full endpoint reference.

---

## Testing

```bash
# Backend unit tests
cd apps/backend && npm test

# Backend with coverage
cd apps/backend && npm run test:cov

# Frontend tests
cd apps/frontend && npm test
```

See [docs/TESTING.md](docs/TESTING.md) for strategy, coverage, and known limitations.

---

## Production Build

```bash
# Build both apps
npm run build

# Backend output: apps/backend/dist/
# Frontend output: apps/frontend/dist/

# Run production backend
cd apps/backend && npm run start:prod
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment guidance.

---

## Security Overview

- Passwords hashed with Argon2id (industry-standard)
- JWT access tokens (short-lived, 15 min) + refresh tokens (rotated on each use)
- Refresh tokens stored as SHA-256 hashes in the database
- Role-based authorization enforced at every API endpoint
- Resource-level ownership checks (customers can't access other customers' tickets)
- Request validation on all inputs using class-validator
- Rate limiting on authentication endpoints
- CORS configured to allow only the frontend origin
- No secrets in source control (environment variables only)

See [docs/SECURITY.md](docs/SECURITY.md) for full threat model and known limitations.

---

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues.

**Common quick fixes:**

| Problem | Solution |
|---|---|
| `Connection refused` on port 5432 | Run `docker compose up -d postgres` |
| Prisma migration error | Ensure DATABASE_URL in `.env` is correct |
| 401 Unauthorized | Check JWT_ACCESS_SECRET in `.env` matches what was used to sign the token |
| CORS error from Angular | Ensure `FRONTEND_URL=http://localhost:4200` in backend `.env` |

---

## Known Limitations

- No WebSocket support (polling not implemented for real-time notifications)
- No email notifications (in-app only)
- No file attachment support for ticket messages
- Agents can only self-assign (not assign to other agents) without admin
- No full-text search indexing (uses ILIKE, suitable for moderate scale)
- No SLA management or escalation rules
- Test coverage is unit tests only — integration tests require a running database

---

## Roadmap

- [ ] Real-time notifications via WebSocket
- [ ] Email notifications (SMTP integration)
- [ ] File attachments on tickets and messages
- [ ] Full-text search indexing (GIN/tsvector; current ILIKE suits moderate scale)
- [ ] SLA configuration and breach alerts
- [ ] Bulk ticket operations
- [ ] Audit log for all ticket state changes
- [ ] Agent performance reports
- [ ] REST API rate limiting per user
- [ ] Two-factor authentication

---

## Contributing

This project is published for reference and portfolio evaluation and is not open to outside contributions or pull requests. See [LICENSE](LICENSE) for the use that is permitted, and contact me to request any additional permission.

## License

Copyright (c) 2026 Abdul Majeed. All rights reserved.

This project is published under a custom **Reference-Only Source-Available License**. It is **not** an open-source license. See [LICENSE](LICENSE). Deployment, commercial use, modification and redistribution require prior written authorization. Permission requests: majeed.developer0@gmail.com

