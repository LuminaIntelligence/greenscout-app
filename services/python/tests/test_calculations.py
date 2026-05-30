"""T-033 — Tests for the Python calculation module.

Coverage discipline: every function + every branch (CO2 override
on/off + missing-override fallback) must be hit. Parity with the
TS mirror is enforced separately by ``test_parity.py`` (T-034).
"""

from __future__ import annotations

from decimal import Decimal

from app.domain.calculations import (
    co2_fussballfelder_pro_jahr,
    co2_hektar_mischwald,
    co2_tonnen_pro_jahr,
    compose_all,
    ersparnis_gesamt_vertragslaufzeit,
    ersparnis_pro_jahr,
    ersparnis_pro_monat,
    gesamterzeugung_vertragslaufzeit,
    gesamtvorteil,
    pacht_einnahme_einmalig,
    pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit,
    stromkosten_mit_pv_eur_jahr,
    stromkosten_ohne_pv_eur_jahr,
)
from app.schemas.calc import StudyCalcInput


def make_input(**overrides: object) -> StudyCalcInput:
    """Baseline realistic study input — small commercial roof, mid-sized PV."""
    base: dict[str, object] = {
        "anlage_kwp": 100,
        "pv_erzeugung_kwh_jahr": 95_000,
        "pv_eigenverbrauch_kwh_jahr": 40_000,
        "pv_verkauf_eur_kwh": 0.08,
        "verbrauch_kwh_jahr": 60_000,
        "versorger_preis_eur_kwh": 0.4,
        "pacht_eur_pro_kwp": 100,
        "vertragslaufzeit_jahre": 20,
        "co2_override": False,
    }
    base.update(overrides)
    return StudyCalcInput(**base)  # type: ignore[arg-type]


def test_ersparnis_pro_jahr_baseline() -> None:
    assert ersparnis_pro_jahr(make_input()) == Decimal("12800.00")


def test_ersparnis_pro_jahr_zero_eigenverbrauch() -> None:
    assert ersparnis_pro_jahr(make_input(pv_eigenverbrauch_kwh_jahr=0)) == Decimal("0")


def test_ersparnis_pro_jahr_can_go_negative() -> None:
    # Pathological but defined — verkauf > versorger means selling cheaper
    # than buying back, so eigenverbrauch is a *loss*.
    out = ersparnis_pro_jahr(make_input(versorger_preis_eur_kwh=0.05, pv_verkauf_eur_kwh=0.1))
    assert out == Decimal("-2000.00")


def test_ersparnis_pro_monat_is_yearly_div_twelve() -> None:
    assert ersparnis_pro_monat(make_input()) == Decimal("12800.00") / Decimal(12)


def test_ersparnis_gesamt_vertragslaufzeit_uses_contract_duration() -> None:
    assert ersparnis_gesamt_vertragslaufzeit(make_input()) == Decimal("256000.00")


def test_ersparnis_gesamt_scales_with_non_default_duration() -> None:
    out = ersparnis_gesamt_vertragslaufzeit(make_input(vertragslaufzeit_jahre=15))
    assert out == Decimal("12800.00") * Decimal(15)


def test_pacht_einnahme_einmalig_baseline() -> None:
    # 100 kWp * 100 EUR/kWp = 10.000 EUR einmalig (SPEC §4.7, user-confirmed 2026-05-27).
    assert pacht_einnahme_einmalig(make_input()) == Decimal("10000.00")


def test_pacht_einnahme_einmalig_collapses_to_zero_when_pacht_zero() -> None:
    assert pacht_einnahme_einmalig(make_input(pacht_eur_pro_kwp=0)) == Decimal("0")


def test_pacht_einnahme_einmalig_does_not_scale_with_contract_duration() -> None:
    # §7.7 regression guard for the 2026-05-27 production defect: an
    # erroneous ``* vertragslaufzeit_jahre`` factor produced 20x too
    # high lease values. Two inputs that differ ONLY in contract
    # duration must yield the same pacht.
    assert pacht_einnahme_einmalig(make_input(vertragslaufzeit_jahre=20)) == (
        pacht_einnahme_einmalig(make_input(vertragslaufzeit_jahre=15))
    )


