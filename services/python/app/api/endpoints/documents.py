"""T-035 - ``POST /api/documents/generate`` endpoint (Slice 3a STUB).

Slice 3a publishes the schema shape but returns ``501 Not Implemented``
with a structured payload. The real PPTX + PDF generation pipeline
lands in Slice 3b (T-037..T-039) once the user signs off on
``docs/pptx-mapping.md``.

The 501 body is a real pydantic model (``DocumentGeneratePendingResponse``)
so the Next.js client sees a typed response, not opaque JSON.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.api.dependencies import verify_api_key
from app.schemas.documents import (
    DocumentGeneratePendingResponse,
    DocumentGenerateRequest,
    DocumentGenerateResponse,
)

router = APIRouter(prefix="/api", tags=["documents"])

_PENDING_MESSAGE = (
    "Document generation pipeline lands in Slice 3b after the user signs off on "
    "docs/pptx-mapping.md. The shape of this endpoint is stable; the body is wired "
    "in T-037 (template placeholders), T-038a/b (PPTX gen), T-039 (PDF render)."
)
_BLOCKING_TASK = "T-037 (post-sign-off on docs/pptx-mapping.md)"


@router.post(
    "/documents/generate",
    response_model=DocumentGenerateResponse,
    responses={
        501: {
            "model": DocumentGeneratePendingResponse,
            "description": "Pipeline not yet implemented; sign-off on pptx-mapping.md pending.",
        },
    },
    dependencies=[Depends(verify_api_key)],
    summary="Generate the PPTX + PDF for a study (Slice 3a: returns 501).",
)
def post_documents_generate(_request: DocumentGenerateRequest) -> JSONResponse:
    """Validate the request shape, then return 501 until Slice 3b lands.

    The request body is still validated against ``DocumentGenerateRequest`` —
    FastAPI raises 422 on a malformed payload before the handler runs.
    That gives the Next.js client useful feedback while the pipeline
    is stubbed.
    """
    body = DocumentGeneratePendingResponse(
        status="pending",
        message=_PENDING_MESSAGE,
        blocking_task=_BLOCKING_TASK,
    )
    return JSONResponse(status_code=501, content=body.model_dump())
