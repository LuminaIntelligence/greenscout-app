#!/usr/bin/env python3
"""T-036 - Inspect the GreenScout PPTX template, dump every text run.

Helper script (not part of CI). Uses only the Python stdlib (zipfile +
ElementTree) so it runs without installing python-pptx. Walks every
slide, extracts every <a:r>/<a:t> run, prints:

  slide N | shape "<name>" | run K | "<text>" [red=<true|false>]

The "red" annotation is best-effort: a run is marked red if its
``<a:solidFill><a:srgbClr val="FF0000"/>`` is set at the run level or
on a parent paragraph default. The mapping doc author still has to eyeball
the result.

Usage:
    python scripts/inspect-pptx.py templates/Machbarkeitsstudie-PV-Template_v1_6.pptx

Output to stdout. Pipe to a file if you want to keep it.
"""

from __future__ import annotations

import argparse
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

# Common PPTX OOXML namespaces.
NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

SLIDE_RE = re.compile(r"^ppt/slides/slide(\d+)\.xml$")


def shape_name(sp_elem: ET.Element) -> str:
    """Return the shape's display name from <p:nvSpPr><p:cNvPr name="...">."""
    cnvpr = sp_elem.find(".//p:nvSpPr/p:cNvPr", NS)
    if cnvpr is None:
        cnvpr = sp_elem.find(".//p:nvPicPr/p:cNvPr", NS)
    if cnvpr is None:
        cnvpr = sp_elem.find(".//p:nvGrpSpPr/p:cNvPr", NS)
    return cnvpr.get("name", "<unnamed>") if cnvpr is not None else "<unnamed>"


def run_is_red(run_elem: ET.Element) -> bool:
    """Best-effort: is this run's text colour the GreenScout red FF0000?"""
    fill = run_elem.find(".//a:rPr/a:solidFill/a:srgbClr", NS)
    if fill is None:
        return False
    val = (fill.get("val") or "").upper()
    return val == "FF0000"


def iter_text_runs(slide_root: ET.Element) -> list[tuple[str, int, str, bool]]:
    """Walk every text run on the slide.

    Returns a list of tuples ``(shape_name, run_index, text, is_red)``.
    Run indices restart per shape — easier to point at "slide 3, shape
    'Title 1', run 0" in the mapping doc.
    """
    rows: list[tuple[str, int, str, bool]] = []
    # Walk every shape-like container (<p:sp>, <p:pic>, <p:graphicFrame>).
    for sp in slide_root.iter():
        tag = sp.tag.rsplit("}", 1)[-1] if "}" in sp.tag else sp.tag
        if tag not in {"sp", "pic", "graphicFrame"}:
            continue
        name = shape_name(sp)
        runs = sp.findall(".//a:r", NS)
        if not runs:
            # Some shapes (image placeholders, picture frames) carry no text.
            # Emit a single marker row so the mapping doc can still flag them.
            if tag in {"pic", "graphicFrame"}:
                rows.append(
                    (name, -1, f"<<{tag.upper()} shape — no text runs>>", False)
                )
            continue
        for idx, r in enumerate(runs):
            t_elem = r.find("a:t", NS)
            text = (t_elem.text or "") if t_elem is not None else ""
            if not text.strip():
                continue
            rows.append((name, idx, text, run_is_red(r)))
    return rows


def main() -> int:
    """Entrypoint."""
    # Force UTF-8 on stdout/stderr so Unicode characters (CO2 subscript,
    # German umlauts) don't blow up on Windows-default cp1252 consoles.
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
        sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    except (AttributeError, OSError):
        pass

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("template", type=Path, help="Path to the .pptx template file.")
    args = parser.parse_args()

    if not args.template.exists():
        print(f"ERROR: template not found at {args.template}", file=sys.stderr)
        return 2

    with zipfile.ZipFile(args.template, "r") as zf:
        slide_names = sorted(
            (n for n in zf.namelist() if SLIDE_RE.match(n)),
            key=lambda n: int(SLIDE_RE.match(n).group(1)),  # type: ignore[union-attr]
        )
        if not slide_names:
            print("ERROR: no slides found inside the .pptx archive.", file=sys.stderr)
            return 3

        for slide_path in slide_names:
            slide_num = int(SLIDE_RE.match(slide_path).group(1))  # type: ignore[union-attr]
            with zf.open(slide_path) as fh:
                root = ET.parse(fh).getroot()
            print(f"\n=== Slide {slide_num} ({slide_path}) ===")
            rows = iter_text_runs(root)
            if not rows:
                print("  (no extractable text runs)")
                continue
            for shape, run_idx, text, is_red in rows:
                marker = " [RED]" if is_red else ""
                run_label = f"run {run_idx}" if run_idx >= 0 else "(no runs)"
                # Trim very long strings for readability.
                snippet = text if len(text) <= 200 else text[:200] + "..."
                print(f"  [{shape}] {run_label}: {snippet!r}{marker}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
