# Deployment Guide

> **Reference only:** this guide documents how the system is designed to run. Deploying or operating this software requires prior written authorization under the [LICENSE](../LICENSE).

## Development Environment

### Prerequisites

- Node.js 20+ (developed on Node 26)
- Docker + Docker Compose
- npm 10+

### Steps

```bash
# Start PostgreSQL
docker compose up -d postgres

# Install dependencies
npm install --prefix apps/backend
npm install --prefix apps/frontend

# Set up environment
cp .env.example apps/backend/.env
# Edit apps/backend/.env — set JWT secrets at minimum

# Run migrations and seed
npm run db:migrate
npm run db:seed

# Start both applications
npm run dev
```

Application URLs:
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000/api/v1
- Swagger UI: http://localhost:3000/api/docs

---

## Production Build

```bash
# Build both apps
npm run build

# Backend output: apps/backend/dist/
# Frontend output: apps/frontend/dist/
```

### Running the Production Backend

```bash
cd apps/backend
NODE_ENV=production node dist/main.js
```

Environment variables must be set in the process environment (not `.env` file) in production.

### Serving the Frontend

The Angular build produces static files in `apps/frontend/dist/browser/`. These can be served by:
- nginx
- Caddy
- Any static file host (Vercel, Netlify, S3 + CloudFront)

For SPA routing to work, the server must return `index.html` for all non-asset routes.

**Example nginx config:**
```nginx
server {
    listen 80;
    root /var/www/supportdesk/browser;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Docker Compose (Development)

`docker-compose.yml` defines:
- `postgres` — PostgreSQL 16 on port 5432 (dev DB)
- Volume `postgres_data` for persistence

For a test database (CI), add the test Postgres service on port 5433.

---

## Environment Variables

All variables are documented in `.env.example`. Required in production:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (64+ random bytes) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (64+ random bytes, different from access) |
| `FRONTEND_URL` | Allowed CORS origin (e.g., `https://your-app.com`) |
| `NODE_ENV` | Set to `production` |

Generate secrets:
```bash
openssl rand -base64 64
```

---

## Database Migrations in Production

```bash
# Apply migrations without interactive prompt
npx prisma migrate deploy
```

Run this as part of your deployment pipeline before starting the application.

**Never run `prisma migrate dev` in production** — it prompts interactively and can reset the database.

---

## Health Check

The backend exposes no dedicated health endpoint in the current version. A reverse proxy can use TCP checks on port 3000, or you can use the Swagger endpoint at `/api/docs` as a liveness indicator.

---

## CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main` and `develop`:

1. **Backend job:** install → prisma generate → prisma migrate deploy (test DB) → tests → build
2. **Frontend job:** install → tests → build

To deploy automatically after CI passes, add a deploy step to the workflow with your hosting provider's CLI or SSH commands.

---

## Scaling Considerations

SupportDesk is a monolith designed for modest scale. For higher traffic:
- Run multiple backend instances behind a load balancer
- Use a connection pool (PgBouncer) for PostgreSQL
- Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` consistently across all instances
- Externalize session/token state is not needed — JWT is stateless

The current architecture does **not** use WebSockets, so horizontal scaling does not require sticky sessions.
