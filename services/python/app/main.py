"""GreenScout Python service entrypoint.

Hosts the FastAPI app and registers routers. The service is consumed by the
Next.js side over internal HTTP inside the Docker network (SPEC §7.1).

Routers:
  * ``/health``                — liveness probe (unauthenticated).
  * ``/version``               — service identity (unauthenticated).
  * ``/api/calc``              — T-035 calc pipeline (X-API-Key gated).
  * ``/api/documents/generate``— T-038/T-039 PPTX+PDF pipeline.
  * ``/api/images/process``    — T-029b Pillow resize / inspect.
"""

from fastapi import FastAPI

from app.api.endpoints.calc import router as calc_router
from app.api.endpoints.documents import router as documents_router
from app.api.endpoints.images import router as images_router
from app.api.endpoints.version import router as version_router
from app.api.health import router as health_router

app = FastAPI(
    title="GreenScout Python service",
    description="PPTX templating + PDF rendering + image processing for PV feasibility studies.",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(version_router)
app.include_router(calc_router)
app.include_router(documents_router)
app.include_router(images_router)
