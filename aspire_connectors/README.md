# Aspire CRM — Connector Layer

FastAPI scaffold for pushing data into the Aspire CRM from external platforms.
Working endpoints for Meta, DocuSign, AdvisorStream, a universal webhook hub, and
CSV import/export — plus **hard-disabled** compliance placeholders for Canada Life
and Quadrus.

## Run

```bash
cd aspire_connectors
pip install -r requirements.txt
uvicorn app.main:app --reload      # http://localhost:8000/docs
python demo.py                     # in-process end-to-end smoke test (no server)
```

Storage is a JSON-backed store under `data/` — swap `app/storage.py` for a real DB later.

## Auth

All write endpoints require header `X-API-Key` (default `demo-key-change-me`, set
`ASPIRE_API_KEY`). The universal webhook also validates an optional HMAC
`X-Signature` (hex SHA-256 of the raw body, secret `ASPIRE_WEBHOOK_SECRET`).

## Connectors

| Connector | Status | Key methods / endpoints |
|---|---|---|
| **MetaLeadConnector** | enabled | `GET/POST /webhooks/meta/leads` — verify handshake + ingest. Dedup by email/phone, status=`new`. |
| **WebhookConnector** | enabled | `POST /webhooks/events`, `GET /webhooks/log`. Event types: `lead.created`, `lead.updated`, `email.opened`, `article.viewed`, `document.sent`, `document.signed`, `meeting.booked`. |
| **DocuSignConnector** | simulation | `create_envelope` · `send_envelope` · `get_envelope_status` · `download_certificate_of_completion`. Tracks envelope_id, document_name, sent/viewed/signed dates, status. |
| **AdvisorStreamConnector** | csv + zapier | `import_csv_activity` · `receive_zapier_webhook` · `sync_contact_activity` (future API stub). Builds CRM notes like *"Viewed article about Retirement Income"*. |
| **CsvConnector** | enabled | `POST /csv/leads/import`, `GET /csv/leads/export`, `GET /csv/activities/export`. |
| **CanadaLifeConnector** | 🔒 `disable_until_approved` | `check_api_access_status` only. No network, no scraping, no stored account/policy numbers or holdings. All syncs raise `ConnectorDisabledError`. |
| **QuadrusConnector** | 🔒 `disabled_until_official_api_confirmed` | `check_api_access_status` only. No portal scraping, no login automation, no holdings/KYC import. All syncs raise `ConnectorDisabledError`. |

## Compliance note

Canada Life and Quadrus are intentionally inert. The disabled flag is set in code
(not an env toggle) so the locked connectors cannot be switched on by configuration
alone — enabling them is a deliberate code change to be made only after official API
access and compliance sign-off. The `demo.py` suite asserts these guards hold.

## Layout

```
app/
  config.py        settings & secrets (env-driven)
  models.py        canonical CRM schemas (Lead, Activity, CrmDocument, WebhookEvent)
  storage.py       JSON-backed store
  security.py      API-key + HMAC signature
  main.py          FastAPI app wiring every connector to HTTP
  connectors/      one module per connector
demo.py            end-to-end smoke test (21 assertions)
sample_data/       example Meta lead + AdvisorStream CSV
```

Additional README files in `app/`, `app/connectors/`, and `sample_data/` describe each folder's
responsibility and guardrails.
