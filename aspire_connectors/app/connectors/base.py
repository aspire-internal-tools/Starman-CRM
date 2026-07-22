"""Shared base class + the disabled-connector guard used by locked integrations."""
from __future__ import annotations

from ..storage import Store, get_store


class ConnectorDisabledError(RuntimeError):
    """Raised when a method is called on a connector that is not yet approved."""


class BaseConnector:
    #: Human-readable connector name.
    name: str = "base"
    #: When False, every public method must refuse to run (compliance gate).
    enabled: bool = True
    #: Free-text status surfaced to the CRM/admin UI.
    status: str = "enabled"

    def __init__(self, store: Store | None = None) -> None:
        self.store = store or get_store()

    def _guard(self) -> None:
        """Call at the top of any method that could touch external systems."""
        if not self.enabled:
            raise ConnectorDisabledError(
                f"{self.name} is disabled ({self.status}). "
                "No external calls, scraping, or data import are permitted until approved."
            )

    def info(self) -> dict:
        return {"connector": self.name, "enabled": self.enabled, "status": self.status}
