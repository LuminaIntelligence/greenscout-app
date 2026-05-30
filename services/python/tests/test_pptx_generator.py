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
        # Empty-value-safe phrase keys (Defekte D1+D2+D3, 2026-05-29).
        # These replaced the raw-keys flurstueck / modul_anzahl /
        # modul_flaeche_m2 / termin_vorschlag_1 / termin_vorschlag_2
        # in the template; the raw-keys are gone from the template and
        # MUST NOT come back (enforced by the
        # ``test_template_uses_phrase_keys_not_raw_fields_for_empty_safe_slots``
        # anti-regression test below).
        "flurstueck_phrase",
        "flurstueck_label_phrase",
        "termin_1_phrase",
        "termin_2_phrase",
        "termin_oder_phrase",
        "modul_info_phrase",
        "anlage_kwp",
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
    # Exactly one PICTURE shape named image_before / image_after must be present —
    # both live on slide 5 only (since Defekt B1, 2026-05-29: slide 4's
    # image_before shape was a misplacement that overlapped the Eigenverbrauch
    # headline and has been removed from the template).
    befores: list[str] = []
    afters: list[str] = []
    for slide_idx, slide in enumerate(pres.slides, start=1):
        for shape in slide.shapes:
            if shape.name == _IMAGE_BEFORE_NAME and shape.shape_type == 13:
                befores.append(f"slide {slide_idx}")
            elif shape.name == _IMAGE_AFTER_NAME and shape.shape_type == 13:
                afters.append(f"slide {slide_idx}")
    assert befores == ["slide 5"], f"image_before should land only on slide 5, got {befores}"
    assert afters == ["slide 5"], f"image_after should land only on slide 5, got {afters}"


# --- anti-regression tests for template-shape topology (Defekt B1) ---


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_slide_4_has_no_image_before_shape_after_template_cleanup() -> None:
    """Defekt B1 (2026-05-29): Slide 4 hat keinen Foto-Slot mehr.

    Anti-regression test: wenn jemand wieder ein image_before-Shape auf
    Slide 4 einbaut (z.B. durch erneutes Anwenden von apply-pptx-placeholders.py
    mit einem alten IMAGE_RENAMES-Tuple), bricht dieser Test sofort.
    Siehe DECISIONS.md-Eintrag „2026-05-29 — Defekt B1".
    """
    pres = Presentation(str(_REAL_TEMPLATE))
    slide4 = pres.slides[3]  # 0-indexed
    image_before_shapes = [s for s in slide4.shapes if s.name == _IMAGE_BEFORE_NAME]
    assert len(image_before_shapes) == 0, (
        f"Slide 4 has {len(image_before_shapes)} '{_IMAGE_BEFORE_NAME}' shape(s) — "
        "must be 0 (see DECISIONS.md Defekt B1, 2026-05-29)."
    )


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_slide_5_retains_image_before_and_image_after_shapes() -> None:
    """Regression-guard against over-correction of Defekt B1.

    Slide 5's "Vorher - Nachher"-Block needs both image_before and image_after
    shapes. Defekt B1's fix removed only the rogue Slide-4 shape; Slide 5 must
    keep both. If this test breaks, someone deleted too much.
    """
    pres = Presentation(str(_REAL_TEMPLATE))
    slide5 = pres.slides[4]  # 0-indexed
    image_before_shapes = [s for s in slide5.shapes if s.name == _IMAGE_BEFORE_NAME]
    image_after_shapes = [s for s in slide5.shapes if s.name == _IMAGE_AFTER_NAME]
    assert len(image_before_shapes) == 1, (
        f"Slide 5 must have exactly 1 '{_IMAGE_BEFORE_NAME}' shape, "
        f"found {len(image_before_shapes)}."
    )
    assert len(image_after_shapes) == 1, (
        f"Slide 5 must have exactly 1 '{_IMAGE_AFTER_NAME}' shape, found {len(image_after_shapes)}."
    )


# --- anti-regression tests for paragraph + line-break preservation ---
# --- (Defekte C1 + F1, 2026-05-29) -----------------------------------


# Namespace constants used by the raw-XML helpers below. python-pptx hides
# these behind its abstractions but they are stable across versions.
_A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"


def _count_paragraphs(text_frame: object) -> int:
    """Return the number of ``<a:p>`` paragraph elements in a text frame."""
    return len(text_frame.paragraphs)  # type: ignore[attr-defined]


