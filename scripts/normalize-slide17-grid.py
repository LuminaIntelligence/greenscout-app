#!/usr/bin/env python3
"""One-shot helper: normalize Slide 17 grid layout.

Defekt C2 (2026-05-29) — see DECISIONS.md.

Background: Slide 17 ("Der Weg zur Inbetriebnahme") is a 7-column grid
with two rows ("Inhalte" upper / "Ergebnisse" lower). In the original
template every Inhalt-Shape had ``auto_size = SHAPE_TO_FIT_TEXT``,
meaning each shape grew vertically with its text. Column 5 (Textfeld 5
"Bauausführung", H=445) was already taller than its siblings (H=271,
285, 344, 184, 169) — this pushed Column 5's Ergebnis cell (Textfeld 11)
down from T=569 to T=639, breaking the visual baseline of the result
row by 67 px. Two failure modes:

1.  Visual layout broken today (Column 5 results sit ~70 px lower).
2.  Forward-fragile: longer Studien-Inhalte in future renders would
    push the result baseline further down or push other columns off
    grid.

Fix per user-Defekt-Report recommendation (a):

- Inhalte-Shapes (Textfeld 2, 3, 4, 5, 6, 7, 20): height normalized to
  the current max (445 EMU-px = 445 * 9525 EMU). All seven columns
  share one common height.
- Inhalte-Shapes: ``auto_size = TEXT_TO_FIT_SHAPE``. If a future
  Studien-Text is too long for the fixed slot, the text *shrinks* to
  fit instead of growing the shape. ``word_wrap = True`` ensures
  multi-line wrapping still works before the auto-fit kicks in.
- Ergebnis-Shapes (Textfeld 8, 9, 10, 11, 12, 13, 21): top normalized
  to the median (T=569 EMU-px). Only Textfeld 11 actually moves
  (from 639 → 569); the others are no-ops.
- Ergebnis-Shapes also get TEXT_TO_FIT_SHAPE + word_wrap for the same
  forward-fragility reason.

Run once from the repo root and commit the resulting template binary.

Usage::

    python scripts/normalize-slide17-grid.py [path/to/template.pptx]

Default path is ``templates/Machbarkeitsstudie-PV-Template_v1_6.pptx``
relative to the repo root.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pptx import Presentation
from pptx.enum.text import MSO_AUTO_SIZE

DEFAULT_TEMPLATE = Path("templates/Machbarkeitsstudie-PV-Template_v1_6.pptx")
SLIDE_INDEX = 16  # slide 17 (0-indexed)

# Shape names identified via scripts/inspect-pptx.py + Slide-17-Inventory
# on 2026-05-29 (see DECISIONS C2 entry for the full inventory dump).
INHALT_SHAPE_NAMES = {
    "Textfeld 2",  # col 1
    "Textfeld 3",  # col 2
    "Textfeld 4",  # col 3
    "Textfeld 20",  # col 4
    "Textfeld 5",  # col 5 — currently H=445 (tallest)
    "Textfeld 6",  # col 6
    "Textfeld 7",  # col 7
}

ERGEBNIS_SHAPE_NAMES = {
    "Textfeld 8",  # col 1
    "Textfeld 9",  # col 2
    "Textfeld 10",  # col 3
    "Textfeld 21",  # col 4
    "Textfeld 11",  # col 5 — currently T=639 (off-grid)
    "Textfeld 12",  # col 6
    "Textfeld 13",  # col 7
}

EMU_PER_PX = 9525  # 1 px @ 96 dpi
TARGET_INHALT_HEIGHT_EMU = 445 * EMU_PER_PX  # max of current heights
TARGET_ERGEBNIS_TOP_EMU = 569 * EMU_PER_PX  # median of current tops


def normalize_slide17(template_path: Path) -> int:
    """Normalize Slide 17 grid layout. Returns the count of modified shapes."""
    pres = Presentation(str(template_path))
    if len(pres.slides) <= SLIDE_INDEX:
        print(
            f"ERROR: slide {SLIDE_INDEX + 1} does not exist in {template_path}",
            file=sys.stderr,
        )
        return -1

    slide = pres.slides[SLIDE_INDEX]
    modified: list[tuple[str, str, int, str]] = []  # (kind, name, shape_id, change)

    seen_inhalt: set[str] = set()
    seen_ergebnis: set[str] = set()

    for shape in slide.shapes:
        if shape.name in INHALT_SHAPE_NAMES:
            seen_inhalt.add(shape.name)
            changes: list[str] = []
            # Height normalization.
            if shape.height != TARGET_INHALT_HEIGHT_EMU:
                old_h_px = int(shape.height) // EMU_PER_PX
                shape.height = TARGET_INHALT_HEIGHT_EMU
                changes.append(f"H {old_h_px}→{TARGET_INHALT_HEIGHT_EMU // EMU_PER_PX}px")
            # Auto-size + word-wrap.
            if shape.has_text_frame:
                tf = shape.text_frame
                if tf.auto_size != MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE:
                    tf.auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE
                    changes.append("auto_size→TEXT_TO_FIT_SHAPE")
                if not tf.word_wrap:
                    tf.word_wrap = True
                    changes.append("word_wrap→True")
            modified.append(
                ("inhalt", shape.name, int(shape.shape_id), ", ".join(changes) or "noop")
            )
        elif shape.name in ERGEBNIS_SHAPE_NAMES:
            seen_ergebnis.add(shape.name)
            changes = []
            # Top normalization.
            if shape.top != TARGET_ERGEBNIS_TOP_EMU:
                old_t_px = int(shape.top) // EMU_PER_PX
                shape.top = TARGET_ERGEBNIS_TOP_EMU
                changes.append(f"T {old_t_px}→{TARGET_ERGEBNIS_TOP_EMU // EMU_PER_PX}px")
            # Auto-size + word-wrap.
            if shape.has_text_frame:
                tf = shape.text_frame
                if tf.auto_size != MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE:
                    tf.auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE
                    changes.append("auto_size→TEXT_TO_FIT_SHAPE")
                if not tf.word_wrap:
                    tf.word_wrap = True
                    changes.append("word_wrap→True")
            modified.append(
                ("ergebnis", shape.name, int(shape.shape_id), ", ".join(changes) or "noop")
            )

    # Defensive sanity check — fail loudly if a shape name went missing
    # (template was edited and the constants here drifted).
    missing_inhalt = INHALT_SHAPE_NAMES - seen_inhalt
    missing_ergebnis = ERGEBNIS_SHAPE_NAMES - seen_ergebnis
    if missing_inhalt or missing_ergebnis:
        print(
            "ERROR: expected shape names not found on slide 17:\n"
            f"  missing inhalt:    {sorted(missing_inhalt)}\n"
            f"  missing ergebnis:  {sorted(missing_ergebnis)}\n"
            "Update the constants in this script after re-running inspect-pptx.",
            file=sys.stderr,
        )
        return -2

    if not modified:
        print("WARN: no shapes matched — nothing to normalize.")
        return 0

    pres.save(str(template_path))
    print(f"Modified {len(modified)} shapes on slide {SLIDE_INDEX + 1}:")
    for kind, name, sid, change in modified:
        print(f"  {kind:8s} {name:14s} (id={sid:3d})  {change}")
    return len(modified)


def main() -> int:
    """Entrypoint."""
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
        sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    except (AttributeError, OSError):
        pass

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

    result = normalize_slide17(args.template)
    if result < 0:
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
