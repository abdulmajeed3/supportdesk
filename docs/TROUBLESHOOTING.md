# Troubleshooting

## Database Connection Issues

### `Error: connect ECONNREFUSED 127.0.0.1:5432`

PostgreSQL is not running.

```bash
docker compose up -d postgres
# Verify it is healthy:
docker compose ps
```

### `Error: Can't reach database server`

Check your `DATABASE_URL` in `apps/backend/.env`:
```
DATABASE_URL=postgresql://supportdesk:supportdesk_password@localhost:5432/supportdesk
```

The username, password, host, port, and database name must match the Docker Compose service configuration.

### `Prisma migration failed`

Run migrations explicitly with verbose output:
```bash
cd apps/backend
npx prisma migrate dev --verbose
```

If the database schema is in an unexpected state, reset it (destroys all data):
```bash
npx prisma migrate reset
```

---

## Authentication Issues

### `401 Unauthorized` on every request

- Check that `JWT_ACCESS_SECRET` in `.env` is set and not empty
- If you changed `JWT_ACCESS_SECRET` after issuing tokens, all existing tokens are invalid — log in again
- Check the request header: `Authorization: Bearer <token>` (note the space after `Bearer`)

### Refresh token returns `401`

Refresh tokens expire after 7 days (configurable). Log in again to get new tokens.

Refresh tokens are also invalidated when you change `JWT_REFRESH_SECRET`.

### Cannot log in after seeding

Seed passwords are:
- Admin: `Admin@123456`
- Agent: `Agent@123456`
- Customer: `Customer@123456`

If these fail, the seed may not have run, or the database was reset without re-seeding. Run `npm run db:seed` from the project root.

---

## CORS Errors

### `Access to XMLHttpRequest has been blocked by CORS policy`

The backend's CORS configuration does not include your frontend origin.

Set `FRONTEND_URL` in `apps/backend/.env`:
```
FRONTEND_URL=http://localhost:4200
```

Restart the backend after changing `.env`.

---

## Backend Build Issues

### `Cannot find module` errors

```bash
cd apps/backend
npm install
npx prisma generate
```

Prisma generates its client into `node_modules`. If `node_modules` was deleted or the schema was changed without regenerating, imports fail.

### `SyntaxError: Cannot use import statement in a module`

The backend uses CommonJS, not ESM. If you see this error, check:
- `apps/backend/package.json` does NOT have `"type": "module"`
- `apps/backend/tsconfig.json` has `"module": "commonjs"`

These should already be set correctly. If they were accidentally changed, revert them.

### `Error: Module not found: @prisma/client`

```bash
cd apps/backend
npm install
npx prisma generate
```

---

## Frontend Issues

### Angular dev server starts but shows blank page

Open the browser console. Check for:
- Network errors to `http://localhost:3000` — backend is not running
- Console errors — TypeScript compilation errors (check terminal for `ng serve` output)

### `ng: command not found`

```bash
cd apps/frontend
npx ng serve
# or use the npm script:
npm start
```

### Environment variable changes are not picked up

Angular bakes environment values into the bundle at build time. After changing `apps/frontend/src/environments/environment.ts`, stop and restart the dev server.

---

## Test Failures

### `TypeError: X is not a function` in spec files

Usually means the stub implementation does not have the method the test expects, or imports use `.js` extensions (ESM artifacts) that CommonJS does not resolve. Check the import paths in the spec file.

### Vitest cannot find `@prisma/client`

Run `npx prisma generate` before running tests. Prisma generates its client from `schema.prisma`; without generation, the types and runtime client do not exist.

---

## Docker Issues

### Port 5432 already in use

Another PostgreSQL instance is running. Either stop it or change the Docker Compose host port:
```yaml
ports:
  - "5434:5432"  # use 5434 instead
```

Then update `DATABASE_URL` to use port 5434.

### Container keeps restarting

```bash
docker compose logs postgres
```

Look for permission errors on the data volume. A fresh start often fixes it:
```bash
docker compose down -v   # removes volumes (destroys data)
docker compose up -d postgres
```

---

## Getting Further Help

1. Check the relevant documentation file in `docs/`
2. Search existing GitHub issues
3. Open a new GitHub issue with:
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - OS
   - Full error message and stack trace
   - Steps to reproduce
