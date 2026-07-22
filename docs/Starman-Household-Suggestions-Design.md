# Starman Household Suggestions
### Product Design & Technical Implementation Plan — Starman CRM (Canada)
Starman 5.0 module design · Feature codename: **HHS** · Assumes compliance approval with human-approval + audit-trail design

> Version context: **Starman** is the CRM codename. The current active design prototype is **Starman 5.0** (`design/Starman-5.0.html`, meta version `5.0.0`). This document describes the Household Suggestions module within the 5.x product line; it is not a separate first-release product.

---

## 1 · Product Overview

Starman Household Suggestions continuously scans the information a firm already holds — client records, account files, KYC documents, beneficiary designations, notes, intake forms — and surfaces *possible* household and family relationships between client records that no one has formally linked.

The advisor sees a queue of suggestions, each with the evidence laid out ("same residential address," "listed as beneficiary on account #…," "note from 2024-03 mentions 'wife Lin'"), a confidence score, and three buttons: **Approve**, **Reject**, **Needs Client Confirmation**. The system never links, merges, or edits anything itself. Every suggestion, every piece of evidence, and every human decision is written to an immutable audit trail that compliance can review and export.

**Why it matters for an advisory practice:**

- **Revenue & service**: householding is how firms qualify clients for tiered pricing, consolidated reporting, and household-level planning. Unlinked relatives are missed planning opportunities (spousal RRSPs, RESP coordination, estate planning, fee aggregation).
- **Risk reduction**: undiscovered relationships hide suitability context (a "small" client may belong to a $3M household) and estate landmines (stale beneficiaries, conflicting POAs).
- **Data quality**: duplicate and fragmented family records are the #1 hygiene problem in advisor books, especially after book purchases and dealer migrations.
- **Defensibility**: because the design is suggest-only with full evidence and audit, it demonstrates exactly the human-oversight pattern CSA SN 11-348 and CIRO exam expectations point toward.

---

## 2 · User Roles

| Role | Can | Cannot |
|---|---|---|
| **Advisor** | View suggestions for their own book; open evidence; approve / reject / mark needs-confirmation; add a decision note; record client confirmation outcome; trigger a re-scan of their book | See other advisors' suggestions; edit confidence or evidence; delete suggestions; alter audit entries; act on beneficiary-derived matches without the confirmation step |
| **Associate / Admin** | View suggestions for advisors they support; prepare a recommendation note; mark "ready for advisor review"; upload/correct source documents | Approve or reject (no decision authority); see compliance annotations |
| **Compliance Officer** | View **all** suggestions and decisions firm-wide; filter by risk flag, advisor, status, evidence type; annotate; reopen a decided suggestion; export audit reports; configure sensitivity rules (e.g., force confirmation on all beneficiary-derived matches) | Make advisor-level approve decisions on behalf of an advisor (they reopen and route back instead); edit evidence |
| **System Administrator** | Configure scan scope, schedule, matching thresholds, retention; manage API credentials (server-side vault); enable/disable the feature; manage role assignments | View client documents or suggestion content (admin console is metadata-only); modify or delete audit records (no role can) |

A permission principle applies everywhere: **nobody — human or AI — can modify the audit log, and no role combines "generate suggestion" with "approve suggestion."**

---

## 3 · Advisor Workflow

**Where it lives:** a "Household Suggestions" queue badge in the Starman sidebar (e.g., `✦ Suggestions · 4`), plus a banner card on any Client 360 that has an open suggestion ("The system found a possible household link for this client — Review").

**End-to-end flow:**

1. **Scan (server-side, scheduled or on-demand).** Nightly job + triggered scan when a new document lands or a record changes materially. The browser never talks to the model.
2. **Suggestion appears in the queue**, sorted by confidence then AUM impact. Each row: the two client names, suggested relationship type, confidence chip, evidence-type icons (🏠 address · 👤 beneficiary · 📄 note · 🏦 account), and a sensitive-flag badge where applicable.
3. **Advisor opens the review screen.** Split view: Client A profile summary | Client B profile summary, with the **Evidence Panel** between them listing every matched signal, each linked to its source (document page, account record, note) so the advisor verifies primary sources, not the system summary.
4. **Advisor decides:**
   - **Approve** → a `HouseholdLink` record is created in *proposed-confirmed* state, the constellation/household views update, and the decision + rationale is audited. Approval links records; it never merges them, and never touches KYC or account data.
   - **Reject** → suggestion closes with required reason (picklist + free text: "different person, same name," "outdated address," "client objects," "insufficient evidence"). Rejected pairs are suppressed from future scans unless new evidence types appear.
   - **Needs Client Confirmation** → suggestion moves to *pending-client* state; the advisor gets a follow-up task ("Confirm relationship with M. Chen at next contact"); the link is NOT created until the advisor returns and records the client's answer (confirmed → approve path; denied → reject path; both audited). **Mandatory for any beneficiary-derived or POA/executor-derived match** — the system disables one-click Approve on those.
