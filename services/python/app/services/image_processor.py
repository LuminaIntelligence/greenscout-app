"""T-029b — Pillow-backed image processing for BEFORE/AFTER study photos.

Responsibilities of this module:

  1.  **Format whitelist + magic-bytes check.** Only ``image/jpeg``,
      ``image/png``, ``image/webp`` are accepted. We trust Pillow's
      format detection over the originating filename — a renamed
      ``.exe`` will be rejected.
  2.  **Optional resize.** If the largest dimension exceeds
      ``max_dimension_px`` the file is resized via
      :py:meth:`PIL.Image.Image.thumbnail` (Lanczos, aspect-preserving)
      and rewritten over the input path. The original is intentionally
      replaced — the Next.js side keeps the pre-resize byte count from
      its upload-time check so the audit-log entry can record the
      original size.
  3.  **No cropping.** Per the T-029c decision (Slice 4 sign-off,
      DECISIONS.md), the BEFORE/AFTER photos go into the PPTX in a
      ``contain`` / letterbox layout — never cropped server-side. The
      resize step here only fits the original into a bounding box; the
      aspect ratio is preserved bit-exact. Any aspect-ratio adjustment
      for the slide is owned by :mod:`app.services.pptx_generator`,
      not this module.

The function is intentionally pure and synchronous: a single file path
in, a dataclass describing the post-processing state out. The FastAPI
endpoint at ``POST /api/images/process`` is the only call site in MVP.

@see SPEC.md §4.6 (image upload contract)
@see DECISIONS.md → Slice 4 image-upload decisions
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from PIL import Image, UnidentifiedImageError

if TYPE_CHECKING:
    from pathlib import Path

logger = logging.getLogger(__name__)

#: Pillow format identifiers that map to whitelisted MIME types. The
#: server-side check is independent of the originating filename.
_FORMAT_TO_MIME: dict[str, str] = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


class UnsupportedImageFormatError(ValueError):
    """Raised when Pillow identifies a format outside the whitelist."""


class CorruptImageError(ValueError):
    """Raised when Pillow cannot decode the file as any known image."""


@dataclass(frozen=True)
class ProcessedImage:
    """Outcome of :func:`process_uploaded_image`.

    ``processed=True`` means the input file was rewritten (the bytes on
    disk changed); ``processed=False`` means the file was already within
    the bounding box and was left untouched (the metadata fields
    describe the existing file).
    """

    width_px: int
    height_px: int
    file_size_bytes: int
    mime_type: str
    processed: bool


def _resolve_mime(pillow_format: str | None) -> str:
    """Map a Pillow ``Image.format`` string to a whitelist MIME type.

    Raises :class:`UnsupportedImageFormatError` if Pillow identified a
    format outside the SPEC §4.6 whitelist.
    """
    if pillow_format is None:
        raise UnsupportedImageFormatError("Pillow could not determine the image format.")
    fmt = pillow_format.upper()
    mime = _FORMAT_TO_MIME.get(fmt)
    if mime is None:
        raise UnsupportedImageFormatError(
            f"Image format '{fmt}' is not in the whitelist {sorted(_FORMAT_TO_MIME)}.",
        )
    return mime


def _safe_open(path: Path) -> Any:
    """Open ``path`` with Pillow and raise a typed error on corruption.

    Pillow's ``Image.open`` raises ``UnidentifiedImageError`` for
    non-image bytes, but it can also bubble up generic ``OSError`` /
    ``ValueError`` instances when the file header is partially valid.
    We normalise all of those into :class:`CorruptImageError` so the
    HTTP layer can map a single error class to a 422.
    """
    try:
        # Pillow's `Image.open` returns a partially-typed handle and
        # `load()` carries `() -> (Unknown | None)` in the current
        # stubs. We treat the whole image handle as `Any` so the
        # downstream `.size` / `.format` / `.save` calls (whose
        # return / accepted types are also partially unknown) don't
        # poison the rest of the module with pyright noise. The
        # production behaviour relies on Pillow's documented runtime
        # contract, not on the stub coverage.
        image_handle: Any = Image.open(path)
        # Force Pillow to actually parse the header (lazy open won't
        # surface format errors otherwise).
        image_handle.load()
        return image_handle
    except UnidentifiedImageError as exc:
        raise CorruptImageError(f"Pillow could not identify {path} as an image.") from exc
    except (OSError, ValueError) as exc:
        raise CorruptImageError(f"Pillow failed to decode {path}: {exc}") from exc


def process_uploaded_image(
    image_path: Path,
    *,
    max_dimension_px: int = 4000,
) -> ProcessedImage:
    """Inspect, validate, and optionally resize an uploaded image.

    Args:
        image_path: Container-internal absolute path of the uploaded
            file. Must exist on disk.
        max_dimension_px: Largest allowed dimension (width or height)
            for the file after processing. Images whose largest
            dimension exceeds this are resized in-place via
            :py:meth:`PIL.Image.Image.thumbnail` (aspect-preserving).

    Returns:
        A :class:`ProcessedImage` describing the post-processing file.

    Raises:
        FileNotFoundError: ``image_path`` does not exist on disk.
        UnsupportedImageFormatError: Pillow identified a format outside
            the JPEG/PNG/WebP whitelist.
        CorruptImageError: Pillow failed to decode the file as any
            known image format.
    """
    if not image_path.exists():
        raise FileNotFoundError(f"Image path does not exist: {image_path}")

    with _safe_open(image_path) as image:
        mime_type = _resolve_mime(image.format)
        original_width, original_height = image.size
        pillow_format = image.format  # Captured before any conversion.

        largest = max(original_width, original_height)
        if largest <= max_dimension_px:
            file_size = image_path.stat().st_size
            logger.info(
                "image_processor: %s already within bounds (%dx%d, %d bytes); skip resize",
                image_path,
                original_width,
                original_height,
                file_size,
            )
            return ProcessedImage(
                width_px=original_width,
                height_px=original_height,
                file_size_bytes=file_size,
                mime_type=mime_type,
                processed=False,
            )

        # Pillow's `thumbnail` preserves aspect ratio and never upscales.
        # We deliberately operate on a copy because `thumbnail` mutates
        # in-place and a fresh copy lets the original `image` close
        # cleanly via the context manager.
        resized = image.copy()
        resized.thumbnail(
            (max_dimension_px, max_dimension_px),
            Image.Resampling.LANCZOS,
        )
        new_width, new_height = resized.size

        # `format` is the one strongly-typed kwarg; the rest are encoder
        # options whose accepted types vary per format (Pillow exposes
        # them as `Any` in the runtime stubs). We carry them in a
        # separate `Any`-typed dict so the strict checker stays green.
        encoder_options: dict[str, Any] = {}
        # JPEG / WebP — preserve a reasonable quality + drop metadata
        # we don't need. PNG is lossless; no quality knob.
        if pillow_format == "JPEG":
            encoder_options["quality"] = 85
            encoder_options["optimize"] = True
            # Strip EXIF — uploaded photos can carry GPS / device data
            # that is not relevant to the slide and is a DSGVO smell.
            encoder_options["exif"] = b""
        elif pillow_format == "WEBP":
            encoder_options["quality"] = 85
            encoder_options["method"] = 6  # slowest / best compression — fine for upload latency.
        elif pillow_format == "PNG":
            encoder_options["optimize"] = True

        resized.save(image_path, format=pillow_format, **encoder_options)

    file_size = image_path.stat().st_size
    logger.info(
        "image_processor: resized %s from %dx%d to %dx%d (%d bytes)",
        image_path,
        original_width,
        original_height,
        new_width,
        new_height,
        file_size,
    )
    return ProcessedImage(
        width_px=new_width,
        height_px=new_height,
        file_size_bytes=file_size,
        mime_type=mime_type,
        processed=True,
    )


__all__ = [
    "CorruptImageError",
    "ProcessedImage",
    "UnsupportedImageFormatError",
    "process_uploaded_image",
]
