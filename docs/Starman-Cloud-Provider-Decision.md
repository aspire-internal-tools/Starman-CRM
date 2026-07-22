# Starman Cloud Provider Decision

**Decision date:** 2026-07-15  
**Status:** Selected architecture for local preparation; Azure subscription and deployment remain approval-gated.

## Decision

Use Microsoft Azure as Starman's target cloud platform and Azure Container Apps as the application runtime for the controlled Canadian pilot. The primary region is Canada Central. Canada East is the candidate recovery region, but replication is disabled until service availability, retention, cost, privacy, and recovery requirements are approved.

## Why Azure

- Aspire can align Starman with Microsoft 365, Entra ID, Outlook, Teams, and SharePoint governance over time without enabling those integrations prematurely.
- Azure provides Canadian regions for the application, PostgreSQL, Blob Storage, Key Vault, monitoring, and eligible model deployments.
- Azure OpenAI can use the existing provider abstraction in `starman-app/server/src/services/llm.js` while keeping keys server-side.
- Managed identities, Key Vault, RBAC, private endpoints, Azure Policy, and resource tagging provide a coherent enterprise control plane.

Azure hosting is not, by itself, proof of compliance. Alberta PIPA, applicable PIPEDA obligations, Quebec Law 25 where relevant, CIRO/dealer requirements, contracts, consent, retention, access, breach response, and supervision still require documented approval.

## Why Container Apps

| Option | Decision | Reason |
|---|---|---|
| Azure Container Apps | Selected | Runs the existing Docker image, supports managed revisions and scaling, integrates with VNet and managed identity, and keeps pilot operations manageable. |
| Azure App Service | Not selected | Simple for a web app, but less aligned with the existing container workflow and future worker/connector jobs. |
| Azure Kubernetes Service | Rejected for pilot | Adds cluster security, upgrades, networking, observability, and staffing overhead that the pilot does not need. |

## Service Mapping

| Starman need | Selected Azure service |
|---|---|
| Node/Express runtime | Azure Container Apps |
| Image storage | Azure Container Registry |
| PostgreSQL | Azure Database for PostgreSQL Flexible Server |
| Documents and transcripts | Azure Blob Storage |
| Secrets | Azure Key Vault |
| Runtime identity | User-assigned managed identity |
| Logs and metrics | Log Analytics, Azure Monitor, Application Insights |
| Model inference | Azure OpenAI, simulated mode, or approved self-hosted model |
| Workforce identity roadmap | Microsoft Entra ID, separate approved migration |

## Superseded AWS Assumptions

Active ECS Fargate, RDS, S3, CloudWatch, Secrets Manager, Transcribe, Bedrock, and `ca-central-1` instructions are superseded by the Azure architecture. AWS and Google Cloud references may remain in neutral comparisons and dated historical records. No code should retain an AWS-only production dependency unless a separate migration decision records why.

## Required Verification

Before any Azure deployment:

1. Confirm the Azure tenant, subscription, billing owner, resource providers, quotas, policies, and Canada Central service availability.
2. Confirm the selected Azure OpenAI model is available using a regional deployment type in the approved Canadian region. Global Standard and Global Batch are prohibited for client data.
3. Confirm whether Canada East recovery replication is permitted and testable within the approved residency boundary.
4. Confirm private networking, DNS, monitoring ingestion, support access, subprocessors, and contractual terms.
5. Approve retention, deletion, backup, restore, incident response, and customer-managed-key requirements.
6. Complete security, privacy, dealer, CCO, and legal review before real client information enters Starman.

## Sources

- Azure regions and data residency: https://learn.microsoft.com/azure/reliability/regions-overview
- Azure Container Apps reliability: https://learn.microsoft.com/azure/reliability/reliability-container-apps
- Azure OpenAI multitenancy and regional deployment: https://learn.microsoft.com/azure/architecture/guide/multitenant/service/openai
- Azure Database for PostgreSQL: https://learn.microsoft.com/azure/postgresql/flexible-server/service-overview