5. **After approval**, downstream features may *read* the link (household rollups, constellation ties, planning context). Nothing downstream writes back to client records automatically.

---

## 4 · Compliance Review Workflow

**Dashboard (Compliance role only):**
- KPI strip: open suggestions · approved (30d) · rejected (30d) · pending client confirmation · **sensitive matches outstanding** · average evidence count per approval.
- **Filters:** advisor, status, confidence band, relationship type, evidence type, sensitive flag (beneficiary / POA / minor involved / non-client third party), date range.
- **Risk flags surfaced automatically:**
  - Approvals made < 60 seconds after opening (rubber-stamp detection)
  - Approvals on low-confidence suggestions
  - Beneficiary-derived matches approved without recorded client confirmation (should be impossible; surfaced as a control test)
  - High rejection-reason concentration ("insufficient evidence" >X% may mean thresholds are mistuned)
- **Suggestion drill-down:** identical evidence view the advisor saw (point-in-time snapshot, not live data), plus the full decision timeline.
- **Audit trail view:** chronological, immutable, filterable; every view/decision/annotation with actor, role, timestamp, IP/session.
- **Exports:** CSV/PDF audit report by date range or advisor — formatted for CIRO examination requests ("all model-assisted household suggestions and dispositions, Q1").
- **Controls:** compliance can *reopen* a decided suggestion (routes back to the advisor with an annotation) and can tune policy (e.g., "all matches involving minors require compliance sign-off in addition to advisor approval").

---

## 5 · UI Design

**5.1 Household Suggestions dashboard (advisor)** — Queue table: [Pair avatars] Margaret Chen ↔ Robert & Lin Tran · `Possible parent / adult child` · confidence chip `HIGH 87` (emerald/amber/red by band) · evidence icons 🏠📄 · `⚠ Beneficiary-derived` badge where applicable · status pill · "Review →". Header has scope toggle (My book / All my households), sort, and a "Re-scan my book" button (rate-limited, audited).

**5.2 Suggestion review screen** — Three-column layout:
- Left/right: compact client cards (name, DOB, address on file, accounts list, advisor, AUM).
- Centre **Evidence Panel**: one row per evidence item — icon, plain-English claim ("Residential addresses match exactly"), the actual values side-by-side with the matching parts highlighted, source link ("KYC form 2024-08, p.2 · open document"), and per-item weight contribution ("+0.30").
- **Confidence display**: large numeric score with label (High ≥ 80 · Medium 50–79 · Low < 50), plus a horizontal stacked bar showing which evidence contributed what — explainability at a glance.
- **Sensitive warning** (when applicable): amber banner across the top — *"⚠ This suggestion uses beneficiary designation data. Beneficiaries are third parties who have not consented to data use. Client confirmation is required before this link can be recorded."* Approve is disabled; only **Needs Client Confirmation** and **Reject** are active.
- **Action bar**: `✓ Approve` · `Needs Client Confirmation` · `✕ Reject` — each opens a note field (required for Reject). Below: **Audit history panel** (collapsible): "Created by suggestion scan #2219 · viewed by A. Lee 2026-06-11 09:14 · …"

**5.3 Compliance review page** — as in §4: KPI strip, filterable table, drill-down identical to advisor view plus decision timeline, annotation box, Reopen and Export buttons.

---

## 6 · Data Model

