# Starman CRM Project Map

Last updated: 2026-07-15

This map explains how the Starman CRM workspace is organized from a SaaS product-development perspective.

## Source Of Truth

| Area | Source of truth |
|---|---|
| Product codename | Starman |
| Living architecture document | `docs/ARCHITECTURE.md` |
| Active prototype | `design/Starman.html` (version in HTML metadata + `docs/Starman-Version-History.md`, currently 2.0.0) |
| Version standard | `docs/Starman-Version-History.md` |
| Production app | `starman-app/` |
| Brand standard | `docs/Aspire-Brand-Standard.md` |
| Audit and pilot gates | `docs/compliance/Starman-Audit-Response-2026-07-14.md` |
| File inventory | `docs/INVENTORY.md` |
| Cloud decision | `docs/azure/Starman-Cloud-Provider-Decision.md` |
| Azure architecture | `docs/azure/Starman-Azure-Architecture.md` |
| Azure deployment | `docs/azure/Starman-Azure-Deployment-Runbook.md` |
| Azure security/residency gate | `docs/azure/Starman-Azure-Security-and-Residency-Checklist.md` |
| Azure cost/capacity model | `docs/azure/Starman-Azure-Cost-and-Capacity-Model.md` |

## Folder Responsibilities

| Folder | Owner purpose | Edit when |
|---|---|---|
| `starman-app/` | The database-backed SaaS product: Node/Express API, Prisma/PostgreSQL schema, vanilla web client, Docker deployment. | Building real production functionality, API routes, auth, persistence, audit logging, or deployment. |
| `starman-app/infra/` | Bicep foundation for the approved Azure Container Apps architecture. No deployment authorization is implied. | Preparing or reviewing Azure infrastructure, networking, secrets, storage, monitoring, and environment parameters. |
| `design/` | The current visual and workflow prototype. Contains exactly one active Starman HTML prototype. | Refining UX, demo workflows, visual behavior, or local prototype-only ideas. |
| `design/assets/` | Approved Aspire logo copies used by the active prototype. | Updating UI logo assets from the source brand kit. |
| `design/screenshots/` | Visual references and QA screenshots. | Capturing design states, regressions, or before/after evidence. |
| `docs/` | Business, product, compliance, version, audit, and implementation documentation. | Updating decisions, scope, pilot gates, version standard, or product narrative. |
| `docs/audits/` | Original audit/review artifacts. | Adding formal review materials with dated filenames. |
| `branding/` | Source Aspire brand kit and original logo assets. | Updating brand source material, not daily UI implementation. |
| `aspire_connectors/` | Python/FastAPI connector prototype for CSV, webhook, Meta lead, AdvisorStream, DocuSign, and locked carrier stubs. | Working on external ingestion or integration proof-of-concepts. |

## Current SaaS Architecture

| Layer | Path | Notes |
|---|---|---|
| Web shell | `starman-app/web/index.html` | Functional app UI shell. Docker currently mounts the design prototype over `/` unless the mount is removed. |
| Web logic | `starman-app/web/app.js` | Vanilla JS views and client-side routing for the database-backed app. |
| API client | `starman-app/web/api.js` | Browser fetch wrapper. All server calls go through here. |
| Server entry | `starman-app/server/src/index.js` | Express app setup, security middleware, route mounting, static web serving, error handling. |
| Auth | `starman-app/server/src/auth.js` | JWT, password hashing, role gates. |
| Database | `starman-app/server/prisma/schema.prisma` | PostgreSQL schema. All business records are org-scoped. |
| Routes | `starman-app/server/src/routes/` | Module APIs. Follow the existing org-scoped + Zod + audit pattern. |
| Model adapter | `starman-app/server/src/services/llm.js` | Provider-flexible model endpoint wrapper. Keys stay server-side. |
| Azure infrastructure | `starman-app/infra/main.bicep` | Subscription-scope Canada-only Bicep composition. Application deployment defaults off. |
| Connectors | `aspire_connectors/` and `starman-app/server/src/routes/connectors.js` | Prototype and app-side integration surfaces. Canada Life and Quadrus remain locked. |

## Selected Cloud Architecture

Microsoft Azure is the selected platform for deployment preparation. The pilot target is Azure Container Apps in Canada Central with Azure Container Registry, PostgreSQL Flexible Server, private Blob Storage, Key Vault, managed identities, and Canadian-region monitoring. Canada East recovery replication and Azure OpenAI remain disabled until separately verified and approved.

Active AWS deployment assumptions are superseded. AWS references may remain only in historical records or neutral provider comparisons. See `docs/azure/Starman-Cloud-Provider-Decision.md`.

## Current Product Rule

Do not create parallel active prototype files. The current active prototype is:

```text
design/Starman.html
```

The filename is permanent and versionless — version changes are recorded in the
file's `<meta name="version">` tag and logged in `docs/Starman-Version-History.md`.

Older versions should be described only in narrative documentation when useful. They should not be reintroduced as active working files.

## Real Client Data Rule

Real client data should not enter Starman until the pilot gates in `docs/compliance/Starman-Audit-Response-2026-07-14.md` are complete.

Minimum gates:

- Named product owner, technical maintainer, compliance approver, and final decision-maker.
- Approved pilot scope with staff acceptance checks.
- Written system-of-record decision.
- Privacy, security, dealer, and compliance review.
- Canadian hosting path for database, files, backups, keys, logs, and approved model processing where required.
- Backup and restore test.
- Synthetic-data test run with defects recorded and fixed.

## Naming Rules

- Product docs: `Starman-Topic-Name.md`
- Repo meta docs: uppercase names such as `README.md`, `MVP.md`, `JOURNEY.md`, `INVENTORY.md`
- Audit artifacts: `Starman-Topic-Audit-YYYY-MM-DD.ext`
- Screenshots: `starman-screenshot-YYYY-MM-DD-HHMMSS.png`
- Keep file names readable and avoid spaces in project files.

## What To Open First

| Need | Start here |
|---|---|
| Understand the product | `README.md`, then `docs/MVP.md` |
| Understand the current version | `docs/Starman-Version-History.md` |
| Understand the folder structure | `docs/PROJECT-MAP.md` and `docs/INVENTORY.md` |
| Understand audit restrictions | `docs/compliance/Starman-Audit-Response-2026-07-14.md` |
| Change the polished prototype | `design/Starman.html` |
| Build real app behavior | `starman-app/README.md` and `starman-app/server/src/routes/README.md` |
| Understand Azure architecture | `docs/azure/Starman-Azure-Architecture.md` and `docs/azure/Starman-Cloud-Provider-Decision.md` |
| Prepare an Azure deployment | `docs/azure/Starman-Azure-Deployment-Runbook.md` and `starman-app/infra/README.md` |
| Review Azure pilot gates | `docs/azure/Starman-Azure-Security-and-Residency-Checklist.md` |
| Estimate Azure cost/capacity | `docs/azure/Starman-Azure-Cost-and-Capacity-Model.md` |
| Apply Aspire branding | `docs/Aspire-Brand-Standard.md` |
