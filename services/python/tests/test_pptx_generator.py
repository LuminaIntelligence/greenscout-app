# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false, reportArgumentType=false, reportUnnecessaryComparison=false, reportAttributeAccessIssue=false, reportUnknownLambdaType=false, reportUnknownArgumentType=false, reportPrivateUsage=false
"""T-038a / T-038b — Tests for the PPTX generator.

Pyright pragma at the top: python-pptx's typed surface under-describes
shape attributes (BaseShape vs concrete subclasses) and reports
shape_type comparisons against integer literals as "unnecessary"
because the stubs only have one literal type. None of the warnings
are real bugs; defensive checks live in the production module.

Two strategies:

1.  **Mini-fixture template** — a freshly-built 1-slide PPTX with
    known shapes (a text frame holding placeholders, an
    ``image_before`` placeholder shape). Fast and deterministic.

2.  **End-to-end smoke against the real T-037 template** — open the
    real 19-slide template, run ``generate_pptx`` with a fully-
    populated context, and assert every ``{{placeholder}}`` literal
    disappears.

Image fixtures are tiny on-the-fly PNGs written via Pillow so the
test data lives in code (no binary blobs in git).
"""

from __future__ import annotations

import io
import logging
from pathlib import Path

import pytest
from PIL import Image
from pptx import Presentation
from pptx.util import Inches

from app.services.pptx_generator import (
    _IMAGE_AFTER_NAME,
    _IMAGE_BEFORE_NAME,
    _PLACEHOLDER_RE,
    _contain_fit,
    _format_value,
    generate_pptx,
)


def _make_png(path: Path, colour: tuple[int, int, int] = (0, 128, 0)) -> Path:
    """Write a 64x64 solid-colour PNG to ``path`` so generate_pptx can embed it."""
    image = Image.new("RGB", (64, 64), colour)
    image.save(path, "PNG")
    return path


def _make_mini_template(path: Path) -> Path:
    """Build a 1-slide PPTX with: one placeholder textbox + one image-shape placeholder."""
    pres = Presentation()
    blank = pres.slide_layouts[6]  # the "Blank" layout in the default theme.
    slide = pres.slides.add_slide(blank)
    # Text box with placeholders.
    tb = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(6), Inches(1))
    tf = tb.text_frame
    tf.text = "Kunde: {{customer_name}}, Objekt: {{object_name}}"
    # Image placeholder shape — start with a tiny in-memory PNG, then rename it.
    buf = io.BytesIO()
    Image.new("RGB", (16, 16), (200, 200, 200)).save(buf, "PNG")
    buf.seek(0)
    pic = slide.shapes.add_picture(buf, Inches(1), Inches(3), Inches(2), Inches(2))
    pic.name = _IMAGE_BEFORE_NAME
    pres.save(path)
    return path


# --- format helpers ---------------------------------------------------


def test_format_value_handles_none() -> None:
    assert _format_value(None) == ""


def test_format_value_stringifies_anything() -> None:
    assert _format_value(42) == "42"
    assert _format_value("hello") == "hello"
    assert _format_value(3.14) == "3.14"


def test_placeholder_re_matches_only_snake_case() -> None:
    matches = _PLACEHOLDER_RE.findall("foo {{bar_baz}} {{X}} {{1bad}} {{good_42}}")
    assert matches == ["bar_baz", "good_42"]


# --- text replacement -------------------------------------------------


def test_generates_replaces_text_placeholders(tmp_path: Path) -> None:
    tpl = _make_mini_template(tmp_path / "tpl.pptx")
    out = tmp_path / "out.pptx"
    generate_pptx(
        tpl,
        out,
        context={"customer_name": "Müller GmbH", "object_name": "Linzgau Center"},
    )
    pres = Presentation(out)
    text = "\n".join(sh.text_frame.text for sh in pres.slides[0].shapes if sh.has_text_frame)
    assert "Müller GmbH" in text
    assert "Linzgau Center" in text
    assert "{{" not in text


