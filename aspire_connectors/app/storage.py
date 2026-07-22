"""A tiny JSON-backed store.

Deliberately simple so the scaffold runs with zero infra. Each collection is a
list persisted to data/<name>.json. Swap this module for a real DB/ORM later —
the connectors only depend on the public methods here.
"""
from __future__ import annotations

import json
import os
import threading
from typing import Iterable, Optional

from .config import get_settings
from .models import Activity, CrmDocument, Lead, WebhookEvent


class Store:
    def __init__(self, data_dir: Optional[str] = None) -> None:
        self.data_dir = os.path.abspath(data_dir or get_settings().DATA_DIR)
        os.makedirs(self.data_dir, exist_ok=True)
        self._lock = threading.RLock()
        self.leads: list[Lead] = self._load("leads", Lead)
        self.activities: list[Activity] = self._load("activities", Activity)
        self.documents: list[CrmDocument] = self._load("documents", CrmDocument)
        self.events: list[WebhookEvent] = self._load("events", WebhookEvent)

    # --- persistence --------------------------------------------------------
    def _path(self, name: str) -> str:
        return os.path.join(self.data_dir, f"{name}.json")

    def _load(self, name: str, model) -> list:
        try:
            with open(self._path(name), "r", encoding="utf-8") as fh:
                return [model.model_validate(row) for row in json.load(fh)]
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save(self, name: str, rows: Iterable) -> None:
        with open(self._path(name), "w", encoding="utf-8") as fh:
            json.dump([r.model_dump(mode="json") for r in rows], fh, indent=2)

    # --- leads --------------------------------------------------------------
    def find_lead_by_contact(self, email: Optional[str], phone_digits: Optional[str]) -> Optional[Lead]:
        """Duplicate checker: match on normalised email OR phone digits."""
        email = (email or "").strip().lower() or None
        phone_digits = phone_digits or None
        with self._lock:
            for lead in self.leads:
                if email and lead.email == email:
                    return lead
                if phone_digits and len(phone_digits) >= 7 and lead.phone_digits == phone_digits:
                    return lead
        return None

    def add_lead(self, lead: Lead) -> Lead:
        with self._lock:
            self.leads.append(lead)
            self._save("leads", self.leads)
        return lead

    def update_lead(self, lead: Lead) -> Lead:
        with self._lock:
            self._save("leads", self.leads)
        return lead

    # --- activities ---------------------------------------------------------
    def add_activity(self, activity: Activity) -> Activity:
        with self._lock:
            self.activities.append(activity)
            self._save("activities", self.activities)
        return activity

    # --- documents ----------------------------------------------------------
    def upsert_document(self, doc: CrmDocument) -> CrmDocument:
        with self._lock:
            for i, existing in enumerate(self.documents):
                if existing.envelope_id == doc.envelope_id:
                    self.documents[i] = doc
                    self._save("documents", self.documents)
                    return doc
            self.documents.append(doc)
            self._save("documents", self.documents)
        return doc

    def get_document(self, envelope_id: str) -> Optional[CrmDocument]:
        with self._lock:
            return next((d for d in self.documents if d.envelope_id == envelope_id), None)

    # --- events -------------------------------------------------------------
    def add_event(self, event: WebhookEvent) -> WebhookEvent:
        with self._lock:
            self.events.append(event)
            self._save("events", self.events)
        return event


# Module-level singleton used by the app. Tests can construct their own Store.
_store: Optional[Store] = None


def get_store() -> Store:
    global _store
    if _store is None:
        _store = Store()
    return _store
