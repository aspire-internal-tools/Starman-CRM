"""Pydantic models — the canonical CRM field schemas every connector maps to.

Keeping the schemas in one place means a lead from Meta, a row from a CSV,
and an event from Zapier all land in the CRM with identical shapes.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, EmailStr, Field, field_validator


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


# --------------------------------------------------------------------------- #
#  Leads
# --------------------------------------------------------------------------- #
class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    BOOKED = "booked"
    WON = "won"
    LOST = "lost"


class LeadSource(str, Enum):
    META = "meta"
    CSV = "csv"
    WEBHOOK = "webhook"
    MANUAL = "manual"


class Lead(BaseModel):
    id: str = Field(default_factory=lambda: _new_id("lead"))
    source: LeadSource = LeadSource.MANUAL

    # Lead-source fields (Meta Lead Ads + general)
    campaign_name: Optional[str] = None
    ad_set_name: Optional[str] = None
    form_name: Optional[str] = None
    submitted_time: Optional[datetime] = None

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    consent: bool = False          # consent checkbox from the lead form

    status: LeadStatus = LeadStatus.NEW
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    @field_validator("email")
    @classmethod
    def _norm_email(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().lower() if v else v

    @property
    def phone_digits(self) -> str:
        """Phone reduced to digits — the canonical form used for dedup."""
        return re.sub(r"\D", "", self.phone or "")


# --------------------------------------------------------------------------- #
#  Activities (AdvisorStream content engagement)
# --------------------------------------------------------------------------- #
class ActivityType(str, Enum):
    NEWSLETTER_OPENED = "newsletter_opened"
    ARTICLE_VIEWED = "article_viewed"


class Activity(BaseModel):
    id: str = Field(default_factory=lambda: _new_id("act"))
    contact_email: str
    activity_type: ActivityType
    article_title: Optional[str] = None
    article_category: Optional[str] = None
    occurred_at: datetime = Field(default_factory=_now)
    note: Optional[str] = None     # CRM note, e.g. "Viewed article about Retirement Income"
    source: str = "advisorstream"

    @field_validator("contact_email")
    @classmethod
    def _norm_email(cls, v: str) -> str:
        return v.strip().lower()


# --------------------------------------------------------------------------- #
#  Documents (DocuSign envelopes)
# --------------------------------------------------------------------------- #
class DocumentStatus(str, Enum):
    SENT = "sent"
    VIEWED = "viewed"
    SIGNED = "signed"
    DECLINED = "declined"
    EXPIRED = "expired"


class CrmDocument(BaseModel):
    envelope_id: str
    document_name: str
    recipient_email: Optional[str] = None
    sent_date: Optional[datetime] = None
    viewed_date: Optional[datetime] = None
    signed_date: Optional[datetime] = None
    status: DocumentStatus = DocumentStatus.SENT
    certificate_path: Optional[str] = None


# --------------------------------------------------------------------------- #
#  Webhook events (universal log)
# --------------------------------------------------------------------------- #
class EventType(str, Enum):
    LEAD_CREATED = "lead.created"
    LEAD_UPDATED = "lead.updated"
    EMAIL_OPENED = "email.opened"
    ARTICLE_VIEWED = "article.viewed"
    DOCUMENT_SENT = "document.sent"
    DOCUMENT_SIGNED = "document.signed"
    MEETING_BOOKED = "meeting.booked"


class WebhookEvent(BaseModel):
    id: str = Field(default_factory=lambda: _new_id("evt"))
    event_type: EventType
    source: str = "unknown"
    payload: dict = Field(default_factory=dict)
    received_at: datetime = Field(default_factory=_now)
    signature_valid: Optional[bool] = None
    processed: bool = False
