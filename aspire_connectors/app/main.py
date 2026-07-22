"""FastAPI application — exposes every connector as an HTTP endpoint.

Run:  uvicorn app.main:app --reload
Docs: http://localhost:8000/docs
"""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from .config import get_settings
from .connectors import (
    AdvisorStreamConnector,
    CanadaLifeConnector,
    CsvConnector,
    DocuSignConnector,
    MetaLeadConnector,
    QuadrusConnector,
    WebhookConnector,
)
from .connectors.base import ConnectorDisabledError
from .models import ActivityType, EventType
from .security import require_api_key, verify_signature
from .storage import get_store

app = FastAPI(title="Aspire CRM Connectors", version="0.1.0")
store = get_store()

# --- connector singletons (share one store) -------------------------------- #
meta = MetaLeadConnector(store)
docusign = DocuSignConnector(store, simulate=True)
advisorstream = AdvisorStreamConnector(store)
csv_conn = CsvConnector(store)
canada_life = CanadaLifeConnector(store)
quadrus = QuadrusConnector(store)
hub = WebhookConnector(store)

# --- wire universal webhook event handlers --------------------------------- #
hub.on(EventType.LEAD_CREATED, lambda p: meta.ingest(p))
hub.on(EventType.ARTICLE_VIEWED, lambda p: advisorstream.receive_zapier_webhook(
    {**p, "activity_type": ActivityType.ARTICLE_VIEWED.value}))
hub.on(EventType.EMAIL_OPENED, lambda p: advisorstream.receive_zapier_webhook(
    {**p, "activity_type": ActivityType.NEWSLETTER_OPENED.value}))
hub.on(EventType.DOCUMENT_SIGNED, lambda p: docusign.apply_status_event(p["envelope_id"], "signed"))
hub.on(EventType.DOCUMENT_SENT, lambda p: docusign.apply_status_event(p["envelope_id"], "sent"))


# --------------------------------------------------------------------------- #
#  Overview
# --------------------------------------------------------------------------- #
@app.get("/")
def overview() -> dict:
    return {
        "service": "Aspire CRM Connectors",
        "connectors": [
            meta.info(), docusign.info(), advisorstream.info(),
            csv_conn.info(), hub.info(),
            canada_life.check_api_access_status(),
            quadrus.check_api_access_status(),
        ],
        "supported_webhook_events": hub.supported_events(),
        "counts": {
            "leads": len(store.leads),
            "activities": len(store.activities),
            "documents": len(store.documents),
            "events": len(store.events),
        },
    }


# --------------------------------------------------------------------------- #
#  Meta Lead Ads
# --------------------------------------------------------------------------- #
@app.get("/webhooks/meta/leads")
def meta_verify(
    mode: str = Query(default="", alias="hub.mode"),
    token: str = Query(default="", alias="hub.verify_token"),
    challenge: str = Query(default="", alias="hub.challenge"),
):
    """Meta subscription handshake — echoes hub.challenge when the token matches."""
    if mode == "subscribe" and token == get_settings().META_VERIFY_TOKEN:
        return PlainTextResponse(challenge)
    raise HTTPException(status_code=403, detail="Verification token mismatch")


@app.post("/webhooks/meta/leads", dependencies=[Depends(require_api_key)])
def meta_ingest(payload: dict):
    result = meta.ingest(payload)
    lead = result["lead"]
    return {"duplicate": result["duplicate"], "lead_id": lead.id,
            "status": lead.status, "email": lead.email}


# --------------------------------------------------------------------------- #
#  Universal webhook
# --------------------------------------------------------------------------- #
class WebhookEnvelope(BaseModel):
    event_type: str
    data: dict = {}
    source: str = "external"


@app.post("/webhooks/events", dependencies=[Depends(require_api_key)])
async def receive_event(request: Request, x_signature: Optional[str] = Header(default=None)):
    raw = await request.body()
    sig_ok = verify_signature(raw, x_signature)
    body = WebhookEnvelope.model_validate_json(raw)
    try:
        event = hub.receive(body.event_type, body.data, source=body.source, signature_valid=sig_ok)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {"event_id": event.id, "event_type": event.event_type,
            "processed": event.processed, "signature_valid": sig_ok}