def _count_soft_breaks(text_frame: object) -> int:
    """Return the total number of ``<a:br/>`` soft-line-break elements
    across every paragraph in a text frame."""
    total = 0
    for paragraph in text_frame.paragraphs:  # type: ignore[attr-defined]
        for child in paragraph._p.iterchildren():
            if child.tag == f"{{{_A_NS}}}br":
                total += 1
    return total


def test_substitution_preserves_paragraph_count_in_text_frame(tmp_path: Path) -> None:
    """Defekt C1+F1 (2026-05-29): substitution MUST NOT reduce the paragraph
    count of any text frame.

    A 3-paragraph text frame with a placeholder in the middle paragraph
    must still have 3 paragraphs after substitution. Cross-paragraph
    token-spanning is unsupported by design; reducing paragraph count is
    the symptom of the bug we are guarding against.
    """
    from pptx import Presentation
    from pptx.util import Inches

    from app.services.pptx_generator import _replace_in_shape

    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    tx = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(4), Inches(2))
    tf = tx.text_frame
    tf.text = "Line one"
    p2 = tf.add_paragraph()
    p2.text = "Hello {{name}}"
    p3 = tf.add_paragraph()
    p3.text = "Line three"

    assert _count_paragraphs(tf) == 3, "test setup expects 3 paragraphs"

    _replace_in_shape(tx, {"name": "World"})

    assert _count_paragraphs(tf) == 3, (
        f"Substitution reduced paragraphs from 3 to {_count_paragraphs(tf)} — "
        "see Defekte C1+F1, DECISIONS 2026-05-29."
    )
    assert tf.paragraphs[0].text == "Line one"
    assert tf.paragraphs[1].text == "Hello World"
    assert tf.paragraphs[2].text == "Line three"


def test_substitution_preserves_soft_line_breaks_within_paragraph(
    tmp_path: Path,
) -> None:
    """Defekt C1+F1 (2026-05-29): ``<a:br/>`` siblings must survive substitution.

    A single paragraph with the structure ``[run] <a:br/> [run with {{token}}]
    <a:br/> [run]`` must come out with the same two ``<a:br/>`` elements
    in place. Previously the implementation concatenated every run in the
    paragraph into one string, then dumped the substituted text back into
    runs[0] — leaving the orphaned ``<a:br/>`` siblings after a giant run,
    which is exactly the rendering bug we observed on Slide 5 (Textfeld 11)
    and Slide 9 (Text 21).
    """
    from pptx import Presentation
    from pptx.util import Inches

    from app.services.pptx_generator import _replace_in_shape

    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    tx = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(6), Inches(2))
    tf = tx.text_frame

    # Build one paragraph with run / br / run / br / run structure.
    # python-pptx exposes ``add_run`` and ``add_line_break`` on paragraphs.
    para = tf.paragraphs[0]
    para.add_run().text = "Pacht: "
    para.add_run().text = "{{pacht}}"
    para.add_line_break()
    para.add_run().text = "Strom: "
    para.add_run().text = "{{strom}}"
    para.add_line_break()
    para.add_run().text = "Fertig"

    assert _count_paragraphs(tf) == 1, "test setup: single paragraph"
    assert _count_soft_breaks(tf) == 2, "test setup: two <a:br/> elements"

    _replace_in_shape(tx, {"pacht": "50.000 €", "strom": "156.000 €"})

    # Invariants: paragraph count + soft-break count unchanged.
    assert _count_paragraphs(tf) == 1, "paragraph count must not change"
    assert _count_soft_breaks(tf) == 2, (
        f"Soft-break count dropped from 2 to {_count_soft_breaks(tf)} — "
        "see Defekte C1+F1, DECISIONS 2026-05-29."
    )

    # Each segment between <a:br/> elements got its substitution.
    para = tf.paragraphs[0]
    segment_texts: list[str] = []
    current: list[str] = []
    for child in para._p.iterchildren():
        local = child.tag.split("}", 1)[-1]
        if local == "br":
            segment_texts.append("".join(current))
            current = []
        elif local == "r":
            t = child.find(f"{{{_A_NS}}}t")
            current.append(t.text or "" if t is not None else "")
    segment_texts.append("".join(current))
    assert segment_texts == [
        "Pacht: 50.000 €",
        "Strom: 156.000 €",
        "Fertig",
    ], f"Per-segment substitution wrong: {segment_texts!r}"


