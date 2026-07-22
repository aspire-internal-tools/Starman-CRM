# API Routes

Route modules for the Starman Express API.

## Current Modules

| File | Purpose |
|---|---|
| `auth.js` | Register, login, and current-user endpoints. |
| `dashboard.js` | Dashboard summaries and command-centre data. |
| `clients.js` | Client records. |
| `households.js` | Household records and householding workflow. |
| `leads.js` | Lead CRUD; canonical pattern for new modules. |
| `intakes.js` | Intake CRUD and conversion. |
| `tasks.js` | Task management. |
| `documents.js` | Client document metadata and storage workflow. |
| `insurance.js` | Insurance records. |
| `notifications.js` | User notifications. |
| `connectors.js` | Integration configuration and simulated tests/syncs. |
| `apikeys.js` | Organization API keys. |
| `v1.js` | Public integration API authenticated by `x-api-key`. |
| `ai.js` | Grounded AI support using CRM context and uploaded knowledge docs. |

## Route Pattern

1. Apply `authRequired` unless the route is intentionally public.
2. Validate input with Zod.
3. Scope every Prisma query by `orgId`.
4. Audit every create/update/delete/login/convert action.
5. Forward errors to the central handler with `next(e)`.

