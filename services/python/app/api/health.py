"""Health-check endpoint. Used by Docker health probes and CI smoke tests."""

from fastapi import APIRouter

from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Return service liveness status."""
    return HealthResponse(status="ok")
