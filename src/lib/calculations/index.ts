/**
 * T-032 — PV feasibility calculation module (TypeScript live preview).
 *
 * Pure, side-effect-free functions implementing the SPEC §4.7 contract.
 * Used by the Wizard Step 5 sensitivity mini-table for live preview;
 * the authoritative copy for document generation lives in
 * `services/python/app/domain/calculations.py` (parity-tested via T-034).
 *
 * @see SPEC.md §4.7
 * @see DECISIONS.md "CO₂ Mischwald-Faktor provisional"
 */

import {
  CO2_HA_MISCHWALD_PER_T_PER_YEAR,
  CO2_KG_PER_KWH_PV,
  FOOTBALL_FIELDS_PER_HA,
} from "./constants";
import type { DerivedValues, StudyCalcInput } from "./types";

export type { DerivedValues, StudyCalcInput } from "./types";

/** € / Jahr — `(versorgerPreis - pvVerkauf) * pvEigenverbrauch`. */
export function ersparnisProJahr(input: StudyCalcInput): number {
  return (input.versorgerPreisEurKwh - input.pvVerkaufEurKwh) * input.pvEigenverbrauchKwhJahr;
}

/** € / Monat — `ersparnisProJahr / 12`. */
export function ersparnisProMonat(input: StudyCalcInput): number {
  return ersparnisProJahr(input) / 12;
}

/** € — `ersparnisProJahr * vertragslaufzeitJahre`. */
export function ersparnisGesamtVertragslaufzeit(input: StudyCalcInput): number {
  return ersparnisProJahr(input) * input.vertragslaufzeitJahre;
}

/**
 * € — one-shot lease income (SPEC §4.7).
 * `anlageKwp * pachtEurProKwp`.
 *
 * NOTE: This is the *einmalige* lease payment paid by the investor to
 * the property owner upon contract signing. It does NOT scale with
 * `vertragslaufzeitJahre` — the contract duration is the period over
 * which the property is leased, not a multiplier on the price.
 *
 * User-confirmed binding on 2026-05-27 (§7.7 pause-trigger resolution
 * in DECISIONS.md). Example: 500 kWp × 100 €/kWp = 50.000 € one-shot.
 * Equivalent via area: (m² / 5) × 100, because 1 kWp ≈ 5 m² usable roof
 * surface (Slide-5 footnote in the original template).
 */
export function pachtEinnahmeEinmalig(input: StudyCalcInput): number {
  return input.anlageKwp * input.pachtEurProKwp;
}

/** kWh — total electricity produced over the contract duration. */
export function gesamterzeugungVertragslaufzeit(input: StudyCalcInput): number {
  return input.pvErzeugungKwhJahr * input.vertragslaufzeitJahre;
}

/** € — `ersparnisGesamtVertragslaufzeit + pachtEinnahmeEinmalig`. */
export function gesamtvorteil(input: StudyCalcInput): number {
  return ersparnisGesamtVertragslaufzeit(input) + pachtEinnahmeEinmalig(input);
}

/**
 * t — tonnes CO₂ avoided per year. Honours `co2Override`.
 * `pvErzeugungKwhJahr * CO2_KG_PER_KWH_PV / 1000`.
 */
export function co2TonnenProJahr(input: StudyCalcInput): number {
  if (input.co2Override && input.co2TonnenProJahrOverride !== undefined) {
    return input.co2TonnenProJahrOverride;
  }
  return (input.pvErzeugungKwhJahr * CO2_KG_PER_KWH_PV) / 1000;
}

/** ha — Mischwald-Äquivalent pro Jahr. Honours `co2Override`. */
export function co2HektarMischwald(input: StudyCalcInput): number {
  if (input.co2Override && input.co2HektarMischwaldOverride !== undefined) {
    return input.co2HektarMischwaldOverride;
  }
  return co2TonnenProJahr(input) * CO2_HA_MISCHWALD_PER_T_PER_YEAR;
}

/** count — Fußballfelder-Äquivalent pro Jahr. Honours `co2Override`. */
export function co2FussballfelderProJahr(input: StudyCalcInput): number {
  if (input.co2Override && input.co2FussballfelderProJahrOverride !== undefined) {
    return input.co2FussballfelderProJahrOverride;
  }
  return co2HektarMischwald(input) * FOOTBALL_FIELDS_PER_HA;
}

/**
 * kWh — total self-consumption over the full contract.
 * Slide 5 placeholder; per Slice-3a sign-off item 1.
 */
export function pvEigenverbrauchKwhGesamtVertragslaufzeit(input: StudyCalcInput): number {
  return input.pvEigenverbrauchKwhJahr * input.vertragslaufzeitJahre;
}

/**
 * € / Jahr — annual electricity cost without a PV installation.
 * Slide 14 "Ohne PV"; per Slice-3a sign-off item 2.
 */
export function stromkostenOhnePvEurJahr(input: StudyCalcInput): number {
  return input.verbrauchKwhJahr * input.versorgerPreisEurKwh;
}

/**
 * € / Jahr — annual electricity cost with the PV installation.
 * Slide 14 "Mit PV"; per Slice-3a sign-off item 3.
 *
 * Formula: residual-from-grid at supplier price + self-consumed
 * share valued at the user-entered `pvVerkaufEurKwh`.
 *
 * Defekt A2 (2026-05-30, user-confirmed §7.7 follow-up to the
 * 2026-05-27 Pacht-Formel-Freigabe): the previous implementation
 * used the `EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH = 0.20 €/kWh`
 * constant as a provisional avoided-cost reference. Production
 * generated PPTX showed `Mit PV: 26.000 €` (= 130k × 0,20) instead
 * of the user-expected `28.600 €` (= 130k × 0,22) when the Berater
 * had entered `pvVerkaufEurKwh = 0,22 €/kWh`. The user-entered
 * value is now the single source of truth; the provisional constant
 * is removed. See DECISIONS 2026-05-30 "Defekt A2".
 */
export function stromkostenMitPvEurJahr(input: StudyCalcInput): number {
  const residualFromGrid =
    (input.verbrauchKwhJahr - input.pvEigenverbrauchKwhJahr) * input.versorgerPreisEurKwh;
  const selfConsumed = input.pvEigenverbrauchKwhJahr * input.pvVerkaufEurKwh;
  return residualFromGrid + selfConsumed;
}

/**
 * Compose every derived value from a single input. Single-shot helper
 * for callers that want the full output (Step 5 preview, document
 * generator, etc.).
 */
export function composeAll(input: StudyCalcInput): DerivedValues {
  return {
    ersparnisProJahr: ersparnisProJahr(input),
    ersparnisProMonat: ersparnisProMonat(input),
    ersparnis20Jahre: ersparnisGesamtVertragslaufzeit(input),
    pachtEinnahmeEinmalig: pachtEinnahmeEinmalig(input),
    gesamterzeugung20j: gesamterzeugungVertragslaufzeit(input),
    gesamtvorteil: gesamtvorteil(input),
    co2TonnenProJahr: co2TonnenProJahr(input),
    co2HektarMischwald: co2HektarMischwald(input),
    co2FussballfelderProJahr: co2FussballfelderProJahr(input),
    pvEigenverbrauchKwhGesamtVertragslaufzeit: pvEigenverbrauchKwhGesamtVertragslaufzeit(input),
    stromkostenOhnePvEurJahr: stromkostenOhnePvEurJahr(input),
    stromkostenMitPvEurJahr: stromkostenMitPvEurJahr(input),
  };
}
