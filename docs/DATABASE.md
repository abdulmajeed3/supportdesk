# Database Design

## Engine and ORM

- **Engine:** PostgreSQL 16
- **ORM:** Prisma — schema-first, generates a fully-typed client
- **Schema file:** `apps/backend/prisma/schema.prisma`

---

## Entity Relationship Overview

```
User (1) ──< Ticket (many, as customer)
Agent (User, AGENT) ──< TicketAssignment (many)
Ticket ──< TicketMessage (many)
Ticket ──< TicketAssignment (many)
Ticket >── TicketCategory
User ──< RefreshToken (many)
User ──< Notification (many)
TicketSequence (single row, atomic counter)
```

---

## Tables

### `users`

Stores all accounts (customers, agents, admins).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `email` | String | Unique |
| `password` | String | Argon2id hash, never plaintext |
| `firstName` | String | |
| `lastName` | String | |
| `role` | Enum `UserRole` | CUSTOMER / AGENT / ADMIN |
| `status` | Enum `UserStatus` | ACTIVE / SUSPENDED |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | Auto-updated |

### `refresh_tokens`

Stores hashed refresh tokens for rotation.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tokenHash` | String | SHA-256(rawToken), not the token itself |
| `userId` | UUID | FK → users |
| `expiresAt` | DateTime | |
| `createdAt` | DateTime | |
| `revokedAt` | DateTime? | Null until revoked |

Only the SHA-256 hash is stored. The raw token is returned to the client once and never persisted. Token rotation revokes the old hash and inserts a new one.

### `ticket_categories`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | String | Unique |
| `description` | String? | |
| `isActive` | Boolean | Default true; soft-deactivate only |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

Categories are never hard-deleted — `isActive = false` preserves referential integrity for existing tickets.

### `tickets`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `ticketNumber` | Int | Unique, sequential from `ticket_sequence` |
| `title` | String | |
| `description` | String | |
| `status` | Enum `TicketStatus` | OPEN / IN_PROGRESS / WAITING_FOR_CUSTOMER / RESOLVED / CLOSED |
| `priority` | Enum `TicketPriority` | LOW / MEDIUM / HIGH / URGENT |
| `customerId` | UUID | FK → users (customer) |
| `categoryId` | UUID? | FK → ticket_categories |
| `resolvedAt` | DateTime? | Set when status → RESOLVED |
| `closedAt` | DateTime? | Set when status → CLOSED |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

### `ticket_sequence`

Single-row table used for atomic ticket number generation.

| Column | Type | Notes |
|---|---|---|
| `id` | Int | Always `1` |
| `lastValue` | Int | Incremented atomically via raw SQL |

**Atomic generation:**
```sql
UPDATE ticket_sequence SET last_value = last_value + 1 WHERE id = 1
RETURNING last_value;
```
This is safe under concurrent inserts because PostgreSQL row-level locking serializes the UPDATE. No race conditions or gaps from failed transactions.

### `ticket_messages`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `ticketId` | UUID | FK → tickets |
| `authorId` | UUID | FK → users |
| `body` | String | Plain text only — no unsafe HTML rendering |
| `isInternal` | Boolean | Agent-only notes; filtered from customer view |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

### `ticket_assignments`

History of all assignments (who assigned whom, when).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `ticketId` | UUID | FK → tickets |
| `agentId` | UUID | FK → users (agent) |
| `assignedById` | UUID | FK → users (admin or self) |
| `assignedAt` | DateTime | |
| `unassignedAt` | DateTime? | Null if still active |

### `notifications`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `userId` | UUID | FK → users (recipient) |
| `type` | Enum `NotificationType` | NEW_MESSAGE / STATUS_CHANGED / ASSIGNED / TICKET_CREATED |
| `ticketId` | UUID? | Related ticket |
| `message` | String | Human-readable text |
| `isRead` | Boolean | Default false |
| `createdAt` | DateTime | |

---

## Enums

| Enum | Values |
|---|---|
| `UserRole` | CUSTOMER, AGENT, ADMIN |
| `UserStatus` | ACTIVE, SUSPENDED |
| `TicketStatus` | OPEN, IN_PROGRESS, WAITING_FOR_CUSTOMER, RESOLVED, CLOSED |
| `TicketPriority` | LOW, MEDIUM, HIGH, URGENT |
| `NotificationType` | NEW_MESSAGE, STATUS_CHANGED, ASSIGNED, TICKET_CREATED |

---

## Migrations

Managed by Prisma Migrate. Migration files live in `apps/backend/prisma/migrations/`.

```bash
# Create a new migration (development)
npx prisma migrate dev --name <migration-name>

# Apply existing migrations (production / CI)
npx prisma migrate deploy

# Reset database and re-apply all migrations (destroys data)
npx prisma migrate reset
```

---

## Seed Data

`apps/backend/prisma/seed.ts` creates a usable development dataset:
- 3 users: admin, agent, customer
- 5 ticket categories
- 3 sample tickets across different statuses
- Sample messages and assignments

Run with: `npm run db:seed` (from project root).

---

## Connection

Configured via the `DATABASE_URL` environment variable in `.env`:

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/supportdesk
```

For local development, use the Docker Compose PostgreSQL service (see [DEPLOYMENT.md](DEPLOYMENT.md)).