def test_substitution_handles_token_split_across_runs_within_segment(
    tmp_path: Path,
) -> None:
    """Within a single segment (no ``<a:br/>``), a token split across runs
    must still be substituted via run-stitching."""
    from pptx import Presentation
    from pptx.util import Inches

    from app.services.pptx_generator import _replace_in_shape

    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    tx = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(6), Inches(2))
    tf = tx.text_frame
    para = tf.paragraphs[0]
    # The {{name}} token is split: {{ + na + me + }}
    para.add_run().text = "Hallo {{"
    para.add_run().text = "na"
    para.add_run().text = "me"
    para.add_run().text = "}}!"

    _replace_in_shape(tx, {"name": "Welt"})

    full_text = "".join(r.text for r in para.runs)
    assert full_text == "Hallo Welt!", f"Run-stitching within a segment failed: got {full_text!r}"


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_real_template_slide_5_textfeld_11_keeps_kwh_einsparpotential_break(
    tmp_path: Path,
) -> None:
    """Defekt C1 (2026-05-29): Slide 5 Shape 12 'Textfeld 11' must keep the
    soft line break between ``kWh`` and ``Einsparpotential``.

    Before the fix, the rendered text smushed them together as
    ``"22 CENT netto / kWhEinsparpotential gegenüber …"``. The fix
    preserves the ``<a:br/>`` element inside paragraph 0, so the runs
    on either side of the break stay on separate visual lines.
    """
    ctx = {k: f"<{k}>" for k in _full_context()}
    ctx["pv_verkauf_ct_kwh"] = "22,00"
    ctx["ersparnis_gesamt_vertragslaufzeit_eur"] = "156.000"

    out = tmp_path / "slide5-c1.pptx"
    generate_pptx(_REAL_TEMPLATE, out, context=ctx)

    pres = Presentation(str(out))
    slide5 = pres.slides[4]
    target = next((s for s in slide5.shapes if s.name == "Textfeld 11"), None)
    assert target is not None, "Slide 5 must contain 'Textfeld 11'"
    tf = target.text_frame

    # Paragraph count of the original template must be preserved.
    assert _count_paragraphs(tf) == 3, (
        f"Slide 5 Textfeld 11 must keep 3 paragraphs after substitution, "
        f"got {_count_paragraphs(tf)} (see DECISIONS Defekt C1, 2026-05-29)."
    )

    # The first paragraph must still contain exactly one <a:br/> separating
    # the kWh line from "Einsparpotential gegenüber".
    para0 = tf.paragraphs[0]
    br_count = sum(1 for c in para0._p.iterchildren() if c.tag == f"{{{_A_NS}}}br")
    assert br_count == 1, (
        f"Slide 5 Textfeld 11 paragraph 0 must keep its <a:br/> line break, "
        f"got {br_count} (Defekt C1)."
    )

    # The substituted text contains both halves (sanity).
    full = tf.text
    assert "22,00 CENT" in full
    assert "netto / kWh" in full
    assert "Einsparpotential" in full
    assert "kWhEinsparpotential" not in full, (
        "Slide 5 Textfeld 11 rendered without the soft line break — "
        "this is the exact symptom of Defekt C1 (2026-05-29)."
    )


# --- anti-regression tests for Slide-17 grid normalization (Defekt C2) ---


# Slide 17 ("Der Weg zur Inbetriebnahme") is a 7-column / 2-row grid. The
# upper row holds "Inhalte" shapes, the lower row holds "Ergebnisse" shapes.
# Per DECISIONS 2026-05-29 / Defekt C2, the template was normalized to:
#   - All Inhalte-Shapes share one fixed height (445 px-equivalent EMU) and
#     use TEXT_TO_FIT_SHAPE so long Studien-Inhalte shrink instead of pushing
#     siblings off-grid.
#   - All Ergebnisse-Shapes share one fixed top (569 px-equivalent EMU) and
#     also use TEXT_TO_FIT_SHAPE.
# Both invariants are guarded by the two tests below.

_SLIDE17_INHALT_NAMES = {
    "Textfeld 2",
    "Textfeld 3",
    "Textfeld 4",
    "Textfeld 5",
    "Textfeld 6",
    "Textfeld 7",
    "Textfeld 20",
}