```
Clients            id · name · dob · residential_address · mailing_address · phones[] ·
                   emails[] · advisor_id · household_id (nullable) · consent_flags ·
                   created_at · updated_at

Accounts           id · client_id · type (RRSP/TFSA/RESP/Joint/Corp/…) · joint_with[] ·
                   beneficiaries[{name, dob?, relationship_stated?, source_doc_id}] ·
                   spousal_contributor_id? · resp_subscriber_id? · resp_beneficiaries[]

Documents          id · client_id · type (KYC/NAAF/beneficiary_form/POA/will_ref/note/intake) ·
                   storage_uri · hash · uploaded_by · uploaded_at · scan_status ·
                   extracted_entities_id (FK, versioned)

ExtractedEntities  id · document_id · model_version · names[] · addresses[] · phones[] ·
                   emails[] · beneficiary_mentions[] · poa_executor_mentions[] ·
                   relationship_mentions[{text_span, inferred_relation, person_name}] ·
                   extraction_confidence · created_at        ← raw model output, never edited

HouseholdSuggestions  id (suggestion_id) · primary_client_id · related_client_id ·
                   suggested_relationship_type · confidence_score · confidence_label ·
                   status (open/approved/rejected/pending_client/reopened/expired) ·
                   beneficiary_derived (bool) · sensitive (bool) · scan_id · model_version ·
                   prompt_version · created_at · decided_at · evidence_snapshot_uri
                   UNIQUE(pair_hash, evidence_fingerprint)   ← no duplicate nagging

SuggestionEvidence id · suggestion_id · evidence_type (address_exact/address_fuzzy/surname/
                   phone/email/beneficiary/joint_account/spousal_plan/resp/emergency_contact/
                   poa_executor/note_mention) · claim_text · value_a · value_b ·
                   source_ref (doc_id+page / account_id / note_id) · weight · sensitive (bool)

HouseholdLinks     id · client_a_id · client_b_id · relationship_type · household_id ·
                   origin (ai_suggestion/manual) · suggestion_id? ·
                   client_confirmation_status (not_required/pending/confirmed/denied) ·
                   approved_by · approved_at · active (bool)

AdvisorDecisions   id · suggestion_id · advisor_id · decision (approve/reject/needs_confirmation/
                   confirmation_result) · reason_code · note · seconds_open_before_decision ·
                   decided_at

ComplianceReviews  id · suggestion_id · officer_id · action (viewed/annotated/reopened/
                   exported) · annotation · created_at

SensitiveFlags     id · suggestion_id · flag_type (beneficiary_derived/poa_derived/minor_involved/
                   non_client_third_party/deceased_indicated) · detail · forced_workflow
                   (client_confirmation/compliance_signoff)

AuditLogs          id · actor_type (system/advisor/associate/compliance) · actor_id ·
                   action · object_type · object_id · payload_hash · prev_entry_hash ·
                   ip/session · created_at            ← append-only, hash-chained
```

---

## 7 · AI Matching Logic

Deterministic rules generate candidate pairs and base scores; the suggestion engine handles the fuzzy/unstructured layer (document extraction, note interpretation, name variant reasoning) and composes the human-readable case. **Scores are computed by code, not by the model**, so confidence is reproducible and auditable.

| Signal | Rule | Base weight |
|---|---|---|
| Exact address match | normalized civic address identical (libpostal-style normalization: unit, casing, "St/Street") | +0.30 |
| Fuzzy address match | same street + civic number, unit differs; or token similarity ≥ 0.9 | +0.18 |
| Same surname | exact surname match (skip top-frequency surnames at full weight — Smith/Lee/Chen get ×0.5) | +0.10 |
| Shared phone number | normalized E.164 match on any phone field | +0.22 |
| Shared email / contact | identical email +0.22 · same rare personal domain +0.08 (ignore gmail/outlook/shaw/telus) | +0.08–0.22 |
| Beneficiary match | extracted beneficiary name ≈ other client's name (name-variant aware) | +0.28 · sets `beneficiary_derived` |
| Joint account | both clients on one account — near-conclusive | +0.45 |
| Spousal RRSP/plan | contributor ↔ annuitant across records | +0.40 |
| RESP relationship | subscriber ↔ beneficiary linkage | +0.35 |
| Emergency contact | client A listed as client B's emergency contact | +0.20 |
| POA / executor / trustee | named in the other's POA/estate documents | +0.25 · sensitive |
| Notes-based mention | note text implies relation ("his wife Lin", "daughter of M. Chen") — the extraction layer records span + inferred relation | +0.10–0.20 by specificity |

**Confidence calculation:** `score = 100 × (1 − Π(1 − wᵢ))` over distinct evidence types (probabilistic OR — independent corroborating signals compound; five weak signals beat one medium one, matching how a human reasons). Caps and floors: single-signal suggestions cap at 55 (Medium) except joint accounts (cap 75); surname-only pairs are never surfaced (noise floor); conflicting evidence (e.g., different DOB-implied generation vs "spouse" guess) subtracts and is shown as counter-evidence. Bands: **High ≥ 80 · Medium 50–79 · Low < 50**; Low is surfaced only if it includes a structural signal (account-based), never from soft signals alone.

---

## 8 · Prompt Architecture

