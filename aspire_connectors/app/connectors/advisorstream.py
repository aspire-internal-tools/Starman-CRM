"""AdvisorStreamConnector — content-engagement activity into the CRM.

AdvisorStream (newsletters / article library) does not expose a broad public
API today, so this connector supports three ingestion paths:

  * import_csv_activity(...)    — bulk CSV export upload (works now)
  * receive_zapier_webhook(...) — per-event push via Zapier (works now)
  * sync_contact_activity(...)  — placeholder for a future official API pull

Every path produces a CRM note such as: "Viewed article about Retirement Income".

Activity fields: contact_email, newsletter_opened / article_viewed,
article_title, article_category, date/time.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any

from ..models import Activity, ActivityType
from .base import BaseConnector


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%m/%d/%Y %H:%M", "%m/%d/%Y"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


class AdvisorStreamConnector(BaseConnector):
    name = "advisorstream"
    status = "enabled (csv + zapier; api pending)"

    # --- note builder -------------------------------------------------------
    @staticmethod
    def build_note(activity_type: ActivityType, title: str | None, category: str | None) -> str:
        if activity_type == ActivityType.ARTICLE_VIEWED:
            subject = title or category or "an article"
            if category and title:
                return f'Viewed article "{title}" about {category}'
            return f"Viewed article about {subject}"
        # newsletter opened
        return f"Opened newsletter{f' — {title}' if title else ''}"

    def _record(self, row: dict[str, Any]) -> Activity:
        raw_type = (row.get("activity_type") or row.get("type") or "").strip().lower()
        if "newsletter" in raw_type or "open" in raw_type:
            atype = ActivityType.NEWSLETTER_OPENED
        else:
            atype = ActivityType.ARTICLE_VIEWED

        title = row.get("article_title") or row.get("title")
        category = row.get("article_category") or row.get("category")
        activity = Activity(
            contact_email=row.get("contact_email") or row.get("email") or "",
            activity_type=atype,
            article_title=title,
            article_category=category,
            occurred_at=_parse_dt(row.get("date/time") or row.get("datetime") or row.get("date")) or datetime.utcnow(),
            note=self.build_note(atype, title, category),
        )
        return self.store.add_activity(activity)

    # --- 1. CSV import ------------------------------------------------------
    def import_csv_activity(self, csv_text: str) -> list[Activity]:
        """Parse an AdvisorStream CSV export; one Activity per row."""
        self._guard()
        reader = csv.DictReader(io.StringIO(csv_text))
        created: list[Activity] = []
        for row in reader:
            norm = {(k or "").strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
            if not (norm.get("contact_email") or norm.get("email")):
                continue
            created.append(self._record(norm))
        return created

    # --- 2. Zapier webhook --------------------------------------------------
    def receive_zapier_webhook(self, payload: dict[str, Any]) -> Activity:
        """Handle a single AdvisorStream event forwarded by Zapier."""
        self._guard()
        norm = {(k or "").strip().lower(): v for k, v in payload.items()}
        return self._record(norm)

    # --- 3. future API pull -------------------------------------------------
    def sync_contact_activity(self, contact_email: str | None = None) -> dict[str, Any]:
        """Placeholder for a future official AdvisorStream API sync.

        No public API is available yet, so this performs NO network calls.
        """
        return {
            "status": "not_available",
            "reason": "AdvisorStream public API access not yet confirmed. "
                      "Use import_csv_activity() or receive_zapier_webhook() for now.",
            "contact_email": contact_email,
        }
