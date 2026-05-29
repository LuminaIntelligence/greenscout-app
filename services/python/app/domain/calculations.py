"""T-033 — PV feasibility calculation module (Python authoritative).

Mirror of ``src/lib/calculations/index.ts``. Pure-functional
implementation of every formula in SPEC §4.7 plus the three CO2
derivatives. This is the authoritative copy used by the document
generator (T-038); the TS mirror powers the Wizard Step 5 live
preview. Parity is enforced by the T-034 fixture suite.

Per T-033 acceptance criteria, monetary intermediates use ``Decimal``
arithmetic to avoid float drift on the customer-visible numbers. The
``compose_all`` wrapper converts back to ``float`` at the API boundary
for serialization through the pydantic ``DerivedValues`` model.

The CO2 derivatives stay on the float pathway: the underlying physical
constants (0.474, 0.0177, 1.28) are themselves approximations carried
to 3-4 significant digits, so the precision of ``Decimal`` would be
spurious. The T-034 fixture suite documents 1e-4 relative tolerance
for these fields vs 1e-6 for monetary fields.

@see SPEC.md §4.7
@see docs/calc-sources.md (T-034 tolerance contract)
"""

from __future__ import annotations

from decimal import Decimal

from app.domain.constants import (
    CO2_HA_MISCHWALD_PER_T_PER_YEAR,
    CO2_KG_PER_KWH_PV,
    EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH,
    FOOTBALL_FIELDS_PER_HA,
)
from app.schemas.calc import DerivedValues, StudyCalcInput


def _d(value: float | int) -> Decimal:
    """Construct a Decimal from a float without inheriting float drift.

    ``Decimal(0.1)`` yields ``Decimal('0.1000000000000000055...')`` —
    pulling the binary IEEE-754 representation into the Decimal world.
    ``Decimal(str(0.1))`` yields ``Decimal('0.1')`` — what the caller
    intended. We always go via ``str()`` to keep the monetary path drift-
    free.
    """
    return Decimal(str(value))


def ersparnis_pro_jahr(inp: StudyCalcInput) -> Decimal:
    """EUR / Jahr — ``(versorger_preis - pv_verkauf) * pv_eigenverbrauch``."""
    return (_d(inp.versorger_preis_eur_kwh) - _d(inp.pv_verkauf_eur_kwh)) * _d(
        inp.pv_eigenverbrauch_kwh_jahr
    )


def ersparnis_pro_monat(inp: StudyCalcInput) -> Decimal:
    """EUR / Monat — ``ersparnis_pro_jahr / 12``."""
    return ersparnis_pro_jahr(inp) / Decimal(12)


def ersparnis_gesamt_vertragslaufzeit(inp: StudyCalcInput) -> Decimal:
    """EUR — ``ersparnis_pro_jahr * vertragslaufzeit_jahre``."""
    return ersparnis_pro_jahr(inp) * Decimal(inp.vertragslaufzeit_jahre)


def pacht_einnahme_einmalig(inp: StudyCalcInput) -> Decimal:
    """EUR — ``anlage_kwp * pacht_eur_pro_kwp`` (one-shot lease income, SPEC §4.7).

    NOTE: This is the *einmalige* lease payment paid by the investor to
    the property owner upon contract signing. It does NOT scale with
    ``vertragslaufzeit_jahre`` — the contract duration is the period over
    which the property is leased, not a multiplier on the price.

    User-confirmed binding on 2026-05-27 (§7.7 pause-trigger resolution
    in DECISIONS.md). Example: 500 kWp * 100 EUR/kWp = 50.000 EUR one-shot.
    Equivalent via area: (m2 / 5) * 100, because 1 kWp ~= 5 m2 usable roof
    surface (Slide-5 footnote in the original template).
    """
    return _d(inp.anlage_kwp) * _d(inp.pacht_eur_pro_kwp)


def gesamterzeugung_vertragslaufzeit(inp: StudyCalcInput) -> Decimal:
    """kWh — ``pv_erzeugung * vertragslaufzeit_jahre``."""
    return _d(inp.pv_erzeugung_kwh_jahr) * Decimal(inp.vertragslaufzeit_jahre)


