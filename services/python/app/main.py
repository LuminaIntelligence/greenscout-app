"""GreenScout Python service entrypoint.

Hosts the FastAPI app and registers routers. The service is consumed by the
Next.js side over internal HTTP inside the Docker network (SPEC §7.1).

Routers:
  * ``/health``                — liveness probe (unauthenticated).
  * ``/version``               — service identity (unauthenticated).
  * ``/api/calc``              — T-035 calc pipeline (X-API-Key gated).
  * ``/api/images/process``    — T-029b Pillow resize / inspect.

The former ``/api/documents/generate`` PPTX+PDF endpoint was removed on
2026-06-01 as part of the §7.10 architecture pivot — document rendering
moved to React-Slide-Komponenten + Playwright im Next.js-Layer (SPEC §4.8).
"""

from fastapi import FastAPI

from app.api.endpoints.calc import router as calc_router
from app.api.endpoints.images import router as images_router
from app.api.endpoints.version import router as version_router
from app.api.health import router as health_router

app = FastAPI(
    title="GreenScout Python service",
    description="PV-Calculations + Image-Processing für die Machbarkeitsstudie-Webanwendung.",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(version_router)
app.include_router(calc_router)
app.include_router(images_router)
