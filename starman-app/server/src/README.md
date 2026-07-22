# Server Source

Application source for the Starman Express API.

## Files

| File/Folder | Purpose |
|---|---|
| `index.js` | Creates the Express app, mounts all route groups, serves web assets, and handles errors. |
| `env.js` | Reads and validates environment variables. |
| `db.js` | Exports the Prisma client and `writeAudit()` helper. |
| `auth.js` | Authentication, JWT verification, and role gates. |
| `rateLimit.js` | Request throttling helpers. |
| `runtime.js` | Production configuration checks, trusted-proxy parsing, correlation IDs, redacted request logs, and health/readiness helpers. |
| `routes/` | Business API modules. |
| `services/` | External/model service adapters. |

## Rules

- Every business query must filter by `req.user.orgId`.
- Mutating operations should call `writeAudit()`.
- Keep route logic thin; put reusable external-call logic in `services/`.
- Never log request bodies, query strings, credentials, tokens, KYC, transcripts, documents, or model payloads.
- Keep `/api/health` dependency-free and use `/api/ready` for a generic PostgreSQL readiness result.
