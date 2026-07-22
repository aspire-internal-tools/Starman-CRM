"""Inbound request authentication for webhook endpoints.

Two complementary mechanisms:
  * API key  — every protected endpoint requires header `X-API-Key`.
  * HMAC     — optional `X-Signature` (hex HMAC-SHA256 of the raw body) lets
               senders like Zapier/Meta prove payload integrity.
"""
from __future__ import annotations

import hashlib
import hmac

from fastapi import Header, HTTPException, status

from .config import get_settings


async def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not x_api_key or not hmac.compare_digest(x_api_key, settings.API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key",
        )


def verify_signature(raw_body: bytes, signature: str | None) -> bool:
    """Return True if `signature` is a valid HMAC-SHA256 of raw_body.

    Returns False (rather than raising) so callers can record the result on the
    event log without rejecting outright — useful while onboarding a sender.
    """
    if not signature:
        return False
    secret = get_settings().WEBHOOK_SIGNING_SECRET.encode()
    expected = hmac.new(secret, raw_body, hashlib.sha256).hexdigest()
    candidate = signature.split("=", 1)[-1].strip()  # tolerate "sha256=..." prefix
    return hmac.compare_digest(expected, candidate)
