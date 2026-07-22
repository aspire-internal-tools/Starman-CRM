"""Central configuration for the Aspire CRM connector layer.

Values come from environment variables so secrets never live in code.
Sensible demo defaults are provided so the scaffold runs out of the box.
"""
from __future__ import annotations

import os
from functools import lru_cache


class Settings:
    # --- API security -------------------------------------------------------
    # Inbound webhook calls must present this key (header: X-API-Key).
    API_KEY: str = os.getenv("ASPIRE_API_KEY", "demo-key-change-me")

    # Shared secret used to verify HMAC-signed webhook payloads (X-Signature).
    WEBHOOK_SIGNING_SECRET: str = os.getenv("ASPIRE_WEBHOOK_SECRET", "demo-signing-secret")

    # Meta (Facebook) Lead Ads webhook subscription verification token.
    META_VERIFY_TOKEN: str = os.getenv("META_VERIFY_TOKEN", "aspire-meta-verify")

    # --- Storage ------------------------------------------------------------
    # JSON-backed store location. For the demo we keep everything in one folder.
    DATA_DIR: str = os.getenv("ASPIRE_DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "data"))

    # --- Locked connectors --------------------------------------------------
    # These remain OFF until the dealer / carrier grants official API access.
    # They are intentionally not switchable via env in this scaffold.
    CANADA_LIFE_ENABLED: bool = False   # disable_until_approved
    QUADRUS_ENABLED: bool = False       # disabled_until_official_api_confirmed


@lru_cache
def get_settings() -> Settings:
    return Settings()
