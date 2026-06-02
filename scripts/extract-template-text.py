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
"""

import json
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor

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
            if not shape.has_text_frame:
                continue
            runs_data: list[dict] = []
            for para_idx, para in enumerate(shape.text_frame.paragraphs):
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
                    runs_data.append(
                        {
                            "paragraph_index": para_idx,
                            "run_index": run_idx,
                            "text": run.text,
                            "is_red_marker": is_marker_red(rgb),
                            "font_size_pt": size_pt,
                            "bold": bool(run.font.bold),
                            "italic": bool(run.font.italic),
                        }
                    )
            if runs_data:
                shapes_data.append(
                    {
                        "shape_name": shape.name,
                        "shape_id": shape.shape_id,
                        "left_emu": shape.left,
                        "top_emu": shape.top,
                        "width_emu": shape.width,
                        "height_emu": shape.height,
                        "runs": runs_data,
                    }
                )
        slides.append({"slide_number": slide_idx, "shapes": shapes_data})

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps({"slides": slides}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    n_shapes = sum(len(s["shapes"]) for s in slides)
    n_runs = sum(len(sh["runs"]) for s in slides for sh in s["shapes"])
    print(
        f"Wrote {OUT_PATH.relative_to(REPO_ROOT)} "
        f"({len(slides)} slides, {n_shapes} shapes, {n_runs} runs)"
    )


if __name__ == "__main__":
    extract()