**A · System prompt (permanent):**
> You are the Household Suggestions engine for Starman, a CRM for a CIRO-regulated Canadian advisory firm. Your sole function is to extract relationship-relevant facts from provided records and propose POSSIBLE household/family connections as structured suggestions for human review. You only suggest — you never merge records, edit KYC or client profiles, change beneficiaries or account ownership, send communications, or make suitability or compliance decisions. Every claim you output must cite the provided source it came from; if evidence is absent, say so. Never invent names, addresses, or relationships. Mark any inference that uses beneficiary, POA, executor, or trustee data as sensitive. Treat all data as confidential; output nothing except the requested JSON.

**B · Document scanning prompt (per document):**
> Extract from the attached document only: full names, residential/mailing addresses, phone numbers, emails, beneficiary designations (name, stated relationship, account), POA/executor/trustee references, emergency contacts, and any text span that states or implies a family/household relationship. Return DocumentExtraction JSON. Quote text spans exactly; include page/section anchors; assign extraction_confidence per item; do not infer relationships at this stage — extraction only.

**C · Relationship matching prompt (per candidate pair, with code-generated signal list):**
> Given the extracted records for Client A and Client B and the deterministic match signals below, assess whether they plausibly form a household or family connection. You may add evidence ONLY from the provided extractions (e.g., a note span). Classify the most likely relationship type from: spouse/partner, parent/adult-child, sibling, multi-generation household, other-family, shared-household-non-family, insufficient. Identify counter-evidence. Do not compute the numeric score — return evidence items with type labels only.

**D · Suggestion generation prompt:**
> Compose the final HouseholdSuggestion JSON for advisor review: a 2–3 sentence plain-English evidence_summary an advisor can verify in under a minute, the evidence_items array (each with claim, values, source_ref), sensitive flags, and recommended_advisor_action. Write neutrally: "records share," "is listed as" — never assert the relationship as fact.

**E · Compliance guardrail prompt (appended to every call):**
> Reminder: you are advisory-only. Your output is a suggestion for human decision-making, never an action. Beneficiary- or estate-document-derived inferences must set beneficiary_derived=true and requires_client_confirmation=true. If you cannot support a suggestion with cited evidence, return no suggestion. Include the prohibited_actions array verbatim in your output.

**F · JSON output schema:**
```json
{
  "suggestion_id": "hhs_2026_001482",
  "primary_client_id": 1,
  "related_client_id": 3,
  "suggested_relationship_type": "parent_adult_child",
  "confidence_score": 87,
  "confidence_label": "high",
  "evidence_summary": "Records share the same residential address (88 Riverbend Rd, Edmonton). Robert & Lin Tran's KYC lists Margaret Chen as emergency contact. A 2024-03 advisor note refers to 'Lin, Margaret's daughter.'",
  "evidence_items": [
    {"type": "address_exact", "claim": "Residential addresses match exactly",
     "value_a": "88 Riverbend Rd, Edmonton AB T6R 2K9",
     "value_b": "88 Riverbend Rd, Edmonton AB T6R 2K9",
     "source_ref": {"a": "kyc_doc_5512:p2", "b": "kyc_doc_6107:p2"}, "weight": 0.30, "sensitive": false},
    {"type": "emergency_contact", "claim": "Client A is Client B's emergency contact",
     "value_a": "Margaret Chen", "value_b": "emergency_contact: Margaret Chen (mother)",
     "source_ref": {"b": "intake_form_6109:p3"}, "weight": 0.20, "sensitive": false},
    {"type": "note_mention", "claim": "Advisor note implies parent/child relation",
     "value_a": null, "value_b": "\"…discussed RESP with Lin, Margaret's daughter…\"",
     "source_ref": {"b": "note_88231"}, "weight": 0.15, "sensitive": false}
  ],
  "sensitive_flags": [],
  "beneficiary_derived": false,
  "recommended_advisor_action": "review_and_approve",
  "requires_client_confirmation": false,
  "prohibited_actions": ["merge_records","edit_kyc","modify_beneficiaries",
    "change_account_ownership","send_client_communication","create_link_without_human_approval"]
}
```

---

## 9 · Hard Restrictions (enforced in code, not just prompts)

The HHS pipeline must **never**: auto-merge or auto-link records · edit KYC or any client profile field · change account ownership · update, add, or remove beneficiaries · make or imply suitability/compliance decisions · send any client communication · delete or overwrite records, documents, or extractions · treat beneficiary-derived matches as confirmed relationships or allow them to skip client confirmation · suppress, summarize-away, or hide evidence (every signal used must appear in evidence_items) · take any unlogged action — every model call, suggestion, view, and decision writes to the audit chain. The API layer enforces these: the model's output channel is a single `INSERT INTO HouseholdSuggestions` — there is structurally no code path from model output to client-record mutation.

