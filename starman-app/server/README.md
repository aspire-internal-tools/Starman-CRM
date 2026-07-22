# Server

Express + Prisma API for the Starman CRM product.

## Responsibilities

- Authenticate users with JWT and bcrypt.
- Enforce org-scoped access on every business record.
- Serve API routes for CRM modules, integrations, documents, and AI support.
- Write audit entries for mutating operations.
- Serve the web client/static front end.

## Key Files

| Path | Purpose |
|---|---|
| `src/index.js` | Express app bootstrap, route mounting, static web hosting, error handling. |
| `src/env.js` | Environment variable validation and runtime configuration. |
| `src/db.js` | Prisma client and audit helper. |
| `src/runtime.js` | Production configuration gates, trusted-proxy parsing, correlation IDs, redacted request telemetry, and health/readiness helpers. |
| `src/auth.js` | JWT, password, and role middleware. |
| `src/routes/` | API route modules. |
| `src/services/` | Shared service adapters, including LLM calls. |
| `prisma/schema.prisma` | Database schema. |
| `prisma/seed.js` | Demo organization and initial data. |

## Run

```bash
npm install
npm run dev
```

Use Docker from `../` for the normal full-stack workflow.

## Azure Runtime

The production container runs as the non-root `node` user and exposes:

- `GET /api/health` for process liveness; it does not inspect dependencies.
- `GET /api/ready` for PostgreSQL readiness; failures are generic and do not expose database errors.

Azure Container Apps sets `TRUST_PROXY=1`. Production requires a strong `JWT_SECRET` and `sslmode=require` in `DATABASE_URL`. Direct OpenAI processing is rejected in production. Azure mode additionally requires an HTTPS Azure deployment endpoint and `AI_DEPLOYMENT_TYPE=regional`; the deployment type must still be independently verified in Azure.

Run the runtime tests with:

```bash
npm test
```
