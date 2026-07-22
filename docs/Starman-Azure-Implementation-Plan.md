# Starman Azure Container Apps Implementation Plan

**Status:** Approved for safe local preparation on 2026-07-15. Azure resource provisioning and real-client-data migration are outside this plan unless separately authorized.

**Goal:** Prepare Starman for a controlled, Canadian-resident pilot on Microsoft Azure Container Apps while preserving the existing application, security controls, and Starman 5.0 source-of-truth rules.

**Architecture:** Run the existing Dockerized Node/Express application on Azure Container Apps in Canada Central. Use Azure Container Registry, PostgreSQL Flexible Server, private Blob Storage, Key Vault, managed identities, and Canadian-region monitoring. Azure OpenAI remains optional and may be enabled only after a regional deployment type and model are verified for the approved Canadian region.
 
**Technology:** Node.js 20, Express, Prisma, PostgreSQL, Docker, Azure Container Apps, Azure Container Registry, Azure Database for PostgreSQL Flexible Server, Azure Storage, Azure Key Vault, Log Analytics, Application Insights, Azure OpenAI, and Bicep.

## Global Constraints

- Read `docs/PROJECT-MAP.md` before Starman changes and keep it authoritative.
- Keep `design/Starman-5.0.html` as the only active Starman HTML prototype.
- Do not deploy Azure resources, create chargeable services, or modify an Azure account without explicit authorization.
- Do not introduce real client information, credentials, tokens, or production secrets.
- Restrict the target data plane, backups, logs, keys, and approved model processing to Canada.
- Do not use Azure OpenAI Global Standard, Global Batch, or another deployment type that can process client information outside Canada.
- Preserve org-scoped queries, role controls, audit logging, simulated model mode, and human approval of generated work.
- Preserve AWS references only in dated history or neutral provider comparisons.
- Do not add AKS, unnecessary microservices, or a second login flow.
- Treat Alberta PIPA, applicable PIPEDA obligations, Quebec Law 25 where relevant, CIRO/dealer requirements, and firm policy as approval inputs; do not claim legal compliance from hosting location alone.

## Workstream 1: Audit And Decision Record

**Files:**

- Create `docs/Starman-Cloud-Provider-Decision.md`.
- Create `docs/Starman-Azure-Implementation-Plan.md`.
- Modify `docs/PROJECT-MAP.md` and `docs/INVENTORY.md`.

**Steps:**

- [x] Classify every AWS reference as active architecture, historical record, neutral comparison, code dependency, or obsolete guidance.
- [x] Record Azure Container Apps as the selected pilot platform and document why App Service and AKS were not selected.
- [x] Record all assumptions that require Azure-console, CCO, privacy, security, dealer, or legal verification.

## Workstream 2: Azure Infrastructure Foundation

**Files:**

- Create `starman-app/infra/README.md`.
- Create `starman-app/infra/main.bicep`.
- Create `starman-app/infra/modules/monitoring.bicep`.
- Create `starman-app/infra/modules/registry.bicep`.
- Create `starman-app/infra/modules/identity.bicep`.
- Create `starman-app/infra/modules/key-vault.bicep`.
- Create `starman-app/infra/modules/storage.bicep`.
- Create `starman-app/infra/modules/postgresql.bicep`.
- Create `starman-app/infra/modules/container-environment.bicep`.
- Create `starman-app/infra/modules/container-app.bicep`.
- Create `starman-app/infra/modules/alerts.bicep`.
- Create `starman-app/infra/parameters/dev.bicepparam`.
- Create `starman-app/infra/parameters/test.bicepparam`.
- Create `starman-app/infra/parameters/prod.bicepparam`.

**Interfaces:**

- `main.bicep` deploys at subscription scope, validates Canadian regions, creates the resource group, and composes all modules.
- Modules receive explicit names, region, environment, tags, and only the identifiers or secrets required by that resource.
- Environment parameter files contain non-secret capacity settings only; secrets are supplied at deployment time and written to Key Vault.

**Steps:**

- [x] Define Canada Central as the default primary region and limit accepted regions to Canada Central and Canada East.
- [x] Add standard Aspire/Starman ownership, environment, data-classification, and cost tags.
- [x] Add private storage containers with versioning, soft deletion, and no public access.
- [x] Add PostgreSQL Flexible Server with TLS, Canadian backups, and production-safe deletion settings.
- [x] Add Key Vault with RBAC, soft deletion, purge protection for production, and managed-identity access.
- [x] Add Container Registry with anonymous access disabled and managed-identity image pull.
- [x] Add Container Apps environment and application with HTTPS ingress, health probes, revision controls, and bounded scaling.
- [x] Add Log Analytics, Application Insights, diagnostic settings, and metadata-only availability/error alerts.
- [x] Keep Azure OpenAI provisioning outside the template until regional deployment type, model availability, quota, privacy terms, and approval are verified.

