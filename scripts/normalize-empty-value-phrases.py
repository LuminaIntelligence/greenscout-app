#!/usr/bin/env python3
"""One-shot: replace raw-field placeholders with pre-rendered phrase-keys
for empty-value-safe rendering.

Defekte D1+D2+D3 (2026-05-29) — see DECISIONS.md.

Production-Symptome:
- D1: ``flurstueck`` leer → "Mittelgrundstr. Test in Flurstück "
  (hängender Präfix). Affects Slides 2 + 4.
- D2: ``terminVorschlag1``/``terminVorschlag2`` leer → "1) am  Uhr".
  Affects Slide 19.
- D3: ``modul_anzahl``/``modul_flaeche_m2`` leer → "500 kWp, Module, m²"
  (Einheiten ohne Werte). Affects Slide 10.

Fix-Strategie: Server Action (``src/features/studies/actions/
generate-document.ts``) pre-renders phrase-keys; empty string → die
umgebenden Präfix/Suffix-Texte verschwinden mit dem Wert. Template wird
hier modifiziert, sodass die raw-field-Placeholders durch single-run
phrase-keys ersetzt werden.

Replacements (per paragraph):

- **Slide 2, Textfeld 4, Para 0**:
    ['<addr>', 'in Flurstück {{flurstueck}} ', ...]
  → run 1's text replaced with ``{{flurstueck_phrase}}`` (the phrase
    includes the leading space, e.g. ``" in Flurstück 78.10"``).

- **Slide 4, Textfeld 34, Para 2**:
    ['<short>', 'Flurstück: {{flurstueck}}']
  → run becomes ``{{flurstueck_label_phrase}}``.

- **Slide 10, Text 5, Para 0**:
    ['Gesamtleistung: ', '{{anlage_kwp}}', ' kWp, ',
     '{{modul_anzahl}}', ' Module, ', '{{modul_flaeche_m2}}', ' m²']
  → reduced to runs ['Gesamtleistung: ', '{{modul_info_phrase}}']
    (modul_info_phrase ALWAYS contains the kWp headline, plus the optional
    Module / m² segments only when those values are non-null).

- **Slide 19, Text 3, Paras 2/3/4**:
    Para 2: ['1) am ', '{{termin_vorschlag_1}}', ' Uhr ']
      → ['{{termin_1_phrase}}']
    Para 3: ['oder']
      → ['{{termin_oder_phrase}}']
    Para 4: ['2', ') am ', '{{termin_vorschlag_2}} ', 'Uhr ']
      → ['{{termin_2_phrase}}']

Run-level formatting (font, size, red FF0000 colour) is preserved by
mutating the first run's ``.text`` and clearing the remaining runs in
the same paragraph rather than replacing the XML wholesale.

The script is idempotent — re-running it produces no further changes
once the template has been migrated.

Usage::

    python scripts/normalize-empty-value-phrases.py [path/to/template.pptx]

Default path is ``templates/Machbarkeitsstudie-PV-Template_v1_6.pptx``
relative to the repo root.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pptx import Presentation

DEFAULT_TEMPLATE = Path("templates/Machbarkeitsstudie-PV-Template_v1_6.pptx")

# Slide indices (0-based).
SLIDE_2_INDEX = 1
SLIDE_4_INDEX = 3
SLIDE_10_INDEX = 9
SLIDE_19_INDEX = 18


def _set_paragraph_single_run(paragraph, new_text: str) -> bool:
    """Reduce a paragraph to a single text run carrying ``new_text``.

    Keeps the formatting of run 0 (the first run preserves font, size,
    colour, etc.). All subsequent runs are emptied. Returns True if any
    mutation happened.
    """
    runs = paragraph.runs
    if not runs:
        return False
    changed = False
    if runs[0].text != new_text:
        runs[0].text = new_text
        changed = True
    for r in runs[1:]:
        if r.text != "":
            r.text = ""
            changed = True
    return changed


def _replace_run_text(paragraph, run_index: int, new_text: str) -> bool:
    """Replace a single run's text inside ``paragraph`` (preserve format)."""
    runs = paragraph.runs
    if run_index >= len(runs):
        return False
    if runs[run_index].text == new_text:
        return False
    runs[run_index].text = new_text
    return True


def _find_shape(slide, name: str):
    """Return the first shape on the slide whose ``.name`` matches."""
    for shape in slide.shapes:
        if shape.name == name:
            return shape
    return None


