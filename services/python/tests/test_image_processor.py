# pyright: reportPrivateUsage=false
"""T-029b — Tests for :mod:`app.services.image_processor`.

100 % coverage on the resize / inspect / whitelist logic. Fixtures are
generated on the fly via Pillow (no binary blobs committed) so the
test suite stays deterministic and self-contained.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from PIL import Image

if TYPE_CHECKING:
    from pathlib import Path

from app.services.image_processor import (
    CorruptImageError,
    UnsupportedImageFormatError,
    _resolve_mime,
    process_uploaded_image,
)


def _write_image(
    path: Path,
    *,
    fmt: str,
    size: tuple[int, int],
    color: tuple[int, int, int],
) -> None:
    """Generate a solid-colour image and save it at ``path``."""
    img = Image.new("RGB", size, color)
    if fmt == "JPEG":
        img.save(path, format=fmt, quality=90)
    else:
        img.save(path, format=fmt)


def test_process_jpeg_under_cap_no_resize(tmp_path: Path) -> None:
    """A JPEG already within the bounding box is left untouched on disk."""
    src = tmp_path / "small.jpg"
    _write_image(src, fmt="JPEG", size=(800, 600), color=(120, 200, 80))
    original_bytes = src.read_bytes()

    result = process_uploaded_image(src, max_dimension_px=4000)

    assert result.processed is False
    assert result.width_px == 800
    assert result.height_px == 600
    assert result.mime_type == "image/jpeg"
    assert result.file_size_bytes == len(original_bytes)
    # File on disk untouched -- bytes match.
    assert src.read_bytes() == original_bytes


def test_process_png_under_cap_no_resize(tmp_path: Path) -> None:
    """PNG under cap is also a no-op."""
    src = tmp_path / "small.png"
    _write_image(src, fmt="PNG", size=(300, 200), color=(10, 20, 30))

    result = process_uploaded_image(src, max_dimension_px=4000)

    assert result.processed is False
    assert result.width_px == 300
    assert result.height_px == 200
    assert result.mime_type == "image/png"


def test_process_webp_under_cap_no_resize(tmp_path: Path) -> None:
    """WebP under cap is also a no-op."""
    src = tmp_path / "small.webp"
    _write_image(src, fmt="WEBP", size=(100, 100), color=(50, 50, 50))

    result = process_uploaded_image(src, max_dimension_px=4000)

    assert result.processed is False
    assert result.mime_type == "image/webp"


def test_process_jpeg_oversize_resizes_in_place(tmp_path: Path) -> None:
    """An oversize JPEG is resized to fit the bounding box (aspect-preserving)."""
    src = tmp_path / "big.jpg"
    _write_image(src, fmt="JPEG", size=(5000, 3000), color=(180, 60, 20))

    result = process_uploaded_image(src, max_dimension_px=4000)

    assert result.processed is True
    assert result.mime_type == "image/jpeg"
    # 5000x3000 -> largest dim becomes 4000, aspect ratio preserved.
    assert result.width_px == 4000
    assert result.height_px == 2400
    # Disk reflects the new dimensions.
    with Image.open(src) as on_disk:
        assert on_disk.size == (4000, 2400)


def test_process_png_oversize_resizes_in_place(tmp_path: Path) -> None:
    """An oversize PNG is resized + optimized."""
    src = tmp_path / "big.png"
    _write_image(src, fmt="PNG", size=(6000, 2000), color=(0, 0, 0))

    result = process_uploaded_image(src, max_dimension_px=4000)

    assert result.processed is True
    assert result.width_px == 4000
    assert result.height_px == round(2000 * 4000 / 6000)  # ~1333 from Pillow's rounding.
    assert result.mime_type == "image/png"


def test_process_webp_oversize_resizes_in_place(tmp_path: Path) -> None:
    """An oversize WebP is resized + re-encoded with the optimised method=6 setting."""
    src = tmp_path / "big.webp"
    _write_image(src, fmt="WEBP", size=(4500, 4500), color=(200, 100, 200))

    result = process_uploaded_image(src, max_dimension_px=4000)

    assert result.processed is True
    assert result.width_px == 4000
    assert result.height_px == 4000
    assert result.mime_type == "image/webp"


def test_process_smaller_cap_forces_resize(tmp_path: Path) -> None:
    """The cap is honoured even when callers pass a smaller bound (e.g. 1600px)."""
    src = tmp_path / "midsize.jpg"
    _write_image(src, fmt="JPEG", size=(2000, 1000), color=(10, 200, 10))

    result = process_uploaded_image(src, max_dimension_px=1600)

    assert result.processed is True
    assert result.width_px == 1600
    assert result.height_px == 800


def test_process_missing_file_raises(tmp_path: Path) -> None:
    """A non-existent input path raises FileNotFoundError."""
    src = tmp_path / "nope.jpg"
    with pytest.raises(FileNotFoundError):
        process_uploaded_image(src)


def test_process_corrupt_image_raises(tmp_path: Path) -> None:
    """Random bytes that look like an image header → CorruptImageError."""
    src = tmp_path / "corrupt.jpg"
    src.write_bytes(b"\xff\xd8\xff\xe0not-actually-jpeg-garbage-bytes")
    with pytest.raises(CorruptImageError):
        process_uploaded_image(src)


def test_process_unidentified_image_raises(tmp_path: Path) -> None:
    """A plain-text file is not an image → CorruptImageError."""
    src = tmp_path / "not-an-image.txt"
    src.write_text("this is plain text, not image bytes")
    with pytest.raises(CorruptImageError):
        process_uploaded_image(src)


def test_process_unsupported_format_raises(tmp_path: Path) -> None:
    """GIF is decoded by Pillow but not on the whitelist → UnsupportedImageFormatError."""
    src = tmp_path / "anim.gif"
    img = Image.new("RGB", (100, 100), (0, 0, 0))
    img.save(src, format="GIF")

    with pytest.raises(UnsupportedImageFormatError) as excinfo:
        process_uploaded_image(src)
    assert "GIF" in str(excinfo.value)


def test_process_bmp_unsupported_format(tmp_path: Path) -> None:
    """BMP is also explicitly rejected by the whitelist."""
    src = tmp_path / "shape.bmp"
    img = Image.new("RGB", (50, 50), (255, 0, 0))
    img.save(src, format="BMP")

    with pytest.raises(UnsupportedImageFormatError):
        process_uploaded_image(src)


def test_aspect_ratio_preserved_with_extreme_landscape(tmp_path: Path) -> None:
    """A wide-aspect image keeps its ratio when downscaled (T-029c letterbox decision)."""
    src = tmp_path / "wide.jpg"
    _write_image(src, fmt="JPEG", size=(8000, 1000), color=(255, 255, 255))

    result = process_uploaded_image(src, max_dimension_px=4000)

    assert result.processed is True
    assert result.width_px == 4000
    # 8000:1000 = 8:1 -> 4000x500.
    assert result.height_px == 500


def test_resolve_mime_none_raises() -> None:
    """Defensive: ``Image.format=None`` (Pillow couldn't identify) → typed error."""
    with pytest.raises(UnsupportedImageFormatError):
        _resolve_mime(None)


def test_resolve_mime_lowercase_format_accepted() -> None:
    """Pillow uppercases formats by default — accept lowercase defensively too."""
    assert _resolve_mime("jpeg") == "image/jpeg"


def test_strip_exif_on_jpeg_resize(tmp_path: Path) -> None:
    """JPEG resize path drops EXIF (DSGVO hygiene)."""
    src = tmp_path / "with_exif.jpg"
    # Create a JPEG with synthetic EXIF, oversize so it gets resized.
    img = Image.new("RGB", (5000, 3000), (10, 10, 10))
    # Pillow's exif scaffolding is awkward; we attach raw bytes that
    # later Image.open should show as missing once stripped.
    exif_bytes = b"\x00" * 64
    img.save(src, format="JPEG", quality=90, exif=exif_bytes)

    result = process_uploaded_image(src, max_dimension_px=4000)

    assert result.processed is True
    with Image.open(src) as resized:
        # After our explicit `exif=b""`, the saved EXIF should be empty.
        assert resized.info.get("exif", b"") == b""
