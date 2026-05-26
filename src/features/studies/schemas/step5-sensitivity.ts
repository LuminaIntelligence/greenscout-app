/**
 * T-025 wizard Step 5 — Sensitivitätsanalyse.
 *
 * Three alternative Netzstrompreise (€/kWh) used for the savings-by-
 * tariff table on slide 12. Prisma defaults are `"0.35" / "0.40" /
 * "0.45"` (35 / 40 / 45 ct/kWh) per DECISIONS Wizard-Step layout (#5).
 * The wizard pre-fills those defaults; the consultant may override.
 *
 * Upper bound mirrors `versorgerPreisEurKwh` in Step 3 (2 €/kWh covers
 * crisis scenarios).
 *
 * @see DECISIONS.md → Wizard-Step layout (decision #5)
 */

import { z } from "zod";

import { positiveDecimal } from "./common";

/**
 * Defaults applied when the wizard opens Step 5 (matches Prisma
 * `Study.szenarioPreis1/2/3` defaults). Exported so the form
 * component can hydrate RHF without duplicating the values.
 */
export const SENSITIVITY_DEFAULTS = {
  szenarioPreis1: 0.35,
  szenarioPreis2: 0.4,
  szenarioPreis3: 0.45,
} as const;

export const step5SensitivitySchema = z.object({
  szenarioPreis1: positiveDecimal({
    requiredKey: "studies.error.szenario-required",
    invalidKey: "studies.error.szenario-invalid",
    max: 2,
    maxKey: "studies.error.szenario-out-of-range",
  }),
  szenarioPreis2: positiveDecimal({
    requiredKey: "studies.error.szenario-required",
    invalidKey: "studies.error.szenario-invalid",
    max: 2,
    maxKey: "studies.error.szenario-out-of-range",
  }),
  szenarioPreis3: positiveDecimal({
    requiredKey: "studies.error.szenario-required",
    invalidKey: "studies.error.szenario-invalid",
    max: 2,
    maxKey: "studies.error.szenario-out-of-range",
  }),
});

export type Step5SensitivityInput = z.infer<typeof step5SensitivitySchema>;
