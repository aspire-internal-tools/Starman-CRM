# Azure Infrastructure

Bicep foundation for the Starman Canadian pilot on Azure Container Apps. The templates prepare infrastructure only; they do not authorize resource creation or real-client-data use.

## Layout

| Path | Purpose |
|---|---|
| `main.bicep` | Subscription-scope composition, Canadian-region validation, naming, tags, and role assignments. |
| `modules/resource-group.bicep` | Tagged environment resource group created at subscription scope. |
| `modules/network.bicep` | VNet, delegated subnets, and private DNS zones. |
| `modules/monitoring.bicep` | Log Analytics and Application Insights. |
| `modules/registry.bicep` | Private Azure Container Registry configuration. |
| `modules/identity.bicep` | User-assigned managed identity for Starman. |
| `modules/key-vault.bicep` | Key Vault and private endpoint. |
| `modules/configuration-secrets.bicep` | Key Vault secrets supplied at deployment time. |
| `modules/storage.bicep` | Blob Storage, private containers, retention, and private endpoint. |
| `modules/postgresql.bicep` | PostgreSQL Flexible Server on a delegated private subnet. |
| `modules/container-environment.bicep` | VNet-integrated Container Apps environment. |
| `modules/container-app.bicep` | Starman app, health probes, revision mode, identity, and bounded scaling. |
| `modules/alerts.bicep` | Metadata-only Log Analytics alerts, disabled until a notification address is approved. |
| `parameters/` | Non-secret capacity settings for development, test, and production. |

## Safety Defaults

- Accepted locations are limited to `canadacentral` and `canadaeast`.
- The primary default is `canadacentral`; recovery replication is not enabled.
- `deployApplication` defaults to `false`, allowing shared infrastructure and an image to be prepared before the Container App is created.
- PostgreSQL, Blob Storage, and Key Vault use private networking.
- Blob containers are private, versioning is enabled, and soft deletion is configured.
- Registry anonymous/admin access is disabled. A pilot uses Standard SKU; automated retention, private endpoints, and enhanced scanning require separately approved capabilities such as Premium ACR and Microsoft Defender for Cloud.
- Alert rules are disabled until an approved notification address is supplied. Backup/restore alerting also requires the subscription Activity Log to be routed to the workspace and verified.
- Azure OpenAI is deliberately not provisioned. A Canadian regional deployment type, model, quota, privacy terms, and CCO/security approval must be confirmed first.

## Required Secret Inputs

The parameter files read secrets from the local process environment so values do not enter source control:

```bash
export STARMAN_POSTGRES_ADMIN_PASSWORD='use-a-generated-secret'
export STARMAN_JWT_SECRET='use-a-separate-generated-secret'
```

Do not use these example strings. Use an approved password generator and secret-handling process.

## Validation And Deployment

Install the official Azure CLI and Bicep tooling, then authenticate to the approved non-production subscription. Validation does not create resources:

```bash
az bicep build --file main.bicep
az deployment sub validate \
  --location canadacentral \
  --template-file main.bicep \
  --parameters parameters/dev.bicepparam
```

Run a what-if only after the Azure subscription, tenant, naming prefix, notification destination, budget, and network assumptions are approved:

```bash
az deployment sub what-if \
  --name starman-dev-preview \
  --location canadacentral \
  --template-file main.bicep \
  --parameters parameters/dev.bicepparam
```

No production deployment or real-client-data migration is authorized by this repository.
