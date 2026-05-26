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

@see SPEC §4.8 (document generation strategy)
@see docs/pptx-mapping.md (signed-off placeholder mapping)
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any

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


def _replace_image_in_slide(slide: Any, shape_name: str, image_path: Path) -> bool:
    """Replace the named image-placeholder shape with the new picture.

    Captures the placeholder's geometry, removes it, and inserts a
    fresh ``picture`` at the same ``left/top/width/height``. Returns
    True on success.
    """
    target = next((s for s in slide.shapes if s.name == shape_name), None)
    if target is None:
        logger.info("pptx_generator: image shape '%s' not found on slide, skipping", shape_name)
        return False

    left = target.left
    top = target.top
    width = target.width
    height = target.height

    # Remove the placeholder shape from the slide's XML tree.
    sp_element: Any = target._element  # python-pptx exposes no public delete API.
    sp_element.getparent().remove(sp_element)

    new_pic = slide.shapes.add_picture(
        str(image_path),
        Emu(int(left)) if left is not None else Emu(0),
        Emu(int(top)) if top is not None else Emu(0),
        width=Emu(int(width)) if width is not None else None,
        height=Emu(int(height)) if height is not None else None,
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
