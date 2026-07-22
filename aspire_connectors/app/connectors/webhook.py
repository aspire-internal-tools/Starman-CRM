"""WebhookConnector — the universal inbound pipe.

Any external platform (Zapier, Meta, AdvisorStream, a future tool) can POST a
typed event here. The connector:
  * validates the event type against the allow-list,
  * records HMAC signature validity,
  * appends to the webhook activity log,
  * fans the event out to the right downstream handler.

API-key auth + the secure URL itself are enforced at the router layer.
"""
from __future__ import annotations

from typing import Any, Callable

from ..models import EventType, WebhookEvent
from .base import BaseConnector


class WebhookConnector(BaseConnector):
    name = "webhook"
    status = "enabled"

    def __init__(self, store=None) -> None:
        super().__init__(store)
        # event_type -> handler(payload) registry; populated by the app wiring.
        self._handlers: dict[EventType, Callable[[dict], Any]] = {}

    def on(self, event_type: EventType, handler: Callable[[dict], Any]) -> None:
        self._handlers[event_type] = handler

    def supported_events(self) -> list[str]:
        return [e.value for e in EventType]

    def receive(
        self,
        event_type: str,
        payload: dict[str, Any],
        *,
        source: str = "unknown",
        signature_valid: bool | None = None,
    ) -> WebhookEvent:
        self._guard()

        try:
            etype = EventType(event_type)
        except ValueError as exc:
            raise ValueError(
                f"Unsupported event type '{event_type}'. "
                f"Allowed: {', '.join(self.supported_events())}"
            ) from exc

        event = WebhookEvent(
            event_type=etype,
            source=source,
            payload=payload,
            signature_valid=signature_valid,
        )

        handler = self._handlers.get(etype)
        if handler is not None:
            handler(payload)
            event.processed = True

        self.store.add_event(event)
        return event

    def activity_log(self, limit: int = 100) -> list[WebhookEvent]:
        return list(reversed(self.store.events))[:limit]