---

## 10 · Audit Trail Design

Append-only, hash-chained (`prev_entry_hash`) log entries for:

- **Scan events** — scan_id, scope, document set hashes, model + prompt versions, duration, suggestion count
- **Suggestion created** — full JSON snapshot URI, confidence, flags
- **Every view** — who opened which suggestion, role, timestamp, session
- **Evidence access** — which source documents were opened from the evidence panel
- **Advisor decision** — decision, reason code, note, seconds-open-before-decision
- **Client confirmation** — status changes (pending → confirmed/denied), how confirmed (meeting/call/email ref), recorded by whom
- **Compliance actions** — annotations, reopens, exports (with export scope)
- **Manual overrides** — any reopen/re-decision chain, with both decisions retained
- **Policy changes** — threshold or sensitivity-rule edits by sysadmin (old → new values)

Retention follows the firm's books-and-records schedule (CIRO: typically 7 years). Evidence snapshots are point-in-time copies so an examiner sees exactly what the advisor saw, even if the underlying record later changed.

---

## 11 · Prototype Build Plan (Starman)

**Phase 1 — Suggestion engine prototype (in the single-file Starman 4.x):** deterministic matchers over local demo data (address/phone/surname/family fields already exist), simulated suggestion engine composing evidence summaries, a Suggestions queue page with confidence chips. *~1 build session.*

**Phase 2 — Advisor approval workflow:** review screen with side-by-side clients + evidence panel, Approve/Reject/Needs-Confirmation with reason codes, approved links feeding the Constellation (new "AI-suggested, advisor-approved" edge style), suppression of rejected pairs. *~1 session.*

**Phase 3 — Audit trail + compliance dashboard:** hash-chained audit entries in the existing audit store, compliance page with filters, rubber-stamp risk flag, CSV export. *~1 session.*

**Phase 4 — Beneficiary-sensitive handling:** beneficiary fields on demo accounts, beneficiary-derived matching, forced confirmation workflow (Approve disabled), amber warning UI, confirmation-outcome recording. *~1 session.*

**Phase 5 — Full production integration (starman-app):** server-side scan worker calling the approved production model endpoint with appropriate data-protection terms, Postgres schema from §6, document extraction over the Document vault, role-gated routes (OWNER/ADVISOR/ASSISTANT/COMPLIANCE already exist in starman-app), exam-ready export. *Requires the Node/Prisma backend; multi-week.*

---

## 12 · Example Output

**Queue row:** `⚠` **Gordon Macleod ↔ Helen Osei** · Possible spouse/partner · `HIGH 84` · 🏠 👤 🏦 · *Beneficiary-derived* · **Review →**

**Review screen evidence panel:**
> ⚠ *This suggestion uses beneficiary designation data — client confirmation required before linking.*
> 1. 🏠 **Residential addresses match exactly** — 12 Maskêkosihk Trail, Edmonton — both KYC forms (2024-08 / 2025-10) · +0.30
> 2. 👤 **Helen Osei is listed as beneficiary** on Gordon Macleod's RRIF #7741 ("relationship stated: spouse") — beneficiary form 2023-11, p.1 · +0.28 · *sensitive*
> 3. 🏦 **Joint chequing-linked TFSA contribution source** shared across both records · +0.20
>
> **Confidence: 84 · HIGH** ▓▓▓▓▓▓▓▓░░  `[ Needs Client Confirmation ]  [ ✕ Reject ]`  (Approve disabled — beneficiary-derived)

**JSON:** as §8F with `"beneficiary_derived": true`, `"sensitive_flags": [{"flag_type":"beneficiary_derived","forced_workflow":"client_confirmation"}]`, `"requires_client_confirmation": true`, `"recommended_advisor_action": "confirm_with_client_at_next_contact"`.

**Audit excerpt:**
```
2026-06-11 02:10:44  system/scan#2219     suggestion_created  hhs_2026_001483  conf=84  flags=[beneficiary_derived]
2026-06-11 09:02:17  advisor/AL           viewed              hhs_2026_001483
2026-06-11 09:03:40  advisor/AL           opened_source       beneficiary_form_7741:p1
2026-06-11 09:04:05  advisor/AL           decision            needs_client_confirmation  note="Will confirm at June 18 review"
2026-06-18 14:22:31  advisor/AL           confirmation_result confirmed_by_client → link created hl_0091
2026-06-19 08:40:12  compliance/RM        viewed + annotated  "Proper workflow followed."
```
