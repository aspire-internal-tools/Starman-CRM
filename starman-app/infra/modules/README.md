# Azure Bicep Modules

Focused resource modules composed by `../main.bicep`.

## Rules

- Keep modules environment-neutral; environment choices belong in `../parameters/` and `../main.bicep`.
- Accept region, names, tags, identities, and capacities through explicit parameters.
- Never embed credentials, client information, subscription identifiers, or personal email addresses.
- Keep Azure OpenAI outside this foundation until regional deployment, model, quota, contract, and approval evidence exists.
- Validate every module with official Bicep tooling before an authorized what-if or deployment.

The resource modules cover networking, monitoring, registry, managed identity, Key Vault, secrets, Blob Storage, PostgreSQL, Container Apps, and alerts.

