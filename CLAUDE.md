# CLAUDE.md

Guidance for Claude Code (claude.ai/code) and any AI assistant working in this
repository. These instructions override default behavior — follow them exactly.

**Read first:** `docs/ARCHITECTURE.md` (living architecture document — overview,
flows, feature breakdowns, prompts, roadmap, and the AI Collaboration Guide),
then `docs/PROJECT-MAP.md` and `docs/MVP.md`.

---

## What Starman is

**Starman** is the codename for an in-house ("intrapreneurship") CRM built for
**Aspire Investments & Insurance**, a CIRO-regulated Canadian investment and
insurance advisory practice. It exists because off-the-shelf CRMs are US-hosted
(PIPEDA friction), per-seat priced, and don't understand the Canadian advisor
workflow — KYC refresh cycles, CIRO suitability, seg funds, FHSA/RRSP/TFSA
account types, and locked carrier data.

Repository layout:

| Path | Stack | Purpose |
|---|---|---|
| `starman-app/` | Node 20 + Express + Prisma + PostgreSQL | The product (API + vanilla-JS web client). Working MVP. |
| `design/Starman.html` | Single self-contained HTML file | The "Advisor OS" design prototype (localStorage demo data). Design north star. |
| `aspire_connectors/` | Python 3 + FastAPI | Connector-layer prototype (Meta leads, webhooks, CSV, DocuSign sim, AdvisorStream). |
| `docs/` | Markdown + docx | Architecture, MVP, Azure planning, compliance, version history. |
| `branding/` | Brand kit + skill | Official Aspire brand reference. |

### The two frontends (important)
1. `starman-app/web/` — **functional**, wired to the real API and Postgres.
2. `design/Starman.html` — **design prototype** ("Advisor OS"), localStorage demo
   data only. The filename is permanent and versionless; the version lives in its
   `<meta name="version">` tag and `docs/Starman-Version-History.md`.

`docker compose up` in `starman-app/` serves the **design prototype** at
`http://localhost:4000/` (the file is bind-mounted over the web root —
intentional). To test real database features, run the server locally on port
**4001**, or remove the design-file mount from `docker-compose.yml`.

---

## Run

### Docker (preferred)
```bash
cd starman-app
docker compose up --build
# :4000 serves the design prototype | dev login (functional app): andrew@aspire.ca / starman123
```
On boot the container runs `prisma migrate deploy` + seed. Migrations live in
`starman-app/server/prisma/migrations/`; never reintroduce `db push`.

### Local (no Docker)
```bash
cd starman-app/server
cp .env.example .env          # set DATABASE_URL + a strong JWT_SECRET
npm install
npm run setup                 # prisma migrate deploy + seed
PORT=4001 npm run dev         # http://localhost:4001 (keeps :4000 free for compose)
```

### Key npm scripts (from `starman-app/server/`)
| Command | What it does |
|---|---|
| `npm run dev` | `node --watch src/index.js` (auto-restart on save) |
| `npm test` | `node --test` |
| `npm run migrate` | `prisma migrate dev` (create + apply a migration) |
| `npm run migrate:deploy` | `prisma migrate deploy` (no prompts) |
| `npm run seed` | Reload demo org, advisors, leads, connectors |
| `npm run setup` | Deploy migrations + seed |

### Aspire connectors
```bash
cd aspire_connectors
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000/docs
python demo.py                  # end-to-end smoke test (no server needed)
```

---

## Architecture (starman-app/server/)

ES-module Express app (`"type": "module"`). All business data is org-scoped:
every query must filter by `req.user.orgId` — never omit this. Single firm
(seeded once); `/register` joins new users as ADVISOR — there is no "new firm"
signup. Demo credentials must never be displayed in the UI.

```
server/src/
  index.js          Express app: middleware, routes, serves web/, error handler
  env.js            Env vars validated at startup; import { env } from "./env.js"
  db.js             Single PrismaClient instance + writeAudit() helper
  auth.js           JWT (HS256 pinned) sign/verify, authRequired, roleRequired()
  services/llm.js   Provider-flexible model adapter (OpenAI-compatible endpoints)
  routes/           auth, leads, intakes, clients, households, tasks, documents,
                    insurance, dashboard, notifications, connectors, apikeys,
                    v1 (public x-api-key API), ai
web/
  index.html · api.js (fetch wrapper) · app.js (single-page view router)
```

**Route pattern** (copy `routes/leads.js` for new modules):
1. `router.use(authRequired)` at the top — all routes require JWT.
2. Define a Zod schema for the request body.
3. Every query includes `orgId: req.user.orgId` (+ validate any `advisorId`).
4. Call `writeAudit(...)` after any mutating operation.
5. Forward errors with `next(e)` — the central handler turns ZodErrors into 400s.
Then mount in `src/index.js`, add `api.<module>()` in `web/api.js`, add a view
in `web/app.js`.

**Roles:** `OWNER > ADVISOR > ASSISTANT > COMPLIANCE`. Use
`roleRequired("OWNER")` as a second middleware for owner-only endpoints.

**Public API** (`/api/v1/`): authenticated via `x-api-key` header, not JWT. Keys
are shown once, stored only as SHA-256 hash + display prefix. Scopes:
`leads:read`, `leads:write`, `intakes:write`.

**AI Support** (`/api/ai/`): provider-flexible, defaults to free simulated mode.
To enable a real model, set `AI_PROVIDER`, `AI_BASE_URL`, `AI_KEY`, `AI_MODEL`.
No API key ever reaches the browser. See `docs/ARCHITECTURE.md` §8.

---

## Security invariants (do not violate)

- Every record is org-scoped; never query without `orgId`.
- Passwords: bcrypt. Sessions: JWT HS256 (12h default, configurable).
- Write an `AuditLog` row on every create/update/login/convert/connector/AI action.
- In production, `JWT_SECRET` must be a strong random value (app refuses to start otherwise).
- Deploy Postgres in a Canadian region for PIPEDA compliance (target: Azure Canada Central).
- **Canada Life and Quadrus connectors are intentionally `LOCKED` in code** — no
  screen scraping, no credential storage. The disabled flag is a code constant,
  not an env toggle. Do not "fix" this.
- No real client data until the pilot gates in
  `docs/compliance/Starman-Audit-Response-2026-07-14.md` pass. Current seed/demo data is
  synthetic (uses `example.ca` domains and `555` phone numbers).
- Schema changes go through `npx prisma migrate dev` — never `db push`.
  Migrations are the source of truth.

---

## Prototype changelog convention

Every functional or content change to `design/Starman.html` must be logged as
part of the work — not as a follow-up. Per `docs/Starman-Version-History.md`:
1. Bump `<meta name="version">` in `design/Starman.html`.
2. Update the login footer version/date string (`.lfoot`) to match.
3. Add a dated row to the Version Log and update its "Last updated" date.
4. Never rename the file or create a versioned copy.

`docs/ARCHITECTURE.md` is a living document — update it whenever architecture,
features, prompts, or invariants change.
