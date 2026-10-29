# Security

## Overview

This document describes the security controls implemented in SupportDesk. It covers the threat model, implemented mitigations, known limitations, and the scope of the security posture.

> **Important:** SupportDesk is a portfolio demonstration project. It applies standard security best practices but has not been penetration-tested or subjected to a formal security audit. Do not use it as a production system without a thorough review appropriate to your threat model.

---

## Authentication

### Password Hashing

Passwords are hashed with **Argon2id** (via the `argon2` npm package) before storage.
- Argon2id is the winner of the 2015 Password Hashing Competition and is the recommended algorithm for password hashing
- Default parameters: time cost 3, memory 64 MiB, parallelism 4
- No plaintext password ever touches the database

### JWT Tokens

Two-token authentication:
- **Access token**: short-lived (15 minutes), signed with `JWT_ACCESS_SECRET`
- **Refresh token**: long-lived (7 days by default), signed with `JWT_REFRESH_SECRET`

Access token payload:
```json
{ "sub": "<userId>", "email": "...", "role": "CUSTOMER" }
```

### Refresh Token Rotation

1. Raw refresh token is generated and returned to the client
2. Only the **SHA-256 hash** of the token is stored in the database
3. On refresh: the submitted token is hashed and looked up; if found and not revoked/expired, a new token pair is issued
4. The old token hash is marked `revokedAt`
5. If an already-revoked token is submitted (possible replay), all tokens for that user are revoked (breach containment)

This means:
- Token database leak does not expose raw tokens
- Replay attacks are detectable and responded to

---

## Authorization

### Role-Based Access Control

Three roles: `CUSTOMER`, `AGENT`, `ADMIN`.

Global guards enforce authentication and roles on every route. Public routes opt out with `@Public()`. Role-required routes use `@Roles(...)`.

No endpoint relies solely on frontend guards. Every permission check is enforced in the service layer.

### Resource-Level Access Control

Customers have a `customerId` field on tickets. The tickets service verifies `ticket.customerId === requestUser.id` before returning or modifying a customer's ticket. Customers cannot access other customers' data by guessing UUIDs.

Agents can only self-assign tickets; admins can assign to any agent. This is enforced in the assignments service.

### Admin Account Creation

There is no public registration endpoint for ADMIN accounts. Admins are created directly in the database (or via seed) or by an existing admin through the protected `POST /users` endpoint (`ADMIN` role required).

---

## Input Validation

All request bodies are validated using `class-validator` decorators on DTO classes. The global `ValidationPipe` is configured with:
- `whitelist: true` — strips unknown properties
- `forbidNonWhitelisted: true` — returns 400 for unexpected properties
- `transform: true` — coerces query param types

---

## Rate Limiting

`@nestjs/throttler` is applied globally:
- Default: 60 requests per 60 seconds per IP
- Auth endpoints (`/auth/login`, `/auth/register`): stricter limit (10 requests per 60 seconds, configurable via environment variables)

---

## Transport Security

CORS is configured to allow requests only from the configured `FRONTEND_URL`. In development this defaults to `http://localhost:4200`.

In production, CORS should allow only your specific domain, and the API should be served behind HTTPS.

---

## Content Security

Ticket message bodies are stored as plain text. They are returned as plain text to the frontend. The Angular frontend does not use `innerHTML` binding or `DomSanitizer.bypassSecurityTrustHtml()` for ticket content — it uses text interpolation only.

This prevents stored XSS attacks via ticket content.

---

## Secrets Management

- No secrets are committed to source control
- All secrets are supplied via environment variables (`.env` file locally, CI/CD secrets in production)
- `.env` is listed in `.gitignore`
- `.env.example` contains only placeholder values
- JWT secrets should be at least 64 random bytes (`openssl rand -base64 64`)

---

## Known Limitations

| Area | Limitation |
|---|---|
| No TLS enforcement | API has no built-in HTTPS; must be terminated by a reverse proxy (nginx, Caddy) in production |
| No 2FA | Single-factor auth only |
| No CSRF protection | Not needed for a pure JSON API with JWT (no cookies used for auth by default) |
| No account lockout | No progressive delays after repeated failed login attempts (rate limiting mitigates brute force) |
| No audit log | Status changes and admin actions are not logged to a separate audit table |
| No penetration test | Not professionally tested; treat as a reference implementation |
| Token storage | Frontend stores tokens in `localStorage`. This is susceptible to XSS; a more hardened approach uses `httpOnly` cookies, which this implementation does not use |

---

## Reporting a Vulnerability

This is a portfolio project with no production deployment. If you find a security issue of educational interest, please open a GitHub issue.