def normalize(template_path: Path) -> int:
    """Apply the phrase-key migration. Returns the count of mutated runs."""
    pres = Presentation(str(template_path))
    if len(pres.slides) <= SLIDE_19_INDEX:
        print(
            f"ERROR: slide {SLIDE_19_INDEX + 1} does not exist in {template_path}",
            file=sys.stderr,
        )
        return -1

    mutations: list[str] = []

    # --- Slide 2 ------------------------------------------------------
    slide2 = pres.slides[SLIDE_2_INDEX]
    shape = _find_shape(slide2, "Textfeld 4")
    if shape is None or not shape.has_text_frame:
        print("ERROR: Slide 2 'Textfeld 4' not found", file=sys.stderr)
        return -2
    para = shape.text_frame.paragraphs[0]
    # Replace run 1 (the "in Flurstück {{flurstueck}} " run).
    if _replace_run_text(para, 1, "{{flurstueck_phrase}}"):
        mutations.append("Slide2 / Textfeld 4 / para 0 / run 1")

    # --- Slide 4 ------------------------------------------------------
    slide4 = pres.slides[SLIDE_4_INDEX]
    shape = _find_shape(slide4, "Textfeld 34")
    if shape is None or not shape.has_text_frame:
        print("ERROR: Slide 4 'Textfeld 34' not found", file=sys.stderr)
        return -3
    # The "Flurstück: {{flurstueck}}" run is paragraph 2 run 0.
    if _replace_run_text(shape.text_frame.paragraphs[2], 0, "{{flurstueck_label_phrase}}"):
        mutations.append("Slide4 / Textfeld 34 / para 2 / run 0")

    # --- Slide 10 -----------------------------------------------------
    slide10 = pres.slides[SLIDE_10_INDEX]
    shape = _find_shape(slide10, "Text 5")
    if shape is None or not shape.has_text_frame:
        print("ERROR: Slide 10 'Text 5' not found", file=sys.stderr)
        return -4
    para = shape.text_frame.paragraphs[0]
    runs = para.runs
    # Expected runs:
    # 0: 'Gesamtleistung: '
    # 1: '{{anlage_kwp}}'
    # 2: ' kWp, '
    # 3: '{{modul_anzahl}}'
    # 4: ' Module, '
    # 5: '{{modul_flaeche_m2}}'
    # 6: ' m²'
    # We want to collapse runs 1..6 into a single phrase run, but
    # python-pptx doesn't easily delete runs. Strategy: keep run 0's
    # "Gesamtleistung: " static text, put the phrase into run 1, and
    # blank runs 2..6.
    if len(runs) >= 2:
        if _replace_run_text(para, 1, "{{modul_info_phrase}}"):
            mutations.append("Slide10 / Text 5 / para 0 / run 1")
        for ri in range(2, len(runs)):
            if _replace_run_text(para, ri, ""):
                mutations.append(f"Slide10 / Text 5 / para 0 / run {ri} (blanked)")

    # --- Slide 19 -----------------------------------------------------
    slide19 = pres.slides[SLIDE_19_INDEX]
    shape = _find_shape(slide19, "Text 3")
    if shape is None or not shape.has_text_frame:
        print("ERROR: Slide 19 'Text 3' not found", file=sys.stderr)
        return -5
    paras = shape.text_frame.paragraphs
    if len(paras) <= 4:
        print(
            f"ERROR: Slide 19 'Text 3' has {len(paras)} paragraphs, expected >= 5",
            file=sys.stderr,
        )
        return -6

    # Paragraph 2: '1) am ' + {{termin_vorschlag_1}} + ' Uhr '
    if _set_paragraph_single_run(paras[2], "{{termin_1_phrase}}"):
        mutations.append("Slide19 / Text 3 / para 2 (collapsed to single run)")

    # Paragraph 3: 'oder' -> '{{termin_oder_phrase}}'
    if _set_paragraph_single_run(paras[3], "{{termin_oder_phrase}}"):
        mutations.append("Slide19 / Text 3 / para 3 (collapsed to single run)")

    # Paragraph 4: '2' + ') am ' + {{termin_vorschlag_2}} ' + 'Uhr '
    if _set_paragraph_single_run(paras[4], "{{termin_2_phrase}}"):
        mutations.append("Slide19 / Text 3 / para 4 (collapsed to single run)")

    if not mutations:
        print("Nothing to change — template already uses phrase-keys.")
        return 0

    pres.save(str(template_path))
    print(f"Mutated {len(mutations)} run(s):")
    for m in mutations:
        print(f"  {m}")
    return len(mutations)


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

    result = normalize(args.template)
    if result < 0:
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
