# Starman Azure Security And Residency Checklist

**Use:** Evidence checklist for a controlled Starman pilot. Hosting in Canada does not, by itself, establish compliance. Record the approver, date, evidence location, and exceptions for every completed item.

## Ownership And Scope

- [ ] Product owner, technical maintainer, privacy/compliance approver, final decision-maker, and support contact are named.
- [ ] Pilot users, modules, data classes, prohibited uses, support hours, and exit criteria are approved.
- [ ] System-of-record status and reconciliation responsibilities are documented.
- [ ] Only synthetic data is permitted until the real-client-data gate is signed.

## Privacy And Records

- [ ] Alberta PIPA applicability and applicable PIPEDA obligations are reviewed by qualified counsel/compliance.
- [ ] Quebec Law 25 requirements are assessed where relevant.
- [ ] Collection purposes, meaningful consent, AI processing disclosure, data minimization, and client access/correction procedures are approved.
- [ ] Record retention, legal hold, deletion, export, and secure-disposal schedules are approved by record type.
- [ ] Books-and-records, supervision, suitability, CIRO/dealer, insurance, and audit requirements are documented.
- [ ] Microsoft and other subprocessors, support access, contractual terms, breach terms, and transfer paths are approved.

## Azure Foundation

- [ ] Tenant, subscription, billing owner, Azure Policy, resource providers, quotas, and Canada Central service availability are confirmed.
- [ ] Resource locations, tags, names, budgets, and cost alerts are approved.
- [ ] PostgreSQL, Blob Storage, Key Vault, logs, keys, and backups are verified in approved Canadian regions.
- [ ] Canada East replication is disabled unless a separately approved recovery record authorizes it.
- [ ] Public PostgreSQL, Blob, and Key Vault access is disabled and private DNS is tested.
- [ ] ACR admin and anonymous access are disabled; the Standard-SKU public endpoint exception is approved or Premium/private endpoint is selected.
- [ ] TLS, certificates, DNS, ingress, outbound network paths, and firewall rules are tested.

## Identity And Access

- [ ] Least-privilege Azure RBAC assignments are reviewed; standing Owner/Contributor access is minimized.
- [ ] Managed identities are used for ACR pull, Key Vault reads, and Blob access.
- [ ] Application roles and organization-scoped access are tested with positive and negative cases.
- [ ] MFA and conditional-access requirements are approved for administrators and pilot users.
- [ ] Current JWT authentication has an approved interim risk record; Entra ID migration is separately scoped.
- [ ] Emergency access, joiner/mover/leaver, access review, and credential rotation procedures are tested.

## Application And Data Security

- [ ] Production configuration rejects default JWT secrets, non-TLS PostgreSQL, direct OpenAI processing, and unmarked Azure regional model configuration.
- [ ] Password hashing, session duration, secure headers, CORS, rate limits, input validation, and error redaction are tested.
- [ ] Every business query remains organization-scoped and every mutation writes the required audit record.
- [ ] Documents use private server-mediated access or short-lived authorization; permanent public links are prohibited.
- [ ] Duplicate names do not overwrite files; upload, assignment, rename, category, note, download, and deletion events are audited.
- [ ] Dependency, container image, secret, static-code, and vulnerability scans meet the approved threshold.
- [ ] Canada Life and Quadrus remain locked without official APIs and dealer/compliance approval; no screen scraping or portal credential storage exists.

## Logging And Monitoring

- [ ] Logs contain correlation IDs and operational metadata only; credentials, tokens, client content, query strings, document text, KYC, and transcripts are absent.
- [ ] Log Analytics and Application Insights access and retention are approved.
- [ ] Alert recipients and escalation paths are approved and tested.
- [ ] Authentication failures, application errors, anomalous access, backup failures, capacity, certificate expiry, and Azure service health are monitored.
- [ ] Audit records are protected against ordinary user modification or deletion and can be exported for review.

## Azure OpenAI

- [ ] Selected model, version, quota, and availability are verified in the approved Canadian region.
- [ ] Deployment type is verified as regional. Global Standard and Global Batch are prohibited for client information.
- [ ] Prompt, response, inference, storage, abuse-monitoring, logging, support, and subprocessor locations are documented from current Microsoft terms.
- [ ] Endpoint and key are server-side in Key Vault; the browser cannot access them.
- [ ] Synthetic tests confirm model context is organization-scoped, bounded, and not logged.
- [ ] Outputs remain drafts or decision support and require licensed-advisor review.
- [ ] The model cannot send communications, execute transactions, recommend products/trades, or mutate KYC, beneficiary, ownership, suitability, or account records automatically.

## Backup, Recovery, And Incident Response

- [ ] PostgreSQL point-in-time backup and Blob version/soft-delete settings are confirmed.
- [ ] A synthetic database restore and file recovery are completed and evidenced.
- [ ] Approved recovery-time and recovery-point objectives are recorded.
- [ ] Container revision rollback and database migration recovery are rehearsed.
- [ ] Privacy/security incident detection, containment, evidence preservation, assessment, notification, and post-incident review are rehearsed.

## Go/No-Go

- [ ] Staff acceptance tests pass with synthetic data and defects are resolved or formally accepted.
- [ ] Security, privacy, CCO, dealer, legal, technical, and business owners sign the evidence record.
- [ ] Backup/restore, access isolation, logging redaction, and regional-processing evidence are current.
- [ ] Final go/no-go decision explicitly states whether real client information is authorized and under what limits.

