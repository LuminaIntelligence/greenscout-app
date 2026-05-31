#!/usr/bin/env python3
"""One-shot helper: remove empty red marker rectangles from the PPTX template.

Defekt R2-2 (2026-05-31) — see DECISIONS.md.

Background: the template author placed several pure-outline red
rectangles (``line.color.rgb == #FF0000``, no fill, no text) on
slides 2, 5, 10, 15, 19 as authoring hints to mark "image goes here"
or "value goes here" regions. They are visible in the rendered
output, customer-hostile, and entirely meaningless once the
substitution + image-insertion pipeline has run.

This script walks the template and deletes every shape that satisfies
ALL of these predicates:

  * Auto-shape (typically rectangle).
  * Line color set, RGB-equal to ``#FF0000``.
  * Has no text frame, OR the text frame is empty.
  * Fill is BACKGROUND (5) — outline-only.

The script intentionally does NOT touch:

  * Shapes with non-marker line colors (the muted-lime
    ``Rechteck: abgerundete Ecken`` cards on slide 5 — line color
    ``#DDEAC7`` — are kept).
  * Shapes with content (text or solid fill).
  * The substitution-pipeline placeholders inside text frames (those
    are run-level red colors, not shape-line red — covered by R2-1).

Run once from the repo root. Re-running on a clean template is a no-op
(idempotent — see the WARN message). The companion R2-3 fix hardcodes
the captured slide-5 BEFORE/AFTER marker geometry into
``pptx_generator.py`` so deleting the marker frames does not lose
the positional reference.

Usage::

    python scripts/remove-marker-frames.py [path/to/template.pptx]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

DEFAULT_TEMPLATE = Path("templates/Machbarkeitsstudie-PV-Template_v1_6.pptx")
MARKER_RED = (0xFF, 0x00, 0x00)


def _is_marker_red_line(shape: Any) -> bool:
    """True if the shape has an explicit FF0000 line color."""
    try:
        if shape.line.color.type is None:
            return False
        rgb = shape.line.color.rgb
        if rgb is None:
            return False
        return (int(rgb[0]), int(rgb[1]), int(rgb[2])) == MARKER_RED
    except (AttributeError, KeyError, TypeError):
        return False


def _is_empty_text(shape: Any) -> bool:
    """True if the shape has no text frame or the text frame is empty."""
    if not getattr(shape, "has_text_frame", False):
        return True
    try:
        return shape.text_frame.text.strip() == ""
    except (AttributeError, TypeError):
        return True


def _is_background_fill(shape: Any) -> bool:
    """True if the shape's fill is BACKGROUND (no solid color)."""
    try:
        # python-pptx fill.type: 1=SOLID, 5=BACKGROUND, None=inherited
        ftype = shape.fill.type
        return ftype is None or int(ftype) == 5
    except (AttributeError, KeyError, TypeError):
        # When fill access raises, treat conservatively as not background
        # (don't delete) — the line-color predicate is the strict gate.
        return False


def _is_marker_frame(shape: Any) -> bool:
    """Predicate: empty red-outline rectangle = template author's marker frame."""
    if shape.shape_type != MSO_SHAPE_TYPE.AUTO_SHAPE:
        return False
    if not _is_marker_red_line(shape):
        return False
    if not _is_empty_text(shape):
        return False
    return _is_background_fill(shape)


def remove_marker_frames(template_path: Path) -> int:
    """Remove every empty red marker rectangle from the template.

    Returns the total count of shapes removed across all slides.
    """
    pres = Presentation(str(template_path))
    total_removed = 0
    for slide_idx, slide in enumerate(pres.slides):
        # Iterate over a snapshot because we mutate the underlying tree.
        for shape in list(slide.shapes):
            if not _is_marker_frame(shape):
                continue
            sp = shape._element  # type: ignore[attr-defined]
            sp.getparent().remove(sp)
            print(
                f"Removed marker frame {shape.name!r} (id={shape.shape_id}) "
                f"from slide {slide_idx + 1}"
            )
            total_removed += 1

    if total_removed == 0:
        print(
            "WARN: no marker frames found — template may already be clean.",
            file=sys.stderr,
        )
    else:
        pres.save(str(template_path))
        print(f"Saved {template_path} — removed {total_removed} marker frame(s).")
    return total_removed


def main() -> int:
    """Entrypoint."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "template",
        type=Path,
        nargs="?",
        default=DEFAULT_TEMPLATE,
        help="Path to the .pptx template (defaults to the v1.6 GreenScout template).",
    )
    args = parser.parse_args()

    if not args.template.exists():
        print(f"ERROR: template not found at {args.template}", file=sys.stderr)
        return 2

    remove_marker_frames(args.template)
    return 0


if __name__ == "__main__":
    sys.exit(main())
