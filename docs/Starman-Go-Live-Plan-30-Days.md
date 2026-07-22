# Starman — 30-Day Go-Live Plan

**Goal:** take Starman from prototype to a **live, Canadian-resident pilot** used by Aspire's ~11 advisors within ~30 days — with the production repo, data prep, documentation, compliance drafts, QA, and stakeholder materials moving in parallel.

> **Honest framing:** "Live in a month" is realistic for a **controlled internal pilot** — your own firm's advisors, real data, Canadian-hosted, with a human-in-the-loop AI. It is **not** enough time for a full public multi-tenant SaaS with SOC 2 certification and deep carrier integrations. Treat this as Phase 1 (pilot); the SaaS build comes after. This plan is aggressive but achievable because two big pieces already exist (below). Not legal advice — compliance items need your CCO/counsel.

---

## What you already have (assets to build on)

1. **`Starman-5.0.html`** — the complete, tested feature spec: Clients, Households + Household 360, Pipeline, Tasks, Compliance flags, Financial Planning, Reports, **Advisor Agent** (structured drafts + audit), **Meeting Intelligence** (transcript + audio ingestion), **Data Residency** module + AI cost estimator. This is your blueprint and UAT reference.
2. **`starman-app/`** — a real backend already scaffolded: **Node/Express + Prisma + PostgreSQL**, JWT auth, routes (`ai`, `auth`, `connectors`, `intakes`, `leads`, `notifications`, `v1`), an **AI provider abstraction** (`AI_PROVIDER` = simulated → swappable), a DB-backed web client, and **Docker Compose**. This is ~40% of the production backend done.
3. **`aspire_connectors/`** — Python connector app + sample data (CSV import path).
4. **Design docs** — `Starman-Household-Suggestions-Design.md`, `Starman-Canada-Data-Residency-Guide.md`.

The work is: **port 5.0's features into `starman-app`, wire model inference through an approved Canadian-resident path, harden security/compliance, deploy to Azure Container Apps in Canada Central, complete synthetic-data acceptance and recovery testing, then seek authorization for a controlled pilot.**

---

## MVP scope — ship vs. defer

**Ship in the pilot (Starman 5.x pilot scope):**
- Auth + roles (advisor / admin) on real accounts
- Clients, Households + Household 360, Pipeline, Tasks, Compliance flags — DB-backed CRUD
- Document vault (Azure Blob Storage) + **Meeting Intelligence from pasted/text transcripts**
- **Advisor Agent** (client summaries, daily briefing, draft emails/tasks — draft-and-approve) through a Canadian-resident model endpoint
- Full **audit logging** (already designed) + CSV export
- CSV import of the real book
- Canadian data residency end-to-end

**Defer to Phase 2 (post-pilot):**
- Audio → approved Canadian-region speech-to-text service — ship text first, add audio after privacy, retention, and regional-processing review
- Household Suggestions auto-engine at scale, beneficiary-derived matching workflow
- Carrier/custodian integrations beyond CSV (Canada Life, Quadrus, Morningstar)
- Advanced reports/analytics, multi-tenant, SOC 2, mobile

Scope discipline is the single biggest driver of hitting 30 days.

---

## Architecture (Canadian-resident)

Primary deployment in **Azure Canada Central**; Canada East recovery remains disabled until approved:
- **Compute:** the existing Dockerized Node/Express app on **Azure Container Apps**, serving the database-backed web client from the same application boundary.
- **Images:** **Azure Container Registry**, with anonymous/admin access disabled and managed-identity pull.
- **Database:** **Azure Database for PostgreSQL Flexible Server** on a private delegated subnet with TLS and point-in-time backup.
- **Files:** private **Azure Blob Storage** containers for documents, transcripts, and exports, with versioning and soft deletion.
- **Model inference:** simulated by default; **Azure OpenAI** only through a verified regional deployment in an approved Canadian region. Global Standard and Global Batch are prohibited for client data.
- **Secrets:** **Azure Key Vault** through managed identity; no keys in browser code, source control, images, logs, or plaintext database fields.
- **Auth:** keep the existing JWT flow until a complete Microsoft Entra ID migration is separately approved and tested.
- **Monitoring/backups:** Azure Monitor, Log Analytics, Application Insights, PostgreSQL backup, Blob versioning, and an evidenced synthetic restore.

This matches the `Starman-Canada-Data-Residency-Guide.md` — pull the production stub from there.

---

## Workstreams

**Product engineering (in the `starman-app` repo):**
- Extend the **Prisma schema** to cover every entity in the 5.0 data model (clients, households, deals, tasks, documents, transcripts, drafts, audit, advisors).
- **Port the 5.0 UI** into `web/` and wire it to the API (`api.js` exists) — replace the prototype's `localStorage` with real endpoints.
- Wire the production model endpoint into `services/llm.js`; port the agent prompts + guardrails from the prototype.
- Add private **Blob Storage upload** and, in Phase 2, approved Canadian-region speech-to-text for audio.
- Maintain **Bicep infrastructure-as-code** for the Canada Central stack; add approved CI/CD and automated tests.
- Security hardening (input validation, rate limits, RBAC, secrets).

