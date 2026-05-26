"""T-033 — Pydantic v2 schemas for the PV calculation pipeline.

Mirror of ``src/lib/calculations/types.ts``. The TS interfaces and these
pydantic models MUST stay in field-by-field lockstep — parity is
enforced by the T-034 fixture suite.

Input numerics are validated as non-negative where the underlying
physical quantity disallows negative values. The TS side uses zod
schemas at the Study-form boundary (``src/features/studies/schemas/``);
this module is the gate at the Python service API boundary
(``POST /calc/preview`` lands in T-035).
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class StudyCalcInput(BaseModel):
    """Inputs to the PV calculation pipeline (parity with TS StudyCalcInput)."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    anlage_kwp: float = Field(..., ge=0, description="kWp — installed nominal capacity.")
    pv_erzeugung_kwh_jahr: float = Field(
        ..., ge=0, description="kWh / Jahr — PV electricity produced."
    )
    pv_eigenverbrauch_kwh_jahr: float = Field(
        ..., ge=0, description="kWh / Jahr — share self-consumed by the property owner."
    )
    pv_verkauf_eur_kwh: float = Field(..., ge=0, description="EUR/kWh — guaranteed feed-in price.")
    verbrauch_kwh_jahr: float = Field(
        ..., ge=0, description="kWh / Jahr — total demand of the property owner."
    )
    versorger_preis_eur_kwh: float = Field(..., ge=0, description="EUR/kWh — current grid price.")
    pacht_eur_pro_kwp: float = Field(..., ge=0, description="EUR/kWp — annual lease.")
    vertragslaufzeit_jahre: int = Field(..., ge=1, description="Years — contract duration.")

    co2_override: bool = Field(
        False, description="If true, the manual CO2 override values are used as-is."
    )
    co2_tonnen_pro_jahr_override: float | None = Field(
        None, description="Manual override — tonnes CO2 avoided per year."
    )
    co2_hektar_mischwald_override: float | None = Field(
        None, description="Manual override — hectares Mischwald per year."
    )
    co2_fussballfelder_pro_jahr_override: float | None = Field(
        None, description="Manual override — football fields per year."
    )


class DerivedValues(BaseModel):
    """Derived values produced by the calculation pipeline (parity with TS)."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    ersparnis_pro_jahr: float
    ersparnis_pro_monat: float
    ersparnis_20_jahre: float
    pacht_einnahme_einmalig: float
    gesamterzeugung_20j: float
    gesamtvorteil: float
    co2_tonnen_pro_jahr: float
    co2_hektar_mischwald: float
    co2_fussballfelder_pro_jahr: float
