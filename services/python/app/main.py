"""GreenScout Python service entrypoint.

Hosts the FastAPI app and registers routers. The service is consumed by the
Next.js side over internal HTTP inside the Docker network (SPEC §7.1).
"""

from fastapi import FastAPI

from app.api.health import router as health_router

app = FastAPI(
    title="GreenScout Python service",
    description="PPTX templating + PDF rendering + image processing for PV feasibility studies.",
    version="0.1.0",
)

app.include_router(health_router)
