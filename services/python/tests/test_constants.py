"""T-031 — Constants module sanity tests (Python mirror).

Per DECISIONS.md "CO2 Mischwald-Faktor provisional": tests assert the
constants exist with the expected type and rough sanity bounds, not
their exact numeric values. The T-034 fixture suite enforces parity
with the TS mirror.
"""

from app.domain import constants


def test_co2_kg_per_kwh_pv_is_positive_number() -> None:
    assert isinstance(constants.CO2_KG_PER_KWH_PV, float)
    assert 0 < constants.CO2_KG_PER_KWH_PV < 2


def test_co2_ha_mischwald_per_t_per_year_is_positive_number() -> None:
    assert isinstance(constants.CO2_HA_MISCHWALD_PER_T_PER_YEAR, float)
    assert 0 < constants.CO2_HA_MISCHWALD_PER_T_PER_YEAR < 1


def test_football_fields_per_ha_is_positive() -> None:
    assert isinstance(constants.FOOTBALL_FIELDS_PER_HA, float)
    assert 0 < constants.FOOTBALL_FIELDS_PER_HA < 5


def test_default_pacht_eur_per_kwp_is_spec_default() -> None:
    assert constants.DEFAULT_PACHT_EUR_PER_KWP == 100


def test_default_vertragslaufzeit_jahre_is_twenty() -> None:
    assert constants.DEFAULT_VERTRAGSLAUFZEIT_JAHRE == 20


def test_default_sensitivity_ct_kwh_matches_wizard_defaults() -> None:
    assert constants.DEFAULT_SENSITIVITY_CT_KWH == (35, 40, 45)


def test_einspeise_verguetung_default_is_positive_number() -> None:
    assert isinstance(constants.EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH, float)
    assert 0 < constants.EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH < 1
