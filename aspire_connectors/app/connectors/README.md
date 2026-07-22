# Connectors

Provider/source-specific connector implementations for the Aspire connector layer.

## Files

| File | Purpose |
|---|---|
| `base.py` | Shared connector base classes and disabled-connector error. |
| `meta_lead.py` | Meta lead form ingestion. |
| `advisorstream.py` | AdvisorStream engagement import and follow-up creation. |
| `webhook.py` | Universal webhook events. |
| `csv_io.py` | CSV import/export helpers. |
| `docusign.py` | DocuSign simulation/stub. |
| `canada_life.py` | Locked Canada Life placeholder. |
| `quadrus.py` | Locked Quadrus placeholder. |

## Rules

- Enabled connectors may accept API/webhook/CSV data.
- Locked connectors must remain inert and raise `ConnectorDisabledError` for sync attempts.
- No screen scraping, credential capture, or portal automation.

