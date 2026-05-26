"""T-038a / T-038b — PPTX generation via python-pptx + named placeholder
replacement.

The template (``templates/Machbarkeitsstudie-PV-Template_v1_6.pptx``) was
edited in T-037 so every red dynamic value is now a ``{{snake_case_key}}``
literal. This module walks the template's text frames, replaces every
placeholder with the formatted value from a context dict, and swaps the
two named image-placeholder shapes (``image_before`` / ``image_after``)
for the consultant's uploaded photos.

Key design points:

1.  **Run-stitching across the ``{{ … }}`` boundary.** python-pptx splits
    a paragraph into runs on style boundaries; a single ``{{key}}``
    sometimes spans 2-3 runs (``{{``, ``key``, ``}}``). T-037's edit
    pass left the placeholders inside a single run, but we still
    paragraph-stitch defensively so future template edits don't break
    this generator.

2.  **Missing keys.** A placeholder with no value in ``context`` is
    replaced with an empty string and logged as a warning. This is
    deliberate (failing the whole generate on a single missing slide-19
    Termin would be hostile to the Berater UX); the warning surfaces in
    structured logs so we can catch real misses.

3.  **Image replacement.** Image shapes named ``image_before`` and
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
from typing import TYPE_CHECKING, Any

from PIL import Image
from pptx import Presentation
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


def _replace_in_paragraph(paragraph: Any, context: dict[str, Any]) -> int:
    """Replace every placeholder in a single paragraph, preserving run formatting.

    Strategy:
      1. Concatenate the paragraph's run texts into a paragraph string.
      2. Substitute every placeholder using ``context``.
      3. If the paragraph string changed, write the result back into
         the first run and clear the remaining runs (so leftover
         original characters don't survive).

    Returns the number of placeholder substitutions performed.
    """
    runs = list(paragraph.runs)
    if not runs:
        return 0
    original = "".join(r.text for r in runs)
    if "{{" not in original:
        return 0

    substitutions = 0

    def _replace(match: re.Match[str]) -> str:
        nonlocal substitutions
        key = match.group(1)
        if key in context:
            substitutions += 1
            return _format_value(context[key])
        logger.warning("pptx_generator: placeholder '{{%s}}' missing in context", key)
        substitutions += 1
        return ""

    rewritten = _PLACEHOLDER_RE.sub(_replace, original)
    if rewritten == original:
        return 0

    # Put the rewritten text into the first run (so its formatting wins)
    # and clear every other run.
    runs[0].text = rewritten
    for run in runs[1:]:
        run.text = ""
    return substitutions


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
    for paragraph in shape.text_frame.paragraphs:
        count += _replace_in_paragraph(paragraph, context)
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
