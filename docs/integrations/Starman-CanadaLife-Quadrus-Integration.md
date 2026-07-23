# Starman: Canada Life and Quadrus Integration — How It Would Work

**Status:** Research and design document. Nothing here is built or connected. Both
providers are **hard-locked in code today** and must stay that way until official
API/feed access and Aspire compliance sign-off are in place.

**Audience:** Jack (product owner), advisors, and any AI/developer who later wires a
real data path.

**Confidence note (read this first):** This document combines two things.
1. **Confirmed from the repo** — the current locked stance and how the code enforces
   it. High confidence.
2. **Industry knowledge about how Canadian carrier/dealer data access works** —
   whether an API exists, what feeds exist, what each vendor offers. These are
   **not verified against Canada Life or Quadrus directly** and can change. Every
   such claim is marked *(verify)*. Do not treat them as settled fact. See
   §8 for exactly what to confirm and with whom.

---

## 0. Sanity check — the short answers

- **Does Canada Life have a public developer API a third-party CRM can call to pull
  client policy/investment data?** Not a public, self-serve one *(verify)*. Great-West
  Lifeco / Canada Life exposes advisor data through **portals and sanctioned data
  feeds via back-office/dealer systems**, not an open REST API you sign up for.
- **Does Quadrus have its own standalone API?** Your instinct is right: **almost
  certainly not** *(verify)*. Quadrus Investment Services is Canada Life's own mutual
  fund dealer (now CIRO-regulated, formerly MFDA). Data flows through the **dealer
  back office** (historically Univeris) and industry plumbing like **Fundserv**, not
  a Quadrus-branded developer API.
- **So how do you actually get the data?** Realistically through one of:
  sanctioned **back-office / dealer position feeds**, **manual advisor-portal
  exports** (CSV/Excel/PDF), or a **third-party aggregator** that already holds feed
  agreements (Equisoft, Ativa, etc.). Ranked options in §3 and §5.
- **Simplest "connection" of all — a portal launch button.** Before any data
  integration, a button in Starman that opens the Canada Life (or Quadrus) advisor
  portal in a new browser tab is the lowest-risk option. It is plain **navigation**:
  the advisor signs in themselves, in their own session. No API, no scraping, no
  stored credentials, and **no client data ever leaves Starman or appears in the
  URL**. See Option F in §3. This is safe to ship today; the only open question is
  branding neutrality (a carrier-labelled button in the chrome), which is a product
  decision, not a compliance blocker.
- **What must never happen:** portal screen-scraping, login automation, or storing
  carrier credentials. That is the whole reason the connectors are locked.

---

## 1. Current state in the code (confirmed)

Both providers are inert by design. This is enforced in two places:

**Python connector layer** (`aspire_connectors/app/connectors/`)
- `canada_life.py` — `enabled = False`, `status = "disable_until_approved"`. Only
  `check_api_access_status()` is callable (no network I/O). Every `sync_*` method
  raises `ConnectorDisabledError` through `base.py::_guard()`.
- `quadrus.py` — `enabled = False`,
  `status = "disabled_until_official_api_confirmed"`. Same guard. The only future
  path named in the docstring is *"an APPROVED export file or sanctioned API."*
- The disabled flag is a **code constant, not an env toggle**, so configuration
  alone cannot switch it on.

**Node server layer** (`starman-app/server/src/routes/connectors.js`)
- `const LOCKED = new Set(["canada_life", "quadrus"]);`
- Config rows can be edited but can **never** be set to `CONNECTED`; they resolve to
  status `LOCKED`. Test/sync endpoints return `locked: true` with the message
  *"Locked — official API access required. Use manual CSV import."*

**Design prototype** (`design/Starman.html`) — provider-neutral by rule. Asset data
is shown by **investment product category** (Segregated Funds, Mutual Funds, etc.),
never under Canada Life or Quadrus branding. Any real feed stays backend-only; the
frontend must not display carrier logos or headings.

**Bottom line:** the plumbing interface exists as stubs; no path is live, and the
lock cannot be flipped by env config.

---

## 2. What "an integration" actually needs to move

