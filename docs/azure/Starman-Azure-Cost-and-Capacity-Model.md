# Starman Azure Cost And Capacity Model

**Pricing date:** 2026-07-15  
**Target region:** Canada Central  
**Currency:** CAD  
**Status:** Input worksheet; current prices and subscription discounts must be entered in the Azure Pricing Calculator before approval.

Azure prices vary by region, agreement, currency conversion, reservations, and date. This document deliberately contains no fixed monthly price claim. Save a dated Azure Pricing Calculator estimate with the approval record.

## Usage Scenarios

| Assumption | Low: technical pilot | Expected: advisor pilot | High: expanded pilot |
|---|---:|---:|---:|
| Active advisors | 2 | 11 | 15 |
| Workdays per month | 20 | 22 | 22 |
| Application requests per day | 100 | 1,000 | 5,000 |
| Container minimum replicas | 0 | 1 | 2 |
| Container maximum replicas | 2 | 3 | 6 |
| CPU / memory per replica | 0.5 / 1 GiB | 0.5 / 1 GiB | 1 / 2 GiB |
| PostgreSQL compute | Burstable B1ms | Burstable or approved 2-vCore tier | General Purpose 2-vCore tier |
| PostgreSQL provisioned storage | 32 GiB | 32 GiB | 64 GiB |
| PostgreSQL backup retention | 7 days | 14 days | 35 days |
| Client file storage | 10 GiB | 100 GiB | 500 GiB |
| Blob write/read operations | 5k / 20k monthly | 50k / 200k monthly | 250k / 1M monthly |
| Log ingestion | 1 GiB monthly | 5 GiB monthly | 20 GiB monthly |
| Internet egress | 1 GiB monthly | 10 GiB monthly | 50 GiB monthly |
| Model mode | Simulated | Regional Azure OpenAI, usage estimated below | Regional Azure OpenAI, usage estimated below |
| Input model tokens | 0 | 5 million monthly | 25 million monthly |
| Output model tokens | 0 | 1 million monthly | 5 million monthly |

These are planning assumptions, not measured production demand. Replace them with observed synthetic-pilot metrics before production sizing.

## Calculator Line Items

| Service | Inputs to record | Cost drivers and cautions |
|---|---|---|
| Azure Container Apps | Consumption plan, replicas, vCPU-seconds, GiB-seconds, requests | Scale-to-zero lowers technical-pilot cost; a production minimum of two replicas increases availability and idle usage. |
| Azure Container Registry | Standard SKU, image storage, build minutes, retention | Standard is the pilot default. Premium is required if a private registry endpoint is approved. |
| PostgreSQL Flexible Server | Region, tier/SKU, hours, storage, IOPS, backup retention, HA | Database compute is likely the largest fixed infrastructure line. Geo-redundant backup is disabled until approved. |
| Blob Storage | Standard ZRS, hot tier, capacity, operations, versioning, soft-deleted data | Versions and soft deletion increase retained capacity. Model realistic document sizes and retention. |
| Key Vault | Secret operations, optional HSM/customer-managed keys, private endpoint | Customer-managed keys may add Key Vault and operational cost. |
| Log Analytics/Application Insights | Ingestion, retention, queries, alerts | Prevent payload logging; lower data volume is both safer and less expensive. |
| Bandwidth/private networking | Internet egress, private endpoints, DNS, optional firewall | Private endpoints and future centralized egress controls add recurring charges. |
| Azure OpenAI | Exact regional model/version, input/output tokens, provisioned or standard deployment | Enter only a model and regional deployment type verified in the intended subscription. Do not price a global deployment for client data. |
| Backup/recovery | PostgreSQL backup beyond included allowance, retained Blob versions, future Canada East design | Recovery cost depends on approved retention and recovery objectives. |

## Estimation Procedure

1. Sign in to the Azure Pricing Calculator under the intended Aspire offer.
2. Select Canada Central and CAD for every regional service.
3. Build separate low, expected, and high estimates from the table above.
4. Record the exact SKU, quantity, unit, monthly subtotal, tax treatment, support plan, offer/discount, and estimate URL or exported file.
5. Add a contingency line approved by the budget owner for logging growth, retained file versions, model usage, and private networking.
6. Compare the estimate to Azure Cost Management budgets after deployment using synthetic data.
7. Re-estimate before enabling Azure OpenAI, production minimum replicas, high availability, Premium ACR, customer-managed keys, or Canada East recovery.

## Approval Record

| Field | Required value |
|---|---|
| Estimate owner | Named person |
| Azure subscription and offer | Approved identifier, no secrets |
| Calculator date | Date rates were captured |
| Low monthly estimate | Dated calculator output |
| Expected monthly estimate | Dated calculator output |
| High monthly estimate | Dated calculator output |
| Budget and alert thresholds | Approved CAD amounts |
| Included Azure support | Plan and owner |
| Model and deployment type | Verified Canadian regional option or simulated |
| Approval | Business owner and date |

## Official Pricing References

- Azure Pricing Calculator: https://azure.microsoft.com/pricing/calculator/
- Azure Container Apps pricing: https://azure.microsoft.com/pricing/details/container-apps/
- PostgreSQL Flexible Server pricing: https://azure.microsoft.com/pricing/details/postgresql/flexible-server/
- Azure OpenAI pricing: https://azure.microsoft.com/pricing/details/azure-openai/
- Azure Blob Storage pricing: https://azure.microsoft.com/pricing/details/storage/blobs/
- Azure Monitor pricing: https://azure.microsoft.com/pricing/details/monitor/
- Azure Key Vault pricing: https://azure.microsoft.com/pricing/details/key-vault/
- Azure Container Registry pricing: https://azure.microsoft.com/pricing/details/container-registry/

