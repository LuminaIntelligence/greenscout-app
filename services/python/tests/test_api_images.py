# pyright: reportPrivateUsage=false
"""T-029b — Tests for ``POST /api/images/process``.

100 % coverage on :mod:`app.api.endpoints.images`. Exercises the
endpoint via the FastAPI TestClient with realistic on-disk images
generated through Pillow.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

import pytest
from PIL import Image

if TYPE_CHECKING:
    from fastapi.testclient import TestClient

# gitleaks:allow — non-secret literal driving the shared-secret guard.
_VALID_KEY = "test-fake-not-a-secret-fixture-value-only"  # gitleaks:allow


@pytest.fixture(autouse=True)
def set_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Every test in this module runs with the shared secret set."""
    monkeypatch.setenv("PYTHON_SERVICE_API_KEY", _VALID_KEY)


@pytest.fixture
def uploads_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Anchor UPLOADS_DIR inside ``tmp_path`` for the test run."""
    root = tmp_path / "uploads"
    root.mkdir()
    monkeypatch.setenv("UPLOADS_DIR", str(root))
    return root


def _save_image(path: Path, *, fmt: str, size: tuple[int, int]) -> None:
    img = Image.new("RGB", size, (100, 150, 100))
    if fmt == "JPEG":
        img.save(path, format=fmt, quality=90)
    else:
        img.save(path, format=fmt)


def test_images_process_happy_jpeg_under_cap(
    client: TestClient,
    uploads_root: Path,
) -> None:
    """A JPEG within the cap returns processed=False + correct metadata."""
    target = uploads_root / "study-1" / "before.jpg"
    target.parent.mkdir(parents=True)
    _save_image(target, fmt="JPEG", size=(800, 600))

    response = client.post(
        "/api/images/process",
        json={"image_path": str(target), "max_dimension_px": 4000},
        headers={"X-API-Key": _VALID_KEY},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["processed"] is False
    assert body["width_px"] == 800
    assert body["height_px"] == 600
    assert body["mime_type"] == "image/jpeg"
    assert body["file_size_bytes"] > 0


def test_images_process_happy_resize_path(
    client: TestClient,
    uploads_root: Path,
) -> None:
    """An oversize image returns processed=True with the bounded dimensions."""
    target = uploads_root / "study-2" / "after.jpg"
    target.parent.mkdir(parents=True)
    _save_image(target, fmt="JPEG", size=(5000, 3000))

    response = client.post(
        "/api/images/process",
        json={"image_path": str(target), "max_dimension_px": 4000},
        headers={"X-API-Key": _VALID_KEY},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["processed"] is True
    assert body["width_px"] == 4000
    assert body["height_px"] == 2400


def test_images_process_uses_default_cap(
    client: TestClient,
    uploads_root: Path,
) -> None:
    """Omitting max_dimension_px falls back to the 4000 default."""
    target = uploads_root / "study-3" / "before.jpg"
    target.parent.mkdir(parents=True)
    _save_image(target, fmt="JPEG", size=(4500, 4500))

    response = client.post(
        "/api/images/process",
        json={"image_path": str(target)},
        headers={"X-API-Key": _VALID_KEY},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["processed"] is True
    assert body["width_px"] == 4000


def test_images_process_missing_file_returns_404(
    client: TestClient,
    uploads_root: Path,
) -> None:
    """A path that doesn't exist on disk → 404."""
    target = uploads_root / "study-x" / "ghost.jpg"
    response = client.post(
        "/api/images/process",
        json={"image_path": str(target)},
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 404


def test_images_process_unsupported_format_returns_422(
    client: TestClient,
    uploads_root: Path,
) -> None:
    """A GIF file (outside the whitelist) → 422."""
    target = uploads_root / "study-4" / "anim.gif"
    target.parent.mkdir(parents=True)
    Image.new("RGB", (100, 100), (0, 0, 0)).save(target, format="GIF")

    response = client.post(
        "/api/images/process",
        json={"image_path": str(target)},
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 422
    assert "whitelist" in response.json()["detail"].lower()


def test_images_process_corrupt_image_returns_422(
    client: TestClient,
    uploads_root: Path,
) -> None:
    """Garbage bytes → 422 with a CorruptImageError message."""
    target = uploads_root / "study-5" / "garbage.jpg"
    target.parent.mkdir(parents=True)
    target.write_bytes(b"\xff\xd8\xff\xe0not-actually-jpeg")

    response = client.post(
        "/api/images/process",
        json={"image_path": str(target)},
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 422


def test_images_process_path_traversal_returns_400(
    client: TestClient,
    uploads_root: Path,
) -> None:
    """A path outside UPLOADS_DIR → 400 (defence-in-depth)."""
    # Create the would-be target outside the uploads root.
    outside = uploads_root.parent / "outside.jpg"
    _save_image(outside, fmt="JPEG", size=(100, 100))

    response = client.post(
        "/api/images/process",
        json={"image_path": str(outside)},
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 400
    assert "uploads" in response.json()["detail"].lower()


def test_images_process_dotdot_traversal_returns_400(
    client: TestClient,
    uploads_root: Path,
) -> None:
    """A path containing ``../`` that resolves outside UPLOADS_DIR → 400."""
    response = client.post(
        "/api/images/process",
        json={"image_path": str(uploads_root / ".." / "escape.jpg")},
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 400


def test_images_process_missing_api_key_returns_401(
    client: TestClient,
    uploads_root: Path,
) -> None:
    """No X-API-Key header → 401 (auth dependency)."""
    target = uploads_root / "study-9" / "before.jpg"
    target.parent.mkdir(parents=True)
    _save_image(target, fmt="JPEG", size=(800, 600))

    response = client.post(
        "/api/images/process",
        json={"image_path": str(target)},
    )
    assert response.status_code == 401


def test_images_process_extra_field_returns_422(
    client: TestClient,
    uploads_root: Path,
) -> None:
    """Pydantic ``extra=forbid`` rejects unknown fields → 422."""
    target = uploads_root / "study-10" / "before.jpg"
    target.parent.mkdir(parents=True)
    _save_image(target, fmt="JPEG", size=(800, 600))

    response = client.post(
        "/api/images/process",
        json={"image_path": str(target), "rogue": True},
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 422


def test_images_process_invalid_cap_returns_422(
    client: TestClient,
    uploads_root: Path,
) -> None:
    """max_dimension_px must be >0 and <=20000 — out-of-range → 422."""
    target = uploads_root / "study-11" / "before.jpg"
    target.parent.mkdir(parents=True)
    _save_image(target, fmt="JPEG", size=(800, 600))

    response = client.post(
        "/api/images/process",
        json={"image_path": str(target), "max_dimension_px": 0},
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 422


def test_uploads_root_default_when_env_unset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When UPLOADS_DIR is unset, the resolver falls back to ./uploads."""
    monkeypatch.delenv("UPLOADS_DIR", raising=False)
    from app.api.endpoints.images import _resolve_uploads_root

    result = _resolve_uploads_root()
    assert result == Path("uploads").resolve()


def test_validate_path_resolve_raises_returns_400(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Defence-in-depth: an OSError from Path.resolve maps to a 400."""
    from fastapi import HTTPException

    from app.api.endpoints import images as endpoint_module

    uploads_root = (tmp_path / "uploads").resolve()
    uploads_root.mkdir()

    class _ExplodingPath:
        def resolve(self, strict: bool = False) -> Path:
            del strict  # signature match — value unused.
            raise OSError("synthetic resolve failure")

    with pytest.raises(HTTPException) as excinfo:
        endpoint_module._validate_path_inside_uploads(
            _ExplodingPath(),  # type: ignore[arg-type]
            uploads_root,
        )
    assert excinfo.value.status_code == 400