_SLIDE17_ERGEBNIS_NAMES = {
    "Textfeld 8",
    "Textfeld 9",
    "Textfeld 10",
    "Textfeld 11",
    "Textfeld 12",
    "Textfeld 13",
    "Textfeld 21",
}


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_slide_17_inhalt_shapes_have_text_to_fit_shape_autosize() -> None:
    """Defekt C2 (2026-05-29): Slide-17 Inhalte-Shapes must use TEXT_TO_FIT_SHAPE.

    Without TEXT_TO_FIT_SHAPE, long Studien-Inhalte would grow the shape and
    push the Ergebnis-Row below it off-grid (exactly what happened in
    production: Textfeld 5 H=445 pushed Textfeld 11 top from 569 to 639).
    """
    from pptx.enum.text import MSO_AUTO_SIZE

    pres = Presentation(str(_REAL_TEMPLATE))
    slide17 = pres.slides[16]
    inhalt_shapes = [s for s in slide17.shapes if s.name in _SLIDE17_INHALT_NAMES]

    assert len(inhalt_shapes) == len(_SLIDE17_INHALT_NAMES), (
        f"Expected {len(_SLIDE17_INHALT_NAMES)} Inhalt-shapes on slide 17, "
        f"found {len(inhalt_shapes)}: "
        f"{sorted(s.name for s in inhalt_shapes)} vs expected "
        f"{sorted(_SLIDE17_INHALT_NAMES)}"
    )

    for shape in inhalt_shapes:
        assert shape.has_text_frame, f"Slide 17 shape {shape.name!r} lost its text frame"
        assert shape.text_frame.auto_size == MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE, (
            f"Slide 17 shape {shape.name!r} auto_size is "
            f"{shape.text_frame.auto_size!r}, expected TEXT_TO_FIT_SHAPE — "
            "see DECISIONS Defekt C2, 2026-05-29."
        )


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_slide_17_inhalt_shapes_share_uniform_height() -> None:
    """Defekt C2 (2026-05-29): Slide-17 Inhalt-Shapes must share one height.

    A non-uniform height row breaks the grid composition and is the root cause
    of the off-grid Ergebnis-Zeile observed in production.
    """
    pres = Presentation(str(_REAL_TEMPLATE))
    slide17 = pres.slides[16]
    inhalt_shapes = [s for s in slide17.shapes if s.name in _SLIDE17_INHALT_NAMES]
    heights = {s.name: int(s.height) for s in inhalt_shapes}
    unique_heights = set(heights.values())

    assert len(unique_heights) == 1, (
        f"Slide 17 Inhalt-Shapes have {len(unique_heights)} different heights: "
        f"{heights} — must be uniform (see DECISIONS Defekt C2, 2026-05-29)."
    )


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_slide_17_ergebnis_row_y_position_uniform() -> None:
    """Defekt C2 (2026-05-29): Slide-17 Ergebnis-Shapes share one top.

    Before the fix, Textfeld 11 (col 5) sat at T=639 while the other six
    columns sat at T≈569 — a 70 px drift caused by the over-tall Inhalt-Shape
    above it (Textfeld 5, H=445). Tolerance: a single unique value, no drift.
    """
    pres = Presentation(str(_REAL_TEMPLATE))
    slide17 = pres.slides[16]
    ergebnis_shapes = [s for s in slide17.shapes if s.name in _SLIDE17_ERGEBNIS_NAMES]
    tops = {s.name: int(s.top) for s in ergebnis_shapes}
    unique_tops = set(tops.values())

    assert len(unique_tops) == 1, (
        f"Slide 17 Ergebnis-Shapes have {len(unique_tops)} different top positions: "
        f"{tops} — must be uniform (see DECISIONS Defekt C2, 2026-05-29)."
    )


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_slide_17_ergebnis_shapes_have_text_to_fit_shape_autosize() -> None:
    """Defekt C2 (2026-05-29): Slide-17 Ergebnis-Shapes also use TEXT_TO_FIT_SHAPE.

    Same forward-fragility argument as for the Inhalt-row: future longer
    Ergebnis-Texte must not be allowed to push the second-row baseline.
    """
    from pptx.enum.text import MSO_AUTO_SIZE

    pres = Presentation(str(_REAL_TEMPLATE))
    slide17 = pres.slides[16]
    ergebnis_shapes = [s for s in slide17.shapes if s.name in _SLIDE17_ERGEBNIS_NAMES]

    assert len(ergebnis_shapes) == len(_SLIDE17_ERGEBNIS_NAMES), (
        f"Expected {len(_SLIDE17_ERGEBNIS_NAMES)} Ergebnis-shapes on slide 17, "
        f"found {len(ergebnis_shapes)}: "
        f"{sorted(s.name for s in ergebnis_shapes)} vs expected "
        f"{sorted(_SLIDE17_ERGEBNIS_NAMES)}"
    )

    for shape in ergebnis_shapes:
        assert shape.has_text_frame, f"Slide 17 shape {shape.name!r} lost its text frame"
        assert shape.text_frame.auto_size == MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE, (
            f"Slide 17 shape {shape.name!r} auto_size is "
            f"{shape.text_frame.auto_size!r}, expected TEXT_TO_FIT_SHAPE — "
            "see DECISIONS Defekt C2, 2026-05-29."
        )


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_real_template_slide_9_text_21_renders_all_three_box_05_values(
    tmp_path: Path,
) -> None:
    """Defekt F1 (2026-05-29): Slide 9 Box 05 must show Pacht / Strom / CO2
    values next to their labels.

    Before the fix, the box rendered only the three labels with empty
    trailing colons because the paragraph's runs (separated by ``<a:br/>``
    elements) were collapsed into a single run before substitution.
    """
    ctx = {k: f"<{k}>" for k in _full_context()}
    # Defekt E1 (2026-05-30): EUR-Werte mit IMMER zwei Nachkommastellen.
    ctx["pacht_einnahme_einmalig_eur"] = "50.000,00"
    ctx["ersparnis_gesamt_vertragslaufzeit_eur"] = "156.000,00"
    ctx["co2_tonnen_gesamt_vertragslaufzeit"] = "28,44"

    out = tmp_path / "slide9-f1.pptx"
    generate_pptx(_REAL_TEMPLATE, out, context=ctx)

    pres = Presentation(str(out))
    slide9 = pres.slides[8]
    target = next((s for s in slide9.shapes if s.name == "Text 21"), None)
    assert target is not None, "Slide 9 must contain 'Text 21'"
    tf = target.text_frame

    # Slice the paragraph at every <a:br/> so we can assert per-line content.
    para = tf.paragraphs[0]
    segments: list[str] = []
    buffer: list[str] = []
    for child in para._p.iterchildren():
        local = child.tag.split("}", 1)[-1]
        if local == "br":
            segments.append("".join(buffer))
            buffer = []
        elif local == "r":
            t = child.find(f"{{{_A_NS}}}t")
            buffer.append((t.text or "") if t is not None else "")
    segments.append("".join(buffer))

    # The template's first segment is the Kostenvorteil header line; the
    # next three segments are the Pacht / Strom / CO2 rows. Assert the
    # values landed in the correct segments.
    pacht_segment = next((s for s in segments if "Pachteinnahmen" in s), "")
    strom_segment = next((s for s in segments if "Stromersparnis" in s), "")
    co2_segment = next((s for s in segments if "CO2 Ersparnis" in s), "")

    assert "50.000,00" in pacht_segment, (
        f"Pacht value missing from its line: {pacht_segment!r} (Defekt F1, 2026-05-29)."
    )
    assert "156.000,00" in strom_segment, (
        f"Strom value missing from its line: {strom_segment!r} (Defekt F1, 2026-05-29)."
    )
    assert "28,44" in co2_segment, (
        f"CO2 value missing from its line: {co2_segment!r} (Defekt F1, 2026-05-29)."
    )


