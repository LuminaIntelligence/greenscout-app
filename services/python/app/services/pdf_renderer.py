"""T-039 — PPTX -> PDF rendering via headless LibreOffice.

Strategy: invoke ``libreoffice --headless --convert-to pdf --outdir <dir>
<input.pptx>`` as a subprocess with a 60-second hard timeout
(SPEC §6.2 budget for document generation is 30 s end-to-end; the
LibreOffice step is the bulk of that; 60 s gives headroom).

Wired into Docker via the apt install in services/python/Dockerfile.
The binary is named ``libreoffice`` on Debian; ``soffice`` is the
classic OOo name but it's a symlink to the same thing.

On render failure the function raises ``LibreOfficeError`` with a
structured message; the FastAPI endpoint translates that into a
500-class response that the Next.js client maps to a SPEC §4.9 banner.

@see SPEC §4.8 (LibreOffice headless conversion)
@see SPEC §6.2 (30 s budget for full document-generation pipeline)
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

logger = logging.getLogger(__name__)

#: Hard subprocess timeout. Generous w.r.t. the SPEC §6.2 30 s budget so a
#: temporarily slow LibreOffice startup (cold container, font scan) doesn't
#: flap-fail the whole feature.
DEFAULT_TIMEOUT_SECONDS = 60.0


class LibreOfficeError(RuntimeError):
    """Raised when the LibreOffice subprocess fails or times out."""


def _resolve_binary(binary: str | None) -> str:
    """Resolve the LibreOffice executable name. Caller may override."""
    if binary:
        return binary
    # Both names exist on Debian; prefer ``libreoffice``.
    for candidate in ("libreoffice", "soffice"):
        if shutil.which(candidate):
            return candidate
    raise LibreOfficeError(
        "LibreOffice binary not found on PATH (looked for 'libreoffice' and 'soffice')."
    )


def render_pdf(
    pptx_path: Path,
    output_dir: Path,
    *,
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    binary: str | None = None,
) -> Path:
    """Render a PPTX to PDF via headless LibreOffice.

    Args:
        pptx_path: Path to the input PPTX (must exist).
        output_dir: Directory where the PDF should be written. Created
            if missing. LibreOffice writes ``<stem>.pdf`` into this dir.
        timeout_seconds: Hard cap on the subprocess. Raises on overrun.
        binary: Optional override for the LibreOffice executable
            (mostly for tests / debugging on systems with a different
            install path).

    Returns:
        The path of the generated PDF.

    Raises:
        LibreOfficeError: on non-zero exit, missing output file, or timeout.
    """
    if not pptx_path.exists():
        raise LibreOfficeError(f"input PPTX does not exist: {pptx_path}")

    output_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        _resolve_binary(binary),
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        str(output_dir),
        str(pptx_path),
    ]
    logger.info("pdf_renderer: spawning %s", " ".join(cmd))

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise LibreOfficeError(
            f"LibreOffice timed out after {timeout_seconds}s converting {pptx_path}"
        ) from exc

    if result.returncode != 0:
        raise LibreOfficeError(
            f"LibreOffice exited with code {result.returncode}: "
            f"stderr={result.stderr.strip()!r}, stdout={result.stdout.strip()!r}"
        )

    expected = output_dir / (pptx_path.stem + ".pdf")
    if not expected.exists():
        raise LibreOfficeError(
            f"LibreOffice reported success but the expected PDF {expected} is missing. "
            f"stdout={result.stdout.strip()!r}"
        )
    logger.info("pdf_renderer: wrote %s", expected)
    return expected
