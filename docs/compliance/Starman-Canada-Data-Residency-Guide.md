# Starman Canada Data Residency Guide

**Selected platform:** Microsoft Azure  
**Primary region:** Canada Central  
**Candidate recovery region:** Canada East, disabled until approved  
**Status:** Architecture guidance and local deployment preparation; not legal advice or production authorization

This guide explains how Starman should keep client data, operational records, and approved model processing within the firm's authorized Canadian boundary. Confirm the final design and vendor terms with Aspire's privacy, security, CCO/dealer, and legal reviewers.

## 1. Governing Principle

Canadian hosting is one control, not a complete compliance conclusion. Starman must also address Alberta PIPA, applicable PIPEDA obligations, Quebec Law 25 where relevant, books-and-records requirements, consent, purpose limitation, access, retention, deletion, breach response, supervision, contracts, and subprocessors.

Real client information remains prohibited until the pilot gates in `docs/PROJECT-MAP.md`, `docs/compliance/Starman-Audit-Response-2026-07-14.md`, and `docs/azure/Starman-Azure-Security-and-Residency-Checklist.md` are approved.

## 2. Data And Processing Planes

| Plane | Information | Selected posture |
|---|---|---|
| Application | Web UI and Node/Express API | Azure Container Apps, Canada Central |
| Database | Clients, KYC metadata, tasks, audit, workflow records | PostgreSQL Flexible Server, private subnet, Canada Central |
| Files | Documents, transcripts, attachments, exports | Private Blob Storage, Canada Central |
| Secrets and keys | Database URL, signing secret, connector/model credentials | Key Vault, private endpoint, Canada Central |
| Operations | Logs, metrics, alerts, diagnostic metadata | Log Analytics and Application Insights, Canada Central; payloads prohibited |
| Model | Bounded CRM context sent for inference | Simulated by default; Azure OpenAI only after regional deployment verification and approval |
| Recovery | Backups, versions, restore points | Canada Central by default; Canada East replication disabled until approved |

## 3. Selected Azure Controls

- Pin every regional resource to `canadacentral` unless a documented exception approves `canadaeast`.
- Use private networking for PostgreSQL, Blob Storage, and Key Vault.
- Require TLS and disable public database access.
- Disable Blob public access, shared-key access, cross-tenant replication, and permanent public links.
- Enable Blob versioning, change feed, container soft deletion, and object soft deletion.
- Use managed identities and least-privilege Azure RBAC.
- Store secrets in Key Vault; never in the browser, repository, image, logs, or plaintext database fields.
- Keep logs metadata-only and restrict access and retention.
- Keep Canada East geo-backup and recovery infrastructure off until recovery scope and data movement are approved.

The Bicep source for these controls is `starman-app/infra/`.

## 4. Azure OpenAI Gate

Creating an Azure OpenAI resource in Canada is not sufficient evidence that inference stays in the required location. Deployment type matters.

For Starman production use:

1. Verify the selected model and version are available in the approved Canadian region.
2. Use an approved **regional** deployment type. Do not use Global Standard, Global Batch, or another type that can route processing outside Canada.
3. Verify prompt, response, inference, storage, abuse-monitoring, logging, support-access, and subprocessor terms using current Microsoft documentation and contract records.
4. Obtain privacy, security, CCO/dealer, and contractual approval.
5. Store the endpoint and key in Key Vault and set `AI_DEPLOYMENT_TYPE=regional`.
6. Test with synthetic data and confirm logs contain no model input or output.

The server rejects direct OpenAI processing in production and rejects Azure mode unless the configuration identifies an HTTPS Azure deployment endpoint and explicitly marks the approved deployment type as regional. This is a fail-fast safeguard, not independent proof of Azure configuration.

Simulated mode remains the default and sends no data to a model provider. An approved self-hosted model in a Canadian environment remains a fallback option if Azure regional model availability does not satisfy the requirement.

## 5. Egress Register

Every external path must be recorded before enablement:

| Path | Required review |
|---|---|
| Azure platform diagnostics and support | Region, payload, access, retention, contract, subprocessor |
| Email and notifications | Provider, recipient data, message content, logs, retention, residency |
| Microsoft 365, Outlook, Teams, SharePoint | Entra permissions, consent, tenant boundary, audit, retention, residency |
| E-signature | Documents, signer identity, webhook data, contract, retention, region |
| Carriers and custodians | Official API, dealer approval, credentials, data purpose, audit |
| Analytics and crash reporting | Payload redaction, IP handling, region, retention, access |
| Model inference | Deployment type, region, prompts, outputs, logs, support, subprocessors |

Canada Life and Quadrus remain locked. Starman must not screen-scrape portals or store portal passwords.

## 6. Backup And Recovery

- PostgreSQL point-in-time backup is configured per environment from 7 to 35 days.
- Blob versions and soft-deleted objects provide recovery from accidental changes.
- Production database deletion protection is included in Bicep.
- A synthetic database restore and file recovery must be completed before real client information is approved.
- Canada East geo-redundant backup and regional failover require a separate approval record, documented recovery-time and recovery-point objectives, and a tested procedure.
- Backup availability does not replace retention, legal hold, secure deletion, or incident-response processes.

## 7. Privacy And Governance Evidence

Maintain current evidence for:

- Named accountable owners and approvers.
- Data inventory, classification, collection purposes, and consent language.
- Azure architecture, resource locations, RBAC, network paths, keys, logs, and retention.
- Microsoft contractual terms and subprocessor review.
- Azure OpenAI deployment type and model-region verification.
- Access tests, organization-isolation tests, vulnerability scans, and secret scans.
- Backup configuration, restore results, incident-response exercise, and unresolved exceptions.
- Human approval and books-and-records controls for generated drafts.

## 8. Cloud Comparison Context

AWS and Google Cloud also offer Canadian regions and remain relevant only as comparison or fallback context. They are not Starman's active deployment architecture. The selected decision and rationale are in `docs/azure/Starman-Cloud-Provider-Decision.md`.

## Sources To Re-Check At Deployment Time

- Azure regions and data residency: https://learn.microsoft.com/azure/reliability/regions-overview
- Azure Container Apps reliability and regional behavior: https://learn.microsoft.com/azure/reliability/reliability-container-apps
- Azure OpenAI regional and multitenant deployment considerations: https://learn.microsoft.com/azure/architecture/guide/multitenant/service/openai
- Azure Database for PostgreSQL Flexible Server: https://learn.microsoft.com/azure/postgresql/flexible-server/service-overview
- Office of the Privacy Commissioner of Canada business guidance: https://www.priv.gc.ca/en/for-businesses/
- Alberta Personal Information Protection Act guidance: https://www.alberta.ca/personal-information-protection-act