# --- anti-regression tests for Slide-1 + Slide-16 TEXT_TO_FIT_SHAPE (Defekte C3 + C4) ---

# Slide 1 (Defekt C3): The "Eingereicht über {{consultant_full_name}} /
# direkt vom Unternehmen" line lives in shape ``Textfeld 3``. The template
# originally shipped with ``auto_size = SHAPE_TO_FIT_TEXT``, which made
# longer Berater-names (e.g. "Admin GreenScout") grow the shape until the
# trailing word "Unternehmen" was clipped off the slide. Per DECISIONS
# 2026-05-29, the shape was normalized to TEXT_TO_FIT_SHAPE + word_wrap.
#
# Slide 16 (Defekt C4): The Variantenvergleich grid has two columns of
# bullets carrying dynamic Pacht / Ersparnis values. None of the column
# shapes had any auto_size set, so overflow was silent. Per DECISIONS
# 2026-05-29, every Varianten-shape was normalized to TEXT_TO_FIT_SHAPE +
# word_wrap so future longer values shrink rather than truncate.

_SLIDE1_BERATER_SHAPE_NAME = "Textfeld 3"

_SLIDE16_VARIANTE_SHAPE_NAMES = {
    # Variante A column (Titel + 5 bullets)
    "Text 2",
    "Text 3",
    "Text 4",
    "Text 5",
    "Text 6",
    "Text 7",
    # Variante B column (Titel + 5 bullets)
    "Text 8",
    "Text 9",
    "Text 10",
    "Text 11",
    "Text 12",
    "Text 13",
}


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_slide_1_berater_shape_has_text_to_fit_shape_autosize() -> None:
    """Defekt C3 (2026-05-29): Slide-1 Berater-Shape must use TEXT_TO_FIT_SHAPE.

    With SHAPE_TO_FIT_TEXT (the original template setting) a long
    Berater-Name pushed the trailing "Unternehmen" word off the slide
    and the customer saw a truncated sentence
    ("…direkt vom Unternehm"). TEXT_TO_FIT_SHAPE shrinks the font
    instead, keeping the full sentence visible at any reasonable name
    length.
    """
    from pptx.enum.text import MSO_AUTO_SIZE

    pres = Presentation(str(_REAL_TEMPLATE))
    slide1 = pres.slides[0]
    berater_shape = next(
        (s for s in slide1.shapes if s.name == _SLIDE1_BERATER_SHAPE_NAME),
        None,
    )

    assert berater_shape is not None, (
        f"Slide 1 Berater-Shape {_SLIDE1_BERATER_SHAPE_NAME!r} not found"
    )
    assert berater_shape.has_text_frame, f"Slide 1 shape {berater_shape.name!r} lost its text frame"
    assert berater_shape.text_frame.auto_size == MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE, (
        f"Slide 1 Berater-Shape {berater_shape.name!r} auto_size is "
        f"{berater_shape.text_frame.auto_size!r}, expected TEXT_TO_FIT_SHAPE — "
        "see DECISIONS Defekt C3, 2026-05-29."
    )
    assert berater_shape.text_frame.word_wrap is True, (
        f"Slide 1 Berater-Shape {berater_shape.name!r} word_wrap must be True "
        "alongside TEXT_TO_FIT_SHAPE — see DECISIONS Defekt C3, 2026-05-29."
    )


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_slide_16_variante_shapes_have_text_to_fit_shape_autosize() -> None:
    """Defekt C4 (2026-05-29): Slide-16 Varianten-Spalten must use TEXT_TO_FIT_SHAPE.

    Variantenvergleich bullets carry dynamic Pacht / Ersparnis values.
    Without auto-fit, longer numeric values silently overflow the shape
    bounds (the exact symptom of Defekt C4: "ca.1" instead of
    "ca. 156.000 €"). All 12 Varianten-shapes (2 columns x 6 rows) are
    normalized to TEXT_TO_FIT_SHAPE + word_wrap as defense in depth.
    """
    from pptx.enum.text import MSO_AUTO_SIZE

    pres = Presentation(str(_REAL_TEMPLATE))
    slide16 = pres.slides[15]
    variante_shapes = [s for s in slide16.shapes if s.name in _SLIDE16_VARIANTE_SHAPE_NAMES]

    assert len(variante_shapes) == len(_SLIDE16_VARIANTE_SHAPE_NAMES), (
        f"Expected {len(_SLIDE16_VARIANTE_SHAPE_NAMES)} Varianten-shapes on "
        f"slide 16, found {len(variante_shapes)}: "
        f"{sorted(s.name for s in variante_shapes)} vs expected "
        f"{sorted(_SLIDE16_VARIANTE_SHAPE_NAMES)}"
    )

    for shape in variante_shapes:
        assert shape.has_text_frame, f"Slide 16 shape {shape.name!r} lost its text frame"
        assert shape.text_frame.auto_size == MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE, (
            f"Slide 16 shape {shape.name!r} auto_size is "
            f"{shape.text_frame.auto_size!r}, expected TEXT_TO_FIT_SHAPE — "
            "see DECISIONS Defekt C4, 2026-05-29."
        )
        assert shape.text_frame.word_wrap is True, (
            f"Slide 16 shape {shape.name!r} word_wrap must be True alongside "
            "TEXT_TO_FIT_SHAPE — see DECISIONS Defekt C4, 2026-05-29."
        )


