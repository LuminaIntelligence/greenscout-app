/**
 * T-032 — Shared types for the calculation module.
 *
 * `StudyCalcInput` mirrors the SPEC §4.5 inputs that drive the
 * formulas in SPEC §4.7. Optional fields (`vertragslaufzeitJahre`,
 * `pachtEurProKwp`, `co2Override` + the three override values) carry
 * the SPEC §4.5 defaults at the call boundary — populated from
 * `Study.*` rows where Prisma's `@default()` already applied.
 *
 * `DerivedValues` is the full output set produced by `composeAll()`
 * and consumed by both the live preview (Wizard Step 5) and the
 * document generator (Slice 8 / T-038).
 *
 * Parity contract: the Python mirror in
 * `services/python/app/domain/calculations.py` produces the same
 * field names and the same numeric values within the T-034 tolerances
 * documented in `docs/calc-sources.md`.
 */

/** Inputs to the PV calculation pipeline. */
export interface StudyCalcInput {
  /** kWp — installed nominal capacity. */
  anlageKwp: number;
  /** kWh / Jahr — PV electricity produced. */
  pvErzeugungKwhJahr: number;
  /** kWh / Jahr — share self-consumed by the property owner. */
  pvEigenverbrauchKwhJahr: number;
  /** €/kWh — guaranteed feed-in price under the PV sales contract. */
  pvVerkaufEurKwh: number;
  /** kWh / Jahr — total electricity demand of the property owner. */
  verbrauchKwhJahr: number;
  /** €/kWh — current grid price paid to the supplier. */
  versorgerPreisEurKwh: number;
  /** €/kWp — annual lease paid to the property owner. SPEC §4.5 default 100. */
  pachtEurProKwp: number;
  /** Years — contract duration. SPEC §4.5 default 20. */
  vertragslaufzeitJahre: number;

  /**
   * If true, the CO₂ derivatives below are taken as-is and the
   * recomputation path is short-circuited. SPEC §5.1 (`Study.co2Override`).
   */
  co2Override: boolean;
  /** Manual override — tonnes CO₂ avoided per year. */
  co2TonnenProJahrOverride?: number;
  /** Manual override — hectares Mischwald sequestration equivalent per year. */
  co2HektarMischwaldOverride?: number;
  /** Manual override — football-field count per year. */
  co2FussballfelderProJahrOverride?: number;
}

/** Derived values produced by the calculation pipeline. */
export interface DerivedValues {
  /** € / Jahr — annual savings: (versorger − pv_verkauf) × eigenverbrauch. */
  ersparnisProJahr: number;
  /** € / Monat — annual savings ÷ 12. */
  ersparnisProMonat: number;
  /**
   * € — savings over the full contract duration.
   * Calculated as `ersparnisProJahr × vertragslaufzeitJahre`.
   */
  ersparnis20Jahre: number;
  /**
   * € — once-off cumulative lease income over the full contract.
   * Calculated as `anlageKwp × pachtEurProKwp × vertragslaufzeitJahre`.
   * (Per SPEC §4.7 the variable name is `pacht_einnahme_einmalig`
   *  but the value is the cumulative figure across the contract.)
   */
  pachtEinnahmeEinmalig: number;
  /** kWh — total electricity produced over the contract duration. */
  gesamterzeugung20j: number;
  /** € — `ersparnis20Jahre + pachtEinnahmeEinmalig`. */
  gesamtvorteil: number;
  /** t — tonnes CO₂ avoided per year (PV production × CO₂ factor). */
  co2TonnenProJahr: number;
  /** ha — hectares Mischwald equivalent (annual tonnes × Mischwald factor). */
  co2HektarMischwald: number;
  /** count — football-field equivalent per year. */
  co2FussballfelderProJahr: number;
}
