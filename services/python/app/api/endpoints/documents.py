"""T-038/T-039 — ``POST /api/documents/generate`` endpoint.

Slice 3a shipped this as a typed 501 stub. Slice 3b wires the real
pipeline:

    1. Validate the request body (StudyCalcInput + DerivedValues + the
       three customer/object/consultant display strings + optional
       BEFORE / AFTER image paths).
    2. Build a placeholder-keyed ``context`` dict, German-formatting
       every numeric / monetary / date value.
    3. Generate the PPTX into ``GENERATED_DIR/<study-uuid>/<timestamp>/``
       via :mod:`app.services.pptx_generator`.
    4. Render the PDF beside it via
       :mod:`app.services.pdf_renderer` (LibreOffice headless).
    5. Return both paths.

The Next.js side then writes two ``GeneratedDocument`` rows into Postgres
(one PPTX, one PDF) and exposes them via the per-study versions panel
(T-040).
"""

from __future__ import annotations

import logging
import os
import re
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import verify_api_key
from app.schemas.calc import DerivedValues, StudyCalcInput
from app.schemas.documents import DocumentGenerateRequest, DocumentGenerateResponse
from app.services.formatters import (
    format_cent_per_kwh,
    format_eur,
    format_integer_de,
)
from app.services.pdf_renderer import LibreOfficeError, render_pdf
from app.services.pptx_generator import generate_pptx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["documents"])

#: Default location relative to the service workdir. Container env overrides this
#: with ``GENERATED_DIR=/app/generated`` so the host bind mount picks it up
#: (see docker-compose.yml).
_DEFAULT_GENERATED_DIR = Path("generated")


def _default_template_path() -> Path:
    """Resolve the placeholderised template authored by T-037.

    Container path (``/app/templates/...``) wins over the source-tree
    relative path so the Docker image just bind-mounts or COPYies the
    template into ``/app/templates``. Tests + ``npm run dev`` fall
    back to walking up from this file to the repo root.
    """
    container_path = Path("/app/templates/Machbarkeitsstudie-PV-Template_v1_6.pptx")
    if container_path.exists():
        return container_path
    # documents.py -> endpoints/ -> api/ -> app/ -> python/ -> services/ -> repo-root.
    return (
        Path(__file__).resolve().parent.parent.parent.parent.parent.parent
        / "templates"
        / "Machbarkeitsstudie-PV-Template_v1_6.pptx"
    )


#: Resolved at import time so tests can ``patch`` it cheaply.
_TEMPLATE_PATH = _default_template_path()


# --------------------------------------------------------------------- formatting helpers
#
# German-locale typed-formatter functions live in ``app.services.formatters``
# (Defekt E1, 2026-05-30 — Money-/ct-Werte müssen IMMER zwei
# Nachkommastellen tragen). The thin wrappers below preserve the
# function-name surface that the existing test suite imports from this
# module while delegating to the new typed core.
#
# ``_format_decimal`` and ``_format_anlage_kwp`` stay as local helpers
# because they handle two SPECIAL formatting cases that the typed core
# intentionally does NOT model:
#   - ``_format_decimal`` exists only so the legacy ``test_german_decimal_formatting``
#     test keeps a stable API; new callers should prefer ``format_de_number``.
#   - ``_format_anlage_kwp`` follows the SPEC §8.3 ``257`` (integer) vs.
#     ``257,12`` (two-decimal) Anlage-kWp convention — it stays integer-only
#     when the input is whole, unlike ``format_eur`` which always shows ``,00``.


def _format_int_thousands(value: float) -> str:
    """German-locale integer with `.` thousands separator (e.g. ``1.234.567``).

    Delegates to :func:`app.services.formatters.format_integer_de`.
    """
    return format_integer_de(value)


def _format_decimal(value: float, fractional_digits: int = 2) -> str:
    """German-locale decimal with `,` decimal mark (e.g. ``257,12``).

    Local helper — kept for the legacy ``test_german_decimal_formatting``
    test surface. New callers should use ``format_de_number`` directly.
    """
    if value == int(value) and fractional_digits == 0:
        return _format_int_thousands(value)
    formatted = f"{value:,.{fractional_digits}f}"
    # Swap thousands `,` <-> decimal `.` then to German.
    return formatted.replace(",", "X").replace(".", ",").replace("X", ".")


def _format_currency_eur(value: float) -> str:
    """German-locale EUR-Betrag mit IMMER zwei Nachkommastellen (e.g. ``27.500,00``).

    Defekt E1 (2026-05-30): Production zeigte ganzzahlige EUR-Werte ohne
    Nachkommastellen. Delegiert jetzt an :func:`format_eur`.
    """
    return format_eur(value)


def _format_kwh(value: float) -> str:
    """German-locale kWh integer (e.g. ``236.000``)."""
    return format_integer_de(value)


def _format_ct(value: float) -> str:
    """ct/kWh value mit IMMER zwei Nachkommastellen (e.g. ``35,00``).

    Defekt E1 (2026-05-30): Production zeigte ``22 CENT`` / ``28 netto ct/kWh``.
    Delegiert jetzt an :func:`format_cent_per_kwh`.
    """
    return format_cent_per_kwh(value)


