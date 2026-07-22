# Starman Azure Deployment Runbook

This runbook prepares a controlled Azure deployment. It does not authorize production provisioning or real-client-data use.

## 1. Approval And Access

Confirm all of the following before signing in to Azure for Starman:

- Approved Azure tenant, subscription, billing owner, naming prefix, budget, and Canada Central region.
- Named product owner, technical maintainer, privacy/compliance approver, and final decision-maker.
- Approved non-production scope using synthetic data.
- Azure CLI and current Bicep installed from Microsoft sources.
- Required resource providers approved and registered.
- Canada Central service availability and quota confirmed for Container Apps, PostgreSQL, Storage, Key Vault, monitoring, and ACR.
- Alert destination, retention periods, recovery assumptions, and administrator roles approved.
- Strong, separate PostgreSQL and JWT secrets created through the approved secret process.

## 2. Local Validation

From `starman-app/infra/`:

```bash
export STARMAN_POSTGRES_ADMIN_PASSWORD='value-from-approved-secret-process'
export STARMAN_JWT_SECRET='different-value-from-approved-secret-process'

az bicep build --file main.bicep
az deployment sub validate \
  --location canadacentral \
  --template-file main.bicep \
  --parameters parameters/dev.bicepparam
```

Do not place secret values in shell history, screenshots, tickets, source files, or deployment names. Prefer an approved secure automation environment for actual deployment.

## 3. What-If Review

Run only after explicit non-production authorization:

```bash
az deployment sub what-if \
  --name starman-dev-preview \
  --location canadacentral \
  --template-file main.bicep \
  --parameters parameters/dev.bicepparam
```

Review the output for:

- Canada Central locations only.
- No Azure OpenAI, global endpoint, external replication, public Blob container, public PostgreSQL access, or embedded secret.
- Expected resource names, tags, SKUs, network ranges, role assignments, retention, and deletion protection.
- `deployApplication=false` for the first infrastructure deployment.

Save the approved what-if result with the deployment change record; do not store secrets.

## 4. Foundation Deployment

After approval, deploy the development foundation with the application switch off:

```bash
az deployment sub create \
  --name starman-dev-foundation \
  --location canadacentral \
  --template-file main.bicep \
  --parameters parameters/dev.bicepparam
```

Record the generated resource group and registry outputs. Confirm Key Vault and PostgreSQL are private, Blob public access is disabled, and no unexpected resource exists.

## 5. Build And Push

Use the generated registry name from deployment output:

```bash
az acr build \
  --registry <approved-registry-name> \
  --image starman-server:pilot \
  ../server
```

Review the image scan or approved security scanner. Block deployment on critical vulnerabilities or embedded-secret findings.

## 6. Database Migration

Do not use `prisma db push --accept-data-loss` in Azure. Run the checked-in, reviewed Prisma migration process from an approved one-time job or secure operator session with private-network access:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
```

The current repository does not contain a Prisma migration history. Create and review migrations before the first Azure database deployment; this is a pilot blocker. Seed only synthetic test data in development and test.

## 7. Application Deployment

Set `deployApplication=true` and the approved image tag through an authorized parameter override, run another what-if, and deploy. The template derives the Container App origin from its generated domain, uses managed identity for ACR and Key Vault, and keeps model mode simulated.

```bash
az deployment sub what-if \
  --name starman-dev-app-preview \
  --location canadacentral \
  --template-file main.bicep \
  --parameters parameters/dev.bicepparam deployApplication=true imageTag=pilot

az deployment sub create \
  --name starman-dev-app \
  --location canadacentral \
  --template-file main.bicep \
  --parameters parameters/dev.bicepparam deployApplication=true imageTag=pilot
```

## 8. Smoke Test

Use synthetic data only:

1. Confirm `/api/health` returns `200` without dependency or environment details.
2. Confirm `/api/ready` returns `200` only when PostgreSQL is reachable.
3. Confirm HTTP redirects or rejects insecure access and the browser receives security headers.
4. Confirm login, logout, role restrictions, organization isolation, and rate limits.
5. Confirm logs contain correlation ID, method, path, status, and duration but no credentials, query strings, client content, transcripts, or tokens.
6. Confirm simulated model mode does not make external requests.
7. Confirm Key Vault, Storage, and PostgreSQL public network access is disabled.
8. Confirm backup settings and perform a synthetic database restore.

## 9. Azure OpenAI Enablement

Azure OpenAI is a separate gate. Before changing `AI_PROVIDER`:

- Verify the model and quota in the approved Canadian region.
- Verify the deployment is regional, not Global Standard or Global Batch.
- Confirm prompts, responses, processing, abuse monitoring, storage, logs, and support access against the firm's residency requirement and Microsoft terms.
- Complete privacy, security, CCO, dealer, and contractual approval.
- Add the endpoint and key through Key Vault and set `AI_DEPLOYMENT_TYPE=regional`.
- Test with synthetic records and confirm human approval remains mandatory.

## 10. Rollback And Recovery

- Application rollback: return Container Apps traffic to the last approved revision.
- Database rollback: do not reverse a destructive schema migration automatically; restore to a new server from an approved recovery point and validate before cutover.
- File recovery: restore a prior Blob version or soft-deleted item through an audited operator process.
- Region recovery: not available until Canada East replication and failover are separately designed, approved, deployed, and tested.
- Incident response: revoke affected credentials, isolate the revision, preserve logs, notify the privacy/compliance owner, assess reporting obligations, and document every action.

## Production Gate

Production and real client information remain prohibited until the checklist in `Starman-Azure-Security-and-Residency-Checklist.md` is signed off and a restore exercise, access test, synthetic UAT, security review, and formal go/no-go decision are complete.