def gesamtvorteil(inp: StudyCalcInput) -> Decimal:
    """EUR — ``ersparnis_gesamt_vertragslaufzeit + pacht_einnahme_einmalig``."""
    return ersparnis_gesamt_vertragslaufzeit(inp) + pacht_einnahme_einmalig(inp)


def co2_tonnen_pro_jahr(inp: StudyCalcInput) -> float:
    """t — tonnes CO2 avoided per year. Honours ``co2_override``."""
    if inp.co2_override and inp.co2_tonnen_pro_jahr_override is not None:
        return inp.co2_tonnen_pro_jahr_override
    return (inp.pv_erzeugung_kwh_jahr * CO2_KG_PER_KWH_PV) / 1000


def co2_hektar_mischwald(inp: StudyCalcInput) -> float:
    """ha — Mischwald-Aequivalent pro Jahr. Honours ``co2_override``."""
    if inp.co2_override and inp.co2_hektar_mischwald_override is not None:
        return inp.co2_hektar_mischwald_override
    return co2_tonnen_pro_jahr(inp) * CO2_HA_MISCHWALD_PER_T_PER_YEAR


def co2_fussballfelder_pro_jahr(inp: StudyCalcInput) -> float:
    """count — Fussballfelder-Aequivalent pro Jahr. Honours ``co2_override``."""
    if inp.co2_override and inp.co2_fussballfelder_pro_jahr_override is not None:
        return inp.co2_fussballfelder_pro_jahr_override
    return co2_hektar_mischwald(inp) * FOOTBALL_FIELDS_PER_HA


def pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit(inp: StudyCalcInput) -> Decimal:
    """kWh -- total self-consumption over the full contract. Slice-3a sign-off item 1."""
    return _d(inp.pv_eigenverbrauch_kwh_jahr) * Decimal(inp.vertragslaufzeit_jahre)


def stromkosten_ohne_pv_eur_jahr(inp: StudyCalcInput) -> Decimal:
    """EUR / Jahr -- annual electricity cost WITHOUT a PV installation.

    Slide 14 "Ohne PV" per Slice-3a sign-off item 2:
    ``verbrauch_kwh_jahr * versorger_preis_eur_kwh``.
    """
    return _d(inp.verbrauch_kwh_jahr) * _d(inp.versorger_preis_eur_kwh)


def stromkosten_mit_pv_eur_jahr(inp: StudyCalcInput) -> Decimal:
    """EUR / Jahr -- annual electricity cost WITH the PV installation.

    Slide 14 "Mit PV" per Slice-3a sign-off item 3:
    ``(verbrauch - pv_eigenverbrauch) * versorger_preis
       + pv_eigenverbrauch * EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH``.
    """
    residual_from_grid = (_d(inp.verbrauch_kwh_jahr) - _d(inp.pv_eigenverbrauch_kwh_jahr)) * _d(
        inp.versorger_preis_eur_kwh
    )
    self_consumed = _d(inp.pv_eigenverbrauch_kwh_jahr) * _d(EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH)
    return residual_from_grid + self_consumed


def compose_all(inp: StudyCalcInput) -> DerivedValues:
    """Compose every derived value from a single input.

    Decimal intermediates are converted to ``float`` at this API
    boundary so the pydantic ``DerivedValues`` model serialises cleanly
    to JSON for the FastAPI document-generation endpoint.
    """
    return DerivedValues(
        ersparnis_pro_jahr=float(ersparnis_pro_jahr(inp)),
        ersparnis_pro_monat=float(ersparnis_pro_monat(inp)),
        ersparnis20_jahre=float(ersparnis_gesamt_vertragslaufzeit(inp)),
        pacht_einnahme_einmalig=float(pacht_einnahme_einmalig(inp)),
        gesamterzeugung20j=float(gesamterzeugung_vertragslaufzeit(inp)),
        gesamtvorteil=float(gesamtvorteil(inp)),
        co2_tonnen_pro_jahr=co2_tonnen_pro_jahr(inp),
        co2_hektar_mischwald=co2_hektar_mischwald(inp),
        co2_fussballfelder_pro_jahr=co2_fussballfelder_pro_jahr(inp),
        pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit=float(
            pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit(inp)
        ),
        stromkosten_ohne_pv_eur_jahr=float(stromkosten_ohne_pv_eur_jahr(inp)),
        stromkosten_mit_pv_eur_jahr=float(stromkosten_mit_pv_eur_jahr(inp)),
    )
