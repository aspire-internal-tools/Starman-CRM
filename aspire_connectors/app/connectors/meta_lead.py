"""MetaLeadConnector — ingest leads from Meta (Facebook/Instagram) Lead Ads.

Meta delivers leads two ways:
  * directly to a subscribed webhook (`field_data` array), or
  * via an automation tool (Zapier/Make) that flattens the form into JSON.

`ingest()` accepts either shape, normalises to the CRM `Lead` schema, runs the
email/phone duplicate check, and sets status = NEW on first sight.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from ..models import Lead, LeadSource, LeadStatus
from .base import BaseConnector

# Maps common Meta/automation field keys -> our canonical Lead fields.
_FIELD_ALIASES = {
    "campaign_name": "campaign_name",
    "campaign": "campaign_name",
    "adset_name": "ad_set_name",
    "ad_set_name": "ad_set_name",
    "form_name": "form_name",
    "full_name": "name",
    "name": "name",
    "email": "email",
    "phone_number": "phone",
    "phone": "phone",
    "consent": "consent",
}
_CONSENT_TRUE = {"true", "yes", "1", "on", "checked", "i consent", "consent"}


class MetaLeadConnector(BaseConnector):
    name = "meta_lead"
    status = "enabled"

    # --- parsing ------------------------------------------------------------
    @staticmethod
    def _flatten_field_data(payload: dict[str, Any]) -> dict[str, Any]:
        """Meta's native shape: {"field_data": [{"name": k, "values": [v]}]}."""
        flat: dict[str, Any] = {}
        for item in payload.get("field_data", []) or []:
            key = (item.get("name") or "").lower()
            values = item.get("values") or []
            flat[key] = values[0] if values else None
        return flat

    @classmethod
    def normalize(cls, payload: dict[str, Any]) -> Lead:
        raw = dict(payload)
        if "field_data" in raw:
            raw = {**raw, **cls._flatten_field_data(raw)}

        mapped: dict[str, Any] = {}
        for key, value in raw.items():
            canonical = _FIELD_ALIASES.get(key.lower())
            if canonical:
                mapped[canonical] = value

        # Consent checkbox -> bool
        consent_raw = str(mapped.get("consent", "")).strip().lower()
        mapped["consent"] = consent_raw in _CONSENT_TRUE

        # Submitted time
        submitted = raw.get("created_time") or raw.get("submitted_time")
        if submitted:
            try:
                mapped["submitted_time"] = (
                    datetime.fromtimestamp(int(submitted))
                    if str(submitted).isdigit()
                    else datetime.fromisoformat(str(submitted).replace("Z", "+00:00"))
                )
            except (ValueError, OSError):
                mapped["submitted_time"] = None

        return Lead(source=LeadSource.META, status=LeadStatus.NEW, **mapped)

    # --- ingest -------------------------------------------------------------
    def ingest(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Returns {'lead': Lead, 'duplicate': bool}. Idempotent on email/phone."""
        self._guard()
        lead = self.normalize(payload)

        existing = self.store.find_lead_by_contact(lead.email, lead.phone_digits)
        if existing:
            # Don't create a second record; surface the match instead.
            return {"lead": existing, "duplicate": True}

        self.store.add_lead(lead)
        return {"lead": lead, "duplicate": False}
