"""Pydantic schemas for the /health endpoint."""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Liveness payload returned by GET /health."""

    status: str
