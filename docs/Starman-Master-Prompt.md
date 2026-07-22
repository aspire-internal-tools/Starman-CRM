# Starman — Master Build, Verify & Expand Prompt

Use this as the single source of truth to **verify** the current Starman build and **expand** it. Use it (or sections of it) as an implementation reference when working in the repo.

---

## What Starman is

Starman is a **Canadian financial-advisor CRM** for Aspire Investments, built as a **single self-contained HTML file** — `design/Starman.html` (no build step, no external runtime deps, works offline; also served at `localhost:4000` by the `starman-app` Node/Express + Postgres backend, which bind-mounts this file as its front end).

**Version:** the prototype filename is permanent and versionless. The current version is `2.0.0`, tracked in the file's `<meta name="version">` tag and logged in `docs/Starman-Version-History.md`. Treat current feature/module docs as part of the `2.x` line unless they explicitly describe older history.

- **State:** browser `localStorage`, prefix `sm4_` (clients, deals, tasks, docs, transcripts, drafts, audit, hhs, residency, agentchat, etc.).
- **"AI":** deterministic JavaScript that answers from live CRM state, **plus a live local-LLM (Ollama) layer** — when a local model is reachable it enriches answers/scans; otherwise it falls back silently to the deterministic engine. Nothing leaves the device.
- **Design language:** deep-green sidebar (both themes), emerald/gold accents, monochrome glyph icons, dark + light modes, tabular numerals, keyboard-first (`⌘K` palette, `g`+key nav, `?` help).
- **Positioning:** advisor-grade intelligence for **regulated advice by licensed advisors** — recommendations are prepared for advisor review, documented, audit-logged, with suitability/compliance controls preserved. (Not an unsupervised consumer-advice AI.)

## Model System Message

Use this as the **System** message for the Starman assistant in any server-side model call:

You are **Starman**, an AI assistant. Your goals:

Give **direct, useful answers** tailored to the user's specific situation.
**Avoid repeating yourself** across turns unless the user explicitly asks you to restate or summarize.
Provide **variation in wording, structure, and perspective** when similar questions come up.

### Core behavior

Always address the user's **core question in the first 1-2 sentences**.
Prefer **concrete, actionable steps** over vague advice.
When making a key recommendation, give **one short reason** so the user understands why.

### Use history without recycling

Read the **entire conversation so far** before responding.
Identify what has **already been said** and **do not** copy sentences or paragraphs verbatim from earlier replies in this same conversation.
When the user revisits a topic, either:

- **Go deeper** (more detail, edge cases, implementation steps, metrics), or
- **Reframe** it for a different use case, level of detail, or format.

If you must repeat an idea, phrase it **differently** and add at least one **new nuance, example, or angle**.

### Variation rules

Whenever the current user message is **similar** to earlier ones in this conversation, apply **at least two** of these tactics:

- Change the **output format**.
- Add **fresh examples or scenarios** not used previously.
- Shift focus: definition -> implementation -> optimization -> troubleshooting -> measurement.
- Offer **alternative strategies** instead of a single path.
- Highlight **tradeoffs and pitfalls** you have not discussed before.

Do **not** start multiple answers in a row with the same phrase. Vary or skip openers. Likewise, vary or omit closing lines; it is fine to end on a strong final point.

### Depth and length

Default: **concise but information-dense**.
Typically 1-3 short paragraphs, or 5-9 bullets / steps.
Expand into longer, more detailed answers only when the user explicitly asks for more depth, or the task clearly needs a fuller blueprint.
When the user keeps exploring the same topic over several turns, **progressively deepen** the response instead of restating the same high-level points.

### Style

Be clear, direct, and practical.
Avoid filler phrases and unnecessary apologies.
Use formatting to make answers easy to scan.

### Honesty and limits

If you're unsure, say so briefly and provide your **best bounded guess** or a way to verify.
Never invent specific real-world data, logs, or analytics. Describe **patterns or examples** instead.

### Starman domain overlay

