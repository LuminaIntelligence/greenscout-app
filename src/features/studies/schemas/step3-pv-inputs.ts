/**
 * T-025 wizard Step 3 — PV-Inputs.
 *
 * Mirrors the §7.7 money-relevant Decimal columns on `Study`:
 *
 *   anlageKwp, pvErzeugungKwhJahr, pvEigenverbrauchKwhJahr,
 *   pvVerkaufEurKwh, verbrauchKwhJahr, versorgerPreisEurKwh,
 *   pachtEurProKwp, vertragslaufzeitJahre.
 *
 * All decimal fields are required positive numbers. `pachtEurProKwp`
 * has a Prisma default of 100; the form pre-fills that default but
 * still requires a positive value at submit. `vertragslaufzeitJahre`
 * is a positive integer with a Prisma default of 20.
 *
 * Plausibility ceilings are picked broad enough that no realistic
 * agricultural / commercial PV input trips them, narrow enough that
 * a comma-vs-dot typo (`350000` vs `3,5`) on a kWp input gets flagged
 * before it lands in the audit log.
 *
 * @see DECISIONS.md → Wizard-Step layout (decision #5)
 */

import { z } from "zod";

import { positiveDecimal, positiveInt } from "./common";

export const step3PvInputsSchema = z.object({
  // Anlagengröße in kWp. Realistic upper bound 100 MWp (= 100 000 kWp)
  // — covers anything GreenScout would feasibly quote on.
  anlageKwp: positiveDecimal({
    requiredKey: "studies.error.anlage-kwp-required",
    invalidKey: "studies.error.anlage-kwp-invalid",
    max: 100_000,
    maxKey: "studies.error.anlage-kwp-out-of-range",
  }),
  // PV-Stromerzeugung kWh/Jahr. Upper bound 200 GWh/yr (= 2e8 kWh).
  pvErzeugungKwhJahr: positiveDecimal({
    requiredKey: "studies.error.pv-erzeugung-required",
    invalidKey: "studies.error.pv-erzeugung-invalid",
    max: 200_000_000,
    maxKey: "studies.error.pv-erzeugung-out-of-range",
  }),
  // PV-Eigenverbrauch kWh/Jahr. Same upper bound as Erzeugung.
  pvEigenverbrauchKwhJahr: positiveDecimal({
    requiredKey: "studies.error.pv-eigenverbrauch-required",
    invalidKey: "studies.error.pv-eigenverbrauch-invalid",
    max: 200_000_000,
    maxKey: "studies.error.pv-eigenverbrauch-out-of-range",
  }),
  // PV-Stromverkauf €/kWh. Upper bound 1 €/kWh (way above any sane PPA).
  pvVerkaufEurKwh: positiveDecimal({
    requiredKey: "studies.error.pv-verkauf-required",
    invalidKey: "studies.error.pv-verkauf-invalid",
    max: 1,
    maxKey: "studies.error.pv-verkauf-out-of-range",
  }),
  // Verbrauch Eigentümer kWh/Jahr. Same bound as Erzeugung.
  verbrauchKwhJahr: positiveDecimal({
    requiredKey: "studies.error.verbrauch-required",
    invalidKey: "studies.error.verbrauch-invalid",
    max: 200_000_000,
    maxKey: "studies.error.verbrauch-out-of-range",
  }),
  // Versorger-Strompreis €/kWh. Upper bound 2 €/kWh covers crisis scenarios.
  versorgerPreisEurKwh: positiveDecimal({
    requiredKey: "studies.error.versorger-preis-required",
    invalidKey: "studies.error.versorger-preis-invalid",
    max: 2,
    maxKey: "studies.error.versorger-preis-out-of-range",
  }),
  // Pachtzahlung €/kWp. Default 100 (Prisma). Upper bound 10 000.
  pachtEurProKwp: positiveDecimal({
    requiredKey: "studies.error.pacht-required",
    invalidKey: "studies.error.pacht-invalid",
    max: 10_000,
    maxKey: "studies.error.pacht-out-of-range",
  }),
  // Vertragslaufzeit Jahre. Positive integer, default 20.
  vertragslaufzeitJahre: positiveInt({
    requiredKey: "studies.error.vertragslaufzeit-required",
    invalidKey: "studies.error.vertragslaufzeit-invalid",
  }),
});

export type Step3PvInputsInput = z.infer<typeof step3PvInputsSchema>;
