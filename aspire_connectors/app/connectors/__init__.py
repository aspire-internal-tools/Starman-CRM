"""Connector registry."""
from .advisorstream import AdvisorStreamConnector
from .base import BaseConnector, ConnectorDisabledError
from .canada_life import CanadaLifeConnector
from .csv_io import CsvConnector
from .docusign import DocuSignConnector
from .meta_lead import MetaLeadConnector
from .quadrus import QuadrusConnector
from .webhook import WebhookConnector

__all__ = [
    "BaseConnector",
    "ConnectorDisabledError",
    "MetaLeadConnector",
    "DocuSignConnector",
    "AdvisorStreamConnector",
    "CanadaLifeConnector",
    "QuadrusConnector",
    "WebhookConnector",
    "CsvConnector",
]
