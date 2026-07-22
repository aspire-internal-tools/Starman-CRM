# Prisma

Database schema and seed data for Starman CRM.

## Files

| File | Purpose |
|---|---|
| `schema.prisma` | PostgreSQL data model for organizations, users, clients, households, leads, tasks, documents, audit logs, connectors, and API keys. |
| `seed.js` | Demo organization, demo advisor account, and starting CRM records. |

## Commands

Run from `starman-app/server/`:

```bash
npx prisma migrate dev
npm run seed
```

## Rules

- All business models must include `orgId`.
- Do not store plaintext OAuth tokens, portal passwords, or production secrets.
- Keep demo data fictional.

