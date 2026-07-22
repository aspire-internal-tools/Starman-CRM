"""CanadaLifeConnector — DISABLED placeholder.

Status: disable_until_approved

This connector is intentionally inert. Until Canada Life grants official API
access and Aspire's compliance sign-off is in place, it must NOT:
  * make any network connection,
  * scrape any portal,
  * store account numbers, policy numbers, or client holdings.

Every method raises ConnectorDisabledError via the base guard. The method
signatures exist only to define the future interface.
"""
from __future__ import annotations

from typing import Any

from .base import BaseConnector


class CanadaLifeConnector(BaseConnector):
    name = "canada_life"
    enabled = False                       # hard off — not env-switchable here
    status = "disable_until_approved"

    def check_api_access_status(self) -> dict[str, Any]:
        """The ONE method safe to call — reports that access is not approved.

        Performs no network I/O.
        """
        return {
            "connector": self.name,
            "enabled": self.enabled,
            "status": self.status,
            "api_access": "not_approved",
            "notes": "No real connection. No scraping. No stored account/policy numbers or holdings.",
        }

    def sync_approved_client_data(self) -> None:
        self._guard()   # raises until approved

    def sync_approved_policy_data(self) -> None:
        self._guard()

    def sync_approved_investment_data(self) -> None:
        self._guard()