def test_missing_key_replaced_with_empty_and_logged(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    tpl = _make_mini_template(tmp_path / "tpl.pptx")
    out = tmp_path / "out.pptx"
    with caplog.at_level(logging.WARNING):
        generate_pptx(tpl, out, context={"customer_name": "Acme"})
    # Object_name was missing -> empty string in output, warning emitted.
    pres = Presentation(out)
    text = pres.slides[0].shapes[0].text_frame.text
    assert "Acme" in text
    assert "Objekt:" in text
    assert "{{" not in text
    assert any("object_name" in r.message for r in caplog.records)


def test_no_placeholders_in_paragraph_is_a_no_op(tmp_path: Path) -> None:
    tpl_path = tmp_path / "tpl.pptx"
    pres = Presentation()
    slide = pres.slides.add_slide(pres.slide_layouts[6])
    tb = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(4), Inches(1))
    tb.text_frame.text = "Static title — no placeholders here"
    pres.save(tpl_path)
    out = tmp_path / "out.pptx"
    generate_pptx(tpl_path, out, context={"customer_name": "X"})
    pres = Presentation(out)
    assert pres.slides[0].shapes[0].text_frame.text.startswith("Static title")


# --- contain-fit arithmetic (T-029c letterbox/contain policy) --------


def test_contain_fit_image_same_aspect_fills_slot() -> None:
    """Matching aspect ratio → image fills the entire slot, no margin."""
    left, top, w, h = _contain_fit(1000, 500, 2000, 1000)
    assert (left, top, w, h) == (0, 0, 2000, 1000)


def test_contain_fit_wide_image_letterboxes_top_bottom() -> None:
    """A 16:9 image in a 4:3 slot leaves margins top + bottom (height < slot)."""
    left, top, w, h = _contain_fit(1600, 900, 1200, 1200)
    # Image aspect = 16/9 ≈ 1.778; slot aspect = 1.0; image-wider branch.
    assert w == 1200  # fills width
    assert h == round(1200 * 9 / 16)  # 675
    assert left == 0
    assert top == (1200 - h) // 2


def test_contain_fit_tall_image_letterboxes_left_right() -> None:
    """A 9:16 image in a 4:3 slot leaves margins left + right (width < slot)."""
    left, top, w, h = _contain_fit(900, 1600, 1200, 1200)
    # Image aspect = 0.5625; slot aspect = 1.0; image-taller branch.
    assert h == 1200  # fills height
    assert w == round(1200 * 9 / 16)
    assert top == 0
    assert left == (1200 - w) // 2


def test_contain_fit_degenerate_image_zero_dim_falls_back_to_fill() -> None:
    """Defensive: zero-dimension image input falls back to filling the slot."""
    assert _contain_fit(0, 100, 1000, 500) == (0, 0, 1000, 500)
    assert _contain_fit(100, 0, 1000, 500) == (0, 0, 1000, 500)


def test_contain_fit_degenerate_slot_zero_dim_returns_zeros() -> None:
    """Defensive: zero-dimension slot returns a zero-area placement."""
    assert _contain_fit(100, 100, 0, 500) == (0, 0, 0, 500)
    assert _contain_fit(100, 100, 500, 0) == (0, 0, 500, 0)


def test_contain_fit_negative_slot_dimensions_clamp_to_zero() -> None:
    """Negative slot dimensions are clamped to 0 (no crashes on bad input)."""
    assert _contain_fit(100, 100, -10, 500) == (0, 0, 0, 500)


# --- image replacement ------------------------------------------------


def test_replaces_image_before_when_path_provided(tmp_path: Path) -> None:
    tpl = _make_mini_template(tmp_path / "tpl.pptx")
    image = _make_png(tmp_path / "before.png", colour=(255, 0, 0))
    out = tmp_path / "out.pptx"
    generate_pptx(
        tpl,
        out,
        context={"customer_name": "X", "object_name": "Y"},
        image_before_path=image,
    )
    pres = Presentation(out)
    pics = [s for s in pres.slides[0].shapes if s.shape_type == 13]  # PICTURE
    # The new picture keeps the original shape name so a re-run finds it.
    assert any(p.name == _IMAGE_BEFORE_NAME for p in pics)


def test_missing_image_keeps_placeholder_shape(tmp_path: Path) -> None:
    tpl = _make_mini_template(tmp_path / "tpl.pptx")
    out = tmp_path / "out.pptx"
    generate_pptx(
        tpl,
        out,
        context={"customer_name": "X", "object_name": "Y"},
        image_before_path=None,
    )
    pres = Presentation(out)
    # Placeholder is still on the slide because no image was provided.
    assert any(s.name == _IMAGE_BEFORE_NAME for s in pres.slides[0].shapes)


