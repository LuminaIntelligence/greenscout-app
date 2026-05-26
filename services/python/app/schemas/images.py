"""T-029b — Pydantic schemas for the image-processing API.

The Next.js upload route writes the original file to the shared
``UPLOADS_DIR`` volume and then asks the Python service to inspect /
optionally resize it. The Python side is the single source of truth for
image dimensions + format whitelist because Pillow is the only reliable
sniff library on the stack (Next.js has no native image-inspection lib
and we do not want to add one — §7.1).

@see SPEC.md §4.6 (image upload)
@see app/services/image_processor.py (implementation)
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ImageProcessRequest(BaseModel):
    """Inputs to ``POST /api/images/process``.

    The ``image_path`` field is the container-internal absolute path to
    a file the Next.js side has just written under the shared
    ``UPLOADS_DIR`` bind mount. The Python service refuses to touch
    paths outside its allowed root — see
    :func:`app.api.endpoints.images._validate_path_inside_uploads`.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    image_path: str = Field(
        ...,
        min_length=1,
        description="Absolute container path of the uploaded image to process.",
    )
    max_dimension_px: int = Field(
        4000,
        gt=0,
        le=20000,
        description=(
            "Largest allowed dimension after processing. Images whose largest "
            "dimension exceeds this are resized in-place (Pillow thumbnail, "
            "preserving aspect ratio)."
        ),
    )


class ImageProcessResponse(BaseModel):
    """Response shape for ``POST /api/images/process``.

    ``processed=True`` means the file was resized + rewritten;
    ``processed=False`` means the original was already within the
    bounding box and was left untouched on disk (the metadata fields
    still reflect that file's actual dimensions / size).
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    width_px: int = Field(..., ge=1, description="Final width of the file on disk.")
    height_px: int = Field(..., ge=1, description="Final height of the file on disk.")
    file_size_bytes: int = Field(..., ge=0, description="Final byte size of the file on disk.")
    mime_type: str = Field(..., min_length=1, description="Detected MIME type.")
    processed: bool = Field(
        ...,
        description=(
            "True if the file was rewritten (resized or re-encoded); "
            "False if Pillow left the bytes untouched."
        ),
    )