def test_pacht_einnahme_einmalig_user_confirmed_500_kwp_regression() -> None:
    # Verbatim the example the user confirmed on 2026-05-27:
    # 500 kWp * 100 EUR/kWp = 50.000 EUR (NOT 1.000.000 EUR).
    out = pacht_einnahme_einmalig(
        make_input(anlage_kwp=500, pacht_eur_pro_kwp=100, vertragslaufzeit_jahre=20)
    )
    assert out == Decimal("50000.00")


def test_gesamterzeugung_baseline() -> None:
    assert gesamterzeugung_vertragslaufzeit(make_input()) == Decimal(95_000) * Decimal(20)


def test_gesamtvorteil_sums_savings_plus_lease() -> None:
    # 256.000 EUR ersparnis (12.800 * 20) + 10.000 EUR pacht (one-shot) = 266.000 EUR.
    assert gesamtvorteil(make_input()) == Decimal("256000.00") + Decimal("10000.00")


def test_co2_tonnen_pro_jahr_default_branch() -> None:
    expected = (95_000 * 0.474) / 1000
    assert co2_tonnen_pro_jahr(make_input()) == expected


def test_co2_tonnen_pro_jahr_honours_override() -> None:
    out = co2_tonnen_pro_jahr(make_input(co2_override=True, co2_tonnen_pro_jahr_override=99.0))
    assert out == 99.0


def test_co2_tonnen_pro_jahr_falls_back_when_override_missing() -> None:
    # co2_override=True but the value is None → fall back to compute.
    out = co2_tonnen_pro_jahr(make_input(co2_override=True))
    assert out == (95_000 * 0.474) / 1000


def test_co2_hektar_mischwald_default_branch() -> None:
    expected = ((95_000 * 0.474) / 1000) * 0.0177
    assert co2_hektar_mischwald(make_input()) == expected


def test_co2_hektar_mischwald_honours_override() -> None:
    out = co2_hektar_mischwald(make_input(co2_override=True, co2_hektar_mischwald_override=12.0))
    assert out == 12.0


def test_co2_hektar_mischwald_falls_back_when_override_missing() -> None:
    expected = ((95_000 * 0.474) / 1000) * 0.0177
    assert co2_hektar_mischwald(make_input(co2_override=True)) == expected


def test_co2_fussballfelder_default_branch() -> None:
    expected = ((95_000 * 0.474) / 1000) * 0.0177 * 1.28
    assert co2_fussballfelder_pro_jahr(make_input()) == expected


def test_co2_fussballfelder_honours_override() -> None:
    out = co2_fussballfelder_pro_jahr(
        make_input(co2_override=True, co2_fussballfelder_pro_jahr_override=7.0)
    )
    assert out == 7.0


def test_co2_fussballfelder_falls_back_when_override_missing() -> None:
    expected = ((95_000 * 0.474) / 1000) * 0.0177 * 1.28
    assert co2_fussballfelder_pro_jahr(make_input(co2_override=True)) == expected


def test_pv_eigenverbrauch_gesamt_baseline() -> None:
    assert pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit(make_input()) == Decimal(40_000) * Decimal(
        20
    )


def test_pv_eigenverbrauch_gesamt_scales_with_duration() -> None:
    out = pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit(make_input(vertragslaufzeit_jahre=15))
    assert out == Decimal(40_000) * Decimal(15)


def test_stromkosten_ohne_pv_baseline() -> None:
    # 60_000 * 0.4 = 24_000.
    assert stromkosten_ohne_pv_eur_jahr(make_input()) == Decimal("24000.00")


def test_stromkosten_ohne_pv_rechenprobe() -> None:
    # 400_000 * 0.35 = 140_000.
    out = stromkosten_ohne_pv_eur_jahr(
        make_input(verbrauch_kwh_jahr=400_000, versorger_preis_eur_kwh=0.35)
    )
    assert out == Decimal("140000.00")


def test_stromkosten_mit_pv_baseline() -> None:
    # Defekt A2 (2026-05-30): formula uses user-input pv_verkauf_eur_kwh
    # (baseline 0.08 EUR/kWh), NOT the previous 0.20 EUR/kWh constant.
    # (60_000 - 40_000) * 0.4 + 40_000 * 0.08 = 8_000 + 3_200 = 11_200.
    assert stromkosten_mit_pv_eur_jahr(make_input()) == Decimal("11200.00")