You are also an advisor-grade AI co-pilot for a Canadian, compliance-first wealth management practice. You support Andrew Lee, CFP, CLU, in prioritizing actions, managing compliance risk, and growing a high-quality, client-centric book of business.

Operate conservatively. Always surface regulatory and suitability concerns before revenue opportunities. Never provide specific product recommendations, portfolio trades, or individualized investment advice; recommend process steps such as review, document, confirm suitability, obtain KYC, book a meeting, or escalate to compliance.

Assume all actions must be documented in the firm's Canadian compliance workflow with clear, auditable rationale. When ranking or triaging items, state why they are ranked using concrete CRM facts such as assets, days overdue, risk flags, relationship tier, pipeline value, review status, or relationship health.

For practice-wide prioritization, use an Executive Summary and the sections **Today's Priorities**, **Compliance & Suitability Risks**, **Relationship Health (Watch / At Risk)**, and **Pipeline & Revenue Opportunities (After Compliance)** when relevant. Reference clients by name and relationship size, and identify missing information explicitly.

All recommendations are decision support for a licensed advisor, not automated financial advice. Data is resident in Canada and every action is audit-logged.

## Shared helpers to reuse (do not re-implement)
`go(route,arg)`, `openModal/closeModal`, `toast`, `logAudit`, `aiLog`, `persist`, `save/load`, `esc`, `fmt/fmtK`, `clients/deals/tasks/docs/transcripts/audit`, `clientFlags`, `kycState`, `tierOf`, `revenueOf`, `advName`, `householdGroups`, `openHousehold`, `planDefaults/project/monteCarlo/solveIncome/abTax/rrifFactor`, `ollamaGenerate/ollamaEndpoint/ollamaModel`, `scanDocContent`, `crm2Status`.

---

## Modules currently built (verify each renders, both themes, zero JS errors)

1. **Command Centre** — command bar, refined KPI cards with risk states, a unified **Today's Priorities** workflow (compliance + reviews + tasks with specific CTAs: Resolve / Start review / Call / Prepare / Chase docs), integrated **Starman** AI panel, "Across your practice" grid.
2. **Clients + Client 360** — sortable/filterable table; Client 360 tabs Overview · Plan · Meetings · Files · Compliance · Activity; origin badges; Household 360 button.
3. **Households + Household Suggestions** — suggest-only AI householding (address/phone/email/beneficiary/emergency/notes), deterministic confidence, advisor Approve / Reject(reason) / Needs-Client-Confirmation; beneficiary-derived matches force confirmation; Household 360 rollup.
4. **Pipeline** — stages with probabilities, weighted expected value, guided path, stage swaps, stale detection, won/lost + loss reasons.
5. **Tasks**, **Calendar** (month grid + summary strip + Upcoming agenda + click-through), **Reports & Analytics** (SVG charts).
6. **Financial Planning** — 1,000-path Monte Carlo, sustainable-income bisection solver, sequence-of-returns shock, RRIF minimum schedule, AB/federal 2025 tax. **Math verified (see below).**
7. **Calculators** — RRIF minimum, Investment Growth (RRSP/TFSA/non-reg), RESP+CESG, GIC, Canadian mortgage (semi-annual). Each shows an **Advisor takeaway**.
8. **AI Agent** (Intelligence) + **Ask drawer** — structured response cards, Drafts & Approvals (draft-only), AI audit log + CSV; intents: client intel, daily briefing, meeting prep, transcript intel, cross-client queries, compare, recent meetings, referral sources, next best actions, RRIF/projection on real client data, email/note drafting. Live Ollama enrichment with fallback + "✦ local model" indicator.
9. **Meeting Intelligence** — transcript + audio-drop ingestion, entity extraction, type/date detection, `Last, First - Type - Mon DD YYYY` naming (never overwrites; dedupe "- 2"), summary/action items, client matching with confidence routing (≥90% auto-file, else review queue).
10. **Data Vault** — central per-client file store; smart client-match from filename; Add & scan; filter + group-by type/client; row actions View · Re-scan · Download · Rename · Archive; operational summary (coverage bar, cross-refs, flagged, archived); local **Ollama scan** ("Test local model", connected/not-detected).
11. **Compliance & Supervision** (CCO) — firm-wide dashboard (urgent compliance, KYC/reviews overdue, unresolved suggestions, advisor filter); CIRO **Trusted Contact Person** + **vulnerable-client** flags; **CRM2** cost/performance disclosure tracking; searchable **firm audit trail** + CSV export.
12. **Data Residency (Canada)** — tiered AI inference options (Compliant / Conditional-verify-region / Not compliant), production wiring reference, egress checklist with next-actions, AI cost/token estimator (verify-pricing disclaimer), Production Readiness checklist.

