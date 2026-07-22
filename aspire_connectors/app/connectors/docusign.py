"""DocuSignConnector — e-signature envelopes.

The DocuSign eSignature REST API is wired through these four methods. Until real
OAuth credentials (integration key + JWT/consent) are configured, the methods
run in SIMULATION mode: they manage the CRM-side document record and its status
lifecycle without calling DocuSign. Flip `simulate=False` once creds exist and
fill in the marked TODO blocks with the official SDK calls.

CRM document fields tracked: envelope_id, document_name, sent_date,
viewed_date, signed_date, status (sent | viewed | signed | declined | expired).
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from uuid import uuid4

from ..models import CrmDocument, DocumentStatus
from .base import BaseConnector


def _now() -> datetime:
    return datetime.now(timezone.utc)


class DocuSignConnector(BaseConnector):
    name = "docusign"

    def __init__(self, store=None, simulate: bool = True) -> None:
        super().__init__(store)
        self.simulate = simulate
        self.status = "simulation" if simulate else "live"

    # --- 1. create ----------------------------------------------------------
    def create_envelope(self, document_name: str, recipient_email: str) -> CrmDocument:
        """Create a draft envelope and persist the CRM document record."""
        self._guard()
        envelope_id = f"env_{uuid4().hex[:16]}"
        # TODO(live): EnvelopesApi.create_envelope(account_id, envelope_definition)
        #   with status="created"; capture the returned envelopeId.
        doc = CrmDocument(
            envelope_id=envelope_id,
            document_name=document_name,
            recipient_email=recipient_email.strip().lower(),
            status=DocumentStatus.SENT,  # provisional; finalised in send_envelope
        )
        return self.store.upsert_document(doc)

    # --- 2. send ------------------------------------------------------------
    def send_envelope(self, envelope_id: str) -> CrmDocument:
        """Transition a draft envelope to SENT and stamp sent_date."""
        self._guard()
        doc = self.store.get_document(envelope_id)
        if not doc:
            raise KeyError(f"Unknown envelope_id {envelope_id}")
        # TODO(live): EnvelopesApi.update(..., status="sent")
        doc.status = DocumentStatus.SENT
        doc.sent_date = _now()
        return self.store.upsert_document(doc)

    # --- 3. status ----------------------------------------------------------
    def get_envelope_status(self, envelope_id: str) -> DocumentStatus:
        """Return the current status. Live mode polls DocuSign; sim reads CRM."""
        self._guard()
        doc = self.store.get_document(envelope_id)
        if not doc:
            raise KeyError(f"Unknown envelope_id {envelope_id}")
        # TODO(live): EnvelopesApi.get_envelope(account_id, envelope_id).status
        return doc.status

    # --- 4. certificate -----------------------------------------------------
    def download_certificate_of_completion(self, envelope_id: str) -> str:
        """Download the Certificate of Completion PDF; return its local path."""
        self._guard()
        doc = self.store.get_document(envelope_id)
        if not doc:
            raise KeyError(f"Unknown envelope_id {envelope_id}")
        if doc.status != DocumentStatus.SIGNED:
            raise ValueError("Certificate available only for SIGNED envelopes")
        # TODO(live): EnvelopesApi.get_document(account_id, envelope_id, "certificate")
        certs_dir = os.path.join(self.store.data_dir, "certificates")
        os.makedirs(certs_dir, exist_ok=True)
        path = os.path.join(certs_dir, f"{envelope_id}_certificate.pdf")
        if self.simulate and not os.path.exists(path):
            # Write a minimal valid PDF placeholder so the path resolves in demos.
            with open(path, "wb") as fh:
                fh.write(b"%PDF-1.4\n% Aspire DocuSign simulation certificate\n%%EOF\n")
        doc.certificate_path = path
        self.store.upsert_document(doc)
        return path

    # --- webhook (DocuSign Connect) ----------------------------------------
    def apply_status_event(self, envelope_id: str, new_status: str) -> CrmDocument:
        """Apply a status push from DocuSign Connect, stamping the right date."""
        self._guard()
        doc = self.store.get_document(envelope_id)
        if not doc:
            raise KeyError(f"Unknown envelope_id {envelope_id}")
        status = DocumentStatus(new_status.lower())
        doc.status = status
        if status == DocumentStatus.VIEWED and not doc.viewed_date:
            doc.viewed_date = _now()
        elif status == DocumentStatus.SIGNED and not doc.signed_date:
            doc.signed_date = _now()
        return self.store.upsert_document(doc)