**Operations, compliance, and rollout:**
- Prepare the **real book of business as a clean CSV** for import (from your current records).
- Draft the **PIPEDA privacy-disclosure update** and **Québec Law 25 assessment** for the CCO.
- Build the **advisor onboarding guide** + a one-page "what's new."
- Maintain this plan, the **QA/UAT checklist**, and a **go/no-go gate** document.
- Generate **stakeholder/compliance briefing** materials and status updates.
- Act as the **UAT reference** (5.0 prototype) advisors test against.

---

## Week-by-week (4 weeks)

| Week | Focus | Key deliverables | Exit criteria |
|---|---|---|---|
| **0 (Days 1–2)** | Decisions & kickoff | Scope freeze; approve Azure tenant/subscription, Canada Central, owners, budget and synthetic-data pilot; **start CCO/privacy/security review now**; verify all selected services and model options in-region | Scope and ownership signed; non-production Azure access approved; compliance review underway |
| **1** | Foundations | Validate Bicep; deploy approved development foundation to Container Apps + PostgreSQL Flexible Server; private Blob/Key Vault; managed identities; current JWT working | An authenticated development app in Canada with synthetic data only |
| **2** | Port the app | 5.0 UI served from `web/`; core CRUD wired to API (clients, households, pipeline, tasks, compliance, documents); CSV import of real book | An advisor can log in and see/edit the real book end-to-end |
| **3** | Model + residency hardening | Production model endpoint wired into `llm.js`; Advisor Agent + Meeting Intelligence (text) live; full audit logging; egress locked to Canada; ZDR/DPA in place; security pass | Intelligence features work on real data, in Canada, fully logged |
| **4** | Pilot launch | QA/UAT with 1–2 advisors → fixes; data verified; monitoring + backups; CCO sign-off; **soft launch to all 11 advisors**; support runbook | Go/no-go gate passed; advisors using it live |

---

## Parallel compliance & security track (start Day 1)

- **PIPEDA:** update privacy disclosure to name the AI processing use; consent posture for client data.
- **Québec Law 25:** assess applicable requirements and transfer paths; Canadian hosting does not remove the assessment obligation.
- **Vendor terms:** review Microsoft Product Terms, Data Protection Addendum, Azure OpenAI processing/deployment terms, subprocessors, support access, and breach terms.
- **CIRO:** confirm whether automating these functions is a material business change requiring advance notice (CCO call).
- **Security:** encryption at rest/in transit, RBAC, rate limiting, dependency scan, secrets hygiene, audit-trail completeness, in-region backups + restore test.
- **AI governance:** human-in-the-loop on every AI output (already the design), guardrails (no investment/tax/legal advice), reproducible logs.

Compliance approval is the **most likely thing to slip the date** — that's why it starts on Day 1, not Week 4.

---

## Rough cost snapshot (pilot, monthly)

- **Model inference:** estimate usage against the selected provider before pilot launch; keep caching enabled where available.
- **Azure infrastructure:** estimate Container Apps, ACR, PostgreSQL Flexible Server, Blob Storage, Key Vault, Log Analytics/Application Insights, bandwidth, backup, private networking, and optional regional Azure OpenAI with the Azure Pricing Calculator. Record region, currency, date, and low/expected/high usage assumptions; do not rely on an undated fixed estimate.
- **Dev time:** the dominant cost — one focused full-stack developer for the month, or a contractor.

---

## Top risks & mitigations

1. **Compliance lead time** → start Day 1; keep scope inside "human-approves-everything."
2. **Model-in-region availability** → verify Day 1; fallbacks = another Canadian-region provider or self-host.
3. **Scope creep** → the MVP ship/defer list is the contract; audio-STT and integrations are explicitly Phase 2.
4. **Single-developer bandwidth** → protect the timeline; defer aggressively.
5. **Data quality on import** → prep and validate the CSV before Week 2.

---

## First three concrete actions

1. **Validate the Bicep foundation** in `starman-app/infra/`, then review a Canada Central non-production what-if with security and technical owners.
2. **In the Azure portal**, confirm the selected model and regional deployment type are available in the approved Canadian region; do not use a global deployment for client information.
3. **Email your CCO today** to open the compliance review (privacy disclosure, Law 25, CIRO notice question) — this is the critical-path item.

---

*This is a Phase-1 pilot plan. Phase 2 (multi-tenant SaaS, audio STT, carrier integrations, SOC 2) follows once the pilot proves value with real advisors.*
