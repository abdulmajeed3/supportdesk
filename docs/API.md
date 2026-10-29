# API Reference

**Base URL:** `http://localhost:3000/api/v1`  
**Interactive docs:** `http://localhost:3000/api/docs` (Swagger UI)

All responses are wrapped:

```json
{ "success": true, "data": <payload> }
```

Errors:
```json
{ "success": false, "statusCode": 400, "error": "...", "message": "...", "timestamp": "...", "path": "..." }
```

Paginated responses include:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
  }
}
```

---

## Authentication

### `POST /auth/register`

Register a new customer account.

**Public.** Rate-limited.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass@1",
  "firstName": "Alice",
  "lastName": "Smith"
}
```

**Response `201`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "uuid", "email": "...", "firstName": "...", "lastName": "...", "role": "CUSTOMER" }
}
```

Password must be at least 8 characters with at least one uppercase, one lowercase, one digit, and one special character.

---

### `POST /auth/login`

**Public.** Rate-limited.

**Body:**
```json
{ "email": "user@example.com", "password": "SecurePass@1" }
```

**Response `200`:** Same shape as register.

Returns `401 Unauthorized` for wrong email or password (same error to prevent email enumeration).

---

### `POST /auth/refresh`

Exchange a refresh token for new tokens (rotates the refresh token).

**Public.**

**Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `200`:** New `{ accessToken, refreshToken }`.

---

### `POST /auth/logout`

Revoke the current refresh token. Requires authentication.

**Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `204 No Content`**

---

### `POST /auth/logout-all`

Revoke all refresh tokens for the current user.

**Response `204 No Content`**

---

## Tickets

### `GET /tickets`

List tickets.

- **Customer:** sees only their own tickets
- **Agent/Admin:** sees all tickets

**Query params:**
| Param | Type | Description |
|---|---|---|
| `page` | number | Default 1 |
| `limit` | number | Default 20, max 100 |
| `status` | TicketStatus | Filter by status |
| `priority` | TicketPriority | Filter by priority |
| `categoryId` | UUID | Filter by category |
| `search` | string | ILIKE search on title/description |

**Response `200`:** Paginated ticket list.

---

### `POST /tickets`

Create a ticket.

**Roles:** CUSTOMER, ADMIN

**Body:**
```json
{
  "title": "Cannot login to my account",
  "description": "I get an error when I try to login...",
  "priority": "HIGH",
  "categoryId": "uuid-optional"
}
```

**Response `201`:** Created ticket with generated `ticketNumber`.

---

### `GET /tickets/:id`

Get a single ticket with messages and assignment history.

- **Customer:** can only access their own tickets
- **Agent/Admin:** can access any ticket

**Response `200`:** Full ticket object with `messages` and `assignments`.

---

### `PATCH /tickets/:id`

Update ticket status or priority.

**Roles:** AGENT, ADMIN (customers can only reopen via status transitions)

**Body (all optional):**
```json
{ "status": "IN_PROGRESS", "priority": "URGENT" }
```

Status transitions are validated against the lifecycle rules. Invalid transitions return `400 Bad Request`.

**Response `200`:** Updated ticket.

---

## Ticket Messages

### `GET /tickets/:ticketId/messages`

List messages for a ticket.

- Customer view filters out `isInternal: true` messages
- Agent/Admin view includes internal notes

---

### `POST /tickets/:ticketId/messages`

Add a message to a ticket.

**Body:**
```json
{
  "body": "Here is an update on your issue...",
  "isInternal": false
}
```

`isInternal: true` is only accepted from AGENT or ADMIN roles.

When an agent posts a message on an OPEN ticket, status auto-advances to IN_PROGRESS.  
When a customer posts on WAITING_FOR_CUSTOMER, status returns to IN_PROGRESS.

**Response `201`:** Created message.

---

## Categories

### `GET /categories`

List ticket categories.

**Query:** `?activeOnly=true` (default true for public use)

**Public.** (Read — no auth required for active category listing)

---

### `POST /categories`

**Roles:** ADMIN

**Body:**
```json
{ "name": "Billing", "description": "Payment and invoice questions" }
```

---

### `PATCH /categories/:id`

**Roles:** ADMIN

**Body (all optional):**
```json
{ "name": "...", "description": "...", "isActive": false }
```

Setting `isActive: false` soft-deactivates; never deletes (preserves existing ticket references).

---

## Assignments

### `POST /tickets/:ticketId/assignments`

Assign a ticket to an agent.

- **Agent:** can only assign to themselves (`agentId` must match their own `id`)
- **Admin:** can assign to any agent

**Body:**
```json
{ "agentId": "uuid" }
```

**Response `201`:** Assignment record.

---

### `DELETE /tickets/:ticketId/assignments/current`

Unassign the current active assignment.

**Roles:** AGENT (own), ADMIN

---

## Users

### `GET /users`

**Roles:** ADMIN

Paginated list of all users.

**Query:** `?role=AGENT`, `?status=ACTIVE`, `?page=1`, `?limit=20`

---

### `GET /users/:id`

**Roles:** ADMIN (or own profile for any user)

---

### `POST /users`

**Roles:** ADMIN

Create an agent account (customers self-register).

**Body:**
```json
{
  "email": "new.agent@company.com",
  "password": "AgentPass@1",
  "firstName": "Bob",
  "lastName": "Jones",
  "role": "AGENT"
}
```

---

### `PATCH /users/:id/status`

**Roles:** ADMIN

Activate or suspend a user.

**Body:**
```json
{ "status": "SUSPENDED" }
```

---

## Dashboard

### `GET /dashboard`

Returns role-scoped metrics.

**Customer:** own ticket counts by status.  
**Agent:** assigned-to-me counts by status.  
**Admin:** system-wide counts, per-category workload, agent assignment counts.

All values are computed from live database queries — nothing is hardcoded.

---

## Notifications

### `GET /notifications`

**Paginated.** Current user's notifications, newest first.

**Query:** `?unreadOnly=true`

---

### `PATCH /notifications/:id/read`

Mark a single notification as read.

---

### `PATCH /notifications/read-all`

Mark all of the current user's notifications as read.

---

## Error Codes

| Status | Meaning |
|---|---|
| 400 | Validation failure, invalid state transition |
| 401 | Missing or expired token |
| 403 | Authenticated but insufficient role/ownership |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, duplicate category name) |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |
