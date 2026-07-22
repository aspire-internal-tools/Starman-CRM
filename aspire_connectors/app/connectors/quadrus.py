"""QuadrusConnector — DISABLED placeholder.

Status: disabled_until_official_api_confirmed

Quadrus Investment Services Ltd. is Aspire's mutual fund dealer. Until an
official, sanctioned data path is confirmed, this connector must NOT:
  * scrape the Quadrus portal,
  * automate / fake any login,
  * import client holdings,
  * import KYC data.

The only supported future path is an APPROVED export file or sanctioned API.
All sync methods raise ConnectorDisabledError until enabled.
"""
from __future__ import annotations

from typing import Any

from .base import BaseConnector


class QuadrusConnector(BaseConnector):
    name = "quadrus"
    enabled = False                       # hard off — not env-switchable here
    status = "disabled_until_official_api_confirmed"

    def check_api_access_status(self) -> dict[str, Any]:
        """Reports disabled status. Performs no network I/O."""
        return {
            "connector": self.name,
            "enabled": self.enabled,
            "status": self.status,
            "notes": "No portal scraping. No login automation. No holdings or KYC import yet.",
        }

    def import_approved_export_file(self, file_path: str | None = None) -> None:
        """Future: ingest an officially sanctioned Quadrus export file."""
        self._guard()

    def sync_approved_account_summary(self) -> None:
        self._guard()

    def sync_approved_client_list(self) -> None:
        self._guard()
