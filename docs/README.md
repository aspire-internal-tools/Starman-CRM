# Documentation

Business, compliance, product, and implementation documents for Starman CRM.

## Version Standard

**Starman** is the CRM codename. The active design prototype is **Starman 5.0** (`design/Starman-5.0.html`, metadata version `5.0.0`). Use `Starman 5.0` or `Starman 5.x` in current module docs. Do not label active module docs as first-release standalone versions unless the file is explicitly about a separate historical release or pilot scope.

## Key Documents

| File | Purpose |
|---|---|
| `MVP.md` | Product scope and minimum viable product definition. |
| `PROJECT-MAP.md` | SaaS-style map of folder ownership, source-of-truth files, architecture layers, and edit rules. |
| `Aspire-Brand-Standard.md` | Aspire colour, logo, typography, and release-marking rules for Starman. |
| `JOURNEY.md` | Build history and important project decisions. |
| `INVENTORY.md` | Current asset/module inventory. |
| `Starman-Version-History.md` | Version source of truth for the Starman CRM lineage. |
| `Starman-Audit-Response-2026-07-14.md` | Professional response to the July 10 prototype audit, including pilot gates and acceptance record. |
| `Starman-Master-Prompt.md` | Master build, verification, and AI system prompt reference. |
| `Starman-Canada-Data-Residency-Guide.md` | Canadian data residency guidance and production posture. |
| `Starman-Go-Live-Plan-30-Days.md` | 30-day launch plan. |
| `Starman-Household-Suggestions-Design.md` | Household suggestion design and review workflow. |
| `Starman-Cloud-Provider-Decision.md` | Decision record selecting Azure Container Apps and superseding active AWS assumptions. |
| `Starman-Azure-Architecture.md` | Azure service map, trust boundaries, data flows, recovery posture, and known gaps. |
| `Starman-Azure-Deployment-Runbook.md` | Approval-gated validation, deployment, migration, smoke-test, rollback, and recovery process. |
| `Starman-Azure-Security-and-Residency-Checklist.md` | Evidence checklist required before production or real-client-data authorization. |
| `Starman-Azure-Cost-and-Capacity-Model.md` | Dated low/expected/high Azure Pricing Calculator input worksheet. |
| `Starman-Azure-Implementation-Plan.md` | Traceable local-preparation plan for infrastructure, runtime readiness, documentation, and verification. |
| `Starman-Funding-Package.docx` | Funding/business package document. |

## Subfolders

| Folder | Purpose |
|---|---|
| `audits/` | Original audit/review artifacts, including the July 10 prototype audit PDF and Markdown source. |

## Naming Convention

- Product/business docs: `Starman-Topic-Name.md`
- Repository meta docs: `UPPERCASE.md`

## Rules

- Keep docs factual and dated when they describe project state.
- Do not store real client records, credentials, or API keys here.
- Keep one current document per topic. Replace stale copies with an updated current file instead of keeping loose duplicate versions.