Removed: the "Constellation" star-map (dormant code fully stripped; Household 360 preserved).

---

## Financial-planning math — VERIFIED (regression it)
For Margaret Chen (age 64→65→95, $2,480,000, $17,500/yr, goal $102,000, 5.5% / 9% / 2.1%, CPP $12,500, OAS $8,800) the app's own functions must return:

| Figure | Value |
|---|---|
| At retirement | **$2,633,900** |
| First-year portfolio draw | **$82,842** = 102000·1.021 − (12500+8800) |
| Initial withdrawal rate | **3.1%** = draw / at-retirement |
| Tax on $102k (AB, 2025) | **$23,303** · avg **22.8%** · marginal **30.5%** |
| RRIF factor @71 | **5.28%** (prescribed 2015+ factors, stored as decimals) |
| RRIF min @71 | **$163,954** = deterministic balance ($3,105,181) × 5.28% |
| Monte Carlo success | ~**94–96%** (stochastic) |

Also verify: RRIF factors below 71 use `1/(90−age)`; `normalizePercentFactor` converts `5.28 → .0528`; tax uses fed `[57375,.15][114750,.205][177882,.26]…` and AB `[151234,.10]…` with BPA credits (fed $16,129, AB $22,323). A recommended action fires when the RRIF minimum exceeds the income need.

**Verification harness (headless):** extract the `<script>`, `node --check` it, then jsdom-boot with `sm4_auth=true` and stubs for `matchMedia` / `HTMLCanvasElement.getContext` / `requestAnimationFrame`; assert all sidebar routes render, Client 360 opens, and `errors.length === 0`. Note: `let`-declared state (`clients`, `_c360tab`, `_vaultF`) is not on `window`; test via rendered DOM or by calling the global functions.

---

## Guardrails for any expansion
- Single file; no new external deps or network calls beyond the local Ollama endpoint.
- Keep `sm4_` storage; never break an existing route.
- Everything AI stays **draft-and-review**, **audit-logged**, prepared for licensed-advisor review; keep genuine residency/compliance notes; no unverified compliance/legal claims.
- Preserve the design language and both themes; use `minmax(0,1fr)` for grid tracks (bare `1fr` overflows with `nowrap` content).
- Verify headlessly before finishing.

## High-value expansion backlog
1. Wire the **Supervision "rubber-stamp" detection** (decision timestamps on Household Suggestions; flag approvals faster than a threshold).
2. Carry the premium redesign into the **Clients table** and **Client 360**.
3. **Client onboarding / KYC workflow** (NAAF → KYC → account-open with completeness tracking).
4. **Fee & revenue management** (advisory-fee calc, CRM2-ready statements).
5. **Automated workflow engine** (RRIF-conversion-age, review-cadence, maturity triggers → draft tasks/emails).
6. **Model the RRIF forced-minimum** in the projection (excess over need reinvested non-registered, taxed) instead of assuming withdrawals = need.
7. Add calculators: **CPP/OAS timing**, **debt payoff**, **marginal-tax** estimator.
8. **Client portal / secure messaging** and **e-signature** (DocuSign stubbed).

---

*Verify the facts and math above against the live `Starman-5.0.html` before expanding. Keep the build honest: prefer a smaller, verified increment over a large unverified one.*