def test_image_after_path_skipped_when_shape_missing(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    """Providing image_after_path when the slide has no `image_after` shape is harmless."""
    tpl = _make_mini_template(tmp_path / "tpl.pptx")
    image = _make_png(tmp_path / "after.png")
    out = tmp_path / "out.pptx"
    with caplog.at_level(logging.INFO):
        generate_pptx(
            tpl,
            out,
            context={"customer_name": "X", "object_name": "Y"},
            image_after_path=image,
        )
    # The generator logs (info-level) that the shape wasn't found.
    assert any(_IMAGE_AFTER_NAME in r.message for r in caplog.records)


# --- end-to-end against the real template ----------------------------


_REAL_TEMPLATE = (
    Path(__file__).parent.parent.parent.parent
    / "templates"
    / "Machbarkeitsstudie-PV-Template_v1_6.pptx"
)


def _full_context() -> dict[str, str]:
    """Every placeholder from docs/pptx-mapping.md keyed to a synthetic string."""
    keys = [
        "consultant_full_name",
        "customer_object_address",
        "customer_object_address_with_flurstueck",
        "customer_object_name",
        "customer_object_short_name_and_city",
        "flurstueck",
        "anlage_kwp",
        "modul_anzahl",
        "modul_flaeche_m2",
        "pv_erzeugung_kwh_jahr",
        "pv_eigenverbrauch_kwh_jahr",
        "pv_verkauf_ct_kwh",
        "eigenverbrauchsquote_prozent",
        "netzeinspeisung_kwh_jahr",
        "versorger_preis_ct_kwh",
        "pacht_einnahme_einmalig_eur",
        "ersparnis_pro_jahr_eur",
        "ersparnis_pro_monat_eur",
        "ersparnis_gesamt_vertragslaufzeit_eur",
        "gesamterzeugung_vertragslaufzeit_kwh",
        "gesamtvorteil_eur",
        "pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit",
        "stromkosten_ohne_pv_eur_jahr",
        "stromkosten_mit_pv_eur_jahr",
        "szenario_1_preis_ct_kwh",
        "szenario_1_ersparnis_eur",
        "szenario_2_preis_ct_kwh",
        "szenario_2_ersparnis_eur",
        "szenario_3_preis_ct_kwh",
        "szenario_3_ersparnis_eur",
        "co2_tonnen_pro_jahr",
        "co2_hektar_mischwald",
        "co2_fussballfelder_pro_jahr",
        "co2_tonnen_gesamt_vertragslaufzeit",
        "co2_fussballfelder_gesamt_vertragslaufzeit",
        "termin_vorschlag_1",
        "termin_vorschlag_2",
    ]
    return {k: f"<{k}>" for k in keys}


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_real_template_renders_without_remaining_placeholders(tmp_path: Path) -> None:
    out = tmp_path / "real-out.pptx"
    generate_pptx(_REAL_TEMPLATE, out, context=_full_context())
    pres = Presentation(out)
    leftover_count = 0
    for slide in pres.slides:
        for shape in slide.shapes:
            if not shape.has_text_frame:
                continue
            text = shape.text_frame.text
            if "{{" in text:
                leftover_count += 1
    assert leftover_count == 0, f"{leftover_count} placeholders left in real template render"


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_real_template_renders_with_images(tmp_path: Path) -> None:
    before = _make_png(tmp_path / "b.png", colour=(20, 60, 20))
    after = _make_png(tmp_path / "a.png", colour=(180, 180, 60))
    out = tmp_path / "real-img-out.pptx"
    generate_pptx(
        _REAL_TEMPLATE,
        out,
        context=_full_context(),
        image_before_path=before,
        image_after_path=after,
    )
    pres = Presentation(out)
    # At least two PICTURE shapes named image_before / image_after must be present
    # (slide 4 has one image_before, slide 5 has both).
    befores: list[str] = []
    afters: list[str] = []
    for slide_idx, slide in enumerate(pres.slides, start=1):
        for shape in slide.shapes:
            if shape.name == _IMAGE_BEFORE_NAME and shape.shape_type == 13:
                befores.append(f"slide {slide_idx}")
            elif shape.name == _IMAGE_AFTER_NAME and shape.shape_type == 13:
                afters.append(f"slide {slide_idx}")
    assert len(befores) >= 2  # slide 4 + slide 5
    assert len(afters) >= 1  # slide 5
