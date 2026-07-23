# Starman CRM — Living Architecture Document

**Status:** Living document — update this file whenever architecture, features, prompts, or invariants change.
**Last updated:** 2026-07-17
**Audience:** Jack (product owner/builder), any advisor-firm stakeholder, and any AI assistant working in this repo (see §12, *AI Collaboration Guide*).

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Goals](#2-goals)
3. [Principles](#3-principles)
4. [Full technology stack](#4-full-technology-stack)
5. [Directory structure](#5-directory-structure)
6. [Data flow & request flow](#6-data-flow--request-flow)
7. [Feature breakdown — how each feature works](#7-feature-breakdown--how-each-feature-works)
8. [Agent designs & prompt strategies](#8-agent-designs--prompt-strategies)
9. [Roadmap](#9-roadmap)
10. [Known issues & risks](#10-known-issues--risks)
11. [Glossary](#11-glossary)
12. [AI collaboration guide](#12-ai-collaboration-guide)

---

## 1. Project overview

**Starman** is the codename for an in-house ("intrapreneurship") CRM built for **Aspire Investments & Insurance**, a CIRO-regulated Canadian investment and insurance advisory practice. It exists because off-the-shelf CRMs are US-hosted (PIPEDA friction), per-seat priced, and don't understand the Canadian advisor workflow — KYC refresh cycles, CIRO suitability, seg funds, FHSA/RRSP/TFSA account types, and locked carrier data.

The project lives at `~/Desktop/Destiny/CRM/` and has **three moving parts**:

| Part | What it is | State |
|---|---|---|
| `starman-app/` | **The product.** Node 20 + Express + Prisma + PostgreSQL API with a vanilla-JS web client (`starman-app/web/`). Database-wired and functional. | Working MVP, hardened 2026-07-14 |
| `design/Starman.html` | **The design prototype** ("Advisor OS") — the visual and UX north star. Single self-contained HTML file, runs on localStorage demo data plus an optional local Ollama layer. *Not* connected to the database. | Active design target (v2.0.0 in metadata; versionless filename — see `docs/Starman-Version-History.md`) |
| `aspire_connectors/` | Python 3 + FastAPI connector-layer prototype (Meta leads, webhooks, CSV, DocuSign simulation, AdvisorStream; Canada Life/Quadrus hard-disabled). | Proof-of-concept |

**Deliberate two-frontend situation:** `docker compose up` in `starman-app/` serves the **Advisor OS design prototype** at `http://localhost:4000/` (bind-mounted over the web root). The **functional, database-wired client** is `starman-app/web/` — serve it by removing the design-file mount from `docker-compose.yml`, or run the server locally (convention: port **4001**) to test real features. Merging the Advisor OS design onto the real API is a roadmap item, not a blocker.

**Deployment posture:** the selected target is **Microsoft Azure Container Apps in Canada Central** (Bicep foundation in `starman-app/infra/`), but **no Azure resources are provisioned** and **real client data is prohibited** until the pilot gates in `docs/compliance/Starman-Audit-Response-2026-07-14.md` are complete.

Dev login (seeded, never shown in UI): `andrew@aspire.ca` / `starman123`.

---

## 2. Goals

### Product goals
1. **One system of record for the practice** — every prospect enters via the Intake Centre; zero side-spreadsheets; every advisor works their own task list in-app.
2. **Compliance you can trust** — the KYC-overdue count on the dashboard is reliable enough to drive review scheduling, and a compliance spot-check can be answered from the audit log alone.
3. **Automated inbound flow** — at least one external lead source (website form or Meta Lead Ads) flows in through the public API with no manual re-keying.
4. **Advisor-grade AI decision support** — grounded strictly on the firm's own data, prepared *for advisor review*, never autonomous financial advice.
5. **A path to licensing** — the schema is org-scoped throughout, so onboarding a second firm later is a configuration change (new `Org` row), not a rewrite.

### MVP success criteria (from `docs/MVP.md`)
The MVP succeeds when, for **30 consecutive days at Aspire**: all intake flows through the app, advisors log in weekly, the KYC dashboard is trusted, one external lead source is live via API, and audit spot-checks pass.

### Non-goals (deliberately out of the MVP)
- Real carrier integrations (Canada Life/Quadrus) before official API access and dealer/compliance approval. **No screen scraping, ever.**
- File/blob storage before private Canadian-region Azure Blob Storage exists.
- Email sending, calendar sync, e-signature (integrate later, don't rebuild).
- Productionized financial planning engine (exists in the design prototype only).
- Billing / multi-firm signup. Mobile app.

---

## 3. Principles

1. **Org-scoping is law.** Every business row carries `orgId`; every query filters on it. No exceptions, ever — this is the multi-tenant/licensing foundation and the PIPEDA boundary.
2. **Compliance is a feature, not a checkbox.** Locked carriers are locked *in code*, not config. Audit logging happens on every mutation. Data residency was documented before go-live, not after.
3. **No real client data until the pilot gates pass.** Synthetic/demo data only until the checklist in `compliance/Starman-Audit-Response-2026-07-14.md` is signed off.
4. **Secrets never touch the browser or the database.** API keys stored as SHA-256 hash + display prefix only; AI keys live server-side; OAuth tokens belong in a secrets manager (Azure Key Vault) keyed by `connectorId`.
5. **AI is grounded and subordinate.** The assistant answers only from the firm's own CRM data and uploaded documents, surfaces compliance concerns before revenue opportunities, and never gives final investment/tax/legal/insurance advice.
6. **Prototype in one file, port deliberately.** The prototype HTML (`design/Starman.html`) explores the vision fast; `starman-app/` ships only what earned its place. Keep exactly one active prototype file, permanently named — versions live in its metadata and the version log, never in filenames.
7. **Boring, consistent server patterns.** Every route module follows the same shape (`leads.js` is canonical): `authRequired` → Zod schema → org-scoped Prisma → `writeAudit` → `next(e)`. New modules copy the pattern rather than inventing one.
8. **Snapshot before surgery.** Every risky change gets a dated backup first (see the `backups/` convention and the dated recovery folders on the Desktop).
9. **Integrate, don't rebuild** — email, calendars, e-signature come from providers.
10. **Canadian residency by default.** Postgres, blobs, keys, logs, and any approved model processing must have a Canadian hosting path.

---

## 4. Full technology stack

### Application (`starman-app/`)

| Layer | Technology | Notes |
|---|---|---|
| Runtime | **Node 20**, ES modules (`"type": "module"`) | `node --watch` in dev |
| Web framework | **Express** | Mounted route groups, centralized error handler |
| ORM / DB | **Prisma → PostgreSQL 16** | `schema.prisma` + versioned migrations in `prisma/migrations/`; Docker boot runs `prisma migrate deploy`, schema changes via `prisma migrate dev` |
| Validation | **Zod** | Per-route request schemas; ZodError → HTTP 400 centrally |
| Auth | **jsonwebtoken (JWT, HS256 pinned, 12 h default)** + **bcryptjs** | `authRequired` / `roleRequired()` middleware |
| Security middleware | **helmet** (CSP off for the static client), **cors** (origin allow-list), **express-rate-limit** (auth + public API), 1 MB JSON body cap | Added in the 2026-07-14 hardening pass |
| Observability | Request-context middleware with `correlationId`; structured JSON error logs; `/api/health` and `/api/ready` (DB ping) | `src/runtime.js` |
| AI adapter | `src/services/llm.js` — any **OpenAI-compatible Chat Completions** endpoint: OpenAI, Azure OpenAI (Canada), or self-hosted **Ollama** | Simulated (no-model) mode is the default |
| Frontend | **Vanilla JS single-page client, no build step** — `web/index.html` shell, `web/api.js` fetch wrapper, `web/app.js` view router | All server calls go through `api.js` |
| Packaging | **Docker Compose** (`postgres:16-alpine` + server image), one-click `launch_starman.command` | DB in named volume `starman_pgdata` |
| Tests | `server/test/runtime.test.js` (Node test runner) | Runtime helpers only — see Known Issues |

### Design prototype (`design/Starman.html`)
Single self-contained HTML file (no build step, works offline). State in browser `localStorage` (prefix `sm4_`). Deterministic JavaScript "AI" answering from live CRM state, plus an optional **local Ollama** enrichment layer with silent fallback. Deep-green sidebar, emerald/gold accents, dark + light themes, keyboard-first (`⌘K` palette, `g`+key nav). Includes modules not yet in the product: Financial Planning (1,000-path Monte Carlo, verified math), Calculators, Meeting Intelligence, Data Vault, Compliance & Supervision (CCO), Data Residency.

### Connector prototype (`aspire_connectors/`)
**Python 3 + FastAPI + Pydantic**; JSON flat-file storage under `data/` (swap `app/storage.py` for a real DB later). Write endpoints need `X-API-Key` (env `ASPIRE_API_KEY`); webhooks accept optional HMAC `X-Signature` (SHA-256, env `ASPIRE_WEBHOOK_SECRET`). `demo.py` is a 21-assertion end-to-end smoke test that needs no server.

### Infrastructure (`starman-app/infra/` — prepared, not deployed)
**Bicep**, subscription scope, Canada Central: Azure Container Apps + Container Registry, PostgreSQL Flexible Server, private Blob Storage, Key Vault, managed identities, monitoring/alerts. Parameter files for dev/test/prod. Application deployment defaults **off**; Canada East replication and Azure OpenAI stay disabled until separately approved.

---

## 5. Directory structure

```
~/Desktop/Destiny/CRM/
├── README.md                     Start here — product summary, quick start, conventions
├── launch_starman.command        One-click macOS launcher (Docker up + open :4000)
├── design/
│   ├── Starman.html              THE active design prototype (versionless name; v2.0.0 in metadata)
│   ├── assets/                   Approved Aspire logo copies used by the prototype
│   └── screenshots/              Dated design/QA screenshots
├── docs/                         Business, compliance & planning docs
│   ├── PROJECT-MAP.md            Folder responsibilities + source-of-truth table
│   ├── MVP.md                    Problem, scope, success criteria, pilot gates
│   ├── JOURNEY.md                Build history + lessons
│   ├── INVENTORY.md              File inventory
│   ├── ARCHITECTURE.md           ← this document
│   ├── Starman-Version-History.md        Version standard + internal version log (2.x line)
│   ├── Starman-Master-Prompt.md          Assistant system message + module spec
│   ├── Starman-Go-Live-Plan-30-Days.md   30-day go-live plan
│   ├── Aspire-Brand-Standard.md
│   ├── azure/                    Cloud decision, architecture, runbook, cost, security/residency checklist
│   ├── compliance/               Audit response (pilot gates) + Canada data-residency guide
│   ├── integrations/             Canada Life/Quadrus + Sync/SharePoint integration designs
│   ├── funding/                  Funding package + SR&ED and funding
│   ├── design-notes/             Household suggestions design
│   └── audits/                   Dated audit artifacts
├── branding/                     Source Aspire brand kit (not daily UI assets)
├── aspire_connectors/            FastAPI connector prototype
│   ├── app/
│   │   ├── main.py               FastAPI app — every connector as an endpoint + webhook hub
│   │   ├── config.py / security.py / storage.py / models.py
│   │   └── connectors/           base, meta_lead, webhook, csv_io, docusign,
│   │                             advisorstream, canada_life*, quadrus*  (*hard-disabled)
│   ├── sample_data/              Example Meta lead JSON, AdvisorStream CSV
│   └── demo.py                   21-assertion smoke test
└── starman-app/                  THE PRODUCT
    ├── docker-compose.yml        db + server; mounts design/Starman.html over / (see §1)
    ├── Starman-Meeting-Intelligence-Prompt.md   Feature spec (roadmap)
    ├── infra/                    Bicep: main.bicep, modules/, parameters/{dev,test,prod}
    ├── web/                      Functional vanilla-JS client
    │   ├── index.html            Shell
    │   ├── api.js                Fetch wrapper — ALL server calls go through here
    │   └── app.js                View router + all UI logic
    └── server/
        ├── package.json          dev / migrate / migrate:deploy / seed / setup scripts
        ├── prisma/
        │   ├── schema.prisma     The data model (see §6) — org-scoped throughout
        │   └── seed.js           Demo org, users, clients, leads, connectors
        ├── test/runtime.test.js
        └── src/
            ├── index.js          App wiring: middleware, route mounts, static web, errors
            ├── env.js            All env vars validated at startup
            ├── db.js             Single PrismaClient + writeAudit() helper
            ├── auth.js           JWT sign/verify, authRequired, roleRequired()
            ├── rateLimit.js      Auth + public-API limiters
            ├── runtime.js        Request context, health/ready payloads, env validation
            ├── services/llm.js   Provider-flexible model adapter
            └── routes/           One file per module — leads.js is the canonical pattern
                auth.js  leads.js  intakes.js  clients.js  households.js  tasks.js
                documents.js  insurance.js  dashboard.js  notifications.js
                connectors.js  apikeys.js  v1.js  ai.js
```

**Related paths outside the repo:** `~/docker-backups/starman_pgdata.tar.gz` (known-good pg dump), `~/Downloads/starman4-export.json` (4.x-era export), `~/Desktop/Destiny/CRM-AFTER-AZURE-DAMAGE-20260715-105827/` (recovery snapshot — read-only reference), `~/Desktop/Destiny/CRM copy/` (superseded duplicate — **never edit**).

---

## 6. Data flow & request flow

### 6.1 Authenticated request flow (the standard path)

```
Browser (web/app.js view)
   │  api.js — attaches Authorization: Bearer <JWT>
   ▼
Express (server/src/index.js)
   │  createRequestContext()  → correlationId on req
   │  helmet → cors (WEB_ORIGIN allow-list) → express.json({limit:"1mb"})
   ▼
Route module (e.g. routes/leads.js)
   │  1. authRequired            verify HS256 JWT → req.user = {id, orgId, role, name}
   │  2. roleRequired(...)       optional gate (e.g. OWNER-only)
   │  3. Zod schema.parse(body)  invalid → throws ZodError
   │  4. Prisma query            ALWAYS where: { orgId: req.user.orgId }
   │                             (+ cross-org advisorId validation on assignables)
   │  5. writeAudit(...)         AuditLog row on every mutation
   ▼
Response  … or next(e) → centralized handler in index.js:
           ZodError → 400 {error, issues[]} · err.status honored · else 500
           (500s logged as structured JSON with correlationId;
            prod hides internal messages)
```

### 6.2 Public integration API flow (`/api/v1`)

```
Partner system / website form / Zapier
   │  x-api-key: sk_live_...
   ▼
apiLimiter (rate limit) → apiKeyAuth:
   sha256(raw key) → ApiKey lookup (revoked=false) → req.apiOrgId, req.apiScopes
   (lastUsedAt updated fire-and-forget)
   ▼
scope("leads:write") etc. → Zod → Prisma create (orgId = key's org)
   ▼
side effects: Notification row ("New lead (API)") + AuditLog row
```
Scopes: `leads:read`, `leads:write`, `intakes:write`. The full key is shown **once** at creation; only its SHA-256 hash + 8-char prefix are stored.

### 6.3 AI Support flow (`POST /api/ai/chat`)

```
User question (+ up to last 8 history turns)
   ▼
buildContext(orgId, query)           — 5 parallel org-scoped queries:
   clients(200) · leads(100) · intakes(100) · tasks(100) · knowledgeDocs(50)
   keyword-overlap ranking → caps: 25 client lines, 20 leads, 20 intakes,
   20 open tasks, top-4 docs @1,500 chars → one compact CONTEXT string
   ▼
llmConfigured()?
   ├─ yes → messages = [system: GUARDRAILS] + [system: CONTEXT] + history + user
   │        llmChat() → OpenAI-compatible endpoint (openai | azure | local)
   │        temperature 0.2, max_tokens 700
   │        (model call fails → simulatedAnswer + failure note, mode "simulated-fallback")
   └─ no  → simulatedAnswer(): deterministic regex answers for KYC-overdue /
            count-summary questions; otherwise explains simulated mode
   ▼
writeAudit("AI query") → response {answer, mode, grounding counts, disclaimer}
```
The model has **no web access and no tools** — it sees only the CONTEXT string. No AI key ever reaches the browser.

### 6.4 Business data flow (the funnel)

```
Sources: manual entry · public API (/api/v1) · connector sync (simulated)
   │
   ▼
INTAKE CENTRE (Intake row: type, source, payload JSON, status NEW→…→CONVERTED)
   │  POST /api/intakes/:id/convert
   ▼
CLIENT (KYC status/date, risk, AUM, nextReview)
   ├── Account(s)        RRSP/TFSA/FHSA/… balances
   ├── Household         grouping + AUM roll-up
   ├── Note / KycUpdate  compliance trail (notes lockable)
   ├── Document          paperwork chase: Requested→Sent→Viewed→Signed
   ├── Task              follow-ups, due dates
   └── InsuranceNeed     coverage gap log
   
Parallel: LEAD pipeline (NEW → CONTACTED → QUALIFIED → DISCOVERY_BOOKED →
PROPOSAL_SENT → WON/LOST/NURTURE) — leads may also enter via API/connectors.

Every mutation → AuditLog. Inbound API events → Notification.
Dashboard reads aggregate it all in one round trip.
```

### 6.5 Data model summary (`prisma/schema.prisma`)

`Org` is the tenant root; **every** business model carries `orgId` with cascade delete: `User`, `Household`, `Client` (+`Account`), `Lead`, `Intake`, `Task`, `Note`, `KycUpdate`, `InsuranceNeed`, `Document`, `Notification`, `AuditLog`, `Connector` (unique per `(orgId, provider)`), `ApiKey` (hash unique), `KnowledgeDoc`. Roles: `OWNER > ADVISOR > ASSISTANT > COMPLIANCE`. Money fields are `Decimal(14,2)`. Indexed on `orgId` plus the filtered foreign keys.

---

## 7. Feature breakdown — how each feature works

### Auth & registration (`routes/auth.js`, `src/auth.js`)
`POST /register` creates a **new ADVISOR in the single seeded firm** (demo-org) — "new firm" self-signup was deliberately removed (2026-07-14 decision). `POST /login` verifies bcrypt hash and returns an HS256 JWT (`sub`, `orgId`, `role`, `name`; 12 h expiry). `GET /me` echoes the token's user. Rate-limited. Role changes are an owner/database operation for now (team management screen is roadmap item #1).

### Clients & Client 360 (`routes/clients.js` — largest module)
CRUD on `Client` with nested `Account`s, `Note`s (lockable for compliance), and `KycUpdate` history. Tracks `kycStatus` (`CURRENT/DUE_SOON/OVERDUE/IN_PROGRESS`), `kycDate`, `nextReview`, `risk`, `segment`, `aum`. Cross-org `advisorId` validation prevents assigning another firm's advisor.

### Households (`routes/households.js`)
Groups clients; AUM rolls up from member clients. (The suggest-only AI householding with confidence scoring exists in the design prototype and `design-notes/Starman-Household-Suggestions-Design.md` — not yet productionized.)

### Leads pipeline (`routes/leads.js` — **the canonical route pattern**)
CRUD over `Lead` with status pipeline `NEW → CONTACTED → QUALIFIED → DISCOVERY_BOOKED → PROPOSAL_SENT → WON/LOST/NURTURE`, priorities, sources/campaigns, estimated AUM, consent flag, next-follow-up. Copy this file when adding any new module.

### Intake Centre (`routes/intakes.js`)
Every inbound thing — form fill, Meta lead, AdvisorStream engagement, manual note — lands as an `Intake` with a `type`, `source`, and raw `payload` JSON for fields not first-classed yet. `POST /:id/convert` promotes an intake to a `Client`. Statuses: `NEW → NEEDS_REVIEW → IN_PROGRESS → WAITING_ON_CLIENT → CONVERTED/ARCHIVED`.

### Tasks (`routes/tasks.js`)
Org-scoped tasks with due dates, priorities, optional client and advisor links. Status `OPEN → IN_PROGRESS → DONE`. Feeds the dashboard's "today's priorities".

### Documents (`routes/documents.js`)
**Status tracking, not file storage** — a paperwork chase through `Requested → Sent → Viewed → Signed → Declined/Expired`, with delivery channel and due date. Actual blob storage waits on Canadian-region Azure Blob Storage (roadmap #3).

### Insurance needs (`routes/insurance.js`)
Coverage-gap log per client name: coverage types sought, amount, existing coverage, notes. Added 2026-07-14 when the modeled-but-unreachable table got its route and UI.

### Command Centre dashboard (`routes/dashboard.js`)
Firm KPIs (client counts, AUM, KYC-overdue, pipeline value, open tasks, recent intake) computed server-side and returned in **one round trip**.

### Notifications (`routes/notifications.js`)
Org/user-targeted rows with a `route` + `recordId` for click-through. Created by inbound API events and connector syncs. Read/unread toggling.

### Audit log (`db.js → writeAudit`)
An `AuditLog` row (actor, action, entity, entityId, detail) after **every** create/update/login/convert/connector/AI action. This is a compliance feature: spot-checks must be answerable from the log alone.

### Connectors (`routes/connectors.js`)
One `Connector` row per `(org, provider)`: `meta_ads`, `advisorstream`, `docusign`, `csv`, `canada_life`, `quadrus`, … Config saved is **non-secret only** (app id, page id); tokens belong in a secrets manager. `POST /:provider/test` and `/sync` are **simulated** — sync creates demo `Intake` rows and stamps `lastSyncAt`. `canada_life` and `quadrus` are in a hard-coded `LOCKED` set: they can never be set to `CONNECTED`, test returns `locked: true`, sync returns 409. Manual CSV import is the only path for locked carriers.

### API keys (`routes/apikeys.js`)
OWNER-gated create/revoke of org keys for `/api/v1`. Key = shown once; DB stores SHA-256 `hash` (unique) + 8-char `prefix` + `scopes[]` + `lastUsedAt`.

### Public API (`routes/v1.js`)
`GET /leads`, `POST /leads`, `POST /intakes` — authenticated by `x-api-key`, scope-gated, rate-limited. Designed for website forms, Zapier, and partner systems. Writes trigger a Notification and an AuditLog row.

### AI Support (`routes/ai.js` + `services/llm.js`)
Grounded chat over the firm's own data (see §6.3 and §8), plus **knowledge documents**: `GET/POST/DELETE /api/ai/docs` manages `KnowledgeDoc` rows (pasted/extracted text, capped at 100 kB) that get keyword-ranked into the chat context. Doc management is gated to OWNER/ADVISOR/COMPLIANCE. `GET /api/ai/info` reports provider/model/configured.

### Health & readiness (`src/runtime.js`)
`GET /api/health` (process up) and `GET /api/ready` (DB `SELECT 1`) for container orchestration.

### Aspire Connectors service (separate FastAPI prototype)
A universal `WebhookConnector` hub routes typed events to handlers: `LEAD_CREATED → MetaLeadConnector.ingest`, `ARTICLE_VIEWED / EMAIL_OPENED → AdvisorStream`, `DOCUMENT_SIGNED/SENT → DocuSign` (simulation). `CsvConnector` handles manual imports. `CanadaLifeConnector` / `QuadrusConnector` raise `ConnectorDisabledError` on any sync — the disabled flag is a **code constant**, not an env toggle. Write auth via `X-API-Key`; webhook integrity via optional HMAC `X-Signature`.

### Prototype-only modules (design targets, demo data)
Command Centre with unified Today's Priorities · Client 360 tabs · Household Suggestions (suggest-only AI with Approve/Reject/Needs-Client-Confirmation) · Pipeline with weighted expected value · Calendar · Reports (SVG charts) · **Financial Planning** (1,000-path Monte Carlo, sustainable-income bisection solver, RRIF schedule, AB/federal 2025 tax — math verified with regression values in `Starman-Master-Prompt.md`) · Calculators · **AI Agent + Ask drawer** · **Meeting Intelligence** · **Data Vault** · **Compliance & Supervision (CCO)** · **Data Residency** panel.

---

## 8. Agent designs & prompt strategies

Starman has **three AI layers**, deliberately tiered from free/deterministic to model-backed:

### 8.1 Production AI Support agent (`server/src/routes/ai.js`)

**Design: grounded, tool-less, single-shot RAG.** The agent never browses, never calls tools, and never sees data outside the CONTEXT string built server-side from org-scoped queries. Ungrounded answers are treated as a compliance defect, not a quality issue.

**System prompt (GUARDRAILS)** — ten rules joined into one system message; the strategy behind them:

| Rule group | Strategy |
|---|---|
| Answer shape | Address the core question in the first 1–2 sentences; concrete steps over vague advice; one short reason per key recommendation |
| Anti-repetition | Use history without recycling wording; on similar questions vary ≥2 of: format, examples, focus, strategy options, tradeoffs, measurement angle; never open consecutive answers the same way |
| Length discipline | Default 1–3 short paragraphs or 5–9 bullets; expand only on request |
| Grounding | **Never invent data. Answer ONLY from CONTEXT** (the firm's own CRM data + docs); say "I don't have that information" when it isn't there; name the record a fact came from |
| Compliance overlay | Advisor-grade support for a CIRO-regulated firm; surface regulatory/suitability concerns **before** revenue opportunities; operational guidance only — no final investment/tax/legal/insurance advice, no buy/sell recommendations; defer to the compliance officer; assume every action needs auditable documentation |

**Context strategy (`buildContext`)** — cheap-and-deterministic retrieval rather than embeddings: five parallel org-scoped queries with hard caps (200/100/100/100/50 rows), a keyword-overlap `rank()` (query words >3 chars vs record names/doc text), then serialization into typed lines (`- CLIENT … | KYC … | AUM … | next review …`) plus the top 4 knowledge docs truncated to 1,500 chars each. A `FIRM SNAPSHOT` header gives totals. This keeps the prompt bounded and auditable; upgrade path is chunked docs + embeddings.

**Message assembly:** `[system GUARDRAILS] + [system "CONTEXT (the firm's own data — answer only from this): …"] + last 8 history turns + user message`, sent at `temperature 0.2, max_tokens 700`.

**Graceful degradation ladder:** configured model → on HTTP failure, deterministic `simulatedAnswer` + a truncated failure note (`mode: "simulated-fallback"`) → with no model configured, `simulatedAnswer` alone (`mode: "simulated"`): regex intents for KYC/overdue (greps CONTEXT for `KYC OVERDUE` lines) and count/summary questions, otherwise an honest "simulated mode" explanation. The feature is useful at zero cost and zero egress by default.

**Response contract:** `{answer, mode, grounding: counts, disclaimer}` — the UI always shows which mode answered and the standing disclaimer ("Guidance only — verify before client advice or compliance decisions"). Every query is audit-logged (first 80 chars).

**Provider strategy (`services/llm.js`):** one adapter for any OpenAI-compatible endpoint — `openai` (Bearer key), `azure` (api-key header + `api-version` query; the Canada-residency path), `local` (Ollama, base URL only, no key). Configured entirely via `AI_PROVIDER/AI_BASE_URL/AI_KEY/AI_MODEL/AI_API_VERSION` env vars; blank base URL = simulated mode.

### 8.2 The Master system message (`docs/Starman-Master-Prompt.md`)

The fuller, canonical persona for *any* server-side Starman model call (the GUARDRAILS above are its condensed production form). Key additional strategies:

- **Named principal**: supports "Andrew Lee, CFP, CLU" in prioritizing actions, managing compliance risk, and growing a client-centric book.
- **Ranking rubric**: when triaging, justify rankings with concrete CRM facts — assets, days overdue, risk flags, relationship tier, pipeline value, review status.
- **Report format** for practice-wide prioritization: *Executive Summary* → **Today's Priorities** → **Compliance & Suitability Risks** → **Relationship Health (Watch / At Risk)** → **Pipeline & Revenue Opportunities (After Compliance)** — compliance sections deliberately ordered before revenue.
- **Positioning sentence** baked into the prompt: all output is decision support for a licensed advisor, not automated financial advice; data is resident in Canada; every action is audit-logged.

### 8.3 Prototype agent layer (`design/Starman.html`)

A **deterministic-first, LLM-enriched** design: structured intents (client intel, daily briefing, meeting prep, transcript intel, cross-client queries, compare, referral sources, next-best-actions, RRIF/projection on real client data, email/note drafting) are computed in plain JavaScript from localStorage state; when a **local Ollama** endpoint is reachable it enriches the answer (marked "✦ local model"), otherwise it silently falls back. All drafts are **draft-only** with an approvals queue, and there's a dedicated AI audit log with CSV export. Nothing leaves the device — this is the data-residency-safest tier and the model for how production agents should degrade.

### 8.4 Meeting Intelligence agent (spec — `starman-app/Starman-Meeting-Intelligence-Prompt.md`)

Planned ingestion pipeline: watch `/transcripts/incoming` for `.txt/.docx/.vtt` (+pasted text); identify the client (name, email, phone, household members, speaker labels, aliases); classify document type (default *Teams Meeting Transcript*; detect Discovery/KYC/Annual Review/Insurance Review/Investment Review/Follow-Up); extract meeting date; summarize + action items; file under the client as `Last, First - Document Type - Mon DD YYYY` (never overwrite; dedupe with "- 2"). **Confidence routing is the core prompt strategy:** ≥90 % auto-file · 60–89 % suggested match requiring manual review · <60 % (or ambiguous similar names) → `/transcripts/review-needed`. The prompt itself instructs the implementer to inspect existing models/routes/permissions before coding — it's both a feature spec and an AI-collaboration prompt.

### 8.5 Shared prompt-strategy principles

1. **Ground or refuse** — every factual claim traceable to a CRM record or uploaded doc.
2. **Compliance before revenue** — ordering enforced in both the persona and the report format.
3. **Human-in-the-loop by confidence** — auto-act only at high confidence; queue for review otherwise; drafts are never auto-sent.
4. **Degrade gracefully and visibly** — simulated → local model → cloud model, with the active mode labeled in the response.
5. **Audit everything** — AI queries and agent actions write audit rows like any other mutation.
6. **Anti-repetition engineering** — explicit variation rules beat "be helpful" for long advisory conversations.

---

## 9. Roadmap

Ordered per `docs/MVP.md` §7, with current status:

| # | Item | Notes |
|---|---|---|
| 1 | **Team management screen** | Owners promote/deactivate advisors in-app (today: DB operation) |
| 2 | **The design merge** | Wire `design/Starman.html` ("Advisor OS") to the real API — it is the UX target, currently demo-data only. Biggest single lever. |
| 3 | **File storage** | Private Azure Blob Storage (Canada Central) behind the Documents module; unblocks real uploads and the Data Vault concept |
| 4 | **Real Meta Lead Ads OAuth + webhooks** | Replace simulated sync; ingest via `/api/v1`; tokens in Key Vault |
| 5 | **Meeting Intelligence** | Build the §8.4 spec: transcript → client match → filed doc + draft notes/tasks |
| 6 | **Licensing pilot** | Second firm on a fresh `Org` row; pricing experiment |

**Gating everything:** the Azure pilot path — provision the Bicep foundation (`infra/`), pass the security/residency checklist, complete the pilot gates (named owners, system-of-record decision, privacy/dealer/compliance review, backup-restore test, synthetic-data run) **before any real client data**. See `Starman-Go-Live-Plan-30-Days.md` and `compliance/Starman-Audit-Response-2026-07-14.md`.

**Prototype-to-product backlog** (proven in the design prototype, not yet ported): Household Suggestions with confidence routing · Financial Planning engine (Monte Carlo/RRIF/tax — math already regression-verified) · Calculators · Compliance & Supervision (CCO) dashboard with TCP/vulnerable-client flags and CRM2 tracking · Calendar · Reports.

---

## 10. Known issues & risks

### Repo / environment
1. ~~**`~/CLAUDE.md` paths are stale**~~ — **Resolved 2026-07-17**: the home CLAUDE.md now points at `~/Desktop/Destiny/CRM/`, documents the two-frontend setup and migration workflow, and covers Blackbird.
2. **Duplicate trees exist**: `~/Desktop/Destiny/CRM copy/` (superseded — never edit) and `~/Desktop/Destiny/CRM-AFTER-AZURE-DAMAGE-20260715-105827/` (recovery snapshot from the 2026-07-15 incident — read-only reference). Always confirm you're in `~/Desktop/Destiny/CRM/`.
3. **July 15 frontend recovery leftovers**: `web/index-before-recovered-frontend.html` and `web/index-old-20260715-143338.html` sit next to the live `index.html`. Harmless but confusing; candidates for `backups/`.
4. **Broken `docker` symlink (2026-07-16 incident)**: Docker.app was moved from `~/Desktop` to `/Applications`, leaving `/usr/local/bin/docker` pointing at the old path — all `docker` commands and `launch_starman.command` fail until it's relinked (`sudo ln -sf /Applications/Docker.app/Contents/Resources/bin/docker /usr/local/bin/docker`, same for `docker-compose`), or use the full binary path. Separately, a pre-reorg container held a bind mount to `CRM/Starman-5.0.html` (the file moved to `design/` on Jul 14) and could not start; `docker compose up -d` in `starman-app/` recreates it with the correct mounts. The 5.0 HTML itself was never lost — identical copies exist in `design/`, `web/index.html`, `~/Downloads`, and the damage snapshot.

### Product / architecture
5. **Docker serves the prototype, not the product.** `docker-compose.yml` mounts `design/Starman.html` over `/` (intentional, user decision) — easy to mistake the demo for the database-wired app. The functional client is `starman-app/web/` (run locally, convention port 4001).
6. ~~**Docker uses `prisma db push --accept-data-loss`**~~ — **Resolved 2026-07-17**: a baseline migration (`prisma/migrations/20260717000000_init/`) was generated from the schema, the compose entrypoint now runs `prisma migrate deploy`, and the existing dev database was baselined with `prisma migrate resolve --applied` (data preserved). The runtime Docker stage now copies the Prisma CLI + engines from the build stage so `migrate deploy` works on boot. Verified end-to-end: container boot applies/skips migrations correctly, `/api/health`, `/api/ready`, and seeded login all pass. All future schema changes go through `prisma migrate dev`.
7. **Dev secrets in compose**: `JWT_SECRET: dev-only-change-me-in-production` and `postgres/starman/starman` are hardcoded in `docker-compose.yml`. Production must inject strong values (env.js refuses weak prod config, but compose is the dev happy path).
8. **Test coverage is thin**: `server/test/runtime.test.js` covers runtime helpers only; route/business logic has no automated tests. `aspire_connectors/demo.py` (21 assertions) is the strongest suite in the repo.
9. **Connector syncs are simulated** — `meta_ads`/`advisorstream` sync inserts demo intakes and marks the connector CONNECTED; don't mistake `lastSyncAt` for a real integration.
10. **AI retrieval is naive keyword ranking** with hard truncation (4 docs × 1,500 chars) — fine at current scale; will miss relevant content as `KnowledgeDoc` grows. Chunking + embeddings is the upgrade path.
11. **No file/blob storage** — Documents tracks status only; Data Vault exists only in the prototype.
12. **Role administration requires DB access** (no team management UI yet — roadmap #1).
13. **Two frontends drift risk** — features added to `web/` don't appear in the design prototype and vice versa until the design merge (roadmap #2).

### Compliance guardrails (by design — do not "fix")
- Canada Life / Quadrus connectors are **hard-disabled in code** (`LOCKED` set in `routes/connectors.js`; `ConnectorDisabledError` in the Python layer). This is deliberate; only official API access + dealer/compliance approval unlocks them.
- **Real client data is prohibited** until the pilot gates pass. Demo/synthetic data only.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Starman** | Codename for the CRM product; also the name of its AI assistant persona |
| **Aspire** | Aspire Investments & Insurance — the (single) firm the CRM serves; `demo-org` in seed data |
| **Advisor OS** | The Starman design prototype's product concept/skin |
| **2.x / Starman 2.0** | The current product line (version reset 2026-07-17; the old 5.x numbering is historical). `design/Starman.html` is the only active prototype file — its version lives in `<meta name="version">` + `Starman-Version-History.md`, never in the filename |
| **Intake / Intake Centre** | Universal inbound inbox — every prospect/form/connector event lands as an `Intake` before conversion |
| **Convert** | Promote an Intake to a Client (`POST /api/intakes/:id/convert`) |
| **Org-scoping** | The invariant that every business row carries `orgId` and every query filters on it |
| **KYC** | Know Your Client — Canadian regulatory client-information refresh; statuses CURRENT/DUE_SOON/OVERDUE/IN_PROGRESS |
| **CIRO** | Canadian Investment Regulatory Organization — the firm's regulator |
| **PIPEDA** | Canada's federal privacy law — drives the Canadian-residency requirement |
| **CRM2** | Canadian cost/performance disclosure regime (tracked in the prototype's CCO module) |
| **TCP** | Trusted Contact Person (CIRO requirement; prototype compliance module flag) |
| **AUM** | Assets Under Management |
| **RRSP/TFSA/FHSA/RESP/RRIF/LIRA/LIF/Seg fund** | Canadian registered account & insurance-investment types (`Account.type` values) |
| **Locked connector** | Canada Life / Quadrus — disabled in code until official API access + compliance approval; CSV import only |
| **Public API / v1** | `/api/v1` endpoints authenticated by `x-api-key` for partner systems |
| **Scope** | Permission string on an ApiKey: `leads:read`, `leads:write`, `intakes:write` |
| **KnowledgeDoc** | Uploaded/pasted text the AI assistant can ground on (lightweight RAG source) |
| **Simulated mode** | AI Support's default no-model state — deterministic answers from CRM data, zero cost, zero egress |
| **GUARDRAILS** | The joined system-prompt rule set in `routes/ai.js` |
| **Master Prompt** | `docs/Starman-Master-Prompt.md` — canonical assistant persona + module verification spec |
| **Meeting Intelligence** | Planned transcript-ingestion agent (spec exists; the design prototype has a working version) |
| **Data Vault** | The design prototype's per-client file store concept |
| **CCO module** | The prototype's Compliance & Supervision dashboard (Chief Compliance Officer view) |
| **Pilot gates** | The checklist in `compliance/Starman-Audit-Response-2026-07-14.md` that must pass before real client data |
| **writeAudit** | `db.js` helper that inserts an `AuditLog` row; required after every mutation |
| **Command Centre** | The dashboard view (KPIs + today's priorities) |
| **Intrapreneurship** | The venture framing: built inside the practice with a path to licensing outward |

---

## 12. AI collaboration guide

*For any AI assistant (Claude Code or otherwise) working in this repo. Short by design — read it fully.*

### How to orient (before touching anything)
1. Confirm the path: the live tree is `~/Desktop/Destiny/CRM/`. If instructions or memory point at `~/Desktop/CRM/`, that is stale. Never edit `CRM copy/` or the `CRM-AFTER-AZURE-DAMAGE-*` snapshot.
2. Read in this order: `README.md` → this document → `docs/PROJECT-MAP.md` (source-of-truth table) → `docs/MVP.md` (scope + gates). For any AI/prompt work, add `docs/Starman-Master-Prompt.md`.
3. Know which frontend you're in: **function → `starman-app/web/`**; **design/UX → `design/Starman.html`**. Docker's `:4000` shows the *prototype*. Don't "fix" the functional app by editing the prototype or vice versa.

### How to reason about changes
- **Inspect before assuming.** Open `schema.prisma` and the nearest route file before designing anything; the Meeting Intelligence spec models this: enumerate the models, routes, permissions, and audit hooks you'll touch first.
- **Follow the canonical pattern.** New server modules copy `routes/leads.js` exactly: `router.use(authRequired)` → Zod schema → every query `orgId: req.user.orgId` → `writeAudit` after mutations → errors via `next(e)`. Then: mount in `src/index.js`, add the call in `web/api.js`, add the view in `web/app.js`, and migrate schema changes with `npx prisma migrate dev`.
- **Treat the invariants as hard constraints** (§3): org-scoping, audit rows, hashed keys, locked carriers, no secrets in DB/browser, no real client data, one active prototype file. If a request appears to conflict with one (e.g. "connect Canada Life"), stop and surface the conflict — these are compliance decisions, not code preferences.
- **Prefer the smallest change that fits the existing shape.** No new frameworks, no build steps, no parallel prototype files, no speculative abstraction. The stack is deliberately boring.
- **Snapshot before surgery.** Before schema migrations, docker-volume operations, or bulk edits to `Starman.html`, make a dated backup (the repo's history exists because of this habit).

### How to test changes
1. **Server logic:** run locally against the Docker Postgres — `cd starman-app/server && npm run dev` (use `PORT=4001` so the compose stack on :4000 keeps running). Login as `andrew@aspire.ca` / `starman123`, then exercise the route with `curl` using the Bearer token; for `/api/v1`, mint a key and test scope failures too (missing key → 401, wrong scope → 403).
2. **Checks that must pass:** `node --test` in `starman-app/server/` (runtime tests); `/api/health` and `/api/ready` return 200; a `writeAudit` row exists for every mutation you added (query `AuditLog` and confirm); no query you wrote lacks `orgId`.
3. **Frontend:** verify in the browser against real Postgres — create, edit, and list through the UI, not just the API. If you touched shared code, click through Command Centre, Clients, Leads, Intake, and Tasks.
4. **Prototype edits:** open `design/Starman.html` directly (or via :4000), check **both themes**, confirm zero console errors, and — if you touched planning math — re-verify the Margaret Chen regression figures in `Starman-Master-Prompt.md`.
5. **Connectors service:** `python demo.py` in `aspire_connectors/` (21 assertions, no server needed).
6. **Report honestly.** State what you ran and what you didn't. If a test fails, show the output — don't paper over it.

### How to finish
- Update this document when you change architecture, routes, prompts, or invariants (it is *living*).
- Log notable product decisions in `docs/JOURNEY.md`; new business docs follow `Starman-Topic-Name.md` naming.
- Never commit credentials, real client data, or API keys anywhere in this tree.
