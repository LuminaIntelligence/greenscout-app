"""T-029b — ``POST /api/images/process`` endpoint.

Stateless image inspection + optional in-place resize. The Next.js side
writes the original upload to the shared ``UPLOADS_DIR`` volume, hits
this endpoint with the container-internal absolute path, and reads
back the post-processing dimensions / size / MIME so it can update
the ``StudyImage`` DB row.

Guarded by ``X-API-Key`` (shared secret with Next.js) — see
:mod:`app.api.dependencies`.

Path-injection defense
----------------------
The endpoint refuses to touch any path outside the configured
``UPLOADS_DIR`` root. Even though the Next.js side already
ownership-checks before sending, defence-in-depth: a request that
sneaks a ``..`` segment or an absolute path to ``/etc/passwd`` is
short-circuited with a 400.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import verify_api_key
from app.schemas.images import ImageProcessRequest, ImageProcessResponse
from app.services.image_processor import (
    CorruptImageError,
    UnsupportedImageFormatError,
    process_uploaded_image,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["images"])

#: Default location inside the container; overridden in production via
#: ``UPLOADS_DIR=/app/uploads`` so the host bind mount picks it up.
_DEFAULT_UPLOADS_DIR = Path("uploads")


def _resolve_uploads_root() -> Path:
    """Return the configured uploads-root directory, resolved absolute."""
    raw = os.environ.get("UPLOADS_DIR", str(_DEFAULT_UPLOADS_DIR))
    return Path(raw).resolve()


def _validate_path_inside_uploads(candidate: Path, uploads_root: Path) -> Path:
    """Resolve ``candidate`` and confirm it sits inside ``uploads_root``.

    Raises an HTTP 400 if the resolved path would escape the configured
    uploads root (defence-in-depth against ``../``-style traversal or
    absolute paths to unrelated locations on the volume).
    """
    try:
        resolved = candidate.resolve(strict=False)
    except (OSError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Refusing to resolve image_path: {exc}",
        ) from exc
    try:
        resolved.relative_to(uploads_root)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="image_path must sit inside the configured uploads root.",
        ) from exc
    return resolved


@router.post(
    "/images/process",
    response_model=ImageProcessResponse,
    dependencies=[Depends(verify_api_key)],
    summary="Inspect + optionally resize an uploaded image in-place.",
)
def post_images_process(req: ImageProcessRequest) -> ImageProcessResponse:
    """Validate format, optionally resize, return final metadata."""
    uploads_root = _resolve_uploads_root()
    candidate = Path(req.image_path)
    resolved = _validate_path_inside_uploads(candidate, uploads_root)

    try:
        result = process_uploaded_image(resolved, max_dimension_px=req.max_dimension_px)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except UnsupportedImageFormatError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except CorruptImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    return ImageProcessResponse(
        width_px=result.width_px,
        height_px=result.height_px,
        file_size_bytes=result.file_size_bytes,
        mime_type=result.mime_type,
        processed=result.processed,
    )


__all__ = [
    "_resolve_uploads_root",
    "_validate_path_inside_uploads",
    "post_images_process",
    "router",
]
