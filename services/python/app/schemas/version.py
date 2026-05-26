"""T-035 — Pydantic schema for the ``GET /version`` endpoint."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class VersionResponse(BaseModel):
    """Service identity payload returned by ``GET /version``.

    Used by operations / monitoring / CI smoke tests to confirm which
    image is actually running. Deliberately unauthenticated for the
    same operations-friendly reason ``/health`` is.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str
    version: str
