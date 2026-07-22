# Starman Azure Architecture

**Architecture status:** Local deployment foundation prepared; no Azure resources provisioned.  
**Primary region:** Canada Central  
**Candidate recovery region:** Canada East, disabled until approved

## System Boundary

Starman remains one database-backed application for the pilot. The Node/Express server serves the web client, enforces authentication and organization scoping, calls PostgreSQL, mediates document access, and optionally calls an approved model endpoint. The design does not introduce AKS, independent microservices, or browser-held cloud credentials.

```text
Advisor browser
    |
    | HTTPS
    v
Azure Container Apps ingress
    |
    +-- Starman Node/Express container
          |
          +-- private PostgreSQL Flexible Server
          +-- private Blob Storage
          +-- private Key Vault through managed identity
          +-- Log Analytics / Application Insights (metadata only)
          +-- optional Azure OpenAI regional endpoint (approval-gated)
```

## Components

| Component | Configuration posture |
|---|---|
| Resource group | Environment-specific, Canada-only location, standard ownership/data/cost tags. |
| Virtual network | Dedicated Container Apps, PostgreSQL, and private-endpoint subnets. |
| Container Apps | External HTTPS ingress because authorized staff must reach the application; insecure HTTP disabled; single active revision; bounded scaling; liveness and readiness probes. |
| Container Registry | Standard SKU for pilot cost control; admin and anonymous access disabled; managed-identity pull. Public registry endpoint remains a documented pilot exception because private endpoints require Premium. |
| PostgreSQL Flexible Server | PostgreSQL 16, private delegated subnet, TLS required, point-in-time backups, no unapproved non-Canadian replica. Production deletion lock included. |
| Blob Storage | Private containers, OAuth by default, shared-key access disabled, TLS 1.2, versioning, change feed, and soft deletion. |
| Key Vault | RBAC, private endpoint, soft deletion, and production purge protection. Application reads secrets through managed identity. |
| Monitoring | Log Analytics and Application Insights in the selected Canadian region. Logs contain request metadata and correlation IDs, not client content. |
| Azure OpenAI | Not provisioned by Bicep. Simulated mode remains the default. Production requires a verified Canadian regional deployment and approval record. |

## Data Flows

### Authentication And CRM Records

The browser sends credentials and CRM requests over HTTPS. Express applies security headers, CORS, rate limits, authentication, role checks, and organization scoping. Prisma connects to PostgreSQL over TLS. Passwords are bcrypt hashes; JWT signing material is sourced from Key Vault. Current JWT authentication remains in place until a complete Entra ID migration is separately approved and tested.

### Documents

The target document flow is browser to Starman API to private Blob Storage. The browser must not receive storage account keys or permanent public links. Downloads should be server-mediated or use short-lived, narrowly scoped authorization. Duplicate names, assignments, edits, and deletions remain audit events. The existing database-backed document module does not yet implement Blob content storage; enabling real uploads is a separate application workstream.

### Model Processing

The server builds bounded context from authorized organization records and calls `server/src/services/llm.js`. Simulated mode sends nothing externally. Azure mode requires HTTPS, an Azure deployment URL, a server-side key, and `AI_DEPLOYMENT_TYPE=regional` in production. This flag is a configuration gate, not independent proof of regional processing; the actual deployment type, model, quota, and contractual posture must be verified in Azure.

Generated outputs remain drafts or decision support. They cannot execute transactions, change portfolios, make product recommendations, edit KYC/beneficiary/account records, or send client communications automatically.

## Trust Boundaries

1. **Public edge:** Authorized browsers to Container Apps ingress. Require HTTPS, MFA roadmap, rate limits, and monitored authentication failures.
2. **Application network:** Container Apps to PostgreSQL, Blob Storage, and Key Vault. Use VNet integration, private DNS, managed identity, and least privilege.
3. **Model boundary:** Starman to Azure OpenAI. Enable only after regional-processing and privacy approval.
4. **Operations boundary:** Azure administrators, support, monitoring, backups, deployment tooling, and subprocessors. Restrict roles and audit changes.
5. **External integrations:** Email, Teams, SharePoint, e-signature, carriers, custodians, analytics, and error reporting. Each needs a separate data-flow review.

## Resilience And Recovery

- Container Apps is single-region in the current foundation. Production uses at least two replicas for zone resilience after capacity approval.
- PostgreSQL point-in-time backup is configured from 7 to 35 days by environment.
- Canadian geo-redundant backup is disabled by default and requires explicit Canada East approval.
- Blob versioning and soft deletion protect against accidental overwrite and deletion; they are not substitutes for a tested recovery procedure.
- Infrastructure can be recreated from Bicep. Database and file restoration must be tested with synthetic data before real-client-data approval.
- A region-wide recovery design requires a second Container Apps environment, replicated configuration, approved data replication, DNS/failover controls, and a documented recovery-time and recovery-point objective. It is not silently enabled by this pilot template.

## Known Gaps Before Pilot

- Azure subscription, quotas, policies, private DNS behavior, and service availability are unverified.
- Azure OpenAI regional model availability and deployment type are unverified.
- Blob content storage is not yet wired into the Documents API.
- Entra ID is a roadmap item; current JWT authentication remains active.
- Alert notification recipients, budgets, retention periods, and recovery objectives need owners.
- Security testing, restore testing, privacy review, dealer approval, and go/no-go approval remain open gates.

