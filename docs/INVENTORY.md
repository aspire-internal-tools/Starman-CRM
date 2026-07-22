# Starman CRM — File Inventory & Timestamps

*Snapshot updated 2026-07-15 during the organization audit. Timestamps are
file modification times (macOS). Paths are relative to the `CRM/` root.*

## Root

| Path | Modified | Notes |
|---|---|---|
| `README.md` | 2026-07-14 | Navigation hub — start here |
| `launch_starman.command` | 2026-07-07 | One-click Docker launcher (opens :4000) |
| `starman-app/` | 2026-07-14 | **The product** — API + database-wired web client |
| `aspire_connectors/` | 2026-05-31 | Python/FastAPI connector prototype |
| `branding/` | 2026-07-15 | Aspire brand source kit and logo reference assets |
| `design/` | 2026-07-14 | Latest design prototype and screenshots |
| `docs/` | 2026-07-14 | Business & meta documentation |

## branding/

| Path | Modified | Notes |
|---|---|---|
| `aspire-branding-skill/` | 2026-07-15 | Source Aspire branding kit used to create CRM brand standards and logo copies |
| `aspire-branding-skill/assets/` | 2026-07-15 | Original Aspire logo variants from the branding kit |

## design/

| Path | Modified | Notes |
|---|---|---|
| `Starman.html` | 2026-07-17 | Active design prototype ("Advisor OS", ~390 KB, demo data only; versionless filename, v2.0.0 in metadata — renamed from `Starman-5.0.html` 2026-07-17) |
| `assets/` | 2026-07-15 | Approved Aspire logo copies used by the current prototype |
| `screenshots/` | 2026-05-31 → 06-02 | 5 design-iteration screenshots |

## docs/

| Path | Modified | Notes |
|---|---|---|
| `MVP.md` | 2026-07-14 | Intrapreneurship MVP definition & status |
| `PROJECT-MAP.md` | 2026-07-15 | SaaS-style workspace map and source-of-truth guide |
| `Aspire-Brand-Standard.md` | 2026-07-14 | Aspire brand tokens, logo asset paths, and UI rules |
| `JOURNEY.md` | 2026-07-14 | Build timeline (May 31 → today) |
| `INVENTORY.md` | 2026-07-14 | This file |
| `Starman-Version-History.md` | 2026-07-17 | Version source of truth + internal version log (2.x standard, versionless filenames) |
| `Starman-Audit-Response-2026-07-14.md` | 2026-07-14 | Response to July 10 audit: pilot gates, ownership, real-data restrictions |
| `Starman-Master-Prompt.md` | 2026-07-07 | Product master prompt / spec |
| `Starman-Funding-Package.docx` | 2026-07-07 | Intrapreneurship pitch package |
| `Starman-Go-Live-Plan-30-Days.md` | 2026-06-22 | Launch plan |
| `Starman-Canada-Data-Residency-Guide.md` | 2026-06-18 | PIPEDA / data-residency strategy |
| `Starman-Household-Suggestions-Design.md` | 2026-06-11 | Household grouping design notes |
| `Starman-Cloud-Provider-Decision.md` | 2026-07-15 | Azure Container Apps selection and superseded AWS assumptions |
| `Starman-Azure-Architecture.md` | 2026-07-15 | Azure service map, trust boundaries, data flows, and recovery posture |
| `Starman-Azure-Deployment-Runbook.md` | 2026-07-15 | Approval-gated validation, deployment, smoke test, rollback, and recovery runbook |
| `Starman-Azure-Security-and-Residency-Checklist.md` | 2026-07-15 | Evidence gate before production or real-client-data authorization |
| `Starman-Azure-Cost-and-Capacity-Model.md` | 2026-07-15 | Low/expected/high Azure pricing and capacity input worksheet |
| `Starman-Azure-Implementation-Plan.md` | 2026-07-15 | Traceable Azure local-preparation implementation plan |
| `audits/` | 2026-07-15 | Original July 10 audit artifacts in PDF and Markdown |

## starman-app/ (key files)

| Path | Modified | Notes |
|---|---|---|
| `docker-compose.yml` | 2026-07-17 | Postgres 16 + server; mounts `design/Starman.html` over `/` |
| `infra/` | 2026-07-15 | Azure Container Apps Bicep foundation, modules, and non-secret environment parameters; no resources deployed |
| `infra/modules/` | 2026-07-15 | Focused Bicep modules for network, identity, data, runtime, monitoring, and alerts |
| `infra/parameters/` | 2026-07-15 | Development, test, and production capacity settings; secrets read from environment variables |
| `server/prisma/schema.prisma` | 2026-07-14 | Data model — 16 models, all org-scoped |
| `server/src/index.js` | 2026-07-14 | App entry; helmet + CORS + routes |
| `server/src/runtime.js` | 2026-07-15 | Production configuration gates, correlation IDs, redacted telemetry, liveness/readiness helpers |
| `server/test/runtime.test.js` | 2026-07-15 | Node test-runner coverage for Azure/runtime security behavior |
| `server/src/routes/` | 2026-06-04 → 07-14 | auth, leads, intakes, clients, households, tasks, documents, insurance, dashboard, notifications, connectors, apikeys, v1 (public), ai |
| `web/` | 2026-07-14 | Database-wired SPA (index.html, api.js, app.js) |
| `README.md` | 2026-06-08 | App-level readme |
| `Starman-Meeting-Intelligence-Prompt.md` | 2026-07-06 | Feature spec (roadmap) |
| `START-HERE.txt` | 2026-06-08 | Original onboarding note |

## Outside this folder (related artifacts)

| Path | Notes |
|---|---|
| `~/docker-backups/starman_pgdata.tar.gz` | Postgres data-volume snapshot |
| `~/Downloads/starman4-export.json` | JSON export from the Starman 4.x era |

## Regenerating this inventory

```bash
cd ~/Desktop/Destiny/CRM
find . -not -path '*/node_modules/*' -not -name '.DS_Store' -type f \
  -exec stat -f '%Sm  %N' -t '%Y-%m-%d %H:%M' {} \; | sort
```
