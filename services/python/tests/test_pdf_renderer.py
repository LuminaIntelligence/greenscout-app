# pyright: reportPrivateUsage=false, reportUnknownLambdaType=false
"""T-039 — Tests for the PDF renderer (subprocess-mocked).

We never spawn a real LibreOffice in unit tests — installing it costs
800 MB and slows the test run an order of magnitude. Instead we mock
``subprocess.run`` to return a deterministic ``CompletedProcess`` and
write a fake PDF to the expected ``output_dir``.

End-to-end LibreOffice exercise lives in the Docker smoke test
(T-052).
"""

from __future__ import annotations

import subprocess
from typing import TYPE_CHECKING
from unittest.mock import MagicMock, patch

if TYPE_CHECKING:
    from pathlib import Path

import pytest

from app.services.pdf_renderer import (
    DEFAULT_TIMEOUT_SECONDS,
    LibreOfficeError,
    _resolve_binary,
    render_pdf,
)


def _fake_completed(returncode: int = 0, stdout: str = "", stderr: str = "") -> MagicMock:
    cp = MagicMock(spec=subprocess.CompletedProcess)
    cp.returncode = returncode
    cp.stdout = stdout
    cp.stderr = stderr
    return cp


# --- _resolve_binary --------------------------------------------------


def test_resolve_binary_returns_caller_override() -> None:
    assert _resolve_binary("/opt/lo/program/soffice") == "/opt/lo/program/soffice"


def test_resolve_binary_picks_libreoffice_when_available() -> None:
    with patch("app.services.pdf_renderer.shutil.which") as which:
        which.side_effect = lambda name: "/usr/bin/libreoffice" if name == "libreoffice" else None
        assert _resolve_binary(None) == "libreoffice"


def test_resolve_binary_picks_soffice_if_libreoffice_missing() -> None:
    with patch("app.services.pdf_renderer.shutil.which") as which:
        which.side_effect = lambda name: "/usr/bin/soffice" if name == "soffice" else None
        assert _resolve_binary(None) == "soffice"


def test_resolve_binary_raises_when_neither_found() -> None:
    with (
        patch("app.services.pdf_renderer.shutil.which", return_value=None),
        pytest.raises(LibreOfficeError),
    ):
        _resolve_binary(None)


# --- render_pdf -------------------------------------------------------


def test_render_pdf_raises_when_input_missing(tmp_path: Path) -> None:
    with pytest.raises(LibreOfficeError, match="does not exist"):
        render_pdf(tmp_path / "missing.pptx", tmp_path / "out")


def test_render_pdf_happy_path(tmp_path: Path) -> None:
    pptx = tmp_path / "study.pptx"
    pptx.write_bytes(b"FAKE PPTX")
    out_dir = tmp_path / "out"

    def fake_run(*args: object, **kwargs: object) -> MagicMock:
        # Simulate LibreOffice writing the PDF.
        (out_dir / "study.pdf").write_bytes(b"%PDF-1.4 fake")
        return _fake_completed(0, "converted")

    with (
        patch("app.services.pdf_renderer.shutil.which", return_value="/usr/bin/libreoffice"),
        patch("app.services.pdf_renderer.subprocess.run", side_effect=fake_run) as run,
    ):
        result = render_pdf(pptx, out_dir)

    assert result == out_dir / "study.pdf"
    assert result.exists()
    # Check the subprocess call shape.
    call_args = run.call_args[0][0]
    assert call_args[0] == "libreoffice"
    assert "--headless" in call_args
    assert "--convert-to" in call_args
    assert call_args[-1] == str(pptx)


def test_render_pdf_uses_default_timeout(tmp_path: Path) -> None:
    pptx = tmp_path / "study.pptx"
    pptx.write_bytes(b"x")
    out_dir = tmp_path / "out"

    def fake_run(*args: object, **kwargs: object) -> MagicMock:
        assert kwargs["timeout"] == DEFAULT_TIMEOUT_SECONDS
        (out_dir / "study.pdf").write_bytes(b"%PDF")
        return _fake_completed(0)

    with (
        patch("app.services.pdf_renderer.shutil.which", return_value="/usr/bin/libreoffice"),
        patch("app.services.pdf_renderer.subprocess.run", side_effect=fake_run),
    ):
        render_pdf(pptx, out_dir)


def test_render_pdf_honours_custom_timeout(tmp_path: Path) -> None:
    pptx = tmp_path / "study.pptx"
    pptx.write_bytes(b"x")
    out_dir = tmp_path / "out"

    def fake_run(*args: object, **kwargs: object) -> MagicMock:
        assert kwargs["timeout"] == 5.0
        (out_dir / "study.pdf").write_bytes(b"%PDF")
        return _fake_completed(0)

    with (
        patch("app.services.pdf_renderer.shutil.which", return_value="/usr/bin/libreoffice"),
        patch("app.services.pdf_renderer.subprocess.run", side_effect=fake_run),
    ):
        render_pdf(pptx, out_dir, timeout_seconds=5.0)


def test_render_pdf_raises_on_subprocess_nonzero(tmp_path: Path) -> None:
    pptx = tmp_path / "study.pptx"
    pptx.write_bytes(b"x")
    with (
        patch("app.services.pdf_renderer.shutil.which", return_value="/usr/bin/libreoffice"),
        patch(
            "app.services.pdf_renderer.subprocess.run",
            return_value=_fake_completed(1, stderr="boom"),
        ),
        pytest.raises(LibreOfficeError, match="exited with code 1"),
    ):
        render_pdf(pptx, tmp_path / "out")


def test_render_pdf_raises_on_timeout(tmp_path: Path) -> None:
    pptx = tmp_path / "study.pptx"
    pptx.write_bytes(b"x")
    with (
        patch("app.services.pdf_renderer.shutil.which", return_value="/usr/bin/libreoffice"),
        patch(
            "app.services.pdf_renderer.subprocess.run",
            side_effect=subprocess.TimeoutExpired(cmd="libreoffice", timeout=60),
        ),
        pytest.raises(LibreOfficeError, match="timed out"),
    ):
        render_pdf(pptx, tmp_path / "out")


def test_render_pdf_raises_when_output_missing(tmp_path: Path) -> None:
    """LibreOffice claims success (exit 0) but the PDF file is not on disk."""
    pptx = tmp_path / "study.pptx"
    pptx.write_bytes(b"x")
    with (
        patch("app.services.pdf_renderer.shutil.which", return_value="/usr/bin/libreoffice"),
        patch(
            "app.services.pdf_renderer.subprocess.run",
            return_value=_fake_completed(0, stdout="ok"),
        ),
        pytest.raises(LibreOfficeError, match="missing"),
    ):
        render_pdf(pptx, tmp_path / "out")
