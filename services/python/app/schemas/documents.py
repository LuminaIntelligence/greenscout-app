"""T-035 - Pydantic schemas for the document-generation API.

The full PPTX/PDF generation pipeline lands in Slice 3b (T-037..T-039);
Slice 3a only ships the schema shape + a stub endpoint that returns
501. The shape is fixed here so the Next.js side can implement its
outbound client against a stable contract while the user reviews the
pptx-mapping document.

@see docs/pptx-mapping.md (sign-off gates Slice 3b)
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.calc import DerivedValues, StudyCalcInput


class DocumentGenerateRequest(BaseModel):
    """Inputs to ``POST /api/documents/generate``.

    Slice 3a accepts this body shape for schema-stability but returns
    501 — the real PPTX/PDF pipeline lands in Slice 3b once the user
    signs off on ``docs/pptx-mapping.md``.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    study: StudyCalcInput = Field(..., description="Full calc inputs from the Study row.")
    derived_values: DerivedValues = Field(
        ..., description="Pre-computed derived values (TS preview snapshot)."
    )
    customer_name: str = Field(..., min_length=1, description="Customer display name.")
    object_name: str = Field(..., min_length=1, description="Object/property name.")
    consultant_name: str = Field(..., min_length=1, description="Assigned consultant name.")
    image_before_path: str | None = Field(
        None, description="Absolute path to the processed BEFORE image on the shared volume."
    )
    image_after_path: str | None = Field(
        None, description="Absolute path to the processed AFTER image on the shared volume."
    )
    # Empty-value-safe phrase keys — Defekte D1+D2+D3 (2026-05-29).
    # Server Action pre-renders each phrase; empty string means the
    # template's surrounding prefix/suffix collapses into nothing.
    # See ``src/features/studies/actions/generate-document.ts`` for the
    # builder helpers and DECISIONS.md ``2026-05-29 — Defekte D1+D2+D3``.
    # Defaults to empty string for backward-compat with older callers
    # (e.g. tests that haven't been updated).
    flurstueck_phrase: str = Field(
        default="",
        description=(
            "Pre-rendered phrase incl. ' in Flurstück <value>' prefix, "
            "or empty when no flurstueck is set. Slide 2."
        ),
    )
    flurstueck_label_phrase: str = Field(
        default="",
        description=(
            "Pre-rendered phrase like 'Flurstück: <value>', "
            "or empty when no flurstueck is set. Slide 4 footer block."
        ),
    )
    termin_1_phrase: str = Field(
        default="",
        description=(
            "Pre-rendered Slot-1 termin phrase '1) am DD.MM.YYYY um HH:MM Uhr', "
            "or empty when terminVorschlag1 is unset. Slide 19."
        ),
    )
    termin_2_phrase: str = Field(
        default="",
        description=(
            "Pre-rendered Slot-2 termin phrase '2) am DD.MM.YYYY um HH:MM Uhr', "
            "or empty when terminVorschlag2 is unset. Slide 19."
        ),
    )
    termin_oder_phrase: str = Field(
        default="",
        description=(
            "Conjunction 'oder' between the two termin slots on Slide 19. "
            "Only non-empty when BOTH terminVorschlag1 AND terminVorschlag2 "
            "are set, so the standalone 'oder' doesn't orphan when one slot "
            "is empty."
        ),
    )
    modul_info_phrase: str = Field(
        default="",
        description=(
            "Pre-rendered Slide-10 Gesamtleistung headline, e.g. "
            "'500 kWp, 1.428 Module, 2.856 m²'. Drops optional Module / m² "
            "segments when those values are unset. Always contains the kWp "
            "headline so non-empty."
        ),
    )


class DocumentGenerateResponse(BaseModel):
    """Response shape for ``POST /api/documents/generate``.

    Slice 3a never returns this — the endpoint returns 501. Defined now
    so the Next.js client can be typed against the eventual shape
    without a follow-up TS edit when Slice 3b lands.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    pptx_path: str = Field(..., description="Path of the generated PPTX on the shared volume.")
    pdf_path: str = Field(..., description="Path of the rendered PDF on the shared volume.")
    generated_at: datetime = Field(..., description="Server-side generation timestamp (UTC).")


class DocumentGeneratePendingResponse(BaseModel):
    """501 Not-Implemented body returned by the Slice-3a stub.

    Kept as an explicit schema so the Next.js client sees a typed
    response, not opaque JSON.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    status: str = Field(..., description="Always 'pending'.")
    message: str = Field(..., description="Human-readable reason (German).")
    blocking_task: str = Field(..., description="The TASKS.md identifier blocking implementation.")