def _format_anlage_kwp(value: float) -> str:
    """Anlagen-kWp — integer if whole, else two-decimal German style.

    Bleibt absichtlich vom :func:`format_eur`-Pattern entkoppelt:
    SPEC §8.3 + mapping doc fordern ``257`` (nicht ``257,00``), aber
    ``257,12`` (mit Komma) für nicht-ganzzahlige Werte.
    """
    if value == int(value):
        return str(int(value))
    return _format_decimal(value, fractional_digits=2)


def _format_percent_int(value: float) -> str:
    """Eigenverbrauchsquote percent (integer)."""
    return str(round(value))


# --------------------------------------------------------------------- context builder


def _build_context(req: DocumentGenerateRequest) -> dict[str, str]:
    """Translate the request body into a placeholder->formatted-string map.

    Sensitivity-scenario re-runs are computed on the Next.js side via
    `composeAll` substitutions and sent as part of the request; for
    Slice 3b we fall back to repeating the headline `ersparnis_pro_jahr`
    value across all three slots when the client doesn't pass them
    (the field is not yet plumbed in `DocumentGenerateRequest`). The
    fallback keeps the PPTX rendering robust during Slice 3b without
    blocking on a follow-up Slice-3c schema extension.
    """
    study = req.study
    derived = req.derived_values

    # Address line is a fallback assembly the Berater can override later
    # via a richer Slice-3c context contract.
    object_short_and_city = f"{req.object_name}"  # MVP placeholder.

    versorger_ct = study.versorger_preis_eur_kwh * 100
    pv_verkauf_ct = study.pv_verkauf_eur_kwh * 100

    # Per-scenario fallbacks (until Slice 3c adds szenario_n_ersparnis_eur to
    # the request). Mirror the TS scenarios: substitute versorger_preis with
    # the szenario price (in EUR/kWh) and recompute ersparnis_pro_jahr.
    def _szenario_ersparnis(versorger_ct_value: float) -> float:
        versorger = versorger_ct_value / 100.0
        return (versorger - study.pv_verkauf_eur_kwh) * study.pv_eigenverbrauch_kwh_jahr

    sz1_ct = 35.0
    sz2_ct = 40.0
    sz3_ct = 45.0

    co2_tonnen_gesamt = derived.co2_tonnen_pro_jahr * study.vertragslaufzeit_jahre
    co2_fussballfelder_gesamt = derived.co2_fussballfelder_pro_jahr * study.vertragslaufzeit_jahre

    # Compose the "address with flurstueck" — re-use the pre-rendered
    # flurstueck_phrase so both Slide 2 (separate run) and Slide 3
    # (inline) stay in sync on the empty-value case.
    address_with_flurstueck = f"{req.object_name}{req.flurstueck_phrase}"

    return {
        # Customer / object identity.
        "consultant_full_name": req.consultant_name,
        "customer_object_address": f"{req.object_name}",
        "customer_object_address_with_flurstueck": address_with_flurstueck,
        "customer_object_name": req.object_name,
        "customer_object_short_name_and_city": object_short_and_city,
        # Empty-value-safe phrase keys (Defekte D1+D2+D3, 2026-05-29).
        # Server Action pre-renders; empty string → surrounding template
        # prefix/suffix collapses with the value.
        "flurstueck_phrase": req.flurstueck_phrase,
        "flurstueck_label_phrase": req.flurstueck_label_phrase,
        "termin_1_phrase": req.termin_1_phrase,
        "termin_2_phrase": req.termin_2_phrase,
        "termin_oder_phrase": req.termin_oder_phrase,
        "modul_info_phrase": req.modul_info_phrase,
        # PV inputs.
        "anlage_kwp": _format_anlage_kwp(study.anlage_kwp),
        "pv_erzeugung_kwh_jahr": _format_kwh(study.pv_erzeugung_kwh_jahr),
        "pv_eigenverbrauch_kwh_jahr": _format_kwh(study.pv_eigenverbrauch_kwh_jahr),
        "pv_verkauf_ct_kwh": _format_ct(pv_verkauf_ct),
        "eigenverbrauchsquote_prozent": (
            _format_percent_int(
                100.0 * study.pv_eigenverbrauch_kwh_jahr / study.pv_erzeugung_kwh_jahr
            )
            if study.pv_erzeugung_kwh_jahr > 0
            else "0"
        ),
        "netzeinspeisung_kwh_jahr": _format_kwh(
            study.pv_erzeugung_kwh_jahr - study.pv_eigenverbrauch_kwh_jahr
        ),
        "versorger_preis_ct_kwh": _format_ct(versorger_ct),
        # Derived monetary.
        "pacht_einnahme_einmalig_eur": _format_currency_eur(derived.pacht_einnahme_einmalig),
        "ersparnis_pro_jahr_eur": _format_currency_eur(derived.ersparnis_pro_jahr),
        "ersparnis_pro_monat_eur": _format_currency_eur(derived.ersparnis_pro_monat),
        "ersparnis_gesamt_vertragslaufzeit_eur": _format_currency_eur(derived.ersparnis20_jahre),
        "gesamterzeugung_vertragslaufzeit_kwh": _format_kwh(derived.gesamterzeugung20j),
        "gesamtvorteil_eur": _format_currency_eur(derived.gesamtvorteil),
        "pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit": _format_kwh(
            derived.pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit
        ),
        "stromkosten_ohne_pv_eur_jahr": _format_currency_eur(derived.stromkosten_ohne_pv_eur_jahr),
        "stromkosten_mit_pv_eur_jahr": _format_currency_eur(derived.stromkosten_mit_pv_eur_jahr),
        # Sensitivity scenarios (Slice-3b fallback — see docstring).
        "szenario_1_preis_ct_kwh": _format_ct(sz1_ct),
        "szenario_1_ersparnis_eur": _format_currency_eur(_szenario_ersparnis(sz1_ct)),
        "szenario_2_preis_ct_kwh": _format_ct(sz2_ct),
        "szenario_2_ersparnis_eur": _format_currency_eur(_szenario_ersparnis(sz2_ct)),
        "szenario_3_preis_ct_kwh": _format_ct(sz3_ct),
        "szenario_3_ersparnis_eur": _format_currency_eur(_szenario_ersparnis(sz3_ct)),
        # CO2.
        "co2_tonnen_pro_jahr": _format_int_thousands(derived.co2_tonnen_pro_jahr),
        "co2_hektar_mischwald": _format_int_thousands(derived.co2_hektar_mischwald),
        "co2_fussballfelder_pro_jahr": _format_int_thousands(derived.co2_fussballfelder_pro_jahr),
        "co2_tonnen_gesamt_vertragslaufzeit": _format_int_thousands(co2_tonnen_gesamt),
        "co2_fussballfelder_gesamt_vertragslaufzeit": _format_int_thousands(
            co2_fussballfelder_gesamt
        ),
        # Termin slots (raw-keys removed 2026-05-29 — Defekte D1+D2+D3).
        # Slide 19 now uses the pre-rendered ``termin_1_phrase`` /
        # ``termin_2_phrase`` above so empty values don't leave hanging
        # "1) am  Uhr" template fragments.
    }