# --- anti-regression tests for empty-value-safe phrase keys (Defekte D1+D2+D3) ---


def _all_template_text_for_path(template_path: Path) -> str:
    """Concatenate every text run from every slide for substring assertions."""
    pres = Presentation(str(template_path))
    parts: list[str] = []
    for slide in pres.slides:
        for shape in slide.shapes:
            if not shape.has_text_frame:
                continue
            for para in shape.text_frame.paragraphs:
                for run in para.runs:
                    parts.append(run.text)
    return "\n".join(parts)


@pytest.mark.skipif(not _REAL_TEMPLATE.exists(), reason="real template not in this checkout")
def test_template_uses_phrase_keys_not_raw_fields_for_empty_safe_slots() -> None:
    """Defekte D1+D2+D3 (2026-05-29): Template MUSS phrase-keys nutzen.

    Wenn jemand das Template manuell editiert und wieder raw-fields
    einbaut, würde das Empty-Value-Rendering wieder kaputt gehen — D1
    (Flurstück hängender Präfix), D2 (Termin „1) am Uhr"), D3
    (modul „, Module, m²"). Dieser Test ist die letzte Verteidigungslinie
    bevor ein solcher Defekt erneut in Produktion landet.
    """
    all_text = _all_template_text_for_path(_REAL_TEMPLATE)

    # MUST be present — the new phrase-keys the Server Action provides.
    assert "{{flurstueck_phrase}}" in all_text, (
        "Slide 2 'Textfeld 4' must reference {{flurstueck_phrase}} — "
        "see DECISIONS Defekt D1, 2026-05-29."
    )
    assert "{{flurstueck_label_phrase}}" in all_text, (
        "Slide 4 'Textfeld 34' must reference {{flurstueck_label_phrase}} — "
        "see DECISIONS Defekt D1, 2026-05-29."
    )
    assert "{{termin_1_phrase}}" in all_text, (
        "Slide 19 'Text 3' para 2 must reference {{termin_1_phrase}} — "
        "see DECISIONS Defekt D2, 2026-05-29."
    )
    assert "{{termin_2_phrase}}" in all_text, (
        "Slide 19 'Text 3' para 4 must reference {{termin_2_phrase}} — "
        "see DECISIONS Defekt D2, 2026-05-29."
    )
    assert "{{termin_oder_phrase}}" in all_text, (
        "Slide 19 'Text 3' para 3 must reference {{termin_oder_phrase}} — "
        "see DECISIONS Defekt D2, 2026-05-29."
    )
    assert "{{modul_info_phrase}}" in all_text, (
        "Slide 10 'Text 5' must reference {{modul_info_phrase}} — "
        "see DECISIONS Defekt D3, 2026-05-29."
    )

    # MUST NOT come back — the raw-field placeholders that triggered
    # the original defects. {{flurstueck}} is checked positionally
    # against the original defective contexts (it could legitimately
    # appear in a future *safe* context — the surrounding-text guard
    # below catches the specific defective combinations).
    assert "{{modul_anzahl}}" not in all_text, (
        "{{modul_anzahl}} raw-key reintroduced in template — see Defekt D3."
    )
    assert "{{modul_flaeche_m2}}" not in all_text, (
        "{{modul_flaeche_m2}} raw-key reintroduced in template — see Defekt D3."
    )
    assert "{{termin_vorschlag_1}}" not in all_text, (
        "{{termin_vorschlag_1}} raw-key reintroduced in template — see Defekt D2."
    )
    assert "{{termin_vorschlag_2}}" not in all_text, (
        "{{termin_vorschlag_2}} raw-key reintroduced in template — see Defekt D2."
    )
    # The two defective contexts that prefixed {{flurstueck}} with static text:
    assert "in Flurstück {{flurstueck}}" not in all_text, (
        "Slide 2's 'in Flurstück {{flurstueck}}' raw-pattern is back — see Defekt D1."
    )
    assert "Flurstück: {{flurstueck}}" not in all_text, (
        "Slide 4's 'Flurstück: {{flurstueck}}' raw-pattern is back — see Defekt D1."
    )