Whatever the source, a real integration has to deliver four things into Starman's
Postgres, org-scoped and audited like every other record:

1. **Client / account identity** — who the account belongs to, account type
   (RRSP, TFSA, RRIF, non-registered, segregated fund policy, etc.).
2. **Holdings / positions** — fund or policy, units, market value, as-of date.
3. **Policy / coverage** (insurance side) — policy number, coverage amount,
   status, premium.
4. **Change signal** — an as-of timestamp so Starman knows what is new since the
   last load (feeds these into the same `updatedAt` / `AuditLog` change-detection
   model described in `Starman-Sync-and-SharePoint-Integration.md`).

Every option below is judged on how cleanly it delivers those four, and at what
compliance cost.

---

## 3. Options for Canada Life data (ranked)

Ranked best-to-worst on the combination of *sanctioned*, *maintainable*, and
*low compliance risk*.

### Option A — Dealer / back-office position feed (recommended target) *(verify)*
The advisor's dealer aggregates carrier positions and can provide a **sanctioned
data feed / nightly position file** (often called a DFT — data file transfer). For
Aspire's Canada Life book this is the cleanest official path because the dealer
already has the carrier relationship and the compliance framework.
- **Pros:** official, comprehensive, no carrier credentials in Starman, fits our
  connector pattern as a scheduled import.
- **Cons:** depends on the dealer's feed program and format; contractual to set up.
- **Effort:** medium. **Compliance:** clean (dealer-sanctioned).

### Option B — Third-party aggregator that already holds feed agreements *(verify)*
Vendors in the Canadian advisor space already ingest carrier/dealer feeds and expose
them through their own API/export. Examples to evaluate: **Equisoft/Connect**
(carrier data feeds are a core product), **Ativa/Adaptik**, **VirtGate**,
**D2L/Kronos-lineage tools**. Starman would integrate with the aggregator's API
rather than Canada Life directly.
- **Pros:** they solved the carrier-feed problem already; single integration.
- **Cons:** cost, another data processor to put under a DPA and residency review,
  data leaves our stack.
- **Effort:** medium. **Compliance:** moderate (third-party processor agreement +
  Canadian residency check required).

### Option C — Manual advisor-portal export (the realistic day-one path)
An advisor logs into the Canada Life advisor site and exports **CSV / Excel / PDF**
of accounts and holdings, then uploads it to Starman. This reuses the existing,
already-enabled **CSV connector** (`csv_io.py`) — no new carrier connection at all.
- **Pros:** available now, zero credential storage, fully under advisor control,
  compliance-trivial. This is what the locked-provider message already points to
  (*"manual CSV import only"*).
- **Cons:** manual, periodic, only as fresh as the last export; field-mapping work.
- **Effort:** low. **Compliance:** clean. **Recommend starting here.**

### Option D — Official Canada Life / Great-West API, if and when offered *(verify)*
If Canada Life grants Aspire sanctioned API access (partner/advisor API,
OAuth-based, least-privilege), Starman consumes it server-side with secrets in a
vault. This is what `canada_life.py`'s `sync_approved_*` methods are stubbed for.
- **Pros:** real-time-ish, official, cleanest long-term.
- **Cons:** may not exist as a self-serve product; likely requires a partner
  agreement and volume/eligibility that a single firm may not clear.
- **Effort:** high (mostly relationship/legal). **Compliance:** clean once approved.

### Option E — Screen scraping / portal automation — **PROHIBITED**
Automating the advisor portal login and scraping pages. **Never.** It breaks terms
of service, stores/handles carrier credentials, and is the exact behaviour the lock
exists to prevent. Not an option, listed only to name it as out of bounds.

### Option F — Portal launch button (deep link, zero-integration)
A button in the Starman UI that opens the Canada Life advisor portal (and the same
for the Quadrus/RepNet login) in a **new browser tab**. This is not a data
integration at all — it is a convenience link so an advisor can jump to the carrier
site without leaving Starman.
- **Why it is safe:** it is plain navigation. Starman makes no carrier connection,
  stores no credentials, pulls no data, and puts **no client data in the URL**. The
  advisor authenticates in their own session on the carrier's own site. None of the
  locked-connector rules are touched, because nothing is connected.
