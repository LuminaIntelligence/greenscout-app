#!/usr/bin/env python3
"""T-037 — Apply `{{snake_case}}` placeholders to the PPTX template.

One-off migration script. Opens the GreenScout v1.6 PPTX template,
replaces every red literal text with its `{{snake_case_key}}` placeholder
per the mapping signed off in `docs/pptx-mapping.md`, renames the two
image placeholder shapes so the document generator (T-038b) can find
them by name, and writes the edited template back to the same path.

Idempotent — running it a second time is a no-op on already-edited
text (the literal won't exist any more). Image-shape renames are
also idempotent (the name is already what we want).

Usage::

    python scripts/apply-pptx-placeholders.py [path/to/template.pptx]

Default path is ``templates/Machbarkeitsstudie-PV-Template_v1_6.pptx``
relative to the repo root.

Run from the repo root so the default path resolves correctly. The
script prints a diff summary of every edit it makes.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

from pptx import Presentation
from pptx.enum.text import MSO_AUTO_SIZE
from pptx.shapes.base import BaseShape
from pptx.text.text import _Run


@dataclass(frozen=True)
class Edit:
    """One run-level text replacement (1-indexed slide, 0-indexed run)."""

    slide: int
    shape_name: str
    run_index: int
    old_text: str
    new_text: str


# Slide 1 ----------------------------------------------------------------
EDITS: tuple[Edit, ...] = (
    Edit(1, "Textfeld 3", 1, "Berater ", "{{consultant_full_name}} "),
    # Slide 2 ------------------------------------------------------------
    Edit(
        2,
        "Textfeld 4",
        0,
        "Einkaufszentrum Linzgau Center, Bergwaldstraße 4, 88630 Pfullendorf ",
        "{{customer_object_address}} ",
    ),
    Edit(2, "Textfeld 4", 1, "in Flurstück XYZ ", "in Flurstück {{flurstueck}} "),
    # Slide 3 ------------------------------------------------------------
    Edit(
        3,
        "Text 1",
        4,
        "Einkaufszentrum Linzgau Center, Bergwaldstraße 4, 88630 Pfullendorf in Flurstück 78.10 ",
        "{{customer_object_address_with_flurstueck}} ",
    ),
    Edit(3, "Text 2", 7, "27.500 ", "{{pacht_einnahme_einmalig_eur}} "),
    Edit(3, "Text 2", 11, "2050 ", "{{ersparnis_pro_monat_eur}} "),
    Edit(3, "Text 2", 17, "492.000", "{{ersparnis_gesamt_vertragslaufzeit_eur}}"),
    # Slide 4 ------------------------------------------------------------
    Edit(4, "Text 4", 0, "257", "{{anlage_kwp}}"),
    Edit(4, "Text 7", 0, "236.000", "{{pv_erzeugung_kwh_jahr}}"),
    Edit(4, "Text 9", 2, "4.720.000", "{{gesamterzeugung_vertragslaufzeit_kwh}}"),
    Edit(4, "Text 9", 6, "236.000 ", "{{pv_erzeugung_kwh_jahr}} "),
    Edit(4, "Text 13", 0, "41", "{{eigenverbrauchsquote_prozent}}"),
    Edit(4, "Text 15", 1, "164.000", "{{pv_eigenverbrauch_kwh_jahr}}"),
    Edit(4, "Text 16", 1, "492.000 ", "{{ersparnis_gesamt_vertragslaufzeit_eur}} "),
    Edit(4, "Text 18", 1, "24.600 ", "{{ersparnis_pro_jahr_eur}} "),
    Edit(4, "Textfeld 27", 2, "110 ", "{{co2_tonnen_pro_jahr}} "),
    Edit(4, "Textfeld 27", 8, " 39 ", " {{co2_hektar_mischwald}} "),
    Edit(4, "Textfeld 27", 12, "50 ", "{{co2_fussballfelder_pro_jahr}} "),
    Edit(4, "Textfeld 27", 16, "2200 ", "{{co2_tonnen_gesamt_vertragslaufzeit}} "),
    Edit(4, "Textfeld 27", 22, "1000 ", "{{co2_fussballfelder_gesamt_vertragslaufzeit}} "),
    # The "Text 16" / "Text 17" pair appears TWICE on slide 4 -- python-pptx
    # exposes both shapes with the same name. We match by name AND text.
    Edit(4, "Text 16", 0, "27.500 ", "{{pacht_einnahme_einmalig_eur}} "),
    Edit(4, "Textfeld 34", 1, "Linzgau Center, Pfullendorf. ", "{{customer_object_short_name_and_city}}. "),
    Edit(4, "Textfeld 34", 2, "Flurstück: 78.10", "Flurstück: {{flurstueck}}"),
    # Slide 5 ------------------------------------------------------------
    Edit(5, "Textfeld 13", 1, "27.500 ", "{{pacht_einnahme_einmalig_eur}} "),
    Edit(5, "Textfeld 15", 3, "468.982", "{{pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit}}"),
    Edit(5, "Textfeld 11", 0, "20,00 ", "{{pv_verkauf_ct_kwh}} "),
    Edit(5, "Textfeld 11", 7, "492.000", "{{ersparnis_gesamt_vertragslaufzeit_eur}}"),
    # Slide 9 ------------------------------------------------------------
    Edit(9, "Text 4", 1, "32", "{{versorger_preis_ct_kwh}}"),
    Edit(9, "Text 21", 2, "27.500", "{{pacht_einnahme_einmalig_eur}}"),
    Edit(9, "Text 21", 5, "492.000 ", "{{ersparnis_gesamt_vertragslaufzeit_eur}} "),
    Edit(9, "Text 21", 8, "2200 ", "{{co2_tonnen_gesamt_vertragslaufzeit}} "),
    # Slide 10 -----------------------------------------------------------
    Edit(10, "Text 1", 1, "Linzgau Center ", "{{customer_object_name}} "),
    Edit(10, "Text 1", 3, "257,12", "{{anlage_kwp}}"),
    Edit(10, "Text 5", 1, "257,12", "{{anlage_kwp}}"),
    Edit(10, "Text 5", 3, "587", "{{modul_anzahl}}"),
    Edit(10, "Text 5", 5, "1.178,6", "{{modul_flaeche_m2}}"),
    # Slide 11 -----------------------------------------------------------
    Edit(11, "Text 1", 1, "236.000", "{{pv_erzeugung_kwh_jahr}}"),
    Edit(11, "Text 1", 3, "41%", "{{eigenverbrauchsquote_prozent}}%"),
    Edit(11, "Text 3", 1, "236000 ", "{{pv_erzeugung_kwh_jahr}} "),
    Edit(11, "Text 5", 1, "164000 ", "{{pv_eigenverbrauch_kwh_jahr}} "),
    Edit(11, "Text 5", 5, "41% ", "{{eigenverbrauchsquote_prozent}}% "),
    Edit(11, "Text 7", 1, "72000 ", "{{netzeinspeisung_kwh_jahr}} "),
    # Slide 12 -----------------------------------------------------------
    Edit(12, "Text 1", 1, "20", "{{pv_verkauf_ct_kwh}}"),
    Edit(12, "Text 1", 3, "35 ", "{{versorger_preis_ct_kwh}} "),
    Edit(12, "Text 3", 1, "20 ", "{{pv_verkauf_ct_kwh}} "),
    Edit(12, "Text 6", 1, "35", "{{versorger_preis_ct_kwh}}"),
    Edit(12, "Text 9", 1, "24.600 ", "{{ersparnis_pro_jahr_eur}} "),
    Edit(12, "Text 9", 4, "492.000", "{{ersparnis_gesamt_vertragslaufzeit_eur}}"),
    Edit(12, "Text 10", 1, "164.000", "{{pv_eigenverbrauch_kwh_jahr}}"),
    # Slide 13 -----------------------------------------------------------
    Edit(13, "Text 2", 1, "24.600", "{{ersparnis_pro_jahr_eur}}"),
    Edit(13, "Text 4", 1, "490.000", "{{ersparnis_gesamt_vertragslaufzeit_eur}}"),
    Edit(13, "Text 6", 1, "27.500", "{{pacht_einnahme_einmalig_eur}}"),
    Edit(13, "Text 8", 1, "517.500 ", "{{gesamtvorteil_eur}} "),
    # Slide 14 -----------------------------------------------------------
    Edit(14, "Text 4", 1, "140.000 ", "{{stromkosten_ohne_pv_eur_jahr}} "),
    Edit(14, "Text 7", 1, "115.400", "{{stromkosten_mit_pv_eur_jahr}}"),
    Edit(14, "Text 8", 1, "20 ", "{{pv_verkauf_ct_kwh}} "),
    Edit(14, "Text 10", 1, "24.600", "{{ersparnis_pro_jahr_eur}}"),
    # Slide 15 -----------------------------------------------------------
    Edit(15, "Text 1", 1, "20", "{{pv_verkauf_ct_kwh}}"),
    Edit(15, "Text 3", 1, "35", "{{szenario_1_preis_ct_kwh}}"),
    Edit(15, "Text 3", 3, "24.600", "{{szenario_1_ersparnis_eur}}"),
    Edit(15, "Text 5", 1, "40", "{{szenario_2_preis_ct_kwh}}"),
    Edit(15, "Text 5", 3, "36.200", "{{szenario_2_ersparnis_eur}}"),
    Edit(15, "Text 7", 1, "45 ", "{{szenario_3_preis_ct_kwh}} "),
    Edit(15, "Text 7", 3, "47.800", "{{szenario_3_ersparnis_eur}}"),
    # Slide 16 -----------------------------------------------------------
    Edit(16, "Text 1", 1, "Linzgau Center", "{{customer_object_name}}"),
    Edit(16, "Text 3", 1, "27.500 ", "{{pacht_einnahme_einmalig_eur}} "),
    Edit(16, "Text 9", 1, "27.500", "{{pacht_einnahme_einmalig_eur}}"),
    Edit(16, "Text 9", 5, "20 ", "{{pv_verkauf_ct_kwh}} "),
    Edit(16, "Text 10", 1, "24.600 ", "{{ersparnis_pro_jahr_eur}} "),
    Edit(16, "Text 10", 4, "492.000", "{{ersparnis_gesamt_vertragslaufzeit_eur}}"),
    # Slide 17 -----------------------------------------------------------
    Edit(17, "Textfeld 7", 5, "24.600 ", "{{ersparnis_pro_jahr_eur}} "),
    Edit(17, "Textfeld 7", 9, "490.000 ", "{{ersparnis_gesamt_vertragslaufzeit_eur}} "),
    Edit(17, "Textfeld 20", 6, "27.500", "{{pacht_einnahme_einmalig_eur}}"),
    # Slide 19 -----------------------------------------------------------
    Edit(19, "Text 3", 3, "XX.XX.XXXX um XX.XX", "{{termin_vorschlag_1}}"),
    Edit(19, "Text 3", 8, "XX.XX.XXXX um XX.XX ", "{{termin_vorschlag_2}} "),
    Edit(19, "Text 2", 0, "Bernd Berater", "{{consultant_full_name}}"),
)

# (slide-number, original-shape-name) -> new shape name. Per Slice-3a sign-off item 5.
IMAGE_RENAMES: tuple[tuple[int, str, str], ...] = (
    (4, "Image 0", "image_before"),
    (5, "Grafik 2", "image_before"),
    (5, "Grafik 5", "image_after"),
)

# Shapes that should auto-shrink long text. Long-name + address fields per SPEC §4.8.
TEXT_TO_FIT_TARGETS: tuple[tuple[int, str], ...] = (
    (2, "Textfeld 4"),
    (3, "Text 1"),
    (4, "Textfeld 34"),
    (10, "Text 1"),
)


def _iter_runs(shape: BaseShape) -> Iterable[_Run]:
    """Yield every run inside a shape's text frame, in document order."""
    if not shape.has_text_frame:
        return
    for paragraph in shape.text_frame.paragraphs:
        yield from paragraph.runs


