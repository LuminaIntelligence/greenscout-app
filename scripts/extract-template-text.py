"""
Pivot-2b — Mechanische Text-Extraktion aus dem PPTX-Original.

Läuft EINMAL lokal nach Setup von scripts/.venv-pptx-extract/ (siehe
scripts/README-extract-template.md). Output:
src/features/studies/document/template-content.json.

Dieses JSON ist die Source of Truth für die statischen Slide-Texte der
treuen React-Reproduktion. Es wird versioniert mit-eingecheckt, damit der
Build/CI reproduzierbar ohne python-pptx läuft (python-pptx ist in der
pyservice-Production-requirements NICHT mehr enthalten — siehe DECISIONS
2026-06-01).

Sicherheit gegen Drift:
- Statische Slide-Texte werden NICHT manuell in TSX-Komponenten abgetippt;
  sie kommen aus diesem JSON.
- Wenn das PPTX aktualisiert wird, läuft dieses Skript erneut und das JSON
  wird neu generiert — der Diff im Review zeigt was sich textuell geändert
  hat.

Pass-2-Bugfix (2026-06-02):
- Pro Paragraph ein `paragraphs[].joined_text`-Feld der alle Runs in
  Reihenfolge konkateniert. Konsumenten der JSON nutzen den joined_text
  und ersparen sich das Run-Joining (Vorher: pro-Run-Records nur, dadurch
  in der Review-Phase wiederholt verlorene Run-Konkatenierung).
- Group-Shape-Rekursion (`shape_type == MSO_SHAPE_TYPE.GROUP` → `.shapes`)
  damit verschachtelte Textboxen nicht verloren gehen. Im aktuellen
  PPTX-State sind keine Group-Shapes drin, der Fix ist Defense-in-Depth
  gegen spätere Template-Updates.
- Zusätzlich pro Shape ein `joined_text`-Feld der alle Paragraphen mit
  Newlines trennt — gibt ein einzeiliges Display in der Verifikations-
  Phase ohne Run-Magic.
"""

import json
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE_TYPE

REPO_ROOT = Path(__file__).resolve().parent.parent
PPTX_PATH = REPO_ROOT / "templates" / "Machbarkeitsstudie-PV-Template_v1_6.pptx"
OUT_PATH = (
    REPO_ROOT
    / "src"
    / "features"
    / "studies"
    / "document"
    / "template-content.json"
)


def is_marker_red(rgb: RGBColor | None) -> bool:
    """Heuristik für den PPTX-Marker-Rot der dynamischen Platzhalter.

    Die SPEC §8.1 link-Farbe #CC3366 wird explizit ausgeschlossen (gleicher
    Rotton in der CI), um false positives auf später eingefügten Pivot-Links
    zu vermeiden.
    """
    if rgb is None:
        return False
    r, g, b = rgb[0], rgb[1], rgb[2]
    if (r, g, b) == (0xCC, 0x33, 0x66):
        return False
    return abs(r - 0xFF) + abs(g) + abs(b) <= 50


def extract_shape(shape) -> dict | None:
    """Extrahiert eine Shape (oder None wenn keine Text-Frames vorhanden).

    Für Group-Shapes wird `shape.shapes` rekursiv durchlaufen — der Returnwert
    enthält dann `nested_shapes` statt eigener Runs.
    """
    if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
        nested = [extract_shape(child) for child in shape.shapes]
        nested = [n for n in nested if n is not None]
        if not nested:
            return None
        return {
            "shape_name": shape.name,
            "shape_id": shape.shape_id,
            "left_emu": shape.left,
            "top_emu": shape.top,
            "width_emu": shape.width,
            "height_emu": shape.height,
            "is_group": True,
            "nested_shapes": nested,
        }

    if not shape.has_text_frame:
        return None

    paragraphs_data: list[dict] = []
    runs_data: list[dict] = []
    for para_idx, para in enumerate(shape.text_frame.paragraphs):
        para_runs: list[dict] = []
        for run_idx, run in enumerate(para.runs):
            rgb: RGBColor | None = None
            try:
                if run.font.color and run.font.color.type is not None:
                    rgb = run.font.color.rgb
            except (AttributeError, ValueError):
                rgb = None
            try:
                size_pt = run.font.size.pt if run.font.size else None
            except AttributeError:
                size_pt = None
            run_record = {
                "paragraph_index": para_idx,
                "run_index": run_idx,
                "text": run.text,
                "is_red_marker": is_marker_red(rgb),
                "font_size_pt": size_pt,
                "bold": bool(run.font.bold),
                "italic": bool(run.font.italic),
            }
            runs_data.append(run_record)
            para_runs.append(run_record)
        # Pro-Paragraph joined_text: KONKATENIERT ALLE Runs in
        # Reihenfolge. Das ist die Source of Truth für React-Konsum;
        # Run-Records bleiben für Formatierungs-Info erhalten.
        joined = "".join(r["text"] for r in para_runs)
        paragraphs_data.append(
            {
                "paragraph_index": para_idx,
                "joined_text": joined,
                "run_count": len(para_runs),
            }
        )

    if not runs_data:
        return None

    # Pro-Shape joined_text: alle Paragraphen-joined-Texts mit Newlines
    # getrennt. Vereinfacht den Verifikations-Vergleich mit dem
    # PPTX-XML-Direkt-Dump.
    shape_joined = "\n".join(p["joined_text"] for p in paragraphs_data)
    return {
        "shape_name": shape.name,
        "shape_id": shape.shape_id,
        "left_emu": shape.left,
        "top_emu": shape.top,
        "width_emu": shape.width,
        "height_emu": shape.height,
        "is_group": False,
        "joined_text": shape_joined,
        "paragraphs": paragraphs_data,
        "runs": runs_data,
    }


def count_runs(shapes: list[dict]) -> int:
    """Zähle Runs rekursiv (inkl. verschachtelte Group-Shapes)."""
    total = 0
    for sh in shapes:
        if sh.get("is_group"):
            total += count_runs(sh.get("nested_shapes", []))
        else:
            total += len(sh.get("runs", []))
    return total


def extract() -> None:
    if not PPTX_PATH.exists():
        raise SystemExit(
            f"PPTX not found at {PPTX_PATH}. Restore it from git history via "
            "`git show <pre-pivot-sha>:templates/Machbarkeitsstudie-PV-Template_v1_6.pptx > "
            "templates/Machbarkeitsstudie-PV-Template_v1_6.pptx` (see "
            "scripts/README-extract-template.md)."
        )

    prs = Presentation(str(PPTX_PATH))
    slides: list[dict] = []
    for slide_idx, slide in enumerate(prs.slides, start=1):
        shapes_data: list[dict] = []
        for shape in slide.shapes:
            extracted = extract_shape(shape)
            if extracted is not None:
                shapes_data.append(extracted)
        slides.append({"slide_number": slide_idx, "shapes": shapes_data})

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps({"slides": slides}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    n_shapes = sum(len(s["shapes"]) for s in slides)
    n_runs = sum(count_runs(s["shapes"]) for s in slides)
    print(
        f"Wrote {OUT_PATH.relative_to(REPO_ROOT)} "
        f"({len(slides)} slides, {n_shapes} shapes, {n_runs} runs)"
    )


if __name__ == "__main__":
    extract()