@app.get("/webhooks/log", dependencies=[Depends(require_api_key)])
def webhook_log(limit: int = 100):
    return [e.model_dump(mode="json") for e in hub.activity_log(limit)]


# --------------------------------------------------------------------------- #
#  DocuSign
# --------------------------------------------------------------------------- #
class CreateEnvelope(BaseModel):
    document_name: str
    recipient_email: str


@app.post("/documents/envelopes", dependencies=[Depends(require_api_key)])
def create_envelope(body: CreateEnvelope):
    doc = docusign.create_envelope(body.document_name, body.recipient_email)
    return doc.model_dump(mode="json")


@app.post("/documents/envelopes/{envelope_id}/send", dependencies=[Depends(require_api_key)])
def send_envelope(envelope_id: str):
    return docusign.send_envelope(envelope_id).model_dump(mode="json")


@app.get("/documents/envelopes/{envelope_id}/status", dependencies=[Depends(require_api_key)])
def envelope_status(envelope_id: str):
    return {"envelope_id": envelope_id, "status": docusign.get_envelope_status(envelope_id)}


@app.get("/documents/envelopes/{envelope_id}/certificate", dependencies=[Depends(require_api_key)])
def envelope_certificate(envelope_id: str):
    return {"envelope_id": envelope_id,
            "certificate_path": docusign.download_certificate_of_completion(envelope_id)}


@app.post("/webhooks/docusign", dependencies=[Depends(require_api_key)])
def docusign_connect(payload: dict):
    """DocuSign Connect status push: {envelope_id, status}."""
    doc = docusign.apply_status_event(payload["envelope_id"], payload["status"])
    return doc.model_dump(mode="json")


# --------------------------------------------------------------------------- #
#  AdvisorStream
# --------------------------------------------------------------------------- #
@app.post("/advisorstream/import-csv", dependencies=[Depends(require_api_key)])
async def advisorstream_import(request: Request):
    csv_text = (await request.body()).decode("utf-8")
    created = advisorstream.import_csv_activity(csv_text)
    return {"imported": len(created), "notes": [a.note for a in created]}


@app.post("/webhooks/advisorstream/zapier", dependencies=[Depends(require_api_key)])
def advisorstream_zapier(payload: dict):
    act = advisorstream.receive_zapier_webhook(payload)
    return act.model_dump(mode="json")


@app.get("/advisorstream/sync", dependencies=[Depends(require_api_key)])
def advisorstream_sync(contact_email: Optional[str] = None):
    return advisorstream.sync_contact_activity(contact_email)


# --------------------------------------------------------------------------- #
#  CSV import / export
# --------------------------------------------------------------------------- #
@app.post("/csv/leads/import", dependencies=[Depends(require_api_key)])
async def csv_import(request: Request):
    csv_text = (await request.body()).decode("utf-8")
    return csv_conn.import_leads(csv_text)


@app.get("/csv/leads/export", response_class=PlainTextResponse,
         dependencies=[Depends(require_api_key)])
def csv_export_leads():
    return csv_conn.export_leads()


@app.get("/csv/activities/export", response_class=PlainTextResponse,
         dependencies=[Depends(require_api_key)])
def csv_export_activities():
    return csv_conn.export_activities()


# --------------------------------------------------------------------------- #
#  Locked connectors (read-only status)
# --------------------------------------------------------------------------- #
@app.get("/connectors/canada-life/status")
def canada_life_status():
    return canada_life.check_api_access_status()


@app.get("/connectors/quadrus/status")
def quadrus_status():
    return quadrus.check_api_access_status()


# --------------------------------------------------------------------------- #
#  Error mapping
# --------------------------------------------------------------------------- #
@app.exception_handler(ConnectorDisabledError)
async def _disabled_handler(_request: Request, exc: ConnectorDisabledError):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=423, content={"detail": str(exc)})  # 423 Locked
