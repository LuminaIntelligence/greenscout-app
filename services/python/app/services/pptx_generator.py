"""T-038a / T-038b — PPTX generation via python-pptx + named placeholder
replacement.

The template (``templates/Machbarkeitsstudie-PV-Template_v1_6.pptx``) was
edited in T-037 so every red dynamic value is now a ``{{snake_case_key}}``
literal. This module walks the template's text frames, replaces every
placeholder with the formatted value from a context dict, and swaps the
two named image-placeholder shapes (``image_before`` / ``image_after``)
for the consultant's uploaded photos.

Key design points:

1.  **Run-stitching across the ``{{ … }}`` boundary, with paragraph and
    line-break preservation (Defekte C1 + F1, 2026-05-29).** python-pptx
    splits a paragraph into runs on style boundaries; a single
    ``{{key}}`` sometimes spans 2-3 runs (``{{``, ``key``, ``}}``).
    T-037's edit pass left the placeholders inside a single run, but
    we still segment-stitch defensively so future template edits don't
    break this generator. **Critical invariants** the replacement must
    NOT violate:

    - The number of ``<a:p>`` paragraphs inside any ``<p:txBody>`` must
      stay constant (substitution is strictly paragraph-local).
    - The number of ``<a:br/>`` soft-line-break siblings inside any
      paragraph must stay constant (substitution stitches runs only
      within a single ``<a:br/>``-bounded segment, never across one).

    Both invariants are covered by anti-regression tests in
    ``tests/test_pptx_generator.py``. Earlier versions concatenated
    every run in the paragraph into one string before substitution,
    which silently destroyed the visual line breaks (Slide 5 showed
    "kWhEinsparpotential" smushed together; Slide 9 Box 05 hid the
    Pacht / Strom / CO₂ values entirely).

2.  **Missing keys.** A placeholder with no value in ``context`` is
    replaced with an empty string and logged as a warning. This is
    deliberate (failing the whole generate on a single missing slide-19
    Termin would be hostile to the Berater UX); the warning surfaces in
    structured logs so we can catch real misses.

3.  **Marker-red color reset (Defekt R2-1, 2026-05-31).** The template
    author marks every dynamic value in red (``#FF0000``) as a manual
    fill-in hint. Once replaced via the substitution pipeline, the red
    color is customer-hostile (SPEC §8.1's design palette does not
    include red — only forest-green, plant-green, muted-lime,
    foreground, background, link). After each substitution this
    module resets the run's color to either a non-marker neighbor
    color found elsewhere in the same text frame, or to the SPEC
    foreground / forest-green fallback. SPEC accent colors (link
    ``#CC3366``, plant-green, etc.) are explicitly NOT touched —
    only the tight ``#FF0000``-neighborhood detected by
    ``_is_marker_red``. See the helper docstrings and DECISIONS.md
    2026-05-31 for the channel-threshold rationale.

4.  **Image replacement.** Image shapes named ``image_before`` and
    ``image_after`` have their existing picture replaced in-place via
    the same shape's blob (using ``shape.image.blob = ...`` would not
    update the relationship to a new file; we instead capture the
    geometry, remove the shape, and add a fresh ``picture`` at the
    same position). If the context omits the image, the shape stays
    untouched so the template's placeholder graphic remains visible.

    **Aspect-ratio policy (T-029c, Slice-4 sign-off):** the new picture
    is inserted in **letterbox / contain** mode — the image's full
    aspect ratio is preserved and the picture is centred inside the
    placeholder's box. The image is never cropped server-side; any
    aspect-ratio mismatch with the slide slot is taken up by a thin
    margin top/bottom or left/right. Cropping is a separate, opt-in
    PR (recorded as a follow-up in DECISIONS.md).

@see SPEC §4.8 (document generation strategy)
@see docs/pptx-mapping.md (signed-off placeholder mapping)
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any, cast

from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Emu

if TYPE_CHECKING:
    from pathlib import Path

logger = logging.getLogger(__name__)

# Pattern matching `{{snake_case_key}}` placeholders. Underscore + digits
# allowed (keys can include co2_2 etc); start with a letter.
_PLACEHOLDER_RE = re.compile(r"\{\{([a-z][a-z0-9_]*)\}\}")

#: Shape names that receive image substitution at render time.
_IMAGE_BEFORE_NAME = "image_before"
_IMAGE_AFTER_NAME = "image_after"

# --- Marker-Red color reset (Defekt R2-1, 2026-05-31) -----------------
#
# The original PPTX template authored by GreenScout marks every dynamic
# value in red (#FF0000) as an authoring hint for the consultant doing the
# fill-in manually. Once the value is replaced with real text via our
# substitution pipeline, the red color is meaningless — worse, it is
# customer-hostile because SPEC §8.1's design palette does NOT include
# red (only forest-green, plant-green, muted-lime, foreground, background,
# link). The substituted runs MUST therefore lose the marker color and
# adopt the slide's normal body color.
#
# Detection heuristic: a tight RGB neighborhood around (255, 0, 0) that
# catches the marker-red and crimson variants used by the template author
# while NOT touching SPEC's `link` accent #CC3366 or any legitimately
# colorful run a future template might introduce.

#: Marker-red detection threshold (per channel): R must be ≥200, G+B ≤80.
#: Tight enough that the SPEC §8.1 link color #CC3366 (R=204 G=51 B=102)
#: is rejected (B=102 > 80) while #FF0000 / #DC143C / similar pass.
_MARKER_RED_R_MIN = 200
_MARKER_RED_GB_MAX = 80

#: SPEC §8.1 fallback colors for the color-reset routine.
_SPEC_FOREGROUND = RGBColor(0x00, 0x00, 0x00)  # body color
_SPEC_FOREST_GREEN = RGBColor(0x2D, 0x47, 0x3E)  # headlines ≥ 24pt

#: Font-size threshold (in points) at or above which a substituted run is
#: considered a headline and gets forest-green instead of foreground.
_HEADLINE_FONT_PT_MIN = 24.0


def _is_marker_red(rgb: RGBColor | None) -> bool:
    """True if ``rgb`` is the red marker-color from the template authoring step.

    Marker-red is the template author's hint that a value needs to be
    replaced; once substituted, the color must NOT carry over (Defekt
    R2-1, 2026-05-31). The detection window is intentionally tight:

    - ``None`` (no rgb set, e.g. theme-color-only runs) returns False —
      we don't second-guess theme colors.
    - SPEC §8.1's ``link`` (``#CC3366``, R=204 G=51 B=102) is explicitly
      rejected by the channel thresholds (B=102 > 80) so future template
      authors can use the link color without being color-reset.
    - Any future deliberate non-red accent in the SPEC palette
      (forest-green, plant-green, muted-lime) sits well outside the
      window.

    See DECISIONS.md 2026-05-31 (Defekt R2-1) for the rationale.
    """
    if rgb is None:
        return False
    # RGBColor is a tuple[int, int, int] subclass; pyright's stubs lose the
    # element type because the class signature predates PEP 646. The cast
    # is purely a type hint — runtime semantics are unchanged.
    channels = cast("tuple[int, int, int]", rgb)
    return (
        channels[0] >= _MARKER_RED_R_MIN
        and channels[1] <= _MARKER_RED_GB_MAX
        and channels[2] <= _MARKER_RED_GB_MAX
    )


def _safe_get_run_rgb(run: Any) -> RGBColor | None:
    """Return a run's explicit ``RGBColor`` or None if no RGB is set.

    python-pptx raises ``AttributeError`` (and occasionally other
    error types depending on inheritance state) when ``.rgb`` is
    accessed on a theme-color / no-color run. We swallow those into
    ``None`` because a missing RGB just means "we have no opinion to
    reset" — the run keeps whatever it inherits from the placeholder.
    """
    try:
        return run.font.color.rgb
    except (AttributeError, KeyError, TypeError):
        return None


def _resolve_replacement_color(run: Any, text_frame: Any) -> RGBColor:
    """Pick a non-marker color for a substituted run (Defekt R2-1).

    Strategy:

    1. **Prefer a neighbor.** Scan every other run in the same text
       frame for one whose RGB is set AND is NOT marker-red. The first
       such color wins — this keeps the substituted run visually
       consistent with the static labels on the same slide, even if
       a future template uses a non-foreground body color.

    2. **Fallback by font size.** If no usable neighbor exists, we
       cannot know whether the substituted run is body text or a
       headline. SPEC §8.1 lists forest-green as the headline color
       and foreground (black) as body. We use a 24pt threshold: at or
       above is a headline, below is body. Runs with no explicit
       ``font.size`` (i.e. inheriting from the layout) default to
       foreground — the safer choice for body-heavy slides.
    """
    for paragraph in text_frame.paragraphs:
        for other in paragraph.runs:
            if other is run:
                continue
            other_rgb = _safe_get_run_rgb(other)
            if other_rgb is not None and not _is_marker_red(other_rgb):
                return other_rgb

    try:
        size = run.font.size
        if size is not None and size.pt >= _HEADLINE_FONT_PT_MIN:
            return _SPEC_FOREST_GREEN
    except (AttributeError, TypeError):
        pass
    return _SPEC_FOREGROUND


def _reset_marker_color_if_present(run: Any, text_frame: Any) -> bool:
    """If ``run`` carries the marker-red color, swap it for a SPEC body color.

    Returns True if a swap happened. No-op (returns False) when the run's
    color is not marker-red — explicitly avoids touching legitimate
    SPEC accent colors (link #CC3366, forest-green, plant-green, etc.).
    Called by the substitution routine after each run.text rewrite.
    """
    current = _safe_get_run_rgb(run)
    if not _is_marker_red(current):
        return False
    replacement = _resolve_replacement_color(run, text_frame)
    run.font.color.rgb = replacement
    return True


def _format_value(value: Any) -> str:
    """Render a context value as a placeholder-replacement string.

    The mapping is intentionally tiny - the call site that builds the
    context is expected to do the German-locale formatting (numbers
    with `.` thousands + `,` decimal, currency with NBSP, dates as
    `DD.MM.YYYY`) before handing the value to the generator. This
    keeps the generator purely structural.
    """
    if value is None:
        return ""
    return str(value)


#: Local-name (without namespace) of the soft-line-break element in DrawingML.
#: Equivalent to a Shift+Enter inside a paragraph in PowerPoint.
_BR_LOCALNAME = "br"
#: Local-name of a text run element in DrawingML.
_R_LOCALNAME = "r"


def _local_tag(element: Any) -> str:
    """Return an lxml element's tag without the ``{namespace}`` prefix."""
    tag = element.tag
    if isinstance(tag, str) and "}" in tag:
        return tag.split("}", 1)[1]
    return str(tag)


def _replace_in_paragraph(
    paragraph: Any,
    context: dict[str, Any],
    text_frame: Any = None,
) -> int:
    """Replace every placeholder in a single paragraph, preserving run formatting.

    **Soft-line-break preservation (Defekte C1 + F1, 2026-05-29).**
    A DrawingML paragraph (``<a:p>``) may contain ``<a:br/>`` soft-line-break
    elements between runs. Earlier versions of this function concatenated
    every run's text into one string, ran the substitution, and wrote the
    result back into the first run — destroying the visual line breaks
    because the surviving ``<a:br/>`` siblings now sat after one giant run.

    The fix: split the paragraph's run sequence into **segments** at every
    ``<a:br/>`` boundary, and stitch / substitute **inside each segment
    only**. Cross-segment token-spanning is not supported (would silently
    eat the line break, which is exactly the bug we are fixing). Segment
    counts and the number of ``<a:br/>`` children must remain invariant
    across substitution — covered by anti-regression tests.

    Within a segment, stitching is still needed because python-pptx can
    split a single ``{{token}}`` across consecutive runs when the
    underlying ``<a:rPr>`` attributes differ.

    Returns the number of placeholder substitutions performed.
    """
    p_element = paragraph._p
    if p_element is None:
        return 0

    # Group adjacent <a:r> children into segments, with <a:br/> as separators.
    segments: list[list[Any]] = [[]]
    for child in p_element.iterchildren():
        local = _local_tag(child)
        if local == _R_LOCALNAME:
            segments[-1].append(child)
        elif local == _BR_LOCALNAME:
            # Start a fresh segment; the <a:br/> element itself stays in
            # place inside the paragraph XML (we do not touch it).
            segments.append([])
        # Anything else (a:fld, a:endParaRPr, …) is left alone.

    substitutions = 0

    def _replace(match: re.Match[str]) -> str:
        nonlocal substitutions
        key = match.group(1)
        substitutions += 1
        if key in context:
            return _format_value(context[key])
        logger.warning("pptx_generator: placeholder '{{%s}}' missing in context", key)
        return ""

    for run_elements in segments:
        if not run_elements:
            continue
        # Wrap each <a:r> back in python-pptx's _Run for ergonomic .text I/O.
        # We rely on the same Run class the paragraph.runs property uses.
        runs = [_wrap_run(r, paragraph) for r in run_elements]
        original = "".join(r.text for r in runs)
        if "{{" not in original:
            continue
        rewritten = _PLACEHOLDER_RE.sub(_replace, original)
        if rewritten == original:
            continue
        # Put the rewritten text into the first run of this segment (so its
        # formatting wins) and clear every other run in the same segment.
        # Runs in *other* segments — and the <a:br/> elements separating
        # them — stay untouched, which is the whole point of this routine.
        runs[0].text = rewritten
        for run in runs[1:]:
            run.text = ""
        # Defekt R2-1 (2026-05-31): if any run in this segment carried the
        # template author's marker-red color, swap it for the slide's
        # normal body color. We reset BOTH the surviving runs[0] and the
        # cleared runs[1:] — the cleared ones still own the marker color
        # in their <a:rPr>, which would resurface the moment anyone adds
        # text back into the run (e.g. a future re-render pass). See SPEC
        # §4.8 + DECISIONS.md 2026-05-31 for the rationale.
        if text_frame is not None:
            for run in runs:
                _reset_marker_color_if_present(run, text_frame)
    return substitutions


def _wrap_run(r_element: Any, paragraph: Any) -> Any:
    """Return a python-pptx ``_Run`` instance wrapping the given ``<a:r>`` element.

    python-pptx does not expose a documented constructor for ``_Run`` so we
    pull the class from the same import path the public ``paragraph.runs``
    property uses. This keeps the wrapping consistent with python-pptx's
    own behaviour (in particular, ``.text`` setter semantics that ensure
    ``xml:space="preserve"`` and proper child-element ordering).
    """
    # Local import keeps the module-level import surface clean and avoids
    # paying the import cost when the generator runs on a paragraph with
    # no <a:br/> elements (which is the vast majority of cases).
    from pptx.text.text import _Run  # type: ignore[import-untyped]

    return _Run(r_element, paragraph)


def _replace_in_shape(shape: Any, context: dict[str, Any]) -> int:
    """Recurse into a shape (or group) and replace placeholders in every text frame."""
    count = 0
    # Group shapes contain nested shapes — guarded via duck-typing rather
    # than enum comparison so python-pptx version churn does not bite.
    if hasattr(shape, "shapes") and not hasattr(shape, "text_frame"):
        for sub in shape.shapes:
            count += _replace_in_shape(sub, context)
        return count
    if not getattr(shape, "has_text_frame", False):
        return 0
    text_frame = shape.text_frame
    for paragraph in text_frame.paragraphs:
        # Pass the parent text_frame so _replace_in_paragraph can scan
        # sibling runs across all paragraphs for a neighbor-color match
        # when resetting marker-red (Defekt R2-1).
        count += _replace_in_paragraph(paragraph, context, text_frame)
    return count


def _contain_fit(
    image_width_px: int,
    image_height_px: int,
    slot_width_emu: int,
    slot_height_emu: int,
) -> tuple[int, int, int, int]:
    """Fit the image into the slot bounding box (contain / letterbox).

    Preserves the source image's aspect ratio. The returned tuple is
    ``(left_offset_emu, top_offset_emu, fitted_width_emu, fitted_height_emu)``
    relative to the slot's top-left corner: the offsets centre the
    image inside the slot when one axis is smaller than the slot.

    The function is pure — no Pillow / pptx access — so it is cheap
    to unit-test for arithmetic correctness.
    """
    if image_width_px <= 0 or image_height_px <= 0:
        # Degenerate input — fall back to filling the slot to avoid a
        # divide-by-zero. The slot still bounds the visible area so
        # the layout doesn't blow up.
        return (0, 0, slot_width_emu, slot_height_emu)
    if slot_width_emu <= 0 or slot_height_emu <= 0:
        return (0, 0, max(slot_width_emu, 0), max(slot_height_emu, 0))

    image_aspect = image_width_px / image_height_px
    slot_aspect = slot_width_emu / slot_height_emu

    if image_aspect >= slot_aspect:
        # Image is wider (or equal) — width fills, height letterboxes.
        fitted_width = slot_width_emu
        fitted_height = round(slot_width_emu / image_aspect)
        left_offset = 0
        top_offset = (slot_height_emu - fitted_height) // 2
    else:
        # Image is taller — height fills, width letterboxes.
        fitted_height = slot_height_emu
        fitted_width = round(slot_height_emu * image_aspect)
        top_offset = 0
        left_offset = (slot_width_emu - fitted_width) // 2

    return (left_offset, top_offset, fitted_width, fitted_height)


def _replace_image_in_slide(slide: Any, shape_name: str, image_path: Path) -> bool:
    """Replace the named image-placeholder shape with the new picture.

    Captures the placeholder's geometry, removes it, and inserts a
    fresh ``picture`` at the same ``left/top``, scaled with a
    ``contain`` policy so the image's aspect ratio is preserved. The
    image is centred inside the placeholder's box.

    Returns True on success, False if the named shape was not found.
    """
    target = next((s for s in slide.shapes if s.name == shape_name), None)
    if target is None:
        logger.info("pptx_generator: image shape '%s' not found on slide, skipping", shape_name)
        return False

    slot_left = int(target.left) if target.left is not None else 0
    slot_top = int(target.top) if target.top is not None else 0
    slot_width = int(target.width) if target.width is not None else 0
    slot_height = int(target.height) if target.height is not None else 0

    # Remove the placeholder shape from the slide's XML tree.
    sp_element: Any = target._element  # python-pptx exposes no public delete API.
    sp_element.getparent().remove(sp_element)

    # Read the source image's pixel dimensions so we can compute the
    # contain-fit box. Pillow is already a transitive dependency.
    with Image.open(str(image_path)) as src:
        image_width_px, image_height_px = src.size

    left_offset, top_offset, fitted_width, fitted_height = _contain_fit(
        image_width_px,
        image_height_px,
        slot_width,
        slot_height,
    )

    new_pic = slide.shapes.add_picture(
        str(image_path),
        Emu(slot_left + left_offset),
        Emu(slot_top + top_offset),
        width=Emu(fitted_width) if fitted_width > 0 else None,
        height=Emu(fitted_height) if fitted_height > 0 else None,
    )
    new_pic.name = shape_name  # keep the name so a re-run can find it again.
    return True


def generate_pptx(
    template_path: Path,
    output_path: Path,
    context: dict[str, Any],
    image_before_path: Path | None = None,
    image_after_path: Path | None = None,
) -> Path:
    """Render the template into ``output_path`` with placeholders substituted.

    Args:
        template_path: Path to the PPTX template (already prepared with T-037 placeholders).
        output_path: Where to write the generated PPTX. Parent directory must exist.
        context: Dict mapping placeholder keys (without braces) to pre-formatted strings.
        image_before_path: Optional path to the BEFORE photo. If omitted, the
            template's existing image placeholder shape remains untouched
            (showing the brand-mark / placeholder graphic).
        image_after_path: Optional path to the AFTER photo. Same fallback.

    Returns:
        The output_path written.
    """
    pres = Presentation(str(template_path))

    total_subs = 0
    for slide in pres.slides:
        for shape in slide.shapes:
            total_subs += _replace_in_shape(shape, context)

    if image_before_path is not None:
        for slide in pres.slides:
            _replace_image_in_slide(slide, _IMAGE_BEFORE_NAME, image_before_path)
    if image_after_path is not None:
        for slide in pres.slides:
            _replace_image_in_slide(slide, _IMAGE_AFTER_NAME, image_after_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pres.save(str(output_path))
    logger.info(
        "pptx_generator: wrote %s with %d substitutions",
        output_path,
        total_subs,
    )
    return output_path
