# Documentation

Business, compliance, product, and implementation documents for Starman CRM.

## Version Standard

**Starman** is the CRM codename. The active design prototype is **Starman 5.0** (`design/Starman-5.0.html`, metadata version `5.0.0`). Use `Starman 5.0` or `Starman 5.x` in current module docs. Do not label active module docs as first-release standalone versions unless the file is explicitly about a separate historical release or pilot scope.

## Top-level documents

These stay at the `docs/` root as the primary product/meta references.

| File | Purpose |
|---|---|
| `ARCHITECTURE.md` | Living architecture document — overview, flows, feature breakdowns, prompts, roadmap. |
| `MVP.md` | Product scope and minimum viable product definition. |
| `PROJECT-MAP.md` | SaaS-style map of folder ownership, source-of-truth files, architecture layers, and edit rules. |
| `JOURNEY.md` | Build history and important project decisions. |
| `INVENTORY.md` | Current asset/module inventory. |
| `Starman-Version-History.md` | Version source of truth for the Starman CRM lineage. |
| `Starman-Master-Prompt.md` | Master build, verification, and AI system prompt reference. |
| `Starman-Go-Live-Plan-30-Days.md` | 30-day launch plan. |
| `Aspire-Brand-Standard.md` | Aspire colour, logo, typography, and release-marking rules for Starman. |

## Subfolders

Topic-grouped documents. Start in the folder that matches the concern.

| Folder | Contents |
|---|---|
| `azure/` | Cloud & deployment: `Starman-Cloud-Provider-Decision.md`, `Starman-Azure-Architecture.md`, `Starman-Azure-Deployment-Runbook.md`, `Starman-Azure-Implementation-Plan.md`, `Starman-Azure-Security-and-Residency-Checklist.md`, `Starman-Azure-Cost-and-Capacity-Model.md`. |
| `compliance/` | Audit & residency: `Starman-Audit-Response-2026-07-14.md` (pilot gates that block real client data), `Starman-Canada-Data-Residency-Guide.md`. |
| `integrations/` | Provider/data integration designs: `Starman-CanadaLife-Quadrus-Integration.md`, `Starman-Sync-and-SharePoint-Integration.md`. |
| `funding/` | Funding & R&D: `Starman-Funding-Package.docx`, `Starman-SRED-and-Funding.md` (CRA SR&ED eligibility — not tax advice). |
| `design-notes/` | Product/UX design notes: `Starman-Household-Suggestions-Design.md`. |
| `audits/` | Original audit/review artifacts, including the July 10 prototype audit PDF and Markdown source. |

## Naming Convention

- Product/business docs: `Starman-Topic-Name.md`
- Repository meta docs: `UPPERCASE.md`

## Rules

- Keep docs factual and dated when they describe project state.
- Do not store real client records, credentials, or API keys here.
- Keep one current document per topic. Replace stale copies with an updated current file instead of keeping loose duplicate versions.