- **Implementation:** a normal link opened with `target="_blank"` and
  `rel="noopener noreferrer"`. The destination is a **configurable constant**
  (public advisor sign-in landing page), never a hardcoded deep link with client or
  account identifiers in it. Confirm the exact portal URLs with Canada Life / the
  Quadrus dealer *(verify)* rather than guessing a deep path.
- **The one product decision:** the prototype is otherwise **provider-neutral** (no
  Canada Life or Quadrus logos/branding in the frontend, per the asset-display rule).
  A button labelled with a carrier name is carrier branding in the chrome. That is a
  deliberate product choice to make, not a compliance issue. Options to keep it
  tasteful: a single neutral **"Portals"** launcher menu that lists the carrier
  sign-in links inside it, rather than carrier logos sitting in the top bar.
- **Pros:** ships today, zero risk, real day-to-day convenience.
- **Cons:** no data flows (it is a shortcut, not sync); adds carrier naming to the
  UI; URLs must be confirmed and kept current.
- **Effort:** trivial. **Compliance:** clean (no connection, no data).

**Recommended sequence:** F now (launch button, if the branding call is made) and
C now (manual CSV) → A or B when a feed is justified → D only if Canada Life offers
sanctioned API access. Never E.

---

## 4. Insurance vs. investments (they travel different rails)

Worth separating, because "Canada Life" spans both:
- **Investments** (mutual funds, seg funds, registered/non-registered) — flow through
  the **dealer / Fundserv / back-office** rail. Option A/B/C reach these.
- **Insurance policies** (life, health, group) — carrier-side. Advisor-portal export
  (Option C) or a sanctioned carrier feed (Option D) is the realistic path;
  industry quote/illustration rails like **CANNEX** cover quoting, not in-force
  policy sync *(verify)*.

Starman's schema should model these as distinct record types feeding the same
client — the frontend already separates the **Assets** view (investment products)
from insurance needs/coverage.

---

## 5. Quadrus — notes and sanity check *(verify)*

- **What Quadrus is:** Quadrus Investment Services Ltd., Canada Life's in-house
  mutual fund dealer (CIRO-regulated, formerly MFDA). It is a **dealer**, not a
  software/API vendor.
- **Standalone public API?** Effectively no. There is no evidence of a
  Quadrus-branded developer API a third party signs up for. Your suspicion holds.
- **Where the data actually lives:** the **dealer back office** (historically
  **Univeris**), which is where advisor account/holdings/KYC data is administered.
  Any sanctioned data path realistically comes from that back-office system, not from
  "Quadrus" as an API.
- **Transaction plumbing:** **Fundserv** is the Canadian network that moves mutual
  fund orders/settlement between dealers and fund companies. It is settlement
  infrastructure, **not** a CRM read API — do not expect to "pull holdings from
  Fundserv."
- **Realistic Quadrus options, in order:**
  1. **Manual export** from the dealer/advisor back office (CSV/Excel) → existing CSV
     connector. Day-one path, same as Canada Life Option C.
  2. **Sanctioned back-office feed** from the dealer (Univeris-based) → scheduled
     import. Equivalent of Canada Life Option A.
  3. **Aggregator** (Equisoft et al.) if it already ingests the Quadrus/Univeris feed.
  4. Portal automation / scraping — **prohibited**, same as everywhere.
- **Code stance to keep:** `quadrus.py` already names the only allowed future path as
  *"an APPROVED export file or sanctioned API."* Keep it locked until the dealer
  confirms a feed.

---

## 6. Recommended path for Starman

0. **Optionally add a portal launch button now** (Option F). Zero integration, zero
   risk, immediate convenience. Only pending decision is whether to put carrier
   naming in the UI (see the branding note in Option F) and confirming the portal
   URLs. Recommended form: a neutral "Portals" launcher listing the carrier sign-in
   links.
1. **Ship manual CSV import first** (Option C for both providers). It is available
   now, needs no carrier connection, stores no credentials, and the locked-provider
   message already directs users to it. Build a clean field-mapping importer on top
   of the existing `csv_io.py` connector.