def _find_shape(shapes: Iterable[BaseShape], name: str) -> list[BaseShape]:
    """Return every shape with the given display name on a slide."""
    return [s for s in shapes if s.name == name]


def apply_edits(template_path: Path) -> int:
    """Apply EDITS + IMAGE_RENAMES + TEXT_TO_FIT_TARGETS to the template in place.

    Returns the number of changes actually applied (skips idempotent no-ops).
    """
    pres = Presentation(template_path)
    slides = list(pres.slides)

    applied = 0
    skipped: list[str] = []

    # 1) Text replacements.
    for edit in EDITS:
        if edit.slide - 1 >= len(slides):
            skipped.append(f"slide {edit.slide} out of range")
            continue
        slide = slides[edit.slide - 1]
        matched_shape = False
        for shape in _find_shape(slide.shapes, edit.shape_name):
            if not shape.has_text_frame:
                continue
            runs = list(_iter_runs(shape))
            if edit.run_index >= len(runs):
                continue
            run = runs[edit.run_index]
            current = run.text
            if current == edit.new_text:
                # Idempotent: already applied.
                matched_shape = True
                break
            if current != edit.old_text:
                continue
            run.text = edit.new_text
            applied += 1
            matched_shape = True
            print(
                f"  slide {edit.slide} {edit.shape_name} run {edit.run_index}: "
                f"{edit.old_text!r} -> {edit.new_text!r}"
            )
            break
        if not matched_shape:
            skipped.append(
                f"slide {edit.slide} {edit.shape_name} run {edit.run_index}: "
                f"could not find {edit.old_text!r}"
            )

    # 2) TEXT_TO_FIT_SHAPE on long-text frames.
    for slide_num, shape_name in TEXT_TO_FIT_TARGETS:
        if slide_num - 1 >= len(slides):
            continue
        slide = slides[slide_num - 1]
        for shape in _find_shape(slide.shapes, shape_name):
            if not shape.has_text_frame:
                continue
            current = shape.text_frame.auto_size
            if current == MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE:
                continue
            shape.text_frame.auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE
            applied += 1
            print(f"  slide {slide_num} {shape_name}: TEXT_TO_FIT_SHAPE applied")

    # 3) Image-placeholder shape renames.
    for slide_num, old_name, new_name in IMAGE_RENAMES:
        if slide_num - 1 >= len(slides):
            continue
        slide = slides[slide_num - 1]
        candidates = _find_shape(slide.shapes, old_name)
        if not candidates:
            # Already renamed on a re-run?
            if _find_shape(slide.shapes, new_name):
                continue
            skipped.append(f"slide {slide_num}: shape '{old_name}' not found for rename")
            continue
        for shape in candidates:
            shape.name = new_name
            applied += 1
            print(f"  slide {slide_num}: rename '{old_name}' -> '{new_name}'")

    if skipped:
        print("\nSKIPPED:", file=sys.stderr)
        for s in skipped:
            print(f"  - {s}", file=sys.stderr)

    pres.save(template_path)
    return applied


def main() -> int:
    """Entrypoint."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "template",
        type=Path,
        nargs="?",
        default=Path("templates/Machbarkeitsstudie-PV-Template_v1_6.pptx"),
        help="Path to the .pptx template (defaults to the v1.6 GreenScout template).",
    )
    args = parser.parse_args()

    if not args.template.exists():
        print(f"ERROR: template not found at {args.template}", file=sys.stderr)
        return 2

    print(f"Applying placeholders to {args.template} ...")
    applied = apply_edits(args.template)
    print(f"\nDone. {applied} edits applied.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
