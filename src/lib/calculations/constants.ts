/**
 * T-031 — Physical and financial constants for PV feasibility calculations.
 *
 * Mirror of `services/python/app/domain/constants.py`. Both files MUST
 * export identical numeric values under identical key names — parity
 * is enforced by the T-034 fixture suite.
 *
 * Sources tracked in `docs/calc-sources.md`. The Mischwald factor is
 * provisional pending GreenScout confirmation — see DECISIONS.md
 * "CO₂ Mischwald-Faktor provisional".
 */

/** kg CO₂ avoided per kWh of PV electricity (German grid mix baseline). */
export const CO2_KG_PER_KWH_PV = 0.474;

/**
 * Hectares of managed mixed forest required to sequester one tonne
 * of CO₂ per year. PROVISIONAL — value pending GreenScout
 * confirmation, see docs/calc-sources.md.
 */
export const CO2_HA_MISCHWALD_PER_T_PER_YEAR = 0.0177;

/** UEFA standard pitch reference: 1 ha ≈ 1.28 football fields. */
export const FOOTBALL_FIELDS_PER_HA = 1.28;

/** Default lease payment €/kWp (SPEC §4.5 default). */
export const DEFAULT_PACHT_EUR_PER_KWP = 100;

/** Default lease contract duration in years (SPEC §4.5 / §1 EEG-aligned). */
export const DEFAULT_VERTRAGSLAUFZEIT_JAHRE = 20;

/**
 * Default Netzstrompreis-Sensitivität (ct/kWh) for the Wizard Step 5
 * mini-table. Per DECISIONS.md "Wizard step layout fixed".
 *
 * NOTE: these are ct/kWh values for documentation; the schema and
 * calculation modules expect €/kWh (35 ct == 0.35 €/kWh).
 */
export const DEFAULT_SENSITIVITY_CT_KWH = [35, 40, 45] as const;

// NOTE: A previous `EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH = 0.20` constant
// used to serve as the avoided-cost reference for the self-consumption
// portion of `stromkosten_mit_pv_eur_jahr`. Defekt A2 (2026-05-30,
// user-confirmed §7.7 follow-up): production generated PPTX showed
// `Mit PV: 26.000 €` (= 130k × 0,20) where the user expected `28.600 €`
// (= 130k × 0,22) for `pvVerkaufEurKwh = 0,22 €/kWh`. The user-entered
// `pvVerkaufEurKwh` is now the single source of truth for that formula;
// the provisional constant is gone. See DECISIONS 2026-05-30 "Defekt A2".
