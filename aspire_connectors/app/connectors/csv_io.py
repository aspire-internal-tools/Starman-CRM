"""CsvConnector — generic CSV import/export for core CRM records.

Import maps arbitrary CSV headers onto the canonical Lead schema (with the same
email/phone duplicate check used everywhere else). Export serialises leads or
activities back out for backups, spreadsheets, or migration.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any

from ..models import Lead, LeadSource, LeadStatus
from .base import BaseConnector

# Friendly header aliases -> canonical Lead fields.
_LEAD_HEADERS = {
    "name": "name", "full name": "name", "full_name": "name",
    "email": "email", "email address": "email",
    "phone": "phone", "phone number": "phone", "mobile": "phone",
    "campaign": "campaign_name", "campaign name": "campaign_name", "campaign_name": "campaign_name",
    "ad set": "ad_set_name", "ad set name": "ad_set_name", "ad_set_name": "ad_set_name",
    "form": "form_name", "form name": "form_name", "form_name": "form_name",
    "consent": "consent",
    "status": "status",
}
_CONSENT_TRUE = {"true", "yes", "1", "on", "checked"}


class CsvConnector(BaseConnector):
    name = "csv"
    status = "enabled"

    # --- import -------------------------------------------------------------
    def import_leads(self, csv_text: str) -> dict[str, Any]:
        """Import leads from CSV. Returns counts + the imported/duplicate ids."""
        self._guard()
        reader = csv.DictReader(io.StringIO(csv_text))
        imported, duplicates, skipped = [], [], 0

        for row in reader:
            mapped: dict[str, Any] = {}
            for header, value in row.items():
                canonical = _LEAD_HEADERS.get((header or "").strip().lower())
                if canonical:
                    mapped[canonical] = value.strip() if isinstance(value, str) else value

            if not (mapped.get("email") or mapped.get("phone")):
                skipped += 1
                continue

            if "consent" in mapped:
                mapped["consent"] = str(mapped["consent"]).strip().lower() in _CONSENT_TRUE
            mapped.setdefault("status", LeadStatus.NEW.value)

            lead = Lead(source=LeadSource.CSV, **mapped)
            dup = self.store.find_lead_by_contact(lead.email, lead.phone_digits)
            if dup:
                duplicates.append(dup.id)
            else:
                self.store.add_lead(lead)
                imported.append(lead.id)

        return {
            "imported": len(imported),
            "duplicates": len(duplicates),
            "skipped_no_contact": skipped,
            "imported_ids": imported,
            "duplicate_ids": duplicates,
        }

    # --- export -------------------------------------------------------------
    def export_leads(self) -> str:
        cols = ["id", "source", "campaign_name", "ad_set_name", "form_name",
                "submitted_time", "name", "email", "phone", "consent", "status",
                "created_at"]
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        for lead in self.store.leads:
            row = lead.model_dump(mode="json")
            writer.writerow({c: row.get(c, "") for c in cols})
        return buf.getvalue()

    def export_activities(self) -> str:
        cols = ["id", "contact_email", "activity_type", "article_title",
                "article_category", "occurred_at", "note", "source"]
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        for act in self.store.activities:
            writer.writerow({c: act.model_dump(mode="json").get(c, "") for c in cols})
        return buf.getvalue()
