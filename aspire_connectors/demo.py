"""End-to-end demo + smoke test for the Aspire connector layer.

Runs against the FastAPI app in-process via TestClient (no server needed).
Exercises every connector and asserts the key behaviours:
  * Meta lead ingest + email/phone dedup + status=new
  * API-key auth (401 without key)
  * Universal webhook event validation + activity log + signature flag
  * DocuSign envelope lifecycle (create -> send -> sign -> certificate)
  * AdvisorStream CSV import -> CRM notes
  * CSV import (with dedup) + export
  * Canada Life / Quadrus hard-disabled guards (no network)

Run:  python demo.py
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import tempfile

# Use an isolated temp data dir so the demo never pollutes real data.
os.environ.setdefault("ASPIRE_DATA_DIR", tempfile.mkdtemp(prefix="aspire_demo_"))

from fastapi.testclient import TestClient  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.connectors import CanadaLifeConnector, QuadrusConnector  # noqa: E402
from app.connectors.base import ConnectorDisabledError  # noqa: E402
from app.main import app  # noqa: E402

settings = get_settings()
client = TestClient(app)
H = {"X-API-Key": settings.API_KEY}
SAMPLES = os.path.join(os.path.dirname(__file__), "sample_data")


def check(label: str, cond: bool) -> None:
    print(f"  [{'PASS' if cond else 'FAIL'}] {label}")
    assert cond, label


print("\n=== 1. Meta Lead Ads ===")
lead = json.load(open(os.path.join(SAMPLES, "meta_lead.json")))
r = client.post("/webhooks/meta/leads", json=lead, headers=H).json()
check("lead created with status=new", r["status"] == "new" and r["duplicate"] is False)
check("email normalised lowercase", r["email"] == "p.nguyen@example.ca")
# same person, different phone formatting + uppercase email -> duplicate
dup_payload = {"field_data": [
    {"name": "full_name", "values": ["Patricia N."]},
    {"name": "email", "values": ["P.Nguyen@Example.CA"]},
]}
r2 = client.post("/webhooks/meta/leads", json=dup_payload, headers=H).json()
check("duplicate detected by email", r2["duplicate"] is True)

print("\n=== 2. Auth ===")
no_key = client.post("/webhooks/meta/leads", json=lead)
check("401 without API key", no_key.status_code == 401)
verify = client.get("/webhooks/meta/leads", params={
    "hub.mode": "subscribe", "hub.verify_token": settings.META_VERIFY_TOKEN,
    "hub.challenge": "abc123"})
check("Meta verify echoes challenge", verify.text == "abc123")

print("\n=== 3. Universal webhook ===")
body = json.dumps({"event_type": "meeting.booked", "data": {"contact": "p.nguyen@example.ca"},
                   "source": "calendly"}).encode()
sig = hmac.new(settings.WEBHOOK_SIGNING_SECRET.encode(), body, hashlib.sha256).hexdigest()
ev = client.post("/webhooks/events", content=body,
                 headers={**H, "X-Signature": sig, "Content-Type": "application/json"}).json()
check("valid event accepted", ev["processed"] in (True, False) and ev["event_type"] == "meeting.booked")
check("signature verified", ev["signature_valid"] is True)
bad = client.post("/webhooks/events", json={"event_type": "not.a.real.event", "data": {}}, headers=H)
check("422 on unsupported event type", bad.status_code == 422)
log = client.get("/webhooks/log", headers=H).json()
check("event written to activity log", any(e["event_type"] == "meeting.booked" for e in log))

print("\n=== 4. DocuSign envelope lifecycle ===")
env = client.post("/documents/envelopes", json={
    "document_name": "KYC Update Form", "recipient_email": "rchen@example.ca"}, headers=H).json()
eid = env["envelope_id"]
client.post(f"/documents/envelopes/{eid}/send", headers=H)
client.post("/webhooks/docusign", json={"envelope_id": eid, "status": "viewed"}, headers=H)
signed = client.post("/webhooks/docusign", json={"envelope_id": eid, "status": "signed"}, headers=H).json()
check("status progresses to signed", signed["status"] == "signed")
check("viewed_date stamped", signed["viewed_date"] is not None)
cert = client.get(f"/documents/envelopes/{eid}/certificate", headers=H).json()
check("certificate path returned", cert["certificate_path"].endswith(".pdf") and os.path.exists(cert["certificate_path"]))

print("\n=== 5. AdvisorStream CSV -> CRM notes ===")
csv_text = open(os.path.join(SAMPLES, "advisorstream_activity.csv")).read()
asr = client.post("/advisorstream/import-csv", content=csv_text,
                  headers={**H, "Content-Type": "text/csv"}).json()
check("4 activities imported", asr["imported"] == 4)
check('builds "Viewed article about ..." note',
      any("Retirement Income" in n for n in asr["notes"]))
print("        e.g. ->", asr["notes"][0])
sync = client.get("/advisorstream/sync", headers=H).json()
check("future API sync is inert placeholder", sync["status"] == "not_available")

print("\n=== 6. CSV import / export ===")
csv_leads = ("name,email,phone,campaign,consent\n"
             "Alex Roy,alex.roy@example.ca,780-555-0001,Web Form,yes\n"
             "Patricia Nguyen,p.nguyen@example.ca,780-555-0911,Dup Test,yes\n")  # dup of Meta lead
imp = client.post("/csv/leads/import", content=csv_leads,
                  headers={**H, "Content-Type": "text/csv"}).json()
check("1 imported, 1 duplicate", imp["imported"] == 1 and imp["duplicates"] == 1)
export = client.get("/csv/leads/export", headers=H).text
check("export contains header + rows", export.startswith("id,source") and "alex.roy@example.ca" in export)

print("\n=== 7. Locked connectors (compliance) ===")
cl = client.get("/connectors/canada-life/status").json()
check("Canada Life disable_until_approved", cl["status"] == "disable_until_approved" and cl["enabled"] is False)
q = client.get("/connectors/quadrus/status").json()
check("Quadrus disabled_until_official_api_confirmed",
      q["status"] == "disabled_until_official_api_confirmed" and q["enabled"] is False)
# Direct method calls must refuse — proves no network path is reachable.
for conn, method in [(CanadaLifeConnector(), "sync_approved_policy_data"),
                     (QuadrusConnector(), "sync_approved_client_list")]:
    try:
        getattr(conn, method)()
        check(f"{conn.name}.{method} blocked", False)
    except ConnectorDisabledError:
        check(f"{conn.name}.{method} raises ConnectorDisabledError", True)

print("\n=== Overview ===")
print(json.dumps(client.get("/").json()["counts"], indent=2))
print("\nAll checks passed.\n")
