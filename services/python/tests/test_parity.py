"""T-034 — Python parity test against the shared fixture JSON.

Loads ``services/python/tests/fixtures/calc-parity-fixtures.json``,
runs each ``input`` through the Python ``compose_all()``, and asserts
every derived field matches the ``expected`` value within the
per-class tolerance documented in ``docs/calc-sources.md``.

The same JSON file is consumed by
``src/lib/calculations/parity.test.ts``. When both suites are green,
both implementations produce the same ``expected`` for every fixture
within tolerance — that's "parity".

To regenerate the fixtures (e.g. after a constants change):

    npx tsx scripts/generate-calc-parity-fixtures.mjs
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from app.domain.calculations import compose_all
from app.schemas.calc import StudyCalcInput

# Resolve fixture file relative to the test file so the test runs the
# same regardless of CWD.
_FIXTURE_PATH = Path(__file__).parent / "fixtures" / "calc-parity-fixtures.json"

# Field-name translation: TS uses camelCase in the JSON, Python uses
# snake_case in StudyCalcInput / DerivedValues.
_INPUT_FIELD_MAP: dict[str, str] = {
    "anlageKwp": "anlage_kwp",
    "pvErzeugungKwhJahr": "pv_erzeugung_kwh_jahr",
    "pvEigenverbrauchKwhJahr": "pv_eigenverbrauch_kwh_jahr",
    "pvVerkaufEurKwh": "pv_verkauf_eur_kwh",
    "verbrauchKwhJahr": "verbrauch_kwh_jahr",
    "versorgerPreisEurKwh": "versorger_preis_eur_kwh",
    "pachtEurProKwp": "pacht_eur_pro_kwp",
    "vertragslaufzeitJahre": "vertragslaufzeit_jahre",
    "co2Override": "co2_override",
    "co2TonnenProJahrOverride": "co2_tonnen_pro_jahr_override",
    "co2HektarMischwaldOverride": "co2_hektar_mischwald_override",
    "co2FussballfelderProJahrOverride": "co2_fussballfelder_pro_jahr_override",
}

_EXPECTED_FIELD_MAP: dict[str, str] = {
    "ersparnisProJahr": "ersparnis_pro_jahr",
    "ersparnisProMonat": "ersparnis_pro_monat",
    "ersparnis20Jahre": "ersparnis20_jahre",
    "pachtEinnahmeEinmalig": "pacht_einnahme_einmalig",
    "gesamterzeugung20j": "gesamterzeugung20j",
    "gesamtvorteil": "gesamtvorteil",
    "co2TonnenProJahr": "co2_tonnen_pro_jahr",
    "co2HektarMischwald": "co2_hektar_mischwald",
    "co2FussballfelderProJahr": "co2_fussballfelder_pro_jahr",
    # Slice-3b additions per Slice-3a sign-off.
    "pvEigenverbrauchKwhGesamtVertragslaufzeit": "pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit",
    "stromkostenOhnePvEurJahr": "stromkosten_ohne_pv_eur_jahr",
    "stromkostenMitPvEurJahr": "stromkosten_mit_pv_eur_jahr",
}

_MONETARY_FIELDS = (
    "ersparnis_pro_jahr",
    "ersparnis_pro_monat",
    "ersparnis20_jahre",
    "pacht_einnahme_einmalig",
    "gesamterzeugung20j",
    "gesamtvorteil",
    "pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit",
    "stromkosten_ohne_pv_eur_jahr",
    "stromkosten_mit_pv_eur_jahr",
)
_CO2_FIELDS = (
    "co2_tonnen_pro_jahr",
    "co2_hektar_mischwald",
    "co2_fussballfelder_pro_jahr",
)


def _load_fixtures() -> dict[str, Any]:
    with _FIXTURE_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


_FIXTURE_FILE = _load_fixtures()


def _translate_input(camel: dict[str, Any]) -> dict[str, Any]:
    return {_INPUT_FIELD_MAP[k]: v for k, v in camel.items()}


def _translate_expected(camel: dict[str, Any]) -> dict[str, Any]:
    return {_EXPECTED_FIELD_MAP[k]: v for k, v in camel.items()}


def _within(actual: float, expected: float, tolerance: float) -> bool:
    if expected == 0:
        return abs(actual) <= tolerance
    return abs(actual - expected) / abs(expected) <= tolerance


def test_fixtures_loaded_and_tolerance_advertised() -> None:
    assert len(_FIXTURE_FILE["fixtures"]) >= 20
    assert _FIXTURE_FILE["toleranceMonetary"] == 1e-6
    assert _FIXTURE_FILE["toleranceCo2"] == 1e-4


@pytest.mark.parametrize(
    "fixture",
    _FIXTURE_FILE["fixtures"],
    ids=[fx["name"] for fx in _FIXTURE_FILE["fixtures"]],
)
def test_parity_for_fixture(fixture: dict[str, Any]) -> None:
    inp = StudyCalcInput(**_translate_input(fixture["input"]))
    expected = _translate_expected(fixture["expected"])

    actual = compose_all(inp).model_dump()

    tol_monetary = _FIXTURE_FILE["toleranceMonetary"]
    tol_co2 = _FIXTURE_FILE["toleranceCo2"]

    for field in _MONETARY_FIELDS:
        assert _within(actual[field], expected[field], tol_monetary), (
            f"{fixture['name']} — {field} drifted: "
            f"actual={actual[field]} expected={expected[field]}"
        )
    for field in _CO2_FIELDS:
        assert _within(actual[field], expected[field], tol_co2), (
            f"{fixture['name']} — {field} drifted: "
            f"actual={actual[field]} expected={expected[field]}"
        )


# --- Defekt R2-9 (2026-05-31) invariants ------------------------------
#
# The Slide-14 "Ohne PV / Mit PV / Ersparnis" trio must always satisfy:
#
#     ohne_pv - mit_pv == ersparnis_pro_jahr
#
# This identity is provable algebraically from the SPEC §4.7 formulas:
#
#     ohne_pv = verbrauch * versorger_preis
#     mit_pv  = (verbrauch - eigenverbrauch) * versorger_preis
#               + eigenverbrauch * pv_verkauf
#             = verbrauch * versorger_preis
#               - eigenverbrauch * (versorger_preis - pv_verkauf)
#     ⇒ ohne_pv - mit_pv = eigenverbrauch * (versorger_preis - pv_verkauf)
#                        = ersparnis_pro_jahr  (per SPEC §4.7)
#
# Defekt A2 (2026-05-30) shipped a fix where ``mit_pv`` previously
# used a hardcoded ``EINSPEISE_VERGUETUNG_DEFAULT`` constant instead
# of ``pv_verkauf_eur_kwh``. That bug silently violated this identity
# (the user saw ``ohne - mit = 28.000`` but Ersparnis showed
# ``28.600``). Hard-wiring the invariant as a parity test prevents
# the regression from ever sneaking back in.


@pytest.mark.parametrize(
    "fixture",
    _FIXTURE_FILE["fixtures"],
    ids=[fx["name"] for fx in _FIXTURE_FILE["fixtures"]],
)
def test_slide14_ohne_minus_mit_equals_ersparnis(fixture: dict[str, Any]) -> None:
    """Defekt R2-9 invariant: ohne_pv - mit_pv == ersparnis_pro_jahr.

    Algebraic identity (see comment above). Holds for every parity
    fixture; any future change to the Slide-14 formulas MUST preserve
    this — if it does not, A2-style customer-visible inconsistencies
    return.
    """
    inp = StudyCalcInput(**_translate_input(fixture["input"]))
    actual = compose_all(inp).model_dump()

    diff = actual["stromkosten_ohne_pv_eur_jahr"] - actual["stromkosten_mit_pv_eur_jahr"]
    ersparnis = actual["ersparnis_pro_jahr"]
    tol = _FIXTURE_FILE["toleranceMonetary"]
    assert _within(diff, ersparnis, tol), (
        f"{fixture['name']} — Slide-14 identity violated: "
        f"ohne_pv ({actual['stromkosten_ohne_pv_eur_jahr']}) - "
        f"mit_pv ({actual['stromkosten_mit_pv_eur_jahr']}) = {diff}, "
        f"but ersparnis_pro_jahr = {ersparnis}. "
        "See DECISIONS.md 2026-05-31 R2-9."
    )