2. **Pursue a sanctioned dealer/back-office feed** (Option A) once volume justifies
   the setup, or **evaluate an aggregator** (Option B) if it is cheaper than building.
3. **Only enable a direct carrier API** (Option D) if Canada Life offers sanctioned
   access under a partner agreement, with secrets in Azure Key Vault and Canadian
   data residency.
4. **Keep the connectors LOCKED** in code until step 2 or 3 is contractually real and
   compliance-approved. Flipping `enabled` is a deliberate, reviewed code change, not
   a config switch.

---

## 7. Compliance guardrails (non-negotiable)

- **No screen scraping, no login automation, no stored carrier credentials.** Ever.
- **No real client data** until the pilot gates in
  `docs/compliance/Starman-Audit-Response-2026-07-14.md` pass. Synthetic data only until then.
- **Canadian data residency** (PIPEDA): any imported records live in the
  Canadian-region Postgres, per `Starman-Canada-Data-Residency-Guide.md`.
- **Secrets server-side only**, in a vault keyed by connector. Never in the DB
  plaintext, never in the browser.
- **Frontend stays provider-neutral.** Asset data shows by product category, not
  under Canada Life or Quadrus branding.
- **Audit every load** — `AuditLog` row per import run (records processed, source,
  as-of date, failures).
- **Third-party processors** (any aggregator) need a DPA and a residency review
  before any real data flows.

---

## 8. Open questions to confirm directly (do not skip)

Because §0–§5 rely on industry knowledge marked *(verify)*, confirm these with the
actual providers before committing to a design or quoting a timeline:

**Ask Aspire's Canada Life advisor relations / dealer:**
1. Is there a sanctioned **data feed / DFT** for advisor account and policy
   positions? What format, cadence, and contract?
2. Does Canada Life offer any **partner/advisor API** access, and what are the
   eligibility and terms?
3. What does the **advisor portal export** actually produce (formats, fields,
   granularity)? — this sizes Option C immediately.

**Ask the Quadrus dealer / back office:**
4. What is the current **back-office system** (Univeris or successor) and does it
   provide a **sanctioned export or feed** to third-party CRMs?
5. Any dealer policy on third-party integrations and data handling we must meet?

**Evaluate aggregators (if pursuing Option B):**
6. Do **Equisoft/Connect**, **Ativa/Adaptik**, or similar already hold Canada Life
   and Quadrus/Univeris feed agreements, and can they expose them by API with
   Canadian residency and a DPA?

Log the answers back into this document and update the *(verify)* markers to
*confirmed* or *corrected* as they are settled.

---

## 9. Where this maps in the codebase

- **Locked connector stubs:** `aspire_connectors/app/connectors/canada_life.py`,
  `quadrus.py`, guarded by `base.py::_guard()`.
- **Server lock enforcement:** `starman-app/server/src/routes/connectors.js`
  (`LOCKED` set).
- **Enabled path to build on first:** `aspire_connectors/app/connectors/csv_io.py`
  (manual CSV import — Option C).
- **Change-detection / scheduled-import model to reuse:**
  `docs/integrations/Starman-Sync-and-SharePoint-Integration.md` (§4 audit log + `updatedAt`).
- **Residency rules:** `docs/compliance/Starman-Canada-Data-Residency-Guide.md`.
- **Frontend (provider-neutral) asset view:** `design/Starman.html` — Assets by
  Segment and the client Assets tab.

---

## Summary

- Canada Life has **no open self-serve API** for third-party CRMs *(verify)*; data
  comes through **sanctioned dealer/back-office feeds, advisor-portal exports, or
  aggregators**.
- Quadrus has **no standalone API** *(verify)*; it is a dealer, and its data lives in
  the **back office (Univeris)** with **Fundserv** as transaction plumbing, not a read
  API.
- **Start with manual CSV import** (already enabled, compliance-clean), pursue a
  **sanctioned feed or aggregator** next, and only consider a **direct carrier API**
  if officially offered.
- **Keep both connectors LOCKED** in code, keep the frontend provider-neutral, and
  **confirm every *(verify)* claim** with Canada Life and the Quadrus dealer before
  building.
