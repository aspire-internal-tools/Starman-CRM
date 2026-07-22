# Starman Audit Response

Last updated: 2026-07-14

Source reviewed: `docs/audits/Starman-Prototype-Audit-2026-07-10.md`

## Professional Position

Starman is a credible Aspire CRM prototype and early production foundation, not a firm-wide production system for real client data yet.

The responsible path is a narrow, staff-tested pilot on the database-backed application, with Canadian hosting, least-privilege access, audit logging, backup/restore testing, privacy/compliance approval, and named ownership before any real client information is introduced.

## Incorporated Decisions

| Audit finding | Incorporated direction |
|---|---|
| The 5.0 prototype is broad and browser/demo-data based. | Keep `design/Starman-5.0.html` as the visual and workflow specification. Do not treat it as the production data system. |
| The production foundation is technically plausible but incomplete. | Port selected modules into `starman-app/` one workflow at a time using org-scoped API routes, Prisma models, role gates, and audit logging. |
| The first production release needs scope control. | Pilot only three to five high-frequency workflows, with written acceptance checks and staff feedback. |
| AI work must remain human-reviewed. | Keep generated notes, emails, tasks, household links, and meeting actions draft-only until approved by an advisor or compliance role. |
| Carrier integrations require official access and approval. | Keep Canada Life and Quadrus locked. Use CSV/manual workflows until approved APIs are available. |
| Calculators need source dates and maintenance ownership. | Do not rely on planning/calculator outputs with clients until formulas, source dates, test cases, and upkeep owner are documented. |
| Continuity is a risk if ownership is informal. | Name a product owner, technical maintainer, compliance approver, deployment owner, and backup/recovery owner before pilot. |

## Pilot Gate Checklist

Real client data should not enter Starman until each gate is complete.

| Gate | Required evidence |
|---|---|
| Product ownership | Named product owner, technical maintainer, compliance approver, and final decision-maker. |
| Pilot scope | Three to five workflows selected with staff-facing acceptance checks. |
| System of record | Written decision on which existing system remains authoritative during the pilot. |
| Privacy and compliance | CCO/dealer review, privacy basis, retention plan, and approved user roles. |
| Canadian hosting | Database, files, backups, keys, logs, and approved model processing in Canadian-controlled locations where required. |
| Security | Strong secrets, least-privilege accounts, TLS, encryption at rest, rate limiting, and no secrets in browser code. |
| Backup and recovery | Documented backup schedule, restore test, and incident contact path. |
| Staff acceptance | Synthetic-data test run, defects logged, fixes verified, and pilot group trained. |
| Release record | Date, scope, tests, known limits, approver, and rollback plan recorded. |

## First Pilot Scope

Recommended initial pilot workflows:

1. Intake to lead/client conversion.
2. Client list, household view, and basic Client 360.
3. Tasks, reviews, KYC due dates, and compliance flags.
4. Documents/files tracking with audit records.
5. Meeting Intelligence for text transcripts only, producing draft notes and draft tasks.

Defer audio transcription, automatic household matching at scale, direct carrier integrations, advanced analytics, external licensing, and production calculator reliance until after the first pilot proves staff adoption and controls.

## Acceptance Record Template

Use this for each release or pilot increment.

| Field | Entry |
|---|---|
| Release date |  |
| Workflow tested |  |
| Staff reviewer |  |
| Test data used | Synthetic / controlled approved data |
| Acceptance check |  |
| Result | Pass / fail / needs change |
| Defects found |  |
| Compliance notes |  |
| Follow-up owner |  |

## Operating Rule

When audit findings conflict with speed or convenience, the audit finding wins. Starman should remain useful, narrow, auditable, and honest about its limits until the production foundation is fully approved for real client data.
