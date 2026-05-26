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
 * € — cumulative lease income over the full contract.
 * SPEC §4.7 names this `pacht_einnahme_einmalig`; the value is
 * `anlageKwp * pachtEurProKwp * vertragslaufzeitJahre`.
 */
export function pachtEinnahmeEinmalig(input: StudyCalcInput): number {
  return input.anlageKwp * input.pachtEurProKwp * input.vertragslaufzeitJahre;
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
  };
}
