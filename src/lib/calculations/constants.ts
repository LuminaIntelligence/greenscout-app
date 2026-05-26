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

/**
 * Provisional Einspeisevergütung used as the avoided-cost reference
 * for the self-consumption portion of `stromkosten_mit_pv_eur_jahr`
 * (Slide 14). The Berater enters `pvVerkaufEurKwh` as the *sales*
 * price to the grid, which is not the right reference for "what
 * customers save on their own roof" — the regulatory feed-in
 * compensation is. Until we wire that to a real lookup, this is
 * a fixed 20 ct/kWh approximation.
 *
 * PROVISIONAL — confirm actual Einspeisevergütung 2026; revisit
 * before the next major release. See DECISIONS.md "Slice 3a sign-off
 * + Slice 3b design" for the open follow-up.
 */
export const EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH = 0.2;
