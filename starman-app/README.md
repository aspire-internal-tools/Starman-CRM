# Starman — Aspire CRM (production foundation)

This is the move from the latest single-file design prototype (`../design/Starman.html`) to a
real, multi-tenant web product: **Node + Express API + PostgreSQL (Prisma) + a web client**,
with JWT auth, a public integration API, and a connector framework (Meta Ads, AdvisorStream,
DocuSign, Canada Life, Quadrus).

> Status: **Milestone 1** — full scaffold + Auth, Leads and Intakes wired end-to-end through
> the API with real DB persistence, plus the integration layer (API keys + connectors). The
> larger Starman UI (Client 360, Financial Planning, Compliance, etc.) ports onto this same API
> module-by-module using the proven pattern below.

## Run it (Docker — recommended)

```bash
cd starman-app
docker compose up --build
```

- API + web served at **http://localhost:4000**
- On first boot the server runs migrations + seed automatically.
- Demo login: **andrew@aspire.ca / starman123**

## Run it (local, without Docker)

Requires Node 20+ and a local PostgreSQL.

```bash
cd starman-app/server
cp .env.example .env            # edit DATABASE_URL + set a strong JWT_SECRET
npm install
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev                     # http://localhost:4000
```

## Project layout

```
starman-app/
├─ docker-compose.yml           # postgres + server
├─ infra/                       # Azure Container Apps Bicep foundation (not deployed)
├─ server/                      # Express + Prisma API
│  ├─ prisma/schema.prisma      # full data model (orgs, users, clients, leads, intakes,
│  │                            #   tasks, notes, kyc, insurance, documents, notifications,
│  │                            #   audit, connectors, api keys)
│  ├─ prisma/seed.js            # demo org, advisors, leads, connectors
│  └─ src/
│     ├─ index.js               # app + static web hosting + error handler
│     ├─ env.js, db.js, auth.js # config, Prisma client + audit, JWT/bcrypt + RBAC
│     └─ routes/                # auth, leads, intakes, notifications, connectors, apikeys, v1
└─ web/                         # web client (calls /api with fetch — no data in localStorage)
   ├─ index.html, api.js, app.js
```

Additional README files are available inside `server/`, `server/src/`, `server/src/routes/`,
`server/src/services/`, `server/prisma/`, and `web/` for folder-specific guidance.

## API surface

Internal (JWT, `Authorization: Bearer <token>`):
`/api/auth` (register/login/me) · `/api/leads` · `/api/intakes` (+ `/:id/convert`) ·
`/api/notifications` · `/api/connectors` · `/api/apikeys`

Public integration API (org API key, `x-api-key` header) — for partner systems, website
forms, Zapier, and provider webhooks:

```
GET  /api/v1/leads
POST /api/v1/leads     {"firstName":"Sarah","source":"website"}
POST /api/v1/intakes   {"type":"lead","name":"Walk-in enquiry"}
```

Create/revoke keys in the app under **API & Webhooks** (Owner role). Keys are shown once and
stored only as a SHA-256 hash; scopes: `leads:read`, `leads:write`, `intakes:write`.

## Connectors

Managed in-app under **Integrations**, with dedicated pages for **Meta Ads** and **AdvisorStream**:

| Provider | In-app | Notes |
|---|---|---|
| Meta Ads Manager / Business Suite | Configure + Sync leads | OAuth/token exchange happens **server-side**; never in the browser. |
| AdvisorStream | Configure + Sync engagement → follow-ups | API / Zapier / Webhook import methods. |
| DocuSign | Configure | Envelope status webhooks land on `/api/v1`. |
| **Canada Life** | **Locked** | Official API access + dealer/compliance approval required. No screen scraping, no password storage. Manual CSV import only. |
| **Quadrus** | **Locked** | Same locked posture as above. |

In this milestone, `test`/`sync` are **simulated server-side** (no external network calls, no
secrets in the browser). Each handler is commented with the exact production call to wire in
(e.g. `GET https://graph.facebook.com/v19.0/{form_id}/leads`).