def _safe_filename_segment(value: str) -> str:
    """Strip path-injection metacharacters; collapse whitespace."""
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "_", value).strip("_")
    return cleaned or "study"


def _resolve_generated_dir() -> Path:
    """Return the configured generated-files root directory."""
    raw = os.environ.get("GENERATED_DIR", str(_DEFAULT_GENERATED_DIR))
    return Path(raw)


# --------------------------------------------------------------------- endpoint


@router.post(
    "/documents/generate",
    response_model=DocumentGenerateResponse,
    dependencies=[Depends(verify_api_key)],
    summary="Generate the PPTX + PDF for a study.",
)
def post_documents_generate(req: DocumentGenerateRequest) -> DocumentGenerateResponse:
    """Render the PPTX template + LibreOffice PDF and return the file paths."""
    if not _TEMPLATE_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PPTX template missing at {_TEMPLATE_PATH}",
        )

    now = datetime.now(UTC)
    timestamp_dir = now.strftime("%Y%m%dT%H%M%S")
    customer_segment = _safe_filename_segment(req.customer_name)
    object_segment = _safe_filename_segment(req.object_name)

    out_root = _resolve_generated_dir() / customer_segment / timestamp_dir
    pptx_filename = f"{customer_segment}_{object_segment}.pptx"
    pptx_path = out_root / pptx_filename

    context = _build_context(req)

    image_before = Path(req.image_before_path) if req.image_before_path else None
    image_after = Path(req.image_after_path) if req.image_after_path else None
    # Guard against bogus paths from the caller — if the file does not
    # exist, fall back to leaving the placeholder shape on the slide.
    if image_before is not None and not image_before.exists():
        logger.warning("documents: image_before_path %s does not exist; skipping", image_before)
        image_before = None
    if image_after is not None and not image_after.exists():
        logger.warning("documents: image_after_path %s does not exist; skipping", image_after)
        image_after = None

    try:
        generate_pptx(
            _TEMPLATE_PATH,
            pptx_path,
            context=context,
            image_before_path=image_before,
            image_after_path=image_after,
        )
    except Exception as exc:
        logger.exception("documents: PPTX generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PPTX generation failed: {exc}",
        ) from exc

    try:
        pdf_path = render_pdf(pptx_path, out_root)
    except LibreOfficeError as exc:
        logger.exception("documents: PDF rendering failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF rendering failed: {exc}",
        ) from exc

    return DocumentGenerateResponse(
        pptx_path=str(pptx_path),
        pdf_path=str(pdf_path),
        generated_at=now,
    )


# Re-exports for tests / introspection.
__all__: list[str] = [
    "DerivedValues",
    "StudyCalcInput",
    "_build_context",
    "_format_anlage_kwp",
    "_format_ct",
    "_format_currency_eur",
    "_format_decimal",
    "_format_int_thousands",
    "_format_kwh",
    "_safe_filename_segment",
    "post_documents_generate",
    "router",
]