def test_stromkosten_mit_pv_rechenprobe() -> None:
    # Defekt A2 (2026-05-30): formula uses user-input pv_verkauf_eur_kwh
    # (baseline 0.08 EUR/kWh from make_input).
    # (400_000 - 164_000) * 0.35 + 164_000 * 0.08 = 82_600 + 13_120 = 95_720.
    out = stromkosten_mit_pv_eur_jahr(
        make_input(
            verbrauch_kwh_jahr=400_000,
            pv_eigenverbrauch_kwh_jahr=164_000,
            versorger_preis_eur_kwh=0.35,
        )
    )
    assert out == Decimal("95720.00")


def test_stromkosten_mit_pv_uses_user_input_pv_verkauf_not_constant() -> None:
    """Anti-regression Defekt A2 (2026-05-30).

    User-Input ``pv_verkauf_eur_kwh`` muss die einzige Quelle für die
    Einspeiseverguetung in der stromkosten_mit_pv-Berechnung sein.
    Die EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH-Konstante darf nicht
    hardcoded den User-Input ueberschreiben.

    Test-Fixture: verbrauch = eigenverbrauch = 130.000 (alles selbst genutzt),
    versorger = 0,28, pv_verkauf = 0,22.
    Erwartet: 0 + 130.000 * 0,22 = 28.600 EUR.
    Mit dem alten Bug (Konstante 0,20): 130.000 * 0,20 = 26.000 EUR.
    """
    out = stromkosten_mit_pv_eur_jahr(
        make_input(
            verbrauch_kwh_jahr=130_000,
            pv_eigenverbrauch_kwh_jahr=130_000,
            versorger_preis_eur_kwh=0.28,
            pv_verkauf_eur_kwh=0.22,
        )
    )
    assert out == Decimal("28600.00"), (
        f"Erwartet 28.600 EUR (130k * 0,22), bekommen {out}. "
        "Bug A2 -- Code nutzt evtl. EINSPEISE_VERGUETUNG_DEFAULT-Konstante "
        "statt user-input pv_verkauf_eur_kwh."
    )


def test_compose_all_returns_derived_values_model() -> None:
    out = compose_all(make_input())
    assert out.ersparnis_pro_jahr == 12_800.0
    assert out.ersparnis_pro_monat == 12_800.0 / 12
    assert out.ersparnis20_jahre == 256_000.0
    assert out.pacht_einnahme_einmalig == 10_000.0
    assert out.gesamterzeugung20j == 1_900_000.0
    assert out.gesamtvorteil == 266_000.0
    assert out.co2_tonnen_pro_jahr == (95_000 * 0.474) / 1000
    assert out.co2_hektar_mischwald == ((95_000 * 0.474) / 1000) * 0.0177
    assert out.co2_fussballfelder_pro_jahr == ((95_000 * 0.474) / 1000) * 0.0177 * 1.28
    assert out.pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit == 40_000 * 20
    assert out.stromkosten_ohne_pv_eur_jahr == 24_000.0
    # Defekt A2: baseline 60k/40k/0.4/0.08 -> 8_000 + 3_200 = 11_200.
    assert out.stromkosten_mit_pv_eur_jahr == 11_200.0


def test_compose_all_propagates_all_three_co2_overrides() -> None:
    out = compose_all(
        make_input(
            co2_override=True,
            co2_tonnen_pro_jahr_override=50.0,
            co2_hektar_mischwald_override=1.0,
            co2_fussballfelder_pro_jahr_override=2.0,
        )
    )
    assert out.co2_tonnen_pro_jahr == 50.0
    assert out.co2_hektar_mischwald == 1.0
    assert out.co2_fussballfelder_pro_jahr == 2.0


def test_compose_all_handles_all_zero_edge_case() -> None:
    out = compose_all(
        make_input(
            anlage_kwp=0,
            pv_erzeugung_kwh_jahr=0,
            pv_eigenverbrauch_kwh_jahr=0,
            pv_verkauf_eur_kwh=0,
            verbrauch_kwh_jahr=0,
            versorger_preis_eur_kwh=0,
            pacht_eur_pro_kwp=0,
        )
    )
    assert out.ersparnis_pro_jahr == 0
    assert out.ersparnis_pro_monat == 0
    assert out.gesamtvorteil == 0
    assert out.co2_tonnen_pro_jahr == 0
