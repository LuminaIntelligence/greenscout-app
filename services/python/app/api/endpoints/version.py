"""T-035 — ``GET /version`` endpoint.

Service identity. Unauthenticated for operations-friendliness (same
class as ``/health``). The version literal is sourced from the
FastAPI app's ``version`` attribute (set in ``app.main``).
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas.version import VersionResponse

router = APIRouter(tags=["version"])

_SERVICE_NAME = "greenscout-pyservice"


@router.get(
    "/version",
    response_model=VersionResponse,
    summary="Service identity (name + version).",
)
def get_version(request: Request) -> VersionResponse:
    """Return the service name + FastAPI app version."""
    return VersionResponse(name=_SERVICE_NAME, version=request.app.version)