## Workstream 3: Application Runtime Readiness

**Files:**

- Create `starman-app/server/test/runtime.test.js`.
- Create `starman-app/server/src/runtime.js`.
- Modify `starman-app/server/src/index.js`.
- Modify `starman-app/server/src/env.js`.
- Modify `starman-app/server/src/services/llm.js`.
- Modify `starman-app/server/package.json`.
- Modify `starman-app/server/.env.example`.
- Modify `starman-app/server/Dockerfile`.

**Interfaces:**

- `createRequestContext(options)` returns Express middleware that accepts a valid incoming correlation ID or creates a UUID, sets `X-Correlation-ID`, and writes one metadata-only completion log.
- `healthPayload()` returns non-sensitive liveness metadata.
- `readyPayload(databaseCheck)` returns `200` only when the database check succeeds and otherwise returns a generic dependency-unavailable response.
- `validateRuntimeEnv(runtimeEnv)` rejects unsafe production defaults and invalid Azure AI endpoint/provider combinations.

**Test-first steps:**

- [x] Add Node test-runner tests for correlation IDs, metadata-only logging, production-secret rejection, Azure endpoint validation, and readiness failure redaction.
- [x] Run `npm test` and confirm the tests fail because the runtime module does not exist.
- [x] Implement the smallest runtime module and environment validation that satisfies the tests.
- [x] Run `npm test` and confirm all tests pass.
- [x] Integrate trusted-proxy handling, request context, `/api/health`, and `/api/ready` into Express.
- [x] Use a non-root production container, deterministic `npm ci`, and a container health check.
- [x] Keep model errors bounded so provider responses cannot be copied into production error messages or logs.

## Workstream 4: Azure Documentation And Operations

**Files:**

- Create `docs/Starman-Azure-Architecture.md`.
- Create `docs/Starman-Azure-Deployment-Runbook.md`.
- Create `docs/Starman-Azure-Security-and-Residency-Checklist.md`.
- Modify `docs/Starman-Go-Live-Plan-30-Days.md`.
- Modify `docs/Starman-Canada-Data-Residency-Guide.md`.
- Modify `docs/MVP.md`.
- Modify `docs/README.md`.
- Modify `docs/PROJECT-MAP.md`.
- Modify `docs/INVENTORY.md`.
- Modify `starman-app/README.md`.
- Modify relevant source-folder README files.
- Modify the active prototype's Data Residency guidance only where it presents AWS as the current default.

**Steps:**

- [x] Document the selected Azure service mapping, data flows, trust boundaries, failure modes, and recovery posture.
- [x] Document prerequisite checks, non-production deployment commands, secret injection, migrations, smoke tests, rollback, backup restore, and production authorization gates.
- [x] Document PIPA/PIPEDA/Law 25 applicability as requirements for counsel and compliance confirmation rather than legal conclusions.
- [x] Document Entra ID as a separately approved migration and retain current JWT authentication until it is fully tested.
- [x] Document Microsoft 365, Outlook, Teams, and SharePoint as future integrations with separate consent, permission, retention, audit, and residency review.
- [x] Add a dated cost-estimation worksheet with low, expected, and high usage assumptions, but no invented Azure prices.

## Workstream 5: Verification

**Steps:**

- [x] Run Node tests and syntax checks for all changed JavaScript.
- [x] Run Prisma validation and generation using a synthetic local database URL.
- [x] Parse `docker-compose.yml` with an available YAML parser.
- [x] Build the Docker image when Docker is available; otherwise record the missing tool. Docker was unavailable on 2026-07-15, so no image build was claimed.
- [x] Build and lint Bicep with official Azure tooling when available; otherwise run structural checks and record the missing tool. Azure CLI was unavailable and the temporary standalone Bicep binary exited with code 137; module, path, parameter, region, and secret-default checks passed.
- [x] Confirm one active Starman HTML prototype and README coverage for all meaningful non-dependency folders.
- [x] Scan for secret patterns, real-client-data additions, unsafe global Azure OpenAI language, and active AWS deployment assumptions.
- [x] Confirm no Azure account was changed and no resource was provisioned.
- [x] Re-read `docs/PROJECT-MAP.md`, this plan, and the pilot gates before reporting completion.

## Authorization Required After Local Preparation

The following actions require a separate decision:

1. Choose the Azure subscription, tenant, billing owner, resource naming prefix, and budget alerts.
2. Confirm Azure Canada Central service availability, quotas, and Azure OpenAI regional deployment options in the intended subscription.
3. Approve network topology, recovery replication, retention periods, and customer-managed-key requirements.
4. Complete privacy, security, dealer, CCO, and legal review.
5. Authorize a non-production Bicep what-if and development deployment using synthetic data.
6. Complete restore testing, access testing, penetration/security review, and go/no-go approval before any real client information is introduced.
