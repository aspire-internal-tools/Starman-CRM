# FastAPI Application

Source code for the Aspire connector prototype.

## Files

| File/Folder | Purpose |
|---|---|
| `main.py` | FastAPI app and HTTP route wiring. |
| `models.py` | Canonical Pydantic schemas for leads, activities, documents, and webhook events. |
| `storage.py` | JSON-backed prototype persistence. |
| `security.py` | API-key and webhook signature validation. |
| `config.py` | Environment-driven settings. |
| `connectors/` | Connector implementations by provider/source. |

## Rules

- Keep Canada Life and Quadrus disabled unless official API access and compliance approval exist.
- Do not add portal scraping, password storage, or browser automation.
- Treat this as a prototype integration layer; production storage belongs in a real database.