## AI Support (grounded on your data — no web access)

The **AI Support** page answers only from your **CRM records + uploaded knowledge documents** —
it never browses the web. The browser calls `/api/ai/chat`; the **server** builds a context from
your Postgres data + documents and calls the model. Any API key lives only on the server.

Provider-flexible; ships in free **simulated** mode (no model, no cost, nothing leaves the app).
Turn on a real model via env vars (`server/.env.example`) and restart:

- **Self-hosted (most private — data never leaves your machine):** install Ollama, run
  `ollama pull llama3.1`, then `AI_PROVIDER=local`, `AI_BASE_URL=http://host.docker.internal:11434/v1`, `AI_MODEL=llama3.1`.
- **Azure OpenAI (approval-gated):** `AI_PROVIDER=azure`,
  `AI_BASE_URL=https://<res>.openai.azure.com/openai/deployments/<dep>`, `AI_KEY=...`, `AI_MODEL=<dep>`, `AI_API_VERSION=<approved-version>`, `AI_DEPLOYMENT_TYPE=regional`.
  Verify the actual model, deployment type, quota, region, processing, logging, and terms in Azure. Global Standard and Global Batch are prohibited for client information.
- **Direct OpenAI:** available for local development only and rejected when `NODE_ENV=production` because it is not the approved Starman residency path.

Endpoints: `POST /api/ai/chat` · `GET/POST/DELETE /api/ai/docs` · `GET /api/ai/info`.
Guardrails: answers only from supplied context; no final investment/tax/legal/insurance advice.

## Security & Canadian compliance (build-to targets)

- **Multi-tenant**: every record is scoped to an `orgId`; all queries filter by the caller's org.
- **Auth**: bcrypt password hashes, JWT sessions, role gates (OWNER / ADVISOR / ASSISTANT / COMPLIANCE).
- **Audit**: `AuditLog` row on every create/update/login/convert/connector action.
- **Secrets**: API keys hashed; deployment secrets belong in Azure Key Vault through managed identity, not DB plaintext, source control, images, logs, or the browser.
- **Data residency**: selected target is Azure Container Apps, PostgreSQL Flexible Server, private Blob Storage, Key Vault, and monitoring in Canada Central. Hosting location is one control; Alberta PIPA, applicable PIPEDA obligations, Law 25 where relevant, contracts, consent, retention, and supervision still require approval.
- Pre-launch gates (not code): pen-test/security review, encryption at rest + TLS, backups/DR,
  privacy policy + consent, CIRO/dealer sign-off for Canada Life/Quadrus.

## Porting the rest of the CRM (the repeatable pattern)

For each module (Clients, Households, Tasks, Notes, KYC, Insurance, Documents, Financial Planning):

1. Model already exists (or add) in `schema.prisma` → `npx prisma migrate dev`.
2. Add `server/src/routes/<module>.js` (copy `leads.js`): org-scoped CRUD + Zod validation + audit + notification.
3. Mount in `src/index.js`.
4. Add `api.<module>()` calls in `web/api.js` and a view in `web/app.js` (replace the matching
   localStorage store from the prototype with `fetch`).

The current `../design/Starman.html` prototype remains the design reference for those screens.

## Azure Container Apps Preparation

The selected deployment architecture is documented in:

- `../docs/Starman-Cloud-Provider-Decision.md`
- `../docs/Starman-Azure-Architecture.md`
- `../docs/Starman-Azure-Deployment-Runbook.md`
- `../docs/Starman-Azure-Security-and-Residency-Checklist.md`
- `../docs/Starman-Azure-Cost-and-Capacity-Model.md`
- `infra/README.md`

The Bicep foundation is intentionally non-deploying by default (`deployApplication=false`). It prepares Canada-only region validation, private PostgreSQL/Blob/Key Vault networking, managed identities, ACR, Container Apps, monitoring, and environment parameters. Azure OpenAI is not provisioned because its regional deployment type, model, quota, and approval must be established first.

No Azure resource, production deployment, or real-client-data migration is authorized by these files.
