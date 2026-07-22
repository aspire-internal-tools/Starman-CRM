# Starman CRM — Intrapreneurship MVP

*Last updated: 2026-07-14*

## 1. The problem

Aspire Investments & Insurance runs a multi-advisor book across investments and
insurance. Client records, KYC dates, intake forms, lead follow-ups, and document
chases live across spreadsheets, carrier portals, and inboxes. Off-the-shelf CRMs
are US-hosted (PIPEDA friction), priced per-seat for features the practice doesn't
use, and none understand the Canadian advisor workflow (KYC refresh cycles, CIRO
suitability, seg funds, FHSA/RRSP/TFSA account types, locked carrier data).

**Starman is the in-house answer**: a CRM built inside the practice, by the
practice, shaped exactly to how an Aspire advisor works — with a path to becoming
a product other Canadian practices could license.

## 2. Who it serves

| Role | Primary jobs |
|---|---|
| OWNER (principal) | Firm-wide dashboard, pipeline value, compliance exposure, API keys, connectors |
| ADVISOR | Their clients, leads, tasks, reviews, document chases |
| ASSISTANT | Intake processing, data entry, task execution |
| COMPLIANCE | KYC status, audit trail, locked-note review |

Single firm, multiple advisor accounts. Advisors self-register; the firm itself is
created once (seed). No multi-tenant signup in the MVP — the schema is org-scoped
throughout, so multi-firm licensing later is a configuration change, not a rewrite.

## 3. MVP scope — what's IN (and built ✅)

| Capability | Status |
|---|---|
| Secure login (JWT), advisor self-registration into the firm | ✅ |
| Role-based access (OWNER/ADVISOR/ASSISTANT/COMPLIANCE) | ✅ |
| Clients — CRUD, accounts, notes, KYC updates, org-scoped | ✅ |
| Households — grouping + AUM roll-up | ✅ |
| Leads pipeline — statuses NEW → WON/LOST, priorities, sources | ✅ |
| Intake Centre — every inbound thing lands here; convert to client | ✅ |
| Tasks — due dates, priorities, per-client | ✅ |
| Documents — request/track paperwork through Requested → Signed | ✅ |
| Insurance needs — coverage gap log | ✅ |
| Command Centre dashboard — KPIs + today's priorities, one round trip | ✅ |
| Notifications + full audit log on every mutation | ✅ |
| AI Support — grounded on the firm's own data; provider-flexible (simulated by default, Ollama/Azure-Canada/OpenAI opt-in) | ✅ |
| Public API (`/api/v1`) with hashed, scoped API keys — website forms, Zapier | ✅ |
| Connector framework — Meta Lead Ads, AdvisorStream (simulated sync); Canada Life & Quadrus locked in code | ✅ |
| Security hardening — org-scoping on every query, cross-org advisor validation, rate limiting, helmet, bcrypt, audit trail | ✅ |
| Docker one-command deployment + one-click launcher | ✅ |

## 4. What's OUT of the MVP (deliberately)

- Real carrier integrations (Canada Life/Quadrus) — locked until official API
  access and dealer/compliance approval. No screen scraping, ever.
- File uploads / document storage — the Documents module tracks status; blobs
  need private Azure Blob Storage in an approved Canadian region first.
- Email sending, calendar sync, e-signature — integrate, don't rebuild.
- Financial planning engine — prototyped in the Advisor OS design (Monte Carlo),
  not productionized.
- Billing/multi-firm licensing — schema-ready, intentionally deferred.
- Mobile app — the web client is responsive; native comes after adoption.

## 5. Success criteria

The MVP succeeds when, for 30 consecutive days at Aspire:

1. Every new prospect enters via Intake (zero side-spreadsheets).
2. Every advisor logs in weekly and works their own task list.
3. KYC-overdue count on the dashboard is trusted enough to drive review scheduling.
4. One external lead source (website form or Meta) flows in via the public API
   with no manual re-keying.
5. A compliance spot-check can be answered from the audit log alone.

## 5A. Pilot gates before real client data

The July 10 prototype audit makes this explicit: Starman should not hold real client data until the pilot gates are complete.

Required before real data:

1. Named product owner, technical maintainer, compliance approver, and final decision-maker.
2. Three to five pilot workflows selected with staff-facing acceptance checks.
3. Written decision on the authoritative system of record during the pilot.
4. Privacy, security, dealer, and compliance review completed.
5. Canadian hosting path confirmed for database, files, backups, keys, logs, and approved model processing where required.
6. Backup and restore test completed.
7. Synthetic-data test run completed, defects recorded, and fixes verified.
8. Release record completed with scope, known limits, approver, and rollback plan.

## 6. Architecture (one paragraph)

Node 20 + Express (ES modules) API; PostgreSQL via Prisma; every business row
carries `orgId` and every query filters on it; JWT auth with role gates;
Zod validation; centralized error handling; audit write on every mutation;
vanilla-JS single-page client (no build step); Docker Compose for one-command
runs. AI calls happen server-side only — no key ever reaches the browser.
Deploy target: any Docker host with Postgres in a Canadian region (PIPEDA).

## 7. Roadmap after MVP

1. **Team management screen** — owners promote/deactivate advisors in-app.
2. **The design merge** — bring `design/Starman.html` ("Advisor OS") to life
   on the real API; it is the UX target, currently demo-data only.
3. **File storage** (private Azure Blob Storage in Canada Central) behind the Documents module.
4. **Real Meta Lead Ads OAuth** + webhook ingestion via `/api/v1`.
5. **Meeting intelligence** — transcript → draft notes/tasks (prompt spec exists:
   `starman-app/Starman-Meeting-Intelligence-Prompt.md`).
6. **Licensing pilot** — second firm on a fresh org row; pricing experiment.

See `Starman-Audit-Response-2026-07-14.md` for the full audit incorporation checklist.
